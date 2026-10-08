import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../records.ts';
import { defineLandmark } from '../types.ts';

/**
 * Casterly Rock and Lannisport at 298 AC (ledger ids per part in canon.json). C (TWOIAF): a castle hollowed
 * out of a colossal stone hill, the Rock, standing over the Sunset Sea — its halls, galleries and passages
 * cut into the living rock, not built on top; a mountain-sized mass that dwarfs Lannisport at its foot, the
 * westerlands' rich harbour city. I: what shows outside — battlements and towers crowning the Rock and cut
 * into its flanks, galleries of lit windows across its faces, a great sea cave at the waterline, the road
 * climbing from the city (casterly-rock-carving, -sea-cave); Lannisport's walls, houses and harbour.
 *
 * Local frame: x east, z south, origin at the display position (places.json: the sheet's marker moved
 * 7.5 km west so the Rock rises from the shore — casterly-rock-form logs the conflict). The shore runs at
 * x ≈ −4…−5; the ground rises inland to the east. Design scale ≈ ×5 like King's Landing.
 */

const ROCK: V2 = [-1.0, 0.2];
/** the Rock's stone: warm grey-gold (I: the colour) */
const STONE = 0x8f8370;
const STONE_LIT = 0xa49680;
const GOLD = 0xc8a24a;
const TILE = [0x9a5a3e, 0x8e4c36, 0xa0644a, 0x86503b];
const PLASTER = [0xd9cfbd, 0xe2d9c8, 0xcfc3ab];

function polar(c: V2, bearingDeg: number, r: number): V2 {
  const t = (bearingDeg * Math.PI) / 180;
  return [c[0] + Math.sin(t) * r, c[1] - Math.cos(t) * r];
}

function buildRock(k: ProxyKit): void {
  // ---- the sea face: a sheer, banded wall of rock rising from the waterline up the Rock's west side (C: over
  // the sea). For each line across the face the foot is found where the ground meets the water.
  const SEA = k.seaLevel + 0.03;
  const waterline = (z: number): number => {
    let x = ROCK[0] - 1.5;
    while (x > ROCK[0] - 8 && k.ground(x, z) > SEA) x -= 0.05;
    return x + 0.12;
  };
  const face: V2[] = [];
  const hs: number[] = [];
  for (let z = -3.9; z <= 3.91; z += 0.3) {
    const x = waterline(z);
    face.push([x, z]);
    hs.push(Math.max(0.3, k.ground(x + 1.1, z) - SEA));
  }
  k.cliff('weathered', face, hs, { color: STONE, rough: 0.55, strata: 0.7, depth: 1.0, taper: 0.9, soft: 0.3 });
  // the sea cave at the waterline (I): a dark arch at the foot of the face
  const cz = 0.2;
  const cx = waterline(cz) - 0.02;
  k.box('darkStone', 0.14, 0.34, 0.55, { at: [cx, SEA - 0.02, cz], color: 0x16130f });
  k.cylinder('darkStone', 0.275, 0.275, 0.14, { at: [cx, SEA + 0.32, cz], rot: [0, 0, 90], seg: 12, color: 0x16130f, lod: 1 });

  // ---- carved openings in the sea face (I): rows of dark galleries and arched windows cut into the stone,
  // read by day as the castle inside the Rock
  face.forEach(([x, z], i) => {
    if (i % 2) return;
    const top = hs[i];
    for (let row = 0; row < 8; row++) {
      const y = SEA + 0.25 + row * (top * 0.75 / 8);
      if (y > SEA + top * 0.85) break;
      if (k.r(3000 + i * 10 + row) < 0.35) continue;
      const wide = row % 3 === 1;
      k.box('darkStone', 0.02, wide ? 0.05 : 0.07, wide ? 0.16 : 0.035, { at: [x - 0.015, y, z], color: 0x1c1813, lod: 0 });
      k.light([x - 0.03, y + 0.02, z], { color: 0xffc070, intensity: 0.5, radius: 0.012, kind: 'window' });
    }
  });
  // ---- galleries of windows across the sea and south faces (I): rows of lit openings cut into the stone
  for (let row = 0; row < 7; row++) {
    for (let z = -2.8; z <= 2.8; z += 0.7) {
      const x = -3.4 + row * 0.18;
      const y = k.ground(x, z) + 0.05;
      k.windows({ at: [x - 0.05, y, z], w: 0.5, h: 0.06, normal: [-1, 0, 0] }, { count: 4, on: 0.65, color: 0xffc070, size: 0.014 });
    }
  }
  for (let row = 0; row < 5; row++) {
    for (let x = -2.6; x <= 1.0; x += 0.6) {
      const z = 2.4 - row * 0.2;
      const y = k.ground(x, z) + 0.05;
      k.windows({ at: [x, y, z + 0.05], w: 0.45, h: 0.06, normal: [0, 0, 1] }, { count: 3, on: 0.6, color: 0xffc070, size: 0.013 });
    }
  }
}

function buildCrown(k: ProxyKit): void {
  // ---- the crown: a battlemented ring round the summit, towers capped in gold, a great keep (I)
  const ring: V2[] = Array.from({ length: 24 }, (_, i) => polar(ROCK, i * 15 + 5, 1.7 + 0.15 * Math.sin(i * 1.7)));
  k.wallPath('stone', ring, 0.16, 0.07, { followGround: true, closed: true, step: 0.08, batter: 0.2, color: STONE_LIT, shadeJitter: 0.08, crenel: { w: 0.025, h: 0.03, gap: 0.02, lod: 0 } });
  ring.forEach(([x, z], i) => {
    if (i % 2 !== 0) return;
    k.tower('stone', 0.09, 0.32 + (i % 2) * 0.08, { at: [x, 0, z], seat: 'min', sides: 12, roof: 'cone', roofFam: 'gold', roofColor: GOLD, roofH: 0.16, color: STONE_LIT, windows: { rows: 2, count: 2, on: 0.6, size: 0.011 } });
  });
  // the great keep on the summit and its tall towers: the Rock's silhouette over the sea
  k.house('stone', 'slate', 0.8, 0.5, 0.36, { at: [ROCK[0] + 0.1, 0, ROCK[1] - 0.05], seat: true, roof: 'hip', pitch: 30, color: STONE_LIT, roofColor: 0x5a4f40, windows: { count: 5, on: 0.8, sides: 2, size: 0.013 } });
  // halls and houses of the castle across the crown (I)
  for (const [dx, dz, w, d, h, yaw] of [
    [-0.7, -0.6, 0.42, 0.18, 0.18, 20],
    [0.7, -0.55, 0.4, 0.17, 0.16, -15],
    [0.75, 0.6, 0.45, 0.18, 0.17, 30],
    [-0.75, 0.65, 0.38, 0.16, 0.15, -25],
    [0.05, 0.85, 0.5, 0.18, 0.2, 5],
    [0.0, -0.95, 0.46, 0.17, 0.18, -5],
  ] as [number, number, number, number, number, number][])
    k.house('stone', 'slate', w, d, h, { at: [ROCK[0] + dx, 0, ROCK[1] + dz], rot: [0, yaw, 0], roof: 'hip', pitch: 32, dig: 0.4, color: STONE_LIT, roofColor: 0x5a4f40, windows: { count: 3, on: 0.7, sides: 2, size: 0.012 } });
  for (const [dx, dz, r, h] of [
    [-0.35, -0.3, 0.12, 0.9],
    [0.45, 0.25, 0.1, 0.72],
    [-0.4, 0.35, 0.09, 0.6],
    [0.9, -0.1, 0.08, 0.55],
    [-1.05, -0.05, 0.08, 0.5],
  ] as [number, number, number, number][]) {
    k.tower('stone', r, h, { at: [ROCK[0] + dx, 0, ROCK[1] + dz], seat: 'min', sides: 16, taper: 0.08, roof: 'spire', roofFam: 'gold', roofColor: GOLD, roofH: r * 3, color: STONE_LIT, windows: { rows: 3, count: 2, on: 0.7, size: 0.011 } });
  }
  // terraces cut into the upper flanks (I): stepped walls following the ground
  for (const r of [2.3, 2.9]) {
    const arc: V2[] = [];
    for (let b = 60; b <= 230; b += 10) arc.push(polar(ROCK, b, r + 0.1 * Math.sin(b * 0.05)));
    k.wallPath('stone', arc, 0.13, 0.026, { followGround: true, step: 0.05, color: STONE, crenel: { w: 0.02, h: 0.022, gap: 0.018, lod: 0 } });
  }
  // the gate on the landward (east) side of the crown and the road climbing to it from Lannisport (I)
  const gate = polar(ROCK, 100, 1.75);
  k.box('stone', 0.2, 0.26, 0.14, { at: [gate[0], 0, gate[1]], seat: 'min', rot: [0, -10, 0], color: STONE_LIT });
  k.light([gate[0] + 0.12, k.ground(gate[0], gate[1]) + 0.12, gate[1]], { color: 0xffb35a, intensity: 1.0, radius: 0.025, kind: 'fire', flicker: 0.3 });
  const road: V2[] = [gate, polar(ROCK, 112, 2.5), polar(ROCK, 135, 3.3), polar(ROCK, 155, 4.1), [0.9, 5.2], [0.45, 6.6], [0.45, 7.9]];
  // a skin, not a body: a draped band along the road's line
  const band = (path: V2[], hw: number): V2[] => {
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
  };
  k.drape('weathered', band(road, 0.045), { step: 0.03, lift: 0.01, color: 0x9a8e78, lod: 1 });
}

function buildLannisport(k: ProxyKit): void {
  // ---- Lannisport at the Rock's southern foot (C: the city spreads below the castle; I: everything shown)
  const C: V2 = [0.2, 8.2];
  const wall: V2[] = [
    [-3.4, 5.6],
    [-0.5, 5.3],
    [2.6, 5.8],
    [3.6, 7.6],
    [3.2, 10.0],
    [0.6, 11.0],
    [-2.6, 10.8],
    [-3.6, 9.6],
  ];
  k.wallPath('stone', wall, 0.12, 0.05, { followGround: true, step: 0.1, batter: 0.2, color: 0xc4b79e, shadeJitter: 0.06, crenel: { w: 0.02, h: 0.022, gap: 0.018, lod: 0 }, towers: { every: 0.9, r: 0.055, h: 0.19, sides: 12, roof: 'cone', roofFam: 'roofTile', roofColor: 0x8e4c36 } });
  const inside = (x: number, z: number): boolean => {
    let c = false;
    for (let i = 0, j = wall.length - 1; i < wall.length; j = i++) {
      const [xi, zi] = wall[i];
      const [xj, zj] = wall[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
    }
    return c;
  };
  k.drape('weathered', wall, { step: 0.15, lift: 0.012, color: 0x8a7e6a, grain: 0.5 });
  let n = 0;
  let lit = 0;
  k.scatter(
    { polygon: wall },
    1100,
    (_i, x, z, u) => {
      if (!inside(x, z)) return;
      if (Math.hypot(x - C[0], z - C[1]) < 0.35) return; // the market square
      if (Math.abs(x - 0.45) < 0.06 && z < C[1]) return; // the road from the Rock
      const i = n++;
      // streets in a loose grid turned to the harbour: rows along two axes
      const yaw = (k.r(2000 + i) < 0.5 ? 8 : 98) + (k.r(2100 + i) - 0.5) * 10;
      const big = i % 11 === 0;
      const w = big ? 0.26 : 0.12 + u * 0.1;
      const window = lit < 160 && i % 5 === 2;
      if (window) lit++;
      k.house('plaster', 'roofTile', w, big ? 0.16 : 0.09 + k.r(2200 + i) * 0.04, big ? 0.1 : 0.05 + k.r(2300 + i) * 0.04, {
        at: [x, 0, z],
        rot: [0, yaw, 0],
        roof: big ? 'hip' : 'gable',
        pitch: 34 + k.r(2400 + i) * 12,
        overhang: 0.01,
        dig: 0.4,
        color: PLASTER[i % PLASTER.length],
        shade: 0.88 + k.r(2500 + i) * 0.22,
        roofColor: TILE[i % TILE.length],
        roofGrain: 0.35,
        chimney: i % 7 === 3,
        lod: big ? 1 : 0,
        ...(window ? { windows: { count: big ? 3 : 1, on: 1, sides: 1 as const, size: 0.01 } } : {}),
      });
    },
    { minSpacing: 0.15, tries: 30 },
  );
  // a sept with a gilded dome at the market square (I)
  k.cylinder('stone', 0.14, 0.15, 0.12, { at: [C[0], k.ground(C[0], C[1]), C[1]], seg: 14, color: 0xe2dccd });
  k.sphere('gold', 0.13, { at: [C[0], k.ground(C[0], C[1]) + 0.14, C[1]], squash: 0.8, color: GOLD });
  // the harbour: quays and piers along the shore west of the walls, ships moored (I)
  for (let i = 0; i < 10; i++) {
    const z = 5.8 + i * 0.5;
    let x = -3.2;
    while (x > -8 && k.ground(x, z) > k.seaLevel + 0.03) x -= 0.05; // walk out to the waterline
    const bank = Math.max(k.ground(x + 0.1, z), k.seaLevel + 0.03);
    k.box('wood', 0.3, 0.025, 0.05, { at: [x - 0.12, bank - 0.005, z], color: 0x4b3b2b, lod: 0 });
    if (i % 2 === 0) {
      const sx = x - 0.2;
      const sz = z + 0.12;
      k.box('wood', 0.22, 0.04, 0.07, { at: [sx, k.seaLevel - 0.01, sz], color: 0x3e2f22, lod: 0 });
      k.cylinder('wood', 0.005, 0.006, 0.16, { at: [sx, k.seaLevel + 0.02, sz], seg: 5, color: 0x3e2f22, lod: 0 });
    }
  }
}

export default defineLandmark({
  id: 'casterly-rock',
  placeId: 'casterly-rock',
  tier: 'A',
  stamps: [
    // the Rock: a colossal stone hill rising from the sea, a heavy crown on short spurs (C: mountain-sized)
    {
      kind: 'massif',
      at: ROCK,
      radius: 5.2,
      summit: 4.8,
      base: -2.0,
      exponent: 0.7,
      dome: 2.4,
      flankSlope: 3.0,
      spurs: [
        { azimuthDeg: 10, lengthKm: 3.0, widthKm: 2.2, heightFrac: 0.6 },
        { azimuthDeg: 170, lengthKm: 3.2, widthKm: 2.2, heightFrac: 0.55 },
        { azimuthDeg: 95, lengthKm: 3.2, widthKm: 2.0, heightFrac: 0.6 },
      ],
      rough: { amp: 0.22, scaleKm: 1.6, ridged: true },
      surface: 'rock',
    },
    // Lannisport's ground at the Rock's southern foot, eased level
    { kind: 'flatten', at: [0.2, 8.2], radius: 2.6, falloff: 1.8, height: 'auto', strength: 0.6 },
  ],
  proxy: (k) => {
    buildRock(k);
    buildCrown(k);
    buildLannisport(k);
  },
  vegetationExclusion: [
    { at: ROCK, r: 4.2 },
    { at: [0.2, 8.2], r: 3.6 },
  ],
  contrast: 'light',
  annotation: {
    title: 'Casterly Rock',
    subtitle: 'Seat of House Lannister',
    blurb: 'A castle carved into a colossal rock over the Sunset Sea, Lannisport spread at its foot.',
  },
  bookmarks: [
    {
      id: 'casterly-rock-close',
      distanceKm: 30,
      elevationDeg: 2,
      azimuthDeg: 242,
      fov: 30,
      lift: -1.0,
      aimKm: [-1.6, -1.6],
      tod: 17.6,
      note: "hero: from the south-west over the Sunset Sea in the late sun, the Rock's banded sea face and its crown of gold-capped towers filling the upper middle, the sea cave dark at the waterline, Lannisport's walls and red roofs and its harbour at the foot on the right",
    },
    {
      id: 'casterly-rock-wide',
      distanceKm: 90,
      elevationDeg: 20,
      azimuthDeg: 235,
      fov: 34,
      tod: 17.3,
      note: 'context: the Rock on the westerlands coast, the hills rising inland',
    },
  ],
});

