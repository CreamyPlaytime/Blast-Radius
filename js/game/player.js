// Blast Radius \u00B7 the player
'use strict';

/* ================= VIEWMODEL PARTS ================= */
let vm = null;
const vmRoot = new THREE.Group(); vmScene.add(vmRoot);
// combat knife: built along -z with the handle at the origin, so the fist (makeHand 'knife') closes round it
const knife = new THREE.Group();
gBox(knife, .02, .026, .075, 0, -.001, .0, GC.black);                     // handle
for (let k = 0; k < 4; k++) gBox(knife, .022, .028, .004, 0, -.001, -.026 + k * .017, GC.dark); // grip rings
gBox(knife, .014, .046, .01, 0, .002, -.042, GC.dark);                    // cross guard
gBox(knife, .006, .028, .15, 0, .003, -.122, GC.metal);                   // blade
gBox(knife, .003, .01, .14, 0, -.009, -.118, 0xB8BCC0);                   // edge bevel
{ const tip = gBox(knife, .005, .02, .03, 0, .006, -.198, GC.metal); tip.rotation.x = -.45; }
knife.visible = false; vmScene.add(knife);
// the off hand that holds and throws grenades
const throwHand = new THREE.Group();
// the right hand that winds up and throws a throwing knife
const tkHand = new THREE.Group();
const heldItems = {};
function heldItem(type) {
  if (heldItems[type]) return heldItems[type];
  const g = new THREE.Group();
  if (type === 'tknife') {
    // slim balanced throwing knife, held by the cord-wrapped handle
    gBox(g, .012, .018, .07, 0, 0, .0, GC.black);
    for (let k = 0; k < 3; k++) gBox(g, .014, .02, .005, 0, 0, -.02 + k * .02, 0x5A4A3A);
    gBox(g, .004, .022, .13, 0, .001, -.1, GC.metal); gBox(g, .002, .008, .12, 0, -.008, -.098, 0xB8BCC0);
    const tip = gBox(g, .004, .016, .026, 0, .004, -.168, GC.metal); tip.rotation.x = -.5;
    tkHand.add(g); g.visible = false;
    return heldItems[type] = g;
  }
  else if (type === 'frag') { const b = new THREE.Mesh(new THREE.SphereGeometry(.045, 12, 10), pmat(GC.od)); g.add(b); gBox(g, .016, .05, .01, .034, .016, 0, GC.metal); gBox(g, .024, .016, .024, 0, .05, 0, GC.metal); const ring = new THREE.Mesh(new THREE.TorusGeometry(.012, .002, 5, 12), pmat(GC.metal)); ring.position.set(-.02, .06, 0); g.add(ring); g.userData.ring = ring; }
  else if (type === 'semtex') { gBox(g, .08, .045, .055, 0, 0, 0, 0xD9A441); gBox(g, .025, .018, .025, 0, .03, 0, 0xFF3020); }
  else { const c = { flash: 0x9AA1A6, smoke: 0x5F7D63, stun: 0xE7C35A }[type] || 0x9AA1A6; gCyl(g, .036, .11, 0, 0, 0, c, 12).rotation.x = 0; gBox(g, .024, .016, .024, 0, .065, 0, GC.dark); }
  g.position.set(0, .05, -.04); throwHand.add(g); g.visible = false;
  return heldItems[type] = g;
}
throwHand.visible = false; vmScene.add(throwHand);
tkHand.visible = false; vmScene.add(tkHand);
const kcVmRoot = new THREE.Group(); vmScene.add(kcVmRoot);
// spent brass, flicked out of the ejection port
const brass = [];
const brassMat = new THREE.MeshPhongMaterial({ color: GC.brass, shininess: 90, specular: 0xFFE2A0 });
const shellMat = new THREE.MeshPhongMaterial({ color: 0xB4332A, shininess: 30 });
function ejectCasing(R, shell) {
  if (!R.eject) return;
  let c = brass.find(b => !b.mesh.visible);
  if (!c) { if (brass.length > 14) c = brass[0]; else { c = { mesh: new THREE.Mesh(brassGeo, brassMat), v: new THREE.Vector3(), s: new THREE.Vector3() }; vmScene.add(c.mesh); brass.push(c); } }
  c.mesh.material = shell ? shellMat : brassMat; c.mesh.scale.setScalar(shell ? 1.9 : 1);
  R.group.updateMatrixWorld(); c.mesh.position.set(R.eject.x, R.eject.y, R.eject.z).applyMatrix4(R.group.matrixWorld);
  c.v.set(rand(.9, 1.4), rand(.7, 1.1), rand(.1, .4)); c.s.set(rand(-20, 20), rand(-20, 20), rand(-20, 20)); c.t = .55; c.mesh.visible = true;
  c.mesh.rotation.set(Math.random() * 3, 0, Math.PI / 2);
}
function updateBrass(dt) {
  for (const c of brass) {
    if (!c.mesh.visible) continue;
    c.t -= dt; if (c.t <= 0) { c.mesh.visible = false; continue; }
    c.v.y -= 6 * dt; c.mesh.position.addScaledVector(c.v, dt);
    c.mesh.rotation.x += c.s.x * dt; c.mesh.rotation.y += c.s.y * dt; c.mesh.rotation.z += c.s.z * dt;
  }
}
// laser beam and dot, drawn in the world
const laserBeam = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xFF2A1A, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
laserBeam.visible = false; scene.add(laserBeam);
const laserDot = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xFF4030, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
laserDot.scale.set(.09, .09, .09); laserDot.visible = false; scene.add(laserDot);
// grenade arc preview
const arcPts = 40;
const arcLine = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(arcPts * 3), 3)), new THREE.LineDashedMaterial({ color: 0xF2B53B, dashSize: .25, gapSize: .15, transparent: true, opacity: .8, depthWrite: false }));
arcLine.visible = false; arcLine.frustumCulled = false; scene.add(arcLine);
const arcRing = new THREE.Mesh(new THREE.RingGeometry(.35, .45, 24), new THREE.MeshBasicMaterial({ color: 0xF2B53B, transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false }));
arcRing.rotation.x = -Math.PI / 2; arcRing.visible = false; scene.add(arcRing);

// rounded first-person hands: a palm, curled fingers, a thumb, a cuff and a sleeve
const _up = new THREE.Vector3(0, 1, 0);
function limb(g, c, r0, r1, from, to, seg = 10) {
  const d = new THREE.Vector3().subVectors(to, from), L = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, seg), pmat(c));
  m.quaternion.setFromUnitVectors(_up, d.normalize()); m.position.copy(from).add(to).multiplyScalar(.5); g.add(m); return m;
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function knuckle(g, x, y, z, r = .0105) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), pmat(GC.glove)); m.position.set(x, y, z); g.add(m); return m; }
function makeHand(kind, sleeve, fit) {
  const h = new THREE.Group(), G = GC.glove;
  if (kind === 'grip') {
    // right hand round a pistol grip (grip axis = local y, raked by the caller)
    // palm on the right of the grip, a softer heel behind it and the web of the hand high on the backstrap
    const palm = knuckle(h, .021, -.004, .013, .033); palm.scale.set(.72, 1.3, 1.1);
    const heel = knuckle(h, .016, -.026, .024, .024); heel.scale.set(.9, 1.1, 1.0);
    const web = knuckle(h, .007, .026, .021, .018); web.scale.set(1.1, .8, 1.1);
    // four jointed fingers that curl round the front, getting a little smaller towards the pinky
    for (let k = 0; k < 4; k++) {
      const y = .03 - k * .0185, r = .0108 - k * .0006;
      const p0 = V3(.03, y, -.003), p1 = V3(.018, y - .002, -.03), p2 = V3(-.007, y - .004, -.032), p3 = V3(-.015, y - .005, -.02);
      limb(h, G, r, r * .97, p0, p1); limb(h, G, r * .97, r * .93, p1, p2); limb(h, G, r * .93, r * .86, p2, p3);
      knuckle(h, p0.x, p0.y, p0.z, r * 1.02); knuckle(h, p1.x, p1.y, p1.z, r * .99); knuckle(h, p2.x, p2.y, p2.z, r * .95); knuckle(h, p3.x, p3.y, p3.z, r * .86);
    }
    // thumb: from the web, down the left side, pad resting just above the fingers
    { const t0 = V3(.004, .026, .016), t1 = V3(-.014, .033, -.004), t2 = V3(-.02, .037, -.028);
      limb(h, G, .0125, .0115, t0, t1); limb(h, G, .0115, .0104, t1, t2); knuckle(h, t1.x, t1.y, t1.z, .0118); knuckle(h, t2.x, t2.y, t2.z, .0104); }
    limb(h, G, .034, .033, V3(.024, -.028, .032), V3(.04, -.055, .075), 12);
    knuckle(h, .04, -.055, .074, .033);
    // the heel of the hand wraps round the back of the grip so the backstrap never shows through the palm
    const back = knuckle(h, .004, -.006, .03, .022); back.scale.set(1.15, 1.7, .75);
    h.userData.sleeve = { m: limb(h, sleeve, .044, .05, V3(.04, -.055, .07), V3(.1, -.16, .36), 12), from: V3(.04, -.055, .07), to: V3(.1, -.16, .36) };
  } else if (kind === 'fore') {
    // left hand cupping a handguard: palm under, fingers curling up the far side, thumb along the near side.
    // fit = { w: half the handguard's width, h: its height above the palm } so the fingers wrap the outside of
    // whatever this gun has there instead of disappearing into it
    const w = fit ? fit.w : .028, hh = fit ? fit.h : .05;
    const fx = w + .0085, tipY = clamp(hh * .7, .012, .05);
    const palm = knuckle(h, .0, -.013, .0, .034); palm.scale.set(clamp((w + .01) / .034, .8, 1.5), .62, 1.3);
    for (let k = 0; k < 4; k++) {
      const z = -.03 + k * .019, r = .0108 - k * .0005, ln = k === 3 ? .8 : 1;
      const p0 = V3(w * .55, -.02, z), p1 = V3(fx, -.008, z), p2 = V3(fx, -.008 + (tipY + .008) * .6 * ln, z), p3 = V3(fx - .005, -.008 + (tipY + .008) * ln, z - .002);
      limb(h, G, r, r * .96, p0, p1); limb(h, G, r * .96, r * .92, p1, p2); limb(h, G, r * .92, r * .85, p2, p3);
      knuckle(h, p1.x, p1.y, p1.z, r * 1.02); knuckle(h, p2.x, p2.y, p2.z, r * .95); knuckle(h, p3.x, p3.y, p3.z, r * .86);
    }
    // thumb: from the heel of the palm, along the near side, pad pressed to the handguard
    { const tx = -(w + .008), t0 = V3(-w * .5, -.02, .026), t1 = V3(tx, -.006, .0), t2 = V3(tx, clamp(hh * .35, .004, .022), -.03);
      limb(h, G, .0125, .0115, t0, t1); limb(h, G, .0115, .0102, t1, t2); knuckle(h, t1.x, t1.y, t1.z, .0118); knuckle(h, t2.x, t2.y, t2.z, .0102); }
    // the heel of the hand fills the gap between palm and wrist
    { const heel = knuckle(h, -.008, -.024, .03, .026); heel.scale.set(1.1, .9, 1.1); }
    limb(h, G, .036, .034, V3(-.01, -.03, .03), V3(-.03, -.05, .08), 12);
    h.userData.sleeve = { m: limb(h, sleeve, .044, .05, V3(-.03, -.05, .075), V3(-.15, -.14, .36), 12), from: V3(-.03, -.05, .075), to: V3(-.15, -.14, .36) };
  } else if (kind === 'knife') {
    // right fist round a handle that runs along z (blade towards -z): palm on the right, fingers over the top
    // and down the left side, thumb locked across them; the forearm runs back and down towards the camera
    const palm = knuckle(h, .02, -.004, .004, .031); palm.scale.set(.75, 1.25, 1.35);
    for (let k = 0; k < 4; k++) {
      const z = -.024 + k * .016;
      limb(h, G, .0105, .0102, V3(.024, .014, z), V3(-.006, .024, z)); knuckle(h, -.007, .023, z, .0108);
      limb(h, G, .0098, .0094, V3(-.007, .023, z), V3(-.021, .002, z)); knuckle(h, -.021, .001, z, .0092);
    }
    limb(h, G, .0115, .0105, V3(.016, -.022, .022), V3(-.012, -.019, -.012)); knuckle(h, -.014, -.018, -.015, .0102);
    limb(h, G, .034, .032, V3(.022, -.008, .03), V3(.03, -.032, .085), 12);
    limb(h, sleeve, .044, .05, V3(.03, -.032, .08), V3(.07, -.13, .36), 12);
  } else {
    // left hand supporting a pistol: wraps over the right hand's fingers
    const palm = knuckle(h, -.012, -.01, .01, .032); palm.scale.set(.8, 1.3, 1.1);
    for (let k = 0; k < 4; k++) { const y = .02 - k * .018; limb(h, G, .0105, .0105, V3(-.03, y, -.03), V3(.012, y, -.044)); knuckle(h, .014, y, -.044, .0098); }
    limb(h, G, .011, .0105, V3(-.01, .03, .0), V3(.006, .036, -.04));
    limb(h, G, .034, .032, V3(-.02, -.03, .03), V3(-.05, -.06, .07), 12);
    h.userData.sleeve = { m: limb(h, sleeve, .043, .05, V3(-.05, -.06, .065), V3(-.14, -.16, .34), 12), from: V3(-.05, -.06, .065), to: V3(-.14, -.16, .34) };
  }
  return h;
}
// your own sleeves are your team's colour: Vanguard blue, or Ironside red when you're on the other side in versus
const mySleeve = () => (G.player && G.player.team === 'B' ? TEAMS.B.color : GC.sleeve);
let handSleeve = null;
function buildHands(col) {
  if (handSleeve === col) return;
  handSleeve = col;
  for (const g of [knife, tkHand, throwHand]) { const old = g.userData.hand; if (old) g.remove(old); }
  const k = makeHand('knife', col); knife.add(k); knife.userData.hand = k;
  const t = makeHand('knife', col); tkHand.add(t); tkHand.userData.hand = t;
  const th = makeHand('cup', col); th.position.set(.0, -.02, .02); th.rotation.set(-.3, 0, .2); throwHand.add(th); throwHand.userData.hand = th;
}
buildHands(GC.sleeve);
const _sw = new THREE.Vector3(), _sd = new THREE.Vector3(), _ss = new THREE.Vector3();
// each sleeve runs from its wrist back to a fixed shoulder point in view space, just behind the camera
// (worked out from the gun's resting hip pose), so however the gun tips, rolls or the hand reaches,
// the cut end of an arm is never on screen
function aimSleeve(R) {
  if (!R.sleeves) return;
  const g = R.group, live = !!g.parent;
  if (live) g.updateMatrixWorld(true);
  for (const S of R.sleeves) {
    S.hand.updateMatrix(); _sw.copy(S.from).applyMatrix4(S.hand.matrix);
    if (live) { _ss.set(S.sh[0], S.sh[1], S.sh[2]); g.worldToLocal(_ss); } else _ss.copy(S.rest);
    _sd.subVectors(_ss, _sw); const dist = _sd.length(); if (!(dist > 1e-4)) continue; _sd.divideScalar(dist);
    S.m.quaternion.setFromUnitVectors(_up, _sd);
    S.m.position.copy(_sw).addScaledVector(_sd, dist / 2);
    S.m.scale.set(1, dist / S.L0, 1);
  }
}
// measure what the off hand holds: every part crossing the line straight up through the hand's spot, starting
// near the bottom where the palm sits. Their widest half-width and their top give the hand its wrap.
const _fb = new THREE.Box3();
function foreFit(R) {
  const f = R.fore; let w = 0, top = -1e9;
  R.group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(R.group.matrixWorld).invert ? new THREE.Matrix4().copy(R.group.matrixWorld).invert() : new THREE.Matrix4().getInverse(R.group.matrixWorld);
  R.group.traverse(o => {
    if (!o.isMesh || !o.geometry || o === R.flash) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    _fb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).applyMatrix4(inv);
    if (_fb.min.x > .001 || _fb.max.x < -.001 || _fb.min.z > f.z + .01 || _fb.max.z < f.z - .01) return;
    if (_fb.max.y < f.y - .004 || _fb.min.y > f.y + .03) return;
    w = Math.max(w, Math.min(Math.abs(_fb.min.x), Math.abs(_fb.max.x), .05)); top = Math.max(top, _fb.max.y);
  });
  if (!w) return null;
  return { w: clamp(w, .012, .045), h: clamp(top - f.y + .01, .015, .08) };
}
function makeVm(w, sleeve) {
  const R = buildGun(w.key, w.optic, w.atts);
  const g = R.group;
  const rh = makeHand('grip', sleeve); rh.position.set(R.grip.x, R.grip.y, R.grip.z); rh.rotation.x = R.fore ? -.3 : -.22; g.add(rh); R.rh = rh;
  // off hand in its own group so it can reach for magazines
  const lh = new THREE.Group(); g.add(lh); R.lh = lh;
  if (R.fore) { lh.position.set(0, R.fore.y - .01, R.fore.z); lh.add(makeHand('fore', sleeve, foreFit(R))); }
  else { lh.position.set(-.005, R.grip.y - .005, R.grip.z - .006); lh.rotation.x = -.22; lh.add(makeHand('cup', sleeve)); }
  R.lhBase = lh.position.clone();
  // sleeves hang from the gun, not the hands, and stay pointed at the shoulders (see aimSleeve)
  R.sleeves = [];
  for (const [hand, part] of [[rh, rh], [lh, lh.children[0]]]) {
    const sl = part.userData.sleeve; if (!sl) continue;
    g.add(sl.m); hand.updateMatrix();
    const w0 = sl.from.clone().applyMatrix4(hand.matrix), e0 = sl.to.clone().applyMatrix4(hand.matrix);
    const dir = e0.clone().sub(w0), L0 = dir.length(); dir.normalize();
    const hip = new THREE.Vector3(.15, -.15 - R.S * .6, -(Math.max(R.rearZ, R.grip.z) + .27)), wc = w0.clone().add(hip);
    const t = dir.z > .3 ? Math.max(.3, (.2 - wc.z) / dir.z) : 1, sh = wc.clone().addScaledVector(dir, t);
    R.sleeves.push({ m: sl.m, hand, from: sl.from, L0, sh: [sh.x, sh.y, sh.z], rest: w0.clone().addScaledVector(dir, t) });
  }
  aimSleeve(R);
  if (R.mag) { const spare = R.mag.clone(); spare.position.set(0, R.magH, 0); spare.visible = false; lh.add(spare); R.spare = spare; }
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(.2, .2), new THREE.MeshBasicMaterial({ color: 0xFFD486, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  flash.position.set(0, R.muzzleY, R.muzzle - .04); flash.visible = false; g.add(flash);
  const f2 = flash.clone(); f2.rotation.y = Math.PI / 2; flash.add(f2);
  if (w.has && w.has('compensator')) flash.scale.setScalar(1.6);
  if (WEAPONS[w.key] && WEAPONS[w.key].proj) flash.scale.setScalar(2.4);
  R.flash = flash;
  R.whZ = R.warhead ? R.warhead.position.z : 0;
  R.inner = []; g.traverse(o => { if (o.userData.inner) R.inner.push(o); });
  return R;
}
function setViewmodel(w) {
  if (vm) vmRoot.remove(vm.group);
  vm = makeVm(w, mySleeve()); vmRoot.add(vm.group); buildHands(mySleeve());
  const p = G.player;
  G.swapT = .4 * (hasPerk(p, 'amped') ? .5 : 1) * (hasPerk(p, 'fasthands') ? .8 : 1); foley('raise', .5);
}
function flinch(k) {
  const p = G.player; if (!p || !p.alive) return;
  p.pitch = clamp(p.pitch + rand(.008, .022) * k, -1.5, 1.5); p.yaw += rand(-.016, .016) * k;
  G.flinchP = Math.min(.06, G.flinchP + .025 * k);
}

/* ================= AIM ASSIST (controller) ================= */
const _af = new THREE.Vector3();
function aimAssistTarget(maxAng) {
  const p = G.player, f = dirFrom(p.yaw, p.pitch, _af);
  let best = null, bestA = 1e9;
  for (const e of G.ents) {
    if (!e.alive || !isEnemy(p, e) || e.riseT > 0) continue;
    const ty = e.pos.y + (e.isDog ? .45 : e.stance === 'prone' ? .3 : e.height * .7);
    const dx = e.pos.x - camera.position.x, dy = ty - camera.position.y, dz = e.pos.z - camera.position.z, d = Math.hypot(dx, dy, dz);
    if (d > 70 || d < .5) continue;
    const ang = Math.acos(clamp((dx * f.x + dy * f.y + dz * f.z) / d, -1, 1));
    const lim = (maxAng || .05) + .55 / Math.max(d, 1);
    if (ang > lim || ang / lim >= bestA) continue;
    tmpV.set(dx / d, dy / d, dz / d);
    if (rayWorld(camera.position, tmpV, d) < d - .3 || smokeBlocks(camera.position, e.pos.x, ty, e.pos.z)) continue;
    best = { e, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)), d, k: ang / lim }; bestA = ang / lim;
  }
  return best;
}

/* ================= EQUIPMENT IN HAND ================= */
const COOK = { frag: true };
const holdKind = t => LETHALS[t] ? 'lethal' : 'tact';
function startHold(p, type) {
  const w = weapon(p);
  cancelReload(w);
  G.hold = { type, t: 0, fuse: COOK[type] ? FUSE[type] : 0, cooking: !!COOK[type], beep: 0 };
  foley('pin', .7);
  if (COOK[type]) foley('spoon', .6);
}
function releaseHold(p) {
  const H = G.hold; if (!H) return;
  if (holdKind(H.type) === 'lethal') p.lethalN--; else p.tactN--;
  G.throwType = H.type; G.throwFuse = H.cooking ? H.fuse : 0;
  G.throwT = .32 * (hasPerk(p, 'fasthands') ? .7 : 1); G.thrown = false; G.hold = null;
}
function cancelHold() { if (!G.hold) return; G.hold = null; foley('raise', .4); popup('Throw cancelled'); }
// a cooked grenade going off in your hand (or dropped when you die)
function dropHeld(p) {
  const H = G.hold; if (!H) return;
  G.hold = null;
  if (!H.cooking) return;
  if (holdKind(H.type) === 'lethal') p.lethalN--;
  const pr = { type: H.type, owner: p, pos: p.pos.clone().add(new THREE.Vector3(0, .3, 0)), vel: new THREE.Vector3(), fuse: Math.max(.05, H.fuse), mesh: nadeMesh(H.type), stuck: false, attach: null, resting: false };
  pr.mesh.position.copy(pr.pos); G.proj.push(pr); netProj(pr);
}
const _arcP = new THREE.Vector3(), _arcV = new THREE.Vector3(), _arcD = new THREE.Vector3();
// where a throwing knife will land: a dot that turns red over an enemy
const knifeMark = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(255, 255, 255), color: 0xF2B53B, transparent: true, depthTest: false, depthWrite: false }));
knifeMark.visible = false; knifeMark.renderOrder = 11; scene.add(knifeMark);
function drawArc(p, type) {
  const knifeT = type === 'tknife';
  const d = dirFrom(p.yaw, p.pitch + (knifeT ? .02 : .14), _arcD);
  _arcP.copy(camera.position); _arcV.copy(d).multiplyScalar(knifeT ? KNIFE_V : 17); _arcV.x += p.vel.x * .4; _arcV.z += p.vel.z * .4;
  const pos = arcLine.geometry.attributes.position, g = knifeT ? KNIFE_G : 17, h = knifeT ? 1 / 45 : 1 / 30;
  let n = 0, hit = false, foe = null;
  for (; n < arcPts; n++) {
    // the knife's line starts below the crosshair and closes in on it, so it never covers what you aim at
    const drop = knifeT ? .15 * Math.max(0, 1 - n / 8) : .15;
    pos.setXYZ(n, _arcP.x, _arcP.y - drop, _arcP.z);
    if (hit) continue;
    _arcV.y -= g * h;
    const L = _arcV.length() * h; _arcD.copy(_arcV).normalize();
    let t = rayWorld(_arcP, _arcD, L, true);
    if (knifeT) for (const e of G.ents) { if (!e.alive || !isEnemy(p, e)) continue; const r = rayEntity(_arcP, _arcD, e, t); if (r && r.t < t) { t = r.t; foe = e; } }
    if (t < L) { _arcP.addScaledVector(_arcD, t); hit = true; arcRing.position.set(_arcP.x, _arcP.y + .03, _arcP.z); }
    else _arcP.addScaledVector(_arcD, L);
  }
  pos.needsUpdate = true; arcLine.computeLineDistances();
  arcLine.visible = true; arcRing.visible = hit && !knifeT;
  arcLine.material.color.setHex(knifeT && foe ? 0xFF4A3A : 0xF2B53B);
  knifeMark.visible = knifeT && hit;
  if (knifeMark.visible) { const ds = clamp(camera.position.distanceTo(_arcP) * .03, .12, .8); knifeMark.position.copy(_arcP); knifeMark.scale.set(ds, ds, ds); knifeMark.material.color.setHex(foe ? 0xFF3A2A : 0xF2B53B); }
}

/* ================= THE PLAYER ================= */
function updatePlayer(dt) {
  const p = G.player, I = IN;
  if (!p.alive) {
    laserBeam.visible = laserDot.visible = arcLine.visible = arcRing.visible = knifeMark.visible = false;
    const t = G.now - p.deathT;
    p.respawnT -= dt;
    camera.position.set(p.pos.x, p.pos.y + Math.max(.35, G.eye - t * 2.4), p.pos.z);
    camera.rotation.z = Math.min(.5, t * .9);
    // zombies with friends: bled out, so watch a teammate until the next round
    if (G.zm) { zmSpectate(t); return; }
    if (I.classPick >= 0) { settings.classIdx = I.classPick; saveSettings(); renderDeathClasses(); }
    if (I.classStep) { settings.classIdx = (settings.classIdx + I.classStep + 5) % 5; saveSettings(); renderDeathClasses(); }
    $('#deathCount').textContent = `Respawning in ${Math.max(0, Math.ceil(p.respawnT))}`;
    animateDead(p);
    if (!G.ended && settings.killcam && G.myDeath && !G.myDeath.shown) {
      $('#deathCount').textContent = 'Kill cam coming up';
      if (t > 1.4) { G.myDeath.shown = true; if (startKillcam(G.myDeath, false)) return; }
    }
    if (p.respawnT <= 0 && !G.ended) { $('#death').hidden = true; camera.rotation.z = 0; spawn(p); }
    return;
  }
  let w = weapon(p);
  if (G.zm && G.zm.down > 0) {
    p.yaw = wrap(p.yaw - I.lookX * .5); p.pitch = clamp(p.pitch - I.lookY * .5, -1.2, 1.2);
    G.eye = lerp(G.eye, .45, Math.min(1, dt * 5));
    camera.position.set(p.pos.x, p.pos.y + G.eye, p.pos.z); camera.rotation.set(p.pitch, p.yaw, .25);
    laserBeam.visible = laserDot.visible = arcLine.visible = arcRing.visible = knifeMark.visible = false;
    return;
  }
  const busy = () => G.meleeT > 0 || G.throwT > 0 || !!G.hold || !!G.mantle;
  const swapTo = i => { if (p.wi !== i && p.weapons[i] && G.meleeT <= 0 && !G.hold) { cancelReload(weapon(p)); p.wi = i; w = weapon(p); setViewmodel(w); G.adsT = 0; } };
  if (I.slot >= 0) swapTo(I.slot);
  if (I.swapP && G.swapT <= 0) { if (G.hold) cancelHold(); else swapTo(1 - p.wi); }

  /* ---------- look, with controller aim assist ---------- */
  let lookK = lerp(1, w.adsFov, G.adsT) * (G.stunFx > 0 ? .35 : 1);
  const AA = settings.aimAssist, aaOn = I.padAim && AA !== 'off', aaK = AA === 'strong' ? 1.5 : 1;
  const tgt = aaOn ? aimAssistTarget(G.adsT > .5 ? .07 : .05) : null;
  if (tgt) lookK *= 1 - (.32 + .2 * G.adsT) * aaK * (1 - tgt.k * .6);
  if (G.flashFx > 0) G.flashFx -= dt;
  if (G.stunFx > 0) G.stunFx -= dt;
  p.yaw = wrap(p.yaw - I.lookX * lookK);
  p.pitch = clamp(p.pitch - I.lookY * lookK, -1.5, 1.5);
  if (tgt) {
    // rotational assist: while you or the target move, the aim is pulled along with them
    const moving = Math.hypot(I.mx, I.my) > .2 || Math.hypot(I.lookX, I.lookY) > .0005 || Math.hypot(tgt.e.vel.x, tgt.e.vel.z) > 1;
    const pull = (moving ? 3.2 : .9) * aaK * (.6 + .6 * G.adsT) * dt;
    p.yaw = wrap(p.yaw + wrap(tgt.yaw - p.yaw) * Math.min(1, pull));
    p.pitch += (tgt.pitch - p.pitch) * Math.min(1, pull * .7);
  }
  // ADS snap: tapping aim near a target pulls you onto it
  if (aaOn && I.ads && !G.adsWas) { const s = aimAssistTarget(.13); if (s) G.snap = { yaw: s.yaw, pitch: s.pitch, t: .14 }; }
  G.adsWas = I.ads;
  if (G.snap) { G.snap.t -= dt; const k = Math.min(1, dt * 14 * (AA === 'strong' ? 1.3 : .9)); p.yaw = wrap(p.yaw + wrap(G.snap.yaw - p.yaw) * k); p.pitch += (G.snap.pitch - p.pitch) * k; if (G.snap.t <= 0 || !I.ads) G.snap = null; }

  /* ---------- stance, jumping, mantling ---------- */
  if (G.slideCD > 0) G.slideCD -= dt;
  const hSpeed = Math.hypot(p.vel.x, p.vel.z);
  const setStance = st => { if (st === p.stance) return true; if (STANCE[st].h > p.height && !canStand(p, STANCE[st].h)) return false; if (st === 'prone') foley('prone', .6); p.stance = st; return true; };
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
  const tryMantle = (reach) => {
    if (G.mantle || p.stance === 'prone' || G.meleeT > 0) return false;
    const M = findMantle(p, fx, fz, reach);
    if (!M) return false;
    M.dur *= hasPerk(p, 'dexterity') ? .65 : 1;
    G.mantle = M; p.slideT = 0; cancelReload(w); G.adsT = Math.min(G.adsT, .3);
    foley('mantle', .7); rumble(.15, .3, 120);
    return true;
  };
  const startSlide = () => {
    const hs = Math.hypot(p.vel.x, p.vel.z) || 1;
    p.slideT = SLIDE_T * (hasPerk(p, 'lightweight') ? 1.15 : 1); G.slideDir = { x: p.vel.x / hs, z: p.vel.z / hs }; p.stance = 'crouch'; G.slideQueue = 0;
    foley('slideScrape', .7); rumble(.2, .4, 300);
  };
  if (!G.mantle) {
    if (I.crouchTap) {
      if (p.slideT > 0) p.slideT = 0;
      else if (G.sprinting && p.onGround && hSpeed > 5 && G.slideCD <= 0) startSlide();
      // crouch in mid-air while running: slide the moment you land
      else if (!p.onGround && hSpeed > 4.5) G.slideQueue = G.now + .7;
      else if (p.stance === 'stand') setStance('crouch');
      else if (p.stance === 'crouch') setStance('stand');
      else setStance('crouch');
    }
    if (I.proneP) { p.slideT = 0; if (p.stance === 'prone') { if (!setStance('stand')) setStance('crouch'); } else if (p.onGround) setStance('prone'); }
    if (I.jumpP) {
      if (I.my >= 0 && p.stance !== 'prone' && tryMantle(2.05)) { /* climbing */ }
      else if (p.slideT > 0) { p.slideT = 0; p.height = 1.0; if (setStance('stand') && p.onGround) p.vel.y = 6.0; }
      else if (p.stance === 'prone') setStance('crouch');
      else if (p.stance === 'crouch') setStance('stand');
      else if (p.onGround) p.vel.y = 6.3;
    }
    // jumping into a ledge while holding jump and forward climbs it
    else if (!p.onGround && I.jumpHeld && I.my > .3 && p.vel.y < 3) tryMantle(1.75);
  }
  let wx = fx * I.my + rx * I.mx, wz = fz * I.my + rz * I.mx;
  const L = Math.hypot(wx, wz); if (L > 1) { wx /= L; wz /= L; }
  if (I.ads) pad.sprintLatch = false;
  const wantSprint = I.sprint && I.my > .5 && !I.ads && !(I.fire && !w.reloading) && !busy();
  if (wantSprint && p.stance !== 'stand' && p.slideT <= 0) setStance('stand');
  const sprint = wantSprint && p.stance === 'stand' && p.slideT <= 0;
  if (G.sprinting && !sprint) G.sprintOutT = hasPerk(p, 'amped') ? .04 : .14;
  if (G.sprintOutT > 0) G.sprintOutT -= dt;
  G.sprinting = sprint;
  p.height = p.slideT > 0 ? 1.0 : STANCE[p.stance].h;
  const perkSpd = (hasPerk(p, 'lightweight') ? 1.1 : 1) * (G.stunFx > 0 ? .55 : 1);
  const wasGround = p.onGround, vyWas = p.vel.y;
  if (G.mantle) {
    if (!stepMantle(p, G.mantle, dt)) {
      G.mantle = null;
      if (!clearAt(p.pos.x, p.pos.z, p.pos.y + .05, 1.75, R * .95)) { p.stance = 'crouch'; p.height = STANCE.crouch.h; }
      else p.stance = 'stand';
    }
  } else if (p.slideT > 0) {
    p.slideT -= dt;
    const k = clamp(p.slideT / SLIDE_T, 0, 1);
    const sp = lerp(3, 10.8 * perkSpd, Math.sqrt(k));
    const sx = G.slideDir.x + wx * .35, sz = G.slideDir.z + wz * .35, sl = Math.hypot(sx, sz) || 1;
    moveEntity(p, sx / sl, sz / sl, sp, dt, 30);
    if (p.slideT <= 0) { G.slideCD = hasPerk(p, 'marathon') ? 0 : .35; p.stance = 'crouch'; p.height = STANCE.crouch.h; if (!I.crouchHeld && (I.sprint || I.my > .5)) setStance('stand'); }
  } else {
    let speed = (p.stance === 'stand' ? (sprint ? 7.4 * (hasPerk(p, 'marathon') ? 1.08 : 1) : 5.0) : STANCE[p.stance].speed) * w.d.speed * w.m.speed * perkSpd;
    speed *= lerp(1, Math.min(1, (w.optic === 'scope' ? .5 : .65) * w.m.adsMove), G.adsT);
    if (G.hold) speed *= .9;
    moveEntity(p, wx, wz, speed, dt);
  }
  if (!p.onGround) G.airT += dt; else {
    if (!wasGround && G.airT > .15) G.landT = clamp(-vyWas / 9, .3, 1);
    // a slide asked for in the air starts on touchdown, carrying the run's speed
    if (!wasGround && G.slideQueue > G.now && Math.hypot(p.vel.x, p.vel.z) > 4 && !G.mantle && p.slideT <= 0) { startSlide(); G.landT = 0; }
    G.airT = 0;
  }

  /* ---------- weapons ---------- */
  p.weapons.forEach(x => tickWeapon(p, x, dt));
  if (G.swapT > 0) G.swapT -= dt;
  if (I.reloadP) {
    if (G.hold) cancelHold();
    else if (w.reloading) { cancelReload(w); popup('Reload cancelled'); }
    else if (!G.mantle && !w.glMode) startReload(p, w);
  }
  /* ---------- underbarrel grenade launcher: B / D-pad left flips between the rifle and the launcher ---------- */
  if (G.glSwapT > 0) G.glSwapT -= dt;
  if (w.gl) {
    const gl = w.gl;
    if (gl.cd > 0) gl.cd -= dt;
    if (I.glP && !busy() && G.swapT <= 0) {
      if (!w.glMode && gl.ammo + gl.reserve <= 0) popup('Grenade launcher empty');
      else { w.glMode = !w.glMode; cancelReload(w); w.burstLeft = 0; foley('raise', .5); G.glSwapT = .22; popup(w.glMode ? 'Grenade launcher' : w.d.name); }
    }
    if (w.glMode && gl.ammo <= 0 && gl.reloadT <= 0) {
      if (gl.reserve > 0) { gl.reloadT = 1.7 * (hasPerk(p, 'fasthands') ? .75 : 1); gl.reloadDur = gl.reloadT; foley('cylOpen', .6); }
      else if (gl.cd <= 0) { w.glMode = false; G.glSwapT = .22; popup('Out of grenades'); }
    }
    if (gl.reloadT > 0) { gl.reloadT -= dt; if (gl.reloadT <= 0) { gl.ammo = 1; gl.reserve--; foley('shellsIn', .7); foley('cylClose', .6); } }
  } else w.glMode = false;
  // equipment: hold to cook / aim, release to throw, reload or swap to cancel
  if (!G.ended && !G.hold && G.throwT <= 0 && G.meleeT <= 0 && G.swapT <= 0 && !G.mantle) {
    if (I.lethalP && p.lethalN > 0) startHold(p, p.lethal);
    else if (I.tactP && p.tactN > 0 && p.tact) startHold(p, p.tact);
  }
  if (G.hold) {
    const H = G.hold; H.t += dt;
    const held = holdKind(H.type) === 'lethal' ? I.lethalHeld : I.tactHeld;
    if (H.cooking) {
      H.fuse -= dt;
      H.beep -= dt; if (H.beep <= 0) { H.beep = H.fuse < 1 ? .25 : .5; foley('tick', .45); }
      if (H.fuse <= 0) { dropHeld(p); popup('Held it too long!'); }
    }
    if (G.hold && !held && H.t > .12) releaseHold(p);
  }
  if (G.hold && G.hold.type !== 'semtex') drawArc(p, G.hold.type); else { arcLine.visible = false; arcRing.visible = false; knifeMark.visible = false; }
  if (G.throwT > 0) {
    G.throwT -= dt;
    if (!G.thrown && G.throwT < .2) { G.thrown = true; const pr = throwItem(p, G.throwType); if (pr && G.throwFuse > 0) pr.fuse = Math.max(.05, G.throwFuse); }
  }
  if (I.meleeP && G.meleeT <= 0 && G.swapT <= 0 && G.throwT <= 0 && !G.mantle) { if (G.hold) cancelHold(); G.meleeT = .55; G.meleeHit = false; cancelReload(w); foley('melee', .8); }
  if (G.meleeT > 0) { G.meleeT -= dt; if (!G.meleeHit && G.meleeT < .4) { G.meleeHit = true; tryMelee(p); } }
  if (G.zm) {
    const u = G.zm.near;
    if (I.useHeld && u && !G.useLatch && G.meleeT <= 0 && !G.hold) { G.useT += dt; if (G.useT >= (u.hold || .25)) { G.useT = 0; G.useLatch = true; zmUse(u); w = weapon(p); } }
    else G.useT = 0;
    if (!I.useHeld) G.useLatch = false;
  } else if (I.useHeld && G.nearDrop && G.meleeT <= 0 && !G.hold) { G.useT += dt; if (G.useT >= .35) { pickUp(G.nearDrop); G.useT = 0; w = weapon(p); } }
  else G.useT = 0;
  const adsTime = w.adsTime * (hasPerk(p, 'quickdraw') ? .6 : 1);
  const wantAds = I.ads && !sprint && G.swapT <= 0 && (!w.reloading || w.shellMode) && !busy();
  G.adsT = clamp(G.adsT + (wantAds ? dt : -dt * 1.3) / adsTime, 0, 1);
  if (w.glMode) {
    const gl = w.gl;
    if (I.fire && !G.firedPress && gl.ammo > 0 && gl.reloadT <= 0 && gl.cd <= 0 && !G.ended && G.swapT <= 0 && G.glSwapT <= 0 && !sprint && !busy() && G.sprintOutT <= 0) {
      gl.ammo--; gl.cd = .45;
      const spread = lerp(.035, .006, G.adsT), a = Math.random() * TAU, r = Math.sqrt(Math.random()) * spread;
      const f = dirFrom(p.yaw + Math.cos(a) * r, p.pitch + .035 + Math.sin(a) * r, new THREE.Vector3());
      fireProjectile(p, 'gl40', camera.position.clone(), f);
      playGun('gl', 1, 0, false, 0); p.lastShotT = G.now;
      for (const b of G.ents) if (b.isBot && b.alive && isEnemy(b, p) && b.pos.distanceTo(p.pos) < 26) { b.lastKnown = p.pos.clone(); b.lastKnownT = G.now; }
      p.pitch = clamp(p.pitch + .045, -1.5, 1.5); G.kick = 1; G.recoilR = Math.min(.25, G.recoilR + .1); G.recoilY = rand(-1, 1);
      rumble(.7, .5, 120);
    }
    if (I.fire) G.firedPress = true;
  } else {
  if (I.fire && w.ammo <= 0 && !w.reloading && w.cycleT <= 0 && w.burstLeft <= 0 && !busy()) { if (!G.firedPress) { foley('dry', .8); G.firedPress = true; } startReload(p, w); }
  if (I.fire && w.shellMode && w.ammo > 0 && !G.firedPress) cancelReload(w);
  const canFire = !G.ended && G.swapT <= 0 && !w.reloading && w.ammo > 0 && w.cd <= 0 && w.cycleT <= 0 && !sprint && !busy() && G.sprintOutT <= 0;
  const fireOne = () => {
    const moving = Math.hypot(p.vel.x, p.vel.z) / 5 * (hasPerk(p, 'dexterity') ? .5 : 1);
    let spread = lerp(wSpreadHip(w, p) + moving * w.d.move, w.adsS, G.adsT);
    spread *= p.stance === 'prone' ? .5 : p.stance === 'crouch' ? .8 : 1;
    if (p.slideT > 0) spread *= hasPerk(p, 'steady') ? 1 : 1.5;
    if (!p.onGround && !hasPerk(p, 'dexterity')) spread += .04;
    shoot(p, p.yaw, p.pitch, spread, 1);
    const rec = wRecoil(w) * (p.stance === 'prone' ? .6 : p.stance === 'crouch' ? .85 : 1) * (1 - G.adsT * .3);
    p.pitch = clamp(p.pitch + rec * rand(.8, 1.2), -1.5, 1.5);
    p.yaw += rec * rand(-.35, .35);
    G.kick = 1; G.recoilR = Math.min(.25, G.recoilR + rec * 4 + .02); G.recoilY = rand(-1, 1);
    const noFlash = w.has('suppressor') || w.has('flashhider');
    vm.flash.visible = !noFlash; vm.flash.rotation.z = Math.random() * 3; G.flashT = .04;
    if (!noFlash) { flashLight.intensity = 1.6; flashLight.position.copy(camera.position); }
    if (w.d.anim === 'revolver' && vm.cyl) vm.cyl.rotation.y += TAU / 6;
    if (!w.d.action && !w.d.proj && w.d.anim !== 'revolver' && w.d.anim !== 'break') ejectCasing(vm, false);
    if (w.d.proj) { G.shake = Math.max(G.shake, .35); }
    rumble(w.d.pellets > 1 || w.d.type === 'sniper' ? .6 : .25, .4, w.d.auto ? 40 : 90);
  };
  if (w.d.burst) {
    if (I.fire && !G.firedPress && canFire && w.burstLeft <= 0) w.burstLeft = w.d.burst;
    if (w.burstLeft > 0) {
      if (w.ammo <= 0 || w.reloading || busy()) w.burstLeft = 0;
      else if (w.cd <= 0 && !G.ended) { fireOne(); w.burstLeft--; if (w.burstLeft <= 0) w.cd = w.d.burstDelay; }
    }
    if (I.fire) G.firedPress = true;
  } else if (I.fire && canFire && (w.d.auto || !G.firedPress)) { fireOne(); G.firedPress = true; }
  }
  if (!I.fire) G.firedPress = false;
  // pump and bolt actions throw their case when cycled
  if (w.cycleT > 0 && !G.cycled && w.cycleT < w.d.cycle * .55) { G.cycled = true; ejectCasing(vm, w.d.action === 'pump'); }
  if (w.cycleT <= 0) G.cycled = false;

  /* ---------- health ---------- */
  const mh = p.maxHealth || 100, rec = hasPerk(p, 'recovery');
  if (p.health < mh && G.now - p.lastDmgT > (G.zm ? 3.5 : rec ? 2 : 4)) p.health = Math.min(mh, p.health + mh * (rec ? .6 : .3) * dt);
  const sp = Math.hypot(p.vel.x, p.vel.z);
  if (p.onGround && p.slideT <= 0 && p.stance === 'stand' && !G.mantle) { G.stepAcc += sp * dt; if (G.stepAcc > (sprint ? 2.6 : 2.0)) { G.stepAcc = 0; if (sp > 2.5 && !hasPerk(p, 'deadsilence')) foley('step', sprint ? .45 : .3, rand(-.15, .15)); } }

  /* ---------- camera ---------- */
  const eyeH = G.mantle ? 1.2 : p.slideT > 0 ? .85 : STANCE[p.stance].eye;
  G.eye = lerp(G.eye, eyeH, Math.min(1, dt * (p.stance === 'prone' ? 6 : 12)));
  G.bob += sp * dt * 1.9 * (p.onGround ? 1 : 0) * (p.slideT > 0 ? 0 : 1);
  const bobAmt = p.stance === 'prone' ? .02 : sprint ? .05 : .035;
  const bobY = Math.sin(G.bob * 2) * bobAmt * Math.min(1, sp / 5) * (1 - G.adsT * .85);
  G.roll = lerp(G.roll, p.slideT > 0 ? .07 : G.mantle ? -.05 : sprint ? Math.sin(G.bob) * .012 : 0, Math.min(1, dt * 8));
  G.shake = Math.max(0, G.shake - dt * 1.6);
  G.landT = Math.max(0, G.landT - dt * 3.5);
  G.flinchP = Math.max(0, G.flinchP - dt * .3);
  const sh = G.shake * G.shake, land = Math.sin(G.landT * Math.PI) * .08 * G.landT;
  camera.position.set(p.pos.x + rand(-1, 1) * sh * .06, p.pos.y + G.eye + bobY - land + rand(-1, 1) * sh * .05, p.pos.z + rand(-1, 1) * sh * .06);
  camera.rotation.set(p.pitch + rand(-1, 1) * sh * .02 - land * .3, p.yaw + rand(-1, 1) * sh * .02, G.roll + (G.stunFx > 0 ? Math.sin(G.now * 2.2) * .04 : 0));
  const fovT = settings.fov * lerp(1, w.adsFov, G.adsT) * (sprint ? 1.06 : 1) * (p.slideT > 0 ? 1.1 : 1);
  if (Math.abs(camera.fov - fovT) > .05) { camera.fov = lerp(camera.fov, fovT, Math.min(1, dt * 18)); camera.updateProjectionMatrix(); }
  const vfov = lerp(60, w.optic === 'acog' ? 40 : 48, G.adsT);
  if (Math.abs(vmCamera.fov - vfov) > .05) { vmCamera.fov = vfov; vmCamera.updateProjectionMatrix(); }
  updateViewmodel(dt, w, sp, bobY, sprint);
  updateLaser(p, w);
  updateBrass(dt);
  if (p.model) poseSoldier(p, dt, !sprint, G.meleeT > 0);
}

/* ---------- spent magazine falling out of the gun ---------- */
const ease01 = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
let magDrop = null;
function dropMag(R) {
  if (magDrop) R.group.remove(magDrop.obj);
  const obj = R.mag.clone(); obj.position.copy(R.mag.position); obj.position.y -= .07; obj.visible = true;
  R.group.add(obj); magDrop = { obj, R, v: new THREE.Vector3(.1, -.6, .25), t: .7 };
}
function updateDropMag(dt) {
  if (!magDrop) return;
  const m = magDrop; m.t -= dt; m.v.y -= 7 * dt;
  m.obj.position.addScaledVector(m.v, dt); m.obj.rotation.x += dt * 3; m.obj.rotation.z += dt * 1.5;
  if (m.t <= 0 || m.R !== vm) { m.R.group.remove(m.obj); magDrop = null; }
}

/* ---------- laser sight ---------- */
const _lo = new THREE.Vector3(), _ld = new THREE.Vector3(), _lq = new THREE.Vector3();
function updateLaser(p, w) {
  const on = w.has('laser') && vm && vm.laser && p.alive && !G.hold && G.meleeT <= 0 && !G.mantle && !(w.optic === 'scope' && G.adsT > .85);
  laserBeam.visible = laserDot.visible = on;
  if (on) drawLaserFrom(vm, p, G.adsT);
}
// used by the player and by the kill cam (which shows the killer's gun with its own laser)
function drawLaserFrom(R, owner, adsT) {
  // The gun is drawn by its own camera with a different field of view, so its 3D direction can't be used in the
  // world as-is. Instead: find where the laser's tip and the barrel's vanishing point land on screen, then build
  // the world beam from those two screen points. It then lines up with the gun exactly, however the gun is held.
  R.group.updateMatrixWorld(); camera.updateMatrixWorld();
  _lq.set(R.laser.x, R.laser.y, R.laser.z).applyMatrix4(R.group.matrixWorld);
  _ld.set(R.laser.x, R.laser.y, R.laser.z - 1000).applyMatrix4(R.group.matrixWorld);
  if (_ld.z > -.01) { laserBeam.visible = laserDot.visible = false; return; }   // gun pointing away from the screen (mid-sprint)
  laserBeam.visible = laserDot.visible = true;
  _lq.applyMatrix4(vmCamera.projectionMatrix); _ld.applyMatrix4(vmCamera.projectionMatrix);
  _lo.set(_lq.x, _lq.y, .5).unproject(camera).sub(camera.position).normalize().multiplyScalar(.55).add(camera.position);
  _ld.set(_ld.x, _ld.y, .5).unproject(camera).sub(camera.position).normalize();
  let T = rayWorld(_lo, _ld, 120);
  for (const e of G.ents) { if (!e.alive || e === owner || !e.model || !e.model.group.visible) continue; const h = rayEntity(_lo, _ld, e, T); if (h) T = h.t; }
  _lq.copy(_lo).addScaledVector(_ld, T);
  const L = _lo.distanceTo(_lq);
  laserBeam.scale.set(.005, .005, L);
  laserBeam.position.copy(_lo).lerp(_lq, .5); laserBeam.lookAt(_lq);
  laserBeam.material.opacity = .35 + .25 * (1 - adsT);
  laserDot.position.copy(_lq).addScaledVector(_ld, -.03);
  const ds = clamp(T * .012, .04, .5); laserDot.scale.set(ds, ds, ds);
}

/* ---------- viewmodel animation ---------- */
function updateViewmodel(dt, w, sp, bobY, sprint) {
  const a = G.adsT, p = G.player, I = IN;
  G.kick = Math.max(0, G.kick - dt * 14);
  G.recoilR = Math.max(0, G.recoilR - dt * (.6 + G.recoilR * 6));
  if (G.flashT > 0) { G.flashT -= dt; if (G.flashT <= 0) vm.flash.visible = false; }
  // weapon lags behind the camera when you turn
  const lagTx = clamp(-I.lookX * 1.6, -.05, .05) * (1 - a * .8), lagTy = clamp(I.lookY * 1.6, -.05, .05) * (1 - a * .8);
  G.lagX = lerp(G.lagX, lagTx, Math.min(1, dt * 10)); G.lagY = lerp(G.lagY, lagTy, Math.min(1, dt * 10));
  for (const m of vm.inner) m.visible = a < .55;   // scope tube lining: blocks the view from the hip, out of the way when aiming
  const hip = { x: .15, y: -.15 - vm.S * .6, z: -(Math.max(vm.rearZ, vm.grip.z) + .27) };   // by the grip, so guns with a forward rear sight (Kestrel) sit as far out as the rest
  const ads = { x: 0, y: -vm.S, z: -(vm.rearZ + vm.relief) };
  const sway = (1 - a) * Math.min(1, sp / 5);
  const breathe = Math.sin(G.now * 1.7) * .0025 * (1 - a * .7);
  let tiltX = 0, tiltZ = 0, dropY = 0, offX = 0;
  const lh = vm.lh;
  if (lh) { lh.position.copy(vm.lhBase); lh.rotation.set(vm.fore ? 0 : -.22, 0, 0); if (vm.spare) vm.spare.visible = false; }
  if (vm.hinge) vm.hinge.rotation.x = 0;
  if (w.reloading && !w.shellMode) {
    const r = 1 - w.reloadT / w.reloadDur, env = Math.sin(clamp(r / .92, 0, 1) * Math.PI);
    // tip the gun up and roll it so the magwell faces you
    tiltZ = -env * .75; tiltX = env * .3; dropY = -env * .12; offX = -env * .1;
    const ev = w.d.events, out = ev.find(e => e[1] === 'magOut' || e[1] === 'shellsOut'), inn = ev.find(e => e[1] === 'magIn' || e[1] === 'shellsIn');
    if (vm.mag && out && inn && w.d.anim !== 'revolver' && w.d.anim !== 'break') {
      // the old mag slides out and falls away; the off hand fetches a fresh one and seats it
      const o = out[0], i = inn[0], mid = (o + .1 + i - .14) / 2, magTop = new THREE.Vector3(0, vm.magY, vm.magZ);
      const grab = magTop.clone(); grab.y -= vm.magH;
      const away = grab.clone().add(new THREE.Vector3(-.08, -.26, .12));
      const ease = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
      let slide = 0, magVis = true, spareVis = false;
      if (lh) {
        if (r < o - .18) {}
        else if (r < o) lh.position.lerpVectors(vm.lhBase, grab, ease((r - o + .18) / .18));
        else if (r < o + .1) { slide = (r - o) / .1 * .07; lh.position.copy(grab); lh.position.y -= slide; }
        else if (r < mid) { magVis = false; lh.position.lerpVectors(grab.clone().setY(grab.y - .07), away, ease((r - o - .1) / (mid - o - .1))); }
        else if (r < i - .14) { magVis = false; spareVis = true; lh.position.lerpVectors(away, grab.clone().setY(grab.y - .07), ease((r - mid) / (i - .14 - mid))); }
        else if (r < i) { magVis = false; spareVis = true; lh.position.copy(grab); lh.position.y -= (i - r) / .14 * .07; }
        else if (r < i + .16) lh.position.lerpVectors(grab, vm.lhBase, ease((r - i) / .16));
        // tilt the hand to the mag and back smoothly from its own resting angle (snapping back made the arm jump)
        const base = vm.fore ? 0 : -.22, tk = Math.min(ease((r - o + .18) / .12), 1 - ease((r - i) / .16));
        lh.rotation.x = base + (-.25 - base) * tk;
      } else if (r >= o + .1 && r < i) magVis = false;
      vm.mag.position.y = vm.magY - slide; vm.mag.visible = magVis;
      if (vm.spare) { vm.spare.visible = spareVis; vm.spare.position.set(0, vm.magH, 0); vm.spare.rotation.copy(vm.mag.rotation); }
      if (r >= o + .1 && !w._dropped) { w._dropped = true; dropMag(vm); }
    }
    if (vm.bolt && w.reloadEmpty && w.d.emptyEv && w.d.anim !== 'lmg') {
      const f = w.d.emptyEv[0], k = Math.abs(r - f) < .07 ? 1 - Math.abs(r - f) / .07 : 0;
      if (w.d.anim === 'bolt') vm.bolt.rotation.z = k * 1.2; else vm.bolt.position.z = vm.boltZ + k * .06;
      // reach for the bolt and come back, instead of jumping there
      if (lh && w.d.anim === 'rifle') lh.position.lerp(new THREE.Vector3(vm.bolt.position.x - .02, vm.bolt.position.y + .01, vm.bolt.position.z + .03), ease01((.13 - Math.abs(r - f)) / .06));
    }
    if (w.d.anim === 'pistol' && vm.slide && w.reloadEmpty) { const f = w.d.emptyEv[0]; vm.slide.position.z = vm.slideZ + (r < f ? .035 : 0); if (lh) lh.position.lerp(new THREE.Vector3(-.01, vm.S - .01, .03), ease01((.11 - Math.abs(r - f)) / .06)); }
    if (w.d.anim === 'revolver' && vm.cyl) { const k = r > .1 && r < .86 ? 1 : 0; vm.cyl.position.x = k * .03; if (lh) lh.position.set(-.03, .0, -.02 + k * .02); }
    if (w.d.anim === 'lmg' && vm.bolt && vm.coverPivot) { const k = ease01((r - .05) / .1) * (1 - ease01((r - .78) / .1)); vm.bolt.rotation.x = k * 1.2; if (lh && r > .02 && r < .2) lh.position.set(-.02, vm.S, -.1); }
    if (w.d.anim === 'break' && vm.hinge) { const k = Math.sin(clamp((r - .08) / .84, 0, 1) * Math.PI); vm.hinge.rotation.x = k * .55; if (lh) lh.position.set(-.02, -.04 + k * .03, -.12); }
    if (w.d.anim === 'launcher' && vm.warhead) {
      // the off hand fetches a new rocket and pushes it into the front of the tube
      const fetch = ease01((r - .12) / .16), seat = ease01((r - .4) / .2), back = ease01((r - .66) / .14);
      vm.warhead.visible = r > .4;
      vm.warhead.position.z = vm.whZ - (1 - seat) * .32;
      vm.warhead.position.y = vm.muzzleY - (1 - seat) * .05;
      if (lh) {
        const tgt = new THREE.Vector3(-.01, vm.muzzleY - .05, vm.warhead.position.z - .2);
        if (r < .4) lh.position.lerpVectors(vm.lhBase, tgt.setY(vm.muzzleY - .16), fetch);
        else if (r < .66) lh.position.copy(tgt);
        else lh.position.lerpVectors(tgt, vm.lhBase, back);
      }
    }
  } else {
    w._dropped = false;
    if (vm.mag) { vm.mag.position.y = vm.magY; vm.mag.visible = true; }
    if (vm.cyl) vm.cyl.position.x = 0;
    if (w.d.anim === 'lmg' && vm.bolt && vm.coverPivot) vm.bolt.rotation.x = 0;
    if (vm.bolt && w.d.anim !== 'bolt' && w.d.anim !== 'lmg') vm.bolt.position.z = vm.boltZ;
    if (vm.warhead) { vm.warhead.visible = w.ammo > 0; vm.warhead.position.set(0, vm.muzzleY, vm.whZ); }
  }
  // the underbarrel launcher: swinging to it, and breaking it open to reload
  if (w.gl) {
    if (G.glSwapT > 0) { const k = Math.sin(G.glSwapT / .22 * Math.PI); tiltZ += k * .25; dropY += k * .03; }
    if (w.gl.reloadT > 0) { const k = Math.sin(clamp(1 - w.gl.reloadT / (w.gl.reloadDur || 1.7), 0, 1) * Math.PI); tiltZ -= k * .5; tiltX += k * .2; dropY += k * .07; if (lh) lh.position.set(vm.lhBase.x - .02, vm.lhBase.y - .06 * k, vm.lhBase.z + .06 * k); }
    if (w.glMode) { tiltX += .03; dropY -= .01; }
  }
  updateDropMag(dt);
  if (w.shellMode) {
    const k = Math.sin(clamp(w.reloadT / .48, 0, 1) * Math.PI);
    tiltZ = .3; tiltX = .12; dropY = .03 + k * .015;
    if (lh) { lh.position.set(-.01, -.07 + k * .03, .0 - k * .04); lh.rotation.x = -.3; }
  }
  if (w.cycleT > 0) {
    const k = 1 - w.cycleT / w.d.cycle, s = Math.sin(clamp((k - .15) / .7, 0, 1) * Math.PI);
    if (vm.pump) { vm.pump.position.z = vm.pumpZ + s * .08; if (lh) lh.position.z = vm.lhBase.z + s * .08; }
    if (vm.bolt && w.d.anim === 'bolt') { vm.bolt.rotation.z = Math.min(1, s * 2) * 1.2; vm.bolt.position.z = vm.boltZ + Math.max(0, s - .4) * .12; }
    tiltZ += s * .1; dropY += s * .015;
  } else {
    if (vm.pump) vm.pump.position.z = vm.pumpZ;
    if (vm.bolt && w.d.anim === 'bolt' && !(w.reloading && w.reloadEmpty)) { vm.bolt.rotation.z = 0; vm.bolt.position.z = vm.boltZ; }
  }
  if (vm.slide && !(w.reloading && w.reloadEmpty)) vm.slide.position.z = vm.slideZ + G.kick * .035 + (w.ammo === 0 ? .035 : 0);
  let mOff = 0;
  if (G.meleeT > 0) {
    // the knife comes up from the lower right, stabs forward towards the crosshair and pulls back
    const k = 1 - G.meleeT / .55, s = Math.sin(k * Math.PI), e = Math.sin(clamp(k / .45, 0, 1) * Math.PI / 2);
    mOff = s; knife.visible = true;
    knife.position.set(.2 - e * .13 + (1 - s) * .02, -.26 + s * .15, -.2 - s * .25);
    knife.rotation.set(-.1 + s * .12, .32 - e * .26, -.65 + s * .45);
  } else knife.visible = false;
  // equipment: wind up while held, then the throw
  let tDip = 0;
  for (const k in heldItems) heldItems[k].visible = false;
  throwHand.visible = false; tkHand.visible = false;
  const knifeThrow = G.hold ? G.hold.type === 'tknife' : G.throwT > 0 && G.throwType === 'tknife';
  if (G.hold) {
    const H = G.hold, k = clamp(H.t / .18, 0, 1);
    tDip = (knifeThrow ? .4 : .3) * k; heldItem(H.type).visible = true;
    const ring = heldItem(H.type).userData.ring; if (ring) ring.visible = !H.cooking;
    const shake = H.cooking && H.fuse < 1 ? Math.sin(G.now * 50) * .004 : 0;
    if (knifeThrow) {
      // overhand: the knife is drawn back beside the head, blade up
      tkHand.visible = true;
      tkHand.position.set(.17, -.2 + k * .12, -.24 + k * .05); tkHand.rotation.set(.15 + k * .85, .15, -.2 - k * .1);
    } else { throwHand.visible = true; throwHand.position.set(-.05 + shake, -.18 + k * .12, -.2 + k * .06); throwHand.rotation.set(-1.0 * k + .2, 0, .25); }
  } else if (G.throwT > 0) {
    const k = 1 - G.throwT / .32, s = Math.sin(k * Math.PI);
    tDip = (knifeThrow ? .4 : .3) * (1 - k * .5); if (!G.thrown) heldItem(G.throwType).visible = true;
    if (knifeThrow) {
      // whip forward and down past the crosshair
      tkHand.visible = true;
      tkHand.position.set(.17 - k * .1, -.08 - k * .1 + s * .02, -.19 - k * .26); tkHand.rotation.set(1.0 - k * 1.7, .15 - k * .2, -.3 + k * .15);
    } else { throwHand.visible = true; throwHand.position.set(-.05 + k * .12, -.06 + s * .05, -.14 - k * .35); throwHand.rotation.set(-1.0 + k * 1.6, 0, .25 - k * .2); }
  }
  const swapDip = (G.swapT > 0 ? G.swapT * .9 : 0) + tDip + (G.mantle ? .18 : 0);
  const slide = p.slideT > 0 ? 1 : 0;
  const air = clamp(G.airT * 3, 0, 1) * (1 - a * .7), land = Math.sin(G.landT * Math.PI) * G.landT * .05;
  const sprintK = sprint ? 1 : 0;
  const px = lerp(hip.x, ads.x, a) + Math.sin(G.bob) * .012 * sway * (1 + sprintK * 1.5) - sprintK * .06 + offX + mOff * .1 + G.lagX;
  const py = lerp(hip.y, ads.y, a) + bobY * .5 - swapDip - dropY - sprintK * .06 - mOff * .2 - slide * .02 + breathe + air * .02 - land + G.lagY - (G.recoilR * .05 * (1 - a));
  const pz = lerp(hip.z, ads.z, a) + G.kick * (a > .5 ? .025 : .05) + G.recoilR * .06;
  vm.group.position.set(px, py, pz);
  const rx = G.kick * .05 * (1 - a * .6) + G.recoilR * (1 - a * .7) * .6 + tiltX - sprintK * (.25 + Math.abs(Math.sin(G.bob)) * .06) - G.lagY * 1.5 - air * .06 + land * 1.2;
  const ry = sprintK * .7 + G.lagX * 2.5 + (G.mantle ? -.4 : 0);
  const rz = tiltZ + sprintK * (.25 + Math.sin(G.bob) * .08) + slide * .15 + G.recoilR * G.recoilY * .15 * (1 - a) + G.lagX * 1.5 + (G.mantle ? .5 : 0);
  vm.group.rotation.set(rx, ry, rz);
  aimSleeve(vm);
}
