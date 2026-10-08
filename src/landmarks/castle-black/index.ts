import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2, V3 } from '../types.ts';
import { defineLandmark } from '../types.ts';
import { WALL, wallLine } from '../the-wall/index.ts';

/**
 * Castle Black at 298 AC (ledger ids per part in canon.json). T: the chief castle of the Night's Watch at the
 * foot of the Wall on its south side, where the kingsroad ends (castle-black-position, kingsroad-north-end);
 * no curtain wall of its own, open to the south (castle-black-no-curtain-wall); a loose spread of towers,
 * keeps, halls and yards built for far more men than the Watch now has, many empty or crumbling
 * (castle-black-layout); the Lord Commander's Tower, Hardin's Tower, the King's Tower and the Shieldhall
 * (castle-black-named-buildings); the Wall three times its highest tower (the-wall-height-vs-castle-black); the
 * great timber stair zigzagging up the Wall's face and the iron cage on its chain from the winch on top
 * (castle-black-stair, -winch-cage, the-wall-castle-black-access); catapults and timber cranes along the top
 * (the-wall-top); the gated tunnel through the Wall's base (castle-black-tunnel); Mole's Town dug into the
 * ground a short way south (castle-black-moles-town); the grove of nine weirwoods a short ride north in the
 * Haunted Forest (haunted-forest-weirwood-grove); manned in 298 (castle-black-manned). I: the plan, every
 * position, the forms (castle-black-plan).
 *
 * Local frame: x east, z south, origin at the sheet's marker; the Wall's centre line runs ~1.2 km north.
 */

const STONE = 0x4f4e4c;
const STONE_LIT = 0x5d5b58;
const TIMBER = 0x5a4632;
const TIMBER_DARK = 0x3e3024;
const SLATE = 0x3c3f43;

/** the Wall's centre line near the castle (z at x, local km) */
const LINE = wallLine().filter(([x]) => x > -6 && x < 6);
function wallZ(x: number): number {
  for (let i = 0; i + 1 < LINE.length; i++) {
    const [ax, az] = LINE[i];
    const [bx, bz] = LINE[i + 1];
    if (x >= ax && x <= bx) return az + ((bz - az) * (x - ax)) / (bx - ax || 1);
  }
  return -1.2;
}
/** the Wall's south face at height `y` above its foot (its half-width narrows from the base to the top) */
const faceZ = (x: number, y: number): number => wallZ(x) + (WALL.base / 2) * (1 - (WALL.batter * y) / WALL.h) + 0.004;
/** the Wall's foot as the kit's wallPath sets it (the lower of its two faces' ground); its top is WALL.h above */
const wallFoot = (k: ProxyKit, x: number): number => Math.min(k.ground(x, wallZ(x) - WALL.base / 2), k.ground(x, wallZ(x) + WALL.base / 2));

/** the buildings (I: positions, sizes; T: the named four) */
const TOWERS: { name: string; at: V2; r: number; h: number; lean?: number; ruin?: boolean }[] = [
  { name: 'kings-tower', at: [-0.32, -0.62], r: 0.07, h: 0.36 },
  { name: 'lord-commanders-tower', at: [0.2, -0.5], r: 0.075, h: 0.3 },
  { name: 'hardins-tower', at: [0.62, -0.72], r: 0.055, h: 0.28, lean: 5 },
  { name: 'flint-tower', at: [-0.78, -0.55], r: 0.05, h: 0.22, ruin: true },
  { name: 'old-keep', at: [0.95, -0.42], r: 0.06, h: 0.18, ruin: true },
];
const HALLS: { name: string; at: V2; w: number; d: number; h: number; yaw: number; ruin?: boolean }[] = [
  { name: 'shieldhall', at: [-0.08, -0.28], w: 0.34, d: 0.12, h: 0.1, yaw: 4 },
  { name: 'common-hall', at: [0.3, -0.18], w: 0.26, d: 0.11, h: 0.09, yaw: -6 },
  { name: 'armory', at: [-0.42, -0.3], w: 0.18, d: 0.1, h: 0.08, yaw: 10 },
  { name: 'barracks', at: [0.55, -0.4], w: 0.22, d: 0.09, h: 0.07, yaw: 2, ruin: true },
  { name: 'stables', at: [-0.6, -0.18], w: 0.26, d: 0.09, h: 0.06, yaw: -4 },
  { name: 'empty-keep', at: [1.1, -0.68], w: 0.2, d: 0.12, h: 0.09, yaw: 12, ruin: true },
  { name: 'empty-hall', at: [-1.0, -0.82], w: 0.22, d: 0.1, h: 0.08, yaw: -8, ruin: true },
];
/** the stair's foot and the winch on top (x along the Wall) */
const STAIR_X: [number, number] = [-0.12, 0.2];
const WINCH_X = 0.42;
const TUNNEL_X = 0.05;
/** Mole's Town down the kingsroad (T: a short way south), and the weirwood grove north of the Wall */
const MOLES: V2 = [0.25, 2.6];
const GROVE: V2 = [-1.6, -5.4];

function buildBuildings(k: ProxyKit): void {
  for (const t of TOWERS) {
    const [x, z] = t.at;
    if (t.ruin) {
      // an empty, crumbling tower (T: many stand empty or crumbling): a broken shaft, rubble at its foot
      k.tower('stone', t.r, t.h, { at: [x, 0, z], seat: 'min', sides: 12, roof: 'none', color: STONE });
      for (let i = 0; i < 4; i++) k.rock('weathered', 0.018 + 0.01 * k.r(50 + i), { at: [x + (k.r(60 + i) - 0.5) * 0.2, 0, z + 0.06 + k.r(70 + i) * 0.08], seat: true, color: STONE, lod: 0 });
      continue;
    }
    k.tower('stone', t.r, t.h, { at: [x, 0, z], seat: 'min', sides: 14, taper: 0.06, roof: 'crenel', color: STONE_LIT, rot: [t.lean ?? 0, 0, 0], windows: { rows: 3, on: 0.45, size: 0.01 } });
  }
  for (const h of HALLS) {
    k.house('stone', 'slate', h.w, h.d, h.h, {
      at: [h.at[0], 0, h.at[1]],
      rot: [0, h.yaw, 0],
      roof: h.ruin ? 'flat' : 'gable',
      pitch: 36,
      dig: 0.3,
      color: h.ruin ? STONE : STONE_LIT,
      roofColor: h.ruin ? 0x34322f : SLATE,
      ...(h.ruin ? {} : { windows: { count: 3, on: 0.45, sides: 2 as const, size: 0.011 } }),
    });
  }
  // the yards (I): trampled earth and old snow between the buildings
  k.drape('weathered', [
    [-1.15, -0.95],
    [1.25, -0.95],
    [1.25, -0.08],
    [-1.15, -0.08],
  ], { step: 0.05, lift: 0.01, color: 0x6c6862, grain: 0.6, lod: 1 });
  // fires and torches in the yards
  for (const [x, z] of [
    [0.05, -0.62],
    [-0.2, -0.45],
    [0.4, -0.32],
  ] as V2[]) {
    k.light([x, k.ground(x, z) + 0.03, z], { color: 0xffad5a, intensity: 0.8, radius: 0.015, kind: 'fire', flicker: 0.4 });
  }
}

function buildStair(k: ProxyKit): void {
  // the great timber stair (T): flights zigzagging up the Wall's south face from the yard to the top, each
  // on timber brackets bolted to the ice (I: the number of flights, their width)
  const flights = 12;
  const xm = (STAIR_X[0] + STAIR_X[1]) / 2;
  const base = wallFoot(k, xm);
  const foot = k.ground(xm, faceZ(xm, 0));
  const rise = (base + WALL.h - foot) / flights;
  for (let i = 0; i < flights; i++) {
    const [xa, xb] = i % 2 ? [STAIR_X[1], STAIR_X[0]] : [STAIR_X[0], STAIR_X[1]];
    const y0 = foot + i * rise;
    const L = Math.abs(xb - xa);
    const pitch = (Math.atan2(rise, L) * 180) / Math.PI;
    const zf = faceZ(xm, y0 - base + rise / 2) + 0.012;
    // the flight: a sloping timber deck (box along x, pitched up toward its upper end)
    k.box('wood', L, 0.006, 0.022, { at: [xm, y0 + rise / 2 - 0.003, zf], rot: [0, xb > xa ? 0 : 180, pitch], color: TIMBER });
    // a landing and a bracket at the turn
    const zl = faceZ(xm, y0 - base + rise) + 0.012;
    k.box('wood', 0.03, 0.006, 0.03, { at: [xb, y0 + rise - 0.003, zl], color: TIMBER_DARK, lod: 0 });
    k.box('wood', 0.006, 0.03, 0.01, { at: [xb, y0 + rise - 0.033, zl - 0.006], color: TIMBER_DARK, lod: 0 });
  }
  // torches on the landings by night
  for (let i = 1; i < flights; i += 3) {
    const x = i % 2 ? STAIR_X[1] : STAIR_X[0];
    k.light([x, foot + i * rise + 0.01, faceZ(xm, foot + i * rise - base) + 0.02], { color: 0xffad5a, intensity: 0.5, radius: 0.01, kind: 'fire', flicker: 0.4 });
  }
}

function buildWinchAndTop(k: ProxyKit): void {
  const foot = wallFoot(k, WINCH_X);
  const topY = foot + WALL.h;
  const zTop = wallZ(WINCH_X);
  // the winch house on top of the Wall and its arm over the south face (T: a great winch)
  k.box('wood', 0.07, 0.05, 0.05, { at: [WINCH_X, topY, zTop], color: TIMBER });
  k.box('wood', 0.008, 0.008, 0.09, { at: [WINCH_X, topY + 0.05, zTop + 0.06], color: TIMBER_DARK });
  // the chain down the face to the iron cage, partway up (T)
  const cageY = foot + WALL.h * 0.42;
  const zc = faceZ(WINCH_X, 0) + 0.04;
  k.cylinder('iron', 0.0015, 0.0015, topY + 0.05 - cageY - 0.02, { at: [WINCH_X, cageY + 0.02, zc], seg: 4, color: 0x2a2a2c, lod: 0 });
  k.box('iron', 0.022, 0.022, 0.022, { at: [WINCH_X, cageY, zc], color: 0x2e2e30 });
  // catapults and timber cranes along the top (T): a few near the castle
  for (const [i, x] of [-0.9, -0.45, 0.85, 1.3].entries()) {
    const z = wallZ(x);
    const y = wallFoot(k, x) + WALL.h;
    if (i % 2 === 0) {
      // a catapult: a frame and its throwing arm
      k.box('wood', 0.04, 0.02, 0.03, { at: [x, y, z], color: TIMBER });
      k.box('wood', 0.006, 0.006, 0.07, { at: [x, y + 0.02, z], rot: [35, 0, 0], color: TIMBER_DARK, lod: 0 });
    } else {
      // a timber crane: a mast and a jib over the north face
      k.box('wood', 0.008, 0.07, 0.008, { at: [x, y, z], color: TIMBER });
      k.box('wood', 0.006, 0.006, 0.08, { at: [x, y + 0.065, z - 0.03], color: TIMBER_DARK, lod: 0 });
    }
  }
  // the guards' fires along the top
  for (const x of [-0.6, 0.0, 0.7]) k.light([x, wallFoot(k, x) + WALL.h + 0.02, wallZ(x)], { color: 0xffad5a, intensity: 0.6, radius: 0.015, kind: 'fire', flicker: 0.4 });
}

function buildTunnel(k: ProxyKit): void {
  // the tunnel through the Wall's base (T): a dark mouth with an iron gate on the south face
  const z = faceZ(TUNNEL_X, 0.02);
  const y = k.ground(TUNNEL_X, z) - 0.01;
  k.box('darkStone', 0.045, 0.055, 0.03, { at: [TUNNEL_X, y, z - 0.008], color: 0x0e1012 });
  k.box('iron', 0.05, 0.06, 0.006, { at: [TUNNEL_X, y, z + 0.008], color: 0x262628, lod: 0 });
  k.light([TUNNEL_X + 0.04, y + 0.05, z + 0.02], { color: 0xffad5a, intensity: 0.6, radius: 0.012, kind: 'fire', flicker: 0.4 });
}

function buildMolesTown(k: ProxyKit): void {
  // Mole's Town (T): dwellings dug into the ground — turf mounds with low doors — and a few sheds above
  k.scatter(
    { circle: { at: MOLES, r: 0.35 } },
    26,
    (i, x, z, u) => {
      if (u < 0.75) {
        k.mound('foliage', 0.035 + 0.02 * k.r(500 + i), 0.018, { at: [x, 0, z], seat: true, color: 0x6a6e4c });
        k.box('darkStone', 0.012, 0.012, 0.004, { at: [x, k.ground(x, z) - 0.002, z + 0.03], color: 0x1a1612, lod: 0 });
      } else {
        k.house('wood', 'thatch', 0.06, 0.04, 0.042, { at: [x, 0, z], rot: [0, 90 * Math.round(u * 3), 0], roof: 'gable', pitch: 40, dig: 0.1, color: TIMBER, roofColor: 0x6e6046 });
      }
    },
    { minSpacing: 0.07 },
  );
  k.light([MOLES[0], k.ground(MOLES[0], MOLES[1]) + 0.03, MOLES[1]], { color: 0xffad5a, intensity: 0.6, radius: 0.015, kind: 'fire', flicker: 0.4 });
  // the kingsroad (T: it ends at Castle Black) from the south, through Mole's Town
  const road: V2[] = [
    [0.1, -0.1],
    [0.2, 0.8],
    [0.3, 1.8],
    MOLES,
    [0.2, 3.6],
    [0.0, 5.0],
  ];
  const l: V2[] = [];
  const r: V2[] = [];
  road.forEach(([x, z], i) => {
    const [ax, az] = road[Math.max(0, i - 1)];
    const [bx, bz] = road[Math.min(road.length - 1, i + 1)];
    const len = Math.hypot(bx - ax, bz - az) || 1;
    l.push([x - ((bz - az) / len) * 0.03, z + ((bx - ax) / len) * 0.03]);
    r.push([x + ((bz - az) / len) * 0.03, z - ((bx - ax) / len) * 0.03]);
  });
  k.drape('weathered', [...l, ...r.reverse()], { step: 0.03, lift: 0.01, color: 0x6e6658, lod: 1 });
}

export default defineLandmark({
  id: 'castle-black',
  placeId: 'castle-black',
  tier: 'A',
  proxy: (k) => {
    buildBuildings(k);
    buildStair(k);
    buildWinchAndTop(k);
    buildTunnel(k);
    buildMolesTown(k);
  },
  // the grove of nine weirwoods north of the Wall (T), in a clearing of the Haunted Forest
  trees: Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const r = 0.16 + 0.04 * (i % 2);
    return { at: [GROVE[0] + Math.cos(a) * r, GROVE[1] + Math.sin(a) * r] as V2, kind: 'autumn' as const, crownKm: 0.05, heightKm: 0.09, color: 0x8e2420 };
  }),
  vegetationExclusion: [
    { at: [0.05, -0.5], r: 1.4 },
    { at: MOLES, r: 0.45 },
    { at: GROVE, r: 0.45 },
  ],
  subjectKm: { at: [0, -0.7], r: 1.3 },
  contrast: 'dark',
  annotation: {
    title: 'Castle Black',
    subtitle: "The Night's Watch",
    blurb: 'Towers and halls without a wall of their own, at the foot of the Wall, where the kingsroad ends.',
  },
  bookmarks: [
    {
      id: 'castle-black-close',
      distanceKm: 6,
      elevationDeg: 12,
      azimuthDeg: 122,
      fov: 32,
      lift: 0.45,
      aimKm: [0.2, 0.6],
      tod: 15.2,
      note: 'hero: from the east-south-east along the Wall in a low, pale afternoon sun: the ice rising a kilometre over the open spread of towers and halls at its foot, the King’s Tower a third of its height, the timber stair zigzagging up the south face, the cage on its chain',
    },
    {
      id: 'castle-black-wide',
      distanceKm: 40,
      elevationDeg: 26,
      azimuthDeg: 195,
      fov: 34,
      tod: 15.0,
      note: 'context: Castle Black at the foot of the Wall where the kingsroad ends, the ice running away east and west, the Haunted Forest beyond',
    },
  ],
});
