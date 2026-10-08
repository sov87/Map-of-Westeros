import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { LocalStamp, V2, V3 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * The Eyrie at 298 AC (ledger ids per part in canon.json). T: a small castle of seven slender white towers
 * bunched like arrows in a quiver (the-eyrie-towers) on a shoulder of the Giant's Lance, high above the Vale
 * and well below the snowy summit (the-eyrie-shoulder, giants-lance-height, giants-lance-snow); the High
 * Hall of white marble veined with blue (the-eyrie-high-hall) with the Moon Door opening on the drop
 * (the-eyrie-moon-door); sky cells open to the void (the-eyrie-sky-cells); a small garden at the heart
 * (the-eyrie-garden). The way up (the-eyrie-waycastles, -trail, -sky, -above-sky, -impregnable): the Gates
 * of the Moon at the mountain's foot, then Stone, Snow and Sky along one narrow trail, a thin saddle of rock
 * between Snow and Sky; Sky a curved wall against the mountain, the castle some six hundred feet above it,
 * supplied by winch and basket. Alyssa's Tears pours off the heights nearby and turns to mist before it
 * reaches the valley (the-eyrie-alyssas-tears). I: the plan, the spur the trail climbs, every position
 * and the forms of the waycastles (the-eyrie-plan).
 *
 * Local frame: x east, z south, origin at the marker on the Lance's south flank; the summit is ~18 km north.
 * Design scale ≈ ×5 like the other castles; the drop to Sky follows the terrain's ×12 relief.
 */

const WHITE = 0xe8e5dd;
const MARBLE = 0xe4e8ec;
const PALE_ROOF = 0xb9c0c8;
const ROCK = 0x8a857b;
const GREY = 0x7d7a74;
const GREY_LIT = 0x8f8b84;
const SLATE = 0x4a4e54;

/** the castle on the shoulder: the tower ring round the garden */
const G: V2 = [0, -0.1];
const RING = 0.16;
/**
 * The crag the castle stands on (kit rock: the 1 km heightfield cannot hold a ledge this size): its outline,
 * walked so the outer faces look outward (west side southward, the south face eastward, the east side
 * northward); the north end runs into the mountain's rising flank.
 */
const CRAG: V2[] = [
  [-0.32, -0.52],
  [-0.42, -0.34],
  [-0.42, -0.08],
  [-0.32, 0.14],
  [-0.12, 0.27],
  [0.12, 0.28],
  [0.3, 0.16],
  [0.4, -0.08],
  [0.4, -0.34],
  [0.3, -0.52],
];
/** the waycastles, the saddle and the Gates of the Moon down the spur's crest (I: where; T: the order) */
const SKY: V2 = [0.04, 1.08];
const SADDLE: V2[] = [
  [0.0, 1.6],
  [-0.2, 2.2],
  [-0.4, 2.8],
];
const SNOW: V2 = [-0.6, 3.5];
const STONE: V2 = [-1.3, 6.8];
const GATES: V2 = [-1.9, 11.9];
/** the trail: up the spur's crest from the Gates, switchbacks on the steeper pitches */
const TRAIL: V2[] = [
  [-1.9, 11.4],
  [-1.5, 10.9],
  [-2.1, 10.3],
  [-1.5, 9.7],
  [-2.0, 9.0],
  [-1.45, 8.3],
  [-1.85, 7.6],
  [-1.3, 7.15],
  [-1.0, 6.4],
  [-1.4, 5.8],
  [-0.75, 5.2],
  [-1.15, 4.6],
  [-0.55, 4.0],
  SADDLE[2],
  SADDLE[1],
  SADDLE[0],
  [0.04, 1.2],
];
/**
 * Alyssa's Tears (I: where — off the heights on the spur's west flank, north-west of the castle), its path
 * (local x, y, z; y above the origin's stamped ground, read off tools/check/site.ts): a free leap
 * over the crag at the lip, then a long white cascade down the flank, lost in spray (the falls keep clear of
 * the ground)
 */
const TEARS: V3[] = [
  [-0.86, -0.36, -1.35],
  [-0.92, -0.75, -1.33],
  [-1.0, -1.05, -1.28],
  [-1.45, -1.7, -1.12],
  [-1.9, -2.5, -0.95],
  [-2.3, -3.3, -0.8],
];

const STAMPS: LocalStamp[] = [
  // the Giant's Lance (T: a great peak climbing into ice and snow far above the Eyrie; I: its form): a
  // pointed head with ridged spurs ~18 km north, and the long south-south-west spur whose shoulder holds the
  // Eyrie high above the Vale and whose nose runs down to the Gates of the Moon on the valley floor
  {
    kind: 'massif',
    at: [4.1, -17.85],
    radius: 7,
    summit: 22,
    base: 0,
    exponent: 1.5,
    dome: 0.1,
    spurs: [
      { azimuthDeg: 188, lengthKm: 34, widthKm: 3, heightFrac: 0.42, rootFrac: 0.7 },
      { azimuthDeg: 100, lengthKm: 11, widthKm: 4, heightFrac: 0.32, rootFrac: 0.62 },
      { azimuthDeg: 320, lengthKm: 10, widthKm: 4, heightFrac: 0.3, rootFrac: 0.6 },
      { azimuthDeg: 30, lengthKm: 9, widthKm: 4, heightFrac: 0.28, rootFrac: 0.58 },
    ],
    rough: { amp: 0.35, scaleKm: 2.4, ridged: true },
    snowCap: 0.62,
    surface: 'rock',
  },
  // the shoulder (T): a broad ledge thrust out of the Lance's flank, falling sheer to the south (the stamp is
  // the ledge at the heightfield's scale; the kit's rock carries the castle's level bed and the sheer face)
  { kind: 'scarp', path: [[-1.6, 0.0], [-0.8, 0.8], [0, 1.05], [0.8, 0.8], [1.6, 0.0]], height: 0.9, run: 0.6, side: 'left', plateauKm: 0.5, falloff: 1.0, rough: { amp: 0.1, scaleKm: 1.6, ridged: true }, surface: 'rock' },
  // the Gates of the Moon's level ground at the foot
  { kind: 'flatten', at: GATES, radius: 0.6, falloff: 0.6, height: 'auto', strength: 0.85 },
];

const polar = (c: V2, deg: number, r: number): V2 => [c[0] + Math.sin((deg * Math.PI) / 180) * r, c[1] - Math.cos((deg * Math.PI) / 180) * r];

/** a draped band along a polyline (a path, a ledge) */
function band(path: V2[], hw: number): V2[] {
  const l: V2[] = [];
  const r: V2[] = [];
  path.forEach(([x, z], i) => {
    const [ax, az] = path[Math.max(0, i - 1)];
    const [bx, bz] = path[Math.min(path.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const nx = -(bz - az) / len;
    const nz = (bx - ax) / len;
    l.push([x + nx * hw, z + nz * hw]);
    r.push([x - nx * hw, z - nz * hw]);
  });
  return [...l, ...r.reverse()];
}

/** the crag's flat top: level with the mountain where its north end runs into the flank */
function cragTop(k: ProxyKit): number {
  return Math.max(...CRAG.map(([x, z]) => k.ground(x, z))) + 0.04;
}

/** the crag's outline resampled to `n` points evenly along its perimeter (closed) */
function cragRing(n: number): V2[] {
  const P = CRAG;
  const seg = P.map((q, i) => Math.hypot(P[(i + 1) % P.length][0] - q[0], P[(i + 1) % P.length][1] - q[1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const out: V2[] = [];
  for (let k = 0; k < n; k++) {
    let t = (k / n) * total;
    let i = 0;
    while (t > seg[i]) t -= seg[i++];
    const a = P[i];
    const b = P[(i + 1) % P.length];
    out.push([a[0] + ((b[0] - a[0]) * t) / seg[i], a[1] + ((b[1] - a[1]) * t) / seg[i]]);
  }
  return out;
}

const CRAG_C: V2 = [0, -0.12];
/** the crag's sections: depth below the top (km), outward growth, ragged jitter (km) — ledges and a broad foot */
const CRAG_TIERS: [number, number, number][] = [
  [0, 1, 0],
  [0.04, 1.02, 0.01],
  [0.14, 1.05, 0.04],
  [0.28, 1.1, 0.07],
  [0.45, 1.17, 0.09],
  [0.66, 1.26, 0.1],
  [0.9, 1.38, 0.11],
  [1.2, 1.52, 0.12],
];

function buildCrag(k: ProxyKit, top: number): void {
  // the body (kit rock: the 1 km heightfield cannot hold a ledge this size): faceted sections that widen and
  // fray toward a foot buried in the slope; the north side runs into the rising flank
  const ring = cragRing(24);
  const minG = Math.min(...ring.map(([x, z]) => k.ground(x, z)));
  const sections = CRAG_TIERS.map(([dy, grow, jit], t) => ({
    y: t === CRAG_TIERS.length - 1 ? Math.min(top - dy, minG - 0.2) : top - dy,
    rotDeg: t < 2 ? 0 : (k.r(4900 + t) - 0.5) * 9,
    outline: ring.map(([x, z], j): V2 => {
      const rx = x - CRAG_C[0];
      const rz = z - CRAG_C[1];
      const l = Math.hypot(rx, rz) || 1;
      const e = grow + (jit * (k.r(5000 + t * 64 + j) - 0.35)) / l;
      return [rx * e, rz * e];
    }),
  }));
  k.loft('weathered', sections, { at: [CRAG_C[0], 0, CRAG_C[1]], color: ROCK, rock: true });
  // the sky cells (T): small chambers cut into the south face, open to the void
  for (let i = 0; i < 5; i++) {
    const j = 7 + i;
    const [x, z] = ring[j];
    const [x1, z1] = ring[j + 1];
    const y = top - 0.13 - 0.06 * (i % 2);
    const e = 1.055 + (i % 2) * 0.012;
    const cx = CRAG_C[0] + ((x + x1) / 2 - CRAG_C[0]) * e;
    const cz = CRAG_C[1] + ((z + z1) / 2 - CRAG_C[1]) * e;
    const yaw = (Math.atan2(z1 - z, x1 - x) * -180) / Math.PI;
    k.box('darkStone', 0.04, 0.034, 0.03, { at: [cx, y, cz], rot: [0, yaw, 0], color: 0x1d1b19, lod: 0 });
    k.box('stone', 0.05, 0.007, 0.036, { at: [cx, y - 0.005, cz], rot: [0, yaw, 0], color: GREY_LIT, lod: 0 });
  }
}

function buildCastle(k: ProxyKit, top: number): void {
  // the seven towers (T): slender, white, bunched round the garden like arrows in a quiver; the tallest to
  // the north against the mountain, the hall between the two southern ones over the drop (I: heights, roofs)
  const towers = Array.from({ length: 7 }, (_, i) => {
    const deg = 180 + 360 * ((i + 0.5) / 7);
    const at = polar(G, deg, RING * (0.94 + 0.1 * k.r(10 + i)));
    const north = Math.cos((deg * Math.PI) / 180);
    return { at, r: 0.038 + 0.01 * k.r(20 + i), h: 0.5 + 0.2 * (north + 1) * 0.5 + 0.14 * k.r(30 + i) };
  });
  // the curtain between them, low and pale
  k.wallPath('stone', towers.map((t) => t.at), 0.12, 0.04, {
    at: [0, top - 0.01, 0],
    closed: true,
    step: 0.05,
    color: WHITE,
    shadeJitter: 0.04,
    crenel: { w: 0.016, h: 0.018, gap: 0.013, lod: 0, color: WHITE },
  });
  towers.forEach((t, i) =>
    k.tower('stone', t.r, t.h, {
      at: [t.at[0], top - 0.01, t.at[1]],
      sides: 14,
      taper: 0.08,
      roof: 'cone',
      roofH: t.r * 3.6,
      roofColor: PALE_ROOF,
      color: WHITE,
      windows: { rows: 3 + (i % 2), on: 0.45, size: 0.01 },
    }),
  );
  // the High Hall (T: pale marble veined with blue) on the south edge, its Moon Door opening on the drop
  const hallAt: V2 = [G[0], G[1] + 0.25];
  k.house('stone', 'slate', 0.28, 0.12, 0.12, { at: [hallAt[0], top - 0.01, hallAt[1]], seat: false, roof: 'gable', pitch: 30, color: MARBLE, roofColor: PALE_ROOF, windows: { count: 4, on: 0.55, sides: 2, size: 0.013 } });
  k.box('darkStone', 0.028, 0.055, 0.006, { at: [hallAt[0] + 0.03, top + 0.005, hallAt[1] + 0.062], color: 0x221f1c, lod: 0 });
  // the garden at the heart (T): grass and a few beds, open to the sky (I: the beds)
  const garden: V2[] = Array.from({ length: 12 }, (_, j): V2 => polar(G, j * 30, 0.1));
  k.extrude('foliage', garden, 0.004, { at: [0, top, 0], color: 0x5f7a3c, lod: 0 });
  for (let i = 0; i < 4; i++) {
    const c = polar(G, 45 + i * 90, 0.055);
    k.extrude('foliage', Array.from({ length: 8 }, (_, j): V2 => polar(c, j * 45, 0.016)), 0.008, { at: [0, top, 0], color: [0xb0405a, 0xd8c060, 0x7a5ab0, 0xe8e0d0][i], lod: 0 });
  }
  // the yard round the towers: pale flags on the crag's top (I)
  k.extrude('stone', CRAG.map(([x, z]): V2 => [x * 0.97, z * 0.97]), 0.003, { at: [0, top, 0], color: 0xb8b4ab, lod: 1 });
  // the gate on the north, toward the stair cut down to Sky (I), a torch beside it
  const gate = polar(G, 0, RING + 0.03);
  k.light([gate[0] + 0.03, top + 0.05, gate[1]], { color: 0xffb35a, intensity: 0.8, radius: 0.015, kind: 'fire', flicker: 0.3 });
  // the winch on the cliff edge west of the hall, its rope and basket down to Sky (T: winch and basket)
  const winch: V2 = [-0.17, 0.2];
  k.box('wood', 0.05, 0.035, 0.04, { at: [winch[0], top, winch[1] - 0.02], color: 0x6e5a44, lod: 0 });
  k.box('wood', 0.008, 0.008, 0.08, { at: [winch[0], top + 0.035, winch[1] + 0.02], color: 0x5a4632, lod: 0 });
  const foot: V3 = [SKY[0] - 0.06, k.ground(SKY[0] - 0.06, SKY[1] - 0.1) + 0.02, SKY[1] - 0.1];
  const head: V3 = [winch[0], top + 0.035, winch[1] + 0.06];
  // the rope: a thin cylinder from the foot up to the winch arm (Euler XYZ: Rz tilts the y axis, Ry turns it)
  const dx = head[0] - foot[0];
  const dy = head[1] - foot[1];
  const dz = head[2] - foot[2];
  const L = Math.hypot(dx, dy, dz);
  const tz = (Math.acos(dy / L) * 180) / Math.PI;
  const ty = (Math.atan2(dz, -dx) * 180) / Math.PI;
  k.cylinder('wood', 0.002, 0.002, L, { at: foot, rot: [0, ty, tz], seg: 4, color: 0x8a7a60, lod: 0 });
  k.box('wood', 0.016, 0.012, 0.016, { at: [foot[0] + dx * 0.6, foot[1] + dy * 0.6 - 0.012, foot[2] + dz * 0.6], color: 0x6a5238, lod: 0 });
}

/** a waycastle tower with a wall round its yard (I: the forms) */
function waycastle(k: ProxyKit, at: V2, r: number, towerH: number, wallR: number): void {
  const ring: V2[] = Array.from({ length: 7 }, (_, j): V2 => polar(at, j * (360 / 7) + 20, wallR * (0.9 + 0.2 * k.r(400 + j + at[1] * 10))));
  k.wallPath('stone', ring, 0.06, 0.03, { followGround: true, closed: true, step: 0.04, color: GREY, crenel: { w: 0.014, h: 0.016, gap: 0.012, lod: 0, color: GREY_LIT } });
  k.tower('stone', r, towerH, { at: [at[0], 0, at[1]], seat: 'min', sides: 4, roof: 'crenel', color: GREY_LIT, windows: { rows: 2, on: 0.5, size: 0.009 } });
  k.light([at[0] + r * 0.8, k.ground(at[0], at[1]) + 0.04, at[1] + r], { color: 0xffb35a, intensity: 0.6, radius: 0.012, kind: 'fire', flicker: 0.3 });
}

function buildWay(k: ProxyKit): void {
  // Sky (T): no more than a curved wall raised against the mountain, a few sheds behind it (I)
  {
    const y = k.ground(SKY[0], SKY[1]);
    k.ring('stone', 0.13, 0.03, 0.08, { at: [SKY[0], y - 0.03, SKY[1] - 0.04], arcDeg: 150, rot: [0, 105, 0], seg: 18, color: GREY_LIT });
    k.house('wood', 'slate', 0.07, 0.04, 0.035, { at: [SKY[0] - 0.04, 0, SKY[1] - 0.07], dig: 0.3, roof: 'flat', color: 0x6e5a44, roofColor: SLATE });
    k.light([SKY[0], y + 0.05, SKY[1] + 0.06], { color: 0xffb35a, intensity: 0.6, radius: 0.012, kind: 'fire', flicker: 0.3 });
  }
  // the saddle between Snow and Sky (T): a thin crest of rock with sheer drops either side
  {
    const left: V2[] = SADDLE.map(([x, z]): V2 => [x - 0.07, z]).reverse();
    const right: V2[] = SADDLE.map(([x, z]): V2 => [x + 0.07, z]);
    const hL = left.map(([x, z]) => Math.max(0.12, k.ground(x + 0.07, z) - k.ground(x - 0.12, z)));
    const hR = right.map(([x, z]) => Math.max(0.12, k.ground(x - 0.07, z) - k.ground(x + 0.12, z)));
    // walked south → north on the west side faces west; north → south on the east side faces east
    k.cliff('weathered', left.slice().reverse(), hL.slice().reverse(), { color: ROCK, rough: 0.6, strata: 0.4, depth: 0.06, taper: 0.15, soft: 0.3 });
    k.cliff('weathered', right.slice().reverse(), hR.slice().reverse(), { color: ROCK, rough: 0.6, strata: 0.4, depth: 0.06, taper: 0.15, soft: 0.3 });
  }
  // Snow and Stone (T: the waycastles, in that order going down; I: their forms)
  waycastle(k, SNOW, 0.04, 0.16, 0.11);
  waycastle(k, STONE, 0.05, 0.2, 0.15);
  k.house('wood', 'thatch', 0.12, 0.05, 0.04, { at: [STONE[0] + 0.05, 0, STONE[1] + 0.06], seat: 'min', roof: 'gable', pitch: 35, color: 0x6e5a44, roofColor: 0x7d6a4a });
  // the trail (T: narrow, steep, travelled on mules): a pale thread up the spur
  const trail: V2[] = [];
  for (let i = 0; i + 1 < TRAIL.length; i++) {
    const [ax, az] = TRAIL[i];
    const [bx, bz] = TRAIL[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.12));
    for (let j = 0; j < n; j++) trail.push([ax + ((bx - ax) * j) / n, az + ((bz - az) * j) / n]);
  }
  trail.push(TRAIL[TRAIL.length - 1]);
  k.drape('weathered', band(trail, 0.018), { step: 0.012, lift: 0.008, color: 0xb3a88f, lod: 1 });
}

function buildGates(k: ProxyKit): void {
  // the Gates of the Moon (T: the castle at the mountain's foot, the household's winter seat): a strong
  // square castle of grey stone with a keep, a hall and a gatehouse facing the Vale (I: the forms)
  const C = GATES;
  const hw = 0.42;
  const hd = 0.34;
  const ring: V2[] = [
    [C[0] - hw, C[1] - hd],
    [C[0] + hw, C[1] - hd],
    [C[0] + hw, C[1] + hd],
    [C[0] - hw, C[1] + hd],
  ];
  k.wallPath('stone', ring, 0.14, 0.05, {
    followGround: true,
    closed: true,
    step: 0.06,
    batter: 0.15,
    color: GREY,
    shadeJitter: 0.06,
    crenel: { w: 0.02, h: 0.022, gap: 0.016, lod: 0, color: GREY_LIT },
  });
  for (const p of ring) k.tower('stone', 0.07, 0.24, { at: [p[0], 0, p[1]], seat: 'min', sides: 12, roof: 'crenel', color: GREY_LIT, windows: { rows: 2, on: 0.4, size: 0.01 } });
  // the gatehouse on the south, toward the Vale
  const g: V2 = [C[0], C[1] + hd];
  k.tower('stone', 0.05, 0.2, { at: [g[0] - 0.08, 0, g[1]], seat: 'min', sides: 4, roof: 'crenel', color: GREY_LIT });
  k.tower('stone', 0.05, 0.2, { at: [g[0] + 0.08, 0, g[1]], seat: 'min', sides: 4, roof: 'crenel', color: GREY_LIT });
  k.light([g[0], k.ground(g[0], g[1]) + 0.06, g[1] + 0.04], { color: 0xffb35a, intensity: 1.0, radius: 0.02, kind: 'fire', flicker: 0.3 });
  // the keep against the north wall, under the mountain, and the hall
  k.tower('stone', 0.11, 0.36, { at: [C[0] - 0.12, 0, C[1] - 0.14], seat: 'min', sides: 4, roof: 'crenel', color: GREY_LIT, windows: { rows: 3, on: 0.5, size: 0.012 } });
  k.house('stone', 'slate', 0.36, 0.13, 0.12, { at: [C[0] + 0.14, 0, C[1] - 0.02], seat: 'min', roof: 'gable', pitch: 32, color: GREY_LIT, roofColor: SLATE, windows: { count: 5, on: 0.5, sides: 2, size: 0.013 } });
  for (let i = 0; i < 4; i++) {
    const x = C[0] - 0.3 + i * 0.16;
    k.house('wood', 'slate', 0.12, 0.07, 0.06, { at: [x, 0, C[1] + 0.2], seat: 'min', roof: 'gable', pitch: 35, color: 0x7a6a56, roofColor: SLATE, dig: 0.3 });
  }
}

function buildTears(k: ProxyKit): void {
  // the lip: a crag on the flank the water leaps from, walked south-south-east so its face looks west
  const path: V2[] = [
    [-0.95, -1.75],
    [-0.88, -1.5],
    [-0.82, -1.25],
    [-0.78, -1.0],
  ];
  const hs = path.map(([px, pz]) => Math.max(0.2, TEARS[0][1] + 0.03 - k.ground(px, pz)));
  k.cliff('weathered', path, hs, { color: ROCK, rough: 0.55, strata: 0.6, depth: 0.3, taper: 0.2, soft: 0.3 });
}

export default defineLandmark({
  id: 'the-eyrie',
  placeId: 'the-eyrie',
  tier: 'A',
  stamps: STAMPS,
  proxy: (k) => {
    const top = cragTop(k);
    buildCrag(k, top);
    buildCastle(k, top);
    buildWay(k);
    buildGates(k);
    buildTears(k);
  },
  waterFeatures: [{ kind: 'waterfall', path: TEARS, width: 0.08 }],
  emitters: [{ preset: 'mist', at: TEARS[TEARS.length - 1], scale: 1.0 }],
  vegetationExclusion: [
    { at: G, r: 0.6 },
    { at: GATES, r: 0.9 },
    { at: STONE, r: 0.3 },
    { at: SNOW, r: 0.25 },
  ],
  // the probe frames the castle on its crag (the build reaches 12 km down to the Gates, the massif 40 km)
  subjectKm: { at: [0, -0.1], r: 0.6 },
  contrast: 'light',
  annotation: {
    title: 'The Eyrie',
    subtitle: 'Seat of House Arryn',
    blurb: 'Seven slender white towers on a shoulder of the Giant’s Lance, reached by one narrow trail past Stone, Snow and Sky.',
  },
  bookmarks: [
    {
      id: 'the-eyrie-close',
      distanceKm: 10,
      elevationDeg: 4,
      azimuthDeg: 165,
      fov: 32,
      lift: 0.6,
      aimKm: [0.3, 1.6],
      tod: 9.5,
      note: 'hero: from the south-south-east, level with the shoulder: the seven slender white towers bunched on their crag at the end of the spur against the sky, the rope down to Sky, the Lance’s rock flank rising on the right toward its snowy head',
    },
    {
      id: 'the-eyrie-wide',
      distanceKm: 55,
      elevationDeg: 19,
      azimuthDeg: 190,
      fov: 32,
      tod: 10,
      note: 'context: the Giant’s Lance over the Vale, the Eyrie a white fleck high on its shoulder',
    },
  ],
});
