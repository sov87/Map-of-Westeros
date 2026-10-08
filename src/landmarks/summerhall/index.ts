import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2, V3 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * Summerhall at 298 AC (ledger ids per part in canon.json). T: once a Targaryen summer palace, now a
 * burned-out ruin where Prince Rhaegar, born there on the day of the disaster, used to go alone and sleep in
 * its ruined hall (summerhall-ruin-298). C: destroyed by a great fire during a royal gathering in 259 AC
 * (summerhall-tragedy); in the Dornish Marches (dornish-marches-holds). M: inland in the southern stormlands,
 * west to south-west of Storm's End (summerhall-location, -from-storms-end). I: a palace rather than a
 * fortress on a low hill: the roofless shell of its great hall, broken curtain, towers burned to stumps,
 * fallen stone and the wards gone to grass and trees, the soot still on the stone after forty years
 * (summerhall-plan). Nobody lives there; no light burns.
 *
 * Local frame: x east, z south, origin at the sheet's marker in the marches' rolling grassland; a low hill
 * is raised under the ruin.
 */

const STONE = 0xa59c8c;
const STONE_DIM = 0x8d8577;
const SOOT = 0x2e2a27;
const CHAR = 0x45403b;

/** the hill's crown (I) */
const HILL_Y = 0.3;
/** the great hall (I): long axis east–west, its door at the west end */
const HALL: { at: V2; L: number; W: number; h: number; yaw: number } = { at: [0.0, 0.06], L: 0.52, W: 0.17, h: 0.2, yaw: 8 };
/** the curtain's line round the palace (I): an irregular ring on the hill's crown */
const CURTAIN: V2[] = [
  [-0.5, -0.32],
  [-0.08, -0.46],
  [0.42, -0.38],
  [0.6, -0.04],
  [0.5, 0.34],
  [0.06, 0.48],
  [-0.42, 0.4],
  [-0.62, 0.04],
];
/** towers at the curtain's corners and one by the hall (I): [at, radius, standing height, broken] */
const TOWERS: [V2, number, number, boolean][] = [
  [[-0.5, -0.32], 0.05, 0.12, true],
  [[0.42, -0.38], 0.055, 0.29, false],
  [[0.6, -0.04], 0.04, 0.08, true],
  [[0.5, 0.34], 0.05, 0.17, true],
  [[-0.42, 0.4], 0.045, 0.06, true],
  [[-0.62, 0.04], 0.04, 0.1, true],
  [[0.3, -0.12], 0.065, 0.36, false],
];

/** a point of the hall's frame (along its axis u, across it v) in local km */
function hallPt(u: number, v: number): V2 {
  const a = (HALL.yaw * Math.PI) / 180;
  return [HALL.at[0] + Math.cos(a) * u + Math.sin(a) * v, HALL.at[1] - Math.sin(a) * u + Math.cos(a) * v];
}

/** the great hall's shell: piers between the tall window openings of its long walls, gable ends, no roof (I) */
function buildHall(k: ProxyKit): void {
  const { L, W, h, yaw } = HALL;
  const t = 0.024;
  const n = 7;
  for (const side of [-1, 1]) {
    for (let i = 0; i <= n; i++) {
      const u = -L / 2 + (i / n) * L;
      const p = hallPt(u, (side * W) / 2);
      // the fire brought some piers down to their lower courses (I)
      const broken = k.r(10 + i + (side + 1) * 20) < 0.3;
      const ph = broken ? h * (0.3 + 0.3 * k.r(60 + i)) : h * (0.9 + 0.1 * k.r(70 + i));
      k.box('stone', 0.036, ph, t, { at: [p[0], k.ground(p[0], p[1]) - 0.006, p[1]], rot: [0, yaw, 0], color: i % 2 ? STONE : STONE_DIM });
      // soot above the windows' heads
      if (!broken) k.box('stone', 0.038, ph * 0.22, t * 1.1, { at: [p[0], k.ground(p[0], p[1]) + ph * 0.78, p[1]], rot: [0, yaw, 0], color: SOOT, lod: 0 });
      // the sill wall below the openings, and over some of them the scorched wall-head still spanning the
      // window between two standing piers (I)
      if (i < n) {
        const q = hallPt(u + L / n / 2, (side * W) / 2);
        const gq = k.ground(q[0], q[1]);
        k.box('stone', L / n - 0.034, h * 0.2, t * 0.9, { at: [q[0], gq - 0.006, q[1]], rot: [0, yaw, 0], color: STONE_DIM });
        const nextBroken = k.r(10 + i + 1 + (side + 1) * 20) < 0.3;
        if (!broken && !nextBroken && k.r(90 + i + (side + 1) * 10) < 0.65) k.box('stone', L / n + 0.002, h * 0.16, t, { at: [q[0], gq + h * 0.74, q[1]], rot: [0, yaw, 0], color: SOOT, lod: 0 });
      }
    }
  }
  // the gable ends: the east one standing, scorched, the west one pierced by the great door (I)
  const east = hallPt(L / 2, 0);
  k.box('stone', t, h * 1.25, W, { at: [east[0], k.ground(east[0], east[1]) - 0.006, east[1]], rot: [0, yaw, 0], color: STONE_DIM });
  k.box('stone', t * 1.1, h * 0.35, W * 0.6, { at: [east[0], k.ground(east[0], east[1]) + h * 0.85, east[1]], rot: [0, yaw, 0], color: SOOT, lod: 0 });
  for (const s of [-1, 1]) {
    const w = hallPt(-L / 2, (s * W) / 3);
    k.box('stone', t, h * (s < 0 ? 1.0 : 0.6), W / 3, { at: [w[0], k.ground(w[0], w[1]) - 0.006, w[1]], rot: [0, yaw, 0], color: STONE });
  }
  // inside: the floor open to the sky, fallen roof beams and stone (I)
  for (let i = 0; i < 14; i++) {
    const p = hallPt((k.r(100 + i) - 0.5) * L * 0.85, (k.r(120 + i) - 0.5) * W * 0.7);
    const beam = i % 3 === 0;
    const s = beam ? 0.008 : 0.01 + 0.012 * k.r(140 + i);
    const rot: V3 = [(k.r(160 + i) - 0.5) * 30, k.r(180 + i) * 180, (k.r(200 + i) - 0.5) * 30];
    k.box(beam ? 'wood' : 'stone', beam ? 0.09 : s * 1.4, s, beam ? 0.009 : s, { at: [p[0], k.ground(p[0], p[1]) - s * 0.4, p[1]], rot, color: beam ? 0x1f1b18 : i % 2 ? STONE_DIM : CHAR, lod: 0 });
  }
}

/** the curtain: broken stretches of uneven height, gaps where it has fallen (I) */
function buildCurtain(k: ProxyKit): void {
  for (let i = 0; i < CURTAIN.length; i++) {
    const a = CURTAIN[i];
    const b = CURTAIN[(i + 1) % CURTAIN.length];
    const keep = k.r(300 + i);
    const pieces: [number, number][] = keep < 0.35 ? [[0.12, 0.5]] : keep < 0.75 ? [[0.08, 0.38], [0.58, 0.9]] : [[0.1, 0.9]];
    pieces.forEach(([t0, t1], j) => {
      // each stretch broken into short lengths of uneven height: a ragged, stepped top
      const m = Math.max(2, Math.round((t1 - t0) * Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05));
      for (let q = 0; q < m; q++) {
        const u0 = t0 + ((t1 - t0) * q) / m;
        const u1 = t0 + ((t1 - t0) * (q + 1)) / m;
        const p0: V2 = [a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0];
        const p1: V2 = [a[0] + (b[0] - a[0]) * u1, a[1] + (b[1] - a[1]) * u1];
        const end = q === 0 || q === m - 1 ? 0.9 : 1;
        k.wallPath('stone', [p0, p1], (0.05 + 0.055 * k.r(320 + i * 40 + j * 20 + q)) * end, 0.03, { followGround: true, step: 0.03, batter: 0.1, color: (q + j) % 3 ? STONE : STONE_DIM, shadeJitter: 0.1 });
      }
    });
  }
  // the fallen stone below the gaps (I)
  for (let i = 0; i < 40; i++) {
    const side = Math.floor(k.r(400 + i) * CURTAIN.length);
    const a = CURTAIN[side];
    const b = CURTAIN[(side + 1) % CURTAIN.length];
    const t = k.r(420 + i);
    const x = a[0] + (b[0] - a[0]) * t + (k.r(440 + i) - 0.5) * 0.12;
    const z = a[1] + (b[1] - a[1]) * t + (k.r(460 + i) - 0.5) * 0.12;
    const s = 0.012 + 0.016 * k.r(480 + i);
    k.box('stone', s * 1.3, s, s, { at: [x, k.ground(x, z) - s * 0.4, z], rot: [(k.r(500 + i) - 0.5) * 40, k.r(520 + i) * 90, (k.r(540 + i) - 0.5) * 40], color: i % 4 ? STONE_DIM : CHAR, lod: 0 });
  }
}

/** towers: most burned down to jagged stumps, two still standing to their charred tops, all roofless (I) */
function buildTowers(k: ProxyKit): void {
  TOWERS.forEach(([at, r, h, broken], i) => {
    k.tower('stone', r, h, { at: [at[0], 0, at[1]], seat: 'min', sides: 14, roof: 'none', color: i % 2 ? STONE : STONE_DIM });
    const top = k.ground(at[0], at[1]) + h;
    // a charred band at the top, ragged teeth where the upper storeys fell
    k.cylinder('stone', r * 1.01, r * 1.01, Math.min(0.04, h * 0.3), { at: [at[0], top - Math.min(0.04, h * 0.3), at[1]], seg: 14, color: SOOT, lod: 0 });
    const teeth = broken ? 4 : 7;
    for (let j = 0; j < teeth; j++) {
      const a = (j / teeth) * Math.PI * 2 + i;
      const th = (broken ? 0.012 : 0.02) + 0.035 * k.r(600 + i * 10 + j);
      k.box('stone', r * 0.7, th, 0.014, { at: [at[0] + Math.cos(a) * r * 0.82, top - 0.004, at[1] + Math.sin(a) * r * 0.82], rot: [0, (-a * 180) / Math.PI + 90, 0], color: j % 2 ? CHAR : SOOT, lod: 0 });
    }
  });
}

/** an oak or thorn grown up in the ruin, and grass over the ward (I) */
const RUIN_TREES: [V2, 'oak' | 'scrub', number][] = [
  [[-0.32, -0.14], 'oak', 0.055],
  [[-0.24, 0.26], 'oak', 0.05],
  [[0.1, 0.07], 'scrub', 0.032],
  [[-0.12, 0.04], 'scrub', 0.028],
  [[0.38, 0.2], 'oak', 0.045],
  [[-0.06, -0.3], 'scrub', 0.03],
  [[0.2, 0.32], 'scrub', 0.032],
  [[-0.46, 0.14], 'scrub', 0.028],
  [[0.46, -0.2], 'scrub', 0.026],
  [[-0.3, -0.38], 'oak', 0.04],
  [[0.62, 0.22], 'oak', 0.05],
  [[-0.7, -0.22], 'oak', 0.05],
  [[0.12, 0.56], 'scrub', 0.03],
];

export default defineLandmark({
  id: 'summerhall',
  placeId: 'summerhall',
  tier: 'B',
  // the low hill the palace stood on (I), its crown levelled for the wards
  stamps: [{ kind: 'plateau', at: [0, 0], radius: 0.75, height: HILL_Y, rim: 1.6 }],
  proxy: (k) => {
    buildHall(k);
    buildCurtain(k);
    buildTowers(k);
  },
  trees: RUIN_TREES.map(([at, kind, crownKm], i) => ({ at, kind, crownKm, color: kind === 'oak' ? 0x4f5a34 : 0x5d6040, yawDeg: i * 53 })),
  vegetationExclusion: [{ at: [0, 0], r: 0.7 }],
  subjectKm: { at: [0, 0], r: 0.6 },
  contrast: 'light',
  annotation: {
    title: 'Summerhall',
    subtitle: 'The Targaryens\' summer palace',
    blurb: 'Burned in a great fire in 259 AC, its hall open to the sky: here Prince Rhaegar was born, and came back alone to sleep among the ruins.',
  },
  bookmarks: [
    {
      id: 'summerhall-close',
      distanceKm: 2.4,
      elevationDeg: 13,
      azimuthDeg: 215,
      fov: 32,
      lift: 0.06,
      aimKm: [0, 0],
      tod: 18.3,
      note: 'hero: from the south-west in the late light: the roofless great hall\'s window piers against the sky, the scorched towers and the broken curtain on the hill, trees grown up in the wards',
    },
    {
      id: 'summerhall-wide',
      distanceKm: 24,
      elevationDeg: 20,
      azimuthDeg: 210,
      fov: 34,
      tod: 18.0,
      note: 'context: the ruin alone in the rolling grassland of the Dornish Marches',
    },
  ],
});
