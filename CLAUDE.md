# Map of Westeros — project constitution

A **book-accurate floating miniature diorama of Westeros** at the opening of *A Game of Thrones* (298 AC),
three.js r186 WebGPU + TSL, forked from earthwalker17's *Map of Middle-Earth* engine (MIT; see `CREDITS.md`).
Deliverables (`BRIEF.md`): an explorable floating Westeros by day and night, 24 landmarks built from book
descriptions with citations, a short flyover film rendered offline at 2160p24, and the **canon ledger**.

**Start every session with `pnpm host`, then read `docs/PROJECT_STATE.md`** (where we are, what's next), then
`docs/ARCHITECTURE.md` (contracts) as needed. The brief is `BRIEF.md`; the canon ledger is `data/canon/`.

## Book accuracy (hard rules)
- **The published books outrank every map; the HBO shows count for nothing.** Source ranks, labels and the time
  slice are in `data/canon/books.json`; the schema and rules in `data/canon/README.md`.
- Every geographic or physical claim the build relies on is a ledger claim with book and chapter. Places,
  stamps and landmark parts carry an evidence label (**T** text · **M** official map · **C** companion / official
  art · **I** inferred / invented) and cite ledger ids. An **I** never contradicts a **T** or **M**; unstated
  detail may be invented when it is labelled.
- Text vs. map conflicts: log both citations in the claim, settle with `displayOffsetKm` (validator-checked).
- **Time slice 298 AC:** Winterfell intact, Moat Cailin down to three towers, Harrenhal's towers slagged, the
  Dragonpit roofless, the Great Sept of Baelor standing. Later damage is `state-after` and ignored.
- The corpus (`MOW_CORPUS_DIR`, on the workstation `F:\Projects\asoiaf_corpus`) is the search source:
  published books only — `TWOW_PRODUCTION` and any generated prose are never canon (the verifier refuses them).
  Wikis are finding aids, never citations. Draft claims become hard bake constraints only once `verified`.

## Architectural principles (inherited, unchanged)
- **One world, shared systems.** Features plug into existing systems (terrain, water, vegetation,
  environment, landmarks, effects, camera, tour, render); no parallel one-off pipelines.
- **Single sources of truth:** `data/world/*.json` (frame, places, regions, looks), `data/canon/` (what the books
  say), `data/tour/*` (route, timeline), the **HeightField** service (the only height API: base bake + TS stamps).
- **Determinism:** every frame is a pure function of `SceneState` (from `Timeline.evaluate(t)`). Systems
  implement `evaluate(frame)`; no `Math.random`, `Date.now`, `performance.now`, TSL `time`, or hidden
  accumulated state in anything that renders. Randomness = `rand(seed, id, k)` (src/core/rng.ts). Effects animate
  only from `SceneState.tFx`; event-driven lights / emitters read `SceneState.events` through the gate table
  (`src/materials/gates.ts`). The bake and the terrain synthesis are deterministic too (seeded, no wall clock).
- **Landmarks declare, systems realize:** `defineLandmark` bundles stamps, kit proxy / model, lights, trees,
  forests, pools, emitters, annotations, bookmarks. Landmarks never own materials, particle systems or render
  loops; all materials come from the shared families. One fixed design scale per landmark.
- **Nothing DOM-based appears in captured frames.** Labels = cartography layer; titles = canvas-2D quads.
- **Quality ceiling = offline pipeline.** Preview stays interactive; stills / film use jittered accumulation
  (`final` tier). The terrain samples 15 of WebGPU's 16 textures — frozen: new looks reuse existing fetches.
- **Large rasters:** the engine requests the adapter's maximum texture size (16384 on the RTX 5090; WebGPU's
  default is 8192) and `World.load` fails loudly when a baked raster exceeds it. Never silently downsample.

## Geography (Phase 1 pipeline)
Westeros has no elevation data: the project makes its own (`docs/ARCHITECTURE.md` → Geography pipeline).
Official map scans → `tools/geo` georeference (control points) → vectorize (Claude segments; the user reviews
the overlay page, never traces) → scale calibration from the Wall's length, residuals vs. every ledger distance
logged → `tools/bake` synthesis (uplift from mountain / hill areas, stream-power erosion along the fixed traced
rivers, lakes, fine erosion, sea shelf; T-labelled heights as hard constraints) → the inherited bake.

## Workflow rules
- Visual work is not done until it has been **rendered, inspected and compared with references**
  (`pnpm shots --shot <id>` / `pnpm qa`; render-target readback — page screenshots of WebGPU are black).
- **One heavy job at a time:** captures, bake and build take the machine-wide lock
  (`%LOCALAPPDATA%\map-of-westeros\gpu.lock`) behind a free-RAM guard (4 GB for captures, 6 GB for the bake).
  Captures in bounded batches, in the foreground, ≤ 10 min per call (split with `qa --only a,b,…`). Iterate at
  1920×1080 spp 4; milestone QA at 3840×2160 spp 4. Agents never run `pnpm build` or long-lived dev servers.
- **Bake memory scales with texels**: a 0.4 km/px Westeros heightfield is ≈ 7× Middle-earth's (≈ 72 M texels,
  tens of GB at peak). Iterate at a coarser `heightfield.kmPerPixel` (0.8–1.6) and bake full resolution only for
  milestones; `pnpm host` prints the estimate. Blender (`pnpm models`) runs headless under the same lock.
- A full film render (hours) runs unbudgeted in its own window via `tools/capture/film-overnight.ps1` on a
  pinned Chrome copy (`MOW_CHROME`); no commit that touches the render inputs until it is assembled.
- Up to **4** parallel implementation agents on this host, each in its own worktree and module files; captures
  stay one at a time. The main agent reviews and integrates — never accept subagent output unseen.
- **Critics are fresh subagents that never see the work being made:** a map critic judges renders against the
  official-map overlay; a lore critic has read only the ledger and asks whether anything contradicts the books.
- **Pixel locks** (`pnpm lock`) guard finished looks once Phase 4 writes the first lock (`lock-v1`).
- Commit at meaningful milestones; update `docs/PROJECT_STATE.md` at each. **Push only after explicit user
  approval** (cloud sessions push their own session branch, never `main`).
- **Stop for the user only on decisions that cannot be undone or that `BRIEF.md` lists as theirs.**
- `CLAUDE.md` changes only when stable rules change; session logs go to `PROJECT_STATE.md`.
- **Cloud / CI (no GPU):** `MOW_SOFTWARE_GPU=1` lets `pnpm shots` boot on a software adapter (SwiftShader) for
  smoke tests — set `MOW_CHROME` to a Chromium binary there. Software pixels are never compared, locked or
  shipped; the film refuses them.

## Conventions
- Units: 1 world unit = 1 km of the calibrated map; origin at the frame centre; X east, −Z north, Y up.
  Authored coordinates are **map km** `[x east, y north]`. Terrain heights are exaggerated (`world.json`).
- TypeScript strict, ES modules, pnpm. `three` pinned to 0.186.1 — upgrade deliberately. Python (uv) in
  `tools/bake` and `tools/geo`.
- Ids are kebab-case and shared across data, folders, ledger subjects and bookmarks (`kings-landing`).
- A landmark is done when its shot-list entry passes `pnpm check`'s budget, seating and framing gates and the
  lore critic finds no contradiction; its folder holds its ledger citations.
- Worktrees point `MOW_WORLD_DIR` / `MOW_SOURCE_DIR` / `MOW_REFERENCE_DIR` at the main checkout's gitignored data.

## Licensing & IP (hard rules)
- **Never commit** map scans, data traced from them, book text, `data/source/`, `data/baked/`, `reference/` or
  fetched textures / samples. The ledger holds paraphrases plus `find` keys of at most five words.
- Every shipped asset in `public/` is listed in `CREDITS.md`; keep earthwalker17's MIT notice in `LICENSE`.
- No HBO imagery, logos, title fonts or sigil art; OFL fonts only. An original score — no imitation of Ramin
  Djawadi's themes. No money; down on any rights-holder's request. Publishing anything is the user's decision.

## Commands
`pnpm host [--fix|--prune]` · `pnpm dev` · `pnpm typecheck` · `pnpm check` · `pnpm canon [--check|--verify]` ·
`pnpm geo <georef|vectorize|calibrate|overlay|sketch> …` · `pnpm bake [-- --steps …]` ·
`pnpm shots --smoke|--shot <id>` · `pnpm qa [--set <name>] [--only a,b] [--batch 8]` · `pnpm perf [--gate]` ·
`pnpm models [--only id]` · `pnpm review` · `pnpm lock --write|--verify|--compare` · `pnpm showcase` ·
`pnpm film --at|--every|--render|--assemble …` · `pnpm music --cues <cue sheet>` · `pnpm data:fetch`
