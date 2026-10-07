# Map of Westeros — build plan for Opus 5.5

Oct 7, 2026 · @Ethan Jones

## What we're building

Opus 5.5 forks the Middle-earth diorama's engine and rebuilds it as Westeros at the opening of *A Game of Thrones* (298 AC), checked against the books, never the HBO show.

The Middle-earth project shipped its V1 on 6 October 2026: a floating terrain slab rendered live in Chrome with three.js WebGPU, 24 modelled landmarks, and a deterministic 3.8-minute flyover film. Its code is MIT-licensed, so the engine can be reused with credit. Its map data, renders, film and score cannot.

Deliverables:

- An explorable floating Westeros you fly over in Chrome, by day and by night.
- 24 landmarks built from book descriptions, each with citations.
- A short flyover film, rendered offline at 4K on your 5090.
- A canon ledger: every geographic claim the build relies on, with book and chapter.

"Book-accurate" means the build never contradicts the text. Where the books are silent, invention is welcome, as long as it is labelled as invention.

## Start from the Middle-earth repo

Copy the code, not the content: the systems are generic, while the data, landmarks, looks and film are Middle-earth-specific.

| Part of the repo | Action | Notes |
| --- | --- | --- |
| Engine core: SceneState, Timeline, deterministic frames, quality tiers | Keep | Every frame stays a pure function of the scene state |
| Terrain, water, vegetation, atmosphere, light and effects systems | Keep, retune | Region looks and forest types rewritten for Westeros |
| Landmark kit and Blender pipeline | Keep | New landmark folders only |
| Python bake: river snapping, lake levels, landcover | Keep | Fed by a new elevation model (next sections) |
| Capture, QA, pixel lock, film and score tooling | Keep | Retarget paths and shot lists |
| `data/source` (ME-DEM, ME-GIS, Arda) | Replace | Your traced vectors and a synthesized elevation model |
| `data/world` places, regions, looks | Replace | Ten Westeros regions, from Beyond the Wall to Dorne |
| The 24 landmarks, route, timeline, score | Replace | See Landmarks |
| Mordor's ash deck | Repurpose or drop | Possible use: the Dragonmont's smoke over Dragonstone |
| Host rules for an 8 GB laptop with an Intel iGPU | Rewrite | Your Windows 11 rig: RTX 5090, 32 GB RAM, 4K OLED |

Three things are new: an ice material for the Wall, snowfields beyond it, and dry desert ground for Dorne.

Keep the MIT notice and credit earthwalker17 in the credits file. Opus should read the repo's `CLAUDE.md`, `docs/ARCHITECTURE.md` and `docs/PROJECT_STATE.md`, then inventory the code itself instead of trusting this summary.

One technical trap: WebGPU's default 2D texture limit is 8,192 pixels a side. Middle-earth's heightfield is 4,000 × 2,400 at 0.4 km per pixel; a long, narrow Westeros at that resolution will likely pass the limit, so request the adapter's higher limit or tile the heightfield.

## Book accuracy: sources and rules

The published text outranks every map, and the HBO productions count for nothing.

| Rank | Source | Used for |
| --- | --- | --- |
| 1 | The published novels and novellas, from your own copies | Descriptions, heights, distances, relative positions |
| 2 | *The Lands of Ice and Fire* (2012) | Positions of coasts, rivers, roads and castles |
| 3 | *The World of Ice & Fire* (2014), *Fire & Blood* (2018), the novels' own endpaper maps | Gaps the first two leave |
| 4 | Official illustrations in those books | The look of things the text leaves open; artist interpretation, lowest weight |

*The Lands of Ice and Fire* is the anchor map: Jonathan Roberts drew it from Martin's own sketches and notes, Martin approved it, and Westeros.org's Elio García and Linda Antonsson checked every name.

**Finding aids, never citations:** A Wiki of Ice and Fire and other wikis can point Opus to a passage; the ledger cites the book itself.

**Excluded:** the *Game of Thrones* and *House of the Dragon* shows (production design, maps, title sequence), games and fan art.

**The corpus:** the book text in `F:\Projects\asoiaf_corpus` is the search source. Only the published books count; the continuation chapters in `TWOW_PRODUCTION` and any other generated prose are never canon here.

### Evidence labels

Every place, terrain stamp and landmark part carries one label. Labels record provenance; they are not a gate on what may be built.

- **T** stated in the text (book and chapter)
- **M** shown on an official map
- **C** from a companion book or official art
- **I** inferred or invented

An **I** may never contradict a **T** or **M**. When the text and the map disagree, log both citations and settle it with a small display offset, the mechanism the Middle-earth repo already uses (`displayOffsetKm`).

### Time slice: 298 AC

The world is frozen at the opening of *A Game of Thrones*. That fixes state the show changed or the later books alter: Winterfell intact, Moat Cailin down to three towers, Harrenhal's towers slagged, the Dragonpit roofless, the Great Sept of Baelor standing (the books never destroy it).

### IP rules

- Map scans, data traced from them and book text never get committed; they live in a gitignored source folder, as Middle-earth's `data/source` does.
- No HBO imagery, logos, title fonts or sigil art; open-licence (OFL) fonts only.
- An original score, with no imitation of Ramin Djawadi's themes.
- The same release conditions as the TWOW project: no money, and down on rights-holder contact.

## The hard part: Westeros has no elevation data

Middle-earth stood on ME-DEM, a community-built elevation model; nothing of that quality exists for Westeros, so the project has to make its own.

What exists, checked 7 October 2026:

| Dataset | What it has | Verdict |
| --- | --- | --- |
| [Atlas of Thrones](https://blog.patricktriest.com/game-of-thrones-map-node-postgres-redis/) (Patrick Triest, 2017) | 10 kingdom outlines and location points, partly built from text scraped from wikis | Place-name cross-check only; no coasts, rivers or heights |
| [GIS of Thrones](https://blog.gvsig.org/2016/05/24/gis-of-thrones-mapping-game-of-thrones-with-gvsig/) (gvSIG, 2016) | Shapefiles described as based on the TV series; source unnamed, licence given only as "free" | Not book-grade; skip |
| Cartographers' Guild dataset used in [an R mapping tutorial](https://paulvanderlaken.com/2017/12/22/westeros_map/) | Unknown | Unverified: the forum thread would not open, so check its source and terms first |
| [Westeros Height Map](https://www.renderhub.com/shustrik/westeros-height-map) (RenderHub, $30) | An 8,193 × 16,385 TIFF; source unstated; marked as made with AI | Skip |
| [terrainHydrology](https://github.com/wattzhikang/terrainHydrology) (GitHub) | Open Python implementation of Génevaux et al. 2013 | Reference code only: it invents its own rivers and has no lakes |

### The pipeline

&#91;embedded content: terrain pipeline · 2 inputs, 1 synthesis step, gates loop back\]

Only the two top rows and the synthesis step are new work; from the elevation model down, the Middle-earth bake runs as it is.

- **Scale.** Calibrate from the Wall's stated length, about 300 miles in *A Game of Thrones*, then test it against every other distance in the ledger. The frame size falls out of this; log the residuals rather than hiding them.
- **Vectorizing.** Opus segments the scans into sea, rivers, lakes, the Neck's marsh, forests, roads, mountain and hill areas, and settlements, then serves an overlay page for review. You review; you never trace.
- **Synthesis.** The mountain and hill areas become an uplift map. Stream-power erosion then cuts valleys along the fixed rivers ([Cordonnier et al. 2016](https://diglib.eg.org/handle/10.1111/cgf12820)), followed by fine erosion and a sea shelf, all on the 5090.
- **Heights the text fixes.** Every T-labelled height, the Wall's 700 feet among them, is a hard constraint. The rest become relative constraints: this peak above that valley, this castle on a hill.
- **The Wall.** A terrain stamp plus kit geometry in a new ice material. At true scale it would vanish from a continent-wide view, so decide how much of the terrain's vertical exaggeration it takes.

## Landmarks

Twenty-four candidates, matching Middle-earth's count, run north to south; every detail below is a starting point that Opus must re-find in the text and cite before modelling.

| # | Landmark | Region | Book details to confirm |
| --- | --- | --- | --- |
| 1 | Fist of the First Men | Beyond the Wall | Ancient ring fort on a lone hill |
| 2 | Castle Black and the Wall | The Wall | About 700 ft of ice, about 300 miles long; castle with no curtain wall; switchback stair and winch cage |
| 3 | Eastwatch-by-the-Sea | The Wall | The Wall's eastern end, at the sea |
| 4 | Winterfell | The North | Two granite walls with a moat between; hot springs; glass gardens; godswood; the Broken Tower |
| 5 | White Harbor | The North | White stone city on the White Knife; New Castle, Wolf's Den, Seal Rock |
| 6 | Moat Cailin | The Neck | Three surviving towers (Gatehouse, Drunkard's, Children's) standing in bog |
| 7 | Greywater Watch | The Neck | A moving castle no outsider can find: shown as uncertainty, such as mist, never a model |
| 8 | The Twins | Riverlands | Twin castles either side of the Green Fork, joined by a bridge with a central tower |
| 9 | Riverrun | Riverlands | At the Tumblestone and Red Fork confluence; a moat makes it an island |
| 10 | Inn at the Crossroads | Riverlands | Where the Kingsroad meets the river road and the high road |
| 11 | Harrenhal | Riverlands | Five huge towers slagged by dragonfire, beside the Gods Eye |
| 12 | Isle of Faces | Riverlands | Weirwood island in the Gods Eye |
| 13 | The Eyrie | The Vale | Atop the Giant's Lance; waycastles Stone, Snow and Sky above the Gates of the Moon |
| 14 | Pyke | Iron Islands | Keeps on crumbling sea stacks, linked by bridges |
| 15 | Casterly Rock and Lannisport | Westerlands | Castle within the great Rock above Lannisport |
| 16 | King's Landing | Crownlands | Three hills: Red Keep, Great Sept of Baelor, roofless Dragonpit; mouth of the Blackwater Rush |
| 17 | Dragonstone | Crownlands | Island castle shaped like dragons; the smoking Dragonmont |
| 18 | Storm's End | Stormlands | Massive curtain wall and one great drum tower above Shipbreaker Bay |
| 19 | Summerhall | Stormlands | Ruins of the burned Targaryen summer palace |
| 20 | Highgarden | The Reach | White walls on a hill above the Mander; check the ring count and the briar maze |
| 21 | Oldtown | The Reach | The Hightower on Battle Isle; the Citadel along the Honeywine |
| 22 | Starfall | Dorne | At the mouth of the Torrentine; check the Palestone Sword tower |
| 23 | Sunspear | Dorne | Old Palace, Tower of the Sun, Spear Tower; the Winding Walls round the Shadow City |
| 24 | The Water Gardens | Dorne | Pools and fountains of the Martells' palace near Sunspear |

The land between them matters as much: the Wolfswood, Haunted Forest, Kingswood and Rainwood; the Neck; the Frostfangs, Mountains of the Moon and Red Mountains; the Gods Eye, the Trident's three forks, the Mander and the Blackwater Rush.

## Phases and definition of done

Seven phases mirror Middle-earth's sessions, each one long autonomous pass that ends with your review of stills, not check-ins along the way.

0. **Fork and sources.** Copy the code, strip the Middle-earth content, rewrite the host rules for your rig, inventory the maps you own, and extract the canon ledger.
   - Done when the app boots on a flat placeholder slab and the ledger covers every planned landmark, range and river.
1. **Geography.** Georeference, vectorize, calibrate scale, synthesize terrain, bake.
   - Done when the overlay against the official map passes your review, every river runs downhill to the sea, and the T-labelled constraints hold.
2. **World look.** Ten regions with their own ground, haze and grade; named forests; snowlines; the Wall in ice.
   - Done when a critic who hasn't seen the work can name the region from an unlabelled still.
3. **Landmarks.** All 24, each with ledger citations in its folder.
   - Done when each passes the repo's kit, seating and framing gates, and a books-only lore critic finds no contradiction.
4. **Light and effects.** The Dragonmont's smoke, the Hightower's beacon, steam off Winterfell's hot springs, night lights in the cities.
   - Done when a set of sentinel stills is pixel-locked, as Middle-earth's `lock-v1` is.
5. **Film.** Route line, camera moves, place labels, title cards and an original score, then picture lock.
   - Done when you approve a review cut.
6. **Final render and release.** 2160p24 on the 5090, plus a decision on what, if anything, goes public.

Two critics run throughout as fresh subagents that never see the work being made. One judges renders against the official map; the other has read only the ledger and asks whether anything contradicts the books.

## Decisions for you before kickoff

The first one decides how good the geography can be; the rest have defaults Opus will use if you skip them.

- [ ] **Which official maps do you own, and in what form?** The physical *Lands of Ice and Fire* folio scanned, the companion books' maps, or the maps in your ebooks.
- [ ] **Time slice.** Default 298 AC, the opening of *A Game of Thrones*; the alternative is the winter of 300 AC.
- [ ] **Extent.** Default: Westeros plus the land beyond the Wall up to the Frostfangs, no Essos.
- [ ] **Film route.** Default: down the Kingsroad from Castle Black to King's Landing; the alternative is a grand tour from the Wall to Dorne.
- [ ] **Repo.** Default: a new private repo at `F:\Projects\map-of-westeros`.

## Kickoff prompt for Claude Code

Export this doc as Markdown, save it in the new repo as `BRIEF.md`, then paste this into Claude Code running Opus 5.5:

```text
Build a book-accurate floating diorama of Westeros, forked from
https://github.com/earthwalker17/map-of-middle-earth (MIT code).

Read BRIEF.md first, then that repo's CLAUDE.md, docs/ARCHITECTURE.md
and docs/PROJECT_STATE.md. Inventory the actual code before planning;
don't trust any summary of it, BRIEF.md's included.

This session: phases 0 and 1 of BRIEF.md.

This machine: Windows 11, RTX 5090 (32 GB VRAM), 32 GB RAM, 4K display.
The Middle-earth host rules were written for an 8 GB laptop; rewrite them.

Non-negotiables:
- The published ASOIAF books outrank every map; the HBO shows count for
  nothing. Every terrain or landmark claim in the ledger cites book and
  chapter. Book text: F:\Projects\asoiaf_corpus, published books only.
  TWOW_PRODUCTION and any generated chapters are never canon.
- Unstated detail may be invented if it is labelled and contradicts nothing.
- Map scans, traced data and book text are never committed.
- Keep the repo's determinism and system contracts intact.

Work in long autonomous passes. Use fresh subagents as critics: one judges
renders against the official-map overlay, one has read only the ledger and
looks for contradictions with the books. Stop for me only on decisions that
can't be undone or that BRIEF.md lists as mine. Commit at milestones;
never push without asking.
```

## Terms used here

| Term | Meaning |
| --- | --- |
| Elevation model (DEM) | A grid of ground heights; the terrain is built from it |
| GIS vectors | Map features stored as lines and shapes (coasts, rivers, roads) rather than pixels |
| Georeference | Pin a scanned map to a coordinate frame so distances can be measured on it |
| Vectorize | Turn a scanned map's drawn lines and symbols into GIS vectors |
| Heightfield texel | One cell of the height grid; Middle-earth uses 0.4 km per cell |
| Uplift map | A painted map of where the ground is pushed up into mountains |
| Stream-power erosion | A geology model where rivers cut down faster where they carry more water down steeper slopes |
| Vertical exaggeration | Heights scaled up so relief reads on a continent-sized model, as on a relief map |
| Stamp | A shape pressed into the terrain at a landmark: a hill, a plateau, a cut |
| Kit | The repo's code library for building castles and towns from parts |
| Deterministic frame | Same scene state in, same pixels out, every run |
| Pixel lock | Saved fingerprints of reference stills; later work must reproduce them exactly |
| WebGPU, TSL | The browser's modern graphics interface, and three.js's language for writing shaders on it |
| Canon ledger | The list of every book claim the build uses, each with its citation and label |
| AC | After Aegon's Conquest, the books' dating system |

## Sources

Book facts in this plan are from memory and are exactly what the ledger must verify.

- [earthwalker17/map-of-middle-earth](https://github.com/earthwalker17/map-of-middle-earth): README, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATE.md`, `data/source/README.md`
- [How the official ASOIAF maps were made](https://geoawesome.com/maps-games-thrones-created) (Geoawesome)
- [Build an interactive Game of Thrones map](https://blog.patricktriest.com/game-of-thrones-map-node-postgres-redis/) (Patrick Triest)
- [GIS of Thrones](https://blog.gvsig.org/2016/05/24/gis-of-thrones-mapping-game-of-thrones-with-gvsig/) (gvSIG)
- [Game of Thrones: an R map to Westeros](https://paulvanderlaken.com/2017/12/22/westeros_map/) (Paul van der Laken)
- [Westeros Height Map](https://www.renderhub.com/shustrik/westeros-height-map) (RenderHub)
- [terrainHydrology](https://github.com/wattzhikang/terrainHydrology) (GitHub)
- [Large Scale Terrain Generation from Tectonic Uplift and Fluvial Erosion](https://diglib.eg.org/handle/10.1111/cgf12820), Cordonnier et al., *Computer Graphics Forum*, 2016
- [Terrain generation using procedural models based on hydrology](https://history.siggraph.org/?p=108417), Génevaux, Galin, Guérin, Peytavie and Benes (SIGGRAPH 2013)
