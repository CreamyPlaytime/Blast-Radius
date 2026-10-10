// Blast Radius \u00B7 menu music
'use strict';

/* Two looping tracks, synthesized on the fly:
   'mp' \u2014 a tense cinematic score at 96 BPM in D minor: pulsing sub bass, wide analog pads,
          a delayed pluck arpeggio, taiko hits, low brass 'braams' and a lead hook
   'zm' \u2014 a slow, eerie music-box lullaby over a low drone for the zombies menus      */

const MUSIC = { on: false, track: 'mp', bus: null, dsend: null, gtr: null, next: 0, step: 0, bar: 0 };
let musicTrack = 'mp';
const N = { B1: 61.74, C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, Fs2: 92.5, G2: 98, A2: 110, Bb2: 116.54, B2: 123.47, C3: 130.81, D3: 146.83 };

function distCurve(k) { const c = new Float32Array(2048); for (let i = 0; i < 2048; i++) { const x = i / 1024 - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; }

function startMusic(track) {
  if (track) musicTrack = track;
  if (!AC || settings.music <= 0) return;
  if (MUSIC.on && MUSIC.track === musicTrack) return;
  if (MUSIC.on) stopMusic(true);
  MUSIC.on = true; MUSIC.track = musicTrack;
  const t = AC.currentTime, bus = AC.createGain();
  bus.gain.setValueAtTime(0, t); bus.gain.linearRampToValueAtTime(settings.music * .6, t + 1.5);
  bus.connect(master);
  // feedback delay for leads
  const dl = AC.createDelay(1); dl.delayTime.value = musicTrack === 'mp' ? 60 / MP_BPM * .75 : 60 / 70 * .5;
  const fb = AC.createGain(); fb.gain.value = musicTrack === 'mp' ? .38 : .45;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
  const dsend = AC.createGain(); dsend.gain.value = .35;
  dsend.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(bus);
  // guitar rig: input \u2192 tight highpass \u2192 heavy distortion \u2192 cabinet filters
  const gIn = AC.createGain(); gIn.gain.value = .9;
  const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 85;
  const ws = AC.createWaveShaper(); ws.curve = distCurve(55); ws.oversample = '4x';
  const cab1 = AC.createBiquadFilter(); cab1.type = 'lowpass'; cab1.frequency.value = 3600; cab1.Q.value = .8;
  const cab2 = AC.createBiquadFilter(); cab2.type = 'peaking'; cab2.frequency.value = 1500; cab2.gain.value = 3; cab2.Q.value = 1;
  const cab3 = AC.createBiquadFilter(); cab3.type = 'highpass'; cab3.frequency.value = 75;
  const gOut = AC.createGain(); gOut.gain.value = .16;
  gIn.connect(hp); hp.connect(ws); ws.connect(cab1); cab1.connect(cab2); cab2.connect(cab3); cab3.connect(gOut); gOut.connect(bus);
  const vsend = AC.createGain(); vsend.gain.value = .7; vsend.connect(verbIn);
  Object.assign(MUSIC, { bus, dsend, vsend, gtr: gIn, next: t + .2, step: 0, bar: 0 });
}
function stopMusic(fast) {
  if (!MUSIC.on || !AC) return; MUSIC.on = false;
  const b = MUSIC.bus, t = AC.currentTime;
  b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(0, t + (fast ? .35 : .9));
  setTimeout(() => { try { b.disconnect(); } catch (e) {} }, 1400);
}
function musicTick() {
  if (!MUSIC.on || !AC) return;
  const sp = MUSIC.track === 'mp' ? 60 / MP_BPM / 4 : 60 / 70 / 4;
  while (MUSIC.next < AC.currentTime + .25) {
    if (MUSIC.track === 'mp') scoreStep(MUSIC.step % 16, MUSIC.bar, MUSIC.next, sp);
    else zmStep(MUSIC.step % 16, MUSIC.bar, MUSIC.next, sp);
    MUSIC.next += sp; MUSIC.step++;
    if (MUSIC.step % 16 === 0) MUSIC.bar++;
  }
}

/* ---------- instruments ---------- */
function mNote(t, f, dur, vol, type, cutoff, send) {
  const o = AC.createOscillator(); o.type = type; o.frequency.value = f;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cutoff;
  const g = AC.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  o.connect(lp); lp.connect(g); g.connect(MUSIC.bus); if (send) g.connect(MUSIC.dsend);
  o.start(t); o.stop(t + dur + .05);
}
// a power chord through the guitar rig. muted = palm-muted chug
function chord(t, root, dur, muted, vol = 1) {
  const g = AC.createGain(), lp = AC.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = muted ? 650 : 2800;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.32 * vol, t + .004);
  if (muted) g.gain.exponentialRampToValueAtTime(.002, t + .12);
  else { g.gain.setValueAtTime(.3 * vol, t + dur * .7); g.gain.exponentialRampToValueAtTime(.002, t + dur); }
  lp.connect(g); g.connect(MUSIC.gtr);
  const end = t + (muted ? .14 : dur) + .02;
  for (const f of [root, root * 1.4983, root * 2]) for (const det of [-8, 7]) {
    const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
    o.connect(lp); o.start(t); o.stop(end);
  }
}
function bass(t, f, dur, vol = .3) {
  const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f / 2;
  const o2 = AC.createOscillator(); o2.type = 'square'; o2.frequency.value = f / 2; o2.detune.value = 5;
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(260, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(MUSIC.bus);
  o.start(t); o2.start(t); o.stop(t + dur + .03); o2.stop(t + dur + .03);
}
function kick(t, v = 1) { const b = MUSIC.bus; osc(t, 160, 42, .22, .9 * v, b); nz(t, .015, 'highpass', 3500, 1, .25 * v, b, .0005); }
function snare(t, v = 1) { const b = MUSIC.bus; nz(t, .2, 'bandpass', 1900, .7, .55 * v, b, .001); osc(t, 210, 160, .08, .35 * v, b, 'triangle'); nz(t, .32, 'highpass', 4500, .5, .18 * v, MUSIC.dsend, .001); }
function hat(t, v = 1, open) { nz(t, open ? .22 : .035, 'highpass', 8000, .7, .14 * v, MUSIC.bus, .001); }
function crash(t, v = 1) { nz(t, 1.6, 'highpass', 5200, .4, .3 * v, MUSIC.bus, .001); nz(t, 1.2, 'bandpass', 3200, .6, .1 * v, MUSIC.dsend, .002); }
function tom(t, f, v = 1) { osc(t, f, f * .55, .28, .7 * v, MUSIC.bus); nz(t, .05, 'bandpass', 900, 1, .15 * v, MUSIC.bus, .001); }

/* ---------- 'mp': the cinematic score ---------- */
const MP_BPM = 96;
const D1 = 36.71;
// i - VI - III - VII in D minor, then a darker turn (i - iv - VI - V)
const PROG = [[D1, [293.7, 349.2, 440]], [D1 * 1.26, [233.1, 293.7, 349.2]], [D1 * 1.498, [261.6, 349.2, 440]], [D1 * 1.122 * 1.0, [261.6, 329.6, 392]],
              [D1, [293.7, 349.2, 440]], [D1 * 1.335, [293.7, 392, 466.2]], [D1 * 1.26, [233.1, 293.7, 349.2]], [D1 * 1.498, [277.2, 329.6, 440]]];
const SCORE = ['intro', 'intro', 'intro', 'intro', 'build', 'build', 'build', 'rise', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'A', 'A', 'B', 'B', 'break', 'break', 'break', 'rise'];
const scoreSec = bar => SCORE[bar < SCORE.length ? bar : 4 + (bar - 4) % (SCORE.length - 4)];
// lead hook over the B sections: [step, freq, length in steps]
const HOOK = [[[0, 587.3, 6], [6, 698.5, 2], [8, 659.3, 6], [14, 587.3, 2]], [[0, 523.3, 6], [6, 587.3, 2], [8, 440, 8]],
              [[0, 587.3, 6], [6, 698.5, 2], [8, 784, 4], [12, 880, 4]], [[0, 698.5, 6], [6, 659.3, 2], [8, 587.3, 8]]];
function mPad(t, freqs, dur, vol) {
  const g = AC.createGain(), lp = AC.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = .7; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1500, t + dur * .5); lp.frequency.linearRampToValueAtTime(700, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.8, dur * .3)); g.gain.setValueAtTime(vol, t + dur * .8); g.gain.linearRampToValueAtTime(0, t + dur + .5);
  lp.connect(g); g.connect(MUSIC.bus); g.connect(MUSIC.vsend);
  for (const f of freqs) for (const det of [-9, 0, 8]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f / 2; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + .6); }
}
function mSub(t, f, dur, vol) {
  const o = AC.createOscillator(), o2 = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
  o.type = 'sawtooth'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f;
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(420, t); lp.frequency.exponentialRampToValueAtTime(120, t + dur); lp.Q.value = 4;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(lp); o2.connect(g); lp.connect(g); g.connect(MUSIC.bus);
  o.start(t); o2.start(t); o.stop(t + dur + .02); o2.stop(t + dur + .02);
}
function mPluck(t, f, vol) {
  const o = AC.createOscillator(), o2 = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
  o.type = 'square'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 2.003;
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(500, t + .18);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .003); g.gain.exponentialRampToValueAtTime(.0005, t + .28);
  o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(MUSIC.bus); g.connect(MUSIC.dsend);
  o.start(t); o2.start(t); o.stop(t + .3); o2.stop(t + .3);
}
function mBraam(t, root, dur) {
  const g = AC.createGain(), lp = AC.createBiquadFilter(), ws = AC.createWaveShaper(); ws.curve = distCurve(6);
  lp.type = 'lowpass'; lp.Q.value = 2; lp.frequency.setValueAtTime(120, t); lp.frequency.exponentialRampToValueAtTime(1600, t + .35); lp.frequency.exponentialRampToValueAtTime(260, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.34, t + .06); g.gain.exponentialRampToValueAtTime(.002, t + dur);
  lp.connect(ws); ws.connect(g); g.connect(MUSIC.bus); g.connect(MUSIC.vsend);
  for (const [f, det] of [[root, 0], [root, 12], [root * 2, -6], [root * 1.498, 5], [root * 3, 0]]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + .05); }
  nz(t, .9, 'lowpass', 300, 1, .35, MUSIC.bus, .01);
}
function mTaiko(t, v = 1) { const b = MUSIC.bus; osc(t, 95, 48, .45, .95 * v, b); nz(t, .12, 'bandpass', 420, 1.2, .5 * v, b, .002); nz(t, .5, 'lowpass', 180, .8, .35 * v, MUSIC.vsend, .005); }
function mClap(t, v = 1) { for (let k = 0; k < 3; k++) nz(t + k * .011, .09, 'bandpass', 1500, 1.4, .32 * v, MUSIC.bus, .001); nz(t + .03, .35, 'bandpass', 1300, 1, .16 * v, MUSIC.vsend, .002); }
function mTick(t, v = 1) { nz(t, .03, 'highpass', 9000, .7, .09 * v, MUSIC.bus, .0008); }
function scoreStep(s, bar, t, sp) {
  const sec = scoreSec(bar), ch = PROG[bar % PROG.length], barDur = sp * 16;
  const notes = [ch[1][0], ch[1][1], ch[1][2], ch[1][1] * 2];
  // pads under everything except the rise
  if (s === 0 && sec !== 'rise') mPad(t, ch[1], barDur, sec === 'intro' || sec === 'break' ? .045 : .035);
  // braam on the downbeat of each new section
  if (s === 0 && (bar === 8 || (sec !== scoreSec(bar - 1) && (sec === 'A' || sec === 'B' || sec === 'break')))) mBraam(t, ch[0] * 2, sec === 'break' ? 3.4 : 2.2);
  if (sec === 'intro') {
    if (s % 2 === 0 && bar >= 2) mPluck(t, notes[(s / 2) % 4] * 2, .03 + bar * .006);
    if (s === 0 && bar % 2 === 0) mTaiko(t, .5);
    return;
  }
  if (sec === 'rise') {
    if (s === 0) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + barDur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06, t + barDur * .95); g.gain.linearRampToValueAtTime(0, t + barDur); o.connect(g); g.connect(MUSIC.bus); g.connect(MUSIC.vsend); o.start(t); o.stop(t + barDur + .05); nz(t, barDur, 'bandpass', 500, 1.5, .18, MUSIC.bus, barDur * .9, 1, 7000); }
    if (s >= 8 ? true : s % 4 === 0) mTaiko(t, .35 + s * .04);
    if (s % 2 === 0) mSub(t, ch[0], sp * 1.6, .28);
    return;
  }
  if (sec === 'break') {
    if (s % 4 === 0) mPluck(t, notes[(s / 4 + bar) % 4] * 2, .035);
    if (s === 0) mSub(t, ch[0], barDur * .9, .3);
    return;
  }
  // build / A / B: the drive
  const full = sec === 'A' || sec === 'B';
  if (s % 2 === 0 || full) mSub(t, s % 8 === 6 ? ch[0] * 2 : ch[0], sp * (full ? .9 : 1.7), full ? .3 : .24);
  if (full || bar % 2) mPluck(t, notes[[0, 1, 2, 3, 2, 1, 2, 3][s % 8]] * (s % 16 >= 8 ? 2 : 1), full ? .035 : .028);
  mTick(t, s % 4 === 2 ? 1 : .55);
  if (sec === 'build') { if (s === 0 || s === 10) mTaiko(t, .7); return; }
  if ([0, 7, 10].includes(s)) mTaiko(t, s === 0 ? 1.1 : .8);
  if (s === 4 || s === 12) mClap(t, 1);
  if (sec === 'B') {
    if (s === 14 || s === 15) mTaiko(t, .55);
    for (const [st, f, len] of HOOK[bar % 4]) if (st === s) {
      mNote(t, f, sp * len * 1.2, .055, 'sawtooth', 2200, true); mNote(t, f * 1.004, sp * len * 1.2, .04, 'square', 1600, true); mNote(t, f / 2, sp * len, .03, 'triangle', 1200, false);
    }
  }
}

/* ---------- 'zm': the zombies lullaby ---------- */
const BOX = [[440, 523.3, 659.3, 587.3], [523.3, 493.9, 415.3, 493.9], [440, 523.3, 659.3, 783.99], [698.5, 659.3, 622.3, 659.3]];
const DRONE = [55, 49, 55, 41.2];
function zmStep(s, bar, t, sp) {
  const b = MUSIC.bus, ph = bar % 8;
  if (s === 0) {
    const f = DRONE[ph % 4], o = AC.createOscillator(), o2 = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain(), dur = sp * 16;
    o.type = 'sawtooth'; o.frequency.value = f; o2.type = 'sawtooth'; o2.frequency.value = f * 1.5; o2.detune.value = -12;
    lp.type = 'lowpass'; lp.frequency.value = 240;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + 1); g.gain.setValueAtTime(.09, t + dur - .6); g.gain.linearRampToValueAtTime(0, t + dur + .3);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(b); o.start(t); o2.start(t); o.stop(t + dur + .4); o2.stop(t + dur + .4);
  }
  if (s % 4 === 0) {
    const f = BOX[ph % 4][s / 4];
    mNote(t, f * 2, .9, .06, 'triangle', 6000, true); mNote(t + .012, f * 4.01, .5, .018, 'sine', 8000, true);
  }
  if (ph >= 4 && (s === 0 || s === 3)) osc(t, 70, 38, .3, s ? .35 : .5, b);
  if (ph === 7 && s === 8) { nz(t, 1.6, 'bandpass', 420, 4, .25, MUSIC.dsend, .02); osc(t, 196, 185, 2, .05, b, 'sawtooth'); }
}
