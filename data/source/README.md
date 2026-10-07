# data/source — the geography's source images and everything traced from them

> **This folder is gitignored, and nothing in it may be committed or pushed.** Only this README and
> `manifest.json` are tracked. It holds the user's map images, which are copyrighted, and data traced
> from them, which is a derivative.
> Build tools read from here and write project assets elsewhere. Worktrees point `MOW_SOURCE_DIR` at the
> main checkout's copy.

Map of Westeros fetches no third-party geography: `manifest.json` has no items, so `pnpm data:fetch` only
restores the CC0 textures and samples. Everything below comes from the user's own copies and is
regenerated with `pnpm geo …`. See `docs/ARCHITECTURE.md` → Geography pipeline.

## maps/ — the user's map images
| Path | What it is |
|---|---|
| `maps/westeros-crests/map.png` | The **base sheet**: the "Map of Westeros" crests map (2688 × 3840 px, digitally hand-drawn, posted on r/mapmaking; supplied by the user). It defines the frame: its scale comes from the Wall (300 mi) and its frame crop is px 34..1957 × 340..3764. Its profile, with coordinates and thresholds only, is `tools/geo/maps/westeros-crests.json`. |

A further sheet goes in `maps/<id>/` (for example a scan of *The Lands of Ice and Fire* or an ebook's endpaper map). It needs a profile `tools/geo/maps/<id>.json` with `file` (the image path) and `controlPoints`. It is pinned to the base frame with `pnpm geo georef --map <id>`.

## westeros/ — derived (regenerate, never edit by hand)
| Path | Written by | What it is |
|---|---|---|
| `westeros/vectors/*.geojson` | `pnpm geo vectorize --map westeros-crests` | land, lakes, rivers, forests, mountains, hills, wetlands in map km (x east, y north); label M, `src` = map id. These are the bake's source layers (`world.json → source.vectors`). |
| `westeros/vectors/relief.npz` | 〃 | Mountain, hill and desert density on the frame crop (half resolution). It drives the synthesized uplift. |
| `westeros/vectors/vectorize.json`, `debug/*.png` | 〃 | Run report, water mask and terrain class images for checking the trace. |
| `westeros/overlay/index.html` (+ `sheet.jpg`, `composite.png`) | `pnpm geo overlay` | The **review page**: the sheet with toggleable traced layers and the places. Open it locally in a browser. It embeds the map, so it never leaves this folder. |
| `westeros/calibration.json` | `pnpm geo calibrate` | km/px from the Wall, the scale bar's figure, and the residual of every ledger distance between placed points. |
| `westeros/sketch/` | `pnpm geo sketch` | Superseded: the from-memory sketch used before the map arrived. Kept only as a test fixture. |

## canon/ — the book corpus index (optional)
`pnpm canon --index` writes its index here (`canon/corpus-index.json`: chapter ids and key hits only, no book text). The books themselves stay wherever `MOW_CORPUS_DIR` points:
the user's own copies of the published novels and companions (.txt / .md / .html / .epub). Preview chapters
of *The Winds of Winter* and generated prose are refused. Verification reports also land here, because
they hold corpus hits.
