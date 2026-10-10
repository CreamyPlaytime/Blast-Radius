// Blast Radius \u00B7 settings and saved data
'use strict';

/* ================= SETTINGS ================= */
const clone = o => JSON.parse(JSON.stringify(o));
const settings = { map: 'acres', zmStart: 1, zmDiff: 'normal', profile: null, killcam: true, mode: 'tdm', allies: 3, enemies: 4, ffaBots: 7, aimAssist: 'standard', difficulty: 'regular', time: 10, sens: 1, padSens: 1, fov: 82, vol: .7, music: .6, voiceVol: 1, announcer: true, callouts: true, classes: clone(DEFAULT_CLASSES), classIdx: 0, padPref: 'auto', mpTeams: 'coop', mpKind: 'mp' };
// Each player on this browser has a saved profile: callsign, classes, record, sensitivity. Profile 1 is the
// original save. A window opens on the profile it last used (Player 2 windows keep their own), and anyone can
// switch with "Switch player" on the main menu.
const MAX_PROFILES = 8;
const profKey = n => 'blastradius.settings' + (n > 1 ? '.p' + n : '');
const slotKey = () => 'blastradius.slot' + (typeof SEAT !== 'undefined' && SEAT.n > 1 ? '.p' + SEAT.n : '');
let PROFILE_SLOT = typeof SEAT !== 'undefined' ? SEAT.n : 1;
try { const v = +localStorage.getItem(slotKey()); if (v >= 1 && v <= MAX_PROFILES) PROFILE_SLOT = v; } catch (e) {}
let SETTINGS_KEY = profKey(PROFILE_SLOT);
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) {}
function fixAtts(src, key, legacy) {
  const ok = attsFor(key), o = noAtts();
  if (src && typeof src === 'object') for (const [slot] of ATT_SLOTS) { const a = src[slot]; if (ATTS[a] && ATTS[a].slot === slot && ok.includes(a)) o[slot] = a; }
  if (legacy && ATTS[legacy] && ok.includes(legacy)) o[ATTS[legacy].slot] = legacy;
  return o;
}
function trimAtts(o, max) { let n = 0; for (const [slot] of ATT_SLOTS) if (o[slot] !== 'none') { if (++n > max) o[slot] = 'none'; } return o; }
function fixClass(c, i) {
  const d = DEFAULT_CLASSES[i];
  if (!c || typeof c !== 'object') return clone(d);
  const o = {
    name: typeof c.name === 'string' && c.name.trim() ? c.name.slice(0, 16) : d.name,
    primary: PRIMARIES.includes(c.primary) ? c.primary : d.primary,
    wildcard: WILDCARDS[c.wildcard] ? c.wildcard : 'none',
  };
  o.secondary = SECONDARIES.includes(c.secondary) || (o.wildcard === 'overkill' && PRIMARIES.includes(c.secondary) && c.secondary !== o.primary) ? c.secondary : d.secondary;
  o.optic = opticsFor(o.primary).includes(c.optic) ? c.optic : defaultOptic(o.primary);
  o.secOptic = opticsFor(o.secondary).includes(c.secOptic) ? c.secOptic : defaultOptic(o.secondary);
  o.atts = trimAtts(fixAtts(c.atts, o.primary, c.att), maxAtts(o, 'primary'));
  o.secAtts = trimAtts(fixAtts(c.secAtts && typeof c.secAtts === 'object' ? c.secAtts : null, o.secondary, typeof c.secAtt === 'string' ? c.secAtt : null), maxAtts(o, 'secondary'));
  o.ammo = ammoFor(o.primary).includes(c.ammo) ? c.ammo : 'std';
  o.secAmmo = ammoFor(o.secondary).includes(c.secAmmo) ? c.secAmmo : 'std';
  o.lethal = LETHALS[c.lethal] ? c.lethal : d.lethal;
  o.tact = TACTICALS[c.tact] ? c.tact : d.tact;
  // perks: one per tier, extra slots (wildcards) take any perk not already chosen
  const want = Array.isArray(c.perks) ? c.perks : (typeof c.perk === 'string' ? [c.perk] : []);
  const perks = [];
  for (const [tier] of PERK_TIERS) { const p = want.find(k => PERKS[k] && PERKS[k].tier === tier && !perks.includes(k)) || d.perks.find(k => PERKS[k].tier === tier) || Object.keys(PERKS).find(k => PERKS[k].tier === tier); perks.push(p); }
  const extra = want.filter(k => PERKS[k] && !perks.includes(k));
  while (perks.length < perkCount(o)) { const p = extra.shift() || Object.keys(PERKS).find(k => !perks.includes(k)); perks.push(p); }
  o.perks = perks.slice(0, perkCount(o));
  return o;
}
settings.classes = DEFAULT_CLASSES.map((d, i) => fixClass(Array.isArray(settings.classes) && settings.classes[i] ? settings.classes[i] : clone(d), i));
settings.classIdx = clamp(settings.classIdx | 0, 0, 4);
if (!['off', 'standard', 'strong'].includes(settings.aimAssist)) settings.aimAssist = 'standard';
if (!['auto', 'none', 0, 1, 2, 3].includes(settings.padPref)) settings.padPref = 'auto';
if (!['coop', 'versus'].includes(settings.mpTeams)) settings.mpTeams = 'coop';
if (!['mp', 'zm'].includes(settings.mpKind)) settings.mpKind = 'mp';
// player profile: callsign, XP and service record
const P0 = { name: 'PLAYER', xp: 0, mp: { matches: 0, wins: 0, kills: 0, deaths: 0 }, zm: { games: 0, kills: 0, best: 0 } };
settings.profile = Object.assign(clone(P0), settings.profile || {});
if (PROFILE_SLOT > 1 && (!settings.profile.name || settings.profile.name === 'PLAYER')) settings.profile.name = 'PLAYER ' + PROFILE_SLOT;
settings.profile.mp = Object.assign(clone(P0.mp), settings.profile.mp || {});
settings.profile.zm = Object.assign(clone(P0.zm), settings.profile.zm || {});
const MAX_LEVEL = 55;
const xpToNext = L => 700 + 260 * L;
function levelInfo(xp) {
  let L = 1, need = xpToNext(1);
  while (L < MAX_LEVEL && xp >= need) { xp -= need; L++; need = xpToNext(L); }
  return { level: L, into: xp, need, max: L >= MAX_LEVEL };
}
function addXP(n) {
  const before = levelInfo(settings.profile.xp).level;
  settings.profile.xp += Math.max(0, Math.round(n)); saveSettings();
  const after = levelInfo(settings.profile.xp).level;
  if (typeof renderProfile === 'function') renderProfile();
  return { before, after };
}
function xpLine(n, r) { return `<b>+${n.toLocaleString()} XP</b>${r.after > r.before ? `<span class="lvlup">Level up \u00B7 ${r.after}</span>` : ''}`; }
// the profiles saved on this browser: [{ slot, name, level }]
function listProfiles() {
  const out = [];
  for (let n = 1; n <= MAX_PROFILES; n++) {
    let d = null;
    if (n === PROFILE_SLOT) d = settings;
    else { try { d = JSON.parse(localStorage.getItem(profKey(n)) || 'null'); } catch (e) {} }
    if (!d || !d.profile) continue;
    out.push({ slot: n, name: d.profile.name || (n > 1 ? 'PLAYER ' + n : 'PLAYER'), level: levelInfo(d.profile.xp || 0).level });
  }
  return out;
}
function freeProfileSlot() { const used = listProfiles().map(p => p.slot); for (let n = 1; n <= MAX_PROFILES; n++) if (!used.includes(n)) return n; return 0; }
// what belongs to a player rather than to the computer (volume, music and so on stay as they are)
const PERSONAL = ['sens', 'padSens', 'aimAssist', 'fov'];
// switch this window to another saved profile (or a new one in an empty slot)
function useProfile(n, fresh) {
  n = clamp(n | 0, 1, MAX_PROFILES);
  if (n === PROFILE_SLOT && !fresh) return;
  saveSettings();
  PROFILE_SLOT = n; SETTINGS_KEY = profKey(n);
  try { localStorage.setItem(slotKey(), String(n)); } catch (e) {}
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch (e) {}
  settings.profile = Object.assign(clone(P0), saved.profile || {});
  settings.profile.mp = Object.assign(clone(P0.mp), settings.profile.mp || {});
  settings.profile.zm = Object.assign(clone(P0.zm), settings.profile.zm || {});
  if (!settings.profile.name || settings.profile.name === 'PLAYER') settings.profile.name = n > 1 ? 'PLAYER ' + n : 'PLAYER';
  settings.classes = DEFAULT_CLASSES.map((d, i) => fixClass(Array.isArray(saved.classes) && saved.classes[i] ? saved.classes[i] : clone(d), i));
  settings.classIdx = clamp((saved.classIdx | 0), 0, 4);
  for (const k of PERSONAL) if (saved[k] !== undefined) settings[k] = saved[k];
  if (!['off', 'standard', 'strong'].includes(settings.aimAssist)) settings.aimAssist = 'standard';
  saveSettings();
  if (typeof renderProfile === 'function') renderProfile();
}
// a second window on this computer becomes Player n: its own profile, and its own controller
function useSeatProfile(n) {
  if (typeof SEAT === 'undefined' || SEAT.n === n) return;
  SEAT.n = n;
  let slot = n; try { const v = +localStorage.getItem(slotKey()); if (v >= 1 && v <= MAX_PROFILES) slot = v; } catch (e) {}
  if (slot === PROFILE_SLOT) slot = n !== PROFILE_SLOT ? n : (freeProfileSlot() || n);
  useProfile(slot, true);
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch (e) {}
  settings.padPref = ['auto', 'none', 0, 1, 2, 3].includes(saved.padPref) ? saved.padPref : 'auto';
  saveSettings();
}
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} }
