import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * The Fist of the First Men at 298 AC (ledger ids per part in canon.json). T: a steep, stony hill rising
 * well above the forest north of the Wall, its top commanding a long view over the trees
 * (fist-of-the-first-men-position, -hill); the hilltop ringed by a wall of piled stones of great age raised
 * by the First Men (fist-of-the-first-men-ringwall). M: east of the Frostfangs, near their foothills
 * (fist-of-the-first-men-frostfangs). I: the ringwall low and broken round a broad, fairly level top
 * (fist-of-the-first-men-ringwall-scale); at 298 an empty ring fort with no camp, ditch or stakes
 * (fist-of-the-first-men-state-298); the hill's form (fist-of-the-first-men-plan). Mormont's camp, its
 * defences and the battle of 299 belong to later states and are not shown.
 *
 * Local frame: x east, z south, origin at the sheet's marker in the Haunted Forest's flat interior; the
 * hill is raised by the landmark's stamps.
 */

const STONE = 0x5e5c58;
const STONE_DIM = 0x4a4845;
const MOSS = 0x5a5f48;

/** the hilltop (I): local height of the level top over the forest floor and its radius */
const TOP_Y = 0.9;
const TOP_R = 1.0;
/** the ringwall's line (I): a ragged ring a little inside the top's edge */
const RING: V2[] = Array.from({ length: 28 }, (_, i): V2 => {
  const a = (i / 28) * Math.PI * 2;
  const r = 0.62 * (1 + 0.06 * Math.sin(3 * a + 0.7) + 0.04 * Math.sin(5 * a + 2.1));
  return [Math.cos(a) * r, Math.sin(a) * r * 0.9];
});

function buildRingwall(k: ProxyKit): void {
  // piled stones, about chest high at the design scale, long gaps where it has slumped (T: the ringwall;
  // I: its height and gaps)
  for (let i = 0; i < RING.length; i++) {
    if (k.r(10 + i) < 0.2) continue;
    const a = RING[i];
    const b = RING[(i + 1) % RING.length];
    k.wallPath('stone', [a, b], 0.036 + 0.02 * k.r(40 + i), 0.04, { followGround: true, step: 0.03, batter: 0.45, color: i % 3 ? STONE : STONE_DIM, shadeJitter: 0.14 });
  }
  // loose stones tumbled from it (I)
  for (let i = 0; i < 40; i++) {
    const j = Math.floor(k.r(100 + i) * RING.length);
    const p = RING[j];
    const out = 1 + (k.r(140 + i) - 0.3) * 0.12;
    const x = p[0] * out + (k.r(180 + i) - 0.5) * 0.05;
    const z = p[1] * out + (k.r(220 + i) - 0.5) * 0.05;
    const s = 0.008 + 0.012 * k.r(260 + i);
    k.rock('stone', s, { at: [x, k.ground(x, z) - s * 0.3, z], squash: 0.6, color: i % 2 ? STONE : MOSS, lod: 0 });
  }
}

function buildFlanks(k: ProxyKit): void {
  // the stony flanks: outcrops and boulders breaking out of the slopes below the top (T: stony; I: where)
  for (let i = 0; i < 26; i++) {
    const a = k.r(400 + i) * Math.PI * 2;
    const d = TOP_R * (1.05 + 0.75 * k.r(430 + i));
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const r = 0.03 + 0.06 * k.r(460 + i) ** 2;
    k.rock('stone', r, { at: [x, k.ground(x, z) - r * 0.35, z], squash: 0.5 + 0.4 * k.r(490 + i), lump: 0.5, color: i % 3 ? STONE : STONE_DIM, lod: 1 });
  }
}

export default defineLandmark({
  id: 'fist-of-the-first-men',
  placeId: 'fist-of-the-first-men',
  tier: 'A',
  // the hill (I: its form): a level top on steep, rough, stony flanks rising out of the flat forest
  stamps: [
    { kind: 'plateau', at: [0, 0], radius: TOP_R, height: TOP_Y, rim: 1.5 },
    { kind: 'raise', at: [0.15, 0.1], radius: 2.6, amount: 0.12, rough: { amp: 0.14, scaleKm: 1.6, ridged: true } },
    { kind: 'flatten', at: [0, 0], radius: 0.85, falloff: 0.3, height: TOP_Y + 0.04 },
  ],
  proxy: (k) => {
    buildRingwall(k);
    buildFlanks(k);
  },
  // wind-bent pines and scrub scattered up the flanks and on the top, the forest closing in below (I)
  trees: Array.from({ length: 30 }, (_, i) => {
    const a = i * 2.39996 + 0.4;
    const d = 0.75 + 0.75 * ((i * 7) % 30) / 30;
    const pine = i % 3 !== 1;
    return { at: [Math.cos(a) * d, Math.sin(a) * d] as V2, kind: (pine ? 'conifer' : 'scrub') as 'scrub' | 'conifer', crownKm: pine ? 0.035 + 0.01 * (i % 2) : 0.03, color: pine ? 0x2a3c2c : 0x4f5440, yawDeg: i * 37 };
  }),
  vegetationExclusion: [{ at: [0, 0], r: 1.35 }],
  subjectKm: { at: [0, 0], r: 1.1 },
  contrast: 'light',
  annotation: {
    title: 'The Fist of the First Men',
    subtitle: 'Beyond the Wall',
    blurb: 'A steep, stony hill above the Haunted Forest, its top ringed by a wall of piled stones the First Men raised long ago.',
  },
  bookmarks: [
    {
      id: 'fist-of-the-first-men-close',
      distanceKm: 5.5,
      elevationDeg: 17,
      azimuthDeg: 150,
      fov: 32,
      lift: 0.3,
      aimKm: [0, 0],
      tod: 12.5,
      weather: { cloudCoverage: 0.75 },
      note: 'hero: from the forest to the south-south-east under a grey sky: the stony hill standing above the trees, the broken ring of piled stones round its level top',
    },
    {
      id: 'fist-of-the-first-men-wide',
      distanceKm: 32,
      elevationDeg: 20,
      azimuthDeg: 120,
      fov: 34,
      tod: 12.5,
      weather: { cloudCoverage: 0.7 },
      note: 'context: the lone hill in the Haunted Forest, the Frostfangs rising to the west',
    },
  ],
});
