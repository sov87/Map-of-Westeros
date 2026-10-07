# Map of Westeros

A **book-accurate floating miniature diorama of Westeros** as it stands at the opening of *A Game of Thrones*
(298 AC) — rendered live in Chrome with three.js WebGPU, by day and by night, with 24 landmarks built from the
books' own descriptions and a short flyover film rendered offline at 2160p.

"Book-accurate" means the build never contradicts the published text. Every geographic claim it relies on is
logged in a **canon ledger** with book and chapter (`data/canon/`); where the books are silent, invention is
welcome, as long as it is labelled as invention. The HBO productions count for nothing.

> **Status: Phase 0–1 (fork and geography).** The engine boots on a flat placeholder slab; the canon ledger
> is drafted and awaits verification against the books; the geography toolchain (georeference, vectorize,
> scale calibration, terrain synthesis) is built and waits for scans of the official maps. See
> [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) and the plan in [`BRIEF.md`](BRIEF.md).

## How it is made

- **Engine:** forked from earthwalker17's [Map of Middle-Earth](https://github.com/earthwalker17/map-of-middle-earth)
  (MIT) — a deterministic three.js r186 WebGPU / TSL renderer where every frame is a pure function of the scene
  state, with terrain, water, vegetation, atmosphere, light and effects systems, a landmark kit, a Python bake,
  and capture / QA / pixel-lock / film / score tooling. None of its Middle-earth content is used.
- **Geography:** Westeros has no elevation data, so the project synthesizes its own: the official maps are
  georeferenced and vectorized, scaled from the Wall's length (about 300 miles) and tested against every
  distance in the ledger; mountains and hills become an uplift map, and stream-power erosion cuts valleys along
  the fixed, traced rivers.
- **Canon:** `data/canon/` — sources and labels (`books.json`), what the build models (`subjects.json`), and the
  claims themselves (`claims/*.json`), verified against the user's own copies of the books with `pnpm canon`.

## Running it

Requirements: Node ≥ 22.12 with pnpm 11, Python via [uv](https://docs.astral.sh/uv/), Chrome with WebGPU
(a recent desktop GPU; developed on an RTX 5090).

```sh
pnpm install
pnpm data:fetch          # CC0 terrain textures (and the score's CC0 samples)
pnpm bake                # data/world/world.json → data/baked/ (Phase 0: the flat placeholder slab)
pnpm dev                 # explorer at http://localhost:5173
pnpm check               # validators (places, landmarks, assets vs credits, film, canon ledger)
```

No map scan, traced map data or book text is ever committed: they stay on the developer's machine
(`data/source/`, gitignored). See `data/source/README.md`.

## Licence and credits

Code: MIT (`LICENSE`) — © sov87, and © earthwalker17 for the engine it is forked from. Full credits, sources and
the non-affiliation note: [`CREDITS.md`](CREDITS.md). *A Song of Ice and Fire* and Westeros belong to George R. R.
Martin; this is a non-commercial fan project, not affiliated with him, his publishers or HBO.
