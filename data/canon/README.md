# data/canon — the canon ledger

Every geographic or physical claim the build relies on, with its book and chapter. The ledger is
**authored truth for "what the books say"**; `data/world/*.json` (places, regions, looks) and the
landmark folders cite ledger ids instead of restating sources.

- `books.json` — the citable sources (rank, ids), the evidence labels and the time slice (298 AC).
- `subjects.json` — everything the build models (regions, landmarks, ranges, rivers, lakes, seas,
  forests, roads, islands). Each subject must be covered by at least one claim.
- `claims/<group>.json` — the claims, one file per group (`north`, `west`, `south`, `realm`).
- Verification reports live in `data/source/canon/` (gitignored: they hold corpus hits).

## Hard rules

1. **The published text outranks every map; the HBO shows count for nothing.** Neither do games,
   fan art, wikis (finding aids only), the unpublished The Winds of Winter preview chapters, or any
   generated prose.
2. **No book text is committed.** A claim is a paraphrase in our own words. The only verbatim
   text allowed is the `find` keys: at most three per citation, each at most five words, used by
   the verifier to locate the passage in the local corpus.
3. **Labels record provenance, not permission.** `T` text · `M` official map · `C` companion book
   or official art · `I` inferred or invented. An `I` may never contradict a `T` or `M`.
4. **Text vs. map conflicts are logged, not hidden:** both citations go in the claim, `conflict`
   says how the build settles it (normally a `displayOffsetKm` on the place).
5. **Time slice 298 AC.** Damage done later (a sacking, a burning) is `kind: "state-after"` and the
   build ignores it; later books still count for anything that had not changed by then.

## Claim schema

```jsonc
{
  "id": "wall-height",                  // kebab-case, unique across all files, prefixed by its main subject
  "subjects": ["the-wall"],             // subject ids from subjects.json (the first is the main one)
  "kind": "height",                     // see kinds below
  "claim": "The Wall stands about 700 feet high.",   // paraphrase, own words, <= 240 chars
  "label": "T",                         // T | M | C | I
  "cites": [                            // >= 1 for T / M / C; optional for I (then `basis` explains)
    { "book": "AGOT", "chapter": "Tyrion III", "find": ["seven hundred feet"] }
  ],
  "value": { "ft": 700, "approx": true },  // optional machine-readable value (see values below)
  "use": ["terrain", "landmark:castle-black"],  // what in the build depends on it
  "status": "draft",                    // draft | verified | corrected | disputed
  "notes": "…",                         // optional
  "conflict": "…",                      // optional: text vs map disagreement and how it is settled
  "basis": "…"                          // required for label I: what the inference rests on
}
```

**kinds** — `height` (absolute), `relative-height` (A above / below B), `length` (a feature's own
size), `distance` (between two places), `travel` (journey time between places; speed assumptions in
`notes`), `position` (absolute or on-feature: "on the Kingsroad", "at the mouth of"), `relative-position`
(A north / east / upriver of B), `form` (shape, layout, parts), `material` (stone, ice, colour),
`count` (towers, walls, rings), `hydrology` (rivers, confluences, lakes, marsh), `vegetation`,
`climate`, `state-298` (the condition at the opening of AGOT), `state-after` (later changes the
build ignores), `name`.

**values** — `ft`, `miles`, `leagues` (1 league = 3 miles in the books' usage), `km`, `count`,
`days` (+ `mode`: foot / horse / ship / raven), `from` / `to` (subject or place ids), `dir`
(n, ne, e, se, s, sw, w, nw, upstream, downstream, above, below), `approx` (true when the text hedges), `atLeast` (true when the text gives only a lower bound — never a calibration point).

**use** tags — `scale` (scale calibration: distances and lengths), `terrain` (heights and relief
constraints), `hydrology`, `vectors` (coast / river / road checks on the traced map), `look`,
`landmark:<id>`, `film`.

## Status

Claims drafted without the corpus at hand are `status: "draft"`: the citation is a best
recollection and must be confirmed by `pnpm canon --verify` against the local corpus, which records
where each `find` key actually occurs. Only `verified` (or `corrected`, after fixing the citation)
claims may be used as hard constraints in the bake.
