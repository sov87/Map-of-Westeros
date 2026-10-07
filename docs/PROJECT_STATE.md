# Project state — Map of Westeros

_Rolling document: roadmap, current state, decisions, next steps. Keep it compact; replace stale detail
instead of appending logs._

**Last updated:** 2026-10-07 · Session 1 (cloud, software WebGPU) — Phases 0 and 1.

## Where we are
| Phase | State |
|---|---|
| 0 · Fork and sources | **Done.** Engine forked from *Map of Middle-Earth* (MIT), its content stripped (24 landmark folders, Arda / ME-GIS sources, ME places / regions / tour); host rules rewritten for the RTX 5090 rig; boots on the placeholder slab. Ledger covers all 88 planned subjects (24 landmarks, ranges, rivers, regions, slice facts). |
| 1 · Geography | **Built; waiting on the user's overlay review.** The user's map is vectorized, scale-calibrated from the Wall, synthesized into terrain and baked at 1 km/px. Every river is monotone downhill (`pnpm check` OK). The single T-labelled height constraint (the Giant's Lance) holds. |
| 2 · World look | Not started. Region looks are provisional ground palettes on Middle-earth grades. |
| 3–6 | Not started. |

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
  - **The Giant's Lance:** set to 5630 m (about 3.5 mi, label T, draft).
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

## Known issues (to fix in Phase 2 unless noted)
- **Forests:** from far away they read as flat dark polygons. The vegetation channels are remapped to Westeros (Haunted Forest, Wolfswood, southern woods), but the tree look is still Middle-earth's.
- **The Giant's Lance:** a smooth Gaussian summit inside the Mountains of the Moon. It needs shoulders, plus the Eyrie's shelf (a Phase 3 landmark).
- **The Wall:** not modelled yet (Phase 2 / 3). The Neck's marsh renders flat grey.
- **Region looks:** the ground palettes are provisional on Middle-earth grades and haze; the westerlands read as sand. Phase 2 retunes all ten.
- **Region borders:** a few are straight lines in the profile.
- **Hydro gates:** at 1 km/px they report geometry warnings, softened until the bake is ≤ 0.5 km/px.
- **Ledger:**
  - All 410 claims are `draft` (226 T, 100 M, 46 C, 38 I). No book corpus is attached in the cloud, so `pnpm canon --verify` has nothing to search.
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
