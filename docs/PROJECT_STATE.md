# Project state — Map of Westeros

_Rolling document: roadmap, current state, decisions, next steps. Keep it compact; replace stale detail
instead of appending logs._

**Last updated:** 2026-10-08 · Session 2 (cloud, software WebGPU) — Phases 0, 1 and Phase 3 under way.

## Where we are
| Phase | State |
|---|---|
| 0 · Fork and sources | **Done.** Engine forked from *Map of Middle-Earth* (MIT), its content stripped (24 landmark folders, Arda / ME-GIS sources, ME places / regions / tour); host rules rewritten for the RTX 5090 rig; boots on the placeholder slab. Ledger covers all 88 planned subjects (24 landmarks, ranges, rivers, regions, slice facts). |
| 1 · Geography | **Good enough (user, 2026-10-08: "relatively book accurate, not 1:1").** The user's map is vectorized, scale-calibrated from the Wall, synthesized into terrain and baked at 1 km/px. Every river is monotone downhill. The map critic's high findings that landmarks depend on are fixed (see below); the rest are known issues. |
| 2 · World look | Not started. Region looks are provisional ground palettes on Middle-earth grades. |
| 3 · Landmarks | **In progress** (user's order: King's Landing → Winterfell → Casterly Rock → Highgarden → the rest, Harrenhal's ruins among the major ones). Done (v1, book-based, ledger ids per part in each folder's `canon.json`, seating clean, `pnpm check` OK): **King's Landing, Winterfell, Casterly Rock (+ Lannisport), Highgarden, Harrenhal, the Eyrie, Storm's End, Dragonstone, Castle Black and the Wall, the Twins, Riverrun, Pyke, Oldtown.** Next: Sunspear, Moat Cailin, then the rest of the 24. All at shot-list status s2 (gates as warnings) until their looks are final. |
| 2, 4–6 | Not started. |

## Decisions taken (user)
- **Scope:** do what *Map of Middle-Earth* did, for Westeros. Not connected to any TV production. The brief's TWOW production references were mistakes and have been removed.
- **Geography source:** the user's maps. The base sheet is the "Map of Westeros" crests fan map (2688 × 3840 px, digitally hand-drawn, posted on r/mapmaking), stored locally at `data/source/maps/westeros-crests/map.png` and never committed. It stands in for the official map until the user supplies a scan of *The Lands of Ice and Fire*, which `pnpm geo georef` can pin to the same frame. Positions read off it are label **M**. Where the books disagree, the books win.
- **Defaults kept from the brief:** time slice 298 AC; extent Westeros plus the land beyond the Wall to the Frostfangs, no Essos (the sheet is cut at px x = 1935); film route down the Kingsroad, Castle Black → King's Landing.

## Geography: numbers and residuals
- **Frame:** 2640 × 4700 km in map km (x east, y north; origin at the bottom-left of the frame crop). Sheet crop px 34..1957 × 340..3764.
- **Scale (from the Wall):** the Wall is "a hundred leagues" long (300 mi). Westwatch → Eastwatch on the sheet gives **1.3725 km/px**.
  - The sheet's own scale bar gives 1.5966 km/px (+16.3 %). It was logged and not used.
  - Deepwood Motte → Winterfell is "a hundred leagues as the raven flies" in the text, but 257.5 mi on the map (**−14.2 %**). This is a known conflict between the text and every published map. It is logged in `data/source/westeros/calibration.json` (`pnpm geo calibrate`), not hidden.
- **Trace** (`pnpm geo vectorize`):
  - 56 land polygons, 21 lakes, 740 river lines (16,422 km, a tree with no loops), 72 forests, 78 mountain and 69 hill areas, 1 marsh (the Neck).
  - Rivers are oriented downhill by graph distance to the sea or a lake; gaps of up to 16 px are bridged.
  - Terrain classes come from a QDA classifier trained on labelled windows of the sheet.
- **Terrain** (`tools/bake/bake/synth.py`): Westeros has no DEM, so the bake makes one.
  - **Uplift:** from the traced relief density, then stream-power equilibrium on a 2 km work grid. The traced rivers are fixed receivers, so valleys follow the map.
  - **Range heights:** each range is scaled to its profile peak height (labels I: Frostfangs 3800 m, Mountains of the Moon 4300 m, Red Mountains 3300 m, and others).
  - **The Giant's Lance:** set to 5630 m (about 3.5 mi, label T, draft), as a narrow summit (radius 5 km). Its
    pointed head and the long spur that carries the Eyrie are the Eyrie landmark's massif stamp.
  - **Detail and finish:** fine detail, a gully pass, 38° talus, a 140 m inland rise, and a 70 km sea shelf.
  - **Bake:** 1 km/px takes about 3 minutes and about 2.2 GB of RAM.

## Fixed late in session 1
- **Drainage cycles flattened the terrain.** A traced river that loops back on itself (a ring in the skeleton) closed a cycle of forced receivers. The solver then made the cycle, and everything that drained into it, a sea-level sink: about 350k work cells (≈ 1.4 M km²). That included the inside of the Mountains of the Moon, which left the Giant's Lance standing alone on a plain, and much of the Reach.
  - `river_chains` now erases loops in a traced river.
  - `flood_receivers` breaks any remaining cycle at its own cells, sending them down the steepest descent of the flooded surface.
- **River loops in the trace:** 335 → 0.
  - Small rings (castle-marker circles) are filled before thinning.
  - A loop between real branches (the "Broken Branch" label lettered in river blue beside its river, the Arryn crest's rim) keeps the darkest ink and drops the palest branch.
  - Junction stubs are contracted first.
- **Crests read as lakes:** 27 of the 46 "lakes" were house crests in teal, green or blue, which passed the teal rule that catches the Gods Eye. That rule now has a saturation cap (the Gods Eye's median is 0.22; crests run 0.41–0.83). Three muted crests are listed in the profile's `notLakes`.
- **Overlay:** the review page painted polygon holes as filled. Holes now show, so gaps in the trace are visible on review.

## Phase 3 notes (landmarks)
- **Design scale ≈ ×5** of a plausible real size in all three axes, like Middle-earth's landmarks: the terrain is exaggerated ×12, so castles must be too to read. Harrenhal's walls stand twice Winterfell's (C: the largest castle).
- **Book first:** T features are modelled as the text describes them. C (*The World of Ice & Fire*) fills in where the novels are silent (Casterly Rock, Highgarden). Everything else is an I claim per landmark (`<id>-plan`, `-city-fabric`, `-carving`, `-castle-form`), so the inventions are visible in the ledger.
- **Text vs. map settled with display offsets** (places.json, logged in the claims' `conflict`): Casterly Rock moves 7.5 km west onto the shore (the sheet has it inland; C has it over the sea). Harrenhal moves 4.4 km south onto the Gods Eye shore (T). King's Landing keeps its marker, with the bay restored under the sheet's crests instead. Lannisport is modelled at the Rock's foot (C), not at the sheet's marker 48 km south.
- **The Eyrie:** the summit constraint's 14 km radius had raised a ~60 km snow dome round the Lance, burying the Gates of the Moon's valley in snow. It is now 5 km. The landmark's massif gives the Lance a pointed, snow-capped head and a long south-south-west spur. The castle stands on a kit crag at the spur's shoulder, ~11 units above the valley and ~12 below the summit. Snow, Stone and the Gates of the Moon follow the spur's crest down to the valley floor. A Vale look spot raises the snowline round the Lance, so the shoulder is bare in late summer while the head keeps the massif's snow cap.
- **Storm's End:** the sheet's "Storm's End" lettering on Shipbreaker Bay had been traced as a 49 km false peninsula, and the bay's own diagonal label as islands. Both are masked now (`forceSea`, with the sea half of "Evenfall Hall" off Tarth). The castle still stands 12 km inland on the sheet, so a display offset puts it on a cliff-girt headland over the bay (conflict logged in `storms-end-on-shipbreaker-bay`).
- **Dragonstone:** the sheet letters "Dragonmont" on the sea north-east of the island. The place is offset onto the island behind the castle (conflict logged in `dragonmont-above-castle`). The landmark's massif raises the cone with its crater and the long spur the castle stands on. A crownlands look spot makes the mountain volcanic ground: the engine's volcanic crust keys on `dragonmont`. The castle's dragons are built by a small sculpture helper: towers crowned by crouching and rearing dragons, the Great Hall lying on its belly, the coiled kitchens.
- **Lore critic (books only) on the Eyrie and Harrenhal:** no contradiction, no show detail. Applied: Harrenhal at three times Winterfell's ground, with a twenty-acre godswood, stables for a thousand horses and great kitchens (ACOK, Arya; `harrenhal-scale`), and its south wall moved onto the Gods Eye shore; the Eyrie's garden as a failed godswood with a weeping woman's statue (to verify).
- **The Wall and Castle Black:** the Wall is its own landmark (`the-wall`, in Castle Black's frame), one kit `wallPath` of ice 490 km long. Its line is read off the sheet through the castle markers, the same line the scale was calibrated on. It is 1.07 km high at the ×5 design scale (700 ft), battered from a 0.21 km base to a 0.1 km top, its foot following the ground (I). The King's Tower is a third of its height (T). Castle Black (no curtain wall, the zigzag stair, the cage, the tunnel, Mole's Town, the grove of nine weirwoods) reads the Wall's line and face from `the-wall`. The ice is a matte family: a glossy one turned the 1 km face into a mirror. Orbit cameras are not clamped above the terrain, and the land rises south of the Wall, so the hero looks along the Wall from the east-south-east.
- **Rivers in preview renders:** all traced rivers are class `stream` (0.6 km; the runtime ribbon is 1.2 km wide: at least 0.1 km beyond the 0.5 km carved core), and streams are drawn only at quality density ≥ 0.5 (review / final). Check river landmarks at `--quality review`.
- **River landmarks anchor to the water:** `anchor: 'water'` now takes the nearest river's baked level within 2 km (`World.riverLevelAt`) when the place is on no lake or sea, and stamp heights follow the same anchor. Kit heights of bridges, gates and wheels are then exact after any re-bake. The Twins and Riverrun use it.
- **Riverrun:** the sheet's crests and the "Stone Mill" label hid the confluence, so neither the Tumblestone's last reach nor the Red Fork above Riverrun was traced. Both are forced reaches now, and the place is offset 7 km onto the drawn confluence (conflict logged in `riverrun-confluence`). The castle fills the point between the two ribbons: walls standing in both rivers, the moat (a landmark pool) across the landward south-west face, with sluice gates where it opens into each river, the Wheel Tower and its waterwheel on the Tumblestone, and the Water Gate and its basin on the Red Fork.
- **Pyke:** the profile had read Pyke's position between the castle's marker and Lordsport's. It is now the castle's marker, offset 5 km onto the cliff top of the isle's south-east coast (conflict logged in `pyke-position`). The keeps stand on lofted rock stacks rising from the sea floor, ragged and leaning, with fallen rock at the waterline. The ward on the cliff top is joined to the Great Keep by a stone arch, the Kitchen Keep by stone, and the Bloody Keep and the Sea Tower by sagging rope-and-plank bridges.
- **Oldtown:** the sheet's marker stands up the Honeywine from the head of the Sound, so the place is offset 8 km onto the river's mouth (conflict logged in `oldtown-position`). The synthesized coast made the Sound a fjord between ~3-unit hills. Four `lowerOnly` flattens widen the river's valley floor into a basin that steps up with the water's level, so the floor never drops below the river (the guard keeps the channel). The Hightower stands on Battle Isle as seven pale stages on a black square base (C), about 1 km at design scale, with its beacon. The Citadel's halls and domes line both banks, the Isle of Ravens is a rock islet with the ravenry, the Starry Sept is seven-sided under a dome, and walls ring the basin.
- **Small scattered houses on slopes:** a house buries its uphill side by up to `dig`·h + SINK. With `dig` 0.4 any house shorter than ~0.08 fails the seating gate on a slope, so scattered towns use `dig` ≈ 0.15 and a slope limit of ~0.7.
- **The Twins re-fitted** after the river fixes: the bake now snaps the Green Fork ~1.5 km west of where it lay, through a valley the synthesis moved, with a hill rising from the east bank. The crossing moved with the river, and a flatten levels both banks just above the water.
- **Engine and kit changes this phase:** the kit cliff's `jag` (0..1, skyline jaggedness, default 1: the sea cliffs of a headland need an even top); `loft({ rock: true })` (rock noise like `cliff`, for crags); `subjectKm` on a landmark (the probe frames the castle, not its whole setting); an `'auto'` flatten whose radius holds no texel centre took sea level as its target and dug a pit; it now takes the nearest texel.
- **New tools:** `tools/check/site.ts` (local ground before and after stamps, for a landmark or a bare place); `data/qa/shots.d/sites.json` (top-down site checks); the kit's `drape()` (a ground-hugging sheet: streets, yards, fields, roads) and `seaLevel`.
- **Map fixes made for landmarks:**
  - `forceSea` polygons: the bay under King's Landing's crests; the label slivers at Dragonstone, Eastwatch and Pyke; the Isle of Faces lettering.
  - `forceRivers.routes`: waypoints routed through the river ink for the Mander (now past Highgarden), the Red Fork and the Trident.
  - **Riverlands drainage (session 2):** the Trident's estuary was traced as a lake that the Maidenpool crest cut off from the Bay of Crabs, so the whole Trident network had no outlet and every branch chose its own direction: this is why the Green Fork ran north. Fixes:
    - `forceSea` over the crest;
    - the Trident route carried to the estuary;
    - forced reaches under the "Nutten" label (the joined Green and Blue Forks to the forks' meeting), the Riverrun confluence and the "Castle Cerwyn" label (Winterfell's stream);
    - `forceRivers.erase` (new) clears crest paint that traced as stray streams.
  - **Outletless networks (vectorize):** a network that reaches no sea or lake now drains as one toward its node nearest the sea or a lake, instead of per branch. 22 branches flipped, among them the Green Fork, Winterfell's streams and the Vale's north-coast river.
  - **Mouths pruned as spurs:** the spur pruning dropped any short last reach whose open end lay at the sea (it read as a loose end), which cut many rivers off from their outlets. A free end within `gapPx` of the sea or a lake is a mouth now. Every traced network reaches an outlet (25 outletless components → 0; 889 branches, 20,017 km).
  - **The Honeywine** (faint teal on the Reach's olive, like the Mander) is routed from both upper branches and the Uplands tributary to the head of the Whispering Sound.

## Known issues (to fix in Phase 2 unless noted)
- **The interior sits on a plateau with steep coastal ramps:** the interior plain stands ~4.5–7 units high (gamma 0.8 lifts low ground), and the ramp to the sea is a few km. Narrow sea inlets come out as fjords (the Whispering Sound). This is a Phase 2 terrain look issue.
- **Every river is a nameless 0.6 km `stream`** (the trace carries no names, and `world.json` classes rivers by name), so the forks of the Trident, the Mander and the rest get a stream's narrow, steep valley. In the riverlands' wide shots they run in trenches cut through the synthesized hills (Riverrun's wide shot). **Next map fix:** name the major rivers in the profile (from / to anchors, named downstream along the oriented tree in vectorize). The bake then gives them their classes (`major` / `great` widths, broad eased valleys). It ripples into the river landmarks (King's Landing, Highgarden, the Twins, Riverrun), which need re-fitting to wider ribbons.
- **River beds at 1 km/px:** a 0.6 km channel is narrower than a texel. Its carved bed blurs above the water in places, so the ribbon disappears in patches (e.g. at the Twins' crossing). The baked `riverChannel` mask paints the bed dark under the water in 1 km blocks (Riverrun's hero). Both should resolve at the 0.4 km/px milestone bake.
- **Forests:** from far away they read as flat dark polygons. The vegetation channels are remapped to Westeros (Haunted Forest, Wolfswood, southern woods), but the tree look is still Middle-earth's.
- **Fins in the Mountains of the Moon:** the hydro carve lowers ground by up to 22 units along a few traced streams north and north-east of the Lance (stream-638, -581, -590). It leaves thin spires standing between them, visible behind the Lance in the Eyrie's wide shot. This predates the Lance change (the carve stats are unchanged) and is a Phase 1/2 terrain fix.
- **The Neck's marsh** renders flat grey. **Orbit bookmarks** can sit inside rising ground: the probe's line-of-sight terms catch the worst cases. Check every new hero.
- **Region looks:** the ground palettes are provisional on Middle-earth grades and haze; the westerlands read as sand. Phase 2 retunes all ten.
- **Region borders:** a few are straight lines in the profile.
- **Hydro gates:** at 1 km/px they report geometry warnings, softened until the bake is ≤ 0.5 km/px.
- **Ledger:**
  - All 447 claims are `draft` (242 T, 100 M, 46 C, 59 I). No book corpus is attached in the cloud, so `pnpm canon --verify` has nothing to search.
  - Claims become hard constraints only once they are `verified`. The Giant's Lance height enters the bake as a `summits` lower bound for now.
  - A books-only lore critic (a fresh subagent that saw only the ledger) found no contradiction of the books and no show detail. Its 13 low/medium findings (time-slice wording, duplicate claims, three ASOS Jon chapter numbers, one lower-bound travel time) are applied.

## Reproduce Phase 1
```
# 1. map image → data/source/maps/westeros-crests/map.png (local only)
pnpm geo vectorize --map westeros-crests     # → data/source/westeros/vectors/*.geojson + relief.npz
pnpm geo places                              # → data/world/places.json (29 places, label M)
pnpm geo regions                             # → data/world/regions.geojson (10 look regions)
pnpm geo calibrate                           # → data/source/westeros/calibration.json (residuals)
pnpm geo overlay                             # → data/source/westeros/overlay/index.html (+ composite.png)
pnpm bake                                    # synth → coast → vectors → … → data/baked/
pnpm check                                   # downhill rivers, gates, ledger
MOW_SOFTWARE_GPU=1 MOW_CHROME=<chromium> pnpm shots --shot overview-top   # cloud: SwiftShader WebGPU
```
On the 5090 rig, drop `MOW_SOFTWARE_GPU`. For milestones, bake at `heightfield.kmPerPixel` 0.4: about 78 M texels and about 15 GB peak RAM.

## Next steps
1. **The user reviews the overlay page** (Phase 1 done criterion). Corrections go into the profile `tools/geo/maps/westeros-crests.json` (thresholds, anchors, places, regions), then re-vectorize and re-bake.
2. Attach the book corpus on the rig (`MOW_CORPUS_DIR`), then run `pnpm canon --verify --apply`. Verified heights then become bake `constraints`.
3. **Phase 2:** ten region looks (ground, haze, grade); named forests with their own tree kinds; snowlines (beyond the Wall, the Frostfangs, the Mountains of the Moon); the Wall as a 700 ft ice cliff along its line; the Neck's bogs; the Dornish sands.
4. **Phase 3:** the 24 landmarks with ledger citations per folder (see `data/canon/subjects.json`).
