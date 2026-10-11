// Blast Radius \u00B7 world building blocks: boxes, walls, props
'use strict';

/* ================= MAP ================= */
// everything a map builds goes in WORLD so the map can be swapped at runtime
const WORLD = new THREE.Group(); scene.add(WORLD);
const boxes = [];
const matCache = {};
function mat(c, tex) {
  const k = c + '|' + (tex || '');
  return matCache[k] || (matCache[k] = new THREE.MeshLambertMaterial({ color: c, map: tex ? getTex(tex) : null }));
}
function boxGeo(w, h, d, ts) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes && g.attributes.uv;
  if (!ts || !uv || !uv.setXY) return g;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / ts, uv.getY(k) * dims[f][1] / ts); }
  uv.needsUpdate = true;
  return g;
}
function addBox(x1, y1, z1, x2, y2, z2, color, opt = {}) {
  const min = { x: Math.min(x1, x2), y: Math.min(y1, y2), z: Math.min(z1, z2) };
  const max = { x: Math.max(x1, x2), y: Math.max(y1, y2), z: Math.max(z1, z2) };
  const b = { min, max };
  if (!opt.noMesh) {
    const ts = opt.tex ? TEXDEF[opt.tex].scale : 0;
    const m = new THREE.Mesh(boxGeo(max.x - min.x, max.y - min.y, max.z - min.z, ts), mat(color, opt.tex));
    m.position.set((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
    m.castShadow = opt.cast !== false; m.receiveShadow = true;
    WORLD.add(m);
  }
  if (!opt.noCollide) boxes.push(b);
  return b;
}
const deco = (x1, y1, z1, x2, y2, z2, color, opt = {}) => addBox(x1, y1, z1, x2, y2, z2, color, Object.assign({ noCollide: true }, opt));
function flat(xa, za, xb, zb, y, color, tex) {
  const w = Math.abs(xb - xa), d = Math.abs(zb - za);
  const g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes && g.attributes.uv;
  if (tex && uv && uv.setXY) { const ts = TEXDEF[tex].scale; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / ts, uv.getY(i) * d / ts); }
  const m = new THREE.Mesh(g, mat(color, tex));
  m.rotation.x = -Math.PI / 2; m.position.set((xa + xb) / 2, y, (za + zb) / 2); m.receiveShadow = true; WORLD.add(m);
  return m;
}
// wall running along 'x' (at z = c) or along 'z' (at x = c), with openings {a,b,lo,hi}
function wall(axis, c, s1, s2, h, t, color, openings = [], tex = 'siding', trim = 0xF1E9D6, y0 = 0) {
  const lo1 = Math.min(s1, s2), hi1 = Math.max(s1, s2);
  const seg = (a, b, y1, y2) => {
    if (b - a < 0.01 || y2 - y1 < 0.01) return;
    if (axis === 'x') addBox(a, y0 + y1, c - t / 2, b, y0 + y2, c + t / 2, color, { tex });
    else addBox(c - t / 2, y0 + y1, a, c + t / 2, y0 + y2, b, color, { tex });
  };
  const tr = (a, b, y1, y2, depth) => {
    if (axis === 'x') deco(a, y0 + y1, c - depth, b, y0 + y2, c + depth, trim, { cast: false });
    else deco(c - depth, y0 + y1, a, c + depth, y0 + y2, b, trim, { cast: false });
  };
  const ops = openings.map(o => ({ a: Math.min(o.a, o.b), b: Math.max(o.a, o.b), lo: o.lo, hi: o.hi })).sort((p, q) => p.a - q.a);
  let cur = lo1;
  for (const o of ops) {
    seg(cur, o.a, 0, h); if (o.lo > 0) seg(o.a, o.b, 0, o.lo); if (o.hi < h) seg(o.a, o.b, o.hi, h); cur = o.b;
    const dp = t / 2 + .04;
    tr(o.a - .1, o.a + .018, o.lo + (o.lo > 0 ? .02 : 0), o.hi - .018, dp); tr(o.b - .018, o.b + .1, o.lo + (o.lo > 0 ? .02 : 0), o.hi - .018, dp); tr(o.a - .1, o.b + .1, o.hi - .018, o.hi + .1, dp);
    if (o.lo > 0) tr(o.a - .14, o.b + .14, o.lo - .07, o.lo + .02, dp + .05);
  }
  seg(cur, hi1, 0, h);
}
const DOOR = (a, b) => ({ a, b, lo: 0, hi: 2.3 });
const WIN = (a, b) => ({ a, b, lo: 1.0, hi: 2.25 });
// a box stretched between two points (legs, rails, chains)
function beam(a, b, t, color, cast = true) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const m = new THREE.Mesh(new THREE.BoxGeometry(t, t, L), mat(color));
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.lookAt(b[0], b[1], b[2]); m.castShadow = cast; m.receiveShadow = true; WORLD.add(m); return m;
}

function cyl(r, h, x, y, z, color, seg = 10, opt = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, opt.r2 !== undefined ? opt.r2 : r, h, seg), mat(color, opt.tex));
  m.position.set(x, y, z); m.castShadow = opt.cast !== false; m.receiveShadow = true;
  if (opt.rotX) m.rotation.x = opt.rotX; if (opt.rotZ) m.rotation.z = opt.rotZ;
  WORLD.add(m); return m;
}
function wheel(x, z, r = .36, axis = 'x') {
  const m = cyl(r, .26, x, r, z, 0x1E2124, 14);
  m.rotation[axis === 'x' ? 'z' : 'x'] = Math.PI / 2;
  const hub = cyl(r * .45, .28, x, r, z, 0xB8B8B0, 10); hub.rotation[axis === 'x' ? 'z' : 'x'] = Math.PI / 2;
}
const dummy = new THREE.Object3D();
function picketFence(axis, c, a, b, h = .95) {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  if (axis === 'x') addBox(lo, 0, c - .06, hi, h, c + .06, 0xF4F0E6, { noMesh: true });
  else addBox(c - .06, 0, lo, c + .06, h, hi, 0xF4F0E6, { noMesh: true });
  const rail = (y) => axis === 'x' ? deco(lo, y, c - .03, hi, y + .07, c + .03, 0xF4F0E6) : deco(c - .03, y, lo, c + .03, y + .07, hi, 0xF4F0E6);
  rail(.25); rail(.7);
  const n = Math.max(1, Math.floor((hi - lo) / .17));
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(axis === 'x' ? .09 : .025, h, axis === 'x' ? .025 : .09), mat(0xF7F4EC), n);
  for (let i = 0; i < n; i++) {
    const p = lo + (i + .5) * (hi - lo) / n;
    if (axis === 'x') dummy.position.set(p, h / 2, c + .04); else dummy.position.set(c + .04, h / 2, p);
    dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
  }
  im.castShadow = true; im.receiveShadow = true; WORLD.add(im);
}
function tree(x, z, s = 1, color = 0x6E8A3E) {
  addBox(x - .18, 0, z - .18, x + .18, 2.6 * s, z + .18, 0x6B4F36, { noMesh: true });
  cyl(.16, 2.8 * s, x, 1.4 * s, z, 0x6B4F36, 7, { r2: .24 });
  const leaf = new THREE.MeshLambertMaterial({ color, flatShading: true });
  for (const [dx, dy, dz, r] of [[0, 3.4, 0, 1.6], [.8, 3.0, .4, 1.1], [-.7, 3.1, -.5, 1.15], [.1, 4.2, -.2, 1.05]]) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), leaf); m.position.set(x + dx * s, dy * s, z + dz * s); m.castShadow = true; m.receiveShadow = true; WORLD.add(m);
  }
}
function bush(x, z, r = .6, color = 0x5E7D3A, y = 0) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshLambertMaterial({ color, flatShading: true }));
  m.position.set(x, y + r * .7, z); m.scale.y = .8; m.castShadow = true; m.receiveShadow = true; WORLD.add(m); return m;
}
function mannequin(x, z, yaw, color = 0xE3D2B5) {
  addBox(x - .25, 0, z - .2, x + .25, 1.75, z + .2, color, { noMesh: true });
  const g = new THREE.Group();
  const p = (w, h, d, px, py, pz, c = color) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(px, py, pz); m.castShadow = true; g.add(m); };
  p(.18, .82, .2, -.12, .41, 0); p(.18, .82, .2, .12, .41, 0); p(.48, .62, .26, 0, 1.13, 0, 0xD9C7A8); p(.12, .6, .12, -.31, 1.1, 0); p(.12, .6, .12, .31, 1.1, 0);
  p(.22, .26, .24, 0, 1.6, 0); p(.05, .05, .05, -.05, 1.62, -.12, 0x333333); p(.05, .05, .05, .05, 1.62, -.12, 0x333333);
  g.position.set(x, 0, z); g.rotation.y = yaw; WORLD.add(g);
}
function signPlane(text, sub, x, y, z, w, h, rotY = 0) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d');
  g.fillStyle = '#E9DCC0'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#B4483A'; g.lineWidth = 14; g.strokeRect(10, 10, c.width - 20, c.height - 20);
  g.fillStyle = '#1D2A30'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `400 ${c.height * .34}px "Saira Stencil One", Impact, sans-serif`; g.fillText(text, c.width / 2, c.height * .42);
  g.font = `700 ${c.height * .14}px "Saira Condensed", "Arial Narrow", sans-serif`; g.fillStyle = '#B4483A'; g.fillText(sub, c.width / 2, c.height * .74);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c) }));
  m.position.set(x, y, z); m.rotation.y = rotY; WORLD.add(m);
}

/* ---------- shared kit for the other maps ---------- */
// gradient sky dome; becomes SKY.day for the current map
function buildSky(top, hor, low = hor, opt = {}) {
  const g = new THREE.SphereGeometry(420, 24, 16), cols = [], T = new THREE.Color(top), H = new THREE.Color(hor), L = new THREE.Color(low), c = new THREE.Color();
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 420; if (y >= 0) c.copy(H).lerp(T, clamp(y * (opt.k || 1.6), 0, 1)); else c.copy(H).lerp(L, clamp(-y * 4, 0, 1)); cols.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  const grp = new THREE.Group(); grp.add(m);
  if (opt.sun) { const s = new THREE.Mesh(new THREE.CircleGeometry(opt.sunR || 14, 24), new THREE.MeshBasicMaterial({ color: opt.sunColor || 0xFFF1C8, fog: false })); s.position.set(...opt.sun); s.lookAt(0, 0, 0); grp.add(s); }
  if (opt.clouds) {
    const cm = new THREE.MeshBasicMaterial({ color: opt.cloudColor || 0xffffff, transparent: true, opacity: opt.cloudAlpha || .75, fog: false });
    for (let i = 0; i < opt.clouds; i++) {
      const a = Math.random() * TAU, r = 260 + Math.random() * 100, cl = new THREE.Group();
      for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(14 + Math.random() * 16, 8, 6), cm); p.position.set(k * 18 - 27, Math.random() * 6, Math.random() * 10); p.scale.y = .35; cl.add(p); }
      cl.position.set(Math.cos(a) * r, 70 + Math.random() * 60, Math.sin(a) * r); cl.lookAt(0, cl.position.y, 0); grp.add(cl);
    }
  }
  SKY.day = grp; WORLD.add(grp); return grp;
}
function groundPlane(color, tex, y = 0, size = 600) {
  const g = new THREE.PlaneGeometry(size, size), uv = g.attributes && g.attributes.uv;
  if (tex && uv && uv.setXY) { const k = size / TEXDEF[tex].scale; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k); }
  const m = new THREE.Mesh(g, mat(color, tex)); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; WORLD.add(m); return m;
}
// solid stairs climbing along `axis` from a0 (bottom edge) to a1 (top edge), between c0..c1 across, up to height h
function stairs(axis, a0, a1, c0, c1, h, color = 0x8A8478, tex, y0 = 0) {
  const n = Math.max(2, Math.round((h - y0) / .246)), run = (a1 - a0) / n, rise = (h - y0) / n;
  for (let k = 0; k < n; k++) {
    const s0 = a0 + k * run, s1 = s0 + run, top = y0 + rise * (k + 1);
    if (axis === 'x') addBox(s0, y0, c0, s1, top, c1, color, { tex }); else addBox(c0, y0, s0, c1, top, s1, color, { tex });
    if (axis === 'x') deco(s1 - Math.sign(run) * .04, top, c0, s1, top + .012, c1, 0xD9B23A, { cast: false }); else deco(c0, top, s1 - Math.sign(run) * .04, c1, top + .012, s1, 0xD9B23A, { cast: false });
  }
}
// waist-high railing that still stops anyone climbing over it (1.6 tall collision)
function railing(axis, c, a, b, y = 0, color = 0xB8BCC0, opt = {}) {
  const lo = Math.min(a, b), hi = Math.max(a, b), t = .05;
  // tall enough that nobody hops it, but invisible to bullets and sight (it is glass and bars)
  if (opt.collide !== false) { const bb = axis === 'x' ? addBox(lo, y, c - .06, hi, y + 2.4, c + .06, 0, { noMesh: true }) : addBox(c - .06, y, lo, c + .06, y + 2.4, hi, 0, { noMesh: true }); bb.invis = true; bb.noMantle = true; }
  const bar = yy => axis === 'x' ? deco(lo, y + yy, c - t, hi, y + yy + .07, c + t, color) : deco(c - t, y + yy, lo, c + t, y + yy + .07, hi, color);
  bar(1.0); bar(.5);
  if (opt.glass) { const gm = new THREE.Mesh(new THREE.PlaneGeometry(hi - lo, .9), glassMat); if (axis === 'x') gm.position.set((lo + hi) / 2, y + .5, c); else { gm.position.set(c, y + .5, (lo + hi) / 2); gm.rotation.y = Math.PI / 2; } WORLD.add(gm); }
  const n = Math.max(1, Math.round((hi - lo) / 1.2));
  for (let i = 0; i <= n; i++) { const p = lo + (hi - lo) * i / n; if (axis === 'x') deco(p - .04, y, c - .04, p + .04, y + 1.05, c + .04, color); else deco(c - .04, y, p - .04, c + .04, y + 1.05, p + .04, color); }
}
const glassMat = new THREE.MeshLambertMaterial({ color: 0x9FC4D6, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false });
function glassPane(axis, c, a, b, y0, y1) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(Math.abs(b - a), y1 - y0), glassMat);
  if (axis === 'x') m.position.set((a + b) / 2, (y0 + y1) / 2, c); else { m.position.set(c, (y0 + y1) / 2, (a + b) / 2); m.rotation.y = Math.PI / 2; }
  WORLD.add(m); return m;
}
// a 20ft shipping container; axis = the long direction. Returns its collision box.
function container(x, z, axis, color, y = 0, opt = {}) {
  const L = 6.06, W = 2.44, H = 2.59, hx = axis === 'x' ? L / 2 : W / 2, hz = axis === 'x' ? W / 2 : L / 2;
  const b = addBox(x - hx, y, z - hz, x + hx, y + H, z + hz, color, { tex: 'corrugated', noCollide: opt.collide === false, cast: !opt.far });
  const dk = new THREE.Color(color).multiplyScalar(.55).getHex();
  if (opt.far) return b; // background stacks: no detail
  if (opt.simple) { deco(x - hx - .01, y + H - .12, z - hz - .01, x + hx + .01, y + H + .015, z + hz + .01, dk, { cast: false }); return b; }
  // corner posts and rails
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const px = x + sx * (hx - .05), pz = z + sz * (hz - .05); deco(px - .065, y, pz - .065, px + .065, y + H + .012, pz + .065, dk, { cast: false }); }
  deco(x - hx - .01, y + H - .12, z - hz - .01, x + hx + .01, y + H + .015, z + hz + .01, dk, { cast: false });
  deco(x - hx - .01, y, z - hz - .01, x + hx + .01, y + .14, z + hz + .01, dk, { cast: false });
  // door end with locking bars
  const ex = axis === 'x' ? x + hx : x, ez = axis === 'x' ? z : z + hz;
  for (const o of [-.75, -.35, .35, .75]) {
    if (axis === 'x') deco(ex, y + .2, ez + o - .025, ex + .05, y + H - .2, ez + o + .025, 0x8C8C86, { cast: false });
    else deco(ex + o - .025, y + .2, ez, ex + o + .025, y + H - .2, ez + .05, 0x8C8C86, { cast: false });
  }
  if (axis === 'x') deco(ex, y + .15, ez - .01, ex + .03, y + H - .15, ez + .01, dk, { cast: false }); else deco(ex - .01, y + .15, ez, ex + .01, y + H - .15, ez + .03, dk, { cast: false });
  return b;
}
function tank(x, z, r, h, color = 0xD8D2C4, y = 0) {
  cyl(r, h, x, y + h / 2, z, color, 20, { tex: 'metal' });
  cyl(r * .96, .5, x, y + h + .25, z, color, 20, { r2: r * .3 });
  for (let k = 1; k < 4; k++) cyl(r + .03, .08, x, y + h * k / 4, z, new THREE.Color(color).multiplyScalar(.7).getHex(), 20, { cast: false });
  // true round collision: physics and bullets treat this box as a cylinder (b.round)
  const b = addBox(x - r, y, z - r, x + r, y + h + .5, z + r, 0, { noMesh: true }); b.round = { x, z, r: r + .03 };
}
function barrel(x, z, color = 0x3E6E8E, y = 0) {
  cyl(.3, .9, x, y + .45, z, color, 12);
  for (const yy of [.2, .7]) cyl(.31, .04, x, y + yy, z, new THREE.Color(color).multiplyScalar(.7).getHex(), 12, { cast: false });
  addBox(x - .27, y, z - .27, x + .27, y + .9, z + .27, 0, { noMesh: true });
}
function crate(x, z, s = 1.1, y = 0, color = 0xB89566) { return addBox(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, color, { tex: 'crate' }); }
// out-of-bounds walls: block movement and grenades, but not bullets or sight
const invisWall = (x1, z1, x2, z2, h = 8) => { const b = addBox(x1, -1, z1, x2, h, z2, 0, { noMesh: true }); b.invis = true; b.noMantle = true; return b; };
function pointLamp(x, y, z, color, day, night, dist = 14) {
  const l = new THREE.PointLight(color, day, dist, 2); l.position.set(x, y, z); WORLD.add(l); LAMPS.push({ light: l, day, night }); return l;
}
