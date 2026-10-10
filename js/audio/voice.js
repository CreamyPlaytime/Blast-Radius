// Blast Radius · announcer and squad callouts, spoken with the browser's own speech voices
'use strict';

/* Two kinds of lines:
   'ann'  — the announcer: match start, multi-kills, streaks, the lead, time, the result. Always heard, cuts chatter.
   'team' — your squad on the radio: contacts, reloads, grenades, kills, losses. Only from bots near you, never
            on top of another line, with a radio squelch before and after.
   Uses speechSynthesis; if the browser has no voices the game simply stays quiet.            */
const VOICE = { ok: typeof window !== 'undefined' && 'speechSynthesis' in window, voices: [], lastAny: -99, lastBy: new Map(), pending: null };
function voiceInit() {
  if (!VOICE.ok) return;
  const load = () => {
    const all = speechSynthesis.getVoices();
    const en = all.filter(v => /^en[-_]/i.test(v.lang) || v.lang === 'en');
    VOICE.voices = en.length ? en : all;
    // the announcer gets a deep, steady voice when one is named that way
    VOICE.ann = VOICE.voices.find(v => /male|daniel|david|alex|george|fred|guy|mark|james/i.test(v.name) && !/female/i.test(v.name)) || VOICE.voices[0] || null;
  };
  load();
  try { speechSynthesis.addEventListener('voiceschanged', load); } catch (e) { speechSynthesis.onvoiceschanged = load; }
}
voiceInit();
const voiceVol = () => clamp((settings.vol ?? .7) * (settings.voiceVol ?? 1), 0, 1);
function squelch(t0 = 0) {
  if (!AC) return;
  const t = AC.currentTime + t0, o = outChain(.35, 0, 0, 3200, 1.5);
  nz(t, .07, 'bandpass', 2400, 1.5, .5, o, .002); click(t, 3000, .25, o);
}
// pick a stable voice for a bot so each teammate always sounds like the same person
function botVoice(e) {
  if (e.voice === undefined) e.voice = { i: hashName(e.name) % Math.max(1, VOICE.voices.length), pitch: .8 + (hashName(e.name + 'p') % 40) / 100, rate: 1.08 + (hashName(e.name + 'r') % 20) / 100 };
  return e.voice;
}
function say(text, kind = 'ann', who = null) {
  if (!VOICE.ok || !text) return;
  if (kind === 'ann' && settings.announcer === false) return;
  if (kind === 'team' && settings.callouts === false) return;
  const now = performance.now() / 1000;
  if (kind === 'team') {
    if (speechSynthesis.speaking || speechSynthesis.pending || now - VOICE.lastAny < 2.2) return;
    if (who) { const lb = VOICE.lastBy.get(who.id) || -99; if (now - lb < 7) return; VOICE.lastBy.set(who.id, now); }
  } else if (speechSynthesis.speaking) {
    // the announcer talks over chatter, but queues behind another announcement (at most one waiting)
    if (VOICE.curKind === 'team') speechSynthesis.cancel();
    else if (speechSynthesis.pending) return;
  }
  VOICE.lastAny = now;
  const u = new SpeechSynthesisUtterance(text);
  u.volume = voiceVol() * (kind === 'team' ? .85 : 1);
  if (kind === 'team' && who) {
    const v = botVoice(who); u.voice = VOICE.voices[v.i] || null; u.pitch = v.pitch; u.rate = v.rate;
    squelch();
    u.onend = () => squelch();
  } else { u.voice = VOICE.ann || null; u.pitch = .7; u.rate = .95; }
  u.onstart = () => { VOICE.curKind = kind; };
  try { speechSynthesis.speak(u); } catch (e) {}
}
function voiceStop() { if (VOICE.ok) try { speechSynthesis.cancel(); } catch (e) {} }
const pickLine = list => list[Math.random() * list.length | 0];

/* ---------- announcer ---------- */
const ANN = { firstBlood: false, lead: 0, oneMin: false, multiN: 0, multiT: -99 };
function annMatchStart() {
  Object.assign(ANN, { firstBlood: false, lead: 0, oneMin: false, multiN: 0, multiT: -99 });
  const lines = { tdm: 'Team deathmatch. Eliminate the enemy team.', ffa: 'Free for all. Every man for himself.', kc: 'Kill confirmed. Collect the enemy dog tags.' };
  setTimeout(() => { if (G.state === 'playing' && !G.zm) say(lines[G.mode] || MODES[G.mode].name); }, 900);
}
function annKill(v, a, head) {
  if (G.zm || a === v) return;
  const p = G.player, mine = a === p, team = MODES[G.mode].team;
  if (!ANN.firstBlood) {
    ANN.firstBlood = true;
    if (mine) { say('First blood.'); return; }
    if (team && a.team === p.team) say('First blood, Vanguard.');
  }
  if (mine) {
    // multi-kills: kills within four seconds of each other
    ANN.multiN = G.now - ANN.multiT < 4 ? ANN.multiN + 1 : 1; ANN.multiT = G.now;
    const multi = { 2: 'Double kill!', 3: 'Triple kill!', 4: 'Multi kill!', 5: 'Mega kill!' }[Math.min(ANN.multiN, 5)];
    const streak = { 5: 'Five kill streak.', 10: 'Ten kill streak. Unstoppable.', 15: 'Fifteen kill streak. Nuclear.', 20: 'Twenty kill streak. Legendary.' }[a.streak];
    if (streak) say(streak); else if (multi) say(multi); else if (head && Math.random() < .25) say('Headshot.');
  }
  if (v === p && team) {
    // a teammate notices you went down
    const ally = nearestAlly(p, 30);
    if (ally && Math.random() < .6) setTimeout(() => say(pickLine([`${p.name}'s down!`, 'Man down!', 'We lost one!']), 'team', ally), 500);
  }
}
// once a second: lead changes and the clock
function annTick() {
  if (G.zm || G.ended || G.state !== 'playing') return;
  const p = G.player, M = MODES[G.mode];
  let lead = 0;
  if (M.team) { const a = G.teamScore.A, b = G.teamScore.B; lead = a > b ? 1 : a < b ? -1 : 0; }
  else { const top = Math.max(...G.ents.filter(e => e !== p).map(e => e.kills)); lead = p.kills > top ? 1 : p.kills < top ? -1 : 0; }
  if (lead && lead !== ANN.lead && (M.team ? G.teamScore.A + G.teamScore.B : p.kills) >= 3) {
    say(lead > 0 ? (M.team ? "We've taken the lead." : "You're in the lead.") : (M.team ? "We've lost the lead." : "You've lost the lead."));
  }
  if (lead) ANN.lead = lead;
  if (!ANN.oneMin && G.timeLeft <= 60 && G.timeLeft > 50) { ANN.oneMin = true; say('One minute remaining.'); }
}
function annResult(win, draw) { setTimeout(() => say(draw ? 'Draw.' : win ? 'Victory.' : 'Defeat. Mission failed.'), 400); }

/* ---------- squad callouts ---------- */
function nearestAlly(p, maxD, except = null) {
  let best = null, bd = maxD;
  for (const e of G.ents) {
    if (!e.isBot || e.human || !e.alive || e === except || e.team !== p.team) continue;
    const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z); if (d < bd) { bd = d; best = e; }
  }
  return best;
}
// a bot on your team, close enough to hear on the radio
function squadmate(b, range = 40) {
  const p = G.player;
  if (!p || G.zm || !MODES[G.mode].team || !b || !b.isBot || b.human || !b.alive || b.team !== p.team) return false;
  return Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z) < range;
}
function clockDir(b, x, z) {
  // where the contact is, relative to where the player is looking
  const p = G.player, a = Math.atan2(-(x - p.pos.x), -(z - p.pos.z)), d = wrap(a - p.yaw);
  return Math.abs(d) < .6 ? 'ahead' : Math.abs(d) > 2.5 ? 'behind us' : d > 0 ? 'on the left' : 'on the right';
}
function calloutContact(b, t) {
  if (!squadmate(b) || Math.random() > .5) return;
  const dir = clockDir(b, t.pos.x, t.pos.z);
  say(pickLine([`Contact, ${dir}!`, `Enemy ${dir}!`, 'Got eyes on one!', `Hostile ${dir}!`, 'Tango spotted!']), 'team', b);
}
function calloutReload(b) { if (squadmate(b, 25) && Math.random() < .35) say(pickLine(['Reloading!', 'Cover me, reloading!', 'Changing mags!']), 'team', b); }
function calloutThrow(b, type) {
  if (!squadmate(b, 35)) return;
  const L = { frag: ['Frag out!', 'Grenade out!'], semtex: ['Sticky out!', 'Semtex out!'], tknife: [], flash: ['Flashbang out!', 'Flash out!'], smoke: ['Popping smoke!', 'Smoke out!'], stun: ['Stun out!', 'Concussion out!'] }[type];
  if (L && L.length) say(pickLine(L), 'team', b);
}
function calloutKill(a, v) {
  if (!squadmate(a) || Math.random() > .55) return;
  say(pickLine(['Got him!', 'Tango down!', 'Enemy down!', 'Target down!', 'Scratch one!']), 'team', a);
}
function calloutAllyDown(v) {
  const p = G.player;
  if (G.zm || !MODES[G.mode].team || !v.isBot || v.team !== p.team) return;
  const ally = nearestAlly(v, 25, v);
  if (ally && squadmate(ally) && Math.random() < .5) say(pickLine([`${v.name} is down!`, 'Man down!', `We lost ${v.name}!`]), 'team', ally);
}
