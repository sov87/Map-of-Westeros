/**
 * The canon ledger CLI (data/canon; rules in data/canon/README.md):
 *
 *   pnpm canon                       validate the ledger (also part of `pnpm check`); exit 1 on errors
 *   pnpm canon --index  [--corpus d] index the local corpus → data/source/canon/corpus-index.json (books, chapters,
 *                                    refused and unclassified files) — check it before trusting a verify
 *   pnpm canon --verify [--corpus d] [--only id,…] [--apply]
 *                                    look up every citation's find keys in its cited chapter; report to
 *                                    data/source/canon/verify.{json,md}; --apply marks claims verified, or
 *                                    corrected when the keys sit in exactly one other chapter (the cite is moved
 *                                    there and the old chapter kept in notes) — nothing else is changed
 *   pnpm canon --find "<words>" [--book AGOT] [--corpus d]
 *                                    finding aid: the chapters that contain a phrase (prints chapter ids only)
 *   pnpm canon --selftest            run the verifier against a synthetic corpus (no book text needed)
 *
 * The corpus is MOW_CORPUS_DIR (the user's own copies of the books, as text or EPUB) or --corpus. Only the published
 * books count: Winds of Winter previews and generated prose are refused (corpus.ts). Reports quote no
 * book text — chapter ids and key hits only — and live in the gitignored data/source/canon/.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { contains, indexCorpus, sameChapter, type Chapter, type CorpusIndex } from './corpus.ts';
import { loadLedger, validateLedger, type Claim, type Ledger } from './ledger.ts';

const ROOT = process.cwd();
const SOURCE = resolve(process.env.MOW_SOURCE_DIR ?? join(ROOT, 'data', 'source'));
const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);
const opt = (f: string) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};
const corpusDir = () => {
  const d = opt('--corpus') ?? process.env.MOW_CORPUS_DIR;
  if (!d) {
    console.error('[canon] no corpus: set MOW_CORPUS_DIR to a folder with your copies of the books (text or EPUB) or pass --corpus <dir>');
    process.exit(2);
  }
  return resolve(d);
};

export interface CiteResult {
  book: string;
  chapter: string;
  status: 'ok' | 'elsewhere' | 'missing' | 'no-chapter' | 'no-book' | 'no-keys' | 'map';
  /** chapters (book + id) containing every key, cited chapter first when it qualifies */
  candidates: { book: string; chapter: string }[];
  /** per key: found in the cited chapter */
  keys: { key: string; inCited: boolean }[];
}

export interface ClaimResult {
  id: string;
  file: string;
  verdict: 'verified' | 'correctable' | 'unresolved' | 'uncheckable';
  cites: CiteResult[];
}

export function verifyClaims(L: Ledger, corpus: CorpusIndex, only?: Set<string>): ClaimResult[] {
  const byBook = new Map<string, Chapter[]>();
  for (const c of corpus.chapters) {
    if (!byBook.has(c.book)) byBook.set(c.book, []);
    byBook.get(c.book)!.push(c);
  }
  const out: ClaimResult[] = [];
  for (const c of L.claims) {
    if (only && !only.has(c.id)) continue;
    const cites = (c.cites ?? []).map((ct): CiteResult => {
      const keys = ct.find ?? [];
      const base = { book: ct.book, chapter: ct.chapter, candidates: [] as CiteResult['candidates'] };
      if (L.books.books[ct.book]?.kind === 'maps' || ct.chapter === 'Map') return { ...base, status: 'map', keys: [] };
      if (!keys.length) return { ...base, status: 'no-keys', keys: [] };
      const chapters = byBook.get(ct.book);
      if (!chapters) return { ...base, status: 'no-book', keys: keys.map((k) => ({ key: k, inCited: false })) };
      const cited = chapters.filter((ch) => sameChapter(ch.id, ct.chapter));
      const all = (ch: Chapter) => keys.every((k) => contains(ch.text, k));
      const keyHits = keys.map((k) => ({ key: k, inCited: cited.some((ch) => contains(ch.text, k)) }));
      const inBook = chapters.filter(all).map((ch) => ({ book: ch.book, chapter: ch.id }));
      const anywhere = inBook.length ? inBook : corpus.chapters.filter(all).map((ch) => ({ book: ch.book, chapter: ch.id }));
      if (cited.length && cited.some(all)) return { ...base, status: 'ok', keys: keyHits, candidates: [{ book: ct.book, chapter: cited[0].id }, ...anywhere.filter((a) => !sameChapter(a.chapter, ct.chapter)).slice(0, 4)] };
      if (!cited.length && !anywhere.length) return { ...base, status: 'no-chapter', keys: keyHits };
      return { ...base, status: anywhere.length ? 'elsewhere' : 'missing', keys: keyHits, candidates: anywhere.slice(0, 5) };
    });
    const textual = cites.filter((r) => r.status !== 'map');
    let verdict: ClaimResult['verdict'];
    if (!textual.length) verdict = 'uncheckable';
    else if (textual.every((r) => r.status === 'ok')) verdict = 'verified';
    else if (textual.every((r) => r.status === 'ok' || (r.status === 'elsewhere' && r.candidates.length === 1))) verdict = 'correctable';
    else verdict = 'unresolved';
    out.push({ id: c.id, file: c._file, verdict, cites });
  }
  return out;
}

function applyResults(L: Ledger, results: ClaimResult[]): number {
  const byId = new Map(results.map((r) => [r.id, r]));
  let changed = 0;
  for (const { path, file } of L.files) {
    let dirty = false;
    for (const c of file.claims as Claim[]) {
      const r = byId.get(c.id);
      if (!r || c.status === 'disputed') continue;
      if (r.verdict === 'verified' && c.status !== 'verified') {
        c.status = 'verified';
        dirty = true;
      } else if (r.verdict === 'correctable') {
        (c.cites ?? []).forEach((ct, i) => {
          const cr = r.cites[i];
          if (cr?.status === 'elsewhere') {
            const to = cr.candidates[0];
            c.notes = `${c.notes ? `${c.notes} ` : ''}[verifier: cited ${ct.book} ${ct.chapter}; the keys occur in ${to.book} ${to.chapter}]`;
            ct.book = to.book;
            ct.chapter = to.chapter;
          }
        });
        c.status = 'corrected';
        dirty = true;
      }
    }
    if (dirty) {
      writeFileSync(join(ROOT, path), JSON.stringify(file, null, 2) + '\n');
      changed++;
    }
  }
  return changed;
}

function writeReport(results: ClaimResult[], corpus: CorpusIndex): void {
  const dir = join(SOURCE, 'canon');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'verify.json'), JSON.stringify({ createdAt: new Date().toISOString(), corpus: corpus.dir, refused: corpus.refused, unclassified: corpus.unclassified, results }, null, 1));
  const n = (v: ClaimResult['verdict']) => results.filter((r) => r.verdict === v).length;
  const lines = [
    `# Canon verify — ${new Date().toISOString()}`,
    '',
    `Corpus: \`${corpus.dir}\` — ${corpus.chapters.length} chapters in ${new Set(corpus.chapters.map((c) => c.book)).size} books; ${corpus.refused.length} files refused, ${corpus.unclassified.length} unclassified.`,
    '',
    `Verified ${n('verified')} · correctable ${n('correctable')} · unresolved ${n('unresolved')} · map-only ${n('uncheckable')}`,
    '',
    '## Unresolved and correctable',
    '',
    '| claim | cite | status | keys missing from the cited chapter | chapters with every key |',
    '|---|---|---|---|---|',
    ...results
      .filter((r) => r.verdict === 'unresolved' || r.verdict === 'correctable')
      .flatMap((r) =>
        r.cites
          .filter((c) => c.status !== 'ok' && c.status !== 'map')
          .map((c) => `| ${r.id} | ${c.book} ${c.chapter} | ${c.status} | ${c.keys.filter((k) => !k.inCited).map((k) => k.key).join('; ')} | ${c.candidates.map((x) => `${x.book} ${x.chapter}`).join('; ')} |`),
      ),
  ];
  writeFileSync(join(dir, 'verify.md'), lines.join('\n') + '\n');
  console.log(`[canon] report → ${join(dir, 'verify.md')}`);
}

function printIndex(corpus: CorpusIndex): void {
  const books = [...new Set(corpus.chapters.map((c) => c.book))];
  for (const b of books) {
    const chs = corpus.chapters.filter((c) => c.book === b);
    console.log(`[canon] ${b}: ${chs.length} chapters (${chs.slice(0, 4).map((c) => c.id).join(', ')}${chs.length > 4 ? ', …' : ''})`);
  }
  for (const r of corpus.refused) console.log(`[canon] REFUSED ${r.file}: ${r.reason}`);
  for (const u of corpus.unclassified) console.log(`[canon] unclassified (ignored): ${u} — name it, or add it to corpus-overrides.json`);
}

function selftest(): void {
  // a synthetic corpus of made-up sentences (no book text), laid out like a book file with POV headings
  const dir = mkdtempSync(join(tmpdir(), 'mow-canon-'));
  try {
    mkdirSync(join(dir, 'A Game of Thrones'), { recursive: true });
    mkdirSync(join(dir, 'The Winds of Winter preview'), { recursive: true });
    const body = (s: string) => `\n\n${s}\n\nFiller sentence about nothing in particular.\n\n`;
    writeFileSync(
      join(dir, 'A Game of Thrones', 'book.txt'),
      ['PROLOGUE', body('The quick grey heron crossed the marsh.'), 'BRAN', body('A lantern of blue glass hung by the gate.'), 'TYRION', body('The tall ice cliff measured nine hundred spans.'), 'BRAN', body('The orchard of copper pears lay east.')].join('\n'),
    );
    writeFileSync(join(dir, 'The Winds of Winter preview', 'chapter.txt'), 'BRAN\n\nThe tall ice cliff measured nine hundred spans.\n');
    const corpus = indexCorpus(dir, mkdtempSync(join(tmpdir(), 'mow-src-')));
    const L: Ledger = {
      books: loadLedger(ROOT).books,
      subjects: [],
      files: [],
      claims: [
        { id: 't-ok', subjects: [], kind: 'form', claim: 'x', label: 'T', status: 'draft', cites: [{ book: 'AGOT', chapter: 'Tyrion', find: ['nine hundred spans'] }], _file: '' },
        { id: 't-move', subjects: [], kind: 'form', claim: 'x', label: 'T', status: 'draft', cites: [{ book: 'AGOT', chapter: 'Bran I', find: ['copper pears'] }], _file: '' },
        { id: 't-miss', subjects: [], kind: 'form', claim: 'x', label: 'T', status: 'draft', cites: [{ book: 'AGOT', chapter: 'Bran I', find: ['silver apples'] }], _file: '' },
        { id: 't-map', subjects: [], kind: 'position', claim: 'x', label: 'M', status: 'draft', cites: [{ book: 'LOIAF', chapter: 'The North' }], _file: '' },
      ],
    };
    const res = new Map(verifyClaims(L, corpus).map((r) => [r.id, r]));
    const want: [string, string][] = [
      ['t-ok', 'verified'],
      ['t-move', 'correctable'],
      ['t-miss', 'unresolved'],
      ['t-map', 'uncheckable'],
    ];
    const ids = corpus.chapters.map((c) => c.id).join(', ');
    let ok = ids === 'Prologue, Bran I, Tyrion, Bran II' && corpus.refused.length === 1;
    for (const [id, v] of want) {
      const got = res.get(id)?.verdict;
      console.log(`[canon] selftest ${id}: ${got} ${got === v ? 'ok' : `(want ${v})`}`);
      ok &&= got === v;
    }
    console.log(`[canon] selftest chapters: ${ids}; refused ${corpus.refused.map((r) => r.file).join(', ')}`);
    console.log(ok ? '[canon] selftest OK' : '[canon] selftest FAILED');
    process.exitCode = ok ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------ main
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('run.ts')) {
  if (flag('--selftest')) selftest();
  else if (flag('--index')) {
    const corpus = indexCorpus(corpusDir(), SOURCE);
    printIndex(corpus);
    mkdirSync(join(SOURCE, 'canon'), { recursive: true });
    writeFileSync(join(SOURCE, 'canon', 'corpus-index.json'), JSON.stringify({ dir: corpus.dir, refused: corpus.refused, unclassified: corpus.unclassified, chapters: corpus.chapters.map(({ text, ...c }) => ({ ...c, words: text.split(' ').length })) }, null, 1));
    console.log(`[canon] index → ${join(SOURCE, 'canon', 'corpus-index.json')}`);
  } else if (flag('--find')) {
    const phrase = opt('--find') ?? '';
    const book = opt('--book');
    const corpus = indexCorpus(corpusDir(), SOURCE);
    const hits = corpus.chapters.filter((c) => (!book || c.book === book) && contains(c.text, phrase));
    for (const h of hits) console.log(`${h.book} ${h.id}`);
    console.log(`[canon] ${hits.length} chapter(s) contain "${phrase}"`);
  } else if (flag('--verify')) {
    const L = loadLedger(ROOT);
    const corpus = indexCorpus(corpusDir(), SOURCE);
    printIndex(corpus);
    const only = opt('--only') ? new Set(opt('--only')!.split(',')) : undefined;
    const results = verifyClaims(L, corpus, only);
    writeReport(results, corpus);
    const n = (v: ClaimResult['verdict']) => results.filter((r) => r.verdict === v).length;
    console.log(`[canon] verified ${n('verified')} · correctable ${n('correctable')} · unresolved ${n('unresolved')} · map-only ${n('uncheckable')}`);
    if (flag('--apply')) console.log(`[canon] --apply: updated ${applyResults(L, results)} claims file(s)`);
  } else {
    const r = validateLedger(loadLedger(ROOT));
    for (const i of r.info) console.log(`[canon] ${i}`);
    for (const w of r.warnings) console.warn(`  warn  ${w}`);
    for (const e of r.errors) console.error(`  ERROR ${e}`);
    console.log(r.errors.length ? `[canon] FAILED (${r.errors.length} errors)` : '[canon] OK');
    process.exitCode = r.errors.length ? 1 : 0;
  }
}
