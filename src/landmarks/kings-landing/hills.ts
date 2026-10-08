import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../records.ts';
import { PIT, SEPT } from './layout.ts';

/**
 * The Great Sept of Baelor on Visenya's Hill and the Dragonpit on Rhaenys's Hill.
 *
 * Great Sept (ledger kings-landing-great-sept, -great-sept-plaza, -great-sept-standing, slice-great-sept-standing):
 * T — it crowns Visenya's Hill, topped by seven crystal towers; marble steps rise from a broad plaza to its
 * doors; a statue of Baelor the Blessed stands in the plaza; it stands intact at 298 AC.
 * I — the seven-sided hall under a great dome (kings-landing-great-sept-dome), white marble walls, the
 * towers' placement at the hall's seven corners, the plaza's shape and the way it faces.
 *
 * Dragonpit (kings-landing-dragonpit-ruin, -dragonpit-dome-fall, slice-dragonpit-roofless): T — on Rhaenys's
 * Hill, abandoned, its great dome fallen in (since 130 AC), its bronze doors shut since the last dragons died.
 * I — the drum's size and stone, the broken ribs of the dome standing round the rim, rubble and weeds inside.
 */

const MARBLE = 0xefebe3;
const MARBLE_SHADE = 0xd9d3c7;
/** the crystal towers: glossy, pale, a touch of blue (T: crystal; the tint is I) */
const CRYSTAL = 0xdde8ee;
const GILT = 0xd2b35c;

function polar(c: V2, bearingDeg: number, r: number): V2 {
  const t = (bearingDeg * Math.PI) / 180;
  return [c[0] + Math.sin(t) * r, c[1] - Math.cos(t) * r];
}

export function buildSept(k: ProxyKit): void {
  const [cx, cz] = SEPT.at;
  const r = SEPT.r;
  const y = Math.max(...[0, 60, 120, 180, 240, 300].map((b) => k.ground(...polar(SEPT.at, b, r * 1.32)))) + 0.04;
  // ---- the podium: white marble, battered, following the hilltop
  const podium: V2[] = Array.from({ length: 14 }, (_, i) => polar(SEPT.at, (i * 360) / 14 + 10, r * 1.32));
  k.extrude('stone', podium, 0.05, { followGround: true, taper: 0.03, color: MARBLE_SHADE });
  // ---- the seven-sided hall (seven for the Seven) and its drum
  const hept: V2[] = Array.from({ length: 7 }, (_, i) => polar(SEPT.at, (i * 360) / 7 + SEPT.facing, r));
  k.extrude('stone', hept, 0.3, { at: [0, y, 0], color: MARBLE, grain: 0.12 });
  // a cornice course
  k.extrude('stone', hept.map(([x, z]): V2 => [cx + (x - cx) * 1.03, cz + (z - cz) * 1.03]), 0.03, { at: [0, y + 0.3, 0], color: MARBLE_SHADE });
  k.cylinder('stone', r * 0.62, r * 0.66, 0.14, { at: [cx, y + 0.33, cz], seg: 28, color: MARBLE });
  // ---- the great dome (I) with a gilded lantern
  k.sphere('stone', r * 0.62, { at: [cx, y + 0.47, cz], squash: 0.86, color: MARBLE });
  k.cylinder('gold', 0.05, 0.06, 0.08, { at: [cx, y + 0.47 + r * 0.62 * 0.86 - 0.01, cz], seg: 12, color: GILT });
  k.cone('gold', 0.05, 0.1, { at: [cx, y + 0.47 + r * 0.62 * 0.86 + 0.07, cz], seg: 12, color: GILT });
  // ---- the seven crystal towers at the hall's corners (T: seven crystal towers)
  hept.forEach(([x, z], i) => {
    const h = 0.5 + (i === 0 ? 0.1 : 0);
    k.tower('obsidian', 0.06, h, { at: [x, y, z], sides: 7, taper: 0.12, roof: 'spire', roofFam: 'obsidian', roofColor: CRYSTAL, roofH: 0.22, color: CRYSTAL });
    k.light([x, y + h + 0.05, z], { color: 0xfff1d0, intensity: 0.6, radius: 0.02, kind: 'lamp' });
  });
  // ---- the doors and the marble steps down to the plaza (T)
  const [dx, dz] = polar(SEPT.at, SEPT.facing + 360 / 14, r * 0.92);
  const yaw = 90 - (SEPT.facing + 360 / 14);
  k.box('gold', 0.14, 0.18, 0.03, { at: [dx, y, dz], rot: [0, yaw, 0], color: 0x9a7a3a });
  const [px, pz] = SEPT.plazaAt;
  const steps: [number, number, number][] = [];
  const [sx, sz] = polar(SEPT.at, SEPT.facing + 360 / 14, r * 1.36);
  for (let t = 0; t <= 6; t++) steps.push([dx + ((sx - dx) * t) / 6, Number.NaN, dz + ((sz - dz) * t) / 6]);
  k.stairs('stone', steps, 0.32, { stepKm: 0.03, color: MARBLE });
  // ---- the plaza: a broad paved square below the steps (T), Baelor's statue on its plinth (T)
  const plaza: V2[] = [
    [px - 0.55, pz - 0.38],
    [px + 0.55, pz - 0.38],
    [px + 0.55, pz + 0.38],
    [px - 0.55, pz + 0.38],
  ];
  k.extrude('stone', plaza, 0.03, { followGround: true, color: 0xcfc8ba, grain: 0.2 });
  const top = Math.max(...plaza.map(([x, z]) => k.ground(x, z))) + 0.03;
  k.box('stone', 0.07, 0.05, 0.07, { at: [px, top, pz], color: 0xbdb6a8 });
  k.cylinder('stone', 0.012, 0.016, 0.07, { at: [px, top + 0.05, pz], seg: 8, color: 0x8f8b84, lod: 0 });
  k.sphere('stone', 0.012, { at: [px, top + 0.13, pz], color: 0x8f8b84, lod: 0 });
}

export function buildDragonpit(k: ProxyKit): void {
  const [cx, cz] = PIT.at;
  const R = PIT.r;
  const y = Math.min(...[0, 90, 180, 270].map((b) => k.ground(...polar(PIT.at, b, R)))) - 0.02;
  const STONE = 0x7d766b;
  const DARK = 0x4f4a43;
  // ---- the drum: a huge round wall of stone, blind arcades round its foot (I: the stone and the size)
  k.ring('weathered', R, 0.12, 0.42, { at: [cx, y, cz], seg: 64, color: STONE });
  k.ring('weathered', R + 0.07, 0.05, 0.2, { at: [cx, y, cz], seg: 64, color: 0x6c665c });
  for (let b = 0; b < 360; b += 15) {
    const [x, z] = polar(PIT.at, b, R + 0.065);
    k.box('darkStone', 0.07, 0.15, 0.03, { at: [x, y + 0.02, z], rot: [0, 90 - b, 0], color: DARK, lod: 0 });
  }
  // ---- the dome fallen in (T): broken ribs standing from the rim, the tallest only part-way up (I)
  for (let i = 0; i < 16; i++) {
    const b = i * 22.5 + 6;
    const keep = 0.12 + 0.55 * k.r(200 + i);
    if (k.r(220 + i) < 0.3) continue; // some ribs gone entirely
    const n = 8;
    for (let s = 0; s < Math.round(n * keep); s++) {
      const a0 = (s / n) * (Math.PI / 2);
      const a1 = ((s + 1) / n) * (Math.PI / 2);
      const r0 = R * Math.cos(a0);
      const r1 = R * Math.cos(a1);
      const h0 = 0.42 + R * 0.75 * Math.sin(a0);
      const h1 = 0.42 + R * 0.75 * Math.sin(a1);
      const [x0, z0] = polar(PIT.at, b, r0);
      const [x1, z1] = polar(PIT.at, b, r1);
      const len = Math.hypot(x1 - x0, z1 - z0, h1 - h0);
      const pitch = (Math.atan2(h1 - h0, Math.hypot(x1 - x0, z1 - z0)) * 180) / Math.PI;
      // a rib segment: a box from (x0, h0) to (x1, h1), its long axis along the rib
      k.box('weathered', 0.05, 0.06, len, {
        at: [(x0 + x1) / 2, y + (h0 + h1) / 2 - 0.03, (z0 + z1) / 2],
        rot: [pitch, 180 - b, 0],
        color: s % 2 ? STONE : 0x736c61,
      });
    }
  }
  // ---- rubble and weeds on the floor, the fallen dome's stones (I)
  k.scatter(
    { circle: { at: PIT.at, r: R * 0.85 } },
    26,
    (_i, x, z, u) => {
      k.rock('weathered', 0.03 + u * 0.06, { at: [x, y + 0.02, z], squash: 0.6, lump: 0.4, color: 0x6e675d, shade: 0.85 + u * 0.3 });
    },
    { minSpacing: 0.12 },
  );
  k.extrude('foliage', Array.from({ length: 20 }, (_, i) => polar(PIT.at, i * 18, R * 0.92)), 0.01, { at: [0, y + 0.005, 0], color: 0x5f6a3d, grain: 0.6 });
  // ---- the bronze doors (T), shut, facing the city (south-west)
  for (const off of [-1, 1]) {
    const [x, z] = polar(PIT.at, 215 + off * 3.5, R + 0.08);
    k.box('metal', 0.09, 0.26, 0.025, { at: [x, y, z], rot: [0, 90 - 215, 0], color: 0x8a6436 });
  }
}
