// Blast Radius \u00B7 ray casting against the world and players
'use strict';

/* ================= RAYCAST ================= */
let _rax = 'y', hitAxis = 'y';
function rayAABB(o, d, min, max, tmax) {
  let t0 = 0, t1 = tmax, tn, tf, inv, t, ax = 'y';
  if (Math.abs(d.x) < 1e-9) { if (o.x < min.x || o.x > max.x) return -1; }
  else { inv = 1 / d.x; tn = (min.x - o.x) * inv; tf = (max.x - o.x) * inv; if (tn > tf) { t = tn; tn = tf; tf = t; } if (tn > t0) { t0 = tn; ax = 'x'; } if (tf < t1) t1 = tf; if (t0 > t1) return -1; }
  if (Math.abs(d.y) < 1e-9) { if (o.y < min.y || o.y > max.y) return -1; }
  else { inv = 1 / d.y; tn = (min.y - o.y) * inv; tf = (max.y - o.y) * inv; if (tn > tf) { t = tn; tn = tf; tf = t; } if (tn > t0) { t0 = tn; ax = 'y'; } if (tf < t1) t1 = tf; if (t0 > t1) return -1; }
  if (Math.abs(d.z) < 1e-9) { if (o.z < min.z || o.z > max.z) return -1; }
  else { inv = 1 / d.z; tn = (min.z - o.z) * inv; tf = (max.z - o.z) * inv; if (tn > tf) { t = tn; tn = tf; tf = t; } if (tn > t0) { t0 = tn; ax = 'z'; } if (tf < t1) t1 = tf; if (t0 > t1) return -1; }
  _rax = ax;
  return t0;
}
// ray against a vertical cylinder (b.round), capped by the box's y range
function rayRound(o, d, b, tmax) {
  const c = b.round, ox = o.x - c.x, oz = o.z - c.z, a = d.x * d.x + d.z * d.z;
  let t0 = 0, t1 = tmax, ax = 'y', tn, tf, inv, t;
  if (a < 1e-12) { if (ox * ox + oz * oz > c.r * c.r) return -1; }
  else {
    const bb = ox * d.x + oz * d.z, cc = ox * ox + oz * oz - c.r * c.r, disc = bb * bb - a * cc;
    if (disc < 0) return -1;
    const s = Math.sqrt(disc); tn = (-bb - s) / a; tf = (-bb + s) / a;
    if (tn > t0) { t0 = tn; ax = Math.abs(ox + d.x * tn) > Math.abs(oz + d.z * tn) ? 'x' : 'z'; }
    if (tf < t1) t1 = tf; if (t0 > t1) return -1;
  }
  if (Math.abs(d.y) < 1e-9) { if (o.y < b.min.y || o.y > b.max.y) return -1; }
  else { inv = 1 / d.y; tn = (b.min.y - o.y) * inv; tf = (b.max.y - o.y) * inv; if (tn > tf) { t = tn; tn = tf; tf = t; } if (tn > t0) { t0 = tn; ax = 'y'; } if (tf < t1) t1 = tf; if (t0 > t1) return -1; }
  _rax = ax;
  return t0;
}
function rayWorld(o, d, maxT, all) {
  let best = maxT; hitAxis = 'y';
  for (let i = 0; i < boxes.length; i++) { if (boxes[i].ghost || (boxes[i].invis && !all)) continue; const t = boxes[i].round ? rayRound(o, d, boxes[i], best) : rayAABB(o, d, boxes[i].min, boxes[i].max, best); if (t >= 0 && t < best) { best = t; hitAxis = _rax; } }
  if (d.y < -1e-6) { const tg = -o.y / d.y; if (tg < best) { best = tg; hitAxis = 'y'; } }
  return best;
}
const _bmin = { x: 0, y: 0, z: 0 }, _bmax = { x: 0, y: 0, z: 0 };
function rayEntity(o, d, e, maxT) {
  const h = e.height, p = e.pos;
  let best = null;
  if (e.isDog) {
    const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), hx = p.x + fx * .62, hz = p.z + fz * .62;
    _bmin.x = hx - .16; _bmin.y = p.y + .55; _bmin.z = hz - .16; _bmax.x = hx + .16; _bmax.y = p.y + .98; _bmax.z = hz + .16;
    let t = rayAABB(o, d, _bmin, _bmax, maxT); if (t >= 0) best = { t, head: true };
    _bmin.x = Math.min(p.x - fx * .45, p.x + fx * .45) - .22; _bmax.x = Math.max(p.x - fx * .45, p.x + fx * .45) + .22;
    _bmin.z = Math.min(p.z - fz * .45, p.z + fz * .45) - .22; _bmax.z = Math.max(p.z - fz * .45, p.z + fz * .45) + .22;
    _bmin.y = p.y + .2; _bmax.y = p.y + .88;
    t = rayAABB(o, d, _bmin, _bmax, best ? best.t : maxT); if (t >= 0) best = { t, head: false };
    return best;
  }
  if (e.stance === 'prone') {
    const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
    const hx = p.x + fx * .75, hz = p.z + fz * .75;
    _bmin.x = hx - .2; _bmin.y = p.y; _bmin.z = hz - .2; _bmax.x = hx + .2; _bmax.y = p.y + .45; _bmax.z = hz + .2;
    let t = rayAABB(o, d, _bmin, _bmax, maxT); if (t >= 0) best = { t, head: true };
    _bmin.x = Math.min(p.x - fx * .7, p.x + fx * .5) - .3; _bmax.x = Math.max(p.x - fx * .7, p.x + fx * .5) + .3;
    _bmin.z = Math.min(p.z - fz * .7, p.z + fz * .5) - .3; _bmax.z = Math.max(p.z - fz * .7, p.z + fz * .5) + .3;
    _bmin.y = p.y; _bmax.y = p.y + .4;
    t = rayAABB(o, d, _bmin, _bmax, best ? best.t : maxT); if (t >= 0) best = { t, head: false };
    return best;
  }
  _bmin.x = p.x - .2; _bmin.y = p.y + h - .34; _bmin.z = p.z - .2;
  _bmax.x = p.x + .2; _bmax.y = p.y + h + .02; _bmax.z = p.z + .2;
  let t = rayAABB(o, d, _bmin, _bmax, maxT);
  if (t >= 0) best = { t, head: true };
  _bmin.x = p.x - .34; _bmin.y = p.y; _bmin.z = p.z - .34;
  _bmax.x = p.x + .34; _bmax.y = p.y + h - .34; _bmax.z = p.z + .34;
  t = rayAABB(o, d, _bmin, _bmax, best ? best.t : maxT);
  if (t >= 0) best = { t, head: false };
  return best;
}
