import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { LocalStamp, V2, V3 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * Dragonstone at 298 AC (ledger ids per part in canon.json). T: the island off the mouth of Blackwater Bay
 * (dragonstone-island-position M); the Dragonmont rising behind and above the castle, smoking and full of fire
 * (dragonmont-above-castle, dragonmont-smoking; the sheet letters it on the sea north-east of the island, the
 * display offset puts it on the island); a castle whose buildings are dragons — the Great Hall a dragon lying
 * on its belly, entered through its open jaws, the kitchens a coiled dragon venting smoke through its nostrils
 * (dragonstone-dragon-shaped-buildings); towers that are dragons crouched on the walls or rearing to take wing,
 * the Windwyrm and the Sea Dragon Tower among them, smaller dragons framing the lesser gates
 * (dragonstone-towers); gargoyles crowding the walls (dragonstone-gargoyles); the Stone Drum, the central keep,
 * with the Chamber of the Painted Table at its top, tall windows to the four quarters (dragonstone-stone-drum,
 * -painted-table); Stannis's seat in 298 (dragonstone-stannis-298). I: the stone shaped in place by Valyrian
 * craft (dragonstone-shaped-stone), its dark colour, the plan, the sculpture of every dragon, the port town
 * and its harbour on the south shore (dragonstone-plan).
 *
 * Local frame: x east, z south, origin at the castle's marker on the island's west part; the Dragonmont's
 * summit ~6.5 km north-east, the south shore ~8.5 km south.
 */

const BLACK = 0x2e2c2b;
const BLACK_LIT = 0x3a3836;
const BASALT = 0x262423;
const ROOF = 0x2b2d30;

/** the Dragonmont's summit (local) */
const MONT: V2 = [5.5, -3.5];
/** the castle's centre on the Dragonmont's south-west spur */
const CC: V2 = [0.4, 0.8];
/** the curtain's corners: bearings and radii about CC (I: the plan) */
const CORNERS: [number, number][] = [
  [8, 0.6],
  [62, 0.7],
  [118, 0.62],
  [168, 0.68],
  [214, 0.6],
  [266, 0.7],
  [318, 0.62],
];
/** the town and harbour on the south shore (I) */
const TOWN: V2 = [0.6, 7.7];

const DEG = Math.PI / 180;
const polar = (c: V2, deg: number, r: number): V2 => [c[0] + Math.sin(deg * DEG) * r, c[1] - Math.cos(deg * DEG) * r];

const STAMPS: LocalStamp[] = [
  // the Dragonmont (T: the island's mountain, behind and above the castle; I: its form): a cone with a crater,
  // its long south-west spur the ridge the castle stands on
  {
    kind: 'massif',
    at: MONT,
    radius: 4.2,
    summit: 6.0,
    base: -0.6,
    exponent: 1.35,
    dome: 0.1,
    spurs: [
      { azimuthDeg: 232, lengthKm: 12, widthKm: 2.4, heightFrac: 0.45, rootFrac: 0.65 },
      { azimuthDeg: 120, lengthKm: 5, widthKm: 2, heightFrac: 0.3, rootFrac: 0.55 },
      { azimuthDeg: 20, lengthKm: 4.5, widthKm: 2, heightFrac: 0.3, rootFrac: 0.55 },
      { azimuthDeg: 300, lengthKm: 4, widthKm: 2, heightFrac: 0.28, rootFrac: 0.5 },
    ],
    rough: { amp: 0.3, scaleKm: 1.6, ridged: true },
    craterRadius: 0.7,
    craterDepth: 0.7,
    surface: 'rock',
  },
  // the castle's level on the spur's crest
  { kind: 'flatten', at: CC, radius: 1.0, falloff: 0.7, height: 'auto', strength: 0.95 },
];

/** a dragon's local frame: `at` (x, y, z), facing compass bearing `b`; u forward, h up, v to its right */
function frame(at: V3, b: number) {
  const f: V2 = [Math.sin(b * DEG), -Math.cos(b * DEG)];
  const r: V2 = [Math.cos(b * DEG), Math.sin(b * DEG)];
  const P = (u: number, h: number, v: number): V3 => [at[0] + f[0] * u + r[0] * v, at[1] + h, at[2] + f[1] * u + r[1] * v];
  return { P, yaw: (d = 0) => 90 - (b + d) };
}

type Pose = 'lying' | 'crouched' | 'rearing';

/**
 * A stone dragon (I: every sculpted form; T: that they are dragons): body, tail, neck, head with open jaws,
 * wings folded or spread, spines. `s` = the body's radius (km); the whole beast is ~12 s long.
 */
function dragon(k: ProxyKit, at: V3, b: number, s: number, pose: Pose, color = BLACK): void {
  const { P, yaw } = frame(at, b);
  const lod = s < 0.02 ? 0 : 1;
  const o = { color };
  // the body: a horizontal tapered barrel from the hips (u = 0) to the shoulders
  const bodyLen = pose === 'crouched' ? 3.2 * s : 4.2 * s;
  const lift = pose === 'lying' ? 0.75 * s : 1.0 * s;
  k.cylinder('stone', 0.95 * s, 0.85 * s, bodyLen, { at: P(0, lift, 0), rot: [0, yaw(), -90], seg: 12, ...o });
  k.sphere('stone', 0.95 * s, { at: P(bodyLen, lift, 0), ...o });
  // the tail: three tapering segments swinging back and aside, each starting where the last ends
  let start = P(0, lift, 0);
  let r0 = 0.85 * s;
  for (let i = 0; i < 3; i++) {
    const T = frame(start, b + 180 + (i + 1) * 22);
    const len = 2.2 * s;
    k.cylinder('stone', r0 * 0.55, r0, len, { at: start, rot: [0, T.yaw(), -90], seg: 8, ...o, lod: i === 2 ? lod : undefined });
    start = T.P(len, -0.15 * s, 0);
    r0 *= 0.55;
  }
  // legs: four short columns (folded under for a lying dragon)
  if (pose !== 'lying') {
    for (const [u, v] of [
      [0.6 * s, 0.8 * s],
      [0.6 * s, -0.8 * s],
      [bodyLen - 0.6 * s, 0.85 * s],
      [bodyLen - 0.6 * s, -0.85 * s],
    ]) {
      k.cylinder('stone', 0.28 * s, 0.34 * s, lift, { at: P(u, 0, v), seg: 6, ...o, lod });
    }
  }
  // the neck: forward and up from the shoulders; a rearing dragon throws it high
  const pitch = pose === 'rearing' ? 62 : pose === 'crouched' ? 18 : 24;
  const neckLen = (pose === 'rearing' ? 3.4 : 2.6) * s;
  const n0 = P(bodyLen + 0.3 * s, lift + 0.2 * s, 0);
  k.cylinder('stone', 0.42 * s, 0.6 * s, neckLen, { at: n0, rot: [0, yaw(), -(90 - pitch)], seg: 10, ...o });
  const hu = bodyLen + 0.3 * s + Math.cos(pitch * DEG) * neckLen;
  const hh = lift + 0.2 * s + Math.sin(pitch * DEG) * neckLen;
  // the head, its upper jaw level and the lower jaw dropped open; two horns swept back
  const headPitch = pose === 'rearing' ? 20 : -6;
  k.box('stone', 1.9 * s, 0.55 * s, 0.75 * s, { at: P(hu + 0.75 * s, hh - 0.1 * s, 0), rot: [0, yaw(), headPitch], ...o });
  k.box('stone', 1.6 * s, 0.22 * s, 0.6 * s, { at: P(hu + 0.6 * s, hh - 0.55 * s, 0), rot: [0, yaw(), headPitch - 32], ...o, lod });
  for (const v of [0.28 * s, -0.28 * s]) k.cone('stone', 0.16 * s, 1.0 * s, { at: P(hu - 0.1 * s, hh + 0.25 * s, v), rot: [0, yaw(), 55], seg: 5, ...o, lod: 0 });
  // wings: folded along the flanks, or spread up and out for a dragon about to take wing
  const span = (pose === 'rearing' ? 5.2 : 3.4) * s;
  const chord = 2.6 * s;
  const wing: V2[] = [
    [0, -chord * 0.5],
    [span, -chord * 0.1],
    [span * 0.86, chord * 0.32],
    [span * 0.62, chord * 0.08],
    [span * 0.45, chord * 0.42],
    [span * 0.25, chord * 0.2],
    [0, chord * 0.5],
  ];
  const raise = pose === 'rearing' ? 38 : pose === 'crouched' ? -8 : -14;
  for (const side of [1, -1]) {
    // the wing's span axis points to the dragon's right (+90) or left (−90), pitched up by `raise`
    k.extrude('stone', wing, 0.12 * s, { at: P(bodyLen * 0.75, lift + 0.6 * s, side * 0.7 * s), rot: [0, yaw(side * 90), raise], ...o });
  }
  // spines along the back
  for (let i = 0; i < 5; i++) k.cone('stone', 0.18 * s, 0.7 * s, { at: P(bodyLen * (0.15 + 0.18 * i), lift + 0.85 * s, 0), seg: 4, ...o, lod: 0 });
}

/** a coiled dragon (T: the kitchens): two coils of body round a hearth, the head raised, smoke at its nostrils */
function coiled(k: ProxyKit, at: V3, b: number, s: number): V3 {
  const { P, yaw } = frame(at, b);
  k.torus('stone', 3.0 * s, 1.0 * s, { at: P(0, 0, 0), color: BLACK });
  k.torus('stone', 2.2 * s, 0.85 * s, { at: P(0, 1.7 * s, 0), color: BLACK_LIT });
  k.cylinder('stone', 2.2 * s, 2.6 * s, 2.0 * s, { at: P(0, 0, 0), seg: 18, color: BLACK });
  // the neck rising out of the coils, the head looking out over them
  k.cylinder('stone', 0.5 * s, 0.75 * s, 3.2 * s, { at: P(2.0 * s, 2.0 * s, 0), rot: [0, yaw(), -40], seg: 10, color: BLACK });
  const head = P(2.0 * s + Math.cos(50 * DEG) * 3.2 * s, 2.0 * s + Math.sin(50 * DEG) * 3.2 * s, 0);
  k.box('stone', 1.9 * s, 0.6 * s, 0.8 * s, { at: [head[0], head[1] - 0.2 * s, head[2]], rot: [0, yaw(), -8], color: BLACK });
  return P(2.0 * s + Math.cos(50 * DEG) * 3.2 * s + 1.8 * s, 2.0 * s + Math.sin(50 * DEG) * 3.2 * s, 0);
}

function buildCastle(k: ProxyKit, top: number): V3 {
  const ring: V2[] = CORNERS.map(([b, r]) => polar(CC, b, r));
  // the curtain (T: walls crowded with gargoyles; I: the shaped black stone, the plan)
  k.wallPath('stone', ring, 0.16, 0.07, {
    at: [0, top - 0.02, 0],
    closed: true,
    step: 0.05,
    batter: 0.18,
    color: BLACK,
    shadeJitter: 0.05,
    crenel: { w: 0.026, h: 0.03, gap: 0.02, lod: 0, color: BLACK_LIT },
  });
  // gargoyles (T): grotesques crouched along the battlements, every ~90 m of wall
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const c = ring[(i + 1) % ring.length];
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const out = (Math.atan2(c[0] - a[0], -(c[1] - a[1])) / DEG + 90 + 360) % 360;
    for (let t = 0.12; t < L - 0.08; t += 0.09) {
      const x = a[0] + ((c[0] - a[0]) * t) / L;
      const z = a[1] + ((c[1] - a[1]) * t) / L;
      const { P } = frame([x, top - 0.02 + 0.16, z], out);
      k.sphere('stone', 0.011, { at: P(0.035, 0.0, 0), squash: 0.8, color: BLACK_LIT, lod: 0 });
      k.cone('stone', 0.008, 0.02, { at: P(0.045, 0.006, 0), rot: [0, 90 - out, -70], seg: 4, color: BLACK_LIT, lod: 0 });
    }
  }
  // the towers (T: dragons crouched on the walls or rearing to take wing; the Windwyrm, the Sea Dragon Tower)
  CORNERS.forEach(([b, r], i) => {
    const [x, z] = polar(CC, b, r);
    const h = i === 0 ? 0.42 : i === 4 ? 0.36 : 0.26 + 0.04 * (i % 3);
    const tr = i === 0 ? 0.085 : 0.07;
    k.tower('stone', tr, h, { at: [x, top - 0.02, z], sides: 14, taper: 0.1, roof: 'none', color: BLACK_LIT, windows: { rows: 2, on: 0.35, size: 0.01 } });
    k.cylinder('stone', tr * 0.92, tr * 0.92, 0.012, { at: [x, top - 0.02 + h, z], seg: 14, color: BLACK });
    // the Windwyrm (north, i 0) rears with its wings spread; the Sea Dragon Tower (south-west, i 4) crouches
    // looking out to sea; the rest crouch facing outward
    const pose: Pose = i === 0 || i === 2 ? 'rearing' : 'crouched';
    const face = i === 4 ? 225 : b;
    const s = i === 0 ? 0.03 : 0.022;
    dragon(k, [x - Math.sin(face * DEG) * s * 2, top - 0.02 + h + 0.004, z + Math.cos(face * DEG) * s * 2], face, s, pose);
  });
  // the main gate (I) on the south toward the town, a gatehouse; a lesser gate on the west framed by two small
  // dragons (T: smaller dragons frame the lesser gates)
  const gate = polar(CC, 190, 0.66);
  k.box('stone', 0.14, 0.2, 0.1, { at: [gate[0], top - 0.02, gate[1]], rot: [0, 90 - 190 + 90, 0], color: BLACK_LIT });
  k.box('darkStone', 0.06, 0.1, 0.11, { at: [gate[0], top - 0.02, gate[1]], rot: [0, 90 - 190 + 90, 0], color: 0x141210, lod: 0 });
  k.light([gate[0], top + 0.1, gate[1] + 0.07], { color: 0xffa95a, intensity: 1.0, radius: 0.02, kind: 'fire', flicker: 0.35 });
  for (const d of [-7, 7]) {
    const [x, z] = polar(CC, 290 + d, 0.7);
    k.box('stone', 0.03, 0.03, 0.03, { at: [x, top - 0.02, z], color: BLACK });
    dragon(k, [x, top + 0.01, z], 290, 0.008, 'crouched');
  }
  // the Stone Drum (T: the central keep; the Chamber of the Painted Table at its top, round, with tall
  // windows facing the four quarters)
  const drum = polar(CC, 330, 0.12);
  k.lathe(
    'stone',
    [
      [0.17, 0],
      [0.155, 0.04],
      [0.15, 0.42],
      [0.165, 0.44],
      [0.165, 0.47],
      [0.12, 0.47],
      [0.12, 0.53],
      [0, 0.56],
    ],
    { at: [drum[0], top - 0.02, drum[1]], seg: 28, color: BLACK_LIT },
  );
  for (let i = 0; i < 4; i++) {
    const [x, z] = polar(drum, i * 90, 0.12);
    k.box('darkStone', 0.03, 0.045, 0.01, { at: [x, top - 0.02 + 0.47, z], rot: [0, -i * 90, 0], color: 0x161412, lod: 0 });
    k.light([x, top - 0.02 + 0.5, z], { color: 0xffcf8a, intensity: 0.7, radius: 0.014, kind: 'window' });
  }
  for (let row = 0; row < 3; row++)
    for (let j = 0; j < 6; j++) {
      const [x, z] = polar(drum, j * 60 + row * 30, 0.152);
      if ((row + j) % 2) k.light([x, top - 0.02 + 0.12 + row * 0.1, z], { color: 0xffcf8a, intensity: 0.45, radius: 0.01, kind: 'window' });
    }
  // the Great Hall (T: a dragon lying on its belly, entered through its open jaws): its head toward the
  // drum across the yard
  const hall = polar(CC, 120, 0.26);
  dragon(k, [hall[0], top - 0.02, hall[1]], 300, 0.055, 'lying', BLACK_LIT);
  k.light([hall[0] - 0.2, top + 0.04, hall[1] - 0.08], { color: 0xffb860, intensity: 0.8, radius: 0.02, kind: 'fire', flicker: 0.25 });
  // the kitchens (T: a coiled dragon venting smoke and steam through its nostrils)
  const kitchen = polar(CC, 225, 0.33);
  const nostrils = coiled(k, [kitchen[0], top - 0.02, kitchen[1]], 60, 0.03);
  // dragons' tails arch over the lanes of the yard (T: tails make arches), tapering from the root to the tip
  for (const [b, r, yawDeg] of [
    [35, 0.32, 125],
    [262, 0.36, 172],
  ] as const) {
    const m = polar(CC, b, r);
    const half = 0.07;
    const n = 9;
    const ax = Math.sin(yawDeg * DEG);
    const az = -Math.cos(yawDeg * DEG);
    const pts: V3[] = Array.from({ length: n + 1 }, (_, i) => {
      const t = (i / n) * Math.PI;
      return [m[0] + ax * half * Math.cos(t), top - 0.02 + 0.075 * Math.sin(t), m[1] + az * half * Math.cos(t)];
    });
    for (let i = 0; i < n; i++) {
      const [x0, y0, z0] = pts[i];
      const [x1, y1, z1] = pts[i + 1];
      const L = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
      const r0 = 0.012 * (1 - 0.75 * (i / n));
      k.cylinder('stone', r0 * 0.85, r0, L, { at: pts[i], rot: [0, (Math.atan2(z1 - z0, -(x1 - x0)) * 180) / Math.PI, (Math.acos((y1 - y0) / L) * 180) / Math.PI], seg: 6, color: BLACK_LIT, lod: 0 });
    }
  }
  // the smithy and the armoury, great stone wings folded round them (T)
  for (const [b, r, yawDeg] of [
    [70, 0.48, 70],
    [150, 0.46, 150],
  ] as const) {
    const [x, z] = polar(CC, b, r);
    k.house('stone', 'slate', 0.11, 0.07, 0.05, { at: [x, top - 0.02, z], seat: false, rot: [0, 90 - yawDeg, 0], roof: 'gable', pitch: 40, color: BLACK, roofColor: ROOF });
    const { P, yaw } = frame([x, top - 0.02, z], yawDeg);
    const wing: V2[] = [
      [0, -0.07],
      [0.1, -0.05],
      [0.085, 0.02],
      [0.06, 0.0],
      [0.045, 0.05],
      [0, 0.07],
    ];
    for (const side of [1, -1]) k.extrude('stone', wing, 0.006, { at: P(0, 0.1, side * 0.01), rot: [0, yaw(side * 90), -48], color: BLACK_LIT, lod: 0 });
  }
  // the yard (I): dark flags
  k.extrude('weathered', ring.map(([x, z]): V2 => [CC[0] + (x - CC[0]) * 0.94, CC[1] + (z - CC[1]) * 0.94]), 0.003, { at: [0, top - 0.02, 0], color: 0x403c38, lod: 1 });
  return nostrils;
}

/** the town and harbour below the castle on the south shore (I), and the road down to them */
function buildTown(k: ProxyKit, top: number): void {
  const road: V2[] = [polar(CC, 190, 0.75), [0.55, 2.4], [0.2, 3.6], [0.55, 4.9], [0.4, 6.1], [TOWN[0], TOWN[1] - 0.4]];
  const l: V2[] = [];
  const r: V2[] = [];
  road.forEach(([x, z], i) => {
    const [ax, az] = road[Math.max(0, i - 1)];
    const [bx, bz] = road[Math.min(road.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, bz - az) || 1;
    l.push([x - ((bz - az) / len) * 0.025, z + ((bx - ax) / len) * 0.025]);
    r.push([x + ((bz - az) / len) * 0.025, z - ((bx - ax) / len) * 0.025]);
  });
  k.drape('weathered', [...l, ...r.reverse()], { step: 0.03, lift: 0.01, color: 0x5a544c, lod: 1 });
  void top;
  // houses of the fishing town crowding the shore (I)
  k.scatter(
    { circle: { at: TOWN, r: 0.55 } },
    70,
    (i, x, z, u) => {
      if (k.ground(x, z) < k.seaLevel + 0.05) return;
      k.house('stone', 'slate', 0.05 + 0.03 * u, 0.035 + 0.015 * k.r(700 + i), 0.042, { at: [x, 0, z], rot: [0, Math.round(u * 4) * 90 + 8 * k.r(800 + i), 0], roof: 'gable', pitch: 38, dig: 0.1, color: 0x55504a, roofColor: ROOF, lod: 1, windows: { count: 1, on: 0.35, sides: 1, size: 0.008 } });
    },
    { minSpacing: 0.08 },
  );
  // the harbour: a stone quay along the water and a few ships moored (I)
  let shore = TOWN[1];
  while (shore < TOWN[1] + 2 && k.ground(TOWN[0], shore) > k.seaLevel) shore += 0.02;
  const qy = k.seaLevel;
  k.box('stone', 0.7, 0.03, 0.05, { at: [TOWN[0], qy - 0.01, shore - 0.02], color: 0x4a4642 });
  for (const [dx, len] of [
    [-0.2, 0.25],
    [0.15, 0.3],
  ] as const) {
    k.box('wood', 0.025, 0.012, len, { at: [TOWN[0] + dx, qy + 0.004, shore + len / 2], color: 0x5c4a36, lod: 0 });
  }
  for (let i = 0; i < 4; i++) {
    const x = TOWN[0] - 0.3 + i * 0.2;
    const z = shore + 0.18 + 0.1 * k.r(900 + i);
    k.box('wood', 0.03, 0.02, 0.1, { at: [x, qy, z], rot: [0, 10 * k.r(910 + i), 0], color: 0x3e3226 });
    k.cylinder('wood', 0.002, 0.002, 0.07, { at: [x, qy + 0.02, z], seg: 4, color: 0x3e3226, lod: 0 });
  }
  k.light([TOWN[0], k.ground(TOWN[0], TOWN[1]) + 0.04, TOWN[1]], { color: 0xffb35a, intensity: 0.6, radius: 0.02, kind: 'fire', flicker: 0.3 });
}

/** the castle's level: the highest ground under the curtain (nothing hangs over the spur's flanks) */
function castleTop(k: ProxyKit): number {
  return Math.max(...CORNERS.map(([b, r]) => k.ground(...polar(CC, b, r))), k.ground(CC[0], CC[1])) + 0.01;
}

/** the castle's rock: the spur's crest carved into a level bed, its flanks faceted dark stone (I) */
function buildBed(k: ProxyKit, top: number): void {
  const out = CORNERS.flatMap(([b, r], i) => {
    const [b2, r2] = CORNERS[(i + 1) % CORNERS.length];
    const bm = b2 > b ? (b + b2) / 2 : (b + b2 + 360) / 2;
    return [polar([0, 0], b, r + 0.08), polar([0, 0], bm, (r + r2) / 2 + 0.06)];
  });
  const minG = Math.min(...out.map(([x, z]) => k.ground(x + CC[0], z + CC[1])));
  const tiers: [number, number, number][] = [
    [0, 1, 0],
    [0.05, 1.03, 0.01],
    [0.15, 1.08, 0.03],
    [Math.max(0.3, top - minG + 0.2), 1.25, 0.04],
  ];
  const sections = tiers.map(([dy, grow, jit], t) => ({
    y: top - dy,
    rotDeg: t < 2 ? 0 : (k.r(3100 + t) - 0.5) * 8,
    outline: out.map(([x, z], j): V2 => {
      const l = Math.hypot(x, z) || 1;
      const e = grow + (jit * (k.r(3200 + t * 64 + j) - 0.35)) / l;
      return [x * e, z * e];
    }),
  }));
  k.loft('weathered', sections, { at: [CC[0], 0, CC[1]], color: BASALT, rock: true });
}

export default defineLandmark({
  id: 'dragonstone',
  placeId: 'dragonstone',
  tier: 'A',
  stamps: STAMPS,
  proxy: (k) => {
    const top = castleTop(k);
    buildBed(k, top);
    buildCastle(k, top);
    buildTown(k, top);
  },
  emitters: [
    // the Dragonmont smokes (T): a plume from the crater, steam from vents on its flanks
    // (heights local, read off tools/check/site.ts: the crater floor ~3.75 above the castle's marker)
    { preset: 'smoke', at: [MONT[0], 3.85, MONT[1]], scale: 1.1, rate: 0.6 },
    { preset: 'steam', at: [4.3, 2.9, -2.6], scale: 0.5, rate: 0.5 },
    // the coiled kitchens vent oven smoke (T)
    { preset: 'smoke', at: [CC[0] - 0.24, 1.15, CC[1] + 0.28], scale: 0.12 },
  ],
  lights: [
    // the fire inside the mountain (T: fire-filled): a dull glow in the crater
    { at: [MONT[0], 3.8, MONT[1]], color: 0xff6a2a, intensity: 1.4, radius: 0.12, kind: 'lava', flicker: 0.2 },
  ],
  vegetationExclusion: [
    { at: CC, r: 1.1 },
    { at: TOWN, r: 0.7 },
    { at: MONT, r: 2.6 },
  ],
  subjectKm: { at: CC, r: 0.8 },
  contrast: 'dark',
  annotation: {
    title: 'Dragonstone',
    subtitle: 'Seat of Stannis Baratheon',
    blurb: 'A castle of dragons in black stone under the smoking Dragonmont, off the mouth of Blackwater Bay.',
  },
  bookmarks: [
    {
      id: 'dragonstone-close',
      distanceKm: 6,
      elevationDeg: 8,
      azimuthDeg: 215,
      fov: 32,
      lift: 0.3,
      aimKm: [0.7, 0.2],
      tod: 18.4,
      note: 'hero: from the south-west at dusk: the black castle of dragons on its spur — towers crowned by crouching and rearing dragons, gargoyles along the walls, the Stone Drum lit at its top — and the smoking Dragonmont behind',
    },
    {
      id: 'dragonstone-wide',
      distanceKm: 40,
      elevationDeg: 21,
      azimuthDeg: 235,
      fov: 32,
      tod: 18.0,
      note: 'context: Dragonstone island off the mouth of Blackwater Bay, the Dragonmont smoking over it, Driftmark to the south',
    },
  ],
});
