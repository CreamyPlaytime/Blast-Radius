// Blast Radius \u00B7 match flow
'use strict';

/* ================= MATCH FLOW ================= */
function clearMatch() {
  if (G.kc) clearKillcam();
  if (G.zm) zmTeardown();
  for (const e of G.ents) if (e.model) scene.remove(e.model.group);
  for (const t of G.tags) scene.remove(t.mesh);
  for (const d of G.drops) scene.remove(d.mesh);
  for (const k of G.packs) scene.remove(k.mesh);
  for (const p of G.proj) scene.remove(p.mesh);
  for (const p of puffs) { scene.remove(p.sp); p.sp.material.dispose(); }
  puffs.length = 0;
  G.ents = []; G.tags = []; G.drops = []; G.packs = []; G.proj = []; G.smokes = [];
  if (typeof NET !== 'undefined') NET.ents.clear();
  G.rec = []; G.events = []; G.finalClip = null; G.lastKill = null; G.myDeath = null; G.kc = null; G.endT = 0;
  G.flashFx = 0; G.stunFx = 0; G.shake = 0; G.throwT = 0; G.hold = null; G.mantle = null;
  if (typeof laserBeam !== 'undefined') { laserBeam.visible = laserDot.visible = arcLine.visible = arcRing.visible = knifeMark.visible = false; }
  $('#killfeed').innerHTML = ''; $('#popups').innerHTML = '';
  dmgEls.forEach(d => d.node.remove()); dmgEls.length = 0;
}
// cfg: the host's match settings when playing with friends (otherwise this window's own settings)
function startMatch(cfg) {
  initAudio(); stopMusic();
  clearMatch();
  const S = settings;
  const C = cfg || { mode: S.mode, map: S.map, time: S.time, allies: S.allies, enemies: S.enemies, ffa: S.ffaBots };
  loadMap(MAPS[C.map] ? C.map : 'acres', 'day');
  G.mode = MODES[C.mode] && !MODES[C.mode].hidden ? C.mode : 'tdm'; G.limit = MODES[G.mode].limit; G.timeLeft = (C.time || 10) * 60; G.now = 0;
  G.teamScore = { A: 0, B: 0 }; G.ended = false; G.endT = 0;
  const names = NAMES.slice().sort(() => Math.random() - .5);
  const myTeam = (NET.on && NET.teams[NET.id]) || (G.mode === 'ffa' ? 'F0' : 'A');
  const player = makeEntity(settings.profile.name || 'You', myTeam, false, settings.classes[settings.classIdx]);
  G.player = player; G.ents.push(player);
  // with friends, only the host adds bots; everyone else sees the host's bots as they arrive
  if (!netClient()) {
    const plan = NET.on ? netBotPlan(C) : null;
    if (G.mode === 'ffa') {
      const n = plan ? plan.ffa : C.ffa;
      for (let i = 0; i < n; i++) G.ents.push(makeEntity(names[i], 'X' + (i + 1), true, botLoadout()));
    } else {
      let n = 0;
      const nA = plan ? plan.A : C.allies, nB = plan ? plan.B : C.enemies;
      for (let i = 0; i < nA; i++) G.ents.push(makeEntity(names[n++ % names.length], 'A', true, botLoadout()));
      for (let i = 0; i < nB; i++) G.ents.push(makeEntity(names[n++ % names.length], 'B', true, botLoadout()));
    }
  }
  G.ents.forEach(spawn);
  if (NET.on) netMatchBegun();
  camera.fov = settings.fov; camera.updateProjectionMatrix();
  showGameScreen();
  G.state = 'playing';
  const M = MODES[G.mode];
  banner(M.name, M.team ? `${M.desc} First to ${G.limit} ${M.unit}.` : `First to ${G.limit} kills wins.`, 3.5);
  lastHud = '';
  annMatchStart();
  if (!padActive()) lockPointer();
}
function checkEnd() {
  if (G.ended || netClient()) return;   // with friends the host decides when the match is over
  let over = G.timeLeft <= 0;
  if (MODES[G.mode].team) { if (G.teamScore.A >= G.limit || G.teamScore.B >= G.limit) over = true; }
  else if (G.ents.some(e => e.kills >= G.limit)) over = true;
  if (over) beginEnding();
}
function endMatch() {
  G.ended = true; G.state = 'ended';
  if (document.pointerLockElement) document.exitPointerLock();
  const p = G.player, M = MODES[G.mode];
  let res, sub;
  if (M.team) {
    const mt = p.team === 'B' ? 'B' : 'A', ot = mt === 'A' ? 'B' : 'A';
    const a = G.teamScore[mt], b = G.teamScore[ot];
    res = a > b ? 'win' : a < b ? 'lose' : 'draw';
    sub = `${TEAMS[mt].name} ${a} \u00B7 ${TEAMS[ot].name} ${b}`;
  } else {
    const sorted = G.ents.slice().sort((x, y) => y.kills - x.kills || y.score - x.score);
    const place = sorted.indexOf(p) + 1;
    res = place === 1 ? 'win' : 'lose';
    sub = place === 1 ? `You topped the lobby with ${p.kills} kills.` : `${sorted[0].name} won with ${sorted[0].kills} kills. You placed ${place} of ${sorted.length}.`;
  }
  const t = $('#endTitle');
  t.textContent = res === 'win' ? 'Victory' : res === 'lose' ? 'Defeat' : 'Draw';
  t.className = 'result ' + res;
  const kd = p.deaths ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2);
  $('#endSub').textContent = `${sub}  \u00B7  Your K/D ${p.kills}/${p.deaths} (${kd})`;
  $('#endBoard').innerHTML = scoreboardHtml();
  const xp = p.score + (res === 'win' ? 600 : res === 'draw' ? 300 : 150);
  const st = settings.profile.mp; st.matches++; if (res === 'win') st.wins++; st.kills += p.kills; st.deaths += p.deaths;
  $('#endXp').innerHTML = xpLine(xp, addXP(xp));
  $('#end').hidden = false; $('#hud').hidden = true; $('#pause').hidden = true;
  netEndButtons();
  startMusic('mp');
  menuFocusOverlay('#end');
}
// with friends only the host can start the next match; everyone else heads back to the lobby
function netEndButtons() {
  $('#againBtn').hidden = netClient();
  $('#menuBtn').textContent = NET.on ? 'Back to lobby' : 'Main menu';
  $('#endSub').textContent += netClient() ? '  \u00B7  Waiting for the host to start the next one' : '';
}
function toMenu() {
  if (document.pointerLockElement) document.exitPointerLock();
  if (netHost() && (NET.inMatch || (NET.meta && NET.meta.st === 'play'))) { NET.inMatch = false; NET.meta = netLobbyMeta(); }
  else if (netClient()) netSitOut();
  clearMatch(); voiceStop();
  G.state = 'menu';
  $('#hud').hidden = true; $('#pause').hidden = true; $('#end').hidden = true;
  camera.rotation.z = 0; camera.fov = 60; camera.updateProjectionMatrix();
  vmRoot.visible = true;
  showMenu();
}
function renderPauseClasses() {
  const el = $('#pauseClasses'), had = el.contains(activeEl()); el.innerHTML = '';
  settings.classes.forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button';
    b.innerHTML = `<i>${i + 1}</i>${esc(c.name)}<small>${WEAPONS[c.primary].name}</small>`;
    b.setAttribute('aria-pressed', String(i === settings.classIdx));
    b.addEventListener('click', () => { settings.classIdx = i; saveSettings(); uiSound('select'); renderPauseClasses(); el.children[i].focus(); });
    el.appendChild(b);
  });
  if (had) { const b = el.children[settings.classIdx]; if (b) b.focus(); }
}

/* ---------- pause options: the same settings as the main menu, changed without leaving the match ---------- */
function pauseOptRows() {
  const S = settings;
  const rng = (label, key, min, max, step, fmt) => ({ label, kind: 'range', key, min, max, step, fmt });
  const tog = (label, get, flip) => ({ label, kind: 'toggle', get, flip });
  return [
    rng('Mouse sensitivity', 'sens', .2, 3, .1, v => v.toFixed(1)),
    rng('Stick sensitivity', 'padSens', .3, 2.5, .1, v => v.toFixed(1)),
    rng('Field of view', 'fov', 65, 105, 1, v => `${Math.round(v)}\u00B0`),
    tog('Aim assist', () => ({ off: 'Off', standard: 'Standard', strong: 'Strong' })[S.aimAssist], d => { S.aimAssist = cycle(['off', 'standard', 'strong'], S.aimAssist, d); }),
    rng('Master volume', 'vol', 0, 1, .05, v => Math.round(v * 100)),
    rng('Music volume', 'music', 0, 1, .05, v => Math.round(v * 100)),
    rng('Voice volume', 'voiceVol', 0, 1, .05, v => Math.round(v * 100)),
    tog('Announcer', () => S.announcer !== false ? 'On' : 'Off', () => { S.announcer = S.announcer === false; }),
    tog('Squad callouts', () => S.callouts !== false ? 'On' : 'Off', () => { S.callouts = S.callouts === false; }),
    tog('Kill cams', () => S.killcam !== false ? 'On' : 'Off', () => { S.killcam = S.killcam === false; }),
    tog('Controller', () => padLabel(), d => cyclePadPref(d)),
    tog('Fullscreen', () => isFullscreen() ? 'On' : 'Off', () => toggleFullscreen()),
    tog('Shadows', () => S.shadows !== false ? 'On' : 'Off', () => { S.shadows = S.shadows === false; applyShadows(); }),
    tog('Anti-aliasing', () => aaLabel(), () => { S.aa = S.aa === false; }),
    tog('Graphics', () => ({ native: 'Native', low: 'Low', ultra: 'Ultra low' })[S.res] || 'Native', d => { S.res = cycle(['native', 'low', 'ultra'], S.res, d); applyResolution(); gfxReloadMap(); }),
    tog('Performance stats', () => S.perf ? 'On' : 'Off', () => { S.perf = !S.perf; perfOn(S.perf); }),
  ];
}
function renderPauseOpts() {
  const box = $('#pauseOptList'), had = [...box.querySelectorAll('input, button')].indexOf(activeEl()); box.innerHTML = '';
  for (const r of pauseOptRows()) {
    const row = document.createElement('div'); row.className = 'poptrow';
    if (r.kind === 'range') {
      const id = 'po_' + r.key;
      row.innerHTML = `<label for="${id}">${r.label}</label><input type="range" id="${id}" min="${r.min}" max="${r.max}" step="${r.step}" value="${settings[r.key]}"><output>${r.fmt(settings[r.key])}</output>`;
      const inp = row.querySelector('input'), out = row.querySelector('output');
      inp.addEventListener('input', () => {
        settings[r.key] = +(+inp.value).toFixed(3); out.textContent = r.fmt(settings[r.key]); saveSettings();
        if (r.key === 'vol' && master) master.gain.value = settings.vol;
        if (r.key === 'music') musicVolume();
        if (r.key === 'fov') { camera.fov = settings.fov; camera.updateProjectionMatrix(); }
      });
      inp.addEventListener('change', () => uiSound('tick'));
    } else {
      row.innerHTML = `<span class="pl">${r.label}</span><button type="button" class="ptog">${r.get()}</button>`;
      const b = row.querySelector('button');
      // A or click steps forward; left and right on a controller step either way
      b._flip = d => { r.flip(d); saveSettings(); b.textContent = r.get(); uiSound('move'); };
      b.addEventListener('click', () => b._flip(1));
    }
    box.appendChild(row);
  }
  if (had >= 0) { const f = box.querySelectorAll('input, button')[had]; if (f) f.focus(); }
}
function showPauseOpts(on) {
  $('#pauseMain').hidden = on; $('#pauseOpts').hidden = !on;
  $('#pauseTitle').textContent = on ? 'Options' : 'Paused';
  if (on) { renderPauseOpts(); const f = $('#pauseOptList input, #pauseOptList button'); if (f) f.focus(); }
  else { const b = $('#pauseOptBtn'); if (b) b.focus(); }
}
function pauseGame() {
  if (G.state !== 'playing') return;
  G.state = 'paused';
  $('#pauseSub').textContent = (G.zm ? `Zombies \u00B7 Atomic Acres \u00B7 Round ${G.zm.round}` : `${MODES[G.mode].name} \u00B7 ${MAP.name} \u00B7 ${fmtTime(G.timeLeft)} left`) + (NET.on ? ' \u00B7 the match keeps going' : '');
  $('#endBtn').hidden = NET.on || !!G.zm;
  $('#quitBtn').textContent = NET.on ? (netHost() ? 'End match for everyone' : 'Leave match') : 'Quit to menu';
  $('#pauseBoard').innerHTML = scoreboardHtml();
  renderPauseClasses();
  $('#pauseClasses').hidden = !!G.zm; $('#pauseClassHead').hidden = !!G.zm; $('#pauseEdit').hidden = !!G.zm;
  showPauseOpts(false);
  $('#pause').hidden = false;
  keys.clear(); mouse.left = mouse.right = false;
  menuFocusOverlay('#pause');
}
function resumeGame() {
  $('#pause').hidden = true; $('#editor').hidden = true; G.state = 'playing';
  document.body.classList.remove('padnav');
  if (activeEl() && activeEl().blur) activeEl().blur();
  initAudio();
  if (!padActive()) lockPointer();
}
function lockPointer() {
  try {
    const r = canvas.requestPointerLock && canvas.requestPointerLock();
    if (r && r.catch) r.catch(() => { $('#clicktoplay').hidden = false; });
  } catch (e) { $('#clicktoplay').hidden = false; }
}
document.addEventListener('pointerlockchange', () => {
  const was = locked;
  locked = document.pointerLockElement === canvas;
  if (locked) $('#clicktoplay').hidden = true;
  if (was && !locked && G.state === 'playing') pauseGame();
});
document.addEventListener('pointerlockerror', () => { if (G.state === 'playing' && !padActive()) $('#clicktoplay').hidden = false; });

window.addEventListener('keydown', e => {
  setInputMode('kbm');
  if (G.state === 'killcam' || G.state === 'finalcam') {
    if (['Space', 'Enter', 'Escape', 'NumpadEnter'].includes(e.code)) { G.kcSkip = true; e.preventDefault(); }
    const n = /^Digit([1-5])$/.exec(e.code);
    if (n && G.state === 'killcam') { settings.classIdx = +n[1] - 1; saveSettings(); renderDeathClasses(); }
    if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
    return;
  }
  if (G.state !== 'playing') {
    if (e.code === 'Escape') { if (!$('#editor').hidden) closeEditor(); else if (G.state === 'paused' && !$('#pauseOpts').hidden) showPauseOpts(false); else if (G.state === 'paused') resumeGame(); }
    return;
  }
  if (['Tab', 'Space', 'ControlLeft'].includes(e.code)) e.preventDefault();
  if (!e.repeat) kbEdge.add(e.code);
  keys.add(e.code);
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); mouse.left = mouse.right = false; });
canvas.addEventListener('mousedown', e => {
  setInputMode('kbm');
  if (G.state !== 'playing') return;
  if (!locked) lockPointer();
  if (e.button === 0) mouse.left = true;
  if (e.button === 2) mouse.right = true;
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.left = false; if (e.button === 2) mouse.right = false; });
window.addEventListener('mousemove', e => {
  const mv = Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
  if (mv > 3) setInputMode('kbm');
  if (G.state === 'playing') { mouse.dx += e.movementX || 0; mouse.dy += e.movementY || 0; }
  else if (mv > 2) document.body.classList.remove('padnav');
});
// no browser right-click menu anywhere in the game (right click is aim), except in text fields
window.addEventListener('contextmenu', e => { const t = e.target; if (!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'))) e.preventDefault(); }, { capture: true });
document.addEventListener('dragstart', e => e.preventDefault());
window.addEventListener('wheel', () => { if (G.state === 'playing') wheelFlag = true; }, { passive: true });

const wakeAudio = () => { if ((G.state === 'menu' && MENU.screen !== 'title') || G.state === 'ended') { initAudio(); startMusic(); } };
window.addEventListener('pointerdown', wakeAudio);
window.addEventListener('keydown', wakeAudio);
$('#resumeBtn').addEventListener('click', resumeGame);
$('#quitBtn').addEventListener('click', toMenu);
// end the match now, with the result screen and final kill cam, instead of quitting straight to the menu
$('#endBtn').addEventListener('click', () => {
  if (G.state !== 'paused' || G.ended || NET.on || G.zm) return;
  $('#pause').hidden = true; G.state = 'playing';
  document.body.classList.remove('padnav');
  if (activeEl() && activeEl().blur) activeEl().blur();
  beginEnding();
});
$('#pauseOptBtn').addEventListener('click', () => showPauseOpts(true));
$('#pauseOptBack').addEventListener('click', () => showPauseOpts(false));
// the highlighted button follows the mouse as well as the keyboard, so there's always one lit
for (const id of ['#pause', '#end']) {
  const root = $(id);
  root.addEventListener('mouseover', e => { const b = e.target.closest('.btn, .pclasses button, .ptog'); if (b && activeEl() !== b) b.focus({ preventScroll: true }); });
  root.addEventListener('focusin', e => { root.querySelectorAll('.btn.sel').forEach(x => x.classList.remove('sel')); if (e.target.classList.contains('btn')) e.target.classList.add('sel'); });
}
$('#againBtn').addEventListener('click', () => { $('#end').hidden = true; if (G.zm || G.mode === 'zombies') { clearMatch(); launchZM(); } else { clearMatch(); launchMP(); } });
$('#menuBtn').addEventListener('click', toMenu);
$('#pauseEdit').addEventListener('click', () => openEditor(settings.classIdx));
