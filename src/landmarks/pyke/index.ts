import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2, V3 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * Pyke at 298 AC (ledger ids per part in canon.json). T: the Greyjoy seat on the coast of the isle of Pyke, a
 * ride from Lordsport (pyke-position); raised on a headland the sea has since cut apart, its keeps and towers
 * standing on stacks of rock in the surf (pyke-sea-stacks); bridges between them, some arched stone, some
 * swaying rope and plank (pyke-bridges); the Great Keep, the Kitchen Keep, the Bloody Keep and the Sea Tower on
 * the farthest stack, reached by a rope bridge (pyke-parts, pyke-sea-tower); grim, wind-lashed, grey
 * (pyke-wild-coast, iron-islands-land). I: the plan, which bridge is stone and which rope, the forms
 * (pyke-plan).
 *
 * Local frame: x east, z south, origin on the cliff top at the castle's ward (a display offset off the
 * sheet's marker onto the island's south-east coast: pyke-position). The coast runs north-east to
 * south-west with the sea to the south-east; the cliff top stands ~0.95 above the sea and the sea floor
 * falls to ~-1 within a kilometre.
 */

const STONE = 0x4a4b4e;
const STONE_LIT = 0x56575a;
const DARK = 0x3a3a3c;
const ROCK = 0x45423f;
const TIMBER = 0x4a3b2c;
/** the sea's surface, local y (read off the bake: the origin's ground stands 0.953 above it) */
const SEA_Y = -0.95;

/** seaward (south-east) and along the coast (north-east) */
const SEA: V2 = [0.722, 0.692];
const ALONG: V2 = [0.692, -0.722];
const P = (s: number, t: number): V2 => [SEA[0] * s + ALONG[0] * t, SEA[1] * s + ALONG[1] * t];
const DEG = Math.PI / 180;
const yawOf = (a: V2, b: V2): number => -Math.atan2(b[1] - a[1], b[0] - a[0]) / DEG;

/** the stacks the sea has cut from the headland (T), with their keeps (I: which stands where) */
interface Stack {
  name: string;
  at: V2;
  r: number;
  top: number;
  keep: { r: number; h: number; sides: number; color: number };
}
const STACKS: Stack[] = [
  { name: 'great-keep', at: P(0.84, 0), r: 0.2, top: 0.02, keep: { r: 0.13, h: 0.36, sides: 16, color: STONE_LIT } },
  { name: 'kitchen-keep', at: P(1.22, -0.27), r: 0.13, top: -0.04, keep: { r: 0.085, h: 0.24, sides: 16, color: STONE } },
  { name: 'bloody-keep', at: P(1.26, 0.27), r: 0.14, top: 0.0, keep: { r: 0.09, h: 0.28, sides: 4, color: DARK } },
  { name: 'sea-tower', at: P(1.7, 0.02), r: 0.1, top: -0.07, keep: { r: 0.06, h: 0.4, sides: 16, color: STONE_LIT } },
];
const [GREAT, KITCHEN, BLOODY, SEA_TOWER] = STACKS;

/** the ward on the cliff top: the headland's root, closed by the curtain and gatehouse (I) */
const WARD: V2[] = [P(0.24, -0.26), P(0.24, 0.26), P(-0.22, 0.3), P(-0.24, -0.28)];
const GATE = P(-0.23, 0.01);

/** the shore along a line out from the origin's coast offset `t`: first point at or below the water */
function shoreAt(k: ProxyKit, t: number): V2 | null {
  for (let s = 0.1; s < 1.4; s += 0.02) {
    const p = P(s, t);
    if (k.ground(p[0], p[1]) <= k.seaLevel + 0.05) return p;
  }
  return null;
}

function buildCliffs(k: ProxyKit): void {
  // the sea cliffs under the castle: a banded rock face standing in the water at the shoreline, walked from
  // the south-west to the north-east so it faces the sea, its top at the cliff top
  const path: V2[] = [];
  for (let t = -1.2; t <= 1.2 + 1e-9; t += 0.1) {
    const p = shoreAt(k, t);
    if (p) path.push(p);
  }
  const H = (0.03 - k.seaLevel) / 0.91;
  k.cliff('weathered', path, H, { at: [0, k.seaLevel - 0.06, 0], followGround: false, color: ROCK, rough: 0.5, strata: 0.6, depth: 0.7, taper: 0.4, soft: 0.3, jag: 0.25 });
}

/** a stack: a lofted pillar of rock from the sea floor to its top, ragged, leaning, wider at the foot (I) */
function buildStack(k: ProxyKit, s: Stack, i: number): void {
  const n = 13;
  const floor = Math.min(k.ground(s.at[0], s.at[1]), k.seaLevel) - 0.12;
  const tiers: [number, number][] = [
    [0, 1],
    [0.03, 1.06],
    [0.12, 0.96],
    [0.26, 1.1],
    [0.38, 1.0],
    [0.52, 1.16],
    [0.66, 1.08],
    [0.8, 1.3],
    [1, 1.55],
  ];
  // a per-stack lean and per-tier ledges: the faces of a cut headland, not a turned column
  const lean: V2 = [(k.r(600 + i) - 0.5) * 0.5 * s.r, (k.r(620 + i) - 0.5) * 0.5 * s.r];
  const sections = tiers.map(([f, grow], t) => ({
    y: s.top - f * (s.top - floor),
    rotDeg: (k.r(700 + i * 16 + t) - 0.5) * 24,
    outline: Array.from({ length: n }, (_, j): V2 => {
      const a = (j / n) * Math.PI * 2;
      const e = s.r * grow * (0.62 + 0.62 * k.r(800 + i * 64 + t * n + j));
      return [Math.cos(a) * e + lean[0] * f, Math.sin(a) * e + lean[1] * f];
    }),
  }));
  k.loft('weathered', sections, { at: [s.at[0], 0, s.at[1]], color: ROCK, rock: true });
  // fallen rock round the foot, breaking the waterline (I)
  for (let j = 0; j < 6; j++) {
    const a = (j / 6) * Math.PI * 2 + k.r(900 + i * 8 + j) * 0.8;
    const d = s.r * (1.35 + 0.45 * k.r(910 + i * 8 + j));
    k.rock('weathered', 0.03 + 0.035 * k.r(920 + i * 8 + j), { at: [s.at[0] + Math.cos(a) * d, k.seaLevel + 0.005, s.at[1] + Math.sin(a) * d], squash: 0.55, color: ROCK, lod: 1 });
  }
  const kp = s.keep;
  k.tower('stone', kp.r, kp.h, { at: [s.at[0], s.top, s.at[1]], sides: kp.sides, roof: 'crenel', color: kp.color, rot: [0, 45 + yawOf([0, 0], SEA), 0], windows: { rows: 3, on: 0.45, size: 0.011 } });
  // a curtain round the stack's rim where it is wide enough (I)
  if (s.r > 0.1) {
    const rim = Array.from({ length: 10 }, (_, j): V2 => {
      const a = (j / 10) * Math.PI * 2;
      return [s.at[0] + Math.cos(a) * s.r * 0.86, s.at[1] + Math.sin(a) * s.r * 0.86];
    });
    k.wallPath('stone', rim, 0.07, 0.025, { closed: true, at: [0, s.top, 0], color: STONE, crenel: { w: 0.016, h: 0.016, gap: 0.012, lod: 0 } });
  }
}

/** a swaying rope-and-plank bridge (T) between two points: three sagging spans of planks, rope rails (I: the form) */
function ropeBridge(k: ProxyKit, a: V3, b: V3, sag: number): void {
  const pts: V3[] = [0, 1 / 3, 2 / 3, 1].map((u): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u]);
  for (let i = 0; i < 3; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const L = Math.hypot(q[0] - p[0], q[2] - p[2]);
    const pitch = (Math.atan2(q[1] - p[1], L) * 180) / Math.PI;
    const yaw = -Math.atan2(q[2] - p[2], q[0] - p[0]) / DEG;
    const m: V3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
    k.box('wood', Math.hypot(L, q[1] - p[1]) + 0.004, 0.004, 0.014, { at: m, rot: [0, yaw, pitch], color: TIMBER, lod: 0 });
    for (const sd of [-1, 1]) {
      const off: V2 = [Math.sin(yaw * DEG) * 0.007 * sd, Math.cos(yaw * DEG) * 0.007 * sd];
      k.box('wood', Math.hypot(L, q[1] - p[1]) + 0.004, 0.003, 0.002, { at: [m[0] + off[0], m[1] + 0.018, m[2] + off[1]], rot: [0, yaw, pitch], color: 0x6b5a44, lod: 0 });
    }
  }
}

function buildBridges(k: ProxyKit): void {
  const edge = (s: Stack, toward: V2): V3 => {
    const dx = toward[0] - s.at[0];
    const dz = toward[1] - s.at[1];
    const L = Math.hypot(dx, dz) || 1;
    return [s.at[0] + (dx / L) * s.r * 0.75, s.top + 0.004, s.at[1] + (dz / L) * s.r * 0.75];
  };
  // the ward to the Great Keep: an arched stone bridge over the gap (I: which bridges are stone)
  const w = P(0.22, 0);
  k.bridge('stone', [w[0], 0.004, w[1]], edge(GREAT, w), { width: 0.05, arches: 1, deck: 0.035, color: STONE });
  // the Great Keep to the Kitchen Keep: stone
  k.bridge('stone', edge(GREAT, KITCHEN.at), edge(KITCHEN, GREAT.at), { width: 0.04, arches: 1, deck: 0.03, color: STONE });
  // the Great Keep to the Bloody Keep, and on out to the Sea Tower: rope and plank (T: the Sea Tower's)
  ropeBridge(k, edge(GREAT, BLOODY.at), edge(BLOODY, GREAT.at), 0.025);
  ropeBridge(k, edge(BLOODY, SEA_TOWER.at), edge(SEA_TOWER, BLOODY.at), 0.035);
}

function buildWard(k: ProxyKit): void {
  k.drape('weathered', WARD, { step: 0.04, lift: 0.01, color: 0x5e5a54, lod: 1 });
  // the curtain closing the headland's root, its seaward side open over the cliff, and the gatehouse (T: a
  // gatehouse and curtain on the headland, I: the form)
  const curtain: V2[] = [WARD[0], WARD[3], WARD[2], WARD[1]];
  k.wallPath('stone', curtain, 0.16, 0.05, {
    followGround: true,
    step: 0.04,
    batter: 0.12,
    color: STONE,
    shadeJitter: 0.06,
    crenel: { w: 0.02, h: 0.02, gap: 0.015, lod: 0, color: STONE_LIT },
  });
  for (const p of [WARD[0], WARD[1], WARD[2], WARD[3]]) k.tower('stone', 0.05, 0.22, { at: [p[0], 0, p[1]], seat: 'min', sides: 16, roof: 'crenel', color: STONE_LIT });
  const yawG = yawOf(WARD[3], WARD[2]);
  for (const s of [-1, 1]) {
    const p: V2 = [GATE[0] + ALONG[0] * 0.06 * s, GATE[1] + ALONG[1] * 0.06 * s];
    k.tower('stone', 0.045, 0.24, { at: [p[0], 0, p[1]], seat: 'min', sides: 4, roof: 'crenel', color: STONE_LIT, rot: [0, yawG + 45, 0] });
  }
  k.box('darkStone', 0.05, 0.08, 0.07, { at: [GATE[0], k.ground(GATE[0], GATE[1]), GATE[1]], rot: [0, yawG, 0], color: 0x1e1d1c });
  k.light([GATE[0] - SEA[0] * 0.05, k.ground(GATE[0], GATE[1]) + 0.1, GATE[1] - SEA[1] * 0.05], { color: 0xffad5a, intensity: 0.8, radius: 0.016, kind: 'fire', flicker: 0.4 });
  // a hall and stables in the ward (I)
  const yawW = yawOf([0, 0], ALONG);
  k.house('stone', 'slate', 0.2, 0.08, 0.1, { at: [-0.02, 0, 0.06], rot: [0, yawW, 0], roof: 'gable', pitch: 38, dig: 0.3, color: STONE, roofColor: 0x3a3c40, windows: { count: 3, on: 0.5, sides: 2, size: 0.011 } });
  k.house('stone', 'slate', 0.12, 0.06, 0.07, { at: [-0.1, 0, -0.16], rot: [0, yawW, 0], roof: 'gable', pitch: 38, dig: 0.3, color: STONE, roofColor: 0x3a3c40 });
  // the road inland toward Lordsport (I: its line)
  const r0 = P(-0.26, 0);
  const r1 = P(-0.9, -0.5);
  const r2 = P(-1.6, -0.7);
  for (const [a, b] of [
    [r0, r1],
    [r1, r2],
  ] as const) {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const L = Math.hypot(dx, dz);
    const n: V2 = [(-dz / L) * 0.02, (dx / L) * 0.02];
    k.drape('weathered', [
      [a[0] + n[0], a[1] + n[1]],
      [b[0] + n[0], b[1] + n[1]],
      [b[0] - n[0], b[1] - n[1]],
      [a[0] - n[0], a[1] - n[1]],
    ], { step: 0.05, lift: 0.03, color: 0x6a645a, lod: 1 });
  }
}

export default defineLandmark({
  id: 'pyke',
  placeId: 'pyke',
  tier: 'A',
  proxy: (k) => {
    buildCliffs(k);
    STACKS.forEach((s, i) => buildStack(k, s, i));
    buildBridges(k);
    buildWard(k);
    k.light([SEA_TOWER.at[0], SEA_TOWER.top + 0.3, SEA_TOWER.at[1]], { color: 0xffc070, intensity: 0.7, radius: 0.014, kind: 'lamp' });
  },
  emitters: [
    // surf breaking round the stacks' feet, smoke from the Kitchen Keep (I)
    { preset: 'mist', at: [GREAT.at[0], SEA_Y + 0.02, GREAT.at[1]], scale: 0.35, rate: 0.5 },
    { preset: 'mist', at: [BLOODY.at[0], SEA_Y + 0.02, BLOODY.at[1]], scale: 0.3, rate: 0.5 },
    { preset: 'mist', at: [SEA_TOWER.at[0], SEA_Y + 0.02, SEA_TOWER.at[1]], scale: 0.3, rate: 0.5 },
    { preset: 'smoke', at: [KITCHEN.at[0], KITCHEN.top + KITCHEN.keep.h + 0.02, KITCHEN.at[1]], scale: 0.1 },
  ],
  vegetationExclusion: [{ at: [0, 0], r: 0.5 }],
  subjectKm: { at: P(0.9, 0), r: 1.0 },
  contrast: 'light',
  annotation: {
    title: 'Pyke',
    subtitle: 'Seat of House Greyjoy',
    blurb: 'Keeps and towers on stacks of rock in the surf, the remains of a headland the sea has cut apart, joined by bridges of stone and rope.',
  },
  bookmarks: [
    {
      id: 'pyke-close',
      distanceKm: 6.5,
      elevationDeg: 11,
      azimuthDeg: 205,
      fov: 30,
      lift: -0.3,
      aimKm: P(1.0, 0),
      tod: 15,
      weather: { cloudCoverage: 0.85 },
      note: 'hero: from the sea to the south-west under a grey sky: the stacks in a row off the cliffs, the Great Keep, the Kitchen and Bloody Keeps and the Sea Tower farthest out, the stone and rope bridges between them',
    },
    {
      id: 'pyke-wide',
      distanceKm: 30,
      elevationDeg: 22,
      azimuthDeg: 160,
      fov: 34,
      tod: 15,
      weather: { cloudCoverage: 0.8 },
      note: 'context: Pyke on the isle of Pyke in the Iron Islands, the grey isles beyond across the cold sea',
    },
  ],
});
