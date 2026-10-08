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
 * Local frame: x east, z south, origin at the sheet's marker on the spit east of the Water Gardens; the land
 * is a low coastal plain (~0.6 above the sea at the origin) whose shore runs east-south-east ~2.5 km
 * north-east of it. The Old Palace stands at the tip of a small spur of rock and sand running out from that
 * shore, the sea on three sides (sunspear-spur); the spur is kit geometry (a ~0.6 km spur is under a texel
 * of the 1 km/px bake), like Pyke's stacks.
 */

const SAND = 0xc9a77d;
const SAND_LIT = 0xd8b88e;
const ADOBE = [0xb98d63, 0xc49a6c, 0xae8258, 0xcba57a];
const MUD = [0x9c7652, 0x8f6c4b, 0xa47e58];
const DOME = 0xd4a640;

/** the spur (T: rock and sand, the sea on three sides; I: its size): from its root on the shore out along N */
const ROOT: V2 = [2.72, -1.38];
const N: V2 = [0.5, -0.866];
const SPUR_L = 1.0;
/** a point on the spur: `u` km out from the root along it, `v` across it (east-south-east +) */
const S = (u: number, v: number): V2 => [ROOT[0] + N[0] * u - N[1] * v, ROOT[1] + N[1] * u + N[0] * v];
/** the Old Palace at the spur's tip (T), its towers and halls on it (I: the plan) */
const OP = S(0.74, 0);
const SUN_TOWER = S(0.82, 0.06);
const SPEAR_TOWER = S(0.6, -0.17);
/** the Shadow City's centre on the land behind the spur's root: the Winding Walls ring it, shore to shore */
const SC = S(-0.55, 0);
const RINGS = [0.95, 1.2, 1.45];
/** the Threefold Gate's straight road from the land through the three gates and out along the spur (T) */
const ROAD_FROM = S(-3.2, 0);

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

/** the spur's top (local y): a little above the sea */
const spurTop = (k: ProxyKit): number => k.seaLevel + 0.075;
const YAW_N = (-Math.atan2(N[1], N[0]) * 180) / Math.PI;

function buildSpur(k: ProxyKit): void {
  // the spur of rock and sand (T), lofted from the sea floor; its root runs back under the shore, its tip
  // broadens for the palace (I)
  const top = spurTop(k);
  const n = 26;
  const floor = Math.min(k.ground(OP[0], OP[1]), k.seaLevel) - 0.15;
  const outline = (grow: number, t: number): V2[] =>
    Array.from({ length: n }, (_, j): V2 => {
      const a = (j / n) * Math.PI * 2;
      // a capsule from u = -0.35 (under the shore) to the tip, wider at the palace end
      const u = (SPUR_L + 0.35) / 2 - 0.35 + Math.cos(a) * ((SPUR_L + 0.35) / 2) * grow;
      const half = 0.22 + 0.16 * Math.max(0, Math.min(1, (u - 0.3) / 0.5));
      const v = Math.sin(a) * half * grow * (0.82 + 0.3 * k.r(60 + t * n + j));
      return S(u, v);
    });
  const tiers: [number, number][] = [
    [top, 1],
    [top - 0.02, 1.05],
    [top - 0.045, 1.02],
    [k.seaLevel + 0.008, 1.14],
    [k.seaLevel - 0.03, 1.3],
    [floor, 1.5],
  ];
  k.loft('weathered', tiers.map(([y, grow], t) => ({ y, outline: outline(grow, t) })), { at: [0, 0, 0], color: 0xc2a27a, rock: true });
  // rocks at the waterline round the tip (T: rock and sand; I: where)
  for (let j = 0; j < 12; j++) {
    const a = -1.4 + (j / 11) * 2.8;
    const p = S(0.32 + Math.cos(a) * 0.72, Math.sin(a) * 0.44);
    const r = 0.012 + 0.025 * k.r(90 + j) ** 2;
    k.rock('weathered', r, { at: [p[0], k.seaLevel - r * 0.3, p[1]], squash: 0.5, color: 0x9c8466, lod: 1 });
  }
  // the road along the spur from the shore to the palace gate (T: straight to the palace)
  const a = S(0.1, 0);
  const b = S(0.5, 0);
  k.box('stone', Math.hypot(b[0] - a[0], b[1] - a[1]), 0.004, 0.05, { at: [(a[0] + b[0]) / 2, top, (a[1] + b[1]) / 2], rot: [0, YAW_N, 0], color: 0xd2bb94, lod: 1 });
}

function buildPalace(k: ProxyKit): void {
  // the Old Palace on the spur's tip: a sea wall round its ward, flat-roofed halls round courts (I)
  const top = spurTop(k);
  const ward: V2[] = Array.from({ length: 14 }, (_, j): V2 => {
    const a = (j / 14) * Math.PI * 2;
    return S(0.76 + Math.cos(a) * 0.25, Math.sin(a) * 0.3);
  });
  k.wallPath('stone', ward, 0.07, 0.03, { closed: true, at: [0, top, 0], color: SAND, shadeJitter: 0.05, crenel: { w: 0.015, h: 0.015, gap: 0.012, lod: 0, color: SAND_LIT } });
  const halls: [V2, number, number, number][] = [
    [S(0.72, 0.2), 0.22, 0.08, YAW_N],
    [S(0.95, -0.08), 0.16, 0.08, YAW_N + 90],
    [S(0.66, -0.02), 0.12, 0.08, YAW_N + 90],
    [S(0.88, 0.2), 0.11, 0.07, YAW_N + 20],
  ];
  halls.forEach(([p, w, d, yaw], i) => {
    k.house('stone', 'plaster', w, d, 0.07 + 0.01 * (i % 2), { at: [p[0], top, p[1]], seat: false, rot: [0, yaw, 0], roof: 'flat', color: i % 2 ? SAND : SAND_LIT, roofColor: 0xc9b08a, windows: { count: 3, on: 0.6, sides: 2, size: 0.01 } });
  });
  // the palace gate where the road meets the ward (I)
  for (const sd of [-1, 1]) {
    const g = S(0.5, sd * 0.05);
    k.tower('stone', 0.028, 0.12, { at: [g[0], top, g[1]], sides: 4, roof: 'crenel', color: SAND_LIT, rot: [0, YAW_N + 45, 0] });
  }
  // the Tower of the Sun under its great dome of gold and leaded glass (T)
  k.tower('stone', 0.11, 0.24, { at: [SUN_TOWER[0], top, SUN_TOWER[1]], sides: 24, roof: 'none', color: SAND_LIT, windows: { rows: 3, on: 0.55, size: 0.013 } });
  const sunTop = top + 0.24;
  k.sphere('gold', 0.115, { at: [SUN_TOWER[0], sunTop + 0.005, SUN_TOWER[1]], squash: 0.85, color: DOME });
  k.light([SUN_TOWER[0], sunTop + 0.06, SUN_TOWER[1]], { color: 0xffd080, intensity: 0.8, radius: 0.02, kind: 'lamp' });
  // the slender Spear Tower, a hundred and fifty feet (≈0.23 km at ×5), its gilded steel spear thirty more (T)
  k.tower('stone', 0.03, 0.23, { at: [SPEAR_TOWER[0], top, SPEAR_TOWER[1]], sides: 16, roof: 'none', color: SAND_LIT, windows: { rows: 2, on: 0.5, size: 0.008 } });
  const st = top + 0.23;
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
    buildSpur(k);
    buildPalace(k);
    const rings = buildWalls(k);
    // the Shadow City inside the outer wall (between the walls too); the mud-brick sprawl outside it
    buildQuarter(k, rings[2], false, 900, 5000);
    buildQuarter(k, rings[2], true, 500, 9000);
    // the road through the Threefold Gate to the spur's root (T: straight to the palace; on along the spur)
    const end = S(0.05, 0);
    const dx = end[0] - ROAD_FROM[0];
    const dz = end[1] - ROAD_FROM[1];
    const L = Math.hypot(dx, dz);
    const nrm: V2 = [(-dz / L) * 0.025, (dx / L) * 0.025];
    k.drape('weathered', [
      [ROAD_FROM[0] + nrm[0], ROAD_FROM[1] + nrm[1]],
      [end[0] + nrm[0], end[1] + nrm[1]],
      [end[0] - nrm[0], end[1] - nrm[1]],
      [ROAD_FROM[0] - nrm[0], ROAD_FROM[1] - nrm[1]],
    ], { step: 0.04, lift: 0.012, color: 0xd2bb94, lod: 1 });
  },
  vegetationExclusion: [{ at: SC, r: 2.6 }],
  subjectKm: { at: S(0.2, 0), r: 0.9 },
  contrast: 'light',
  annotation: {
    title: 'Sunspear',
    subtitle: 'Seat of House Martell',
    blurb: 'The Old Palace on the sea, its Tower of the Sun under a dome of gold and glass and the slender Spear Tower, behind the Winding Walls.',
  },
  bookmarks: [
    {
      id: 'sunspear-close',
      distanceKm: 3.4,
      elevationDeg: 15,
      azimuthDeg: 100,
      fov: 32,
      lift: 0.15,
      aimKm: [S(0.25, 0)[0], -S(0.25, 0)[1]],
      tod: 17.0,
      note: 'hero: from the sea to the east in the late afternoon: the Old Palace at the tip of its spur with the sea on three sides, the gold dome of the Tower of the Sun and the Spear Tower, the Winding Walls and the Shadow City behind',
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
