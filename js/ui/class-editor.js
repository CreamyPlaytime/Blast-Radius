// Blast Radius · create-a-class
'use strict';

/* ================= CLASS EDITOR =================
   Two columns. Left: the loadout, one row per slot. Right: the picker for whichever slot is open,
   with the gun preview on top and a short readout of the option under the cursor. */
let edIdx = 0, edFocus = 'primary', prev = null;
function openEditor(i) {
  edIdx = i; edFocus = 'primary'; $('#editor').hidden = false; renderEditor();
  if (padActive()) { document.body.classList.add('padnav'); const b = $('#edLoad [data-f="primary"]'); if (b) b.focus(); }
}
function closeEditor() {
  $('#editor').hidden = true; saveSettings();
  document.body.classList.remove('padnav');
  if (G.state === 'paused') { renderPauseClasses(); menuFocusOverlay('#pause'); }
  else if (G.state === 'menu') renderMenu();
}
$('#edClose').addEventListener('click', closeEditor);
$('#edName').addEventListener('input', e => { settings.classes[edIdx].name = e.target.value.slice(0, 16) || DEFAULT_CLASSES[edIdx].name; saveSettings(); renderSlots(); });
$('#edName').addEventListener('keydown', e => e.stopPropagation());

function renderSlots() {
  const s = $('#edSlots'); const focusedIdx = [...s.children].indexOf(activeEl()); s.innerHTML = '';
  settings.classes.forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button';
    b.innerHTML = `<i>${i + 1}</i><b>${esc(c.name)}</b>`;
    b.title = WEAPONS[c.primary].name;
    b.setAttribute('aria-pressed', String(i === edIdx));
    b.addEventListener('click', () => { edIdx = i; renderEditor(); if (document.body.classList.contains('padnav') && s.children[i]) s.children[i].focus(); });
    s.appendChild(b);
  });
  if (focusedIdx >= 0 && s.children[focusedIdx]) s.children[focusedIdx].focus();
}
const STAT_NAMES = ['Damage', 'Fire rate', 'Range', 'Mobility'];
const statBars = d => `<div class="wstats">${STAT_NAMES.map((l, i) => `<span class="stat"><em>${l}</em><i style="--v:${Math.round(d.stats[i] * 100)}%"></i></span>`).join('')}</div>`;
const attCount = atts => attList(atts).length;
// keep the class legal after any change (attachment caps, optics, perk counts, overkill)
function settleClass(c) { Object.assign(c, fixClass(c, edIdx)); }

/* ---------- what each loadout slot holds and offers ---------- */
function slotSpec(c, f) {
  const sec = f[0] === 's' && f !== 'secondary' ? true : f === 'secondary';
  const wkey = sec ? c.secondary : c.primary, side = sec ? 'secondary' : 'primary';
  const ok2 = c.wildcard === 'overkill';
  const optKey = sec ? 'secOptic' : 'optic', attKey = sec ? 'secAtts' : 'atts', ammoKey = sec ? 'secAmmo' : 'ammo';
  const gunTitle = sec ? (ok2 && WEAPONS[c.secondary].slot === 'primary' ? 'Second primary' : 'Sidearm') : 'Primary';
  if (f === 'primary' || f === 'secondary') {
    const groups = [];
    if (f === 'primary' || ok2) for (const [ty, tname] of Object.entries(WTYPES)) {
      const keys = PRIMARIES.filter(k => WEAPONS[k].type === ty && (f === 'primary' || k !== c.primary)); if (keys.length) groups.push([tname, keys]);
    }
    if (f === 'secondary') groups.push([ok2 ? 'Sidearms' : '', SECONDARIES]);
    return {
      title: f === 'primary' ? 'Primary weapon' : (ok2 ? 'Second primary · Overkill' : 'Sidearm'), gun: wkey, groups: groups.map(([l, keys]) => [l, keys.map(k => ({ v: k, name: WEAPONS[k].name, sub: WEAPONS[k].cls }))]),
      cur: c[f], pick: v => { if (f === 'primary') { c.primary = v; c.optic = defaultOptic(v) === 'scope' ? 'scope' : opticsFor(v).includes(c.optic) ? c.optic : defaultOptic(v); } else c.secondary = v; },
      info: v => ({ name: WEAPONS[v].name, sub: WEAPONS[v].cls, stats: WEAPONS[v] })
    };
  }
  if (f === 'popt' || f === 'sopt') return {
    title: `${gunTitle} optic`, gun: wkey, groups: [['', opticsFor(wkey).map(k => ({ v: k, name: OPTICS[k].name }))]],
    cur: c[optKey], pick: v => { c[optKey] = v; }, info: v => ({ name: OPTICS[v].name, desc: OPTICS[v].desc })
  };
  if (f === 'pammo' || f === 'sammo') return {
    title: `${gunTitle} ammo`, gun: wkey, groups: [['', ammoFor(wkey).map(k => ({ v: k, name: AMMO[k].name }))]],
    cur: c[ammoKey] || 'std', pick: v => { c[ammoKey] = v; }, info: v => ({ name: AMMO[v].name, desc: AMMO[v].desc })
  };
  if (f === 'patt' || f === 'satt') {
    const ok = attsFor(wkey), n = attCount(c[attKey]), max = maxAtts(c, side);
    const groups = [];
    for (const [slot, sname] of ATT_SLOTS) {
      const list = ok.filter(a => ATTS[a].slot === slot); if (!list.length) continue;
      const cur = c[attKey][slot];
      groups.push([sname, [{ v: 'none', name: 'None' }, ...list.map(a => ({ v: a, name: ATTS[a].name, off: cur === 'none' && n >= max }))], slot]);
    }
    return {
      title: `${gunTitle} attachments`, count: `${n} / ${max}`, gun: wkey, groups, multi: true,
      curOf: slot => c[attKey][slot], pick: (v, slot) => { c[attKey][slot] = v; },
      info: v => v === 'none' ? { name: 'No attachment', desc: 'Leave this slot empty.' } : { name: ATTS[v].name, sub: ATT_SLOTS.find(s => s[0] === ATTS[v].slot)[1], desc: ATTS[v].desc },
      idle: n ? null : { name: 'Attachments', desc: `Pick up to ${max}, one per slot.${max < 5 && side === 'primary' ? ' The Gunfighter wildcard raises the limit to five.' : ''}` }
    };
  }
  const more = c.wildcard === 'danger' ? 1 : 0, noEq = c.wildcard === 'overload';
  if (f === 'lethal' || f === 'tact') {
    const T = f === 'lethal' ? LETHALS : TACTICALS, key = f === 'lethal' ? 'lethal' : 'tact';
    return {
      title: f === 'lethal' ? 'Lethal' : 'Tactical', groups: [['', Object.keys(T).map(k => ({ v: k, name: T[k].name, sub: '×' + (T[k].count + more), off: noEq }))]],
      cur: c[key], pick: v => { c[key] = v; }, info: v => ({ name: T[v].name, desc: T[v].desc }),
      idle: noEq ? { name: 'Perk Overload', desc: 'No lethal or tactical this class.' } : null
    };
  }
  if (f.startsWith('perk')) {
    const i = +f.slice(4), tierPick = i < 3;
    const keys = tierPick ? Object.keys(PERKS).filter(k => PERKS[k].tier === PERK_TIERS[i][0]) : Object.keys(PERKS);
    return {
      title: tierPick ? PERK_TIERS[i][1] : `Perk ${i + 1} · Wildcard`,
      groups: [['', keys.map(k => {
        const j = c.perks.indexOf(k);
        return { v: k, name: PERKS[k].name, tint: PERK_TIERS[PERKS[k].tier - 1][2], off: tierPick ? (j >= 0 && j !== i && j < 3) : (j >= 0 && j !== i) };
      })]],
      cur: c.perks[i], pick: v => { if (tierPick) { const j = c.perks.indexOf(v); if (j > 2) c.perks[j] = c.perks[i]; } c.perks[i] = v; },
      info: v => ({ name: PERKS[v].name, sub: PERK_TIERS[PERKS[v].tier - 1][1], desc: PERKS[v].desc })
    };
  }
  if (f === 'wild') return {
    title: 'Wildcard', groups: [['', Object.keys(WILDCARDS).map(k => ({ v: k, name: WILDCARDS[k].name }))]],
    cur: c.wildcard, pick: v => { const was = c.wildcard; c.wildcard = v; if (was === 'overkill' && v !== 'overkill' && !SECONDARIES.includes(c.secondary)) c.secondary = DEFAULT_CLASSES[edIdx].secondary; },
    info: v => ({ name: WILDCARDS[v].name, desc: WILDCARDS[v].desc })
  };
  return slotSpec(c, 'primary');
}

/* ---------- left column: the loadout ---------- */
function renderLoadout(c) {
  const box = $('#edLoad'), focused = activeEl() && activeEl().dataset ? activeEl().dataset.f : null;
  box.innerHTML = '';
  const group = title => { const g = document.createElement('div'); g.className = 'lgroup'; g.innerHTML = `<h3>${title}</h3>`; box.appendChild(g); return g; };
  const row = (g, f, label, value, extra = '', cls = '') => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lrow' + (cls ? ' ' + cls : ''); b.dataset.f = f;
    b.innerHTML = `<span class="lk">${label}</span><span class="lv">${value}</span>${extra}`;
    b.setAttribute('aria-current', String(f === edFocus));
    b.addEventListener('click', () => {
      edFocus = f; renderEditor();
      if (document.body.classList.contains('padnav')) { const t = $('#edBody .tile[aria-pressed="true"]') || $('#edBody .tile:not(:disabled)'); if (t) t.focus(); }
    });
    g.appendChild(b); return b;
  };
  const gunGroup = (sec) => {
    const ok2 = c.wildcard === 'overkill', key = sec ? c.secondary : c.primary, d = WEAPONS[key];
    const g = group(sec ? (ok2 ? 'Second primary' : 'Sidearm') : 'Primary');
    row(g, sec ? 'secondary' : 'primary', d.cls, esc(d.name), '', 'big');
    const p = sec ? 's' : 'p';
    const sub = document.createElement('div'); sub.className = 'lsub'; g.appendChild(sub);
    if (opticsFor(key).length > 1) row(sub, p + 'opt', 'Optic', OPTICS[c[sec ? 'secOptic' : 'optic']].name);
    if (attsFor(key).length) {
      const list = attList(c[sec ? 'secAtts' : 'atts']), max = maxAtts(c, sec ? 'secondary' : 'primary');
      const pips = `<span class="pips">${Array.from({ length: max }, (_, k) => `<i class="${k < list.length ? 'on' : ''}"></i>`).join('')}</span>`;
      row(sub, p + 'att', 'Attachments', list.length ? list.map(a => ATTS[a].name).join(', ') : 'None', pips, 'att');
    }
    if (ammoFor(key).length > 1) row(sub, p + 'ammo', 'Ammo', AMMO[c[sec ? 'secAmmo' : 'ammo'] || 'std'].name);
  };
  gunGroup(false);
  gunGroup(true);
  const noEq = c.wildcard === 'overload', more = c.wildcard === 'danger' ? 1 : 0;
  const eq = group('Equipment'); eq.classList.add('pair');
  row(eq, 'lethal', 'Lethal', noEq ? 'None' : `${LETHALS[c.lethal].name} <small>×${LETHALS[c.lethal].count + more}</small>`, '', noEq ? 'void' : '');
  row(eq, 'tact', 'Tactical', noEq ? 'None' : `${TACTICALS[c.tact].name} <small>×${TACTICALS[c.tact].count + more}</small>`, '', noEq ? 'void' : '');
  const pk = group('Perks');
  c.perks.slice(0, perkCount(c)).forEach((k, i) => {
    const b = row(pk, 'perk' + i, i < 3 ? PERK_TIERS[i][1] : `Perk ${i + 1}`, PERKS[k].name, '', 'perk');
    b.style.setProperty('--c', PERK_TIERS[PERKS[k].tier - 1][2]);
  });
  const wg = group('Wildcard');
  row(wg, 'wild', 'Wildcard', WILDCARDS[c.wildcard].name, '', c.wildcard === 'none' ? 'void' : '');
  if (focused) { const el = box.querySelector(`[data-f="${focused}"]`); if (el) el.focus(); }
}

/* ---------- right column: the picker ---------- */
function renderPicker(c) {
  const body = $('#edBody'), focusKey = activeEl() && activeEl().dataset ? activeEl().dataset.k : null;
  const S = slotSpec(c, edFocus);
  body.innerHTML = '';
  const head = document.createElement('div'); head.className = 'phead';
  head.innerHTML = `<h3>${S.title}</h3>${S.count ? `<span class="cnt">${S.count}</span>` : ''}`;
  body.appendChild(head);
  const list = document.createElement('div'); list.className = 'plist' + (S.multi ? ' multi' : ''); body.appendChild(list);
  const det = document.createElement('div'); det.className = 'pdet';
  const show = inf => {
    if (!inf) { det.innerHTML = ''; return; }
    det.innerHTML = `<h4>${esc(inf.name)}${inf.sub ? ` <small>${esc(inf.sub)}</small>` : ''}</h4>${inf.desc ? `<p>${esc(inf.desc)}</p>` : ''}${inf.stats ? statBars(inf.stats) : ''}`;
  };
  for (const [label, items, slot] of S.groups) {
    const grp = document.createElement('div'); grp.className = 'pgroup';
    if (label) grp.innerHTML = `<span class="pl">${label}</span>`;
    const tiles = document.createElement('div'); tiles.className = 'tiles'; grp.appendChild(tiles);
    const cur = S.multi ? S.curOf(slot) : S.cur;
    for (const it of items) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tile'; b.dataset.k = `${edFocus}:${slot || ''}:${it.v}`;
      b.innerHTML = `<b>${esc(it.name)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}`;
      if (it.tint) { b.style.setProperty('--c', it.tint); b.classList.add('tinted'); }
      b.setAttribute('aria-pressed', String(it.v === cur));
      if (it.off && it.v !== cur) b.disabled = true;
      const peek = () => show(S.info(it.v));
      b.addEventListener('mouseenter', peek); b.addEventListener('focus', peek);
      b.addEventListener('mouseleave', () => show(idle()));
      b.addEventListener('click', () => { S.pick(it.v, slot); renderEditor(); });
      tiles.appendChild(b);
    }
    list.appendChild(grp);
  }
  // what the readout shows when nothing is under the cursor: the current choice
  const idle = () => {
    if (S.idle) return S.idle;
    if (S.multi) {
      const chosen = S.groups.map(g => S.curOf(g[2])).filter(v => v && v !== 'none');
      return chosen.length === 1 ? S.info(chosen[0]) : { name: `${chosen.length} attachments`, desc: chosen.map(a => `${ATTS[a].name}: ${ATTS[a].desc}`).join(' ') };
    }
    return S.info(S.cur);
  };
  show(idle());
  body.appendChild(det);
  if (focusKey) { const el = body.querySelector(`[data-k="${focusKey}"]`); if (el) el.focus(); }
}

function renderEditor() {
  const c = settings.classes[edIdx];
  settleClass(c);
  renderSlots();
  if (activeEl() !== $('#edName')) $('#edName').value = c.name;
  // a slot that no longer exists on this class (no optic choice, no ammo, perk count dropped) falls back to the gun
  const valid = new Set(['primary', 'secondary', 'lethal', 'tact', 'wild']);
  for (const [p, key] of [['p', c.primary], ['s', c.secondary]]) {
    if (opticsFor(key).length > 1) valid.add(p + 'opt');
    if (attsFor(key).length) valid.add(p + 'att');
    if (ammoFor(key).length > 1) valid.add(p + 'ammo');
  }
  for (let i = 0; i < perkCount(c); i++) valid.add('perk' + i);
  if (!valid.has(edFocus)) edFocus = edFocus[0] === 's' && edFocus !== 'secondary' ? 'secondary' : 'primary';
  renderLoadout(c);
  renderPicker(c);
  settleClass(c);
  saveSettings();
  updatePreview(c);
}

/* ---------- 3D preview: whichever gun the open slot belongs to ----------
   One offscreen WebGL renderer draws the gun, then copies it into the 2D canvas on the page. */
function previewGun(c) {
  const sec = edFocus === 'secondary' || /^s(opt|att|ammo)$/.test(edFocus);
  return sec ? [c.secondary, c.secOptic, c.secAtts] : [c.primary, c.optic, c.atts];
}
function updatePreview(c) {
  if (!prev) {
    try {
      const r = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: settings.aa !== false, alpha: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1);
      const sc = new THREE.Scene(); sc.add(new THREE.AmbientLight(0xffffff, .5));
      const l = new THREE.DirectionalLight(0xFFE2B8, .95); l.position.set(1, 1.5, 1); sc.add(l);
      const l2 = new THREE.DirectionalLight(0x9FC3E0, .45); l2.position.set(-1, .3, -1); sc.add(l2);
      prev = { r, t: 0, V: { sc, cam: new THREE.PerspectiveCamera(24, 2, .01, 20), gun: null, len: 1, sig: '' } };
    } catch (e) { prev = { failed: true }; }
  }
  if (prev.failed) return;
  const [key, optic, atts] = previewGun(c), V = prev.V;
  const sig = key + '|' + optic + '|' + attList(atts).join(',');
  if (sig === V.sig) return;
  V.sig = sig;
  if (V.gun) V.sc.remove(V.gun);
  const R = buildGun(key, optic, atts);
  const holder = new THREE.Group(); R.group.position.z = -(R.muzzle + .4) / 2; holder.add(R.group);
  V.sc.add(holder); V.gun = holder; V.len = Math.abs(R.muzzle) + .45;
}
function drawPreview(V, cv) {
  if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
  if (!w || !h) return;
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  prev.r.setSize(w, h, false);
  V.cam.aspect = w / h; V.cam.updateProjectionMatrix();
  V.gun.rotation.y = Math.PI / 2 + Math.sin(prev.t * .5) * .35;
  const fitW = V.len / 2 / Math.tan(12 * Math.PI / 180) / V.cam.aspect, fitH = .22 / Math.tan(12 * Math.PI / 180);
  V.cam.position.set(0, .06, Math.max(fitW, fitH, .55) * 1.08); V.cam.lookAt(0, 0, 0);
  prev.r.render(V.sc, V.cam);
  const x = cv.getContext('2d'); x.clearRect(0, 0, w, h); x.drawImage(prev.r.domElement, 0, 0);
}
function renderPreview(dt) {
  if (!prev || prev.failed || !prev.V.gun || $('#editor').hidden) return;
  prev.t += dt;
  drawPreview(prev.V, $('#edPreview'));
}
