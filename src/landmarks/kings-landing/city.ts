import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../records.ts';
import { CITY_RING, CITY_WALL, GATES, HILLS, KEEP, PIT, SEPT, along, distToPath, inside, riverZ, streets } from './layout.ts';

/**
 * The city of King's Landing round the three hills: the wall and its seven gates, the houses, Flea Bottom,
 * the riverfront below the Mud Gate.
 *
 * T — the seven gates and their names (kings-landing-seven-gates), the Mud Gate on the riverfront with docks
 * below the walls (kings-landing-mud-gate), Flea Bottom's crowded warren in the low ground (kings-landing-flea-bottom).
 * I — the wall's course, height and stone; where each gate stands; streets; house sizes and roofs
 * (pale plaster and timber under red-brown tile, slate on the richer hills, dark thatch and patched roofs in
 * Flea Bottom); the riverfront's piers and ships.
 */

const WALL = 0xcbbfa8;
const WALL_LIT = 0xd8cdb6;
const TILE = [0x8e4c36, 0x9a5a3e, 0x7f4532, 0xa0644a, 0x86503b];
const SLATE = [0x55585d, 0x5f6266, 0x4b4e53];
const POOR = [0x6a5a48, 0x5d5244, 0x75634d, 0x534a3f];
const PLASTER = [0xd9cfbd, 0xe2d9c8, 0xcabfa9, 0xd2c4aa];
const TIMBER = 0x5a4632;

export function buildWalls(k: ProxyKit): void {
  // the wall: pale stone, crenellated, a tower every ~1.1 km, following the ground (I)
  k.wallPath('stone', CITY_WALL, 0.17, 0.065, {
    followGround: true,
    step: 0.12,
    batter: 0.2,
    color: WALL,
    shadeJitter: 0.06,
    crenel: { w: 0.024, h: 0.026, gap: 0.02, lod: 0, color: WALL_LIT },
    towers: { every: 1.1, r: 0.07, h: 0.25, sides: 12, roof: 'crenel', color: WALL_LIT },
  });
  // the seven gatehouses: a block across the wall between twin towers (T: the gates; I: their form)
  for (const g of GATES) {
    const [x, z] = along(CITY_WALL, g.t);
    const [ax, az] = along(CITY_WALL, g.t - 0.004);
    const [bx, bz] = along(CITY_WALL, g.t + 0.004);
    const yaw = (Math.atan2(-(bz - az), bx - ax) * 180) / Math.PI;
    const big = g.id === 'mud' || g.id === 'king' || g.id === 'gods';
    k.box('stone', big ? 0.3 : 0.24, big ? 0.27 : 0.23, 0.16, { at: [x, 0, z], seat: 'min', rot: [0, yaw, 0], color: WALL_LIT });
    const rad = (yaw * Math.PI) / 180;
    for (const s of [-1, 1]) {
      const tx = x + Math.cos(rad) * (big ? 0.19 : 0.16) * s;
      const tz = z - Math.sin(rad) * (big ? 0.19 : 0.16) * s;
      k.tower('stone', big ? 0.085 : 0.07, big ? 0.36 : 0.31, { at: [tx, 0, tz], seat: 'min', sides: 12, roof: 'crenel', color: WALL, windows: { rows: 1, count: 2, on: 0.5, size: 0.01 } });
    }
    k.light([x, k.ground(x, z) + 0.2, z], { color: 0xffb35a, intensity: 1.2, radius: 0.03, kind: 'fire', flicker: 0.3 });
  }
}

/** a house-free test: the keep and its slopes, the sept's hall and plaza, the pit, the streets, the wall's inside foot */
function blocked(x: number, z: number, roads: V2[][]): boolean {
  if (inside(KEEP, x, z) || distToPath([...KEEP, KEEP[0]], x, z) < 0.25) return true;
  if (Math.hypot(x - HILLS.aegon.at[0], z - HILLS.aegon.at[1]) < 1.15 && z > -4.0) return true; // the cliff side under the keep
  if (Math.hypot(x - SEPT.at[0], z - SEPT.at[1]) < SEPT.r * 1.55) return true;
  if (Math.abs(x - SEPT.plazaAt[0]) < 0.62 && Math.abs(z - SEPT.plazaAt[1]) < 0.45) return true;
  if (Math.hypot(x - PIT.at[0], z - PIT.at[1]) < PIT.r + 0.32) return true;
  if (distToPath(CITY_WALL, x, z) < 0.18) return true;
  for (const r of roads) if (distToPath(r, x, z) < 0.075) return true;
  return false;
}

/** Flea Bottom: the low ground between the three hills (T: a warren of alleys; I: its extent) */
function fleaBottom(x: number, z: number): number {
  const d = Math.hypot((x - 0.4) / 2.6, (z + 4.6) / 1.9);
  return Math.max(0, 1 - d);
}

/**
 * The city's ground: packed earth and cobbles between the houses (I) — a draped sheet over the walled
 * area, leaving the keep's ward and the hilltop floors of the sept and the pit to their own paving. From
 * afar it is what tells a crowded city from a walled meadow.
 */
export function buildGround(k: ProxyKit): void {
  const circle = (c: V2, r: number): V2[] => Array.from({ length: 18 }, (_, i): V2 => [c[0] + Math.cos((i * Math.PI) / 9) * r, c[1] + Math.sin((i * Math.PI) / 9) * r]);
  k.drape('weathered', CITY_RING, {
    step: 0.2,
    lift: 0.015,
    holes: [KEEP, circle(SEPT.at, SEPT.r * 1.3), circle(PIT.at, PIT.r + 0.05)],
    color: 0x857a66,
    grain: 0.55,
  });
}

/** the hills the streets ring round (centre, the radius their rings are scaled by) */
const RINGS: { at: V2; r: number }[] = [
  { at: HILLS.aegon.at, r: 3.4 },
  { at: HILLS.visenya.at, r: 3.6 },
  { at: HILLS.rhaenys.at, r: 3.4 },
];

/**
 * The houses: rows along ring streets round each hill (every house belongs to its nearest hill — the
 * streets of a hill town wind round the hill; where two hills' rings meet the rows jostle, as in Flea
 * Bottom), every fourth ring left open as a street, radial lanes every 30°, the main streets kept clear.
 * Rich slopes near the keep and the sept get larger houses under slate (some big enough for the LOD1
 * roofscape); Flea Bottom small timber hovels under dark thatch. (All I: the books give no plan.)
 */
export function buildHouses(k: ProxyKit): void {
  const roads = streets();
  const owner = (x: number, z: number): number => {
    let best = Infinity;
    let o = 0;
    RINGS.forEach((h, i) => {
      const d = Math.hypot(x - h.at[0], z - h.at[1]) / h.r;
      if (d < best) {
        best = d;
        o = i;
      }
    });
    return o;
  };
  let n = 0;
  let lit = 0;
  const RING_STEP = 0.235;
  RINGS.forEach((h, hi) => {
    for (let ri = 0; ri < 64; ri++) {
      const r = 0.55 + ri * RING_STEP;
      if (ri % 4 === 3) continue; // a ring street
      const circ = 2 * Math.PI * r;
      let a = k.r(5000 + hi * 100 + ri) * 0.4;
      // each ring wanders (two slow waves with their own phases) so the streets wind instead of terracing
      const ph1 = k.r(5100 + hi * 100 + ri) * 6.283;
      const ph2 = k.r(5200 + hi * 100 + ri) * 6.283;
      // lanes: radial cuts at their own bearings per hill, plus short gaps (alleys) along the rows
      while (a < circ) {
        const w = 0.15 + k.r(6000 + n) * 0.1;
        const t = (a + w / 2) / r; // angle, radians (0 = east, increasing toward +z: south)
        const wob = 0.075 * Math.sin(2 * t + ph1) + 0.05 * Math.sin(5 * t + ph2);
        const x = h.at[0] + Math.cos(t) * (r + wob);
        const z = h.at[1] + Math.sin(t) * (r + wob);
        a += w + 0.02 + k.r(7000 + n) * 0.05;
        if (k.r(7500 + n + ri * 13) < 0.07) {
          a += 0.09; // an alley
          continue;
        }
        const deg = ((t * 180) / Math.PI + 360 + hi * 11) % 360;
        if (deg % 36 < 2.4 * (1 / Math.max(0.6, r / 3))) continue; // radial lanes
        if (owner(x, z) !== hi || !inside(CITY_RING, x, z) || blocked(x, z, roads)) continue;
        const e = 0.08;
        const gx = (k.ground(x + e, z) - k.ground(x - e, z)) / (2 * e);
        const gz = (k.ground(x, z + e) - k.ground(x, z - e)) / (2 * e);
        if (Math.hypot(gx, gz) > 1.9) continue;
        const poor = fleaBottom(x, z) > 0.2;
        const rich = !poor && (Math.hypot(x - HILLS.visenya.at[0], z - HILLS.visenya.at[1]) < 2.0 || Math.hypot(x - HILLS.aegon.at[0], z - HILLS.aegon.at[1]) < 2.4);
        const i = n++;
        // the ridge along the ring (tangent): local +x onto (−sin t, cos t); three's +yaw turns x toward −z
        const yaw = (Math.atan2(-Math.cos(t), -Math.sin(t)) * 180) / Math.PI + (k.r(8000 + i) - 0.5) * 8;
        const big = rich && i % 6 === 0;
        const ww = poor ? w * 0.75 : big ? w * 1.7 : w;
        const d = poor ? 0.085 + k.r(9000 + i) * 0.03 : big ? 0.17 + k.r(9000 + i) * 0.04 : 0.11 + k.r(9000 + i) * 0.04;
        const hh = poor ? 0.04 + k.r(9500 + i) * 0.015 : big ? 0.1 + k.r(9500 + i) * 0.04 : 0.055 + k.r(9500 + i) * 0.035;
        const window = !poor && lit < 300 && i % 7 === 3;
        if (window) lit++;
        k.house(poor ? 'wood' : 'plaster', poor ? 'thatch' : rich ? 'slate' : 'roofTile', ww, d, hh, {
          at: [x, 0, z],
          rot: [0, yaw, 0],
          roof: big || (rich && i % 3 === 0) ? 'hip' : 'gable',
          pitch: 36 + k.r(9700 + i) * 14,
          overhang: 0.01,
          dig: 0.4,
          color: poor ? TIMBER : PLASTER[i % PLASTER.length],
          shade: 0.86 + k.r(9800 + i) * 0.24,
          roofColor: poor ? POOR[i % POOR.length] : rich ? SLATE[i % SLATE.length] : TILE[i % TILE.length],
          roofGrain: poor ? 0.6 : 0.35,
          chimney: !poor && i % 9 === 4,
          lod: big ? 1 : 0,
          ...(window ? { windows: { count: big ? 3 : 1, on: 1, sides: 1 as const, size: 0.01 } } : {}),
        });
      }
    }
  });
}

/** the riverfront below the Mud Gate: wharves along the bank and ships at them (T: docks; I: their form) */
export function buildRiverfront(k: ProxyKit): void {
  const mud = along(CITY_WALL, GATES[0].t);
  for (let i = 0; i < 9; i++) {
    const x = mud[0] - 2.2 + i * 0.55;
    const zb = riverZ(x) - 0.33;
    // the bank's top here: piers and ships stand at it over the water (not seated on the river bed)
    const bank = k.ground(x, zb - 0.05);
    // a pier out from the bank into the river
    k.box('wood', 0.05, 0.03, 0.22, { at: [x, bank - 0.01, zb + 0.08], color: 0x4b3b2b, lod: 0 });
    if (i % 2 === 0) {
      // a cog moored at the pier (I): hull, a mast
      const sx = x + 0.12;
      const sz = zb + 0.17;
      k.box('wood', 0.07, 0.035, 0.2, { at: [sx, bank - 0.04, sz], color: 0x3e2f22, lod: 0 });
      k.cylinder('wood', 0.004, 0.005, 0.13, { at: [sx, bank - 0.01, sz], seg: 5, color: 0x3e2f22, lod: 0 });
    }
  }
  // the quay: a stone strip along the bank under the wall
  const quay: V2[] = [];
  for (let x = mud[0] - 2.4; x <= mud[0] + 2.4; x += 0.2) quay.push([x, riverZ(x) - 0.36]);
  k.wallPath('stone', quay, 0.07, 0.05, { followGround: true, step: 0.1, color: 0xa79d8a, lod: 1 });
}
