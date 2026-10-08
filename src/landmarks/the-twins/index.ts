import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2, V3 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * The Twins at 298 AC (ledger ids per part in canon.json). T: two massive castles, near mirror images of each
 * other, face to face on opposite banks of the Green Fork (the-twins-form); a great stone bridge between them
 * with the Water Tower at its midpoint (the-twins-bridge); the Freys' crossing, held and tolled for six
 * hundred years (the-twins-crossing-toll), the only one for a long way, the river too deep and fast to ford
 * (the-twins-only-crossing). M: on the Green Fork west of the kingsroad, near the Neck's southern end
 * (the-twins-position, kingsroad-twins-off-road). I: the plan, the grey stone, the forms of the keeps and
 * towers (the-twins-plan).
 *
 * Local frame: x east, z south, origin at the sheet's marker on the river's west bank; the traced river runs
 * north-north-west past it ~1 km east (its water ~0.33 below the origin's ground, the banks barely above it).
 */

const STONE = 0x6f6c67;
const STONE_LIT = 0x7d7a74;
const SLATE = 0x45484c;
const WATER_Y = -0.33;

/** the river's centre at the crossing and its downstream direction (the trace runs north-north-west) */
const C0: V2 = [1.1, -0.5];
const DIR: V2 = [-0.47, -0.88];
/** across the river, toward the east bank */
const N: V2 = [0.88, -0.47];
/** each castle's half-size, and how far its centre stands from the river's centre */
const HALF = 0.36;
const OFF = 0.74;

const DEG = Math.PI / 180;
const along = (p: V2, u: number, v: number): V2 => [p[0] + DIR[0] * u + N[0] * v, p[1] + DIR[1] * u + N[1] * v];
/** compass-free yaw (deg) that turns a part's +x axis to point along N (across the river, east) */
const YAW_N = -Math.atan2(N[1], N[0]) / DEG;

/**
 * One of the two castles (I: the form): a square curtain with round corner towers, a gatehouse on the river
 * face, a massive square keep and its hall. `side` +1 east bank, −1 west bank (the mirror image).
 */
function castle(k: ProxyKit, side: 1 | -1, seed: number): void {
  const c = along(C0, 0, side * OFF);
  // corners: v toward the river is −side
  const corners: V2[] = [
    [-HALF, -HALF],
    [HALF, -HALF],
    [HALF, HALF],
    [-HALF, HALF],
  ].map(([u, v]) => along(c, u, v));
  k.wallPath('stone', corners, 0.17, 0.07, {
    followGround: true,
    closed: true,
    step: 0.06,
    batter: 0.12,
    color: STONE,
    shadeJitter: 0.06,
    crenel: { w: 0.024, h: 0.026, gap: 0.018, lod: 0, color: STONE_LIT },
  });
  for (const [i, p] of corners.entries()) {
    k.tower('stone', 0.075, 0.27 + 0.02 * ((i + seed) % 2), { at: [p[0], 0, p[1]], seat: 'min', sides: 16, roof: 'crenel', color: STONE_LIT, windows: { rows: 2, on: 0.35, size: 0.011 } });
  }
  // interval towers midway along the landward and the up- and downstream walls
  for (const [u, v] of [
    [0, side * HALF],
    [HALF, 0],
    [-HALF, 0],
  ]) {
    const p = along(c, u, v);
    k.tower('stone', 0.05, 0.22, { at: [p[0], 0, p[1]], seat: 'min', sides: 4, roof: 'crenel', color: STONE, rot: [0, YAW_N, 0] });
  }
  // the gatehouse on the river face, toward the bridge: two square towers and the gate between
  const g = along(c, 0, -side * HALF);
  for (const u of [-0.07, 0.07]) {
    const p = along(g, u, 0);
    k.tower('stone', 0.05, 0.26, { at: [p[0], 0, p[1]], seat: 'min', sides: 4, roof: 'crenel', color: STONE_LIT, rot: [0, YAW_N + 45, 0] });
  }
  k.light([g[0] - side * N[0] * 0.04, k.ground(g[0], g[1]) + 0.08, g[1] - side * N[1] * 0.04], { color: 0xffb35a, intensity: 0.9, radius: 0.018, kind: 'fire', flicker: 0.3 });
  // the keep: a massive square tower in the landward half (I), and the hall beside it
  const keep = along(c, -0.08, side * 0.12);
  k.tower('stone', 0.13, 0.42, { at: [keep[0], 0, keep[1]], seat: 'min', sides: 4, roof: 'crenel', color: STONE_LIT, rot: [0, YAW_N + 45, 0], windows: { rows: 4, on: 0.45, size: 0.013 } });
  const hall = along(c, 0.17, side * 0.02);
  k.house('stone', 'slate', 0.3, 0.12, 0.1, { at: [hall[0], 0, hall[1]], rot: [0, YAW_N, 0], roof: 'gable', pitch: 34, dig: 0.3, color: STONE_LIT, roofColor: SLATE, windows: { count: 4, on: 0.45, sides: 2, size: 0.012 } });
  for (const [i, [u, v]] of [
    [0.2, side * 0.24],
    [-0.22, side * -0.18],
    [0.22, side * -0.2],
  ].entries()) {
    const p = along(c, u, v);
    k.house('stone', 'slate', 0.16 + 0.04 * (i % 2), 0.08, 0.07, { at: [p[0], 0, p[1]], rot: [0, YAW_N + 90 * (i % 2), 0], roof: 'gable', pitch: 36, dig: 0.3, color: STONE, roofColor: SLATE });
  }
  // the yard
  k.drape('weathered', corners.map(([x, z]): V2 => [c[0] + (x - c[0]) * 0.9, c[1] + (z - c[1]) * 0.9]), { step: 0.05, lift: 0.01, color: 0x6a645a, lod: 1 });
}

function buildCrossing(k: ProxyKit): void {
  // the great stone bridge (T) from gate to gate across the river, on arches, the Water Tower at its middle
  const a = along(C0, 0, -(OFF - HALF) - 0.02);
  const b = along(C0, 0, OFF - HALF + 0.02);
  const deck = WATER_Y + 0.11;
  const mid = along(C0, 0, 0);
  const A: V3 = [a[0], deck, a[1]];
  const M1: V3 = [mid[0] - N[0] * 0.05, deck, mid[1] - N[1] * 0.05];
  const M2: V3 = [mid[0] + N[0] * 0.05, deck, mid[1] + N[1] * 0.05];
  const B: V3 = [b[0], deck, b[1]];
  k.bridge('stone', A, M1, { width: 0.06, arches: 4, deck: 0.03, color: STONE });
  k.bridge('stone', M2, B, { width: 0.06, arches: 4, deck: 0.03, color: STONE });
  // the Water Tower (T): square, standing in the river on the bridge's midpoint (I: its form)
  k.tower('stone', 0.07, 0.36, { at: [mid[0], WATER_Y - 0.06, mid[1]], sides: 4, roof: 'crenel', color: STONE_LIT, rot: [0, YAW_N + 45, 0], windows: { rows: 3, on: 0.5, size: 0.012 } });
  k.light([mid[0], deck + 0.08, mid[1]], { color: 0xffb35a, intensity: 0.8, radius: 0.016, kind: 'fire', flicker: 0.3 });
}

export default defineLandmark({
  id: 'the-twins',
  placeId: 'the-twins',
  tier: 'A',
  proxy: (k) => {
    castle(k, 1, 0);
    castle(k, -1, 1);
    buildCrossing(k);
  },
  vegetationExclusion: [
    { at: along(C0, 0, OFF), r: 0.7 },
    { at: along(C0, 0, -OFF), r: 0.7 },
  ],
  subjectKm: { at: C0, r: 1.3 },
  contrast: 'dark',
  annotation: {
    title: 'The Twins',
    subtitle: 'Seat of House Frey',
    blurb: 'Two castles face to face across the Green Fork, joined by a bridge with the Water Tower at its middle: the Freys’ toll crossing.',
  },
  bookmarks: [
    {
      id: 'the-twins-close',
      distanceKm: 4.5,
      elevationDeg: 18,
      azimuthDeg: 332,
      fov: 32,
      lift: 0.1,
      aimKm: [1.1, 0.5],
      tod: 16.5,
      note: 'hero: from upstream, looking down the Green Fork in the afternoon: the twin grey castles face to face across the Green Fork, the arched bridge between their gatehouses and the Water Tower standing in the river at its middle',
    },
    {
      id: 'the-twins-wide',
      distanceKm: 40,
      elevationDeg: 18,
      azimuthDeg: 210,
      fov: 34,
      tod: 16.0,
      note: 'context: the Twins on the Green Fork in the northern riverlands, the Neck beyond',
    },
  ],
});
