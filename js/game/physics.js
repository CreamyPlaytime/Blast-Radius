// Blast Radius \u00B7 movement, collision, spawning
'use strict';

/* ---------- physics ---------- */
const R = .38, STEP = .55, GRAV = 19;
function blocking(b, e) { return b.max.y > e.pos.y + (b.noStand ? .05 : STEP) && b.min.y < e.pos.y + e.height; }
function collide(e) {
  for (let pass = 0; pass < 2; pass++) for (const b of boxes) {
    if (!blocking(b, e)) continue;
    if (b.round) { // cylinder: always push straight out from the middle, even if we ended up deep inside
      const c = b.round, dx = e.pos.x - c.x, dz = e.pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + R;
      if (d >= m) continue;
      if (d > 1e-6) { e.pos.x = c.x + dx / d * m; e.pos.z = c.z + dz / d * m; } else e.pos.x = c.x + m;
      continue;
    }
    const cx = clamp(e.pos.x, b.min.x, b.max.x), cz = clamp(e.pos.z, b.min.z, b.max.z);
    const dx = e.pos.x - cx, dz = e.pos.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= R * R) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2), push = (R - d) / d; e.pos.x += dx * push; e.pos.z += dz * push; }
    else if (b.min.y > e.pos.y + Math.min(1, e.height * .6)) continue; // only the head is in it: don't shove sideways through walls
    else {
      const pl = e.pos.x - b.min.x + R, pr = b.max.x - e.pos.x + R, pb = e.pos.z - b.min.z + R, pf = b.max.z - e.pos.z + R;
      const m = Math.min(pl, pr, pb, pf);
      if (m === pl) e.pos.x -= pl; else if (m === pr) e.pos.x += pr; else if (m === pb) e.pos.z -= pb; else e.pos.z += pf;
    }
  }
}
function groundAt(e) {
  let g = 0;
  for (const b of boxes) {
    if (b.noStand || b.max.y > e.pos.y + STEP || b.max.y <= g) continue;
    if (e.pos.x + R * .7 < b.min.x || e.pos.x - R * .7 > b.max.x || e.pos.z + R * .7 < b.min.z || e.pos.z - R * .7 > b.max.z) continue;
    if (b.round && Math.hypot(e.pos.x - b.round.x, e.pos.z - b.round.z) > b.round.r + R * .7) continue;
    g = b.max.y;
  }
  return g;
}
function canStand(e, h) {
  for (const b of boxes) {
    if (b.min.y <= e.pos.y + e.height - .02 || b.min.y >= e.pos.y + h) continue;
    if (e.pos.x + R < b.min.x || e.pos.x - R > b.max.x || e.pos.z + R < b.min.z || e.pos.z - R > b.max.z) continue;
    return false;
  }
  return true;
}
function moveEntity(e, wx, wz, speed, dt, accel) {
  const acc = accel || (e.onGround ? 14 : 2.5), k = Math.min(1, acc * dt);
  e.vel.x += (wx * speed - e.vel.x) * k;
  e.vel.z += (wz * speed - e.vel.z) * k;
  e.vel.y -= GRAV * dt;
  e.pos.x += e.vel.x * dt; e.pos.z += e.vel.z * dt;
  collide(e);
  const vyBefore = e.vel.y;
  e.pos.y += e.vel.y * dt;
  if (e.vel.y > 0) for (const b of boxes) {
    if (b.min.y < e.pos.y + STEP) continue;
    if (e.pos.x + R < b.min.x || e.pos.x - R > b.max.x || e.pos.z + R < b.min.z || e.pos.z - R > b.max.z) continue;
    if (e.pos.y + e.height > b.min.y) { e.pos.y = b.min.y - e.height; e.vel.y = 0; }
  }
  const g = groundAt(e);
  const was = e.onGround;
  if (e.pos.y <= g + .001) { e.pos.y = g; if (e.vel.y < 0) e.vel.y = 0; e.onGround = true; }
  else e.onGround = false;
  if (!was && e.onGround && vyBefore < -6 && e === G.player) foley('land', .7);
}

/* ---------- mantling: climb onto ledges and vault through windows ---------- */
function clearAt(x, z, y, h, r = R) {
  for (const b of boxes) {
    if (b.max.y <= y + .03 || b.min.y >= y + h) continue;
    if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
    return false;
  }
  return true;
}
// highest walkable top in (y0, y1] under a small footprint
function topAt(x, z, y0, y1, r = .06) {
  let t = -1;
  for (const b of boxes) {
    if (b.noMantle || b.max.y <= y0 || b.max.y > y1) continue;
    if (x + r < b.min.x || x - r > b.max.x || z + r < b.min.z || z - r > b.max.z) continue;
    if (b.max.y > t) t = b.max.y;
  }
  return t;
}
// a plan to climb whatever is in front of e along (dx, dz), or null
function findMantle(e, dx, dz, reach = 2.05, roomH = 1.15) {
  const L = Math.hypot(dx, dz); if (L < .01) return null; dx /= L; dz /= L;
  const y = e.pos.y;
  let h = -1;
  for (const d of [R + .1, R + .28, R + .46]) { h = topAt(e.pos.x + dx * d, e.pos.z + dz * d, y + STEP * .8, y + reach); if (h > 0) break; }
  if (h < 0 || h - y < STEP * .8) return null;
  // room to rise straight up where we stand
  // room to rise straight up where we stand: nothing between chest height and the top of the climb
  if (!clearAt(e.pos.x, e.pos.z, y + Math.min(1, e.height * .55), h + roomH - y - Math.min(1, e.height * .55), R * .9)) return null;
  for (let d = R + .08; d <= R + 1.3; d += .08) {
    const px = e.pos.x + dx * d, pz = e.pos.z + dz * d;
    if (!clearAt(px, pz, h, roomH)) { if (d > R + .5) return null; continue; }
    // vault over if the ground falls away just past the ledge, otherwise step onto it
    let tx = px, tz = pz, vault = false;
    for (let d2 = d + .08; d2 <= d + .95; d2 += .08) {
      const qx = e.pos.x + dx * d2, qz = e.pos.z + dz * d2;
      if (!clearAt(qx, qz, h, roomH)) break;
      tx = qx; tz = qz;
      if (topAt(qx, qz, -1, h + .02, R * .95) < h - .35) { vault = true; break; }
    }
    if (!vault) { const nx = px + dx * .22, nz = pz + dz * .22; if (clearAt(nx, nz, h, roomH)) { tx = nx; tz = nz; } else { tx = px; tz = pz; } }
    return { fx: e.pos.x, fy: y, fz: e.pos.z, tx, ty: h + .02, tz, rise: h - y, vault, dx, dz, t: 0, dur: .26 + (h - y) * .16, h: roomH };
  }
  return null;
}
// moves e along a mantle plan; returns true while it is still climbing
function stepMantle(e, M, dt) {
  M.t += dt;
  const k = clamp(M.t / M.dur, 0, 1), up = clamp(k / .55, 0, 1), fwd = clamp((k - .3) / .7, 0, 1);
  const ease = v => v * v * (3 - 2 * v);
  e.pos.set(lerp(M.fx, M.tx, ease(fwd)), lerp(M.fy, M.ty, ease(up)) + Math.sin(up * Math.PI) * .06, lerp(M.fz, M.tz, ease(fwd)));
  e.vel.set(0, 0, 0);
  if (k >= 1) {
    e.pos.set(M.tx, M.ty, M.tz);
    if (M.vault) { e.vel.x = M.dx * 2.6; e.vel.z = M.dz * 2.6; }
    e.onGround = !M.vault; return false;
  }
  return true;
}

/* ---------- spawning ---------- */
function pickSpawn(e) {
  const list = G.mode === 'ffa' ? SPAWNS.ffa : SPAWNS[e.team];
  const foes = G.ents.filter(o => o.alive && isEnemy(e, o));
  const scored = list.map(p => {
    let md = 99;
    for (const f of foes) md = Math.min(md, Math.hypot(f.pos.x - p.x, f.pos.z - p.z));
    return { p, s: md + Math.random() * 4 };
  }).sort((a, b) => b.s - a.s);
  return scored[Math.floor(Math.random() * Math.min(3, scored.length))].p;
}
function spawn(e) {
  const p = pickSpawn(e);
  e.pos.set(p.x + rand(-.3, .3), 0, p.z + rand(-.3, .3));
  e.vel.set(0, 0, 0);
  e.yaw = Math.atan2(e.pos.x - MAP.center[0], e.pos.z - MAP.center[1]); e.pitch = 0;
  e.health = 100; e.alive = true; e.streak = 0; e.stance = 'stand'; e.height = 1.8; e.slideT = 0;
  if (!e.isBot) {
    const cls = settings.classes[settings.classIdx];
    e.cls = cls; e.perks = cls.perks.slice();
    e.weapons = [makeWeapon(cls.primary, cls.optic, cls.atts, cls.ammo), makeWeapon(cls.secondary, cls.secOptic, cls.secAtts, cls.secAmmo)];
    const extra = cls.wildcard === 'danger' ? 1 : 0, none = cls.wildcard === 'overload';
    e.lethal = cls.lethal; e.tact = cls.tact; e.lethalN = none ? 0 : LETHALS[cls.lethal].count + extra; e.tactN = none ? 0 : TACTICALS[cls.tact].count + extra;
  } else { e.lethal = Math.random() < .75 ? 'frag' : Math.random() < .5 ? 'semtex' : 'tknife'; e.lethalN = 1; e.tact = ['flash', 'smoke', 'stun'][Math.random() * 3 | 0]; e.tactN = 1; e.nadeCD = rand(4, 10); }
  e.blindT = 0; e.stunT = 0; e.burnT = 0;
  e.weapons.forEach(w => { w.ammo = w.mag; w.reserve = e.isBot ? 999 : w.d.reserve; w.reloadT = 0; w.reloading = false; w.shellMode = false; w.cd = 0; w.cycleT = 0; w.glMode = false; if (w.gl) Object.assign(w.gl, { ammo: 1, reserve: 2, reloadT: 0, cd: 0 }); });
  e.wi = 0;
  if (e.isBot) {
    e.target = null; e.targetVisible = false; e.path = null; e.goal = null; e.lastKnown = null; e.meleeT = 0; e.claimTag = null; e.holdT = 0; e.held = false;
    e.ow = Math.random() < ({ sniper: .75, dmr: .5, lmg: .35, ar: .15 }[e.weapons[0].d.type] || .06);
    e.slideT = 0; e.sprinting = false; e.mantle = null;
    setBotCrouch(e, false);
    e.model.group.visible = true; e.model.group.rotation.set(0, e.yaw, 0); e.model.group.position.copy(e.pos);
  } else {
    setViewmodel(weapon(e));
    G.adsT = 0; G.eye = STANCE.stand.eye; G.meleeT = 0; G.hold = null; G.mantle = null; G.throwT = 0; G.sprintOutT = 0;
    if (e.model) scene.remove(e.model.group);
    e.model = buildSoldier(TEAMS[e.team] ? TEAMS[e.team].color : TEAMS.A.color, e.cls.primary, e.cls.optic, e.cls.atts); scene.add(e.model.group);
    e.model.group.visible = false; e.model.group.position.copy(e.pos); e.model.group.rotation.set(0, e.yaw, 0);
  }
}
