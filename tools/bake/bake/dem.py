"""The elevation source on the heightfield grid → metres above sea level + land fraction.

Middle-earth read the Arda 32k DEM here (with a measured tone-curve calibration). Westeros has no measured
elevation: source.elevation() returns the Phase 0 placeholder slab or the Phase 1 synthesized model
(synth.py). Cached as .npy keyed by the frame and the source's content stamp, like the DEM read was.
"""
from __future__ import annotations

import numpy as np

from .cache import code_stamp, digest
from .config import Config, Timer
from .source import elevation, stamp


def read_dem(cfg: Config) -> tuple[np.ndarray, np.ndarray]:
    key = digest(cfg.world["frame"], cfg.world["heightfield"], cfg.world["source"], cfg.world.get("synth"), stamp(cfg), code_stamp("source", "synth", "dem"))
    cache_h = cfg.cache / f"dem_metres_{key}.npy"
    cache_l = cfg.cache / f"dem_land_{key}.npy"
    if cache_h.exists() and cache_l.exists():
        print("[bake] dem: using cache")
        return np.load(cache_h), np.load(cache_l)
    for old in cfg.cache.glob("dem_*.npy"):  # one elevation cache at a time (they are large)
        old.unlink()
    with Timer(f"dem: {cfg.world['source']['kind']} elevation"):
        metres, land = elevation(cfg)
    np.save(cache_h, metres.astype(np.float32))
    np.save(cache_l, land.astype(np.float32))
    print(f"[bake] dem: metres {metres.min():.0f}..{metres.max():.0f}, land {land.mean() * 100:.1f}%")
    return metres, land
