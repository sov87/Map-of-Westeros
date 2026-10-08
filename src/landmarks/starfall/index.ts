import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2, V3 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * Starfall at 298 AC (ledger ids per part in canon.json). T: the Daynes' seat by the sea, where Lady Ashara
 * threw herself into the sea and Lord Eddard brought back the sword Dawn (starfall-by-the-sea). C: built on
 * an island where the Torrentine flows into the Summer Sea (starfall-island); its great tower is the
 * Palestone Sword (starfall-palestone-sword); legend sets it where a falling star came to earth
 * (starfall-falling-star). M: at the Torrentine's mouth on western Dorne's coast (starfall-torrentine-mouth,
 * torrentine-course, starfall-west-of-sunspear). I: the island's rock, the plan, the pale stone, the
 * bridge to the east bank and the quay (starfall-plan).
 *
 * Local frame: x east, z south, origin on the island in the head of the Torrentine's estuary (a display
 * offset off the sheet's marker, which stands ~23 km up the land from the estuary: starfall-position);
 * `anchor: 'water'`, so local y 0 is the sea. The river comes in from the north-north-east, the estuary
 * opens to the sea south-south-west, the east bank lies ~1 km off.
 */

const ROCK = 0x9c876a;
const STONE = 0xd8d1c0;
const STONE_LIT = 0xe4dece;
/** the Palestone Sword's stone (C: pale) */
const PALE = 0xefece4;
const ROOF = 0x7a5a48;
const TIMBER = 0x4e3e2e;

/** the island's cliff top (local y, above the sea) */
const TOP = 0.15;
/** the estuary's axis, from the river mouth toward the sea (unit, x east / z south) */
const AXIS: V2 = [-0.49, 0.87];
const ACROSS: V2 = [AXIS[1], -AXIS[0]];
/** a point on the island in its own frame: `u` along the estuary (seaward +), `v` across it (east +) */
const P = (u: number, v: number): V2 => [AXIS[0] * u + ACROSS[0] * v, AXIS[1] * u + ACROSS[1] * v];
const HALF_U = 0.44;
const HALF_V = 0.33;
/** the rim of the cliff top (a ragged ellipse) */
const rimAt = (a: number, f = 1): V2 => P(Math.cos(a) * HALF_U * f, Math.sin(a) * HALF_V * f);

/** the Palestone Sword (C) at the island's seaward end; the keep and hall in the middle (I) */
const SWORD = P(0.27, -0.02);
const KEEP = P(-0.08, -0.06);
const HALL = P(0.04, 0.1);
/** the bridge's island end (east rim) and its gate */
const BRIDGE_A = P(-0.12, 0.31);

function buildIsland(k: ProxyKit): void {
  // the island: a lofted mass of rock from the estuary's floor to a cliff top, ragged ledges (I)
  const n = 22;
  const floor = Math.min(k.ground(0, 0), k.seaLevel) - 0.15;
  // heights (local y) and growth of the rings: ledged faces above the water, a broad apron below it
  const tiers: [number, number][] = [
    [TOP, 1],
    [TOP - 0.03, 1.07],
    [TOP - 0.06, 1.03],
    [TOP - 0.1, 1.14],
    [0.02, 1.2],
    [-0.04, 1.36],
    [-0.3, 1.5],
    [floor, 1.75],
  ];
  const sections = tiers.map(([y, grow], t) => ({
    y,
    rotDeg: (k.r(20 + t) - 0.5) * 10,
    outline: Array.from({ length: n }, (_, j): V2 => {
      const a = (j / n) * Math.PI * 2;
      const w = grow * (0.84 + 0.3 * k.r(30 + t * n + j)) * (1 + 0.08 * Math.sin(3 * a + t));
      return rimAt(a, w);
    }),
  }));
  k.loft('weathered', sections, { at: [0, 0, 0], color: ROCK, rock: true });
  // fallen rock in clusters at the cliffs' foot, breaking the waterline (I)
  for (let c = 0; c < 5; c++) {
    const a0 = k.r(200 + c) * Math.PI * 2;
    for (let j = 0; j < 4; j++) {
      const a = a0 + (k.r(210 + c * 8 + j) - 0.5) * 0.5;
      const p = rimAt(a, 1.3 + 0.25 * k.r(230 + c * 8 + j));
      const r = 0.012 + 0.03 * k.r(250 + c * 8 + j) ** 2;
      k.rock('weathered', r, { at: [p[0], k.seaLevel - r * 0.3, p[1]], squash: 0.45 + 0.3 * k.r(270 + c * 8 + j), color: ROCK, lod: 1 });
    }
  }
}

function buildCastle(k: ProxyKit): void {
  // the curtain along the cliff's rim (I), pale stone
  const ward = Array.from({ length: 16 }, (_, j) => rimAt((j / 16) * Math.PI * 2, 0.88));
  k.wallPath('stone', ward, 0.075, 0.03, { closed: true, at: [0, TOP, 0], color: STONE, shadeJitter: 0.05, crenel: { w: 0.015, h: 0.015, gap: 0.012, lod: 0, color: STONE_LIT } });
  // towers on the curtain (I)
  for (let j = 0; j < 7; j++) {
    const a = (j / 7) * Math.PI * 2 + 0.3;
    const p = rimAt(a, 0.88);
    k.tower('stone', 0.034, 0.13, { at: [p[0], TOP, p[1]], sides: 14, roof: 'crenel', color: STONE_LIT, windows: { rows: 2, on: 0.4, size: 0.008 } });
  }
  // the keep: a square tower in the middle of the ward (I)
  const yaw = (-Math.atan2(AXIS[1], AXIS[0]) * 180) / Math.PI;
  k.tower('stone', 0.07, 0.24, { at: [KEEP[0], TOP, KEEP[1]], sides: 4, roof: 'crenel', color: STONE_LIT, rot: [0, yaw + 45, 0], windows: { rows: 3, on: 0.5, size: 0.011 } });
  // the hall along the ward, its roof of dark tile (I)
  k.house('stone', 'slate', 0.2, 0.08, 0.08, { at: [HALL[0], TOP, HALL[1]], rot: [0, yaw, 0], roof: 'gable', pitch: 32, dig: 0, color: STONE, roofColor: ROOF, windows: { count: 5, on: 0.6, sides: 2, size: 0.01 } });
  // the Palestone Sword (C): a tall, slender tower of pale stone at the seaward end, its spire a blade's point
  // over the sea (I: its proportions)
  k.tower('stone', 0.048, 0.56, { at: [SWORD[0], TOP, SWORD[1]], sides: 4, taper: 0.12, roof: 'spire', roofH: 0.16, roofColor: PALE, color: PALE, rot: [0, yaw + 45, 0], windows: { rows: 6, on: 0.35, size: 0.009 } });
  // the gate toward the bridge: two square towers on the east rim (I)
  for (const s of [-1, 1]) {
    const p = P(-0.12 + s * 0.055, 0.29);
    k.tower('stone', 0.03, 0.15, { at: [p[0], TOP, p[1]], sides: 4, roof: 'crenel', color: STONE_LIT, rot: [0, yaw + 45, 0] });
  }
  k.light([BRIDGE_A[0], TOP + 0.06, BRIDGE_A[1]], { color: 0xffb35a, intensity: 0.7, radius: 0.012, kind: 'lamp' });
}

function buildBridge(k: ProxyKit): void {
  // a stone bridge on arches from the gate across to the east bank (I), its far end on the bank
  const b: V2 = [1.32, BRIDGE_A[1] + 0.02];
  const A: V3 = [BRIDGE_A[0] + 0.03, TOP + 0.02, BRIDGE_A[1]];
  const B: V3 = [b[0], k.ground(b[0], b[1]) + 0.01, b[1]];
  k.bridge('stone', A, B, { width: 0.05, arches: 6, deck: 0.034, color: STONE });
}

function buildQuay(k: ProxyKit): void {
  // a quay at the island's foot on the sheltered north-east side, boats moored (I)
  const y = k.seaLevel;
  const q = P(-0.36, 0.12);
  const yaw = (-Math.atan2(AXIS[1], AXIS[0]) * 180) / Math.PI;
  k.box('stone', 0.2, 0.04, 0.05, { at: [q[0], y - 0.02, q[1]], rot: [0, yaw, 0], color: STONE });
  const boats: [V2, number][] = [
    [P(-0.44, 0.2), 0.08],
    [P(-0.5, 0.06), 0.06],
  ];
  boats.forEach(([p, L], i) => {
    k.box('wood', L, 0.016, 0.022, { at: [p[0], y - 0.004, p[1]], rot: [0, yaw + 8 * i, 0], color: TIMBER });
    k.cylinder('wood', 0.0015, 0.002, 0.06, { at: [p[0], y + 0.012, p[1]], seg: 4, color: 0x2e2620, lod: 0 });
  });
}

export default defineLandmark({
  id: 'starfall',
  placeId: 'starfall',
  tier: 'B',
  anchor: 'water',
  proxy: (k) => {
    buildIsland(k);
    buildCastle(k);
    buildBridge(k);
    buildQuay(k);
  },
  emitters: [{ preset: 'smoke', at: [KEEP[0] + 0.05, TOP + 0.1, KEEP[1]], scale: 0.08 }],
  vegetationExclusion: [{ at: [0, 0], r: 0.5 }],
  subjectKm: { at: [SWORD[0] * 0.5, SWORD[1] * 0.5], r: 0.45 },
  contrast: 'dark',
  annotation: {
    title: 'Starfall',
    subtitle: 'Seat of House Dayne',
    blurb: 'On an island where the Torrentine meets the Summer Sea, under the pale tower called the Palestone Sword: the home of the sword Dawn.',
  },
  bookmarks: [
    {
      id: 'starfall-close',
      distanceKm: 3.0,
      elevationDeg: 11,
      azimuthDeg: 215,
      fov: 32,
      lift: 0.2,
      aimKm: [0, 0],
      tod: 16.2,
      note: 'hero: from the estuary to the south-west in the afternoon sun: the island castle in the river mouth, the Palestone Sword standing pale over the sea, the bridge to the east bank behind',
    },
    {
      id: 'starfall-wide',
      distanceKm: 26,
      elevationDeg: 18,
      azimuthDeg: 210,
      fov: 34,
      tod: 16.0,
      note: 'context: the Torrentine\'s estuary opening to the Summer Sea between the Red Mountains\' foothills, Starfall at its head',
    },
  ],
});
