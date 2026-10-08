import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { LocalStamp, V2 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * Storm's End at 298 AC (ledger ids per part in canon.json). T: the seat of House Baratheon on the shore of
 * Shipbreaker Bay, its walls overlooking the bay where the Windproud broke (storms-end-on-shipbreaker-bay;
 * the sheet's marker stands inland, the display offset puts it on the shore); one great curtain wall a hundred
 * feet high, without arrow slits or posterns, sloping and curving all the way round, its stones fitted so
 * close the wind finds no hold (storms-end-curtain-wall-height, -form), forty feet thick and near eighty on
 * the sea side (storms-end-curtain-wall-thickness); a single colossal drum tower inside — granary, barracks,
 * hall and lord's dwelling at once — windowless on the sea side (storms-end-single-drum-tower) and crowned with
 * heavy battlements, so that from afar the castle is a spiked fist raised on an arm (storms-end-spiked-fist);
 * stables, kitchens and yards sheltered inside the wall (storms-end-sheltered-ward); a sea passage into the
 * rock under the castle (storms-end-sea-cave). Not yet besieged at 298 (storms-end-siege). I: the headland,
 * the plan, the stone's grey, the curtain's gentle batter, the gate and the road (storms-end-plan).
 *
 * Local frame: x east, z south, origin on the shore at the display position; the bay opens to the south and
 * south-east. Design scale ≈ ×5 like the other castles (the curtain stands as high as Winterfell's inner wall).
 */

const STONE = 0x6c6a66;
const STONE_LIT = 0x7b7873;
const DARK = 0x4f4d4a;
const SLATE = 0x45484c;
const ROCK = 0x76716a;

/** the castle's centre on the headland, a little back from the old shoreline */
const C: V2 = [0, -0.8];
/** the curtain's radius (km), height and thickness: a hundred feet and forty (eighty to seaward) at ×5 */
const CURTAIN = { r: 0.74, h: 0.22, t: 0.12, seaT: 0.2 };
/** the drum tower */
const DRUM = { at: [-0.06, -0.88] as V2, r: 0.36, h: 1.05 };
/** the seaward arc of the headland (compass bearings, clockwise from its eastern end round the south) */
const SEA_ARC: [number, number] = [262, 78];
/** the gate on the landward (north-west) side, and the road inland from it */
const GATE_BEARING = 318;

const polar = (c: V2, deg: number, r: number): V2 => [c[0] + Math.sin((deg * Math.PI) / 180) * r, c[1] - Math.cos((deg * Math.PI) / 180) * r];
/** bearings from a0 to a1 going clockwise (deg), n + 1 samples */
const arc = (a0: number, a1: number, n: number): number[] => {
  const span = (((a1 - a0) % 360) + 360) % 360;
  return Array.from({ length: n + 1 }, (_, i) => a0 + (span * i) / n);
};
/** n points round a circle about C (a closed ring, first point not repeated) */
const ring = (r: number, n: number): V2[] => Array.from({ length: n }, (_, i) => polar(C, (i * 360) / n, r));
/** is this bearing on the seaward side (between the sea arc's ends, clockwise from east round the south)? */
const seaward = (deg: number): boolean => {
  const b = ((deg % 360) + 360) % 360;
  return b >= SEA_ARC[1] && b <= SEA_ARC[0];
};

const STAMPS: LocalStamp[] = [
  // the headland (I): the castle's rock thrust out into the bay; its sea faces are kit cliffs
  { kind: 'plateau', at: C, radius: 1.6, height: 1.0, rim: 0.6, surface: 'rock' },
  // the landward approach, levelled a little toward the gate
  { kind: 'flatten', at: polar(C, GATE_BEARING, 1.6), radius: 1.1, falloff: 0.9, height: 'auto', strength: 0.5 },
];

/** where the headland meets the sea along a bearing from C: the first point whose ground is at the water */
function shoreAt(k: ProxyKit, deg: number): V2 | null {
  for (let r = 1.2; r < 2.6; r += 0.02) {
    const p = polar(C, deg, r);
    if (k.ground(p[0], p[1]) <= k.seaLevel + 0.05) return p;
  }
  return null;
}

function buildHeadland(k: ProxyKit, top: number): void {
  // the sea cliffs round the headland: a massive banded rock face standing in the water at the shoreline,
  // walked from the west round the south to the east so it faces the sea; an even top at the headland's
  // level, its body sloping back over the stamp's rim
  // the longest run of bearings whose shore is in reach (no cliff standing on dry land)
  const bearings = arc(SEA_ARC[1], SEA_ARC[0], 34).reverse();
  let run: V2[] = [];
  let path: V2[] = [];
  for (const b of bearings) {
    const p = shoreAt(k, b);
    if (p) run.push(p);
    else run = [];
    if (run.length > path.length) path = run.slice();
  }
  const H = (top - k.seaLevel + 0.03) / 0.91;
  k.cliff('weathered', path, H, { at: [0, k.seaLevel - 0.06, 0], followGround: false, color: ROCK, rough: 0.45, strata: 0.75, depth: 0.8, taper: 0.6, soft: 0.35, jag: 0.2 });
  // the sea passage (T): a dark cave mouth at the waterline under the castle, a little east of south
  const cave = shoreAt(k, 165) ?? polar(C, 165, 2);
  const y = k.seaLevel - 0.01;
  const yaw = -15;
  k.box('darkStone', 0.16, 0.13, 0.1, { at: [cave[0], y, cave[1] + 0.02], rot: [0, yaw, 0], color: 0x161412 });
  k.light([cave[0], y + 0.04, cave[1] - 0.02], { color: 0xffa04a, intensity: 0.4, radius: 0.012, kind: 'fire', flicker: 0.4 });
}

function buildCurtain(k: ProxyKit, top: number): void {
  // the great curtain (T): sloped and curved all the way round, no arrow slits, no posterns — a smooth ring of
  // fitted stone with a plain parapet (I)
  k.wallPath('stone', ring(CURTAIN.r, 48), CURTAIN.h, CURTAIN.t, {
    at: [0, top - 0.02, 0],
    closed: true,
    step: 0.05,
    batter: 0.25,
    color: STONE,
    shadeJitter: 0.03,
    crenel: { w: 0.03, h: 0.03, gap: 0.022, lod: 0, color: STONE_LIT },
  });
  // twice as thick to seaward (T: near eighty feet against forty): a second course inside the sea half
  const inner = arc(SEA_ARC[1] + 6, SEA_ARC[0] - 6, 24).map((b) => polar(C, b, CURTAIN.r - (CURTAIN.t + CURTAIN.seaT) * 0.42));
  k.wallPath('stone', inner, CURTAIN.h * 0.92, CURTAIN.seaT - CURTAIN.t + 0.04, { at: [0, top - 0.02, 0], step: 0.05, batter: 0.3, color: STONE });
  // the gate (I): the one way in, landward, a passage set into the curve of the curtain — no bastions, no
  // second tower (T: of towers there is but one), nothing to break the curve
  const g = polar(C, GATE_BEARING, CURTAIN.r + CURTAIN.t / 2);
  k.box('darkStone', 0.08, 0.1, 0.05, { at: [g[0], top - 0.02, g[1]], rot: [0, -GATE_BEARING, 0], color: 0x1e1b18, lod: 0 });
  const out = polar(C, GATE_BEARING, CURTAIN.r + 0.16);
  k.light([out[0], top + 0.08, out[1]], { color: 0xffb35a, intensity: 0.9, radius: 0.02, kind: 'fire', flicker: 0.35 });
}

function buildDrum(k: ProxyKit, top: number): void {
  // the drum tower (T: one colossal tower — granary, barracks, hall, the lord's dwelling): a flared foot, a
  // plain shaft, a corbelled crown (I: the profile)
  const { at, r, h } = DRUM;
  const y0 = top - 0.03;
  k.lathe(
    'stone',
    [
      [r * 1.12, 0],
      [r * 1.04, h * 0.08],
      [r, h * 0.16],
      [r * 0.98, h * 0.88],
      [r * 1.06, h * 0.92],
      [r * 1.06, h * 0.95],
      [r * 0.9, h * 0.95],
      [0, h * 0.95],
    ],
    { at: [at[0], y0, at[1]], seg: 40, color: STONE_LIT },
  );
  // the heavy battlements (T): tall, close-set merlons round the crown — the spiked fist
  const n = 22;
  for (let i = 0; i < n; i++) {
    const b = (i / n) * 360;
    const [x, z] = polar(at, b, r * 1.0);
    k.box('stone', 0.05, 0.1, 0.045, { at: [x, y0 + h * 0.95, z], rot: [0, -b, 0], color: STONE_LIT });
    k.cone('stone', 0.03, 0.045, { at: [x, y0 + h * 0.95 + 0.1, z], seg: 4, rot: [0, 45 - b, 0], color: STONE_LIT, lod: 1 });
  }
  // windows on the landward side only (T: none toward the sea), in rows up the shaft
  for (let row = 0; row < 6; row++) {
    for (let j = 0; j < 7; j++) {
      const b = 250 + j * 20 + (row % 2) * 10;
      if (seaward(b)) continue;
      const [x, z] = polar(at, b, r * 0.995);
      const y = y0 + h * (0.22 + row * 0.11);
      k.box('darkStone', 0.022, 0.032, 0.012, { at: [x, y, z], rot: [0, -b, 0], color: 0x1d1b19, lod: 0 });
      if ((row * 7 + j) % 3 !== 1) k.light([x, y + 0.016, z], { color: 0xffcf8a, intensity: 0.55, radius: 0.012, kind: 'window' });
    }
  }
}

function buildWard(k: ProxyKit, top: number): void {
  // the ward (T: stables, kitchens and yards sheltered inside the wall): packed yards, and long low buildings
  // against the landward curtain (I: where)
  const yard = ring(CURTAIN.r - 0.13, 32);
  k.extrude('weathered', yard, 0.004, { at: [0, top - 0.02, 0], color: 0x7a7266, lod: 1 });
  const halls: { b: number; w: number; d: number; h: number; roof: number }[] = [
    { b: 270, w: 0.34, d: 0.12, h: 0.09, roof: SLATE }, // stables
    { b: 352, w: 0.3, d: 0.13, h: 0.1, roof: SLATE }, // kitchens
    { b: 30, w: 0.26, d: 0.11, h: 0.08, roof: SLATE }, // smithy, stores
    { b: 222, w: 0.22, d: 0.1, h: 0.08, roof: SLATE }, // more stables
  ];
  for (const [i, hl] of halls.entries()) {
    const [x, z] = polar(C, hl.b, CURTAIN.r - 0.24);
    k.house('stone', 'slate', hl.w, hl.d, hl.h, { at: [x, top - 0.02, z], seat: false, rot: [0, 90 - hl.b, 0], roof: 'gable', pitch: 30, color: STONE, roofColor: hl.roof, windows: { count: 3, on: 0.4, sides: 1, size: 0.012 } });
    // a chimney on the kitchens
    if (i === 1) k.box('stone', 0.035, 0.08, 0.035, { at: [x, top - 0.02 + hl.h + 0.03, z], color: DARK, lod: 0 });
  }
  // the godswood of Storm's End is not modelled (not asserted); a few wind-bent trees in the ward's lee
  for (let i = 0; i < 5; i++) {
    const [x, z] = polar(C, 300 + i * 22, CURTAIN.r - 0.42 - 0.05 * k.r(300 + i));
    k.tree('oak', x, z, { crownKm: 0.035 + 0.01 * k.r(310 + i), heightKm: 0.07 });
  }
}

function buildApproach(k: ProxyKit): void {
  // the road inland from the gate (I), north-west toward the kingswood
  const road: V2[] = [polar(C, GATE_BEARING, CURTAIN.r + 0.1), polar(C, GATE_BEARING, 1.5), polar(C, 312, 2.4), polar(C, 300, 3.4), polar(C, 296, 4.6)];
  const l: V2[] = [];
  const r: V2[] = [];
  road.forEach(([x, z], i) => {
    const [ax, az] = road[Math.max(0, i - 1)];
    const [bx, bz] = road[Math.min(road.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const nx = -(bz - az) / len;
    const nz = (bx - ax) / len;
    l.push([x + nx * 0.03, z + nz * 0.03]);
    r.push([x - nx * 0.03, z - nz * 0.03]);
  });
  k.drape('weathered', [...l, ...r.reverse()], { step: 0.03, lift: 0.01, color: 0x8c8270, lod: 1 });
}

export default defineLandmark({
  id: 'storms-end',
  placeId: 'storms-end',
  tier: 'A',
  stamps: STAMPS,
  proxy: (k) => {
    // the castle's level: the headland's top under the curtain (its highest ground, so nothing hangs)
    const top = Math.max(...ring(CURTAIN.r + 0.05, 36).map(([x, z]) => k.ground(x, z)), k.ground(C[0], C[1])) + 0.02;
    buildHeadland(k, top);
    buildCurtain(k, top);
    buildDrum(k, top);
    buildWard(k, top);
    buildApproach(k);
  },
  vegetationExclusion: [{ at: C, r: 1.5 }],
  subjectKm: { at: C, r: 0.9 },
  contrast: 'dark',
  annotation: {
    title: "Storm's End",
    subtitle: 'Seat of House Baratheon',
    blurb: 'One great drum tower inside a curtain wall a hundred feet high, raised against the storms of Shipbreaker Bay.',
  },
  bookmarks: [
    {
      id: 'storms-end-close',
      distanceKm: 9.5,
      elevationDeg: 12,
      azimuthDeg: 210,
      fov: 28,
      lift: 0.5,
      aimKm: [0, 0.8],
      tod: 17.5,
      weather: { cloudCoverage: 0.85 },
      note: 'hero: from Shipbreaker Bay south-south-west of the castle under a storm sky, the coast running away north-east behind: the headland’s sea cliffs, the sloping, unbroken curtain and the colossal drum tower crowned with its heavy battlements — the spiked fist on its arm — a few windows lit on the landward side',
    },
    {
      id: 'storms-end-wide',
      distanceKm: 55,
      elevationDeg: 16,
      azimuthDeg: 135,
      fov: 34,
      tod: 17,
      weather: { cloudCoverage: 0.75 },
      note: 'context: Storm’s End on the western shore of Shipbreaker Bay, the kingswood inland, Tarth off the bay’s southern entrance',
    },
  ],
});
