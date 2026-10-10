// Blast Radius \u00B7 zombie models and animation
'use strict';

const ZSKIN = [0x7E8A68, 0x8C8A6E, 0x6F7D66, 0x9A8F78];
const ZCLOTH = [[0x5A6B7C, 0x3F4A3A], [0x8A5A3C, 0x3C3B42], [0xA8A08C, 0x4A3C30], [0x6B3A3A, 0x2F3540], [0x4F6A4F, 0x3A332B]];
const zEyeMat = new THREE.MeshBasicMaterial({ color: 0xFFB21E });
const zRedEye = new THREE.MeshBasicMaterial({ color: 0xFF3A1A }), zGreenGlow = new THREE.MeshBasicMaterial({ color: 0x9CFF5A });
function buildZombie(kind = 'walker') {
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  let skin = ZSKIN[Math.random() * ZSKIN.length | 0], [shirt, pants] = ZCLOTH[Math.random() * ZCLOTH.length | 0];
  if (kind === 'brute') { skin = 0x8A7A68; shirt = 0x3A4A5A; pants = 0x3A4A5A; }
  if (kind === 'hazmat') { shirt = 0xD9B23A; pants = 0xC9A22A; }
  if (kind === 'bloater') { skin = 0x8FA06A; shirt = 0x5A6A4A; }
  const dark = new THREE.Color(shirt).multiplyScalar(.6).getHex();
  const hips = new THREE.Group(); hips.position.y = .95; root.add(hips);
  sMesh(hips, sBox(.32, .17, .21), pants, 0, -.02, 0);
  const legs = [];
  for (const side of [-1, 1]) {
    const thigh = new THREE.Group(); thigh.position.set(side * .1, -.06, 0); hips.add(thigh);
    sMesh(thigh, sCyl(.085, .068, .42), pants, 0, -.22, 0);
    const knee = new THREE.Group(); knee.position.y = -.44; thigh.add(knee);
    sMesh(knee, sCyl(.064, .05, .4), side < 0 ? pants : skin, 0, -.21, 0);
    sMesh(knee, sBox(.11, .07, .23), 0x2A2420, 0, -.44, -.04);
    legs.push({ thigh, knee });
  }
  const spine = new THREE.Group(); spine.position.y = .05; hips.add(spine);
  sMesh(spine, sCyl(.15, .145, .26, 10), shirt, 0, .13, 0);
  const chest = sMesh(spine, sCyl(.19, .155, .36, 10), shirt, 0, .42, 0); chest.scale.z = .7;
  // torn patches and grime
  sMesh(spine, sBox(.12, .1, .02), skin, .06, .3, -.13);
  sMesh(spine, sBox(.08, .14, .02), dark, -.09, .46, -.135);
  sMesh(spine, sBox(.1, .06, .02), 0x4A1A12, .02, .52, -.14);
  sMesh(spine, sCyl(.055, .06, .1), skin, 0, .64, 0);
  const head = new THREE.Group(); head.position.y = .77; spine.add(head);
  const skull = sMesh(head, sBall(.115, 12, 10), skin); skull.scale.set(1, 1.08, 1.05);
  sMesh(head, sBox(.12, .05, .07), new THREE.Color(skin).multiplyScalar(.7).getHex(), 0, -.07, -.06);
  sMesh(head, sBox(.07, .02, .02), 0x2A0E0A, 0, -.06, -.1);
  for (const x of [-.042, .042]) { const e = new THREE.Mesh(sBall(.019, 8, 6), zEyeMat); e.position.set(x, .02, -.1); head.add(e); }
  sMesh(head, sBox(.2, .05, .2), 0x2B2620, 0, .1, .02);
  const arms = [];
  for (const side of [-1, 1]) {
    const upper = new THREE.Group(); upper.position.set(side * .2, .55, 0); spine.add(upper);
    sMesh(upper, sBall(.07), shirt);
    sMesh(upper, sCyl(.06, .05, .26), side > 0 ? shirt : skin, 0, -.14, 0);
    const elbow = new THREE.Group(); elbow.position.y = -.28; upper.add(elbow);
    sMesh(elbow, sCyl(.048, .04, .24), skin, 0, -.12, 0);
    sMesh(elbow, sBox(.07, .1, .05), skin, 0, -.28, 0);
    arms.push({ upper, elbow });
  }
  // what makes each kind look different
  if (kind === 'brute') {
    root.scale.set(1.38, 1.32, 1.38);
    sMesh(spine, sBox(.44, .3, .3), 0x2E3A48, 0, .45, 0);                  // overall bib
    for (const x of [-.12, .12]) sMesh(spine, sBox(.05, .3, .32), 0x2E3A48, x, .62, 0);
    sMesh(head, sBox(.2, .06, .2), skin, 0, .1, .02);                       // bald, no hair
    for (const x of [-.042, .042]) { const e = new THREE.Mesh(sBall(.021, 8, 6), zRedEye); e.position.set(x, .02, -.102); head.add(e); }
    sMesh(spine, sBox(.16, .1, .03), 0x6E2A1E, -.05, .3, -.16);
  } else if (kind === 'hazmat') {
    sMesh(head, sBall(.135, 12, 10), 0xD9B23A, 0, .01, .01);               // hood
    sMesh(head, sBox(.16, .1, .06), 0x1E2124, 0, .0, -.11);                 // mask
    for (const x of [-.07, .07]) { const f = sMesh(head, sCyl(.035, .035, .06, 8), 0x2A2D31, x, -.06, -.13); f.rotation.x = Math.PI / 2; }
    for (const x of [-.04, .04]) { const e = new THREE.Mesh(sBall(.022, 8, 6), zEyeMat); e.position.set(x, .02, -.142); head.add(e); }
    sMesh(spine, sBox(.2, .22, .12), 0x3A3E44, 0, .42, .17);                // air tank
  } else if (kind === 'bloater') {
    const belly = sMesh(spine, sBall(.3, 14, 10), 0x7E9A5A, 0, .32, -.06); belly.scale.set(1.05, .95, 1.1);
    for (let k = 0; k < 7; k++) { const a = Math.random() * TAU, b = rand(-.6, .6); const pu = new THREE.Mesh(sBall(.035 + Math.random() * .03, 8, 6), zGreenGlow); pu.position.set(Math.cos(a) * .3 * Math.cos(b), .32 + Math.sin(b) * .26, -.06 + Math.sin(a) * .32 * Math.cos(b)); spine.add(pu); }
    root.scale.set(1.12, 1.05, 1.12);
  } else if (kind === 'crawler') {
    // lost both legs below the knee
    for (const L of legs) { L.knee.children.forEach(c => { c.visible = false; }); sMesh(L.knee, sBall(.06), 0x5A1A12, 0, -.02, 0); }
  } else if (Math.random() < .45) {
    // walkers: a hat now and then
    const r = Math.random();
    if (r < .33) { sMesh(head, sCyl(.12, .12, .05, 12), 0xD9B23A, 0, .11, .01); sMesh(head, sCyl(.16, .16, .015, 12), 0xD9B23A, 0, .09, .01); }
    else if (r < .66) { sMesh(head, sCyl(.12, .12, .07, 12), 0x223048, 0, .11, .01); sMesh(head, sBox(.13, .015, .08), 0x111111, 0, .085, -.1); }
    else { sMesh(head, sBall(.12, 10, 6), 0xA8432F, 0, .08, .01); sMesh(head, sBox(.14, .015, .08), 0xA8432F, 0, .075, -.1); }
  }
  return { group: root, hips, legs, spine, head, arms, kind, flash: { visible: false } };
}

/* ---------- hellhounds ---------- */
const houndMat = { body: 0x2A2420, ember: 0xC8401E };
const houndEye = new THREE.MeshBasicMaterial({ color: 0xFFC23A });
function buildHound() {
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  const body = new THREE.Group(); body.position.y = .62; root.add(body);
  sMesh(body, sBox(.32, .34, .62), houndMat.body, 0, 0, .05);
  sMesh(body, sBox(.36, .4, .32), houndMat.body, 0, .04, -.24);             // chest
  for (let k = 0; k < 4; k++) sMesh(body, sBox(.33, .03, .05), houndMat.ember, 0, .175, -.2 + k * .12); // burning spine
  for (const x of [-.165, .165]) for (let k = 0; k < 3; k++) sMesh(body, sBox(.012, .04, .2), houndMat.ember, x, -.02 + k * .07, .05);
  const neck = new THREE.Group(); neck.position.set(0, .14, -.38); body.add(neck);
  sMesh(neck, sBox(.2, .22, .22), houndMat.body, 0, .05, -.06);
  const head = new THREE.Group(); head.position.set(0, .12, -.16); neck.add(head);
  sMesh(head, sBox(.22, .18, .22), houndMat.body, 0, 0, 0);
  sMesh(head, sBox(.14, .1, .2), houndMat.body, 0, -.03, -.18);              // snout
  const jaw = new THREE.Group(); jaw.position.set(0, -.08, -.08); head.add(jaw); sMesh(jaw, sBox(.12, .04, .2), 0x3A1A12, 0, 0, -.1);
  for (const x of [-.08, .08]) { const e = sMesh(head, sBox(.05, .1, .04), houndMat.body, x, .13, .04); e.rotation.x = -.3; }
  for (const x of [-.06, .06]) { const e = new THREE.Mesh(sBall(.024, 8, 6), houndEye); e.position.set(x, .04, -.11); head.add(e); }
  const legs = [];
  for (const [x, z] of [[-.12, -.28], [.12, -.28], [-.12, .26], [.12, .26]]) {
    const up = new THREE.Group(); up.position.set(x, -.12, z); body.add(up);
    sMesh(up, sCyl(.05, .04, .28, 7), houndMat.body, 0, -.14, 0);
    const lo = new THREE.Group(); lo.position.y = -.28; up.add(lo);
    sMesh(lo, sCyl(.035, .03, .22, 6), houndMat.body, 0, -.11, 0);
    sMesh(lo, sBox(.07, .04, .1), houndMat.body, 0, -.22, -.02);
    legs.push({ up, lo });
  }
  const tail = new THREE.Group(); tail.position.set(0, .1, .35); body.add(tail); sMesh(tail, sCyl(.025, .015, .32, 5), houndMat.body, 0, .15, 0).rotation.x = .6;
  // flames licking off the back
  const fire = [];
  for (let k = 0; k < 4; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(255, 120, 40), color: 0xFF8A3A, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending })); sp.position.set(rand(-.08, .08), .26, -.2 + k * .14); sp.scale.set(.3, .3, .3); body.add(sp); fire.push(sp); }
  return { group: root, body, neck, head, jaw, legs, tail, fire, kind: 'dog', flash: { visible: false } };
}
function poseHound(z, dt) {
  const m = z.model, sp = Math.hypot(z.vel.x, z.vel.z), run = clamp(sp / 6, 0, 1.2);
  m.group.position.copy(z.pos); m.group.rotation.set(0, z.yaw, 0); m.group.scale.setScalar(1);
  z.walkPhase = (z.walkPhase || 0) + dt * (4 + sp * 2.1);
  const ph = z.walkPhase;
  m.body.position.y = .62 + Math.abs(Math.sin(ph)) * .06 * run;
  m.body.rotation.x = Math.sin(ph) * .08 * run + (z.attackT > 0 ? -.25 : 0);
  m.legs.forEach((L, i) => { const off = i < 2 ? 0 : Math.PI * .9, s = Math.sin(ph + off + (i % 2) * .4); L.up.rotation.x = s * .9 * run; L.lo.rotation.x = Math.max(0, -Math.cos(ph + off)) * 1.1 * run; });
  m.head.rotation.x = Math.sin(ph * .5) * .1 + (z.attackT > 0 ? .3 : 0);
  m.jaw.rotation.x = z.attackT > 0 ? .7 : .15 + Math.sin(G.now * 9 + z.id) * .1;
  m.tail.rotation.x = Math.sin(ph * 1.3) * .3;
  for (const f of m.fire) { const s = .22 + Math.random() * .16; f.scale.set(s, s * 1.4, s); f.position.y = .26 + Math.random() * .06; f.material.opacity = .4 + Math.random() * .4; }
}
// zombies hauling themselves up onto a ledge
function poseClimb(z) {
  const m = z.model, M = z.climb, k = clamp(M.t / M.dur, 0, 1);
  m.group.position.copy(z.pos); m.group.rotation.set(0, z.yaw, 0);
  if (z.kind === 'dog') { m.body.rotation.x = -.6 * Math.sin(k * Math.PI); m.legs.forEach((L, i) => { L.up.rotation.x = i < 2 ? -1.1 : .8; L.lo.rotation.x = .4; }); return; }
  m.spine.rotation.x = -.5 - Math.sin(k * Math.PI) * .3;
  for (let i = 0; i < 2; i++) { m.arms[i].upper.rotation.set(2.8 - k * 1.6, 0, (i ? 1 : -1) * .2); m.arms[i].elbow.rotation.x = .3 + k * .6; }
  for (let i = 0; i < 2; i++) { m.legs[i].thigh.rotation.x = .3 + Math.sin(k * Math.PI + i) * .7; m.legs[i].knee.rotation.x = -.8; }
}
function poseZombie(z, dt) {
  if (z.kind === 'dog') { poseHound(z, dt); return; }
  const m = z.model, sp = Math.hypot(z.vel.x, z.vel.z), run = clamp(sp / 4.2, 0, 1.3);
  if (z.kind === 'crawler') {
    z.walkPhase = (z.walkPhase || 0) + dt * (2 + sp * 2.4);
    const ph = z.walkPhase;
    m.group.position.set(z.pos.x + Math.sin(z.yaw) * .55, z.pos.y + .12, z.pos.z + Math.cos(z.yaw) * .55); m.group.rotation.set(-1.35, z.yaw, 0);
    m.spine.rotation.x = 0; m.head.rotation.set(1.1 + Math.sin(ph) * .08, 0, Math.sin(ph * .5) * .2); m.hips.position.y = .95;
    for (let i = 0; i < 2; i++) { const s = Math.sin(ph + i * Math.PI); m.arms[i].upper.rotation.set(2.5 + s * .6 - (z.attackT > 0 ? .5 : 0), 0, (i ? 1 : -1) * .3); m.arms[i].elbow.rotation.x = .2 + Math.max(0, s) * .8; m.legs[i].thigh.rotation.x = Math.sin(ph * .5 + i) * .1; }
    return;
  }
  m.group.position.copy(z.pos); m.group.rotation.y = z.yaw; m.group.rotation.x = 0;
  z.walkPhase = (z.walkPhase || 0) + sp * dt * (z.runner ? 1.9 : 2.6);
  const ph = z.walkPhase, limp = z.limp;
  m.spine.rotation.x = lerp(m.spine.rotation.x, -(z.runner ? .45 : .22) - (z.attackT > 0 ? .25 : 0), Math.min(1, dt * 6));
  m.spine.rotation.z = Math.sin(ph * .5) * (z.runner ? .04 : .1);
  m.head.rotation.set(-m.spine.rotation.x * .5 + Math.sin(ph * .7) * .08, 0, Math.sin(ph * .4 + z.id) * .25);
  for (let i = 0; i < 2; i++) {
    const L = m.legs[i], s = Math.sin(ph + i * Math.PI), amt = Math.min(1, run * 2) * (i === limp ? .55 : 1);
    L.thigh.rotation.x = s * (z.runner ? .8 : .5) * amt;
    L.knee.rotation.x = -.1 - Math.max(0, Math.sin(ph + i * Math.PI - 1.3)) * (z.runner ? 1.3 : .7) * amt;
  }
  m.hips.position.y = .93 + Math.abs(Math.cos(ph)) * .05 * Math.min(1, run * 2);
  for (let i = 0; i < 2; i++) {
    const A = m.arms[i], side = i ? 1 : -1;
    if (z.attackT > 0) {
      const k = 1 - z.attackT / .55;
      A.upper.rotation.set(2.5 - k * 1.9 - (i ? .3 : 0), 0, side * .2); A.elbow.rotation.x = .4;
    } else if (z.runner) {
      const s = Math.sin(ph + i * Math.PI);
      A.upper.rotation.set(.3 + s * .8, 0, side * .15); A.elbow.rotation.x = 1.2;
    } else {
      // the classic reach
      A.upper.rotation.set(1.35 + Math.sin(ph * .8 + i) * .12, 0, side * .1); A.elbow.rotation.x = .15 + Math.sin(ph + i) * .08;
    }
  }
}
function poseRising(z) {
  const m = z.model, k = clamp(1 - z.riseT / 1.3, 0, 1);
  if (z.kind === 'dog') { m.group.position.set(z.pos.x, z.pos.y, z.pos.z); m.group.rotation.set(0, z.yaw, 0); m.group.scale.setScalar(Math.max(.05, k)); return; }
  m.group.position.set(z.pos.x, z.pos.y - (1 - k) * 1.75, z.pos.z); m.group.rotation.set(0, z.yaw, 0);
  m.spine.rotation.x = -.5 * (1 - k);
  for (let i = 0; i < 2; i++) { m.arms[i].upper.rotation.set(2.7 - k * 1.3, 0, (i ? 1 : -1) * .3); m.arms[i].elbow.rotation.x = .6 * (1 - k); }
}
