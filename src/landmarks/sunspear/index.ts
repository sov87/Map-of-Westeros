import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * Sunspear at 298 AC (ledger ids per part in canon.json). T: the Martells' Old Palace, its chief towers the
 * Tower of the Sun, crowned by a great dome of gold and leaded glass, and the slender Spear Tower, a hundred
 * and fifty feet with a spear of gilded steel thirty feet more (sunspear-old-palace, -tower-of-the-sun,
 * -spear-tower-height); the Winding Walls enclosing the Old Palace and the Shadow City of crooked alleys,
 * hidden courts and bazaars (sunspear-winding-walls); the Threefold Gate, three gates in a straight line so a
 * visitor reaches the palace without threading the lanes (sunspear-threefold-gate); beyond the walls a
 * sprawl of mud-brick shops and windowless hovels (sunspear-mud-brick-quarter). M: on the coast of
 * south-eastern Dorne (sunspear-position). I: the plan, the stone, the forms (sunspear-plan).
 *
 * Local frame: x east, z south, origin at the sheet's marker on the spit east of the Water Gardens. The
 * spit's north and east shores meet ~2.8 km east-north-east of it, where the Old Palace stands with the sea
 * on two sides; the land is a low coastal plain (~0.6 above the sea at the origin).
 */

const SAND = 0xc9a77d;
const SAND_LIT = 0xd8b88e;
const ADOBE = [0xb98d63, 0xc49a6c, 0xae8258, 0xcba57a];
const MUD = [0x9c7652, 0x8f6c4b, 0xa47e58];
const DOME = 0xd4a640;

/** the Old Palace at the spit's north-east corner (I: its place and plan) */
const OP: V2 = [2.35, -1.1];
const SUN_TOWER: V2 = [2.42, -1.05];
const SPEAR_TOWER: V2 = [2.12, -1.22];
/** the Shadow City's centre: the Winding Walls ring it, ending at the shore */
const SC: V2 = [1.75, -0.75];
const RINGS = [0.95, 1.2, 1.45];
/** the Threefold Gate's straight road from the land to the palace (T: three gates in a line) */
const ROAD_FROM: V2 = [-0.2, 0.55];

const DEG = Math.PI / 180;

/** a winding ring round the Shadow City: radius r with a slow wobble, cut to its longest run on dry land */
function windingRing(k: ProxyKit, r: number, seed: number): V2[] {
  const n = 120;
  const pts: (V2 | null)[] = [];
  const ph = k.r(seed) * 6.283;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + 0.07 * Math.sin(5 * a + ph) + 0.04 * Math.sin(9 * a + 2 * ph));
    const p: V2 = [SC[0] + Math.cos(a) * rr, SC[1] + Math.sin(a) * rr];
    pts.push(k.ground(p[0], p[1]) > k.seaLevel + 0.06 ? p : null);
  }
  // the longest run of dry points, walking round the ring from a wet one
  const start = pts.findIndex((p) => p === null);
  let best: V2[] = [];
  let run: V2[] = [];
  for (let j = 0; j < n; j++) {
    const p = pts[(start + 1 + j) % n];
    if (p) run.push(p);
    else run = [];
    if (run.length > best.length) best = run.slice();
  }
  return best;
}

/** where a polyline crosses the straight road (the nearest vertex to the road line) */
function crossing(path: V2[]): { at: V2; i: number } {
  const [ax, az] = ROAD_FROM;
  const ex = OP[0] - ax;
  const ez = OP[1] - az;
  const L = Math.hypot(ex, ez);
  let best = { at: path[0], i: 0, d: Infinity };
  path.forEach((p, i) => {
    const d = Math.abs(((p[0] - ax) * ez - (p[1] - az) * ex) / L);
    if (d < best.d) best = { at: p, i, d };
  });
  return best;
}

function buildWalls(k: ProxyKit): V2[][] {
  const yawRoad = -Math.atan2(OP[1] - ROAD_FROM[1], OP[0] - ROAD_FROM[0]) / DEG;
  const rings = RINGS.map((r, i) => windingRing(k, r, 40 + i));
  rings.forEach((ring, i) => {
    // the ring is broken where the road passes: the gate stands in the gap (T: the Threefold Gate)
    const c = crossing(ring);
    const a = ring.slice(0, Math.max(1, c.i - 1));
    const b = ring.slice(c.i + 2);
    for (const part of [a, b]) {
      if (part.length < 2) continue;
      k.wallPath('stone', part, 0.11 + 0.02 * i, 0.04, {
        followGround: true,
        step: 0.05,
        batter: 0.15,
        color: i === 2 ? SAND : SAND_LIT,
        shadeJitter: 0.06,
        crenel: { w: 0.018, h: 0.018, gap: 0.014, lod: 0, color: SAND_LIT },
      });
    }
    // the gate: two square towers flanking the road, a dark passage between (I: their form)
    for (const s of [-1, 1]) {
      const off: V2 = [Math.sin(yawRoad * DEG) * 0.05 * s, Math.cos(yawRoad * DEG) * 0.05 * s];
      k.tower('stone', 0.038, 0.17 + 0.02 * i, { at: [c.at[0] + off[0], 0, c.at[1] + off[1]], seat: 'min', sides: 4, roof: 'crenel', color: SAND, rot: [0, yawRoad + 45, 0] });
    }
    k.box('darkStone', 0.04, 0.08, 0.05, { at: [c.at[0], k.ground(c.at[0], c.at[1]), c.at[1]], rot: [0, yawRoad, 0], color: 0x2a221b });
    k.light([c.at[0], k.ground(c.at[0], c.at[1]) + 0.1, c.at[1]], { color: 0xffb060, intensity: 0.7, radius: 0.014, kind: 'fire', flicker: 0.3 });
  });
  return rings;
}

function buildPalace(k: ProxyKit): void {
  // the Old Palace's own ward on the corner of the spit, flat-roofed halls round courts (I)
  const ward: V2[] = Array.from({ length: 10 }, (_, j): V2 => {
    const a = (j / 10) * Math.PI * 2;
    return [OP[0] + Math.cos(a) * 0.32, OP[1] + Math.sin(a) * 0.24];
  });
  k.drape('weathered', ward, { step: 0.03, lift: 0.01, color: 0xc7ad86, lod: 1 });
  const halls: [V2, number, number, number][] = [
    [[2.3, -0.92], 0.26, 0.09, 20],
    [[2.55, -1.22], 0.18, 0.08, -60],
    [[2.18, -1.02], 0.12, 0.08, 75],
    [[2.48, -0.92], 0.12, 0.07, -15],
  ];
  halls.forEach(([p, w, d, yaw], i) => {
    k.house('stone', 'plaster', w, d, 0.07 + 0.01 * (i % 2), { at: [p[0], 0, p[1]], rot: [0, yaw, 0], roof: 'flat', dig: 0.1, color: i % 2 ? SAND : SAND_LIT, roofColor: 0xc9b08a, windows: { count: 3, on: 0.6, sides: 2, size: 0.01 } });
  });
  // the Tower of the Sun under its great dome of gold and leaded glass (T)
  k.tower('stone', 0.11, 0.24, { at: [SUN_TOWER[0], 0, SUN_TOWER[1]], seat: 'min', sides: 24, roof: 'none', color: SAND_LIT, windows: { rows: 3, on: 0.55, size: 0.013 } });
  const top = k.ground(SUN_TOWER[0], SUN_TOWER[1]) + 0.24;
  k.sphere('gold', 0.115, { at: [SUN_TOWER[0], top + 0.005, SUN_TOWER[1]], squash: 0.85, color: DOME });
  k.light([SUN_TOWER[0], top + 0.06, SUN_TOWER[1]], { color: 0xffd080, intensity: 0.8, radius: 0.02, kind: 'lamp' });
  // the slender Spear Tower, a hundred and fifty feet (≈0.23 km at ×5), its gilded steel spear thirty more (T)
  k.tower('stone', 0.03, 0.23, { at: [SPEAR_TOWER[0], 0, SPEAR_TOWER[1]], seat: 'min', sides: 16, roof: 'none', color: SAND_LIT, windows: { rows: 2, on: 0.5, size: 0.008 } });
  const st = k.ground(SPEAR_TOWER[0], SPEAR_TOWER[1]) + 0.23;
  k.cylinder('gold', 0.004, 0.006, 0.04, { at: [SPEAR_TOWER[0], st, SPEAR_TOWER[1]], seg: 8, color: 0xe0b850 });
  k.cone('gold', 0.009, 0.012, { at: [SPEAR_TOWER[0], st + 0.04, SPEAR_TOWER[1]], seg: 6, color: 0xe0b850 });
}

/** a packed quarter of flat-roofed houses (I): the Shadow City inside, the mud-brick sprawl outside */
function buildQuarter(k: ProxyKit, ring: V2[], poor: boolean, n: number, seed: number): void {
  const inPoly = (poly: V2[], x: number, z: number): boolean => {
    let c = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [xa, za] = poly[a];
      const [xb, zb] = poly[b];
      if (za > z !== zb > z && x < ((xb - xa) * (z - za)) / (zb - za) + xa) c = !c;
    }
    return c;
  };
  const road = (x: number, z: number): number => {
    const [ax, az] = ROAD_FROM;
    const ex = OP[0] - ax;
    const ez = OP[1] - az;
    const L2 = ex * ex + ez * ez;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / L2));
    return Math.hypot(x - (ax + ex * t), z - (az + ez * t));
  };
  // the ring ends at the shore: closed through a point out at sea, so a point-in-polygon test works
  const closed: V2[] = [...ring, [SC[0] + 1.6, SC[1] - 1.6]];
  const R = poor ? RINGS[2] + 0.9 : RINGS[2] * 1.15;
  k.scatter(
    { circle: { at: SC, r: R } },
    n,
    (i, x, z) => {
      if (k.ground(x, z) < k.seaLevel + 0.12) return;
      if (inPoly(closed, x, z) === poor) return;
      if (road(x, z) < 0.05 || Math.hypot(x - OP[0], z - OP[1]) < 0.42) return;
      const e = 0.06;
      if (Math.hypot(k.ground(x + e, z) - k.ground(x - e, z), k.ground(x, z + e) - k.ground(x, z - e)) / (2 * e) > 0.4) return;
      const yaw = (k.r(seed + i) - 0.5) * 50 + (i % 2) * 90;
      const w = poor ? 0.05 + 0.03 * k.r(seed + 1000 + i) : 0.06 + 0.05 * k.r(seed + 1000 + i);
      const d = poor ? 0.045 + 0.02 * k.r(seed + 2000 + i) : 0.055 + 0.04 * k.r(seed + 2000 + i);
      const h = poor ? 0.058 : 0.064 + 0.03 * k.r(seed + 3000 + i);
      const dome = !poor && i % 23 === 7;
      if (dome) {
        k.tower('stone', 0.03, 0.06, { at: [x, 0, z], seat: 'min', sides: 12, roof: 'dome', roofColor: 0xc8b48e, color: ADOBE[i % ADOBE.length] });
        return;
      }
      k.house('plaster', 'plaster', w, d, h, {
        at: [x, 0, z],
        rot: [0, yaw, 0],
        roof: 'flat',
        dig: 0.06,
        color: poor ? MUD[i % MUD.length] : ADOBE[i % ADOBE.length],
        shade: 0.88 + 0.22 * k.r(seed + 4000 + i),
        roofColor: poor ? MUD[(i + 1) % MUD.length] : 0xcdb38c,
        lod: 0,
        ...(!poor && i % 9 === 4 ? { windows: { count: 1, on: 1, sides: 1 as const, size: 0.009 } } : {}),
      });
    },
    { minSpacing: poor ? 0.08 : 0.075, tries: 14 },
  );
}

export default defineLandmark({
  id: 'sunspear',
  placeId: 'sunspear',
  tier: 'A',
  proxy: (k) => {
    buildPalace(k);
    const rings = buildWalls(k);
    // the Shadow City inside the outer wall (between the walls too); the mud-brick sprawl outside it
    buildQuarter(k, rings[2], false, 900, 5000);
    buildQuarter(k, rings[2], true, 500, 9000);
    // the road through the Threefold Gate (T: straight to the palace)
    const dx = OP[0] - ROAD_FROM[0];
    const dz = OP[1] - ROAD_FROM[1];
    const L = Math.hypot(dx, dz);
    const nrm: V2 = [(-dz / L) * 0.025, (dx / L) * 0.025];
    k.drape('weathered', [
      [ROAD_FROM[0] + nrm[0], ROAD_FROM[1] + nrm[1]],
      [OP[0] + nrm[0], OP[1] + nrm[1]],
      [OP[0] - nrm[0], OP[1] - nrm[1]],
      [ROAD_FROM[0] - nrm[0], ROAD_FROM[1] - nrm[1]],
    ], { step: 0.04, lift: 0.012, color: 0xd2bb94, lod: 1 });
  },
  vegetationExclusion: [{ at: SC, r: 2.6 }],
  subjectKm: { at: [2.1, -0.95], r: 0.8 },
  contrast: 'light',
  annotation: {
    title: 'Sunspear',
    subtitle: 'Seat of House Martell',
    blurb: 'The Old Palace on the sea, its Tower of the Sun under a dome of gold and glass and the slender Spear Tower, behind the Winding Walls.',
  },
  bookmarks: [
    {
      id: 'sunspear-close',
      distanceKm: 3.6,
      elevationDeg: 14,
      azimuthDeg: 42,
      fov: 32,
      lift: 0.15,
      aimKm: [2.15, 0.95],
      tod: 17.0,
      note: 'hero: from the sea to the north-east in the late afternoon: the Old Palace on the corner of the spit, the gold dome of the Tower of the Sun and the Spear Tower, the Winding Walls and the Shadow City behind',
    },
    {
      id: 'sunspear-wide',
      distanceKm: 30,
      elevationDeg: 20,
      azimuthDeg: 35,
      fov: 34,
      tod: 17.0,
      note: 'context: Sunspear on its spit on the coast of south-eastern Dorne, the Water Gardens along the shore, the dry land behind',
    },
  ],
});
