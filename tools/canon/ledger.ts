/**
 * The canon ledger (data/canon): loading and validation — pure, Node only, no dependencies.
 * Schema and rules: data/canon/README.md. Used by `pnpm canon` and `pnpm check`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Label = 'T' | 'M' | 'C' | 'I';
export type Status = 'draft' | 'verified' | 'corrected' | 'disputed';

export interface Cite {
  book: string;
  chapter: string;
  find?: string[];
  /** set by the verifier (`--apply`): the chapter the find keys were located in, if it differs */
  verifiedChapter?: string;
}

export interface Claim {
  id: string;
  subjects: string[];
  kind: string;
  claim: string;
  label: Label;
  cites?: Cite[];
  value?: Record<string, unknown>;
  use?: string[];
  status: Status;
  notes?: string;
  conflict?: string;
  basis?: string;
}

export interface ClaimFile {
  group: string;
  version: number;
  notes?: string;
  claims: Claim[];
}

export interface Subject {
  id: string;
  kind: string;
  group: string;
  name: string;
  landmark?: number;
}

export interface Books {
  books: Record<string, { title: string; year: number; rank: number; kind: string }>;
  labels: Record<Label, string>;
}

export interface Ledger {
  books: Books;
  subjects: Subject[];
  files: { path: string; file: ClaimFile }[];
  claims: (Claim & { _file: string })[];
}

export const KINDS = [
  'height',
  'relative-height',
  'length',
  'distance',
  'travel',
  'position',
  'relative-position',
  'form',
  'material',
  'count',
  'hydrology',
  'vegetation',
  'climate',
  'state-298',
  'state-after',
  'name',
] as const;
export const STATUSES: Status[] = ['draft', 'verified', 'corrected', 'disputed'];
export const LABELS: Label[] = ['T', 'M', 'C', 'I'];
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** the IP rule: verbatim text in the ledger is limited to `find` keys of at most this many words */
export const MAX_FIND_WORDS = 5;
export const MAX_FIND_KEYS = 3;
export const MAX_CLAIM_CHARS = 240;

export function canonDir(root = process.cwd()): string {
  return join(root, 'data', 'canon');
}

export function loadLedger(root = process.cwd()): Ledger {
  const dir = canonDir(root);
  const books = JSON.parse(readFileSync(join(dir, 'books.json'), 'utf8')) as Books;
  const subjects = (JSON.parse(readFileSync(join(dir, 'subjects.json'), 'utf8')) as { subjects: Subject[] }).subjects;
  const files: Ledger['files'] = [];
  const claimsDir = join(dir, 'claims');
  if (existsSync(claimsDir))
    for (const f of readdirSync(claimsDir).sort())
      if (f.endsWith('.json')) files.push({ path: join('data', 'canon', 'claims', f), file: JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as ClaimFile });
  const claims = files.flatMap(({ path, file }) => (file.claims ?? []).map((c) => ({ ...c, _file: path })));
  return { books, subjects, files, claims };
}

export interface LedgerReport {
  errors: string[];
  warnings: string[];
  info: string[];
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Validate the ledger: schema, unique ids, known subjects / books / labels / statuses, the IP limits
 * (find keys, no long quotations in claim text), I-claims carry a basis, T / M / C claims carry a citation,
 * and coverage: every subject has at least one claim (an error for landmarks, regions, ranges, rivers and
 * the Wall — the brief's Phase 0 gate — a warning otherwise).
 */
export function validateLedger(L: Ledger): LedgerReport {
  const r: LedgerReport = { errors: [], warnings: [], info: [] };
  const E = (m: string) => r.errors.push(`canon: ${m}`);
  const W = (m: string) => r.warnings.push(`canon: ${m}`);
  const subjects = new Map(L.subjects.map((s) => [s.id, s]));
  for (const s of L.subjects) if (!KEBAB.test(s.id)) E(`subject id '${s.id}' is not kebab-case`);
  if (subjects.size !== L.subjects.length) E('subjects.json has duplicate ids');
  const ids = new Map<string, string>();
  for (const { path, file } of L.files) {
    if (!file || !Array.isArray(file.claims)) {
      E(`${path}: no claims array`);
      continue;
    }
    if (typeof file.group !== 'string') E(`${path}: no group`);
  }
  for (const c of L.claims) {
    const at = `${c._file} ${c.id ?? '(no id)'}`;
    if (typeof c.id !== 'string' || !KEBAB.test(c.id)) E(`${at}: id is not kebab-case`);
    else if (ids.has(c.id)) E(`${at}: id repeats (also in ${ids.get(c.id)})`);
    else ids.set(c.id, c._file);
    if (!Array.isArray(c.subjects) || !c.subjects.length) E(`${at}: no subjects`);
    else for (const s of c.subjects) if (!subjects.has(s)) E(`${at}: unknown subject '${s}'`);
    if (!KINDS.includes(c.kind as (typeof KINDS)[number])) E(`${at}: kind '${c.kind}' (one of ${KINDS.join(', ')})`);
    if (!LABELS.includes(c.label)) E(`${at}: label '${c.label}'`);
    if (!STATUSES.includes(c.status)) E(`${at}: status '${c.status}'`);
    if (typeof c.claim !== 'string' || !c.claim.trim()) E(`${at}: empty claim`);
    else {
      if (c.claim.length > MAX_CLAIM_CHARS) W(`${at}: claim longer than ${MAX_CLAIM_CHARS} chars (${c.claim.length}) — split it`);
      // a paraphrase may name things in quotes ("the Gift"), but never quote a sentence
      for (const q of c.claim.matchAll(/["“”]([^"“”]+)["“”]/g)) if (words(q[1]) > MAX_FIND_WORDS) E(`${at}: claim quotes ${words(q[1])} words ("${q[1].slice(0, 40)}…") — paraphrase (IP rule)`);
    }
    for (const field of ['notes', 'conflict', 'basis'] as const) {
      const t = c[field];
      if (typeof t === 'string') for (const q of t.matchAll(/["“”]([^"“”]+)["“”]/g)) if (words(q[1]) > MAX_FIND_WORDS) E(`${at}: ${field} quotes ${words(q[1])} words — paraphrase (IP rule)`);
    }
    const cites = c.cites ?? [];
    if (c.label !== 'I' && !cites.length) E(`${at}: label ${c.label} needs a citation`);
    if (c.label === 'I' && !c.basis) E(`${at}: label I needs a basis`);
    for (const ct of cites) {
      if (!L.books.books[ct.book]) E(`${at}: unknown book '${ct.book}' (books.json)`);
      if (typeof ct.chapter !== 'string' || !ct.chapter.trim()) E(`${at}: citation without a chapter`);
      const find = ct.find ?? [];
      if (find.length > MAX_FIND_KEYS) E(`${at}: ${find.length} find keys (max ${MAX_FIND_KEYS})`);
      for (const k of find) if (typeof k !== 'string' || !k.trim() || words(k) > MAX_FIND_WORDS) E(`${at}: find key '${k}' must be 1–${MAX_FIND_WORDS} words (IP rule)`);
    }
    // the label names the claim's own kind of source; further citations of another rank may support it
    const isNovel = (ct: Cite) => L.books.books[ct.book]?.rank === 1 && ct.chapter !== 'Map';
    const isMap = (ct: Cite) => ct.book === 'LOIAF' || ct.chapter === 'Map';
    if (c.label === 'T' && cites.length && !cites.some(isNovel)) W(`${at}: label T but no novel / novella chapter is cited (T means the novels' text)`);
    if (c.label === 'M' && cites.length && !cites.some(isMap)) W(`${at}: label M should cite LOIAF or a novel's endpaper map (chapter 'Map')`);
    if ((c.status === 'verified' || c.status === 'corrected') && c.label !== 'I' && cites.some((ct) => !(ct.find ?? []).length)) W(`${at}: ${c.status} but a citation has no find keys`);
  }
  // coverage
  const covered = new Map<string, number>();
  for (const c of L.claims) for (const s of c.subjects ?? []) covered.set(s, (covered.get(s) ?? 0) + 1);
  const hard = new Set(['landmark', 'region', 'range', 'river', 'structure']);
  for (const s of L.subjects) if (!covered.get(s.id)) (hard.has(s.kind) ? E : W)(`subject '${s.id}' (${s.kind}) has no claim`);
  const byStatus = STATUSES.map((s) => `${s} ${L.claims.filter((c) => c.status === s).length}`).join(', ');
  const byLabel = LABELS.map((l) => `${l} ${L.claims.filter((c) => c.label === l).length}`).join(' · ');
  r.info.push(`canon: ${L.claims.length} claims in ${L.files.length} files (${byStatus}; ${byLabel}); ${covered.size}/${L.subjects.length} subjects covered`);
  return r;
}
