import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * The Isle of Faces at 298 AC (ledger ids per part in canon.json). T: an island in the Gods Eye
 * (isle-of-faces-in-gods-eye) where the First Men and the children of the forest made the Pact
 * (isle-of-faces-pact); legend keeps the green men there, unseen (isle-of-faces-green-men); wooded with
 * weirwoods, every tree given a carved face at the Pact, which gives the isle its name (isle-of-faces-weirwoods). M: a large
 * island near the middle of the lake, south of Harrenhal (isle-of-faces-map). I: no castle, town or quay
 * (isle-of-faces-no-settlement); the wood's mix, the grove in its clearing and the faces' forms
 * (isle-of-faces-plan).
 *
 * The island itself is baked land (a hole in the Gods Eye's polygon: tools/geo forceIslands, raised over
 * the lake level by the bake's island rule). Local frame: x east, z south, origin at the sheet's marker on
 * the isle's crown (~0.6 above the lake, whose surface lies at local y ≈ −0.61).
 */

/** bone-white bark, blood-red leaves (T: the weirwoods of the godswoods, winterfell-heart-tree) */
const BARK = 0xe4dfd2;
const SAP = 0x6e1412;
const CARVE = 0x3a2a24;
const LEAVES = [0x8e2420, 0x7d1d1a, 0x9c2b22];
/** the lake's surface in the local frame (lake7 level − the origin's ground) */
const LAKE_Y = -0.61;

/** the island's wood: its baked outline (data/baked/lakes.json, the Gods Eye's hole) inset 0.6 km from the shore */
const ISLE: V2[] = [
  [-3.3, -6.9],
  [-16.8, -1.5],
  [-22.0, 3.7],
  [-22.0, 8.7],
  [-17.0, 13.8],
  [4.6, 9.7],
  [9.9, 7.1],
  [16.3, -0.6],
  [7.4, -6.9],
];

/** the grove (I): a clearing on the isle's crown ringed by great weirwoods, the oldest at its north side */
const GROVE: V2 = [0, 0];
const CLEARING_R = 0.2;
const HEROES: { at: V2; crown: number; height: number }[] = [
  { at: [GROVE[0] + 0.02, GROVE[1] - 0.25], crown: 0.095, height: 0.22 },
  ...Array.from({ length: 8 }, (_, i) => {
    const a = -Math.PI / 2 + ((i + 1) / 9) * Math.PI * 2;
    const r = CLEARING_R + 0.04 + 0.03 * ((i * 5) % 3) / 2;
    return { at: [GROVE[0] + Math.cos(a) * r, GROVE[1] + Math.sin(a) * r] as V2, crown: 0.065 + 0.008 * (i % 3), height: 0.16 + 0.015 * ((i * 7) % 4) };
  }),
];

/** a carved face on a weirwood's trunk, turned toward the clearing: two eyes weeping red sap and a long mouth (C: the faces; I: their form) */
function face(k: ProxyKit, at: V2, toward: V2, trunkR: number, y0: number, s: number): void {
  const dx = toward[0] - at[0];
  const dz = toward[1] - at[1];
  const L = Math.hypot(dx, dz) || 1;
  const nx = dx / L;
  const nz = dz / L;
  const yaw = (-Math.atan2(nz, nx) * 180) / Math.PI + 90;
  const px = at[0] + nx * trunkR;
  const pz = at[1] + nz * trunkR;
  for (const side of [-1, 1]) {
    const ex = px - nz * side * s * 0.9;
    const ez = pz + nx * side * s * 0.9;
    k.box('wood', s * 0.9, s * 0.55, s * 0.5, { at: [ex, y0 + s * 2.2, ez], rot: [0, yaw, 0], color: CARVE, lod: 0 });
    k.box('wood', s * 0.3, s * 1.8, s * 0.5, { at: [ex, y0 + s * 0.6, ez], rot: [0, yaw, 0], color: SAP, lod: 0 });
  }
  k.box('wood', s * 1.6, s * 0.45, s * 0.5, { at: [px, y0, pz], rot: [0, yaw, 0], color: CARVE, lod: 0 });
}

function buildGrove(k: ProxyKit): void {
  HEROES.forEach(({ at, height }, i) => {
    // the bone-white trunk to the crown base (the vegetation system draws the crown and its limbs)
    const trunkR = i === 0 ? 0.014 : 0.0095;
    const g = k.ground(at[0], at[1]);
    k.cylinder('wood', trunkR * 0.75, trunkR, height * 0.42, { at: [at[0], g - 0.006, at[1]], seg: 9, color: BARK, lod: 0 });
    face(k, at, GROVE, trunkR * 0.95, g + height * 0.15, i === 0 ? 0.0075 : 0.0055);
  });
}

export default defineLandmark({
  id: 'isle-of-faces',
  placeId: 'isle-of-faces',
  tier: 'B',
  proxy: (k) => buildGrove(k),
  trees: HEROES.map(({ at, crown, height }, i) => ({ at, kind: 'autumn' as const, crownKm: crown, heightKm: height, color: LEAVES[i % LEAVES.length], yawDeg: i * 47 })),
  forests: [
    // the isle's wood (C: weirwoods; I: the mix with oak and ash), stands of trees seen from across the water
    {
      area: { polygon: ISLE },
      density: 15,
      species: [
        { kind: 'autumn', share: 0.55, crownKm: [0.14, 0.24], colors: LEAVES },
        { kind: 'oak', share: 0.45, crownKm: [0.14, 0.24], colors: [0x41502c, 0x4a5a32, 0x55633a] },
      ],
      clump: { scaleKm: 2.5, amount: 0.35 },
      edgeKm: 0.8,
      minY: LAKE_Y + 0.1,
      avoid: [{ at: GROVE, r: 1.3 }],
    },
    // round the grove: a closed wood of lesser trees, weirwoods among them, open round the clearing (I)
    {
      area: { annulus: { at: GROVE, r0: CLEARING_R + 0.13, r1: 1.4 } },
      density: 560,
      species: [
        { kind: 'autumn', share: 0.4, crownKm: [0.024, 0.036], colors: LEAVES },
        { kind: 'oak', share: 0.6, crownKm: [0.024, 0.038], colors: [0x41502c, 0x4a5a32, 0x55633a] },
      ],
      clump: { scaleKm: 0.3, amount: 0.3 },
      edgeKm: 0.12,
    },
  ],
  emitters: [
    // dawn mist on the water off the isle's northern shore (I)
    { preset: 'mist', at: [-1.5, LAKE_Y + 0.03, -9.0], scale: 2.0, rate: 0.6 },
    { preset: 'mist', at: [7.0, LAKE_Y + 0.03, -9.0], scale: 2.0, rate: 0.6 },
    { preset: 'mist', at: [16.5, LAKE_Y + 0.03, -3.0], scale: 2.0, rate: 0.6 },
  ],
  vegetationExclusion: [{ at: GROVE, r: CLEARING_R + 0.05 }],
  subjectKm: { at: GROVE, r: 0.35 },
  contrast: 'dark',
  annotation: {
    title: 'The Isle of Faces',
    subtitle: 'Where the Pact was made',
    blurb: 'An island of weirwoods in the Gods Eye: here the First Men and the children of the forest made their Pact, and the green men are said to keep it still.',
  },
  bookmarks: [
    {
      id: 'isle-of-faces-close',
      distanceKm: 0.9,
      elevationDeg: 13,
      azimuthDeg: 200,
      fov: 32,
      lift: 0.05,
      aimKm: [GROVE[0], -GROVE[1]],
      tod: 7.2,
      weather: { cloudCoverage: 0.55 },
      note: 'hero: low from the south-south-west at dawn into the grove: the great weirwoods round the clearing, white trunks and red leaves, their carved faces turned inward',
    },
    {
      id: 'isle-of-faces-wide',
      distanceKm: 44,
      elevationDeg: 20,
      azimuthDeg: 20,
      fov: 34,
      aimKm: [-3.5, -3],
      tod: 7.4,
      weather: { cloudCoverage: 0.5 },
      note: 'context: from above Harrenhal\'s shore to the north-north-east: the red-wooded isle in the middle of the Gods Eye, mist on the water',
    },
  ],
});
