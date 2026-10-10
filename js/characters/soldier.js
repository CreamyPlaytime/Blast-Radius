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
function buildArm(parent, side, sleeve, glove) {
  const upper = new THREE.Group(); upper.position.set(side * .2, 0, 0); parent.add(upper);
  sMesh(upper, sBall(.072), sleeve);
  sMesh(upper, sCyl(.062, .053, .26), sleeve, 0, -.14, 0);
  const elbow = new THREE.Group(); elbow.position.y = -.28; upper.add(elbow);
  sMesh(elbow, sBall(.054), sleeve);
  sMesh(elbow, sCyl(.05, .042, .24), sleeve, 0, -.12, 0);
  sMesh(elbow, sCyl(.048, .048, .05), glove, 0, -.22, 0);
  sMesh(elbow, sBall(.046), glove, 0, -.27, 0);
  return { upper, elbow, sh: [side * .2, 0, 0] };
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
function buildSoldier(teamColor, gunKey, optic, atts) {
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  const tc = new THREE.Color(teamColor);
  const shade = tc.clone().multiplyScalar(.55).getHex(), light = tc.clone().lerp(new THREE.Color(0xffffff), .3).getHex();
  const pants = 0x4A4E3F, boot = 0x232421, glove = 0x2E2B26, gear = 0x3B3F33, skin = GC.skin;
  const hips = new THREE.Group(); hips.position.y = .95; root.add(hips);
  sMesh(hips, sBox(.33, .17, .22), pants, 0, -.02, 0);
  sMesh(hips, sBox(.35, .05, .24), gear, 0, .055, 0);
  sMesh(hips, sBox(.07, .08, .05), gear, .13, .02, -.12);
  const legs = [];
  for (const side of [-1, 1]) {
    const thigh = new THREE.Group(); thigh.position.set(side * .1, -.06, 0); hips.add(thigh);
    sMesh(thigh, sBall(.088), pants, 0, -.02, 0);
    sMesh(thigh, sCyl(.088, .07, .42), pants, 0, -.22, 0);
    sMesh(thigh, sBox(.05, .11, .09), gear, side * .075, -.22, -.01);
    const knee = new THREE.Group(); knee.position.y = -.44; thigh.add(knee);
    sMesh(knee, sBall(.07), gear, 0, 0, -.02);
    sMesh(knee, sCyl(.066, .054, .4), pants, 0, -.21, 0);
    sMesh(knee, sCyl(.064, .07, .1), boot, 0, -.39, 0);
    sMesh(knee, sBox(.12, .07, .25), boot, 0, -.45, -.05);
    legs.push({ thigh, knee });
  }
  const spine = new THREE.Group(); spine.position.y = .05; hips.add(spine);
  sMesh(spine, sCyl(.155, .15, .26, 12), shade, 0, .13, 0);
  const chest = sMesh(spine, sCyl(.2, .16, .36, 12), teamColor, 0, .42, 0); chest.scale.z = .72;
  sMesh(spine, sBox(.37, .29, .26), shade, 0, .4, 0);
  for (const x of [-.11, 0, .11]) { sMesh(spine, sBox(.085, .1, .05), gear, x, .31, -.155); sMesh(spine, sBox(.085, .02, .055), shade, x, .365, -.155); }
  sMesh(spine, sBox(.06, .13, .04), gear, -.13, .49, -.15);
  sMesh(spine, sBox(.37, .045, .04), light, 0, .47, -.14);
  sMesh(spine, sBox(.29, .33, .14), gear, 0, .42, .19);
  sMesh(spine, sBox(.24, .08, .1), shade, 0, .62, .2);
  sMesh(spine, sBox(.05, .14, .05), 0x222222, -.1, .66, .22);
  sMesh(spine, sCyl(.005, .005, .3, 4), 0x222222, -.1, .85, .22);
  sMesh(spine, sCyl(.11, .13, .06, 12), shade, 0, .6, 0);
  sMesh(spine, sCyl(.058, .064, .1), skin, 0, .65, 0);
  const head = new THREE.Group(); head.position.y = .77; spine.add(head);
  const skull = sMesh(head, sBall(.11, 12, 10), skin); skull.scale.set(1, 1.1, 1.05);
  sMesh(head, sBox(.17, .085, .12), 0x2B2D2A, 0, -.055, -.045);
  sMesh(head, cg('helm', () => new THREE.SphereGeometry(.138, 14, 8, 0, TAU, 0, Math.PI * .55)), shade, 0, .02, .005);
  sMesh(head, sCyl(.142, .146, .024, 14), shade, 0, .0, .005);
  sMesh(head, sBox(.08, .025, .1), light, 0, .15, .02);
  sMesh(head, sBox(.19, .045, .045), 0x1C1C1C, 0, .07, -.112);
  sMesh(head, sBox(.062, .036, .02), 0xD08A3A, -.042, .07, -.136); sMesh(head, sBox(.062, .036, .02), 0xD08A3A, .042, .07, -.136);
  sMesh(head, sBall(.042), 0x2A2A2A, -.118, -.01, 0); sMesh(head, sBall(.042), 0x2A2A2A, .118, -.01, 0);
  const aim = new THREE.Group(); aim.position.set(0, .55, 0); spine.add(aim);
  const gun = buildGun(gunKey, optic, atts || null);
  const gp = [.09, -.1, -.14]; gun.group.position.set(gp[0], gp[1], gp[2]); aim.add(gun.group);
  gun.group.traverse(o => { o.castShadow = true; });
  const armR = buildArm(aim, 1, teamColor, glove), armL = buildArm(aim, -1, teamColor, glove);
  const grip = [gp[0] + gun.grip.x, gp[1] + gun.grip.y, gp[2] + gun.grip.z];
  const fore = gun.fore ? [gp[0] + gun.fore.x - .01, gp[1] + gun.fore.y - .02, gp[2] + gun.fore.z] : [grip[0] - .05, grip[1] - .01, grip[2] - .02];
  solveArm(armR, grip, .28, .27, [.7, -1, .4]);
  solveArm(armL, fore, .28, .27, [-.9, -1, .2]);
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(.35, .35), new THREE.MeshBasicMaterial({ color: 0xFFD27A, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  flash.position.set(gp[0], gp[1] + gun.muzzleY, gp[2] + gun.muzzle - .04); flash.visible = false; aim.add(flash);
  return { group: root, hips, legs, spine, head, aim, flash, gun };
}
function nameTag(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d'); x.font = '700 34px "Saira Condensed", "Arial Narrow", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.7)'; x.strokeText(text, 128, 32); x.fillStyle = color; x.fillText(text, 128, 32);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
  s.scale.set(1.4, .35, 1); s.renderOrder = 10; return s;
}
