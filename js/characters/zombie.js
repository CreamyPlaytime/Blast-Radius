// Blast Radius · zombie models and animation
'use strict';

/* ---------- the undead: low-poly, asymmetrical, filthy ----------
   Every part is faceted geometry with per-face vertex colours, so skin and cloth read as mottled and blood-soaked
   without any textures. Each shape/palette pair is built in a few random variants and cached, so a horde of
   two dozen shares a handful of buffers instead of making new ones per zombie.
   Rig: root > hips (y .95) > [leftLeg/rightLeg = thigh pivots at the hip sockets > knee]
                           > torso (spine) > [head, leftArm/rightArm = upper pivots at the shoulders > elbow > wrist]
   Index 0 is the zombie's left (-x), index 1 its right (+x); it faces -z. */
const ZP = { flesh: 0x7A524B, mottle: 0x542825, blood: 0x8B1E14, shirt: 0xC6B27A, pants: 0x4C483F, mouth: 0x1A0A0A, shoe: 0x2A2A2B, bone: 0xD6C6A2, tooth: 0xCFC4A0 };
const ZMIX = {
  flesh:   [[ZP.flesh, 6], [ZP.mottle, 3], [ZP.blood, 1.4], [0x8E655C, 1.2]],
  gore:    [[ZP.flesh, 2.5], [ZP.mottle, 3], [ZP.blood, 4.5]],
  socket:  [[ZP.mouth, 3], [ZP.blood, 3], [ZP.mottle, 2]],
  shirt:   [[ZP.shirt, 7], [0xA8955E, 2.2], [0x8A7A50, 1], [ZP.blood, 1.2], [ZP.mottle, .7]],
  shirtDk: [[0x9C8A58, 5], [0x7E6E46, 2], [ZP.blood, 1.6], [ZP.mottle, 1]],
  pants:   [[ZP.pants, 7], [0x3A372F, 2.2], [0x5E594D, 1], [ZP.blood, .7]],
  shoe:    [[ZP.shoe, 8], [0x45453F, 1.4], [0x9A9282, .6]],
  bone:    [[ZP.bone, 3], [ZP.blood, 4], [ZP.mottle, 2]],
  mouth:   [[ZP.mouth, 1]],
  tooth:   [[ZP.tooth, 4], [0xA89A70, 1.5], [ZP.blood, .6]],
  denim:   [[0x2E3A48, 6], [0x232C38, 2], [ZP.blood, 1], [0x3E4A58, 1]],
  haz:     [[0xD9B23A, 6], [0xB08E2A, 2], [ZP.blood, .9], [0x5A4A20, .6]],
  hazDk:   [[0x2A2D31, 5], [0x1E2124, 2], [0x3A3E44, 1]],
  bloat:   [[0x8FA06A, 5], [0x6E7A4A, 3], [ZP.blood, 1], [0xA8B080, 1]],
};
const zVC = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const zEyeMat = new THREE.MeshBasicMaterial({ color: 0xE8F0FF });
const zRedEye = new THREE.MeshBasicMaterial({ color: 0xFF3A1A }), zGreenGlow = new THREE.MeshBasicMaterial({ color: 0x9CFF5A });
const zStainMats = {};
const zStainMat = c => zStainMats[c] || (zStainMats[c] = new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: .88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
const zGeoCache = {};
// a shape, faceted and painted face by face from a palette; `variants` random versions per shape
function zGeo(key, make, mix, variants = 3) {
  const k = key + '|' + mix + '|' + (Math.random() * variants | 0);
  if (zGeoCache[k]) return zGeoCache[k];
  let g = make(); if (g.index) g = g.toNonIndexed();
  const P = ZMIX[mix], tot = P.reduce((a, q) => a + q[1], 0), n = g.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color();
  for (let f = 0; f < n; f += 3) {
    let r = Math.random() * tot, hex = P[0][0];
    for (const [h, w] of P) { if (r < w) { hex = h; break; } r -= w; }
    c.setHex(hex); const j = .86 + Math.random() * .24;
    for (let q = 0; q < 3 && f + q < n; q++) { col[(f + q) * 3] = c.r * j; col[(f + q) * 3 + 1] = c.g * j; col[(f + q) * 3 + 2] = c.b * j; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  return zGeoCache[k] = g;
}
const zBox = (w, h, d, mix) => zGeo(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d), mix);
const zCyl = (rt, rb, h, mix, seg = 6) => zGeo(`c${rt}_${rb}_${h}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg), mix);
const zBall = (r, mix, ws = 7, hs = 5) => zGeo(`s${r}_${ws}_${hs}`, () => new THREE.SphereGeometry(r, ws, hs), mix);
const zIco = (r, mix) => zGeo(`i${r}`, () => new THREE.IcosahedronGeometry(r, 0), mix);
// add a part: position, rotation, scale
function zp(parent, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, material = zVC) {
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m;
}
// a smear of blood laid over cloth or skin: a thin, slightly transparent slab that never fights the surface below
function zStain(parent, w, h, x, y, z, rz = 0, c = ZP.blood, ry = 0) { const m = new THREE.Mesh(sBox(w, h, .004), zStainMat(c)); m.position.set(x, y, z); m.rotation.set(0, ry, rz); m.renderOrder = 2; parent.add(m); return m; }
// spindly fingers curling off a hand
function zFingers(hand, mix, curl) {
  for (let k = 0; k < 4; k++) {
    const f = new THREE.Group(); f.position.set(-.027 + k * .018, -.045, 0); f.rotation.x = curl + rand(-.15, .2); f.rotation.z = rand(-.12, .12); hand.add(f);
    zp(f, zBox(.012, .06 + (k === 1 || k === 2 ? .012 : 0), .013, mix), 0, -.03, 0);
    const tip = zp(f, zBox(.011, .04, .012, k % 2 ? 'gore' : mix), 0, -.07, -.008); tip.rotation.x = .5;
  }
  const th = zp(hand, zBox(.013, .045, .014, mix), -.042, -.02, -.012); th.rotation.z = .6;
}

/* ---------- variety: every variant rolls its own recipe ---------- */
const ZSKINS = [[0x7A524B, 0x8E655C], [0x8C8478, 0xA09A8C], [0x6E7458, 0x828A68], [0x6A4E5A, 0x7E6070], [0x4E3A32, 0x5E463C], [0x9A8070, 0xAE9484]];
const ZSHIRTS = [0xC6B27A, 0x5A6E88, 0x8A3A32, 0xC8C4B8, 0x5A5C5E, 0x4F5E44, 0xA8862E, 0x6E4A6A];
const ZPANTS = [0x4C483F, 0x3A4A62, 0x8A7A5A, 0x26262A, 0x5A4232];
const zDk = (h, k) => new THREE.Color(h).multiplyScalar(k).getHex();
// a palette made on the fly (named so its painted geometry is cached like the fixed ones)
function zMix(name, list) { if (!ZMIX[name]) ZMIX[name] = list; return name; }
const zPick = a => a[Math.random() * a.length | 0];
// v0 of a walker is always the reference look; every other variant rolls the dice
function zRecipe(kind, v) {
  const R = Math.random;
  const r = {
    skin: v === 0 ? ZSKINS[0] : zPick(ZSKINS), shirt: v === 0 ? ZSHIRTS[0] : zPick(ZSHIRTS), pants: v === 0 ? ZPANTS[0] : zPick(ZPANTS),
    blood: v === 0 ? 1 : zPick([.5, 1, 1, 1.6, 2.4]),
    torso: v === 0 ? 'shirt' : R() < .62 ? 'shirt' : R() < .55 ? 'tank' : 'open',
    width: v === 0 ? 1 : .86 + R() * .32, tall: v === 0 ? 1 : .93 + R() * .14, hunch: v === 0 ? 1 : .5 + R() * 1.1,
    arms: ['long', 'bone'], legs: ['shoe', 'torn'], shorts: false,
    hair: v === 0 ? 'none' : zPick(['none', 'none', 'clumps', 'stringy', 'ring']),
    eyes: v === 0 ? 'both' : R() < .22 ? 'one' : 'both', jaw: v === 0 ? 'open' : R() < .18 ? 'gone' : R() < .25 ? 'clenched' : 'open',
    ribs: v !== 0 && R() < .3, scalp: v === 0 || R() < .5, ear: R() < .25,
  };
  if (v !== 0) {
    // which side got mauled, and how badly
    const bad = R() < .5 ? 1 : 0, other = 1 - bad;
    r.arms[bad] = zPick(['bone', 'bone', 'short', 'long']); r.arms[other] = zPick(['long', 'long', 'short', 'bone']);
    r.legs[bad] = zPick(['torn', 'torn', 'barefoot', 'shoe']); r.legs[other] = zPick(['shoe', 'shoe', 'barefoot']);
    r.shorts = R() < .15;
    if (r.torso === 'tank') r.arms = r.arms.map(a => a === 'bone' ? 'bone' : 'bare');
  }
  if (kind === 'brute') { r.torso = 'bib'; r.arms = r.arms.map(a => a === 'bone' ? 'bone' : 'bare'); r.width = Math.max(r.width, 1.05); }
  if (kind === 'hazmat') { r.torso = 'haz'; r.arms = ['long', 'long']; r.legs = ['shoe', 'shoe']; r.shorts = false; r.hair = 'none'; }
  if (kind === 'bloater') { r.skin = [0x8FA06A, 0xA8B080]; r.torso = R() < .5 ? 'tank' : 'open'; r.arms = r.arms.map(a => a === 'bone' ? 'bone' : 'bare'); r.width = 1.15; }
  return r;
}

function zBuildDetailed(kind, v = 0) {
  const root = new THREE.Group(); root.rotation.order = 'YXZ'; root.name = 'root';
  const brute = kind === 'brute', haz = kind === 'hazmat', bloat = kind === 'bloater';
  const r = zRecipe(kind, v), bl = r.blood;
  // this variant's palettes
  const SK = zMix(`sk${r.skin[0]}_${bl}`, [[r.skin[0], 6], [ZP.mottle, 3], [ZP.blood, 1.4 * bl], [r.skin[1], 1.2]]);
  const SH = brute ? 'denim' : haz ? 'haz' : zMix(`sh${r.shirt}_${bl}`, [[r.shirt, 7], [zDk(r.shirt, .82), 2.2], [zDk(r.shirt, .65), 1], [ZP.blood, 1.2 * bl], [ZP.mottle, .7]]);
  const SHD = brute ? 'denim' : haz ? 'haz' : zMix(`sd${r.shirt}_${bl}`, [[zDk(r.shirt, .78), 5], [zDk(r.shirt, .6), 2], [ZP.blood, 1.6 * bl], [ZP.mottle, 1]]);
  const PA = brute ? 'denim' : haz ? 'haz' : zMix(`pa${r.pants}_${bl}`, [[r.pants, 7], [zDk(r.pants, .78), 2.2], [zDk(r.pants, 1.2), 1], [ZP.blood, .7 * bl]]);
  const nStain = Math.round(6 * bl);
  const bare = r.torso === 'tank' || r.torso === 'bib' || r.torso === 'open';

  /* ----- hips and legs ----- */
  const hips = new THREE.Group(); hips.name = 'hips'; hips.position.y = .95; root.add(hips);
  zp(hips, zBox(.34, .18, .22, PA), 0, -.02, 0, 0, 0, 0, r.width, 1, 1);
  zp(hips, zBox(.35, .04, .23, haz ? 'hazDk' : 'shoe'), 0, .06, 0, 0, 0, 0, r.width, 1, 1);
  if (bl > .6) zStain(hips, .1, .12, .07, -.04, -.113, .3);
  const legs = [];
  for (const side of [-1, 1]) {
    const style = r.legs[side < 0 ? 0 : 1];
    const thigh = new THREE.Group(); thigh.name = 'thigh' + side; thigh.position.set(side * .1 * r.width, -.06, 0); hips.add(thigh);
    if (r.shorts) { zp(thigh, zCyl(.09, .084, .2, PA), 0, -.1, 0); zp(thigh, zCyl(.074, .068, .26, SK), 0, -.31, 0); }
    else zp(thigh, zCyl(.088, .072, .44, PA), 0, -.22, 0);
    const knee = new THREE.Group(); knee.name = 'knee' + side; knee.position.y = -.44; thigh.add(knee);
    const clothed = style !== 'torn' && !r.shorts;
    if (clothed) { zp(knee, zCyl(.072, .06, .42, PA), 0, -.21, 0); zp(knee, zCyl(.064, .066, .05, PA), 0, -.41, 0); }
    else {
      if (!r.shorts) for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; zp(knee, zBox(.035, .06 + Math.random() * .05, .012, PA), Math.cos(a) * .072, -.07, Math.sin(a) * .072, 0, -a + Math.PI / 2, rand(-.3, .3)); }
      if (!r.shorts) zp(knee, zCyl(.074, .08, .07, PA), 0, -.02, 0);
      zp(knee, zBall(.058, 'gore'), 0, -.03, -.02);
      zp(knee, zCyl(.054, .042, .4, SK), 0, -.22, 0, .04);
      if (style === 'torn') zp(knee, zBox(.03, .2, .02, 'bone'), .012, -.22, -.048, .04);
      if (bl > .6) zStain(knee, .05, .14, -.02, -.3, -.052, .2);
    }
    if (style === 'shoe') {
      zp(knee, zBox(.12, .08, .25, 'shoe'), 0, -.46, -.045);
      zp(knee, zBox(.11, .05, .07, 'shoe'), 0, -.475, -.175, .25);
      for (let k = 0; k < 3; k++) zp(knee, sBox(.07, .008, .012), 0, -.418, -.04 - k * .03, 0, 0, 0, 1, 1, 1, mat(0xB8B0A0));
      zp(knee, zBox(.125, .02, .26, 'shoe'), 0, -.505, -.05);
    } else {
      zp(knee, zBox(.095, .055, .2, style === 'torn' ? 'gore' : SK), 0, -.45, -.05);
      for (let k = 0; k < 4; k++) zp(knee, zBox(.018, .03, .04, k === 3 ? 'gore' : SK), -.032 + k * .021, -.46, -.165, .3);
      zp(knee, zBall(.04, 'gore'), 0, -.44, .03);
    }
    legs.push({ thigh, knee });
  }

  /* ----- torso ----- */
  const spine = new THREE.Group(); spine.name = 'spine'; spine.position.y = .05; hips.add(spine);
  const TS = r.torso === 'shirt' ? SH : r.torso === 'tank' ? SH : r.torso === 'haz' ? 'haz' : SK;
  const W = r.width;
  zp(spine, zCyl(.155, .145, .26, r.torso === 'open' ? SK : TS, 7), 0, .13, 0, 0, 0, 0, W, 1, 1);
  const chest = zp(spine, zCyl(.205, .158, .36, TS, 7), 0, .42, .01, -.12); chest.scale.set(W, 1, .72);
  zp(spine, zBall(.16, TS === SH && r.torso === 'tank' ? SH : TS, 7, 5), 0, .55, .07, 0, 0, 0, 1.15 * W, .7 * r.hunch, .8 * Math.max(.8, r.hunch));   // the hunch
  zp(spine, zBox(.08, .14, .04, SK), -.12 * W, .38, .1, 0, 0, .2);                       // ribs where the back is torn open
  if (r.torso === 'shirt') {
    zp(spine, zBox(.12, .14, .03, SK), 0, .54, -.115, -.2);
    for (const s of [-1, 1]) zp(spine, zBox(.03, .18, .03, SHD), s * .05, .55, -.128, -.2, 0, s * .45);
    zp(spine, zBox(.04, .03, .02, 'gore'), .03, .5, -.135);
  } else if (r.torso === 'tank') {
    zp(spine, zBox(.2 * W, .1, .05, SK), 0, .58, -.1, -.2);                               // bare chest above a low tank top
    for (const s of [-1, 1]) zp(spine, zBox(.04, .16, .04, SH), s * .09 * W, .6, -.02);  // straps
  } else if (r.torso === 'open') {
    // an open jacket over bare, torn-open skin
    for (const s of [-1, 1]) { zp(spine, zBox(.14 * W, .44, .05, SH), s * .14 * W, .36, -.12, -.06, s * -.3, 0); zp(spine, zBox(.06, .2, .05, SHD), s * .09 * W, .58, -.13, -.2, 0, s * .4); }
    zp(spine, zBox(.12, .2, .03, 'gore'), 0, .25, -.16);                                  // the gut wound
  }
  if (r.ribs || r.torso === 'open') for (let k = 0; k < 4; k++) zp(spine, zBox(.12 * W, .016, .02, 'bone'), .02, .34 + k * .045, -.15 - (r.torso === 'open' ? .01 : 0), 0, 0, rand(-.15, .15));
  // stains: the big wet one and the dried edges around it, more of them the bloodier this one is
  const ST = [[.16, .22, .04, .4, .25, ZP.blood], [.1, .14, -.07, .33, -.4, ZP.mottle], [.07, .2, .1, .28, .1, 0x6E1A12], [.12, .07, -.02, .5, -.15, ZP.blood], [.08, .12, -.1, .2, .4, 0x6E1A12], [.1, .1, .12, .46, -.3, ZP.blood], [.06, .16, -.04, .15, .2, ZP.mottle], [.14, .1, .06, .1, -.1, 0x6E1A12], [.05, .2, .14, .32, .5, ZP.blood], [.1, .08, -.12, .44, .2, ZP.blood], [.08, .18, .0, .3, .0, 0x5A1610], [.12, .12, -.06, .24, -.5, ZP.mottle], [.06, .1, .09, .55, .3, ZP.blood], [.1, .14, -.14, .3, -.2, 0x6E1A12], [.08, .06, .02, .18, .6, ZP.blood]];
  const order = ST.map((_, i) => i).sort(() => Math.random() - .5);
  for (let k = 0; k < Math.min(nStain, ST.length); k++) { const [w, h, x, y, rz, c] = ST[order[k]]; zStain(spine, w * W, h, x * W, y, -.151 - k * .0015, rz, c); }
  if (bl > 1) zStain(spine, .14 * W, .16, .02, .45, .13, .3, 0x6E1A12, Math.PI);
  zp(spine, zCyl(.055, .065, .12, SK), 0, .64, -.02, -.3);

  /* ----- head ----- */
  const head = new THREE.Group(); head.name = 'head'; head.position.set(0, .77, -.04); spine.add(head);
  zp(head, zBall(.118, SK, 7, 6), 0, .01, 0, 0, 0, 0, .95, 1.12, 1.05);
  if (r.scalp) zp(head, zIco(.05, 'gore'), Math.random() < .5 ? .07 : -.06, .07, .03, 0, 0, 0, 1, .7, 1);
  zp(head, zBox(.17, .035, .05, SK), 0, .042, -.098, -.1);
  [-.043, .043].forEach((x, i) => {
    zp(head, zBall(.03, 'socket', 6, 4), x, .012, -.096, 0, 0, 0, 1, .85, .55);
    if (r.eyes === 'one' && i === (v & 1)) { zStain(head, .02, .07, x, -.03, -.112, .1); return; }   // gouged out
    const e = new THREE.Mesh(sBall(.0145, 8, 6), brute ? zRedEye : zEyeMat); e.position.set(x, .014, -.106); e.scale.z = .6; head.add(e);
    if (bl > .6) zStain(head, .012, .05, x + .004, -.025, -.111, rand(-.15, .15));
  });
  zp(head, zBox(.03, .04, .025, SK), 0, -.012, -.112, .3);
  zp(head, zBox(.018, .016, .01, 'mouth'), 0, -.03, -.124);
  zp(head, zBox(.1, .035, .06, 'gore'), 0, -.048, -.082);
  zp(head, zBox(.084, r.jaw === 'clenched' ? .04 : .075, .03, 'mouth'), 0, r.jaw === 'clenched' ? -.07 : -.086, -.094);
  for (let k = 0; k < 6; k++) zp(head, zBox(.011, .016 + Math.random() * .012, .01, 'tooth'), -.032 + k * .013, -.069, -.112, 0, 0, rand(-.25, .25));
  for (const s of [-1, 1]) if (!(r.ear && s > 0)) zp(head, zBox(.02, .04, .03, SK), s * .112, 0, .0, 0, 0, s * .2);
  if (r.ear) zp(head, zBox(.02, .03, .03, 'gore'), .108, 0, 0);
  // hair
  if (r.hair === 'clumps') for (let k = 0; k < 5; k++) { const a = rand(-1, 1); zp(head, zBox(.045, .025, .05, 'shoe'), Math.sin(a) * .1, .1 - Math.abs(a) * .02, .02 + Math.cos(a) * .04, rand(-.3, .3), a, 0); }
  else if (r.hair === 'stringy') for (let k = 0; k < 9; k++) { const a = rand(-1.4, 1.4); const h = zp(head, zBox(.014, .14 + Math.random() * .1, .014, 'shoe'), Math.sin(a) * .11, .02, .03 + Math.cos(a) * .08, rand(-.2, .3), 0, Math.sin(a) * .25); h.position.y = .04 - h.scale.y * .02; }
  else if (r.hair === 'ring') for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; if (Math.cos(a) < -.6) continue; zp(head, zBox(.04, .03, .03, 'shoe'), Math.sin(a) * .115, .03, Math.cos(a) * .11, 0, a, 0); }
  // the jaw
  const jaw = new THREE.Group(); jaw.name = 'jaw'; jaw.position.set(0, -.06, -.02);
  jaw.rotation.set(r.jaw === 'clenched' ? .05 : .38, 0, r.jaw === 'clenched' ? 0 : (v & 1 ? -.12 : .12)); head.add(jaw);
  if (r.jaw === 'gone') {
    // torn clean off: a dangling tongue and strings of gore under the top teeth
    zp(jaw, zBox(.03, .09, .015, 'gore'), 0, -.05, -.09, .3);
    for (let k = 0; k < 4; k++) zp(jaw, zBox(.008, .05 + Math.random() * .06, .008, 'gore'), -.03 + k * .02, -.04, -.08, rand(-.2, .2), 0, rand(-.3, .3));
  } else {
    zp(jaw, zBox(.098, .034, .1, 'gore'), 0, -.04, -.058);
    zp(jaw, zBox(.08, .03, .02, 'mouth'), 0, -.02, -.1);
    for (let k = 0; k < 5; k++) zp(jaw, zBox(.011, .015 + Math.random() * .01, .01, 'tooth'), -.026 + k * .013, -.018, -.105, 0, 0, rand(-.3, .3));
    for (let k = 0; k < Math.round(3 * bl); k++) zStain(jaw, .012, .05 + Math.random() * .04, -.03 + (k % 3) * .03, -.08, -.105 - (k / 3 | 0) * .002, rand(-.1, .1));
    zp(jaw, zBox(.06, .02, .05, SK), 0, -.06, -.04);
  }

  /* ----- arms ----- */
  const arms = [];
  for (const side of [-1, 1]) {
    const style = r.arms[side < 0 ? 0 : 1];
    const upper = new THREE.Group(); upper.name = 'upper' + side; upper.position.set(side * .215 * W, .55, .02); spine.add(upper);
    zp(upper, zBall(.075, bare ? SK : SH, 6, 5), 0, 0, 0);
    const elbow = new THREE.Group(); elbow.name = 'elbow' + side; elbow.position.y = -.32; upper.add(elbow);
    const wrist = new THREE.Group(); wrist.name = 'wrist' + side; wrist.position.y = -.3; elbow.add(wrist);
    const hem = () => { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + .3; zp(upper, zBox(.03, .04 + Math.random() * .05, .01, SHD), Math.cos(a) * .064, -.14, Math.sin(a) * .064, 0, -a + Math.PI / 2, rand(-.35, .35)); } };
    if (style === 'long') {
      zp(upper, zCyl(.062, .05, .32, SH), 0, -.16, 0);
      zp(elbow, zBall(.05, SHD, 6, 4), 0, 0, 0);
      zp(elbow, zCyl(.05, .042, .24, SH), 0, -.12, 0);
      zp(elbow, zCyl(.046, .046, .04, SHD), 0, -.25, 0);
      zp(elbow, zCyl(.032, .028, .06, SK), 0, -.28, 0);
      if (bl > .6) zStain(elbow, .05, .1, 0, -.15, -.046, .2);
    } else {
      if (style !== 'bare' && !bare) { zp(upper, zCyl(.066, .064, .13, SH), 0, -.06, 0); hem(); zp(upper, zCyl(.048, .04, .22, SK), 0, -.22, 0); }
      else zp(upper, zCyl(brute ? .07 : .05, .042, .32, SK), 0, -.16, 0);
      if (bl > .6) zStain(upper, .04, .12, .01, -.24, -.045, -.2);
      if (style === 'bone') {
        zp(elbow, zBall(.042, 'gore', 6, 4), 0, 0, 0);
        zp(elbow, zCyl(.016, .013, .28, 'bone', 5), -.014, -.15, 0);
        zp(elbow, zCyl(.014, .012, .28, 'bone', 5), .016, -.15, .006);
        zp(elbow, zCyl(.034, .02, .12, 'gore'), 0, -.06, 0);
        for (let k = 0; k < 3; k++) zp(elbow, zBox(.008, .08 + Math.random() * .06, .008, 'gore'), rand(-.02, .02), -.12 - k * .04, rand(-.015, .015), rand(-.3, .3), 0, rand(-.3, .3));
        zp(wrist, zBox(.05, .03, .03, 'bone'), 0, 0, 0);
      } else {
        zp(elbow, zBall(.044, SK, 6, 4), 0, 0, 0);
        zp(elbow, zCyl(.044, .032, .28, SK), 0, -.14, 0);
        if (Math.random() < .5) zp(elbow, zBox(.03, .08, .015, 'gore'), 0, -.12, -.04);    // a bite out of the forearm
      }
    }
    const handMix = style === 'bone' ? 'gore' : SK;
    zp(wrist, zBox(.07, .08, .028, handMix), 0, -.045, 0);
    zFingers(wrist, handMix, .4 + Math.random() * .4);
    wrist.rotation.x = -.45;
    arms.push({ upper, elbow, wrist });
  }

  /* ----- what makes each kind look different ----- */
  if (brute) {
    root.scale.set(1.38, 1.32, 1.38);
    zp(spine, zBox(.42, .3, .3, 'denim'), 0, .36, .0, 0, 0, 0, W, 1, 1);
    for (const x of [-.12, .12]) zp(spine, zBox(.05, .32, .32, 'denim'), x * W, .58, .01);
    for (const s of [-1, 1]) zp(spine, zBall(.09, SK, 6, 5), s * .2 * W, .6, 0, 0, 0, 0, 1.2, 1, 1);
  } else if (haz) {
    zp(head, zBall(.135, 'haz', 8, 6), 0, .015, .012);
    zp(head, zBox(.16, .1, .06, 'hazDk'), 0, -.005, -.11);
    for (const x of [-.07, .07]) zp(head, zCyl(.035, .035, .06, 'hazDk', 7), x, -.065, -.13, Math.PI / 2);
    for (const x of [-.04, .04]) { const e = new THREE.Mesh(sBall(.02, 8, 6), zEyeMat); e.position.set(x, .02, -.142); head.add(e); }
    zp(head, zBox(.11, .03, .01, 'gore'), .02, -.04, -.142, 0, 0, .3);
    zp(spine, zBox(.2, .22, .12, 'hazDk'), 0, .42, .18);
  } else if (bloat) {
    const belly = zp(spine, zIco(.3, 'bloat'), 0, .32, -.06); belly.scale.set(1.05, .95, 1.1);
    for (let k = 0; k < 7; k++) { const a = Math.random() * TAU, b = rand(-.6, .6); const pu = new THREE.Mesh(sBall(.035 + Math.random() * .03, 8, 6), zGreenGlow); pu.position.set(Math.cos(a) * .3 * Math.cos(b), .32 + Math.sin(b) * .26, -.06 + Math.sin(a) * .32 * Math.cos(b)); spine.add(pu); }
    root.scale.set(1.12, 1.05, 1.12);
  } else if (kind === 'crawler') {
    for (const L of legs) { L.knee.children.forEach(c => { c.visible = false; }); zp(L.knee, zIco(.065, 'gore'), 0, -.02, 0); zp(L.knee, zBox(.02, .07, .02, 'bone'), 0, -.06, 0); }
  } else if (Math.random() < .12) {
    // the odd one still wearing a hat
    const c = zPick([0xD9B23A, 0x223048, 0xA8432F, 0x3A3A3A]);
    zp(head, zCyl(.12, .125, .07, zMix(`hat${c}`, [[c, 6], [zDk(c, .7), 2], [ZP.blood, .4]]), 8), 0, .11, .01);
    zp(head, zBox(.14, .015, .08, zMix(`hat${c}`, [[c, 6], [zDk(c, .7), 2], [ZP.blood, .4]])), 0, .08, -.1);
  }
  if (!brute && !bloat) root.scale.set(1, r.tall, 1);
  return root;
}

/* ---------- baking: a few draw calls per zombie instead of a hundred ----------
   Each kind is built in a handful of seeded variants. Every variant's parts are merged per bone and material
   (fingers fold into the wrist, teeth into the head and jaw...), and each zombie that spawns is a cheap clone of
   one, sharing its buffers. */
const ZVARIANTS = { walker: 14, crawler: 6, brute: 4, hazmat: 5, bloater: 4 };
const zTemplates = {};
function zSeeded(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function zMergeGeos(list) {
  let n = 0;
  const parts = list.map(({ geo, m4 }) => { const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m4); n += g.attributes.position.count; return g; });
  const hasC = parts.every(g => g.attributes.color), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = hasC ? new Float32Array(n * 3) : null;
  let o = 0;
  for (const g of parts) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array.subarray(0, c * 3), o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array.subarray(0, c * 3), o * 3);
    if (col) col.set(g.attributes.color.array.subarray(0, c * 3), o * 3);
    o += c; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}
function zBake(root) {
  root.updateMatrixWorld(true);
  const bones = []; root.traverse(o => { if (o.name && !o.isMesh) bones.push(o); });
  const isBone = o => bones.includes(o);
  for (const B of bones) {
    const inv = new THREE.Matrix4().copy(B.matrixWorld).invert(), byMat = new Map(), dead = [];
    // every mesh whose nearest named ancestor is this bone (hidden ones are dropped: the crawler's lost shins)
    const walk = o => { for (const c of o.children) { if (isBone(c)) continue; if (c.isMesh) { dead.push(c); if (c.visible) { if (!byMat.has(c.material)) byMat.set(c.material, []); byMat.get(c.material).push({ geo: c.geometry, m4: new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld) }); } } else { dead.push(c); walk(c); } } };
    walk(B);
    for (const c of dead) if (c.parent === B) B.remove(c);
    for (const [m, list] of byMat) { const mesh = new THREE.Mesh(zMergeGeos(list), m); mesh.castShadow = !m.transparent; if (m.transparent) mesh.renderOrder = 2; B.add(mesh); }
  }
  return root;
}
function zTemplate(kind, v) {
  const k = kind + v; if (zTemplates[k]) return zTemplates[k];
  const old = Math.random; Math.random = zSeeded(0x2E1F0 + v * 7919 + kind.length * 104729);
  try { zTemplates[k] = zBake(zBuildDetailed(kind, v)); } finally { Math.random = old; }
  return zTemplates[k];
}
function buildZombie(kind = 'walker') {
  const T = zTemplate(kind, Math.random() * (ZVARIANTS[kind] || 4) | 0);
  const root = T.clone(true); root.rotation.order = 'YXZ'; root.scale.copy(T.scale);
  const B = n => root.getObjectByName(n);
  const legs = [-1, 1].map(s => ({ thigh: B('thigh' + s), knee: B('knee' + s) }));
  const arms = [-1, 1].map(s => ({ upper: B('upper' + s), elbow: B('elbow' + s), wrist: B('wrist' + s) }));
  const hips = B('hips'), spine = B('spine'), head = B('head'), jaw = B('jaw');
  // this one's own way of moving: head cocked, a lean, one arm reaching higher, maybe one hanging dead at its side
  const pv = { tilt: rand(-.35, .35), lean: rand(-.1, .14), reach: rand(-.25, .2), spread: rand(0, .3), stride: rand(.8, 1.2), sway: rand(.6, 1.6),
    drop: Math.random() < .28 ? (Math.random() < .5 ? 0 : 1) : -1, jawK: rand(.6, 1.5) };
  const k = kind === 'walker' || kind === 'crawler' ? rand(.95, 1.06) : 1; root.scale.multiplyScalar(k);
  return { group: root, hips, legs, spine, head, arms, jaw, kind, pv, flash: { visible: false },
    torso: spine, leftArm: arms[0].upper, rightArm: arms[1].upper, leftLeg: legs[0].thigh, rightLeg: legs[1].thigh };
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
  const pv = m.pv || { tilt: 0, lean: 0, reach: 0, spread: 0, stride: 1, sway: 1, drop: -1, jawK: 1 };
  z.walkPhase = (z.walkPhase || 0) + sp * dt * (z.runner ? 1.9 : 2.6) / pv.stride;
  const ph = z.walkPhase, limp = z.limp;
  m.spine.rotation.x = lerp(m.spine.rotation.x, -(z.runner ? .45 : .22 + pv.lean) - (z.attackT > 0 ? .25 : 0), Math.min(1, dt * 6));
  m.spine.rotation.z = Math.sin(ph * .5) * (z.runner ? .04 : .1 * pv.sway) + pv.tilt * .2;
  m.head.rotation.set(-m.spine.rotation.x * .5 + Math.sin(ph * .7) * .08, Math.sin(G.now * .7 + z.id) * .15 * pv.sway, pv.tilt + Math.sin(ph * .4 + z.id) * .2 * pv.sway);
  for (let i = 0; i < 2; i++) {
    const L = m.legs[i], s = Math.sin(ph + i * Math.PI), amt = Math.min(1, run * 2) * (i === limp ? .55 : 1);
    L.thigh.rotation.x = s * (z.runner ? .8 : .5) * amt * pv.stride;
    L.knee.rotation.x = -.1 - Math.max(0, Math.sin(ph + i * Math.PI - 1.3)) * (z.runner ? 1.3 : .7) * amt;
  }
  m.hips.position.y = .93 + Math.abs(Math.cos(ph)) * .05 * Math.min(1, run * 2);
  // the jaw hangs slack and works at the air; snaps wide on a lunge. Hands flop at the wrists.
  if (m.jaw) m.jaw.rotation.x = z.attackT > 0 ? .75 : (.34 + Math.max(0, Math.sin(G.now * 6.5 * pv.jawK + z.id * 1.7)) * .14) * pv.jawK;
  if (m.arms[0].wrist) for (let i = 0; i < 2; i++) m.arms[i].wrist.rotation.x = -.45 + Math.sin(ph * 1.1 + i * 2) * .18 - (z.attackT > 0 ? .3 : 0);
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
      if (i === pv.drop) { A.upper.rotation.set(.15 + Math.sin(ph + i * Math.PI) * .25, 0, side * .12); A.elbow.rotation.x = .1; }   // this arm hangs dead
      else { A.upper.rotation.set(1.35 + (i ? pv.reach : -pv.reach) + Math.sin(ph * .8 + i) * .12, 0, side * (.1 + pv.spread)); A.elbow.rotation.x = .15 + Math.sin(ph + i) * .08 + (i ? 0 : pv.spread * .5); }
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
