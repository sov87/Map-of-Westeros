import type { ProxyKit } from '../kit/ProxyKit.ts';
import type { V2 } from '../types.ts';
import { defineLandmark } from '../types.ts';

/**
 * The Wall at 298 AC (ledger ids in canon.json). T: a rampart of ice (the-wall-material) seven hundred feet
 * high (the-wall-height) and a hundred leagues long (the-wall-length) across the far north, from the
 * mountains in the west to the sea at Eastwatch in the east (the-wall-west-end, -east-end), nearly straight
 * on the maps (the-wall-course-map, M); about three times as tall as Castle Black's highest tower
 * (the-wall-height-vs-castle-black); a top wide enough for a dozen riders abreast (the-wall-top); weeping in
 * warm sunshine (climate-298-wall-weeping). I: its foot follows the ground with one height above it
 * (the-wall-ground); the base wider than the top (the-wall-thickness); pale blue-white old ice
 * (the-wall-look).
 *
 * One landmark for the whole Wall, in Castle Black's frame (x east, z south, km): its line is read off the
 * sheet through the castle markers along it (Westwatch-by-the-Bridge … Eastwatch-by-the-Sea), the scale's
 * own calibration line (tools/geo/maps/westeros-crests.json `scale.wallPx`). Castle Black's own buildings
 * are the castle-black landmark.
 *
 * Design scale ×5 like the castles: 700 ft ≈ 1.07 km, the top ≈ 70 ft ≈ 0.1 km, the base twice that.
 */

/** pale blue-white old ice (I: the-wall-look) — a matte family: a glossy one mirrors the whole scene in a 1 km face */
const ICE = 0xd6e2ea;
/** the Wall's height, top and base widths (km, design scale) */
export const WALL = { h: 1.07, base: 0.21, batter: 0.5 };
/**
 * the Wall's line through the castle markers on the sheet (Castle Black at x = 0, its line 1.2 km north),
 * thinned to the control points of a smooth curve: the map's line is nearly straight (the-wall-course-map)
 */
const LINE: V2[] = [
  [-287.3, 43.5],
  [-236.1, 35.7],
  [-180.0, 12.0],
  [-122.6, 3.5],
  [0, -1.2],
  [119.8, 2.0],
  [193.1, -5.5],
];

/** Catmull-Rom through the line, a point every ~`step` km */
function smooth(pts: V2[], step: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (k: 0 | 1) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([c(0), c(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** the Wall's centre line (local km), smoothed, carried on east to the sea at Eastwatch */
export function wallLine(k?: ProxyKit): V2[] {
  const line = smooth(LINE, 1.0);
  if (!k) return line;
  // on east along the last heading until the ground meets the sea, and a little into it
  const a = line[line.length - 2];
  const b = line[line.length - 1];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const d: V2 = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  for (let s = 1; s < 40; s += 1) {
    const p: V2 = [b[0] + d[0] * s, b[1] + d[1] * s];
    line.push(p);
    if (k.ground(p[0], p[1]) < k.seaLevel - 0.1) break;
  }
  return line;
}

export default defineLandmark({
  id: 'the-wall',
  placeId: 'castle-black',
  tier: 'A',
  proxy: (k) => {
    // the ice rampart (T): one height above its own foot all along (I), battered from a wide base to the top
    k.wallPath('plaster', wallLine(k), WALL.h, WALL.base, {
      followGround: true,
      step: 0.5,
      batter: WALL.batter,
      color: ICE,
      shadeJitter: 0.05,
    });
  },
  subjectKm: { at: [0, -1.2], r: 6 },
  contrast: 'light',
  annotation: {
    title: 'The Wall',
    subtitle: 'Seven hundred feet of ice',
    blurb: 'A hundred leagues of ice across the far north, from the mountains to the sea, held by the Night’s Watch.',
  },
  bookmarks: [
    {
      id: 'the-wall-wide',
      distanceKm: 70,
      elevationDeg: 24,
      azimuthDeg: 215,
      fov: 34,
      tod: 15.5,
      note: 'context: the Wall running away east and west across the far north from Castle Black, the Haunted Forest beyond it, the Gift on this side',
    },
  ],
});
