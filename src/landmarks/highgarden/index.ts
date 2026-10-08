import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../records.ts';
import { defineLandmark } from '../types.ts';

/**
 * Highgarden at 298 AC (ledger ids per part in canon.json). M/C: the seat of House Tyrell on a hill over the
 * Mander in the heart of the Reach (highgarden-on-the-mander, -hill), enclosed by three concentric ring walls
 * of white stone (highgarden-ring-walls, -white-stone), a great maze of thorny briar hedges between two of the
 * rings (highgarden-briar-maze), the castle surrounded by gardens, orchards and fields of flowers
 * (highgarden-hill). I: slender white towers, the keep, pale slate roofs, garden courts and fountains, the
 * gates' positions (highgarden-castle-form).
 *
 * Local frame: x east, z south, origin at the marker; the Mander passes about 4 km west, running NNE → SSW.
 * Design scale ≈ ×5: the outer ring ≈ 3.1 km across.
 */

const WHITE = 0xece8de;
const WHITE_SHADE = 0xdcd6c8;
const ROOF = 0x6f7f8c;
const GOLD = 0xd0ae55;
const HEDGE = 0x2e4626;
const RINGS = { outer: { r: 1.55, h: 0.14, t: 0.06 }, middle: { r: 1.18, h: 0.17, t: 0.065 }, inner: { r: 0.82, h: 0.2, t: 0.07 } };
/** compass bearings of the gates: staggered, so the way in winds through the maze (I) */
const GATES = { outer: 40, middle: 150, inner: 260 };

function polar(bearingDeg: number, r: number, c: V2 = [0, 0]): V2 {
  const t = (bearingDeg * Math.PI) / 180;
  return [c[0] + Math.sin(t) * r, c[1] - Math.cos(t) * r];
}

/** a ring wall from bearing a0 to a1 (clockwise), as a polyline */
function arc(r: number, a0: number, a1: number, step = 6, wobble = 0): V2[] {
  const out: V2[] = [];
  for (let b = a0; b <= a1 + 1e-6; b += step) out.push(polar(b, r + wobble * Math.sin(b * 0.11)));
  return out;
}

function buildRings(k: ProxyKit): void {
  for (const [name, ring] of Object.entries(RINGS) as [keyof typeof RINGS, (typeof RINGS)['outer']][]) {
    const g = GATES[name];
    // the ring, open at its gate
    k.wallPath('stone', arc(ring.r, g + 5, g + 355, 5), ring.h, ring.t, {
      followGround: true,
      step: 0.08,
      batter: 0.12,
      color: WHITE,
      shadeJitter: 0.04,
      crenel: { w: 0.022, h: 0.024, gap: 0.018, lod: 0, color: WHITE },
      towers: { every: name === 'inner' ? 0.45 : 0.6, r: 0.06, h: ring.h + 0.09, sides: 16, roof: 'cone', roofFam: 'slate', roofColor: ROOF, color: WHITE_SHADE },
    });
    // the gatehouse
    const [gx, gz] = polar(g, ring.r);
    k.box('stone', 0.2, ring.h + 0.08, 0.12, { at: [gx, 0, gz], seat: 'min', rot: [0, 90 - g, 0], color: WHITE_SHADE });
    for (const s of [-1, 1]) {
      const [tx, tz] = polar(g + s * 5.5, ring.r);
      k.tower('stone', 0.07, ring.h + 0.16, { at: [tx, 0, tz], seat: 'min', sides: 16, roof: 'cone', roofFam: 'slate', roofColor: ROOF, roofH: 0.12, color: WHITE });
    }
    k.light([gx, k.ground(gx, gz) + ring.h * 0.6, gz], { color: 0xffc070, intensity: 0.8, radius: 0.02, kind: 'fire', flicker: 0.25 });
  }
}

function buildMaze(k: ProxyKit): void {
  // the briar maze between the outer and middle rings (C): concentric thorn hedges broken by gaps, joined by
  // short radial hedges — a maze, not a garden path
  const r0 = RINGS.middle.r + 0.07;
  const r1 = RINGS.outer.r - 0.07;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const r = r0 + ((r1 - r0) * (i + 0.5)) / n;
    let b = k.r(100 + i) * 60;
    while (b < 360) {
      const len = 30 + k.r(200 + i * 40 + b) * 70;
      const a1 = Math.min(360, b + len);
      if (a1 - b > 6) k.wallPath('foliage', arc(r, b, a1, 4), 0.035, 0.022, { followGround: true, step: 0.06, color: HEDGE, lod: 1 });
      b = a1 + 6 + k.r(300 + i * 40 + b) * 10; // a gap
    }
  }
  for (let j = 0; j < 40; j++) {
    const b = k.r(400 + j) * 360;
    const i = Math.floor(k.r(500 + j) * (n - 1));
    const ra = r0 + ((r1 - r0) * (i + 0.5)) / n;
    const rb = r0 + ((r1 - r0) * (i + 1.5)) / n;
    k.wallPath('foliage', [polar(b, ra), polar(b, rb)], 0.035, 0.022, { followGround: true, step: 0.04, color: HEDGE, lod: 0 });
  }
  // the maze's floor: dark turf between the hedges
  const outerRing = arc(r1 + 0.03, 0, 354, 6);
  const innerRing = arc(r0 - 0.03, 0, 354, 6).reverse();
  k.drape('foliage', outerRing, { step: 0.05, lift: 0.008, holes: [innerRing], color: 0x4f6a3a, grain: 0.5, lod: 1 });
}

function buildCastle(k: ProxyKit): void {
  // ---- the keep: white, under pale slate, gold finials (I)
  k.house('stone', 'slate', 0.42, 0.3, 0.3, { at: [0.05, 0, -0.05], roof: 'hip', pitch: 34, color: WHITE, roofColor: ROOF, windows: { count: 5, on: 0.8, sides: 2, size: 0.012 } });
  // ---- slender white towers (I), the tallest by the keep
  const towers: [number, number, number, number][] = [
    [0.32, -0.32, 0.075, 0.7],
    [-0.28, 0.22, 0.065, 0.58],
    [0.38, 0.3, 0.06, 0.52],
    [-0.4, -0.3, 0.06, 0.5],
    [0.0, 0.52, 0.055, 0.44],
    [0.6, 0.02, 0.055, 0.46],
    [-0.6, -0.02, 0.055, 0.44],
  ];
  towers.forEach(([x, z, r, h]) => {
    k.tower('stone', r, h, { at: [x, 0, z], seat: 'min', sides: 16, taper: 0.06, roof: 'spire', roofFam: 'slate', roofColor: ROOF, roofH: r * 3.4, color: WHITE, windows: { rows: 3, count: 2, on: 0.7, size: 0.01 } });
    k.sphere('gold', 0.012, { at: [x, k.ground(x, z) + h + r * 3.4, z], color: GOLD, lod: 0 });
  });
  // ---- halls round the inner court and between the inner and middle rings (I)
  for (let i = 0; i < 10; i++) {
    const b = i * 36 + 18;
    const r = i % 2 ? 0.98 : 0.55;
    const [x, z] = polar(b, r);
    k.house('stone', 'slate', 0.26, 0.12, 0.12, { at: [x, 0, z], rot: [0, 90 - b + 90, 0], roof: 'gable', pitch: 36, dig: 0.4, color: WHITE_SHADE, roofColor: ROOF, windows: { count: 2, on: 0.6, sides: 1, size: 0.01 } });
  }
  // ---- garden courts: lawns, flower beds, fountains with basins, little trees (I; C: gardens)
  const court = (c: V2, r: number): V2[] => Array.from({ length: 14 }, (_, i) => polar(i * (360 / 14), r, c));
  for (const [c, r] of [
    [[-0.2, -0.45], 0.16],
    [[0.32, 0.6], 0.15],
    [[-0.55, 0.45], 0.14],
  ] as [V2, number][]) {
    k.drape('foliage', court(c, r), { step: 0.03, lift: 0.006, color: 0x5d7f3e, grain: 0.4, lod: 0 });
    const y = k.ground(c[0], c[1]);
    k.cylinder('stone', 0.05, 0.05, 0.012, { at: [c[0], y, c[1]], seg: 16, color: WHITE_SHADE, lod: 0 });
    k.cylinder('obsidian', 0.042, 0.042, 0.004, { at: [c[0], y + 0.01, c[1]], seg: 16, color: 0x4f7b86, lod: 0 });
    k.cylinder('stone', 0.008, 0.012, 0.04, { at: [c[0], y + 0.01, c[1]], seg: 8, color: WHITE, lod: 0 });
    for (let i = 0; i < 5; i++) {
      const [tx, tz] = polar(i * 72 + 20, r * 0.75, c);
      k.tree('poplar', tx, tz, { crownKm: 0.018, heightKm: 0.05 });
    }
  }
}

function buildEstate(k: ProxyKit): void {
  // ---- orchards in rows on the hill's flanks (C: orchards round the castle)
  const orchards: { c: V2; w: number; d: number; yaw: number }[] = [
    { c: [2.4, -0.6], w: 1.0, d: 0.7, yaw: 15 },
    { c: [1.8, 1.9], w: 1.1, d: 0.6, yaw: -30 },
    { c: [-0.6, 2.4], w: 0.9, d: 0.6, yaw: 5 },
    { c: [0.9, -2.4], w: 1.0, d: 0.6, yaw: -10 },
  ];
  let trees = 0;
  for (const o of orchards) {
    const t = (o.yaw * Math.PI) / 180;
    for (let u = -o.w / 2; u <= o.w / 2; u += 0.09)
      for (let v = -o.d / 2; v <= o.d / 2; v += 0.09) {
        if (trees >= 360) break;
        const x = o.c[0] + u * Math.cos(t) + v * Math.sin(t);
        const z = o.c[1] - u * Math.sin(t) + v * Math.cos(t);
        k.tree('holly', x, z, { crownKm: 0.028, heightKm: 0.045, color: trees % 3 ? 0x5a7a34 : 0x6a8a3a });
        trees++;
      }
  }
  // ---- fields of flowers (C): coloured strips on the hill's lower slopes — gold, red, violet, pale (I: colours)
  const COLORS = [0xc9a43a, 0x9b3a32, 0x7a5a8c, 0xd8cfa0, 0xb86a3a];
  const fields: [V2, number, number, number][] = [
    [[-2.2, -1.2], 0.9, 0.35, 20],
    [[-2.4, 0.4], 0.8, 0.3, 35],
    [[-1.9, 1.6], 0.9, 0.32, 50],
    [[2.6, 0.9], 0.7, 0.3, -20],
    [[-0.6, -2.5], 0.8, 0.3, 0],
    [[2.0, -1.9], 0.7, 0.28, -40],
  ];
  fields.forEach(([c, w, d, yaw], i) => {
    const t = (yaw * Math.PI) / 180;
    const corners: V2[] = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2],
    ].map(([u, v]): V2 => [c[0] + u * Math.cos(t) + v * Math.sin(t), c[1] - u * Math.sin(t) + v * Math.cos(t)]);
    k.drape('foliage', corners, { step: 0.02, lift: 0.006, color: COLORS[i % COLORS.length], grain: 0.6, lod: 1 });
  });
}

export default defineLandmark({
  id: 'highgarden',
  placeId: 'highgarden',
  tier: 'A',
  stamps: [
    // the hill over the Mander (C): broad and gentle, its top levelled for the rings
    { kind: 'raise', at: [0, 0], radius: 3.6, amount: 0.9, rough: { amp: 0.05, scaleKm: 1.6 }, surface: 'turf' },
    { kind: 'flatten', at: [0, 0], radius: 1.7, falloff: 1.0, height: 'auto', strength: 0.85, surface: 'turf' },
  ],
  proxy: (k) => {
    buildRings(k);
    buildMaze(k);
    buildCastle(k);
    buildEstate(k);
  },
  vegetationExclusion: [{ at: [0, 0], r: 3.4 }],
  contrast: 'light',
  annotation: {
    title: 'Highgarden',
    subtitle: 'Seat of House Tyrell',
    blurb: 'White towers within three white ring walls and a briar maze, on a hill of gardens, orchards and flowers over the Mander.',
  },
  bookmarks: [
    {
      id: 'highgarden-close',
      distanceKm: 9,
      elevationDeg: 22,
      azimuthDeg: 215,
      fov: 32,
      lift: 0.2,
      tod: 10.2,
      note: 'hero: from the south-west across the Mander in the morning: the three white rings and the dark briar maze between the outer two, the slender white towers round the keep, orchards and coloured fields of flowers on the hill',
    },
    {
      id: 'highgarden-wide',
      distanceKm: 60,
      elevationDeg: 22,
      azimuthDeg: 225,
      fov: 34,
      tod: 10.5,
      note: 'context: Highgarden on its hill over the Mander in the green heart of the Reach',
    },
  ],
});
