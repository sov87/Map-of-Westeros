import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * The Water Gardens at 298 AC (ledger ids per part in canon.json). T: the Martells' palace near Sunspear,
 * laid out round pools and fountains (water-gardens-pools-fountains), its terraces, pools and walks of pink
 * marble (water-gardens-pink-marble), blood orange trees beside the pools (water-gardens-blood-oranges), the
 * pools open to the children of lords and commoners alike (water-gardens-children); built by Prince Maron
 * for his Targaryen bride (water-gardens-built-for-daenerys). M: a short way from Sunspear along the coast
 * (water-gardens-near-sunspear). I: the plan: a long, low palace with flat roofs and an arcaded terrace, a
 * chain of pools down the garden's axis toward the sea, fountains, the orange trees in rows, a low garden
 * wall (water-gardens-plan). No show imagery: no horseshoe arches, no tiled courts.
 *
 * Local frame: x east, z south, origin at the sheet's marker on the spit south-west of Sunspear; the
 * ground falls gently to the sea ~7 km south. A flatten levels the garden.
 */

const MARBLE = 0xe9c3b5;
const MARBLE_LIT = 0xf1d4c8;
const MARBLE_DIM = 0xd4ab9c;
const WALK = 0xe2c8bc;
const ORANGE = 0x35512a;

/** the pools' surface (local y: the levelled garden + a hair) and their marble kerbs' top */
const POOL_Y = 0.008;
const KERB_Y = 0.012;

/** the pools down the garden's axis (I): centre z, half width (x), half length (z) — larger toward the sea */
const CHAIN: [number, number, number][] = [
  [-0.1, 0.05, 0.04],
  [0.02, 0.06, 0.045],
  [0.15, 0.07, 0.05],
  [0.29, 0.08, 0.055],
  [0.44, 0.095, 0.06],
];
/** two long side pools flanking the chain (I) */
const SIDES: [number, number, number, number][] = [
  [-0.2, 0.17, 0.025, 0.2],
  [0.2, 0.17, 0.025, 0.2],
];
const rect = (cx: number, cz: number, hx: number, hz: number): V2[] => [
  [cx - hx, cz - hz],
  [cx + hx, cz - hz],
  [cx + hx, cz + hz],
  [cx - hx, cz + hz],
];
const POOLS: V2[][] = [...CHAIN.map(([z, hx, hz]) => rect(0, z, hx, hz)), ...SIDES.map(([x, z, hx, hz]) => rect(x, z, hx, hz))];
/** the garden wall (I) */
const GARDEN = rect(0, 0.14, 0.32, 0.5);

function buildPalace(k: ProxyKit): void {
  // the palace across the garden's head: a long, low range of pink marble, flat-roofed, a taller middle block
  // and end pavilions (I)
  k.house('stone', 'stone', 0.44, 0.11, 0.065, { at: [0, 0, -0.3], roof: 'flat', dig: 0.05, color: MARBLE, roofColor: MARBLE_DIM, windows: { count: 9, on: 0.5, sides: 2, size: 0.009 } });
  k.house('stone', 'stone', 0.12, 0.13, 0.13, { at: [0, 0, -0.3], roof: 'flat', dig: 0.05, color: MARBLE_LIT, roofColor: MARBLE_DIM, windows: { count: 3, on: 0.6, sides: 2, size: 0.01 } });
  // a low dome over the middle block's hall (I)
  k.tower('stone', 0.045, 0.012, { at: [0, k.ground(0, -0.3) + 0.13, -0.3], sides: 20, roof: 'dome', roofH: 0.04, roofColor: MARBLE_LIT, color: MARBLE_DIM });
  for (const s of [-1, 1]) k.house('stone', 'stone', 0.1, 0.12, 0.085, { at: [s * 0.26, 0, -0.3], roof: 'flat', dig: 0.05, color: MARBLE_LIT, roofColor: MARBLE_DIM, windows: { count: 2, on: 0.5, sides: 2, size: 0.01 } });
  // the terrace before it (T: terraces of pink marble), an arcade along the palace's garden face (I)
  k.drape('weathered', rect(0, -0.2, 0.3, 0.05), { step: 0.02, lift: 0.006, color: WALK, lod: 1 });
  k.arcade('stone', [-0.2, -0.243], [0.2, -0.243], { count: 11, h: 0.05, archH: 0.038, pier: 0.01, depth: 0.018, deck: true, color: MARBLE_LIT });
  // lamps along the terrace for the evening (I)
  for (let i = 0; i < 5; i++) {
    const x = -0.2 + i * 0.1;
    k.light([x, k.ground(x, -0.17) + 0.02, -0.17], { color: 0xffbf70, intensity: 0.5, radius: 0.008, kind: 'lamp' });
  }
}

function buildGarden(k: ProxyKit): void {
  // the walks: pink marble over the garden (T), beds of green under the orange rows (I)
  k.drape('weathered', rect(0, 0.14, 0.3, 0.33), { step: 0.02, lift: 0.004, color: WALK, lod: 1 });
  for (const x of [-0.26, -0.12, 0.12, 0.26]) k.drape('weathered', rect(x, x === -0.12 || x === 0.12 ? 0.17 : 0.175, 0.022, x === -0.12 || x === 0.12 ? 0.32 : 0.2), { step: 0.01, lift: 0.006, color: 0x55613a, lod: 1 });
  // marble kerbs round every pool (I), their tops a hair above the water
  for (const ring of POOLS) {
    k.wallPath('stone', ring, KERB_Y + 0.004, 0.008, { closed: true, at: [0, -0.004, 0], color: MARBLE_DIM });
  }
  // the fountains: a column and a basin in each pool of the chain (T: fountains; I: their form)
  CHAIN.forEach(([z], i) => {
    k.cylinder('stone', 0.004, 0.005, 0.03 + 0.004 * i, { at: [0, POOL_Y - 0.004, z], seg: 10, color: MARBLE_LIT, lod: 0 });
    k.cylinder('stone', 0.012, 0.008, 0.005, { at: [0, POOL_Y + 0.026 + 0.004 * i, z], seg: 12, color: MARBLE_LIT, lod: 0 });
  });
  // the garden's low wall of pink marble, a gate toward the sea (I)
  const [nw, ne, se, sw] = GARDEN;
  k.wallPath('stone', [sw, nw, ne, se], 0.03, 0.012, { followGround: true, step: 0.03, color: MARBLE, shadeJitter: 0.04 });
  k.wallPath('stone', [se, [0.05, se[1]]], 0.03, 0.012, { followGround: true, step: 0.03, color: MARBLE });
  k.wallPath('stone', [[-0.05, sw[1]], sw], 0.03, 0.012, { followGround: true, step: 0.03, color: MARBLE });
  for (const s of [-1, 1]) k.tower('stone', 0.012, 0.05, { at: [s * 0.055, 0, sw[1]], seat: 'min', sides: 4, roof: 'none', color: MARBLE_LIT, rot: [0, 45, 0] });
}

/** the blood orange trees in rows beside the pools (T: beside the pools; I: the rows) */
const ORANGES: V2[] = [
  ...Array.from({ length: 10 }, (_, i): V2 => [-0.12, -0.12 + i * 0.065]),
  ...Array.from({ length: 10 }, (_, i): V2 => [0.12, -0.12 + i * 0.065]),
  ...Array.from({ length: 6 }, (_, i): V2 => [-0.26, 0.0 + i * 0.07]),
  ...Array.from({ length: 6 }, (_, i): V2 => [0.26, 0.0 + i * 0.07]),
];

export default defineLandmark({
  id: 'water-gardens',
  placeId: 'water-gardens',
  tier: 'B',
  // the garden levelled on the gentle slope to the sea (I)
  stamps: [{ kind: 'flatten', at: [0, 0], radius: 1.5, falloff: 1.0, height: 0 }],
  proxy: (k) => {
    buildPalace(k);
    buildGarden(k);
  },
  waterFeatures: POOLS.map((ring) => ({ kind: 'pool' as const, ring, level: POOL_Y })),
  trees: ORANGES.map((at, i) => ({ at, kind: 'holly' as const, crownKm: 0.014 + 0.003 * (i % 3), heightKm: 0.03, color: ORANGE, yawDeg: i * 41 })),
  vegetationExclusion: [{ at: [0, 0.1], r: 0.62 }],
  subjectKm: { at: [0, 0.02], r: 0.45 },
  contrast: 'dark',
  annotation: {
    title: 'The Water Gardens',
    subtitle: 'Palace of the Martells',
    blurb: 'Pools and fountains among terraces of pink marble and blood orange trees, where the children of lords and commoners swim together.',
  },
  bookmarks: [
    {
      id: 'water-gardens-close',
      distanceKm: 1.7,
      elevationDeg: 19,
      azimuthDeg: 176,
      fov: 32,
      lift: 0.03,
      aimKm: [0, 0.05],
      tod: 17.2,
      note: 'hero: from the sea side to the south in the late afternoon, up the chain of pools and fountains between the orange trees to the pink marble palace and its arcaded terrace',
    },
    {
      id: 'water-gardens-wide',
      distanceKm: 30,
      elevationDeg: 20,
      azimuthDeg: 215,
      fov: 34,
      tod: 17.0,
      note: 'context: the gardens on the spit by the Summer Sea, Sunspear a short way along the coast to the north-east',
    },
  ],
});
