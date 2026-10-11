// Blast Radius \u00B7 grenades, smoke, flash, stun
'use strict';

/* ---------- equipment ---------- */
const FUSE = { frag: 3.0, semtex: 4, tknife: 8, flash: 1.6, stun: 1.6, smoke: 1.3, rocket: 6, gl40: 6 };
// explosives: blast radius, damage at the centre, extra damage right on top of it, kill-feed weapon, fireball size
const BLAST = { frag: { r: 6.5, dmg: 160, close: 50, w: 'frag', fx: 1 }, semtex: { r: 6.5, dmg: 160, close: 50, w: 'semtex', fx: 1 }, gl40: { r: 5.2, dmg: 150, close: 45, w: 'gl', fx: .9 }, rocket: { r: 7.2, dmg: 210, close: 80, w: 'rpg', fx: 1.4 } };
// projectile flight: speed, gravity, explodes on contact
// throwing knife flight: fast and flat, so the aim guide is a short, nearly straight line
const KNIFE_V = 38, KNIFE_G = 3.5;
const PFLY = { rocket: { v: 44, g: 1.4 }, gl40: { v: 36, g: 9 } };
const softTexCache = {};
function softTex(r, g, b) {
  const k = `${r},${g},${b}`; if (softTexCache[k]) return softTexCache[k];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(.5, `rgba(${r},${g},${b},.55)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return softTexCache[k] = new THREE.CanvasTexture(c);
}
const puffs = [];
function puff(x, y, z, tex, s0, s1, life, op, vy = 0, fade = 0, grow = 0) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: op }));
  sp.position.set(x, y, z); sp.scale.set(s0, s0, s0); scene.add(sp);
  puffs.push({ sp, s0, s1, life, max: life, op, vy, fade, grow: grow || life * .6 });
}
function updatePuffs(dt) {
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i]; p.life -= dt;
    const age = p.max - p.life, sc = lerp(p.s0, p.s1, Math.min(1, age / p.grow));
    p.sp.scale.set(sc, sc, sc);
    p.sp.material.opacity = p.op * (p.fade ? Math.min(1, p.life / p.fade) : Math.max(0, p.life / p.max));
    p.sp.position.y += p.vy * dt;
    if (p.life <= 0) { scene.remove(p.sp); p.sp.material.dispose(); puffs.splice(i, 1); }
  }
}
function nadeMesh(type) {
  const g = new THREE.Group();
  if (type === 'tknife') { const kn = throwKnifeModel(); kn.position.z = -.1; kn.scale.setScalar(1.3); g.add(kn); }   // tip first, a little bigger so it reads at a distance
  else if (type === 'frag') { const b = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), mat(0x4A5A3A)); g.add(b); gBox(g, .02, .06, .012, .04, .02, 0, GC.metal); gBox(g, .03, .02, .03, 0, .06, 0, GC.metal); }
  else if (type === 'semtex') { gBox(g, .09, .05, .06, 0, 0, 0, 0xD9A441); gBox(g, .03, .02, .03, 0, .035, 0, 0xFF3020); }
  else if (type === 'rocket') {
    // nose points along -z (the mesh is turned to face its flight)
    Cz(g, GC.dark, .012, -.34, -.22, 0, 12, 0, .055); Cz(g, GC.tan, .055, -.22, -.1, 0, 12); Cz(g, GC.tan, .055, -.1, -.04, 0, 12, 0, .026); Cz(g, GC.dark, .024, -.04, .2, 0, 10);
    for (let k = 0; k < 4; k++) { const f = gBox(g, .004, .07, .08, 0, 0, .17, GC.dark); f.position.set(Math.cos(k * Math.PI / 2) * .04, Math.sin(k * Math.PI / 2) * .04, .17); f.rotation.z = k * Math.PI / 2; }
    const fl = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xFFB050 })); fl.position.z = .24; fl.scale.z = 2.2; g.add(fl);
  }
  else if (type === 'gl40') { Cz(g, GC.brass, .021, .0, .05, 0, 10); Cz(g, 0x6E7A3A, .013, -.045, .0, 0, 10, 0, .021); Cz(g, 0x6E7A3A, .005, -.055, -.045, 0, 8, 0, .013); }
  else { const c = { flash: 0x9AA1A6, smoke: 0x5F7D63, stun: 0xE7C35A }[type]; const m = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .12, 10), mat(c)); g.add(m); gBox(g, .03, .02, .03, 0, .07, 0, GC.dark); }
  g.traverse(o => { o.castShadow = true; });
  scene.add(g); return g;
}
function throwItem(e, type) {
  const knifeT = type === 'tknife';
  const d = dirFrom(e.yaw, e.pitch + (knifeT ? .02 : .14), new THREE.Vector3());
  const eye = e === G.player ? camera.position.clone() : eyeOf(e, new THREE.Vector3());
  const off = Math.max(0, Math.min(.35, rayWorld(eye, d, .6) - .12));
  const o = eye.clone().addScaledVector(d, off);
  const v = d.clone().multiplyScalar(knifeT ? KNIFE_V : 17); v.x += e.vel.x * .4; v.z += e.vel.z * .4;
  const p = { type, owner: e, pos: o, vel: v, fuse: FUSE[type], mesh: nadeMesh(type), stuck: false, attach: null, resting: false };
  p.mesh.position.copy(o); G.proj.push(p); netProj(p);
  if (!G.zm) G.events.push({ t: G.now, k: 'throw', id: e.id, type });   // kill cams replay the throw
  if (e === G.player) foley('throw', .7); else { const { d: dd, pan } = relPan(e); if (dd < 25) foley('throw', .4 * (1 - dd / 25), pan); }
  return p;
}
// rockets and 40mm grenades: leave from the shooter's eye along d and blow up on whatever they touch
function fireProjectile(e, type, eye, d) {
  const F = PFLY[type];
  const off = Math.max(0, Math.min(.5, rayWorld(eye, d, .8) - .15));
  const o = eye.clone().addScaledVector(d, off);
  if (e === G.player) { o.y -= .08; o.addScaledVector(new THREE.Vector3(Math.cos(e.yaw), 0, -Math.sin(e.yaw)), .06); }
  const p = { type, owner: e, pos: o, vel: d.clone().multiplyScalar(F.v), fuse: FUSE[type], mesh: nadeMesh(type), stuck: false, attach: null, resting: false, impact: true, age: 0, trailT: 0 };
  p.mesh.position.copy(o); p.mesh.lookAt(o.x - d.x, o.y - d.y, o.z - d.z); G.proj.push(p); netProj(p);
  if (type === 'rocket') { puff(eye.x - d.x * .8, eye.y - .1, eye.z - d.z * .8, softTex(200, 196, 188), .4, 2.2, .9, .55, .3); }
  return p;
}
function foleyAt(name, x, z, vol = 1, range = 80) {
  const p = G.player; if (!AC || !p) return;
  const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
  if (d > range) return;
  const pan = d > .1 ? (dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw)) / d * .8 : 0;
  FOLEY[name](AC.currentTime + d / 343, outChain(vol * clamp(1 - d / range, .05, 1), pan, .35, lerp(16000, 1800, clamp(d / range, 0, 1))));
}
const _pd = new THREE.Vector3();
function updateProj(dt) {
  outer: for (let i = G.proj.length - 1; i >= 0; i--) {
    const p = G.proj[i];
    if (p.attach) { if (p.attach.alive) p.pos.set(p.attach.pos.x + p.ax, p.attach.pos.y + p.ay, p.attach.pos.z + p.az); }
    else if (!p.stuck) {
      if (p.impact) {
        p.age += dt; p.trailT -= dt;
        if (p.trailT <= 0) { p.trailT = p.type === 'rocket' ? .025 : .05; puff(p.pos.x, p.pos.y, p.pos.z, softTex(190, 186, 178), p.type === 'rocket' ? .18 : .1, p.type === 'rocket' ? .9 : .4, p.type === 'rocket' ? 1.1 : .5, p.type === 'rocket' ? .55 : .35, .15); }
      }
      for (let s = 0; s < 3; s++) {
        const h = dt / 3;
        if (!p.resting) p.vel.y -= (p.impact ? PFLY[p.type].g : p.type === 'tknife' ? KNIFE_G : 17) * h;
        else { p.vel.x *= Math.max(0, 1 - 4 * h); p.vel.z *= Math.max(0, 1 - 4 * h); }
        const spd = p.vel.length(), L = spd * h; if (L < 1e-5) continue;
        _pd.copy(p.vel).divideScalar(spd);
        if (p.type === 'tknife' || p.type === 'semtex' || p.impact) {
          for (const e of G.ents) {
            if (!e.alive || e === p.owner || !isEnemy(p.owner, e)) continue;
            const hit = rayEntity(p.pos, _pd, e, L);
            if (!hit) continue;
            if (p.type === 'tknife') { foleyAt('stab', e.pos.x, e.pos.z, .9); if (!p.ghost) applyDamage(e, p.owner, 200, hit.head, 'tknife'); scene.remove(p.mesh); G.proj.splice(i, 1); continue outer; }
            if (p.impact) { p.pos.addScaledVector(_pd, hit.t); p.direct = e; scene.remove(p.mesh); G.proj.splice(i, 1); detonate(p); continue outer; }
            p.pos.addScaledVector(_pd, hit.t); p.attach = e; p.ax = p.pos.x - e.pos.x; p.ay = p.pos.y - e.pos.y; p.az = p.pos.z - e.pos.z; p.fuse = 1.4;
            if (e === G.player) popup('Stuck with Semtex!');
            if (p.owner === G.player) popup('Stuck!');
            continue outer;
          }
        }
        const t = rayWorld(p.pos, _pd, L, true);
        if (t < L) {
          p.pos.addScaledVector(_pd, Math.max(0, t - .03));
          const ax = hitAxis;
          if (p.impact) { scene.remove(p.mesh); G.proj.splice(i, 1); detonate(p); continue outer; }
          if (p.type === 'semtex') { p.stuck = true; p.fuse = 1.4; foleyAt('clink', p.pos.x, p.pos.z, .6, 30); break; }
          if (p.type === 'tknife') { p.stuck = true; p.fuse = 8; foleyAt('clink', p.pos.x, p.pos.z, .5, 30); break; }
          if (spd > 2.5) foleyAt('clink', p.pos.x, p.pos.z, .5, 30);
          p.vel[ax] *= -.36; for (const o of ['x', 'y', 'z']) if (o !== ax) p.vel[o] *= .68;
          if (ax === 'y' && Math.abs(p.vel.y) < 1.4) { p.vel.y = 0; p.resting = true; }
        } else p.pos.addScaledVector(_pd, L);
      }
    }
    p.mesh.position.copy(p.pos);
    if ((p.type === 'tknife' || p.impact) && !p.stuck) p.mesh.lookAt(p.pos.x - p.vel.x, p.pos.y - p.vel.y, p.pos.z - p.vel.z);
    else if (!p.stuck && !p.attach && !p.resting) { p.mesh.rotation.x += dt * 9; p.mesh.rotation.z += dt * 5; }
    p.fuse -= dt;
    if (p.fuse <= 0) { scene.remove(p.mesh); G.proj.splice(i, 1); detonate(p); }
  }
}
function losPoint(pos, e) {
  tmpO.set(pos.x, pos.y + .25, pos.z);
  tmpV.set(e.pos.x - tmpO.x, e.pos.y + e.height * .6 - tmpO.y, e.pos.z - tmpO.z);
  const L = tmpV.length(); if (L < .15) return true; tmpV.divideScalar(L);
  return rayWorld(tmpO, tmpV, L) >= L - .15;
}
// fireball, smoke and debris for anything in BLAST (also replayed by the kill cam)
function boomFx(type, x, y, z) {
  const s = (BLAST[type] || BLAST.frag).fx;
  puff(x, y + .4, z, softTex(255, 180, 70), .6 * s, 4.8 * s, .35, 1);
  puff(x, y + .3, z, softTex(255, 120, 40), .4 * s, 3.2 * s, .25 + .1 * (s - 1), 1);
  for (let k = 0; k < Math.round(5 * s); k++) puff(x + rand(-.6, .6) * s, y + .5 + rand(0, .6), z + rand(-.6, .6) * s, softTex(60, 56, 52), .8, rand(3.5, 5) * s, rand(1.6, 2.6), .7, .9);
  burst(x, y + .2, z, 'wall', 14); if (s > 1.1) burst(x, y + .3, z, 'fire', 10);
}
function detonate(p) {
  // a copy of a grenade someone else threw: the fireball and the flash, but its owner deals the damage
  NET_GHOST = !!p.ghost;
  try { detonateNow(p); } finally { NET_GHOST = false; }
}
function detonateNow(p) {
  const { x, y, z } = p.pos, o = p.owner;
  if (!G.zm) G.events.push({ t: G.now, k: 'boom', type: p.type, x, y, z });
  if (p.type === 'tknife') return;
  if (p.type === 'smoke') { makeSmoke(x, y, z); foleyAt('hiss', x, z, .8, 40); return; }
  const P = G.player, B = BLAST[p.type];
  if (B) {
    boomFx(p.type, x, y, z);
    flashLight.position.set(x, y + 1, z); flashLight.intensity = 6 * B.fx;
    foleyAt('boom', x, z, 1.2 * Math.min(1.25, B.fx), 140);
    const pk = p.papK || 1;
    if (p.direct && p.direct.alive) applyDamage(p.direct, o, (p.type === 'rocket' ? 150 : 80) * pk, false, B.w);
    for (const e of G.ents) {
      if (!e.alive || (e !== o && !isEnemy(o, e))) continue;
      const d = Math.hypot(e.pos.x - x, e.pos.y + .9 - y, e.pos.z - z);
      if (d > B.r || !losPoint(p.pos, e)) continue;
      applyDamage(e, o, (e === o ? .6 : pk) * (B.dmg * Math.pow(1 - d / B.r, 1.15) + (d < 1.6 ? B.close : 0)), false, B.w);
    }
    for (const b of G.ents) if (b.isBot && b.alive && Math.hypot(b.pos.x - x, b.pos.z - z) < 30 && isEnemy(b, o)) { b.lastKnown = o.pos.clone(); b.lastKnownT = G.now; }
    if (P && P.alive) { const d = Math.hypot(P.pos.x - x, P.pos.z - z), R = 16 * B.fx; if (d < R) { G.shake = Math.max(G.shake, 1 - d / R); rumble(.9 * (1 - d / R), .8, 400); } }
    return;
  }
  if (p.type === 'flash') {
    puff(x, y + .4, z, softTex(255, 255, 240), .5, 6, .25, 1);
    flashLight.position.set(x, y + 1, z); flashLight.intensity = 8;
    foleyAt('bang', x, z, 1.1, 120);
    for (const e of G.ents) {
      if (!e.alive || (e !== o && !isEnemy(o, e)) || !netMine(e)) continue;
      eyeOf(e, tmpO); const dx = x - tmpO.x, dy = y + .2 - tmpO.y, dz = z - tmpO.z, d = Math.hypot(dx, dy, dz);
      if (d > 15 || !losPoint(p.pos, e)) continue;
      const f = dirFrom(e.yaw, e.pitch, new THREE.Vector3()), facing = (f.x * dx + f.y * dy + f.z * dz) / Math.max(d, .1);
      const amt = clamp((1 - d / 15) * (.35 + .65 * Math.max(0, facing)) * 1.5, 0, 1), dur = 3.2 * amt * (hasPerk(e, 'tacmask') ? .33 : 1);
      if (dur < .2) continue;
      if (e === P) { G.flashFx = Math.max(G.flashFx, dur); if (AC) tone(3300, Math.min(3, dur), .1 * amt, 'sine'); }
      else { e.blindT = Math.max(e.blindT, dur); e.targetVisible = false; }
    }
    return;
  }
  if (p.type === 'stun') {
    puff(x, y + .4, z, softTex(150, 190, 255), .5, 4.5, .4, .9);
    foleyAt('zap', x, z, 1, 80);
    for (const e of G.ents) {
      if (!e.alive || (e !== o && !isEnemy(o, e)) || !netMine(e)) continue;
      const d = Math.hypot(e.pos.x - x, e.pos.z - z);
      if (d > 10 || !losPoint(p.pos, e)) continue;
      const dur = 3.2 * (1 - d / 10 * .5) * (hasPerk(e, 'tacmask') ? .33 : 1);
      if (e === P) G.stunFx = Math.max(G.stunFx, dur); else e.stunT = Math.max(e.stunT, dur);
    }
  }
}
function makeSmoke(x, y, z) {
  G.smokes.push({ x, y: 1.2, z, r: 0, t: 0, life: 13 });
  const tex = softTex(205, 205, 198);
  for (let k = 0; k < 26; k++) {
    const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * 3.3;
    puff(x + Math.cos(a) * rr, .3 + Math.random() * 2.8, z + Math.sin(a) * rr, tex, .6, rand(3.4, 4.8), 13 + rand(-1, 1), .92, .02, 2.5, 1.6);
  }
}
function updateSmokes(dt) {
  for (let i = G.smokes.length - 1; i >= 0; i--) {
    const c = G.smokes[i]; c.t += dt;
    c.r = 4.3 * Math.min(1, c.t / 1.5) * (c.t > c.life - 2 ? Math.max(0, (c.life - c.t) / 2) : 1);
    if (c.t >= c.life) G.smokes.splice(i, 1);
  }
}
function smokeBlocks(a, bx, by, bz) {
  for (const c of G.smokes) {
    if (c.r < .6) continue;
    const dx = bx - a.x, dy = by - a.y, dz = bz - a.z, L2 = dx * dx + dy * dy + dz * dz || 1;
    const t = clamp(((c.x - a.x) * dx + (c.y - a.y) * dy + (c.z - a.z) * dz) / L2, 0, 1);
    const px = a.x + dx * t - c.x, py = a.y + dy * t - c.y, pz = a.z + dz * t - c.z;
    if (px * px + py * py * .5 + pz * pz < c.r * c.r * .8) return true;
  }
  return false;
}
function botThrow(b, type, tgt) {
  const dx = tgt.x - b.pos.x, dz = tgt.z - b.pos.z, d = Math.hypot(dx, dz);
  const s = clamp(17 * d / (17 * 17), 0, 1);
  const y0 = b.yaw, p0 = b.pitch;
  b.yaw = Math.atan2(-dx, -dz) + gauss() * .05; b.pitch = .5 * Math.asin(s) - .14 + gauss() * .03;
  throwItem(b, type);
  b.yaw = y0; b.pitch = p0;
}
