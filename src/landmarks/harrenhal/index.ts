import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../records.ts';
import { defineLandmark } from '../types.ts';

/**
 * Harrenhal at 298 AC (ledger ids per part in canon.json): the colossal castle on the north shore of the
 * Gods Eye (harrenhal-lakeshore T, harrenhal-north-shore M). T: five great towers — Kingspyre, the Widow's
 * Wail, the Wailing Tower, the Tower of Dread, the Tower of Ghosts — melted by dragonfire in the Conquest and
 * still standing slumped and twisted like half-melted candles (harrenhal-tower-count, -towers-melted,
 * -tower-names, slice-harrenhal-slagged); curtain walls so high and sheer they read as mountain cliffs
 * (harrenhal-walls); the Hall of a Hundred Hearths (harrenhal-hall); the sunken bear pit (harrenhal-bear-pit).
 * C: the largest castle ever raised in Westeros (harrenhal-largest-castle). I: the plan, the stone's dark
 * grey, the scorching, the weeds in the half-empty yards of the dwindled House Whent (harrenhal-state-298,
 * harrenhal-plan).
 *
 * Local frame: x east, z south, origin at the marker on the shoreline; the lake begins just south of it.
 * Design scale ≈ ×5 like the other castles, so Harrenhal's colossal walls stand twice Winterfell's.
 */

const STONE = 0x5f5c58;
const STONE_LIT = 0x6e6a64;
const SCORCH = 0x23201d;
const SLATE = 0x3f4246;

/** the curtain: an irregular pentagon along the shore, the five towers at its corners (I: the plan) */
const WALL: V2[] = [
  [-2.6, -0.6],
  [-2.9, -3.0],
  [-0.3, -4.6],
  [2.7, -3.3],
  [2.4, -0.5],
];
const HALL = { at: [-0.2, -2.3] as V2, w: 1.3, d: 0.4, h: 0.3, yaw: 8 };
const PIT: V2 = [1.15, -1.6];
const GODSWOOD: V2 = [-1.6, -2.2];

/**
 * One melted tower (T): a huge round shaft whose upper third has run like wax — the profile swells and sags,
 * the crown is a slumped, cracked lump, dark streaks of slag run down the sides.
 */
function meltedTower(k: ProxyKit, at: V2, r: number, h: number, i: number): void {
  const prof: [number, number][] = [];
  const n = 14;
  for (let s = 0; s <= n; s++) {
    const t = s / n;
    // the solid lower shaft, then the melt: bulges where the stone ran and pooled, a narrowed neck, a slumped top
    const melt = t > 0.55 ? (t - 0.55) / 0.45 : 0;
    const bulge = 1 + 0.18 * Math.sin(melt * Math.PI * 1.6 + i) * melt - 0.25 * melt * melt;
    prof.push([r * (1 - 0.06 * t) * bulge, h * t * (1 - 0.12 * melt * melt)]);
  }
  prof.push([0, h * (1 - 0.12)]);
  const y = k.ground(at[0], at[1]) - 0.03;
  k.lathe('stone', prof, { at: [at[0], y, at[1]], seg: 22, color: STONE_LIT });
  // the slumped crown: lumps of slag where the top fell in on itself
  for (let j = 0; j < 6; j++) {
    const a = (j / 6) * Math.PI * 2 + i;
    const rr = r * (0.35 + 0.35 * k.r(10 * i + j));
    k.rock('stone', r * (0.32 + 0.22 * k.r(20 * i + j)), { at: [at[0] + Math.cos(a) * rr, y + h * 0.86 + k.r(30 * i + j) * r * 0.4, at[1] + Math.sin(a) * rr], squash: 0.6, lump: 0.5, color: SCORCH, shade: 0.9 + k.r(40 * i + j) * 0.3 });
  }
  // drips: dark ridges of run stone down the upper sides
  for (let j = 0; j < 9; j++) {
    const a = (j / 9) * Math.PI * 2 + i * 0.7;
    const len = h * (0.18 + 0.25 * k.r(50 * i + j));
    k.box('stone', r * 0.16, len, r * 0.12, { at: [at[0] + Math.cos(a) * r * 0.98, y + h * 0.85 - len, at[1] + Math.sin(a) * r * 0.98], rot: [0, (-a * 180) / Math.PI, 0], color: SCORCH, lod: 1 });
  }
}

function buildWalls(k: ProxyKit): void {
  // the colossal curtain (T: walls like mountain cliffs), crenellated, scorched in places
  k.wallPath('stone', WALL, 0.42, 0.16, {
    followGround: true,
    closed: true,
    step: 0.1,
    batter: 0.22,
    color: STONE,
    shadeJitter: 0.1,
    crenel: { w: 0.04, h: 0.045, gap: 0.03, lod: 0, color: STONE_LIT },
  });
  // interval towers along the curtain, smaller than the five
  for (let s = 0; s < WALL.length; s++) {
    const a = WALL[s];
    const b = WALL[(s + 1) % WALL.length];
    for (const t of [0.33, 0.66]) {
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      k.tower('stone', 0.12, 0.55, { at: [x, 0, z], seat: 'min', sides: 4, rot: [0, (Math.atan2(b[1] - a[1], b[0] - a[0]) * -180) / Math.PI, 0], roof: 'crenel', color: STONE });
    }
  }
  // the main gate on the north-west, toward the roads (I)
  const g: V2 = [(WALL[1][0] + WALL[2][0]) / 2, (WALL[1][1] + WALL[2][1]) / 2];
  k.box('stone', 0.4, 0.6, 0.3, { at: [g[0], 0, g[1]], seat: 'min', rot: [0, 32, 0], color: STONE_LIT });
  k.light([g[0] - 0.12, k.ground(g[0], g[1]) + 0.2, g[1] - 0.15], { color: 0xffb35a, intensity: 1.0, radius: 0.03, kind: 'fire', flicker: 0.3 });
  // the five towers at the corners (T: five, melted, named)
  WALL.forEach((p, i) => meltedTower(k, p, i === 0 ? 0.32 : 0.27, i === 0 ? 1.9 : 1.45 + (i % 2) * 0.2, i));
}

function buildInside(k: ProxyKit): void {
  // the yards: packed earth gone to weeds in a castle too big for its lords (I)
  k.drape('weathered', WALL.map(([x, z]): V2 => [x * 0.95, z * 0.95 - 0.1]), { step: 0.1, lift: 0.012, color: 0x6f6a5a, grain: 0.6 });
  for (let i = 0; i < 9; i++) {
    const c: V2 = [-2 + k.r(600 + i) * 4, -4 + k.r(700 + i) * 3.2];
    const ring: V2[] = Array.from({ length: 10 }, (_, j): V2 => [c[0] + Math.cos((j * Math.PI) / 5) * (0.15 + k.r(800 + i) * 0.2), c[1] + Math.sin((j * Math.PI) / 5) * (0.1 + k.r(900 + i) * 0.15)]);
    k.drape('foliage', ring, { step: 0.04, lift: 0.016, color: 0x5d6a3c, grain: 0.7, lod: 1 });
  }
  // the Hall of a Hundred Hearths (T): immense, long, its roof line broken by chimneys
  {
    const { at, w, d, h, yaw } = HALL;
    k.house('stone', 'slate', w, d, h, { at: [at[0], 0, at[1]], rot: [0, yaw, 0], roof: 'gable', pitch: 32, color: STONE_LIT, roofColor: SLATE, windows: { count: 8, on: 0.35, sides: 2, size: 0.016 } });
    const t = (yaw * Math.PI) / 180;
    for (let i = 0; i < 10; i++) {
      const u = -w / 2 + 0.08 + (i * (w - 0.16)) / 9;
      const x = at[0] + u * Math.cos(t);
      const z = at[1] - u * Math.sin(t);
      k.box('stone', 0.035, 0.12, 0.035, { at: [x, k.ground(at[0], at[1]) + h + d * 0.28, z], color: STONE, lod: 0 });
    }
  }
  // the bear pit (T): a sunken round pit with stone tiers round it, watched from above
  {
    const y = k.ground(PIT[0], PIT[1]);
    k.ring('stone', 0.2, 0.05, 0.08, { at: [PIT[0], y, PIT[1]], seg: 28, color: STONE_LIT });
    k.ring('stone', 0.25, 0.05, 0.05, { at: [PIT[0], y, PIT[1]], seg: 28, color: STONE });
    k.cylinder('darkStone', 0.16, 0.16, 0.012, { at: [PIT[0], y + 0.002, PIT[1]], seg: 24, color: 0x2a241e, lod: 0 });
  }
  // the godswood (T: Arya prays at its heart tree): a stand of old trees inside the walls
  for (let i = 0; i < 14; i++) {
    const a = k.r(1000 + i) * Math.PI * 2;
    const rr = Math.sqrt(k.r(1100 + i)) * 0.45;
    k.tree(i === 0 ? 'autumn' : 'oak', GODSWOOD[0] + Math.cos(a) * rr * (i === 0 ? 0 : 1), GODSWOOD[1] + Math.sin(a) * rr * (i === 0 ? 0 : 1), i === 0 ? { crownKm: 0.06, heightKm: 0.1, color: 0x7d1d1a } : { crownKm: 0.05 + k.r(1200 + i) * 0.03, heightKm: 0.09 });
  }
  // ruined outbuildings, roofless shells along the walls (I: the castle half empty and decaying)
  for (let i = 0; i < 12; i++) {
    const s = i % WALL.length;
    const a = WALL[s];
    const b = WALL[(s + 1) % WALL.length];
    const t = 0.15 + k.r(1300 + i) * 0.7;
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[1] + (b[1] - a[1]) * t;
    const cx = x * 0.82;
    const cz = z * 0.82 - 0.35;
    const yaw = (Math.atan2(b[1] - a[1], b[0] - a[0]) * -180) / Math.PI;
    const roofless = i % 3 !== 0;
    k.house('stone', 'slate', 0.28 + k.r(1400 + i) * 0.2, 0.14, 0.14, { at: [cx, 0, cz], rot: [0, yaw, 0], roof: roofless ? 'flat' : 'gable', pitch: 34, dig: 0.4, color: roofless ? 0x57534e : STONE_LIT, roofColor: roofless ? 0x3a3631 : SLATE, ...(roofless ? {} : { windows: { count: 2, on: 0.4, sides: 1 as const, size: 0.012 } }) });
  }
}

export default defineLandmark({
  id: 'harrenhal',
  placeId: 'harrenhal',
  tier: 'A',
  stamps: [{ kind: 'flatten', at: [0, -2.9], radius: 2.0, falloff: 0.8, height: 'auto', strength: 0.9 }],
  proxy: (k) => {
    buildWalls(k);
    buildInside(k);
  },
  vegetationExclusion: [{ at: [0, -2.4], r: 3.6 }],
  contrast: 'dark',
  annotation: {
    title: 'Harrenhal',
    subtitle: 'Folly of Harren the Black',
    blurb: 'The greatest castle ever raised, its five towers melted by dragonfire, brooding on the shore of the Gods Eye.',
  },
  bookmarks: [
    {
      id: 'harrenhal-close',
      distanceKm: 12,
      elevationDeg: 14,
      azimuthDeg: 160,
      fov: 32,
      lift: 0.4,
      aimKm: [0, 2.2],
      tod: 17.8,
      note: "hero: from across the Gods Eye at evening: the colossal dark curtain rising from the shore like a cliff, the five slumped, melted towers along it, the Hall of a Hundred Hearths' long roof inside, a few lights in a castle far too big for its household",
    },
    {
      id: 'harrenhal-wide',
      distanceKm: 70,
      elevationDeg: 22,
      azimuthDeg: 170,
      fov: 34,
      tod: 17.0,
      note: 'context: Harrenhal on the north shore of the Gods Eye, the Isle of Faces in the lake',
    },
  ],
});

