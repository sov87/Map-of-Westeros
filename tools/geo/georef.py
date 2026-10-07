"""Georeference a further map sheet onto the frame (Phase 1).

The first sheet (westeros-crests) DEFINES the frame: scale from the Wall, origin at its frame crop — no control
points needed. Any further sheet (another map, a photo of the endpaper, The Lands of Ice and Fire when the user
scans it) is pinned to that frame by control points: places both sheets show.

  profile tools/geo/maps/<id>.json: "controlPoints": [{"px": [x, y], "place": "<places.json id>"}, …] (≥ 3)
  pnpm geo georef --map <id>   → least-squares affine sheet px → map km, written into the profile as "affine"
                                 ([a, b, c, d, e, f]: x = a·px + b·py + c, y = d·px + e·py + f), with per-point
                                 residuals and the RMS printed. Sheet() then uses the affine for that map.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]


def georeference(source: Path, map_id: str) -> None:
    pf = ROOT / "tools" / "geo" / "maps" / f"{map_id}.json"
    prof = json.loads(pf.read_text(encoding="utf-8"))
    cps = prof.get("controlPoints") or []
    places = {p["id"]: p["canonical"] for p in json.loads((ROOT / "data" / "world" / "places.json").read_text(encoding="utf-8"))["places"]}
    rows = [(c["px"], places[c["place"]], c["place"]) for c in cps if c.get("place") in places]
    if len(rows) < 3:
        raise SystemExit(f"[geo] {map_id}: need >= 3 control points on known places (have {len(rows)})")
    A = np.array([[px[0], px[1], 1.0] for px, _, _ in rows])
    X = np.array([km[0] for _, km, _ in rows])
    Y = np.array([km[1] for _, km, _ in rows])
    cx, *_ = np.linalg.lstsq(A, X, rcond=None)
    cy, *_ = np.linalg.lstsq(A, Y, rcond=None)
    res = []
    for (px, km, pid) in rows:
        ex = cx @ [px[0], px[1], 1] - km[0]
        ey = cy @ [px[0], px[1], 1] - km[1]
        res.append((pid, math.hypot(ex, ey)))
    rms = math.sqrt(sum(r * r for _, r in res) / len(res))
    scale = math.sqrt(abs(cx[0] * cy[1] - cx[1] * cy[0]))
    prof["affine"] = [float(v) for v in (*cx, *cy)]
    prof["affineReport"] = {"points": len(rows), "rmsKm": round(rms, 2), "kmPerPx": round(scale, 5), "residualsKm": {p: round(r, 2) for p, r in res}}
    pf.write_text(json.dumps(prof, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[geo] {map_id}: affine from {len(rows)} control points, {scale:.4f} km/px, RMS {rms:.2f} km")
    for pid, r in sorted(res, key=lambda t: -t[1]):
        print(f"[geo]   {pid}: {r:.2f} km")
