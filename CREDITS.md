# Credits

*Map of Westeros* is a non-commercial fan work. This file credits the engine it is forked from, every asset
shipped in `public/`, the sources used during development, and the software it is built with. Machine-readable
detail (URLs, sizes, sha256) lives in the manifests named below.

## Engine

The code is forked from **[Map of Middle-Earth](https://github.com/earthwalker17/map-of-middle-earth)** by
**earthwalker17** (MIT, forked at commit `696e968`, 2026-10-06): the deterministic engine (SceneState, Timeline,
quality tiers), the terrain, water, vegetation, atmosphere, light and effects systems, the landmark kit and
Blender pipeline, the Python bake, and the capture, QA, pixel-lock, film and score tooling. Its MIT notice is kept
in `LICENSE`. None of its Middle-earth content is used: not its geography data (ME-DEM, ME-GIS, Arda), places,
landmarks, looks, renders, film or score.

## Fonts

Shipped in `public/fonts/` (committed, used **unmodified**; manifest: `public/fonts/_manifest.json`).
All are licensed under the [SIL Open Font License 1.1](https://openfontlicense.org) (`OFL-1.1`); each
family's `OFL.txt` sits next to its font files. Source: [google/fonts](https://github.com/google/fonts).

| Family | Designer | Licence | Reserved Font Name | Files |
|---|---|---|---|---|
| Cinzel | Natanael Gama (The Cinzel Project Authors) | OFL-1.1 | none | `cinzel/Cinzel-VariableFont_wght.ttf` |
| Cinzel Decorative | Natanael Gama | OFL-1.1 | **"Cinzel"** | `cinzeldecorative/CinzelDecorative-{Regular,Bold}.ttf` |
| Cormorant Garamond | Christian Thalmann (Catharsis Fonts, The Cormorant Project Authors) | OFL-1.1 | none | `cormorantgaramond/CormorantGaramond{,-Italic}-VariableFont_wght.ttf` |
| EB Garamond | Georg Duffner, Octavio Pardo (The EB Garamond Project Authors) | OFL-1.1 | none | `ebgaramond/EBGaramond{,-Italic}-VariableFont_wght.ttf` |

Cinzel Decorative carries the Reserved Font Name "Cinzel": we ship it unmodified under its original
name. Any subset, conversion or other modified version must be renamed (OFL §3). Variable-font
files are saved without the upstream `[wght]` brackets in the filename; content is byte-identical.

## Textures

[Poly Haven](https://polyhaven.com) PBR textures, **CC0 1.0** (public domain; credit given as a courtesy).

- **Sources** (not shipped): 2k JPG maps (`diffuse`, `nor_gl`, `rough`, `ao`, `disp`) in
  `data/textures-src/<asset_id>/`, **fetched by script, never committed**: `pnpm data:fetch`
  (`node tools/refs/fetch-data.mjs --only textures`), manifest `data/textures-src/manifest.json`.
- **Generated locally (derived, gitignored; served from `public/` by a local build)**: `public/textures/terrain/` — the terrain ground-detail layers
  (`detail-512.bin`, `detail-1024.bin`, `detail.json`), generated from six of the sources by
  `node tools/textures/prep.mjs` (run automatically after the fetch; gitignored). Modifications:
  resized to 512² / 1024², luminance high-passed and contrast-normalised, packed with the normal
  map's x/y and the displacement map as height. Layers (see `detail.json`): meadow ← `aerial_grass_rock`,
  dry ← `withered_grass`, rock ← `aerial_rocks_02`, snow ← `snow_field_aerial`, scree ←
  `river_small_rocks`, ash ← `burned_ground_01`.

| Asset | Maps | Intended use |
|---|---|---|
| [aerial_grass_rock](https://polyhaven.com/a/aerial_grass_rock) | diffuse, nor_gl, rough, ao, disp | Lowland meadow with rock outcrops (Middle-earth: the Shire, Eriador) |
| [aerial_rocks_02](https://polyhaven.com/a/aerial_rocks_02) | diffuse, nor_gl, rough, ao, disp | Grey rock — mountain cliffs and peaks |
| [burned_ground_01](https://polyhaven.com/a/burned_ground_01) | diffuse, nor_gl, rough, ao, disp | Burned ash ground — volcanic ground (Westeros: Dragonstone) |
| [river_small_rocks](https://polyhaven.com/a/river_small_rocks) | diffuse, nor_gl, rough, ao, disp | River gravel — riverbeds, scree, fords |
| [snow_field_aerial](https://polyhaven.com/a/snow_field_aerial) | diffuse, nor_gl, rough, ao, disp | Snow field — high peaks, the lands beyond the Wall |
| [withered_grass](https://polyhaven.com/a/withered_grass) | diffuse, nor_gl, rough, ao, disp | Dry golden grass — dry plains (Westeros: the westerlands' hills, Dorne's fringes) |

## Models

Shipped in `public/models/` (committed; manifest `public/models/manifest.json` with the sha256 of every
file and of the script that built it). **Original work of this project**, generated headless in Blender 4.5
by the scripts in this repository (`pnpm models` → `tools/blender/run.ts`, shared helpers
`tools/blender/lib.py`); no third-party meshes, scans, textures or film / show assets are used. MIT, like the
project's code (see `LICENSE`). None yet (Phase 3 builds the landmarks).

## Geography and canon sources (never committed or redistributed)

Westeros has no community elevation model, so the project synthesizes its own from the official maps and the
books. Every source below stays on the developer's machine (`data/source/`, gitignored); only the project's own
authored data is committed: the canon ledger's paraphrased claims and short search keys (`data/canon/`), and
place coordinates measured on the georeferenced map (`data/world/places.json`).

- **The published books** of *A Song of Ice and Fire* by **George R. R. Martin** (Bantam / HarperCollins
  Voyager): the novels, the Dunk and Egg novellas and the novellas of the Targaryen kings — the canon ledger's
  primary source. No book text is committed.
- **The Lands of Ice and Fire** (2012), maps by **Jonathan Roberts** from George R. R. Martin's sketches, names
  checked by **Elio García** and **Linda Antonsson** — the anchor map for coasts, rivers, roads and castles.
  Scans of the user's own copy are local only; traced data is never committed.
- **The World of Ice & Fire** (2014, George R. R. Martin, Elio M. García Jr., Linda Antonsson) and
  **Fire & Blood** (2018), and the novels' endpaper maps — gaps the first two leave; official illustrations in
  those books for the look of things the text leaves open (lowest weight).
- Wikis (e.g. A Wiki of Ice and Fire) are finding aids only: they may point to a passage, never stand as a
  citation.

**Excluded:** the HBO productions *Game of Thrones* and *House of the Dragon* (production design, maps, the
title sequence, imagery, logos, typography and music), games and fan art.

## Music

The score (Phase 5) will be an **original composition by this project**, written as code and rendered offline
(`pnpm music`); it uses and imitates no film or television score material — in particular nothing of Ramin
Djawadi's themes. The engine (`tools/music/engine.py`, from Map of Middle-Earth) renders with fetched sample
libraries that are never committed or redistributed (manifest: `data/music-src/manifest.json`).

| Input | Author | Licence | Use |
|---|---|---|---|
| [VSCO 2 Community Edition](https://github.com/sgossner/VSCO-2-CE) (SFZ branch, commit `6dd651d`) — strings, harp, horns, trumpet, trombone, tuba, flute, oboe, clarinet, piccolo, percussion | Versilian Studios (Sam Gossner) | CC0-1.0 | instrument samples, render-time only |
| [sfizz](https://github.com/sfztools/sfizz) 1.2.3 (`sfizz_render`) | the sfizz authors (SFZ Tools) | BSD-2-Clause | offline SFZ → audio renderer, a tool (not shipped) |

## Software

| Package | Licence | Use |
|---|---|---|
| [three.js](https://threejs.org) | MIT | WebGPU renderer, TSL |
| [Vite](https://vite.dev) | MIT | Dev server / build |
| [lil-gui](https://lil-gui.georgealways.com) | MIT | Debug UI |
| [Playwright](https://playwright.dev) | Apache-2.0 | Headless capture (`pnpm shots` / `pnpm qa`) |
| [sharp](https://sharp.pixelplumbing.com) | Apache-2.0 | Image processing in capture tools |
| [TypeScript](https://www.typescriptlang.org) · [tsx](https://tsx.is) | Apache-2.0 · MIT | Language / TS runner |

Python bake (`tools/bake`, dev-only):

| Package | Licence |
|---|---|
| NumPy, SciPy | BSD-3-Clause |
| Numba | BSD-2-Clause |
| rasterio | BSD-3-Clause |
| GDAL (via rasterio / pyogrio wheels) | MIT |
| pyogrio | MIT |
| Shapely | BSD-3-Clause |
| GeoPandas | BSD-3-Clause |
| OpenCV (opencv-python-headless) | Apache-2.0 (OpenCV) / MIT (wheel packaging) |
| Pillow | MIT-CMU (HPND) |
| scikit-image | BSD-3-Clause |
| tifffile | BSD-3-Clause |

Python score toolchain (`tools/music`, dev-only):

| Package | Licence |
|---|---|
| NumPy, SciPy | BSD-3-Clause |
| python-soundfile (libsndfile) | BSD-3-Clause (LGPL-2.1 libsndfile, bundled in the wheel) |
| mido | MIT |
| pyloudnorm | MIT |
| Pillow | MIT-CMU (HPND) |

The film renderer (`pnpm film`) encodes with a system install of [FFmpeg](https://ffmpeg.org) (LGPL-2.1+ / GPL
depending on the build; called as an external program, not shipped): ProRes with FFmpeg's own `prores_ks`, AAC
with its native encoder, and H.264 — the preview / review chunks and the film's delivery mp4 — with
[x264](https://www.videolan.org/developers/x264.html) (`libx264`, GPL-2.0-or-later), which needs a GPL build
(developed with the gyan.dev FFmpeg 8.0.1 full build).

## Trademarks & IP

*A Song of Ice and Fire*, *A Game of Thrones*, Westeros and the names of their characters, places and events
belong to **George R. R. Martin**; the books are published by Bantam Books (Penguin Random House) and
HarperCollins. *Game of Thrones* and *House of the Dragon* are trademarks of **Home Box Office, Inc.** This
project is a **non-commercial fan work**, not affiliated with or endorsed by any of them or by any author or
artist credited above. Release conditions: no money is made from it, and it comes down on any rights-holder's
request.

The project deliberately contains **no HBO imagery, logos, title fonts or sigil art** (OFL fonts only) and **no
film or television score material**.
