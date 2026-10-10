// Blast Radius \u00B7 map: Freight \u2014 a tiny container yard on a rainy dock. Close quarters, no hiding.
'use strict';

const FREIGHT_COLS = [0xA8432F, 0x2F5E8A, 0x3E7A4A, 0xC98A2B, 0x6B6F74, 0x7C3B5E, 0x2D6E73, 0xB5552A];
function buildFreight() {
  buildSky(0x5E6870, 0x9AA3A8, 0x7C858A, { clouds: 14, cloudColor: 0x8A9298, cloudAlpha: .85, k: 2.2 });
  groundPlane(0x55585A, 'asphalt');
  // yard slab, painted lanes, drains and puddles
  flat(-20, -20, 20, 20, .02, 0x8A8984, 'concrete');
  for (const z of [-13, 13]) flat(-17, z - .08, 17, z + .08, .03, 0xD9B23A);
  for (const x of [-13, 13]) flat(x - .08, -12, x + .08, 12, .03, 0xD9B23A);
  for (let k = -3; k <= 3; k++) flat(k * 1.6 - .5, -.08 - 4, k * 1.6 + .5, .08 - 4, .03, 0xE8E2D2);
  const puddle = new THREE.MeshPhongMaterial({ color: 0x3C4248, shininess: 90, specular: 0x9AA6B0, transparent: true, opacity: .75 });
  for (const [x, z, r] of [[-4, 3, 1.6], [6, -5, 1.2], [-12, -4, 1.4], [12, 6, 1.8], [2, 12, 1.1], [-7, -13.5, 1.3]]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(r, 20), puddle); p.rotation.x = -Math.PI / 2; p.scale.y = .6 + Math.random() * .4; p.position.set(x, .035, z); WORLD.add(p);
  }
  for (const [x, z] of [[0, 0], [-15, 15], [15, -15]]) deco(x - .35, .02, z - .35, x + .35, .04, z + .35, 0x2E3134, { cast: false });

  // perimeter: stacked containers make the walls; invisible walls stop anyone climbing out
  let ci = 0;
  const col = () => FREIGHT_COLS[(ci++ * 5 + 3) % FREIGHT_COLS.length];
  for (const s of [-1, 1]) {
    for (let k = 0; k < 7; k++) for (let lv = 0, x = -18.3 + k * 6.1; lv < (Math.abs(x) < 4 ? 2 : 3); lv++) container(x, s * 21.25, 'x', col(), lv * 2.6, { collide: lv === 0, simple: lv > 0 });
    for (let k = 0; k < 7; k++) for (let lv = 0, z = -18.3 + k * 6.1; lv < (Math.abs(z) < 4 ? 3 : 2); lv++) container(s * 21.25, z, 'z', col(), lv * 2.6, { collide: lv === 0, simple: lv > 0 });
    for (const t of [-1, 1]) for (let lv = 0; lv < 3; lv++) container(s * 21.9, t * 21.9, 'x', col(), lv * 2.6, { collide: false, simple: true });
    invisWall(s * 19.95, -22, s * 21, 22, 12); invisWall(-22, s * 19.95, 22, s * 21, 12);
  }

  // pinwheel of containers around the middle, two of them double-stacked
  container(-8.5, -10, 'x', 0xA8432F); container(-8.5, -10, 'x', 0x2F5E8A, 2.6);
  container(10, -8.5, 'z', 0x3E7A4A);
  container(8.5, 10, 'x', 0xC98A2B); container(8.5, 10, 'x', 0x6B6F74, 2.6);
  container(-10, 8.5, 'z', 0x7C3B5E);
  container(0, -15.5, 'x', 0x2D6E73); container(0, 15.5, 'x', 0xB5552A);
  container(-15.5, 0, 'z', 0x6B6F74); container(15.5, 0, 'z', 0x2F5E8A);

  // the crate pile in the middle
  crate(1.4, 1.4); crate(-1.4, -1.4); crate(1.4, -1.4, 1.1); crate(1.4, -1.4, .9, 1.1, 0xA88458); crate(-1.4, 1.4, 1.1);
  deco(-.6, 0, -.6, .6, .14, .6, 0x7A6A4E, { tex: 'planks' });
  // barrel clusters
  for (const [x, z] of [[5.5, 3], [-5.5, -3]]) { barrel(x, z, 0x2F5E8A); barrel(x + .65, z + .2, 0xA8432F); barrel(x + .2, z - .62, 0x2F5E8A); }
  // jersey barriers
  for (const [x, z, ax] of [[-3, -6.5, 'x'], [3, 6.5, 'x'], [-5.5, 12.6, 'x'], [5.5, -12.6, 'x']]) {
    const hx = ax === 'x' ? 1.3 : .3, hz = ax === 'x' ? .3 : 1.3;
    addBox(x - hx, 0, z - hz, x + hx, .9, z + hz, 0xB9B5AC, { tex: 'concrete' });
    deco(x - hx - .01, .55, z - hz - .01, x + hx + .01, .62, z + hz + .01, 0xC9452F, { cast: false });
  }
  // forklift
  {
    const x = -4.5, z = 6;
    addBox(x - .6, 0, z - .9, x + .6, 1.3, z + 1.3, 0xD9A422);
    deco(x - .62, .9, z + .5, x + .62, 1.35, z + 1.32, 0x3A3A3A);
    for (const [dx, dz] of [[-.55, -.55], [.55, -.55], [-.55, 1.05], [.55, 1.05]]) beam([x + dx, 1.3, z + dz], [x + dx, 2.3, z + dz], .06, 0x2A2A2A);
    deco(x - .62, 2.3, z - .6, x + .62, 2.36, z + 1.1, 0x2A2A2A);
    deco(x - .1, .55, z + .2, x + .45, .75, z + .55, 0x2A2A2A);
    for (const dx of [-.45, .45]) addBox(x + dx - .06, 0, z - 1.2, x + dx + .06, 2.8, z - 1.05, 0x3A3A3A);
    for (const dx of [-.3, .3]) deco(x + dx - .06, .1, z - 2.3, x + dx + .06, .16, z - 1.1, 0x5A5A5A);
    for (const [dx, dz] of [[-.62, -.45], [.62, -.45], [-.62, .95], [.62, .95]]) { const w = cyl(.3, .22, x + dx, .3, z + dz, 0x1E2124, 12); w.rotation.z = Math.PI / 2; }
  }
  // pallets and bits
  for (const [x, z] of [[13.2, -13.2], [-13.4, 13.6], [-16.4, -16.4], [16.4, 16.2]]) { addBox(x - .6, 0, z - .5, x + .6, .16, z + .5, 0x9B7A50, { tex: 'planks' }); crate(x, z, .9, .16); }
  barrel(-17.5, 7, 0xC98A2B); barrel(17.4, -7, 0x3E7A4A);

  // gantry crane over the yard and dock floodlights
  const steel = 0xC9A227;
  for (const s of [-1, 1]) {
    for (const z of [-24, 24]) { beam([s * 26, 0, z], [s * 26, 18, z], .7, steel); }
    beam([s * 26, 17.5, -24], [s * 26, 17.5, 24], .8, steel);
    beam([s * 26, 6, -24], [s * 26, 6, 24], .4, steel);
  }
  for (const z of [-24, 24]) beam([-26, 18.2, z], [26, 18.2, z], .9, steel);
  deco(-3, 16.8, -26, 3, 18.4, -22, 0x9C7E1E);
  for (const z of [-24.5, -23.5]) beam([0, 16.8, z], [0, 9, z + .5], .05, 0x222222);
  for (const [x, z] of [[-19.2, -19.2], [19.2, 19.2], [19.2, -19.2], [-19.2, 19.2]]) {
    cyl(.14, 11, x * 1.12, 5.5, z * 1.12, 0x5A5E62, 8);
    deco(x * 1.12 - .7, 10.8, z * 1.12 - .2, x * 1.12 + .7, 11.4, z * 1.12 + .2, 0x2A2C2E);
    pointLamp(x * .9, 9, z * .9, 0xE8F0FF, .45, 1, 24);
  }
  // ship hull looming past the yard and the sea
  addBox(-60, -3, -48, 60, 9, -34, 0x2C3A48, { noCollide: true, cast: false });
  deco(-60, 9, -48, 60, 9.6, -34, 0xA8432F, { cast: false });
  for (let x = -50; x < 50; x += 6.2) for (let lv = 0; lv < 2; lv++) container(x, -41, 'x', FREIGHT_COLS[(x * 7 + lv * 3 >>> 0) % 8], 9.6 + lv * 2.6, { collide: false, far: true });
  deco(30, 9.6, -46, 42, 22, -36, 0xE8E4DA, { cast: false });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 300), new THREE.MeshLambertMaterial({ color: 0x3A4C58 })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -1, -180); WORLD.add(sea);
  for (let x = -70; x <= 70; x += 6.2) if (Math.abs(x) > 30) for (let lv = 0; lv < 3; lv++) container(x, 30 + (x % 4), 'x', FREIGHT_COLS[(x * 3 + lv >>> 0) % 8], lv * 2.6, { collide: false, far: true });

  // rain
  const N = 1400, pos = new Float32Array(N * 6);
  for (let i = 0; i < N; i++) { const x = rand(-28, 28), y = rand(0, 26), z = rand(-28, 28); pos.set([x, y, z, x + .05, y + .55, z + .03], i * 6); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xC8D2DA, transparent: true, opacity: .38 }));
  rain.frustumCulled = false; WORLD.add(rain);
  MAPS.freight.rain = rain;
}
MAPS.freight = {
  name: 'Freight', sub: 'Dock 14 \u00B7 Overcast', build: buildFreight,
  desc: 'A tiny container yard in the rain. Spawn, fight, die, repeat.',
  bounds: [-19.4, 19.4, -19.4, 19.4], center: [0, 0], coreR: 12, orbit: { r: 30, h: 21 },
  spawns: { A: [-19, -17, -17, 17], B: [17, 19, -17, 17] },
  lighting: { day: { fog: [0x8E979C, 30, 150], hemi: [0xBCC6CC, 0x5E5A52, .74], amb: .16, sun: [0xD8DCE0, .55, -20, 40, 15], torch: 0 } },
  mini: { bg: '#2c2f31', draw(x, X, Z, S) { x.fillStyle = '#4e5052'; x.fillRect(X(-20), Z(-20), 40 * S, 40 * S); } },
  tick(dt) {
    const r = this.rain; if (!r) return;
    const a = r.geometry.attributes.position, p = a.array, cx = camera.position.x, cz = camera.position.z;
    for (let i = 0; i < p.length; i += 6) {
      let y = p[i + 1] - dt * 24;
      if (y < 0) { y += 26; const x = cx + rand(-28, 28), z = cz + rand(-28, 28); p[i] = x; p[i + 2] = z; p[i + 3] = x + .05; p[i + 5] = z + .03; }
      p[i + 1] = y; p[i + 4] = y + .55;
    }
    a.needsUpdate = true;
  },
};
