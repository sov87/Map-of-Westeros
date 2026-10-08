import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2, V3 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * Riverrun at 298 AC (ledger ids per part in canon.json). T: where the Tumblestone flows into the Red Fork, in
 * the angle between the rivers (riverrun-confluence); walls rising straight out of the rivers on two sides, a
 * deep moat on the third that sluice gates flood to make the castle an island (riverrun-moat-island); a Water
 * Gate letting boats out of the castle onto the river (riverrun-water-gate); the Wheel Tower and its great
 * waterwheel turned by the river (riverrun-wheel-tower); a light, airy godswood of tall redwoods
 * (riverrun-godswood); Lord Hoster Tully's seat (riverrun-tully-seat). I: the plan, the stone, which face
 * holds the moat, the Wheel Tower and the Water Gate (riverrun-plan, riverrun-moat-side).
 *
 * Local frame: x east, z south, origin on the confluence's point (the place sits on the drawn confluence: a
 * display offset off the sheet's marker, riverrun-confluence); local y = 0 is the rivers' water (anchor
 * 'water'). The baked rivers come in from the west-north-west (the Tumblestone) and the south (the Red Fork),
 * their ribbons 1.2 km wide over a floodplain at the water's level; the castle fills the dry point between the
 * two ribbons, its walls standing just inside the water.
 */

const SAND = 0xa48770;
const SAND_LIT = 0xb59a80;
const SLATE = 0x4d5560;
const WARD = 0x7b705f;
const TIMBER = 0x5a4632;
/** the moat's and the basin's water (local y): a hair under the rivers' ribbons where they overlap */
const LEVEL = -0.005;

/** the curtain's outline: the point, the Tumblestone face (west-north-west), the moat face, the Red Fork face */
const A: V2 = [-0.06, -0.04];
const T_FACE: V2[] = [A, [-0.357, -0.257], [-0.567, -0.387], [-0.785, -0.532]];
const B = T_FACE[T_FACE.length - 1];
const C: V2 = [-0.36, 0.83];
const R_FACE: V2[] = [C, [-0.288, 0.586], [-0.204, 0.303], A];
const OUTLINE: V2[] = [...T_FACE, ...R_FACE.slice(0, -1)];
const CENTRE: V2 = [-0.4, 0.09];

const WALL = { h: 0.24, t: 0.07 };

const DEG = Math.PI / 180;
const add = (p: V2, q: V2, s = 1): V2 => [p[0] + q[0] * s, p[1] + q[1] * s];
const unit = (a: V2, b: V2): V2 => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
};
const mid = (a: V2, b: V2): V2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
/** the right-hand normal of a direction (x east, z south: east → south) */
const right = (d: V2): V2 => [-d[1], d[0]];
/** yaw (deg) that turns a part's +x axis along a direction */
const yawOf = (d: V2): number => -Math.atan2(d[1], d[0]) / DEG;
/** rot that stands a +y-axis part (ring, cylinder) on its side with its axis along a horizontal direction */
const axisRot = (n: V2): V3 => [0, Math.atan2(n[1], -n[0]) / DEG, 90];

/** the moat face: B → C, and its outward normal (west-south-west, away from the castle) */
const D_M = unit(B, C);
const OUT_M = right(D_M);
const GATE = mid(B, C);

/** the Wheel Tower on the Tumblestone face, its wheel on the river side (I) */
const W_FACE = unit(T_FACE[1], T_FACE[2]);
const W_OUT = right(W_FACE);
const WHEEL_TOWER = mid(T_FACE[1], T_FACE[2]);

/** the Water Gate on the Red Fork face, the inner basin behind it (I) */
const G_FACE = unit(R_FACE[1], R_FACE[2]);
const G_OUT = right(G_FACE);
const WATER_GATE = mid(R_FACE[1], R_FACE[2]);
const BASIN: V2[] = [
  add(add(WATER_GATE, G_FACE, 0.07), G_OUT, -0.04),
  add(add(WATER_GATE, G_FACE, -0.07), G_OUT, -0.04),
  add(add(WATER_GATE, G_FACE, -0.07), G_OUT, -0.15),
  add(add(WATER_GATE, G_FACE, 0.07), G_OUT, -0.15),
];

/** the moat (T: dug, flooded through sluice gates): a band outside the moat face, its ends in both rivers */
const MOAT_A = add(B, D_M, -0.15);
const MOAT_B = add(C, D_M, 0.2);
const MOAT: V2[] = [add(MOAT_A, OUT_M, 0.03), add(MOAT_B, OUT_M, 0.03), add(MOAT_B, OUT_M, 0.15), add(MOAT_A, OUT_M, 0.15)];

function buildCurtain(k: ProxyKit): void {
  k.wallPath('stone', OUTLINE, WALL.h, WALL.t, {
    followGround: true,
    closed: true,
    step: 0.05,
    batter: 0.15,
    color: SAND,
    shadeJitter: 0.05,
    crenel: { w: 0.022, h: 0.024, gap: 0.016, lod: 0, color: SAND_LIT },
  });
  // the great drum tower on the point, facing the confluence; corner and interval towers (I)
  const towers: [V2, number, number][] = [
    [A, 0.085, 0.38],
    [B, 0.065, 0.32],
    [C, 0.065, 0.32],
    [T_FACE[2], 0.05, 0.28],
    [R_FACE[1], 0.05, 0.28],
    [add(B, D_M, 0.28), 0.048, 0.28],
    [add(B, D_M, 1.1), 0.048, 0.28],
  ];
  for (const [i, [p, r, h]] of towers.entries()) {
    k.tower('stone', r, h, { at: [p[0], 0, p[1]], seat: 'min', sides: 16, roof: 'crenel', color: i ? SAND : SAND_LIT, windows: { rows: i ? 2 : 3, on: 0.4, size: 0.011 } });
  }
  // the main gate on the moat face: twin drum towers, the passage, a drawbridge over the moat (I)
  for (const s of [-1, 1]) {
    const p = add(GATE, D_M, 0.07 * s);
    k.tower('stone', 0.05, 0.31, { at: [p[0], 0, p[1]], seat: 'min', sides: 16, roof: 'crenel', color: SAND_LIT, windows: { rows: 2, on: 0.4, size: 0.011 } });
  }
  const yawM = yawOf(OUT_M);
  const gp = add(GATE, OUT_M, 0.03);
  k.box('darkStone', 0.04, 0.09, 0.07, { at: [gp[0], k.ground(GATE[0], GATE[1]), gp[1]], rot: [0, yawM, 0], color: 0x2a2622 });
  const db = add(GATE, OUT_M, 0.1);
  k.box('wood', 0.15, 0.01, 0.045, { at: [db[0], LEVEL + 0.022, db[1]], rot: [0, yawM, 0], color: TIMBER, lod: 0 });
  k.light([gp[0], k.ground(gp[0], gp[1]) + 0.1, gp[1]], { color: 0xffb35a, intensity: 0.9, radius: 0.018, kind: 'fire', flicker: 0.3 });
}

/** the moat's outer revetment and the sluice gates at both ends, where it opens into the rivers (I) */
function buildMoat(k: ProxyKit): void {
  const rev: V2[] = [add(add(B, D_M, -0.05), OUT_M, 0.165), add(add(C, D_M, 0.1), OUT_M, 0.165)];
  k.wallPath('stone', rev, 0.08, 0.025, { followGround: true, step: 0.05, color: SAND, shadeJitter: 0.05 });
  const yawM = yawOf(OUT_M);
  for (const e of [add(B, D_M, -0.06), add(C, D_M, 0.09)]) {
    for (const o of [0.03, 0.15]) {
      const p = add(e, OUT_M, o);
      k.box('stone', 0.03, 0.1, 0.03, { at: [p[0], k.ground(p[0], p[1]) - 0.02, p[1]], rot: [0, yawM, 0], color: SAND_LIT });
    }
    const g = add(e, OUT_M, 0.09);
    k.box('wood', 0.12, 0.05, 0.012, { at: [g[0], LEVEL - 0.01, g[1]], rot: [0, yawM, 0], color: TIMBER });
    k.box('wood', 0.13, 0.012, 0.02, { at: [g[0], LEVEL + 0.055, g[1]], rot: [0, yawM, 0], color: TIMBER, lod: 0 });
  }
}

/** the Wheel Tower (T) on the Tumblestone face and its great waterwheel turned by the river (I: the form) */
function buildWheelTower(k: ProxyKit): void {
  const W = WHEEL_TOWER;
  k.tower('stone', 0.085, 0.36, { at: [W[0], 0, W[1]], seat: 'min', sides: 4, roof: 'crenel', color: SAND_LIT, rot: [0, yawOf(W_FACE) + 45, 0], windows: { rows: 3, on: 0.45, size: 0.012 } });
  const yc = LEVEL + 0.025;
  const rot = axisRot(W_OUT);
  const base = add(W, W_OUT, 0.062);
  k.ring('wood', 0.058, 0.008, 0.034, { at: [base[0], yc, base[1]], rot, color: TIMBER, seg: 24 });
  k.cylinder('wood', 0.011, 0.011, 0.05, { at: [base[0] - W_OUT[0] * 0.008, yc, base[1] - W_OUT[1] * 0.008], rot, color: 0x3e3226, seg: 8 });
  const c = add(W, W_OUT, 0.079);
  const yawF = yawOf(W_FACE);
  for (let i = 0; i < 12; i++) {
    const a = i * 30;
    const rad: V2 = [Math.cos(a * DEG), Math.sin(a * DEG)];
    const at: V3 = [c[0] + W_FACE[0] * rad[0] * 0.04, yc + rad[1] * 0.04, c[1] + W_FACE[1] * rad[0] * 0.04];
    k.box('wood', 0.006, 0.026, 0.036, { at, rot: [0, yawF, a - 90], color: TIMBER, lod: 0 });
  }
  for (let s = 0; s < 4; s++) {
    const phi = s * 45;
    const dir: V2 = [-Math.sin(phi * DEG), Math.cos(phi * DEG)];
    k.box('wood', 0.005, 0.11, 0.008, { at: [c[0] - W_FACE[0] * dir[0] * 0.055, yc - dir[1] * 0.055, c[1] - W_FACE[1] * dir[0] * 0.055], rot: [0, yawF, phi], color: 0x3e3226, lod: 0 });
  }
}

/** the Water Gate (T) on the Red Fork face: an arch at the water, two gate towers, the basin behind (I) */
function buildWaterGate(k: ProxyKit): void {
  const G = WATER_GATE;
  const yaw = yawOf(G_FACE);
  k.box('darkStone', 0.085, 0.085, 0.1, { at: [G[0], LEVEL - 0.02, G[1]], rot: [0, yaw, 0], color: 0x1f1d1b });
  k.box('stone', 0.11, 0.03, 0.1, { at: [G[0], LEVEL + 0.065, G[1]], rot: [0, yaw, 0], color: SAND_LIT });
  for (const s of [-1, 1]) {
    const p = add(G, G_FACE, 0.085 * s);
    k.tower('stone', 0.05, 0.3, { at: [p[0], 0, p[1]], seat: 'min', sides: 4, roof: 'crenel', color: SAND_LIT, rot: [0, yaw + 45, 0], windows: { rows: 2, on: 0.4, size: 0.011 } });
  }
  // the basin's stone kerb (its water is the basin pool), a boat moored in it
  k.wallPath('stone', BASIN, 0.07, 0.02, { followGround: true, closed: true, step: 0.04, color: SAND });
  const bc: V2 = [(BASIN[0][0] + BASIN[2][0]) / 2, (BASIN[0][1] + BASIN[2][1]) / 2];
  k.box('wood', 0.022, 0.014, 0.075, { at: [bc[0], LEVEL - 0.004, bc[1]], rot: [0, yaw + 90, 0], color: 0x4a3a2a, lod: 0 });
  k.light([G[0] - G_OUT[0] * 0.05, LEVEL + 0.09, G[1] - G_OUT[1] * 0.05], { color: 0xffc070, intensity: 0.6, radius: 0.012, kind: 'lamp' });
}

function buildWard(k: ProxyKit): void {
  // the ward: packed earth and cobbles inside the curtain, open over the basin
  const inset = OUTLINE.map(([x, z]): V2 => [CENTRE[0] + (x - CENTRE[0]) * 0.93, CENTRE[1] + (z - CENTRE[1]) * 0.93]);
  k.drape('weathered', inset, { step: 0.04, lift: 0.01, color: WARD, lod: 1, holes: [BASIN] });
  // the great keep near the point (I): Lord Hoster's seat
  k.tower('stone', 0.1, 0.48, { at: [-0.25, 0, 0.04], seat: 'min', sides: 4, roof: 'crenel', color: SAND_LIT, rot: [0, 45 + yawOf(unit(A, C)), 0], windows: { rows: 5, on: 0.5, size: 0.013 } });
  k.tower('stone', 0.032, 0.56, { at: [-0.2, 0, -0.01], seat: 'min', sides: 12, roof: 'cone', roofColor: SLATE, color: SAND });
  // the great hall along the Tumblestone face, the sept, kitchens and stables (I)
  const yT = yawOf(W_FACE);
  k.house('stone', 'slate', 0.24, 0.1, 0.11, { at: [-0.42, 0, -0.15], rot: [0, yT, 0], roof: 'gable', pitch: 36, dig: 0.3, color: SAND, roofColor: SLATE, windows: { count: 4, on: 0.5, sides: 2, size: 0.012 } });
  k.house('stone', 'slate', 0.09, 0.06, 0.08, { at: [-0.48, 0, 0.06], rot: [0, yawOf(D_M), 0], roof: 'gable', pitch: 40, dig: 0.3, color: SAND_LIT, roofColor: SLATE, windows: { count: 2, on: 0.6, sides: 2, size: 0.01 } });
  k.tower('stone', 0.022, 0.15, { at: [-0.44, 0, 0.06], seat: 'min', sides: 7, roof: 'spire', roofColor: SLATE, color: SAND_LIT });
  k.house('stone', 'slate', 0.1, 0.06, 0.07, { at: [-0.55, 0, -0.08], rot: [0, yawOf(D_M), 0], roof: 'gable', pitch: 36, dig: 0.3, color: SAND, roofColor: SLATE });
  k.house('stone', 'slate', 0.07, 0.05, 0.065, { at: [-0.62, 0, -0.27], rot: [0, yawOf(D_M), 0], roof: 'gable', pitch: 36, dig: 0.3, color: SAND, roofColor: SLATE });
}

export default defineLandmark({
  id: 'riverrun',
  placeId: 'riverrun',
  tier: 'A',
  anchor: 'water',
  // the point's ground cut down to the floodplain under the castle and the moat, never raised (I)
  stamps: [{ kind: 'flatten', at: CENTRE, radius: 1.0, falloff: 0.6, height: -0.015, lowerOnly: true }],
  proxy: (k) => {
    buildWard(k);
    buildCurtain(k);
    buildMoat(k);
    buildWheelTower(k);
    buildWaterGate(k);
    // the approach from the drawbridge across the floodplain (I)
    const r0 = add(GATE, OUT_M, 0.18);
    const r1 = add(GATE, OUT_M, 0.85);
    const w: V2 = [D_M[0] * 0.025, D_M[1] * 0.025];
    k.drape('weathered', [add(r0, w), add(r1, w), add(r1, w, -1), add(r0, w, -1)], { step: 0.05, lift: 0.03, color: 0x857660, lod: 1 });
  },
  // the godswood (T): tall redwoods in the ward's widest part (I: the place)
  trees: Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    const r = i === 0 ? 0 : 0.06 + 0.02 * (i % 2);
    return { at: [-0.36 + Math.cos(a) * r, 0.24 + Math.sin(a) * r] as V2, kind: 'conifer' as const, crownKm: 0.028, heightKm: 0.17 + 0.02 * (i % 3), color: 0x3f5a34 };
  }),
  waterFeatures: [
    { kind: 'pool', ring: MOAT, level: LEVEL },
    { kind: 'pool', ring: BASIN, level: LEVEL },
  ],
  vegetationExclusion: [
    { at: CENTRE, r: 0.75 },
    { at: add(GATE, OUT_M, 0.5), r: 0.35 },
  ],
  subjectKm: { at: CENTRE, r: 0.7 },
  contrast: 'dark',
  annotation: {
    title: 'Riverrun',
    subtitle: 'Seat of House Tully',
    blurb: 'Where the Tumblestone meets the Red Fork: walls rising from the rivers on two sides, and a moat on the third that makes the castle an island.',
  },
  bookmarks: [
    {
      id: 'riverrun-close',
      distanceKm: 4.5,
      elevationDeg: 28,
      azimuthDeg: 140,
      fov: 30,
      lift: 0.1,
      aimKm: [CENTRE[0], -CENTRE[1]],
      tod: 9.5,
      note: 'hero: from up the Red Fork in the morning: the castle in the point where the Tumblestone joins the Red Fork, the walls rising from both rivers, the Water Gate on the near face, the Wheel Tower and its waterwheel on the far one, the moat on the left',
    },
    {
      id: 'riverrun-wide',
      distanceKm: 35,
      elevationDeg: 20,
      azimuthDeg: 70,
      fov: 34,
      tod: 10.0,
      note: 'context: Riverrun at the meeting of the Tumblestone and the Red Fork in the western riverlands, the hills of the westerlands beyond',
    },
  ],
});
