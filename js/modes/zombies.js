// Blast Radius \u00B7 zombies: endless rounds of the undead on a night version of the map
'use strict';

const ZM_DIFF = {
  casual: { name: 'Casual', hp: .7, dmg: .7, speed: .85, desc: 'Weaker, slower zombies that hit softer.' },
  normal: { name: 'Normal', hp: 1, dmg: 1, speed: 1, desc: 'The real thing. Zombies get tougher every round.' },
};
const ZM_POWERUPS = {
  maxammo:   { name: 'Max Ammo', color: '#8CFF6A', w: .27 },
  instakill: { name: 'Insta-Kill', color: '#FF5A4A', w: .22 },
  double:    { name: 'Double Points', color: '#F2B53B', w: .27 },
  nuke:      { name: 'Kaboom', color: '#FF8A3A', w: .13 },
  firesale:  { name: 'Fire Sale', color: '#4FB8FF', w: .11 },
};
// maps with a zombies layout, as the menu lists them
const ZM_MAPS = {
  acres:   { label: 'Atomic Acres \u00B7 Night', desc: 'The test town after dark. Zombies dig up out of the yards and the street.' },
  freight: { label: 'Freight \u00B7 Night', desc: 'The container yard in the rain. Tight lanes, nowhere to run, and they crawl out of every gap.' },
  gate9:   { label: 'Gate 9 \u00B7 Night', desc: 'The departure lounge and the dark apron. Hold the terminal or make a run for the jet.' },
};
const zmMapKey = k => ZM_MAPS[k] && MAPS[k] && MAPS[k].zombies ? k : 'acres';
const ZM_BOX_COST = 950, ZM_FIRESALE_COST = 10;
const zmBoxCost = () => G.zm && G.zm.fireSaleT > 0 ? ZM_FIRESALE_COST : ZM_BOX_COST;
const ZM_BOX_POOL = ['ar', 'bulldog', 'kestrel', 'smg', 'wasp', 'brute', 'lmg', 'anvil', 'shotgun', 'riot', 'coach', 'dmr', 'sniper', 'hammer', 'magnum', 'trio', 'revolver', 'mp', 'rpg', 'atomizer'];
const zmHealth = r => Math.round((r < 10 ? 100 + 50 * (r - 1) : 550 * Math.pow(1.08, r - 9)) * G.zm.diff.hp);
const zmCount = r => r <= 5 ? [6, 8, 13, 18, 24][r - 1] : Math.round(24 + (r - 5) * 2.6);
const zmMaxRes = w => Math.round(w.d.reserve * (w.key === 'atomizer' ? 1 : 2) * (w.upgraded ? 1.5 : 1));
let zid = 10000;

/* ---------- starting and stopping ---------- */
// cfg: the host's settings when playing with friends (otherwise this window's own)
function startZombies(cfg) {
  initAudio(); stopMusic();
  clearMatch();
  const C = cfg || { zs: settings.zmStart, zd: settings.zmDiff, zm: settings.zmMap };
  const mapKey = zmMapKey(C.zm);
  loadMap(mapKey, 'night'); zmNightSky();
  const L = MAPS[mapKey].zombies;
  G.mode = 'zombies'; G.limit = 0; G.timeLeft = Infinity; G.now = 0; G.teamScore = { A: 0, B: 0 }; G.ended = false; G.endT = 0;
  const player = makeEntity(settings.profile.name || 'You', 'A', false, settings.classes[settings.classIdx]);
  G.player = player; G.ents.push(player);
  spawn(player);
  player.pos.set(L.start.x + (NET.on ? rand(-1.2, 1.2) : 0), 0, L.start.z + (NET.on ? rand(-1.2, 1.2) : 0)); player.yaw = L.start.yaw;
  player.weapons = [makeWeapon('pistol', 'iron', null)]; player.weapons[0].reserve = 96; player.wi = 0;
  player.lethal = 'frag'; player.lethalN = 2; player.tact = null; player.tactN = 0; player.perks = [];
  player.zmPerks = new Set(); player.maxHealth = 100; player.health = 100;
  setViewmodel(weapon(player));
  const start = C.zs || 1;
  G.zm = {
    layout: L, diff: ZM_DIFF[C.zd] || ZM_DIFF.normal, round: 0, toSpawn: 0, spawnT: 0, breakT: 0, roundN: 0, bleed: false, dead: false,
    points: 500 + 400 * (start - 1), total: 0, kills: 0, heads: 0, knifes: 0, downs: 0,
    power: { instakill: 0, double: 0 }, fireSaleT: 0, map: mapKey, pap: null, drops: [], dropsRound: 0, budget: 3,
    meshes: [], boxes: [], uses: [], near: null, down: 0, invuln: 0, over: false, startRound: start,
  };
  zmBuildProps(L);
  surfBuild();   // every surface the horde can stand on, with the props in place
  surfField(player, player);   // and the first route to you, worked out now rather than mid-fight
  zmPrewarm();   // build and compile everything zombies mode only makes later, so none of it stalls a round
  camera.fov = settings.fov; camera.updateProjectionMatrix();
  torch.intensity = LIGHTING.night.torch;
  showGameScreen();
  $('#zmHud').hidden = false; $('#hud').classList.add('zm');
  G.state = 'playing';
  lastHud = '';
  if (NET.on) netMatchBegun();
  if (!netClient()) zmStartRound(start);   // a friend's window follows the host's rounds
  if (!padActive()) lockPointer();
}
/* The first time something new is drawn (a bloater, a hellhound's flames, a power-up), the browser stops to
   build its model and compile its shaders, which on some machines takes a few hundred milliseconds and lands at a
   round change. So during the loading screen, one of every kind is built, put out of sight, compiled, removed.  */
function zmPrewarm() {
  const g = new THREE.Group(); g.position.set(0, -400, 0);
  try {
    for (const kind of Object.keys(ZVARIANTS)) for (let v = 0; v < ZVARIANTS[kind]; v++) g.add(zTemplate(kind, v).clone(true));
    g.add(buildHound().group);
    for (const type of Object.keys(ZM_POWERUPS)) g.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: dropTexture(type), transparent: true, depthWrite: false, fog: false })));
    g.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(80, 66, 50), transparent: true, depthWrite: false, opacity: .5 })));
    g.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(255, 120, 40), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    if (typeof sparkMats !== 'undefined') for (const m of Object.values(sparkMats)) g.add(new THREE.Mesh(new THREE.BoxGeometry(.01, .01, .01), m));
    scene.add(g);
    renderer.compile(scene, camera);
  } catch (e) { console.warn('prewarm', e); }
  scene.remove(g);
}
function zmTeardown() {
  const Z = G.zm; if (!Z) return;
  for (const m of Z.meshes) scene.remove(m);
  for (const b of Z.boxes) { const i = boxes.indexOf(b); if (i >= 0) boxes.splice(i, 1); }
  SURF = null;
  for (const d of Z.drops) scene.remove(d.sprite);
  rebuildNav();
  G.zm = null;
  applyLighting('day'); torch.intensity = 0;
  $('#zmHud').hidden = true; $('#hud').classList.remove('zm');
}

// maps built for daytime have no night sky: give them a dark dome with a scatter of stars for zombies
function zmNightSky() {
  if (SKY.night || !MAP) return;
  const g = new THREE.SphereGeometry(410, 20, 12), pos = g.attributes.position, cols = [], c = new THREE.Color(), top = new THREE.Color(0x05080E), hor = new THREE.Color(0x141C26);
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 410; c.copy(hor).lerp(top, clamp(y * 2, 0, 1)); cols.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const grp = new THREE.Group(); grp.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
  const N = 500, sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const a = Math.random() * TAU, e = Math.asin(Math.random() * .95 + .05); sp.set([Math.cos(a) * Math.cos(e) * 400, Math.sin(e) * 400, Math.sin(a) * Math.cos(e) * 400], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  grp.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xC8D4E8, size: 1.6, sizeAttenuation: false, fog: false })));
  SKY.night = grp; WORLD.add(grp);
  applyLighting('night');
}

/* ---------- props: wall-buys, mystery box, perk machines ---------- */
function zmAddBox(x1, y1, z1, x2, y2, z2) { const b = addBox(x1, y1, z1, x2, y2, z2, 0, { noMesh: true }); G.zm.boxes.push(b); return b; }
function zmMesh(m) { scene.add(m); G.zm.meshes.push(m); return m; }
function chalkTexture(key, cost) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.strokeStyle = 'rgba(240,240,230,.9)'; x.fillStyle = 'rgba(240,240,230,.92)'; x.lineCap = 'round';
  const line = (x1, y1, x2, y2) => { for (let k = 0; k < 3; k++) { x.lineWidth = 3 + Math.random() * 3; x.beginPath(); x.moveTo(x1 + rand(-3, 3), y1 + rand(-3, 3)); x.lineTo(x2 + rand(-3, 3), y2 + rand(-3, 3)); x.stroke(); } };
  const rect = (a, b, w, h) => { line(a, b, a + w, b); line(a + w, b, a + w, b + h); line(a + w, b + h, a, b + h); line(a, b + h, a, b); };
  // a rough gun silhouette, sized by type
  const len = { pistol: 160, mp: 190, revolver: 190, smg: 280, ar: 380, shotgun: 400, lmg: 400, sniper: 440, dmr: 420 }[WEAPONS[key].type === 'pistol' ? key in { mp: 1, revolver: 1 } ? key : 'pistol' : WEAPONS[key].type] || 320;
  const ox = 256 - len / 2, oy = 70;
  rect(ox + len * .18, oy, len * .5, 34);                  // receiver
  line(ox + len * .68, oy + 12, ox + len, oy + 12);         // barrel
  line(ox + len * .68, oy + 22, ox + len, oy + 22);
  if (len > 250) rect(ox, oy + 6, len * .18, 30);           // stock
  rect(ox + len * .3, oy + 34, 22, 46);                      // grip
  if (key !== 'shotgun' && key !== 'revolver' && key !== 'coach') rect(ox + len * .48, oy + 34, 26, 56); // magazine
  x.font = '700 40px "Saira Condensed", "Arial Narrow", sans-serif'; x.textAlign = 'center';
  x.fillText(WEAPONS[key].name.toUpperCase(), 256, 196);
  x.font = '700 30px "Saira Condensed", "Arial Narrow", sans-serif'; x.fillStyle = 'rgba(242,181,59,.95)';
  x.fillText(`${cost}`, 256, 236);
  const t = new THREE.CanvasTexture(c); return t;
}
function labelTexture(text, bg, fg = '#FFFFFF') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 256, 64); x.fillStyle = fg; x.font = '800 36px "Saira Condensed", "Arial Narrow", sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text.toUpperCase(), 128, 34);
  return new THREE.CanvasTexture(c);
}
function zmBuildProps(L) {
  const Z = G.zm;
  // wall-buys
  for (const wb of L.walls) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .75), new THREE.MeshBasicMaterial({ map: chalkTexture(wb.key, wb.cost), transparent: true, depthWrite: false }));
    m.position.set(wb.x, wb.y, wb.z); m.rotation.y = Math.atan2(wb.n[0], wb.n[1]); zmMesh(m);
    Z.uses.push({
      x: wb.x + wb.n[0] * .2, y: wb.y - 1.4, z: wb.z + wb.n[1] * .2, n: wb.n, r: 1.9,
      cost: () => G.player.weapons.some(w => w.key === wb.key) ? Math.round(wb.cost / 2) : wb.cost,
      text: () => G.player.weapons.some(w => w.key === wb.key) ? `ammo for the ${WEAPONS[wb.key].name}` : `the ${WEAPONS[wb.key].name}`,
      use: () => zmGive(wb.key),
    });
  }
  // mystery box
  const B = L.box, bx = new THREE.Group(); bx.position.set(B.x, 0, B.z); bx.rotation.y = B.rot; zmMesh(bx);
  const wood = mat(0x6B4A30, 'crate'), qm = new THREE.MeshBasicMaterial({ map: labelTexture('?', '#3A2616', '#8FD0FF') });
  const base = new THREE.Mesh(boxGeo(1.6, .55, .8, 1.2), wood); base.position.y = .3; base.castShadow = true; bx.add(base);
  for (const sz of [-.41, .41]) { const q = new THREE.Mesh(new THREE.PlaneGeometry(.5, .32), qm); q.position.set(0, .32, sz); q.rotation.y = sz < 0 ? Math.PI : 0; bx.add(q); }
  const lid = new THREE.Group(); lid.position.set(0, .58, -.4); bx.add(lid);
  const lidM = new THREE.Mesh(boxGeo(1.62, .08, .82, 1.2), wood); lidM.position.set(0, .04, .4); lid.add(lidM);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.35, .5, 40, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x9FD4FF, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 20.5; bx.add(beam);
  const show = new THREE.Group(); show.position.y = .7; bx.add(show);
  const cos = Math.abs(Math.cos(B.rot)) > .5;
  zmAddBox(B.x - (cos ? .8 : .4), 0, B.z - (cos ? .4 : .8), B.x + (cos ? .8 : .4), .66, B.z + (cos ? .4 : .8));
  Z.box = { state: 'idle', t: 0, lid, beam, show, gun: null, key: null, next: 0, cost: ZM_BOX_COST, x: B.x, z: B.z };
  Z.uses.push({
    x: B.x, y: 0, z: B.z, n: null, r: 1.9,
    cost: () => Z.box.state === 'idle' ? zmBoxCost() : 0,
    text: () => Z.box.state === 'idle' ? (Z.fireSaleT > 0 ? 'a random weapon \u00B7 FIRE SALE' : 'a random weapon') : Z.box.state === 'offer' ? `the ${WEAPONS[Z.box.key].name}` : null,
    use: () => zmBoxUse(),
  });
  // perk machines
  for (const P of L.perks) {
    const d = ZM_PERKS[P.key], g = new THREE.Group(); g.position.set(P.x, P.y, P.z); g.rotation.y = Math.atan2(P.n[0], P.n[1]); zmMesh(g);
    const body = new THREE.Mesh(new THREE.BoxGeometry(.9, 2.0, .75), mat(d.color)); body.position.y = 1.0; body.castShadow = true; g.add(body);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.1, .02), mat(new THREE.Color(d.color).multiplyScalar(.45).getHex())); panel.position.set(0, 1.15, .38); g.add(panel);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(.72, .06, .03), new THREE.MeshBasicMaterial({ color: new THREE.Color(d.color).lerp(new THREE.Color(0xffffff), .5) })); glow.position.set(0, 1.76, .39); g.add(glow);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(.88, .22), new THREE.MeshBasicMaterial({ map: labelTexture(d.name, d.css) })); sign.position.set(0, 2.12, .2); sign.rotation.x = -.15; g.add(sign);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(.4, .12, .04), mat(0x1C1F22)); slot.position.set(0, .45, .39); g.add(slot);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(255, 255, 255), color: d.color, transparent: true, opacity: .45, depthWrite: false })); halo.position.set(0, 1.9, .3); halo.scale.set(1.6, 1.6, 1); g.add(halo);
    const alongX = Math.abs(P.n[0]) > .5, hx = alongX ? .375 : .45, hz = alongX ? .45 : .375;
    zmAddBox(P.x - hx, P.y, P.z - hz, P.x + hx, P.y + 2.0, P.z + hz);
    Z.uses.push({
      x: P.x + P.n[0] * .6, y: P.y, z: P.z + P.n[1] * .6, n: P.n, r: 1.7,
      cost: () => d.cost,
      text: () => G.player.zmPerks.has(P.key) ? null : `${d.name} \u2014 ${d.desc}`,
      use: () => zmBuyPerk(P.key),
    });
  }
  rebuildNav();
  if (L.pap) { zmBuildPap(L.pap); rebuildNav(); }
}

/* ---------- Pack-a-Punch: the upgrade machine ---------- */
// nearest spot to the layout's point where the machine's whole footprint is open ground
function zmPapSpot(P) {
  const ok = (x, z) => [[0, 0], [-.75, -.75], [.75, -.75], [-.75, .75], [.75, .75], [P.n[0] * 1.2, P.n[1] * 1.2]].every(([dx, dz]) => freeAt(x + dx, z + dz));
  if (ok(P.x, P.z)) return { x: P.x, z: P.z };
  for (let r = .5; r <= 5; r += .5) for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r; if (ok(x, z)) return { x, z }; }
  return { x: P.x, z: P.z };
}
const zmPapMat = (c, e, k = .6) => new THREE.MeshStandardMaterial({ color: c, metalness: .85, roughness: .28, envMap: typeof gunEnv !== 'undefined' ? gunEnv : null, emissive: e || 0x000000, emissiveIntensity: k });
function zmBuildPap(P) {
  const Z = G.zm, sp = zmPapSpot(P), n = P.n, g = new THREE.Group();
  g.position.set(sp.x, 0, sp.z); g.rotation.y = Math.atan2(n[0], n[1]); zmMesh(g);
  const shell = zmPapMat(0x2A1E3E, 0x1A0830, .5), trim = zmPapMat(0xC9A44A), steel = zmPapMat(0xB8C0CC);
  const glowM = new THREE.MeshBasicMaterial({ color: 0xB45CFF }), runeM = new THREE.MeshBasicMaterial({ color: 0x6FE8FF });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(1.4, .22, 1.05), zmPapMat(0x15121C), 0, .11, 0);                      // plinth
  add(new THREE.BoxGeometry(1.25, 1.0, .9), shell, 0, .72, 0);                                     // body
  add(new THREE.BoxGeometry(1.32, .08, .97), trim, 0, 1.24, 0);                                     // brass band
  add(new THREE.BoxGeometry(1.2, .34, .86), shell, 0, 1.45, -.02);                                  // hood
  for (const x of [-.68, .68]) add(new THREE.BoxGeometry(.1, 1.5, .1), trim, x, .95, .44);         // corner pillars
  const core = add(new THREE.BoxGeometry(.8, .42, .02), glowM, 0, .78, .456);                       // glowing hatch
  add(new THREE.BoxGeometry(.9, .06, .05), trim, 0, 1.01, .46); add(new THREE.BoxGeometry(.9, .06, .05), trim, 0, .55, .46);
  for (const x of [-.52, .52]) for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(.05, .05, .02), runeM, x, .5 + k * .16, .456);
  // the twin rollers the gun is fed through
  const rollers = [];
  for (const y of [1.36, 1.56]) { const r = add(new THREE.CylinderGeometry(.09, .09, 1.0, 10), steel, 0, y, .46); r.rotation.z = Math.PI / 2; rollers.push(r); }
  for (const x of [-.52, .52]) add(new THREE.CylinderGeometry(.12, .12, .06, 12), trim, x, 1.46, .46).rotation.z = Math.PI / 2;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .26), new THREE.MeshBasicMaterial({ map: labelTexture('Pack-a-Punch', '#2A0E4A', '#E8C8FF') })); sign.position.set(0, 1.86, .3); sign.rotation.x = -.2; g.add(sign);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(255, 255, 255), color: 0xA040FF, transparent: true, opacity: .55, depthWrite: false })); halo.position.set(0, 1.1, .5); halo.scale.set(2.4, 2.4, 1); g.add(halo);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.18, .3, 30, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xB45CFF, transparent: true, opacity: .08, depthWrite: false, side: THREE.DoubleSide, fog: false })); beam.position.y = 16.6; g.add(beam);
  const light = new THREE.PointLight(0xA040FF, 1.4, 7, 2); light.position.set(0, 1.2, .9); g.add(light);
  const show = new THREE.Group(); show.position.set(0, 1.46, .7); g.add(show);
  const alongX = Math.abs(n[0]) > .5, hx = alongX ? .53 : .7, hz = alongX ? .7 : .53;
  zmAddBox(sp.x - hx, 0, sp.z - hz, sp.x + hx, 1.62, sp.z + hz);
  Z.pap = { core, halo, light, rollers, show, gun: null, t: 0, busy: 0 };
  Z.uses.push({
    x: sp.x + n[0] * 1.1, y: 0, z: sp.z + n[1] * 1.1, n, r: 2,
    cost: () => ZM_PAP.cost,
    text: () => { const w = weapon(G.player); return Z.pap.busy > 0 || !w || w.upgraded || !WEAPONS[w.key].mag ? null : `Pack-a-Punch your ${w.d.name}`; },
    use: () => zmUpgradeWeapon(),
  });
}
// 2.5x damage, double the magazine, a full reserve, and the camo
function zmUpgradeWeapon() {
  const Z = G.zm, p = G.player, w = weapon(p);
  if (!w || w.upgraded) return;
  cancelReload(w);
  w.upgraded = true;
  w.dmgK = (w.dmgK || 1) * ZM_PAP.dmg;
  if (w.splash) w.splash = Object.assign({}, w.splash, { dmg: w.splash.dmg * ZM_PAP.dmg });
  w.mag = Math.round(w.mag * ZM_PAP.mag); w.ammo = w.mag; w.reserve = zmMaxRes(w);
  setViewmodel(w); G.adsT = 0;
  // a spin through the rollers on the machine for everyone to see
  const X = Z.pap;
  if (X) {
    if (X.gun) X.show.remove(X.gun);
    const R = buildGun(w.key, w.optic, w.atts, true); R.group.scale.setScalar(2); R.group.rotation.y = Math.PI / 2; X.gun = R.group; X.show.add(X.gun); X.busy = 2.4; X.t = 0;
    X.light.intensity = 6; burst(X.show.getWorldPosition(tmpV).x, tmpV.y, tmpV.z, 'zap', 14);
  }
  powerupSound(); G.flashFx = Math.max(G.flashFx, .25);
  banner('Pack-a-Punched', `${papName(w.d)} \u00B7 ${ZM_PAP.dmg}\u00D7 damage \u00B7 ${w.mag}-round mag`, 2.4);
}
function zmUpdatePap(dt) {
  const X = G.zm.pap; if (!X) return;
  X.t += dt;
  const pulse = .5 + .5 * Math.sin(G.now * 3.2);
  X.core.material.color.setHSL(.76 + pulse * .06, 1, .5 + pulse * .15);
  X.halo.material.opacity = .35 + pulse * .3;
  for (const r of X.rollers) r.rotation.x += dt * (X.busy > 0 ? 18 : 1.4);
  if (X.busy > 0) {
    X.busy -= dt;
    X.light.intensity = lerp(X.light.intensity, 1.4, Math.min(1, dt * 1.5));
    if (X.gun) { X.gun.rotation.y += dt * 6; X.show.position.y = 1.46 + Math.sin(X.t * 8) * .04; }
    if (X.busy <= 0 && X.gun) { X.show.remove(X.gun); X.gun = null; }
  } else X.light.intensity = 1.2 + pulse * .5;
}

/* ---------- rounds ---------- */
function zmStartRound(r) {
  const Z = G.zm, dog = isDogRound(r);
  // more players, more of them
  const k = NET.on ? 1 + .6 * (netHumans().length - 1) : 1;
  Z.toSpawn = Math.round((dog ? Math.min(26, Math.round(5 + r * .9)) : zmCount(r)) * k); Z.roundN = Z.toSpawn;
  Z.spawnT = dog ? 4 : 2.5; Z.dropsRound = 0; Z.breakT = 0;
  zmRoundFx(r, dog, Z.toSpawn);
}
// what every player sees and gets when a round starts (the host's window and its friends' alike)
function zmRoundFx(r, dog, count) {
  const Z = G.zm, p = G.player;
  Z.round = r; Z.dogRound = dog;
  if (r > Z.startRound) p.lethalN = Math.min(4, (p.lethalN || 0) + 2);
  if (Z.dead) zmRespawn();
  const n = count ? ` \u00B7 ${count}` : '';
  if (dog) {
    houndRoundSting();
    banner(`Round ${r}`, `The hounds are coming${count ? ` \u00B7 ${count} hellhounds` : ''}`, 4);
    scene.fog.color.setHex(0x3A1810); scene.fog.near = 6; scene.fog.far = 52; hemi.color.setHex(0x9A5A40);
  } else {
    roundStinger(true);
    banner(`Round ${r}`, r === Z.startRound ? 'Survive. Buy guns off the walls, try the box, grab perks.' : count ? `${count} zombies` : 'Here they come.', 3);
  }
  zmRenderRound();
}
function zmBreakFx() {
  const Z = G.zm;
  roundStinger(false); banner(`Round ${Z.round} survived`, Z.dogRound ? 'The hounds are gone. For now.' : 'Next round starting soon.', 3);
  if (Z.dogRound) { Z.dogRound = false; applyLighting('night'); }
}
const zmAlive = () => G.ents.filter(e => e.isZombie && e.alive).length;
const ZKINDS = {
  walker:  { hp: 1,    dmg: 45, pts: 60,  h: 1.75 },
  crawler: { hp: .8,   dmg: 35, pts: 70,  h: .6 },
  bloater: { hp: .9,   dmg: 40, pts: 80,  h: 1.8 },
  hazmat:  { hp: 1.4,  dmg: 45, pts: 90,  h: 1.8 },
  brute:   { hp: 3.6,  dmg: 85, pts: 200, h: 2.35 },
  dog:     { hp: .35,  dmg: 30, pts: 70,  h: .95 },
};
const isDogRound = r => r >= 5 && r % 5 === 0;
function zmPickKind(r) {
  const Z = G.zm, x = Math.random(), alive = k => G.ents.filter(e => e.isZombie && e.alive && e.kind === k).length;
  if (r >= 6 && x < Math.min(.09, .02 + (r - 6) * .01) && alive('brute') < 2) return 'brute';
  if (r >= 4 && x < .18) return 'bloater';
  if (r >= 8 && x < .28) return 'hazmat';
  if (r >= 11 && x < .44 && alive('dog') < 3) return 'dog';
  return 'walker';
}
// spawn point for a hound: anywhere open, a short dash from the player
// a living player for the horde to come for (any of them, with friends)
function zmAnyHuman() {
  const hs = zmTargets();
  return hs.length ? hs[Math.random() * hs.length | 0] : G.player;
}
function zmTargets() {
  const Z = G.zm, out = [];
  for (const h of NET.on ? netHumans() : [G.player]) {
    if (!h.alive) continue;
    if (h === G.player ? Z.down > 0 : (h.nt && (h.nt.f & 64))) continue;
    out.push(h);
  }
  return out;
}
function zmHoundSpot() {
  const p = zmAnyHuman();
  for (let k = 0; k < 30; k++) {
    const a = Math.random() * TAU, d = rand(8, 15), x = p.pos.x + Math.cos(a) * d, z = p.pos.z + Math.sin(a) * d;
    const B = MAP.bounds; if (freeAt(x, z) && freeAt(x + .5, z) && freeAt(x, z + .5) && x > B[0] + 1 && x < B[1] - 1 && z > B[2] + 1 && z < B[3] - 1) return { x, z };
  }
  return null;
}
function zmSpawnZombie(kind) {
  const Z = G.zm, p = zmAnyHuman(), r = Z.round;
  kind = kind || (Z.dogRound ? 'dog' : zmPickKind(r));
  let sp;
  if (kind === 'dog') { sp = zmHoundSpot(); if (!sp) return false; }
  else {
    const pts = Z.layout.spawns.filter(([x, z]) => freeAt(x, z)).map(([x, z]) => ({ x, z, d: Math.hypot(x - p.pos.x, z - p.pos.z) })).filter(q => q.d > 9);
    if (!pts.length) return false;
    pts.sort((a, b) => a.d - b.d);
    sp = pts[Math.random() * Math.min(5, pts.length) | 0];
  }
  const K = ZKINDS[kind];
  const sprinter = kind === 'walker' && r >= 7 && Math.random() < clamp((r - 6) * .08, 0, .5);
  const runner = sprinter || ((kind === 'walker' || kind === 'hazmat') && r >= 3 && Math.random() < clamp((r - 2) * .15, 0, .85));
  let speed = (sprinter ? rand(5, 5.4) : runner ? rand(3.6, 4.2) : rand(1.5, 1.95));
  if (kind === 'crawler') speed = rand(1.3, 1.9); else if (kind === 'bloater') speed = rand(1.7, 2.2); else if (kind === 'brute') speed = rand(1.5, 1.8); else if (kind === 'dog') speed = rand(6.0, 6.8);
  speed *= Z.diff.speed;
  const hp = Math.round(zmHealth(r) * K.hp * (kind === 'dog' ? 1 + r * .04 : 1));
  const z = {
    id: zid++, name: kind === 'dog' ? 'Hellhound' : 'Zombie', kind, isDog: kind === 'dog', team: 'Z', isZombie: true, isBot: false, pos: new THREE.Vector3(sp.x + rand(-.4, .4), 0, sp.z + rand(-.4, .4)), vel: new THREE.Vector3(),
    yaw: Math.atan2(sp.x - p.pos.x, sp.z - p.pos.z), pitch: 0, height: K.h, stance: kind === 'crawler' ? 'prone' : 'stand', slideT: 0, onGround: true,
    health: hp, maxHealth: hp, alive: true, riseT: kind === 'dog' ? .7 : 1.3, path: null, pi: 0, repathT: 0, losT: 0, los: false, attackT: 0, attackCD: 0, climb: null, climbCD: 0, enraged: false, circleT: 0, circleDir: 1,
    speed, runner: runner || kind === 'dog', limp: Math.random() < .5 ? 0 : 1, groanT: rand(1, 5), stuckT: 0, stuckPos: new THREE.Vector3(sp.x, 0, sp.z),
    stunT: 0, blindT: 0, kills: 0, deaths: 0, score: 0, weapons: [], lastShotT: -99, deathT: 0, walkPhase: Math.random() * 6, model: kind === 'dog' ? buildHound() : buildZombie(kind),
  };
  scene.add(z.model.group); G.ents.push(z);
  z.zn = z.id; if (NET.on) netRegister(z, 'z' + z.id, true);
  poseRising(z);
  if (kind === 'dog') {
    // lightning strike and a burst of fire where it lands
    lightning(z.pos.x, z.pos.z); flashLight.position.set(z.pos.x, 3, z.pos.z); flashLight.intensity = 7;
    puff(z.pos.x, .6, z.pos.z, softTex(255, 140, 50), .4, 3.2, .5, 1); puff(z.pos.x, 1.4, z.pos.z, softTex(200, 220, 255), .3, 5, .2, .9);
    burst(z.pos.x, .3, z.pos.z, 'zap', 10);
  } else {
    zombieRise(z);
    burst(z.pos.x, .1, z.pos.z, 'gore', 8);
    puff(z.pos.x, .3, z.pos.z, softTex(80, 66, 50), .5, 2.2, 1.2, .6, .3);
  }
  return true;
}
function zmUpdate(dt) {
  const Z = G.zm, p = G.player;
  Z.budget = 2; Z.climbBudget = 1;   // at most two ground A* searches and one climb-spot search a frame
  if (Z.power.instakill > 0) Z.power.instakill -= dt;
  if (Z.power.double > 0) Z.power.double -= dt;
  if (Z.fireSaleT > 0) { Z.fireSaleT -= dt; if (Z.fireSaleT <= 0) popup('Fire Sale is over'); }
  if (Z.invuln > 0) Z.invuln -= dt;
  if (Z.down > 0) { Z.down -= dt; if (Z.down <= 0) { if (Z.bleed) zmBledOut(); else zmRevive(); } }
  // friends' soldiers, and in a friend's window every zombie, follow what their owners send
  for (const e of G.ents) if (!netMine(e)) updatePuppet(e, dt);
  if (netClient()) {
    for (let i = G.ents.length - 1; i >= 0; i--) { const z = G.ents[i]; if (z.isZombie && !z.alive && G.now - z.deathT > (z.isDog || z.kind === 'bloater' ? .9 : 2.6)) netForget(z); }
  } else zmHostUpdate(dt);
  zmUpdateDrops(dt);
  zmUpdateBox(dt);
  zmUpdatePap(dt);
  zmNear();
}
function zmHostUpdate(dt) {
  const Z = G.zm;
  // spawning
  if (!Z.over && Z.breakT <= 0 && Z.toSpawn > 0) {
    Z.spawnT -= dt;
    if (Z.spawnT <= 0 && zmAlive() < (Z.dogRound ? 8 : 24)) { if (zmSpawnZombie()) Z.toSpawn--; Z.spawnT = Z.dogRound ? rand(.9, 2.2) : Math.max(.35, 2.1 - Z.round * .09) * rand(.6, 1.2); }
  }
  // the undead
  // one zombie hitting a bug must never stop the frame: everything after it (you, the screen) would freeze
  for (const z of G.ents) {
    if (!z.isZombie) continue;
    try { if (z.alive) updateZombie(z, dt); else animateDead(z); }
    catch (e) { z.climb = z.leap = z.ride = null; z.braceT = 0; zmReportError(e); }
  }
  for (let i = G.ents.length - 1; i >= 0; i--) { const z = G.ents[i]; if (z.isZombie && !z.alive && G.now - z.deathT > (z.isDog || z.kind === 'bloater' ? .9 : 2.6)) { netForget(z); scene.remove(z.model.group); } }
  // round over?
  if (!Z.over && Z.breakT <= 0 && Z.toSpawn === 0 && zmAlive() === 0) { Z.breakT = 9; zmBreakFx(); }
  if (Z.breakT > 0) { Z.breakT -= dt; if (Z.breakT <= 0 && !Z.over) zmStartRound(Z.round + 1); }
  // with friends it's over when nobody is left standing: everyone is bleeding out or gone
  if (NET.on && !Z.over) {
    const hs = netHumans();
    const out = h => h === G.player ? (!h.alive || Z.dead || (Z.down > 0 && Z.bleed)) : (!h.alive || (h.nt && (h.nt.f & 512)));
    if (hs.length && hs.every(out)) zmGameOverAll();
  }
}
// what is the player looking at? (wall guns, the box, perks, and a friend who needs reviving)
function zmNear() {
  const Z = G.zm, p = G.player;
  Z.near = null;
  if (p.alive && Z.down <= 0) {
    const f = dirFrom(p.yaw, 0, tmpV); let best = 9;
    if (NET.on) for (const e of G.ents) {
      if (!e.human || !e.alive || !e.nt || !(e.nt.f & 512)) continue;
      const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      if (d > 1.8 || Math.abs(e.pos.y - p.pos.y) > 1.4 || d >= best) continue;
      e._rev = e._rev || { x: 0, y: 0, z: 0, n: null, r: 1.8, hold: 2.2, cost: () => 0, text: () => `revive ${e.name}`, use: () => { netEmit(['rv', e.net.id]); popup(`Revived ${e.name}`); zmAddPoints(50); } };
      best = d; Z.near = e._rev;
    }
    if (Z.near) return;
    for (const u of Z.uses) {
      const dx = u.x - p.pos.x, dz = u.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > u.r || Math.abs(u.y - p.pos.y) > 1.6 || !u.text()) continue;
      if (u.n && (p.pos.x - u.x) * u.n[0] + (p.pos.z - u.z) * u.n[1] < -.2) continue;
      if (d > .6 && (dx * f.x + dz * f.z) / d < .2) continue;
      if (d < best) { best = d; Z.near = u; }
    }
  }
}

/* ---------- zombie AI ---------- */
function zmTargetFor(z) {
  if (z.tgtT > G.now && z.tgt && z.tgt.alive && zmTargets().includes(z.tgt)) return z.tgt;
  let best = null, bd = 1e9;
  for (const h of zmTargets()) { const d = Math.hypot(h.pos.x - z.pos.x, h.pos.z - z.pos.z) + Math.abs(h.pos.y - z.pos.y) * 2; if (d < bd) { bd = d; best = h; } }
  z.tgt = best; z.tgtT = G.now + .6;
  return best;
}
function updateZombie(z, dt) {
  const Z = G.zm, tg = zmTargetFor(z), p = tg || G.player;
  if (z.riseT > 0) { z.riseT -= dt; poseRising(z); return; }
  if (z.stunT > 0) z.stunT -= dt;
  if (z.blindT > 0) z.blindT -= dt;
  if (z.climbCD > 0) z.climbCD -= dt;
  // hauling itself up onto a car, a crate, a porch roof...
  if (z.climb) {
    if (stepMantle(z, z.climb, dt)) {
      poseClimb(z);
      return;
    }
    // Climb finished: wipe the slate clean so it locks back onto the player
    if (z.climb.ride) { z.ride = z.climb.ride; z.rideT = 0; }
    z.climb = null;
    z.cs = null;
    z.path = null;
    z.repathT = 0;
    z.stuckT = 0;
  }
  // in mid-leap from one high place to another
  if (z.leap) {
    if (zmStepLeap(z, z.leap, dt)) { poseClimb(z); return; }
    z.leap = null; z.path = null; z.cs = null; z.stuckT = 0; z.stuckPos.copy(z.pos);
  }
  // standing on another zombie's shoulders: stay up there and reach for the ledge
  if (z.ride && zmRide(z, tg, dt)) return;
  let wx = 0, wz = 0, face = null;
  const chase = !!tg && !Z.over;
  const dx = p.pos.x - z.pos.x, dz = p.pos.z - z.pos.z, d = Math.hypot(dx, dz), dy = Math.abs(p.pos.y - z.pos.y), above = p.pos.y - z.pos.y;
  const reach = z.isDog ? 1.45 : z.kind === 'brute' ? 1.5 : 1.2;
  if (z.kind === 'brute' && !z.enraged && z.health < z.maxHealth * .5) { z.enraged = true; z.speed *= 2.1; z.runner = true; zSoundAt(screech, z.pos.x, z.pos.z, 1, 40); }
  // minTy: when climbing after you, only take a ledge that gets it close to your height (not a wheel under the truck)
  const tryClimb = (cx, cz, minTy = -1e9) => {
    if (z.climbCD > 0 || z.kind === 'crawler' || !z.onGround) return false;
    const M = findMantle(z, cx, cz, z.isDog ? 2.2 : 2.85, z.kind === "brute" ? 1.5 : 1.15);   // high enough for the truck cab and the porch roofs
    z.climbCD = .6;
    if (!M || M.ty < minTy) return false;
    M.dur = z.isDog ? .45 : z.kind === 'brute' ? 1.5 : z.runner ? .8 : 1.15;
    z.climb = M; z.path = null; zombieGroan(z); return true;
  };
  // look for a way up straight at you first, then a little to either side (finds the cab step on the truck, etc.)
  const tryClimbToward = (cx, cz) => {
    if (z.climbCD > 0 || z.kind === 'crawler' || !z.onGround) return false;
    for (const a of [0, .55, -.55, 1.1, -1.1]) { const c = Math.cos(a), s = Math.sin(a); z.climbCD = 0; if (tryClimb(cx * c - cz * s, cx * s + cz * c, p.pos.y - 1.4)) return true; }
    return false;
  };
  // someone just overhead with no ledge in reach (the plane's roof, a high stand): claw straight up the side
  // someone up off the floor (a truck, a wing, a roof), or this one is: follow the surface graph instead
  const fl = chase ? zmFlow(z, p, d, dy, reach, dt) : null;
  if (fl === true) return;   // it just started a climb, a leap or a boost
  if (fl) z.belowT = 0;
  else if (chase && !z.isDog && z.kind !== 'crawler' && above > 1.3 && d < 4.5 && !Z.over) z.belowT = (z.belowT || 0) + dt; else z.belowT = 0;
  if (z.belowT > 1.4 && z.onGround) {
    z.belowT = 0;
    const bx = d > .3 ? dx : -Math.sin(z.yaw), bz = d > .3 ? dz : -Math.cos(z.yaw);
    for (const a of [0, .5, -.5, 1, -1, 1.6, -1.6, 2.4, -2.4, Math.PI]) {
      const c = Math.cos(a), sn = Math.sin(a);
      const M = findMantle(z, bx * c - bz * sn, bx * sn + bz * c, Math.min(5.2, above + .7), z.kind === 'brute' ? 1.5 : 1.15);
      if (M && M.ty > z.pos.y + .9) { M.dur = .7 + M.rise * .32; z.climb = M; z.path = null; z.circleT = 0; zombieGroan(z); poseClimb(z); return; }
    }
  }
  if (chase && fl) { wx = fl.wx; wz = fl.wz; if (d < 4) face = Math.atan2(-dx, -dz); }
  if (chase && !fl) {
    // which floor: only counts as upstairs when actually over a house's upper floor (not just standing high on the truck)
    const floorOf = zmFloorLayer;
    const pl = floorOf(p), zl = floorOf(z);
    let direct = d < 1.3 && dy < 1.3;
    const onStairs = z.path && z.path[z.pi] && z.path[z.pi].portal;
    // you're up on something within reach: climb after you
    if (above > .6 && d < 3.2 && !onStairs && tryClimbToward(dx, dz)) { poseClimb(z); return; }
    if (!direct && !onStairs && pl === zl && dy < 1.3 && d < 16) { z.losT -= dt; if (z.losT <= 0) { z.losT = .25; z.los = walkClear(z.pos.x, z.pos.z, p.pos.x, p.pos.z, zl); } direct = z.los; }
    if (!direct && above > .6 && d < 3.5) direct = true; // head straight for the thing you're standing on
    // you're up on something too tall to climb from here (the truck's box): find a spot that leads up, go there, climb
    let routed = false;
    // already up on something (the cab): keep going straight at you and climb the next step from here
    if (above > .6 && z.pos.y > .3 && zl === 0 && !onStairs && d < 9 && !z.isDog) { if (tryClimbToward(dx, dz)) { poseClimb(z); return; } direct = true; }
    if (above > .6 && pl === zl && !onStairs && z.onGround && !z.isDog && z.kind !== 'crawler' && d < 14 && z.pos.y <= .3) {
      if ((!z.cs || G.now - z.cs.t > 2.5 || Math.hypot(z.cs.px - p.pos.x, z.cs.pz - p.pos.z) > 1.5) && Z.climbBudget > 0) { Z.climbBudget--; z.cs = zmClimbSpot(z, p); }
      if (z.cs && z.cs.x !== undefined) {
        const sx = z.cs.x - z.pos.x, sz = z.cs.z - z.pos.z, sd = Math.hypot(sx, sz);
        routed = true;
        if (sd < .5) { if (tryClimb(z.cs.dx, z.cs.dz, z.pos.y + .45) || tryClimbToward(dx, dz)) { poseClimb(z); return; } wx = sx; wz = sz; }
        else if (walkClear(z.pos.x, z.pos.z, z.cs.x, z.cs.z, zl)) { wx = sx / sd; wz = sz / sd; z.path = null; }
        else {
          z.repathT -= dt;
          if ((!z.path || z.repathT <= 0) && Z.budget > 0) { Z.budget--; z.path = findPath(z.pos.x, z.pos.z, z.cs.x, z.cs.z, zl, zl); z.pi = 0; z.repathT = rand(.7, 1.3); }
          if (z.path && z.pi < z.path.length) { const q = z.path[z.pi], qx = q.x - z.pos.x, qz = q.z - z.pos.z, qd = Math.hypot(qx, qz); if (qd < .6) z.pi++; else { wx = qx / qd; wz = qz / qd; } }
        }
      }
    }
    if (routed) { /* heading for the climbing spot */ }
    else if (z.circleT > 0) {
      // couldn't climb here: work round the obstacle looking for a way up
      z.circleT -= dt;
      const k = z.circleDir;
      wx = -dz / Math.max(d, .1) * k + dx / Math.max(d, .1) * .35; wz = dx / Math.max(d, .1) * k + dz / Math.max(d, .1) * .35;
      if (z.climbCD <= 0 && (tryClimb(wx, wz) || tryClimbToward(dx, dz))) { poseClimb(z); return; }
    } else if (direct) { if (d > .05) { wx = dx / d; wz = dz / d; } z.path = null; }
    else {
      z.repathT -= dt;
      if ((!z.path || (z.repathT <= 0 && !onStairs)) && Z.budget > 0) { Z.budget--; z.path = findPath(z.pos.x, z.pos.z, p.pos.x, p.pos.z, zl, pl); z.pi = 0; z.repathT = rand(.7, 1.3); }
      if (z.path && z.pi < z.path.length) {
        const q = z.path[z.pi], qx = q.x - z.pos.x, qz = q.z - z.pos.z, qd = Math.hypot(qx, qz);
        if (qd < (q.portal ? .3 : .6)) z.pi++; else { wx = qx / qd; wz = qz / qd; }
      }
    }
    if (d < 4) face = Math.atan2(-dx, -dz);
  }
  if (chase) {
    // claws and teeth
    if (z.attackCD > 0) z.attackCD -= dt;
    if (z.attackT > 0) {
      z.attackT -= dt;
      if (z.attackT <= 0) {
        z.attackCD = z.isDog ? .7 : .45;
        if (d < reach + .35 && dy < 1.3) applyDamage(p, z, (z.runner && !z.isDog ? 50 : ZKINDS[z.kind].dmg) * Z.diff.dmg, false, z.isDog ? 'bite' : 'claw');
        if (z.kind === 'bloater' && d < 2.2) { zmKillZombie(z, z, false, 'blast'); return; }
      }
    } else if (d < reach && dy < 1.3 && z.attackCD <= 0) {
      z.attackT = z.isDog ? .35 : z.kind === 'brute' ? .75 : .55;
      if (z.isDog) { dogBark(z); z.vel.x += dx / Math.max(d, .1) * 4; z.vel.z += dz / Math.max(d, .1) * 4; } else zombieAttack(z);
    }
    // hounds leap the last few metres
    if (z.isDog && z.onGround && d > 2.2 && d < 4.5 && dy < .8 && Math.random() < dt * 1.5) { z.vel.y = 5.2; z.vel.x = dx / d * 8; z.vel.z = dz / d * 8; dogBark(z); }
  } else {
    // nothing to chase: wander a little
    wx = Math.sin(G.now * .3 + z.id); wz = Math.cos(G.now * .23 + z.id * 1.7);
  }
  // don't walk through the player, and keep the horde from stacking
  if (p.alive && d < .75 && d > .01 && dy < 1.3) { wx -= dx / d * 1.3; wz -= dz / d * 1.3; }
  for (const o of G.ents) {
    if (o === z || !o.isZombie || !o.alive) continue;
    const ox = z.pos.x - o.pos.x, oz = z.pos.z - o.pos.z, od = ox * ox + oz * oz;
    if (od < .5 && od > 1e-4 && Math.abs(o.pos.y - z.pos.y) < 1) { const k = .5 / Math.sqrt(od); wx += ox * k * .6; wz += oz * k * .6; }
  }
  // up on something (a wing, a roof, a truck) with the one it wants up here too or higher: don't walk off the edge.
  // Slide along the edge if that's safe, otherwise stop and turn back. Dropping down is fine when the target is below.
  if (z.onGround && z.pos.y > .4 && (wx || wz) && (!chase || above > -.8) && !(fl && fl.drop)) {
    const L0 = Math.hypot(wx, wz), ux = wx / L0, uz = wz / L0, drop = (x, zz) => z.pos.y - zmFloorAt(x, zz, z.pos.y) > 1.1;
    if (drop(z.pos.x + ux * .7, z.pos.z + uz * .7)) {
      if (Math.abs(ux) > .2 && !drop(z.pos.x + Math.sign(ux) * .7, z.pos.z)) { wx = Math.sign(ux) * L0 * .8; wz = 0; }
      else if (Math.abs(uz) > .2 && !drop(z.pos.x, z.pos.z + Math.sign(uz) * .7)) { wz = Math.sign(uz) * L0 * .8; wx = 0; }
      else { wx = 0; wz = 0; z.vel.x *= .3; z.vel.z *= .3; if (z.circleT > 0) z.circleDir *= -1; }
    }
  }
  if (z.braceT > G.now) { wx = 0; wz = 0; if (d < 6) face = Math.atan2(-dx, -dz); }
  const L = Math.hypot(wx, wz); if (L > 1) { wx /= L; wz /= L; }
  const spd = (chase ? z.speed : .6) * (z.stunT > 0 ? .35 : 1) * (z.attackT > 0 ? (z.isDog ? .9 : .25) : 1) * (z.blindT > 0 ? .5 : 1);
  moveEntity(z, wx, wz, spd, dt, z.isDog ? (z.onGround ? 12 : 1.5) : 9);
  const mv = Math.hypot(z.vel.x, z.vel.z);
  if (face === null && mv > .3) face = Math.atan2(-z.vel.x, -z.vel.z);
  if (face !== null) z.yaw = wrap(z.yaw + clamp(wrap(face - z.yaw), -(z.isDog ? 9 : 5) * dt, (z.isDog ? 9 : 5) * dt));
  // stuck against something low? climb it. Stuck far away? dig back in somewhere else
  z.stuckT += dt;
  if (z.stuckT > (z.isDog ? .8 : 1.6)) {
    const moved = z.pos.distanceTo(z.stuckPos);
    if (moved < .6 && chase && (wx || wz) && tryClimb(wx, wz, above > .6 ? p.pos.y - 1.4 : -1e9)) { z.stuckT = 0; z.stuckPos.copy(z.pos); poseClimb(z); return; }
    if (moved < .6 && chase && above > .6 && d < 9 && z.circleT <= 0) { z.circleT = rand(1.4, 2.4); z.circleDir = Math.random() < .5 ? -1 : 1; z.stuckT = 0; z.stuckPos.copy(z.pos); }
    if (z.stuckT > 3.5) {
      if (moved < .6 && d > 12 && !z.isDog) {
        const pts = Z.layout.spawns.filter(([x, zz]) => freeAt(x, zz) && Math.hypot(x - p.pos.x, zz - p.pos.z) > 9);
        if (pts.length) { const [x, zz] = pts[Math.random() * pts.length | 0]; z.pos.set(x, 0, zz); z.riseT = 1.3; z.path = null; zombieRise(z); }
      }
      z.stuckT = 0; z.stuckPos.copy(z.pos);
    }
  }
  z.groanT -= dt;
  if (z.groanT <= 0) { z.groanT = rand(3, 8); if (z.isDog) dogBark(z); else zombieGroan(z); }
  if (z.braceT > G.now) poseClimb(z); else poseZombie(z, dt);
}

// a bug inside one zombie's update: reset that zombie and carry on; the stats overlay lists what went wrong
function zmReportError(e) {
  const msg = (e && e.message) || String(e);
  if (zmReportError.last !== msg) { zmReportError.last = msg; console.error('zombie update', e); }
  if (typeof PERF !== 'undefined' && PERF.on && PERF.hitches[0] !== 'ERROR ' + msg) PERF.hitches.unshift('ERROR ' + msg);
}

/* ---------- climbing after survivors who've got up onto something ---------- */
// which floor an entity is on: upstairs only when it is actually standing on a house's (or the plane's) upper
// floor, not on a roof above it
function zmFloorLayer(e) {
  const U = MAP.upper;
  return U && layerAt(e.pos.y) && e.pos.y < U.y + 1.0 && upstairsFloor(e.pos.x, e.pos.z) ? 1 : 0;
}
// on a flight of stairs between the floors (the ground nav's portals cover them)
function zmOnStairs(e) {
  for (const P of PORTALS) {
    const xs = P.up || [];
    if (!xs.length) continue;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const q of xs) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); }
    if (e.pos.x > x0 - .8 && e.pos.x < x1 + .8 && e.pos.z > z0 - .8 && e.pos.z < z1 + .8) return true;
  }
  return false;
}
// up off the floor it's on: on a truck, a wing, a roof, a crate
function zmLifted(e) { return e.pos.y - (zmFloorLayer(e) ? MAP.upper.y : 0) > .6; }
// plan a haul up (or a claw up a tall wall) straight onto a surface node
function zmClimbPlan(z, N, claw, lip = N.y) {
  const top = Math.max(lip, N.y), rise = top - z.pos.y, hx = N.x - z.pos.x, hz = N.z - z.pos.z, hl = Math.hypot(hx, hz) || 1;
  let dur = claw ? .7 + rise * .32 : z.isDog ? .45 : z.kind === 'brute' ? 1.5 : z.runner ? .8 : 1.15;
  if (z.kind === 'crawler') dur *= 1.5;
  if (!claw && rise > 1.6) dur += (rise - 1.6) * .2;
  // over a parapet or a rail onto something lower behind it: haul up to the lip, then drop in
  return { fx: z.pos.x, fy: z.pos.y, fz: z.pos.z, tx: N.x, ty: top + .02, tz: N.z, rise, vault: top > N.y + .1, dx: hx / hl, dz: hz / hl, t: 0, dur, h: 1.15 };
}
// a running jump across a gap: a plain arc from one surface to the next
function zmStepLeap(z, J, dt) {
  J.t += dt;
  const k = clamp(J.t / J.dur, 0, 1);
  z.pos.set(lerp(J.fx, J.tx, k), lerp(J.fy, J.ty, k) + 4 * J.arc * k * (1 - k), lerp(J.fz, J.tz, k));
  z.vel.set(0, 0, 0); z.yaw = Math.atan2(-(J.tx - J.fx), -(J.tz - J.fz));
  if (k >= 1) { z.pos.set(J.tx, J.ty, J.tz); z.onGround = true; return false; }
  return true;
}
/* Follow the surface graph towards p. Returns null when the ordinary ground AI should drive (nobody is up off
   the floor), true when the zombie has just started a climb, leap or boost, or { wx, wz, drop } to walk.     */
function zmFlow(z, p, d, dy, reach, dt) {
  // (a zombie partway up a staircase is the ground AI's business: it is following the stairs to you)
  const onStairs = z.path && z.path[z.pi] && z.path[z.pi].portal;
  if (!zmLifted(p) && (!zmLifted(z) || onStairs || zmOnStairs(z))) return null;
  if (d < reach + .1 && dy < 1.3) return { wx: 0, wz: 0 };            // close enough to swing at you
  if (!z.onGround) return { wx: 0, wz: 0 };
  const F = surfField(p, p);
  // which node it's on: only looked up again once it has moved a little
  if (z.snS !== SURF || Math.abs(z.snX - z.pos.x) > .2 || Math.abs(z.snZ - z.pos.z) > .2 || Math.abs(z.snY - z.pos.y) > .2) {
    z.sn = surfNodeAt(z.pos.x, z.pos.y, z.pos.z, .6, .8); z.snS = SURF; z.snX = z.pos.x; z.snY = z.pos.y; z.snZ = z.pos.z;
  }
  const a = z.sn;
  if (a < 0) return null;
  const S = SURF, A = S.nodes[a], nx = surfNext(F, a);
  if (!nx) {
    // as close as the map allows and you're still out of reach: last resort, climb up another zombie
    const hx = p.pos.x - z.pos.x, hz = p.pos.z - z.pos.z, hd = Math.hypot(hx, hz);
    if (p.pos.y - z.pos.y > 1.3 && hd < 4.5 && z.climbCD <= 0) {
      z.climbCD = .5;
      if (zmGrabToward(z, p)) return true;
      if (!z.isDog && zmBoost(z, p)) return true;
    }
    // otherwise shuffle in under you and wait for others to pile in
    return hd > .6 ? { wx: hx / hd, wz: hz / hd } : { wx: 0, wz: 0 };
  }
  const [b, type, , lip] = nx, N = S.nodes[b], hx = N.x - z.pos.x, hz = N.z - z.pos.z, hd = Math.hypot(hx, hz) || 1;
  if (type === EDGE.climb || type === EDGE.claw) {
    // get right up against it first, or give up pushing after a moment and climb from here
    z.flowPush = hd > 1.0 ? (z.flowPush || 0) + dt : 0;
    if ((hd <= 1.0 || z.flowPush > .6) && z.climbCD <= 0) {
      z.flowPush = 0; z.climbCD = .3;
      z.climb = zmClimbPlan(z, N, type === EDGE.claw, lip); z.path = null; z.cs = null; zombieGroan(z); poseClimb(z);
      return true;
    }
    return { wx: hx / hd, wz: hz / hd };
  }
  if (type === EDGE.leap) {
    const L = Math.hypot(N.x - A.x, N.z - A.z);
    z.leap = { fx: z.pos.x, fy: z.pos.y, fz: z.pos.z, tx: N.x, ty: N.y + .02, tz: N.z, t: 0, dur: .32 + L * .12, arc: .55 + Math.max(0, N.y - z.pos.y) * .6 };
    zombieAttack(z); poseClimb(z);
    return true;
  }
  if (type === EDGE.drop) return { wx: hx / hd, wz: hz / hd, drop: true };
  // walking: aim a few nodes down the route so it doesn't zig-zag cell to cell
  let tgt = N, cur = b;
  for (let k = 0; k < 4; k++) {
    const q = surfNext(F, cur); if (!q || q[1] !== EDGE.walk) break;
    cur = q[0]; tgt = S.nodes[cur];
  }
  const tx = tgt.x - z.pos.x, tz = tgt.z - z.pos.z, tl = Math.hypot(tx, tz) || 1;
  return { wx: tx / tl, wz: tz / tl };
}
// at a dead end of the graph (a thin perch it can't see, like a fin or a rail): look for any real ledge, straight
// at the target or off to the sides, that gets it higher and no further away
function zmGrabToward(z, p) {
  const dx = p.pos.x - z.pos.x, dz = p.pos.z - z.pos.z, d0 = Math.hypot(dx, dz);
  if (d0 < .05) return false;
  for (const a of [0, .45, -.45, .9, -.9, 1.5, -1.5]) {
    const c = Math.cos(a), sn = Math.sin(a);
    const M = findMantle(z, dx * c - dz * sn, dx * sn + dz * c, Math.min(SURF_CLAW, p.pos.y - z.pos.y + .9), z.kind === 'brute' ? 1.5 : 1.15);
    if (!M || M.ty < z.pos.y + .45 || Math.hypot(p.pos.x - M.tx, p.pos.z - M.tz) > d0 + .3) continue;
    M.dur = M.rise > SURF_CLIMB ? .7 + M.rise * .32 : z.runner ? .8 : 1.15;
    z.climb = M; z.path = null; z.cs = null; zombieGroan(z); poseClimb(z);
    return true;
  }
  return false;
}
// last resort: scramble up onto a neighbour's shoulders (who braces), then reach for the ledge from up there
function zmBoost(z, p) {
  let best = null, bd = 1.7;
  for (const q of G.ents) {
    if (q === z || !q.isZombie || !q.alive || q.isDog || q.climb || q.leap || q.riseT > 0) continue;
    if (q.ride === z) continue;
    let n = 1; for (let r = q.ride; r; r = r.ride) n++;
    if (n >= 3) continue;                                              // no more than three high
    const top = q.pos.y + q.height - .1, hd = Math.hypot(q.pos.x - z.pos.x, q.pos.z - z.pos.z);
    if (top - z.pos.y < .8 || top - z.pos.y > 2.3 || hd > bd) continue;
    if (!q.onGround && !q.ride) continue;
    bd = hd; best = q;
  }
  if (!best) return false;
  const q = best, M = zmClimbPlan(z, { x: q.pos.x, y: q.pos.y + q.height - .1, z: q.pos.z }, false);
  M.dur = .75; M.ride = q;
  z.climb = M; z.path = null; z.cs = null; q.braceT = G.now + 2.5; zombieGroan(z); poseClimb(z);
  return true;
}
// riding on a brace: keep its feet on the brace's shoulders and look for a ledge that gets closer to the target
function zmRide(z, tg, dt) {
  const q = z.ride;
  if (!q || !q.alive || q.leap || q.climb || !tg || G.zm.over) { z.ride = null; z.onGround = false; return false; }
  q.braceT = G.now + .4;
  z.pos.set(q.pos.x, q.pos.y + q.height - .1, q.pos.z); z.vel.set(0, 0, 0); z.onGround = true;
  z.rideT = (z.rideT || 0) + dt;
  const dx = tg.pos.x - z.pos.x, dz = tg.pos.z - z.pos.z, d = Math.hypot(dx, dz), dy = Math.abs(tg.pos.y - z.pos.y);
  z.yaw = wrap(z.yaw + clamp(wrap(Math.atan2(-dx, -dz) - z.yaw), -5 * dt, 5 * dt));
  // close enough to swing from up here
  const reach = z.kind === 'brute' ? 1.5 : 1.2;
  if (d < reach + .35 && dy < 1.3) {
    if (z.attackCD > 0) z.attackCD -= dt;
    if (z.attackT > 0) { z.attackT -= dt; if (z.attackT <= 0) { z.attackCD = .45; applyDamage(tg, z, (z.runner ? 50 : ZKINDS[z.kind].dmg) * G.zm.diff.dmg, false, 'claw'); } }
    else if (z.attackCD <= 0) { z.attackT = .55; zombieAttack(z); }
    poseClimb(z); return true;
  }
  // a ledge within reach from up here that brings it nearer: haul up onto it
  if (z.rideT > .35) {
    const S = surfReady(), F = surfField(tg, tg), here = surfNodeAt(q.pos.x, q.pos.y, q.pos.z, .6, .8);
    const base = here >= 0 ? F.cost[here] : Infinity;
    let best = -1, bc = base;
    const ci = Math.round((z.pos.x - S.x0) / SURF_CELL), cj = Math.round((z.pos.z - S.z0) / SURF_CELL);
    for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= S.nx || j >= S.nz) continue;
      for (const k of S.cols[j * S.nx + i]) {
        const N = S.nodes[k], up = N.y - z.pos.y;
        if (N.nm || up < -.3 || up > SURF_CLAW || F.cost[k] >= bc) continue;
        if (Math.hypot(N.x - z.pos.x, N.z - z.pos.z) > 1.6) continue;
        bc = F.cost[k]; best = k;
      }
    }
    if (best >= 0) {
      const N = S.nodes[best];
      z.ride = null; z.rideT = 0;
      z.climb = zmClimbPlan(z, N, N.y - z.pos.y > SURF_CLIMB); zombieGroan(z); poseClimb(z);
      return true;
    }
  }
  if (z.rideT > .6 && z.climbCD <= 0) { z.climbCD = .4; const q0 = z.ride; z.ride = null; if (zmGrabToward(z, tg)) { z.rideT = 0; return true; } z.ride = q0; }
  // nothing to grab: give it a few seconds, then hop down
  if (z.rideT > 3.5) { z.ride = null; z.rideT = 0; z.onGround = false; return false; }
  poseClimb(z);
  return true;
}

// height of whatever could be stood on at (x, z), at or below y + a step (0 for the ground)
function zmFloorAt(x, z, y) {
  let g = 0; const r = .22;
  for (const b of boxesAround(x, z, r + .05)) {
    if (b.noStand || b.max.y > y + STEP || b.max.y <= g) continue;
    if (x + r < b.min.x || x - r > b.max.x || z + r < b.min.z || z - r > b.max.z) continue;
    if (b.round && Math.hypot(x - b.round.x, z - b.round.z) > b.round.r + r) continue;
    g = b.max.y;
  }
  return g;
}

/* ---------- damage, points, going down ---------- */
function zmAddPoints(n) {
  const Z = G.zm; n *= Z.power.double > 0 ? 2 : 1;
  Z.points += n; Z.total += n;
  const el = document.createElement('div'); el.textContent = `+${n}`; $('#zmPop').appendChild(el);
  setTimeout(() => el.remove(), 900);
}
function zmDamage(v, a, amt, head, wkey) {
  const Z = G.zm;
  if (v.isZombie) {
    if (head) amt *= 2.0;                                   // zombies only: headshots hit twice as hard
    if (v.kind === 'hazmat' && !head && wkey !== 'knife') amt *= .55;
    if (v.kind === 'hazmat' && head) amt *= 1.3;
    if (v.kind === 'brute' && (wkey === 'frag' || wkey === 'semtex' || wkey === 'blast')) amt *= .6;
    // Insta-Kill: any damage at all, from anyone (splash, pellets, fire, a friend's shots), kills outright. Brutes too.
    if (Z.power.instakill > 0 && amt > 0) amt = v.health + 1;
    // legs: shots below the knees, or a blast at their feet, can take them off. Then it crawls.
    const legHit = !head && v.lastHitY !== undefined && v.lastHitY < .62, blastHit = wkey === 'frag' || wkey === 'semtex' || wkey === 'gl' || wkey === 'rpg';
    v.lastHitY = undefined;
    if (legHit || blastHit) v.legDmg = (v.legDmg || 0) + amt * (blastHit ? .7 : 1);
    v.health -= amt;
    if (v.health > 0 && (v.kind === 'walker' || v.kind === 'hazmat') && v.legDmg > v.maxHealth * .45) zmMakeCrawler(v);
    if (a === G.player) { hitmarker(v.health <= 0); sndHit(head, v.health <= 0); rumble(.1, .3, 50); if (v.health > 0) zmAddPoints(10); }
    if (v.health <= 0) zmKillZombie(v, a, head, wkey);
    return;
  }
  if (v !== G.player || Z.invuln > 0 || Z.down > 0 || Z.over) return;
  if (a === v) amt *= .5;
  v.health -= amt; v.lastDmgT = G.now;
  if (a !== v) showDamageFrom(a);
  foley('hurt', .7); rumble(.6, .8, 160);
  if (v.health <= 0) zmPlayerDown();
}
// a place on the ground next to whatever you're standing on, from which a zombie can climb towards you
function zmClimbSpot(z, p) {
  const out = { t: G.now, px: p.pos.x, pz: p.pos.z }, probe = { pos: new THREE.Vector3(), height: 1.75 };
  let best = 1e9;
  for (const dist of [1.1, 1.8, 2.6, 3.6, 4.8, 6.2, 7.6, 9]) for (let k = 0; k < 12; k++) {
    const a = k / 12 * TAU, x = p.pos.x + Math.cos(a) * dist, zz = p.pos.z + Math.sin(a) * dist;
    if (!freeAt(x, zz, 0)) continue;
    const c = Math.hypot(x - z.pos.x, zz - z.pos.z) + dist * .4;
    if (c >= best) continue;
    probe.pos.set(x, z.pos.y, zz);
    const tx = p.pos.x - x, tz = p.pos.z - zz, tl = Math.hypot(tx, tz) || 1;
    // straight at you, or angled off to either side (finds the cab step beside the truck's box)
    for (const ang of [0, .8, -.8, 1.6, -1.6]) {
      const cs = Math.cos(ang), sn = Math.sin(ang), dx = (tx * cs - tz * sn) / tl, dz = (tx * sn + tz * cs) / tl;
      const M = findMantle(probe, dx, dz, 2.85, 1.15);
      if (M && M.ty > z.pos.y + .45) { best = c; Object.assign(out, { x, z: zz, dx, dz }); break; }
    }
  }
  return out;
}
// lost its legs: drops to the ground and drags itself along, slower and harder to hit
function zmMakeCrawler(z) {
  z.kind = 'crawler'; z.stance = 'prone'; z.height = ZKINDS.crawler.h; z.runner = false; z.climb = null; z.attackT = 0;
  z.speed = rand(1.3, 1.9) * G.zm.diff.speed;
  const old = z.model.group; scene.remove(old);
  z.model = buildZombie('crawler'); z.model.group.position.copy(z.pos); z.model.group.rotation.y = z.yaw; scene.add(z.model.group);
  burst(z.pos.x, z.pos.y + .4, z.pos.z, 'gore', 8); zombieGroan(z);
}
function zmKillZombie(z, a, head, wkey) {
  const Z = G.zm;
  if (!z.alive) return;
  z.alive = false; z.deathT = G.now; z.attackT = 0; z.climb = null;
  z.killFrom = a && a.pos ? { x: a.pos.x, z: a.pos.z } : null; z.killHead = head; z.dd = null;
  if (a === G.player && !Z.nuking) zmKillPoints(z, head, wkey);
  if (NET.on) netEmit(['zk', z.zn, a && a.net ? a.net.id : '', head ? 1 : 0, Z.nuking ? 'nuke' : wkey]);
  if (z.isDog) { puff(z.pos.x, .6, z.pos.z, softTex(255, 120, 40), .4, 2.4, .5, .9); puff(z.pos.x, .7, z.pos.z, softTex(60, 50, 45), .6, 2.6, 1.3, .7, .5); z.model.group.visible = false; }
  if (z.kind === 'bloater') zmBloaterPop(z);
  // the last hound of the round leaves a Max Ammo behind
  if (Z.dogRound && z.isDog && Z.toSpawn === 0 && !G.ents.some(e => e.isDog && e.alive)) zmSpawnDrop(z.pos.x, z.pos.y, z.pos.z, 'maxammo');
  else if (!Z.nuking && Z.dropsRound < 4 && Math.random() < (z.kind === 'brute' ? .25 : .028)) zmSpawnDrop(z.pos.x, z.pos.y, z.pos.z);
}
function zmKillPoints(z, head, wkey) {
  const Z = G.zm; if (wkey === 'nuke') return;
  const bonus = { brute: 140, hazmat: 30, bloater: 20, dog: 10, crawler: 10 }[z.kind] || 0;
  Z.kills++; if (head) Z.heads++;
  if (wkey === 'knife') { Z.knifes++; zmAddPoints(130 + bonus); }
  else zmAddPoints((head ? 100 : (wkey === 'frag' || wkey === 'semtex' || wkey === 'atomizer') ? 50 : 60) + bonus);
}
function zmBloaterFx(z) {
  const { x, y, z: zz } = z.pos;
  z.model.group.visible = false;
  for (let k = 0; k < 6; k++) puff(x + rand(-.5, .5), y + .6 + rand(0, .6), zz + rand(-.5, .5), softTex(150, 230, 80), .5, rand(2.4, 3.4), rand(1.2, 1.8), .7, .3);
  burst(x, y + .8, zz, 'gore', 14);
  zSoundAt(splat, x, zz, 1, 40);
  const p = G.player;
  if (p.alive && Math.hypot(p.pos.x - x, p.pos.z - zz) < 3.2 && Math.abs(p.pos.y - y) < 1.6) G.stunFx = Math.max(G.stunFx, .8);
}
// a bloater bursts: a cloud of acid that hurts everything close, including you
function zmBloaterPop(z) {
  const { x, y, z: zz } = z.pos;
  zmBloaterFx(z);
  for (const h of NET.on ? netHumans() : [G.player]) if (h.alive && Math.hypot(h.pos.x - x, h.pos.z - zz) < 3.2 && Math.abs(h.pos.y - y) < 1.6) applyDamage(h, z, 38 * G.zm.diff.dmg, false, 'blast');
  for (const o of G.ents) if (o !== z && o.isZombie && o.alive && o.riseT <= 0 && Math.hypot(o.pos.x - x, o.pos.z - zz) < 3) { o.health -= G.zm.power.instakill > 0 ? o.health + 1 : 400; if (o.health <= 0) zmKillZombie(o, G.player, false, 'blast'); }
}
function zmPlayerDown() {
  const Z = G.zm, p = G.player;
  Z.downs++;
  if (p.zmPerks.has('secondwind')) {
    Z.down = 3.5; p.health = 1;
    banner('Down!', 'Second Wind is getting you back up\u2026', 3);
    for (const z of G.ents) if (z.isZombie) { z.attackT = 0; }
    return;
  }
  // with friends: bleed out on the ground until someone revives you
  if (NET.on && netHumans().some(h => h !== p && h.alive && !(h.nt && (h.nt.f & 64)))) {
    Z.down = 30; Z.bleed = true; p.health = 1;
    banner('Down!', 'Hang on \u2014 a teammate can revive you', 3);
    for (const z of G.ents) if (z.isZombie) { z.attackT = 0; }
    return;
  }
  // game over
  p.health = 0; p.alive = false; p.deathT = G.now; Z.over = true;
  G.ended = true; G.endT = 0;
  banner('Game over', `You made it to round ${Z.round}`, 4);
  roundStinger(false);
}
function zmRevive() {
  const Z = G.zm, p = G.player;
  p.zmPerks.clear(); p.maxHealth = 100; p.health = 100; Z.invuln = 3;
  popup('Back on your feet  \u00B7  perks lost');
  zmRenderPerks();
}
// a teammate held the use button over you
function zmRevivedByTeam(name) {
  const Z = G.zm, p = G.player;
  if (!Z || !(Z.down > 0) || !Z.bleed) return;
  Z.down = 0; Z.bleed = false; p.health = p.maxHealth || 100; Z.invuln = 2.5;
  popup(`${name} picked you up`); powerupSound();
}
// nobody came: out until the next round
function zmBledOut() {
  const Z = G.zm, p = G.player;
  Z.bleed = false; Z.dead = true;
  p.health = 0; p.alive = false; p.deathT = G.now; p.respawnT = 1e9;
  $('#death').hidden = false; $('#deathBy').textContent = 'You bled out';
  $('#deathCount').textContent = 'Back in at the start of the next round'; $('#deathClasses').innerHTML = ''; $('#deathHint').textContent = '';
}
function zmRespawn() {
  const Z = G.zm, p = G.player, L = Z.layout;
  const mate = netHumans().find(h => h !== p && h.alive);
  p.pos.set((mate ? mate.pos.x : L.start.x) + rand(-1, 1), mate ? mate.pos.y : 0, (mate ? mate.pos.z : L.start.z) + rand(-1, 1)); p.vel.set(0, 0, 0);
  p.alive = true; p.health = 100; p.maxHealth = 100; p.stance = 'stand'; p.height = 1.8; Z.dead = false; Z.down = 0; Z.bleed = false; Z.invuln = 3;
  p.zmPerks.clear(); zmRenderPerks();
  p.weapons = [makeWeapon('pistol', 'iron', null)]; p.weapons[0].reserve = 96; p.wi = 0; p.lethalN = Math.max(p.lethalN || 0, 2);
  setViewmodel(weapon(p)); G.adsT = 0; G.eye = STANCE.stand.eye;
  $('#death').hidden = true; camera.rotation.z = 0;
  popup('Back in the fight');
}
// while out: watch a teammate over their shoulder
function zmSpectate(t) {
  const p = G.player, mate = netHumans().find(h => h !== p && h.alive);
  if (!mate) { camera.position.set(p.pos.x, p.pos.y + Math.max(.35, 1.6 - t * 2.4), p.pos.z); camera.rotation.z = Math.min(.5, t * .9); return; }
  const fx = -Math.sin(mate.yaw), fz = -Math.cos(mate.yaw);
  camera.position.set(mate.pos.x - fx * 3.2, mate.pos.y + 2.4, mate.pos.z - fz * 3.2);
  camera.rotation.set(0, 0, 0); camera.lookAt(mate.pos.x + fx * 2, mate.pos.y + 1.2, mate.pos.z + fz * 2);
  $('#deathCount').textContent = `Watching ${mate.name} \u00B7 back in next round`;
}
// with friends: the host calls it when nobody is left standing, and every window ends together
function zmGameOverAll() {
  const Z = G.zm, p = G.player;
  if (Z.over) return;
  Z.over = true; G.ended = true; G.endT = 0;
  if (p.alive && !(Z.down > 0)) { /* still standing when the last friend fell */ }
  banner('Game over', `Your squad made it to round ${Z.round}`, 4);
  roundStinger(false);
}
function zmShowGameOver() {
  const Z = G.zm, p = G.player;
  const survived = Math.max(0, Z.round - 1 + (Z.breakT > 0 ? 1 : 0));
  const xp = Math.round(Z.total / 5) + survived * 150;
  const res = addXP(xp);
  const st = settings.profile.zm; st.games++; st.kills += Z.kills; st.best = Math.max(st.best, Z.round); saveSettings();
  G.state = 'ended';
  if (document.pointerLockElement) document.exitPointerLock();
  $('#endTitle').textContent = 'Game over'; $('#endTitle').className = 'result lose';
  $('#endSub').textContent = NET.on ? `Your squad reached round ${Z.round}` : `You reached round ${Z.round}`;
  $('#endBoard').innerHTML = NET.on ? zmScoreboard(true) : `<table class="sb"><tr><th>Round</th><th>Kills</th><th>Headshots</th><th>Knife</th><th>Points</th></tr><tr class="me"><td>${Z.round}</td><td>${Z.kills}</td><td>${Z.heads}</td><td>${Z.knifes}</td><td>${Z.total.toLocaleString()}</td></tr></table>`;
  $('#endXp').innerHTML = xpLine(xp, res);
  $('#againBtn').textContent = 'Play again';
  $('#end').hidden = false; $('#hud').hidden = true; $('#pause').hidden = true; $('#death').hidden = true;
  netEndButtons();
  startMusic('zm');
  menuFocusOverlay('#end');
}

/* ---------- buying ---------- */
function zmSpend(cost) {
  const Z = G.zm;
  if (Z.points < cost) { denied(); popup(`Need ${cost - Z.points} more points`); return false; }
  Z.points -= cost; chaChing(); return true;
}
function zmUse(u) { const c = u.cost(); if (c && !zmSpend(c)) return; u.use(); }
function zmGive(key) {
  const p = G.player;
  const owned = p.weapons.findIndex(w => w.key === key);
  if (owned >= 0) {
    const w = p.weapons[owned]; w.ammo = w.mag; w.reserve = zmMaxRes(w);
    if (p.wi !== owned) { cancelReload(weapon(p)); p.wi = owned; setViewmodel(w); }
    popup(`${w.d.name} ammo`); return;
  }
  const w = makeWeapon(key, defaultOptic(key), null); w.reserve = zmMaxRes(w);
  if (p.weapons.length < 2) { p.weapons.push(w); p.wi = p.weapons.length - 1; }
  else { cancelReload(weapon(p)); p.weapons[p.wi] = w; }
  setViewmodel(w); G.adsT = 0;
  popup(w.d.name);
}
function zmBuyPerk(key) {
  const p = G.player;
  p.zmPerks.add(key);
  if (key === 'ironhide') { p.maxHealth = 250; p.health = 250; }
  powerupSound(); popup(ZM_PERKS[key].name);
  zmRenderPerks();
}

/* ---------- the mystery box ---------- */
function zmBoxUse() {
  const X = G.zm.box;
  if (X.state === 'idle') { X.state = 'rolling'; X.t = 0; X.next = 0; boxJingle(); }
  else if (X.state === 'offer') { zmGive(X.key); zmBoxClose(); }
}
function zmBoxShow(key) {
  const X = G.zm.box;
  if (X.gun) X.show.remove(X.gun);
  const R = buildGun(key, defaultOptic(key), null);
  R.group.scale.setScalar(2.2); R.group.rotation.y = Math.PI / 2;
  X.gun = R.group; X.show.add(X.gun);
}
function zmBoxClose() { const X = G.zm.box; X.state = 'idle'; X.t = 0; if (X.gun) { X.show.remove(X.gun); X.gun = null; } X.key = null; }
function zmUpdateBox(dt) {
  const X = G.zm.box; if (!X) return;
  X.beam.visible = X.state === 'idle';
  const fs = G.zm.fireSaleT > 0; X.beam.material.opacity = fs ? .22 + Math.sin(G.now * 8) * .06 : .1; X.beam.material.color.setHex(fs ? 0x4FB8FF : 0x9FD4FF);
  X.lid.rotation.x = lerp(X.lid.rotation.x, X.state === 'idle' ? 0 : -1.6, Math.min(1, dt * 6));
  if (X.state === 'rolling') {
    X.t += dt; X.next -= dt;
    X.show.position.y = .7 + Math.min(1, X.t / 3) * .7;
    if (X.next <= 0) {
      const owned = G.player.weapons.map(w => w.key);
      const pool = ZM_BOX_POOL.filter(k => !owned.includes(k));
      let key = pool[Math.random() * pool.length | 0];
      if (X.t > 3.1) { const plain = pool.filter(k => k !== 'atomizer'); key = pool.includes('atomizer') && Math.random() < .08 ? 'atomizer' : (plain[Math.random() * plain.length | 0] || pool[0]); }
      X.key = key; zmBoxShow(key); X.next = .07 + X.t * .07;
      if (AC) tone(1200 + Math.random() * 600, .04, .05, 'square');
    }
    if (X.t > 3.2) { X.state = 'offer'; X.t = 0; }
  } else if (X.state === 'offer') {
    X.t += dt; X.show.position.y = 1.4 - Math.max(0, X.t - 7) / 2 * .7;
    if (X.gun) X.gun.rotation.y = Math.PI / 2 + Math.sin(G.now * 2) * .3;
    if (X.t > 9) zmBoxClose();
  }
}

/* ---------- power-ups ---------- */
const dropTexCache = {};
function dropTexture(type) {
  if (dropTexCache[type]) return dropTexCache[type];
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), col = ZM_POWERUPS[type].color;
  const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, col); gr.addColorStop(.45, col + '88'); gr.addColorStop(1, col + '00');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#10161C'; x.strokeStyle = '#10161C'; x.lineWidth = 6; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (type === 'maxammo') { x.font = '800 30px "Saira Condensed", sans-serif'; x.fillText('MAX', 64, 50); x.fillText('AMMO', 64, 80); }
  else if (type === 'double') { x.font = '800 54px "Saira Condensed", sans-serif'; x.fillText('\u00D72', 64, 66); }
  else if (type === 'firesale') {
    // a blue price tag with $10 on it
    x.beginPath(); x.moveTo(30, 44); x.lineTo(80, 44); x.lineTo(100, 64); x.lineTo(80, 84); x.lineTo(30, 84); x.closePath(); x.fill();
    x.fillStyle = col; x.beginPath(); x.arc(86, 64, 5, 0, TAU); x.fill(); x.font = '800 30px "Saira Condensed", sans-serif'; x.fillText('$10', 56, 66);
  }
  else if (type === 'instakill') { x.beginPath(); x.arc(64, 58, 26, 0, TAU); x.fill(); x.fillRect(48, 74, 32, 18); x.fillStyle = col; x.beginPath(); x.arc(54, 56, 7, 0, TAU); x.arc(74, 56, 7, 0, TAU); x.fill(); }
  else { x.beginPath(); x.arc(64, 64, 8, 0, TAU); x.fill(); for (let k = 0; k < 3; k++) { const a = k * TAU / 3 - Math.PI / 2; x.beginPath(); x.moveTo(64, 64); x.arc(64, 64, 34, a - .5, a + .5); x.closePath(); x.fill(); } }
  return dropTexCache[type] = new THREE.CanvasTexture(c);
}
function zmSpawnDrop(x, y, z, force) {
  const Z = G.zm; let r = Math.random(), type = 'maxammo';
  if (force) type = force; else for (const [k, v] of Object.entries(ZM_POWERUPS)) { if (r < v.w) { type = k; break; } r -= v.w; }
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dropTexture(type), transparent: true, depthWrite: false, fog: false }));
  sprite.scale.set(1.1, 1.1, 1); sprite.position.set(x, y + 1.0, z); scene.add(sprite);
  Z.drops.push({ type, x, y, z, t: 0, sprite, nid: ++NET.dropSeq }); Z.dropsRound++;
}
function zmUpdateDrops(dt) {
  const Z = G.zm, p = G.player;
  for (let i = Z.drops.length - 1; i >= 0; i--) {
    const d = Z.drops[i]; d.t += dt;
    d.sprite.position.y = d.y + 1.0 + Math.sin(d.t * 3) * .12;
    d.sprite.visible = d.t < 22 || Math.sin(d.t * (d.t > 27 ? 30 : 14)) > 0;
    if (netClient()) continue;   // the host sees who walks over it
    const got = (NET.on ? netHumans() : [p]).some(h => h.alive && Math.hypot(h.pos.x - d.x, h.pos.z - d.z) < 1.4 && Math.abs(h.pos.y - d.y) < 1.6);
    if (got || d.t > 30) { scene.remove(d.sprite); Z.drops.splice(i, 1); if (got) { zmApplyDrop(d.type); if (NET.on) netEmit(['pu', d.type]); } }
  }
}
function zmApplyDrop(type) {
  const Z = G.zm, p = G.player;
  powerupSound(); banner(ZM_POWERUPS[type].name, '', 1.6); say(ZM_POWERUPS[type].name + '!');
  if (type === 'maxammo') { for (const w of p.weapons) w.reserve = zmMaxRes(w); p.lethalN = 4; }
  else if (type === 'instakill') Z.power.instakill = 30;
  else if (type === 'double') Z.power.double = 30;
  else if (type === 'firesale') { Z.fireSaleT = 30; popup(`Mystery Box: ${ZM_FIRESALE_COST} points for 30 seconds`); }
  else if (type === 'nuke') {
    Z.nuking = true;
    if (!netClient()) for (const z of G.ents) if (z.isZombie && z.alive && z.riseT <= 0) zmKillZombie(z, p, false, 'nuke');
    Z.nuking = false; zmAddPoints(400);
    G.flashFx = Math.max(G.flashFx, .8); G.shake = .7; foley('boom', 1);
  }
}

/* ---------- HUD bits ---------- */
function zmRenderRound() {
  const r = G.zm.round, el = $('#zmRound');
  el.innerHTML = r <= 5 ? `<span class="tally">${'<i></i>'.repeat(Math.min(r, 4))}${r === 5 ? '<i class="slash"></i>' : ''}</span>` : `<b>${r}</b>`;
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}
function zmRenderPerks() {
  const p = G.player;
  $('#zmPerks').innerHTML = [...p.zmPerks].map(k => `<span style="--c:${ZM_PERKS[k].css}" title="${ZM_PERKS[k].name}">${ZM_PERKS[k].name.split(' ').map(w => w[0]).join('')}</span>`).join('');
}
function zmHud() {
  const Z = G.zm;
  $('#zmPts').textContent = Z.points.toLocaleString();
  let pw = '';
  if (Z.power.instakill > 0) pw += `<span style="--c:${ZM_POWERUPS.instakill.color}" class="${Z.power.instakill < 5 ? 'blink' : ''}">Insta-Kill ${Math.ceil(Z.power.instakill)}</span>`;
  if (Z.power.double > 0) pw += `<span style="--c:${ZM_POWERUPS.double.color}" class="${Z.power.double < 5 ? 'blink' : ''}">Double Points ${Math.ceil(Z.power.double)}</span>`;
  if (Z.fireSaleT > 0) pw += `<span style="--c:${ZM_POWERUPS.firesale.color}" class="${Z.fireSaleT < 5 ? 'blink' : ''}">Fire Sale ${Math.ceil(Z.fireSaleT)}</span>`;
  const el = $('#zmPowers'); if (el._h !== pw) { el.innerHTML = pw; el._h = pw; }
  const dn = $('#zmDown'); dn.hidden = !(Z.down > 0);
  if (Z.down > 0) { const t = Z.bleed ? `Down \u00B7 ${Math.ceil(Z.down)}` : 'Down'; if (dn.textContent !== t) dn.textContent = t; }
}
function zmScoreboard(total) {
  const Z = G.zm;
  let rows = `<tr class="me"><td>${esc(G.player.name)}</td><td>${Z.round}</td><td>${Z.kills}</td><td>${Z.heads}</td><td>${(total ? Z.total : Z.points).toLocaleString()}</td></tr>`;
  for (const e of G.ents) if (e.human) rows += `<tr class="friend ${e.alive ? '' : 'dead'}"><td>${esc(e.name)}${e.nt && (e.nt.f & 512) ? ' \u00B7 down' : ''}</td><td>${Z.round}</td><td>${e.zk || 0}</td><td>${e.zh || 0}</td><td>${((total ? e.zt : e.zp) || 0).toLocaleString()}</td></tr>`;
  return `<table class="sb"><tr><th>Player</th><th>Round</th><th>Kills</th><th>Headshots</th><th>${total ? 'Total points' : 'Points'}</th></tr>${rows}</table>`;
}
