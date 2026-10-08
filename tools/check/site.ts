/**
 * Landmark site probe (CPU): the local ground round a landmark (or a bare place, before its landmark exists),
 * relative to its origin, before and after the stamps — for laying out a landmark against the terrain it actually stands on.
 *
 *   node --import tsx tools/check/site.ts <landmarkId> [--r 12] [--step 1.5] [--base] [--at x,z …]
 *
 * Prints a grid of local heights (km, x east, z south, the origin's composite ground = 0); `--base` prints
 * the baked ground without the stamps instead; `--at` adds point probes (composite and base).
 */
import { loadWorld } from './baked.ts';
import { join } from 'node:path';

const args = process.argv.slice(2);
const id = args[0];
if (!id) {
  console.error('usage: site.ts <landmarkId | placeId> [--r 12] [--step 1.5] [--base] [--at x,z …]');
  process.exit(2);
}
const opt = (name: string, d: number): number => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const R = opt('--r', 12);
const step = opt('--step', 1.5);
const base = args.includes('--base');
const points: [number, number][] = [];
args.forEach((a, i) => {
  if (args[i - 1] === '--at') points.push(a.split(',').map(Number) as [number, number]);
});

const dir = process.env.MOW_WORLD_DIR ?? join(process.cwd(), 'data', 'baked');
const { world, landmarks } = await loadWorld(dir);
// a landmark id, or a bare place id (to survey a site before its landmark exists)
const def = landmarks.find((l) => l.id === id);
const p = world.place(def ? def.placeId : id);
const o = world.heights.sample(p.x, p.z);
const ob = world.heights.sample(p.x, p.z, 'base');
console.log(`[site] ${id}: origin world (${p.x.toFixed(2)}, ${p.z.toFixed(2)}), ground ${o.toFixed(3)} (base ${ob.toFixed(3)}); ${base ? 'BASE' : 'composite'} heights relative to the origin's composite ground`);
const xs: number[] = [];
for (let x = -R; x <= R + 1e-9; x += step) xs.push(x);
console.log('   z\\x ' + xs.map((x) => x.toFixed(1).padStart(6)).join(''));
for (let z = -R; z <= R + 1e-9; z += step) {
  const row = xs.map((x) => (world.heights.sample(p.x + x, p.z + z, base ? 'base' : 'composite') - o).toFixed(2).padStart(6));
  console.log(z.toFixed(1).padStart(6) + ' ' + row.join(''));
}
for (const [x, z] of points) {
  const c = world.heights.sample(p.x + x, p.z + z) - o;
  const b = world.heights.sample(p.x + x, p.z + z, 'base') - o;
  console.log(`[site] at (${x}, ${z}): ${c.toFixed(3)} (base ${b.toFixed(3)}, stamps ${(c - b).toFixed(3)})`);
}
