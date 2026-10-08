import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2, V3 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * Oldtown at 298 AC (ledger ids per part in canon.json). T: at the head of the Whispering Sound where the
 * Honeywine flows into it (oldtown-position, whispering-sound-approach); the Hightower rising from Battle Isle
 * in the harbour (oldtown-hightower-battle-isle), its great beacon at the top guiding ships up the Sound
 * (oldtown-hightower-beacon); the Citadel along the Honeywine, its ravenry on the Isle of Ravens in the river
 * (oldtown-citadel, honeywine-through-oldtown); the Starry Sept (oldtown-starry-sept). C: Battle Isle where the
 * river meets the Sound (oldtown-battle-isle-river-mouth); the tallest tower in Westeros
 * (oldtown-hightower-height), raised on an ancient square fortress of seamless black stone
 * (oldtown-hightower-base). I: the plan, the walls, the stepped tiers, the forms (oldtown-plan,
 * oldtown-hightower-form).
 *
 * Local frame: x east, z south, origin on the shore at the Honeywine's mouth (a display offset off the
 * sheet's marker, which stands up the river from the Sound's head: oldtown-position). The Sound runs off to
 * the south-south-west, the river comes down from the north-east through a valley, hills rise on both sides.
 */

const PALE = 0xd3cdc1;
const PALE_LIT = 0xdfd9cd;
const BLACK = 0x1c1b1e;
const STONE = 0x9c968a;
const SLATE = [0x4d5562, 0x535b66, 0x48505a];
const TILE = [0x8e5a44, 0x9a6650, 0x845040];
const PLASTER = [0xd8cfbd, 0xcfc4b0, 0xe0d8c8, 0xc8bca6];

/** the Honeywine's baked line through the city, north-east → south-west into the Sound */
const RIVER: V2[] = [
  [2.89, -2.95],
  [1.91, -1.82],
  [0.93, -0.68],
  [0.44, -0.11],
  [-0.05, 0.46],
];
/** the river's ribbon half width (a 0.6 km stream: 0.6 km beyond its centre line) */
const RIBBON = 0.62;

/** Battle Isle (T) at the river's mouth in the Sound, and the Hightower's levels on it (I: the tiers) */
const ISLE: V2 = [-0.5, 0.86];
const ISLE_R = 0.3;
const ISLE_TOP = 0.26;
const BASE = { half: 0.15, h: 0.15 };
const TIERS: [number, number][] = [
  [0.135, 0.17],
  [0.12, 0.16],
  [0.105, 0.15],
  [0.09, 0.14],
  [0.077, 0.13],
  [0.065, 0.12],
  [0.054, 0.12],
];
const TOWER_TOP = ISLE_TOP + BASE.h + TIERS.reduce((a, [, h]) => a + h, 0);

/** the city wall (I): from the Sound's west shore over the western hills, round the valley, to the foot of the eastern slope at the Sound */
const WALL: V2[] = [
  [-2.2, 0.45],
  [-2.5, -0.95],
  [-2.1, -2.2],
  [-0.95, -2.3],
  [0.6, -2.35],
  [2.0, -2.7],
  [2.85, -1.9],
  [2.75, -0.6],
  [2.1, 0.45],
  [1.2, 1.15],
  [0.5, 1.55],
];
const CITY: V2[] = [...WALL, [0.05, 1.0], [-0.6, 0.2], [-1.6, 0.45]];

/** the Starry Sept (T) on the west bank's slope (I: its place and form) */
const SEPT: V2 = [-1.15, -1.05];
/** the Citadel (T) along both banks of the Honeywine above the mouth (I: its extent) */
const CITADEL = { from: 0.35, to: 2.2, depth: 0.75 };
/** the Isle of Ravens (T) in the river */
const RAVENS: V2 = [1.42, -1.26];

const DEG = Math.PI / 180;

function inside(poly: V2[], x: number, z: number): boolean {
  let c = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, za] = poly[a];
    const [xb, zb] = poly[b];
    if (za > z !== zb > z && x < ((xb - xa) * (z - za)) / (zb - za) + xa) c = !c;
  }
  return c;
}

/** distance to the river's line and the arc length (from the mouth) of the nearest point */
function riverAt(x: number, z: number): { d: number; s: number; dir: V2 } {
  let best = { d: Infinity, s: 0, dir: [1, 0] as V2 };
  let acc = 0;
  for (let i = RIVER.length - 1; i > 0; i--) {
    const [ax, az] = RIVER[i];
    const [bx, bz] = RIVER[i - 1];
    const ex = bx - ax;
    const ez = bz - az;
    const L = Math.hypot(ex, ez);
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (L * L)));
    const d = Math.hypot(x - (ax + ex * t), z - (az + ez * t));
    if (d < best.d) best = { d, s: acc + t * L, dir: [ex / L, ez / L] };
    acc += L;
  }
  return best;
}

/** a point `s` km up the river from the mouth, offset `v` km to its right bank (looking upstream: east side) */
function bank(s: number, v: number): V2 {
  let acc = 0;
  for (let i = RIVER.length - 1; i > 0; i--) {
    const [ax, az] = RIVER[i];
    const [bx, bz] = RIVER[i - 1];
    const L = Math.hypot(bx - ax, bz - az);
    if (acc + L >= s || i === 1) {
      const t = Math.min(1, (s - acc) / L);
      const d: V2 = [(bx - ax) / L, (bz - az) / L];
      return [ax + (bx - ax) * t - d[1] * v, az + (bz - az) * t + d[0] * v];
    }
    acc += L;
  }
  return RIVER[0];
}

function buildIsle(k: ProxyKit): void {
  // Battle Isle: a low island of rock in the mouth, quays round it (I: its form)
  const n = 14;
  const floor = Math.min(k.ground(ISLE[0], ISLE[1]), k.seaLevel) - 0.1;
  const ring = (grow: number, seed: number): V2[] =>
    Array.from({ length: n }, (_, j): V2 => {
      const a = (j / n) * Math.PI * 2;
      const e = ISLE_R * grow * (0.86 + 0.22 * k.r(seed + j));
      return [Math.cos(a) * e, Math.sin(a) * e];
    });
  k.loft('weathered', [
    { y: ISLE_TOP, outline: ring(0.97, 100) },
    { y: ISLE_TOP - 0.05, outline: ring(1.0, 100) },
    { y: k.seaLevel, outline: ring(1.1, 120) },
    { y: floor, outline: ring(1.35, 140) },
  ], { at: [ISLE[0], 0, ISLE[1]], color: 0x5c5a55, rock: true });
  k.wallPath('stone', ring(0.97, 100).map(([x, z]): V2 => [ISLE[0] + x, ISLE[1] + z]), 0.04, 0.02, { closed: true, at: [0, ISLE_TOP, 0], color: PALE, crenel: { w: 0.014, h: 0.014, gap: 0.012, lod: 0 } });
  // the Hightower's foot: the ancient square fortress of seamless black stone (C)
  k.tower('stone', BASE.half * Math.SQRT2, BASE.h, { at: [ISLE[0], ISLE_TOP, ISLE[1]], sides: 4, roof: 'none', color: BLACK, rot: [0, 45 + 20, 0], grain: 0.05 });
  // the stepped tower of pale stone rising from it, level on level (I), its beacon at the top (T)
  let y = ISLE_TOP + BASE.h;
  TIERS.forEach(([r, h], i) => {
    k.tower('stone', r, h, { at: [ISLE[0], y, ISLE[1]], sides: 8, roof: 'crenel', color: i % 2 ? PALE : PALE_LIT, rot: [0, 22.5 + 20, 0], windows: { rows: 2, on: 0.55, size: 0.012 } });
    y += h;
  });
  k.cylinder('iron', 0.035, 0.028, 0.03, { at: [ISLE[0], TOWER_TOP, ISLE[1]], seg: 10, color: 0x2c2826 });
  k.light([ISLE[0], TOWER_TOP + 0.05, ISLE[1]], { color: 0xff9a40, intensity: 3.2, radius: 0.045, kind: 'fire', flicker: 0.35 });
}

function buildHarbour(k: ProxyKit): void {
  // ships at anchor in the head of the Sound and at the isle's quays (I)
  const ships: V3[] = [
    [-1.15, 0, 1.15],
    [-0.95, 0, 1.6],
    [-1.55, 0, 1.75],
    [-0.05, 0, 1.1],
    [-0.35, 0, 1.55],
    [-1.4, 0, 0.75],
  ];
  ships.forEach(([x, , z], i) => {
    const yaw = 30 + 50 * k.r(300 + i);
    k.box('wood', 0.032, 0.02, 0.11, { at: [x, k.seaLevel - 0.004, z], rot: [0, yaw, 0], color: 0x4a3a2a });
    k.cylinder('wood', 0.002, 0.002, 0.08, { at: [x, k.seaLevel + 0.016, z], seg: 4, color: 0x3e3226, lod: 0 });
  });
}

function buildWalls(k: ProxyKit): void {
  k.wallPath('stone', WALL, 0.13, 0.05, {
    followGround: true,
    step: 0.04,
    batter: 0.12,
    color: STONE,
    shadeJitter: 0.05,
    crenel: { w: 0.02, h: 0.02, gap: 0.016, lod: 0 },
  });
  // towers along the wall where the ground is level enough to seat them (I)
  let carry = 0;
  for (let i = 0; i + 1 < WALL.length; i++) {
    const [ax, az] = WALL[i];
    const [bx, bz] = WALL[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    for (let t = carry; t < L; t += 0.55) {
      const x = ax + ((bx - ax) * t) / L;
      const z = az + ((bz - az) * t) / L;
      if (slope(k, x, z) < 0.6) k.tower('stone', 0.04, 0.19, { at: [x, 0, z], seat: 'min', sides: 16, roof: 'crenel', color: STONE });
      carry = t + 0.55 - L;
    }
  }
}

/** the ground's steepest slope at a point (units per km) */
function slope(k: ProxyKit, x: number, z: number): number {
  const e = 0.06;
  return Math.hypot((k.ground(x + e, z) - k.ground(x - e, z)) / (2 * e), (k.ground(x, z + e) - k.ground(x, z - e)) / (2 * e));
}

function buildCitadel(k: ProxyKit): void {
  // halls and courts of grey stone along both banks above the mouth, domes among them (I: the forms)
  let n = 0;
  for (const side of [-1, 1]) {
    for (let s = CITADEL.from; s < CITADEL.to; s += 0.16) {
      for (const [j, v] of [0.84, 1.04, 1.24].entries()) {
        const p = bank(s + 0.08 * j, side * v);
        if (!inside(CITY, p[0], p[1]) || k.ground(p[0], p[1]) < k.seaLevel + 0.03 || slope(k, p[0], p[1]) > 0.8) continue;
        const r = riverAt(p[0], p[1]);
        const yaw = -Math.atan2(r.dir[1], r.dir[0]) / DEG;
        const i = n++;
        if (i % 6 === 3 && slope(k, p[0], p[1]) < 0.5) {
          k.tower('stone', 0.045, 0.1, { at: [p[0], 0, p[1]], seat: 'min', sides: 12, roof: 'dome', roofColor: 0x6d7a7e, color: STONE });
          continue;
        }
        k.house('stone', 'slate', 0.15 + 0.04 * (i % 3), 0.07, 0.08, { at: [p[0], 0, p[1]], rot: [0, yaw, 0], roof: 'gable', pitch: 38, dig: 0.4, color: i % 2 ? STONE : 0xa8a296, roofColor: SLATE[i % SLATE.length], windows: { count: 2, on: 0.5, sides: 2, size: 0.01 } });
      }
    }
  }
  // the Seneschal's Court's tower near the mouth (I)
  const sc = bank(0.75, -0.95);
  k.tower('stone', 0.05, 0.24, { at: [sc[0], 0, sc[1]], seat: 'min', sides: 4, roof: 'crenel', color: 0xa8a296, windows: { rows: 3, on: 0.5, size: 0.011 } });
  // the Isle of Ravens (T): an islet in the river carrying the ravenry (I: its form)
  const rv = k.ground(RAVENS[0], RAVENS[1]);
  k.loft('weathered', [
    { y: rv + 0.07, outline: Array.from({ length: 10 }, (_, j): V2 => [Math.cos((j / 10) * 6.283) * 0.09, Math.sin((j / 10) * 6.283) * 0.06]) },
    { y: rv - 0.15, outline: Array.from({ length: 10 }, (_, j): V2 => [Math.cos((j / 10) * 6.283) * 0.12, Math.sin((j / 10) * 6.283) * 0.085]) },
  ], { at: [RAVENS[0], 0, RAVENS[1]], color: 0x6a665e, rock: true, rot: [0, 40, 0] });
  k.tower('stone', 0.035, 0.16, { at: [RAVENS[0], rv + 0.07, RAVENS[1]], sides: 12, roof: 'cone', roofColor: 0x3a3f46, color: 0x8e887c, windows: { rows: 2, on: 0.5, size: 0.009 } });
}

function buildSept(k: ProxyKit): void {
  // the Starry Sept (T): a seven-sided hall under a great dome, seven spires round it (I: the form)
  k.tower('stone', 0.19, 0.12, { at: [SEPT[0], 0, SEPT[1]], seat: 'min', sides: 7, roof: 'dome', roofColor: 0x5f6f86, color: PALE, windows: { rows: 1, on: 0.7, size: 0.014 } });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    k.tower('stone', 0.022, 0.2, { at: [SEPT[0] + Math.cos(a) * 0.2, 0, SEPT[1] + Math.sin(a) * 0.2], seat: 'min', sides: 8, roof: 'spire', roofColor: 0x5f6f86, color: PALE_LIT });
  }
  k.drape('weathered', Array.from({ length: 12 }, (_, j): V2 => [SEPT[0] + 0.42 + Math.cos((j / 12) * 6.283) * 0.18, SEPT[1] + 0.25 + Math.sin((j / 12) * 6.283) * 0.14]), { step: 0.04, lift: 0.012, color: 0xb7ad99, lod: 1 });
}

function buildHouses(k: ProxyKit): void {
  let lit = 0;
  k.scatter(
    { polygon: CITY },
    2200,
    (i, x, z) => {
      const g = k.ground(x, z);
      if (g < k.seaLevel + 0.04) return;
      const r = riverAt(x, z);
      if (r.d < RIBBON + 0.2) return;
      if (r.s > CITADEL.from - 0.1 && r.s < CITADEL.to + 0.2 && r.d < RIBBON + 0.72) return;
      if (Math.hypot(x - SEPT[0], z - SEPT[1]) < 0.36) return;
      const e = 0.09;
      const gx = (k.ground(x + e, z) - k.ground(x - e, z)) / (2 * e);
      const gz = (k.ground(x, z + e) - k.ground(x, z - e)) / (2 * e);
      if (Math.hypot(gx, gz) > 0.7) return;
      // rows follow the slope's contours (I)
      const yaw = (Math.atan2(gx, -gz) * 180) / Math.PI + (k.r(4000 + i) - 0.5) * 20;
      const big = i % 9 === 0;
      const window = lit < 260 && i % 6 === 2;
      if (window) lit++;
      k.house('plaster', 'roofTile', big ? 0.16 : 0.09 + 0.05 * k.r(4100 + i), big ? 0.11 : 0.07 + 0.03 * k.r(4200 + i), big ? 0.09 : 0.06 + 0.03 * k.r(4300 + i), {
        at: [x, 0, z],
        rot: [0, yaw, 0],
        roof: big ? 'hip' : 'gable',
        pitch: 34 + 12 * k.r(4400 + i),
        dig: 0.15,
        color: PLASTER[i % PLASTER.length],
        shade: 0.88 + 0.22 * k.r(4500 + i),
        roofColor: i % 5 === 0 ? SLATE[i % SLATE.length] : TILE[i % TILE.length],
        chimney: i % 11 === 5,
        lod: big ? 1 : 0,
        ...(window ? { windows: { count: 1, on: 1, sides: 1 as const, size: 0.01 } } : {}),
      });
    },
    { minSpacing: 0.105, tries: 12 },
  );
}

export default defineLandmark({
  id: 'oldtown',
  placeId: 'oldtown',
  tier: 'A',
  // the city's ground: the Honeywine's valley floor widened into a basin stepping up the river with its
  // water (heights local: the origin's ground is ~0.15 below the sea), the hills' feet cut back, nothing raised (I)
  stamps: [
    { kind: 'flatten', at: [-0.5, -0.8], radius: 1.9, falloff: 1.2, height: 0.5, lowerOnly: true },
    { kind: 'flatten', at: [0.93, -0.68], radius: 1.8, falloff: 1.1, height: 0.75, lowerOnly: true },
    { kind: 'flatten', at: [1.91, -1.82], radius: 1.6, falloff: 1.0, height: 1.35, lowerOnly: true },
    { kind: 'flatten', at: [2.89, -2.95], radius: 1.3, falloff: 0.9, height: 1.7, lowerOnly: true },
  ],
  proxy: (k) => {
    buildIsle(k);
    buildHarbour(k);
    buildWalls(k);
    buildCitadel(k);
    buildSept(k);
    buildHouses(k);
  },
  emitters: [
    // the beacon's smoke (T: the beacon fire)
    { preset: 'smoke', at: [ISLE[0], TOWER_TOP + 0.06, ISLE[1]], scale: 0.25, rate: 0.6 },
  ],
  vegetationExclusion: [
    { at: [0, -1.2], r: 2.9 },
    { at: ISLE, r: 0.4 },
  ],
  subjectKm: { at: ISLE, r: 0.6 },
  contrast: 'dark',
  annotation: {
    title: 'Oldtown',
    subtitle: 'The Hightower and the Citadel',
    blurb: 'At the head of the Whispering Sound, where the Honeywine meets it: the Hightower on Battle Isle with its beacon, the Citadel along the river.',
  },
  bookmarks: [
    {
      id: 'oldtown-close',
      distanceKm: 6,
      elevationDeg: 14,
      azimuthDeg: 222,
      fov: 32,
      lift: 0.45,
      aimKm: [-0.35, 0.2],
      tod: 15.5,
      note: 'hero: up the Whispering Sound in the afternoon: the Hightower on Battle Isle at the river mouth, its beacon lit, the city climbing the hills behind, the Citadel along the Honeywine',
    },
    {
      id: 'oldtown-wide',
      distanceKm: 32,
      elevationDeg: 20,
      azimuthDeg: 205,
      fov: 34,
      tod: 17.5,
      note: 'context: Oldtown at the head of the Whispering Sound in the southern Reach, the Honeywine coming down from the north',
    },
  ],
});
