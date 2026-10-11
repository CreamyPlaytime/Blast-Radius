// Blast Radius · surface graph: everywhere the undead can stand, and how they get between those places
'use strict';

/* The ground nav grid only knows the floor (and a map's upper storey). When a survivor climbs onto a truck, a
   wing, the plane's roof or the terminal, the horde needs a real 3D route: walk along a surface, climb a ledge,
   claw up a tall wall, drop off an edge, or leap a gap from one thing to the next.

   The map is sampled on a half-metre grid. Each column holds a node for every height an undead body fits
   standing up. Edges join nodes by walking, climbing, clawing, dropping or leaping. A flow field (Dijkstra out
   from the target, run over the reversed edges) then gives every node its cost to reach the target, so a zombie
   only has to step to whichever neighbour is cheapest. One field per target serves the whole horde.            */

const SURF_CELL = .5, SURF_BODY = 1.6, SURF_R = .3;
const SURF_CLIMB = 2.85, SURF_CLAW = 5.4;     // a normal haul-up, and the slow claw up a tall wall
const SURF_DROP = 7.5, SURF_LEAP = 3.4;
const SURF_FALLBACK = 500;   // the price of only getting close: any real route to the target is cheaper
const EDGE = { walk: 0, climb: 1, claw: 2, drop: 3, leap: 4 };
let SURF = null;

// a coarse spatial hash of the collision boxes, so clearance checks only look at boxes nearby
function surfHash(list) {
  const S = 2, H = new Map(), key = (i, j) => i * 4096 + j;
  for (const b of list) {
    if (b.ghost) continue;
    for (let i = Math.floor(b.min.x / S); i <= Math.floor(b.max.x / S); i++)
      for (let j = Math.floor(b.min.z / S); j <= Math.floor(b.max.z / S); j++) {
        const k = key(i, j); let a = H.get(k); if (!a) H.set(k, a = []); a.push(b);
      }
  }
  const EMPTY = [];
  return { S, cell: (i, j) => H.get(key(i, j)) || EMPTY };
}
function surfBuild() {
  const { hypot, floor, round, abs, max, sin, cos, PI } = Math, STP = STEP, TWO_PI = PI * 2;
  const B = MAP.bounds, H = surfHash(boxes), HS = H.S;
  // nothing solid in the upright cylinder (radius r) from y to y + h at (x, z)
  // (skipTop: ignore anything whose top is at or below this, such as the very ledge being climbed)
  const clear = (x, z, y, h, r = SURF_R, skipTop = -1e9) => {
    const i0 = floor((x - r) / HS), i1 = floor((x + r) / HS), j0 = floor((z - r) / HS), j1 = floor((z + r) / HS);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const b of H.cell(i, j)) {
      if (b.max.y <= y + .03 || b.min.y >= y + h || b.max.y <= skipTop) continue;
      if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
      if (b.round && hypot(x - b.round.x, z - b.round.z) > b.round.r + r) continue;
      return false;
    }
    return true;
  };
  const x0 = B[0] + .25, z0 = B[2] + .25;
  const nx = floor((B[1] - x0) / SURF_CELL) + 1, nz = floor((B[3] - z0) / SURF_CELL) + 1;
  const cols = new Array(nx * nz);
  const nodes = [];   // { x, y, z, ci, nm (top can't be climbed onto), out: [[to, type, cost]] }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * SURF_CELL, z = z0 + j * SURF_CELL, ci = j * nx + i, here = [];
    const tops = new Map();
    if (!MAP.ground || MAP.ground(x, z)) tops.set(0, false);
    for (const b of H.cell(floor(x / HS), floor(z / HS))) {
      if (b.noStand || b.invis || b.ghost || b.max.y > 30) continue;
      if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
      if (b.round && hypot(x - b.round.x, z - b.round.z) > b.round.r) continue;
      const y = +b.max.y.toFixed(3), nm = !!b.noMantle;
      tops.set(y, tops.has(y) ? tops.get(y) && nm : nm);
    }
    for (const [y, nm] of [...tops].sort((a, b) => a[0] - b[0])) {
      if (!clear(x, z, y, SURF_BODY)) continue;
      here.push(nodes.length);
      nodes.push({ x, y, z, ci, nm, out: [] });
    }
    cols[ci] = here;
  }
  const colAt = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz) ? null : cols[j * nx + i];
  const addEdge = (a, b, type, cost, lip) => nodes[a].out.push([b, type, cost, lip === undefined ? nodes[b].y : lip]);
  // the highest solid top over (x, z) between y0 and y1, and the box it belongs to
  const topUnder = (x, z, y0, y1) => {
    let best = null;
    for (const b of H.cell(floor(x / HS), floor(z / HS))) {
      if (b.max.y <= y0 || b.max.y > y1 || x < b.min.x - .05 || x > b.max.x + .05 || z < b.min.z - .05 || z > b.max.z + .05) continue;
      if (!best || b.max.y > best.y) best = { y: b.max.y, b };
    }
    return best;
  };
  // walking, climbing, clawing and dropping between nearby columns
  const isEdgeNode = new Uint8Array(nodes.length);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    for (const a of cols[j * nx + i]) {
      const A = nodes[a];
      for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
        if (!di && !dj) continue;
        const ring = max(abs(di), abs(dj)), list = colAt(i + di, j + dj);
        if (!list) continue;
        const hd = hypot(di, dj) * SURF_CELL;
        if (hd > 1.6) continue;
        let level = false;
        for (const b of list) {
          const N = nodes[b], dy = N.y - A.y, mx = (A.x + N.x) / 2, mz = (A.z + N.z) / 2;
          if (abs(dy) <= STP) {
            if (ring > 1) continue;
            level = true;
            if (clear(mx, mz, max(A.y, N.y), SURF_BODY - .1, .25)) addEdge(a, b, EDGE.walk, hd / 2);
          } else if (dy > 0) {
            if (N.nm) continue;
            // the lip it has to haul itself over: a parapet, a rail, the top of a wall between here and there
            let lip = N.y, bad = false;
            for (let t = .25; t < .8; t += .25) {
              const tp = topUnder(lerp(A.x, N.x, t), lerp(A.z, N.z, t), A.y + STP, A.y + SURF_CLAW + .6);
              if (!tp) continue;
              if (tp.y > N.y + .05 && (tp.b.noMantle || tp.b.invis)) { bad = true; break; }
              if (tp.y > lip) lip = tp.y;
            }
            if (bad || lip - N.y > .9 || lip - A.y > SURF_CLAW) continue;
            const rise = lip - A.y;
            // room to rise where it stands, and nothing in the way over the lip
            // nothing at all straight overhead (a ceiling), and nothing round its shoulders but the lip itself
            if (!clear(A.x, A.z, A.y + 1.0, rise + .7, .02) || !clear(A.x, A.z, A.y + 1.0, rise + .7, .1, lip + .05)) continue;
            let open = true;
            for (let t = .25; t < .8 && open; t += .25) if (!clear(lerp(A.x, N.x, t), lerp(A.z, N.z, t), lip, 1.3, .2)) open = false;
            if (!open) continue;
            if (rise <= SURF_CLIMB) addEdge(a, b, EDGE.climb, .9 + rise * .35 + hd * .3, lip);
            else addEdge(a, b, EDGE.claw, 2.6 + rise * .7 + hd * .3, lip);
          } else {
            if (ring > 2 || -dy > SURF_DROP || !clear(mx, mz, A.y, 1.4, .22) || !clear(N.x, N.z, N.y + 1, -dy + .4, .22)) continue;
            addEdge(a, b, EDGE.drop, .5 - dy * .08 + hd * .3);
          }
        }
        if (ring === 1 && !level && A.y > .6) isEdgeNode[a] = 1;
      }
    }
  }
  // leaps across gaps, from the edge of one high place to another
  const DIRS = 24;
  for (let a = 0; a < nodes.length; a++) {
    if (!isEdgeNode[a]) continue;
    const A = nodes[a];
    for (let k = 0; k < DIRS; k++) {
      const ang = k / DIRS * TWO_PI, ux = cos(ang), uz = sin(ang);
      for (let dist = 1.25; dist <= SURF_LEAP; dist += .45) {
        const tx = A.x + ux * dist, tz = A.z + uz * dist;
        const list = colAt(round((tx - x0) / SURF_CELL), round((tz - z0) / SURF_CELL));
        if (!list) continue;
        let hit = -1;
        for (const b of list) { const N = nodes[b]; if (N.y > .6 && N.y - A.y <= .9 && A.y - N.y <= 3.2) hit = b; }
        if (hit < 0) continue;
        const N = nodes[hit], top = max(A.y, N.y) + .55, L = hypot(N.x - A.x, N.z - A.z);
        let ok = true, gap = false;
        for (let t = .2; t < .99 && ok; t += .2) {
          const px = lerp(A.x, N.x, t), pz = lerp(A.z, N.z, t), py = lerp(A.y, N.y, t) + sin(t * PI) * (top - max(A.y, N.y) + .2);
          if (!clear(px, pz, py, SURF_BODY - .2, .22)) ok = false;
          const ci = colAt(round((px - x0) / SURF_CELL), round((pz - z0) / SURF_CELL));
          if (ci && !ci.some(c => abs(nodes[c].y - lerp(A.y, N.y, t)) <= STP)) gap = true;
        }
        if (ok && gap) { addEdge(a, hit, EDGE.leap, 1.1 + L * .25 + max(0, N.y - A.y) * .4); break; }
      }
    }
  }
  // reversed adjacency for the flow fields, packed flat (no per-edge objects to chase or collect)
  const n = nodes.length, inStart = new Int32Array(n + 1);
  for (const N of nodes) for (const e of N.out) inStart[e[0] + 1]++;
  for (let i = 0; i < n; i++) inStart[i + 1] += inStart[i];
  const fill = inStart.slice(0, n), inFrom = new Int32Array(inStart[n]), inW = new Float32Array(inStart[n]);
  nodes.forEach((N, a) => { for (const e of N.out) { const k = fill[e[0]]++; inFrom[k] = a; inW[k] = e[2]; } });
  SURF = { map: MAP, nodes, cols, nx, nz, x0, z0, inStart, inFrom, inW, fields: new Map() };
  return SURF;
}
function surfReady() { if (!SURF || SURF.map !== MAP) surfBuild(); return SURF; }

// the node an entity is standing on (or the nearest one to it), or -1
function surfNodeAt(x, y, z, slack = .6, reach = 1) {
  const S = surfReady();
  let best = -1, bd = 1e9;
  const ci = Math.round((x - S.x0) / SURF_CELL), cj = Math.round((z - S.z0) / SURF_CELL), R = Math.ceil(reach / SURF_CELL);
  for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
    const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= S.nx || j >= S.nz) continue;
    for (const n of S.cols[j * S.nx + i]) {
      const N = S.nodes[n], dy = y - N.y;
      if (dy < -slack * .5 || dy > slack + 1.2) continue;
      const c = Math.hypot(N.x - x, N.z - z) + Math.abs(dy) * 2;
      if (c < bd) { bd = c; best = n; }
    }
  }
  return best;
}

/* A flow field towards one target. The target's own node costs 0; every node near it that is lower than the
   target is also a goal, at a price that grows with distance and with how far short it falls. So if nothing
   leads all the way up, the horde still gathers at the closest place it can reach (and the ladder takes over).

   Working one out touches every node, so it never happens all at once in a frame: when the target moves to a new
   spot, a new field is worked out a slice at a time (about a millisecond and a half per frame) while the horde
   keeps following the old one, then swapped in. Nothing is recomputed while the target hasn't moved, or while
   it is in mid-air (jumping, falling) and its spot isn't settled yet.                                          */
const SURF_SLICE_MS = 1.5;
const surfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
function surfStart(S, job, p, goal) {
  const n = S.nodes.length;
  if (!job.cost || job.cost.length !== n) {
    job.cost = new Float64Array(n);
    const cap = S.inFrom.length + n + 1024;
    job.hn = new Int32Array(cap); job.hc = new Float64Array(cap);
  }
  job.cost.fill(Infinity); job.size = 0; job.goal = goal; job.done = false;
  if (goal >= 0) surfPush(job, goal, 0);
  // fallback goals: anywhere within a few metres, priced by how far short of the target it leaves you
  const ci = Math.round((p.pos.x - S.x0) / SURF_CELL), cj = Math.round((p.pos.z - S.z0) / SURF_CELL), R = 8;
  for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
    const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= S.nx || j >= S.nz) continue;
    for (const k of S.cols[j * S.nx + i]) {
      const N = S.nodes[k], hd = Math.hypot(N.x - p.pos.x, N.z - p.pos.z), short = p.pos.y - N.y;
      if (hd > 4 || short < -1.2) continue;
      surfPush(job, k, SURF_FALLBACK + hd * 3 + Math.max(0, short - 1.2) * 5);
    }
  }
}
// a binary heap in two flat arrays (node, cost); stale entries are skipped when popped
function surfPush(job, i, c) {
  if (c >= job.cost[i] || job.size >= job.hn.length) return;
  job.cost[i] = c;
  const hn = job.hn, hc = job.hc; let k = job.size++;
  while (k > 0) { const pk = (k - 1) >> 1; if (hc[pk] <= c) break; hn[k] = hn[pk]; hc[k] = hc[pk]; k = pk; }
  hn[k] = i; hc[k] = c;
}
// run a job's search for up to ms milliseconds; true once it has finished
function surfRun(S, job, ms) {
  const hn = job.hn, hc = job.hc, cost = job.cost, st = S.inStart, fr = S.inFrom, w = S.inW, end = surfNow() + ms;
  let guard = 0;
  while (job.size > 0) {
    if ((++guard & 255) === 0 && surfNow() > end) return false;
    const i = hn[0], c = hc[0], last = --job.size;
    if (last > 0) {
      const ln = hn[last], lc = hc[last]; let k = 0;
      for (;;) { const l = 2 * k + 1; if (l >= last) break; const r = l + 1, m = r < last && hc[r] < hc[l] ? r : l; if (hc[m] >= lc) break; hn[k] = hn[m]; hc[k] = hc[m]; k = m; }
      hn[k] = ln; hc[k] = lc;
    }
    if (c > cost[i]) continue;
    for (let e = st[i], e1 = st[i + 1]; e < e1; e++) surfPush(job, fr[e], c + w[e]);
  }
  job.done = true;
  return true;
}
function surfField(key, p) {
  const S = surfReady();
  let F = S.fields.get(key);
  // where the target is standing; while it's in the air, keep chasing the spot it left
  const settled = p.onGround !== false;
  const goal = settled || !F ? surfNodeAt(p.pos.x, p.pos.y, p.pos.z, .6, 1.2) : F.goal;
  if (!F) {
    // first sight of this target: work it out now, once
    F = { goal: -1, cost: null, job: {}, frame: -1 };
    surfStart(S, F.job, p, goal); surfRun(S, F.job, 1e9);
    F.goal = goal; F.cost = F.job.cost; F.job = {};
    S.fields.set(key, F);
    return F;
  }
  if (settled && goal !== F.goal && goal !== F.job.goal) { surfStart(S, F.job, p, goal); }
  // one slice of work per frame, however many zombies ask
  if (F.job.goal !== undefined && !F.job.done && F.frame !== G.now) {
    F.frame = G.now;
    const t0 = surfNow(), fin = surfRun(S, F.job, SURF_SLICE_MS);
    if (typeof PERF !== 'undefined') PERF.route += surfNow() - t0;
    if (fin) {
      const old = F.cost; F.cost = F.job.cost; F.goal = F.job.goal;
      F.job = { cost: old, hn: F.job.hn, hc: F.job.hc, goal: undefined, done: true };   // reuse the buffers next time
    }
  }
  return F;
}
// the best move from node a: [to, type, cost-to-go], or null when a is already as close as it gets
function surfNext(F, a) {
  const S = SURF, here = F.cost[a]; let best = null, bc = Infinity;
  for (const [b, type, w, lip] of S.nodes[a].out) { if (F.cost[b] >= here) continue; const c = w + F.cost[b]; if (c < bc) { bc = c; best = [b, type, c, lip]; } }
  return best;
}
