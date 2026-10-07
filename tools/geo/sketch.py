"""PROVISIONAL SKETCH of Westeros — every coordinate here is label I (invented / inferred).

Not traced from any map: a coarse layout written from general memory of the continent so that the Phase 1
toolchain (scale calibration, terrain synthesis, bake, renders) can run end to end before the user's scans of
the official maps exist. It is NOT a geography reference and is never judged against the books or maps: the
traced vectors from tools/geo replace it wholesale (world.json source.vectors).

Frame: map km [x east, y north] in the provisional 2000 x 5800 km frame, the Wall ~480 km long (300 miles).

  pnpm geo sketch          → data/source/westeros/sketch/*.geojson + places.json (gitignored)
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from shapely.geometry import LineString, Polygon, mapping
from shapely.ops import unary_union

SEED = 298

# ---------------------------------------------------------------- the mainland coast (clockwise, frame top cut)
MAINLAND = [
    (420, 5800), (1560, 5800),
    # east coast beyond the Wall, down to Eastwatch and round the Bay of Seals
    (1520, 5500), (1430, 5250), (1300, 5080), (1192, 4992), (1180, 4900), (1230, 4820), (1300, 4760), (1380, 4700),
    (1470, 4560), (1520, 4380), (1560, 4200), (1540, 4050), (1460, 3980), (1350, 3960), (1250, 3930), (1172, 3885),
    # the Bite, the Neck's east shore, the Fingers and the Vale's coast
    (1120, 3800), (1080, 3700), (1062, 3600), (1072, 3480), (1120, 3420), (1220, 3480), (1300, 3500), (1360, 3420),
    (1420, 3350), (1470, 3250), (1450, 3120), (1480, 3000), (1440, 2920), (1380, 2880), (1330, 2820), (1300, 2740),
    # the Bay of Crabs, Blackwater Bay, Massey's Hook, the Kingswood coast
    (1250, 2700), (1182, 2722), (1150, 2650), (1200, 2580), (1270, 2520), (1300, 2440), (1240, 2380), (1192, 2332),
    (1260, 2280), (1360, 2300), (1430, 2250), (1380, 2180), (1330, 2100), (1350, 2000), (1420, 1950), (1462, 1882),
    # Shipbreaker Bay to Cape Wrath, the Sea of Dorne, the Broken Arm
    (1400, 1800), (1450, 1740), (1520, 1680), (1560, 1560), (1520, 1450), (1450, 1380), (1380, 1350), (1330, 1300),
    (1380, 1220), (1450, 1200), (1550, 1150), (1650, 1100), (1640, 1000), (1600, 900), (1580, 750), (1600, 600),
    (1592, 515),
    # Dorne's south coast and the Summer Sea, Starfall, the Reach's west coast, Oldtown
    (1480, 430), (1350, 420), (1200, 380), (1000, 360), (850, 380), (720, 450), (650, 600), (632, 752), (560, 850),
    (520, 950), (450, 905), (400, 870), (362, 962), (300, 1050), (260, 1200), (300, 1350), (352, 1452), (300, 1600),
    (260, 1800), (280, 2000), (230, 2200), (260, 2400), (282, 2505), (320, 2650), (400, 2800), (480, 2950), (520, 3050),
    # Ironman's Bay, Seagard, Blazewater Bay, Cape Kraken, the Stony Shore, Bear Island's strait, the Bay of Ice
    (560, 3200), (600, 3350), (650, 3450), (720, 3560), (700, 3650), (620, 3700), (560, 3780), (520, 3900), (470, 4050),
    (420, 4200), (400, 4350), (450, 4500), (520, 4600), (580, 4690), (640, 4800), (690, 4900), (702, 4950), (640, 5050),
    (560, 5200), (500, 5400), (450, 5600),
]

# (name, centre, radius km, vertices, aspect, rotation deg)
ISLANDS = [
    ("Pyke", (300, 3100), 22, 9, 1.3, 20),
    ("Great Wyk", (250, 3175), 38, 11, 1.5, 70),
    ("Harlaw", (378, 3070), 30, 10, 1.4, 40),
    ("Old Wyk", (285, 3245), 20, 8, 1.3, 10),
    ("Orkmont", (348, 3215), 24, 9, 1.4, 120),
    ("Saltcliffe", (215, 3065), 18, 8, 1.2, 0),
    ("Bear Island", (560, 4725), 34, 10, 1.3, 30),
    ("Skagos", (1425, 4880), 52, 12, 1.4, 160),
    ("Tarth", (1610, 1785), 36, 10, 1.8, 110),
    ("The Arbor", (300, 815), 42, 11, 1.5, 150),
    ("Dragonstone", (1450, 2422), 17, 9, 1.3, 30),
    ("Driftmark", (1408, 2378), 15, 8, 1.6, 60),
    ("Fair Isle", (335, 2700), 18, 8, 1.4, 10),
]

# mountains: (name, polygon, peak metres, ridge (optional crest polyline))
MOUNTAINS = [
    ("The Frostfangs", [(470, 5300), (600, 5250), (800, 5380), (950, 5540), (1010, 5700), (930, 5790), (700, 5700), (520, 5560)], 4200,
     [(520, 5420), (700, 5520), (880, 5620), (960, 5720)]),
    ("Mountains of the Moon", [(1082, 3330), (1180, 3400), (1320, 3320), (1405, 3160), (1400, 2990), (1300, 2895), (1150, 2950), (1090, 3080)], 4600,
     [(1120, 3260), (1250, 3330), (1360, 3200), (1370, 3020)]),
    ("The Giant's Lance", [(1238, 3095), (1282, 3098), (1286, 3140), (1240, 3146)], 5600, None),
    ("The northern mountains", [(640, 4450), (760, 4430), (860, 4560), (850, 4800), (720, 4850), (630, 4700)], 2100,
     [(680, 4500), (760, 4640), (780, 4800)]),
    ("The Red Mountains", [(600, 1180), (800, 1230), (1000, 1260), (1200, 1270), (1440, 1240), (1440, 1330), (1200, 1380), (1000, 1380), (780, 1350), (620, 1290)], 3200,
     [(640, 1260), (850, 1310), (1050, 1330), (1250, 1320), (1420, 1290)]),
    ("The Dragonmont", [(1440, 2410), (1462, 2414), (1464, 2436), (1442, 2438)], 1100, None),
]
HILLS = [
    ("The hills of the westerlands", [(300, 2350), (520, 2380), (660, 2600), (640, 2840), (480, 2900), (330, 2700)], 900),
    ("The Dornish Marches", [(640, 1360), (900, 1400), (1200, 1420), (1360, 1400), (1300, 1520), (1000, 1520), (700, 1470)], 700),
    ("The Barrowlands", [(830, 3950), (1000, 3960), (1030, 4120), (880, 4160)], 350),
    ("Hills of the Vale's foothills", [(1050, 2960), (1150, 2920), (1180, 3060), (1080, 3120)], 650),
    ("The Gift hills", [(720, 4800), (1150, 4820), (1150, 4930), (720, 4930)], 300),
    ("Hills beyond the Wall", [(700, 5000), (1200, 5000), (1300, 5300), (900, 5350), (650, 5200)], 500),
    ("The Rills", [(560, 3900), (740, 3920), (760, 4100), (600, 4150)], 450),
    ("Stormlands uplands", [(1250, 1700), (1420, 1720), (1400, 1880), (1260, 1860)], 450),
]

# rivers, source → mouth (the order IS the flow direction)
RIVERS = [
    ("Milkwater", [(720, 5600), (820, 5400), (870, 5270), (980, 5150), (1100, 5100), (1225, 5075)]),
    ("White Knife", [(960, 4450), (1020, 4250), (1080, 4050), (1168, 3888)]),
    ("Last River", [(1030, 4620), (1200, 4625), (1352, 4690)]),
    ("Green Fork", [(905, 3460), (872, 3270), (905, 3100), (960, 2985), (1000, 2925)]),
    ("Blue Fork", [(650, 3255), (800, 3100), (920, 2975), (1000, 2925)]),
    ("Trident", [(1000, 2925), (1052, 2870), (1120, 2800), (1180, 2724)]),
    ("Red Fork", [(480, 2850), (600, 2900), (690, 2922), (800, 2885), (930, 2862), (1052, 2870)]),
    ("Tumblestone", [(560, 3150), (640, 3020), (690, 2922)]),
    ("Blackwater Rush", [(600, 2450), (750, 2420), (900, 2400), (1050, 2368), (1188, 2333)]),
    ("Mander", [(950, 1950), (800, 1780), (650, 1560), (480, 1480), (354, 1452)]),
    ("Honeywine", [(480, 1150), (420, 1050), (364, 965)]),
    ("Torrentine", [(800, 1150), (720, 950), (636, 755)]),
    ("Greenblood", [(1050, 1100), (1150, 900), (1300, 650), (1420, 432)]),
    ("Wendwater", [(1180, 2080), (1260, 1990), (1340, 1980)]),
]
# lakes: (name, centre, rx, ry, rotation, island radius or 0)
LAKES = [
    ("Gods Eye", (990, 2640), 56, 40, 15, 12),
    ("Long Lake", (1010, 4625), 14, 55, 10, 0),
]
FORESTS = [
    ("Haunted Forest", [(705, 4965), (1185, 5000), (1210, 5150), (1050, 5240), (850, 5230), (690, 5100)]),
    ("Wolfswood", [(640, 4200), (840, 4220), (860, 4420), (700, 4460), (610, 4330)]),
    ("Kingswood", [(1130, 2060), (1320, 2080), (1340, 2240), (1160, 2270)]),
    ("Rainwood", [(1280, 1560), (1470, 1580), (1470, 1760), (1300, 1780)]),
    ("Forest of the riverlands", [(760, 2980), (880, 2990), (880, 3080), (770, 3090)]),
    ("Woods of the north", [(950, 4300), (1150, 4320), (1180, 4500), (980, 4520)]),
    ("Woods of the Reach", [(700, 1650), (850, 1660), (860, 1760), (720, 1760)]),
]
WETLANDS = [
    ("The Neck", [(720, 3400), (1060, 3420), (1075, 3690), (700, 3660)]),
]
ROADS = [
    ("Kingsroad", [(960, 4950), (940, 4700), (900, 4450), (880, 4250), (900, 4000), (910, 3800), (900, 3700), (885, 3500), (880, 3300), (950, 3100),
                   (1010, 3000), (1052, 2880), (1100, 2650), (1160, 2450), (1180, 2335), (1220, 2150), (1330, 1950), (1440, 1885)]),
    ("River road", [(1010, 3000), (900, 2960), (780, 2930), (690, 2920), (600, 2860), (520, 2800), (400, 2620), (295, 2505)]),
    ("High road", [(1010, 3000), (1080, 3020), (1140, 3050), (1230, 3110)]),
    ("Roseroad", [(1180, 2335), (1080, 2200), (1000, 2100), (920, 1960), (760, 1700), (610, 1520), (480, 1250), (362, 965)]),
    ("Goldroad", [(1180, 2335), (1000, 2390), (800, 2430), (600, 2455), (420, 2470), (295, 2505)]),
    ("Ocean Road", [(295, 2505), (300, 2200), (320, 1900), (420, 1650), (610, 1520)]),
]
# places (sketch positions, label I) — the 24 landmarks and the volcano
PLACES = [
    ("fist-of-the-first-men", "The Fist of the First Men", (875, 5262), "A", 5, "beyond-the-wall"),
    ("castle-black", "Castle Black", (960, 4950), "A", 5, "north"),
    ("eastwatch", "Eastwatch-by-the-Sea", (1186, 4988), "B", 4, "north"),
    ("winterfell", "Winterfell", (880, 4250), "A", 6, "north"),
    ("white-harbor", "White Harbor", (1166, 3893), "B", 6, "north"),
    ("moat-cailin", "Moat Cailin", (900, 3700), "B", 5, "north"),
    ("greywater-watch", "Greywater Watch", (880, 3520), "B", 4, "north"),
    ("the-twins", "The Twins", (872, 3270), "A", 4, "riverlands"),
    ("riverrun", "Riverrun", (690, 2922), "A", 5, "riverlands"),
    ("inn-at-the-crossroads", "The Inn at the Crossroads", (1010, 3000), "B", 3, "riverlands"),
    ("harrenhal", "Harrenhal", (1000, 2690), "A", 6, "riverlands"),
    ("isle-of-faces", "The Isle of Faces", (990, 2640), "B", 6, "riverlands"),
    ("the-eyrie", "The Eyrie", (1262, 3120), "A", 5, "vale"),
    ("pyke", "Pyke", (300, 3100), "A", 4, "iron-islands"),
    ("casterly-rock", "Casterly Rock", (290, 2512), "A", 6, "westerlands"),
    ("kings-landing", "King's Landing", (1178, 2338), "A", 8, "crownlands"),
    ("dragonstone", "Dragonstone", (1446, 2414), "A", 4, "crownlands"),
    ("storms-end", "Storm's End", (1455, 1886), "A", 4, "stormlands"),
    ("summerhall", "Summerhall", (1150, 1500), "B", 4, "stormlands"),
    ("highgarden", "Highgarden", (612, 1530), "A", 6, "reach"),
    ("oldtown", "Oldtown", (368, 968), "A", 8, "reach"),
    ("starfall", "Starfall", (640, 762), "B", 4, "dorne"),
    ("sunspear", "Sunspear", (1585, 522), "A", 5, "dorne"),
    ("water-gardens", "The Water Gardens", (1548, 520), "B", 4, "dorne"),
]
VOLCANO = ("dragonmont", "The Dragonmont", (1452, 2425))


# ---------------------------------------------------------------- helpers (deterministic)

def _rng(name: str) -> np.random.Generator:
    return np.random.default_rng([SEED, sum(ord(c) * (i + 1) for i, c in enumerate(name))])


def roughen(pts: list[tuple[float, float]], name: str, amp: float = 0.12, levels: int = 4, closed: bool = True, keep_ends: bool = True) -> list[tuple[float, float]]:
    """Midpoint displacement: every segment is subdivided `levels` times, the new point pushed sideways by
    amp × the segment length (a fractal coast or river, label I). Frame-cut edges (on the frame border) stay straight."""
    rng = _rng(name)
    p = [tuple(map(float, q)) for q in pts]
    for _ in range(levels):
        out = []
        n = len(p) if closed else len(p) - 1
        for i in range(n):
            a, b = p[i], p[(i + 1) % len(p)]
            out.append(a)
            dx, dy = b[0] - a[0], b[1] - a[1]
            L = math.hypot(dx, dy)
            on_border = (a[1] >= 5799 and b[1] >= 5799)
            off = 0.0 if on_border else rng.normal(0, amp) * L
            out.append(((a[0] + b[0]) / 2 - dy / max(L, 1e-9) * off, (a[1] + b[1]) / 2 + dx / max(L, 1e-9) * off))
        if not closed:
            out.append(p[-1])
        p = out
    return p


def ellipse(c, rx, ry, rot_deg, n=48, name="", rough=0.0):
    r = math.radians(rot_deg)
    pts = []
    rng = _rng(name)
    for k in range(n):
        t = 2 * math.pi * k / n
        s = 1 + (rng.normal(0, rough) if rough else 0)
        x, y = rx * math.cos(t) * s, ry * math.sin(t) * s
        pts.append((c[0] + x * math.cos(r) - y * math.sin(r), c[1] + x * math.sin(r) + y * math.cos(r)))
    return pts


def fc(features):
    return {"type": "FeatureCollection", "features": features}


def feat(geom, **props):
    return {"type": "Feature", "properties": {"label": "I", "src": "sketch", **props}, "geometry": mapping(geom)}


def build(out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    main = Polygon(roughen(MAINLAND, "mainland", 0.10, 4)).buffer(0)
    islands = [Polygon(roughen(ellipse(c, r, r / a, rot, n, name, 0.08), name, 0.1, 2)).buffer(0) for name, c, r, n, a, rot in ISLANDS]
    land = unary_union([main, *islands])
    lakes = []
    for name, c, rx, ry, rot, isle in LAKES:
        ring = ellipse(c, rx, ry, rot, 40, name, 0.06)
        hole = [ellipse(c, isle, isle * 0.8, rot, 16, name + "-isle", 0.1)] if isle else []
        lakes.append(feat(Polygon(roughen(ring, name, 0.08, 2), [roughen(h, name + "h", 0.08, 1) for h in hole]).buffer(0), name=name))
    rivers = []
    for name, pts in RIVERS:
        rivers.append(feat(LineString(roughen(pts, name, 0.07, 3, closed=False)), name=name))
    mtn = [feat(Polygon(roughen(poly, name, 0.08, 2)).buffer(0), name=name, peakM=peak, **({"ridge": ridge} if ridge else {})) for name, poly, peak, ridge in MOUNTAINS]
    hills = [feat(Polygon(roughen(poly, name, 0.08, 2)).buffer(0), name=name, peakM=peak) for name, poly, peak in HILLS]
    forests = [feat(Polygon(roughen(poly, name, 0.1, 3)).buffer(0).intersection(land), name=name, type="Forest") for name, poly in FORESTS]
    wet = [feat(Polygon(roughen(poly, name, 0.1, 3)).buffer(0).intersection(land), name=name) for name, poly in WETLANDS]
    vul = [feat(Polygon(ellipse((1450, 2422), 15, 12, 30, 24, "vul", 0.05)).intersection(land), name="Dragonstone")]
    roads = [feat(LineString(roughen(pts, name, 0.03, 2, closed=False)), name=name) for name, pts in ROADS]
    layers = {
        "land": fc([feat(g, name="Westeros") for g in (land.geoms if hasattr(land, "geoms") else [land])]),
        "rivers": fc(rivers),
        "lakes": fc(lakes),
        "mountains": fc(mtn),
        "hills": fc(hills),
        "forests": fc(forests),
        "wetlands": fc(wet),
        "vulcanism": fc(vul),
        "roads": fc(roads),
    }
    for k, v in layers.items():
        (out / f"{k}.geojson").write_text(json.dumps(v), encoding="utf-8")
    places = [{"id": i, "name": n, "kind": "landmark", "tier": t, "canonical": [float(x), float(y)], "src": "S", "label": "I", "displayOffsetKm": [0, 0], "footprintKm": fp, "region": reg} for i, n, (x, y), t, fp, reg in PLACES]
    places.append({"id": VOLCANO[0], "name": VOLCANO[1], "kind": "peak", "canonical": [float(VOLCANO[2][0]), float(VOLCANO[2][1])], "src": "S", "label": "I"})
    (out / "places.json").write_text(json.dumps({"places": places}, indent=1), encoding="utf-8")
    print(f"[geo] sketch → {out}: land {land.area:,.0f} km², {len(rivers)} rivers, {len(lakes)} lakes, {len(mtn)} ranges, {len(hills)} hill areas, {len(places)} places (all label I)")
