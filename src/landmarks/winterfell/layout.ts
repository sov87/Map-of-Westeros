import type { V2 } from '../records.ts';

/**
 * Winterfell layout (local km, heading 0: x east, z south; the origin is the castle's marker). Design scale
 * ≈ ×5, like King's Landing: the inner wall ≈ 2.3 km square.
 *
 * T (ledger): two curtain walls, one inside the other, a moat between them, the inner wall higher — 100 ft
 * against 80 ft (winterfell-walls, -inner-wall-height, -outer-wall-height); grey stone (winterfell-material,
 * I for the rock itself); a sprawling maze of towers, halls and yards that grew like a stone tree
 * (winterfell-layout); the godswood of old forest inside the walls with the weirwood heart tree and its black
 * pool (winterfell-godswood, -godswood-trees, -heart-tree); hot springs warming the castle and its glass
 * gardens (winterfell-hot-springs); the Great Keep, the Great Hall, the Guards Hall, the armory, the kitchens
 * (winterfell-named-buildings); the squat round First Keep with its gargoyles beside the broken tower, whose
 * top third fell in (winterfell-first-keep, -broken-tower); the library tower (winterfell-library-tower); the
 * bell tower and the rookery under the maester's turret (winterfell-bell-tower-rookery); Catelyn's sept
 * (winterfell-sept); the Hunter's Gate (winterfell-hunters-gate); the winter town outside the walls
 * (winterfell-winter-town); whole and lived in at 298 AC (slice-winterfell-intact).
 * I: the plan (winterfell-plan) — every position below.
 */

/** inner and outer curtain: half sides (km), heights (the 100 : 80 ft ratio kept at the design scale) */
export const INNER = { half: 1.15, h: 0.22, t: 0.075 };
export const OUTER = { half: 1.42, h: 0.176, t: 0.065 };
/** the moat between the walls */
export const MOAT = { inner: 1.21, outer: 1.36 };

/** a square ring with chamfered corners (half side `h`, chamfer `c`), walked clockwise on the map from the north-west */
export function squareRing(h: number, c: number): V2[] {
  return [
    [-h + c, -h],
    [h - c, -h],
    [h, -h + c],
    [h, h - c],
    [h - c, h],
    [-h + c, h],
    [-h, h - c],
    [-h, -h + c],
  ];
}

/** gates: the main gate east toward the kingsroad and the winter town, the Hunter's Gate west toward the wolfswood */
export const MAIN_GATE_Z = 0.15;
export const HUNTERS_GATE_Z = -0.35;

/** the godswood: the inner ward's west part (I: where; T: old forest inside the walls) */
export const GODSWOOD: V2[] = [
  [-1.08, -0.92],
  [-0.38, -0.98],
  [-0.3, -0.45],
  [-0.42, 0.1],
  [-0.36, 0.55],
  [-1.08, 0.62],
];
/** the heart tree and its black pool; the hot spring pools in the wood */
export const HEART_TREE: V2 = [-0.72, -0.2];
export const BLACK_POOL: V2 = [-0.6, -0.12];
export const HOT_POOLS: V2[] = [
  [-0.9, 0.3],
  [-0.55, 0.42],
  [-0.95, -0.6],
];

/** the keeps and halls (x, z, w, d, yaw°, wall height) */
export const GREAT_KEEP = { at: [0.2, -0.32] as V2, w: 0.52, d: 0.34, h: 0.34 };
export const GREAT_HALL = { at: [0.28, 0.2] as V2, w: 0.6, d: 0.22, h: 0.2 };
export const HALLS: { id: string; at: V2; w: number; d: number; h: number; yaw: number }[] = [
  { id: 'guards-hall', at: [0.82, 0.32], w: 0.36, d: 0.16, h: 0.15, yaw: 90 },
  { id: 'armory', at: [0.8, -0.18], w: 0.3, d: 0.15, h: 0.14, yaw: 90 },
  { id: 'kitchens', at: [0.55, 0.62], w: 0.32, d: 0.17, h: 0.13, yaw: 0 },
  { id: 'stables', at: [0.98, 0.72], w: 0.34, d: 0.12, h: 0.1, yaw: 90 },
  { id: 'smithy', at: [-0.05, 0.6], w: 0.18, d: 0.13, h: 0.1, yaw: 12 },
];
/** the First Keep (squat, round, gargoyles) beside the broken tower, in the north of the ward */
export const FIRST_KEEP = { at: [-0.12, -0.78] as V2, r: 0.17, h: 0.3 };
export const BROKEN_TOWER = { at: [0.2, -0.86] as V2, r: 0.085, h: 0.66 };
/** the other named towers (x, z, r, h) */
export const TOWERS: { id: string; at: V2; r: number; h: number }[] = [
  { id: 'library', at: [0.88, -0.72], r: 0.08, h: 0.46 },
  { id: 'bell', at: [0.52, -0.88], r: 0.07, h: 0.52 },
  { id: 'maesters-turret', at: [0.95, 0.12], r: 0.07, h: 0.42 },
];
/** Catelyn's sept, small, seven-sided (I: where) */
export const SEPT = { at: [-0.12, 0.88] as V2, r: 0.11 };
/** the glass gardens: long glasshouses along the south of the ward, warmed by the springs */
export const GLASS: { at: V2; w: number; d: number }[] = [
  { at: [0.25, 0.94], w: 0.42, d: 0.1 },
  { at: [0.66, 0.9], w: 0.32, d: 0.1 },
  { at: [0.42, 0.99], w: 0.5, d: 0.06 },
];

/** the winter town: east of the main gate along the road (I: where), half empty in summer */
export const TOWN = { from: 1.7, to: 3.6, halfWidth: 1.1 };
