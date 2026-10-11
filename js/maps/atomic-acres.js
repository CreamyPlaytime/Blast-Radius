// Blast Radius \u00B7 map: Atomic Acres
'use strict';

// second storey layout shared by the map builder and the bot navigation
const UP = { y: 3.45, top: 6.4, holeX0: 18.6, holeX1: 23.35, holeZ0: -7.95, holeZ1: -6.55, stairTop: 18.68, stairBot: 23.3, steps: 14, sz0: -7.9, sz1: -6.6 };

function buildHouse(s, wallC, roofC, trimC, accent) {
  const H = 3.2, Y2 = UP.y, H2 = UP.top - UP.y, x0 = s * 18, x1 = s * 30, xm = s * 24, X = v => s * v;
  const lo = (a, b) => Math.min(a, b), hi = (a, b) => Math.max(a, b);
  // ---------- ground floor ----------
  flat(x0, -8, xm, 8, .06, 0xB08458, 'planks');
  flat(xm, -8, x1, 0, .06, 0xE6DFCF, 'tile');
  flat(xm, 0, x1, 8, .06, 0xA77B52, 'planks');
  flat(X(19.5), 3.6, X(22.6), 6.6, .085, accent, 'rug');
  wall('z', x0, -8.15, 8.15, H, .3, wallC, [DOOR(-1.1, 1.1), WIN(-6.2, -3.6), WIN(3.6, 6.2)], 'siding', trimC);
  wall('z', x1, -8.15, 8.15, H, .3, wallC, [DOOR(-4.5, -2.6), WIN(2.6, 5.4)], 'siding', trimC);
  wall('x', -8, x0, x1, H, .3, wallC, [WIN(X(26.6), X(28.8))], 'siding', trimC);
  wall('x', 8, x0, x1, H, .3, wallC, [WIN(X(20.5), X(22.8)), DOOR(X(27), X(28.6))], 'siding', trimC);
  wall('z', xm, -7.85, 7.85, H, .2, 0xEFE7D6, [DOOR(-5.6, -3.8), DOOR(2, 3.8)], 'plaster', trimC);
  wall('x', 0, xm, x1, H, .2, 0xEFE7D6, [DOOR(X(25.8), X(27.4))], 'plaster', trimC);
  deco(X(18.17), 0, 1.15, X(19.05), 2.25, 1.2, 0x8C5A3A);
  deco(X(29.83), 0, -2.55, X(28.95), 2.25, -2.5, 0x8C5A3A);
  deco(X(28.65), 0, 7.83, X(28.7), 2.25, 6.95, 0x8C5A3A);
  // porch
  addBox(X(16.3), 0, -2.2, X(17.85), .24, 2.2, 0xC9C1AE, { tex: 'concrete' });
  addBox(X(16.45), 0, -2.1, X(16.65), 2.6, -1.9, trimC);
  addBox(X(16.45), 0, 1.9, X(16.65), 2.6, 2.1, trimC);
  addBox(X(16.2), 2.6, -2.5, X(17.85), 2.75, 2.5, roofC, { tex: 'shingle' }); // porch roof: solid, you can drop onto it from the window above
  // ---------- staircase: along the side wall, climbing toward the street ----------
  const rise = UP.y / UP.steps, run = (UP.stairBot - UP.stairTop) / UP.steps;
  for (let k = 0; k < UP.steps; k++) {
    const a = UP.stairBot - (k + 1) * run, b = UP.stairBot - k * run, top = (k + 1) * rise;
    addBox(X(a), 0, UP.sz0, X(b), top - .04, UP.sz1, 0xD9CBB0, { tex: 'plaster' });
    addBox(X(a - .02), top - .04, UP.sz0, X(b), top, UP.sz1 + .02, 0x8C5A3A);
  }
  // handrail on the open side + balusters
  beam([X(UP.stairBot), 1.0, UP.sz1 + .03], [X(UP.stairTop + .4), UP.y + .95, UP.sz1 + .03], .06, 0x6B4A30);
  for (let k = 1; k < UP.steps; k += 2) { const xx = UP.stairBot - (k + .5) * run; deco(X(xx) - .02, (k + 1) * rise, UP.sz1 + .01, X(xx) + .02, (k + 1) * rise + .95 + .01 * k, UP.sz1 + .05, 0xF1E9D6); }
  // ---------- floor between storeys, with the stairwell cut out ----------
  const slab = (ax, az, bx, bz) => {
    if (Math.abs(bx - ax) < .01 || Math.abs(bz - az) < .01) return;
    addBox(X(ax), H, az, X(bx), Y2, bz, 0xF1EBDD, { tex: 'plaster' });
    flat(X(lo(ax, bx)) , lo(az, bz), X(hi(ax, bx)), hi(az, bz), Y2 + .012, 0xA9805A, 'planks');
  };
  slab(17.75, -8.3, UP.holeX0, 8.3);
  slab(UP.holeX1, -8.3, 30.25, 8.3);
  slab(UP.holeX0, UP.holeZ1, UP.holeX1, 8.3);
  slab(UP.holeX0, -8.3, UP.holeX1, UP.holeZ0);
  deco(X(17.72), H - .02, -8.32, X(17.85), Y2 + .05, 8.32, trimC, { cast: false });
  // railing around the stairwell upstairs (the top end stays open)
  addBox(X(19.6), Y2, UP.holeZ1 - .05, X(UP.holeX1), Y2 + 1.0, UP.holeZ1 + .05, 0x6B4A30, { noMesh: true });
  addBox(X(UP.holeX1 - .05), Y2, UP.holeZ0, X(UP.holeX1 + .05), Y2 + 1.0, UP.holeZ1, 0x6B4A30, { noMesh: true });
  deco(X(19.6), Y2 + .92, UP.holeZ1 - .04, X(UP.holeX1), Y2 + 1.0, UP.holeZ1 + .04, 0x6B4A30);
  for (let xx = 19.7; xx < UP.holeX1; xx += .28) deco(X(xx) - .02, Y2, UP.holeZ1 - .02, X(xx) + .02, Y2 + .92, UP.holeZ1 + .02, 0xF1E9D6);
  deco(X(19.55), Y2, UP.holeZ1 - .06, X(19.65), Y2 + 1.1, UP.holeZ1 + .06, 0x6B4A30);
  // ---------- upstairs ----------
  // front wall: two wide sniper windows looking across the street
  wall('z', x0, -8.15, 8.15, H2, .3, wallC, [WIN(-6.6, -3.2), WIN(-1.0, 1.0), WIN(3.2, 6.6)], 'siding', trimC, Y2);
  wall('z', x1, -8.15, 8.15, H2, .3, wallC, [WIN(-1.6, 1.6), DOOR(4.2, 5.8)], 'siding', trimC, Y2);
  // ---------- back deck: an outside staircase up the back wall to a porch and a door into the upstairs bedroom ----------
  {
    const wood = 0x9C7350, dark = 0x6B4A30, n = UP.steps, rise = Y2 / n, run = .33, zb = 3.37 - n * run, sx0 = 30.2, sx1 = 31.4;
    for (let k = 0; k < n; k++) {
      const top = (k + 1) * rise, za = zb + k * run, zz = za + run;
      // thin treads, so the ground-floor window behind them stays clear
      addBox(X(sx0), Math.max(0, top - .2), za, X(sx1), top, zz, wood, { tex: 'planks' });
      // where a step is too low to stand under, the space beneath it is solid (invisible, shoot-through), so you slide
      // along it instead of wedging your head under the tread; higher up there's room and you walk underneath freely
      // rail: a per-step guard above each tread keeps you on the stairs, leaving the space below it open
      { const rb = addBox(X(sx1), top, za, X(sx1 + .1), top + 1.1, zz, 0, { noMesh: true }); rb.ghost = true; rb.noMantle = true; }
      if (top - .2 > .05 && top - .2 < 1.95) { const ub = addBox(X(sx0), 0, za, X(sx1), top - .2, zz, 0, { noMesh: true }); ub.ghost = true; ub.noMantle = true; }
    }
    for (const sx of [sx0 - .01, sx1 + .01]) beam([X(sx), 0, zb], [X(sx), Y2, 3.37], .07, dark);                     // stringers
    beam([X(sx1 + .02), 1.0, zb], [X(sx1 + .02), Y2 + 1.0, 3.37], .05, dark);                                          // handrail
    for (let k = 1; k < n; k += 2) { const zz = zb + (k + .5) * run, y = (k + 1) * rise, railY = 1.0 + Y2 * (zz - zb) / (n * run); deco(X(sx1 - .01), y, zz - .02, X(sx1 + .05), railY - .03, zz + .02, 0xF1E9D6); }   // balusters stop under the handrail
    // the deck itself, its posts and railing
    addBox(X(30.15), Y2 - .18, 3.37, X(32.35), Y2, 7.45, wood, { tex: 'planks' });
    for (const [px, pz] of [[32.2, 3.5], [32.2, 7.3], [30.3, 7.3]]) addBox(X(px - .09), 0, pz - .09, X(px + .09), Y2 - .18, pz + .09, dark);
    deco(X(32.27), Y2 + .92, 3.37, X(32.35), Y2 + 1.0, 7.45, dark); deco(X(30.15), Y2 + .92, 7.37, X(32.35), Y2 + 1.0, 7.45, dark);
    for (let z = 3.55; z < 7.4; z += .3) deco(X(32.29), Y2, z - .02, X(32.33), Y2 + .92, z + .02, 0xF1E9D6);
    for (let x = 30.4; x < 32.3; x += .3) deco(X(x - .02), Y2, 7.39, X(x + .02), Y2 + .92, 7.43, 0xF1E9D6);
    // the deck's open sides: the stair top on the inside, a short rail on the outside beyond the stairs
    deco(X(sx1 + .1), Y2 + .92, 3.37, X(32.35), Y2 + 1.0, 3.45, dark);
    for (let x = sx1 + .25; x < 32.3; x += .3) deco(X(x - .02), Y2, 3.39, X(x + .02), Y2 + .92, 3.43, 0xF1E9D6);
    for (const [a0, z0, a1, z1] of [[32.27, 3.37, 32.37, 7.45], [30.15, 7.37, 32.37, 7.47], [sx1 + .1, 3.35, 32.37, 3.45]]) { const rb = addBox(X(a0), Y2, z0, X(a1), Y2 + 1.0, z1, 0, { noMesh: true }); rb.ghost = true; }
    deco(X(30.16), Y2 + 2.3, 4.0, X(30.6), Y2 + 2.45, 6.0, roofC, { tex: 'shingle' });                               // little awning over the door
  }
  wall('x', -8, x0, x1, H2, .3, wallC, [WIN(X(26.2), X(28.6))], 'siding', trimC, Y2);
  wall('x', 8, x0, x1, H2, .3, wallC, [WIN(X(20.0), X(22.4)), WIN(X(26.2), X(28.6))], 'siding', trimC, Y2);
  wall('z', xm, -7.85, 7.85, H2, .2, 0xE8E0CC, [DOOR(-6.0, -3.9), DOOR(1.7, 3.8)], 'plaster', trimC, Y2);
  addBox(X(17.75), UP.top, -8.3, X(30.25), UP.top + .25, 8.3, 0xF1EBDD, { tex: 'plaster' });
  // upstairs furniture: cover by the front windows, a bedroom at the back
  addBox(X(19.0), Y2, 1.6, X(19.9), Y2 + .75, 2.6, 0x9C8458, { tex: 'crate' });
  addBox(X(19.0), Y2, -2.6, X(19.9), Y2 + .75, -1.6, 0x7F8C5E, { tex: 'crate' });
  addBox(X(22.4), Y2, 6.2, X(23.8), Y2 + .45, 7.85, 0xD9D2C2);
  deco(X(22.5), Y2 + .45, 6.3, X(23.7), Y2 + .55, 7.75, accent);
  addBox(X(25.0), Y2, 4.6, X(27.0), Y2 + .55, 7.85, 0xC9B7D6);
  addBox(X(24.8), Y2, 4.6, X(25.0), Y2 + 1.1, 7.85, 0x6B4A30);
  addBox(X(29.2), Y2, -6.0, X(29.8), Y2 + 1.3, -4.0, 0x8C6448);
  addBox(X(26.0), Y2, -7.8, X(28.2), Y2 + .8, -7.2, 0x5C4632);
  deco(X(26.4), Y2 + 1.4, -7.87, X(27.8), Y2 + 2.2, -7.84, 0x6F8A9C, { cast: false });
  // ---------- roof ----------
  const RB = UP.top + .25, rr = 2.1, half = 6.6, len = 17.6, ang = Math.atan2(rr, half), sl = Math.hypot(rr, half);
  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(boxGeo(sl + .4, .22, len, TEXDEF.shingle.scale), mat(roofC, 'shingle'));
    m.position.set(xm + side * half / 2, RB + rr / 2, 0);
    m.rotation.z = side < 0 ? ang : -ang;
    m.castShadow = true; m.receiveShadow = true; WORLD.add(m);
  }
  // roof collision: invisible stepped boxes that follow each slope (small steps so you can walk up and down it)
  { const nSt = 14, reach = half + .2, lift = .11 / Math.cos(ang);
    for (const side of [-1, 1]) for (let k = 0; k < nSt; k++) {
      const d0 = reach * k / nSt, d1 = reach * (k + 1) / nSt, dm = (d0 + d1) / 2;
      const yTop = RB + rr * (1 - dm / half) + lift;
      addBox(xm + side * d0, UP.top, -len / 2, xm + side * d1, yTop, len / 2, 0, { noMesh: true });
    } }
  const shape = new THREE.Shape(); shape.moveTo(-half, 0); shape.lineTo(half, 0); shape.lineTo(0, rr); shape.lineTo(-half, 0);
  for (const z of [-8.3, 8.3]) {
    const g = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshLambertMaterial({ color: wallC, side: THREE.DoubleSide }));
    g.position.set(xm, RB, z); WORLD.add(g);
  }
  addBox(X(26.4), RB + .6, -4.6, X(27.4), RB + 3.1, -3.6, 0x9A5B45, { tex: 'block' });   // chimney is solid too
  deco(X(17.6), RB - .2, -8.4, X(17.75), RB - .05, 8.4, trimC, { cast: false });
  for (const z of [-4.9, 4.9]) { deco(x0 - s * .36, .72, z - 1.2, x0 - s * .17, .92, z + 1.2, trimC); for (let k = -2; k <= 2; k++) bush(x0 - s * .25, z + k * .45, .16, k % 2 ? 0xD8644A : 0xE7C35A); }
  // ---------- living room ----------
  addBox(X(19.4), 0, 6.95, X(22.4), .5, 7.8, accent);
  addBox(X(19.4), .5, 7.5, X(22.4), .95, 7.8, accent);
  deco(X(19.25), 0, 6.9, X(19.45), .7, 7.85, accent); deco(X(22.35), 0, 6.9, X(22.55), .7, 7.85, accent);
  addBox(X(20.2), 0, 4.5, X(21.6), .42, 5.5, 0x6B4A30);
  addBox(X(23.35), 0, 4.4, X(23.85), .55, 6.4, 0x5C4632);
  deco(X(23.45), .55, 4.7, X(23.75), 1.25, 6.1, 0x2A2C2E); deco(X(23.44), .63, 4.8, X(23.45), 1.17, 6.0, 0x5F7F86, { cast: false });
  addBox(X(18.6), 0, -5.2, X(19.6), .9, -4.2, 0x8F6B4F);
  addBox(X(23.3), 0, -1.4, X(23.85), 1.9, 1.0, 0x5C4632);
  for (let k = 0; k < 3; k++) deco(X(23.28), .45 + k * .55, -1.3, X(23.32), .75 + k * .55, .9, [0xB4483A, 0x2F6E9E, 0xE7C35A][k], { cast: false });
  cyl(.03, 1.6, X(18.8), .8, 6.4, 0x333333, 6); cyl(.22, .35, X(18.8), 1.7, 6.4, 0xF2E3C2, 10, { r2: .3 });
  // ---------- kitchen ----------
  addBox(X(25.6), 0, -7.85, X(29.75), .95, -7.2, 0xF2EFE6);
  deco(X(25.6), .95, -7.9, X(29.75), 1.0, -7.15, 0x7C8C8E);
  for (let k = 0; k < 4; k++) deco(X(25.75 + k * 1.02), .2, -7.19, X(26.67 + k * 1.02), .85, -7.17, 0xE4DFD2, { cast: false });
  addBox(X(29.05), 0, -7.15, X(29.8), 2.0, -6.1, 0xD6E6E1);
  deco(X(29.03), 1.25, -7.0, X(29.05), 1.32, -6.6, 0x8A8F94, { cast: false });
  // table on legs, chairs that face it
  addBox(X(26.9), 0, -5.0, X(28.2), .76, -3.8, 0xC8A27A, { noMesh: true });
  deco(X(26.85), .7, -5.05, X(28.25), .76, -3.75, 0xC8A27A);
  for (const [lx, lz] of [[26.95, -4.95], [28.1, -4.95], [26.95, -3.9], [28.1, -3.9]]) deco(X(lx), 0, lz, X(lx + .06), .7, lz + .06, 0x8C6448);
  for (const [cx, side] of [[26.5, -1], [28.6, 1]]) {
    const cz = -4.4;
    addBox(X(cx - .22), 0, cz - .22, X(cx + .22), .95, cz + .22, 0xB4483A, { noMesh: true });
    deco(X(cx - .21), .42, cz - .21, X(cx + .21), .47, cz + .21, 0xB4483A);
    for (const [ox, oz] of [[-.19, -.19], [.15, -.19], [-.19, .15], [.15, .15]]) deco(X(cx + ox), 0, cz + oz, X(cx + ox + .04), .42, cz + oz + .04, 0x5C3A2A);
    const bx = cx + side * .19;
    deco(X(bx - .02), .47, cz - .2, X(bx + .02), .98, cz + .2, 0xB4483A);
  }
  // ---------- bedroom ----------
  addBox(X(24.3), 0, 5.6, X(26.3), .55, 7.85, 0xC9B7D6);
  addBox(X(24.12), 0, 5.6, X(24.3), 1.1, 7.85, 0x6B4A30);
  deco(X(24.4), .55, 6.3, X(25.0), .68, 7.7, 0xF4F0E6);
  addBox(X(29.2), 0, .3, X(29.8), 1.1, 1.9, 0x8C6448);
  addBox(X(24.2), 0, 4.95, X(24.7), .55, 5.45, 0x6B4A30);
  // ---------- front yard ----------
  addBox(X(15.0), 0, 2.5, X(15.2), 1.1, 2.7, 0x333333);
  deco(X(14.85), 1.1, 2.35, X(15.35), 1.4, 2.85, s < 0 ? 0x2F6E9E : 0xB84A2E);
  picketFence('z', X(14.4), -10, -1.9);
  picketFence('z', X(14.4), 1.9, 10);
  bush(X(17.3), -7.2, .7); bush(X(17.3), 7.2, .7); bush(X(17.2), -2.9, .45); bush(X(17.2), 2.9, .45);
  const lamp = new THREE.PointLight(0xFFE3B0, .55, 13, 2); lamp.position.set(X(24), 2.9, 0); WORLD.add(lamp);
  const lamp2 = new THREE.PointLight(0xFFE3B0, .5, 12, 2); lamp2.position.set(X(22), UP.top - .3, 0); WORLD.add(lamp2);
  LAMPS.push({ light: lamp, day: .55, night: .9 }, { light: lamp2, day: .5, night: .8 });
}

function buildAtomicAcres() {
  const skyGeo = new THREE.SphereGeometry(420, 24, 16);
  const cols = []; const top = new THREE.Color(0x5F8FB0), hor = new THREE.Color(0xEFCFA0), tmp = new THREE.Color();
  const pos = skyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 420; tmp.copy(hor).lerp(top, clamp(y * 1.6, 0, 1)); cols.push(tmp.r, tmp.g, tmp.b); }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  SKY.day = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })); WORLD.add(SKY.day);
  // night sky: deep blue gradient, stars and a moon
  const ng = new THREE.SphereGeometry(415, 24, 16), nc = [], ntop = new THREE.Color(0x05080F), nhor = new THREE.Color(0x1B2A3D);
  const np = ng.attributes.position;
  for (let i = 0; i < np.count; i++) { const y = np.getY(i) / 415; tmp.copy(nhor).lerp(ntop, clamp(y * 2.2, 0, 1)); nc.push(tmp.r, tmp.g, tmp.b); }
  ng.setAttribute('color', new THREE.Float32BufferAttribute(nc, 3));
  SKY.night = new THREE.Group();
  SKY.night.add(new THREE.Mesh(ng, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
  const sp = [];
  for (let i = 0; i < 900; i++) { const u = Math.random() * TAU, v = Math.random() * .45 + .06; sp.push(Math.cos(u) * Math.cos(v) * 400, Math.sin(v) * 400, Math.sin(u) * Math.cos(v) * 400); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  SKY.night.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xDDE6FF, size: 1.6, sizeAttenuation: false, fog: false })));
  const moon = new THREE.Mesh(new THREE.CircleGeometry(16, 32), new THREE.MeshBasicMaterial({ color: 0xE8EEFF, fog: false }));
  moon.position.set(180, 230, -260); moon.lookAt(0, 0, 0); SKY.night.add(moon);
  SKY.night.visible = false; WORLD.add(SKY.night);

  const groundGeo = new THREE.PlaneGeometry(600, 600);
  const guv = groundGeo.attributes && groundGeo.attributes.uv;
  if (guv && guv.setXY) for (let i = 0; i < guv.count; i++) guv.setXY(i, guv.getX(i) * 100, guv.getY(i) * 100);
  const ground = new THREE.Mesh(groundGeo, mat(0xCDB38A, 'dirt'));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; WORLD.add(ground);
  flat(-38, -26, -14, 26, .02, 0x8EA45C, 'grass');
  flat(14, -26, 38, 26, .02, 0x96A35A, 'grass');
  const ring = new THREE.Mesh(new THREE.RingGeometry(12.4, 13.8, 56), mat(0xC4BCAA, 'concrete')); ring.rotation.x = -Math.PI / 2; ring.position.y = .03; ring.receiveShadow = true; WORLD.add(ring);
  const curb = new THREE.Mesh(new THREE.RingGeometry(12.3, 12.45, 56), mat(0xE2DCCB)); curb.rotation.x = -Math.PI / 2; curb.position.y = .045; WORLD.add(curb);
  const circ = new THREE.Mesh(new THREE.CircleGeometry(12.3, 56), mat(0x3D4146, 'asphalt')); circ.rotation.x = -Math.PI / 2; circ.position.y = .04; circ.receiveShadow = true; WORLD.add(circ);
  flat(-4.5, -26, 4.5, -12.2, .036, 0x3D4146, 'asphalt');
  flat(-.12, -26, .12, -13, .05, 0xE5B93F);
  for (let k = 0; k < 6; k++) flat(-4 + k * 1.5, -17.6, -3.4 + k * 1.5, -16.2, .052, 0xEDE7D8);
  const man = new THREE.Mesh(new THREE.CircleGeometry(.45, 16), mat(0x2A2D30)); man.rotation.x = -Math.PI / 2; man.position.set(-5, .05, 3); WORLD.add(man);
  flat(-16.3, -1.4, -12.6, 1.4, .05, 0xC4BCAA, 'concrete');
  flat(12.6, -1.4, 16.3, 1.4, .05, 0xC4BCAA, 'concrete');

  const WC = 0xA99C86;
  addBox(-38.6, 0, -26.6, 38.6, 2.8, -26, WC, { tex: 'block' });
  addBox(-38.6, 0, 26, 38.6, 2.8, 26.6, WC, { tex: 'block' });
  addBox(-38.6, 0, -26, -38, 2.8, 26, WC, { tex: 'block' });
  addBox(38, 0, -26, 38.6, 2.8, 26, WC, { tex: 'block' });
  // out-of-bounds: tall invisible walls over the outer block wall and a metre beyond it, so nobody can stand on the
  // perimeter or clear it by jumping off the sheds and houses. The sheds themselves stay open to climb and stand on.
  const OOB_H = 40;
  invisWall(-39.6, -27.6, 39.6, -26, OOB_H); invisWall(-39.6, 26, 39.6, 27.6, OOB_H);
  invisWall(-39.6, -26, -38, 26, OOB_H); invisWall(38, -26, 39.6, 26, OOB_H);
  for (let x = -36; x <= 36; x += 6) { deco(x - .3, 0, -26.7, x + .3, 3.05, -25.85, 0x8E826D, { tex: 'block' }); deco(x - .3, 0, 25.85, x + .3, 3.05, 26.7, 0x8E826D, { tex: 'block' }); }
  signPlane('ATOMIC ACRES', 'TEST SITE 7 \u00B7 AREA 4 \u00B7 POP. 0', 9, 1.75, -25.95, 5.2, 1.6);
  signPlane('CIVIL DEFENSE', 'SHELTER IN PLACE WHEN SIRENS SOUND', -12, 1.75, 25.95, 5.2, 1.6, Math.PI);

  buildHouse(-1, 0x9CCBC0, 0x7A4E3B, 0xF1E9D6, 0xD8644A);
  buildHouse(1, 0xEAC97A, 0x56687A, 0xF4EEDF, 0x4F7FA8);

  // delivery truck: cab-over front with a rounded nose, glass, lights and a roll-door box
  addBox(.4, 0, -11.85, 2.9, 2.35, -9.25, 0x3C8C88, { noMesh: true });
  deco(.42, .4, -11.45, 2.88, 1.3, -9.25, 0x3C8C88);                       // lower cab
  deco(.42, .4, -11.72, 2.88, 1.05, -11.45, 0x3C8C88);                     // nose
  cyl(.25, 2.46, 1.65, 1.05, -11.45, 0x3C8C88, 14, { rotZ: Math.PI / 2 }); // rounded nose edge
  deco(.45, 1.3, -11.3, 2.85, 2.3, -9.25, 0x3C8C88);                       // upper cab
  deco(.5, 2.3, -11.25, 2.8, 2.38, -9.25, 0x347A77);                       // roof
  deco(.58, 1.42, -11.32, 2.72, 2.2, -11.29, 0x1F2B30, { cast: false });   // windshield
  deco(1.62, 1.42, -11.335, 1.68, 2.2, -11.3, 0x3C8C88, { cast: false });  // centre pillar
  deco(.43, 1.45, -11.1, .45, 2.15, -9.9, 0x1F2B30, { cast: false }); deco(2.85, 1.45, -11.1, 2.87, 2.15, -9.9, 0x1F2B30, { cast: false });
  deco(.41, .45, -10.5, .43, 1.25, -9.4, 0x347A77, { cast: false }); deco(2.87, .45, -10.5, 2.89, 1.25, -9.4, 0x347A77, { cast: false });
  deco(.85, .55, -11.75, 2.45, .98, -11.71, 0x1C1F22, { cast: false });   // grille
  for (let k = 0; k < 4; k++) deco(.87, .59 + k * .1, -11.77, 2.43, .62 + k * .1, -11.72, 0xB8B8B0, { cast: false });
  for (const hx of [.62, 2.68]) { const hl = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .05, 14), new THREE.MeshBasicMaterial({ color: 0xFFF2CC })); hl.rotation.x = Math.PI / 2; hl.position.set(hx, .78, -11.74); WORLD.add(hl); }
  deco(.32, .28, -11.92, 2.98, .5, -11.7, 0xB8B8B0);                      // bumper
  for (const sx of [-1, 1]) {                                               // mirrors
    const mx = sx < 0 ? .42 : 2.88;
    beam([mx, 1.9, -11.15], [mx + sx * .28, 1.9, -11.15], .04, 0x1C1F22);
    deco(mx + sx * .26 - .03, 1.62, -11.2, mx + sx * .26 + .03, 2.0, -11.08, 0x1C1F22);
  }
  addBox(.2, .35, -9.25, 3.1, 3.1, -1.9, 0xEDE4CF);
  deco(.18, 1.5, -9.0, .2, 2.1, -2.2, 0xD9643F); deco(3.1, 1.5, -9.0, 3.12, 2.1, -2.2, 0xD9643F);
  deco(.18, 1.1, -9.0, .2, 1.3, -2.2, 0x3C8C88); deco(3.1, 1.1, -9.0, 3.12, 1.3, -2.2, 0x3C8C88);
  for (const zz of [-9.2, -1.95]) { deco(.15, .35, zz - .05, .25, 3.15, zz + .05, 0xC9C1AE); deco(3.05, .35, zz - .05, 3.15, 3.15, zz + .05, 0xC9C1AE); }
  deco(.15, 3.08, -9.3, 3.15, 3.16, -1.85, 0xC9C1AE);
  for (let k = 0; k < 9; k++) deco(.35, .55 + k * .28, -1.89, 2.95, .58 + k * .28, -1.87, 0xB9B0A0, { cast: false });
  deco(1.4, .5, -1.86, 1.9, .6, -1.82, 0x555555);
  deco(.2, .12, -2.0, 3.1, .35, -1.6, 0x2A2A2A);
  wheel(.4, -10.6, .42); wheel(2.9, -10.6, .42); wheel(.3, -3.2, .42); wheel(3.0, -3.2, .42);
  // sedans
  addBox(-8.4, .25, 4.6, -3.8, 1.05, 6.6, 0xD8644A); addBox(-7.3, 1.05, 4.75, -4.9, 1.55, 6.45, 0xEFE6D2);
  deco(-7.25, 1.1, 4.72, -4.95, 1.5, 4.74, 0x253238); deco(-7.25, 1.1, 6.46, -4.95, 1.5, 6.48, 0x253238);
  deco(-8.45, .5, 4.7, -8.4, .8, 6.5, 0xC9C9C2); deco(-3.8, .5, 4.7, -3.75, .8, 6.5, 0xC9C9C2);
  wheel(-7.6, 4.5, .34, 'z'); wheel(-4.6, 4.5, .34, 'z'); wheel(-7.6, 6.7, .34, 'z'); wheel(-4.6, 6.7, .34, 'z');
  addBox(6.5, .25, 1.5, 8.5, 1.05, 6.1, 0x8FC7B5); addBox(6.65, 1.05, 2.6, 8.35, 1.55, 5.0, 0xEFE6D2);
  deco(6.63, 1.1, 2.65, 6.65, 1.5, 4.95, 0x253238); deco(8.35, 1.1, 2.65, 8.37, 1.5, 4.95, 0x253238);
  wheel(6.4, 2.3, .34); wheel(8.6, 2.3, .34); wheel(6.4, 5.3, .34); wheel(8.6, 5.3, .34);
  // concrete barriers
  for (const b of [[-10.8, -5.4, -10.2, -2.6], [10.2, 2.6, 10.8, 5.4], [-4.4, 13.4, -1.6, 14.0], [2.2, -15.3, 5.0, -14.7], [-9, -15.5, -6.2, -14.9]]) {
    addBox(b[0], 0, b[1], b[2], .45, b[3], 0xB7B0A2, { tex: 'concrete' });
    const cx = (b[0] + b[2]) / 2, cz = (b[1] + b[3]) / 2, wx = (b[2] - b[0]) / 2, wz = (b[3] - b[1]) / 2;
    addBox(cx - Math.max(wx - .1, .18), .45, cz - Math.max(wz - .1, .18), cx + Math.max(wx - .1, .18), 1.0, cz + Math.max(wz - .1, .18), 0xB7B0A2, { tex: 'concrete' });
  }
  // south lot
  addBox(-6.3, 0, 17.8, -3.7, 2.4, 20.4, 0x9C8458, { tex: 'crate' });
  addBox(-5.9, 2.4, 18.2, -4.1, 3.6, 20.0, 0xA8925F, { tex: 'crate' });
  addBox(3.3, 0, 19.2, 5.9, 2.4, 21.8, 0x7F8C5E, { tex: 'crate' });
  addBox(-.6, 0, 22.6, 1.6, 1.2, 24.2, 0xA8925F, { tex: 'crate' });
  addBox(8.5, 0, 15.5, 10.2, 1.2, 17.2, 0x9C8458, { tex: 'crate' });
  addBox(-10.4, 0, 21.4, -8.6, 1.2, 23.2, 0x7F8C5E, { tex: 'crate' });
  // swing set: A-frames, a top bar, chains and seats
  for (const x of [11, 14.4]) {
    addBox(x - .09, 0, 19.95, x + .09, 1.2, 20.15, 0xB4483A, { noMesh: true }); addBox(x - .09, 0, 21.85, x + .09, 1.2, 22.05, 0xB4483A, { noMesh: true });
    beam([x, 0, 20.05], [x, 2.55, 21], .1, 0xB4483A); beam([x, 0, 21.95], [x, 2.55, 21], .1, 0xB4483A);
    beam([x, 1.0, 20.42], [x, 1.0, 21.58], .06, 0xB4483A);
  }
  cyl(.06, 3.7, 12.7, 2.58, 21, 0xB4483A, 10, { rotZ: Math.PI / 2 });
  for (const [x, c] of [[12.0, 0x2F6E9E], [13.4, 0xE7C35A]]) {
    // chains hang from the top bar (which runs along x) down to each end of the seat
    for (const dx of [-.21, .21]) beam([x + dx, 2.55, 21], [x + dx, .58, 21], .025, 0x4A4A4A, false);
    deco(x - .24, .52, 20.8, x + .24, .58, 21.2, c);
  }
  for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
    addBox(x - .12, 0, z - .12, x + .12, 5, z + .12, 0x4C5054);
    deco(x - .5, 5, z - .2, x + .5, 5.2, z + .2, 0x4C5054);
    deco(x - .3, 4.85, z - .15, x + .3, 5.0, z + .15, 0xFFF1C4, { cast: false });
    const sl = new THREE.PointLight(0xFFCF8A, 0, 17, 2); sl.position.set(x, 4.6, z); WORLD.add(sl);
    LAMPS.push({ light: sl, day: 0, night: 1.15 });
  }
  addBox(-13.15, 0, -6.15, -12.85, .75, -5.85, 0xC8402E); deco(-13.25, .55, -6.05, -12.75, .65, -5.95, 0xC8402E);
  addBox(5.15, 0, -13.75, 5.3, 2.4, -13.6, 0x8A8F94);
  const stop = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .04, 8), mat(0xC8402E)); stop.rotation.x = Math.PI / 2; stop.rotation.y = Math.PI / 8; stop.position.set(5.22, 2.35, -13.6); WORLD.add(stop);
  const poles = [[-20, -24.6], [0, -24.6], [20, -24.6], [-20, 24.6], [0, 24.6], [20, 24.6]];
  for (const [x, z] of poles) { cyl(.14, 8, x, 4, z, 0x6B5A48, 7); deco(x - 1.1, 7.2, z - .08, x + 1.1, 7.35, z + .08, 0x6B5A48); }
  const wireMat = new THREE.LineBasicMaterial({ color: 0x2A2A2A });
  for (const zz of [-24.6, 24.6]) for (const off of [-1, 1]) {
    const pts = []; for (let x = -20; x <= 20; x += 1) { const k = ((x + 20) % 20) / 20; pts.push(new THREE.Vector3(x, 7.35 - Math.sin(k * Math.PI) * .6, zz + off * .2)); }
    WORLD.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }
  for (const s of [-1, 1]) {
    addBox(s * 19, 0, -14, s * 26, 1.3, -12.9, 0x5E7D3A, { noMesh: true });
    addBox(s * 19, 0, 12.9, s * 26, 1.3, 14, 0x5E7D3A, { noMesh: true });
    for (let x = 19.4; x < 26; x += .9) { bush(s * x, -13.45, .62, 0x5A7A37); bush(s * x, 13.45, .62, 0x5A7A37); }
    picketFence('z', s * 33, -22, -12);
    picketFence('z', s * 33, 12, 22);
    addBox(s * 35, 0, -20, s * 37.6, 2.5, -17, s < 0 ? 0x8A9A86 : 0xA88E6B, { tex: 'siding' });
    deco(s * 34.8, 2.5, -20.3, s * 37.8, 2.75, -16.7, 0x5A4A3C, { tex: 'shingle' });
    deco(s * 34.98, 0, -19.2, s * 35.0, 2.0, -18, 0x5A4A3C);
    addBox(s * 34.6, 0, 8.8, s * 36.4, .75, 10.8, 0x9B6F44, { tex: 'planks' });
    deco(s * 34.4, .4, 8.8, s * 34.6, .45, 10.8, 0x9B6F44); deco(s * 36.4, .4, 8.8, s * 36.6, .45, 10.8, 0x9B6F44);
    cyl(.03, 2.2, s * 35.5, 1.1, 9.8, 0x777777, 6, { cast: false });
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.4, .5, 8), mat(s < 0 ? 0xE7C35A : 0x8FC7B5)); umb.position.set(s * 35.5, 2.35, 9.8); umb.castShadow = true; WORLD.add(umb);
    addBox(s * 31.3, 0, -10.6, s * 31.9, .95, -10, 0x2B2B2B); deco(s * 31.25, .95, -10.65, s * 31.95, 1.0, -9.95, 0x555555);
    addBox(s * 20.3, 0, 9.0, s * 20.9, .95, 9.6, 0x6C7478); addBox(s * 21.1, 0, 9.0, s * 21.7, .95, 9.6, 0x6C7478);
    addBox(s * 36.4 - .06, 0, -9, s * 36.4 + .06, 2.2, -8.88, 0x8A8F94); addBox(s * 36.4 - .06, 0, 3, s * 36.4 + .06, 2.2, 3.12, 0x8A8F94);
    deco(s * 36.4 - .01, 2.1, -8.9, s * 36.4 + .01, 2.12, 3.05, 0x333333, { cast: false });
    for (const [z, c] of [[-6.5, 0xF4F0E6], [-4, 0xE7C35A], [-1.5, 0x8FC7B5], [1, 0xF4F0E6]]) {
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide }));
      sheet.rotation.y = Math.PI / 2; sheet.position.set(s * 36.4, 1.55, z); sheet.castShadow = true; WORLD.add(sheet);
    }
  }
  mannequin(-16.2, -6.5, Math.PI / 2); mannequin(16.2, 6.5, -Math.PI / 2); mannequin(7.2, 23.5, Math.PI);
  tree(-17, -17.5, 1.05); tree(17.5, 17.5, 1.1, 0x758F40); tree(-14.5, 21.5, .9, 0x6A8C3A); tree(15.5, -21.5, .95);
  tree(-35.5, -2, .9, 0x758F40); tree(35.5, 1, .9);
  bush(-20, 21, .8); bush(20.5, -21, .8); bush(-27, -23.5, .7); bush(28, 23.5, .7);
  const mesaMat = mat(0xB98C61);
  for (const [x, z, r, h] of [[-160, -140, 50, 34], [60, -190, 70, 42], [190, 30, 55, 30], [-200, 90, 60, 26], [40, 200, 70, 36]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * .7, r, h, 7), mesaMat); m.position.set(x, h / 2, z); WORLD.add(m);
  }
  const wt = new THREE.Group();
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.3, 12, .3), mat(0x6E6458)); l.position.set(dx, 6, dz); wt.add(l); }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 4, 16), mat(0xD9D2C2)); tank.position.y = 14; wt.add(tank);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.6, 16), mat(0xB4483A)); cap.position.y = 16.8; wt.add(cap);
  wt.position.set(-22, 0, -42); wt.traverse(o => { o.castShadow = true; }); WORLD.add(wt);
}

/* ---------- zombies layout for this map ---------- */
// spawn mounds, wall-buys (chalk outlines), mystery box and perk machines
const ACRES_ZOMBIES = {
  start: { x: 0, z: 8.5, yaw: 0 },
  spawns: [
    [-36, -24], [-36, 22], [36, -24], [36, 22], [-8, -24], [8, -24.2], [-26, 24.3], [26, 24.3],
    [-35.5, -7], [35.5, 6], [-20, -24.5], [20, -24.5], [-15, 24], [15, 23.5], [-4, 24.6], [4.5, 24.6],
  ],
  walls: [
    { key: 'mp',       cost: 750,  x: -6,     y: 1.55, z: 25.95,  n: [0, -1] },
    { key: 'smg',      cost: 1000, x: 3.13,   y: 1.75, z: -5.6,   n: [1, 0] },
    { key: 'shotgun',  cost: 1500, x: -17.84, y: 1.55, z: -2.35,  n: [1, 0] },
    { key: 'ar',       cost: 1400, x: 17.84,  y: 1.55, z: 2.35,   n: [-1, 0] },
    { key: 'sniper',   cost: 2000, x: -18.16, y: 5.0,  z: -2.1,   n: [-1, 0] },
    { key: 'lmg',      cost: 2500, x: 29.84,  y: 5.0,  z: -5.0,   n: [-1, 0] },
  ],
  box: { x: 5.3, z: -7.4, rot: Math.PI / 2 },
  pap: { x: -9, z: 14, n: [0, -1] },
  perks: [
    { key: 'ironhide', x: -35.6, y: 0, z: -14.2, n: [0, 1] },
    { key: 'fasthands', x: 35.6, y: 0, z: -14.2, n: [0, 1] },
    { key: 'secondwind', x: -2.1, y: 0, z: -9.0, n: [-1, 0] },
    { key: 'rapidround', x: 23.4, y: UP.y, z: 4.85, n: [-1, 0] },
  ],
};

MAPS.acres = {
  name: 'Atomic Acres', sub: 'Test Site 7 \u00B7 Area 4', build: buildAtomicAcres, zombies: ACRES_ZOMBIES,
  desc: 'Two houses facing off across a cul-de-sac, with upstairs windows for overwatch.',
  bounds: [-37.6, 37.6, -25.6, 25.6], center: [0, 0], coreR: 26, orbit: { r: 46, h: 19 },
  upper: { y: UP.y, rects: [[-29.85, -18.15, -7.85, 7.85], [18.15, 29.85, -7.85, 7.85]], holes: [[18.5, 23.45, -9, -6.45], [-23.45, -18.5, -9, -6.45]] },
  portals: [
    ...[-1, 1].map(s => ({ g: [s * 22.5, -5.5], u: [s * 19.5, -5.5], up: [[s * 23.1, -6.05], [s * 23.1, -7.25], [s * 18.85, -7.25], [s * 18.9, -6.0]] })),
    // the outside stairs at the back: up the steps, across the deck and in through the bedroom door
    ...[-1, 1].map(s => ({ g: [s * 31.5, -2.5], u: [s * 28.5, 5.5], cost: 12, up: [[s * 30.8, -2.2], [s * 30.8, -1.0], [s * 30.8, 5.0], [s * 28.6, 5.0]] })),
  ],
  upperPts: (() => { const p = []; for (const x of [-20.5, -19.5, 19.5, 20.5]) for (let z = -6.5; z <= 6.5; z += 1) p.push([x, z]); return p; })(),
  spawns: { A: [-37, -31.5, -24, 24], B: [31.5, 37, -24, 24] },
  mini: {
    bg: '#5c5240',
    draw(x, X, Z, S) {
      x.fillStyle = '#4b5a37'; x.fillRect(X(-38), Z(-26), 24 * S, 52 * S); x.fillRect(X(14), Z(-26), 24 * S, 52 * S);
      x.fillStyle = '#2b2f33'; x.beginPath(); x.arc(X(0), Z(0), 12.4 * S, 0, TAU); x.fill(); x.fillRect(X(-4.5), Z(-26), 9 * S, 15 * S);
    },
  },
};
