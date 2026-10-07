"""Geography toolchain CLI (Phase 1). Runs in the bake's uv environment:

  pnpm geo sketch                       provisional sketch vectors (label I) → data/source/westeros/sketch/
  pnpm geo georef  --map <id>           pin a further sheet to the frame: affine from its control points (places)
  pnpm geo vectorize --map <id>         segment a georeferenced scan into GeoJSON layers
  pnpm geo overlay [--map <id>]         build the review page (scan + traced layers + places) and print its path
  pnpm geo places  [--map <id>]         the profile's castle positions → data/world/places.json (map km)
  pnpm geo regions [--map <id>]         the profile's soft kingdom polygons → data/world/regions.geojson
  pnpm geo calibrate [--map <id>]       scale from the Wall's length; residuals vs. every ledger distance

Map profiles (committed, coordinates only): tools/geo/maps/<id>.json. Images and everything traced from them live
in the gitignored data/source/ (MOW_SOURCE_DIR in worktrees). See data/source/README.md.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:  # pragma: no cover
    pass

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(os.environ["MOW_SOURCE_DIR"]).resolve() if os.environ.get("MOW_SOURCE_DIR") else ROOT / "data" / "source"


def main(argv: list[str]) -> None:
    ap = argparse.ArgumentParser(prog="geo")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("sketch")
    g = sub.add_parser("georef")
    g.add_argument("--map", required=True)
    v = sub.add_parser("vectorize")
    v.add_argument("--map", required=True)
    o = sub.add_parser("overlay")
    o.add_argument("--map")
    o.add_argument("--vectors")
    c = sub.add_parser("calibrate")
    c.add_argument("--map")
    pl = sub.add_parser("places")
    pl.add_argument("--map", default="westeros-crests")
    rg = sub.add_parser("regions")
    rg.add_argument("--map", default="westeros-crests")
    args = ap.parse_args(argv)

    if args.cmd == "sketch":
        from sketch import build

        build(SOURCE / "westeros" / "sketch")
    elif args.cmd == "georef":
        from georef import georeference

        georeference(SOURCE, args.map)
    elif args.cmd == "vectorize":
        from vectorize import vectorize

        vectorize(SOURCE, args.map)
    elif args.cmd == "overlay":
        from overlay import build_overlay

        build_overlay(ROOT, SOURCE, args.map, args.vectors)
    elif args.cmd == "calibrate":
        from places import calibrate

        calibrate(ROOT, SOURCE, args.map)
    elif args.cmd == "places":
        from places import write_places

        write_places(ROOT, args.map)
    elif args.cmd == "regions":
        from places import write_regions

        write_regions(ROOT, args.map)


if __name__ == "__main__":
    main(sys.argv[1:])
