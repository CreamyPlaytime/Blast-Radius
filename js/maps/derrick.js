// Blast Radius \u00B7 map: Derrick \u2014 a desert oil field at sunset, built around a drilling tower you can climb.
'use strict';

const DK = { y: 4.2, half: 3.5 };
function buildDerrick() {
  buildSky(0x4F6E96, 0xF2B07A, 0xC98E5E, { sun: [-340, 120, 210], sunR: 20, sunColor: 0xFFD49A, clouds: 9, cloudColor: 0xF6C9A0, cloudAlpha: .7 });
  groundPlane(0xC9A878, 'sand');
  flat(-24.6, -24.6, 24.6, 24.6, .015, 0xD4B483, 'sand');
  // oil-stained dirt and tracks
  for (const [x, z, w, d] of [[-2, 12, 6, 18], [14, -8, 18, 5], [-14, -2, 6, 10], [0, -14, 12, 5]]) flat(x - w / 2, z - d / 2, x + w / 2, z + d / 2, .025, 0xA48660, 'dirt');
  for (const [x, z, r] of [[1.5, -1, 2.4], [-15.5, 15, 1.4], [16.5, -3, 1.4], [-4, -6, 1]]) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 18), mat(0x2E2820)); m.rotation.x = -Math.PI / 2; m.position.set(x, .035, z); WORLD.add(m); }

  // ---------- the tower ----------
  const Y = DK.y, H = DK.half, steel = 0xB7552E, grey = 0x6E6A64;
  addBox(-H, Y - .25, -H, H, Y, H, 0x8C8A86, { tex: 'diamond' });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) addBox(sx * (H - .15) - .2, 0, sz * (H - .15) - .2, sx * (H - .15) + .2, Y - .25, sz * (H - .15) + .2, steel);
  for (const s of [-1, 1]) {
    beam([s * (H - .15), .3, -(H - .15)], [s * (H - .15), Y - .4, H - .15], .12, steel); beam([s * (H - .15), .3, H - .15], [s * (H - .15), Y - .4, -(H - .15)], .12, steel);
    beam([-(H - .15), .3, s * (H - .15)], [H - .15, Y - .4, s * (H - .15)], .12, steel);
  }
  railing('x', -H, -H, H, Y, 0xD9B23A); railing('x', H, -H, H, Y, 0xD9B23A);
  railing('z', -H, -H, H, Y, 0xD9B23A);
  railing('z', H, -H, -.75, Y, 0xD9B23A); railing('z', H, .75, H, Y, 0xD9B23A);
  // the mast: four legs tapering to a crown block
  const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [sx, sz] of legs) {
    addBox(sx * .85 - .1, Y, sz * .85 - .1, sx * .85 + .1, Y + 3, sz * .85 + .1, steel, { noMesh: true });
    beam([sx * .85, Y, sz * .85], [sx * .3, 18, sz * .3], .2, steel);
  }
  for (let k = 0; k < 6; k++) {
    const y0 = Y + 2.2 + k * 2.2, y1 = y0 + 2.2, w0 = .85 - (y0 - Y) / (18 - Y) * .55, w1 = .85 - (y1 - Y) / (18 - Y) * .55;
    for (let i = 0; i < 4; i++) { const a = legs[i], b = legs[(i + 1) % 4]; beam([a[0] * w0, y0, a[1] * w0], [b[0] * w1, y1, b[1] * w1], .07, steel); beam([a[0] * w1, y1, a[1] * w1], [b[0] * w1, y1, b[1] * w1], .07, steel); }
  }
  deco(-.6, 18, -.6, .6, 18.8, .6, grey);
  for (const dz of [-.12, .12]) beam([0, 18, dz], [0, Y + 2.2, dz], .025, 0x222222);
  deco(-.35, Y + 2, -.35, .35, Y + 2.6, .35, 0xD9B23A);
  cyl(.16, 2, 0, Y + 1, 0, 0x4A4A48, 10);
  // drawworks and doghouse on the floor as cover
  addBox(-2.9, Y, 1.7, -1.8, Y + 1.1, 2.9, 0x8A3A24, { tex: 'metal' });
  addBox(1.8, Y, -2.9, 2.9, Y + 1.0, -2.0, grey, { tex: 'metal' });
  // stairs up the east side
  stairs('x', 9.1, H, -.65, .65, Y, 0x77736C, 'diamond');
  for (const z of [-.72, .72]) { beam([9.1, 1.05, z], [H, Y + 1.05, z], .06, 0xD9B23A); beam([9.1, 0, z], [9.1, 1.05, z], .06, 0xD9B23A); }
  // pipe rack beside the tower, mud pumps
  addBox(-8.5, 0, -2.2, -5.5, 1.5, 1.4, 0x3E6E8E, { tex: 'metal' }); deco(-8.4, 1.5, -2.1, -5.6, 1.7, 1.3, 0x2A2C2E);
  cyl(.5, 3, -7, .95, 2.4, 0x3E6E8E, 12, { rotX: Math.PI / 2 }); addBox(-7.5, 0, .9, -6.5, 1.45, 3.9, 0, { noMesh: true });

  // ---------- tanks, pipes, pumpjacks ----------
  tank(-15, -13, 3, 6, 0xD8D2C4); tank(-15.5, -4.5, 2.2, 5, 0xB8B4AA); tank(16, 13, 3, 6, 0xD8D2C4);
  deco(-12.2, 5.6, -13.2, -9, 5.75, -12.8, 0xD9B23A); beam([-12.1, 0, -13], [-12.1, 6, -13], .08, 0xD9B23A);
  const pipe = (a, b, y = .55, r = .3) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    const m = cyl(r, L, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, 0x7C7A74, 10, { tex: 'metal' });
    if (dx) m.rotation.z = Math.PI / 2; else m.rotation.x = Math.PI / 2;
    addBox(Math.min(a[0], b[0]) - (dx ? 0 : r), 0, Math.min(a[1], b[1]) - (dz ? 0 : r), Math.max(a[0], b[0]) + (dx ? 0 : r), y + r, Math.max(a[1], b[1]) + (dz ? 0 : r), 0, { noMesh: true });
    for (let t = .1; t < 1; t += 1 / Math.max(1, Math.round(L / 3))) deco(a[0] + dx * t - .15, 0, a[1] + dz * t - .15, a[0] + dx * t + .15, y - r + .02, a[1] + dz * t + .15, 0x4A4844);
  };
  pipe([-7, 9], [-7, 17.5]); pipe([6, -9], [17, -9]); pipe([-15, -9.6], [-15, -6.9], .5, .22);
  // pumpjacks (animated in tick)
  MAPS.derrick.jacks = [];
  for (const [x, z, yaw] of [[-16, 15, 0], [16.5, -3, Math.PI / 2]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; WORLD.add(g);
    const P = (w, h, d, px, py, pz, c, parent = g) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    P(4.6, .3, 1.2, 0, .15, 0, 0x55524C);
    P(.25, 2.8, .25, .2, 1.6, -.4, 0x3A5E7A); P(.25, 2.8, .25, .2, 1.6, .4, 0x3A5E7A);
    P(1, 1, 1, -1.6, .8, 0, 0x55524C);
    const beamG = new THREE.Group(); beamG.position.set(.2, 3, 0); g.add(beamG);
    P(4.4, .3, .3, 0, 0, 0, 0x3A5E7A, beamG);
    const head = P(.5, 1.3, .55, 2.3, -.35, 0, 0xD9B23A, beamG);
    P(.9, .9, .4, -2.1, -.2, 0, 0x8A3A24, beamG);
    const rod = P(.05, 2.6, .05, 2.55, -1.6, 0, 0x222222, beamG);
    P(.6, .5, .6, 2.55, .25, 0, 0x55524C);
    MAPS.derrick.jacks.push({ beam: beamG, ph: Math.random() * TAU });
    const c = Math.cos(yaw), s = Math.sin(yaw), hx = Math.abs(c) * 2.4 + Math.abs(s) * .7, hz = Math.abs(s) * 2.4 + Math.abs(c) * .7;
    addBox(x - hx, 0, z - hz, x + hx, 1.5, z + hz, 0, { noMesh: true });
  }

  // ---------- office shack ----------
  {
    const x0 = 10.5, x1 = 17.5, z0 = -18.5, z1 = -13.5, h = 2.8, wc = 0xB4AFA4;
    flat(x0, z0, x1, z1, .05, 0x9A8C76, 'planks');
    wall('x', z1, x0, x1, h, .16, wc, [DOOR(13, 14.2), WIN(15.2, 16.8)], 'corrugated', 0x8A847A);
    wall('x', z0, x0, x1, h, .16, wc, [WIN(11.4, 13), DOOR(15, 16.2)], 'corrugated', 0x8A847A);
    wall('z', x0, z0, z1, h, .16, wc, [WIN(-17.2, -15.2)], 'corrugated', 0x8A847A);
    wall('z', x1, z0, z1, h, .16, wc, [], 'corrugated', 0x8A847A);
    addBox(x0 - .3, h, z0 - .3, x1 + .3, h + .15, z1 + .3, 0x8C8A84, { tex: 'corrugated' });
    addBox(11, 0, -18.2, 12.6, .78, -17.4, 0x7A5A3C); deco(11.5, .78, -18.0, 12.0, 1.1, -17.8, 0x2A2A2A);
    addBox(16.7, 0, -18.3, 17.3, 1.4, -17.1, 0x6E7478);
    addBox(16.4, 0, -15.6, 17.3, 1.9, -14.0, 0x7C8A6E);
    pointLamp(14, 2.5, -16, 0xFFE2B0, .5, 1, 9);
    signPlane('DERRICK 9', 'NO SMOKING \u00B7 HARD HATS', 14, 3.4, -13.38, 3, 1);
  }
  // wrecked truck
  {
    const x = -6, z = -16;
    addBox(x - 2.6, .45, z - 1.05, x + 1.1, 1.25, z + 1.05, 0x6E3E2A);
    addBox(x + 1.1, .45, z - 1.05, x + 2.9, 2.3, z + 1.05, 0x8A4A30);
    deco(x + 2.9, 1.4, z - .9, x + 2.95, 2.1, z + .9, 0x1E2A30);
    deco(x - 2.6, 1.25, z - 1.05, x - 2.4, 1.9, z + 1.05, 0x6E3E2A);
    for (const dz of [-1.05, 1.05]) deco(x - 2.6, 1.25, z + dz - .05, x + 1.1, 1.9, z + dz + .05, 0x6E3E2A);
    addBox(x - 2.6, 0, z - 1.05, x + 2.9, .45, z + 1.05, 0, { noMesh: true });
    for (const [dx, dz] of [[-1.8, -1.05], [-1.8, 1.05], [1.9, -1.05]]) wheel(x + dx, z + dz + Math.sign(dz) * .14, .42, 'z');
    deco(x + 1.5, 0, z + 1, x + 2.3, .35, z + 1.6, 0x1E2124);
  }
  // sandbag walls and crates
  const bags = (x, z, ax, len, h = .9) => {
    const hx = ax === 'x' ? len / 2 : .4, hz = ax === 'x' ? .4 : len / 2;
    addBox(x - hx, 0, z - hz, x + hx, h, z + hz, 0x9C8A64, { noMesh: true });
    for (let lv = 0; lv < 3; lv++) for (let t = -len / 2 + .3; t < len / 2 - .2; t += .55) {
      const o = lv % 2 ? .27 : 0; if (t + o > len / 2 - .25) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(ax === 'x' ? .56 : .76, .3, ax === 'x' ? .76 : .56), mat(lv % 2 ? 0xA8946C : 0x9C8A64));
      m.position.set(ax === 'x' ? x + t + o : x, .15 + lv * .3, ax === 'x' ? z : z + t + o); m.castShadow = true; m.receiveShadow = true; WORLD.add(m);
    }
  };
  bags(5, 8, 'x', 3); bags(-9.5, 3, 'z', 3); bags(9, 4, 'z', 2.4); bags(-3, -10, 'x', 2.4); bags(3.5, 15, 'x', 3); bags(-12, -19, 'x', 2.4);
  crate(-5, 4.6); crate(-5, 4.6, .9, 1.1); crate(-3.9, 4.8);
  crate(5.2, -5.2); crate(6.3, -5.0); crate(5.3, -6.3, 1.1); crate(5.2, -5.2, .9, 1.1);
  crate(19.5, 5, 1.2); crate(20.6, 4.3); crate(-19.5, -18.5, 1.2); crate(-19, 8.5); crate(0, 20, 1.2); crate(1.2, 20.3);
  for (const [x, z, c] of [[11, 8, 0x3E6E8E], [11.6, 8.5, 0x8A3A24], [-11, -8.5, 0x3E6E8E], [-11.6, -8, 0xD9B23A], [19, -14, 0x8A3A24], [-19.5, 19.5, 0x3E6E8E]]) barrel(x, z, c);
  // generator
  addBox(-1.2, 0, -21.5, 2.4, 1.6, -19.8, 0xD9B23A, { tex: 'metal' }); deco(-1.1, 1.6, -21.3, -.5, 2.6, -20.7, 0x3A3A3A);

  // ---------- perimeter fence and the desert beyond ----------
  for (const s of [-1, 1]) {
    addBox(-24.9, 0, s * 24.6 - .06, 24.9, 3, s * 24.6 + .06, 0x9A968C, { tex: 'corrugated' });
    addBox(s * 24.6 - .06, 0, -24.9, s * 24.6 + .06, 3, 24.9, 0x9A968C, { tex: 'corrugated' });
    invisWall(-26, s * 24.6 - .1, 26, s * 24.6 + (s > 0 ? 1 : -1), 12); invisWall(s * 24.6 - .1, -26, s * 24.6 + (s > 0 ? 1 : -1), 26, 12);
    for (let t = -24; t <= 24; t += 4) { deco(t - .07, 0, s * 24.75 - .07, t + .07, 3.3, s * 24.75 + .07, 0x6E6A64); deco(s * 24.75 - .07, 0, t - .07, s * 24.75 + .07, 3.3, t + .07, 0x6E6A64); }
  }
  const dune = mat(0xC9A070);
  for (let i = 0; i < 22; i++) { const a = i / 22 * TAU + rand(-.1, .1), r = rand(70, 140), s = rand(14, 34); const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 6), dune); m.scale.y = rand(.15, .3); m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); WORLD.add(m); }
  for (const [x, z, r, h] of [[-150, -170, 50, 40], [80, -200, 70, 46], [210, 40, 55, 30], [-220, 80, 60, 28]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r * .7, r, h, 7), mat(0xA8714A)); m.position.set(x, h / 2, z); WORLD.add(m); }
  // distant derricks
  for (const [x, z] of [[-60, -40], [70, 30], [-40, 75], [55, -70]]) { for (const [sx, sz] of legs) beam([x + sx * 2, 0, z + sz * 2], [x + sx * .4, 16, z + sz * .4], .25, 0x6A3A24, false); }
}
MAPS.derrick = {
  name: 'Derrick', sub: 'Pump Station 9 \u00B7 Sunset', build: buildDerrick,
  desc: 'An oil field in the desert. Fight around the pipes and tanks, or take the drilling tower and own the middle.',
  bounds: [-24.4, 24.4, -24.4, 24.4], center: [0, 0], coreR: 14, orbit: { r: 38, h: 20, look: 4 },
  upper: { y: DK.y, rects: [[-3.4, 3.4, -3.4, 3.4]] },
  portals: [{ g: [10.3, 0.2], u: [2.3, 0.2], up: [[10.0, 0], [8.9, 0], [3.7, 0], [2.6, 0]] }],
  spawns: { A: [-20, 20, 18.5, 23.5], B: [-20, 20, -23.5, -18.5] },
  lighting: { day: { fog: [0xE0A878, 45, 210], hemi: [0xFFD3A0, 0x8A6A48, .6], amb: .14, sun: [0xFFB070, 1.1, -50, 26, 30], torch: 0 } },
  mini: { bg: '#6b5a3e', draw(x, X, Z, S) { x.fillStyle = '#8a7550'; x.fillRect(X(-24.6), Z(-24.6), 49.2 * S, 49.2 * S); x.strokeStyle = 'rgba(242,154,38,.8)'; x.lineWidth = 2; x.strokeRect(X(-3.5), Z(-3.5), 7 * S, 7 * S); } },
  tick(dt) {
    for (const j of this.jacks || []) { j.ph += dt * 1.6; j.beam.rotation.z = Math.sin(j.ph) * .28; }
  },
};
