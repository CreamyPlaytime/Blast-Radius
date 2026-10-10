// Blast Radius \u00B7 keyboard, mouse and controller input
'use strict';

/* ================= INPUT ================= */
const keys = new Set(), kbEdge = new Set();
const mouse = { left: false, right: false, dx: 0, dy: 0 };
let locked = false, wheelFlag = false;
const IN = {};
const pad = { prev: [], lastUsed: -1e9, sprintLatch: false, holdB: null, holdX: null, repT: 0, repDir: null, boost: 0 };
const kbHold = { c: null };
/* ---------- controllers on this computer ----------
   Every game window on this computer that is in the same local party says hello on a shared channel.
   Windows are seated in the order they were opened, and each one reads its own controller: with as
   many controllers as windows, window 1 takes controller 1 and so on; with fewer, the later windows
   get them first (the first window is usually the one on keyboard and mouse). The window that has
   focus also relays every controller to the others, because a browser may stop reporting controllers
   to a window that isn't focused.                                                                      */
const PADS = { ch: null, others: new Map(), fwd: new Map(), lastSend: 0, party: null, id: Math.random().toString(36).slice(2, 10) };
PADS.recv = m => {
    if (!m || m.id === PADS.id) return;
    if (m.k === 'hi') { if (m.party && m.party === PADS.party) PADS.others.set(m.id, { born: m.born, t: nowMs() }); else PADS.others.delete(m.id); }
    else if (m.k === 'pads' && m.party === PADS.party && PADS.party) {
      for (const [i, b, a] of m.pads) PADS.fwd.set(i, { t: nowMs(), gp: { connected: true, index: i, id: 'relayed', buttons: b.map(v => ({ pressed: v > .5, value: v })), axes: a } });
    }
};
PADS.post = m => {
  if (PADS.ch) try { PADS.ch.postMessage(m); } catch (e) {}
  if (typeof linkPost === 'function') linkPost('pads', m);
};
try { PADS.ch = new BroadcastChannel('blastradius.pads'); PADS.ch.onmessage = ev => PADS.recv(ev.data); } catch (e) { PADS.ch = null; }
function padsHello() {
  PADS.post({ k: 'hi', id: PADS.id, born: SEAT.born, party: PADS.party });
  for (const [k, o] of PADS.others) if (nowMs() - o.t > 2600) PADS.others.delete(k);
}
setInterval(padsHello, 800);
function rawPads() {
  let gps = []; try { gps = (navigator.getGamepads && navigator.getGamepads()) || []; } catch (e) {}
  const out = [];
  for (const g of gps) if (g && g.connected && g.buttons && g.buttons.length >= 12) out.push(g);
  return out;
}
// which controller index this window reads, or null for none
function padIndex() {
  const pref = settings.padPref;
  if (pref === 'none') return null;
  if (typeof pref === 'number') return pref;
  const idx = new Set(rawPads().map(g => g.index));
  for (const [i, f] of PADS.fwd) if (nowMs() - f.t < 600) idx.add(i);
  const list = [...idx].sort((a, b) => a - b), n = list.length;
  if (!n) return null;
  const seats = [SEAT.born, ...[...PADS.others.values()].map(o => o.born)].sort((a, b) => a - b), s = PADS.party ? seats.length : 1;
  const r = PADS.party ? seats.indexOf(SEAT.born) : 0;
  const k = n >= s ? r : r - (s - n);
  return k >= 0 && k < n ? list[k] : null;
}
function padLabel() {
  const pref = settings.padPref, i = padIndex();
  if (pref === 'none') return 'Keyboard and mouse only';
  if (typeof pref === 'number') return `Controller ${pref + 1}`;
  return i === null ? 'Auto \u00B7 no controller' : `Auto \u00B7 controller ${i + 1}`;
}
function cyclePadPref(d) {
  const opts = ['auto', 0, 1, 2, 3, 'none'];
  settings.padPref = opts[(opts.indexOf(settings.padPref) + d + opts.length) % opts.length]; saveSettings();
}
function readPad() {
  if (typeof navigator === 'undefined') return null;
  const i = padIndex(); if (i === null) return null;
  let g = null; try { const gps = navigator.getGamepads && navigator.getGamepads(); g = gps && gps[i]; } catch (e) {}
  const f = PADS.fwd.get(i), fresh = f && nowMs() - f.t < 300;
  if (fresh && (!document.hasFocus() || !g || !g.connected)) return f.gp;
  if (g && g.connected && g.buttons && g.buttons.length >= 12) return g;
  return fresh ? f.gp : null;
}
// the focused window relays every controller to the other windows in its local party
function padsTick() {
  if (!PADS.party || !PADS.others.size || !document.hasFocus()) return;
  const t = nowMs(); if (t - PADS.lastSend < 14) return; PADS.lastSend = t;
  const pads = rawPads().map(g => [g.index, g.buttons.map(b => b.pressed ? Math.max(.99, b.value) : +b.value.toFixed(2)), g.axes.map(v => +v.toFixed(3))]);
  if (pads.length) PADS.post({ k: 'pads', id: PADS.id, party: PADS.party, pads });
}
let inputMode = 'kbm';
const padActive = () => inputMode === 'pad';
function setInputMode(m) { if (inputMode === m) return; inputMode = m; lastHud = ''; if (G.player && !G.player.alive && G.state === 'playing') renderDeathClasses(); if (m === 'pad') $('#clicktoplay').hidden = true; if (typeof menuActive === 'function' && menuActive() && MENU.screen !== 'title') updateSel(); }
const HINT = { reload: ['R', 'X'], use: ['F', 'X'], swap: ['1 / 2', 'Y'], lethal: ['G', 'RB'], tactical: ['Q', 'LB'], melee: ['V', 'R3'], sidearm: ['2', 'Y'], cancel: ['R', 'X'], jump: ['Space', 'A'], gl: ['B', 'D-pad \u2190'] };
const hint = k => HINT[k][inputMode === 'pad' ? 1 : 0];
function rumble(strong, weak, ms) {
  const gp = readPad(); if (!gp || !padActive()) return;
  try { if (gp.vibrationActuator && gp.vibrationActuator.playEffect) gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch (e) {}
}
function buildInput(dt) {
  const I = IN;
  I.mx = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
  I.my = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  I.lookX = mouse.dx * .0022 * settings.sens; I.lookY = mouse.dy * .0022 * settings.sens;
  I.padAim = false;
  I.fire = mouse.left; I.ads = mouse.right;
  I.jumpP = kbEdge.has('Space'); I.jumpHeld = keys.has('Space');
  I.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
  I.crouchTap = false; I.proneP = kbEdge.has('KeyZ');
  const cDown = keys.has('KeyC') || keys.has('ControlLeft');
  if (kbEdge.has('KeyC') || kbEdge.has('ControlLeft')) { if (G.sprinting) I.crouchTap = true; else kbHold.c = 0; }
  if (kbHold.c !== null) { kbHold.c += dt; if (!cDown) { if (kbHold.c < .3) I.crouchTap = true; kbHold.c = null; } else if (kbHold.c >= .3) { I.proneP = true; kbHold.c = null; } }
  I.crouchHeld = cDown;
  I.reloadP = kbEdge.has('KeyR');
  I.useHeld = keys.has('KeyF');
  I.swapP = wheelFlag;
  I.tactP = kbEdge.has('KeyQ'); I.lethalP = kbEdge.has('KeyG'); I.tactHeld = keys.has('KeyQ'); I.lethalHeld = keys.has('KeyG');
  I.slot = kbEdge.has('Digit1') ? 0 : kbEdge.has('Digit2') ? 1 : -1;
  I.classPick = -1; for (let n = 1; n <= 5; n++) if (kbEdge.has('Digit' + n)) I.classPick = n - 1;
  I.classStep = 0;
  I.meleeP = kbEdge.has('KeyV');
  I.glP = kbEdge.has('KeyB');
  I.board = keys.has('Tab');
  I.pauseP = kbEdge.has('Escape') || kbEdge.has('KeyP');
  const gp = readPad();
  if (gp) {
    const B = i => !!gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .5);
    const V = i => gp.buttons[i] ? gp.buttons[i].value : 0;
    const E = i => B(i) && !pad.prev[i];
    const dz = (x, y, d = .16) => { const m = Math.hypot(x, y); if (m < d) return [0, 0]; const k = Math.min(1, (m - d) / (1 - d)) / m; return [x * k, y * k]; };
    const [lx, ly] = dz(gp.axes[0] || 0, gp.axes[1] || 0), [rx, ry] = dz(gp.axes[2] || 0, gp.axes[3] || 0);
    if (lx || ly || rx || ry || gp.buttons.some(b => b.pressed)) { pad.lastUsed = nowMs(); setInputMode('pad'); }
    if (lx || ly) { I.mx = lx; I.my = -ly; }
    if (rx || ry) {
      const curve = v => Math.sign(v) * Math.pow(Math.abs(v), 1.8);
      pad.boost = Math.abs(rx) > .95 ? Math.min(1, pad.boost + dt * 3) : 0;
      I.lookX += curve(rx) * 3.3 * settings.padSens * dt * (1 + pad.boost * .7);
      I.lookY += curve(ry) * 2.3 * settings.padSens * dt;
    }
    if (inputMode === 'pad') I.padAim = true;
    I.fire = I.fire || V(7) > .3; I.ads = I.ads || V(6) > .3;
    if (E(0)) I.jumpP = true; if (B(0)) I.jumpHeld = true;
    if (E(1)) { if (G.sprinting) I.crouchTap = true; else pad.holdB = 0; }
    if (pad.holdB !== null) { pad.holdB += dt; if (!B(1)) { if (pad.holdB < .3) I.crouchTap = true; pad.holdB = null; } else if (pad.holdB >= .3) { I.proneP = true; pad.holdB = null; } }
    I.crouchHeld = I.crouchHeld || B(1);
    if (E(2)) { if (G.nearDrop || (G.zm && G.zm.near)) pad.holdX = 0; else I.reloadP = true; }
    if (pad.holdX !== null) { pad.holdX += dt; if (!B(2)) { if (pad.holdX < .3) I.reloadP = true; pad.holdX = null; } else I.useHeld = true; }
    if (E(3)) I.swapP = true;
    if (E(11)) I.meleeP = true;
    if (E(4)) I.tactP = true; if (B(4)) I.tactHeld = true;
    if (E(5)) I.lethalP = true; if (B(5)) I.lethalHeld = true;
    if (E(10)) pad.sprintLatch = !pad.sprintLatch;
    if (pad.sprintLatch && I.my < .3) pad.sprintLatch = false;
    I.sprint = I.sprint || pad.sprintLatch;
    I.board = I.board || B(8);
    if (E(9)) I.pauseP = true;
    if (E(14)) { I.classStep = -1; I.glP = true; } if (E(15)) I.classStep = 1;
    pad.prev = gp.buttons.map(b => b.pressed || b.value > .5);
  }
  kbEdge.clear(); mouse.dx = 0; mouse.dy = 0; wheelFlag = false;
}
// nothing pressed: used while the pause menu is up in a match with friends (the match keeps running)
function clearInput() {
  for (const k in IN) { const v = IN[k]; IN[k] = typeof v === 'boolean' ? false : (k === 'slot' || k === 'classPick') ? -1 : 0; }
}
function activeRoot() {
  for (const id of ['#editor', '#pause', '#end']) { const el = $(id); if (el && !el.hidden) return el; }
  return null;
}
function focusables(root) { return [...root.querySelectorAll('button, input, summary')].filter(el => !el.disabled && el.offsetParent !== null); }
function spatial(dir) {
  const root = activeRoot(); if (!root) return;
  const list = focusables(root); const cur = activeEl();
  if (!list.includes(cur)) { const first = root.querySelector('.btn.primary') || list[0]; if (first) first.focus(); return; }
  if (cur.type === 'range' && (dir === 'left' || dir === 'right')) {
    const step = +cur.step || 1; cur.value = clamp(+cur.value + (dir === 'right' ? step : -step), +cur.min, +cur.max);
    cur.dispatchEvent(new Event('input', { bubbles: true })); return;
  }
  const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let best = null, bs = 1e9;
  for (const el of list) {
    if (el === cur) continue;
    const q = el.getBoundingClientRect(); const x = q.left + q.width / 2 - cx, y = q.top + q.height / 2 - cy;
    const along = dir === 'up' ? -y : dir === 'down' ? y : dir === 'left' ? -x : x;
    const perp = (dir === 'up' || dir === 'down') ? Math.abs(x) : Math.abs(y);
    if (along <= 4) continue;
    const s = along + perp * 2.2; if (s < bs) { bs = s; best = el; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); }
}
function padMenu(dt) {
  const gp = readPad(); if (!gp) return;
  if (menuActive()) { menuPad(gp, dt); pad.prev = gp.buttons.map(b => b.pressed || b.value > .5); return; }
  const B = i => !!gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .5);
  const E = i => B(i) && !pad.prev[i];
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  let dir = null;
  if (B(12) || ay < -.6) dir = 'up'; else if (B(13) || ay > .6) dir = 'down'; else if (B(14) || ax < -.6) dir = 'left'; else if (B(15) || ax > .6) dir = 'right';
  const any = dir || gp.buttons.some(b => b.pressed);
  if (any) { pad.lastUsed = nowMs(); setInputMode('pad'); document.body.classList.add('padnav'); }
  if (dir) { pad.repT -= dt; if (pad.repT <= 0) { spatial(dir); pad.repT = pad.repDir === dir ? .12 : .32; pad.repDir = dir; } }
  else { pad.repT = 0; pad.repDir = null; }
  if (E(0)) { const el = activeEl(); if (el && el !== document.body && el.type !== 'range') el.click(); else if (!el || el === document.body) spatial('down'); }
  if (E(1)) { if (!$('#editor').hidden) closeEditor(); else if (G.state === 'paused' && !$('#pauseOpts').hidden) showPauseOpts(false); else if (G.state === 'paused') resumeGame(); }
  if (E(9) && G.state === 'paused') resumeGame();
  pad.prev = gp.buttons.map(b => b.pressed || b.value > .5);
}

