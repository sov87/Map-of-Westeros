import type { LocalStamp } from '../types.ts';
import { defineLandmark } from '../types.ts';
import { buildGround, buildHouses, buildRiverfront, buildWalls } from './city.ts';
import { buildDragonpit, buildSept } from './hills.ts';
import { CITY_Y, HILLS, KEEP_AT, PIT, RIVER_SCARP, SEPT, SUMMITS } from './layout.ts';
import { buildRedKeep } from './redkeep.ts';

/**
 * King's Landing at 298 AC, from the books (ledger ids in canon.json, labels per part): the capital on the
 * north bank of the Blackwater Rush where it enters Blackwater Bay, spread over three hills — the Red Keep
 * of pale red stone on Aegon's High Hill directly over the river, the Great Sept of Baelor with its seven
 * crystal towers on Visenya's Hill, the Dragonpit with its fallen dome on Rhaenys's Hill — inside a wall
 * with seven gates, the Mud Gate on the riverfront. Layout and design scale in layout.ts.
 *
 * Stamps (heights relative to the base ground at the marker): the city's ground levelled toward one bench
 * (the baked plain rises steadily inland here: without it the city would lean against a slope and the hills
 * would not read as hills), then the three hills raised from it — Aegon's the highest (its name: the High
 * Hill) — and their summits levelled for the keep, the sept and the pit.
 */
const BENCH: [number, number][] = [
  [-6.5, 0],
  [-6.5, -6],
  [-2.5, -1],
  [-2, -8],
  [2, -4],
  [3, -10],
  [6.5, -8],
  [3.5, -1.5],
  [7.2, -4.6],
];

const STAMPS: LocalStamp[] = [
  ...BENCH.map((at): LocalStamp => ({ kind: 'flatten', at, radius: 3.4, falloff: 2.6, height: CITY_Y, strength: 0.8 })),
  { kind: 'raise', at: HILLS.aegon.at, radius: HILLS.aegon.r, amount: HILLS.aegon.raise, rough: { amp: 0.12, scaleKm: 1.6 }, surface: 'turf' },
  { kind: 'raise', at: HILLS.visenya.at, radius: HILLS.visenya.r, amount: HILLS.visenya.raise, rough: { amp: 0.1, scaleKm: 1.6 }, surface: 'turf' },
  { kind: 'raise', at: HILLS.rhaenys.at, radius: HILLS.rhaenys.r, amount: HILLS.rhaenys.raise, rough: { amp: 0.1, scaleKm: 1.6 }, surface: 'turf' },
  // the south bank opposite the city lowered toward the river (lowerOnly): the riverfront and the water
  // show from the south, where Stannis's host would come up (blackwater-rush-crossing)
  ...[
    [-6, 7],
    [-1, 6.2],
    [4, 4.6],
    [8, 2.2],
  ].map((at): LocalStamp => ({ kind: 'flatten', at: at as [number, number], radius: 3.0, falloff: 2.4, height: -0.7, lowerOnly: true, strength: 0.85 })),
  // the High Hill's foot along the river: a steep scarp over the water (the keep stands above a cliff, T)
  { kind: 'scarp', path: RIVER_SCARP, height: 0.75, run: 0.35, side: 'left', plateauKm: 1.2, falloff: 1.0, rough: { amp: 0.08, scaleKm: 1.6, ridged: true }, surface: 'rock' },
  // the summits: level tops for the keep, the sept and the pit — Aegon's the highest (the High Hill)
  { kind: 'plateau', at: KEEP_AT, radius: 1.5, height: SUMMITS.aegon, rim: 0.9 },
  { kind: 'plateau', at: [-3.7, -3.45], radius: 1.75, height: SUMMITS.visenya, rim: 0.8 },
  { kind: 'plateau', at: PIT.at, radius: 1.1, height: SUMMITS.rhaenys, rim: 0.7 },
];

export default defineLandmark({
  id: 'kings-landing',
  placeId: 'kings-landing',
  tier: 'A',
  stamps: STAMPS,
  proxy: (k) => {
    buildWalls(k);
    buildRedKeep(k);
    buildSept(k);
    buildDragonpit(k);
    buildGround(k);
    buildHouses(k);
    buildRiverfront(k);
  },
  vegetationExclusion: [
    { at: [0, -4], r: 11 },
    { at: [7, -6], r: 5 },
  ],
  contrast: 'light',
  annotation: {
    title: "King's Landing",
    subtitle: 'Seat of the Iron Throne',
    blurb: "The capital on three hills where the Blackwater Rush meets the bay: the Red Keep on Aegon's High Hill, the Great Sept of Baelor on Visenya's, the roofless Dragonpit on Rhaenys's.",
  },
  bookmarks: [
    {
      id: 'kings-landing-close',
      distanceKm: 28,
      elevationDeg: 19,
      azimuthDeg: 162,
      fov: 30,
      lift: 0.6,
      aimKm: [1.6, 4.2],
      tod: 16.3,
      note: "hero: from the south-east over the river mouth, the Red Keep's red walls and drum towers crowning the High Hill over the river cliff in the right third, the city's roofs climbing to the Great Sept's white dome and crystal towers on Visenya's Hill (left) and the broken drum of the Dragonpit on Rhaenys's (centre, behind), the wall round it all; afternoon sun from the south-west",
    },
    {
      id: 'kings-landing-wide',
      distanceKm: 120,
      elevationDeg: 24,
      azimuthDeg: 125,
      fov: 34,
      tod: 15.5,
      note: 'context: the city at the head of Blackwater Bay where the Blackwater Rush comes in, the kingswood south of the river',
    },
  ],
});
