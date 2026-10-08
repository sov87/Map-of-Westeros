import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2, V3 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * White Harbor at 298 AC (ledger ids per part in canon.json). T: where the White Knife flows into the Bite, the
 * North's chief seaport (white-harbor-position, white-knife-mouth); the smallest of the five cities, walled
 * and busy (white-harbor-smallest-city); walls and buildings of white or whitewashed stone
 * (white-harbor-white-stone); the New Castle on a hill above the harbour, the city climbing toward it, its
 * great hall the Merman's Court (white-harbor-new-castle, -mermans-court); the Wolf's Den, an older grim
 * fortress guarding the river mouth (white-harbor-wolfs-den); Seal Rock standing out of the water before the
 * city (white-harbor-seal-rock: nothing built on it); the domed Sept of the Snows
 * (white-harbor-sept-of-the-snows). I: the plan, the Castle Stair, the forms (white-harbor-plan).
 *
 * Local frame: x east, z south, origin in the city on the slope above the waterfront (a display offset off
 * the sheet's marker onto the north-east shore where the White Knife's wide lower course opens into the Bite:
 * white-harbor-position). The shore runs north-west to south-east ~1.2 km south-west of the origin; the land
 * rises gently inland.
 */

const WHITE = [0xe8e4da, 0xdedad0, 0xefebe2, 0xd8d3c8];
const WHITE_WALL = 0xe2ded4;
const GREY = 0x5a5752;
const SLATE = [0x4d5663, 0x56606c, 0x47505b];
const TIMBER = 0x4a3b2c;

/** along the shore (south-east) and inland (north-east) */
const SD: V2 = [0.707, 0.707];
const IN: V2 = [0.707, -0.707];
const S0: V2 = [-0.85, 0.85];
const P = (s: number, t: number): V2 => [S0[0] + SD[0] * s + IN[0] * t, S0[1] + SD[1] * s + IN[1] * t];
const DEG = Math.PI / 180;
const YAW_SHORE = -Math.atan2(SD[1], SD[0]) / DEG;

const CASTLE = P(0.25, 1.35);
const SEPT = P(-0.75, 0.95);
const DEN = P(-1.3, 0.28);
const SEAL_ROCK = P(0.45, -1.05);
/** the city wall (T: walled; I: its line), from the shore round the slope and back to the shore */
const WALL: V2[] = [P(-1.65, 0.05), P(-1.65, 1.2), P(-0.85, 2.1), P(0.4, 2.35), P(1.45, 1.85), P(1.8, 0.85), P(1.7, 0.05)];
const CITY: V2[] = [...WALL, P(0.5, -0.05), P(-0.8, -0.05)];

/** the shore point (first ground above the water) on the line inland at `s` */
function shoreAt(k: ProxyKit, s: number): V2 {
  for (let t = -0.8; t < 1.2; t += 0.02) {
    const p = P(s, t);
    if (k.ground(p[0], p[1]) > k.seaLevel + 0.01) return p;
  }
  return P(s, 0);
}

function inside(poly: V2[], x: number, z: number): boolean {
  let c = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [xa, za] = poly[a];
    const [xb, zb] = poly[b];
    if (za > z !== zb > z && x < ((xb - xa) * (z - za)) / (zb - za) + xa) c = !c;
  }
  return c;
}

function slope(k: ProxyKit, x: number, z: number): number {
  const e = 0.07;
  return Math.hypot(k.ground(x + e, z) - k.ground(x - e, z), k.ground(x, z + e) - k.ground(x, z - e)) / (2 * e);
}

function buildWaterfront(k: ProxyKit): void {
  // the quays along the shore, wharves out into the water, ships at them (T: a busy port; I: the forms)
  const y = k.seaLevel;
  for (let s = -1.2; s <= 1.4; s += 0.25) {
    const p = shoreAt(k, s);
    k.box('stone', 0.26, 0.04, 0.05, { at: [p[0], y - 0.02, p[1]], rot: [0, YAW_SHORE, 0], color: 0xbdb8ad });
    if (Math.round(s * 4) % 2 === 0) {
      const q: V2 = [p[0] - IN[0] * 0.09, p[1] - IN[1] * 0.09];
      k.box('wood', 0.02, 0.012, 0.16, { at: [q[0], y + 0.006, q[1]], rot: [0, YAW_SHORE, 0], color: TIMBER, lod: 0 });
    }
  }
  const ships: [number, number][] = [
    [-0.9, -0.3],
    [-0.4, -0.38],
    [0.15, -0.32],
    [0.7, -0.4],
    [1.15, -0.3],
    [-0.1, -0.75],
    [0.95, -0.8],
  ];
  ships.forEach(([s, t], i) => {
    const p = P(s, t);
    const yaw = YAW_SHORE + 90 + (k.r(300 + i) - 0.5) * 30;
    k.box('wood', 0.03, 0.02, 0.11, { at: [p[0], y - 0.004, p[1]], rot: [0, yaw, 0], color: 0x3e3226 });
    k.cylinder('wood', 0.002, 0.002, 0.08, { at: [p[0], y + 0.016, p[1]], seg: 4, color: 0x2e2620, lod: 0 });
  });
  // Seal Rock (T): a great rock standing out of the water before the city, nothing built on it
  k.rock('weathered', 0.13, { at: [SEAL_ROCK[0], y + 0.02, SEAL_ROCK[1]], squash: 0.75, lump: 0.4, color: 0x6a6660 });
}

function buildWolfsDen(k: ProxyKit): void {
  // the Wolf's Den (T): the older, grim fortress at the river mouth — dark stone, a square keep, a curtain
  const ring: V2[] = [
    [DEN[0] - 0.2, DEN[1] - 0.12],
    [DEN[0] + 0.12, DEN[1] - 0.2],
    [DEN[0] + 0.2, DEN[1] + 0.12],
    [DEN[0] - 0.12, DEN[1] + 0.2],
  ];
  k.wallPath('stone', ring, 0.12, 0.05, { followGround: true, closed: true, step: 0.04, batter: 0.15, color: GREY, crenel: { w: 0.018, h: 0.018, gap: 0.014, lod: 0 } });
  k.tower('stone', 0.1, 0.24, { at: [DEN[0], 0, DEN[1]], seat: 'min', sides: 4, roof: 'crenel', color: 0x4e4b47, rot: [0, YAW_SHORE + 45, 0], windows: { rows: 2, on: 0.3, size: 0.01 } });
  for (const p of ring) k.tower('stone', 0.04, 0.17, { at: [p[0], 0, p[1]], seat: 'min', sides: 4, roof: 'crenel', color: GREY, rot: [0, YAW_SHORE + 45, 0] });
}

function buildNewCastle(k: ProxyKit): void {
  // the New Castle (T) on its hill: a white curtain, towers, the Merman's Court (I: the forms)
  const n = 7;
  const ring: V2[] = Array.from({ length: n }, (_, i): V2 => {
    const a = (i / n) * Math.PI * 2 + 0.3;
    return [CASTLE[0] + Math.cos(a) * 0.26, CASTLE[1] + Math.sin(a) * 0.22];
  });
  k.wallPath('stone', ring, 0.12, 0.045, { followGround: true, closed: true, step: 0.04, batter: 0.12, color: WHITE_WALL, crenel: { w: 0.018, h: 0.018, gap: 0.014, lod: 0, color: 0xefebe2 } });
  ring.forEach((p, i) => k.tower('stone', 0.045, 0.2 + 0.03 * (i % 2), { at: [p[0], 0, p[1]], seat: 'min', sides: 16, roof: 'cone', roofColor: SLATE[i % 3], color: WHITE_WALL, windows: { rows: 2, on: 0.5, size: 0.01 } }));
  k.house('stone', 'slate', 0.26, 0.11, 0.12, { at: [CASTLE[0] - 0.03, 0, CASTLE[1] + 0.03], rot: [0, YAW_SHORE, 0], roof: 'gable', pitch: 38, dig: 0.2, color: 0xe6e2d8, roofColor: SLATE[0], windows: { count: 4, on: 0.6, sides: 2, size: 0.012 } });
  k.tower('stone', 0.075, 0.32, { at: [CASTLE[0] + 0.1, 0, CASTLE[1] - 0.08], seat: 'min', sides: 16, roof: 'cone', roofColor: SLATE[1], color: 0xefebe2, windows: { rows: 4, on: 0.5, size: 0.012 } });
  k.light([CASTLE[0], k.ground(CASTLE[0], CASTLE[1]) + 0.18, CASTLE[1]], { color: 0xffc070, intensity: 0.7, radius: 0.02, kind: 'lamp' });
  // the Castle Stair (I): broad white steps from the waterfront up to the castle gate
  const a = shoreAt(k, 0.15);
  const pts: V3[] = [0.08, 0.3, 0.55, 0.8, 1.05].map((t): V3 => {
    const p = P(0.15 + 0.05 * t, t);
    return [p[0], NaN, p[1]];
  });
  k.stairs('stone', [[a[0], NaN, a[1]], ...pts], 0.045, { color: 0xe6e2d8 });
}

function buildSept(k: ProxyKit): void {
  // the Sept of the Snows (T): a large domed sept, seven-sided (I), small spires round it (I)
  k.tower('stone', 0.12, 0.09, { at: [SEPT[0], 0, SEPT[1]], seat: 'min', sides: 7, roof: 'dome', roofColor: 0xd9dde2, color: 0xefebe2, windows: { rows: 1, on: 0.7, size: 0.012 } });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    k.tower('stone', 0.016, 0.13, { at: [SEPT[0] + Math.cos(a) * 0.13, 0, SEPT[1] + Math.sin(a) * 0.13], seat: 'min', sides: 8, roof: 'spire', roofColor: SLATE[0], color: 0xe6e2d8 });
  }
}

function buildCity(k: ProxyKit): void {
  k.wallPath('stone', WALL, 0.12, 0.045, {
    followGround: true,
    step: 0.04,
    batter: 0.12,
    color: WHITE_WALL,
    shadeJitter: 0.05,
    crenel: { w: 0.018, h: 0.018, gap: 0.014, lod: 0, color: 0xefebe2 },
  });
  WALL.forEach((p, i) => k.tower('stone', 0.04, 0.17, { at: [p[0], 0, p[1]], seat: 'min', sides: 16, roof: 'crenel', color: WHITE_WALL, ...(i % 2 ? {} : { windows: { rows: 1, on: 0.4, size: 0.009 } }) }));
  let lit = 0;
  k.scatter(
    { polygon: CITY },
    1400,
    (i, x, z) => {
      if (k.ground(x, z) < k.seaLevel + 0.06 || slope(k, x, z) > 0.7) return;
      if (Math.hypot(x - CASTLE[0], z - CASTLE[1]) < 0.4 || Math.hypot(x - SEPT[0], z - SEPT[1]) < 0.22 || Math.hypot(x - DEN[0], z - DEN[1]) < 0.32) return;
      // the stair's lane
      const sx = x - S0[0] - SD[0] * 0.17;
      const sz = z - S0[1] - SD[1] * 0.17;
      if (Math.abs(sx * SD[0] + sz * SD[1]) < 0.06) return;
      const yaw = YAW_SHORE + (i % 2) * 90 + (k.r(4000 + i) - 0.5) * 16;
      const big = i % 10 === 0;
      const window = lit < 220 && i % 6 === 1;
      if (window) lit++;
      k.house('plaster', 'slate', big ? 0.15 : 0.08 + 0.05 * k.r(4100 + i), big ? 0.1 : 0.065 + 0.03 * k.r(4200 + i), big ? 0.095 : 0.064 + 0.03 * k.r(4300 + i), {
        at: [x, 0, z],
        rot: [0, yaw, 0],
        roof: big ? 'hip' : 'gable',
        pitch: 38 + 10 * k.r(4400 + i),
        dig: 0.15,
        color: WHITE[i % WHITE.length],
        shade: 0.9 + 0.16 * k.r(4500 + i),
        roofColor: SLATE[i % SLATE.length],
        chimney: i % 5 === 2,
        lod: big ? 1 : 0,
        ...(window ? { windows: { count: 1, on: 1, sides: 1 as const, size: 0.01 } } : {}),
      });
    },
    { minSpacing: 0.095, tries: 14 },
  );
}

export default defineLandmark({
  id: 'white-harbor',
  placeId: 'white-harbor',
  tier: 'B',
  // the waterfront district on a low shelf cut into the shore's slope, the New Castle's hill above it (T: on a
  // hill above the harbour; I: the shelf and the hill's size). Heights local: the origin's ground is 0.76 up.
  stamps: [
    { kind: 'flatten', at: P(0.1, 0.4), radius: 1.0, falloff: 0.9, height: -0.6, lowerOnly: true },
    { kind: 'raise', at: CASTLE, radius: 0.9, amount: 0.22, surface: 'turf' },
  ],
  proxy: (k) => {
    buildWaterfront(k);
    buildWolfsDen(k);
    buildNewCastle(k);
    buildSept(k);
    buildCity(k);
  },
  emitters: [
    { preset: 'smoke', at: [P(-0.2, 0.7)[0], 0.18, P(-0.2, 0.7)[1]], scale: 0.12 },
    { preset: 'smoke', at: [P(0.8, 0.9)[0], 0.22, P(0.8, 0.9)[1]], scale: 0.12 },
  ],
  vegetationExclusion: [{ at: P(0.05, 1.1), r: 2.0 }],
  subjectKm: { at: P(0.0, 0.9), r: 1.2 },
  contrast: 'dark',
  annotation: {
    title: 'White Harbor',
    subtitle: 'Seat of House Manderly',
    blurb: 'The North\'s port where the White Knife meets the Bite: a walled white city climbing to the New Castle, the old Wolf\'s Den at the water, Seal Rock in the bay.',
  },
  bookmarks: [
    {
      id: 'white-harbor-close',
      distanceKm: 5,
      elevationDeg: 13,
      azimuthDeg: 222,
      fov: 32,
      lift: 0.15,
      aimKm: [P(0.05, 0.85)[0], -P(0.05, 0.85)[1]],
      tod: 11,
      note: 'hero: from the water to the south-west in the morning: Seal Rock before the waterfront, the white city climbing to the New Castle on its hill, the Wolf\'s Den at the river mouth, the Sept of the Snows\' dome',
    },
    {
      id: 'white-harbor-wide',
      distanceKm: 30,
      elevationDeg: 20,
      azimuthDeg: 212,
      fov: 34,
      tod: 11,
      note: 'context: White Harbor where the White Knife\'s wide lower course opens into the Bite',
    },
  ],
});
