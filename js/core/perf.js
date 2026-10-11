// Blast Radius · performance monitor: frame timings by system, and a record of every hitch and what caused it
'use strict';

/* Turned on from Options (Performance stats). Each frame is split into sections (zombie AI, the player,
   projectiles and effects, rendering, and so on). The overlay shows the frame rate and the average cost of each
   section over the last second. Whenever a frame takes well over this machine's normal frame time, it is logged with:
     - how long each section took in that frame,
     - whether the JavaScript heap shrank (a garbage collection pause),
     - whether new shader programs were compiled (the GPU stalling on a new material or light setup),
     - what was going on: climbing, in the air, up on something, how many zombies, a route being worked out.
   Time between frames that no section accounts for is the browser or the GPU (layout, compositing, a driver
   stall, the tab being throttled).                                                                         */
const PERF = { on: false, sec: {}, frameSec: {}, t0: 0, mark: 0, last: 0, frames: 0, acc: {}, accN: 0, fps: 0, hitches: [], el: null, upd: 0, heap: 0, progs: 0, route: 0 };
function perfOn(on) {
  PERF.on = !!on;
  if (PERF.on && !PERF.el) {
    const el = document.createElement('div'); el.id = 'perfHud';
    el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:60;pointer-events:none;font:600 11px/1.35 ui-monospace,Menlo,Consolas,monospace;color:#E9F1E4;background:rgba(8,12,14,.78);padding:7px 9px;border-radius:6px;white-space:pre;max-width:min(560px,calc(100vw - 16px));overflow:hidden';
    document.body.appendChild(el); PERF.el = el;
  }
  if (PERF.el) PERF.el.hidden = !PERF.on;
  PERF.hitches.length = 0; PERF.by = null; PERF.gpuMax = 0;
}
/* How far behind the graphics card is: every few frames, read back one pixel right after drawing. That can only
   return once the card has finished everything queued so far, so the wait is the GPU's backlog. If the screen
   stops updating while the game keeps running (the picture freezes, but zombies still get you), this is where
   it shows up. Only measured while the stats are on.                                                          */
const _px = new Uint8Array(4);
function perfGpu() {
  if (!PERF.on || (PERF.frames % 6)) return;
  try {
    const gl = renderer.getContext(), t = performance.now();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, _px);
    const w = performance.now() - t;
    PERF.gpuMax = Math.max(PERF.gpuMax || 0, w);
  } catch (e) {}
}
// a watchdog outside the frame loop: notices when frames stop coming at all, even before the next one arrives
setInterval(() => {
  if (!PERF.on || !PERF.last || document.hidden || typeof G === 'undefined' || G.state !== 'playing') return;
  const gap = performance.now() - PERF.lastEnd;
  if (gap > 250 && !PERF.stalled) { PERF.stalled = true; PERF.stallFrom = PERF.lastEnd; }
}, 100);
// start of a frame
function perfBegin(tMs) {
  if (!PERF.on) return;
  PERF.t0 = PERF.mark = (typeof performance !== 'undefined' ? performance.now() : tMs);
  PERF.interval = PERF.last ? tMs - PERF.last : 16.7; PERF.last = tMs;
  for (const k in PERF.frameSec) PERF.frameSec[k] = 0;
  PERF.route = 0;
}
// everything since the previous mark belongs to section `name`
function perfMark(name) {
  if (!PERF.on) return;
  const t = performance.now();
  PERF.frameSec[name] = (PERF.frameSec[name] || 0) + (t - PERF.mark);
  PERF.mark = t;
}
// zombies that reverse direction from one frame to the next (twitching between two routes looks like stutter
// even when the frame rate is fine). Counted per second.
function perfTwitch() {
  if (!PERF.on || !G.zm) return;
  for (const z of G.ents) {
    if (!z.isZombie || !z.alive || z.climb || z.leap || z.ride) { if (z) z._pv = null; continue; }
    const vx = z.vel.x, vz = z.vel.z, sp = Math.hypot(vx, vz);
    if (sp < .4) { z._pv = null; continue; }
    if (z._pv && (vx * z._pv[0] + vz * z._pv[1]) / (sp * z._pv[2]) < -.3) PERF.twitch = (PERF.twitch || 0) + 1;
    z._pv = [vx, vz, sp];
  }
}
function perfEnd() {
  if (!PERF.on) return;
  perfTwitch();
  if (PERF.stalled) {
    PERF.stalled = false;
    PERF.hitches.unshift(`${(performance.now() - PERF.stallFrom).toFixed(0).padStart(4)}ms NO FRAMES AT ALL  (browser stopped drawing)${G.mantle ? ' | climbing' : ''}`);
  }
  PERF.lastEnd = performance.now();
  const F = PERF.frameSec, cpu = performance.now() - PERF.t0;
  for (const k in F) PERF.acc[k] = (PERF.acc[k] || 0) + F[k];
  PERF.acc.cpu = (PERF.acc.cpu || 0) + cpu; PERF.accN++; PERF.frames++;
  // heap shrinking between frames = the garbage collector ran
  let gc = 0;
  const mem = performance.memory;
  if (mem) { const h = mem.usedJSHeapSize; if (PERF.heap && h < PERF.heap - 1e6) gc = (PERF.heap - h) / 1e6; PERF.heap = h; }
  // new shader programs = the GPU had to compile something this frame
  let progs = 0;
  try { const n = renderer.info.programs.length; if (PERF.progs && n > PERF.progs) progs = n - PERF.progs; PERF.progs = n; } catch (e) {}
  // a hitch: well over this machine's normal frame time (at 240 FPS a 20 ms frame is a visible jolt)
  const R = PERF.ring || (PERF.ring = []); R.push(PERF.interval); if (R.length > 120) R.shift();
  if (PERF.frames % 30 === 0) PERF.med = [...R].sort((a, b) => a - b)[R.length >> 1];
  const lim = Math.max(18, (PERF.med || 16.7) * 2.5);
  if (PERF.interval > lim && PERF.frames > 30 && G.state === 'playing') {
    const p = G.player, top = Object.entries(F).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 1).slice(0, 4);
    const ctx = [];
    if (G.mantle) ctx.push('climbing');
    if (p && !p.onGround) ctx.push('in air');
    if (p && typeof zmLifted === 'function' && G.zm && zmLifted(p)) ctx.push('up high');
    if (G.zm) ctx.push(G.ents.filter(e => e.isZombie && e.alive).length + ' zombies');
    if (PERF.route > .2) ctx.push('route ' + PERF.route.toFixed(1) + 'ms');
    let why = 'browser/GPU';
    if ((F['gpu wait'] || 0) > 12) why = 'GPU behind ' + F['gpu wait'].toFixed(0) + 'ms';
    else if (progs) why = progs + ' shader compile' + (progs > 1 ? 's' : '');
    else if (gc) why = 'GC ' + gc.toFixed(0) + 'MB';
    else if (cpu > PERF.interval * .6) why = 'CPU: ' + (top[0] ? top[0][0] : '?');
    PERF.hitches.unshift(`${PERF.interval.toFixed(0).padStart(4)}ms ${why.padEnd(18)} cpu ${cpu.toFixed(1)} | ${top.map(([k, v]) => k + ' ' + v.toFixed(1)).join(', ')}${ctx.length ? ' | ' + ctx.join(', ') : ''}`);
    if (PERF.hitches.length > 10) PERF.hitches.length = 10;
  }
  // running totals while on the ground vs. up on something, so one screenshot compares the two
  if (G.state === 'playing' && G.player && G.player.alive) {
    const p = G.player, up = typeof zmLifted === 'function' && zmLifted(p) && !G.mantle;
    const B = (PERF.by || (PERF.by = { ground: {}, high: {} }))[up ? 'high' : 'ground'];
    B.n = (B.n || 0) + 1; B.ms = (B.ms || 0) + PERF.interval; B.cpu = (B.cpu || 0) + cpu;
    B.sec = B.sec || {}; for (const k in F) B.sec[k] = (B.sec[k] || 0) + F[k];
    try { const r = renderer.info.render; B.draws = (B.draws || 0) + r.calls; B.tris = (B.tris || 0) + r.triangles; } catch (e) {}
    if (PERF.interval > lim) B.hitches = (B.hitches || 0) + 1;
  }
  // refresh the overlay a few times a second
  const now = performance.now();
  if (now - PERF.upd > 500) {
    const n = Math.max(1, PERF.accN), secs = Object.keys(PERF.acc).filter(k => k !== 'cpu').sort((a, b) => PERF.acc[b] - PERF.acc[a]);
    PERF.fps = PERF.accN / ((now - PERF.upd) / 1000);
    let info = '';
    try { const r = renderer.info.render; info = `draws ${r.calls}  tris ${(r.triangles / 1000).toFixed(0)}k  shaders ${renderer.info.programs.length}`; } catch (e) {}
    const tw = (PERF.twitch || 0) / ((now - PERF.upd) / 1000); PERF.twitch = 0;
    const lines = [`FPS ${PERF.fps.toFixed(0)}   cpu ${(PERF.acc.cpu / n).toFixed(1)}ms/frame   normal frame ${(PERF.med || 0).toFixed(1)}ms   worst GPU wait ${(PERF.gpuMax || 0).toFixed(1)}ms   ${info}`,
      `zombie twitches ${tw.toFixed(1)}/s   ${G.player && G.state === 'playing' ? (G.mantle ? 'climbing' : G.player.onGround ? 'on ground' : 'in air') : ''}`,
      secs.map(k => `${k} ${(PERF.acc[k] / n).toFixed(2)}`).join('  ')];
    for (const [k, B] of Object.entries(PERF.by || {})) {
      if (!B.n) continue;
      const top = Object.entries(B.sec).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s2, v]) => s2 + ' ' + (v / B.n).toFixed(2)).join(' ');
      lines.push(`${k === 'high' ? 'UP ON SOMETHING' : 'on the ground  '}: ${(1000 / (B.ms / B.n)).toFixed(0)} fps  cpu ${(B.cpu / B.n).toFixed(1)}ms  draws ${(B.draws / B.n | 0)}  tris ${(B.tris / B.n / 1000).toFixed(0)}k  hitches ${B.hitches || 0}  | ${top}`);
    }
    if (PERF.hitches.length) lines.push('hitches (newest first):', ...PERF.hitches);
    else lines.push('no hitches yet');
    PERF.el.textContent = lines.join('\n');
    PERF.acc = {}; PERF.accN = 0; PERF.upd = now;
  }
}

// any uncaught error during play shows up in the hitch list, so a frozen screen always has a cause on record
window.addEventListener('error', e => {
  if (!PERF.on) return;
  const msg = 'ERROR ' + (e.message || 'unknown') + (e.lineno ? ` (${(e.filename || '').split('/').pop()}:${e.lineno})` : '');
  if (PERF.hitches[0] !== msg) { PERF.hitches.unshift(msg); if (PERF.hitches.length > 10) PERF.hitches.length = 10; }
});
