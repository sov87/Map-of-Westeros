import type { V2 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * Greywater Watch at 298 AC (ledger ids per part in canon.json). T: the Reeds' seat in the Neck
 * (greywater-watch-position), said to move through the swamps so that no outsider or raven finds it unless the
 * crannogmen lead them (greywater-watch-moves, greywater-watch-crannogmen). I: it is NOT modelled as a fixed
 * castle (greywater-watch-no-model, -map-point): the landmark is the setting only, a mire of black water,
 * reeds and drowned trees under mist round the sheet's nominal point (greywater-watch-setting,
 * the-neck-vegetation).
 *
 * Local frame: x east, z south, origin at the sheet's nominal point in the Neck's interior, away from the
 * causeway. The synthesized ground is flat (~4.8); a shallow mire is sunk into it.
 */

/** the mire's water (local y: the origin's ground after the stamp, the mire's floor) */
const WATER_Y = 0.03;

/** an irregular pond outline (deterministic) */
function blob(at: V2, r: number, seed: number, grow = 1): V2[] {
  const n = 22;
  const ph = ((seed * 0.618) % 1) * 6.283;
  return Array.from({ length: n }, (_, j): V2 => {
    const a = (j / n) * Math.PI * 2;
    const w = grow * (0.8 + 0.16 * Math.sin(2 * a + ph) + 0.1 * Math.sin(3 * a + 2 * ph) + 0.07 * Math.sin(7 * a + seed));
    return [at[0] + Math.cos(a) * r * w, at[1] + Math.sin(a) * r * w * 0.85];
  });
}

/** the black pools of the mire (I): a scatter by a fixed golden-angle spiral, larger toward the middle */
const POOLS: [V2, number][] = Array.from({ length: 22 }, (_, i): [V2, number] => {
  const a = i * 2.39996;
  const r = 0.25 + 1.75 * Math.sqrt(i / 22);
  return [[Math.cos(a) * r, Math.sin(a) * r], 0.34 - 0.1 * Math.sqrt(i / 22)];
});

export default defineLandmark({
  id: 'greywater-watch',
  placeId: 'greywater-watch',
  tier: 'B',
  // the mire: the flat ground sunk into a shallow floor, never raised (I)
  stamps: [{ kind: 'flatten', at: [0, 0], radius: 2.3, falloff: 1.2, height: -0.12, lowerOnly: true }],
  proxy: (k) => {
    // the mire's floor: one sheet of moss and reed beds over the whole sunk ground, open over the pools (I)
    k.drape('weathered', blob([0, 0], 2.55, 3), { step: 0.03, lift: 0.006, color: 0x3d4130, lod: 1, holes: POOLS.map(([at, r], i) => blob(at, r, 7 + i * 11, 0.78)) });
    // drowned trunks standing in the water (I)
    POOLS.forEach(([at, r], i) => {
      if (i % 3) return;
      for (let j = 0; j < 2; j++) {
        const a = k.r(50 + i * 4 + j) * 6.283;
        const d = r * (0.3 + 0.4 * k.r(60 + i * 4 + j));
        k.cylinder('wood', 0.004, 0.007, 0.05 + 0.04 * k.r(70 + i * 4 + j), { at: [at[0] + Math.cos(a) * d, WATER_Y - 0.02, at[1] + Math.sin(a) * d], seg: 5, rot: [(k.r(80 + i) - 0.5) * 30, 0, (k.r(90 + i) - 0.5) * 30], color: 0x2e2a24, lod: 0 });
      }
    });
  },
  waterFeatures: POOLS.map(([at, r], i) => ({ kind: 'pool' as const, ring: blob(at, r, 7 + i * 11), level: WATER_Y })),
  trees: POOLS.flatMap(([at, r], i) =>
    [0, 1, 2, 3, 4, 5, 6].map((j) => {
      const a = (j / 7) * Math.PI * 2 + i * 0.7;
      const kind = (j % 3 === 0 ? 'scrub' : 'willow') as 'willow' | 'scrub';
      return { at: [at[0] + Math.cos(a) * (r + 0.06 + 0.05 * (j % 2)), at[1] + Math.sin(a) * (r + 0.06 + 0.04 * (j % 2))] as V2, kind, crownKm: kind === 'willow' ? 0.06 : 0.03, color: kind === 'willow' ? 0x3f4a33 : 0x4f5436 };
    }),
  ),
  emitters: [
    { preset: 'mist', at: [0, WATER_Y + 0.02, 0], scale: 2.0, rate: 0.7 },
    { preset: 'mist', at: [-1.1, WATER_Y + 0.02, 0.6], scale: 1.5, rate: 0.6 },
    { preset: 'mist', at: [1.0, WATER_Y + 0.02, -0.7], scale: 1.5, rate: 0.6 },
    { preset: 'mist', at: [0.6, WATER_Y + 0.02, 1.2], scale: 1.5, rate: 0.6 },
    { preset: 'mist', at: [-0.8, WATER_Y + 0.02, -1.1], scale: 1.5, rate: 0.6 },
  ],
  subjectKm: { at: [0, 0], r: 1.4 },
  contrast: 'light',
  annotation: {
    title: 'Greywater Watch',
    subtitle: 'Seat of House Reed',
    blurb: 'Somewhere in the Neck\'s black water and mist: the Reeds\' castle is said to move, and none find it unless the crannogmen lead them.',
  },
  bookmarks: [
    {
      id: 'greywater-watch-close',
      distanceKm: 3.2,
      elevationDeg: 11,
      azimuthDeg: 35,
      fov: 32,
      lift: 0.05,
      aimKm: [0, 0],
      tod: 7.5,
      weather: { cloudCoverage: 0.9 },
      note: 'hero: low over the mire at dawn: black pools, reeds and drowned trees fading into mist — no castle shown, the Watch is somewhere within',
    },
    {
      id: 'greywater-watch-wide',
      distanceKm: 30,
      elevationDeg: 22,
      azimuthDeg: 30,
      fov: 34,
      tod: 7.5,
      weather: { cloudCoverage: 0.85 },
      note: 'context: the Neck\'s interior between the Bite and the western bay, the causeway far to the east',
    },
  ],
});
