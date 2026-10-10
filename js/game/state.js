// Blast Radius \u00B7 game state and entities
'use strict';

/* ================= GAME STATE ================= */
const G = { state: 'menu', mode: 'tdm', now: 0, timeLeft: 600, limit: 40, teamScore: { A: 0, B: 0 }, ents: [], tags: [], drops: [], packs: [], player: null, bannerT: 0, ended: false,
  adsT: 0, kick: 0, bob: 0, firedPress: false, swapT: 0, meleeT: 0, meleeHit: false, useT: 0, nearDrop: null, slideCD: 0, slideDir: { x: 0, z: -1 }, sprinting: false, eye: 1.62, roll: 0, stepAcc: 0, flashT: 0,
  proj: [], smokes: [], rec: [], events: [], kc: null, kcSkip: false, lastKill: null, myDeath: null, endT: 0, throwT: 0, thrown: false, throwType: null, flashFx: 0, stunFx: 0, shake: 0,
  hold: null, mantle: null, sprintOutT: 0, lagX: 0, lagY: 0, landT: 0, airT: 0, recoilR: 0, recoilY: 0, flinchP: 0, flinchY: 0, idleT: 0, laserOn: false, cookBeep: 0, glSwapT: 0 };
const isEnemy = (a, b) => a !== b && (G.mode === 'ffa' ? true : a.team !== b.team);

// atts: { muzzle, barrel, under, mag, stock } (or a single attachment key, or nothing)
function makeWeapon(key, optic, atts, ammoT) {
  const d = WEAPONS[key];
  if (typeof atts === 'string') atts = atts !== 'none' && ATTS[atts] ? { [ATTS[atts].slot]: atts } : null;
  const list = attList(atts).filter(k => attsFor(key).includes(k));
  const has = k => list.includes(k);
  const m = { recoil: 1, hip: 1, range: 1, ads: 1, speed: 1, reload: 1, adsMove: 1 };
  for (const k of list) for (const [stat, v] of Object.entries(ATTS[k].mods)) m[stat] *= v;
  // ammo type
  const at = ammoFor(key).includes(ammoT) ? ammoT : 'std', am = AMMO[at], ak = am.k;
  for (const stat of ['recoil', 'hip', 'range']) if (ak[stat]) m[stat] *= ak[stat];
  const pellets = ak.slug ? 1 : d.pellets;
  const dmgK = (ak.dmg || 1) * (ak.slug ? d.pellets * .55 : 1), headK = ak.head || 1;
  let mag = d.mag; if (has('extmag')) mag = d.perShell ? d.mag + 3 : Math.round(d.mag * 1.5);
  const op = opticsFor(key).includes(optic) ? optic : defaultOptic(key);
  const adsFov = op === 'scope' ? (d.type === 'sniper' ? d.adsFov : .3) : op === 'acog' ? Math.min(d.adsFov, .55) : d.adsFov;
  const adsTime = d.adsTime * (op === 'acog' ? 1.1 : op === 'scope' && d.type !== 'sniper' ? 1.2 : 1) * m.ads;
  return { key, d, optic: op, atts: list, has, m, adsFov, adsTime, mag, ammo: mag, reserve: d.reserve, burstLeft: 0,
    ammoT: at, am, pellets, dmgK, headK, adsS: d.ads * (ak.ads || 1), splash: am.splash || d.splash || null,
    gl: has('gl') ? { ammo: 1, reserve: 2, reloadT: 0, cd: 0 } : null, glMode: false,
    cd: 0, reloadT: 0, reloadDur: 1, reloading: false, shellMode: false, needPump: false, reloadEmpty: false, cycleT: 0 };
}
const hasPerk = (e, k) => !!(e && e.perks && e.perks.includes(k));
const wSpreadHip = (w, e) => w.d.spread * w.m.hip * (hasPerk(e, 'steady') ? .65 : 1);
const wRecoil = w => w.d.recoil * w.m.recoil;
const wRange = w => w.d.range * w.m.range;
const wAttsOf = w => w.atts.reduce((o, k) => (o[ATTS[k].slot] = k, o), noAtts());

let nextId = 1;
function botLoadout() {
  const r = Math.random();
  const pool = r < .32 ? ['ar', 'ar', 'kestrel', 'bulldog'] : r < .58 ? ['smg', 'smg', 'wasp', 'brute'] : r < .72 ? ['shotgun', 'shotgun', 'riot', 'coach'] : r < .85 ? ['lmg', 'lmg', 'anvil'] : r < .92 ? ['dmr'] : ['sniper', 'sniper', 'hammer'];
  const key = pool[Math.random() * pool.length | 0];
  const optics = opticsFor(key), optic = optics.length > 1 && Math.random() < .55 ? optics[1 + Math.random() * (optics.length - 1) | 0] : optics[0];
  const atts = noAtts(), ok = attsFor(key).filter(a => a !== 'suppressor' || Math.random() < .3);
  for (let n = Math.random() * 3 | 0; n > 0; n--) { const a = ok[Math.random() * ok.length | 0]; if (a && atts[ATTS[a].slot] === 'none') atts[ATTS[a].slot] = a; }
  const sec = SECONDARIES[Math.random() * SECONDARIES.length | 0];
  const perks = PERK_TIERS.map(([t]) => { const l = Object.keys(PERKS).filter(k => PERKS[k].tier === t && k !== 'coldblooded'); return l[Math.random() * l.length | 0]; });
  return { primary: key, optic, atts, secondary: sec, secOptic: 'iron', secAtts: noAtts(), perks, wildcard: 'none' };
}
function makeEntity(name, team, isBot, cls) {
  const e = { id: nextId++, name, team, isBot, pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, height: 1.8, stance: 'stand', slideT: 0,
    onGround: true, health: 100, maxHealth: 100, alive: false, respawnT: 0, lastDmgT: -99, kills: 0, deaths: 0, score: 0, confirms: 0, streak: 0,
    weapons: [], wi: 0, lastShotT: -99, deathT: 0, perks: (cls.perks || []).slice(), cls };
  e.weapons = [makeWeapon(cls.primary, cls.optic, cls.atts, cls.ammo), makeWeapon(cls.secondary, cls.secOptic, cls.secAtts, cls.secAmmo)];
  if (isBot) {
    const col = G.mode === 'ffa' ? 0xD9773F : TEAMS[team].color;
    e.model = buildSoldier(col, cls.primary, cls.optic, cls.atts); scene.add(e.model.group);
    e.model.group.visible = false;
    if (G.mode !== 'ffa' && team === 'A') { e.tag = nameTag(name, '#8FC2F2'); e.tag.position.y = 2.15; e.model.group.add(e.tag); }
    Object.assign(e, { thinkT: Math.random() * .2, target: null, targetVisible: false, reactT: 0, aimOffY: 0, aimOffP: 0, strafeT: 0, strafeDir: 1,
      burstT: 0, pauseT: 0, path: null, pi: 0, goal: null, repathT: 0, smoothT: 0, lastKnown: null, lastKnownT: -99, alertT: -99,
      stuckT: 0, stuckPos: new THREE.Vector3(), walkPhase: Math.random() * 6, aimHead: false, prevTarget: null, lastSeenT: -99,
      meleeT: 0, stepAcc: 0, flashT: 0, sprinting: false, slideCD: 0, jumpCD: 0 });
  }
  return e;
}
const weapon = e => e.weapons[e.wi];
