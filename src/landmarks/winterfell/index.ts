import type { V2 } from '../records.ts';
import { defineLandmark } from '../types.ts';
import { buildKeeps, buildTown, buildWalls, buildYards } from './castle.ts';
import { BLACK_POOL, GODSWOOD, HEART_TREE, HOT_POOLS, MAIN_GATE_Z } from './layout.ts';

/**
 * Winterfell at 298 AC, from the books (ledger ids per part in canon.json; layout and scale in layout.ts): the
 * seat of House Stark in the heart of the North, beside the kingsroad with the wolfswood to the west. Grey
 * stone walls, one inside the other with a moat between, the inner the higher; inside them a maze of keeps,
 * halls, towers and yards round the godswood — old forest with a weirwood heart tree and a black pool — the
 * squat First Keep beside the broken tower, the glass gardens warmed by the hot springs whose steam drifts
 * over the wood; the winter town outside the main gate, half empty in summer.
 *
 * Stamps: the castle's site levelled (the baked ground here falls ~1 km per 3 km to the south-west), the
 * winter town's ground eased toward it.
 */
export default defineLandmark({
  id: 'winterfell',
  placeId: 'winterfell',
  tier: 'A',
  stamps: [
    { kind: 'flatten', at: [0.1, 0], radius: 2.0, falloff: 1.6, height: 'auto', strength: 0.95, surface: 'turf' },
    { kind: 'flatten', at: [2.7, MAIN_GATE_Z], radius: 1.3, falloff: 1.2, height: 'auto', strength: 0.7 },
  ],
  proxy: (k) => {
    buildWalls(k);
    buildYards(k);
    buildKeeps(k);
    buildTown(k);
    // the black pool beside the heart tree, the hot springs' pools: still dark water in the wood (I: their look)
    const pool = (c: V2, r: number, color: number): void => {
      const ring: V2[] = Array.from({ length: 12 }, (_, i): V2 => [c[0] + Math.cos((i * Math.PI) / 6) * r, c[1] + Math.sin((i * Math.PI) / 6) * r * 0.75]);
      k.drape('obsidian', ring, { step: 0.02, lift: 0.006, color, lod: 0 });
    };
    pool(BLACK_POOL, 0.055, 0x14181a);
    for (const p of HOT_POOLS) pool(p, 0.04, 0x3e5552);
  },
  // the godswood: old forest of sentinels, oaks and ironwoods crowded close (T), its heart tree clear
  forests: [
    {
      area: { polygon: GODSWOOD },
      density: 520,
      species: [
        { kind: 'conifer', share: 0.45, crownKm: [0.022, 0.034], colors: [0x34463a, 0x2e3f35, 0x3a4a3e] },
        { kind: 'oak', share: 0.3, crownKm: [0.03, 0.045], colors: [0x4a5a32, 0x55633a] },
        { kind: 'conifer', share: 0.25, crownKm: [0.025, 0.04], heightFactor: [3.2, 4.2], colors: [0x263428, 0x2a3a2e] },
      ],
      clump: { scaleKm: 0.25, amount: 0.25 },
      edgeKm: 0.04,
      avoid: [
        { at: HEART_TREE, r: 0.11 },
        { at: BLACK_POOL, r: 0.08 },
        ...HOT_POOLS.map((at) => ({ at, r: 0.06 })),
      ],
    },
  ],
  // the heart tree: an ancient weirwood, bone-white bark, dark red leaves (T)
  trees: [{ at: HEART_TREE, kind: 'autumn', crownKm: 0.07, heightKm: 0.11, color: 0x7d1d1a }],
  // steam off the hot springs, drifting over the godswood (T: the springs; I: where they rise)
  emitters: HOT_POOLS.map((p) => ({ preset: 'steam' as const, at: [p[0], 0.02, p[1]] as [number, number, number], rate: 0.6, scale: 0.6 })),
  vegetationExclusion: [
    { at: [0, 0], r: 1.6 },
    { at: [2.7, MAIN_GATE_Z], r: 1.3 },
  ],
  contrast: 'light',
  annotation: {
    title: 'Winterfell',
    subtitle: 'Seat of House Stark',
    blurb: 'Grey walls within walls round an ancient godswood, the castle warmed by hot springs in the heart of the North.',
  },
  bookmarks: [
    {
      id: 'winterfell-close',
      distanceKm: 8.5,
      elevationDeg: 25,
      azimuthDeg: 146,
      fov: 32,
      lift: 0.12,
      aimKm: [0.7, -0.05],
      tod: 15.2,
      note: "hero: from the south-east over the winter town and the main gate: the two grey walls and the moat, the Great Keep and the Great Hall, the squat First Keep beside the broken tower's jagged top (right of centre, behind), the godswood's dark crowns with steam rising, the glass gardens glinting along the south; afternoon sun from the south-west",
    },
    {
      id: 'winterfell-wide',
      distanceKm: 70,
      elevationDeg: 22,
      azimuthDeg: 160,
      fov: 34,
      tod: 15.0,
      note: 'context: Winterfell in the open country of the North, the wolfswood to the west',
    },
  ],
});
