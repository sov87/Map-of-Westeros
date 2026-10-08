import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * Eastwatch-by-the-Sea at 298 AC (ledger ids per part in canon.json). T: one of the three Wall castles still
 * manned (eastwatch-manned, the-wall-castles-manned-298), at the Wall's eastern end where it meets the sea, on
 * a grey, windswept shore (the-wall-east-end, eastwatch-look); a harbour where the Watch keeps its ships
 * (eastwatch-harbour). M: on the shore of the Bay of Seals (eastwatch-position, eastwatch-bay-of-seals). I:
 * the plan, the towers, the quays (eastwatch-plan-unknown, eastwatch-plan). The Wall itself is the-wall
 * landmark, carried on east to the sea.
 *
 * Local frame: x east, z south, origin on a shelf cut into the coastal slope just south of the Wall's end (a
 * display offset off the sheet's marker, which stands ~11 km inland of the traced coast: eastwatch-position).
 * The sea lies east (the shore ~0.3 km off), the Wall runs west from the sea ~0.45 km north.
 */

const STONE = 0x5a5856;
const STONE_LIT = 0x67645f;
const SLATE = 0x3c3f44;
const TIMBER = 0x4a3b2c;

/** the curtain (I) on the shelf, the gate on its landward west side */
const WARD: V2[] = [
  [-0.72, 0.12],
  [-0.06, 0.12],
  [-0.06, 0.88],
  [-0.72, 0.88],
];
const KEEP: V2 = [-0.42, 0.42];

function buildCastle(k: ProxyKit): void {
  k.drape('weathered', WARD, { step: 0.03, lift: 0.01, color: 0x5d5a55, lod: 1 });
  k.wallPath('stone', WARD, 0.13, 0.05, {
    followGround: true,
    closed: true,
    step: 0.04,
    batter: 0.15,
    color: STONE,
    shadeJitter: 0.06,
    crenel: { w: 0.02, h: 0.02, gap: 0.015, lod: 0, color: STONE_LIT },
  });
  for (const p of WARD) k.tower('stone', 0.055, 0.21, { at: [p[0], 0, p[1]], seat: 'min', sides: 16, roof: 'crenel', color: STONE_LIT, windows: { rows: 2, on: 0.4, size: 0.01 } });
  // the gatehouse on the landward side (I)
  for (const s of [-1, 1]) k.tower('stone', 0.04, 0.2, { at: [-0.72, 0, 0.5 + 0.06 * s], seat: 'min', sides: 4, roof: 'crenel', color: STONE_LIT, rot: [0, 45, 0] });
  k.box('darkStone', 0.05, 0.08, 0.06, { at: [-0.72, k.ground(-0.72, 0.5), 0.5], color: 0x1e1d1c });
  // the keep (I): a square tower, its windows lit — a manned castle
  k.tower('stone', 0.12, 0.34, { at: [KEEP[0], 0, KEEP[1]], seat: 'min', sides: 4, roof: 'crenel', color: STONE_LIT, rot: [0, 45, 0], windows: { rows: 4, on: 0.55, size: 0.012 } });
  // halls and barracks of the Watch (I)
  const halls: [V2, number, number, number][] = [
    [[-0.2, 0.3], 0.18, 0.08, 90],
    [[-0.2, 0.68], 0.2, 0.08, 90],
    [[-0.46, 0.76], 0.22, 0.08, 0],
    [[-0.6, 0.26], 0.12, 0.07, 0],
  ];
  halls.forEach(([p, w, d, yaw], i) => {
    k.house('stone', 'slate', w, d, 0.08, { at: [p[0], 0, p[1]], rot: [0, yaw, 0], roof: 'gable', pitch: 40, dig: 0.2, color: i % 2 ? STONE : STONE_LIT, roofColor: SLATE, chimney: i % 2 === 0, windows: { count: 3, on: 0.5, sides: 2, size: 0.01 } });
  });
  k.light([-0.78, k.ground(-0.78, 0.5) + 0.1, 0.5], { color: 0xffad5a, intensity: 0.8, radius: 0.015, kind: 'fire', flicker: 0.4 });
}

function buildHarbour(k: ProxyKit): void {
  // the harbour (T): a stone quay along the shore below the castle and a breakwater arm out into the bay (I)
  const y = k.seaLevel;
  k.box('stone', 0.06, 0.05, 0.75, { at: [0.26, y - 0.025, 0.55], color: STONE });
  k.box('stone', 0.5, 0.05, 0.05, { at: [0.5, y - 0.025, 1.0], rot: [0, -12, 0], color: STONE });
  for (const z of [0.3, 0.55, 0.8]) k.box('wood', 0.16, 0.012, 0.02, { at: [0.36, y + 0.012, z], color: TIMBER, lod: 0 });
  // the Watch's ships at the quay (T: its ships; I: their forms) — the largest a galley like the Blackbird
  const ships: [number, number, number, number][] = [
    [0.5, 0.42, 0.16, 82],
    [0.48, 0.7, 0.12, 95],
    [0.72, 0.62, 0.1, 70],
  ];
  ships.forEach(([x, z, L, yaw], i) => {
    k.box('wood', 0.03 + 0.01 * (i === 0 ? 1 : 0), 0.022, L, { at: [x, y - 0.004, z], rot: [0, yaw, 0], color: i === 0 ? 0x1f1c1a : 0x3e3226 });
    k.cylinder('wood', 0.002, 0.003, 0.09 + 0.03 * (i === 0 ? 1 : 0), { at: [x, y + 0.018, z], seg: 4, color: 0x2e2620, lod: 0 });
  });
  k.light([0.27, y + 0.08, 0.3], { color: 0xffb35a, intensity: 0.5, radius: 0.012, kind: 'lamp' });
  // the way from the gate down to the quay, round the curtain's south side (I)
  k.drape('weathered', [[-0.8, 0.92], [0.24, 0.92], [0.24, 0.98], [-0.8, 0.98]], { step: 0.03, lift: 0.015, color: 0x6a655c, lod: 1 });
}

export default defineLandmark({
  id: 'eastwatch',
  placeId: 'eastwatch',
  tier: 'B',
  // a shelf cut into the coastal slope for the castle and its quay, never raised (I)
  stamps: [{ kind: 'flatten', at: [-0.1, 0.6], radius: 1.25, falloff: 0.8, height: -1.24, lowerOnly: true }],
  proxy: (k) => {
    buildCastle(k);
    buildHarbour(k);
  },
  emitters: [{ preset: 'smoke', at: [-0.2, 0.16, 0.3], scale: 0.1 }],
  vegetationExclusion: [{ at: [-0.3, 0.5], r: 0.9 }],
  subjectKm: { at: [-0.3, 0.45], r: 0.6 },
  contrast: 'light',
  annotation: {
    title: 'Eastwatch-by-the-Sea',
    subtitle: "The Night's Watch",
    blurb: 'Where the Wall meets the sea: a manned castle and the harbour of the Watch\'s ships on a grey, windswept shore.',
  },
  bookmarks: [
    {
      id: 'eastwatch-close',
      distanceKm: 4.2,
      elevationDeg: 11,
      azimuthDeg: 150,
      fov: 32,
      lift: 0.25,
      aimKm: [-0.25, -0.2],
      tod: 13.5,
      weather: { cloudCoverage: 0.85 },
      note: 'hero: from the bay to the south-south-east under a grey sky: the castle and its quay on the shore, the ships, the Wall\'s ice running down to the sea behind it',
    },
    {
      id: 'eastwatch-wide',
      distanceKm: 32,
      elevationDeg: 18,
      azimuthDeg: 160,
      fov: 34,
      tod: 13.5,
      weather: { cloudCoverage: 0.8 },
      note: 'context: the Wall\'s eastern end at the Bay of Seals, Eastwatch at its foot',
    },
  ],
});
