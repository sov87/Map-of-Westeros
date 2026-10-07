"""Places (Phase 1): the map's castle markers → data/world/places.json (map km), and the scale calibration report.

  pnpm geo places --map <id>      write data/world/places.json from the profile's sheet-pixel positions
  pnpm geo calibrate --map <id>   scale from the Wall; residuals of every ledger distance between placed points

Positions are label M (read off the traced map); where the ledger's text disagrees, the claim logs the conflict
and the place may carry a displayOffsetKm.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

from vectorize import Sheet, load_profile

ROOT = Path(__file__).resolve().parents[2]

# id → (name, kind, tier, footprint km, look region, ledger subject)
META = {
    "fist-of-the-first-men": ("The Fist of the First Men", "landmark", "A", 5, "beyond-the-wall"),
    "castle-black": ("Castle Black", "landmark", "A", 5, "north"),
    "eastwatch": ("Eastwatch-by-the-Sea", "landmark", "B", 4, "north"),
    "winterfell": ("Winterfell", "landmark", "A", 6, "north"),
    "white-harbor": ("White Harbor", "landmark", "B", 6, "north"),
    "moat-cailin": ("Moat Cailin", "landmark", "B", 5, "north"),
    "greywater-watch": ("Greywater Watch", "landmark", "B", 4, "north"),
    "the-twins": ("The Twins", "landmark", "A", 4, "riverlands"),
    "riverrun": ("Riverrun", "landmark", "A", 5, "riverlands"),
    "inn-at-the-crossroads": ("The Inn at the Crossroads", "landmark", "B", 3, "riverlands"),
    "harrenhal": ("Harrenhal", "landmark", "A", 6, "riverlands"),
    "isle-of-faces": ("The Isle of Faces", "landmark", "B", 5, "riverlands"),
    "the-eyrie": ("The Eyrie", "landmark", "A", 5, "vale"),
    "pyke": ("Pyke", "landmark", "A", 4, "iron-islands"),
    "casterly-rock": ("Casterly Rock", "landmark", "A", 6, "westerlands"),
    "kings-landing": ("King's Landing", "landmark", "A", 8, "crownlands"),
    "dragonstone": ("Dragonstone", "landmark", "A", 4, "crownlands"),
    "storms-end": ("Storm's End", "landmark", "A", 4, "stormlands"),
    "summerhall": ("Summerhall", "landmark", "B", 4, "stormlands"),
    "highgarden": ("Highgarden", "landmark", "A", 6, "reach"),
    "oldtown": ("Oldtown", "landmark", "A", 8, "reach"),
    "starfall": ("Starfall", "landmark", "B", 4, "dorne"),
    "sunspear": ("Sunspear", "landmark", "A", 5, "dorne"),
    "water-gardens": ("The Water Gardens", "landmark", "B", 4, "dorne"),
    "lannisport": ("Lannisport", "poi", None, None, "westerlands"),
    "dragonmont": ("The Dragonmont", "peak", None, None, "crownlands"),
    "giants-lance": ("The Giant's Lance", "peak", None, None, "vale"),
    "deepwood-motte": ("Deepwood Motte", "poi", None, None, "north"),
    "westwatch": ("Westwatch-by-the-Bridge", "poi", None, None, "north"),
}


def place_km(prof: dict) -> dict[str, tuple[float, float]]:
    sheet = Sheet(prof)
    return {k: sheet.km(*v) for k, v in prof["places"].items() if k != "notes"}


def write_places(root: Path, map_id: str) -> None:
    prof = load_profile(map_id)
    km = place_km(prof)
    path = root / "data" / "world" / "places.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    places = []
    for pid, (x, y) in km.items():
        name, kind, tier, fp, region = META.get(pid, (pid, "poi", None, None, None))
        p = {"id": pid, "name": name, "kind": kind}
        if tier:
            p["tier"] = tier
        p["canonical"] = [round(x, 2), round(y, 2)]
        p["src"] = "M"
        p["label"] = "M"
        p["map"] = map_id
        if kind == "landmark":
            p["displayOffsetKm"] = [0, 0]
            p["footprintKm"] = fp
        if region:
            p["region"] = region
        places.append(p)
    doc["places"] = places
    doc["notes"] = doc["notes"].replace(" PHASE 0: empty — no position is guessed before the map is georeferenced.", "")
    lines = ["{"]
    for k in ("version", "notes", "maxDisplayOffsetKm", "wideShotPxTarget"):
        lines.append(f'  "{k}": {json.dumps(doc[k], ensure_ascii=False)},')
    lines.append('  "places": [')
    lines.append(",\n".join("    " + json.dumps(p, ensure_ascii=False) for p in places))
    lines.append("  ]\n}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"[geo] places → {path} ({len(places)} places from {map_id}, label M)")


def calibrate(root: Path, source: Path, map_id: str | None) -> None:
    map_id = map_id or "westeros-crests"
    prof = load_profile(map_id)
    sheet = Sheet(prof)
    km = place_km(prof)
    claims = []
    for f in sorted((root / "data" / "canon" / "claims").glob("*.json")):
        for c in json.loads(f.read_text(encoding="utf-8"))["claims"]:
            v = c.get("value") or {}
            if c["kind"] in ("distance", "length") and (v.get("leagues") or v.get("miles") or v.get("km")):
                claims.append(c)
    rows = []
    mi = lambda v: v.get("miles") or (v["leagues"] * 3 if v.get("leagues") else v["km"] / 1.609344)  # noqa: E731
    wall = prof["scale"]["wallPx"]
    wall_km = math.hypot(wall[1][0] - wall[0][0], wall[1][1] - wall[0][1]) * sheet.km_per_px
    seen = set()
    for c in claims:
        v = c["value"]
        a, b = v.get("from"), v.get("to")
        if c["id"] == "the-wall-length":
            a, b = "westwatch", "eastwatch"
        if not (a in km and b in km):
            continue
        key = (min(a, b), max(a, b), mi(v))
        if key in seen:
            continue
        seen.add(key)
        d = math.dist(km[a], km[b])
        want = mi(v) * 1.609344
        rows.append({"claim": c["id"], "from": a, "to": b, "textMiles": round(mi(v), 1), "mapMiles": round(d / 1.609344, 1), "residual": round(d / want - 1, 3), "status": c["status"], "approx": bool(v.get("approx"))})
    sb = prof["scale"].get("scaleBar")
    rep = {
        "map": map_id,
        "method": "the Wall = a hundred leagues (300 mi) between Westwatch-by-the-Bridge and Eastwatch-by-the-Sea",
        "kmPerPx": round(sheet.km_per_px, 5),
        "wallKm": round(wall_km, 1),
        "scaleBarKmPerPx": round(sb["segmentMiles"] * 1.609344 / sb["segmentPx"], 5) if sb else None,
        "frameKm": [sheet.widthKm, sheet.heightKm],
        "residuals": rows,
    }
    out = source / "westeros"
    out.mkdir(parents=True, exist_ok=True)
    (out / "calibration.json").write_text(json.dumps(rep, indent=1), encoding="utf-8")
    print(f"[geo] calibration ({map_id}): {rep['kmPerPx']} km/px from the Wall ({rep['wallKm']} km); the map's scale bar says {rep['scaleBarKmPerPx']} km/px")
    for r in rows:
        print(f"[geo]   {r['claim']}: {r['from']} → {r['to']}: text {r['textMiles']} mi, map {r['mapMiles']} mi, residual {r['residual'] * 100:+.1f} % ({r['status']}{', approx' if r['approx'] else ''})")
    print(f"[geo] → {out / 'calibration.json'}")


def write_regions(root: Path, map_id: str) -> None:
    """The profile's region polygons (sheet px) → data/world/regions.geojson (map km), index = order."""
    prof = load_profile(map_id)
    sheet = Sheet(prof)
    regs = [(k, v) for k, v in prof["regions"].items() if k != "notes"]
    feats = []
    for i, (rid, r) in enumerate(regs):
        ring = [[round(c, 1) for c in sheet.km(x, y)] for x, y in r["px"]]
        ring.append(ring[0])
        feats.append({"type": "Feature", "properties": {"id": rid, "index": i, "softKm": r.get("softKm", 50)}, "geometry": {"type": "Polygon", "coordinates": [ring]}})
    notes = ("Authored soft-edged look regions in MAP KILOMETRES (x east, y north). Index order = look texture channel order (region 'north' is the default for uncovered land). "
             f"softKm = Gaussian edge width. Overlaps are normalised. Written by pnpm geo regions from tools/geo/maps/{map_id}.json (label I: soft kingdom borders).")
    body = ",\n".join("    " + json.dumps(f) for f in feats)
    (root / "data" / "world" / "regions.geojson").write_text('{\n  "type": "FeatureCollection",\n  "name": "regions",\n  "notes": ' + json.dumps(notes) + ',\n  "features": [\n' + body + "\n  ]\n}\n", encoding="utf-8")
    # which region each landmark falls in (the place's own region must agree)
    from shapely.geometry import Point, Polygon

    polys = {f["properties"]["id"]: Polygon(f["geometry"]["coordinates"][0]) for f in feats}
    for pid, (x, y) in place_km(prof).items():
        want = META.get(pid, (None,) * 5)[4]
        got = [k for k, pg in polys.items() if pg.contains(Point(x, y))]
        if want and want not in got:
            print(f"[geo]   WARN {pid} lies in {got or 'no region'}, its META region is {want}")
    print(f"[geo] regions → {root / 'data' / 'world' / 'regions.geojson'} ({len(feats)} regions)")
