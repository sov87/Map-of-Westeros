import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2, V3 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * Moat Cailin at 298 AC (ledger ids per part in canon.json). T: an ancient stronghold of the First Men at the
 * northern end of the Neck, where the kingsroad's causeway comes up out of the swamps (moat-cailin-position,
 * the-neck-causeway); once great, now largely a ruin (moat-cailin-ruin); huge blocks of black basalt, many
 * fallen and half-sunk in the bog (moat-cailin-basalt); three towers left standing: the Gatehouse Tower, the
 * Children's Tower and the leaning Drunkard's Tower (moat-cailin-three-towers, -drunkards-tower,
 * slice-moat-cailin-three-towers); bog and swamp on either side of the causeway, the towers commanding the
 * road (moat-cailin-setting, the-neck-terrain). I: the plan, the ruined curtain's line, the Children's
 * Tower's broken top, the bog's pools (moat-cailin-plan, the-neck-vegetation); at 298 a Stark-held ruin
 * with no ironborn and no flayed men (moat-cailin-state-298).
 *
 * Local frame: x east, z south, origin at the sheet's marker on the kingsroad, which runs north-north-east
 * through it out of the Neck's marshes (south-west on the sheet). The North's plain stands ~7.8 here; the
 * landmark sinks a shallow bog round the ruin.
 */

const BASALT = 0x2c2b2d;
const BASALT_LIT = 0x38373a;
const EARTH = 0x5d5a50;
const BOG = 0x4b4d36;
/** the bog's water (local y: the origin's ground after the stamp, the bog's floor) */
const POOL_Y = 0.04;

/** the kingsroad through the ruin: its direction (south → north) and a point on it at local z */
const ROAD_DIR: V2 = [0.12, -0.993];
const roadX = (z: number): number => (-z * ROAD_DIR[0]) / -ROAD_DIR[1];
/** the old curtain's line (I): an octagon round the towers, broken into fragments */
const CURTAIN: V2[] = Array.from({ length: 8 }, (_, i): V2 => {
  const a = ((i + 0.5) / 8) * Math.PI * 2;
  return [Math.cos(a) * 0.62, -0.05 + Math.sin(a) * 0.55];
});
const GATEHOUSE: V2 = [0.11, 0.5];
const CHILDRENS: V2 = [-0.38, -0.24];
const DRUNKARDS: V2 = [0.43, -0.33];

/** the bog's pools (I): irregular rings off the causeway and the ruin */
const POOLS: [V2, number][] = [
  [[-1.2, 0.6], 0.28],
  [[-0.95, 1.45], 0.24],
  [[-1.55, -0.45], 0.3],
  [[1.15, 0.95], 0.26],
  [[1.45, -0.15], 0.22],
  [[0.85, 1.85], 0.3],
  [[-0.95, 2.35], 0.26],
  [[1.6, 1.65], 0.2],
  [[-1.85, 1.35], 0.25],
  [[0.55, 2.5], 0.22],
  [[-1.5, 2.6], 0.24],
];

/** an irregular pond outline: two slow lobes and a ragged edge (deterministic, no kit needed) */
function blob(at: V2, r: number, seed: number, grow = 1): V2[] {
  const n = 22;
  const ph = (seed * 0.618) % 1 * 6.283;
  return Array.from({ length: n }, (_, j): V2 => {
    const a = (j / n) * Math.PI * 2;
    const w = grow * (0.82 + 0.16 * Math.sin(2 * a + ph) + 0.1 * Math.sin(3 * a + 2 * ph) + 0.06 * Math.sin(7 * a + seed));
    return [at[0] + Math.cos(a) * r * w, at[1] + Math.sin(a) * r * w * 0.8];
  });
}

function buildRuin(k: ProxyKit): void {
  // the old curtain: fragments of black basalt wall of uneven height, long gaps where it has fallen (T: a
  // ruin; I: its line)
  for (let i = 0; i < CURTAIN.length; i++) {
    const a = CURTAIN[i];
    const b = CURTAIN[(i + 1) % CURTAIN.length];
    // each side keeps one or two stretches
    const keep = k.r(100 + i);
    const pieces: [number, number][] = keep < 0.3 ? [[0.1, 0.45]] : keep < 0.7 ? [[0.05, 0.35], [0.6, 0.85]] : [[0.3, 0.7]];
    pieces.forEach(([t0, t1], j) => {
      const p: V2 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0];
      const q: V2 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
      k.wallPath('stone', [p, q], 0.05 + 0.08 * k.r(120 + i * 4 + j), 0.07, { followGround: true, step: 0.04, batter: 0.2, color: BASALT, shadeJitter: 0.08 });
    });
  }
  // huge fallen blocks, half-sunk in the soft ground (T)
  for (let i = 0; i < 46; i++) {
    const t = k.r(200 + i);
    const side = Math.floor(k.r(300 + i) * 8);
    const a = CURTAIN[side];
    const b = CURTAIN[(side + 1) % 8];
    const off = (k.r(400 + i) - 0.5) * 0.3;
    const x = a[0] + (b[0] - a[0]) * t + off;
    const z = a[1] + (b[1] - a[1]) * t + (k.r(500 + i) - 0.5) * 0.3;
    if (Math.abs(x - roadX(z)) < 0.08) continue;
    const s = 0.035 + 0.045 * k.r(600 + i);
    const rot: V3 = [(k.r(700 + i) - 0.5) * 40, k.r(800 + i) * 90, (k.r(900 + i) - 0.5) * 40];
    k.box('stone', s * (1 + k.r(950 + i)), s, s * 0.9, { at: [x, k.ground(x, z) - s * 0.45, z], rot, color: i % 3 ? BASALT : BASALT_LIT, lod: i % 2 ? 1 : 0 });
  }
}

function buildTowers(k: ProxyKit): void {
  const yawRoad = -Math.atan2(ROAD_DIR[1], ROAD_DIR[0]) / (Math.PI / 180);
  // the Gatehouse Tower by the causeway's head: square and massive (T: its name; I: its form)
  k.tower('stone', 0.11, 0.3, { at: [GATEHOUSE[0], 0, GATEHOUSE[1]], seat: 'min', sides: 4, roof: 'crenel', color: BASALT_LIT, rot: [0, yawRoad + 45, 0], windows: { rows: 2, on: 0.2, size: 0.01 } });
  // the Children's Tower, tall and slender, its top broken (I: the broken top)
  k.tower('stone', 0.055, 0.44, { at: [CHILDRENS[0], 0, CHILDRENS[1]], seat: 'min', sides: 14, roof: 'none', color: BASALT });
  const ct = k.ground(CHILDRENS[0], CHILDRENS[1]) + 0.44;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const h = 0.015 + 0.05 * k.r(1000 + i);
    k.box('stone', 0.03, h, 0.02, { at: [CHILDRENS[0] + Math.cos(a) * 0.045, ct - 0.02, CHILDRENS[1] + Math.sin(a) * 0.045], rot: [0, (-a * 180) / Math.PI + 90, 0], color: BASALT, lod: 0 });
  }
  // the Drunkard's Tower, leaning hard (T)
  k.tower('stone', 0.065, 0.31, { at: [DRUNKARDS[0], 0, DRUNKARDS[1]], seat: 'min', sides: 14, roof: 'crenel', color: BASALT_LIT, rot: [0, 0, -10], windows: { rows: 2, on: 0.15, size: 0.009 } });
  // one fire kept in the gatehouse (I: a few Stark men watch the road)
  k.light([GATEHOUSE[0] - 0.06, k.ground(GATEHOUSE[0], GATEHOUSE[1]) + 0.12, GATEHOUSE[1] - 0.06], { color: 0xffa04a, intensity: 0.6, radius: 0.012, kind: 'fire', flicker: 0.4 });
}

function buildRoad(k: ProxyKit): void {
  // the causeway (T): a raised bank of earth and stone across the bog, south of the ruin
  const south: V2[] = [];
  for (let z = 4.6; z >= GATEHOUSE[1] + 0.06; z -= 0.2) south.push([roadX(z) - 0.05, z]);
  k.wallPath('stone', south, 0.04, 0.16, { followGround: true, step: 0.05, batter: 0.55, color: EARTH, shadeJitter: 0.05 });
  // the kingsroad on north out of the ruin, over the plain (I: its surface)
  const n0 = GATEHOUSE[1];
  const pts: V2[] = [];
  for (let z = n0; z >= -4.5; z -= 0.25) pts.push([roadX(z) - 0.05, z]);
  const L = pts.map(([x, z]): V2 => [x - 0.03, z]);
  const R = pts.map(([x, z]): V2 => [x + 0.03, z]).reverse();
  k.drape('weathered', [...L, ...R], { step: 0.04, lift: 0.025, color: 0x6e6555, lod: 1 });
}

export default defineLandmark({
  id: 'moat-cailin',
  placeId: 'moat-cailin',
  tier: 'B',
  // the bog round the ruin: the plain's ground sunk into a shallow floor, never raised (I)
  stamps: [{ kind: 'flatten', at: [0, 0.8], radius: 2.4, falloff: 1.4, height: -0.25, lowerOnly: true }],
  proxy: (k) => {
    // sodden ground round the pools: dark moss and reed beds (I: the-neck-vegetation)
    POOLS.forEach(([at, r], i) => k.drape('weathered', blob(at, r, 40 + i * 13, 1.7), { step: 0.014, lift: 0.006, color: BOG, lod: 1, holes: [blob(at, r, 40 + i * 13, 0.95)] }));
    buildRuin(k);
    buildTowers(k);
    buildRoad(k);
  },
  waterFeatures: POOLS.map(([at, r], i) => ({ kind: 'pool' as const, ring: blob(at, r, 40 + i * 13), level: POOL_Y })),
  trees: POOLS.flatMap(([at, r], i) =>
    [0, 1, 2].map((j) => {
      const a = (j / 3) * Math.PI * 2 + i;
      return { at: [at[0] + Math.cos(a) * (r + 0.07), at[1] + Math.sin(a) * (r + 0.06)] as V2, kind: (j === 0 ? 'willow' : 'scrub') as 'willow' | 'scrub', crownKm: j === 0 ? 0.045 : 0.03, color: j === 0 ? 0x4e5a3a : 0x5c6040 };
    }),
  ),
  emitters: [
    { preset: 'mist', at: [-1.2, POOL_Y + 0.02, 0.6], scale: 0.5, rate: 0.4 },
    { preset: 'mist', at: [1.1, POOL_Y + 0.02, 1.0], scale: 0.45, rate: 0.4 },
    { preset: 'mist', at: [-0.9, POOL_Y + 0.02, 2.3], scale: 0.5, rate: 0.4 },
  ],
  vegetationExclusion: [{ at: [0, -0.05], r: 0.75 }],
  subjectKm: { at: [0, 0], r: 0.7 },
  contrast: 'light',
  annotation: {
    title: 'Moat Cailin',
    subtitle: 'The gate of the North',
    blurb: 'A ruin of black basalt at the head of the Neck: three towers still stand over the causeway, the rest sunk in the bog.',
  },
  bookmarks: [
    {
      id: 'moat-cailin-close',
      distanceKm: 3.4,
      elevationDeg: 13,
      azimuthDeg: 205,
      fov: 32,
      lift: 0.12,
      aimKm: [0, 0.05],
      tod: 15.5,
      weather: { cloudCoverage: 0.7 },
      note: 'hero: from the bog to the south-south-west under a grey afternoon: the causeway coming up out of the swamp to the Gatehouse Tower, the leaning Drunkard\'s Tower and the tall Children\'s Tower among fallen basalt',
    },
    {
      id: 'moat-cailin-wide',
      distanceKm: 30,
      elevationDeg: 20,
      azimuthDeg: 195,
      fov: 34,
      tod: 15.5,
      note: 'context: Moat Cailin at the northern end of the Neck, the kingsroad running north toward Winterfell',
    },
  ],
});
