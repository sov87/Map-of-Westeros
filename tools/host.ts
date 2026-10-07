/**
 * Host check for the Westeros workstation (Windows 11 · RTX 5090 32 GB · 32 GB RAM · 4K OLED) — run at
 * session start and before heavy work:
 *
 *   pnpm host            report: memory, GPU (driver, VRAM in use), heavy-job lock, orphans, disk
 *   pnpm host --fix      + remove a dead holder's lock, sweep orphaned capture Chrome / tool processes
 *   pnpm host --prune    + list regenerable temporaries (dist/, old render runs; keeps `latest`, the
 *                          newest runs and any run folder containing a KEEP file); add --yes to delete
 *                          them (+ git worktree prune)
 *
 * Unlike the Middle-earth laptop (7.6 GB shared with an iGPU) this host has dedicated VRAM and no approved
 * background-app sweep: nothing outside the project is stopped or reconfigured. What it watches instead is the
 * bake's system-RAM peak (it scales with the heightfield's texel count) and VRAM headroom for 2160p captures.
 * Off Windows (cloud sessions, CI) the Windows-only probes are skipped.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gpuLockPath } from './capture/gpuLock.ts';
import { chromeProfileDir, cleanupStaleChrome, fmtMem, hostMemory, topConsumers } from './capture/host.ts';

const fix = process.argv.includes('--fix');
const prune = process.argv.includes('--prune');
const yes = process.argv.includes('--yes');
const isWin = process.platform === 'win32';
const issues: string[] = [];

function ps(script: string): string {
  return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    timeout: 60_000,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

// ------------------------------------------------------------------ memory
const mem = hostMemory();
console.log(`[host] memory: ${fmtMem(mem)}`);
if (isWin) console.log(`[host] top: ${topConsumers(8).join(' · ')}`);
if (mem.availMB < 4000) issues.push(`low available memory (${mem.availMB} MB < 4000 MB needed for a 2160p capture batch)`);
const bakeNeed = bakeMemoryEstimateMB();
if (bakeNeed && mem.availMB < bakeNeed) issues.push(`a full bake of the current heightfield needs roughly ${bakeNeed} MB (have ${mem.availMB}): bake at a coarser heightfield.kmPerPixel while iterating`);

// ------------------------------------------------------------------ GPU
const gpu = (() => {
  try {
    return execFileSync('nvidia-smi', ['--query-gpu=name,driver_version,memory.used,memory.total', '--format=csv,noheader,nounits'], {
      encoding: 'utf8',
      timeout: 20_000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
})();
if (gpu) {
  const [name, driver, used, total] = gpu.split(',').map((s) => s.trim());
  console.log(`[host] gpu: ${name} · driver ${driver} · VRAM ${used} / ${total} MiB in use`);
  if (Number(total) - Number(used) < 8000) issues.push(`less than 8 GB of free VRAM (${used} / ${total} MiB in use): close other GPU work before a 2160p capture`);
} else console.log('[host] gpu: nvidia-smi unavailable (no NVIDIA GPU or driver on this host — captures need MOW_SOFTWARE_GPU=1 here)');

// ------------------------------------------------------------------ heavy-job lock + orphaned capture processes
let lockHolder: string | null = null;
if (existsSync(gpuLockPath)) {
  try {
    const info = JSON.parse(readFileSync(gpuLockPath, 'utf8')) as { pid: number; owner: string; cwd?: string };
    let alive = true;
    try {
      process.kill(info.pid, 0);
    } catch {
      alive = false;
    }
    const age = Math.round((Date.now() - statSync(gpuLockPath).mtimeMs) / 1000);
    lockHolder = `${info.owner} (pid ${info.pid}, ${alive ? 'alive' : 'dead'}, heartbeat ${age} s)`;
    if (!alive && fix) {
      rmSync(gpuLockPath, { force: true });
      lockHolder += ' → removed stale lock';
    }
  } catch {
    lockHolder = 'unreadable';
  }
}
console.log(`[host] heavy-job lock: ${lockHolder ?? 'free'}`);
if (fix && (!lockHolder || lockHolder.includes('dead'))) {
  const n = cleanupStaleChrome(chromeProfileDir());
  console.log(`[host] orphaned capture Chrome (this checkout): ${n}`);
}
// orphaned node / python tool processes: our tools on the command line and a dead parent (Windows only)
const orphans = (() => {
  if (!isWin) return [];
  try {
    const rows = JSON.parse(
      ps(
        "$all = @(Get-CimInstance Win32_Process); $ids = @{}; foreach ($p in $all) { $ids[[int]$p.ProcessId] = 1 }; " +
          "@($all | Where-Object { $_.Name -in @('node.exe','python.exe','uv.exe') -and $_.CommandLine -match 'tools[\\\\/](capture|heavy|bake|geo)' -and -not $ids.ContainsKey([int]$_.ParentProcessId) } | Select-Object ProcessId,CommandLine) | ConvertTo-Json -Compress",
      ) || '[]',
    ) as { ProcessId: number; CommandLine: string } | { ProcessId: number; CommandLine: string }[];
    return (Array.isArray(rows) ? rows : [rows]).filter((r) => r.ProcessId !== process.pid);
  } catch {
    return [];
  }
})();
if (orphans.length) {
  if (fix) {
    for (const o of orphans) spawnSync('taskkill', ['/pid', String(o.ProcessId), '/T', '/F'], { stdio: 'ignore' });
    console.log(`[host] killed ${orphans.length} orphaned tool process(es)`);
  } else issues.push(`${orphans.length} orphaned tool process(es): ${orphans.map((o) => o.ProcessId).join(', ')} (pnpm host --fix)`);
}

// ------------------------------------------------------------------ disk / temporaries
function sizeMB(p: string): number {
  if (!existsSync(p)) return 0;
  const st = statSync(p);
  if (!st.isDirectory()) return st.size / 2 ** 20;
  return readdirSync(p).reduce((s, f) => s + sizeMB(join(p, f)), 0);
}
const disk = ['renders', 'data/baked', '.cache', 'dist'].map((d) => `${d} ${Math.round(sizeMB(d))} MB`).join(' · ');
console.log(`[host] disk: ${disk}`);
if (prune) {
  const drop = (p: string) => {
    const mb = Math.round(sizeMB(p));
    if (yes) rmSync(p, { recursive: true, force: true });
    console.log(`[host] ${yes ? 'pruned' : 'would prune'} ${p} (${mb} MB)`);
  };
  if (existsSync('dist')) drop('dist');
  const keepNewest = (dir: string, n: number) => {
    if (!existsSync(dir)) return;
    const runs = readdirSync(dir)
      .filter((f) => /^\d{8}-\d{6}$/.test(f) && statSync(join(dir, f)).isDirectory())
      .sort()
      .reverse();
    for (const r of runs.slice(n)) {
      if (existsSync(join(dir, r, 'KEEP'))) continue;
      drop(join(dir, r));
    }
  };
  keepNewest(join('renders', 'shots'), 5);
  keepNewest(join('renders', 'qa'), 4);
  if (yes) spawnSync('git', ['worktree', 'prune'], { stdio: 'ignore' });
  else console.log('[host] dry run — add --yes to delete');
}

// ------------------------------------------------------------------ summary
if (issues.length) {
  console.log('[host] ISSUES:');
  for (const i of issues) console.log(`  - ${i}`);
} else console.log('[host] OK');
process.exit(issues.some((i) => i.startsWith('low available memory')) ? 2 : 0);

/**
 * Rough peak RAM of a full bake at the current world.json heightfield: Middle-earth's 4000 × 2400 bake peaked
 * near 4 GB, and the hydro / synth steps hold a few dozen float32 grids, so ≈ 420 bytes per texel.
 */
function bakeMemoryEstimateMB(): number | null {
  try {
    const w = JSON.parse(readFileSync(join('data', 'world', 'world.json'), 'utf8')) as { heightfield: { width: number; height: number } };
    return Math.round((w.heightfield.width * w.heightfield.height * 420) / 2 ** 20);
  } catch {
    return null;
  }
}
