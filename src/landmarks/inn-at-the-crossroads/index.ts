import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * The Inn at the Crossroads at 298 AC (ledger ids per part in canon.json). T: an inn on the kingsroad in the
 * riverlands at the crossroads where the river road from the west meets it (inn-at-the-crossroads-position,
 * kingsroad-crossroads, river-road-course), kept by Masha Heddle, its common room big enough for many
 * travellers and several lords' men at once (inn-at-the-crossroads-keeper). I: the high road to the Vale
 * branching east at the same crossroads (inn-at-the-crossroads-high-road); the buildings, their size and
 * stone (inn-at-the-crossroads-plan). Later states (Tywin's camp, the orphans and Gendry's forge) are ignored.
 *
 * Local frame: x east, z south, origin at the sheet's marker on the kingsroad; the ground is a flat plain.
 */

const STONE = 0x9a948a;
const PLASTER = 0xd9d0bd;
const TIMBER = 0x5a4632;
const THATCH = 0x8d7b55;
const SLATE = 0x56565a;

/** the roads (I: their lines near the inn): the kingsroad north-north-west to south-south-east through the
 * crossroads, the river road in from the west, the high road out to the east-north-east */
const KINGSROAD: V2 = [0.56, 0.83];
const ROADS: [V2, V2][] = [
  [[-KINGSROAD[0] * 6, -KINGSROAD[1] * 6], [KINGSROAD[0] * 6, KINGSROAD[1] * 6]],
  [[-6, 0.3], [0, 0]],
  [[0, 0], [5.2, -3.0]],
];

function road(k: ProxyKit, a: V2, b: V2, w: number): void {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const L = Math.hypot(dx, dz);
  const n: V2 = [(-dz / L) * w, (dx / L) * w];
  k.drape('weathered', [
    [a[0] + n[0], a[1] + n[1]],
    [b[0] + n[0], b[1] + n[1]],
    [b[0] - n[0], b[1] - n[1]],
    [a[0] - n[0], a[1] - n[1]],
  ], { step: 0.012, lift: 0.02, color: 0x857a66, lod: 1 });
}

function buildInn(k: ProxyKit): void {
  // the inn on the crossroads' north-east corner, its yard between the roads (I)
  const C: V2 = [0.28, -0.12];
  const yaw = -Math.atan2(KINGSROAD[1], KINGSROAD[0]) * (180 / Math.PI);
  // the main house: a long two-storey hall with the common room, stone below and whitewashed above (I)
  k.house('stone', 'slate', 0.24, 0.1, 0.12, { at: [C[0], 0, C[1]], rot: [0, yaw, 0], roof: 'gable', pitch: 40, dig: 0.2, color: PLASTER, roofColor: SLATE, chimney: true, plinthColor: STONE, windows: { count: 6, on: 0.8, sides: 2, size: 0.011 } });
  // a wing behind it, the stables and a smithy across the yard (I)
  k.house('stone', 'slate', 0.14, 0.08, 0.1, { at: [C[0] + 0.16, 0, C[1] - 0.13], rot: [0, yaw + 90, 0], roof: 'gable', pitch: 40, dig: 0.2, color: PLASTER, roofColor: SLATE, windows: { count: 2, on: 0.6, sides: 2, size: 0.01 } });
  k.house('wood', 'thatch', 0.26, 0.07, 0.07, { at: [C[0] + 0.38, 0, C[1] + 0.08], rot: [0, yaw, 0], roof: 'gable', pitch: 42, dig: 0.2, color: TIMBER, roofColor: THATCH });
  k.house('stone', 'thatch', 0.07, 0.06, 0.065, { at: [C[0] + 0.12, 0, C[1] + 0.22], rot: [0, yaw + 90, 0], roof: 'gable', pitch: 38, dig: 0.2, color: STONE, roofColor: THATCH, chimney: true });
  // the yard: trodden earth inside a low stone wall, a well (I)
  const yard: V2[] = [
    [C[0] - 0.12, C[1] + 0.14],
    [C[0] + 0.32, C[1] - 0.2],
    [C[0] + 0.58, C[1] + 0.16],
    [C[0] + 0.14, C[1] + 0.48],
  ];
  k.drape('weathered', yard, { step: 0.02, lift: 0.012, color: 0x7d6f58, lod: 1 });
  k.wallPath('stone', [yard[1], yard[2], yard[3]], 0.03, 0.015, { followGround: true, step: 0.03, color: STONE });
  k.cylinder('stone', 0.012, 0.012, 0.02, { at: [C[0] + 0.24, k.ground(C[0] + 0.24, C[1] + 0.16), C[1] + 0.16], seg: 10, color: STONE, lod: 0 });
  k.light([C[0] - 0.06, k.ground(C[0], C[1]) + 0.06, C[1] + 0.03], { color: 0xffb35a, intensity: 0.7, radius: 0.012, kind: 'lamp' });
}

export default defineLandmark({
  id: 'inn-at-the-crossroads',
  placeId: 'inn-at-the-crossroads',
  tier: 'B',
  proxy: (k) => {
    for (const [a, b] of ROADS) road(k, a, b, 0.03);
    buildInn(k);
  },
  emitters: [{ preset: 'smoke', at: [0.28, 0.16, -0.12], scale: 0.08 }],
  vegetationExclusion: [{ at: [0.4, 0.0], r: 0.6 }],
  subjectKm: { at: [0.4, 0.0], r: 0.4 },
  contrast: 'dark',
  annotation: {
    title: 'The Inn at the Crossroads',
    subtitle: 'Kept by Masha Heddle',
    blurb: 'Where the river road meets the kingsroad in the riverlands: an inn whose common room holds lords, their men and travellers alike.',
  },
  bookmarks: [
    {
      id: 'inn-at-the-crossroads-close',
      distanceKm: 1.6,
      elevationDeg: 16,
      azimuthDeg: 205,
      fov: 32,
      lift: 0.04,
      aimKm: [0.35, 0.05],
      tod: 18.2,
      note: 'hero: from the south-south-west at dusk: the inn\'s lit windows on the crossroads, the kingsroad running north past it, the river road and the high road branching off',
    },
    {
      id: 'inn-at-the-crossroads-wide',
      distanceKm: 18,
      elevationDeg: 20,
      azimuthDeg: 200,
      fov: 34,
      tod: 18.0,
      note: 'context: the crossroads north of the Trident in the riverlands, the roads running off to Riverrun, King\'s Landing and the Vale',
    },
  ],
});
