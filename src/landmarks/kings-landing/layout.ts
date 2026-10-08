import type { V2 } from '../records.ts';

/**
 * King's Landing layout (local km, heading 0: x east, z south; the origin is the city's marker on the
 * westeros-crests sheet). Design scale ≈ ×5 of a plausible real city (the walls ≈ 17 × 13 km): the hills,
 * the Red Keep, the Great Sept and the Dragonpit read in the hero shot at ~30 km and as a pale-walled
 * cluster with a red crown on the bay in context shots.
 *
 * Site (baked terrain, 1 km/px): the Blackwater Rush runs east-north-east just south of the marker and
 * enters Blackwater Bay about 10 km east (ledger kings-landing-river-mouth, blackwater-bay-kings-landing:
 * the city stands on the north bank where the river meets the bay); the bay shore runs north–south at
 * x ≈ 9–10; the ground rises inland to the west.
 *
 * The three hills (ledger kings-landing-three-hills, T): Aegon's High Hill under the Red Keep, Visenya's
 * Hill under the Great Sept, Rhaenys's Hill under the Dragonpit. Their arrangement is label C/I (the
 * companion city map, recalled): the High Hill in the south-east corner above the river mouth — the Red Keep
 * stands directly over the river (kings-landing-red-keep-above-river, T: Sansa climbs down the cliff below
 * it to a boat) and over the bay — Visenya's Hill in the west, Rhaenys's Hill in the north, the low ground
 * between them (Flea Bottom).
 */

/** the Blackwater Rush's centreline near the city (local x, z), from the baked rivers.json */
export const RIVER: V2[] = [
  [-16.0, 5.9],
  [-12.3, 5.5],
  [-8.0, 4.2],
  [-4.4, 3.1],
  [-0.8, 2.0],
  [2.1, 1.2],
  [4.1, 0.4],
  [5.9, -0.9],
  [7.7, -2.3],
  [8.9, -3.2],
  [10.4, -3.4],
];
/** half the baked channel width, km */
export const RIVER_HALF = 0.3;

/** z of the river's centreline at local x (linear along RIVER) */
export function riverZ(x: number): number {
  if (x <= RIVER[0][0]) return RIVER[0][1];
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, az] = RIVER[i];
    const [bx, bz] = RIVER[i + 1];
    if (x <= bx) return az + ((bz - az) * (x - ax)) / (bx - ax);
  }
  return RIVER[RIVER.length - 1][1];
}

/** the hills: centre, flank radius, extra height of the summit over the levelled city ground (km) */
export const HILLS = {
  aegon: { at: [7.2, -4.6] as V2, r: 2.4, raise: 1.7 },
  visenya: { at: [-4.0, -3.4] as V2, r: 2.7, raise: 1.15 },
  rhaenys: { at: [1.6, -8.9] as V2, r: 2.5, raise: 1.0 },
};

/** the scarp line along the river's north bank under the High Hill (west → east: the face looks south over the water) */
export const RIVER_SCARP: V2[] = [5.3, 5.9, 6.5, 7.1, 7.7, 8.3, 8.9, 9.5].map((x): V2 => [x, riverZ(x) - 0.5]);

/** the city's levelled ground, local y (relative to the marker's base ground) */
export const CITY_Y = -0.35;
/** the hilltops' levels (plateau stamps, relative to the marker's base ground): Aegon's the highest */
export const SUMMITS = { aegon: 1.6, visenya: 1.3, rhaenys: 1.1 };
/** the centre of the keep's plateau */
export const KEEP_AT: V2 = [7.25, -4.55];

/**
 * The Red Keep's ward on the High Hill: an irregular hexagon (local x, z), its south face over the river
 * cliff, its east face over the bay. Seven great drum towers stand at its corners and the middle of the
 * long north and south faces (kings-landing-red-keep-towers, T: seven drum towers).
 */
export const KEEP: V2[] = [
  [6.05, -5.35],
  [7.35, -5.75],
  [8.45, -5.25],
  [8.65, -4.2],
  [8.0, -3.55],
  [6.45, -3.65],
  [5.85, -4.4],
];
/** where the seven drum towers stand: the six corners but the south-east one, plus the mid points of the long faces */
export const DRUM_TOWERS: V2[] = [KEEP[0], [6.7, -5.55], KEEP[1], KEEP[2], KEEP[3], KEEP[4], [7.2, -3.6]];

/** Maegor's Holdfast: a square fortress within the keep, ringed by its dry moat (kings-landing-maegors-holdfast, T) */
export const HOLDFAST = { at: [7.55, -4.25] as V2, half: 0.33, moat: 0.12 };
/** the barbican: the keep's gate on its north-west face toward the city (kings-landing-red-keep-towers, T) */
export const BARBICAN = { at: [6.0, -4.95] as V2, yaw: 60 };
/** the throne room (the great hall) north-west of the holdfast (I: placement) */
export const GREAT_HALL = { at: [6.95, -4.75] as V2, w: 0.85, d: 0.3, yaw: 18 };
/** the Tower of the Hand (I: placement; it stands at 298 AC, kings-landing-tower-of-the-hand-burned) */
export const HAND_TOWER: V2 = [6.55, -4.15];
/** the White Sword Tower in the angle of the wall over the bay (I) */
export const WHITE_SWORD: V2 = [8.55, -4.75];

/** the Great Sept of Baelor on Visenya's Hill (kings-landing-great-sept, T): hall centre, the plaza in front */
export const SEPT = { at: [-4.1, -3.6] as V2, r: 0.62, plazaAt: [-3.0, -3.25] as V2, facing: 46 };
/** the Dragonpit on Rhaenys's Hill (kings-landing-dragonpit-ruin, T) */
export const PIT = { at: [1.7, -9.0] as V2, r: 0.82 };

/**
 * The city wall (I: course and stone; the gates' names are T): from the Red Keep's west corner along the
 * river's north bank, round the landward side, down the bay shore to the keep's north-east corner. The
 * keep's own curtain closes the ring on the High Hill.
 */
export const CITY_WALL: V2[] = [
  [5.85, -4.4],
  [5.1, -1.0],
  [3.0, 0.2],
  [0.0, 1.25],
  [-3.0, 2.15],
  [-6.0, 3.1],
  [-8.6, 3.7],
  [-9.3, 0.4],
  [-9.2, -3.6],
  [-8.2, -7.4],
  [-5.6, -10.4],
  [-2.0, -12.3],
  [2.0, -12.8],
  [5.4, -11.9],
  [8.0, -10.2],
  [8.6, -7.6],
  [8.7, -6.2],
  [8.45, -5.25],
];

/** fraction t along a polyline → point */
export function along(path: V2[], t: number): V2 {
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    seg.push(l);
    total += l;
  }
  let d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const u = seg[i] > 0 ? d / seg[i] : 0;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * u, path[i][1] + (path[i + 1][1] - path[i][1]) * u];
    }
    d -= seg[i];
  }
  return path[path.length - 1];
}

/**
 * The seven gates (kings-landing-seven-gates, T: their names; kings-landing-mud-gate, T: the Mud Gate on the
 * riverfront). Positions on the wall are label I: each where a road leaves the city.
 */
export const GATES: { id: string; name: string; t: number }[] = [
  { id: 'mud', name: 'the Mud Gate', t: 0.12 },
  { id: 'old', name: 'the Old Gate', t: 0.3 },
  { id: 'iron', name: 'the Iron Gate', t: 0.38 },
  { id: 'lion', name: 'the Lion Gate', t: 0.5 },
  { id: 'king', name: "the King's Gate", t: 0.61 },
  { id: 'gods', name: 'the Gate of the Gods', t: 0.71 },
  { id: 'dragon', name: 'the Dragon Gate', t: 0.86 },
];

/** point-in-polygon (local x, z) */
export function inside(poly: V2[], x: number, z: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

/** distance from a point to a polyline */
export function distToPath(path: V2[], x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz;
    const u = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - ax - u * dx, z - az - u * dz));
  }
  return best;
}

/** the city's ring (the wall plus the keep's curtain between its north-east and west corners) */
export const CITY_RING: V2[] = [...CITY_WALL, [7.35, -5.75], [6.05, -5.35]];

/** main streets (house-free lanes): from the gates to the hills and the keep (I) */
export function streets(): V2[][] {
  const g = (id: string): V2 => along(CITY_WALL, GATES.find((x) => x.id === id)!.t);
  return [
    [g('mud'), [2.3, -1.6], [5.6, -4.2]],
    [g('old'), [-6.2, -1.5], SEPT.plazaAt],
    [g('iron'), [-6.5, -4.6], SEPT.at],
    [g('lion'), [-3.5, -7.0], [0.5, -5.0]],
    [g('king'), [1.0, -9.6], PIT.at],
    [g('gods'), [3.6, -8.6], [5.4, -6.0], [6.0, -5.0]],
    [g('dragon'), [5.9, -7.4], [5.6, -5.6]],
    [SEPT.plazaAt, [0.5, -5.0], [3.2, -4.6], [5.8, -4.6]],
    [PIT.at, [0.8, -6.5], [0.5, -5.0]],
  ];
}
