// Blast Radius \u00B7 renderer, cameras, lights, procedural textures
'use strict';

/* ================= RENDERER ================= */
const canvas = $('#game');
// antialiasing is fixed when the WebGL context is created, so it takes effect the next time the game loads
const AA_AT_START = settings.aa !== false;
// Ultra low also drops the logarithmic depth buffer (it makes every shader heavier); it is fixed at startup too
const ULTRA_AT_START = settings.res === 'ultra';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: AA_AT_START, logarithmicDepthBuffer: !ULTRA_AT_START });
// Native follows the screen (capped at 1.5). Low draws one pixel per pixel, and on a big screen (a TV) no more
// than about 720p's worth, which keeps the drawing buffers small enough for a console's browser.
const pixelRatio = () => {
  if (settings.res !== 'low' && settings.res !== 'ultra') return Math.min(window.devicePixelRatio || 1, 1.5);
  // Low: at most about 720p's worth of pixels. Ultra low: about 540p.
  const w = window.innerWidth || 1280, h = window.innerHeight || 720, px = settings.res === 'ultra' ? 960 * 540 : 1280 * 720;
  return Math.min(1, Math.sqrt(px / Math.max(1, w * h)));
};
renderer.setPixelRatio(pixelRatio());
renderer.shadowMap.enabled = settings.shadows !== false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xE4C9A2, 70, 230);
const camera = new THREE.PerspectiveCamera(settings.fov, 1, ULTRA_AT_START ? 0.12 : 0.05, 600);   // without log depth, a nearer near plane would flicker far away
camera.rotation.order = 'YXZ';
scene.add(camera);
const vmScene = new THREE.Scene();
const vmCamera = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
vmScene.add(new THREE.AmbientLight(0xffffff, .5));
const vmSun = new THREE.DirectionalLight(0xFFE2B8, .8); vmSun.position.set(.5, 1, .4); vmScene.add(vmSun);
const vmFill = new THREE.DirectionalLight(0x9FC3E0, .3); vmFill.position.set(-.6, .2, .5); vmScene.add(vmFill);

function resize() {
  // split screen: this window's game takes the left half, Player 2 the right
  const w = document.body.classList.contains('split') ? Math.round(window.innerWidth / 2) : window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  vmCamera.aspect = w / h; vmCamera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const hemi = new THREE.HemisphereLight(0xCFE2EE, 0xB08D63, .62); scene.add(hemi);
const ambient = new THREE.AmbientLight(0xffffff, .12); scene.add(ambient);
const sun = new THREE.DirectionalLight(0xFFD9A6, .95);
sun.position.set(-38, 46, 24);
sun.castShadow = settings.shadows !== false;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 40, bottom: -40, near: 1, far: 140 });
sun.shadow.bias = -0.0008;
scene.add(sun);

/* ---------- graphics settings, applied live ---------- */
// shadows: switching the shadow map off also frees its 2048² texture, and every material is flagged so its
// shader recompiles without (or with) the shadow code on the next frame
function applyShadows() {
  const on = settings.shadows !== false;
  if (renderer.shadowMap.enabled === on && sun.castShadow === on) return;
  renderer.shadowMap.enabled = on; sun.castShadow = on;
  if (!on && sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  renderer.shadowMap.needsUpdate = true;
  const flag = o => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) m.needsUpdate = true; };
  scene.traverse(flag); vmScene.traverse(flag);
}
// resolution: Low pins the pixel ratio at 1, Native follows the screen (capped at 1.5)
function applyResolution() { renderer.setPixelRatio(pixelRatio()); resize(); flashLight.visible = settings.res !== 'ultra'; }
// switching into or out of Ultra low rebuilds the map on screen (merged or not), but never in the middle of a match
function gfxReloadMap() {
  if (typeof G === 'undefined' || G.state !== 'menu' || !MAP) return;
  const want = settings.res === 'ultra', id = MAP.id;
  if (!!MAP.merged === want) return;
  MAP = null; loadMap(id, lightingName); MAP.merged = want;
}
function applyGraphics() { applyShadows(); applyResolution(); }
/* The graphics device dropped the context (usually out of video memory, as a console's browser can).
   The menus are ordinary page elements and keep working without it, so nothing here ever covers them: the game
   switches to the lightest graphics settings (saved, so the next load starts light), shows a small notice, and
   carries on. The browser normally hands the context back a moment later, and drawing resumes by itself.     */
function gfxNotice(text) {
  let el = document.getElementById('glLost');
  if (!text) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'glLost';
    el.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:70;pointer-events:none;max-width:min(560px,calc(100vw - 24px));background:rgba(13,17,20,.92);color:#E9DCC0;font:600 14px/1.4 system-ui,sans-serif;text-align:center;padding:10px 14px;border-radius:8px;border:1px solid rgba(233,220,192,.25)';
    document.body.appendChild(el);
  }
  el.textContent = text;
}
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();   // ask the browser to give the context back
  Object.assign(settings, { shadows: false, aa: false, res: 'ultra', gfxV: 2 });
  try { saveSettings(); } catch (err) {}
  gfxNotice('The graphics ran out of memory, so Ultra low graphics are now on. Reload the page to start fresh on them.');
});
canvas.addEventListener('webglcontextrestored', () => {
  try { applyGraphics(); } catch (err) {}
  gfxNotice('Graphics back, on lighter settings.');
  setTimeout(() => gfxNotice(null), 4000);
});

const flashLight = new THREE.PointLight(0xFFC27A, 0, 9, 2); scene.add(flashLight);
flashLight.visible = settings.res !== 'ultra';   // Ultra low: no muzzle-flash light (every extra light makes every shader bigger)
// a weapon-mounted torch, used at night
const torch = new THREE.SpotLight(0xFFF1D6, 0, 34, .42, .55, 1.3);
torch.position.set(.25, -.2, 0); torch.target.position.set(0, -.05, -1); camera.add(torch); camera.add(torch.target);

/* ---------- day / night ---------- */
const LAMPS = [];           // { light, day, night }
const SKY = { day: null, night: null };
const LIGHTING = {
  day:   { fog: [0xE4C9A2, 70, 230], hemi: [0xCFE2EE, 0xB08D63, .62], amb: .12, sun: [0xFFD9A6, .95, -38, 46, 24], torch: 0 },
  night: { fog: [0x0B141E, 12, 78], hemi: [0x5A7090, 0x1C1610, .26], amb: .06, sun: [0x9DB4FF, .34, 30, 52, -26], torch: 1.7 },
};
let lightingName = 'day';
function applyLighting(name) {
  const L = (MAP && MAP.lighting && MAP.lighting[name]) || LIGHTING[name]; lightingName = name;
  scene.fog.color.setHex(L.fog[0]); scene.fog.near = L.fog[1]; scene.fog.far = L.fog[2];
  hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2];
  ambient.intensity = L.amb;
  sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; const so = (MAP && MAP.sunOff) || [0, 0]; sun.position.set(L.sun[2] + so[0], L.sun[3], L.sun[4] + so[1]);
  if (SKY.day) SKY.day.visible = name === 'day' || !SKY.night;
  if (SKY.night) SKY.night.visible = name === 'night';
  renderer.toneMappingExposure = 1;
  for (const l of LAMPS) l.light.intensity = l[name];
}

/* ================= TEXTURES ================= */
const TEXDEF = {
  siding:   { scale: 1.4, draw(x, s) { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); const r = s / 8; for (let y = 0; y < s; y += r) { x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, y + r - 5, s, 5); x.fillStyle = 'rgba(0,0,0,.07)'; x.fillRect(0, y + r - 12, s, 7); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(0, y, s, 2); } speckle(x, s, 700, .05); } },
  shingle:  { scale: 1.6, draw(x, s) { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); const r = s / 8, w = s / 6; for (let row = 0; row < 8; row++) { const off = row % 2 ? w / 2 : 0; for (let c = -1; c < 7; c++) { const v = 200 + Math.random() * 55 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(c * w + off + 1, row * r + 1, w - 2, r - 2); } x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, row * r + r - 3, s, 3); } speckle(x, s, 1500, .12); } },
  block:    { scale: 1.6, draw(x, s) { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); const r = s / 8, w = s / 4; for (let row = 0; row < 8; row++) { const off = row % 2 ? w / 2 : 0; for (let c = -1; c < 5; c++) { const v = 215 + Math.random() * 40 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(c * w + off + 2, row * r + 2, w - 4, r - 4); } } speckle(x, s, 2500, .1); } },
  planks:   { scale: 2.0, draw(x, s) { const w = s / 8; for (let c = 0; c < 8; c++) { const v = 200 + Math.random() * 55 | 0; x.fillStyle = `rgb(${v},${v - 6},${v - 12})`; x.fillRect(c * w, 0, w, s); x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(c * w, 0, 2, s); const cut = Math.random() * s; x.fillRect(c * w, cut, w, 2); for (let g = 0; g < 6; g++) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(c * w + 4 + Math.random() * (w - 8), 0, 1, s); } } } },
  crate:    { scale: 1.2, draw(x, s) { x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, s, s); const r = s / 5; for (let i = 0; i < 5; i++) { const v = 205 + Math.random() * 45 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(0, i * r + 1, s, r - 2); } x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 18; x.strokeRect(9, 9, s - 18, s - 18); x.lineWidth = 16; x.beginPath(); x.moveTo(18, 18); x.lineTo(s - 18, s - 18); x.stroke(); } },
  asphalt:  { scale: 4, draw(x, s) { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); speckle(x, s, 7000, .28); } },
  grass:    { scale: 5, draw(x, s) { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); for (let i = 0; i < 4500; i++) { const v = 150 + Math.random() * 105 | 0; x.fillStyle = `rgba(${v},${v},${v},.5)`; x.fillRect(Math.random() * s, Math.random() * s, 1, 3 + Math.random() * 4); } } },
  concrete: { scale: 3, draw(x, s) { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); speckle(x, s, 2500, .1); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 0, s, 2); x.fillRect(0, 0, 2, s); } },
  plaster:  { scale: 3, draw(x, s) { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); speckle(x, s, 1800, .05); } },
  tile:     { scale: 1.2, draw(x, s) { const n = 4, w = s / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? '#ffffff' : '#9a9a9a'; x.fillRect(i * w, j * w, w, w); } x.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i <= n; i++) { x.fillRect(i * w - 1, 0, 2, s); x.fillRect(0, i * w - 1, s, 2); } } },
  dirt:     { scale: 6, draw(x, s) { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); speckle(x, s, 6000, .18); } },
  corrugated: { scale: 1.2, draw(x, s) { const n = 16, w = s / n; for (let i = 0; i < n; i++) { const g = x.createLinearGradient(i * w, 0, i * w + w, 0); g.addColorStop(0, '#9a9a9a'); g.addColorStop(.35, '#ffffff'); g.addColorStop(.7, '#c8c8c8'); g.addColorStop(1, '#8a8a8a'); x.fillStyle = g; x.fillRect(i * w, 0, w, s); } speckle(x, s, 1600, .12); for (let i = 0; i < 6; i++) { x.fillStyle = `rgba(110,60,30,${Math.random() * .18})`; x.fillRect(Math.random() * s, Math.random() * s, 10 + Math.random() * 40, 4 + Math.random() * 30); } } },
  sand:     { scale: 6, draw(x, s) { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); for (let i = 0; i < 9; i++) { x.strokeStyle = 'rgba(0,0,0,.06)'; x.lineWidth = 3; x.beginPath(); const y0 = Math.random() * s; for (let px = 0; px <= s; px += 8) x.lineTo(px, y0 + Math.sin(px / 30 + i) * 8); x.stroke(); } speckle(x, s, 6000, .15); } },
  diamond:  { scale: .9, draw(x, s) { x.fillStyle = '#d8d8d8'; x.fillRect(0, 0, s, s); const n = 8, w = s / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const cx = i * w + w / 2, cy = j * w + w / 2, a = (i + j) % 2 ? 1 : -1; x.save(); x.translate(cx, cy); x.rotate(a * .7); x.fillStyle = 'rgba(255,255,255,.75)'; x.fillRect(-w * .32, -3, w * .64, 6); x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(-w * .32, 3, w * .64, 2); x.restore(); } speckle(x, s, 1200, .1); } },
  water:    { scale: 8, draw(x, s) { x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, s, s); for (let i = 0; i < 260; i++) { const px = Math.random() * s, py = Math.random() * s, l = 8 + Math.random() * 26; x.fillStyle = `rgba(255,255,255,${.2 + Math.random() * .5})`; x.fillRect(px, py, l, 2); x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(px + 3, py + 3, l * .8, 2); } } },
  carpet:   { scale: 2.2, draw(x, s) { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); speckle(x, s, 5000, .14); x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 6; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.moveTo(i * 64 + 32, j * 64 + 8); x.lineTo(i * 64 + 56, j * 64 + 32); x.lineTo(i * 64 + 32, j * 64 + 56); x.lineTo(i * 64 + 8, j * 64 + 32); x.closePath(); x.stroke(); } } },
  metal:    { scale: 2, draw(x, s) { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; x.fillRect(0, Math.random() * s, s, 1); } speckle(x, s, 800, .08); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 0, s, 3); x.fillRect(0, 0, 3, s); for (const [a, b] of [[10, 10], [s - 10, 10], [10, s - 10], [s - 10, s - 10]]) { x.beginPath(); x.arc(a, b, 3, 0, TAU); x.fill(); } } },
  rug:      { scale: 3.5, draw(x, s) { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = 10; x.strokeRect(14, 14, s - 28, s - 28); x.lineWidth = 4; x.strokeRect(36, 36, s - 72, s - 72); for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(0,0,0,.12)'; x.beginPath(); x.arc(s / 2, s / 2, 20 + i * 14, 0, TAU); x.fill(); } } },
};
function speckle(x, s, n, a) { for (let i = 0; i < n; i++) { const v = Math.random() < .5 ? 0 : 255; x.fillStyle = `rgba(${v},${v},${v},${Math.random() * a})`; x.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2); } }
const texCache = {};
function getTex(name) {
  if (texCache[name]) return texCache[name];
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); TEXDEF[name].draw(x, 256);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  try { t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); } catch (e) {}
  return texCache[name] = t;
}
