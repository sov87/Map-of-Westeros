/**
 * The local book corpus (never committed): discovery, book classification, chapter splitting and search.
 *
 * The corpus directory (MOW_CORPUS_DIR or --corpus: the user's own copies of the books) may hold
 * plain text (.txt / .md), HTML (.html / .xhtml / .htm) or EPUB files, one per book or one per chapter, in any
 * folder layout. Each file is classified to a book id of data/canon/books.json by its path; anything that
 * matches the excluded patterns (The Winds of Winter preview chapters, generated prose) or no book is
 * REFUSED and reported — only the published books are canon.
 *
 * Chapters: a heading is a short line (≤ 6 words) in capitals, or an HTML <h1>–<h3>, set off from the text.
 * Repeated headings are numbered in order (BRAN → Bran I, Bran II …), as the books' POV chapters are cited;
 * a heading that occurs once keeps its bare name (Prologue, The Prophet). A file whose name is itself a
 * chapter heading (one file per chapter) uses its name. `pnpm canon --index` writes the index it derives to
 * data/source/canon/corpus-index.json for inspection; an override file next to it
 * (corpus-overrides.json: { "<relative path>": { "book": "AGOT", "chapter": "Bran I" } }) wins.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { inflateRawSync } from 'node:zlib';

export interface Chapter {
  book: string;
  /** citation id: "Bran I", "Prologue", "The Prophet" */
  id: string;
  /** 1-based order within the book */
  n: number;
  file: string;
  /** normalised text (see normText) */
  text: string;
}

export interface CorpusIndex {
  dir: string;
  chapters: Chapter[];
  refused: { file: string; reason: string }[];
  unclassified: string[];
}

/** path patterns → book id (first match wins; checked against the lower-cased relative path) */
const BOOK_PATTERNS: [RegExp, string][] = [
  [/game[ _-]?of[ _-]?thrones|\bagot\b/, 'AGOT'],
  [/clash[ _-]?of[ _-]?kings|\bacok\b/, 'ACOK'],
  [/storm[ _-]?of[ _-]?swords|\basos\b/, 'ASOS'],
  [/feast[ _-]?for[ _-]?crows|\baffc\b/, 'AFFC'],
  [/dance[ _-]?with[ _-]?dragons|\badwd\b/, 'ADWD'],
  [/hedge[ _-]?knight|\bthk\b/, 'THK'],
  [/sworn[ _-]?sword|\btss\b/, 'TSS'],
  [/mystery[ _-]?knight|\btmk\b/, 'TMK'],
  [/princess[ _-]?and[ _-]?the[ _-]?queen|\btpatq\b/, 'TPATQ'],
  [/rogue[ _-]?prince|\btrp\b/, 'TRP'],
  [/sons[ _-]?of[ _-]?the[ _-]?dragon|\btsotd\b/, 'TSOTD'],
  [/world[ _-]?of[ _-]?ice|\btwoiaf\b/, 'TWOIAF'],
  [/fire[ _-]?(&|and)[ _-]?blood|\bf&b\b|\bfab\b/, 'FAB'],
];
/** never canon: only the published books count (The Winds of Winter is unpublished; generated prose is not the books) */
const EXCLUDED: [RegExp, string][] = [
  [/winds[ _-]?of[ _-]?winter|\btwow\b/, 'The Winds of Winter preview / sample chapters (unpublished)'],
  [/generated|gpt|llm|continuation|fanfic|fan[ _-]?fiction/, 'generated or fan prose'],
];
const TEXT_EXT = new Set(['.txt', '.md', '.html', '.htm', '.xhtml', '.epub']);

export function normText(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .replace(/'+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function classify(rel: string): { book?: string; refused?: string } {
  const p = rel.toLowerCase().replace(/\\/g, '/');
  for (const [re, why] of EXCLUDED) if (re.test(p)) return { refused: why };
  for (const [re, id] of BOOK_PATTERNS) if (re.test(p)) return { book: id };
  // a numbered top-level folder or file ("1 - …", "05_…") names a novel only when nothing else matched
  const n = /^0?([1-5])[ _.-]/.exec(p)?.[1];
  return n ? { book: ['AGOT', 'ACOK', 'ASOS', 'AFFC', 'ADWD'][Number(n) - 1] } : {};
}

// ------------------------------------------------------------------ file → lines

function htmlToLines(html: string): string[] {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, (_, t: string) => `\n\n§H§${t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n\n`)
    .replace(/<\/(p|div|br|li|tr)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&lsquo;|&#8216;/g, '‘')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .split(/\r?\n/);
}

/** Minimal ZIP reader (EPUB): stored and deflated entries, via the central directory. */
function unzip(buf: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--)
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nlen).toString('utf8');
    const lnlen = buf.readUInt16LE(off + 26);
    const lelen = buf.readUInt16LE(off + 28);
    const data = buf.subarray(off + 30 + lnlen + lelen, off + 30 + lnlen + lelen + csize);
    if (method === 0) out.set(name, Buffer.from(data));
    else if (method === 8) out.set(name, inflateRawSync(data));
    p += 46 + nlen + elen + clen;
  }
  return out;
}

function epubToLines(buf: Buffer): string[] {
  const z = unzip(buf);
  const container = z.get('META-INF/container.xml')?.toString('utf8') ?? '';
  const opfPath = /full-path="([^"]+)"/.exec(container)?.[1];
  const opf = opfPath ? z.get(opfPath)?.toString('utf8') : undefined;
  if (!opf || !opfPath) return [...z.entries()].filter(([n]) => /\.x?html?$/i.test(n)).sort(([a], [b]) => a.localeCompare(b)).flatMap(([, b]) => htmlToLines(b.toString('utf8')));
  const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const items = new Map<string, string>();
  for (const m of opf.matchAll(/<item\b[^>]*>/g)) {
    const id = /\bid="([^"]+)"/.exec(m[0])?.[1];
    const href = /\bhref="([^"]+)"/.exec(m[0])?.[1];
    if (id && href) items.set(id, decodeURIComponent(href));
  }
  const lines: string[] = [];
  for (const m of opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/g)) {
    const href = items.get(m[1]);
    const b = href ? z.get(base + href) : undefined;
    if (b) lines.push(...htmlToLines(b.toString('utf8')), '', '');
  }
  return lines;
}

function fileLines(path: string): string[] {
  const ext = extname(path).toLowerCase();
  if (ext === '.epub') return epubToLines(readFileSync(path));
  const t = readFileSync(path, 'utf8');
  return ext === '.html' || ext === '.htm' || ext === '.xhtml' ? htmlToLines(t) : t.split(/\r?\n/);
}

// ------------------------------------------------------------------ chapters

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV'];
const title = (s: string) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase()).replace(/\b(Of|The|And|A|In|For|With|By)\b/g, (w, _1, i: number) => (i === 0 ? w : w.toLowerCase()));

function isHeading(line: string, prev: string, next: string): string | null {
  const t = line.trim();
  if (t.startsWith('§H§')) return t.slice(3).trim() || null;
  if (!t || prev.trim() || next.trim()) return null;
  if (t.split(/\s+/).length > 6 || t.length > 48) return null;
  if (!/[A-Z]/.test(t) || /[a-z]/.test(t)) return null; // all capitals
  if (/^[\d\W]+$/.test(t)) return null;
  return t;
}

/** Split one book's lines into chapters (headings numbered when they repeat). */
function splitChapters(book: string, file: string, lines: string[], fileHeading?: string): Chapter[] {
  const marks: { at: number; head: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const h = isHeading(lines[i], lines[i - 1] ?? '', lines[i + 1] ?? '');
    if (h) marks.push({ at: i, head: title(h.replace(/^chapter\s+\w+[:.]?\s*/i, '')) });
  }
  if (!marks.length) return [{ book, id: fileHeading ?? title(basename(file, extname(file))), n: 1, file, text: normText(lines.join(' ')) }];
  const counts = new Map<string, number>();
  for (const m of marks) counts.set(m.head, (counts.get(m.head) ?? 0) + 1);
  const seen = new Map<string, number>();
  return marks.map((m, k) => {
    const end = k + 1 < marks.length ? marks[k + 1].at : lines.length;
    const j = (seen.get(m.head) ?? 0) + 1;
    seen.set(m.head, j);
    const id = (counts.get(m.head) ?? 0) > 1 ? `${m.head} ${ROMAN[j] ?? j}` : m.head;
    return { book, id, n: k + 1, file, text: normText(lines.slice(m.at + 1, end).join(' ')) };
  });
}

export function loadOverrides(sourceDir: string): Record<string, { book?: string; chapter?: string; exclude?: boolean }> {
  const p = join(sourceDir, 'canon', 'corpus-overrides.json');
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Record<string, { book?: string; chapter?: string }>) : {};
}

export function indexCorpus(dir: string, sourceDir: string): CorpusIndex {
  if (!existsSync(dir)) throw new Error(`corpus directory not found: ${dir} (set MOW_CORPUS_DIR or pass --corpus <dir>)`);
  const overrides = loadOverrides(sourceDir);
  const refused: CorpusIndex['refused'] = [];
  const unclassified: string[] = [];
  const byBook = new Map<string, Chapter[]>();
  for (const path of walk(dir).sort()) {
    if (!TEXT_EXT.has(extname(path).toLowerCase())) continue;
    const rel = relative(dir, path).replace(/\\/g, '/');
    const ov = overrides[rel];
    const cls = classify(rel);
    if (cls.refused || ov?.exclude) {
      refused.push({ file: rel, reason: cls.refused ?? 'excluded by corpus-overrides.json' });
      continue;
    }
    const book = ov?.book ?? cls.book;
    if (!book) {
      unclassified.push(rel);
      continue;
    }
    const chs = splitChapters(book, rel, fileLines(path), ov?.chapter);
    if (!byBook.has(book)) byBook.set(book, []);
    byBook.get(book)!.push(...chs);
  }
  // one file per chapter: renumber repeated headings across the book's files in path order
  const chapters: Chapter[] = [];
  for (const [book, chs] of byBook) {
    const counts = new Map<string, number>();
    const bare = (id: string) => id.replace(/ [IVX]+$/, '');
    const multiFile = new Set(chs.map((c) => c.file)).size > 1;
    if (multiFile) for (const c of chs) counts.set(bare(c.id), (counts.get(bare(c.id)) ?? 0) + 1);
    const seen = new Map<string, number>();
    chs.forEach((c, i) => {
      let id = c.id;
      if (multiFile && !/ [IVX]+$/.test(c.id) && (counts.get(c.id) ?? 0) > 1) {
        const j = (seen.get(c.id) ?? 0) + 1;
        seen.set(c.id, j);
        id = `${c.id} ${ROMAN[j] ?? j}`;
      }
      chapters.push({ ...c, book, id, n: i + 1 });
    });
  }
  return { dir, chapters, refused, unclassified };
}

/** Chapter ids compare loosely: case, punctuation and a leading "Chapter N" do not matter. */
export function sameChapter(a: string, b: string): boolean {
  const n = (s: string) => normText(s.replace(/^chapter\s+\d+\s*[:.,-]?\s*/i, ''));
  return n(a) === n(b);
}

export function contains(text: string, key: string): boolean {
  const k = normText(key);
  return k.length > 0 && (` ${text} `).includes(` ${k} `);
}
