// Blast Radius \u00B7 in-game HUD
'use strict';

/* ================= HUD ================= */
const teamCss = e => G.mode === 'ffa' ? (e === G.player ? 'cY' : 'cB') : TEAMS[e.team].css;
function hitmarker(kill) {
  const h = $('#hitmarker'); h.classList.toggle('kill', kill);
  h.style.transition = 'none'; h.style.opacity = 1;
  requestAnimationFrame(() => { h.style.transition = 'opacity .25s'; h.style.opacity = 0; });
}
function popup(text) {
  const d = document.createElement('div'); d.textContent = text; $('#popups').appendChild(d);
  setTimeout(() => d.remove(), 1400);
}
function addKillfeed(a, v, wkey, head) {
  const d = document.createElement('div');
  d.innerHTML = `<span class="${teamCss(a)}">${a.name}</span><span class="w">${WEAPONS[wkey].short || WEAPONS[wkey].name.split(' ')[0]}${head ? ' \u00B7 HS' : ''}</span><span class="${teamCss(v)}">${v.name}</span>`;
  const kf = $('#killfeed'); kf.prepend(d);
  while (kf.children.length > 5) kf.lastChild.remove();
  setTimeout(() => d.remove(), 5000);
}
const dmgEls = [];
function showDamageFrom(a) {
  const p = G.player;
  const dx = a.pos.x - p.pos.x, dz = a.pos.z - p.pos.z;
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  const sx = c * dx - s * dz, sy = s * dx + c * dz;
  const ang = Math.atan2(sx, -sy);
  let el = dmgEls.find(x => x.src === a);
  if (!el) { el = { node: document.createElement('i'), src: a }; $('#dmg').appendChild(el.node); dmgEls.push(el); }
  el.node.style.transition = 'none'; el.node.style.opacity = 1; el.node.style.transform = `rotate(${ang}rad)`;
  el.t = 1.2;
}
function updateDamageEls(dt) {
  for (let i = dmgEls.length - 1; i >= 0; i--) {
    const el = dmgEls[i]; el.t -= dt;
    if (el.t < .6 && el.node.style.opacity === '1') { el.node.style.transition = 'opacity .6s'; el.node.style.opacity = 0; }
    if (el.t <= 0) { el.node.remove(); dmgEls.splice(i, 1); }
  }
}
function banner(title, sub, dur = 3) { $('#bannerTitle').textContent = title; $('#bannerSub').textContent = sub; $('#banner').classList.add('on'); G.bannerT = dur; }

const MM = { scale: 4.2, ox: 40, oz: 28 };
const mmBase = document.createElement('canvas'); mmBase.width = 80 * MM.scale; mmBase.height = 56 * MM.scale;
// top-down picture of the current map, drawn once per map load
function drawMinimapBase() {
  const B = MAP.bounds, S = MM.scale;
  MM.ox = 2 - B[0]; MM.oz = 2 - B[2];
  mmBase.width = Math.round((B[1] - B[0] + 4) * S); mmBase.height = Math.round((B[3] - B[2] + 4) * S);
  const x = mmBase.getContext('2d');
  const X = v => (v + MM.ox) * S, Z = v => (v + MM.oz) * S;
  x.fillStyle = (MAP.mini && MAP.mini.bg) || '#5c5240'; x.fillRect(0, 0, mmBase.width, mmBase.height);
  if (MAP.mini && MAP.mini.draw) MAP.mini.draw(x, X, Z, S);
  for (const b of boxes) {
    if (b.max.y < .5 || b.min.y > 3 || b.invis) continue;
    x.fillStyle = b.max.y > 2 ? 'rgba(233,220,192,.85)' : 'rgba(233,220,192,.45)';
    x.fillRect(X(b.min.x), Z(b.min.z), Math.max(1, (b.max.x - b.min.x) * S), Math.max(1, (b.max.z - b.min.z) * S));
  }
}
const mmCtx = $('#minimap').getContext('2d');
function drawMinimap() {
  const c = mmCtx, W = 352, p = G.player, S = MM.scale, zoom = 1.2;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, W);
  c.save();
  c.translate(W / 2, W / 2); c.scale(zoom, zoom); c.rotate(p.yaw);
  c.translate(-(p.pos.x + MM.ox) * S, -(p.pos.z + MM.oz) * S);
  c.globalAlpha = .9; c.drawImage(mmBase, 0, 0); c.globalAlpha = 1;
  const dot = (e, col, r) => { c.fillStyle = col; c.beginPath(); c.arc((e.x + MM.ox) * S, (e.z + MM.oz) * S, r / zoom, 0, TAU); c.fill(); };
  for (const tg of G.tags) dot({ x: tg.x, z: tg.z }, tg.team === 'A' ? '#4F95DB' : '#E0623F', 5);
  for (const d of G.drops) dot({ x: d.x, z: d.z }, 'rgba(242,181,59,.55)', 3.5);
  for (const k of G.packs) dot({ x: k.x, z: k.z }, '#F2B53B', 5);
  for (const e of G.ents) {
    if (!e.alive || e === p) continue;
    if (!isEnemy(p, e)) dot(e.pos, '#6FB2F2', 7);
    else if (G.now - e.lastShotT < 1.6) dot(e.pos, '#F0563A', 8);
  }
  c.restore();
  c.fillStyle = '#F2B53B'; c.beginPath(); c.moveTo(W / 2, W / 2 - 14); c.lineTo(W / 2 + 10, W / 2 + 10); c.lineTo(W / 2, W / 2 + 5); c.lineTo(W / 2 - 10, W / 2 + 10); c.closePath(); c.fill();
}
function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
let lastHud = '';
function updateHud() {
  const p = G.player, w = weapon(p), M = MODES[G.mode];
  let sb = '';
  if (G.zm) zmHud();
  else if (M.team) {
    const mt = p.team === 'B' ? 'B' : 'A', ot = mt === 'A' ? 'B' : 'A', mine = G.teamScore[mt], theirs = G.teamScore[ot];
    sb = `<div class="side ${mt}"><span class="lab">${TEAMS[mt].name} \u00B7 you</span><span class="num">${mine}</span></div><div class="mid"><b>${fmtTime(G.timeLeft)}</b><span>${M.short} \u00B7 ${G.limit}</span></div><div class="side ${ot}"><span class="lab">${TEAMS[ot].name}</span><span class="num">${theirs}</span></div>`;
  } else {
    const lead = G.ents.filter(e => e !== p).sort((a, b) => b.kills - a.kills)[0];
    sb = `<div class="side A"><span class="lab">You</span><span class="num">${p.kills}</span></div><div class="mid"><b>${fmtTime(G.timeLeft)}</b><span>FFA \u00B7 ${G.limit}</span></div><div class="side B"><span class="lab">${lead ? lead.name : '\u2014'}</span><span class="num">${lead ? lead.kills : 0}</span></div>`;
  }
  if (sb !== lastHud) { $('#scorebar').innerHTML = sb; lastHud = sb; }
  const am = w.am && w.ammoT !== 'std' ? w.am.short : '';
  const wn = w.glMode ? `40mm grenade launcher \u00B7 on ${w.d.name}` : (w.upgraded ? papName(w.d) : w.d.name) + (w.optic !== 'iron' ? ` \u00B7 ${OPTICS[w.optic].name}` : '') + (w.atts.length ? ` \u00B7 ${w.atts.length} att` : '') + (am ? ` \u00B7 ${am}` : '') + (w.d.burst ? ' \u00B7 burst' : '');
  if ($('#wName')._t !== wn) { $('#wName').textContent = wn; $('#wName')._t = wn; }
  const ammoEl = $('#wAmmo');
  if (w.glMode) { ammoEl.innerHTML = `${w.gl.ammo}<small> / ${w.gl.reserve}</small>`; ammoEl.classList.toggle('low', w.gl.ammo === 0); }
  else { ammoEl.innerHTML = `${w.ammo}<small> / ${w.reserve}</small>`; ammoEl.classList.toggle('low', w.ammo <= Math.ceil(w.mag * .25)); }
  const other = p.weapons[1 - p.wi];
  const glTxt = w.gl ? `${hint('gl')} \u00B7 ${w.glMode ? w.d.name : `Grenade launcher \u00D7${w.gl.ammo + w.gl.reserve}`}` : '';
  $('#wAlt').textContent = [glTxt, other ? `${hint('swap')} \u00B7 ${other.d.name}` : ''].filter(Boolean).join('   ');
  const eq = `<span class="${p.lethalN ? '' : 'out'}"><b>${hint('lethal')}</b>${LETHALS[p.lethal].name} \u00D7${p.lethalN}</span>` + (p.tact ? `<span class="${p.tactN ? '' : 'out'}"><b>${hint('tactical')}</b>${TACTICALS[p.tact].name} \u00D7${p.tactN}</span>` : '');
  if ($('#wEquip')._h !== eq) { $('#wEquip').innerHTML = eq; $('#wEquip')._h = eq; }
  const pk = (p.perks || []).map(k => PERKS[k] ? `<span style="--c:${PERK_TIERS[PERKS[k].tier - 1][2]}">${PERKS[k].name}</span>` : '').join('');
  if ($('#perkrow')._h !== pk) { $('#perkrow').innerHTML = pk; $('#perkrow')._h = pk; }
  $('#flashfx').style.opacity = clamp(G.flashFx / 1.1, 0, 1);
  $('#stunfx').style.opacity = clamp(G.stunFx / 1.2, 0, 1);
  let nh = '';
  if (p.alive) for (const pr of G.proj) {
    if ((pr.type !== 'frag' && pr.type !== 'semtex') || pr.attach === p) continue;
    const dx = pr.pos.x - p.pos.x, dz = pr.pos.z - p.pos.z, d = Math.hypot(dx, dz);
    if (d > 8) continue;
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), ang = Math.atan2(c * dx - s * dz, -(s * dx + c * dz));
    nh += `<div class="nd" style="transform:rotate(${ang.toFixed(3)}rad) translateY(-${(80 + d * 12).toFixed(0)}px) rotate(${(-ang).toFixed(3)}rad)">!</div>`;
  }
  const nd = $('#nades'); if (nd._h !== nh) { nd.innerHTML = nh; nd._h = nh; }
  if (padActive()) $('#clicktoplay').hidden = true;
  const rl = $('#wReload');
  const rprog = w.reloading ? (w.shellMode ? w.ammo / w.mag : 1 - w.reloadT / w.reloadDur) : 0;
  rl.style.visibility = w.reloading ? 'visible' : 'hidden';
  if (w.reloading) rl.firstChild.style.width = `${rprog * 100}%`;
  $('#hpFill').style.width = `${clamp(p.health / (p.maxHealth || 100), 0, 1) * 100}%`;
  $('#stance').textContent = p.slideT > 0 ? 'Sliding' : p.stance === 'stand' ? '' : p.stance;
  $('#vignette').style.opacity = p.alive ? clamp((70 - p.health / (p.maxHealth || 100) * 100) / 60, 0, .85) : .6;
  const ch = $('#crosshair');
  const moving = Math.hypot(p.vel.x, p.vel.z) / 5 * (hasPerk(p, 'dexterity') ? .5 : 1);
  const spread = w.glMode ? lerp(.035, .006, G.adsT) : lerp(wSpreadHip(w, p) + moving * w.d.move, w.adsS, G.adsT) * (p.stance === 'prone' ? .5 : p.stance === 'crouch' ? .8 : 1) + (p.onGround || hasPerk(p, 'dexterity') ? 0 : .04);
  const px = spread / Math.tan(camera.fov * Math.PI / 360) * (window.innerHeight / 2);
  ch.style.setProperty('--g', `${clamp(px, 3, 140)}px`);
  const knifeAim = !!G.hold && G.hold.type === 'tknife';
  ch.classList.toggle('knife', knifeAim);
  ch.classList.toggle('hide', !p.alive || (!knifeAim && (G.adsT > .45 || G.sprinting || !!G.hold || G.throwT > 0 || !!G.mantle)));
  if (knifeAim) ch.style.setProperty('--g', '7px');
  $('#scope').classList.toggle('on', w.optic === 'scope' && G.adsT > .85 && p.alive);
  const ck = $('#cook'), H = G.hold;
  if (H && p.alive) { ck.hidden = false; ck.classList.toggle('hot', H.cooking && H.fuse < 1); ck.innerHTML = H.cooking ? `<b>${Math.max(0, H.fuse).toFixed(1)}</b><span>Cooking \u00B7 release to throw \u00B7 ${hint('cancel')} cancel</span>` : `<b>${H.type === 'tknife' ? 'Aim' : 'Ready'}</b><span>Release to throw \u00B7 ${hint('cancel')} cancel</span>`; ck.style.setProperty('--k', H.cooking ? clamp(H.fuse / FUSE[H.type], 0, 1) : 1); }
  else ck.hidden = true;
  let pr = '';
  if (p.alive && w.glMode) pr = w.gl.reloadT > 0 ? 'Reloading grenade launcher' : '';
  else if (p.alive && w.ammo === 0 && !w.reloading && w.reserve === 0) pr = `No ammo \u00B7 press ${hint('sidearm')} to switch weapons`;
  else if (p.alive && w.ammo <= Math.ceil(w.mag * .25) && !w.reloading && w.reserve > 0) pr = `Press ${hint('reload')} to reload`;
  else if (p.alive && w.reloading && !w.shellMode) pr = `${hint('reload')} again to cancel`;
  else if (p.alive && !G.mantle && !G.hold && p.onGround && canMantleHint(p)) pr = `${hint('jump')} to climb`;
  $('#prompt').textContent = pr;
  const ub = $('#usebox');
  if (G.zm && p.alive && G.zm.near) {
    const u = G.zm.near, c = u.cost();
    ub.hidden = false;
    $('#useText').innerHTML = `Hold ${hint('use')} for <b>${esc(u.text())}</b>${c ? ` <span class="${G.zm.points >= c ? 'cost' : 'cost no'}">${c.toLocaleString()}</span>` : ''}`;
    $('#useFill').style.width = `${clamp(G.useT / (u.hold || .25), 0, 1) * 100}%`;
  } else if (p.alive && G.nearDrop) {
    ub.hidden = false;
    const d = G.nearDrop, wd = WEAPONS[d.key];
    $('#useText').innerHTML = `Hold ${hint('use')} to swap your ${weapon(p).d.name} for <b>${wd.name}</b>${d.optic !== 'iron' ? ' \u00B7 ' + OPTICS[d.optic].name : ''}${(d.atts || []).map(k => ' \u00B7 ' + ATTS[k].name).join('')} (${d.ammo}/${d.reserve})`;
    $('#useFill').style.width = `${clamp(G.useT / .35, 0, 1) * 100}%`;
  } else ub.hidden = true;
  $('#board').hidden = !IN.board;
  if (IN.board) $('#board').innerHTML = scoreboardHtml();
  drawMinimap();
}
function scoreboardHtml() {
  if (G.zm) return zmScoreboard();
  const M = MODES[G.mode];
  const row = e => `<tr class="${e === G.player ? 'me' : ''} ${e.human ? 'friend' : ''} ${e.alive ? '' : 'dead'}"><td>${esc(e.name)}</td><td>${e.kills}</td><td>${e.deaths}</td>${G.mode === 'kc' ? `<td>${e.confirms}</td>` : ''}<td>${e.score}</td></tr>`;
  const head = `<tr><th>Player</th><th>K</th><th>D</th>${G.mode === 'kc' ? '<th>Conf</th>' : ''}<th>Score</th></tr>`;
  if (!M.team) return `<table class="sb">${head}${G.ents.slice().sort((a, b) => b.kills - a.kills || b.score - a.score).map(row).join('')}</table>`;
  let h = `<table class="sb">${head}`;
  for (const t of ['A', 'B']) {
    h += `<tr class="head"><td class="${TEAMS[t].css}" colspan="${G.mode === 'kc' ? 5 : 4}">${TEAMS[t].name} \u00B7 ${G.teamScore[t]}</td></tr>`;
    h += G.ents.filter(e => e.team === t).sort((a, b) => b.score - a.score).map(row).join('');
  }
  return h + '</table>';
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const classLine = c => `${WEAPONS[c.primary].name} \u00B7 ${WEAPONS[c.secondary].name} \u00B7 ${c.wildcard === 'overload' ? 'no equipment' : LETHALS[c.lethal].name + ' \u00B7 ' + TACTICALS[c.tact].name} \u00B7 ${c.perks.map(k => PERKS[k].name).join(', ')}${c.wildcard !== 'none' ? ' \u00B7 ' + WILDCARDS[c.wildcard].name : ''}`;
// cheap check for the climb prompt: a ledge right in front at chest height
let mantleHintT = 0, mantleHintV = false;
function canMantleHint(p) { if (G.now - mantleHintT < .2) return mantleHintV; mantleHintT = G.now; mantleHintV = IN.my > .3 && Math.hypot(p.vel.x, p.vel.z) < 2.5 && !!findMantle(p, -Math.sin(p.yaw), -Math.cos(p.yaw), 2.05); return mantleHintV; }
function renderDeathClasses() {
  const html = settings.classes.map((c, i) => `<div class="${i === settings.classIdx ? 'on' : ''}"><small>${i + 1}</small>${esc(c.name)}</div>`).join('');
  $('#deathClasses').innerHTML = html; $('#kcClasses').innerHTML = html;
  $('#deathHint').textContent = padActive() ? 'D-pad left / right to change class' : 'Press 1\u20135 to change class';
}
