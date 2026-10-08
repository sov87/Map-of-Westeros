import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../records.ts';
import { BARBICAN, DRUM_TOWERS, GREAT_HALL, HAND_TOWER, HOLDFAST, KEEP, RIVER_SCARP, WHITE_SWORD } from './layout.ts';

/**
 * The Red Keep on Aegon's High Hill (ledger: kings-landing-red-keep-stone, -towers, -maegors-holdfast,
 * -above-river, -tunnels; kings-landing-tower-of-the-hand-burned for its 298 AC state).
 *
 * T: pale red stone; seven huge drum towers crowned with iron ramparts; a massive, forbidding barbican;
 * vaulted halls, covered bridges, barracks, dungeons, granaries; thick curtain walls with archers' nests;
 * Maegor's Holdfast — a castle within the castle behind a dry moat with iron spikes, crossed by a
 * drawbridge; the keep stands over the river on a cliff.
 * I (unstated, labelled): the ward's outline, the placement of the halls and towers, roof colours, the
 * White Sword Tower's white stone in the angle over the bay, the godswood's trees.
 */

/** pale red stone, a little weathered (T: "pale red stone"; the exact hue is I) */
export const RED = 0xb9796a;
const RED_LIT = 0xc98a78;
const RED_DARK = 0x8f5a4e;
/** the iron ramparts on the drum towers (T) */
const IRON = 0x34322f;
const SLATE = 0x4c4f55;
const WHITE = 0xe8e4dc;

const CURTAIN_H = 0.3;
const CURTAIN_T = 0.11;

/** the keep's ward level, local y: the plateau's top at its centre (the stamps level it) */
function wardY(k: ProxyKit): number {
  const [cx, cz] = centroid(KEEP);
  return k.ground(cx, cz) + 0.02;
}

function centroid(p: V2[]): V2 {
  let x = 0;
  let z = 0;
  for (const [a, b] of p) {
    x += a;
    z += b;
  }
  return [x / p.length, z / p.length];
}

export function buildRedKeep(k: ProxyKit): void {
  const y = wardY(k);
  // ---- the ward floor over the levelled summit, and the hill's rock crown under the curtain wherever the
  // hillside falls away below the ward (faces outward: the ward ring walked anticlockwise on the map)
  k.extrude('stone', KEEP, 0.08, { at: [0, y - 0.08, 0], color: RED_DARK, grain: 0.35 });
  const crown: V2[] = [...KEEP, KEEP[0]].reverse();
  const crownH = crown.map(([x, z]) => {
    const [cx, cz] = centroid(KEEP);
    const ox = x + (x - cx) * 0.06;
    const oz = z + (z - cz) * 0.06;
    return Math.max(0.06, y - k.ground(ox, oz) + 0.02);
  });
  k.cliff('weathered', crown, crownH, { color: 0x7f726a, rough: 0.5, strata: 0.45, depth: 0.25, taper: 0, soft: 0.4 });

  // ---- the curtain: thick, crenellated with archers' nests (T), pale red
  k.wallPath('stone', KEEP, CURTAIN_H, CURTAIN_T, {
    at: [0, y - 0.02, 0],
    closed: true,
    batter: 0.18,
    color: RED,
    shadeJitter: 0.06,
    crenel: { w: 0.03, h: 0.035, gap: 0.022, lod: 0, color: RED_LIT },
  });

  // ---- seven great drum towers, iron ramparts on top (T)
  DRUM_TOWERS.forEach(([x, z], i) => {
    const r = i === 3 ? 0.2 : 0.16;
    const h = CURTAIN_H + 0.26 + (i % 3) * 0.05;
    k.tower('stone', r, h, { at: [x, y - 0.03, z], sides: 20, taper: 0.06, roof: 'none', color: RED, shade: 0.97 + (i % 2) * 0.06 });
    // the iron rampart: a dark crenellated crown standing proud of the drum
    k.ring('iron', r * 0.98, 0.03, 0.05, { at: [x, y - 0.03 + h, z], color: IRON, lod: 1 });
    for (let a = 0; a < 360; a += 24) {
      const t = ((a + i * 7) * Math.PI) / 180;
      k.box('iron', 0.028, 0.04, 0.022, { at: [x + Math.cos(t) * r * 0.97, y - 0.03 + h + 0.05, z + Math.sin(t) * r * 0.97], rot: [0, -a - i * 7, 0], color: IRON, lod: 0 });
    }
    // a conical slate cap behind the rampart on the three tallest (I)
    if (i % 3 === 2) k.cone('slate', r * 0.62, r * 1.1, { at: [x, y - 0.03 + h, z], color: SLATE, seg: 16 });
  });

  // ---- the barbican: a massive gatehouse projecting from the north-west face toward the city (T)
  {
    const [bx, bz] = BARBICAN.at;
    const yaw = BARBICAN.yaw;
    const rad = (yaw * Math.PI) / 180;
    const fx = -Math.sin(rad);
    const fz = -Math.cos(rad);
    // the block, its outer face toward the city
    k.box('stone', 0.46, CURTAIN_H + 0.12, 0.32, { at: [bx, y - 0.04, bz], rot: [0, yaw, 0], color: RED, lod: 1 });
    k.box('darkStone', 0.13, 0.16, 0.05, { at: [bx + fx * 0.165, y - 0.04, bz + fz * 0.165], rot: [0, yaw, 0], color: 0x241a17 });
    // its twin flanking towers
    for (const s of [-1, 1]) {
      const px = bx + Math.cos(rad) * 0.24 * s + fx * 0.12;
      const pz = bz - Math.sin(rad) * 0.24 * s + fz * 0.12;
      k.tower('stone', 0.11, CURTAIN_H + 0.24, { at: [px, y - 0.05, pz], sides: 16, roof: 'crenel', color: RED_LIT });
    }
    // crenels along its top
    const top = y - 0.04 + CURTAIN_H + 0.12;
    for (let u = -0.2; u <= 0.201; u += 0.05) k.box('stone', 0.028, 0.035, 0.03, { at: [bx + Math.cos(rad) * u + fx * 0.15, top, bz - Math.sin(rad) * u + fz * 0.15], rot: [0, yaw, 0], color: RED_LIT, lod: 0 });
  }

  // ---- Maegor's Holdfast: a square castle within the castle (T), its dry moat with iron spikes (T),
  // drawbridge across it on the north
  {
    const [hx, hz] = HOLDFAST.at;
    const s = HOLDFAST.half;
    const m = HOLDFAST.moat;
    // the moat: a dark sunken ring (the ward floor is the rim)
    const o = s + m;
    const outer: V2[] = [
      [hx - o, hz - o],
      [hx + o, hz - o],
      [hx + o, hz + o],
      [hx - o, hz + o],
    ];
    k.extrude('darkStone', outer, 0.012, { at: [0, y + 0.001, 0], color: 0x2b211e, grain: 0.4 });
    // the iron spikes on the moat floor (LOD0)
    for (let i = 0; i < 28; i++) {
      const t = i / 28;
      const side = Math.floor(t * 4);
      const u = (t * 4 - side) * 2 - 1;
      const d = s + m * 0.5;
      const [px, pz] = side === 0 ? [hx + u * d, hz - d] : side === 1 ? [hx + d, hz + u * d] : side === 2 ? [hx - u * d, hz + d] : [hx - d, hz - u * d];
      k.cone('iron', 0.008, 0.035, { at: [px, y + 0.012, pz], color: IRON, seg: 4, lod: 0 });
    }
    // the holdfast's walls and corner towers, its keep rising inside
    const ring: V2[] = [
      [hx - s, hz - s],
      [hx + s, hz - s],
      [hx + s, hz + s],
      [hx - s, hz + s],
    ];
    k.wallPath('stone', ring, 0.34, 0.07, { at: [0, y, 0], closed: true, color: RED_LIT, crenel: { w: 0.026, h: 0.03, gap: 0.02, lod: 0, color: RED_LIT } });
    for (const [x, z] of ring) k.tower('stone', 0.075, 0.46, { at: [x, y, z], sides: 16, roof: 'crenel', color: RED });
    k.house('stone', 'slate', s * 1.25, s * 1.0, 0.42, { at: [hx + 0.02, y, hz + 0.03], seat: false, roof: 'hip', pitch: 34, color: RED, roofColor: SLATE, windows: { count: 4, on: 0.75, sides: 2, size: 0.012 } });
    // the drawbridge across the moat on the north (a dark deck)
    k.box('wood', 0.09, 0.016, m + 0.04, { at: [hx, y + 0.01, hz - s - m / 2], color: 0x3d2c1f, lod: 0 });
  }

  // ---- the throne room (vaulted great hall, the Iron Throne within — kings-landing-throne-room, T)
  {
    const [gx, gz] = GREAT_HALL.at;
    k.house('stone', 'slate', GREAT_HALL.w, GREAT_HALL.d, 0.24, {
      at: [gx, y, gz],
      seat: false,
      rot: [0, GREAT_HALL.yaw, 0],
      roof: 'gable',
      pitch: 38,
      color: RED_LIT,
      roofColor: SLATE,
      windows: { count: 6, on: 0.8, sides: 2, size: 0.014, color: 0xf0b860 },
    });
  }

  // ---- the Tower of the Hand (stands at 298 AC; burned in 300 AC — ignored) and other towers of the ward
  {
    const [tx, tz] = HAND_TOWER;
    k.tower('stone', 0.1, 0.62, { at: [tx, y, tz], sides: 16, taper: 0.05, roof: 'cone', roofFam: 'slate', roofColor: SLATE, color: RED_LIT, windows: { rows: 3, count: 3, on: 0.7, size: 0.012 } });
    k.house('stone', 'slate', 0.3, 0.2, 0.2, { at: [tx + 0.18, y, tz + 0.12], seat: false, rot: [0, -10, 0], roof: 'hip', pitch: 35, color: RED, roofColor: SLATE });
  }
  // the White Sword Tower: slender, round, white stone, in the angle of the wall over the bay (I)
  k.tower('stone', 0.085, 0.62, { at: [WHITE_SWORD[0], y - 0.03, WHITE_SWORD[1]], sides: 16, taper: 0.04, roof: 'crenel', color: WHITE, windows: { rows: 2, count: 2, on: 0.6, size: 0.011 } });

  // ---- the vaulted halls, barracks, granaries round the ward (T: they exist; I: where), covered bridges
  const halls: [number, number, number, number, number][] = [
    // x, z, w, d, yaw
    [6.45, -5.05, 0.42, 0.16, 18],
    [8.05, -5.05, 0.5, 0.17, -20],
    [8.25, -4.45, 0.36, 0.16, 82],
    [6.9, -3.9, 0.55, 0.15, 3],
    [7.75, -3.82, 0.36, 0.15, -6],
    [6.25, -4.55, 0.3, 0.14, 70],
  ];
  halls.forEach(([x, z, w, d, yaw], i) => {
    k.house('stone', 'slate', w, d, 0.16 + (i % 2) * 0.05, { at: [x, y, z], seat: false, rot: [0, yaw, 0], roof: i % 3 === 0 ? 'hip' : 'gable', pitch: 36, color: i % 2 ? RED : RED_LIT, roofColor: SLATE, windows: { count: 3, on: 0.6, sides: 1, size: 0.011 } });
  });
  // covered bridges: a raised gallery from the throne room to the holdfast and one to the Hand's tower
  const gallery = (a: V2, b: V2, h: number): void => {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const yaw = (Math.atan2(-dz, dx) * 180) / Math.PI;
    k.house('stone', 'slate', len, 0.05, 0.05, { at: [(a[0] + b[0]) / 2, y + h, (a[1] + b[1]) / 2], seat: false, rot: [0, yaw, 0], roof: 'gable', pitch: 40, color: RED_LIT, roofColor: SLATE, lod: 0 });
  };
  gallery([7.2, -4.62], [7.42, -4.58], 0.2);
  gallery([6.62, -4.25], [6.8, -4.55], 0.22);

  // ---- the godswood: a stand of trees inside the ward (T: the castle has a godswood; species I)
  for (let i = 0; i < 9; i++) {
    const x = 7.75 + (k.r(40 + i) - 0.5) * 0.5;
    const z = -4.95 + (k.r(60 + i) - 0.5) * 0.28;
    k.tree(i % 3 === 0 ? 'oak' : 'poplar', x, z, { crownKm: 0.05 + k.r(80 + i) * 0.03, heightKm: 0.09 + k.r(90 + i) * 0.04 });
  }

  // ---- the cliff over the river under the High Hill (T: Sansa climbs down it to a boat): the scarp stamp
  // (index.ts) steepens the hill's foot along the bank; this is its rock face, as tall as the scarp
  const face: V2[] = [];
  const heights: number[] = [];
  for (const [x, z] of RIVER_SCARP) {
    face.push([x, z]);
    heights.push(Math.max(0.1, k.ground(x, z - 0.35) - k.ground(x, z + 0.05) + 0.04));
  }
  k.cliff('weathered', face, heights, { color: 0x86675a, rough: 0.6, strata: 0.6, depth: 0.35, taper: 0.6, soft: 0.35 });
}
