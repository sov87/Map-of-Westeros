"""Vectorize a georeferenced map sheet into the bake's GeoJSON layers (map km) — Phase 1.

  pnpm geo vectorize --map <id>     profile tools/geo/maps/<id>.json, image in data/source (never committed)

Pipeline (each step writes a debug PNG to data/source/westeros/vectors/debug/):
  water     blue-grey pixels (B > R, B ≳ G, unsaturated, not near-black: profile.water) — sea, lakes, rivers,
            the sea's ripple lines and its pale labels; saturated blue crests are excluded
  sea       water (closed over the coast's dark outline) connected to the frame edge; land = the rest of the
            frame; land reaching east of exclude.essosX (Essos) is dropped; specks are dropped
  lakes     thick water inside the land (an opening), ≥ minLakePx
  rivers    thin water inside the land → skeleton → a graph → branches oriented from their source to the sea
            (or a lake) along the network; short spurs and label fragments are pruned; gaps up to gapPx to
            another river, a lake or the sea are bridged
  terrain   a Gaussian (QDA) pixel classifier trained on the profile's windows (plain, desert, forest,
            mountain, hills, marsh) on blurred colour, texture and stroke-density features → smoothed class
            probabilities → forests, wetlands, mountain / hill polygons (summits from the profile's anchors) and
            relief.npz, the continuous mountain / hill density that drives the synthesized uplift
Every output feature carries label 'M' (traced from a map) and src = the map id. The user reviews the result on
the overlay page (pnpm geo overlay); nobody traces by hand.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage
from shapely.geometry import LineString, Polygon, mapping
from shapely.ops import unary_union

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[2]
CLASSES = ["plain", "desert", "forest", "mountain", "hills", "marsh"]


# ---------------------------------------------------------------- the sheet ↔ map km

class Sheet:
    def __init__(self, profile: dict):
        self.p = profile
        sc = profile["scale"]
        (x0, y0), (x1, y1) = sc["wallPx"]
        wall_px = math.hypot(x1 - x0, y1 - y0)
        self.km_per_px = sc["wallMiles"] * 1.609344 / wall_px
        f = profile["frame"]
        self.left = f["pxLeft"]
        self.top = f["pxTop"]
        self.w_px = f["widthKm"] / self.km_per_px
        self.h_px = f["heightKm"] / self.km_per_px
        self.bottom = self.top + self.h_px
        self.widthKm, self.heightKm = f["widthKm"], f["heightKm"]
        # a further sheet carries an affine from its control points (pnpm geo georef); the frame-defining sheet
        # uses its Wall scale and frame crop
        self.affine = profile.get("affine")

    def box(self) -> tuple[int, int, int, int]:
        return int(round(self.left)), int(round(self.top)), int(round(self.left + self.w_px)), int(round(self.bottom))

    def km(self, x_px: float, y_px: float) -> tuple[float, float]:
        """sheet pixel (x right, y down; pixel centres at +0.5) → map km [x east, y north]"""
        if self.affine:
            a, b, c, d, e, f = self.affine
            return a * x_px + b * y_px + c, d * x_px + e * y_px + f
        return (x_px - self.left) * self.km_per_px, (self.bottom - y_px) * self.km_per_px

    def px(self, x_km: float, y_km: float) -> tuple[float, float]:
        if self.affine:
            a, b, c, d, e, f = self.affine
            det = a * e - b * d
            x, y = x_km - c, y_km - f
            return (e * x - b * y) / det, (-d * x + a * y) / det
        return self.left + x_km / self.km_per_px, self.bottom - y_km / self.km_per_px


def load_profile(map_id: str) -> dict:
    return json.loads((ROOT / "tools" / "geo" / "maps" / f"{map_id}.json").read_text(encoding="utf-8"))


def load_image(source: Path, profile: dict) -> np.ndarray:
    rel = profile["file"]
    p = source / Path(rel).relative_to("data/source") if rel.startswith("data/source") else ROOT / rel
    if not p.exists():
        raise SystemExit(f"[geo] map image missing: {p} (it is never committed — copy the user's file there)")
    return np.asarray(Image.open(p).convert("RGB"))


# ---------------------------------------------------------------- masks

def water_mask(img: np.ndarray, w: dict) -> np.ndarray:
    a = img.astype(np.int16)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1)
    mn = a.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1)
    m = (B - R > w["minBR"]) & (B - G > w["minBG"]) & (sat < w["maxSat"]) & (mx > w["minMax"]) & (mx < w.get("maxMax", 256))
    t = w.get("teal")
    if t:
        m |= (G - R > t["minGR"]) & (B - R > t["minBR"]) & (mx < t["maxMax"]) & (mx > t["minMax"]) & (sat < t.get("maxSat", 1.0))
    return m


def disk(r: int) -> np.ndarray:
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def plain_land(img: np.ndarray) -> np.ndarray:
    """Pixels of the map's land paint (cream, tan, olive, ochre: mid-light, moderately saturated) — not the
    dark strokes of labels and coast outlines, not the saturated or black-and-white paint of crests."""
    a = img.astype(np.int16)
    mx = a.max(-1)
    mn = a.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1)
    warm = (a[..., 0] >= a[..., 2] + 12) & (a[..., 1] >= a[..., 2])
    return warm & (mx > 120) & (sat > 0.12) & (sat < 0.6)


def sea_and_land(water: np.ndarray, essos_x: int, min_island_px: int, img: np.ndarray | None = None, islet_px: int = 2500, islet_paint: float = 0.55) -> tuple[np.ndarray, np.ndarray, dict]:
    H, W = water.shape
    wc = cv2.morphologyEx(water.astype(np.uint8), cv2.MORPH_CLOSE, disk(3)) > 0
    lab, n = ndimage.label(wc)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    sea = np.isin(lab, list(border))
    # land = not sea; drop Essos and specks; holes in the land that are not sea are lakes / rivers
    land = ~sea
    llab, ln = ndimage.label(land)
    objs = ndimage.find_objects(llab)
    sizes = ndimage.sum(np.ones_like(llab), llab, range(1, ln + 1))
    keep = np.zeros(ln + 1, bool)
    dropped = {"essos": 0, "specks": 0, "labels": 0}
    paint = plain_land(img) if img is not None else None
    # thin land (the sea's ripple lines, its labels) vanishes under an opening; real islets survive it
    core = cv2.morphologyEx(land.astype(np.uint8), cv2.MORPH_OPEN, disk(2)) > 0
    core_sizes = ndimage.sum(core, llab, range(1, ln + 1))
    for k in range(1, ln + 1):
        sl = objs[k - 1]
        if sl[1].stop > essos_x:
            dropped["essos"] += 1
            continue
        if sizes[k - 1] < min_island_px or core_sizes[k - 1] < min_island_px / 2:
            dropped["specks"] += 1
            continue
        if img is not None and sizes[k - 1] < islet_px:
            # a small piece of 'land' must be mostly land paint: labels and crests in the sea are not
            sel = llab[sl] == k
            inner = cv2.erode(sel.astype(np.uint8), disk(1)) > 0
            share = float(paint[sl][inner].mean()) if inner.any() else 0.0
            if share < islet_paint:
                dropped["labels"] += 1
                continue
        keep[k] = True
    land = keep[llab]
    # sea re-derived: everything that is not kept land (Essos and specks become sea)
    sea = ~land
    return sea, land, {"landComponents": int(keep.sum()), **dropped}


def lakes_and_rivers(water: np.ndarray, land: np.ndarray, min_lake_px: int, max_hole_px: int = 400) -> tuple[np.ndarray, np.ndarray]:
    inland = water & land
    # thick water: a lake is wider than a river (ring-shaped lakes round an island stay: a small opening)
    thick = cv2.morphologyEx(inland.astype(np.uint8), cv2.MORPH_OPEN, disk(2)) > 0
    lab, n = ndimage.label(thick)
    sizes = ndimage.sum(thick, lab, range(1, n + 1))
    lakes = np.isin(lab, [k + 1 for k, s in enumerate(sizes) if s >= min_lake_px])
    lakes = cv2.morphologyEx(lakes.astype(np.uint8), cv2.MORPH_CLOSE, disk(3)) > 0
    # fill small holes (labels written across the water), never islands (the Isle of Faces)
    holes = ndimage.binary_fill_holes(lakes) & ~lakes
    hl, hn = ndimage.label(holes)
    if hn:
        hs = ndimage.sum(holes, hl, range(1, hn + 1))
        lakes |= np.isin(hl, [k + 1 for k, v in enumerate(hs) if v <= max_hole_px])
    rivers = inland & ~cv2.dilate(lakes.astype(np.uint8), disk(2)).astype(bool)
    return lakes, rivers


# ---------------------------------------------------------------- the river network

_NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def skeleton_graph(sk: np.ndarray):
    """Branches of an 8-connected skeleton: lists of (r, c) between nodes (ends / junctions)."""
    H, W = sk.shape
    pts = set(zip(*np.nonzero(sk)))
    deg = {}
    for r, c in pts:
        deg[(r, c)] = sum((r + dr, c + dc) in pts for dr, dc in _NB)
    nodes = {p for p, d in deg.items() if d != 2}
    seen_edges = set()
    branches = []
    for n0 in nodes:
        for dr, dc in _NB:
            nb = (n0[0] + dr, n0[1] + dc)
            if nb not in pts or (n0, nb) in seen_edges:
                continue
            path = [n0, nb]
            seen_edges.add((n0, nb))
            prev, cur = n0, nb
            while cur not in nodes:
                nxt = None
                for ddr, ddc in _NB:
                    q = (cur[0] + ddr, cur[1] + ddc)
                    if q in pts and q != prev and q not in path[-3:]:
                        nxt = q
                        break
                if nxt is None:
                    break
                path.append(nxt)
                prev, cur = cur, nxt
            seen_edges.add((path[-1], path[-2]))
            branches.append(path)
    # loops without nodes (rings) are ignored: rivers are trees
    return branches, nodes


def bridge_gaps(sk: np.ndarray, targets: np.ndarray, reach: int) -> np.ndarray:
    """Join each skeleton end to the nearest skeleton pixel of ANOTHER component, or a target pixel (sea /
    lake), within `reach` px and 60° of the end's own direction."""
    out = sk.copy().astype(np.uint8)
    lab, _ = ndimage.label(sk, structure=np.ones((3, 3)))
    H, W = sk.shape
    nb = ndimage.convolve(sk.astype(np.uint8), np.ones((3, 3), np.uint8), mode="constant") - sk.astype(np.uint8)
    ends = np.argwhere(sk & (nb == 1))
    pts = np.argwhere(sk)
    from scipy.spatial import cKDTree

    tree = cKDTree(pts)
    tpts = np.argwhere(targets & (ndimage.binary_dilation(targets) ^ ndimage.binary_erosion(targets)))
    ttree = cKDTree(tpts) if len(tpts) else None
    for r, c in ends:
        own = lab[r, c]
        near = [pts[i] for i in tree.query_ball_point((r, c), 7) if lab[tuple(pts[i])] == own]
        if len(near) < 3:
            continue
        back = np.mean(near, axis=0)
        d = np.array([r, c], float) - back
        L = np.hypot(*d)
        if L < 1e-6:
            continue
        d /= L
        best, bd = None, 1e9
        for i in tree.query_ball_point((r, c), reach):
            q = pts[i]
            if lab[tuple(q)] == own:
                continue
            v = q - (r, c)
            dist = np.hypot(*v)
            if dist > 0 and (v @ d) / dist > 0.5 and dist < bd:
                best, bd = q, dist
        if ttree is not None:
            for i in ttree.query_ball_point((r, c), reach):
                q = tpts[i]
                v = q - (r, c)
                dist = np.hypot(*v)
                if dist > 0 and (v @ d) / dist > 0.5 and dist < bd:
                    best, bd = q, dist
        if best is not None:
            cv2.line(out, (int(c), int(r)), (int(best[1]), int(best[0])), 1, 1)
    return out > 0


def fill_small_holes(mask: np.ndarray, max_px: int) -> np.ndarray:
    """Fill enclosed holes up to max_px (8-connected background counts as one hole)."""
    holes = ndimage.binary_fill_holes(mask) & ~mask
    hl, hn = ndimage.label(holes)
    if not hn:
        return mask
    hs = ndimage.sum(holes, hl, range(1, hn + 1))
    return mask | np.isin(hl, [k + 1 for k, v in enumerate(hs) if v <= max_px])


def trace_rivers(rivers: np.ndarray, sea: np.ndarray, lakes: np.ndarray, min_len_px: int, gap_px: int, bridge_px: int = 16, ring_hole_px: int = 300, ink: np.ndarray | None = None) -> list[list[tuple[float, float]]]:
    from skimage.morphology import skeletonize

    # rivers are drawn 1–3 px wide; close tiny breaks, thin to one pixel. A small closed ring (a castle marker's
    # circle, a river drawn round a label) is filled first, so it thins to a short spur that is pruned below
    # instead of a loop: a loop in a traced river becomes a drainage cycle in the bake.
    rv = cv2.morphologyEx(rivers.astype(np.uint8), cv2.MORPH_CLOSE, disk(2)) > 0
    rv = fill_small_holes(rv, ring_hole_px)
    sk = skeletonize(rv)
    # bridge the breaks a castle dot, crest or label leaves in a river: every loose end looks ahead (its own
    # direction ± 60°) up to bridgePx for another river piece, a lake or the sea, and joins it with a line
    lab, n = ndimage.label(sk, structure=np.ones((3, 3)))
    sizes = ndimage.sum(sk, lab, range(1, n + 1))
    sk = np.isin(lab, [k + 1 for k, s in enumerate(sizes) if s >= 10])
    sk = bridge_gaps(sk, sea | lakes, bridge_px)
    sk = skeletonize(fill_small_holes(cv2.dilate(sk.astype(np.uint8), disk(1)) > 0, ring_hole_px))
    # drop skeleton components shorter than min_len (label fragments, crest bits)
    lab, n = ndimage.label(sk, structure=np.ones((3, 3)))
    sizes = ndimage.sum(sk, lab, range(1, n + 1))
    sk = np.isin(lab, [k + 1 for k, s in enumerate(sizes) if s >= min_len_px])
    branches, nodes = skeleton_graph(sk)
    # prune short spurs (one free end, short) twice
    for _ in range(2):
        endc = {}
        for b in branches:
            for e in (b[0], b[-1]):
                endc[e] = endc.get(e, 0) + 1
        branches = [b for b in branches if not (len(b) < min_len_px // 2 and (endc[b[0]] == 1 or endc[b[-1]] == 1) and not (endc[b[0]] == 1 and endc[b[-1]] == 1))]
    # a river network is a tree. Where branches close a loop (a river's name lettered along it in the same blue,
    # a crest's ring, a bridge back into its own river) keep the darkest ink and drop the palest branch of each
    # loop: a minimum spanning forest by the branch's mean brightness on the sheet (bridged gaps read as paper)
    if ink is not None and branches:
        par: dict = {}

        def find(x):
            while par.setdefault(x, x) != x:
                par[x] = par[par[x]]
                x = par[x]
            return x

        def pale(b):
            rr, cc = np.array(b).T
            return float(ink[rr, cc].mean())

        # junction stubs (a few px between skeleton nodes) are part of their junction: contracted first, so a
        # loop is decided between real branches, never by dropping a stub
        tree = []
        for b in (b for b in branches if len(b) <= 3):
            ra, rz = find(b[0]), find(b[-1])
            if ra != rz:  # a stub closing a triangle inside its junction is redundant
                par[ra] = rz
                tree.append(b)
        for b in sorted((b for b in branches if len(b) > 3), key=pale):
            ra, rz = find(b[0]), find(b[-1])
            if ra != rz:
                par[ra] = rz
                tree.append(b)
        branches = tree
    # outlets: branch ends next to the sea or a lake (within gap_px)
    sea_d = ndimage.distance_transform_edt(~sea)
    lake_d = ndimage.distance_transform_edt(~lakes) if lakes.any() else np.full(sea.shape, 1e9)
    # network distance to an outlet, by Dijkstra over branch lengths
    import heapq

    adj: dict = {}
    for i, b in enumerate(branches):
        adj.setdefault(b[0], []).append((b[-1], len(b), i))
        adj.setdefault(b[-1], []).append((b[0], len(b), i))
    dist = {}
    q = []
    for v in adj:
        if sea_d[v] <= gap_px:
            dist[v] = 0.0
            heapq.heappush(q, (0.0, v))
        elif lake_d[v] <= gap_px:
            dist[v] = 1.0  # a lake is an outlet, slightly worse than the sea
            heapq.heappush(q, (1.0, v))
    while q:
        d, v = heapq.heappop(q)
        if d > dist.get(v, 1e18):
            continue
        for u, L, _ in adj[v]:
            nd = d + L
            if nd < dist.get(u, 1e18):
                dist[u] = nd
                heapq.heappush(q, (nd, u))
    lines = []
    for b in branches:
        a, z = b[0], b[-1]
        da, dz = dist.get(a), dist.get(z)
        if da is None and dz is None:
            # disconnected: flows toward its end nearer the sea
            da, dz = float(sea_d[a]), float(sea_d[z])
        elif da is None:
            da = dz + len(b)
        elif dz is None:
            dz = da + len(b)
        path = b if da >= dz else b[::-1]  # source (farther from the outlet) → mouth
        lines.append([(c + 0.5, r + 0.5) for r, c in path])
    return lines


# ---------------------------------------------------------------- the terrain classifier

def features(img: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB).astype(np.float32)
    L = lab[..., 0]
    a = img.astype(np.int16)
    dark = ((L < 95) & (np.abs(a[..., 0] - a[..., 2]) < 70)).astype(np.float32)
    green = ((a[..., 1] > a[..., 0] - 4) & (L < 150) & (a[..., 1] > a[..., 2] + 10)).astype(np.float32)
    f = []
    for s in (3.0, 9.0):
        f.append(cv2.GaussianBlur(lab, (0, 0), s))
    mu = cv2.GaussianBlur(L, (0, 0), 5)
    sd = np.sqrt(np.maximum(cv2.GaussianBlur(L * L, (0, 0), 5) - mu * mu, 0))
    f += [sd[..., None], cv2.GaussianBlur(dark, (0, 0), 6)[..., None] * 100, cv2.GaussianBlur(green, (0, 0), 6)[..., None] * 100]
    return np.concatenate(f, axis=-1)


def classify(feat: np.ndarray, train: dict, scale: float) -> np.ndarray:
    """Gaussian class-conditional densities (QDA) → per-class posterior [H, W, C]."""
    X = feat.reshape(-1, feat.shape[-1]).astype(np.float64)
    H, W = feat.shape[:2]
    logp = np.full((X.shape[0], len(CLASSES)), -1e30)
    rng = np.random.default_rng(298)
    for k, cls in enumerate(CLASSES):
        boxes = train.get(cls, [])
        if not boxes:
            continue
        S = []
        for x0, y0, x1, y1 in boxes:
            sub = feat[int(y0 * scale) : int(y1 * scale), int(x0 * scale) : int(x1 * scale)].reshape(-1, feat.shape[-1])
            S.append(sub)
        S = np.concatenate(S).astype(np.float64)
        if len(S) > 6000:
            S = S[rng.choice(len(S), 6000, replace=False)]
        mu = S.mean(0)
        C = np.cov(S.T) + np.eye(S.shape[1]) * 1.0
        Ci = np.linalg.inv(C)
        _, logdet = np.linalg.slogdet(C)
        D = X - mu
        logp[:, k] = -0.5 * np.einsum("ij,jk,ik->i", D, Ci, D) - 0.5 * logdet
    logp -= logp.max(1, keepdims=True)
    P = np.exp(logp)
    P /= P.sum(1, keepdims=True)
    return P.reshape(H, W, len(CLASSES)).astype(np.float32)


# ---------------------------------------------------------------- polygons

def polygons(mask: np.ndarray, sheet: Sheet, ox: int, oy: int, scale: float, simplify_px: float, min_area_px: float) -> list[Polygon]:
    m = (mask > 0).astype(np.uint8)
    cnts, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None:
        return out
    hier = hier[0]
    for i, c in enumerate(cnts):
        if hier[i][3] != -1 or cv2.contourArea(c) < min_area_px:
            continue
        ring = [sheet.km(ox + (p[0][0] + 0.5) / scale, oy + (p[0][1] + 0.5) / scale) for p in c]
        holes = []
        j = hier[i][2]
        while j != -1:
            if cv2.contourArea(cnts[j]) >= min_area_px:
                holes.append([sheet.km(ox + (p[0][0] + 0.5) / scale, oy + (p[0][1] + 0.5) / scale) for p in cnts[j]])
            j = hier[j][0]
        if len(ring) < 3:
            continue
        poly = Polygon(ring, [h for h in holes if len(h) >= 3]).buffer(0)
        poly = poly.simplify(simplify_px * sheet.km_per_px / scale, preserve_topology=True)
        if not poly.is_empty:
            out.append(poly)
    return out


def feat(geom, src: str, **props):
    return {"type": "Feature", "properties": {"label": "M", "src": src, **props}, "geometry": mapping(geom)}


def save(out: Path, name: str, feats: list) -> None:
    (out / f"{name}.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}), encoding="utf-8")


def nearest_anchor(anchors: list, x_px: float, y_px: float):
    best, bd = None, 1e18
    for a in anchors:
        d = math.hypot(a["px"][0] - x_px, a["px"][1] - y_px)
        if d < a.get("radiusPx", 200) and d < bd:
            best, bd = a, d
    return best


# ---------------------------------------------------------------- main

def vectorize(source: Path, map_id: str) -> None:
    prof = load_profile(map_id)
    sheet = Sheet(prof)
    img_full = load_image(source, prof)
    x0, y0, x1, y1 = sheet.box()
    img = img_full[y0:y1, x0:x1].copy()
    H, W = img.shape[:2]
    out = source / "westeros" / "vectors"
    dbg = out / "debug"
    dbg.mkdir(parents=True, exist_ok=True)
    print(f"[geo] {map_id}: {sheet.km_per_px:.4f} km/px (the Wall = {prof['scale']['wallMiles']} mi); frame {sheet.widthKm} x {sheet.heightKm} km = sheet px {x0}..{x1} x {y0}..{y1}")
    sb = prof["scale"].get("scaleBar")
    if sb:
        bar = sb["segmentMiles"] * 1.609344 / sb["segmentPx"]
        print(f"[geo]   scale bar: {bar:.4f} km/px → the Wall would be {math.hypot(*np.subtract(*prof['scale']['wallPx'])) * bar / 1.609344:.0f} mi ({(bar / sheet.km_per_px - 1) * 100:+.1f} % vs the Wall calibration)")

    water = water_mask(img, prof["water"])
    # water the sheet hides under its decorations (a crest painted over a bay) where the books need it: the
    # profile's forceSea polygons (sheet px), reviewed on the overlay like every other correction
    forced_sea = np.zeros(water.shape, bool)
    for poly in prof.get("forceSea", {}).get("px", []):
        pm = np.zeros(water.shape, np.uint8)
        cv2.fillPoly(pm, [np.round(np.array(poly, float) - [x0, y0]).astype(np.int32)], 1)
        forced_sea |= pm.astype(bool)
    water |= forced_sea
    sea, land, info = sea_and_land(water, prof["exclude"]["essosX"] - x0, min_island_px=int(prof.get("minIslandPx", 40)), img=img, islet_px=int(prof.get("isletPx", 2500)), islet_paint=float(prof.get("isletPaint", 0.55)))
    # thin protrusions of the land (sea labels' halos touching a coast) go; capes wider than ~5 px stay
    land = cv2.morphologyEx(land.astype(np.uint8), cv2.MORPH_OPEN, disk(2)) > 0
    lakes, _ = lakes_and_rivers(water, land, int(prof.get("minLakePx", 80)))
    # rivers are drawn thin and anti-aliased: a looser colour rule (water.river) keeps them continuous
    rw = water_mask(img, {**prof["water"], **prof["water"].get("river", {})})
    rivers = rw & land & ~cv2.dilate(lakes.astype(np.uint8), disk(2)).astype(bool)
    # a 'lake' within a few px of the sea is an inlet cut off by a label: it is sea
    near_sea = cv2.dilate((~land).astype(np.uint8), disk(int(prof.get("inletPx", 6)))) > 0
    llab, ln = ndimage.label(lakes)
    inlets = [k for k in range(1, ln + 1) if (near_sea & (llab == k)).any()]
    if inlets:
        cut = np.isin(llab, inlets)
        land &= ~cut
        lakes &= ~cut
    # crests whose paint matches lake water too closely for the colour rule: listed in the profile (sheet px)
    if prof.get("notLakes", {}).get("px"):
        llab, ln = ndimage.label(lakes)
        drop = set()
        for x, y in prof["notLakes"]["px"]:
            r, c = int(round(y - y0)), int(round(x - x0))
            win = llab[max(r - 8, 0) : r + 9, max(c - 8, 0) : c + 9]
            drop |= {int(v) for v in np.unique(win) if v}
        lakes &= ~np.isin(llab, sorted(drop))
    sea = ~land
    print(f"[geo]   land {land.mean() * 100:.1f} % of the frame, {info}; lakes {int(ndimage.label(lakes)[1])}; river pixels {int(rivers.sum())}")
    Image.fromarray((np.dstack([land, lakes, rivers]) * 255).astype(np.uint8)).resize((W // 2, H // 2)).save(dbg / "water.png")

    src = map_id
    land_polys = polygons(land, sheet, x0, y0, 1.0, 0.8, 30)
    save(out, "land", [feat(p, src, name="Westeros") for p in land_polys])
    lake_polys = polygons(lakes, sheet, x0, y0, 1.0, 0.8, 30)
    save(out, "lakes", [feat(p, src, name=None) for p in lake_polys])
    # river reaches the sheet hides under a label or a crest (profile forceRivers, sheet px): drawn into the
    # river mask before tracing, so the network is oriented through them (a reach ending in forced sea is an
    # outlet like any mouth)
    for fr in prof.get("forceRivers", {}).get("px", []):
        pl = np.round(np.array(fr, float) - [x0, y0]).astype(np.int32)
        rm = rivers.astype(np.uint8)
        cv2.polylines(rm, [pl], False, 1, thickness=2)
        rivers = rm.astype(bool) & land
    lines = trace_rivers(rivers, sea, lakes, int(prof.get("minRiverComponentPx", prof.get("minRiverPx", 30))), int(prof.get("gapPx", 6)), int(prof.get("bridgePx", 16)), int(prof.get("ringHolePx", 300)), ink=img.max(axis=-1))
    rfeats = []
    for i, ln in enumerate(lines):
        g = LineString([sheet.km(x0 + x, y0 + y) for x, y in ln]).simplify(0.7 * sheet.km_per_px)
        if g.length > 0:
            rfeats.append(feat(g, src, name=None, id=f"r{i}"))
    save(out, "rivers", rfeats)
    print(f"[geo]   {len(land_polys)} land polygons, {len(lake_polys)} lakes, {len(rfeats)} river branches ({sum(f_['geometry'] and LineString(f_['geometry']['coordinates']).length for f_ in rfeats):.0f} km)")

    # terrain classes at half resolution
    sc = 0.5
    small = cv2.resize(img, (int(W * sc), int(H * sc)), interpolation=cv2.INTER_AREA)
    F = features(small)
    tr = {k: [[(b[0] - x0), (b[1] - y0), (b[2] - x0), (b[3] - y0)] for b in v] for k, v in prof["train"].items() if k != "notes"}
    P = classify(F, tr, sc)
    land_s = cv2.resize(land.astype(np.uint8), (P.shape[1], P.shape[0]), interpolation=cv2.INTER_NEAREST).astype(bool)
    lakes_s = cv2.resize(lakes.astype(np.uint8), (P.shape[1], P.shape[0]), interpolation=cv2.INTER_NEAREST).astype(bool)
    inland = (cv2.erode(land_s.astype(np.uint8), disk(3)).astype(bool) & ~cv2.dilate(lakes_s.astype(np.uint8), disk(2)).astype(bool)).astype(np.float32)
    sm = {c: cv2.GaussianBlur(P[..., k] * inland, (0, 0), 4) * land_s for k, c in enumerate(CLASSES)}
    # the mountains' fringe reads as forest (mixed symbols): no forest where mountains dominate nearby
    sm["forest"] = sm["forest"] * np.clip(1.5 - 2.0 * cv2.GaussianBlur(sm["mountain"], (0, 0), 6), 0, 1)
    # marsh only where the profile allows it (the Neck); elsewhere its probability goes to the hills
    keep = np.zeros_like(land_s)
    for kx, ky, kr in prof.get("marsh", {}).get("keepNear", []):
        cv2.circle(keep, (int((kx - x0) * sc), int((ky - y0) * sc)), int(kr * sc), 1, -1)
    if prof.get("marsh", {}).get("keepNear"):
        sm["hills"] = sm["hills"] + sm["marsh"] * (1 - keep)
        sm["marsh"] = sm["marsh"] * keep
    pal = np.array([[205, 190, 150], [215, 150, 90], [40, 110, 40], [110, 80, 60], [170, 140, 100], [80, 130, 130]], np.float32)
    viz = np.einsum("hwc,cd->hwd", np.stack([sm[c] for c in CLASSES], -1), pal)
    Image.fromarray(np.clip(viz, 0, 255).astype(np.uint8)).save(dbg / "terrain.png")

    anchors = prof["ranges"]["anchors"]
    feats_m, feats_h = [], []
    for mask, kind in ((sm["mountain"] > 0.45, "mountains"), (sm["hills"] + sm["mountain"] > 0.5, "hills")):
        m = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, disk(2))
        for p in polygons(m, sheet, x0, y0, sc, 1.5, 60):
            c = p.representative_point()
            cx, cy = sheet.px(c.x, c.y)
            a = nearest_anchor(anchors, cx, cy)
            if kind == "mountains":
                peak = a["peakM"] if a else prof["ranges"]["defaultPeakM"]
                feats_m.append(feat(p, src, name=a["name"] if a else None, peakM=peak))
            else:
                feats_h.append(feat(p, src, name=(a["name"] + " (foothills)") if a else None, peakM=prof["ranges"]["hillPeakM"]))
    save(out, "mountains", feats_m)
    save(out, "hills", feats_h)
    fanch = prof.get("forests", {}).get("anchors", [])
    ffeats = []
    for p in polygons(cv2.morphologyEx((sm["forest"] > 0.5).astype(np.uint8), cv2.MORPH_OPEN, disk(1)), sheet, x0, y0, sc, 1.0, 20):
        c = p.representative_point()
        a = nearest_anchor(fanch, *sheet.px(c.x, c.y))
        ffeats.append(feat(p, src, name=a["name"] if a else "forest", type="Forest"))
    save(out, "forests", ffeats)
    wfeats = [feat(p, src, name="marsh") for p in polygons(cv2.morphologyEx((sm["marsh"] > 0.5).astype(np.uint8), cv2.MORPH_OPEN, disk(2)), sheet, x0, y0, sc, 1.5, 80)]
    save(out, "wetlands", wfeats)
    # the continuous relief density (map km frame, row 0 = north) for the synthesized uplift
    np.savez_compressed(out / "relief.npz", mountain=sm["mountain"].astype(np.float16), hills=sm["hills"].astype(np.float16), desert=sm["desert"].astype(np.float16), widthKm=sheet.widthKm, heightKm=sheet.heightKm)
    print(f"[geo]   terrain: {len(feats_m)} mountain areas, {len(feats_h)} hill areas, {len(ffeats)} forests, {len(wfeats)} marsh areas → {out}")
    (out / "vectorize.json").write_text(json.dumps({"map": map_id, "kmPerPx": sheet.km_per_px, "frame": [sheet.widthKm, sheet.heightKm], **info}, indent=1), encoding="utf-8")
