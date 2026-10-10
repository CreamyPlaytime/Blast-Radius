// Blast Radius \u00B7 sound effects, synthesized with Web Audio
'use strict';

/* ================= AUDIO ================= */
let AC = null, master = null, comp = null, verbIn = null, noiseBuf = null, shaperCurve = null;
function initAudio() {
  try {
    if (!AC) {
      // 'balanced' gives the audio thread a bigger buffer: the default low-latency buffer underruns while the
      // game is busy rendering, and each underrun is heard as a crackle
      const Ctx = window.AudioContext || window.webkitAudioContext;
      try { AC = new Ctx({ latencyHint: 'balanced' }); } catch (e) { AC = new Ctx(); }
      comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = .002; comp.release.value = .18;
      // the compressor adds its own make-up gain, so a pile of explosions could still push past full scale and
      // clip (heard as static). A trim and a hard brick-wall limiter after it keep the output clean.
      const trim = AC.createGain(); trim.gain.value = .7;
      const lim = AC.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .1;
      master = AC.createGain(); master.connect(comp); comp.connect(trim); trim.connect(lim); lim.connect(AC.destination);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const len = AC.sampleRate * 1.8, ir = AC.createBuffer(2, len, AC.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const c = ir.getChannelData(ch); for (let i = 0; i < len; i++) c[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < AC.sampleRate * .012 ? .3 : 1); }
      const verb = AC.createConvolver(); verb.buffer = ir;
      verbIn = AC.createGain(); verbIn.gain.value = .55; verbIn.connect(verb); verb.connect(master);
      shaperCurve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; shaperCurve[i] = Math.tanh(x * 3.2); }
    }
    master.gain.value = settings.vol;
    if (AC.state === 'suspended') AC.resume();
  } catch (e) { AC = null; }
}
// every sound builds a short chain of nodes; they're cut loose a few seconds later so finished sounds don't
// pile up on the audio thread over a long match
let liveVoices = 0;
function outChain(vol, pan, verbSend = .1, lowpass = 0, life = 5) {
  const g = AC.createGain(); g.gain.value = vol;
  const nodes = [g];
  let node = g;
  if (lowpass) { const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lowpass; g.connect(lp); node = lp; nodes.push(lp); }
  let last = node;
  if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); node.connect(p); last = p; nodes.push(p); }
  last.connect(master);
  if (verbSend > 0) { const s = AC.createGain(); s.gain.value = verbSend; last.connect(s); s.connect(verbIn); nodes.push(s); }
  liveVoices++;
  setTimeout(() => { liveVoices--; for (const n of nodes) { try { n.disconnect(); } catch (e) {} } }, life * 1000);
  return g;
}
function nz(t, dur, type, freq, q, vol, out, attack = .002, rate = 1, sweepTo = 0) {
  // looped so a long burst (explosions, smoke hiss) never runs off the end of the 2 s noise buffer: that hard
  // cut was a click on every long sound
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.playbackRate.value = rate;
  const f = AC.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0004, t + dur);
  s.connect(f); f.connect(g); g.connect(out);
  s.start(t, Math.random() * 1.6, dur + .05);
  return g;
}
function osc(t, f0, f1, dur, vol, out, type = 'sine') {
  const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0004, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .02);
}
function click(t, freq, vol, out) { osc(t, freq, freq * .5, .014, vol * .7, out, 'square'); nz(t, .02, 'highpass', freq, 1, vol, out, .0008); }
function tone(freq, dur, vol, type = 'sine', delay = 0) {
  if (!AC) return;
  const t = AC.currentTime + delay; osc(t, freq, freq, dur, vol, master, type);
}
const GUNSND = {
  ar:       { crack: .9,  body: [1150, .13], thump: [150, 45, .16, 1],    tail: .9 },
  smg:      { crack: .7,  body: [1550, .085], thump: [180, 60, .1, .75],  tail: .65 },
  lmg:      { crack: .95, body: [920, .15],  thump: [125, 40, .19, 1.15], tail: 1.0 },
  shotgun:  { crack: .85, body: [620, .3],   thump: [105, 34, .32, 1.5],  tail: 1.25 },
  sniper:   { crack: 1.3, body: [720, .28],  thump: [92, 28, .38, 1.6],   tail: 1.7 },
  pistol:   { crack: .8,  body: [1750, .075], thump: [210, 70, .085, .65], tail: .6 },
  revolver: { crack: 1.15, body: [1050, .17], thump: [135, 42, .22, 1.25], tail: 1.1 },
  br:       { crack: .95, body: [1050, .12], thump: [140, 45, .15, 1.05], tail: .95 },
  ar2:      { crack: .85, body: [1300, .11], thump: [165, 50, .14, .95],  tail: .85 },
  smg2:     { crack: .75, body: [1200, .1],  thump: [150, 50, .13, .95],  tail: .75 },
  anvil:    { crack: 1.05, body: [800, .17], thump: [110, 34, .22, 1.3],  tail: 1.15 },
  dmr:      { crack: 1.15, body: [880, .2],  thump: [115, 34, .28, 1.35], tail: 1.4 },
  sniper2:  { crack: 1.2, body: [800, .24],  thump: [100, 30, .32, 1.45], tail: 1.55 },
  magnum:   { crack: 1.25, body: [950, .19], thump: [120, 38, .26, 1.4],  tail: 1.25 },
  coach:    { crack: 1.0, body: [560, .34],  thump: [95, 30, .36, 1.7],   tail: 1.35 },
};
function playGun(kind, vol, pan, supp, dist) {
  if (!AC || vol < .01) return;
  // in a big firefight, quiet far-off shots are dropped before the audio thread overloads (which crackles)
  if (dist > 1 && (liveVoices > 90 || (liveVoices > 55 && vol < .35))) return;
  if (kind === 'atomizer') {
    const t = AC.currentTime + dist / 343, o = outChain(vol, pan, .35, lerp(16000, 2000, clamp(dist / 70, 0, 1)));
    osc(t, 1800, 120, .32, .45, o, 'sawtooth'); osc(t, 900, 60, .4, .5, o, 'square'); nz(t, .25, 'bandpass', 3000, 2, .6, o, .002, 1, 600); osc(t, 90, 40, .3, .9, o);
    return;
  }
  if (kind === 'rpg') {
    // a hard pop, then the motor's roar tearing away
    const t = AC.currentTime + dist / 343, o = outChain(vol, pan, .45, lerp(16000, 1800, clamp(dist / 80, 0, 1)));
    osc(t, 120, 38, .35, 1.1, o); nz(t, .06, 'highpass', 2500, .7, .7, o, .001);
    nz(t + .02, 1.1, 'bandpass', 900, .8, .75, o, .03, 1, 260); nz(t + .02, .9, 'lowpass', 500, .7, .55, o, .02);
    return;
  }
  if (kind === 'gl') {
    // the hollow 'thoonk' of a 40mm launcher
    const t = AC.currentTime + dist / 343, o = outChain(vol, pan, .25, lerp(16000, 1800, clamp(dist / 60, 0, 1)));
    osc(t, 210, 70, .16, 1.0, o); osc(t, 420, 160, .08, .35, o, 'triangle'); nz(t, .12, 'bandpass', 700, 1.4, .5, o, .002); click(t + .01, 1800, .2, o);
    return;
  }
  const P = GUNSND[kind] || GUNSND.ar, df = clamp(dist / 70, 0, 1);
  const t = AC.currentTime + dist / 343;
  const out = outChain(vol, pan, (supp ? .12 : .28 + df * .7) * P.tail, lerp(16000, 1500, df));
  if (!supp) {
    nz(t, .045, 'highpass', 3200, .7, P.crack * Math.pow(1 - df, 2), out, .0008);
    const ws = AC.createWaveShaper(); ws.curve = shaperCurve; ws.connect(out);
    nz(t, P.body[1], 'bandpass', P.body[0], .9, 1.1, ws, .0015, 1, P.body[0] * .55);
    osc(t, P.thump[0], P.thump[1], P.thump[2], P.thump[3] * .85, ws);
    nz(t + .01, P.body[1] * 2.6, 'lowpass', 900, .7, .22 * P.tail, out, .01);
  } else {
    nz(t, .09, 'bandpass', P.body[0] * .45, 1.3, .55, out, .002, 1, P.body[0] * .3);
    osc(t, P.thump[0] * .8, P.thump[1], P.thump[2] * .7, P.thump[3] * .35, out);
    nz(t, .03, 'highpass', 5000, 1, .08, out, .001);
  }
  if (dist < 1) click(t + .012, 3400, .06, out);
}
const FOLEY = {
  magOut(t, o) { click(t, 1700, .35, o); nz(t + .01, .1, 'bandpass', 2900, 2, .28, o, .003); nz(t + .05, .07, 'lowpass', 700, 1, .25, o); },
  magIn(t, o) { nz(t, .05, 'bandpass', 1900, 1.5, .35, o); osc(t, 210, 95, .07, .45, o); click(t + .035, 2500, .38, o); click(t + .07, 1300, .22, o); },
  bolt(t, o) { click(t, 2100, .3, o); nz(t, .09, 'bandpass', 3300, 3, .3, o, .004, 1, 2000); click(t + .15, 2700, .45, o); nz(t + .15, .06, 'highpass', 3000, 1, .32, o); osc(t + .15, 320, 150, .05, .35, o); },
  slide(t, o) { click(t, 2600, .3, o); nz(t, .06, 'bandpass', 3800, 3, .25, o); click(t + .1, 3000, .45, o); osc(t + .1, 380, 180, .04, .3, o); },
  pump(t, o) { nz(t, .08, 'bandpass', 1300, 2, .45, o, .004); click(t + .06, 900, .4, o); nz(t + .16, .07, 'bandpass', 1700, 2, .45, o, .004); click(t + .21, 1350, .5, o); osc(t + .21, 200, 90, .06, .4, o); },
  shell(t, o) { nz(t, .045, 'bandpass', 2300, 2, .3, o); click(t + .03, 1500, .32, o); osc(t + .03, 260, 120, .04, .3, o); },
  coverOpen(t, o) { click(t, 1500, .4, o); nz(t, .12, 'bandpass', 2200, 2, .25, o, .01); },
  coverClose(t, o) { nz(t, .05, 'bandpass', 1800, 1.5, .3, o); click(t + .04, 1200, .55, o); osc(t + .04, 180, 80, .08, .5, o); },
  cylOpen(t, o) { click(t, 2300, .35, o); nz(t + .02, .09, 'bandpass', 3500, 3, .2, o); },
  cylClose(t, o) { click(t, 1700, .5, o); osc(t, 260, 120, .05, .35, o); for (let k = 0; k < 3; k++) click(t + .06 + k * .03, 4200, .08, o); },
  shellsOut(t, o) { for (let k = 0; k < 6; k++) { const tt = t + .05 + Math.random() * .18; osc(tt, 4200 + Math.random() * 2400, 3800, .05, .07, o, 'triangle'); } },
  shellsIn(t, o) { nz(t, .06, 'bandpass', 2000, 2, .3, o); click(t + .05, 1900, .3, o); },
  dry(t, o) { click(t, 3200, .35, o); },
  raise(t, o) { nz(t, .16, 'lowpass', 900, 1, .25, o, .03); click(t + .12, 2000, .15, o); },
  melee(t, o) { nz(t, .2, 'bandpass', 900, 1.2, .5, o, .04, 1, 2600); },
  stab(t, o) { nz(t, .08, 'lowpass', 600, 1, .6, o); osc(t, 140, 60, .1, .5, o); },
  slideScrape(t, o) { nz(t, .6, 'bandpass', 700, .8, .45, o, .02, 1, 300); nz(t, .5, 'highpass', 3000, .5, .08, o, .02); },
  step(t, o) { nz(t, .07, 'lowpass', 420, 1, .55, o, .004); nz(t + .004, .035, 'bandpass', 1900, 2, .1, o); },
  land(t, o) { nz(t, .12, 'lowpass', 300, 1, .8, o, .003); osc(t, 110, 50, .1, .5, o); },
  prone(t, o) { nz(t, .25, 'lowpass', 500, 1, .5, o, .02); osc(t + .1, 90, 50, .1, .3, o); },
  hurt(t, o) { osc(t, 90, 45, .18, .7, o); nz(t, .12, 'lowpass', 400, 1, .5, o); },
  throw(t, o) { nz(t, .2, 'bandpass', 700, 1, .45, o, .04, 1, 2200); },
  pin(t, o) { click(t, 4200, .22, o); click(t + .09, 2600, .25, o); },
  clink(t, o) { osc(t, 2600 + Math.random() * 900, 2200, .06, .18, o, 'triangle'); click(t, 3400, .2, o); },
  boom(t, o) { nz(t, 1.6, 'lowpass', 1100, .7, 1.3, o, .002, 1, 110); osc(t, 95, 28, .7, 1.2, o); nz(t, .09, 'highpass', 1800, .7, .7, o, .001); nz(t + .05, 1.2, 'bandpass', 300, .6, .5, o, .05); },
  bang(t, o) { nz(t, .55, 'lowpass', 3500, .5, 1.2, o, .001, 1, 400); osc(t, 75, 30, .3, .8, o); nz(t, .05, 'highpass', 4000, .7, .8, o, .0005); },
  zap(t, o) { osc(t, 900, 180, .45, .25, o, 'sawtooth'); nz(t, .4, 'bandpass', 2400, 4, .4, o, .002); osc(t, 60, 40, .3, .6, o); },
  spoon(t, o) { click(t + .05, 3800, .25, o); osc(t + .05, 2600, 1800, .08, .08, o, 'triangle'); },
  tick(t, o) { click(t, 2400, .3, o); },
  mantle(t, o) { nz(t, .18, 'lowpass', 600, 1, .45, o, .02); click(t + .14, 900, .25, o); nz(t + .2, .12, 'bandpass', 1200, 1, .3, o, .01); },
  hiss(t, o) { nz(t, 3, 'highpass', 2600, .5, .3, o, .25); nz(t, 2.5, 'bandpass', 900, .5, .15, o, .3); },
};
function foley(name, vol = 1, pan = 0) { if (!AC || !FOLEY[name]) return; FOLEY[name](AC.currentTime, outChain(vol * .9, pan, .08)); }
function sndHit(head, killed) {
  if (!AC) return;
  const t = AC.currentTime, o = outChain(1, 0, 0);
  // the classic tick: a short bright click with a metallic edge
  click(t, 2900, .55, o); nz(t, .028, 'bandpass', 5200, 3, .45, o, .0005); osc(t, 1800, 1500, .03, .2, o, 'triangle');
  if (head) { osc(t + .004, 3500, 3420, .16, .2, o, 'sine'); osc(t + .004, 5250, 5150, .11, .09, o, 'sine'); }
  if (killed) { osc(t + .03, 170, 55, .16, .6, o); nz(t + .03, .09, 'lowpass', 600, 1, .45, o); osc(t + .05, 1250, 1240, .18, .12, o, 'triangle'); }
}
const sndTag = good => good ? (tone(990, .08, .2, 'triangle'), tone(1480, .14, .2, 'triangle', .08)) : tone(500, .14, .18, 'sawtooth');

/* ---------- menu sounds ---------- */
function uiSound(kind) {
  if (!AC) return;
  const t = AC.currentTime, o = outChain(.5, 0, .04);
  if (kind === 'move') { osc(t, 1350, 1200, .045, .16, o, 'square'); nz(t, .02, 'highpass', 4000, 1, .05, o, .001); }
  else if (kind === 'tick') osc(t, 2100, 1900, .03, .12, o, 'square');
  else if (kind === 'select') { osc(t, 660, 640, .07, .2, o, 'square'); osc(t + .06, 990, 980, .1, .18, o, 'square'); nz(t, .12, 'bandpass', 2400, 2, .12, o, .002); }
  else if (kind === 'back') { osc(t, 520, 300, .1, .2, o, 'square'); }
  else if (kind === 'start') { osc(t, 110, 40, .9, .9, o); nz(t, .9, 'lowpass', 900, .7, .5, o, .01, 1, 120); osc(t + .05, 880, 870, .3, .12, o, 'triangle'); osc(t + .05, 1320, 1310, .4, .08, o, 'triangle'); }
}

/* ---------- zombies sounds ---------- */
let lastGroan = 0;
function zSoundAt(fn, x, z, vol, range = 40) {
  if (!AC || !G.player) return;
  const p = G.player, dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
  if (d > range) return;
  const pan = d > .1 ? (dx * Math.cos(p.yaw) - dz * Math.sin(p.yaw)) / d * .8 : 0;
  fn(AC.currentTime, outChain(vol * clamp(1 - d / range, .05, 1), pan, .3, lerp(9000, 1200, clamp(d / range, 0, 1))));
}
function groan(t, o) {
  const f0 = rand(75, 120), dur = rand(.7, 1.4);
  const src = AC.createOscillator(); src.type = 'sawtooth'; src.frequency.setValueAtTime(f0, t); src.frequency.linearRampToValueAtTime(f0 * rand(.7, 1.1), t + dur);
  const lfo = AC.createOscillator(); lfo.frequency.value = rand(5, 9); const lg = AC.createGain(); lg.gain.value = f0 * .06; lfo.connect(lg); lg.connect(src.frequency);
  const f1 = AC.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.setValueAtTime(rand(450, 650), t); f1.frequency.linearRampToValueAtTime(rand(300, 500), t + dur); f1.Q.value = 4;
  const f2 = AC.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = rand(1000, 1400); f2.Q.value = 6;
  const g = AC.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .12); g.gain.setValueAtTime(.5, t + dur * .7); g.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(f1); src.connect(f2); f1.connect(g); f2.connect(g); g.connect(o);
  nz(t, dur, 'bandpass', 900, 3, .12, o, .1);
  src.start(t); src.stop(t + dur + .05); lfo.start(t); lfo.stop(t + dur + .05);
}
function screech(t, o) { osc(t, 520, 260, .35, .25, o, 'sawtooth'); nz(t, .3, 'bandpass', 1800, 2, .5, o, .01, 1, 900); }
function zombieGroan(z) { if (G.now - lastGroan < .7) return; lastGroan = G.now; zSoundAt(groan, z.pos.x, z.pos.z, .7, 30); }
function zombieAttack(z) { zSoundAt(screech, z.pos.x, z.pos.z, .8, 20); }
function snarl(t, o) { for (let k = 0; k < 3; k++) osc(t + k * .07, 160 + Math.random() * 60, 90, .16, .35, o, 'sawtooth'); nz(t, .45, 'bandpass', 700, 2, .5, o, .02, 1, 300); }
function bark(t, o) { osc(t, 420, 180, .12, .45, o, 'sawtooth'); nz(t, .14, 'bandpass', 1100, 1.5, .5, o, .005, 1, 500); osc(t + .16, 380, 160, .14, .4, o, 'sawtooth'); }
function dogBark(z) { zSoundAt(Math.random() < .5 ? bark : snarl, z.pos.x, z.pos.z, .75, 34); }
function lightning(x, z) { zSoundAt((t, o) => { nz(t, 1.6, 'lowpass', 2400, .6, 1.2, o, .002, 1, 120); osc(t, 70, 30, 1.0, .8, o); nz(t, .08, 'highpass', 3000, .7, .8, o, .0005); }, x, z, 1.1, 90); }
function houndRoundSting() { if (!AC) return; const t = AC.currentTime, o = outChain(.9, 0, .6); for (let k = 0; k < 3; k++) osc(t + k * .5, 110 - k * 12, 50, 1.6, .5, o, 'sawtooth'); nz(t, 2.4, 'bandpass', 500, .8, .4, o, .3, 1, 140); for (let k = 0; k < 2; k++) { osc(t + 1.2 + k * .3, 600, 1500, .9, .12, o, 'sawtooth'); } }
function splat(t, o) { nz(t, .3, 'lowpass', 500, 1, .8, o, .002, 1, 120); osc(t, 120, 40, .25, .6, o); nz(t + .02, .2, 'bandpass', 1400, 2, .35, o, .01); }
function spitSnd(t, o) { nz(t, .25, 'bandpass', 1600, 3, .5, o, .01, 1, 500); osc(t, 300, 120, .2, .2, o, 'sawtooth'); }
function zombieRise(z) { zSoundAt((t, o) => { nz(t, .9, 'lowpass', 400, 1, .7, o, .1); osc(t, 60, 35, .8, .5, o); }, z.pos.x, z.pos.z, .8, 35); }
function chaChing() { if (!AC) return; const t = AC.currentTime, o = outChain(.7, 0, .1); click(t, 3000, .4, o); osc(t + .03, 1568, 1560, .25, .2, o, 'triangle'); osc(t + .1, 2093, 2090, .35, .18, o, 'triangle'); nz(t + .02, .2, 'highpass', 6000, 1, .15, o); }
function denied() { if (!AC) return; const t = AC.currentTime, o = outChain(.6, 0, 0); osc(t, 180, 170, .12, .3, o, 'square'); osc(t + .14, 140, 130, .16, .3, o, 'square'); }
function powerupSound() { if (!AC) return; const t = AC.currentTime, o = outChain(.8, 0, .4); [523, 659, 784, 1047].forEach((f, i) => osc(t + i * .07, f, f, .4, .16, o, 'triangle')); nz(t, .6, 'highpass', 5000, 1, .1, o, .2); }
function boxJingle(t0) {
  if (!AC) return; const t = AC.currentTime, o = outChain(.6, 0, .4);
  [784, 988, 1175, 988, 784, 988, 1175, 1568, 1175, 1319, 1568, 1976].forEach((f, i) => osc(t + i * .22, f, f * .995, .35, .14, o, 'triangle'));
}
// a short eerie stinger for round changes
function roundStinger(start) {
  if (!AC) return; const t = AC.currentTime, o = outChain(.9, 0, .7);
  const notes = start ? [[110, 0], [104, .45], [98, .9], [92.5, 1.35]] : [[147, 0], [139, .3], [131, .6], [110, 1.0]];
  for (const [f, dt] of notes) { osc(t + dt, f, f, 1.6, .28, o, 'sawtooth'); osc(t + dt, f * 2.01, f * 2, 1.4, .1, o, 'triangle'); osc(t + dt, f * 1.5, f * 1.5, 1.4, .06, o, 'sine'); }
  nz(t, 3, 'lowpass', 300, 1, .25, o, .5); osc(t, 55, 50, 3, .5, o);
}
