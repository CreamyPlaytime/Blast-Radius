// Blast Radius \u00B7 two-layer navigation grid and A* pathfinding
'use strict';

/* ================= NAV GRID ================= */
// two navigation layers: 0 = ground, 1 = the map's upper floor (if it has one), linked by stairs.
// The grid is sized to the current map; computeNav() runs on every map load.
const NAV = { ox: 0, oz: 0, nx: 1, nz: 1, b: new Uint8Array(2) };
let NCELL = 1;
let gS = new Float32Array(2), par = new Int32Array(2), stamp = new Int32Array(2), closed = new Int32Array(2);
let curStamp = 0;
const inRects = (rects, x, z) => rects && rects.some(r => x > r[0] && x < r[1] && z > r[2] && z < r[3]);
const upstairsFloor = (x, z) => { const U = MAP.upper; return !!U && inRects(U.rects, x, z) && !inRects(U.holes, x, z); };
function navResize() {
  const B = MAP.bounds;
  NAV.ox = Math.floor(B[0]) - 1; NAV.oz = Math.floor(B[2]) - 1;
  NAV.nx = Math.ceil(B[1]) + 1 - NAV.ox; NAV.nz = Math.ceil(B[3]) + 1 - NAV.oz;
  NCELL = NAV.nx * NAV.nz;
  NAV.b = new Uint8Array(NCELL * 2);
  gS = new Float32Array(NCELL * 2); par = new Int32Array(NCELL * 2); stamp = new Int32Array(NCELL * 2); closed = new Int32Array(NCELL * 2); curStamp = 0;
}
function buildNav() {
  const r = .42, B = MAP.bounds;
  for (let l = 0; l < 2; l++) {
    const base = l ? (MAP.upper ? MAP.upper.y : 0) : 0;
    for (let j = 0; j < NAV.nz; j++) for (let i = 0; i < NAV.nx; i++) {
      const cx = NAV.ox + i + .5, cz = NAV.oz + j + .5;
      let bl = (cx < B[0] || cx > B[1] || cz < B[2] || cz > B[3]) ? 1 : 0;
      if (l && !upstairsFloor(cx, cz)) bl = 1;
      if (!l && MAP.ground && !MAP.ground(cx, cz)) bl = 1;
      if (!bl) for (const b of boxes) {
        if (b.max.y <= base + .6 || b.min.y >= base + 1.7) continue;
        // thin walls and fences get a wider margin so a fence lying on a cell boundary can't be walked through
        const rr = (b.max.x - b.min.x < .3 || b.max.z - b.min.z < .3) ? .47 : r;
        if (cx >= b.min.x - rr && cx <= b.max.x + rr && cz >= b.min.z - rr && cz <= b.max.z + rr) { bl = 1; break; }
      }
      NAV.b[l * NCELL + j * NAV.nx + i] = bl;
    }
  }
}
const cellIdx = (x, z) => { const i = Math.floor(x - NAV.ox), j = Math.floor(z - NAV.oz); return (i < 0 || j < 0 || i >= NAV.nx || j >= NAV.nz) ? -1 : j * NAV.nx + i; };
const cellX = idx => NAV.ox + ((idx % NCELL) % NAV.nx) + .5;
const cellZ = idx => NAV.oz + Math.floor((idx % NCELL) / NAV.nx) + .5;
const layerAt = y => MAP && MAP.upper && y > MAP.upper.y - 1.15 ? 1 : 0;
const freeAt = (x, z, l = 0) => { const c = cellIdx(x, z); return c >= 0 && !NAV.b[l * NCELL + c]; };
function nearestFree(idx, l = 0) {
  if (idx < 0) return -1;
  const off = l * NCELL;
  if (!NAV.b[off + idx]) return off + idx;
  const i0 = idx % NAV.nx, j0 = Math.floor(idx / NAV.nx);
  for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
    const i = i0 + di, j = j0 + dj;
    if (i < 0 || j < 0 || i >= NAV.nx || j >= NAV.nz) continue;
    const c = j * NAV.nx + i; if (!NAV.b[off + c]) return off + c;
  }
  return -1;
}
// stair links from the map: ground cell <-> upstairs cell, plus the four waypoints a bot walks to climb
// (approach, bottom step, top step, step off)
const PORTALS = [], portalAt = new Map();
function buildPortals() {
  PORTALS.length = 0; portalAt.clear();
  for (const P of MAP.portals || []) {
    const g = cellIdx(P.g[0], P.g[1]), u = NCELL + cellIdx(P.u[0], P.u[1]);
    if (g < 0 || u < NCELL || NAV.b[g] || NAV.b[u]) { console.warn('stair link blocked on', MAP.name, P); continue; }
    PORTALS.push({ g, u, cost: P.cost || 9, up: P.up.map(([x, z]) => ({ x, z })) });
  }
  for (const p of PORTALS) { portalAt.set(p.g, p); portalAt.set(p.u, p); }
}
// call after adding or removing collision boxes (zombies mode props)
function rebuildNav() { buildNav(); buildPortals(); }
const heapI = [], heapF = [];
function hpush(i, f) { heapI.push(i); heapF.push(f); let k = heapI.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heapF[p] <= heapF[k]) break; [heapI[p], heapI[k]] = [heapI[k], heapI[p]]; [heapF[p], heapF[k]] = [heapF[k], heapF[p]]; k = p; } }
function hpop() {
  const top = heapI[0]; const li = heapI.pop(), lf = heapF.pop();
  if (heapI.length) { heapI[0] = li; heapF[0] = lf; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heapI.length && heapF[l] < heapF[m]) m = l; if (r < heapI.length && heapF[r] < heapF[m]) m = r; if (m === k) break; [heapI[m], heapI[k]] = [heapI[k], heapI[m]]; [heapF[m], heapF[k]] = [heapF[k], heapF[m]]; k = m; } }
  return top;
}
const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
function findPath(sx, sz, gx, gz, sl = 0, gl = 0) {
  const s = nearestFree(cellIdx(sx, sz), sl), g = nearestFree(cellIdx(gx, gz), gl);
  if (s < 0 || g < 0) return null;
  curStamp++; heapI.length = 0; heapF.length = 0;
  const gc = g % NCELL, gi = gc % NAV.nx, gj = Math.floor(gc / NAV.nx);
  const h = n => { const c = n % NCELL, dx = Math.abs(c % NAV.nx - gi), dz = Math.abs(Math.floor(c / NAV.nx) - gj); return (dx + dz) + (1.414 - 2) * Math.min(dx, dz); };
  const relax = (c, n, cost) => {
    const ng = gS[c] + cost;
    if (stamp[n] !== curStamp || ng < gS[n]) { stamp[n] = curStamp; gS[n] = ng; par[n] = c; closed[n] = 0; hpush(n, ng + h(n)); }
  };
  stamp[s] = curStamp; gS[s] = 0; par[s] = -1; hpush(s, 0);
  let iter = 0, found = false;
  while (heapI.length && iter++ < 40000) {
    const c = hpop();
    if (c === g) { found = true; break; }
    if (closed[c] === curStamp) continue;
    closed[c] = curStamp;
    const off = c >= NCELL ? NCELL : 0, cc = c - off, ci = cc % NAV.nx, cj = Math.floor(cc / NAV.nx);
    for (const [di, dj, cost] of NB) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= NAV.nx || nj >= NAV.nz) continue;
      const n = off + nj * NAV.nx + ni;
      if (NAV.b[n]) continue;
      if (di && dj && (NAV.b[off + cj * NAV.nx + ni] || NAV.b[off + nj * NAV.nx + ci])) continue;
      relax(c, n, cost);
    }
    const p = portalAt.get(c);
    if (p) relax(c, c === p.g ? p.u : p.g, p.cost);
  }
  if (!found) return null;
  const nodes = []; let c = g;
  while (c !== -1) { nodes.push(c); c = c === s ? -1 : par[c]; }
  nodes.reverse();
  const path = [];
  for (let k = 1; k < nodes.length; k++) {
    const a = nodes[k - 1], n = nodes[k];
    if ((a >= NCELL) !== (n >= NCELL)) {
      const p = portalAt.get(a), wps = a === p.g ? p.up : p.up.slice().reverse();
      wps.forEach((w, i) => path.push({ x: w.x, z: w.z, l: (a === p.g) === (i >= 2) ? 1 : 0, portal: true }));
    }
    path.push({ x: cellX(n), z: cellZ(n), l: n >= NCELL ? 1 : 0 });
  }
  if (path.length && !path[path.length - 1].portal) { const q = path[path.length - 1]; q.x = clamp(gx, cellX(g) - .45, cellX(g) + .45); q.z = clamp(gz, cellZ(g) - .45, cellZ(g) + .45); }
  return path;
}
function walkClear(ax, az, bx, bz, l = 0) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / .35);
  for (let k = 1; k <= n; k++) { const t = k / n; if (!freeAt(ax + (bx - ax) * t, az + (bz - az) * t, l)) return false; }
  return true;
}
const UPPER_PTS = [];
const SPAWNS = { A: [], B: [], ffa: [] };
function buildSpawns() {
  UPPER_PTS.length = 0; SPAWNS.A.length = 0; SPAWNS.B.length = 0; SPAWNS.ffa.length = 0;
  const roomy = (x, z, r = .6) => freeAt(x, z) && freeAt(x + r, z) && freeAt(x - r, z) && freeAt(x, z + r) && freeAt(x, z - r);
  for (const t of ['A', 'B']) {
    const [x0, x1, z0, z1] = MAP.spawns[t];
    for (let z = z0; z <= z1; z += 1.5) for (let x = x0; x <= x1; x += 1.5) if (roomy(x, z, .5)) SPAWNS[t].push({ x, z });
  }
  const B = MAP.bounds, step = Math.max(2, Math.min(3, (B[1] - B[0]) / 22));
  for (let z = B[2] + 1.5; z <= B[3] - 1.5; z += step) for (let x = B[0] + 1.5; x <= B[1] - 1.5; x += step) if (roomy(x, z)) SPAWNS.ffa.push({ x, z });
  if (MAP.upper) {
    const pts = MAP.upperPts;
    if (pts) for (const [x, z] of pts) { if (freeAt(x, z, 1)) UPPER_PTS.push({ x, z, l: 1 }); }
    else for (let z = Math.floor(B[2]) + .5; z <= B[3]; z += 1) for (let x = Math.floor(B[0]) + .5; x <= B[1]; x += 1) if (freeAt(x, z, 1) && freeAt(x + .7, z, 1) && freeAt(x - .7, z, 1)) UPPER_PTS.push({ x, z, l: 1 });
  }
  if (!SPAWNS.A.length || !SPAWNS.B.length) console.warn('no team spawns on', MAP.name);
}
function computeNav() { navResize(); buildNav(); buildPortals(); buildSpawns(); }
