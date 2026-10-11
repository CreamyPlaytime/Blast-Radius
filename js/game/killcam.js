// Blast Radius \u00B7 kill cams and the match ending
'use strict';

/* ================= REPLAYS: KILL CAMS ================= */
const REC = 32;
const EQ_TYPES = ['frag', 'semtex', 'tknife', 'flash', 'stun', 'smoke'];
function writePose(e, d, o) {
  const m = e.model;
  if (!m) { d.fill(0, o, o + REC); return; }
  const g = m.group;
  d[o] = g.position.x; d[o + 1] = g.position.y; d[o + 2] = g.position.z; d[o + 3] = g.rotation.y; d[o + 4] = g.rotation.x;
  d[o + 5] = e.isBot ? (NET.on ? ((e.alive || G.now - e.deathT < 3.1) ? 1 : 0) : (g.visible ? 1 : 0)) : ((e.alive || G.now - e.deathT < 2.4) ? 1 : 0);
  d[o + 6] = m.hips.position.y; d[o + 7] = m.spine.rotation.x; d[o + 8] = m.head.rotation.x;
  d[o + 9] = m.aim.rotation.x; d[o + 10] = m.aim.rotation.y; d[o + 11] = m.aim.rotation.z;
  d[o + 12] = m.legs[0].thigh.rotation.x; d[o + 13] = m.legs[0].knee.rotation.x; d[o + 14] = m.legs[1].thigh.rotation.x; d[o + 15] = m.legs[1].knee.rotation.x;
  d[o + 16] = e.pos.x; d[o + 17] = e.pos.y; d[o + 18] = e.pos.z;
  d[o + 19] = e.isBot ? (e.stance === 'prone' ? .4 : e.height - .2) : G.eye;
  d[o + 20] = e.pitch; d[o + 21] = e.yaw;
  d[o + 22] = e.isBot ? (e.adsK || 0) : G.adsT;
  const w = e.weapons && e.weapons[e.wi];
  d[o + 23] = e.isBot ? (e.sprinting ? 1 : 0) : (G.sprinting ? 1 : 0);
  d[o + 24] = e.net && !e.net.mine && e.rlProg !== undefined ? e.rlProg : w && w.reloading && !w.shellMode ? 1 - w.reloadT / w.reloadDur : -1;
  d[o + 25] = Math.hypot(e.vel.x, e.vel.z);
  d[o + 26] = e.isZombie ? 0 : meleeProgress(e);                     // how far through a knife stab
  d[o + 27] = m._ads || 0;                                              // how far the model's gun is raised
  // your own equipment in hand: wound up and aiming (hold), then the throw, so kill cams can replay it
  // friends' windows send theirs along with their position (e.eqH and the rest, from net.js)
  const me = e === G.player, H = me && G.hold, thr = me && !H && G.throwT > 0;
  if (me) {
    d[o + 28] = H ? clamp(H.t / .18, 0, 1) : -1;
    d[o + 29] = thr ? clamp(1 - G.throwT / .32, 0, 1) : -1;
    d[o + 30] = H ? EQ_TYPES.indexOf(H.type) : thr ? EQ_TYPES.indexOf(G.throwType) : -1;
    d[o + 31] = thr && G.thrown ? 1 : 0;
  } else if (e.human && e.alive && e.eqY >= 0) { d[o + 28] = e.eqH; d[o + 29] = e.eqT; d[o + 30] = e.eqY; d[o + 31] = e.eqR ? 1 : 0; }
  else { d[o + 28] = -1; d[o + 29] = -1; d[o + 30] = -1; d[o + 31] = 0; }
}
function readPose(e, d, o, show) {
  const m = e.model; if (!m) return;
  m.group.position.set(d[o], d[o + 1], d[o + 2]); m.group.rotation.set(d[o + 4], d[o + 3], 0);
  m.group.visible = show && d[o + 5] > .5;
  m.hips.position.y = d[o + 6]; m.spine.rotation.x = d[o + 7]; m.head.rotation.x = d[o + 8];
  m.aim.rotation.set(d[o + 9], d[o + 10], d[o + 11]);
  m.legs[0].thigh.rotation.x = d[o + 12]; m.legs[0].knee.rotation.x = d[o + 13]; m.legs[1].thigh.rotation.x = d[o + 14]; m.legs[1].knee.rotation.x = d[o + 15];
  if (m.hold) poseHands(m, d[o + 27], d[o + 26]);                     // gun raised or lowered, knife out
}
function snapPoses() {
  const n = G.ents.length, d = new Float32Array(n * REC), ix = new Map();
  for (let i = 0; i < n; i++) { writePose(G.ents[i], d, i * REC); ix.set(G.ents[i].id, i * REC); }
  return { d, ix };
}
function recordFrame() {
  if (G.kc && G.kc.clip) return;   // playing a saved final-kill clip: the match is over, nothing new to record
  const { d, ix } = snapPoses();
  const pr = [];
  for (const p of G.proj) pr.push(p.type, p.pos.x, p.pos.y, p.pos.z, p.mesh.rotation.x, p.mesh.rotation.y, p.mesh.rotation.z);
  G.rec.push({ t: G.now, d, ix, pr });
  // keep 7 seconds; a replay playing right now (with friends, recording carries on under it) keeps its place
  const K = G.kc, keep = Math.min(G.now - 7, K ? K.t - 1 : Infinity);
  while (G.rec.length && G.rec[0].t < keep) { G.rec.shift(); if (K && K.fi > 0) K.fi--; }
  while (G.events.length && G.events[0].t < keep) { G.events.shift(); if (K && K.ei > 0) K.ei--; }
  // the live buffer only holds 7 seconds, so once the newest kill's replay is complete, save a copy of it.
  // That way the final kill cam can still play however long ago the last kill was when the match ends.
  const LK = G.lastKill;
  if (LK && (!G.finalClip || G.finalClip.kill !== LK) && G.now >= LK.t + 2.1) {
    const t0 = LK.t - 4.6;
    G.finalClip = { kill: LK, rec: G.rec.filter(f => f.t >= t0 && f.t <= LK.t + 2.6), events: G.events.filter(ev => ev.t >= t0 && ev.t <= LK.t + 2.6) };
  }
}
function camSound(x, z) {
  const dx = x - camera.position.x, dz = z - camera.position.z, d = Math.hypot(dx, dz), yaw = camera.rotation.y;
  return { d, pan: d > .1 ? (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / d * .8 : 0 };
}
function explodeFx(type, x, y, z) {
  const { d, pan } = camSound(x, z);
  const play = (n, v, r) => { if (!AC || d > r) return; FOLEY[n](AC.currentTime + d / 343, outChain(v * clamp(1 - d / r, .05, 1), pan, .35, lerp(16000, 1800, clamp(d / r, 0, 1)))); };
  if (BLAST[type]) { boomFx(type, x, y, z); flashLight.position.set(x, y + 1, z); flashLight.intensity = 6 * BLAST[type].fx; play('boom', 1.2, 140); } else if (type === 'flash') { puff(x, y + .4, z, softTex(255, 255, 240), .5, 6, .25, 1); flashLight.position.set(x, y + 1, z); flashLight.intensity = 8; play('bang', 1.1, 120); }
  else if (type === 'stun') { puff(x, y + .4, z, softTex(150, 190, 255), .5, 4.5, .4, .9); play('zap', 1, 80); }
  else if (type === 'smoke') {
    for (let k = 0; k < 26; k++) { const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * 3.3; puff(x + Math.cos(a) * rr, .3 + Math.random() * 2.8, z + Math.sin(a) * rr, softTex(205, 205, 198), .6, rand(3.4, 4.8), 8, .92, .02, 2.5, 1.6); }
    play('hiss', .8, 40);
  }
}
// final kill cam: play from the saved copy of the last kill when there is one
function startKillcam(kill, final) {
  const clip = final && kill && G.finalClip && G.finalClip.kill === kill && G.finalClip.rec.length ? G.finalClip : null;
  if (!clip) return playKillcam(kill, final);
  const liveRec = G.rec, liveEv = G.events;
  G.rec = clip.rec.slice(); G.events = clip.events.slice();
  if (playKillcam(kill, final)) { G.kc.clip = { rec: liveRec, events: liveEv }; return true; }
  G.rec = liveRec; G.events = liveEv;
  return playKillcam(kill, final);
}
function playKillcam(kill, final) {
  if (!kill || !G.rec.length) return false;
  const killer = G.ents.find(e => e.id === kill.killer);
  const first = G.rec[0].t, lastT = G.rec[G.rec.length - 1].t;
  if (!killer || kill.t < first + .5) return false;
  let t0 = Math.max(first, kill.t - 4.2);
  const t1 = Math.min(lastT + (NET.on ? 1.9 : 0), kill.t + (final ? 1.9 : 1.3));
  // start from the killer's first moment in the recording (with friends, a soldier can appear partway through)
  { let f0 = 0; while (f0 < G.rec.length - 1 && G.rec[f0 + 1].t <= t0) f0++; while (f0 < G.rec.length && !G.rec[f0].ix.has(kill.killer)) f0++; if (f0 >= G.rec.length || G.rec[f0].t > kill.t - .8) return false; t0 = Math.max(t0, G.rec[f0].t); }
  const saved = snapPoses();
  for (const p of G.proj) p.mesh.visible = false;
  const sleeve = killer === G.player ? mySleeve() : G.mode === 'ffa' ? 0xD9773F : TEAMS[killer.team].color;
  buildHands(sleeve);   // throwing and knife hands in the killer's sleeve colour
  const R = makeVm(Object.assign({ has: k => (kill.w.atts || []).includes(k) }, kill.w), sleeve); kcVmRoot.add(R.group);
  vmRoot.visible = false; knife.visible = false; throwHand.visible = false; tkHand.visible = false; for (const c of brass) c.mesh.visible = false; if (magDrop) { magDrop.R.group.remove(magDrop.obj); magDrop = null; } laserBeam.visible = laserDot.visible = arcLine.visible = arcRing.visible = knifeMark.visible = false;
  let fi = 0; while (fi < G.rec.length - 1 && G.rec[fi + 1].t <= t0) fi++;
  let ei = G.events.findIndex(ev => ev.t >= t0); if (ei < 0) ei = G.events.length;
  G.kc = { kill, final, kid: killer.id, t: t0, t0, t1, saved, vm: R, fi, ei, kick: 0, flashT: 0, aimY: 0, aimP: 0, bob: 0, cur: new Float32Array(REC), kp: new Float32Array(REC), mflash: new Map(), pool: {}, state: G.state, throwT: 0, throwType: null, tDip: 0, botKiller: killer.isBot && !killer.human, seenThrow: new Set(), tkPrev: [] };
  G.state = final ? 'finalcam' : 'killcam';
  G.flashFx = 0; G.stunFx = 0; G.shake = 0;
  const you = killer === G.player;
  $('#killcam').classList.toggle('final', final);
  $('#kcTitle').textContent = final ? 'Final kill cam' : 'Kill cam';
  $('#kcName').innerHTML = `<span class="${teamCss(killer)}">${you ? 'You' : esc(kill.name)}</span>`;
  const vic = kill.victim === G.player.id ? 'you' : esc(kill.vname);
  $('#kcSub').textContent = `${WEAPONS[kill.wkey].name} \u00B7 killed ${vic}${kill.head ? ' \u00B7 headshot' : ''}`;
  $('#kcSkip').textContent = `${inputMode === 'pad' ? 'A' : 'Space'} to skip`;
  $('#kcClasses').hidden = final;
  if (!final) renderDeathClasses();
  $('#killcam').hidden = false; $('#hud').classList.add('kc'); $('#death').hidden = true;
  return true;
}
function kcEvent(ev) {
  const K = G.kc;
  if (ev.k === 'shot') {
    if (ev.id === K.kid) {
      K.kick = 1; if (!ev.supp) { K.vm.flash.visible = true; K.vm.flash.rotation.z = Math.random() * 3; K.flashT = .045; flashLight.intensity = 1.6; flashLight.position.copy(camera.position); }
      // ease the camera onto where the shot actually went, so the killer is seen aiming at you
      const ex = ev.x - camera.position.x, ey = ev.y - camera.position.y, ez = ev.z - camera.position.z;
      const sy = Math.atan2(-ex, -ez), sp = Math.atan2(ey, Math.hypot(ex, ez));
      K.aimY = clamp(wrap(sy - (camera.rotation.y - K.aimY)), -.12, .12); K.aimP = clamp(sp - (camera.rotation.x - K.aimP), -.12, .12);
      const f = dirFrom(camera.rotation.y, camera.rotation.x, new THREE.Vector3());
      const mo = vmMuzzleWorld(K.vm, new THREE.Vector3());
      if (mo) tracer(mo.x, mo.y, mo.z, ev.x, ev.y, ev.z);
      else tracer(camera.position.x + f.x * .5 + Math.cos(camera.rotation.y) * .15, camera.position.y + f.y * .5 - .12, camera.position.z + f.z * .5 - Math.sin(camera.rotation.y) * .15, ev.x, ev.y, ev.z);
      playGun(ev.snd, 1, 0, ev.supp, 0);
    } else {
      const sh = G.ents.find(e => e.id === ev.id), F = G.rec[K.fi], o = F.ix.get(ev.id);
      if (!sh || o === undefined) return;
      const ex = F.d[o + 16], ey = F.d[o + 17] + F.d[o + 19], ez = F.d[o + 18];
      const f = dirFrom(F.d[o + 21], F.d[o + 20], new THREE.Vector3());
      const mo = sh.model && sh.model.group.visible ? sh.model.flash.getWorldPosition(new THREE.Vector3()) : null;
      if (mo && Number.isFinite(mo.x) && Math.hypot(mo.x - ex, mo.y - ey, mo.z - ez) < 2.2) tracer(mo.x, mo.y, mo.z, ev.x, ev.y, ev.z);
      else tracer(ex + f.x * .7, ey + f.y * .7 - .12, ez + f.z * .7, ev.x, ev.y, ev.z);
      if (sh.model && !ev.supp) { sh.model.flash.visible = true; sh.model.flash.rotation.z = Math.random() * 3; K.mflash.set(sh.model, .05); }
      const { d, pan } = camSound(ex, ez);
      playGun(ev.snd, .9 * clamp(1 - d / 90, .05, 1), pan, ev.supp, d);
    }
    burst(ev.x, ev.y, ev.z, 'wall', 2);
  } else if (ev.k === 'hit') {
    if (ev.id === K.kid) { hitmarker(ev.kill); sndHit(ev.head, ev.kill); }
  } else if (ev.k === 'boom') explodeFx(ev.type, ev.x, ev.y, ev.z);
}
function updateKillcam(dt) {
  const K = G.kc;
  const rate = K.final && Math.abs(K.t - K.kill.t) < .45 ? .3 : 1;
  K.t = Math.min(K.t1, K.t + dt * rate);
  while (K.fi < G.rec.length - 1 && G.rec[K.fi + 1].t <= K.t) K.fi++;
  const F = G.rec[K.fi], F2 = G.rec[Math.min(G.rec.length - 1, K.fi + 1)];
  // blend between recorded frames so the replay is smooth (each soldier found by id: with friends the list changes)
  const u = F2 !== F && F2.t > F.t ? clamp((K.t - F.t) / (F2.t - F.t), 0, 1) : 0;
  const blendInto = (out, id) => {
    const o0 = F.ix.get(id); if (o0 === undefined) return false;
    const o1 = F2.ix.has(id) ? F2.ix.get(id) : o0, D2 = F2.ix.has(id) ? F2.d : F.d;
    for (let r = 0; r < REC; r++) { const x0 = F.d[o0 + r], x1 = D2[o1 + r]; out[r] = (r === 3 || r === 21) ? x0 + wrap(x1 - x0) * u : (r === 5 || r >= 30 || ((r === 28 || r === 29) && (x0 < 0 || x1 < 0 || x1 < x0 - .5))) ? x0 : x0 + (x1 - x0) * u; }
    return true;
  };
  for (const e of G.ents) { if (!e.model) continue; if (blendInto(K.cur, e.id)) readPose(e, K.cur, 0, e.id !== K.kid); else e.model.group.visible = false; }
  const d = K.kp, o = 0;
  if (!blendInto(d, K.kid)) { endKillcam(); return; }
  for (const [m, tt] of K.mflash) { const n = tt - dt * rate; if (n <= 0) { m.flash.visible = false; K.mflash.delete(m); } else K.mflash.set(m, n); }
  // projectiles at this moment of the replay
  const used = {};
  for (let k = 0; k < F.pr.length; k += 7) {
    const type = F.pr[k], list = K.pool[type] || (K.pool[type] = []), u = used[type] = (used[type] || 0) + 1;
    if (list.length < u) {
      const nm = nadeMesh(type);
      if (type === 'tknife') {
        // a throwing knife is a thin sliver flying away fast: show it bigger, with a glowing trail behind it
        nm.scale.setScalar(2.2);
        const tr = new THREE.Mesh(new THREE.BoxGeometry(.014, .014, .42), new THREE.MeshBasicMaterial({ color: 0xFFF0D0, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false }));
        tr.position.z = .32; tr.visible = false; nm.add(tr); nm.userData.trail = tr;
      }
      list.push(nm);
    }
    const mm = list[u - 1]; mm.visible = true; mm.position.set(F.pr[k + 1], F.pr[k + 2], F.pr[k + 3]); mm.rotation.set(F.pr[k + 4], F.pr[k + 5], F.pr[k + 6]);
    if (type === 'tknife') {   // trail only while it's flying, not once it's stuck in a wall
      // compared frame to frame of the recording (in slow motion several screen frames show the same recorded frame)
      const pv = K.tkPrev[u - 1], x = mm.position.x, y = mm.position.y, z = mm.position.z;
      if (!pv || pv.fi !== K.fi) { const vis = !!pv && Math.hypot(x - pv.x, y - pv.y, z - pv.z) > .004; K.tkPrev[u - 1] = { x, y, z, fi: K.fi, vis }; }
      mm.userData.trail.visible = K.tkPrev[u - 1].vis;
    }
  }
  for (let j = used.tknife || 0; j < K.tkPrev.length; j++) K.tkPrev[j] = null;
  for (const type in K.pool) K.pool[type].forEach((mm, i) => { if (i >= (used[type] || 0)) mm.visible = false; });
  // killer's eyes
  K.aimY *= Math.exp(-dt * rate * 6); K.aimP *= Math.exp(-dt * rate * 6);
  camera.position.set(d[o + 16], d[o + 17] + d[o + 19], d[o + 18]);
  camera.rotation.set(d[o + 20] + K.aimP, d[o + 21] + K.aimY, 0);
  while (K.ei < G.events.length && G.events[K.ei].t <= K.t) { kcEvent(G.events[K.ei]); K.ei++; }
  const a = d[o + 22], R = K.vm, wd = WEAPONS[K.kill.w.key], spr = d[o + 23], rl = d[o + 24], spd = d[o + 25], mk = d[o + 26];
  // a knife kill: the killer's knife comes up from the lower right and stabs forward, the gun dips out of the way
  if (mk > 0) {
    const s = Math.sin(mk * Math.PI), e = Math.sin(clamp(mk / .45, 0, 1) * Math.PI / 2);
    knife.visible = true; knife.position.set(.2 - e * .13 + (1 - s) * .02, -.26 + s * .15, -.2 - s * .25); knife.rotation.set(-.1 + s * .12, .32 - e * .26, -.65 + s * .45);
  } else knife.visible = false;
  K.knifeDip = mk > 0 ? Math.sin(mk * Math.PI) : 0;
  // the killer's throws (grenades and throwing knives): wind up just before the throw, whip through after it
  for (let j = K.ei; j < G.events.length && G.events[j].t <= K.t + .12; j++) {
    const ev = G.events[j];
    if (ev.k === 'throw' && ev.id === K.kid && !K.seenThrow.has(ev)) { K.seenThrow.add(ev); K.throwT = .32 * Math.min(1, .62 + Math.max(0, ev.t - K.t) / .32); K.throwType = ev.type; }
  }
  for (const k in heldItems) heldItems[k].visible = false;
  throwHand.visible = false; tkHand.visible = false; K.tDip = 0;
  const hk = d[o + 28], tk = d[o + 29], ht = EQ_TYPES[Math.round(d[o + 30])];
  if (ht && hk >= 0) {
    // the killer held it: wound up beside the head (a knife) or out in the off hand (a grenade), aiming
    const kt = ht === 'tknife'; K.throwT = 0;
    K.tDip = (kt ? .4 : .3) * hk; heldItem(ht).visible = true;
    if (kt) { tkHand.visible = true; tkHand.position.set(.15 + hk * .02, -.22 + hk * .04, -.25 + hk * .04); tkHand.rotation.set(.3 + hk * 1.05, .1 + hk * .15, .1 + hk * .42); }
    else { throwHand.visible = true; throwHand.position.set(-.05, -.18 + hk * .12, -.2 + hk * .06); throwHand.rotation.set(-1.0 * hk + .2, 0, .25); }
  } else if (ht && tk >= 0) {
    // the recorded throw itself
    const kt = ht === 'tknife', s = Math.sin(tk * Math.PI); K.throwT = 0;
    K.tDip = (kt ? .4 : .3) * (1 - tk * .5); if (d[o + 31] < .5) heldItem(ht).visible = true;
    if (kt) { tkHand.visible = true; tkHand.position.set(.17 - tk * .1, -.18 - tk * .04 + s * .04, -.21 - tk * .22); tkHand.rotation.set(1.35 - tk * 1.9, .25 - tk * .25, .52 - tk * .4); }
    else { throwHand.visible = true; throwHand.position.set(-.05 + tk * .12, -.06 + s * .05, -.14 - tk * .35); throwHand.rotation.set(-1.0 + tk * 1.6, 0, .25 - tk * .2); }
  } else if (K.throwT > 0 && K.throwType && K.botKiller) {   // bots throw in one motion: no recorded hold
    K.throwT = Math.max(0, K.throwT - dt * rate);
    const k = clamp(1 - K.throwT / .32, 0, 1), s = Math.sin(k * Math.PI), kt = K.throwType === 'tknife';
    K.tDip = (kt ? .4 : .3) * (1 - k * .5);
    if (k < .38) heldItem(K.throwType).visible = true;   // released partway through the whip
    if (kt) { tkHand.visible = true; tkHand.position.set(.17 - k * .1, -.18 - k * .04 + s * .04, -.21 - k * .22); tkHand.rotation.set(1.35 - k * 1.9, .25 - k * .25, .52 - k * .4); }
    else { throwHand.visible = true; throwHand.position.set(-.05 + k * .12, -.06 + s * .05, -.14 - k * .35); throwHand.rotation.set(-1.0 + k * 1.6, 0, .25 - k * .2); }
  }
  K.kick = Math.max(0, K.kick - dt * rate * 14);
  K.bob += spd * dt * rate * 1.9;
  if (K.flashT > 0) { K.flashT -= dt * rate; if (K.flashT <= 0) R.flash.visible = false; }
  const hip = { x: .15, y: -.15 - R.S * .6, z: -(Math.max(R.rearZ, R.grip.z) + .27) }, ads = { x: 0, y: -R.S, z: -(R.rearZ + R.relief) };
  const bobY = Math.sin(K.bob * 2) * .035 * Math.min(1, spd / 5) * (1 - a * .85), sway = Math.sin(K.bob) * .012 * Math.min(1, spd / 5) * (1 - a);
  const renv = rl >= 0 ? Math.sin(clamp(rl / .92, 0, 1) * Math.PI) : 0;
  if (R.mag) R.mag.visible = !(rl >= .25 && rl < .5);
  R.group.position.set(lerp(hip.x, ads.x, a) + sway - spr * .06 - renv * .04 + K.knifeDip * .1, lerp(hip.y, ads.y, a) + bobY * .5 - spr * .06 - renv * .07 - K.knifeDip * .2 - K.tDip, lerp(hip.z, ads.z, a) + K.kick * .04);
  R.group.rotation.set(K.kick * .05 - spr * .25 + renv * .2, spr * .7, spr * .25 + renv * .5); aimSleeve(R);
  // look through the optic the same way the player does: the ACOG's inner glass hides once the gun is up
  for (const m of R.inner) m.visible = a < .55;
  const scoped = K.kill.w.optic === 'scope' && a > .85;
  R.group.visible = !scoped; $('#scope').classList.toggle('on', scoped);
  // the killer's laser, if their gun had one
  if (R.laser && !scoped) { vmCamera.updateProjectionMatrix(); drawLaserFrom(R, G.ents.find(e => e.id === K.kid) || G.player, a); } else laserBeam.visible = laserDot.visible = false;
  const afov = K.kill.w.optic === 'scope' ? (wd.type === 'sniper' ? wd.adsFov : .3) : K.kill.w.optic === 'acog' ? Math.min(wd.adsFov, .55) : (wd.adsFov || 1);
  camera.fov = settings.fov * lerp(1, afov, a); camera.updateProjectionMatrix();
  vmCamera.fov = lerp(60, K.kill.w.optic === 'acog' ? 40 : 48, a); vmCamera.updateProjectionMatrix();
  $('#kcProg').style.width = `${(K.t - K.t0) / Math.max(.01, K.t1 - K.t0) * 100}%`;
  if (K.t >= K.t1) endKillcam();
}
// put everyone back where they really are now, and tidy away the replay
function clearKillcam() {
  const K = G.kc; if (!K) return null;
  G.kc = null;
  if (K.clip) { G.rec = K.clip.rec; G.events = K.clip.events; }
  for (const e of G.ents) {
    if (!e.model) continue;
    if (NET.on) {
      // the match kept going during the replay: show everyone as they are now
      e.model.group.visible = e.isZombie ? e.model.group.visible : !e.isBot ? false : (e.alive || G.now - e.deathT < 3.1);
      if (e.isBot && e.alive) poseSoldier(e, 0, false, false); else if (e.isBot) animateDead(e);
    } else {
      const o = K.saved.ix.get(e.id); if (o === undefined) continue;
      readPose(e, K.saved.d, o, true); if (!e.isBot) e.model.group.visible = false;
    }
    if (e.model.flash) e.model.flash.visible = false;
  }
  for (const p of G.proj) p.mesh.visible = true;
  for (const k in K.pool) for (const m of K.pool[k]) scene.remove(m);
  kcVmRoot.remove(K.vm.group); vmRoot.visible = true; knife.visible = false;
  for (const k in heldItems) heldItems[k].visible = false; throwHand.visible = false; tkHand.visible = false; buildHands(mySleeve());
  laserBeam.visible = laserDot.visible = false;
  $('#killcam').hidden = true; $('#hud').classList.remove('kc'); $('#scope').classList.remove('on');
  camera.fov = settings.fov; camera.updateProjectionMatrix(); vmCamera.fov = 60; vmCamera.updateProjectionMatrix();
  return K;
}
function endKillcam() {
  const K = clearKillcam(); if (!K) return;
  if (K.final) { endMatch(); return; }
  G.state = 'playing';
  G.player.respawnT = 0;
  if (!padActive() && !locked) lockPointer();
}
function killcamInput() {
  let skip = G.kcSkip; G.kcSkip = false;
  const gp = readPad();
  if (gp) {
    const B = i => !!gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .5);
    const E = i => B(i) && !pad.prev[i];
    if (E(0) || E(1) || E(9)) { skip = true; setInputMode('pad'); }
    if (!G.kc.final && (E(14) || E(15))) { settings.classIdx = (settings.classIdx + (E(15) ? 1 : -1) + 5) % 5; saveSettings(); renderDeathClasses(); setInputMode('pad'); }
    pad.prev = gp.buttons.map(b => b.pressed || b.value > .5);
  }
  if (skip) endKillcam();
}
function beginEnding() {
  G.ended = true; G.endT = 0;
  const M = MODES[G.mode];
  let title, sub;
  if (M.team) { const a = G.teamScore.A, b = G.teamScore.B; title = a === b ? 'Draw' : `${a > b ? 'Vanguard' : 'Ironside'} wins`; sub = `${Math.max(a, b)} \u2013 ${Math.min(a, b)}`; }
  else { const top = G.ents.slice().sort((x, y) => y.kills - x.kills)[0]; title = top === G.player ? 'You win' : `${top.name} wins`; sub = `${top.kills} kills`; }
  if (G.timeLeft <= 0) sub = `Time \u00B7 ${sub}`;
  banner(title, sub, 5);
  { const mt = G.player && G.player.team === 'B' ? 'B' : 'A', a = G.teamScore[mt], b = G.teamScore[mt === 'A' ? 'B' : 'A'], top = G.ents.slice().sort((x, y) => y.kills - x.kills)[0]; annResult(M.team ? a > b : top === G.player, M.team && a === b); }
  if (AC) { const t = AC.currentTime, o = outChain(.9, 0, .5); osc(t, 70, 40, 1.6, .7, o); nz(t, 1.4, 'lowpass', 600, .7, .5, o, .05, 1, 120); }
}
