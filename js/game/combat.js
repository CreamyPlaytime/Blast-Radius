// Blast Radius \u00B7 shooting, damage, melee, weapon drops
'use strict';

/* ---------- combat ---------- */
const tmpV = new THREE.Vector3(), tmpO = new THREE.Vector3();
function dirFrom(yaw, pitch, out) { const cp = Math.cos(pitch); return out.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp); }
function eyeOf(e, out) { return out.set(e.pos.x, e.pos.y + (e.stance === 'prone' ? .4 : e.height - .2), e.pos.z); }

function fireRay(shooter, o, d, w, dmgMul) {
  const range = wRange(w);
  const maxT = Math.min(range * 4, 250);
  const wallT = rayWorld(o, d, maxT);
  let best = null;
  for (const e of G.ents) {
    if (!e.alive || e === shooter || !isEnemy(shooter, e) || e.riseT > .45) continue;
    const h = rayEntity(o, d, e, best ? best.t : wallT);
    if (h && (!best || h.t < best.t)) best = { t: h.t, head: h.head, e };
  }
  const T = best ? best.t : wallT;
  const am = w.am || AMMO.std;
  if (best) {
    const fall = clamp((best.t - range) / range, 0, 1);
    const headMul = 1 + (w.d.head - 1) * (w.headK || 1);
    const dmg = w.d.dmg * (w.dmgK || 1) * lerp(1, w.d.minMul, fall) * (best.head ? headMul : 1) * dmgMul;
    burst(o.x + d.x * best.t, o.y + d.y * best.t, o.z + d.z * best.t, best.e.isZombie ? 'gore' : 'blood', 3);
    if (am.fire) burst(o.x + d.x * best.t, o.y + d.y * best.t, o.z + d.z * best.t, 'fire', 2);
    best.e.lastHitY = o.y + d.y * best.t - best.e.pos.y;   // where on the body it landed (zombies lose their legs)
    applyDamage(best.e, shooter, dmg, best.head, w.key);
    if (am.burn && best.e.alive) ignite(best.e, shooter, w.key, am.burn, am.burnDps);
  } else if (wallT < maxT) burst(o.x + d.x * wallT, o.y + d.y * wallT, o.z + d.z * wallT, am.fire ? 'fire' : 'wall', 3);
  const SPL = w.splash;
  if (SPL && T < maxT) {
    // splash damage: the wonder weapon, and explosive rounds
    const hx = o.x + d.x * T, hy = o.y + d.y * T, hz = o.z + d.z * T, S = SPL;
    if (S.fire) { burst(hx, hy, hz, 'fire', 8); puff(hx, hy, hz, softTex(255, 160, 60), .3, 2.2, .25, 1); puff(hx, hy + .2, hz, softTex(70, 64, 58), .4, 1.8, .9, .6, .6); foleyAt('boom', hx, hz, .45, 70); }
    else { burst(hx, hy, hz, 'zap', 10); puff(hx, hy, hz, softTex(140, 255, 110), .3, 2.6, .3, .9); }
    for (const e of G.ents) {
      if (!e.alive || e === shooter || (best && e === best.e) || !isEnemy(shooter, e)) continue;
      const dd = Math.hypot(e.pos.x - hx, e.pos.y + .9 - hy, e.pos.z - hz);
      if (dd < S.r) applyDamage(e, shooter, S.dmg * (1 - dd / S.r * .6) * dmgMul, false, w.key);
    }
  }
  return T;
}
function relPan(e) {
  const p = G.player; if (!p || e === p) return { d: 0, pan: 0 };
  const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
  const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
  return { d, pan: d > .1 ? (dx * rx + dz * rz) / d * .8 : 0 };
}
function soundAt(e, w) {
  const supp = w.has('suppressor');
  if (e === G.player) { playGun(w.d.snd, 1, 0, supp, 0); return; }
  const { d, pan } = relPan(e);
  playGun(w.d.snd, .9 * clamp(1 - d / 90, .05, 1), pan, supp, d);
}

const _mo = new THREE.Vector3();
// where a shot's tracer starts
function shotOrigin(e, eye, f, right) {
  if (e === G.player && typeof vmMuzzleWorld === 'function' && vmMuzzleWorld(vm, _mo)) return _mo;
  if (e !== G.player && modelMuzzle(e, _mo, eye)) return _mo;
  const mz = e.isBot ? .7 : .5;
  return _mo.set(eye.x + f.x * mz + right.x * (e.isBot ? .06 : .18), eye.y + f.y * mz - .12, eye.z + f.z * mz + right.z * (e.isBot ? .06 : .18));
}
// the muzzle of a soldier model in the world (its flash sits there), if the model is up and close to the eye
function modelMuzzle(e, out, eye) {
  const m = e.model; if (!m || !m.flash || !m.group.visible || !e.alive) return null;
  m.group.updateMatrixWorld(true); m.flash.getWorldPosition(out);
  if (!Number.isFinite(out.x) || out.distanceTo(eye) > 2.2 || (out.x === 0 && out.y === 0 && out.z === 0)) return null;
  return out;
}
function shoot(e, yaw, pitch, spread, dmgMul) {
  const w = weapon(e);
  e.sc = ((e.sc || 0) + 1) % 1000;   // other windows play the shot when this count changes
  w.ammo--; w.cd = 60 / w.d.rpm / (e.zmPerks && e.zmPerks.has('rapidround') ? 1.33 : 1);
  if (w.d.action && w.ammo > 0) w.cycleT = w.d.cycle;
  const supp = w.has('suppressor');
  if (!supp) e.lastShotT = G.now;
  if (e === G.player) tmpO.copy(camera.position); else eyeOf(e, tmpO);
  const f = dirFrom(yaw, pitch, new THREE.Vector3());
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const up = new THREE.Vector3().crossVectors(right, f).normalize();
  if (w.d.proj) {
    // launchers fire a projectile instead of a hitscan round
    const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * spread;
    const d = f.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
    const pr = fireProjectile(e, w.d.proj, tmpO, d); if (pr && w.upgraded) pr.papK = typeof ZM_PAP !== 'undefined' ? ZM_PAP.dmg : 2.5;
  } else {
    const am = w.am || AMMO.std, n = w.pellets || w.d.pellets;
    // tracers start at the muzzle: your own gun's muzzle as it sits on screen, or the soldier model's muzzle
    const M = shotOrigin(e, tmpO, f, right);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * spread;
      const d = f.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      const T = fireRay(e, tmpO, d, w, dmgMul);
      if (k === 0 && !G.zm) G.events.push({ t: G.now, k: 'shot', id: e.id, x: tmpO.x + d.x * T, y: tmpO.y + d.y * T, z: tmpO.z + d.z * T, snd: w.d.snd, supp });
      const sx = M.x, sy = M.y, sz = M.z;
      const hx = tmpO.x + d.x * T, hy = tmpO.y + d.y * T, hz = tmpO.z + d.z * T;
      if (am.glow && (k === 0 || am.fire)) glowTracer(sx, sy, sz, hx, hy, hz, am.glow);
      else if (am.fire) tracer(sx, sy, sz, hx, hy, hz, 0xFF7A20);
      else if (e.isBot || k === 0) tracer(sx, sy, sz, hx, hy, hz, w.d.tracer);
    }
    if (am.fire) for (let k = 0; k < 3; k++) { const mz = 1.1 + k * .8; puff(tmpO.x + f.x * mz + right.x * .14, tmpO.y + f.y * mz - .14, tmpO.z + f.z * mz + right.z * .14, softTex(255, 120 + k * 35, 40), .15, .55 + k * .35, .2, .6); }
  }
  soundAt(e, w);
  const hear = (supp ? 9 : 32) * (hasPerk(e, 'ghost') ? .4 : 1);
  for (const b of G.ents) {
    if (!b.isBot || !b.alive || !isEnemy(b, e)) continue;
    if (b.pos.distanceTo(e.pos) < hear) { b.lastKnown = e.pos.clone(); b.lastKnownT = G.now; }
  }
  if (e.isBot && !supp && !w.has('flashhider')) { e.model.flash.visible = true; e.model.flash.rotation.z = Math.random() * 3; e.flashT = .045; }
}

function startReload(e, w) {
  if (w.reloading || w.ammo >= w.mag || w.reserve <= 0) return;
  w.reloading = true;
  if (e.isBot) { w.reloadDur = w.reloadT = w.d.reload; w.shellMode = false; return; }
  if (w.d.perShell) { w.shellMode = true; w.reloadT = .35; w.needPump = w.ammo === 0; foley('raise', .6); }
  else { w.shellMode = false; w.reloadEmpty = w.ammo === 0; w.reloadDur = w.d.reload * (w.reloadEmpty && w.d.emptyEv ? 1.2 : 1) * w.m.reload * (e.zmPerks && e.zmPerks.has('fasthands') ? .5 : 1) * (hasPerk(e, 'fasthands') ? .75 : 1); w.reloadT = w.reloadDur; }
}
function cancelReload(w) { w.reloading = false; w.shellMode = false; w.reloadT = 0; w.burstLeft = 0; }
function tickWeapon(e, w, dt) {
  const isP = e === G.player;
  if (w.cd > 0) w.cd -= dt;
  if (w.cycleT > 0) {
    const before = w.cycleT; w.cycleT -= dt;
    const at = w.d.cycle - .18;
    if (isP && before > at && w.cycleT <= at) foley(w.d.action === 'pump' ? 'pump' : 'bolt');
  }
  if (!w.reloading) return;
  if (w.shellMode) {
    w.reloadT -= dt;
    if (w.reloadT <= 0) {
      if (w.ammo < w.mag && w.reserve > 0) { w.ammo++; w.reserve--; w.reloadT = e.zmPerks && e.zmPerks.has('fasthands') ? .26 : hasPerk(e, 'fasthands') ? .36 : .48; if (isP) foley('shell'); }
      else { w.shellMode = false; w.reloading = false; if (w.needPump) { w.cycleT = w.d.cycle; w.needPump = false; } }
    }
    return;
  }
  const prev = 1 - w.reloadT / w.reloadDur; w.reloadT -= dt; const prog = 1 - w.reloadT / w.reloadDur;
  if (isP) {
    for (const [f, snd] of w.d.events) if (prev < f && prog >= f) foley(snd);
    if (w.reloadEmpty && w.d.emptyEv && prev < w.d.emptyEv[0] && prog >= w.d.emptyEv[0]) foley(w.d.emptyEv[1]);
  }
  if (w.reloadT <= 0) { const n = Math.min(w.mag - w.ammo, w.reserve); w.ammo += n; if (!e.isBot) w.reserve -= n; w.reloadT = 0; w.reloading = false; }
}

function applyDamage(v, a, amt, head, wkey) {
  if (!v.alive || !gameLive() || G.ended || NET_GHOST) return;
  // someone another window owns: send the hit there
  if (NET.on && v.net && !v.net.mine) { netDamage(v, a, amt, head, wkey); return; }
  if (G.zm) { zmDamage(v, a, amt, head, wkey); return; }
  if (hasPerk(v, 'flakjacket') && (wkey === 'frag' || wkey === 'semtex' || wkey === 'gl' || wkey === 'rpg')) amt *= .45;
  v.health -= amt; v.lastDmgT = G.now;
  if (v === G.player && a !== v && WEAPONS[wkey] && WEAPONS[wkey].mag) flinch(hasPerk(v, 'toughness') ? .2 : 1);
  G.events.push({ t: G.now, k: 'hit', id: a.id, head, kill: v.health <= 0 });
  if (v.isBot) { v.alertT = G.now; v.lastKnown = a.pos.clone(); v.lastKnownT = G.now; }
  if (v === G.player) { showDamageFrom(a); foley('hurt', .6); rumble(.5, .7, 140); }
  if (a === G.player && v !== a) { hitmarker(v.health <= 0); sndHit(head, v.health <= 0); rumble(.1, .3, 50); }
  if (v.health <= 0) kill(v, a, head, wkey);
}

function kill(v, a, head, wkey) {
  if (v === G.player && G.hold) dropHeld(v);
  v.alive = false; v.health = 0; v.deaths++; v.streak = 0; v.deathT = G.now;
  v.killFrom = { x: a.pos.x, z: a.pos.z }; v.killHead = head; v.dd = null;   // for the death fall
  v.respawnT = v.isBot ? 3.2 : 4;
  const suicide = a === v;
  if (!suicide) { a.kills++; a.streak++; a.score += 100 + (head ? 25 : 0); }
  if (!a.isBot && !suicide) {
    const w = a.weapons[0]; w.reserve = Math.min(w.reserve + Math.ceil(w.mag / 2), w.d.reserve * 2);
    if (hasPerk(a, 'scavenger') && v !== a) dropPack(v.pos.x, v.pos.y, v.pos.z);
    popup(wkey === 'knife' ? 'Knife kill  +100' : wkey === 'tknife' ? 'Long shot  +100' : head ? 'Headshot  +125' : 'Kill  +100');
    if (a.streak === 3) popup('3 kill streak');
    if (a.streak === 5) popup('5 kill streak');
  }
  if (G.mode === 'tdm' && !suicide) G.teamScore[a.team]++;
  annKill(v, a, head); if (!suicide) calloutKill(a, v); calloutAllyDown(v);
  if (G.mode === 'kc' && !netClient()) { const tg = spawnTag(v); if (a.isBot && !suicide) a.claimTag = tg; }
  dropWeapon(v, v.isBot ? v.weapons[0] : weapon(v), v.pos.x, v.pos.y, v.pos.z);
  if (v.isBot) v.model.flash.visible = false;
  if (v === G.player) {
    $('#death').hidden = false;
    $('#deathBy').innerHTML = `<span class="${teamCss(a)}">${a.name}</span> \u00B7 ${WEAPONS[wkey].name}${head ? ' \u00B7 headshot' : ''}`;
    G.adsT = 0; G.meleeT = 0; renderDeathClasses();
  }
  const wi = a.weapons.find(x => x.key === wkey) || weapon(a);
  const rec = { t: G.now, killer: a.id, victim: v.id, wkey, head, name: a.name, vname: v.name, w: { key: wi.key, optic: wi.optic, atts: (wi.atts || []).slice() } };
  if (!suicide) G.lastKill = rec;
  if (v === G.player) G.myDeath = suicide ? null : rec;
  addKillfeed(a, v, wkey, head);
  netKill(v, a, head, wkey);
  checkEnd();
}

/* ---------- fire: incendiary rounds and dragon's breath ---------- */
function ignite(e, by, wkey, dur, dps) {
  if (!e.alive) return;
  if (!(e.burnT > 0)) { e.burnAcc = 0; if (e === G.player) popup('On fire!'); }
  e.burnT = Math.max(e.burnT || 0, dur); e.burnBy = by; e.burnW = wkey; e.burnDps = dps;
}
const fireTex = () => softTex(255, [120, 155, 190][Math.random() * 3 | 0], 30);
function updateBurns(dt) {
  for (const e of G.ents) {
    if (!(e.burnT > 0)) continue;
    if (!e.alive) { e.burnT = 0; continue; }
    e.burnT -= dt;
    if (!netMine(e) && !(e.burnBy === G.player)) continue; e.burnAcc = (e.burnAcc || 0) + dt;
    if (e.burnAcc >= .25) { e.burnAcc -= .25; applyDamage(e, e.burnBy || e, (e.burnDps || 12) * .25, false, e.burnW || 'knife'); }
    if (e !== G.player && Math.random() < dt * 22) puff(e.pos.x + rand(-.25, .25), e.pos.y + rand(.2, (e.height || 1.8) * .9), e.pos.z + rand(-.25, .25), fireTex(), .2, rand(.5, .8), .35, .85, 1.4);
  }
}

/* ---------- melee ---------- */
function tryMelee(e) {
  for (const o of G.ents) {
    if (!o.alive || !isEnemy(e, o)) continue;
    const dx = o.pos.x - e.pos.x, dz = o.pos.z - e.pos.z, d = Math.hypot(dx, dz);
    if (d > 2.1 || Math.abs(o.pos.y - e.pos.y) > 1.2) continue;
    const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
    if ((dx * fx + dz * fz) / Math.max(d, .01) < .55) continue;
    eyeOf(e, tmpO); tmpV.set(dx, o.pos.y + .9 - tmpO.y, dz); const L = tmpV.length(); tmpV.divideScalar(L);
    if (rayWorld(tmpO, tmpV, L) < L - .1) continue;
    if (e === G.player) foley('stab', .9);
    applyDamage(o, e, 150, false, 'knife');
    return true;
  }
  return false;
}

/* ---------- Scavenger: kills drop an ammo bag you walk over to pick up ---------- */
function dropPack(x, y, z) {
  const g = new THREE.Group();
  gBox(g, .34, .2, .22, 0, .1, 0, GC.od); gBox(g, .345, .06, .225, 0, .17, 0, 0x3E4230);            // bag and flap
  gBox(g, .05, .205, .226, -.1, .1, 0, 0x2A2C22); gBox(g, .05, .205, .226, .1, .1, 0, 0x2A2C22);      // straps
  for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .06, 8), pmat(GC.brass)); c.position.set(-.045 + k * .03, .23, 0); g.add(c); }
  const glow = new THREE.Mesh(new THREE.RingGeometry(.3, .38, 24), new THREE.MeshBasicMaterial({ color: 0xF2B53B, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = .02; g.add(glow);
  g.position.set(x, y, z); g.traverse(o => { if (o.isMesh && o !== glow) o.castShadow = true; }); scene.add(g);
  G.packs.push({ mesh: g, x, y, z, t: G.now });
  while (G.packs.length > 8) { const old = G.packs.shift(); scene.remove(old.mesh); }
}
function updatePacks() {
  const p = G.player;
  for (let i = G.packs.length - 1; i >= 0; i--) {
    const k = G.packs[i], age = G.now - k.t;
    k.mesh.rotation.y = age * 1.6; k.mesh.position.y = k.y + .06 + Math.sin(age * 3) * .04;
    if (age > 30) { scene.remove(k.mesh); G.packs.splice(i, 1); continue; }
    if (!p || !p.alive || Math.abs(k.y - p.pos.y) > 1.2 || Math.hypot(k.x - p.pos.x, k.z - p.pos.z) > 1.3) continue;
    for (const w of p.weapons) { w.reserve = Math.min(w.reserve + w.mag, w.d.reserve * 2); if (w.gl) w.gl.reserve = Math.min(w.gl.reserve + 1, 2); }
    const extra = p.cls && p.cls.wildcard === 'danger' ? 1 : 0, none = p.cls && p.cls.wildcard === 'overload';
    let got = 'ammo';
    if (!none && p.lethal && p.lethalN < LETHALS[p.lethal].count + extra) { p.lethalN++; got += ', ' + LETHALS[p.lethal].name.toLowerCase(); }
    if (!none && p.tact && p.tactN < TACTICALS[p.tact].count + extra) { p.tactN++; got += ', ' + TACTICALS[p.tact].name.toLowerCase(); }
    popup('Scavenged ' + got); foley('magIn', .6);
    scene.remove(k.mesh); G.packs.splice(i, 1);
  }
}

/* ---------- weapon drops ---------- */
function dropWeapon(e, w, x, y, z) {
  if (!w || !WEAPONS[w.key].mag) return;
  const model = buildGun(w.key, w.optic, w.atts);
  model.group.rotation.set(0, Math.random() * TAU, Math.PI / 2);
  model.group.position.set(x, y + .05, z);
  model.group.traverse(o => { o.castShadow = true; });
  scene.add(model.group);
  const reserve = e.isBot ? w.mag * 2 : w.reserve;
  const ammo = e.isBot ? w.mag : w.ammo;
  G.drops.push({ key: w.key, optic: w.optic, atts: w.atts.slice(), ammoT: w.ammoT || 'std', ammo, reserve, mesh: model.group, x, y, z, t: G.now });
  while (G.drops.length > 14) { const d = G.drops.shift(); scene.remove(d.mesh); }
}
function updateDrops() {
  const p = G.player;
  updatePacks();
  G.nearDrop = null;
  let best = 1.8;
  for (let i = G.drops.length - 1; i >= 0; i--) {
    const d = G.drops[i];
    if (G.now - d.t > 45) { scene.remove(d.mesh); G.drops.splice(i, 1); continue; }
    if (!p || !p.alive) continue;
    const dist = Math.hypot(d.x - p.pos.x, d.z - p.pos.z);
    if (Math.abs(d.y - p.pos.y) > 1.2 || dist > 1.8) continue;
    const same = p.weapons.find(w => w.key === d.key);
    if (same || (hasPerk(p, 'scavenger') && dist < 1.2)) {
      if (dist < 1.2) {
        const tw = same || p.weapons[0];
        const got = Math.min(d.ammo + d.reserve, tw.d.reserve * 2 - tw.reserve);
        if (got > 0) { tw.reserve += got; popup(`${tw.d.name} ammo  +${got}`); foley('magIn', .5); scene.remove(d.mesh); G.drops.splice(i, 1); }
      }
      if (same) continue;
    }
    if (dist < best) { best = dist; G.nearDrop = d; }
  }
}
function pickUp(d) {
  const p = G.player;
  const slot = p.wi, old = p.weapons[slot];
  const idx = G.drops.indexOf(d); if (idx < 0) return;
  G.drops.splice(idx, 1); scene.remove(d.mesh);
  cancelReload(old);
  dropWeapon(p, old, p.pos.x, p.pos.y, p.pos.z);
  const nw = makeWeapon(d.key, d.optic, d.atts, d.ammoT); nw.ammo = Math.min(d.ammo, nw.mag); nw.reserve = d.reserve;
  p.weapons[slot] = nw;
  setViewmodel(nw); G.adsT = 0; G.nearDrop = null;
  popup(`Picked up ${nw.d.name}`);
}
