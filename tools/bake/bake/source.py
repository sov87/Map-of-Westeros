"""Where the bake's geography comes from (world.json → source).

Middle-earth read a third-party DEM and GeoPackage; Westeros has neither. Its geography is:
  • vectors  — traced from the user's official maps by tools/geo (Phase 1): one GeoJSON file per layer in
               map KILOMETRES [x east, y north], in `source.vectors` (gitignored data/source/…). They are read
               here and scaled to metres so the inherited bake (hydro, vectors, export) runs unchanged.
  • elevation — synthesized, never measured: kind 'synth' runs tools/bake/bake/synth.py (uplift from the
               traced mountain / hill areas, stream-power erosion along the fixed rivers, lakes, a sea shelf);
               kind 'placeholder' is the Phase 0 flat slab.

Layer files (all optional; a missing file is an empty layer):
  land.geojson       Polygon / MultiPolygon land (islands included); the coast for synth
  coastline.geojson  LineString coast barrier for the sea flood fill (optional when land exists)
  rivers.geojson     LineString, props: name, [cls], [origin]
  lakes.geojson      Polygon, props: name
  roads.geojson      LineString, props: name
  forests.geojson    Polygon, props: name, type ('Forest' | 'Clearing')
  wetlands.geojson   Polygon (the Neck's bogs and other marsh)
  vulcanism.geojson  Polygon (volcanic ground: Dragonstone)
  mountains.geojson  Polygon, props: name, [peakM], [ridge] — uplift for synth
  hills.geojson      Polygon, props: name, [peakM] — low uplift for synth
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely import affinity
from shapely.geometry import shape

from .config import Config

# the inherited bake's layer names (ME GeoPackage) → Westeros GeoJSON files
LAYER_FILES = {
    "Coastline": "coastline",
    "Land": "land",
    "Rivers": "rivers",
    "lakes": "lakes",
    "Roads": "roads",
    "forests": "forests",
    "Wetlands": "wetlands",
    "Vulcanism": "vulcanism",
    "Mountains": "mountains",
    "Hills": "hills",
}
# columns the inherited code expects per layer (filled with None when a file lacks them)
COLUMNS = {
    "Rivers": ["name"],
    "lakes": ["NAME"],
    "Roads": ["name"],
    "forests": ["name", "type"],
    "Mountains": ["name", "peakM"],
    "Hills": ["name", "peakM"],
}


def kind(cfg: Config) -> str:
    k = cfg.world["source"]["kind"]
    if k not in ("placeholder", "synth"):
        raise SystemExit(f"world.json source.kind '{k}': expected 'placeholder' or 'synth'")
    return k


def vectors_dir(cfg: Config) -> Path:
    return cfg.path(*cfg.world["source"]["vectors"].split("/"))


def stamp(cfg: Config) -> str:
    """Content hash of every vector file (cache key of the steps that read them)."""
    h = hashlib.sha256(kind(cfg).encode())
    d = vectors_dir(cfg)
    if kind(cfg) == "synth" and d.is_dir():
        for p in sorted(d.glob("*.geojson")):
            h.update(p.name.encode())
            h.update(p.read_bytes())
    return h.hexdigest()[:16]


def read_layer(cfg: Config, layer: str) -> gpd.GeoDataFrame:
    """A layer as a GeoDataFrame in METRES (the inherited bake's unit). Empty for the placeholder."""
    cols = COLUMNS.get(layer, [])
    empty = gpd.GeoDataFrame({c: pd.Series([], dtype=object) for c in cols}, geometry=gpd.GeoSeries([], crs=None), crs=None)
    if kind(cfg) == "placeholder":
        return empty
    name = LAYER_FILES.get(layer)
    if name is None:
        raise KeyError(f"unknown vector layer '{layer}'")
    p = vectors_dir(cfg) / f"{name}.geojson"
    if not p.exists():
        return empty
    gj = json.loads(p.read_text(encoding="utf-8"))
    rows, geoms = [], []
    for f in gj.get("features", []):
        if not f.get("geometry"):
            continue
        props = dict(f.get("properties") or {})
        if layer == "lakes" and "NAME" not in props:
            props["NAME"] = props.get("name")
        rows.append(props)
        geoms.append(affinity.scale(shape(f["geometry"]), 1000.0, 1000.0, origin=(0, 0)))
    if not rows:
        return empty
    gdf = gpd.GeoDataFrame(rows, geometry=geoms, crs=None)
    for c in cols:
        if c not in gdf.columns:
            gdf[c] = None
    return gdf


def placeholder_elevation(cfg: Config) -> tuple[np.ndarray, np.ndarray]:
    """Phase 0: a flat land slab inset from the frame edge, sea around it (metres, land fraction)."""
    P = cfg.world["source"].get("placeholder", {})
    inset = float(P.get("insetKm", 150))
    land_m = float(P.get("landMetres", 60))
    sea_m = float(P.get("seaMetres", -400))
    rows = cfg.y1_km - (np.arange(cfg.H) + 0.5) * cfg.px_km
    cols = cfg.x0_km + (np.arange(cfg.W) + 0.5) * cfg.px_km
    inside_y = (rows > cfg.y0_km + inset) & (rows < cfg.y1_km - inset)
    inside_x = (cols > cfg.x0_km + inset) & (cols < cfg.x1_km - inset)
    land = (inside_y[:, None] & inside_x[None, :]).astype(np.float32)
    metres = np.where(land > 0, land_m, sea_m).astype(np.float32)
    return metres, land


def elevation(cfg: Config) -> tuple[np.ndarray, np.ndarray]:
    """(metres above sea level, land fraction) on the heightfield grid."""
    if kind(cfg) == "placeholder":
        return placeholder_elevation(cfg)
    from .synth import synthesize

    return synthesize(cfg)
