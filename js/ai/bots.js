// Blast Radius \u00B7 bot AI
'use strict';

/* ================= BOT AI ================= */
function perceive(b, D) {
  eyeOf(b, tmpO);
  let best = null, bestD = 1e9;
  const fx = -Math.sin(b.yaw), fz = -Math.cos(b.yaw);
  for (const e of G.ents) {
    if (!e.alive || !isEnemy(b, e)) continue;
    const dx = e.pos.x - b.pos.x, dz = e.pos.z - b.pos.z, d = Math.hypot(dx, dz);
    if (d > 85) continue;
    const facing = d > .1 ? (dx * fx + dz * fz) / d : 1;
    if (facing < .2 && d > (hasPerk(e, 'deadsilence') ? 1.6 : 5) && G.now - b.alertT > 2 && e !== b.target) continue;
    if (hasPerk(e, 'ghost') && d > 24 && e !== b.target && Math.random() < .5) continue;
    if (e.stance === 'prone' && d > 28 && e !== b.target && Math.random() < .5) continue;
    let vis = false;
    for (const hy of [e.height - .15, e.height * .55]) {
      tmpV.set(e.pos.x - tmpO.x, e.pos.y + hy - tmpO.y, e.pos.z - tmpO.z);
      const L = tmpV.length(); tmpV.divideScalar(L);
      if (rayWorld(tmpO, tmpV, L) >= L - .05 && !smokeBlocks(tmpO, e.pos.x, e.pos.y + hy, e.pos.z)) { vis = true; break; }
    }
    if (vis && d < bestD) { best = e; bestD = d; }
  }
  if (best) {
    if (best !== b.target || !b.targetVisible) {
      const fresh = best !== b.prevTarget || G.now - b.lastSeenT > 1.2;
      if (fresh) {
        calloutContact(b, best);
        const cb = hasPerk(best, 'coldblooded') ? 1.5 : 1;
        b.reactT = D.react * rand(.8, 1.3) * cb;
        b.aimOffY = (Math.random() < .5 ? -1 : 1) * D.initErr * rand(.5, 1) * cb;
        b.aimOffP = rand(-.5, .5) * D.initErr * cb;
        // caught sprinting into a fight: sometimes slide in
        if (b.sprinting && b.onGround && b.slideT <= 0 && bestD > 5 && bestD < 18 && Math.random() < .4) botSlide(b);
      }
      b.aimHead = Math.random() < D.headP;
    }
    b.target = best; b.prevTarget = best; b.targetVisible = true; b.lastSeenT = G.now;
    b.lastKnown = best.pos.clone(); b.lastKnownT = G.now;
  } else {
    b.targetVisible = false;
    if (b.target && !b.target.alive) b.target = null;
  }
}
function setGoal(b, x, z, l = 0) {
  b.goal = { x, z, l }; b.held = false; b.holdT = 0;
  b.path = findPath(b.pos.x, b.pos.z, x, z, layerAt(b.pos.y), l); b.pi = 0;
  b.stuckT = 0; b.stuckPos.copy(b.pos);
}
function roamGoal(b) {
  const ty = weapon(b).d.type;
  if (UPPER_PTS.length && Math.random() < (ty === 'sniper' ? .55 : ty === 'dmr' ? .4 : ty === 'lmg' ? .25 : .1)) return UPPER_PTS[Math.random() * UPPER_PTS.length | 0];
  const pts = SPAWNS.ffa;
  for (let k = 0; k < 6; k++) {
    const p = pts[Math.floor(Math.random() * pts.length)];
    if (Math.hypot(p.x - MAP.center[0], p.z - MAP.center[1]) < MAP.coreR || Math.random() < .3) if (Math.hypot(p.x - b.pos.x, p.z - b.pos.z) > 8) return p;
  }
  return pts[Math.floor(Math.random() * pts.length)];
}
function setBotCrouch(b, on) {
  if (on === (b.stance === 'crouch')) return;
  if (!on && !canStand(b, 1.8)) return;
  b.stance = on ? 'crouch' : 'stand'; b.height = on ? 1.2 : 1.8;
}
function botSlide(b) {
  const sp = Math.hypot(b.vel.x, b.vel.z); if (sp < 3) return;
  b.slideT = .75; b.slideDir = { x: b.vel.x / sp, z: b.vel.z / sp }; b.stance = 'crouch'; b.height = 1.0; b.sprinting = false;
  const { d, pan } = relPan(b); if (d < 20) foley('slideScrape', .4 * (1 - d / 20), pan);
}
function botMantle(b, dx, dz) {
  if (b.mantle || b.slideT > 0 || b.stance === 'prone') return false;
  const M = findMantle(b, dx, dz, 2.05); if (!M) return false;
  M.dur *= 1.15; b.mantle = M; return true;
}
function updateBot(b, dt) {
  const D = DIFF[settings.difficulty];
  if (b.mantle) {
    tickWeapon(b, weapon(b), dt);
    if (!stepMantle(b, b.mantle, dt)) { b.mantle = null; if (!clearAt(b.pos.x, b.pos.z, b.pos.y + .05, 1.75, R * .95)) { b.stance = 'crouch'; b.height = 1.2; } }
    b.model.group.position.copy(b.pos); b.model.spine.rotation.x = -.35; poseSoldier(b, dt, false, false);
    return;
  }
  if (b.health < 100 && G.now - b.lastDmgT > 4) b.health = Math.min(100, b.health + 30 * dt);
  if (b.flashT > 0) { b.flashT -= dt; if (b.flashT <= 0) b.model.flash.visible = false; }
  const w = weapon(b);
  tickWeapon(b, w, dt);
  if (b.blindT > 0) b.blindT -= dt;
  if (b.stunT > 0) b.stunT -= dt;
  b.nadeCD -= dt;
  b.thinkT -= dt;
  if (b.thinkT <= 0) { b.thinkT = .1 + Math.random() * .06; if (b.blindT > 0) b.targetVisible = false; else perceive(b, D); }
  const stunK = b.stunT > 0 ? .35 : 1;
  if (b.target && !b.target.alive) { b.target = null; b.targetVisible = false; }

  let wx = 0, wz = 0, speed = 5.3 * w.d.speed * w.m.speed, faceYaw = null;
  const t = b.targetVisible ? b.target : null;
  b.adsK = lerp(b.adsK || 0, t && b.reactT <= .15 && w.d.type !== 'shotgun' && !w.reloading ? 1 : 0, Math.min(1, dt * 7));
  b.sprinting = false;
  if (b.meleeT > 0) { b.meleeT -= dt; if (b.meleeT <= 0) tryMelee(b); }
  if (t) {
    const ty = t.pos.y + (t.stance === 'prone' ? .3 : (b.aimHead ? t.height - .15 : t.height * .62));
    eyeOf(b, tmpO);
    const dx = t.pos.x - tmpO.x, dy = ty - tmpO.y, dz = t.pos.z - tmpO.z, hd = Math.hypot(dx, dz);
    const desYaw = Math.atan2(-(dx + t.vel.x * .08), -(dz + t.vel.z * .08));
    const desPitch = Math.atan2(dy, hd);
    b.aimOffY *= Math.exp(-D.settle * dt); b.aimOffP *= Math.exp(-D.settle * dt);
    const dyaw = wrap(desYaw + b.aimOffY - b.yaw), maxTurn = D.turn * dt * stunK;
    b.yaw = wrap(b.yaw + clamp(dyaw, -maxTurn, maxTurn));
    b.pitch += clamp(desPitch + b.aimOffP - b.pitch, -maxTurn, maxTurn);
    b.reactT -= dt;
    if (hd < 1.7 && b.meleeT <= 0 && b.reactT <= 0) b.meleeT = .3;
    b.strafeT -= dt;
    if (b.strafeT <= 0) {
      b.strafeDir = Math.random() < .2 ? 0 : (Math.random() < .5 ? -1 : 1); b.strafeT = rand(.45, 1.3);
      setBotCrouch(b, b.strafeDir === 0 && Math.random() < D.crouchP * 2);
    }
    const wt = w.d.type, ideal = wt === 'shotgun' ? [2, 6] : wt === 'smg' ? [4, 13] : wt === 'sniper' ? [16, 60] : wt === 'dmr' ? [12, 45] : wt === 'lmg' ? [8, 28] : [7, 24];
    const fwd = hd > ideal[1] ? 1 : hd < ideal[0] ? -.7 : 0;
    const fx = -Math.sin(desYaw), fz = -Math.cos(desYaw), rx = Math.cos(desYaw), rz = -Math.sin(desYaw);
    wx = fx * fwd + rx * b.strafeDir * .85; wz = fz * fwd + rz * b.strafeDir * .85;
    if (G.mode === 'kc') for (const tg of (b.claimTag && G.tags.includes(b.claimTag) ? [b.claimTag, ...G.tags] : G.tags)) {
      if (tg.team === b.team) continue;
      const tx = tg.x - b.pos.x, tz = tg.z - b.pos.z, td = Math.hypot(tx, tz);
      if (td < (tg === b.claimTag ? 18 : 12) && td > .2 && layerAt(tg.y) === layerAt(b.pos.y) && walkClear(b.pos.x, b.pos.z, tg.x, tg.z, layerAt(b.pos.y))) { wx = tx / td + rx * b.strafeDir * .4; wz = tz / td + rz * b.strafeDir * .4; break; }
    }
    const L = Math.hypot(wx, wz); if (L > 0) { wx /= L; wz /= L; }
    speed = (b.stance === 'crouch' ? 2.4 : 3.6) * w.d.speed;
    // a hop or a slide to break your aim now and then
    b.jumpCD -= dt;
    if (b.onGround && b.jumpCD <= 0 && b.reactT <= 0 && b.stance === 'stand') {
      b.jumpCD = rand(2.5, 6);
      const r = Math.random();
      if (r < .18 + D.crouchP * .3) b.vel.y = 6.1;
      else if (r < .3 && hd < 16 && hd > 4 && b.strafeDir) { b.vel.x = (rx * b.strafeDir) * 7.5; b.vel.z = (rz * b.strafeDir) * 7.5; botSlide(b); }
    }
    if (w.ammo <= 0) { startReload(b, w); calloutReload(b); }
    if (b.pauseT > 0) { b.pauseT -= dt; if (b.pauseT <= 0) b.burstT = rand(D.burst[0], D.burst[1]); }
    else if (b.burstT <= 0) b.burstT = rand(D.burst[0], D.burst[1]);
    const onTarget = Math.abs(wrap(desYaw - b.yaw)) < .2 + 1.2 / Math.max(hd, 1);
    if (b.reactT <= 0 && onTarget && !w.reloading && w.ammo > 0 && w.cd <= 0 && w.cycleT <= 0 && b.pauseT <= 0 && b.meleeT <= 0 && !G.ended) {
      const moving = Math.hypot(t.vel.x, t.vel.z) > 1 ? 1.25 : 1;
      const err = D.err * moving * (t.stance === 'prone' ? 1.2 : 1) * (b.stunT > 0 ? 3 : 1);
      shoot(b, b.yaw + gauss() * err, b.pitch + gauss() * err * .7, w.d.pellets > 1 ? w.d.spread : w.d.spread * .35, D.dmg);
      if (w.d.burst) { b.burstN = (b.burstN || 0) + 1; if (b.burstN >= w.d.burst) { b.burstN = 0; w.cd = w.d.burstDelay * rand(1, 1.4); } }
      else if (!w.d.auto) w.cd *= rand(1.3, 1.9);
      b.burstT -= w.cd;
      if (b.burstT <= 0) b.pauseT = rand(D.pause[0], D.pause[1]);
    }
    if (!G.ended && b.lethalN > 0 && b.nadeCD <= 0 && hd > 9 && hd < 24 && b.reactT <= 0 && Math.random() < dt * .35) { botThrow(b, b.lethal, t.pos); calloutThrow(b, b.lethal); b.lethalN--; b.nadeCD = rand(14, 24); }
    b.path = null;
  } else {
    setBotCrouch(b, false);
    b.pitch *= Math.exp(-4 * dt);
    if (!w.reloading && w.ammo < w.mag * .5) { startReload(b, w); calloutReload(b); }
    b.repathT -= dt;
    let want = null, tagWant = null, tagD = 1e9;
    if (G.mode === 'kc') for (const tg of G.tags) { const d = Math.hypot(tg.x - b.pos.x, tg.z - b.pos.z); if (tg.team === b.team && d > 6) continue; if (d < 34 && d < tagD) { tagD = d; tagWant = tg; } }
    if (b.ow && !b.held && UPPER_PTS.length && (!b.goal || b.goal.l !== 1)) {
      const side = UPPER_PTS.filter(q => Math.sign(q.x) === Math.sign(b.pos.x || 1));
      const pool = side.length ? side : UPPER_PTS, g = pool[Math.random() * pool.length | 0];
      setGoal(b, g.x, g.z, 1); if (!b.path) b.ow = false;
    }
    if (b.held && b.holdT <= 0) b.ow = false;
    const holding = (b.holdT > 0 || (b.ow && !b.held)) && G.mode !== 'kc';
    // bots heading to or holding an overwatch spot ignore noises (deciding per frame made them flip between goals)
    const recent = b.lastKnown && G.now - b.lastKnownT < 7 && !holding;
    if (b.claimTag && G.tags.includes(b.claimTag) && Math.hypot(b.claimTag.x - b.pos.x, b.claimTag.z - b.pos.z) < 60) { tagWant = b.claimTag; tagD = 0; } else b.claimTag = null;
    if (!G.ended && recent && b.tactN > 0 && b.nadeCD <= 0 && b.blindT <= 0 && Math.random() < dt * .3) { const dl = Math.hypot(b.lastKnown.x - b.pos.x, b.lastKnown.z - b.pos.z); if (dl > 7 && dl < 20) { botThrow(b, b.tact, b.lastKnown); calloutThrow(b, b.tact); b.tactN--; b.nadeCD = rand(10, 18); } }
    if (tagWant && (!recent || tagD < 20)) want = tagWant;
    else if (recent) want = b.lastKnown;
    if (want) {
      const wl = layerAt(want.y || 0);
      const climbing = b.path && b.path[b.pi] && b.path[b.pi].portal;
      if (!climbing && (!b.goal || Math.hypot(b.goal.x - want.x, b.goal.z - want.z) > 2.5 || b.goal.l !== wl || (!b.path && b.repathT <= 0))) { setGoal(b, want.x, want.z, wl); b.repathT = 1; if (!b.path) { if (want === b.claimTag) b.claimTag = null; if (want === b.lastKnown) b.lastKnown = null; } }
      if (b.lastKnown === want && Math.hypot(want.x - b.pos.x, want.z - b.pos.z) < 1.5) b.lastKnown = null;
    } else if (b.holdT > 0) {
      // holding an upstairs window: scan the street
      b.holdT -= dt;
      faceYaw = b.holdYaw + Math.sin(G.now * .6 + b.id) * .55;
    } else if (!b.path || b.pi >= b.path.length) {
      if (b.goal && b.goal.l === 1 && !b.held && b.path && b.pi >= b.path.length) { b.held = true; b.holdT = weapon(b).d.type === 'sniper' ? rand(12, 22) : rand(5, 10); b.holdYaw = Math.atan2(b.pos.x - MAP.center[0], b.pos.z - MAP.center[1]); }
      else { const g = roamGoal(b); setGoal(b, g.x, g.z, g.l || 0); }
    }
    if (b.path && b.pi < b.path.length) {
      // sprint along long routes when nothing is around
      const last = b.path[b.path.length - 1], left = Math.hypot(last.x - b.pos.x, last.z - b.pos.z);
      if (left > 7 && !b.path[b.pi].portal && b.stance === 'stand' && G.now - b.lastSeenT > 2.5 && G.now - b.lastDmgT > 2) { b.sprinting = true; speed = 7.1 * w.d.speed * w.m.speed; }
      b.smoothT -= dt;
      const cur = b.path[b.pi], bl = layerAt(b.pos.y);
      if (b.smoothT <= 0 && !cur.portal && cur.l === bl) {
        b.smoothT = .3;
        let jmax = b.pi;
        for (let j = b.pi + 1; j <= Math.min(b.pi + 6, b.path.length - 1); j++) { if (b.path[j].portal || b.path[j].l !== bl) break; jmax = j; }
        for (let j = jmax; j > b.pi; j--) if (walkClear(b.pos.x, b.pos.z, b.path[j].x, b.path[j].z, bl)) { b.pi = j; break; }
      }
      const p = b.path[b.pi];
      const dx = p.x - b.pos.x, dz = p.z - b.pos.z, d = Math.hypot(dx, dz);
      if (d < (p.portal ? .3 : .55)) b.pi++;
      else { wx = dx / d; wz = dz / d; faceYaw = Math.atan2(-dx, -dz); }
    } else if (b.lastKnown && G.now - b.lastKnownT < 7) b.yaw = wrap(b.yaw + dt * 1.5);
    if (faceYaw !== null) { const dy = wrap(faceYaw - b.yaw); b.yaw = wrap(b.yaw + clamp(dy, -6 * dt, 6 * dt)); }
    b.stuckT += dt;
    if (b.stuckT > 1.2) {
      if (b.pos.distanceTo(b.stuckPos) < .35 && b.path && b.holdT <= 0 && !(wx || wz ? botMantle(b, wx, wz) : false)) { const g = roamGoal(b); setGoal(b, g.x, g.z, g.l || 0); }
      b.stuckT = 0; b.stuckPos.copy(b.pos);
    }
  }
  if (b.blindT > 0) { wx = Math.sin(G.now * 2.3 + b.id); wz = Math.cos(G.now * 1.7 + b.id * 2); speed = 1.6; b.yaw = wrap(b.yaw + Math.sin(G.now * 3 + b.id) * dt * 2); }
  for (const pr of G.proj) {
    if ((pr.type !== 'frag' && pr.type !== 'semtex') || pr.fuse > 2.2 || pr.attach === b) continue;
    const dx = b.pos.x - pr.pos.x, dz = b.pos.z - pr.pos.z, d = Math.hypot(dx, dz);
    if (d < 5.5 && d > .01) { wx = dx / d; wz = dz / d; speed = 5.6; }
  }
  for (const o of G.ents) {
    if (o === b || !o.alive) continue;
    const dx = b.pos.x - o.pos.x, dz = b.pos.z - o.pos.z, d = Math.hypot(dx, dz);
    if (d < .8 && d > .001) { wx += dx / d * .6; wz += dz / d * .6; }
  }
  if (b.slideT > 0) {
    b.slideT -= dt;
    const k = clamp(b.slideT / .75, 0, 1);
    moveEntity(b, b.slideDir.x + wx * .3, b.slideDir.z + wz * .3, lerp(2.5, 10.2, Math.sqrt(k)), dt, 30);
    if (b.slideT <= 0) { b.stance = 'crouch'; b.height = 1.2; if (Math.random() < .6) setBotCrouch(b, false); }
  } else moveEntity(b, wx, wz, speed * stunK * (stunK < 1 ? 1.4 : 1), dt);
  poseSoldier(b, dt, (!!t || G.now - b.lastSeenT < 1.2) && !b.sprinting, b.meleeT > 0);
  const sp = Math.hypot(b.vel.x, b.vel.z);
  b.stepAcc += sp * dt;
  if (b.stepAcc > (b.sprinting ? 2.6 : 2.1)) { b.stepAcc = 0; if (b.stance === 'stand' && sp > 3 && !hasPerk(b, 'deadsilence')) { const { d, pan } = relPan(b); if (d < 22) foley('step', (b.sprinting ? .7 : .55) * (1 - d / 22), pan); } }
}
function poseSoldier(e, dt, combat, melee) {
  const m = e.model, sp = Math.hypot(e.vel.x, e.vel.z), run = clamp(sp / 4.6, 0, 1.2);
  m.group.position.copy(e.pos); m.group.rotation.y = e.yaw;
  e.walkPhase = (e.walkPhase || 0) + sp * dt * 1.85;
  const ph = e.walkPhase;
  if (e.stance === 'prone') {
    m.group.rotation.x = -1.42;
    m.group.position.x += Math.sin(e.yaw) * .95; m.group.position.z += Math.cos(e.yaw) * .95; m.group.position.y += .14;
    m.spine.rotation.x = 0; m.head.rotation.x = 1.15; m.hips.position.y = .95;
    for (let i = 0; i < 2; i++) { const L = m.legs[i]; L.thigh.rotation.x = Math.sin(ph * 2 + i * Math.PI) * .2 * Math.min(1, run * 3); L.knee.rotation.x = -.15; }
    m.aim.rotation.set(1.42 + e.pitch * .7, 0, 0);
    return;
  }
  m.group.rotation.x = 0;
  const crouch = e.stance === 'crouch' || e.slideT > 0;
  const sprinting = !combat && run > .7;
  // lean into the run: a lot when sprinting, a little while strafing in a fight
  const lean = e.slideT > 0 ? .25 : crouch ? -.2 : -(sprinting ? .34 : .12) * Math.min(1, run);
  m.spine.rotation.x = lerp(m.spine.rotation.x, lean, Math.min(1, dt * 7));
  for (let i = 0; i < 2; i++) {
    const L = m.legs[i], s = Math.sin(ph + i * Math.PI);
    if (e.slideT > 0) { L.thigh.rotation.x = i ? 1.3 : .2; L.knee.rotation.x = i ? -1.9 : -.1; }
    else if (crouch) { L.thigh.rotation.x = 1.15 + s * .22 * run; L.knee.rotation.x = -1.95 + Math.max(0, s) * .3 * run; }
    else { L.thigh.rotation.x = s * (sprinting ? .85 : .6) * Math.min(1, run); L.knee.rotation.x = -.06 - Math.max(0, Math.sin(ph + i * Math.PI - 1.4)) * (sprinting ? 1.5 : 1.05) * Math.min(1, run); }
  }
  m.hips.position.y = (e.slideT > 0 ? .45 : crouch ? .58 : .95) + Math.abs(Math.cos(ph)) * .045 * Math.min(1, run) - (sprinting ? .03 : 0);
  m.head.rotation.x = -m.spine.rotation.x * .6;
  if (combat) m.aim.rotation.set(e.pitch - m.spine.rotation.x + (melee ? -.6 : 0), 0, 0);
  else { const sw = Math.sin(ph) * .07 * run; m.aim.rotation.set(-.6 * Math.min(1, run) - m.spine.rotation.x * .4 - .1, .5 * Math.min(1, run) + sw, .3 * Math.min(1, run)); }
}
/* ---------- deaths: a hit reaction, the knees going, then a heavy fall that depends on where the shot came from ---------- */
function setupDeath(e) {
  const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw), K = e.killFrom;
  let ax = 0, az = 1;
  if (K) { const dx = K.x - e.pos.x, dz = K.z - e.pos.z, L = Math.hypot(dx, dz) || 1; ax = dx / L; az = dz / L; }
  const front = fx * ax + fz * az, side = (fx * az - fz * ax) < 0 ? -1 : 1;
  // shot from in front: thrown back. From behind: pitched forward. From the side, or at random: the legs fold first
  const kind = e.killHead && front > -.2 ? 'back' : front > .35 ? (Math.random() < .7 ? 'back' : 'crumple') : front < -.35 ? 'front' : (Math.random() < .5 ? 'crumple' : 'front');
  return { kind, side, kx: -ax, kz: -az, head: !!e.killHead, yaw: e.yaw, twist: side * rand(.15, .45), spd: rand(.9, 1.15) };
}
function animateDead(e) {
  if (!e.model) return;
  const m = e.model, g = m.group, t = (G.now - e.deathT);
  if (!m.hips || e.isDog) {
    g.rotation.x = -Math.min(1, t / .45) * Math.PI / 2 * .95; g.position.y = e.pos.y + Math.min(1, t / .45) * .15;
    if (t > 2.4) g.visible = false; return;
  }
  if (e.kind === 'crawler') {
    // already on the ground: the arms give out and the head drops
    const k = clamp(t / .4, 0, 1);
    if (m.arms) m.arms.forEach((A, i) => { A.upper.rotation.x = lerp(A.upper.rotation.x, 1.6, k * .2); A.upper.rotation.z = (i ? 1 : -1) * .9 * k; });
    m.head.rotation.x = lerp(m.head.rotation.x, -.3, k * .2);
    return;
  }
  const D = e.dd || (e.dd = setupDeath(e)), T = t * D.spd;
  const c01 = v => clamp(v, 0, 1), ease = k => k * k * (3 - 2 * k);
  const react = 1 - Math.pow(1 - c01(T / .12), 2);                 // the jolt of the hit
  const buckle = ease(c01((T - .04) / .42));                        // knees giving way
  const fallP = c01((T - .14) / .52), fallA = fallP * fallP;        // falling under gravity
  const land = c01((T - .66) / .3), bounce = Math.sin(land * Math.PI) * (1 - land) * .09;
  const sign = D.kind === 'front' ? -1 : 1, amt = D.kind === 'crumple' ? .82 : .93;
  g.rotation.x = sign * (Math.PI / 2 * amt * fallA - bounce);
  g.rotation.y = D.yaw + D.twist * ease(c01((T - .1) / .6));
  const knock = (D.kind === 'back' ? .55 : D.kind === 'front' ? .3 : .15) * (1 - Math.pow(1 - c01(T / .6), 2));
  const sink = c01((t - 2.4) / .7) * .35;
  g.position.set(e.pos.x + D.kx * knock, e.pos.y + .1 * fallA - sink, e.pos.z + D.kz * knock);
  m.hips.position.y = D.kind === 'crumple' ? lerp(.95, .5, buckle) : .95 - .12 * buckle;
  const thigh = D.kind === 'crumple' ? 1.15 : D.kind === 'front' ? .45 : -.15, knee = D.kind === 'crumple' ? -2.0 : D.kind === 'front' ? -.9 : -.55;
  m.legs.forEach((L, i) => { const w = i ? 1 : .8; L.thigh.rotation.x = thigh * buckle * w + (D.kind === 'back' ? .35 * react * (i ? 1 : -.4) : 0); L.knee.rotation.x = knee * buckle * w * (1 - land * .3); });
  m.spine.rotation.x = D.kind === 'back' ? .3 * react * (1 - fallP * .6) : D.kind === 'front' ? -.35 * buckle : -.55 * buckle;
  m.head.rotation.x = D.head ? .95 * react - .45 * land : D.kind === 'back' ? .35 * react : -.35 * buckle;
  const sw = D.side * .45 * fallP;
  if (m.aim) {
    // soldiers: the gun and arms fly up and out on a shot from the front, drop and reach forward otherwise
    if (D.kind === 'back') m.aim.rotation.set(1.3 * react - .55 * fallP, sw * .6, sw);
    else m.aim.rotation.set(-.9 * buckle - .2 * react, sw * .4, sw * .6);
  } else if (m.arms) {
    m.arms.forEach((A, i) => { const s = i ? 1 : -1; A.upper.rotation.set(D.kind === 'back' ? 2.2 * react * (1 - fallP * .55) : 1.1 * buckle, 0, s * (.25 + .55 * fallP)); if (A.elbow) A.elbow.rotation.x = -.6 * buckle; });
  }
  if (t > 3.1 && !e.isZombie) g.visible = false;
}
