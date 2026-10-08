import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../records.ts';
import {
  BROKEN_TOWER,
  FIRST_KEEP,
  GLASS,
  GODSWOOD,
  GREAT_HALL,
  GREAT_KEEP,
  HALLS,
  HUNTERS_GATE_Z,
  INNER,
  MAIN_GATE_Z,
  MOAT,
  OUTER,
  SEPT,
  TOWERS,
  TOWN,
  squareRing,
} from './layout.ts';

/** grey stone (T: grey; the hue I), weathered darker on the old parts */
const GREY = 0x8d8b86;
const GREY_LIT = 0x9d9b95;
const GREY_OLD = 0x6f6d68;
const SLATE = 0x4a4d52;
const TIMBER = 0x4f3e2e;
const THATCH = [0x6e6450, 0x7a6e56, 0x655c4a];
/** the glass gardens' panes: pale, glossy, a touch of green (I) */
const GLASS_TINT = 0xbfd4cf;

function polyRing(c: V2, r: number, n: number, a0 = 0): V2[] {
  return Array.from({ length: n }, (_, i): V2 => {
    const t = a0 + (i * 2 * Math.PI) / n;
    return [c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r];
  });
}

export function buildWalls(k: ProxyKit): void {
  // ---- the outer curtain (80 ft) and the inner (100 ft, the higher — T), towers at the corners and between
  const outer = squareRing(OUTER.half, 0.22);
  const inner = squareRing(INNER.half, 0.16);
  // gaps for the gates: the walls are drawn as two open paths each, split at the main gate (east) and the
  // Hunter's Gate (west)
  const split = (ring: V2[], half: number): V2[][] => {
    // east side x = +half, west side x = −half; walk the ring and cut out the gate spans
    const gw = 0.09;
    const pts = [...ring, ring[0]];
    const north: V2[] = [];
    const south: V2[] = [];
    // ring order: NW-top, NE-top, NE-side, SE-side, SE-bottom, SW-bottom, SW-side, NW-side
    north.push([-half, HUNTERS_GATE_Z - gw], pts[7], pts[0], pts[1], pts[2], [half, MAIN_GATE_Z - gw]);
    south.push([half, MAIN_GATE_Z + gw], pts[3], pts[4], pts[5], pts[6], [-half, HUNTERS_GATE_Z + gw]);
    return [north, south];
  };
  for (const part of split(outer, OUTER.half)) {
    k.wallPath('stone', part, OUTER.h, OUTER.t, {
      followGround: true,
      step: 0.08,
      batter: 0.18,
      color: GREY,
      shadeJitter: 0.06,
      crenel: { w: 0.022, h: 0.026, gap: 0.018, lod: 0, color: GREY_LIT },
      towers: { every: 0.55, r: 0.055, h: OUTER.h + 0.08, sides: 4, roof: 'crenel', color: GREY_LIT },
    });
  }
  for (const part of split(inner, INNER.half)) {
    k.wallPath('stone', part, INNER.h, INNER.t, {
      followGround: true,
      step: 0.08,
      batter: 0.16,
      color: GREY_LIT,
      shadeJitter: 0.05,
      crenel: { w: 0.024, h: 0.028, gap: 0.02, lod: 0, color: GREY_LIT },
      towers: { every: 0.5, r: 0.065, h: INNER.h + 0.1, sides: 4, roof: 'crenel', color: GREY },
    });
  }
  // round corner towers on the inner wall (the castle's silhouette)
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    k.tower('stone', 0.11, INNER.h + 0.16, { at: [sx * (INNER.half - 0.05), 0, sz * (INNER.half - 0.05)], seat: 'min', sides: 18, roof: 'crenel', color: GREY, windows: { rows: 2, count: 2, on: 0.5, size: 0.01 } });
  }

  // ---- the moat between the walls (T), still water at 298 AC: a dark glassy strip (I: its look)
  const mo = squareRing(MOAT.outer, 0.2);
  const mi = squareRing(MOAT.inner, 0.17);
  k.drape('obsidian', mo, { step: 0.05, lift: 0.004, holes: [mi], color: 0x2f3a3e, lod: 1 });

  // ---- the gates: twin-towered gatehouses in both walls, a bridge over the moat
  const gate = (x: number, z: number, h: number, yaw: number, big: boolean): void => {
    k.box('stone', 0.11, h + 0.06, big ? 0.24 : 0.18, { at: [x, 0, z], seat: 'min', rot: [0, yaw, 0], color: GREY_LIT });
    for (const s of [-1, 1]) k.tower('stone', big ? 0.06 : 0.05, h + 0.13, { at: [x, 0, z + s * (big ? 0.15 : 0.12)], seat: 'min', sides: 4, roof: 'crenel', color: GREY });
    k.light([x + (yaw === 0 ? 0.08 : -0.08), k.ground(x, z) + h * 0.5, z], { color: 0xffb35a, intensity: 1.0, radius: 0.025, kind: 'fire', flicker: 0.3 });
  };
  gate(OUTER.half, MAIN_GATE_Z, OUTER.h, 0, true);
  gate(INNER.half, MAIN_GATE_Z, INNER.h, 0, true);
  gate(-OUTER.half, HUNTERS_GATE_Z, OUTER.h, 0, false);
  gate(-INNER.half, HUNTERS_GATE_Z, INNER.h, 0, false);
  for (const [x, z] of [
    [(MOAT.inner + MOAT.outer) / 2, MAIN_GATE_Z],
    [-(MOAT.inner + MOAT.outer) / 2, HUNTERS_GATE_Z],
  ] as V2[])
    k.box('wood', MOAT.outer - MOAT.inner + 0.06, 0.02, 0.09, { at: [x, k.ground(x, z) + 0.004, z], color: 0x4a3a2a, lod: 0 });
}

export function buildYards(k: ProxyKit): void {
  // the ward's yards: packed earth and flagstones between the buildings (the godswood keeps its own floor)
  k.drape('weathered', squareRing(INNER.half - 0.06, 0.12), { step: 0.08, lift: 0.01, holes: [GODSWOOD], color: 0x7c7466, grain: 0.5 });
}

export function buildKeeps(k: ProxyKit): void {
  // ---- the Great Keep: the Starks' home, the castle's largest block (T: named; I: form)
  {
    const { at, w, d, h } = GREAT_KEEP;
    k.house('stone', 'slate', w, d, h, { at: [at[0], 0, at[1]], roof: 'hip', pitch: 32, color: GREY_LIT, roofColor: SLATE, windows: { count: 6, on: 0.8, sides: 2, size: 0.012 } });
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      k.tower('stone', 0.06, h + 0.12, { at: [at[0] + (sx * w) / 2, 0, at[1] + (sz * d) / 2], seat: 'min', sides: 4, roof: 'crenel', color: GREY });
  }
  // ---- the Great Hall: a long feasting hall (T)
  {
    const { at, w, d, h } = GREAT_HALL;
    k.house('stone', 'slate', w, d, h, { at: [at[0], 0, at[1]], roof: 'gable', pitch: 40, color: GREY, roofColor: SLATE, chimney: true, windows: { count: 5, on: 0.9, sides: 2, size: 0.013, color: 0xf0b45a } });
  }
  // ---- the halls: Guards Hall, armory, kitchens, stables, smithy (T: named; I: where)
  for (const hl of HALLS) {
    k.house('stone', 'slate', hl.w, hl.d, hl.h, { at: [hl.at[0], 0, hl.at[1]], rot: [0, hl.yaw, 0], roof: 'gable', pitch: 38, color: hl.id === 'stables' ? 0x7d6e5c : GREY, roofColor: hl.id === 'stables' ? THATCH[0] : SLATE, chimney: hl.id === 'kitchens' || hl.id === 'smithy', windows: { count: 3, on: 0.6, sides: 1, size: 0.011 } });
  }
  // ---- the First Keep: squat, round, older and darker, gargoyles leaning out round its top (T)
  {
    const { at, r, h } = FIRST_KEEP;
    k.tower('stone', r, h, { at: [at[0], 0, at[1]], seat: 'min', sides: 14, taper: 0.04, roof: 'none', color: GREY_OLD, grain: 0.45 });
    const top = k.ground(at[0], at[1]) + h;
    for (let i = 0; i < 12; i++) {
      const t = (i * 2 * Math.PI) / 12;
      k.box('stone', 0.025, 0.03, 0.05, { at: [at[0] + Math.cos(t) * (r + 0.01), top - 0.04, at[1] + Math.sin(t) * (r + 0.01)], rot: [0, (-t * 180) / Math.PI, 0], color: 0x5e5c58, lod: 0 });
    }
    k.ring('stone', r * 0.97, 0.025, 0.03, { at: [at[0], top - 0.005, at[1]], color: GREY_OLD, lod: 1 });
  }
  // ---- the broken tower: once the tallest watchtower; lightning burned it a century before Ned's birth
  // and its top third fell in (T) — a tall round shaft ending in a jagged, roofless crown
  {
    const { at, r, h } = BROKEN_TOWER;
    const stand = h * (2 / 3);
    k.tower('stone', r, stand, { at: [at[0], 0, at[1]], seat: 'min', sides: 16, taper: 0.05, roof: 'none', color: GREY_OLD });
    const top = k.ground(at[0], at[1]) + stand;
    for (let i = 0; i < 9; i++) {
      const t = (i * 2 * Math.PI) / 9 + 0.3;
      const hh = 0.02 + k.r(30 + i) * 0.09;
      k.box('stone', 0.04, hh, 0.03, { at: [at[0] + Math.cos(t) * r * 0.86, top - 0.01, at[1] + Math.sin(t) * r * 0.86], rot: [0, (-t * 180) / Math.PI, 0], color: 0x58564f });
    }
    // fallen stone at its foot (the collapse fell inward; a little lies round the base)
    for (let i = 0; i < 5; i++) k.rock('stone', 0.02 + k.r(40 + i) * 0.02, { at: [at[0] + (k.r(50 + i) - 0.5) * 0.3, 0, at[1] + (k.r(60 + i) - 0.5) * 0.3], seat: true, squash: 0.6, color: 0x6a6862, lod: 0 });
  }
  // ---- the library tower, the bell tower, the maester's turret with the rookery under it (T)
  for (const t of TOWERS) {
    k.tower('stone', t.r, t.h, {
      at: [t.at[0], 0, t.at[1]],
      seat: 'min',
      sides: 16,
      taper: 0.05,
      roof: t.id === 'bell' ? 'spire' : 'cone',
      roofFam: 'slate',
      roofColor: SLATE,
      roofH: t.r * 2.4,
      color: GREY,
      windows: { rows: 3, count: 2, on: 0.6, size: 0.01 },
    });
  }
  // ---- the maze: low walls between the yards and more towers of every age and height (T: a maze of walls,
  // towers and courtyards; I: where)
  const yardWalls: V2[][] = [
    [
      [-0.3, -0.6],
      [0.55, -0.6],
    ],
    [
      [0.55, -1.08],
      [0.55, -0.6],
      [0.55, -0.05],
    ],
    [
      [-0.3, 0.42],
      [0.95, 0.42],
    ],
    [
      [0.62, 0.42],
      [0.62, 1.08],
    ],
  ];
  for (const w of yardWalls) k.wallPath('stone', w, 0.09, 0.035, { followGround: true, step: 0.06, color: GREY, crenel: { w: 0.016, h: 0.018, gap: 0.014, lod: 0 } });
  const extra: [number, number, number, number, number][] = [
    // x, z, r, h, sides
    [-0.28, -0.6, 0.06, 0.36, 4],
    [0.55, -0.6, 0.065, 0.4, 16],
    [0.55, -0.05, 0.055, 0.33, 4],
    [-0.3, 0.42, 0.05, 0.3, 16],
    [0.95, 0.42, 0.06, 0.38, 16],
    [0.62, 1.05, 0.05, 0.28, 4],
    [-0.2, -0.05, 0.07, 0.44, 16],
    [0.98, -0.45, 0.06, 0.4, 4],
  ];
  extra.forEach(([x, z, r, h, sides], i) =>
    k.tower('stone', r, h, { at: [x, 0, z], seat: 'min', sides, rot: [0, sides === 4 ? 12 * i : 0, 0], roof: i % 3 === 0 ? 'cone' : 'crenel', roofFam: 'slate', roofColor: SLATE, color: i % 2 ? GREY : GREY_OLD, windows: { rows: 2, count: 2, on: 0.55, size: 0.01 } }),
  );
  // ---- Catelyn's sept: small, seven-sided (T: a sept; I: its form)
  {
    const ring = polyRing(SEPT.at, SEPT.r, 7, -Math.PI / 2);
    k.extrude('stone', ring, 0.1, { followGround: true, color: 0xb0aca2 });
    k.cone('slate', SEPT.r * 1.05, 0.1, { at: [SEPT.at[0], Math.max(...ring.map(([x, z]) => k.ground(x, z))) + 0.1, SEPT.at[1]], seg: 7, color: SLATE });
    k.light([SEPT.at[0], k.ground(SEPT.at[0], SEPT.at[1]) + 0.06, SEPT.at[1] - SEPT.r - 0.005], { color: 0xffe2a8, intensity: 0.5, radius: 0.012, kind: 'window' });
  }
  // ---- the glass gardens: long glasshouses warmed by the springs (T), panes glossy and pale
  for (const g of GLASS) {
    k.house('obsidian', 'obsidian', g.w, g.d, 0.045, { at: [g.at[0], 0, g.at[1]], roof: 'gable', pitch: 35, color: GLASS_TINT, roofColor: GLASS_TINT, plinthFam: 'stone', dig: 0.3, lod: 1, windows: { count: 3, on: 0.9, sides: 1, size: 0.012, color: 0xfff0c8 } });
  }
}

export function buildTown(k: ProxyKit): void {
  // the winter town: timber and thatch along the road east of the main gate and a few lanes off it (T: it
  // exists; I: where, how) — half empty in summer, so loosely set, many houses shuttered (few lights)
  const lanes: V2[][] = [
    [
      [TOWN.from, MAIN_GATE_Z],
      [TOWN.to, MAIN_GATE_Z + 0.25],
    ],
    [
      [2.3, MAIN_GATE_Z],
      [2.1, MAIN_GATE_Z - 0.9],
    ],
    [
      [2.7, MAIN_GATE_Z + 0.05],
      [3.0, MAIN_GATE_Z + 0.95],
    ],
    [
      [3.2, MAIN_GATE_Z + 0.15],
      [3.5, MAIN_GATE_Z - 0.7],
    ],
  ];
  let n = 0;
  for (const [li, [a, b]] of lanes.entries()) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / len;
    const uz = (b[1] - a[1]) / len;
    const yaw = (Math.atan2(-uz, ux) * 180) / Math.PI;
    for (const side of [-1, 1]) {
      let t = 0.12 + k.r(500 + li * 2 + side) * 0.1;
      while (t < len - 0.05) {
        const i = n++;
        const w = 0.1 + k.r(600 + i) * 0.08;
        const off = 0.09 + k.r(700 + i) * 0.05;
        const x = a[0] + ux * t - uz * off * side;
        const z = a[1] + uz * t + ux * off * side;
        t += w + 0.03 + k.r(800 + i) * 0.12;
        if (k.r(900 + i) < 0.12) continue; // a yard or a gap
        k.house('wood', 'thatch', w, 0.07 + k.r(1000 + i) * 0.03, 0.04 + k.r(1100 + i) * 0.025, {
          at: [x, 0, z],
          rot: [0, yaw + (k.r(1200 + i) - 0.5) * 10, 0],
          roof: 'gable',
          pitch: 45,
          overhang: 0.008,
          dig: 0.4,
          color: TIMBER,
          shade: 0.85 + k.r(1300 + i) * 0.25,
          roofColor: THATCH[i % THATCH.length],
          roofGrain: 0.6,
          chimney: i % 6 === 1,
          lod: 0,
          ...(i % 9 === 0 ? { windows: { count: 1, on: 1, sides: 1 as const, size: 0.009 } } : {}),
        });
      }
    }
  }
  // a few larger halls and barns back from the lanes (I)
  for (let i = 0; i < 6; i++) {
    const x = TOWN.from + 0.3 + k.r(1400 + i) * (TOWN.to - TOWN.from - 0.5);
    const z = MAIN_GATE_Z + (k.r(1500 + i) < 0.5 ? -1 : 1) * (0.45 + k.r(1600 + i) * 0.4);
    k.house('wood', 'thatch', 0.22, 0.11, 0.06, { at: [x, 0, z], rot: [0, k.r(1700 + i) * 60 - 30, 0], roof: 'gable', pitch: 48, dig: 0.4, color: 0x5a4836, roofColor: THATCH[i % THATCH.length], roofGrain: 0.6 });
  }
}
