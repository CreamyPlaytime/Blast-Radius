// Blast Radius \u00B7 weapons, optics, attachments, equipment, perks, wildcards and default classes
'use strict';

/* type: the weapon family (drives bot ranges, optics and attachment lists)
   anim: how the viewmodel animates its moving parts ('rifle', 'lmg', 'pump', 'bolt', 'break', 'pistol', 'revolver')
   burst: rounds per trigger pull (fired at rpm, then burstDelay before the next pull)
   stats: damage, fire rate, range, mobility (0..1) for the class editor bars */
const EV_MAG = [[.18, 'magOut'], [.5, 'magIn']];
const WEAPONS = {
  // ---------- assault rifles ----------
  ar:      { name: 'Ranger AR', cls: 'Assault rifle', type: 'ar', anim: 'rifle', slot: 'primary', dmg: 27, head: 1.5, rpm: 640, auto: true, mag: 30, reserve: 150, reload: 2.1, spread: .03, ads: .003, move: .03, range: 40, minMul: .7, recoil: .011, pellets: 1, adsFov: .72, adsTime: .2, speed: .95, snd: 'ar', stats: [.62, .62, .7, .65], events: EV_MAG, emptyEv: [.8, 'bolt'] },
  bulldog: { name: 'Bulldog BR', cls: 'Burst rifle', type: 'ar', anim: 'rifle', slot: 'primary', dmg: 34, head: 1.5, rpm: 900, burst: 3, burstDelay: .3, auto: false, mag: 30, reserve: 150, reload: 2.3, spread: .03, ads: .002, move: .03, range: 46, minMul: .72, recoil: .012, pellets: 1, adsFov: .7, adsTime: .22, speed: .94, snd: 'br', stats: [.72, .55, .78, .6], events: [[.22, 'magOut'], [.56, 'magIn']], emptyEv: [.82, 'bolt'] },
  kestrel: { name: 'Kestrel 7', cls: 'Assault rifle', type: 'ar', anim: 'rifle', slot: 'primary', dmg: 24, head: 1.45, rpm: 760, auto: true, mag: 30, reserve: 180, reload: 1.95, spread: .032, ads: .004, move: .028, range: 34, minMul: .65, recoil: .0095, pellets: 1, adsFov: .74, adsTime: .18, speed: .97, snd: 'ar2', stats: [.52, .76, .6, .72], events: EV_MAG, emptyEv: [.8, 'bolt'] },
  // ---------- submachine guns ----------
  smg:     { name: 'Viper SMG', cls: 'Submachine gun', type: 'smg', anim: 'rifle', slot: 'primary', dmg: 21, head: 1.4, rpm: 880, auto: true, mag: 32, reserve: 192, reload: 1.8, spread: .036, ads: .01, move: .015, range: 20, minMul: .6, recoil: .008, pellets: 1, adsFov: .82, adsTime: .14, speed: 1.0, snd: 'smg', stats: [.45, .9, .4, .9], events: [[.15, 'magOut'], [.48, 'magIn']], emptyEv: [.78, 'bolt'] },
  wasp:    { name: 'Wasp', cls: 'Submachine gun', type: 'smg', anim: 'rifle', slot: 'primary', dmg: 18, head: 1.4, rpm: 1050, auto: true, mag: 30, reserve: 210, reload: 1.7, spread: .04, ads: .012, move: .012, range: 15, minMul: .55, recoil: .0072, pellets: 1, adsFov: .84, adsTime: .12, speed: 1.03, snd: 'smg', stats: [.38, 1, .3, .96], events: [[.15, 'magOut'], [.48, 'magIn']], emptyEv: [.78, 'bolt'] },
  brute:   { name: 'Brute .45', cls: 'Submachine gun', type: 'smg', anim: 'rifle', slot: 'primary', dmg: 29, head: 1.4, rpm: 620, auto: true, mag: 25, reserve: 150, reload: 2.0, spread: .034, ads: .008, move: .016, range: 22, minMul: .62, recoil: .011, pellets: 1, adsFov: .8, adsTime: .15, speed: .98, snd: 'smg2', stats: [.62, .6, .48, .85], events: [[.16, 'magOut'], [.5, 'magIn']], emptyEv: [.8, 'bolt'] },
  // ---------- machine guns ----------
  lmg:     { name: 'Mule LMG', cls: 'Light machine gun', type: 'lmg', anim: 'lmg', slot: 'primary', dmg: 25, head: 1.4, rpm: 720, auto: true, mag: 75, reserve: 150, reload: 4.4, spread: .045, ads: .006, move: .045, range: 38, minMul: .7, recoil: .0095, pellets: 1, adsFov: .74, adsTime: .3, speed: .85, snd: 'lmg', stats: [.58, .75, .68, .3], events: [[.1, 'coverOpen'], [.28, 'magOut'], [.58, 'magIn'], [.8, 'coverClose']], emptyEv: [.92, 'bolt'] },
  anvil:   { name: 'Anvil HMG', cls: 'Heavy machine gun', type: 'lmg', anim: 'lmg', slot: 'primary', dmg: 32, head: 1.4, rpm: 560, auto: true, mag: 100, reserve: 200, reload: 5.2, spread: .05, ads: .005, move: .05, range: 48, minMul: .75, recoil: .0125, pellets: 1, adsFov: .72, adsTime: .36, speed: .8, snd: 'anvil', stats: [.76, .55, .82, .2], events: [[.1, 'coverOpen'], [.3, 'magOut'], [.6, 'magIn'], [.82, 'coverClose']], emptyEv: [.93, 'bolt'] },
  // ---------- shotguns ----------
  shotgun: { name: 'Hound 12', cls: 'Pump shotgun', type: 'shotgun', anim: 'pump', slot: 'primary', dmg: 17, head: 1.2, rpm: 90, auto: false, mag: 6, reserve: 36, reload: 2.6, perShell: true, action: 'pump', cycle: .55, spread: .075, ads: .06, move: 0, range: 8, minMul: .25, recoil: .05, pellets: 8, adsFov: .9, adsTime: .18, speed: .95, snd: 'shotgun', stats: [1, .2, .15, .7], events: [] },
  riot:    { name: 'Riot-8', cls: 'Semi-auto shotgun', type: 'shotgun', anim: 'rifle', slot: 'primary', dmg: 13, head: 1.2, rpm: 280, auto: false, mag: 8, reserve: 40, reload: 2.5, spread: .08, ads: .065, move: 0, range: 9, minMul: .25, recoil: .04, pellets: 8, adsFov: .88, adsTime: .2, speed: .93, snd: 'shotgun', stats: [.8, .45, .2, .62], events: [[.18, 'magOut'], [.52, 'magIn']], emptyEv: [.82, 'bolt'] },
  coach:   { name: 'Coachgun', cls: 'Double-barrel shotgun', type: 'shotgun', anim: 'break', slot: 'primary', dmg: 22, head: 1.2, rpm: 420, auto: false, mag: 2, reserve: 30, reload: 2.0, spread: .07, ads: .06, move: 0, range: 8, minMul: .25, recoil: .08, pellets: 9, adsFov: .9, adsTime: .16, speed: .97, snd: 'coach', stats: [1, .35, .18, .78], events: [[.12, 'cylOpen'], [.3, 'shellsOut'], [.62, 'shellsIn'], [.85, 'cylClose']] },
  // ---------- marksman and sniper rifles ----------
  dmr:     { name: 'Marksman M14', cls: 'Marksman rifle', type: 'dmr', anim: 'rifle', slot: 'primary', dmg: 52, head: 1.9, rpm: 300, auto: false, mag: 15, reserve: 75, reload: 2.4, spread: .045, ads: .0015, move: .04, range: 75, minMul: .82, recoil: .03, pellets: 1, adsFov: .62, adsTime: .25, speed: .92, snd: 'dmr', stats: [.82, .35, .88, .55], events: [[.2, 'magOut'], [.55, 'magIn']], emptyEv: [.82, 'bolt'] },
  sniper:  { name: 'Longbow .50', cls: 'Bolt-action sniper', type: 'sniper', anim: 'bolt', slot: 'primary', dmg: 100, head: 2, rpm: 60, auto: false, mag: 5, reserve: 25, reload: 3.0, action: 'bolt', cycle: .9, spread: .09, ads: 0, move: .05, range: 200, minMul: 1, recoil: .06, pellets: 1, adsFov: .27, adsTime: .32, speed: .88, snd: 'sniper', stats: [1, .1, 1, .4], events: [[.2, 'magOut'], [.55, 'magIn']], emptyEv: [.82, 'bolt'] },
  hammer:  { name: 'Hammer .338', cls: 'Bolt-action sniper', type: 'sniper', anim: 'bolt', slot: 'primary', dmg: 85, head: 2, rpm: 80, auto: false, mag: 7, reserve: 35, reload: 2.6, action: 'bolt', cycle: .62, spread: .08, ads: 0, move: .04, range: 150, minMul: .95, recoil: .05, pellets: 1, adsFov: .32, adsTime: .27, speed: .92, snd: 'sniper2', stats: [.86, .2, .9, .52], events: [[.2, 'magOut'], [.55, 'magIn']], emptyEv: [.82, 'bolt'] },
  // ---------- sidearms ----------
  pistol:  { name: 'P-11 Sidearm', cls: 'Pistol', type: 'pistol', anim: 'pistol', slot: 'secondary', dmg: 30, head: 1.6, rpm: 400, auto: false, mag: 12, reserve: 72, reload: 1.5, spread: .025, ads: .006, move: .012, range: 18, minMul: .6, recoil: .02, pellets: 1, adsFov: .85, adsTime: .12, speed: 1.05, snd: 'pistol', stats: [.4, .5, .35, 1], events: EV_MAG, emptyEv: [.8, 'slide'] },
  trio:    { name: 'Trio-9', cls: 'Burst pistol', type: 'pistol', anim: 'pistol', slot: 'secondary', dmg: 26, head: 1.5, rpm: 1000, burst: 3, burstDelay: .24, auto: false, mag: 18, reserve: 90, reload: 1.6, spread: .024, ads: .006, move: .012, range: 17, minMul: .6, recoil: .015, pellets: 1, adsFov: .85, adsTime: .12, speed: 1.05, snd: 'pistol', stats: [.5, .7, .35, 1], events: EV_MAG, emptyEv: [.8, 'slide'] },
  magnum:  { name: 'Hand Cannon .50', cls: 'Heavy pistol', type: 'pistol', anim: 'pistol', slot: 'secondary', dmg: 62, head: 1.5, rpm: 170, auto: false, mag: 7, reserve: 35, reload: 2.0, spread: .026, ads: .004, move: .02, range: 24, minMul: .7, recoil: .065, pellets: 1, adsFov: .82, adsTime: .15, speed: 1.02, snd: 'magnum', stats: [.85, .3, .5, .9], events: [[.2, 'magOut'], [.55, 'magIn']], emptyEv: [.82, 'slide'] },
  revolver:{ name: 'Ranchero .357', cls: 'Revolver', type: 'pistol', anim: 'revolver', slot: 'secondary', dmg: 55, head: 1.5, rpm: 150, auto: false, mag: 6, reserve: 36, reload: 2.7, spread: .022, ads: .003, move: .02, range: 25, minMul: .7, recoil: .055, pellets: 1, adsFov: .82, adsTime: .14, speed: 1.05, snd: 'revolver', stats: [.8, .25, .5, .95], events: [[.12, 'cylOpen'], [.3, 'shellsOut'], [.6, 'shellsIn'], [.84, 'cylClose']] },
  mp:      { name: 'Hornet MP', cls: 'Machine pistol', type: 'pistol', anim: 'pistol', slot: 'secondary', dmg: 18, head: 1.35, rpm: 950, auto: true, mag: 20, reserve: 120, reload: 1.7, spread: .034, ads: .011, move: .012, range: 12, minMul: .55, recoil: .012, pellets: 1, adsFov: .85, adsTime: .12, speed: 1.05, snd: 'smg', stats: [.35, .95, .25, 1], events: EV_MAG, emptyEv: [.8, 'slide'] },
  // ---------- launchers (carried in the sidearm slot) ----------
  rpg:     { name: 'Warhead RPG', short: 'RPG', cls: 'Rocket launcher', type: 'launcher', anim: 'launcher', slot: 'secondary', proj: 'rocket', dmg: 0, head: 1, rpm: 40, auto: false, mag: 1, reserve: 3, reload: 2.6, spread: .02, ads: .003, move: .02, range: 120, minMul: 1, recoil: .075, pellets: 1, adsFov: .78, adsTime: .3, speed: .92, snd: 'rpg', stats: [1, .05, .85, .55], events: [[.22, 'magOut'], [.62, 'magIn']] },
  // ---------- zombies only ----------
  atomizer:{ name: 'Atomizer', cls: 'Wonder weapon', type: 'pistol', anim: 'pistol', slot: 'special', dmg: 320, head: 1, rpm: 190, auto: false, mag: 20, reserve: 160, reload: 2.8, spread: .008, ads: .003, move: .01, range: 70, minMul: 1, recoil: .028, pellets: 1, adsFov: .85, adsTime: .15, speed: 1, snd: 'atomizer', splash: { r: 2.7, dmg: 1400 }, tracer: 0x8CFF6A, stats: [1, .35, .7, .9], events: [[.2, 'magOut'], [.62, 'magIn']] },
  // ---------- not guns ----------
  knife:   { name: 'Knife', short: 'Knife', slot: 'melee' },
  claw:    { name: 'Zombie', short: 'Claws', slot: 'melee' },
  bite:    { name: 'Hellhound', short: 'Bite', slot: 'melee' },
  spit:    { name: 'Spitter', short: 'Acid', slot: 'melee' },
  blast:   { name: 'Bloater', short: 'Burst', slot: 'melee' },
  frag:    { name: 'Frag grenade', short: 'Frag', slot: 'equip' },
  semtex:  { name: 'Semtex', short: 'Semtex', slot: 'equip' },
  tknife:  { name: 'Throwing knife', short: 'T-Knife', slot: 'equip' },
  gl:      { name: '40mm grenade launcher', short: 'GL', slot: 'equip' },
};
const PRIMARIES = ['ar', 'bulldog', 'kestrel', 'smg', 'wasp', 'brute', 'lmg', 'anvil', 'shotgun', 'riot', 'coach', 'dmr', 'sniper', 'hammer'];
const SECONDARIES = ['pistol', 'trio', 'magnum', 'revolver', 'mp', 'rpg'];
const WTYPES = { ar: 'Assault rifles', smg: 'Submachine guns', lmg: 'Machine guns', shotgun: 'Shotguns', dmr: 'Marksman', sniper: 'Sniper rifles', pistol: 'Sidearms', launcher: 'Launchers' };
const isGun = k => !!(WEAPONS[k] && WEAPONS[k].mag);

/* ---------- optics ---------- */
const OPTICS = {
  iron:   { name: 'Iron sights', desc: 'The sights the gun came with. Nothing in the way.' },
  reflex: { name: 'Reflex sight', desc: 'A small red dot on a clear lens.' },
  holo:   { name: 'Holographic', desc: 'A wide window with a ring-and-dot reticle. Easy to track moving targets.' },
  acog:   { name: '2.5x ACOG', desc: 'A magnified prism sight for mid-range lanes. Slightly slower to aim.' },
  scope:  { name: '10x scope', desc: 'Full sniper scope with a steadied view. Slow to aim.' },
};
const OPTIC_OK_TYPE = { ar: ['iron', 'reflex', 'holo', 'acog'], smg: ['iron', 'reflex', 'holo'], lmg: ['iron', 'reflex', 'holo', 'acog'], shotgun: ['iron', 'reflex', 'holo'], dmr: ['iron', 'reflex', 'holo', 'acog', 'scope'], sniper: ['scope'], pistol: ['iron', 'reflex'], launcher: ['iron'] };
const opticsFor = k => k === 'revolver' || k === 'coach' ? ['iron'] : (OPTIC_OK_TYPE[WEAPONS[k].type] || ['iron']);
const defaultOptic = k => opticsFor(k)[0];

/* ---------- attachments: one per slot, up to 3 on a primary (5 with Gunfighter), 2 on a sidearm ---------- */
const ATT_SLOTS = [['muzzle', 'Muzzle'], ['barrel', 'Barrel'], ['under', 'Underbarrel'], ['mag', 'Magazine'], ['stock', 'Stock']];
const ATTS = {
  suppressor:  { slot: 'muzzle', name: 'Suppressor', desc: 'Quiet shots that keep you off the enemy minimap. 15% less range.', mods: { range: .85 } },
  compensator: { slot: 'muzzle', name: 'Compensator', desc: '22% less recoil, but a bigger muzzle flash.', mods: { recoil: .78 } },
  flashhider:  { slot: 'muzzle', name: 'Flash hider', desc: 'No muzzle flash to blind you, and 10% less recoil.', mods: { recoil: .9 } },
  longbarrel:  { slot: 'barrel', name: 'Long barrel', desc: '30% more range. Slightly slower to aim and move.', mods: { range: 1.3, ads: 1.12, speed: .97 } },
  shortbarrel: { slot: 'barrel', name: 'Short barrel', desc: 'Faster to aim, tighter hip-fire and lighter. 22% less range.', mods: { range: .78, ads: .85, hip: .88, speed: 1.03 } },
  grip:        { slot: 'under', name: 'Foregrip', desc: '30% less recoil.', mods: { recoil: .7 } },
  angled:      { slot: 'under', name: 'Angled grip', desc: 'Aim down sights 22% faster.', mods: { ads: .78 } },
  laser:       { slot: 'under', name: 'Laser sight', desc: '32% tighter hip-fire. Projects a visible laser.', mods: { hip: .68 } },
  gl:          { slot: 'under', name: 'Grenade launcher', desc: 'A 40mm launcher under the barrel with 3 grenades that blow up on impact. Press B (D-pad left) to switch to it and back. Move 3% slower.', mods: { speed: .97 } },
  extmag:      { slot: 'mag', name: 'Extended mags', desc: '+50% magazine size (+3 shells on a pump).', mods: {} },
  fastmag:     { slot: 'mag', name: 'Fast mags', desc: 'Reload 30% faster.', mods: { reload: .7 } },
  lightstock:  { slot: 'stock', name: 'Light stock', desc: 'Move 6% faster, and 30% faster while aiming.', mods: { speed: 1.06, adsMove: 1.3 } },
  heavystock:  { slot: 'stock', name: 'Heavy stock', desc: '18% less recoil. Move 4% slower.', mods: { recoil: .82, speed: .96 } },
};
const ALL_ATTS = Object.keys(ATTS), NO_GL = ALL_ATTS.filter(a => a !== 'gl');
const ATT_OK_TYPE = {
  ar: ALL_ATTS, smg: NO_GL, lmg: NO_GL,
  dmr: NO_GL.filter(a => a !== 'angled'),
  sniper: ['suppressor', 'longbarrel', 'extmag', 'fastmag', 'lightstock', 'heavystock'],
  shotgun: NO_GL.filter(a => a !== 'compensator'),
  pistol: ['suppressor', 'compensator', 'longbarrel', 'laser', 'extmag', 'fastmag'],
  launcher: [],
};
function attsFor(k) {
  if (k === 'coach') return ['longbarrel', 'shortbarrel', 'laser', 'lightstock', 'heavystock'];
  if (k === 'shotgun') return ATT_OK_TYPE.shotgun.filter(a => a !== 'fastmag');
  if (k === 'revolver') return ['longbarrel', 'laser', 'fastmag'];
  if (k === 'magnum') return ['compensator', 'longbarrel', 'laser', 'extmag', 'fastmag'];
  return ATT_OK_TYPE[WEAPONS[k].type] || [];
}
const noAtts = () => ({ muzzle: 'none', barrel: 'none', under: 'none', mag: 'none', stock: 'none' });
const attList = atts => atts ? Object.values(atts).filter(a => a && a !== 'none' && ATTS[a]) : [];

/* ---------- ammo types: one per gun, picked in the class editor ----------
   k: multipliers applied by makeWeapon. dmg / head scale damage, pellets replaces the pellet count,
   range / hip / ads / recoil multiply the gun's own values, burn sets targets alight for that many seconds */
const AMMO = {
  std:       { name: 'Standard', short: '', desc: 'Regular rounds. No trade-offs.', k: {} },
  tracer:    { name: 'Tracer rounds', short: 'Tracers', desc: 'Every shot leaves a glowing red streak so you can see exactly where it lands. The lighter load kicks 10% less.', k: { recoil: .9 }, glow: 0xFF4A2A },
  hollow:    { name: 'Hollow point', short: 'Hollow pt', desc: '20% more damage, but 25% less range and headshots count for less.', k: { dmg: 1.2, head: .6, range: .75 } },
  incend:    { name: 'Incendiary', short: 'Incendiary', desc: 'Hits set targets on fire for 2 s (12 damage a second). 10% less damage per hit.', k: { dmg: .9 }, burn: 2, burnDps: 12, glow: 0xFF8A2A },
  explosive: { name: 'Explosive rounds', short: 'Explosive', desc: 'Each round bursts where it lands and hurts anyone within a couple of metres, even behind the target.', k: {}, splash: { r: 2.2, dmg: 55, fire: true } },
  slug:      { name: 'Slug shells', short: 'Slugs', desc: 'One heavy slug instead of buckshot. Hits hard and true out to about 30 m, but you have to aim it.', k: { slug: true, range: 3.6, hip: .45, ads: .1 } },
  dragon:    { name: "Dragon's breath", short: "Dragon's breath", desc: 'Shells spit a cone of fire. Every pellet that lands sets the target burning for 3 s. 30% less range.', k: { range: .7 }, burn: 3, burnDps: 15, fire: true },
};
const AMMO_OK_TYPE = { ar: ['std', 'tracer', 'hollow', 'incend'], smg: ['std', 'tracer', 'hollow', 'incend'], lmg: ['std', 'tracer', 'hollow', 'incend'], dmr: ['std', 'tracer', 'hollow', 'incend', 'explosive'], sniper: ['std', 'tracer', 'explosive'], shotgun: ['std', 'slug', 'dragon'], pistol: ['std', 'tracer', 'hollow'] };
const ammoFor = k => k === 'atomizer' ? ['std'] : (AMMO_OK_TYPE[WEAPONS[k].type] || ['std']);

/* ---------- equipment ---------- */
const LETHALS = {
  frag:   { name: 'Frag grenade', desc: 'Hold to cook, release to throw. Bounces around corners and blows 3 s after the pin is pulled.', count: 1 },
  semtex: { name: 'Semtex', desc: 'Sticks to the first wall, floor or enemy it hits, then blows 1.4 s later.', count: 1 },
  tknife: { name: 'Throwing knife', desc: 'Hold to aim with its own crosshair, release to throw. Kills in one hit.', count: 2 },
};
const TACTICALS = {
  flash: { name: 'Flashbang', desc: 'Blinds anyone facing it for up to 3 s. Bots lose track of you.', count: 2 },
  smoke: { name: 'Smoke', desc: 'A thick screen that lasts 13 s. Nobody can see through it.', count: 1 },
  stun:  { name: 'Stun', desc: 'Slows movement and aim of anyone caught for about 3 s.', count: 2 },
};

/* ---------- perks: one from each tier, more with a wildcard ---------- */
const PERK_TIERS = [[1, 'Perk 1', '#4F95DB'], [2, 'Perk 2', '#E0623F'], [3, 'Perk 3', '#5CC46A']];
const PERKS = {
  lightweight: { tier: 1, name: 'Lightweight', desc: 'Move 10% faster and slide further.' },
  scavenger:   { tier: 1, name: 'Scavenger', desc: 'Kills drop an ammo bag. Walk over it to refill both guns and get back a lethal and a tactical. Take ammo from any dropped gun.' },
  flakjacket:  { tier: 1, name: 'Flak Jacket', desc: 'Take 55% less damage from explosives, including your own.' },
  ghost:       { tier: 1, name: 'Ghost', desc: 'Bots only hear your gunfire up close and are slower to pick you out at range.' },
  recovery:    { tier: 1, name: 'Fast Recovery', desc: 'Health starts coming back after 2 s instead of 4, and twice as fast.' },
  quickdraw:   { tier: 2, name: 'Quickdraw', desc: 'Aim down sights 40% faster.' },
  fasthands:   { tier: 2, name: 'Fast Hands', desc: 'Reload 25% faster. Swap weapons and throw equipment faster.' },
  steady:      { tier: 2, name: 'Steady Aim', desc: '35% tighter hip-fire, including while sliding.' },
  marathon:    { tier: 2, name: 'Marathon', desc: 'Sprint 8% faster and slide again straight away.' },
  coldblooded: { tier: 2, name: 'Cold-Blooded', desc: 'Bots take longer to react to you and start their aim further off.' },
  deadsilence: { tier: 3, name: 'Dead Silence', desc: 'Silent footsteps. Bots don\'t notice you sneaking up behind them.' },
  tacmask:     { tier: 3, name: 'Tactical Mask', desc: 'Flashbangs and stuns wear off three times faster.' },
  dexterity:   { tier: 3, name: 'Dexterity', desc: 'No accuracy penalty for jumping, half the penalty for moving, and quicker mantling.' },
  toughness:   { tier: 3, name: 'Toughness', desc: 'Getting shot barely knocks your aim around.' },
  amped:       { tier: 3, name: 'Amped', desc: 'Swap weapons twice as fast and fire straight out of a sprint.' },
};
const WILDCARDS = {
  none:       { name: 'None', desc: 'No wildcard. Three perks, three attachments.' },
  greed:      { name: 'Perk Greed', desc: 'Equip a fourth perk from any tier.', perks: 4 },
  overload:   { name: 'Perk Overload', desc: 'Equip six perks from any tier, but carry no lethal or tactical.', perks: 6 },
  gunfighter: { name: 'Gunfighter', desc: 'Equip up to five attachments on your primary.' },
  overkill:   { name: 'Overkill', desc: 'Carry a second primary in place of a sidearm.' },
  danger:     { name: 'Danger Close', desc: 'Carry an extra lethal and an extra tactical.' },
};
const perkCount = c => (WILDCARDS[c.wildcard] || WILDCARDS.none).perks || 3;
const maxAtts = (c, slot) => slot === 'secondary' && WEAPONS[c.secondary].slot !== 'primary' ? 2 : (slot === 'primary' && c.wildcard === 'gunfighter' ? 5 : 3);

// zombies perk machines
const ZM_PERKS = {
  ironhide:   { name: 'Iron Hide', cost: 2500, color: 0xC8352B, css: '#E0503F', desc: 'Take far more hits before going down.' },
  fasthands:  { name: 'Fast Hands', cost: 3000, color: 0x3FA34D, css: '#5CC46A', desc: 'Reload twice as fast.' },
  rapidround: { name: 'Rapid Round', cost: 2000, color: 0xE0A21E, css: '#F2B53B', desc: 'Every gun fires a third faster, bursts recover faster.' },
  secondwind: { name: 'Second Wind', cost: 500, color: 0x2F6EC8, css: '#4F95DB', desc: 'Get back up once after going down.' },
};
// Pack-a-Punch: what an upgrade does to a gun in zombies
const ZM_PAP = { cost: 5000, dmg: 2.5, mag: 2 };
// upgraded names, shown on the HUD and in popups
const papName = d => d.name.replace(/\s+(AR|BR|SMG|LMG|DMR)$/i, '') + ' \u2605 PaP';
const withAtts = o => Object.assign(noAtts(), o);
const DEFAULT_CLASSES = [
  { name: 'Assault', primary: 'ar', optic: 'reflex', atts: withAtts({ under: 'grip', muzzle: 'flashhider' }), secondary: 'pistol', secOptic: 'iron', secAtts: noAtts(), perks: ['lightweight', 'quickdraw', 'dexterity'], wildcard: 'none', lethal: 'frag', tact: 'flash' },
  { name: 'Rusher', primary: 'smg', optic: 'holo', atts: withAtts({ under: 'laser', stock: 'lightstock', barrel: 'shortbarrel' }), secondary: 'mp', secOptic: 'iron', secAtts: withAtts({ mag: 'extmag' }), perks: ['lightweight', 'marathon', 'deadsilence'], wildcard: 'none', lethal: 'semtex', tact: 'stun' },
  { name: 'Breacher', primary: 'shotgun', optic: 'iron', atts: withAtts({ mag: 'extmag', under: 'grip' }), secondary: 'magnum', secOptic: 'iron', secAtts: withAtts({ under: 'laser' }), perks: ['flakjacket', 'fasthands', 'tacmask'], wildcard: 'danger', lethal: 'frag', tact: 'flash' },
  { name: 'Overwatch', primary: 'sniper', optic: 'scope', atts: withAtts({ muzzle: 'suppressor', stock: 'heavystock' }), secondary: 'pistol', secOptic: 'iron', secAtts: withAtts({ muzzle: 'suppressor' }), perks: ['ghost', 'quickdraw', 'amped'], wildcard: 'none', lethal: 'tknife', tact: 'smoke' },
  { name: 'Support', primary: 'lmg', optic: 'acog', atts: withAtts({ under: 'grip', mag: 'fastmag', muzzle: 'compensator' }), secondary: 'trio', secOptic: 'iron', secAtts: noAtts(), perks: ['scavenger', 'steady', 'toughness', 'recovery'], wildcard: 'greed', lethal: 'frag', tact: 'smoke' },
];
