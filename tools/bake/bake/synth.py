"""Synthesized elevation (Phase 1): Westeros has no measured DEM, so the bake makes one from the traced map.

    traced vectors (map km)                        world.json → synth
          │  land · mountains / hills (+ peakM, ridge) · rivers (source → mouth) · lakes
          ▼
    uplift U(x)      mountains and hills as smooth bodies (distance inside the outline, crest lines, ridged
                     noise), low plains uplift with broad noise elsewhere on land
          ▼
    stream power     the drainage network and the heights are iterated to equilibrium (Braun & Willett 2013 /
                     Cordonnier et al. 2016, n = 1, implicit with dt → ∞: h_i = h_rcv + U_i·d / (K·A_i^m)) on a work
                     grid; depressions are routed by priority flood (Barnes 2014). THE TRACED RIVERS ARE FIXED: their
                     cells drain along the river, source to mouth, so the valleys form where the map's rivers run
          ▼
    heights          each range / hill area is scaled so its summit reaches its peakM (label per feature), the
                     plains to plainsPeakM; every cell is re-made to drain downhill; hard height constraints
                     (verified ledger heights) are met exactly by local corrections and reported
          ▼
    fine detail      upsampled to the heightfield, ridged detail scaled by the local relief, one gully-cutting
                     pass on the fine flow accumulation, a talus limit; sea floor from the distance to the coast
          ▼
    metres above sea level + land fraction → the inherited bake (coast, relief exaggeration, hydro, …)

Deterministic: every random field is seeded from world.json seeds.world; no wall clock.
"""
from __future__ import annotations

import json
import math

import cv2
import numpy as np
from numba import njit
from rasterio import features
from scipy import ndimage
from shapely.geometry import LineString, shape

from .config import Config, Timer
from .source import read_layer

DEFAULTS = {
    "workKmPerPixel": 2.0,
    "iterations": 14,
    "m": 0.45,
    "plainsUplift": 0.06,
    "plainsNoiseKm": 260.0,
    "plainsPeakM": 420.0,
    "hillUplift": 0.35,
    "mountainUplift": 1.0,
    "edgeKm": 40.0,
    "ridgeKm": 35.0,
    "ridgeNoiseKm": 28.0,
    "ridgeNoise": 0.45,
    "gainBlurKm": 18.0,
    "minSlope": 0.0004,
    "detailKm": [9.0, 3.5, 1.4],
    "detailAmp": 0.10,
    "gullyDepth": 0.04,
    "talusDeg": 38.0,
    "coastRampKm": 6.0,
    "shelfKm": 70.0,
    "seaDepthM": 320.0,
    "lakeDepthM": 25.0,
    "inlandRiseM": 140.0,
    "inlandRiseKm": 70.0,
}


# ---------------------------------------------------------------- noise (deterministic)

def value_noise(shape_hw: tuple[int, int], px_km: float, scale_km: float, seed: int) -> np.ndarray:
    h, w = shape_hw
    rng = np.random.default_rng(seed)
    gw = max(2, int(w * px_km / scale_km) + 3)
    gh = max(2, int(h * px_km / scale_km) + 3)
    lat = rng.uniform(-1, 1, (gh, gw)).astype(np.float32)
    return cv2.resize(lat, (w, h), interpolation=cv2.INTER_CUBIC)


def fbm(shape_hw, px_km, scale_km, seed, octaves=4, ridged=False) -> np.ndarray:
    out = np.zeros(shape_hw, np.float32)
    amp, tot, s = 1.0, 0.0, scale_km
    for o in range(octaves):
        if s < 2 * px_km:
            break
        n = value_noise(shape_hw, px_km, s, seed + 101 * o)
        if ridged:
            n = 1 - np.abs(n)
            n = n * n
        out += amp * n
        tot += amp
        amp *= 0.5
        s *= 0.5
    return out / max(tot, 1e-6)


# ---------------------------------------------------------------- the flow graph (numba)

_DR = np.array([-1, -1, -1, 0, 0, 1, 1, 1], np.int64)
_DC = np.array([-1, 0, 1, -1, 1, -1, 0, 1], np.int64)
_DD = np.array([math.sqrt(2), 1, math.sqrt(2), 1, 1, math.sqrt(2), 1, math.sqrt(2)], np.float64)


@njit(cache=True)
def _heap_push(hk, hv, n, key, val):
    i = n
    hk[i] = key
    hv[i] = val
    while i > 0:
        p = (i - 1) >> 1
        if hk[p] < hk[i] or (hk[p] == hk[i] and hv[p] <= hv[i]):
            break
        hk[p], hk[i] = hk[i], hk[p]
        hv[p], hv[i] = hv[i], hv[p]
        i = p
    return n + 1


@njit(cache=True)
def _heap_pop(hk, hv, n):
    key, val = hk[0], hv[0]
    n -= 1
    hk[0] = hk[n]
    hv[0] = hv[n]
    i = 0
    while True:
        l = 2 * i + 1
        if l >= n:
            break
        r = l + 1
        c = l
        if r < n and (hk[r] < hk[l] or (hk[r] == hk[l] and hv[r] < hv[l])):
            c = r
        if hk[i] < hk[c] or (hk[i] == hk[c] and hv[i] <= hv[c]):
            break
        hk[c], hk[i] = hk[i], hk[c]
        hv[c], hv[i] = hv[i], hv[c]
        i = c
    return key, val, n


@njit(cache=True)
def flood_receivers(h, base, forced, px, eps, DR, DC, DD):
    """Priority-flood (+ε) from the base-level cells, steepest descent on the flooded surface, forced
    receivers (the fixed rivers) where forced >= 0, then a donor-BFS stack from the base level.
    Returns (receiver, distance to it in km, stack order); base cells are their own receivers."""
    H, W = h.shape
    N = H * W
    hf = np.empty(N, np.float64)
    done = np.zeros(N, np.bool_)
    hk = np.empty(N + 1, np.float64)
    hv = np.empty(N + 1, np.int64)
    n = 0
    hflat = h.ravel()
    bflat = base.ravel()
    for i in range(N):
        if bflat[i]:
            hf[i] = hflat[i]
            done[i] = True
    # seed the queue with the land cells next to the base level (and frame-edge land, which drains off-frame)
    for i in range(N):
        if done[i]:
            continue
        r = i // W
        c = i - r * W
        edge = r == 0 or c == 0 or r == H - 1 or c == W - 1
        nb = False
        for k in range(8):
            rr = r + DR[k]
            cc = c + DC[k]
            if 0 <= rr < H and 0 <= cc < W and bflat[rr * W + cc]:
                nb = True
                break
        if nb or edge:
            hf[i] = hflat[i]
            done[i] = True
            n = _heap_push(hk, hv, n, hf[i], i)
    while n > 0:
        key, i, n = _heap_pop(hk, hv, n)
        r = i // W
        c = i - r * W
        for k in range(8):
            rr = r + DR[k]
            cc = c + DC[k]
            if rr < 0 or rr >= H or cc < 0 or cc >= W:
                continue
            j = rr * W + cc
            if done[j]:
                continue
            done[j] = True
            hf[j] = max(hflat[j], key + eps * DD[k] * px)
            n = _heap_push(hk, hv, n, hf[j], j)
    rec = np.arange(N)
    dist = np.zeros(N, np.float64)
    fflat = forced.ravel()
    for i in range(N):
        if bflat[i]:
            continue
        r = i // W
        c = i - r * W
        if fflat[i] >= 0:
            j = fflat[i]
            rr = j // W
            cc = j - rr * W
            rec[i] = j
            dist[i] = math.sqrt((rr - r) ** 2 + (cc - c) ** 2) * px
            continue
        best = -1
        bs = 0.0
        on_edge = r == 0 or c == 0 or r == H - 1 or c == W - 1
        for k in range(8):
            rr = r + DR[k]
            cc = c + DC[k]
            if rr < 0 or rr >= H or cc < 0 or cc >= W:
                continue
            j = rr * W + cc
            s = (hf[i] - hf[j]) / (DD[k] * px)
            if s > bs:
                bs = s
                best = k
        if best >= 0:
            rec[i] = (r + DR[best]) * W + c + DC[best]
            dist[i] = DD[best] * px
        elif on_edge:
            rec[i] = i  # drains off the frame: a base node
    # donor-BFS stack from every self-receiving node
    ndon = np.zeros(N, np.int64)
    for i in range(N):
        if rec[i] != i:
            ndon[rec[i]] += 1
    start = np.zeros(N + 1, np.int64)
    for i in range(N):
        start[i + 1] = start[i] + ndon[i]
    fill = start[:-1].copy()
    don = np.empty(start[N], np.int64)
    for i in range(N):
        if rec[i] != i:
            don[fill[rec[i]]] = i
            fill[rec[i]] += 1
    stack = np.empty(N, np.int64)
    seen = np.zeros(N, np.bool_)
    top = 0
    for i in range(N):
        if rec[i] == i:
            stack[top] = i
            seen[i] = True
            top += 1
    q = 0
    while q < top:
        i = stack[q]
        q += 1
        for t in range(start[i], start[i + 1]):
            j = don[t]
            if not seen[j]:
                seen[j] = True
                stack[top] = j
                top += 1
    # cells caught in a cycle (cannot happen with a consistent river graph): make them base nodes
    for i in range(N):
        if not seen[i]:
            rec[i] = i
            dist[i] = 0.0
            stack[top] = i
            top += 1
    return rec, dist, stack


@njit(cache=True)
def accumulate(rec, stack, cell_area):
    N = rec.shape[0]
    A = np.full(N, cell_area, np.float64)
    for t in range(N - 1, -1, -1):
        i = stack[t]
        if rec[i] != i:
            A[rec[i]] += A[i]
    return A


@njit(cache=True)
def steady_heights(base_h, U, rec, dist, stack, A, m, min_slope):
    """Stream-power equilibrium for the current network (n = 1, dt → ∞): h_i = h_rcv + d·max(U_i / A_i^m, s_min)."""
    N = rec.shape[0]
    h = base_h.copy()
    for t in range(N):
        i = stack[t]
        r = rec[i]
        if r == i:
            continue
        s = U[i] / (A[i] ** m)
        if s < min_slope:
            s = min_slope
        h[i] = h[r] + dist[i] * s
    return h


@njit(cache=True)
def drain_downhill(h, rec, dist, stack, min_slope):
    """Every cell at least min_slope above its receiver (walked from the base level up)."""
    N = rec.shape[0]
    out = h.copy()
    for t in range(N):
        i = stack[t]
        r = rec[i]
        if r == i:
            continue
        lo = out[r] + dist[i] * min_slope
        if out[i] < lo:
            out[i] = lo
    return out


@njit(cache=True)
def talus(h, land, px, tan_max, iters, DR, DC, DD):
    H, W = h.shape
    for _ in range(iters):
        for r in range(1, H - 1):
            for c in range(1, W - 1):
                if not land[r, c]:
                    continue
                for k in range(8):
                    rr = r + DR[k]
                    cc = c + DC[k]
                    lim = tan_max * DD[k] * px
                    d = h[r, c] - h[rr, cc]
                    if d > lim and land[rr, cc]:
                        mv = 0.25 * (d - lim)
                        h[r, c] -= mv
                        h[rr, cc] += mv
    return h


# ---------------------------------------------------------------- rasters on a grid

class Grid:
    def __init__(self, cfg: Config, px_km: float):
        self.px = px_km
        self.W = int(round((cfg.x1_km - cfg.x0_km) / px_km))
        self.H = int(round((cfg.y1_km - cfg.y0_km) / px_km))
        self.x0, self.y1 = cfg.x0_km, cfg.y1_km
        from affine import Affine

        self.t = Affine(px_km * 1000, 0, cfg.x0_km * 1000, 0, -px_km * 1000, cfg.y1_km * 1000)  # metres (the layers' unit)

    def raster(self, geoms, ss: int = 1, all_touched: bool = False) -> np.ndarray:
        geoms = [g for g in geoms if g is not None and not g.is_empty]
        if not geoms:
            return np.zeros((self.H, self.W), np.float32)
        from affine import Affine

        m = features.rasterize(((g, 1) for g in geoms), out_shape=(self.H * ss, self.W * ss), transform=self.t * Affine.scale(1 / ss), fill=0, dtype="uint8", all_touched=all_touched)
        return cv2.resize(m.astype(np.float32), (self.W, self.H), interpolation=cv2.INTER_AREA) if ss > 1 else m.astype(np.float32)

    def cell(self, x_m: float, y_m: float) -> tuple[int, int]:
        return int((self.y1 * 1000 - y_m) / (self.px * 1000)), int((x_m - self.x0 * 1000) / (self.px * 1000))


def river_chains(grid: Grid, rivers, land_b: np.ndarray, lake_b: np.ndarray) -> tuple[np.ndarray, list[dict]]:
    """Rasterize the fixed rivers (source → mouth) into forced receivers. Longer rivers first; a tributary
    ends where it meets a cell another river already owns (the confluence). Returns forced[H*W] (-1 = free)."""
    H, W = land_b.shape
    forced = np.full(H * W, -1, np.int64)
    owner = np.full(H * W, -1, np.int64)
    info = []
    order = sorted(range(len(rivers)), key=lambda k: -rivers[k][1].length)
    for k in order:
        name, geom = rivers[k]
        lines = list(geom.geoms) if geom.geom_type == "MultiLineString" else [geom]
        for ln in lines:
            n = max(2, int(ln.length / (grid.px * 1000 * 0.35)))
            cells = []
            for t in np.linspace(0, 1, n):
                p = ln.interpolate(t, normalized=True)
                r, c = grid.cell(p.x, p.y)
                if 0 <= r < H and 0 <= c < W and (not cells or cells[-1] != (r, c)):
                    if cells:  # keep 8-connected
                        pr, pc = cells[-1]
                        while max(abs(r - pr), abs(c - pc)) > 1:
                            pr += int(np.sign(r - pr))
                            pc += int(np.sign(c - pc))
                            cells.append((pr, pc))
                    if not cells or cells[-1] != (r, c):
                        cells.append((r, c))
            chain = []
            end = "open"
            for r, c in cells:
                i = r * W + c
                if not land_b[r, c]:
                    end = "sea"
                    break
                if lake_b[r, c] and chain:
                    end = "lake"
                    chain.append(i)
                    break
                if owner[i] >= 0 and owner[i] != k:
                    end = "confluence"
                    chain.append(i)
                    break
                if chain and i == chain[-1]:
                    continue
                chain.append(i)
            # the chain's own cells (a joined cell keeps its owner's receiver)
            for a in range(len(chain) - 1):
                i = chain[a]
                if owner[i] < 0:
                    owner[i] = k
                    forced[i] = chain[a + 1]
            if chain and owner[chain[-1]] < 0 and end in ("sea", "open"):
                owner[chain[-1]] = k  # the mouth cell drains by steepest descent into the sea
            info.append({"name": name, "cells": len(chain), "end": end})
    return forced, info


def body_field(grid: Grid, polys, edge_km: float, ridge_km: float) -> tuple[np.ndarray, np.ndarray]:
    """0..1 'mountain body' per polygon: rises from the outline over edge_km (smoothstep of the inside
    distance), crowned along the ridge polyline when one is given. Returns (body, polygon id map)."""
    body = np.zeros((grid.H, grid.W), np.float32)
    ids = np.full((grid.H, grid.W), -1, np.int32)
    for k, (geom, ridge) in enumerate(polys):
        m = grid.raster([geom]) > 0.5
        if not m.any():
            continue
        din = ndimage.distance_transform_edt(m).astype(np.float32) * grid.px
        inr = float(din.max())
        e = min(edge_km, max(inr, grid.px))
        b = np.clip(din / e, 0, 1)
        b = b * b * (3 - 2 * b)
        if ridge is not None:
            rl = grid.raster([ridge], all_touched=True) > 0
            dr = ndimage.distance_transform_edt(~rl).astype(np.float32) * grid.px
            b = b * (0.55 + 0.45 * np.exp(-((dr / ridge_km) ** 2)))
        else:
            # no crest given: the body peaks along its medial axis
            b = b * (0.6 + 0.4 * np.clip(din / max(inr, 1e-3), 0, 1))
        upd = m & (b > body)
        body[upd] = b[upd]
        ids[m & (ids < 0)] = k
    return body, ids


def synthesize(cfg: Config):
    S = {**DEFAULTS, **{k: v for k, v in cfg.world.get("synth", {}).items() if k != "notes"}}
    seed = int(cfg.world["seeds"]["world"])
    g = Grid(cfg, float(S["workKmPerPixel"]))
    report: dict = {"work": [g.W, g.H, g.px]}
    with Timer(f"synth: rasters on the {g.W}x{g.H} work grid ({g.px} km/px)"):
        land_gdf = read_layer(cfg, "Land")
        if land_gdf.empty:
            raise SystemExit("synth: the source has no land.geojson (vectorize the scan first)")
        land_w = g.raster(land_gdf.geometry, ss=2)
        land_b = land_w >= 0.5
        lakes = read_layer(cfg, "lakes")
        lake_b = (g.raster(lakes.geometry) > 0.5) & land_b
        mtn = read_layer(cfg, "Mountains")
        hil = read_layer(cfg, "Hills")
        rv = read_layer(cfg, "Rivers")

        def ridge_of(row):
            r = row.get("ridge") if hasattr(row, "get") else None
            if isinstance(r, str):
                r = json.loads(r)
            return LineString([(x * 1000, y * 1000) for x, y in r]) if isinstance(r, (list, tuple)) and len(r) >= 2 else None

        # a feature smaller than a range body (or flagged peak: true) is a summit: a local height constraint
        # inside its range, not a body of its own
        # a sketched (label I) feature smaller than a range body, or one flagged peak: true, is a summit; traced
        # (label M) mountain areas are always bodies — their small blobs belong to their named range
        small = lambda row: bool(row.get("peak") is True) or (row.get("label") == "I" and row.geometry.area < (2.5 * S["edgeKm"] * 1000) ** 2)  # noqa: E731
        peaks = [(row.geometry.representative_point(), math.sqrt(row.geometry.area / math.pi) / 1000, row) for _, row in mtn.iterrows() if small(row)]
        mtn = mtn[[not small(row) for _, row in mtn.iterrows()]].reset_index(drop=True)
        mpolys = [(row.geometry, ridge_of(row)) for _, row in mtn.iterrows()]
        hpolys = [(row.geometry, None) for _, row in hil.iterrows()]
        mbody, mids = body_field(g, mpolys, S["edgeKm"], S["ridgeKm"])
        hbody, hids = body_field(g, hpolys, S["edgeKm"] * 0.8, S["ridgeKm"])
        # a traced map's continuous relief density (relief.npz, pnpm geo vectorize) shapes the bodies: the
        # drawn mountain symbols' density, not a polygon's inside distance
        from .source import vectors_dir

        rz = vectors_dir(cfg) / "relief.npz"
        if rz.exists():
            with np.load(rz) as z:
                md = cv2.resize(z["mountain"].astype(np.float32), (g.W, g.H), interpolation=cv2.INTER_AREA)
                hd = cv2.resize(z["hills"].astype(np.float32), (g.W, g.H), interpolation=cv2.INTER_AREA)
            sm = lambda e0, e1, x: np.clip((x - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((x - e0) / (e1 - e0), 0, 1))  # noqa: E731
            mbody = sm(0.12, 0.8, md).astype(np.float32)
            hbody = np.maximum(sm(0.1, 0.7, hd), 0.5 * sm(0.05, 0.25, md)).astype(np.float32)
            report["relief"] = "relief.npz"
        rivers = [(row.get("name") or f"river-{i}", row.geometry) for i, row in rv.iterrows()]

    with Timer("synth: uplift"):
        shp = (g.H, g.W)
        plains = 0.35 + 0.45 * (0.5 + 0.5 * fbm(shp, g.px, S["plainsNoiseKm"], seed + 11, 3)) + 0.35 * (0.5 + 0.5 * fbm(shp, g.px, S["plainsNoiseKm"] / 4, seed + 12, 3))
        rnoise = fbm(shp, g.px, S["ridgeNoiseKm"], seed + 23, 4, ridged=True)
        coast_d = ndimage.distance_transform_edt(land_b).astype(np.float32) * g.px
        coast_ramp = np.clip(coast_d / S["coastRampKm"], 0, 1)
        U = S["plainsUplift"] * plains * coast_ramp
        U = np.maximum(U, S["hillUplift"] * hbody * (1 - S["ridgeNoise"] * 0.5 + S["ridgeNoise"] * 0.5 * rnoise))
        U = np.maximum(U, S["mountainUplift"] * mbody * (1 - S["ridgeNoise"] + S["ridgeNoise"] * rnoise))
        U[~land_b] = 0
        U[lake_b] = 0
        U = U.astype(np.float64)

    with Timer("synth: stream power to equilibrium (fixed rivers)"):
        forced, rinfo = river_chains(g, rivers, land_b, lake_b)
        report["rivers"] = rinfo
        base = ~land_b | lake_b
        base_h = np.where(land_b, 0.0, 0.0).astype(np.float64).ravel()
        h = (U * 50 + 0.01 * plains).astype(np.float64)  # the uplift's own shape seeds the first network
        cell_area = g.px * g.px
        m = float(S["m"])
        for it in range(int(S["iterations"])):
            rec, dist, stack = flood_receivers(h, base, forced, g.px, 1e-6, _DR, _DC, _DD)
            A = accumulate(rec, stack, cell_area)
            hn = steady_heights(base_h, U.ravel(), rec, dist, stack, A, m, float(S["minSlope"])).reshape(shp)
            delta = float(np.abs(hn - h).mean() / max(hn.mean(), 1e-9))
            h = hn if it == 0 else 0.5 * h + 0.5 * hn
            if it in (0, int(S["iterations"]) - 1) or it % 5 == 4:
                print(f"[bake]   synth iteration {it + 1}: mean change {delta * 100:.2f} %")

    with Timer("synth: heights (peaks, plains, drainage)"):
        # gains: each range / hill area to its summit, the rest of the land to plainsPeakM
        gain = np.zeros(shp, np.float32)
        wsum = np.zeros(shp, np.float32)
        blur = S["gainBlurKm"] / g.px
        targets = []

        def add(mask_ids, gdf, kind):
            # one gain per named range (its traced pieces scale together), unnamed pieces one by one
            groups: dict = {}
            for k, (_, row) in enumerate(gdf.iterrows()):
                nm = row.get("name")
                key = nm if isinstance(nm, str) and nm else f"#{k}"
                groups.setdefault(key, []).append((k, row))
            for key, members in groups.items():
                sel = np.isin(mask_ids, [k for k, _ in members])
                if not sel.any():
                    continue
                row = members[0][1]
                pk = row.get("peakM")
                peak = float(pk) if isinstance(pk, (int, float)) and np.isfinite(pk) else (2500.0 if kind == "mountains" else 600.0)
                top = float(np.percentile(h[sel], 99.5))
                gk = peak / max(top, 1e-9)
                w = cv2.GaussianBlur(sel.astype(np.float32), (0, 0), max(blur, 0.5))
                gain[:] += w * gk
                wsum[:] += w
                targets.append({"name": row.get("name"), "kind": kind, "peakM": peak})

        add(mids, mtn, "mountains")
        add(hids, hil, "hills")
        free = land_b & (mids < 0) & (hids < 0)
        top_plain = float(np.percentile(h[free], 99)) if free.any() else 1.0
        wp = np.clip(1 - wsum, 0, 1)
        gain = (gain + wp * (S["plainsPeakM"] / max(top_plain, 1e-9))) / np.maximum(wsum + wp, 1e-6)
        hm = (h * gain).ravel()
        rec, dist, stack = flood_receivers(hm.reshape(shp), base, forced, g.px, 1e-6, _DR, _DC, _DD)
        hm = drain_downhill(hm, rec, dist, stack, 0.02)
        hm = hm.reshape(shp)
        # hard constraints (verified ledger heights): local corrections, reported
        cons = []
        peak_cons = []
        for c in S.get("summits", []):
            if c.get("atKm"):
                peak_cons.append({**c, "kind": "summit"})
        for pt, rad, row in peaks:
            pk = row.get("peakM")
            if isinstance(pk, (int, float)) and np.isfinite(pk):
                peak_cons.append({"id": row.get("name"), "atKm": [pt.x / 1000, pt.y / 1000], "heightM": float(pk), "radiusKm": max(rad * 2.5, 3 * g.px), "kind": "summit"})
        for c in [*peak_cons, *S.get("constraints", [])]:
            x, y = c["atKm"]
            r = int((g.y1 - y) / g.px)
            cc = int((x - g.x0) / g.px)
            if not (0 <= r < g.H and 0 <= cc < g.W):
                continue
            rad = float(c.get("radiusKm", 15)) / g.px
            yy, xx = np.mgrid[0 : g.H, 0 : g.W]
            bump = np.exp(-(((yy - r) ** 2 + (xx - cc) ** 2) / (2 * rad * rad))).astype(np.float32)
            d = float(c["heightM"]) - float(hm[r, cc])
            if c.get("kind") == "summit" and d < 0:
                continue  # a summit is a lower bound: never pull a range down to it
            hm = hm + d * bump * land_b
            cons.append({"id": c.get("id"), "heightM": c["heightM"], "correctionM": round(d, 1)})
        report["constraints"] = cons

    with Timer(f"synth: fine detail at {cfg.W}x{cfg.H} ({cfg.px_km} km/px)"):
        H, W = cfg.H, cfg.W
        hf = cv2.resize(hm.astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
        land_f = cv2.resize(land_w, (W, H), interpolation=cv2.INTER_LINEAR)
        from .vectors import raster_mask

        land_f = raster_mask(cfg, land_gdf.geometry, ss=2) if cfg.px_km < g.px else land_f
        lb = land_f >= 0.5
        relief = ndimage.maximum_filter(hf, size=max(3, int(12 / cfg.px_km))) - ndimage.minimum_filter(hf, size=max(3, int(12 / cfg.px_km)))
        det = np.zeros((H, W), np.float32)
        for k, s in enumerate(S["detailKm"]):
            if s >= 2 * cfg.px_km:
                det += fbm((H, W), cfg.px_km, s, seed + 300 + k, 2, ridged=True) - 0.45
        hf = hf + S["detailAmp"] * relief * det
        # one gully pass on the fine flow accumulation (gullies on the slopes, no change on flat ground)
        if S["gullyDepth"] > 0:
            fbase = ~lb
            ff = np.full(H * W, -1, np.int64)
            rec, dist, stack = flood_receivers(hf.astype(np.float64), fbase, ff, cfg.px_km, 1e-6, _DR, _DC, _DD)
            A = accumulate(rec, stack, cfg.px_km**2).reshape(H, W)
            gy, gx = np.gradient(hf, cfg.px_km * 1000)
            slope = np.hypot(gx, gy).astype(np.float32)
            cut = S["gullyDepth"] * relief * np.clip(np.sqrt(A / (25 * cfg.px_km**2)) * slope / 0.3, 0, 1)
            hf = hf - cut
        # the land rises gently inland (no plain sits at sea level far from the coast: the terrain shades ground
        # below ~14 m as beach), beaches stay at the coast
        dcoast = ndimage.distance_transform_edt(lb).astype(np.float32) * cfg.px_km
        hf = hf + S["inlandRiseM"] * (1 - np.exp(-dcoast / S["inlandRiseKm"]))
        hf = np.where(lb, np.maximum(hf, 2.0), hf).astype(np.float64)
        tan_max = math.tan(math.radians(S["talusDeg"]))
        hf = talus(hf, lb, cfg.px_km * 1000, tan_max, 6, _DR, _DC, _DD)
        # lakes: a shallow bed below the surrounding ground (the hydro step sets the level and shores)
        lk = (raster_mask_safe(cfg, lakes.geometry) > 0.5) & lb
        if lk.any():
            lab, n = ndimage.label(lk)
            for k in range(1, n + 1):
                sel = lab == k
                ring = ndimage.binary_dilation(sel, iterations=2) & ~sel & lb
                lvl = float(np.percentile(hf[ring], 20)) if ring.any() else float(hf[sel].mean())
                hf[sel] = np.minimum(hf[sel], lvl - S["lakeDepthM"])
        # the sea floor: deeper with the distance offshore
        dsea = ndimage.distance_transform_edt(~lb).astype(np.float32) * cfg.px_km
        sea = -(20 + S["seaDepthM"] * (1 - np.exp(-dsea / S["shelfKm"])))
        metres = np.where(lb, hf, sea).astype(np.float32)
    report["peaks"] = [{"name": t["name"], "peakM": t["peakM"]} for t in targets]
    report["maxM"] = float(metres.max())
    (cfg.cache / "synth_report.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"[bake]   synth: land {lb.mean() * 100:.1f} %, heights {metres[lb].min():.0f}..{metres.max():.0f} m; rivers fixed: " + ", ".join(f"{r['name']} {r['cells']} cells → {r['end']}" for r in rinfo[:8]) + ("…" if len(rinfo) > 8 else ""))
    return metres, land_f.astype(np.float32)


def raster_mask_safe(cfg: Config, geoms) -> np.ndarray:
    from .vectors import raster_mask

    return raster_mask(cfg, list(geoms))
