// Blast Radius \u00B7 map: Gate 9 \u2014 an airport departure lounge and the airliner parked at its gate. You can board the plane.
'use strict';

const G9 = { floor: 3.2, cx: 2.5, r: 2.6, cy: 4.6, x0: 10, x1: 28, doors: [13.5, 25.5], bridgeDoor: 13.5, bz0: 8.4, bz1: 10.6, rampX: 8.9 };
function chainTex(rx, ry) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.strokeStyle = '#B8BCBE'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(0, 32); x.lineTo(32, 0); x.lineTo(64, 32); x.lineTo(32, 64); x.closePath(); x.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
}
function chainFence(axis, c, a, b, h = 3) {
  const L = Math.abs(b - a), m = new THREE.Mesh(new THREE.PlaneGeometry(L, h), new THREE.MeshLambertMaterial({ map: chainTex(L / .6, h / .6), transparent: true, alphaTest: .4, side: THREE.DoubleSide }));
  if (axis === 'x') m.position.set((a + b) / 2, h / 2, c); else { m.position.set(c, h / 2, (a + b) / 2); m.rotation.y = Math.PI / 2; }
  WORLD.add(m);
  for (let t = Math.min(a, b); t <= Math.max(a, b) + .01; t += 3) axis === 'x' ? deco(t - .05, 0, c - .05, t + .05, h + .1, c + .05, 0x7A7E80) : deco(c - .05, 0, t - .05, c + .05, h + .1, t + .05, 0x7A7E80);
  axis === 'x' ? deco(a, h, c - .03, b, h + .06, c + .03, 0x7A7E80) : deco(c - .03, h, a, c + .03, h + .06, b, 0x7A7E80);
}
function flightBoard(x, y, z, w, h, rotY) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d');
  g.fillStyle = '#10161C'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#F2B53B'; g.font = '700 30px "Saira Condensed", "Arial Narrow", sans-serif'; g.fillText('DEPARTURES', 18, 38);
  const rows = [['0715', 'HALIFAX', '9', 'BOARDING'], ['0740', 'REYKJAVIK', '12', 'ON TIME'], ['0805', 'LISBON', '4', 'DELAYED'], ['0830', 'ANCHORAGE', '7', 'ON TIME'], ['0900', 'TROMSO', '9', 'CANCELLED'], ['0925', 'OSLO', '2', 'ON TIME']];
  g.font = '600 22px "Saira Condensed", "Arial Narrow", sans-serif';
  rows.forEach((r, i) => { const yy = 74 + i * 30; if (yy > c.height - 6) return; g.fillStyle = '#E6EDF2'; g.fillText(r[0], 18, yy); g.fillText(r[1], 90, yy); g.fillText(r[2], 300, yy); g.fillStyle = r[3] === 'CANCELLED' || r[3] === 'DELAYED' ? '#E0623F' : '#8FD18A'; g.fillText(r[3], 350, yy); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }));
  m.position.set(x, y, z); m.rotation.y = rotY; WORLD.add(m);
  return m;
}
function g9Sign(text, x, y, z, w, h, rotY, bg = '#F2B53B', fg = '#14181C') {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 ${c.height * .62}px "Saira Condensed", "Arial Narrow", sans-serif`; g.fillText(text, c.width / 2, c.height * .54);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = rotY; WORLD.add(m); return m;
}
function buildGate9() {
  buildSky(0x6F9CC8, 0xDCE6EE, 0xB9C3C8, { clouds: 12, sun: [300, 260, -200], sunR: 12 });
  groundPlane(0x4A4D50, 'asphalt');
  // ---------- terminal shell ----------
  const T0 = -30, wallC = 0xC9C6BE, metal = 0x5E6670;
  flat(T0, -19, 0, 19, .03, 0xCFCBC2, 'tile');
  flat(-11, -18.8, -1, 18.8, .04, 0x4E5E7E, 'carpet');
  wall('x', -19, T0 - .15, .15, 6, .3, wallC, [], 'plaster', 0xA8A49A);
  wall('x', 19, T0 - .15, .15, 6, .3, wallC, [], 'plaster', 0xA8A49A);
  wall('z', T0, -19, 19, 6, .3, wallC, [], 'plaster', 0xA8A49A);
  // the glass wall onto the apron
  const doors = [[-11.6, -9.4], [-1.1, 1.1], [8.4, 10.6]], ops = doors.map(([a, b]) => ({ a, b, lo: 0, hi: 2.6 }));
  for (let a = -18.6; a + 2.6 <= 18.7; a += 3.1) { const b = a + 2.6; if (!doors.some(d => a < d[1] + .4 && b > d[0] - .4)) { ops.push({ a, b, lo: .9, hi: 5.4 }); glassPane('z', 0, a, b, .9, 5.4); } }
  for (const [a, b] of doors) glassPane('z', 0, a, b, 2.6, 5.4);
  wall('z', 0, -19, 19, 6, .3, metal, ops.map(o => o.lo ? o : { a: o.a, b: o.b, lo: 0, hi: 5.4 }), 'metal', 0x3A3E44);
  // door transoms (glass above the doors) are just glass; add a frame bar at 2.6
  for (const [a, b] of doors) deco(-.18, 2.6, a, .18, 2.72, b, 0x3A3E44, { cast: false });
  // ceiling with skylight strips
  const segs = [[T0 - .15, -26], [-24, -20], [-18, -14], [-12, -8], [-6, .15]];
  for (const [a, b] of segs) { deco(a, 6, -19.15, b, 6.35, 19.15, 0xE6E2DA, { tex: 'plaster' }); for (let z = -16; z <= 16; z += 8) { const p = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(2.4, b - a - .6), 1.2), new THREE.MeshBasicMaterial({ color: 0xFFF6E4 })); p.rotation.x = Math.PI / 2; p.position.set((a + b) / 2, 5.98, z); WORLD.add(p); } }
  for (const [a, b] of [[-26, -24], [-20, -18], [-14, -12], [-8, -6]]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 38.3), glassMat); g.rotation.x = Math.PI / 2; g.position.set((a + b) / 2, 6.3, 0); WORLD.add(g); for (let z = -18; z <= 18; z += 3) deco(a, 6.2, z - .06, b, 6.35, z + .06, metal, { cast: false }); }
  deco(T0 - .3, 6.35, -19.3, .3, 7, -18.9, 0x8E8A82); deco(T0 - .3, 6.35, 18.9, .3, 7, 19.3, 0x8E8A82); deco(T0 - .3, 6.35, -19.3, T0 + .1, 7, 19.3, 0x8E8A82); deco(-.1, 6.35, -19.3, .3, 7, 19.3, 0x8E8A82);
  // the roof is solid to walk on (skylight glass included), and the parapet round its edge stops you walking off
  { const rf = addBox(T0 - .15, 6, -19.15, .15, 6.35, 19.15, 0, { noMesh: true }); rf.noMantle = false; }
  for (const [x1, z1, x2, z2] of [[T0 - .3, -19.3, .3, -18.9], [T0 - .3, 18.9, .3, 19.3], [T0 - .3, -19.3, T0 + .1, 19.3], [-.1, -19.3, .3, 19.3]]) addBox(x1, 6.35, z1, x2, 7, z2, 0, { noMesh: true });
  g9Sign('GATE 9', -1.2, 4.6, 0, 3.2, .8, -Math.PI / 2);
  g9Sign('9  \u25C0  GATES 1-8', -14, 5.2, -18.84, 4, .6, 0);
  g9Sign('BAGGAGE  \u25B6', -20, 5.2, 18.84, 3, .6, Math.PI);

  // pillars
  for (const x of [-12.5, -24.5]) for (const z of [-12, 12]) { addBox(x - .4, 0, z - .4, x + .4, 6, z + .4, 0xD8D4CC, { tex: 'plaster' }); deco(x - .45, 0, z - .45, x + .45, .25, z + .45, 0x5E6670, { cast: false }); }
  // gate seating, back-to-back rows
  for (const cx of [-5, -9]) for (const [z0, z1] of [[-16, -11], [-8, -3], [3, 8], [11, 16]]) {
    addBox(cx - .45, 0, z0, cx + .45, 1.05, z1, 0, { noMesh: true });
    deco(cx - .45, .38, z0, cx + .45, .48, z1, 0x2E3C58); deco(cx - .06, .48, z0, cx + .06, 1.05, z1, 0x2E3C58);
    for (let z = z0 + .3; z < z1; z += .62) deco(cx - .4, .48, z - .26, cx + .4, .56, z + .26, 0x3D5078, { cast: false });
    for (const z of [z0 + .15, z1 - .15]) deco(cx - .45, 0, z - .06, cx + .45, .62, z + .06, 0x8A9096);
    for (let z = z0 + 1; z < z1 - .5; z += 1.6) deco(cx - .05, 0, z - .05, cx + .05, .38, z + .05, 0x8A9096, { cast: false });
  }
  // gate desk and the jet-bridge door
  addBox(-3.4, 0, -15.6, -2.4, 1.1, -13, 0x5E6670, { tex: 'metal' }); deco(-3.45, 1.1, -15.65, -2.35, 1.16, -12.95, 0xE6E2DA);
  addBox(-3.4, 0, 13, -2.4, 1.1, 15.6, 0x5E6670, { tex: 'metal' }); deco(-3.45, 1.1, 12.95, -2.35, 1.16, 15.65, 0xE6E2DA);
  // duty-free kiosk
  {
    const x0 = -20, x1 = -14, z0 = -4, z1 = 4, h = 3, kc = 0x2E3440;
    wall('z', x1, z0, z1, h, .16, kc, [DOOR(-1, 1), { a: -3.4, b: -1.6, lo: .8, hi: 2.4 }, { a: 1.6, b: 3.4, lo: .8, hi: 2.4 }], 'metal', 0xD9B23A);
    wall('z', x0, z0, z1, h, .16, kc, [DOOR(-1, 1)], 'metal', 0xD9B23A);
    wall('x', z0, x0, x1, h, .16, kc, [{ a: -19, b: -15, lo: .8, hi: 2.4 }], 'metal', 0xD9B23A);
    wall('x', z1, x0, x1, h, .16, kc, [{ a: -19, b: -15, lo: .8, hi: 2.4 }], 'metal', 0xD9B23A);
    for (const [a, b] of [[-3.4, -1.6], [1.6, 3.4]]) glassPane('z', x1, a, b, .8, 2.4);
    for (const s of [-1, 1]) glassPane('x', s * 4, -19, -15, .8, 2.4);
    addBox(x0 - .1, h, z0 - .1, x1 + .1, h + .2, z1 + .1, 0x2E3440);
    g9Sign('DUTY FREE', x1 + .12, 2.75, 0, 3.4, .45, Math.PI / 2, '#14181C', '#F2B53B');
    flat(x0, z0, x1, z1, .045, 0x8A7A66, 'planks');
    for (const s of [-1, 1]) { addBox(-19.6, 0, s * 3.55 - .3, -14.6, 1.8, s * 3.55 + .3, 0x6B5A48, { tex: 'planks' }); for (const y of [.6, 1.2]) for (let x = -19.3; x < -14.8; x += .5) deco(x - .14, y, s * 3.2 - .1, x + .14, y + .3, s * 3.2 + .1, [0xC9452F, 0x2F5E8A, 0xD9B23A, 0xE6E2DA][(x * 2 + y * 3 >>> 0) % 4], { cast: false }); }
    addBox(-17.4, 0, -.4, -16.6, 1.2, .4, 0x6B5A48, { tex: 'planks' });
    addBox(-19.4, 0, 1.6, -18.4, 1.05, 2.8, 0xD9D4C8);
  }
  // check-in counters and baggage belts on the far wall
  for (const [z0, z1] of [[-15, -9], [9, 15]]) {
    addBox(-26, 0, z0, -25, 1.1, z1, 0xE6E2DA, { tex: 'plaster' }); deco(-26.05, 1.1, z0 - .05, -24.95, 1.16, z1 + .05, 0x3A3E44);
    addBox(-28.2, 0, z0, -27.2, .55, z1, 0x3A3E44); deco(-28.15, .55, z0, -27.25, .58, z1, 0x1E2124, { cast: false });
    for (let z = z0 + 1; z < z1; z += 2) deco(-26.3, 1.16, z - .2, -26.0, 1.5, z + .2, 0x1E2124);
    flightBoard(-29.83, 4.2, (z0 + z1) / 2, 4.5, 2, Math.PI / 2);
  }
  // vending machines, plants, bins, abandoned bags
  for (const [x, z] of [[-8, -18.4], [-6.8, -18.4], [-22, 18.4]]) addBox(x - .55, 0, z - .4, x + .55, 1.9, z + .4, 0xB4483A, { tex: 'metal' });
  for (const [x, z] of [[-1.2, -18], [-1.2, 18], [-12.5, -6], [-12.5, 6], [-28.6, -18], [-28.6, 18]]) { addBox(x - .35, 0, z - .35, x + .35, .7, z + .35, 0x8A8478, { tex: 'concrete' }); bush(x, z, .5, 0x4E7A3A, .7); }
  for (const [x, z, c] of [[-7, -1.8, 0x2F5E8A], [-10.6, 9.4, 0xA8432F], [-3.5, 4.5, 0x3A3A3A], [-21.5, -8.5, 0x7C3B5E]]) { addBox(x - .3, 0, z - .2, x + .3, .7, z + .2, c); deco(x - .05, .7, z - .14, x + .05, .95, z + .14, 0x222222); }

  // ---------- the airliner ----------
  const P = G9, white = 0xEDEDEA, hullMat = new THREE.MeshLambertMaterial({ color: white, side: THREE.DoubleSide });
  // hull angle t: height = cy + r sin t, side offset = cx + r cos t (t near 0 is the +z side, near PI the -z side)
  const tOf = y => Math.asin(clamp((y - P.cy) / P.r, -1, 1));
  const WY0 = 4.85, WY1 = 5.38, WW = .17;
  const winP = [tOf(WY0), tOf(WY1)], winN = [Math.PI - tOf(WY1), Math.PI - tOf(WY0)];
  const doorN = [Math.PI - tOf(5.4), Math.PI - tOf(P.floor)], doorP = [TAU + tOf(P.floor), TAU + tOf(5.4)];
  const BRIDGE = P.bridgeDoor;
  const winXs = []; for (let x = P.x0 + .6; x < P.x1 - .3; x += .9) winXs.push(x);
  const winOnN = x => !P.doors.some(d => Math.abs(x - d) < .9), winOnP = x => Math.abs(x - BRIDGE) > .9;
  // cut points along the fuselage, then one open cylinder per slice with the gaps left out
  const cuts = new Set([P.x0, P.x1]);
  for (const x of winXs) { cuts.add(+(x - WW).toFixed(3)); cuts.add(+(x + WW).toFixed(3)); }
  for (const d of P.doors) { cuts.add(d - .7); cuts.add(d + .7); }
  cuts.add(BRIDGE - .7); cuts.add(BRIDGE + .7);
  const xs = [...cuts].filter(x => x >= P.x0 && x <= P.x1).sort((a, b) => a - b);
  const arc = (xa, xb, ta, tb) => {
    if (tb - ta < .002) return;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(P.r, P.r, xb - xa, Math.max(3, Math.ceil((tb - ta) / TAU * 40)), 1, true, ta, tb - ta), hullMat);
    m.rotation.z = Math.PI / 2; m.position.set((xa + xb) / 2, P.cy, P.cx); m.castShadow = true; m.receiveShadow = true; WORLD.add(m);
  };
  for (let i = 0; i < xs.length - 1; i++) {
    const xa = xs[i], xb = xs[i + 1], mid = (xa + xb) / 2;
    if (xb - xa < .001) continue;
    const gaps = [];
    const inWin = winXs.some(x => Math.abs(mid - x) < WW);
    if (P.doors.some(d => Math.abs(mid - d) < .7)) gaps.push(doorN); else if (inWin && winOnN(mid)) gaps.push(winN);
    if (Math.abs(mid - BRIDGE) < .7) gaps.push(doorP); else if (inWin && winOnP(mid)) gaps.push(winP);
    // walk round from just above the +z door line, skipping each gap
    const start = tOf(5.4) + .0001, list = gaps.map(([g0, g1]) => { let a0 = g0, a1 = g1; while (a0 < start) { a0 += TAU; a1 += TAU; } return [a0, a1]; }).sort((p, q) => p[0] - q[0]);
    let cur = start;
    for (const [g0, g1] of list) { arc(xa, xb, cur, g0); cur = g1; }
    arc(xa, xb, cur, start + TAU);
  }
  // window glass and frames, seen from inside and out
  const winGlass = new THREE.MeshLambertMaterial({ color: 0xA9D2E8, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false });
  for (const x of winXs) for (const [side, band] of [[-1, winN], [1, winP]]) {
    if (side < 0 ? !winOnN(x) : !winOnP(x)) continue;
    const tm = (band[0] + band[1]) / 2, rr = P.r - .01, yy = P.cy + rr * Math.sin(tm), zz = P.cx + rr * Math.cos(tm);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(WW * 2, WY1 - WY0), winGlass); gl.position.set(x, yy, zz); gl.lookAt(x, P.cy, P.cx); WORLD.add(gl);
    for (const dx of [-WW, WW]) deco(x + dx - .012, WY0, zz - .03, x + dx + .012, WY1, zz + .03, 0xC8CCD0, { cast: false });
  }
  // belly stripe (broken around the doors)
  for (const s of [-1, 1]) {
    const zs = P.cx + s * (Math.sqrt(P.r * P.r - .36 * .36) + .015);
    const holes = s < 0 ? P.doors : [BRIDGE];
    let xa = P.x0; for (const d of holes) { deco(xa, 4.05, zs - .015, d - .72, 4.3, zs + .015, 0x2F5E8A, { cast: false }); xa = d + .72; } deco(xa, 4.05, zs - .015, P.x1, 4.3, zs + .015, 0x2F5E8A, { cast: false });
    for (const d of holes) for (const dx of [-.72, .66]) deco(d + dx, 3.2, zs - .03 * s, d + dx + .06, 5.45, zs + (s < 0 ? 0 : .03), 0xB8BCC0, { cast: false });
  }
  // nose, with the windshield cut out so you can see into (and out of) the cockpit
  const noseGrp = new THREE.Group(); noseGrp.position.set(P.x0, P.cy, P.cx); noseGrp.scale.set(1.7, 1, 1); WORLD.add(noseGrp);
  const sph = (ph0, ph1, th0, th1, m = hullMat, rad = P.r) => { const g = new THREE.Mesh(new THREE.SphereGeometry(rad, Math.max(2, Math.ceil((ph1 - ph0) / Math.PI * 28)), Math.max(2, Math.ceil((th1 - th0) / Math.PI * 16)), ph0, ph1 - ph0, th0, th1 - th0), m); g.castShadow = m === hullMat; noseGrp.add(g); return g; };
  const TH0 = .98, TH1 = 1.3, panes = [[-.74, -.5], [-.33, -.09], [.09, .33], [.5, .74]];
  sph(-Math.PI / 2, Math.PI / 2, 0, TH0); sph(-Math.PI / 2, Math.PI / 2, TH1, Math.PI);
  let ph = -Math.PI / 2; for (const [a0, a1] of panes) { sph(ph, a0, TH0, TH1); sph(a0, a1, TH0, TH1, winGlass); ph = a1; } sph(ph, Math.PI / 2, TH0, TH1);
  sph(-Math.PI / 2, Math.PI / 2, TH0 - .015, TH0 + .015, mat(0x1E2A36)); sph(-Math.PI / 2, Math.PI / 2, TH1 - .015, TH1 + .015, mat(0x1E2A36));
  // dark lining inside the nose so the cockpit isn't lit up by the sun through the hull
  const liner = new THREE.MeshLambertMaterial({ color: 0x4A5058, side: THREE.BackSide }), LR = P.r * .965;
  sph(-Math.PI / 2, Math.PI / 2, 0, TH0, liner, LR); sph(-Math.PI / 2, Math.PI / 2, TH1, Math.PI, liner, LR);
  ph = -Math.PI / 2; for (const [a0, a1] of panes) { sph(ph, a0, TH0, TH1, liner, LR); ph = a1; } sph(ph, Math.PI / 2, TH0, TH1, liner, LR);
  // tail cone, fin and stabilisers
  const tg = new THREE.CylinderGeometry(.55, P.r, 5, 28, 1, true), tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setX(i, tp.getX(i) - (tp.getY(i) + 2.5) / 5 * 1.3);
  const tail = new THREE.Mesh(tg, hullMat); tail.rotation.z = -Math.PI / 2; tail.position.set(P.x1 + 2.5, P.cy, P.cx); tail.castShadow = true; WORLD.add(tail);
  const finShape = new THREE.Shape(); finShape.moveTo(0, 0); finShape.lineTo(4.4, 0); finShape.lineTo(5.4, 5.2); finShape.lineTo(3.6, 5.2); finShape.lineTo(0, 0);
  const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: .25, bevelEnabled: false }), mat(0x2F5E8A)); fin.position.set(P.x1 + .3, P.cy + 1.8, P.cx - .125); fin.castShadow = true; WORLD.add(fin);
  const wingShape = (span, root, sweep, tip) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(root, 0); s.lineTo(sweep + tip, span); s.lineTo(sweep, span); s.lineTo(0, 0); return s; };
  for (const sd of [-1, 1]) {
    const st = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape(4.2, 2.6, 2.2, 1.1), { depth: .14, bevelEnabled: false }), mat(white));
    st.rotation.x = sd * Math.PI / 2; st.position.set(P.x1 + 1.4, P.cy + 1.0 + (sd > 0 ? .14 : 0), P.cx + sd * .5); st.castShadow = true; WORLD.add(st);
    // main wings, low and swept
    const wg = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape(14.2, 6.2, 6.6, 1.6), { depth: .26, bevelEnabled: false }), mat(0xDADAD6));
    wg.rotation.x = sd * Math.PI / 2; wg.position.set(15, 2.4 + (sd > 0 ? .26 : 0), P.cx + sd * 1.2); wg.castShadow = true; wg.receiveShadow = true; WORLD.add(wg);
    // engine
    const ez = P.cx + sd * 7.5, ex = 17.5;
    cyl(1.05, 3.8, ex, 1.65, ez, 0xD8D8D4, 20, { rotZ: Math.PI / 2 });
    cyl(.92, .1, ex - 1.92, 1.65, ez, 0x2A2C2E, 20, { rotZ: Math.PI / 2, cast: false });
    cyl(.6, .9, ex + 2.2, 1.65, ez, 0x6E6A64, 16, { rotZ: Math.PI / 2, r2: .8 });
    deco(ex - .6, 2.5, ez - .1, ex + 1.6, 2.75, ez + .1, 0xC8C8C4);
    addBox(ex - 1.9, .6, ez - 1.05, ex + 2.6, 2.7, ez + 1.05, 0, { noMesh: true });
    // main gear
    addBox(19 - .25, 0, P.cx + sd * 1.5 - .25, 19 + .25, 2.2, P.cx + sd * 1.5 + .25, 0x6E6A64);
    for (const dx of [-.45, .45]) { const w = cyl(.5, .35, 19 + dx, .5, P.cx + sd * 1.5, 0x1E2124, 14); w.rotation.x = Math.PI / 2; }
  }
  // ----- airframe collision: you could jump your head up into the belly, and walk through the wings -----
  // the hull's underside, in thin bands that follow the curve, from the belly up to the cabin floor
  const belly = (xa, xb, yc, rad, top = 2.95) => {
    for (let y = yc - rad; y < top - .01; y += .18) {
      const y1 = Math.min(top, y + .18), ym = Math.min(y1, Math.max(y, yc)), h = Math.sqrt(Math.max(0, rad * rad - (yc - ym) * (yc - ym)));
      if (h > .05) { const b = addBox(xa, y, P.cx - h, xb, y1, P.cx + h, 0, { noMesh: true }); b.noMantle = true; }
    }
  };
  belly(P.x0, P.x1, P.cy, P.r);
  // under the nose (an ellipsoid stretched 1.7x along the fuselage)
  for (let x = P.x0 - 1.7 * P.r + .15; x < P.x0; x += .35) { const dx = (Math.min(P.x0, x + .35) + x) / 2 - P.x0, rr = P.r * Math.sqrt(Math.max(0, 1 - (dx / (1.7 * P.r)) ** 2)); belly(x, Math.min(P.x0, x + .35), P.cy, rr); }
  // the top of the hull, so you can stand on the plane: thin bands following the curve, widest edge of each band,
  // from just above the overhead bins (cabin headroom stays clear) up to the crown
  const roof = (xa, xb, yc, rad, y0) => {
    for (let y = y0; y < yc + rad - .01; y += .15) {
      const y1 = Math.min(yc + rad, y + .15), yw = Math.max(y, Math.min(y1, yc)), h = Math.sqrt(Math.max(0, rad * rad - (yc - yw) * (yc - yw)));
      if (h > .05) addBox(xa, y, P.cx - h, xb, y1, P.cx + h, 0, { noMesh: true });
    }
  };
  roof(P.x0, P.x1, P.cy, P.r, 6.0);
  // over the cockpit (its walls stop at 5.6), and the solid tip of the nose ahead of it
  for (let x = P.x0 - 1.7 * P.r + .15; x < P.x0; x += .35) {
    const xb = Math.min(P.x0, x + .35), dx = (x + xb) / 2 - P.x0, rr = P.r * Math.sqrt(Math.max(0, 1 - (dx / (1.7 * P.r)) ** 2));
    roof(x, xb, P.cy, rr, x < 6.3 ? 2.95 : 5.65);   // 6.3: where the cockpit walls start
  }
  // the tail cone narrows and sweeps up; nobody can get inside it, so it's solid all the way through
  for (let x = P.x1; x < P.x1 + 5 - .01; x += .4) { const t = (x + .2 - P.x1) / 5, rad = P.r + (.55 - P.r) * t, yc = P.cy + 1.3 * t; roof(x, Math.min(P.x1 + 5, x + .4), yc, rad, yc - rad); }
  // the fin, stepped up its swept leading and trailing edges
  for (let k = 0; k < 8; k++) {
    const y0 = k / 8 * 5.2, y1 = (k + 1) / 8 * 5.2, ym = (y0 + y1) / 2;
    addBox(P.x1 + .3 + 3.6 * ym / 5.2, P.cy + 1.8 + y0, P.cx - .14, P.x1 + .3 + 4.4 + 1.0 * ym / 5.2, P.cy + 1.8 + y1, P.cx + .14, 0, { noMesh: true });
  }
  // main wings: low and swept, so solid slabs stepped along the span (you can stand on them too)
  for (const sd of [-1, 1]) for (let k = 0; k < 14; k++) {
    const s0 = k / 14 * 14.2, s1 = (k + 1) / 14 * 14.2, sm = (s0 + s1) / 2;
    const le = 15 + 6.6 * sm / 14.2, te = 15 + 6.2 + (6.6 + 1.6 - 6.2) * sm / 14.2;
    const za = P.cx + sd * (1.2 + s0), zb = P.cx + sd * (1.2 + s1);
    const b = addBox(le, 2.4, Math.min(za, zb), te, 2.66, Math.max(za, zb), 0, { noMesh: true }); b.noMantle = k > 9;
  }
  // tailplanes, up out of reach, but they still stop grenades and bullets
  for (const sd of [-1, 1]) for (let k = 0; k < 4; k++) {
    const s0 = k / 4 * 4.2, s1 = (k + 1) / 4 * 4.2, sm = (s0 + s1) / 2, x0 = P.x1 + 1.4;
    const le = x0 + 2.2 * sm / 4.2, te = x0 + 2.6 + (3.3 - 2.6) * sm / 4.2, za = P.cx + sd * (.5 + s0), zb = P.cx + sd * (.5 + s1);
    addBox(le, P.cy + 1.0, Math.min(za, zb), te, P.cy + 1.14, Math.max(za, zb), 0, { noMesh: true });
  }
  // nose gear
  addBox(8.4, 0, P.cx - .2, 8.8, 2.3, P.cx + .2, 0x6E6A64);
  for (const dz of [-.25, .25]) { const w = cyl(.38, .22, 8.6, .38, P.cx + dz, 0x1E2124, 12); w.rotation.x = Math.PI / 2; }
  // cabin: floor, walls, bulkheads (collision), seats, bins
  addBox(P.x0, 2.95, P.cx - 2.4, P.x1, P.floor, P.cx + 2.4, 0, { noMesh: true });
  flat(P.x0, P.cx - 2.1, P.x1, P.cx + 2.1, P.floor + .01, 0x3D4A66, 'carpet');
  for (const s of [-1, 1]) {
    const z = P.cx + s * 2.3, segsX = [], holes = s < 0 ? P.doors : [BRIDGE];
    let a = P.x0; for (const d of holes) { segsX.push([a, d - .7]); a = d + .7; } segsX.push([a, P.x1]);
    // solid below and above the window band, posts between the windows: you can see and shoot through the glass
    for (const [xa, xb] of segsX) {
      addBox(xa, P.floor, z - .1, xb, WY0, z + .1, 0, { noMesh: true });
      addBox(xa, WY1, z - .1, xb, 6.4, z + .1, 0, { noMesh: true });
      let c = xa;
      for (const x of winXs) { if (x - WW < xa || x + WW > xb) continue; if (x - WW > c) addBox(c, WY0, z - .1, x - WW, WY1, z + .1, 0, { noMesh: true }); c = x + WW; }
      if (c < xb) addBox(c, WY0, z - .1, xb, WY1, z + .1, 0, { noMesh: true });
    }
    deco(P.x0 + .2, 5.55, z - s * .75, P.x1 - .2, 5.95, z, 0xE2E0DA);
    deco(P.x0 + .2, 5.5, z - s * .75, P.x1 - .2, 5.55, z - s * .05, 0x9AA0A6, { cast: false });
  }
  // rear bulkhead, and the cockpit bulkhead with an open doorway
  addBox(P.x1 - .2, P.floor, P.cx - 2.4, P.x1, 6.4, P.cx + 2.4, 0xE2E0DA, { tex: 'plaster' });
  addBox(P.x0, P.floor, P.cx - 2.4, P.x0 + .2, 6.4, P.cx - .5, 0xE2E0DA, { tex: 'plaster' });
  addBox(P.x0, P.floor, P.cx + .5, P.x0 + .2, 6.4, P.cx + 2.4, 0xE2E0DA, { tex: 'plaster' });
  addBox(P.x0, P.floor + 2.15, P.cx - .5, P.x0 + .2, 6.4, P.cx + .5, 0xE2E0DA, { tex: 'plaster' });
  // door frame: stands proud of the bulkhead on every face (sharing a face with the wall made it flicker)
  deco(P.x0 - .03, P.floor, P.cx - .56, P.x0 + .23, P.floor + 2.1, P.cx - .47, 0x5E6670, { cast: false }); deco(P.x0 - .03, P.floor, P.cx + .47, P.x0 + .23, P.floor + 2.1, P.cx + .56, 0x5E6670, { cast: false });
  deco(P.x0 - .03, P.floor + 2.1, P.cx - .56, P.x0 + .23, P.floor + 2.19, P.cx + .56, 0x5E6670, { cast: false });
  // cockpit: floor, curved walls (stepped collision inside the nose), seats, panels
  const CK0 = 6.5;
  addBox(CK0, 2.95, P.cx - 1.8, P.x0, P.floor, P.cx + 1.8, 0, { noMesh: true });
  for (let x = CK0 - .2; x < P.x0; x += .35) {
    const dx = (x + .175 - P.x0) / (1.7 * P.r), rr = P.r * Math.sqrt(Math.max(0, 1 - dx * dx)), hw = Math.max(.25, Math.sqrt(Math.max(0, rr * rr - 1.4 * 1.4)) - .12);
    if (x < P.x0 - .001) flat(x, P.cx - hw, Math.min(x + .35, P.x0), P.cx + hw, P.floor + .01, 0x2E3440, 'carpet');   // stops at the bulkhead: overlapping the cabin carpet flickered
    for (const s of [-1, 1]) addBox(x, P.floor, s < 0 ? P.cx - 2.6 : P.cx + hw, x + .35, P.floor + 2.4, s < 0 ? P.cx - hw : P.cx + 2.6, 0, { noMesh: true });
  }
  addBox(CK0 - .6, P.floor, P.cx - 1.4, CK0 + .3, P.floor + .95, P.cx + 1.4, 0x2A2D31, { tex: 'metal' }); // instrument panel
  const glowM = new THREE.MeshBasicMaterial({ color: 0x3FD07A }), screenM = new THREE.MeshBasicMaterial({ color: 0x1E5A8A });
  for (const [z, m] of [[-.85, screenM], [-.35, glowM], [.35, screenM], [.85, glowM]]) { const sc = new THREE.Mesh(new THREE.PlaneGeometry(.36, .26), m); sc.position.set(CK0 + .31, P.floor + .72, P.cx + z); sc.rotation.y = -Math.PI / 2; sc.rotation.x = -.2; WORLD.add(sc); }
  deco(CK0 + .1, P.floor + .95, P.cx - 1.1, CK0 + .5, P.floor + 1.02, P.cx + 1.1, 0x1E2124);
  addBox(CK0 + .4, P.floor, P.cx - .2, CK0 + 1.3, P.floor + .75, P.cx + .2, 0x2A2D31, { tex: 'metal' }); // centre pedestal
  for (const z of [-.08, 0, .08]) deco(CK0 + .7, P.floor + .75, P.cx + z - .015, CK0 + .78, P.floor + .95, P.cx + z + .015, 0xC9CED2);
  for (const s of [-1, 1]) {
    const z = P.cx + s * .62;
    addBox(CK0 + 1.1, P.floor, z - .28, CK0 + 1.7, P.floor + .55, z + .28, 0x3A4048);
    deco(CK0 + 1.55, P.floor + .55, z - .26, CK0 + 1.72, P.floor + 1.35, z + .26, 0x3A4048);
    deco(CK0 + .5, P.floor + .55, z - .02, CK0 + .56, P.floor + .9, z + .02, 0x1E2124); deco(CK0 + .44, P.floor + .86, z - .16, CK0 + .56, P.floor + .92, z + .16, 0x1E2124); // yokes
  }
  deco(CK0 + .8, P.floor + 2.15, P.cx - .7, CK0 + 2.4, P.floor + 2.25, P.cx + .7, 0x2A2D31); // overhead panel
  { const l = new THREE.PointLight(0x9FD4FF, .5, 4, 2); l.position.set(CK0 + 1.2, P.floor + 1.6, P.cx); WORLD.add(l); }
  addBox(P.x0 + .2, P.floor, P.cx - 2.2, P.x0 + .9, P.floor + 1.05, P.cx - .6, 0xB8BCC0, { tex: 'metal' });
  addBox(P.x1 - .9, P.floor, P.cx + .6, P.x1 - .2, P.floor + 1.05, P.cx + 2.2, 0xB8BCC0, { tex: 'metal' });
  for (let x = P.x0 + 1.5; x < P.x1 - .6; x += .86) {
    if (P.doors.some(d => Math.abs(x - d) < 1.35)) continue;
    for (const [z0, z1] of [[P.cx - 2.05, P.cx - .95], [P.cx + .95, P.cx + 2.05]]) {
      addBox(x - .3, P.floor, z0, x + .3, P.floor + 1.1, z1, 0, { noMesh: true });
      // cushion, backrest and headrest cover never share a face (shared faces flickered)
      deco(x - .3, P.floor + .4, z0 + .015, x + .2, P.floor + .55, z1 - .015, 0x2E3C58);
      deco(x + .18, P.floor + .45, z0, x + .3, P.floor + 1.12, z1, 0x2E3C58);
      deco(x + .175, P.floor + 1.0, z0 + .12, x + .315, P.floor + 1.135, z1 - .12, 0xE6E2DA, { cast: false });
      for (const zz of [z0 + .04, (z0 + z1) / 2, z1 - .04]) deco(x - .26, P.floor, zz - .03, x - .2, P.floor + .4, zz + .03, 0x6E7478, { cast: false });
    }
  }
  // airstairs at both doors
  for (const d of P.doors) {
    stairs('z', -4.2, P.cx - 2.4, d - .7, d + .7, P.floor, 0xD8D8D0, 'diamond');
    for (const s of [-1, 1]) {
      beam([d + s * .74, 1.05, -4.2], [d + s * .74, P.floor + 1.05, P.cx - 2.4], .06, 0xB8BCC0); beam([d + s * .74, 0, -4.2], [d + s * .74, 1.05, -4.2], .06, 0xB8BCC0);
      // the handrail as stepped collision along its slope: it keeps you on the stairs, but you can hop up onto it and
      // tightrope to the top, then jump for the roof of the plane from there. Bullets pass.
      const n = 13, z0r = -4.2, z1r = P.cx - 2.4;
      for (let k = 0; k < n; k++) {
        const za = z0r + (z1r - z0r) * k / n, zb = z0r + (z1r - z0r) * (k + 1) / n, top = 1.05 + P.floor * (k + .5) / n;
        const rb = addBox(d + s * .74 - .08, Math.max(0, top - 1.05), za, d + s * .74 + .08, top, zb, 0, { noMesh: true }); rb.ghost = true;
      }
    }
    deco(d - .9, 0, -4.4, d + .9, .3, -4.2, 0x3A3E44);
  }

  // ---------- jet bridge: terminal door -> rotunda -> the plane's far-side door ----------
  {
    const z0 = P.bz0, z1 = P.bz1, X0 = .3, X1 = P.rampX, n = 13, rise = P.floor / n, run = (X1 - X0) / n, H = 2.5;
    const bc = 0xB8BCC0, bd = 0x6E7478;
    // walkable steps (thin slabs so you can walk under the high end)
    for (let k = 0; k < n; k++) { const top = rise * (k + 1); const b0 = addBox(X0 + k * run, Math.max(0, top - .32), z0, X0 + (k + 1) * run, top, z1, 0, { noMesh: true }); b0.noMantle = true; }
    const ang = Math.atan2(P.floor, X1 - X0), L = Math.hypot(P.floor, X1 - X0), mx = (X0 + X1) / 2, my = P.floor / 2;
    const slab = (y, h, zA, zB, c, opt = {}) => { const m = new THREE.Mesh(boxGeo(L + .02, h, Math.abs(zB - zA), opt.tex ? TEXDEF[opt.tex].scale : 0), opt.m || mat(c, opt.tex)); m.position.set(mx, my + y, (zA + zB) / 2); m.rotation.z = ang; m.castShadow = true; m.receiveShadow = true; WORLD.add(m); return m; };
    slab(.005, .02, z0, z1, 0x3D4A66, { tex: 'carpet' });
    slab(-.18, .3, z0 - .15, z1 + .15, bd, { tex: 'metal' });
    slab(H + .08, .14, z0 - .15, z1 + .15, bc, { tex: 'metal' });
    for (const zw of [z0 - .08, z1 + .08]) {
      slab(.5, 1.0, zw - .06, zw + .06, bc, { tex: 'metal' });
      slab(2.25, .5, zw - .06, zw + .06, bc, { tex: 'metal' });
      slab(1.5, 1.0, zw - .01, zw + .01, 0, { m: glassMat });
      // walls: collide with movement, but they are mostly glass, so bullets and eyes pass
      for (let k = 0; k < n; k++) { const top = rise * (k + 1); const w = addBox(X0 + k * run, Math.max(0, top - .32), zw - .06, X0 + (k + 1) * run, top + H, zw + .06, 0, { noMesh: true }); w.invis = true; w.noMantle = true; }
    }
    // the roof of the sloped tube: shallow steps that follow its slope, so you can walk up the top of it (and not fall in)
    for (let k = 0; k < n; k++) { const yr = rise * (k + .5) + H + .15; addBox(X0 + k * run, yr - .3, z0 - .15, X0 + (k + 1) * run, yr, z1 + .15, 0, { noMesh: true }); }
    for (let k = 1; k < 6; k++) { const x = X0 + (X1 - X0) * k / 6, y = P.floor * k / 6; deco(x - .06, y, z0 - .2, x + .06, y + H + .15, z0 - .1, bd, { cast: false }); deco(x - .06, y, z1 + .1, x + .06, y + H + .15, z1 + .2, bd, { cast: false }); }
    { const l = new THREE.Mesh(new THREE.PlaneGeometry(L - .4, .2), new THREE.MeshBasicMaterial({ color: 0xFFF6E4, side: THREE.DoubleSide })); l.position.set(mx, my + H - .02, (z0 + z1) / 2); l.rotation.x = Math.PI / 2; l.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), ang); WORLD.add(l); }
    // rotunda on a drive column
    const R0 = X1, R1 = 14.6, RZ0 = 6.6, RZ1 = z1 + .1;
    addBox(R0, P.floor - .3, RZ0, R1, P.floor, RZ1, bd, { tex: 'metal' });
    flat(R0, RZ0, R1, RZ1, P.floor + .01, 0x3D4A66, 'carpet');
    addBox(R0 - .02, P.floor + H, RZ0 - .1, R1 + .1, P.floor + H + .2, RZ1 + .1, bc, { tex: 'metal' });
    wall('z', R1, RZ0, RZ1, H, .14, bc, [{ a: RZ0 + .8, b: RZ1 - .8, lo: 1.0, hi: 2.0 }], 'metal', bd, P.floor);
    glassPane('z', R1, RZ0 + .8, RZ1 - .8, P.floor + 1, P.floor + 2);
    wall('x', RZ1, R0, R1, H, .14, bc, [{ a: R0 + .6, b: R1 - .6, lo: 1.0, hi: 2.0 }], 'metal', bd, P.floor);
    glassPane('x', RZ1, R0 + .6, R1 - .6, P.floor + 1, P.floor + 2);
    wall('x', RZ0, R0, R1, H, .14, bc, [{ a: P.bridgeDoor - .7, b: P.bridgeDoor + .7, lo: 0, hi: 2.2 }, { a: R0 + .4, b: R0 + 2.4, lo: 1.0, hi: 2.0 }], 'metal', bd, P.floor);
    glassPane('x', RZ0, R0 + .4, R0 + 2.4, P.floor + 1, P.floor + 2);
    // the opening at the top of the ramp: posts either side
    for (const zz of [z0 - .1, RZ1 - .02]) deco(R0 - .08, P.floor, zz - .06, R0 + .06, P.floor + H + .1, zz + .06, bd);
    deco(R0 - .08, P.floor + H - .1, RZ0, R0 + .06, P.floor + H + .1, z0 - .1, bd);
    const b1 = addBox(R0 - .07, P.floor, RZ0, R0 + .05, P.floor + H, z0 - .16, bc, { tex: 'metal' }); b1.noMantle = true;
    cyl(.35, P.floor - .3, (R0 + R1) / 2, (P.floor - .3) / 2, (RZ0 + RZ1) / 2, 0x5E6670, 14);
    addBox((R0 + R1) / 2 - .36, 0, (RZ0 + RZ1) / 2 - .36, (R0 + R1) / 2 + .36, P.floor - .3, (RZ0 + RZ1) / 2 + .36, 0, { noMesh: true });
    deco((R0 + R1) / 2 - 1, .15, (RZ0 + RZ1) / 2 - .5, (R0 + R1) / 2 + 1, .75, (RZ0 + RZ1) / 2 + .5, 0xD9B23A);
    for (const dx of [-.7, .7]) wheel((R0 + R1) / 2 + dx, (RZ0 + RZ1) / 2, .32, 'z');
    // short tunnel and a rubber canopy against the fuselage
    const d = P.bridgeDoor, TZ0 = P.cx + 2.2;
    addBox(d - .75, P.floor - .3, TZ0, d + .75, P.floor, RZ0, bd, { tex: 'metal' });
    flat(d - .7, TZ0, d + .7, RZ0, P.floor + .01, 0x3D4A66, 'carpet');
    for (const sx of [-1, 1]) { const w = addBox(d + sx * .78 - .06, P.floor, TZ0 + .35, d + sx * .78 + .06, P.floor + H, RZ0, bc, { tex: 'metal' }); }
    addBox(d - .84, P.floor + H, TZ0 + .3, d + .84, P.floor + H + .12, RZ0, bc, { tex: 'metal' });
    // accordion canopy: rings of black rubber around the doorway
    for (let k = 0; k < 5; k++) { const zz = TZ0 + .05 + k * .07, c = k % 2 ? 0x1E2124 : 0x2A2D31; deco(d - .9, P.floor - .05, zz, d - .72, P.floor + H + .15, zz + .04, c, { cast: false }); deco(d + .72, P.floor - .05, zz, d + .9, P.floor + H + .15, zz + .04, c, { cast: false }); deco(d - .9, P.floor + H - .02, zz, d + .9, P.floor + H + .15, zz + .04, c, { cast: false }); deco(d - .9, P.floor - .05, zz, d + .9, P.floor - .01, zz + .04, c, { cast: false }); }
    // the sign runs along the side of the bridge at the same slope, on the solid band under the roof, clear of the posts
    { const sg = g9Sign('GATE 9 \u00B7 NORTHFIELD AIR', mx, my + 2.25, z0 - .25, 4.6, .42, Math.PI); sg.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), ang); }
    // where the bridge meets the terminal: a collar against the glass so there are no gaps around the sloped tube
    {
      const fc = 0x5E6670, xa = .15, xb = .55, za = z0 - .3, zb = z1 + .3, top = H + .45;
      deco(xa, 0, za, xb, top, z0 - .02, fc); deco(xa, 0, z1 + .02, xb, top, zb, fc);           // sides
      deco(xa, H - .08, za, xb, top, zb, fc);                                                         // header
      deco(xa, -.02, za, xb, .06, zb, fc, { cast: false });                                          // threshold
      for (let k = 0; k < 4; k++) { const zz = za + .02 + k * .06, c = k % 2 ? 0x1E2124 : 0x2A2D31; deco(xb, 0, zz, xb + .04, top - .05, zz + .04, c, { cast: false }); deco(xb, 0, zb - .06 - k * .06, xb + .04, top - .05, zb - .02 - k * .06, c, { cast: false }); }
      const cb = addBox(xa, H - .08, za, xb, top, zb, 0, { noMesh: true }); cb.noMantle = true;
    }
  }

  // ---------- apron: vehicles and cargo ----------
  const tug = (x, z, c) => { addBox(x - .9, 0, z - .7, x + .9, 1.1, z + .7, c, { tex: 'metal' }); deco(x - .2, 1.1, z - .6, x + .7, 1.7, z + .6, 0x2A2C2E); deco(x - .15, 1.7, z - .6, x + .75, 1.76, z + .6, c); };
  const cart = (x, z) => { addBox(x - .8, 0, z - .6, x + .8, .55, z + .6, 0x3A4048); for (let k = 0; k < 4; k++) deco(x - .7 + (k % 2) * .75, .55, z - .5 + (k >> 1) * .5, x - .05 + (k % 2) * .75, .55 + .35 + (k * .07), z - .05 + (k >> 1) * .5, [0x2E3C58, 0x7C3B5E, 0x2A2C2E, 0x9B7A50][k]); addBox(x - .75, .55, z - .55, x + .75, 1.05, z + .55, 0, { noMesh: true }); };
  tug(2.6, -12, 0xD9B23A); for (const x of [4.6, 6.4, 8.2]) cart(x, -12);
  tug(12.4, 14.2, 0xD9B23A); for (const x of [14.4, 16.2]) cart(x, 14.2);
  const uld = (x, z) => { addBox(x - .78, 0, z - .78, x + .78, 1.6, z + .78, 0xB8BCC0, { tex: 'metal' }); deco(x - .79, .1, z - .6, x - .78, 1.4, z + .6, 0x5E6670, { cast: false }); };
  uld(22.6, 11.6); uld(24.4, 11.6); uld(23.5, 13.4); uld(5, -5.6); uld(5, -3.8); uld(29.5, 7.5);
  // fuel truck
  { const x0 = 22, x1 = 29, z = -15.2; addBox(x0, 0, z - 1.2, x0 + 2, 2.5, z + 1.2, 0xE6E2DA, { tex: 'metal' }); deco(x0 - .02, 1.5, z - 1.0, x0, 2.3, z + 1.0, 0x1E2A36); const tk = cyl(1.15, x1 - x0 - 2.2, (x0 + 2.2 + x1) / 2, 1.75, z, 0xE6E2DA, 18, { rotZ: Math.PI / 2, tex: 'metal' }); addBox(x0 + 2.1, .5, z - 1.15, x1, 2.9, z + 1.15, 0, { noMesh: true }); deco(x0 + 2.1, .3, z - 1.1, x1, .6, z + 1.1, 0x2A2C2E); for (const x of [x0 + .8, x0 + 3.5, x1 - 1]) for (const s of [-1, 1]) wheel(x, z + s * 1.05, .48, 'z'); g9Sign('JET A-1', (x0 + 2.2 + x1) / 2, 1.8, z - 1.17, 2.2, .45, Math.PI, '#E6E2DA', '#B4483A'); }
  // catering truck with the box raised
  { const x = 5.5, z = 13.2; addBox(x - 3, 0, z - 1.2, x - 1.2, 2.4, z + 1.2, 0xE6E2DA, { tex: 'metal' }); addBox(x - 1.2, 0, z - 1.2, x + 3, .9, z + 1.2, 0x3A3E44); addBox(x - 1, 2.0, z - 1.2, x + 3, 4.4, z + 1.2, 0xE6E2DA, { tex: 'metal' }); deco(x - 1, 3.2, z - 1.22, x + 3, 3.5, z - 1.2, 0xB4483A); for (const s of [-1, 1]) for (const dx of [-.8, .8]) beam([x + dx, .9, z + s * 1.0], [x - dx, 2.0, z + s * 1.0], .08, 0x6E6A64); for (const dx of [-2.2, 2.2]) for (const s of [-1, 1]) wheel(x + dx, z + s * 1.05, .45, 'z'); }
  // GPU cart, cones, chocks, jersey barriers
  addBox(9.2, 0, -7.8, 10.8, 1.2, -6.8, 0xD9B23A, { tex: 'metal' });
  for (const [x, z] of [[7, 0], [7, 5], [30, -2], [30, 7], [12, -9], [27, -9]]) { const c = cyl(.02, .7, x, .35, z, 0xE0623F, 8, { r2: .22 }); deco(x - .2, 0, z - .2, x + .2, .04, z + .2, 0xE0623F, { cast: false }); }
  for (const [x, z] of [[2.4, -16.5], [2.4, 16.5], [14, -17], [31, 15]]) { addBox(x - .3, 0, z - 1.3, x + .3, .9, z + 1.3, 0xB9B5AC, { tex: 'concrete' }); }
  // painted apron markings
  flat(.3, P.cx - .1, 33, P.cx + .1, .03, 0xE5B93F);
  flat(8, P.cx - 1.6, 8.25, P.cx + 1.6, .03, 0xE5B93F);
  for (const z of [-18.3, 18.3]) flat(.3, z - .08, 33, z + .08, .03, 0xE8E2D2);
  // perimeter
  chainFence('x', -19.1, .3, 33.6); chainFence('x', 19.1, .3, 33.6); chainFence('z', 33.6, -19.1, 19.1);
  // out-of-bounds: the walls reach high above the terminal roof and the plane's tail, so nobody can jump the
  // fences from up there. Around the terminal they sit just outside its outer walls (not over the roof), so the
  // roof and parapet stay walkable.
  const OOB_H = 40;
  invisWall(.3, -21, 35, -18.95, OOB_H); invisWall(.3, 18.95, 35, 21, OOB_H); invisWall(32.85, -21, 35, 21, OOB_H);
  invisWall(T0 - 1.3, -21, .3, -19.3, OOB_H); invisWall(T0 - 1.3, 19.3, .3, 21, OOB_H); invisWall(T0 - 1.3, -19.3, T0 - .3, 19.3, OOB_H);
  // the airport beyond
  flat(40, -300, 100, 300, .02, 0x3A3D40, 'asphalt');
  for (let z = -280; z < 280; z += 18) flat(69.6, z, 70.4, z + 9, .03, 0xE8E2D2);
  for (const [x, z, w, d, h] of [[-60, -60, 40, 24, 12], [-60, 40, 50, 30, 10], [10, -70, 30, 20, 9], [20, 60, 36, 18, 11]]) deco(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, 0xB8B4AA, { tex: 'concrete', cast: false });
  cyl(2.2, 26, 30, 13, -56, 0xD8D4CC, 12); cyl(4.4, 4, 30, 28, -56, 0x5E8AA8, 12, { r2: 3.4 }); deco(26, 30, -60, 34, 30.6, -52, 0x3A3E44);
  for (const [x, z] of [[90, -40], [110, 60]]) { const pl = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 26, 12), mat(0xEDEDEA)); b.rotation.x = Math.PI / 2; pl.add(b); const w = new THREE.Mesh(new THREE.BoxGeometry(28, .3, 4), mat(0xDADAD6)); pl.add(w); pl.position.set(x, 2.6, z); WORLD.add(pl); }
}

/* ---------- zombies layout: the terminal after the last flight ---------- */
// start in the gate lounge; the dead come in from the back of the terminal and over the apron fences
const GATE9_ZOMBIES = {
  start: { x: -7, z: 0, yaw: -Math.PI / 2 },
  spawns: [
    [-28.8, -6], [-28.8, 6], [-20, -18.2], [-20, 18.2], [-3, -18.3], [-3, 18.3],
    [12, -18.3], [20, -18.3], [31.8, -12], [31.8, 0], [31.8, 10], [20, 18.3],
  ],
  walls: [
    { key: 'mp',      cost: 750,  x: -16,    y: 1.55, z: -18.83, n: [0, 1] },
    { key: 'smg',     cost: 1000, x: -14,    y: 1.55, z: 18.83,  n: [0, -1] },
    { key: 'shotgun', cost: 1500, x: -29.83, y: 1.55, z: 0,      n: [1, 0] },
    { key: 'ar',      cost: 1400, x: -24,    y: 1.55, z: -18.83, n: [0, 1] },
    { key: 'lmg',     cost: 2500, x: 3.4,    y: 1.45, z: 11.98,  n: [0, -1] },
  ],
  box: { x: -17, z: -8, rot: 0 },
  pap: { x: 26, z: -6, n: [-1, 0] },
  perks: [
    { key: 'ironhide',   x: -18,    y: 0, z: 18.45,  n: [0, -1] },
    { key: 'fasthands',  x: -11,    y: 0, z: -18.45, n: [0, 1] },
    { key: 'secondwind', x: -29.47, y: 0, z: -5,     n: [1, 0] },
    { key: 'rapidround', x: .55,    y: 0, z: 5,      n: [1, 0] },
  ],
};
MAPS.gate9 = {
  name: 'Gate 9', sub: 'Northfield International', build: buildGate9, zombies: GATE9_ZOMBIES,
  desc: 'A departure lounge and the airliner parked outside. Hold the glass, take the jet bridge onto the plane, or fight down the aisle to the open cockpit.',
  bounds: [-29.4, 32.4, -18.4, 18.4], center: [2, 0], coreR: 18, orbit: { r: 42, h: 20 },
  upper: { y: G9.floor, rects: [[G9.x0 + .3, G9.x1 - .1, G9.cx - 2.2, G9.cx + 2.2], [6.9, G9.x0 + .3, G9.cx - .9, G9.cx + .9], [G9.rampX + .1, 14.5, 6.7, G9.bz1], [G9.bridgeDoor - .65, G9.bridgeDoor + .65, G9.cx + 2.1, 6.8]] },
  portals: [...G9.doors.map(d => ({ g: [d, -5.5], u: [d, 2.5], up: [[d, -5.0], [d, -3.9], [d, -.05], [d, 2.0]] })),
    { g: [-1.5, 9.5], u: [10.5, 9.5], cost: 12, up: [[-.9, 9.5], [.5, 9.5], [G9.rampX - .3, 9.5], [9.8, 9.5]] }],
  spawns: { A: [-29, -27, -17, 17], B: [27, 32, -17, 17] },
  lighting: { day: { fog: [0xC9D3DA, 55, 240], hemi: [0xDDE8F0, 0x8A8478, .72], amb: .16, sun: [0xFFF0D8, .95, 40, 50, -30], torch: 0 },
    night: { fog: [0x0B121A, 12, 70], hemi: [0x5A6E8A, 0x1A1712, .3], amb: .08, sun: [0x9DB4FF, .3, 40, 50, -30], torch: 1.7 } },
  mini: {
    bg: '#34373a', draw(x, X, Z, S) {
      x.fillStyle = '#5f5c56'; x.fillRect(X(-30), Z(-19), 30 * S, 38 * S);
      x.fillStyle = 'rgba(216,216,208,.55)'; x.fillRect(X(G9.x0 - 4), Z(G9.cx - 2.6), (G9.x1 - G9.x0 + 8) * S, 5.2 * S);
      x.beginPath(); x.moveTo(X(15), Z(G9.cx)); x.lineTo(X(21), Z(G9.cx)); x.lineTo(X(23.5), Z(G9.cx - 15)); x.lineTo(X(21.8), Z(G9.cx - 15)); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(X(15), Z(G9.cx)); x.lineTo(X(21), Z(G9.cx)); x.lineTo(X(23.5), Z(G9.cx + 15)); x.lineTo(X(21.8), Z(G9.cx + 15)); x.closePath(); x.fill();
      x.fillStyle = 'rgba(184,188,192,.6)'; x.fillRect(X(0), Z(G9.bz0), (14.6) * S, (G9.bz1 - G9.bz0) * S); x.fillRect(X(G9.rampX), Z(6.6), (14.6 - G9.rampX) * S, (G9.bz1 - 6.6) * S); x.fillRect(X(G9.bridgeDoor - .75), Z(G9.cx + 2.2), 1.5 * S, (6.6 - G9.cx - 2.2) * S);
    },
  },
};
