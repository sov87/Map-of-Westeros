"""The review overlay (Phase 1): the map sheet with the traced layers on top, for the user to judge — never to
trace on. Writes data/source/westeros/overlay/ (local only: it embeds the map image):

  index.html    the sheet (frame crop) with toggleable SVG layers (land, lakes, rivers, forests, mountains, hills,
                marsh, roads, places) and an opacity slider; hover a feature for its name and label
  composite.png the same, flattened, for a quick look

  pnpm geo overlay [--map westeros-crests] [--vectors <dir>]
"""
from __future__ import annotations

import html
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from vectorize import Sheet, load_image, load_profile

LAYERS = [
    ("land", "#ff3b30", 0.0, 1.2),
    ("lakes", "#00c8ff", 0.35, 1.0),
    ("rivers", "#0040ff", 0.0, 1.6),
    ("forests", "#00a000", 0.25, 0.8),
    ("mountains", "#8b4513", 0.30, 0.8),
    ("hills", "#d2a060", 0.20, 0.6),
    ("wetlands", "#008080", 0.30, 0.8),
    ("roads", "#ff00ff", 0.0, 1.4),
]


def _rings(geom: dict):
    """(ring, is_hole) for every polygon ring or line part."""
    t, c = geom["type"], geom["coordinates"]
    polys = [c] if t == "Polygon" else c if t == "MultiPolygon" else []
    for p in polys:
        for k, ring in enumerate(p):
            yield ring, k > 0
    if t == "LineString":
        yield c, False
    elif t == "MultiLineString":
        for ln in c:
            yield ln, False


def build_overlay(root: Path, source: Path, map_id: str | None, vectors: str | None) -> None:
    map_id = map_id or "westeros-crests"
    prof = load_profile(map_id)
    sheet = Sheet(prof)
    vdir = Path(vectors) if vectors else source / "westeros" / "vectors"
    out = source / "westeros" / "overlay"
    out.mkdir(parents=True, exist_ok=True)
    x0, y0, x1, y1 = sheet.box()
    img = Image.fromarray(load_image(source, prof)[y0:y1, x0:x1])
    img.save(out / "sheet.jpg", quality=88)
    W, H = img.size
    to_px = lambda x, y: (sheet.px(x, y)[0] - x0, sheet.px(x, y)[1] - y0)  # noqa: E731
    comp = img.convert("RGBA")
    over = Image.new("RGBA", comp.size, (0, 0, 0, 0))
    svg = []
    for name, color, fill_op, width in LAYERS:
        p = vdir / f"{name}.geojson"
        if not p.exists():
            continue
        feats = json.loads(p.read_text(encoding="utf-8"))["features"]
        rgb = tuple(int(color[i : i + 2], 16) for i in (1, 3, 5))
        lay = Image.new("RGBA", comp.size, (0, 0, 0, 0))  # one image per layer: a hole clears only its own layer
        dr = ImageDraw.Draw(lay)
        parts = []
        for f in feats:
            g = f.get("geometry")
            if not g:
                continue
            props = f.get("properties", {})
            tip = html.escape(f"{name}: {props.get('name') or ''} [{props.get('label', '?')}]" + (f" peak {props['peakM']} m" if props.get("peakM") else ""))
            is_poly = g["type"] in ("Polygon", "MultiPolygon")
            d = ""
            # exteriors first, then the holes cut back to the sheet (a hole in the trace must show on review)
            for ring, hole in sorted(_rings(g), key=lambda rh: rh[1]):
                pts = [to_px(x, y) for x, y in ring]
                if len(pts) < 2:
                    continue
                d += "M" + " L".join(f"{a:.1f},{b:.1f}" for a, b in pts) + (" Z " if is_poly else " ")
                if is_poly:
                    fill = (0, 0, 0, 0) if hole else rgb + (int(255 * fill_op),) if fill_op else None
                    dr.polygon(pts, outline=rgb + (230,), fill=fill)
                else:
                    dr.line(pts, fill=rgb + (230,), width=max(1, int(round(width))))
            parts.append(f'<path d="{d}" fill="{color if is_poly and fill_op else "none"}" fill-rule="evenodd" fill-opacity="{fill_op}" stroke="{color}" stroke-width="{width}"><title>{tip}</title></path>')
        svg.append(f'<g id="L-{name}" class="layer">{"".join(parts)}</g>')
        over = Image.alpha_composite(over, lay)
    dr = ImageDraw.Draw(over)
    # places
    places_path = root / "data" / "world" / "places.json"
    pl = json.loads(places_path.read_text(encoding="utf-8"))["places"] if places_path.exists() else []
    ptxt = []
    for p in pl:
        x, y = to_px(*p["canonical"])
        dr.ellipse([x - 4, y - 4, x + 4, y + 4], outline=(255, 255, 0, 255), width=2)
        ptxt.append(f'<g><circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="none" stroke="#ff0" stroke-width="2"/><text x="{x + 7:.1f}" y="{y - 6:.1f}" fill="#ff0" stroke="#000" stroke-width="0.6" font-size="13">{html.escape(p["name"])}</text><title>{html.escape(p["id"])} [{p.get("label", "?")}]</title></g>')
    svg.append(f'<g id="L-places" class="layer">{"".join(ptxt)}</g>')
    Image.alpha_composite(comp, over).convert("RGB").save(out / "composite.png")
    toggles = "".join(f'<label><input type="checkbox" checked data-l="{n}"> {n}</label>' for n, *_ in LAYERS + [("places",)])
    page = f"""<!doctype html><html><head><meta charset="utf-8"><title>Westeros trace review — {html.escape(map_id)}</title>
<style>body{{margin:0;background:#111;color:#ddd;font:14px system-ui}}#bar{{position:fixed;top:0;left:0;right:0;background:#222d;padding:6px 10px;z-index:2}}
#bar label{{margin-right:12px}}#wrap{{position:relative;margin-top:40px}}#wrap img,#wrap svg{{position:absolute;left:0;top:0;width:{W}px;height:{H}px}}</style></head>
<body><div id="bar">{toggles} <label>map opacity <input id="op" type="range" min="0" max="1" step="0.05" value="1"></label>
<span>{html.escape(prof.get('title', map_id))} · {sheet.km_per_px:.4f} km/px · frame {sheet.widthKm} × {sheet.heightKm} km · hover a feature for its name and label</span></div>
<div id="wrap"><img id="sheet" src="sheet.jpg"><svg viewBox="0 0 {W} {H}">{"".join(svg)}</svg></div>
<script>for(const c of document.querySelectorAll('[data-l]'))c.onchange=()=>document.getElementById('L-'+c.dataset.l).style.display=c.checked?'':'none';
document.getElementById('op').oninput=e=>document.getElementById('sheet').style.opacity=e.target.value;</script></body></html>"""
    (out / "index.html").write_text(page, encoding="utf-8")
    print(f"[geo] overlay → {out / 'index.html'} (+ composite.png)")
