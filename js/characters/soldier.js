// Blast Radius \u00B7 soldier models
'use strict';

/* ================= SOLDIER MODELS ================= */
const gcache = {};
const cg = (k, f) => gcache[k] || (gcache[k] = f());
const sCyl = (rt, rb, h, seg = 9) => cg(`c${rt}_${rb}_${h}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
const sBall = (r, ws = 10, hs = 8) => cg(`s${r}_${ws}_${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
const sBox = (w, h, d) => cg(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d));
function sMesh(parent, geo, color, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
// tiny quaternion helpers for arm IK
function qFromTo(a, b) {
  let r = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + 1, x, y, z;
  if (r < 1e-6) { r = 0; if (Math.abs(a[0]) > Math.abs(a[2])) { x = -a[1]; y = a[0]; z = 0; } else { x = 0; y = -a[2]; z = a[1]; } }
  else { x = a[1] * b[2] - a[2] * b[1]; y = a[2] * b[0] - a[0] * b[2]; z = a[0] * b[1] - a[1] * b[0]; }
  const l = Math.hypot(x, y, z, r); return [x / l, y / l, z / l, r / l];
}
function qRot(q, v) {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}
const qInv = q => [-q[0], -q[1], -q[2], q[3]];
const unit = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
/* ---------- the low-poly look: few sides, flat shading, so every face reads as a plane ---------- */
const fmatCache = {};
const lace0 = () => 0x56544A;
// a team colour toned down to a uniform fabric (used by the soldiers and by your own first-person sleeves)
const uniformTone = c => new THREE.Color(c).lerp(new THREE.Color(0x4C524B), .32).multiplyScalar(.9).getHex();
const fmat = c => fmatCache[c] || (fmatCache[c] = new THREE.MeshPhongMaterial({ color: c, flatShading: true, shininess: 8, specular: 0x161616 }));
const fCyl = (rt, rb, h, seg = 6) => cg(`fc${rt}_${rb}_${h}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
const fBall = (r, d = 1) => cg(`fi${r}_${d}`, () => new THREE.IcosahedronGeometry(r, d));
function fMesh(parent, geo, color, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, fmat(color)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
// a gloved hand closed round a grip: cuff, back of the hand, knuckles, curled fingers and a thumb
function buildGlove(elbow, side, glove, dy = 0) {
  const knuckle = new THREE.Color(glove).multiplyScalar(1.35).getHex();
  fMesh(elbow, fCyl(.047, .044, .045, 7), glove, 0, -.215 + dy, 0);                                 // cuff
  fMesh(elbow, sBox(.072, .075, .036), glove, 0, -.268 + dy, .004);                                 // back of the hand
  fMesh(elbow, sBox(.074, .018, .03), knuckle, 0, -.3 + dy, .012);                                  // knuckle guard
  for (let k = 0; k < 4; k++) {
    const x = (k - 1.5) * .018;
    fMesh(elbow, sBox(.016, .03, .022), glove, x, -.318 + dy, .0);                                  // first joint, pointing on
    const tip = fMesh(elbow, sBox(.015, .028, .02), glove, x, -.33 + dy, -.022); tip.rotation.x = 1.2;   // curled back round the grip
  }
  const th = fMesh(elbow, sBox(.02, .048, .022), glove, -side * .042, -.272 + dy, -.022); th.rotation.set(-.35, 0, -side * .45);   // thumb
}
// upper arm and forearm (to the middle of the hand) lengths
const ARM_L1 = .31, ARM_L2 = .3;
function buildArm(parent, side, sleeve, glove, pad) {
  const upper = new THREE.Group(); upper.position.set(side * .2, 0, 0); parent.add(upper);
  fMesh(upper, fBall(.07, 0), sleeve);
  fMesh(upper, fCyl(.07, .058, .29), sleeve, 0, -.155, 0);
  // angular shoulder pad over the top of the arm
  const sp = fMesh(upper, sBox(.1, .11, .13), pad, side * .03, -.05, 0); sp.rotation.z = side * .25;
  fMesh(upper, sBox(.105, .018, .135), pad, side * .036, -.11, 0).rotation.z = side * .25;
  const elbow = new THREE.Group(); elbow.position.y = -ARM_L1; upper.add(elbow);
  fMesh(elbow, fBall(.055, 0), sleeve);
  fMesh(elbow, sBox(.07, .07, .05), pad, 0, -.01, .045);   // elbow pad
  fMesh(elbow, fCyl(.056, .046, .27), sleeve, 0, -.135, 0);
  buildGlove(elbow, side, glove, -.03);
  return { upper, elbow, side, sh: [side * .2, 0, 0] };
}
function solveArm(arm, target, l1, l2, pole) {
  const sh = arm.sh;
  let d = [target[0] - sh[0], target[1] - sh[1], target[2] - sh[2]];
  let dist = Math.hypot(d[0], d[1], d[2]); const dn = unit(d);
  dist = clamp(dist, .06, l1 + l2 - .003);
  const ca = clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1), sa = Math.sqrt(1 - ca * ca);
  const pd = pole[0] * dn[0] + pole[1] * dn[1] + pole[2] * dn[2];
  const pp = unit([pole[0] - dn[0] * pd, pole[1] - dn[1] * pd, pole[2] - dn[2] * pd]);
  const eDir = [dn[0] * ca + pp[0] * sa, dn[1] * ca + pp[1] * sa, dn[2] * ca + pp[2] * sa];
  const elbow = [sh[0] + eDir[0] * l1, sh[1] + eDir[1] * l1, sh[2] + eDir[2] * l1];
  const hand = [sh[0] + dn[0] * dist, sh[1] + dn[1] * dist, sh[2] + dn[2] * dist];
  const qU = qFromTo([0, -1, 0], eDir);
  const local = qRot(qInv(qU), unit([hand[0] - elbow[0], hand[1] - elbow[1], hand[2] - elbow[2]]));
  const qF = qFromTo([0, -1, 0], local);
  arm.upper.quaternion.set(qU[0], qU[1], qU[2], qU[3]);
  arm.elbow.quaternion.set(qF[0], qF[1], qF[2], qF[3]);
}
// A tactical soldier in the team's colours: helmet with goggles, plate carrier, pads, pouches and boots.
// The joints (hips, legs, spine, head, aim) sit exactly where they always have, so animation, hit boxes
// and kill cams work the same.
// a combat boot: ankle shaft with a padded collar, laced upper, rounded toe cap, heel and a lugged sole
function buildBoot(knee, boot) {
  const sole = 0x131413, lace = 0x5C5A50, cap = new THREE.Color(boot).multiplyScalar(.8).getHex();
  fMesh(knee, fCyl(.074, .076, .15, 8), boot, 0, -.37, 0);                                     // shaft round the ankle
  fMesh(knee, fCyl(.079, .079, .028, 8), cap, 0, -.295, 0);                                    // padded collar
  fMesh(knee, sBox(.118, .075, .15), boot, 0, -.445, -.06);                                    // upper over the instep
  const toe = fMesh(knee, sBox(.112, .06, .085), boot, 0, -.458, -.155); toe.rotation.x = .22;  // toe sloping down
  fMesh(knee, fCyl(.056, .058, .05, 8), cap, 0, -.474, -.19).rotation.x = Math.PI / 2;           // rounded toe cap
  fMesh(knee, sBox(.112, .055, .075), boot, 0, -.465, .045);                                   // heel
  fMesh(knee, sBox(.075, .05, .02), cap, 0, -.4, -.083);                                       // tongue
  for (let k = 0; k < 4; k++) { const l = fMesh(knee, sBox(.07, .007, .012), lace, 0, -.37 - k * .022, -.077 - k * .022); l.rotation.x = .9; }   // laces
  fMesh(knee, sBox(.128, .022, .3), sole, 0, -.497, -.065);                                    // sole
  fMesh(knee, sBox(.122, .016, .085), sole, 0, -.484, .05);                                    // heel block
  for (let k = 0; k < 3; k++) fMesh(knee, sBox(.13, .008, .02), sole, 0, -.488, -.17 + k * .05);   // tread lugs at the toe
}
function buildSoldier(teamColor, gunKey, optic, atts) {
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  root.scale.setScalar(.94);                                                                   // head and eyes level with the hit box and the player's view
  const tc = new THREE.Color(teamColor);
  const U = uniformTone(teamColor);                                                            // uniform
  const A = new THREE.Color(U).multiplyScalar(.6).getHex();                                   // armour, pads
  const H = new THREE.Color(U).multiplyScalar(.75).getHex();                                  // helmet
  const patch = tc.clone().lerp(new THREE.Color(0xffffff), .25).getHex();                     // bright team patch
  const gear = 0x2A2D2B, boot = 0x1D1F1E, glove = 0x262624, skin = GC.skin, mask = 0x34372F, lens = 0x111417, yellow = 0xE6BE3A;
  const hips = new THREE.Group(); hips.position.y = .95; root.add(hips);
  fMesh(hips, sBox(.34, .18, .24), U, 0, -.02, 0);
  fMesh(hips, sBox(.37, .055, .27), gear, 0, .055, 0);                                         // belt
  for (const x of [-.12, .12]) fMesh(hips, sBox(.07, .08, .05), gear, x, .02, -.15);           // belt pouches
  fMesh(hips, sBox(.09, .07, .05), gear, 0, .02, .155);                                        // dump pouch at the back
  const legs = [];
  for (const side of [-1, 1]) {
    const thigh = new THREE.Group(); thigh.position.set(side * .1, -.06, 0); hips.add(thigh);
    fMesh(thigh, fBall(.1, 0), U, 0, -.02, 0);
    fMesh(thigh, fCyl(.104, .08, .42), U, 0, -.22, 0);
    fMesh(thigh, sBox(.045, .12, .1), A, side * .095, -.24, -.005);                             // cargo pocket
    if (side > 0) { fMesh(thigh, sBox(.05, .15, .11), gear, .09, -.12, .0); fMesh(thigh, sBox(.012, .03, .13), gear, .09, -.02, .0); }   // drop-leg pouch
    const knee = new THREE.Group(); knee.position.y = -.44; thigh.add(knee);
    fMesh(knee, fBall(.075, 0), U, 0, 0, 0);
    const kp = fMesh(knee, sBox(.115, .12, .06), A, 0, .005, -.065); kp.rotation.x = .12;      // knee pad
    fMesh(knee, fCyl(.078, .062, .38), U, 0, -.21, 0);
    buildBoot(knee, boot);
    legs.push({ thigh, knee });
  }
  const spine = new THREE.Group(); spine.position.y = .05; hips.add(spine);
  fMesh(spine, fCyl(.16, .15, .26), U, 0, .13, 0);
  const chest = fMesh(spine, fCyl(.2, .165, .36, 8), U, 0, .42, 0); chest.scale.z = .68;
  // plate carrier: front and back plates, side straps, three mag pouches, a team patch
  fMesh(spine, sBox(.36, .34, .08), A, 0, .43, -.125);
  fMesh(spine, sBox(.34, .36, .08), A, 0, .43, .125);
  fMesh(spine, sBox(.3, .03, .085), new THREE.Color(A).multiplyScalar(.75).getHex(), 0, .6, -.125);   // top edge of the front plate
  for (const x of [-.175, .175]) fMesh(spine, sBox(.03, .2, .24), A, x, .36, 0);
  for (const x of [-.12, .12]) fMesh(spine, sBox(.07, .05, .26), A, x, .615, 0);              // shoulder straps
  for (const x of [-.105, 0, .105]) { fMesh(spine, sBox(.085, .11, .05), gear, x, .33, -.188); fMesh(spine, sBox(.09, .022, .056), A, x, .395, -.19); fMesh(spine, sBox(.03, .02, .006), lace0(), x, .395, -.219); }
  fMesh(spine, sBox(.08, .055, .01), patch, -.1, .53, -.169);                                  // team patch
  fMesh(spine, sBox(.025, .025, .012), yellow, .12, .54, -.169);
  fMesh(spine, sBox(.2, .12, .06), gear, 0, .48, .19);                                           // hydration pack / radio
  fMesh(spine, sBox(.035, .12, .03), boot, -.08, .6, .2); fMesh(spine, fCyl(.005, .005, .26, 4), boot, -.08, .78, .2);   // radio and antenna
  fMesh(spine, fCyl(.11, .13, .06, 7), U, 0, .6, 0);                                           // collar
  fMesh(spine, fCyl(.056, .062, .1, 6), mask, 0, .65, 0);                                      // neck gaiter
  const head = new THREE.Group(); head.position.y = .77; spine.add(head);
  const skull = fMesh(head, fBall(.1, 1), skin); skull.scale.set(1, 1.08, 1.02);
  // eyes sit about level with the middle of the skull; the brow above the goggles shows a strip of face
  for (const x of [-.04, .04]) fMesh(head, sBox(.05, .012, .02), new THREE.Color(skin).multiplyScalar(.8).getHex(), x, .045, -.098);   // brows
  // the mask over the mouth and nose: two angled halves meeting in a ridge, vents, and straps
  // the mask wraps round the face: a front panel, then side panels that sweep back along the cheeks to the ears
  fMesh(head, sBox(.07, .074, .026), mask, 0, -.056, -.112);
  for (const sd of [-1, 1]) {
    const h = fMesh(head, sBox(.06, .072, .024), mask, sd * .056, -.056, -.094); h.rotation.y = -sd * .6;
    const b = fMesh(head, sBox(.045, .068, .022), mask, sd * .09, -.054, -.055); b.rotation.y = -sd * 1.15;
  }
  fMesh(head, sBox(.016, .076, .012), new THREE.Color(mask).multiplyScalar(.75).getHex(), 0, -.056, -.127);   // ridge down the middle
  for (let k = 0; k < 3; k++) fMesh(head, sBox(.044, .006, .006), 0x1A1C1A, 0, -.068 - k * .013, -.127);    // vents
  fMesh(head, sBox(.13, .04, .085), mask, 0, -.096, -.065);                                     // under the chin
  for (const x of [-.099, .099]) fMesh(head, sBox(.01, .1, .014), boot, x, -.03, -.03);          // chin straps
  // helmet: a rounded faceted shell, rim, side rails, ear cups, goggles, a night-vision mount and a team light
  const hel = fMesh(head, cg('fhelm3', () => new THREE.SphereGeometry(.14, 12, 6, 0, TAU, 0, Math.PI * .5)), H, 0, .07, .008); hel.scale.set(1, .95, 1.08);
  fMesh(head, fCyl(.142, .147, .03, 12), H, 0, .066, .008);                                      // rim, just above the brow
  fMesh(head, sBox(.2, .05, .05), H, 0, .045, .136);                                             // back of the shell comes down over the neck
  for (const x of [-.141, .141]) { fMesh(head, sBox(.014, .026, .13), gear, x, .09, .005); fMesh(head, sBox(.042, .07, .085), A, x * .92, .0, .015); }   // rails, ear cups
  fMesh(head, sBox(.17, .042, .045), gear, 0, .012, -.104);                                      // goggle frame, over the eyes
  for (const x of [-.04, .04]) fMesh(head, sBox(.064, .03, .012), lens, x, .012, -.128);
  fMesh(head, sBox(.012, .03, .1), boot, -.098, .012, -.04); fMesh(head, sBox(.012, .03, .1), boot, .098, .012, -.04);   // goggle strap round the sides
  fMesh(head, sBox(.06, .04, .035), gear, 0, .17, -.11);                                         // night-vision mount
  fMesh(head, sBox(.03, .022, .012), patch, 0, .17, -.13);                                       // team light
  fMesh(head, sBox(.07, .05, .012), A, 0, .14, .148);                                            // patch on the back
  fMesh(head, sBox(.012, .035, .035), yellow, -.149, .1, .035);                                  // marker on the side
  // the aim group turns with the soldier's view; it stays level with the hips while the chest blades
  // round behind it, so its yaw (rotation order YXZ) undoes the chest's turn
  const aim = new THREE.Group(); aim.position.set(0, .55, 0); aim.rotation.order = 'YXZ'; spine.add(aim);
  const gun = buildGun(gunKey, optic, atts || null);
  // how far back the butt reaches, measured before the gun is put in a hand
  let butt = .38;
  try { const bb = new THREE.Box3().setFromObject(gun.group); if (bb.max.z > .12 && bb.max.z < .8) butt = bb.max.z; } catch (e) {}
  // other people's guns are drawn a little smaller than your own, so a soldier's arms can reach round them
  const GS = .86; gun.group.scale.setScalar(GS);
  const pistol = WEAPONS[gunKey] && WEAPONS[gunKey].type === 'pistol';
  aim.add(gun.group);
  gun.group.traverse(o => { o.castShadow = true; });
  const armR = buildArm(aim, 1, U, glove, A), armL = buildArm(aim, -1, U, glove, A);
  // where the gun sits (in the aim group, whose origin is level with the shoulders):
  //  hip  - rifles: butt tucked against the front of the vest under the right arm, muzzle low;
  //         pistols: out in front at chest height
  //  ads  - rifles: butt in the pocket of the shoulder, cheek down on the stock so the sights meet the eye;
  //         pistols: arms locked out at eye level (isosceles)
  // the eye drops and comes forward as the head goes down onto the stock, so the sight line meets the
  // player's real eye height
  const gx = gun.grip.x * GS, gy = gun.grip.y * GS, gz = gun.grip.z * GS, sightY = (gun.S || .06) * GS, B = butt * GS;
  const EYE = .232, drop = pistol ? .02 : .05;
  const hold = pistol
    ? { hip: [-gx, -.1 - gy, -.53 - gz], ads: [-gx + .01, EYE - drop - sightY - .008, -.565 - gz], pistol }
    : { hip: [.12, -.12, -.2 - B], ads: [.05, EYE - drop - sightY, -.1 - B], pistol };
  hold.drop = drop; hold.fwd = pistol ? .02 : .06; hold.tilt = pistol ? -.12 : -.3;
  // the chest turns side-on to the target with a long gun (left shoulder forward); square to it with a pistol
  hold.blade = pistol ? [0, 0] : [.22, .52];
  hold.grip = [gx, gy, gz];
  hold.fore = pistol ? [gx - .022, gy - .012, gz + .006] : gun.fore ? [(gun.fore.x - .01) * GS, (gun.fore.y - .02) * GS, gun.fore.z * GS] : [(gun.grip.x - .05) * GS, (gun.grip.y - .01) * GS, (gun.grip.z - .02) * GS];
  hold.vg = !!(gun.fore && gun.fore.kind);
  hold.muzzle = [0, gun.muzzleY * GS, (gun.muzzle - .04) * GS];
  // a fighting knife, out only for a stab
  const kn = new THREE.Group(); kn.visible = false; aim.add(kn);
  fMesh(kn, sBox(.024, .03, .1), 0x1E1F1D, 0, 0, .04);                                          // handle
  fMesh(kn, sBox(.05, .012, .014), 0x2A2C2E, 0, .004, -.01);                                     // guard
  fMesh(kn, sBox(.006, .032, .15), 0xA9AEB3, 0, .006, -.09);                                     // blade
  const tip = fMesh(kn, sBox(.006, .024, .04), 0xA9AEB3, 0, .012, -.17); tip.rotation.x = -.4;
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(.35, .35), new THREE.MeshBasicMaterial({ color: 0xFFD27A, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  flash.visible = false; aim.add(flash);
  const M = { group: root, hips, legs, spine, head, aim, flash, gun, armR, armL, hold, knife: kn };
  poseHands(M, 0, 0);
  return M;
}
// put the gun where it belongs for how far the soldier is aimed in (ads 0..1) and how far through a knife stab (mk 0..1),
// and bend the arms onto it. Only redone when either changes noticeably.
const _lp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function poseHands(m, ads, mk) {
  if (!m.hold) return;
  ads = Math.round(clamp(ads || 0, 0, 1) * 16) / 16; mk = Math.round(clamp(mk || 0, 0, 1) * 16) / 16;
  if (m._ads === ads && m._mk === mk) return;
  m._ads = ads; m._mk = mk;
  const H = m.hold, e = ads * ads * (3 - 2 * ads);
  // chest bladed, head down onto the stock
  const bl = m.blade = H.blade[0] + (H.blade[1] - H.blade[0]) * e;
  m.spine.rotation.y = -bl; m.head.rotation.y = bl;
  m.head.position.set(0, .77 - H.drop * e, -H.fwd * e);
  m.tilt = H.tilt * e;
  // the shoulders as the aim group sees them (it is turned back the other way), the right one shrugged up into the stock
  const c = Math.cos(bl) * .2, sn = Math.sin(bl) * .2;
  const shR = [c, H.pistol ? 0 : .025 * e, sn], shL = [-c, 0, -sn];
  m.armR.sh = shR; m.armR.upper.position.set(shR[0], shR[1], shR[2]);
  m.armL.sh = shL; m.armL.upper.position.set(shL[0], shL[1], shL[2]);
  let gp = _lp(H.hip, H.ads, e);
  const stab = mk > 0 ? Math.sin(Math.min(1, mk * 1.15) * Math.PI) : 0;
  if (mk > 0) gp = [gp[0] - .07, gp[1] - .12, gp[2] + .06];        // gun drops to the off hand while the knife goes in
  m.gun.group.position.set(gp[0], gp[1], gp[2]);
  m.gun.group.rotation.set(mk > 0 ? -.35 : H.pistol ? 0 : -.1 * (1 - e), 0, mk > 0 ? .3 : 0);
  m.flash.position.set(gp[0] + H.muzzle[0], gp[1] + H.muzzle[1], gp[2] + H.muzzle[2]);
  const grip = [gp[0] + H.grip[0], gp[1] + H.grip[1], gp[2] + H.grip[2]];
  let fore = [gp[0] + H.fore[0], gp[1] + H.fore[1], gp[2] + H.fore[2]];
  // a long handguard can be out of reach: the support hand then takes it further back, towards the magazine
  const R = (ARM_L1 + ARM_L2) * .985;
  if (!H.pistol && mk <= 0) {
    const dx = fore[0] - shL[0], dy = fore[1] - shL[1], dz = fore[2] - shL[2];
    if (dx * dx + dy * dy + dz * dz > R * R) {
      const q = R * R - dx * dx - dy * dy;
      const z = q > 0 ? shL[2] - Math.sqrt(q) : grip[2] - .12;
      fore = [fore[0], fore[1], Math.min(Math.max(z, fore[2]), grip[2] - .12)];
    }
  }
  let rh = grip;
  m.knife.visible = mk > 0;
  if (mk > 0) {
    rh = _lp([.16, -.06, -.2], [.06, .1, -.56], stab);                  // from the hip, up and out at the throat
    m.knife.position.set(rh[0], rh[1] + .01, rh[2]); m.knife.rotation.set(-.15 + stab * .2, .1 - stab * .15, 0);
  }
  const poleR = H.pistol ? [.6, -1, .2] : [.7, -1, .4], poleL = H.pistol ? [-.6, -1, .2] : [-.9, -1, .2];
  solveArm(m.armR, rh, ARM_L1, ARM_L2, poleR);
  solveArm(m.armL, fore, ARM_L1, ARM_L2, poleL);
}
// how far through a knife stab a soldier is (0 when not knifing), whoever runs them
function meleeProgress(e) {
  if (e === G.player) return G.meleeT > 0 ? 1 - G.meleeT / .55 : 0;
  if (e.net && !e.net.mine) { if (!(e.meleeT > 0)) { e.meleeStart = null; return 0; } if (e.meleeStart == null) e.meleeStart = G.now; return clamp((G.now - e.meleeStart) / .55, 0, 1); }
  return e.meleeT > 0 ? 1 - e.meleeT / .3 : 0;
}
function nameTag(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d'); x.font = '700 34px "Saira Condensed", "Arial Narrow", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.7)'; x.strokeText(text, 128, 32); x.fillStyle = color; x.fillText(text, 128, 32);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(1.4, .35, 1); s.renderOrder = 10; return s;
}
