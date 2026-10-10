// Blast Radius \u00B7 map: Riptide \u2014 a superyacht taken at sea. Long and narrow: a lounge deck, a sun deck on top, and a helipad at the bow.
'use strict';

const RT = { up: 3.45, bow0: 22, tip: 31.8, half: 6.6 };
const rtHalf = x => x <= RT.bow0 ? RT.half : Math.max(0, RT.half * (RT.tip - x) / (RT.tip - RT.bow0));
function buildRiptide() {
  buildSky(0x3E7EC0, 0xCFE6F5, 0x8FB9D0, { clouds: 10, sun: [-200, 300, 160], sunR: 14 });
  // sea
  const sea = groundPlane(0x2C6E8E, 'water', -2.4, 900);
  sea.material = new THREE.MeshPhongMaterial({ color: 0x2C6E8E, map: getTex('water'), shininess: 60, specular: 0x6A9AB0 });
  MAPS.riptide.sea = sea;
  // islands and a far ship
  for (const [x, z, r, h, c] of [[-180, -220, 60, 38, 0x5E7D4A], [240, -120, 45, 26, 0x6E8A52], [-260, 160, 80, 30, 0x5E7D4A], [120, 260, 40, 22, 0x7A8A5A]]) { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), mat(c)); m.position.set(x, h / 2 - 3, z); WORLD.add(m); const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.15, 3, 9), mat(0xD9C9A0)); b.position.set(x, -2, z); WORLD.add(b); }
  deco(150, -2.4, 70, 210, 6, 84, 0x3A4048, { cast: false }); deco(190, 6, 72, 205, 14, 82, 0xE6E2DA, { cast: false });

  // ---------- hull and deck ----------
  const outline = () => { const s = new THREE.Shape(); s.moveTo(-31, -RT.half); s.lineTo(RT.bow0, -RT.half); s.lineTo(RT.tip, 0); s.lineTo(RT.bow0, RT.half); s.lineTo(-31, RT.half); s.lineTo(-31, -RT.half); return s; };
  const hull = (y0, y1, color) => { const m = new THREE.Mesh(new THREE.ExtrudeGeometry(outline(), { depth: y1 - y0, bevelEnabled: false }), mat(color)); m.rotation.x = -Math.PI / 2; m.position.y = y0; m.castShadow = true; m.receiveShadow = true; WORLD.add(m); return m; };
  hull(-3.6, -1.9, 0x1E2E48); hull(-1.9, -.02, 0xF2F0EA);
  { const m = hull(-1.95, -1.85, 0xC9A227); m.scale.set(1.002, 1.002, 1); }
  const dg = new THREE.ShapeGeometry(outline()), uv = dg.attributes.uv;
  if (uv && uv.setXY) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
  const deck = new THREE.Mesh(dg, mat(0xB8875A, 'planks')); deck.rotation.x = -Math.PI / 2; deck.position.y = .01; deck.receiveShadow = true; WORLD.add(deck);
  // edge: bulwark cap, glass-panel railing, invisible walls
  for (const s of [-1, 1]) {
    deco(-31, 0, s * 6.5 - .1, RT.bow0, .25, s * 6.5 + .1, 0xF2F0EA);
    railing('x', s * 6.45, -31, RT.bow0, 0, 0xC9CED2, { collide: false, glass: true });
    invisWall(-32, s > 0 ? 6.42 : -7.6, RT.bow0, s > 0 ? 7.6 : -6.42, 9);
    // bow: slanted rail and stair-stepped walls
    const a = [RT.bow0, s * 6.45], b = [RT.tip - .4, s * .25];
    for (const y of [.5, 1.0]) beam([a[0], y, a[1]], [b[0], y, b[1]], .07, 0xC9CED2);
    for (let t = 0; t <= 1.001; t += .125) { const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; deco(x - .04, 0, z - .04, x + .04, 1.05, z + .04, 0xC9CED2); }
    for (let xa = RT.bow0; xa < RT.tip; xa += .4) { const zi = Math.max(0, 6.45 * (RT.tip - (xa + .4)) / (RT.tip - RT.bow0) - .05); if (s > 0) invisWall(xa, zi, xa + .4, 8, 9); else invisWall(xa, -8, xa + .4, -zi, 9); }
  }
  invisWall(-31.6, -8, -30.92, 8, 9); invisWall(RT.tip - .5, -8, RT.tip + 2, 8, 9);
  railing('z', -30.95, -6.45, 6.45, 0, 0xC9CED2, { collide: false, glass: true });
  deco(-31.05, 0, -6.6, -30.85, .25, 6.6, 0xF2F0EA);
  // swim platform and flags at the stern
  deco(-33, -1.2, -5, -31, -.95, 5, 0xB8875A, { tex: 'planks' });
  for (const s of [-1, 1]) { cyl(.04, 3.2, -30.7, 1.6, s * 5.8, 0xC9CED2, 6); const f = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .7), new THREE.MeshLambertMaterial({ color: s > 0 ? 0xC9452F : 0x2F5E8A, side: THREE.DoubleSide })); f.position.set(-31.3, 2.9, s * 5.8); WORLD.add(f); }

  // ---------- aft deck ----------
  addBox(-26, 0, -2.5, -22, .7, 2.5, 0xE6E2DA, { tex: 'tile' });
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.6), new THREE.MeshPhongMaterial({ color: 0x3FB4D0, shininess: 90, transparent: true, opacity: .9 })); w.rotation.x = -Math.PI / 2; w.position.set(-24, .71, 0); WORLD.add(w); MAPS.riptide.pool = w; }
  for (const [x, z] of [[-29.4, 4.6], [-27.6, 4.6], [-29.4, -4.6], [-27.6, -4.6], [-20.5, -5.3], [-20.5, 5.3]]) { addBox(x - .4, 0, z - 1, x + .4, .42, z + 1, 0xF2F0EA); deco(x - .38, .42, z - .95, x + .38, .5, z + .95, 0x2F5E8A, { cast: false }); }
  // stairs to the sun deck, either side of the saloon door
  for (const s of [-1, 1]) {
    const c0 = s > 0 ? 1.5 : -2.9, c1 = s > 0 ? 2.9 : -1.5;
    stairs('x', -18.6, -14, c0, c1, RT.up, 0xB8875A, 'planks');
    for (const z of [c0 - .05, c1 + .05]) { beam([-18.6, 1.0, z], [-14, RT.up + 1.0, z], .06, 0xC9CED2); const rb = addBox(-18.6, 0, z - .04, -14, RT.up + 2.4, z + .04, 0, { noMesh: true }); rb.invis = true; rb.noMantle = true; }
  }

  // ---------- saloon (main cabin) ----------
  const X0 = -14, X1 = 12, Z = 4.5, H = 3.2, white = 0xF2F0EA, glassTrim = 0x3A4048;
  const sideOps = [{ a: -12, b: -9.5, lo: 1.0, hi: 2.4 }, DOOR(-7, -5.6), { a: -4, b: -1.5, lo: 1.0, hi: 2.4 }, { a: 1.5, b: 4, lo: 1.0, hi: 2.4 }, { a: 6.5, b: 9, lo: 1.0, hi: 2.4 }];
  for (const s of [-1, 1]) { wall('x', s * Z, X0, X1, H, .2, white, sideOps, 'plaster', glassTrim); for (const o of sideOps) if (o.lo) glassPane('x', s * Z, o.a, o.b, o.lo, o.hi); }
  wall('z', X0, -Z, Z, H, .2, white, [DOOR(-1, 1)], 'plaster', glassTrim);
  wall('z', X1, -Z, Z, H, .2, white, [DOOR(-1, 1), { a: -3.6, b: -1.6, lo: 1, hi: 2.4 }, { a: 1.6, b: 3.6, lo: 1, hi: 2.4 }], 'plaster', glassTrim);
  for (const s of [-1, 1]) glassPane('z', X1, s * 1.6, s * 3.6, 1, 2.4);
  wall('z', 0, -Z, Z, H, .16, 0x8A6A4C, [DOOR(-1, 1), DOOR(-4.05, -2.95)], 'planks', 0x5A4632);
  addBox(X0 - .1, H, -Z - .1, X1 + .1, RT.up, Z + .1, white);
  flat(X0 + .1, -Z + .1, X1 - .1, Z - .1, .03, 0xC8BFB0, 'carpet');
  for (const x of [-10, -4, 4, 9]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2, .5), new THREE.MeshBasicMaterial({ color: 0xFFF3DC })); p.rotation.x = Math.PI / 2; p.position.set(x, H - .01, 0); WORLD.add(p); }
  // lounge
  addBox(-12.6, 0, -4.35, -8.4, .8, -3.6, 0xE8E0D0); deco(-12.6, .8, -4.38, -8.4, 1.15, -4.12, 0xE8E0D0);
  addBox(-12.6, 0, 3.6, -9.6, .8, 4.35, 0xE8E0D0); deco(-12.6, .8, 4.12, -9.6, 1.15, 4.38, 0xE8E0D0);
  addBox(-11.4, 0, -2.6, -9.6, .42, -1.6, 0x3A2E26); deco(-11.5, .42, -2.7, -9.5, .46, -1.5, 0x1E1A16);
  addBox(-5.6, 0, 2.6, -2, 1.1, 3.3, 0x5A4632, { tex: 'planks' }); deco(-5.7, 1.1, 2.55, -1.9, 1.16, 3.4, 0x1E1A16);
  for (const x of [-5, -4, -3]) { cyl(.18, .05, x, .75, 2.1, 0x1E1A16, 10); cyl(.03, .75, x, .37, 2.1, 0xB8BCC0, 6, { cast: false }); }
  deco(-5.6, 0, 4.0, -2, 2.2, 4.38, 0x3A2E26); for (let x = -5.3; x < -2.2; x += .35) deco(x - .05, 1.3, 4.1, x + .05, 1.62, 4.2, [0x5E8A3A, 0x8A3A24, 0xD9B23A][(x * 7 >>> 0) % 3], { cast: false });
  deco(-.1, 1.2, -2.6, -.08, 2.2, -1.2, 0x10141A);
  // dining
  addBox(3, 0, -.85, 8.5, .78, .85, 0x5A4632, { tex: 'planks' });
  for (let x = 3.5; x < 8.4; x += 1.2) for (const s of [-1, 1]) { deco(x - .22, 0, s * 1.3 - .22, x + .22, .48, s * 1.3 + .22, 0xE8E0D0); deco(x - .22, .48, s * 1.5 - .04, x + .22, 1.0, s * 1.5 + .04, 0xE8E0D0); }
  addBox(9, 0, 3.5, 11.8, 1.0, 4.35, 0x6E7478, { tex: 'metal' });
  addBox(9.6, 0, -4.35, 11.6, .9, -3.7, 0x5A4632); bush(10.6, -4.0, .4, 0x4E7A3A, .9);

  // ---------- sun deck (upper) ----------
  const U = RT.up;
  flat(X0, -Z - .1, X1, Z + .1, U + .012, 0xB8875A, 'planks');
  for (const s of [-1, 1]) railing('x', s * (Z + .05), X0, X1, U, 0xC9CED2, { glass: true });
  for (const [a, b] of [[-Z - .1, -2.95], [-1.45, 1.45], [2.95, Z + .1]]) railing('z', X0 - .05, a, b, U, 0xC9CED2, { glass: true });
  // wheelhouse
  {
    const w0 = 4, w1 = 12, wz = 2.8, h = 2.5;
    wall('z', w0, -wz, wz, h, .16, white, [DOOR(-1, 1)], 'plaster', glassTrim, U);
    wall('z', w1, -wz, wz, h, .16, white, [{ a: -2.4, b: 2.4, lo: 1.0, hi: 2.2 }], 'plaster', glassTrim, U);
    for (const s of [-1, 1]) { wall('x', s * wz, w0, w1, h, .16, white, [{ a: 5, b: 7.4, lo: 1.0, hi: 2.2 }, { a: 8.4, b: 11.2, lo: 1.0, hi: 2.2 }], 'plaster', glassTrim, U); glassPane('x', s * wz, 5, 7.4, U + 1, U + 2.2); glassPane('x', s * wz, 8.4, 11.2, U + 1, U + 2.2); }
    glassPane('z', w1, -2.4, 2.4, U + 1, U + 2.2);
    // the front window looks out over the bow; a barrier just outside stops you dropping off the roof
    { const fb = addBox(w1 + .1, U, -2.9, w1 + .26, U + 4, 2.9, 0, { noMesh: true }); fb.invis = true; fb.noMantle = true; }
    addBox(w0 - .3, U + h, -wz - .4, w1 + .4, U + h + .2, wz + .4, white).noMantle = true;
    deco(w0 - .3, U + h - .05, -wz - .42, w1 + .42, U + h + .22, -wz - .38, 0x1E2E48, { cast: false }); deco(w0 - .3, U + h - .05, wz + .38, w1 + .42, U + h + .22, wz + .42, 0x1E2E48, { cast: false });
    addBox(10.6, U, -1.6, 11.6, U + 1.1, 1.6, 0x2A2C2E, { tex: 'metal' }); deco(10.65, U + 1.1, -1.4, 11.2, U + 1.14, 1.4, 0x3FB4D0, { cast: false });
    addBox(9.2, U, -.35, 9.9, U + .55, .35, 0xE8E0D0); deco(9.75, U + .55, -.35, 9.9, U + 1.2, .35, 0xE8E0D0);
    addBox(5, U, 1.4, 6.6, U + .9, 2.5, 0x5A4632, { tex: 'planks' });
    // mast and radar
    cyl(.1, 3, 8, U + h + 1.6, 0, 0xC9CED2, 8); deco(7.2, U + h + 2.4, -.05, 8.8, U + h + 2.5, .05, 0xC9CED2);
    const radar = new THREE.Group(); radar.position.set(8, U + h + 3.2, 0); WORLD.add(radar);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, .16, .22), mat(0xE6E2DA)); radar.add(bar);
    MAPS.riptide.radar = radar;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(.45, 12, 8), mat(0xF2F0EA)); dome.position.set(6, U + h + .6, 1.6); WORLD.add(dome);
  }
  railing('z', X1 + .05, -Z - .1, -2.8, U, 0xC9CED2, { glass: true }); railing('z', X1 + .05, 2.8, Z + .1, U, 0xC9CED2, { glass: true });
  // hot tub, loungers, planters
  cyl(1.4, .7, -9, U + .35, 0, 0xE6E2DA, 20); addBox(-10.2, U, -1.2, -7.8, U + .7, 1.2, 0, { noMesh: true });
  { const w = new THREE.Mesh(new THREE.CircleGeometry(1.25, 20), new THREE.MeshPhongMaterial({ color: 0x3FB4D0, shininess: 90 })); w.rotation.x = -Math.PI / 2; w.position.set(-9, U + .71, 0); WORLD.add(w); }
  for (const [x, z] of [[-3.5, -3.1], [-1.8, -3.1], [-3.5, 3.1], [-1.8, 3.1]]) { addBox(x - .4, U, z - 1, x + .4, U + .42, z + 1, 0xF2F0EA); deco(x - .38, U + .42, z - .95, x + .38, U + .5, z + .95, 0xC9452F, { cast: false }); }
  for (const [x, z] of [[1.5, -1.2], [1.5, 1.2]]) { addBox(x - .5, U, z - .5, x + .5, U + .9, z + .5, 0x8A8478, { tex: 'concrete' }); bush(x, z, .45, 0x4E7A3A, U + .9); }
  // sun canopy frame over the aft sun deck
  for (const [x, z] of [[-13.6, -4.3], [-13.6, 4.3], [-6.5, -4.3], [-6.5, 4.3]]) deco(x - .06, U, z - .06, x + .06, U + 2.9, z + .06, 0xC9CED2);
  { const cv = new THREE.Mesh(new THREE.PlaneGeometry(7.1, 8.6), new THREE.MeshLambertMaterial({ color: 0xF2F0EA, side: THREE.DoubleSide })); cv.rotation.x = -Math.PI / 2; cv.position.set(-10.05, U + 2.9, 0); cv.castShadow = true; WORLD.add(cv); }

  // ---------- side decks: the tenders hanging outboard ----------
  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), mat(0xF2F0EA)); t.scale.set(3, .7, 1.1); t.position.set(-2, 1.6, s * 7.9); t.castShadow = true; WORLD.add(t);
    deco(-4.6, 1.95, s * 7.9 - .8, .6, 2.15, s * 7.9 + .8, 0x2F5E8A);
    for (const x of [-4.2, .2]) { beam([x, 0, s * 6.5], [x, 3.4, s * 7.4], .14, 0xC9CED2); beam([x, 3.4, s * 7.4], [x, 2.1, s * 7.9], .03, 0x222222); }
  }

  // ---------- foredeck: helipad and helicopter ----------
  { const p = new THREE.Mesh(new THREE.CircleGeometry(4, 32), mat(0x3A4048)); p.rotation.x = -Math.PI / 2; p.position.set(20, .02, 0); p.receiveShadow = true; WORLD.add(p);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.8, 32), mat(0xE5B93F)); ring.rotation.x = -Math.PI / 2; ring.position.set(20, .03, 0); WORLD.add(ring);
    flat(19.1, -1.3, 19.4, 1.3, .035, 0xF2F0EA); flat(20.6, -1.3, 20.9, 1.3, .035, 0xF2F0EA); flat(19.4, -.15, 20.6, .15, .035, 0xF2F0EA); }
  {
    const hx = 20.6, hc = 0x1E2E48;
    addBox(hx - 1.9, .45, -.95, hx + 1.9, 2.3, .95, 0, { noMesh: true });
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), mat(hc)); body.scale.set(2.1, .95, .98); body.position.set(hx, 1.35, 0); body.castShadow = true; WORLD.add(body);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, -Math.PI / 2, Math.PI, 0, Math.PI / 2), mat(0x1A242E)); glass.rotation.y = Math.PI; glass.scale.set(1.2, .8, .9); glass.position.set(hx + .9, 1.5, 0); WORLD.add(glass);
    deco(hx - 2, 1.0, -.25, hx - 1.5, 1.7, .25, hc);
    beam([hx - 1.6, 1.55, 0], [hx - 5.3, 1.75, 0], .28, hc); addBox(hx - 5.3, 1.35, -.18, hx - 1.8, 1.95, .18, 0, { noMesh: true });
    deco(hx - 5.6, 1.6, -.04, hx - 5.0, 2.7, .04, hc); const tr = deco(hx - 5.5, 2.0, .05, hx - 5.4, 2.1, .1, 0x222222);
    for (const s of [-1, 1]) { deco(hx - 1.8, 0, s * .9 - .05, hx + 1.8, .08, s * .9 + .05, 0x2A2C2E); for (const dx of [-1, 1]) beam([hx + dx, .08, s * .9], [hx + dx * .8, .6, s * .6], .06, 0x2A2C2E); }
    addBox(hx - 1.8, 0, -.95, hx + 1.8, .45, .95, 0, { noMesh: true });
    cyl(.12, .5, hx, 2.45, 0, 0x2A2C2E, 8);
    for (const a of [.3, .3 + Math.PI / 2, .3 + Math.PI, .3 + Math.PI * 1.5]) { const bl = new THREE.Mesh(new THREE.BoxGeometry(5, .04, .3), mat(0x2A2C2E)); bl.position.set(hx + Math.cos(a) * 2.5, 2.68 - .12, Math.sin(a) * 2.5); bl.rotation.y = -a; bl.castShadow = true; WORLD.add(bl); }
  }
  for (const s of [-1, 1]) { crate(26, s * 1.6, 1.2, 0, 0x8A6A4C); addBox(14, 0, s * 3.4 - .4, 15, 1.0, s * 3.4 + .4, 0xE6E2DA); }
  crate(26, 1.6, .9, 1.2, 0x7A5A3C);
  addBox(28.6, 0, -.5, 29.6, .5, .5, 0x3A3E44, { tex: 'metal' }); deco(29.6, .1, -.08, 31.2, .2, .08, 0x2A2C2E, { cast: false });
  deco(16.5, 0, -.5, 17.5, .1, .5, 0x3A3E44, { cast: false });
}
MAPS.riptide = {
  name: 'Riptide', sub: 'MY Aurelia \u00B7 Open Water', build: buildRiptide,
  desc: 'A superyacht at sea. Long, narrow lanes down the side decks, a saloon full of close fights, and the sun deck above it all.',
  bounds: [-30.4, 31.4, -6.4, 6.4], center: [0, 0], coreR: 16, orbit: { r: 40, h: 18, rz: .7 },
  ground: (x, z) => Math.abs(z) < rtHalf(x) - .55,
  upper: { y: RT.up, rects: [[-14, 12, -4.5, 4.5]] },
  portals: [-1, 1].map(s => ({ g: [-20.3, s * 2.3], u: [-12.7, s * 2.3], up: [[-19.6, s * 2.2], [-18.4, s * 2.2], [-14.3, s * 2.2], [-13.0, s * 2.2]] })),
  spawns: { A: [-30, -25, -6, 6], B: [22, 28, -3, 3] },
  lighting: { day: { fog: [0xBFD9EC, 70, 300], hemi: [0xD8ECFF, 0x5C88A0, .66], amb: .15, sun: [0xFFF2DC, 1.0, -30, 55, 25], torch: 0 } },
  mini: {
    bg: '#1f4d66', draw(x, X, Z, S) {
      x.fillStyle = '#8f8670'; x.beginPath(); x.moveTo(X(-31), Z(-6.6)); x.lineTo(X(RT.bow0), Z(-6.6)); x.lineTo(X(RT.tip), Z(0)); x.lineTo(X(RT.bow0), Z(6.6)); x.lineTo(X(-31), Z(6.6)); x.closePath(); x.fill();
      x.fillStyle = 'rgba(242,240,234,.25)'; x.fillRect(X(-14), Z(-4.6), 26 * S, 9.2 * S);
    },
  },
  tick(dt) {
    const t = getTex('water'); t.offset.x = (t.offset.x + dt * .012) % 1; t.offset.y = (t.offset.y + dt * .006) % 1;
    if (this.radar) this.radar.rotation.y += dt * 2.2;
    if (this.sea) this.sea.position.y = -2.4 + Math.sin(nowMs() / 1400) * .08;
  },
};
