// Blast Radius \u00B7 first and third person gun models
'use strict';

/* ================= GUN MATERIALS ================= */
const GC = { body: 0x2F3337, dark: 0x1C1F22, metal: 0x5D646B, poly: 0x4A4F3A, wood: 0x7A4E30, tan: 0x9C8A66, glove: 0x4A4237, sleeve: 0x4F95DB, skin: 0xC99A72, brass: 0xC9A44A, od: 0x55593F, black: 0x141618 };
// a soft studio environment so metal parts pick up highlights
// a small photo studio for reflections: grey walls, a bright ceiling, dark floor, and tall softbox strips on the
// sides, so steel shows crisp highlights and dark reflections like real metal (flat gradients made it look painted)
const gunEnv = (() => {
  const face = (top, bot, strips, spot) => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    for (const [sx, w, a] of strips || []) { const sg = x.createLinearGradient(sx - w, 0, sx + w, 0); sg.addColorStop(0, 'rgba(255,252,245,0)'); sg.addColorStop(.5, `rgba(255,252,245,${a})`); sg.addColorStop(1, 'rgba(255,252,245,0)'); x.fillStyle = sg; x.fillRect(sx - w, 10, w * 2, 90); }
    if (spot) { const r = x.createRadialGradient(64, 64, 4, 64, 64, 56); r.addColorStop(0, 'rgba(255,255,250,.95)'); r.addColorStop(1, 'rgba(255,255,250,0)'); x.fillStyle = r; x.fillRect(0, 0, 128, 128); }
    return c;
  };
  const t = new THREE.CubeTexture([
    face('#8A949C', '#2A2622', [[40, 10, .95], [92, 6, .6]]), face('#7A848C', '#26221E', [[64, 14, .85]]),
    face('#DCE2E8', '#C8D0D8', null, true), face('#1E1A16', '#141210'),
    face('#848E96', '#28241F', [[30, 8, .7], [86, 12, .9]]), face('#6E7880', '#221E1A', [[64, 8, .5]])]);
  t.needsUpdate = true; return t;
})();
function noiseTex(kind) {
  const N = kind === 'wood' ? 256 : 128;
  const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, N, N);
  if (kind === 'wood') {
    // walnut-style stock: broad colour bands, flowing grain lines, darker pores, a couple of knots, a light varnish streak
    for (let i = 0; i < 9; i++) { const y = Math.random() * N, h = 8 + Math.random() * 30; x.fillStyle = `rgba(${Math.random() < .5 ? '90,45,15' : '255,225,180'},${.06 + Math.random() * .12})`; x.fillRect(0, y, N, h); }
    for (let i = 0; i < 70; i++) {
      const y = Math.random() * N, a = .06 + Math.random() * .2, f = 20 + Math.random() * 40, amp = 1 + Math.random() * 4, ph = Math.random() * 6;
      x.strokeStyle = `rgba(55,25,8,${a})`; x.lineWidth = .6 + Math.random() * 2; x.beginPath();
      for (let px = 0; px <= N; px += 4) { const yy = y + Math.sin(px / f + ph) * amp + Math.sin(px / (f * .37) + ph * 2) * amp * .3; px ? x.lineTo(px, yy) : x.moveTo(px, yy); }
      x.stroke();
    }
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(40,18,5,${Math.random() * .25})`; x.fillRect(Math.random() * N, Math.random() * N, 1 + Math.random() * 3, .8); }
    for (let k = 0; k < 2; k++) { const kx = Math.random() * N, ky = Math.random() * N; for (let r = 9; r > 0; r -= 1.5) { x.strokeStyle = `rgba(50,22,6,${.12 + (9 - r) * .03})`; x.lineWidth = 1; x.beginPath(); x.ellipse(kx, ky, r * 2.2, r * .7, 0, 0, TAU); x.stroke(); } }
    const g = x.createLinearGradient(0, 0, 0, N); g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(.45, 'rgba(255,240,210,.14)'); g.addColorStop(.6, 'rgba(255,240,210,0)'); x.fillStyle = g; x.fillRect(0, 0, N, N);
  } else if (kind === 'brushed') {
    for (let i = 0; i < 520; i++) { const v = Math.random() < .5 ? 0 : 255; x.fillStyle = `rgba(${v},${v},${v},${Math.random() * .09})`; x.fillRect(0, Math.random() * N, N, Math.random() < .2 ? 2 : 1); }
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * .08})`; x.fillRect(Math.random() * N, Math.random() * N, 2 + Math.random() * 6, 2 + Math.random() * 4); }   // light wear marks
  } else if (kind === 'stipple') {
    for (let i = 0; i < 3600; i++) { const v = Math.random() < .5 ? 0 : 255; x.fillStyle = `rgba(${v},${v},${v},${Math.random() * .2})`; x.beginPath(); x.arc(Math.random() * N, Math.random() * N, .6 + Math.random() * 1.1, 0, TAU); x.fill(); }
  } else {
    // parkerized steel: a fine dark grain with faint mottling
    for (let i = 0; i < 2200; i++) { const v = Math.random() < .5 ? 0 : 255; x.fillStyle = `rgba(${v},${v},${v},${Math.random() * .09})`; x.fillRect(Math.random() * N, Math.random() * N, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5); }
    for (let i = 0; i < 14; i++) { const r = x.createRadialGradient(0, 0, 0, 0, 0, 20); r.addColorStop(0, `rgba(0,0,0,${Math.random() * .06})`); r.addColorStop(1, 'rgba(0,0,0,0)'); x.save(); x.translate(Math.random() * N, Math.random() * N); x.fillStyle = r; x.fillRect(-20, -20, 40, 40); x.restore(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const GUNTEX = { wood: noiseTex('wood'), brushed: noiseTex('brushed'), park: noiseTex('park'), stipple: noiseTex('stipple') };
const pmatCache = {};
// material by colour: metals shine and reflect, polymers are matte and stippled, wood has grain, cloth is flat
function pmat(c) {
  if (pmatCache[c]) return pmatCache[c];
  let m;
  if (c === GC.glove || c === GC.sleeve || c === GC.skin || c === TEAMS.B.color || c === 0xD9773F) m = new THREE.MeshLambertMaterial({ color: c });   // cloth, team sleeves included
  // bare steel: metallic, reflecting the studio, with a fine brushed grain
  else if (c === GC.metal || c === 0xB8BCC0 || c === 0x8A9096) m = new THREE.MeshStandardMaterial({ color: c === GC.metal ? 0x9AA2AA : c, metalness: .92, roughness: .3, map: GUNTEX.brushed, roughnessMap: GUNTEX.brushed, envMap: gunEnv, envMapIntensity: 1.25 });
  // blued / parkerized steel receivers: dark metal with a satin sheen
  else if (c === GC.body || c === GC.dark) m = new THREE.MeshStandardMaterial({ color: c === GC.dark ? 0x2A2E33 : 0x3A3F45, metalness: .78, roughness: .42, map: GUNTEX.park, envMap: gunEnv, envMapIntensity: 1.1 });
  else if (c === GC.black) m = new THREE.MeshStandardMaterial({ color: 0x1A1C1F, metalness: .55, roughness: .5, map: GUNTEX.park, envMap: gunEnv, envMapIntensity: .9 });
  // oiled walnut
  else if (c === GC.wood || c === 0x8C5A34 || c === 0x6A3F24) m = new THREE.MeshStandardMaterial({ color: c === GC.wood ? 0x9A6238 : c, metalness: 0, roughness: .55, map: GUNTEX.wood, bumpMap: GUNTEX.wood, bumpScale: .0006, envMap: gunEnv, envMapIntensity: .45 });
  else if (c === GC.brass) m = new THREE.MeshStandardMaterial({ color: c, metalness: 1, roughness: .25, envMap: gunEnv, envMapIntensity: 1.2 });
  // polymer furniture: matte, stippled
  else m = new THREE.MeshStandardMaterial({ color: c, metalness: .05, roughness: .78, map: GUNTEX.stipple, bumpMap: GUNTEX.stipple, bumpScale: .0007, envMap: gunEnv, envMapIntensity: .5 });
  return pmatCache[c] = m;
}
// a rounded, hand-filling pistol grip: an oval section with a palm swell, a flared base and finger bumps up the front.
// Same placement as Hang (hangs from topY/topZ, raked by rx) so the hands still land where they did.
function Grip(g, c, w, h, d, topY, topZ, rx) {
  // a smooth oval grip, a touch fuller at the top, with a flared base: rounded where the hand holds it
  const grp = new THREE.Group(); grp.rotation.x = rx; grp.position.set(0, topY, topZ); g.add(grp);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.5, .46, h, 24), pmat(c)); body.scale.set(w, 1, d); body.position.y = -h / 2; grp.add(body);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .008, 24), pmat(c)); base.scale.set(w * 1.08, 1, d * 1.06); base.position.y = -h + .003; grp.add(base);
  return grp;
}
// a wooden stock drawn as one smooth profile (no seams or kinks between wrist and butt), with rounded edges.
// pts: the side outline as [z, y] points; w: thickness
function woodStock(g, w, pts, c = GC.wood) {
  const sh = new THREE.Shape(); pts.forEach(([z, y], k) => k ? sh.lineTo(z, y) : sh.moveTo(z, y));
  const bev = .005, geo = new THREE.ExtrudeGeometry(sh, { depth: w - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * .8, bevelSegments: 3, curveSegments: 4 });
  const uv = geo.attributes && geo.attributes.uv; if (uv && uv.array) { for (let i = 0; i < uv.array.length; i++) uv.array[i] *= 3.2; uv.needsUpdate = true; }
  const m = new THREE.Mesh(geo, pmat(c)); m.rotation.y = -Math.PI / 2; m.position.x = (w - bev * 2) / 2; m.userData.front = Math.min(...pts.map(p => p[0])) - bev; g.add(m); return m;
}

/* ================= BUILDING BLOCKS ================= */
function gBox(g, w, h, d, x, y, z, c, rx = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pmat(c)); m.position.set(x, y, z); if (rx) m.rotation.x = rx; g.add(m); return m; }
function gCyl(g, r, len, x, y, z, c, seg = 10, r2) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, len, seg), pmat(c)); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; }
// a rail of picatinny teeth along z
// box by extents (centred on x unless x is given)
function Bx(g, c, w, y0, y1, z0, z1, x = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, y1 - y0, z1 - z0), pmat(c)); m.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2); g.add(m); return m; }
// cylinder along z from z0 to z1 (r1 at z1 end if given)
function Cz(g, c, r, z0, z1, y, seg = 12, x = 0, r1) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1 === undefined ? r : r1, r, z1 - z0, seg), pmat(c)); m.rotation.x = Math.PI / 2; m.position.set(x, y, (z0 + z1) / 2); g.add(m); return m; }
// a part hanging from (topY, topZ), raked by rx (negative = bottom further back)
function Hang(g, c, w, h, d, topY, topZ, rx, x = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pmat(c)); m.rotation.x = rx; m.position.set(x, topY - h / 2 * Math.cos(rx), topZ - h / 2 * Math.sin(rx)); g.add(m); return m; }
// picatinny rail sitting on y, teeth on top; returns the rail's top
function rail(g, y, z0, z1, w = .03, c = GC.dark) {
  const a = Math.min(z0, z1), b = Math.max(z0, z1);
  Bx(g, c, w, y, y + .007, a, b);
  for (let z = a + .006; z < b - .003; z += .014) Bx(g, c, w + .004, y + .007, y + .012, z - .0035, z + .0035);
  return y + .012;
}
// trigger, trigger guard: yb = bottom of the receiver, zc = trigger position
// a closed loop: bottom bar, a front post and a rear post both meeting the receiver, so the guard never floats
function trig(g, yb, zc, c = GC.dark) {
  Bx(g, c, .012, yb - .036, yb - .03, zc - .049, zc + .041);     // guard bottom
  Bx(g, c, .01, yb - .033, yb + .002, zc - .05, zc - .042);      // guard front
  Bx(g, c, .01, yb - .033, yb + .002, zc + .034, zc + .042);     // guard rear, into the grip
  Hang(g, GC.metal, .006, .028, .007, yb, zc - .004, .4);        // trigger blade
}
// a magazine as a group whose origin is the top of the mag at the magwell
function magazine(g, R, y, z, parts) {
  const m = new THREE.Group(); m.position.set(0, y, z); g.add(m);
  // each segment hangs from the bottom of the one above, so a run of small rake steps reads as one smooth curve
  let h = 0, zt = 0;
  parts.forEach(([c, w, ph, d, rx, dz], k) => {
    Hang(m, c, w + k * .0006, ph + .003, d, -h + .0015, zt + (dz || 0), rx);   // tiny overlap and width step: no seams, no flicker
    h += ph * Math.cos(rx); zt -= ph * Math.sin(rx);
  });
  const last = parts[parts.length - 1];
  Hang(m, GC.black, last[1] + .006 + parts.length * .0006, .011, last[3] + .004, -h + .003, zt + (last[5] || 0), last[4]);  // base plate
  R.mag = m; R.magH = h; R.magBot = { y: -h - .008, z: zt + (last[5] || 0), rx: last[4] }; return m;
}
function rearSight(g, z, baseY, S) {
  const h = S - .024 - baseY; if (h > .002) Bx(g, GC.dark, .03, baseY, baseY + h, z - .01, z + .01);
  Bx(g, GC.dark, .008, S - .024, S, z - .008, z + .008, -.0105); Bx(g, GC.dark, .008, S - .024, S, z - .008, z + .008, .0105);
  Bx(g, GC.dark, .03, S - .026, S - .022, z - .008, z + .008);
}
function frontPost(g, z, baseY, S) {
  const h = S - .022 - baseY; if (h > .002) Bx(g, GC.dark, .016, baseY, baseY + h, z - .008, z + .008);
  for (const x of [-.009, .009]) Bx(g, GC.dark, .003, S - .022, S + .002, z - .006, z + .006, x); // protective ears
  Bx(g, GC.dark, .004, S - .022, S, z - .002, z + .002);
  Bx(g, 0xF2F0E0, .003, S - .003, S, z + .0015, z + .0025);
}
const dotMat = new THREE.MeshBasicMaterial({ color: 0xF4F2E6 }), tritMat = new THREE.MeshBasicMaterial({ color: 0x8CFF6A });
const reticleMat = new THREE.MeshBasicMaterial({ color: 0xFF2A1A });
const holoMat = new THREE.MeshBasicMaterial({ color: 0xFF3A2A, side: THREE.DoubleSide });
const lensMat = new THREE.MeshBasicMaterial({ color: 0x9FD4FF, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide });
const tubeMat = new THREE.MeshPhongMaterial({ color: GC.dark, shininess: 40, specular: 0x333333 });
// scope lens caps seen from the hip
// scope lens: smoky dark glass with a faint warm sheen and a soft reflection, like a real coated lens seen from outside
const lensTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(30, 34, 2, 32, 32, 32); g.addColorStop(0, '#3A3128'); g.addColorStop(.55, '#221E1A'); g.addColorStop(1, '#121416');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const h = x.createRadialGradient(22, 20, 1, 22, 20, 14); h.addColorStop(0, 'rgba(210,200,185,.28)'); h.addColorStop(1, 'rgba(210,200,185,0)');
  x.fillStyle = h; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const lensMatHip = new THREE.MeshBasicMaterial({ map: lensTex, side: THREE.DoubleSide });
// sniper-scope glass: a deep coated lens you can see into (element edges inside), a bright reflection arc and a glint
const scopeLensTex = (() => {
  const c = document.createElement('canvas'), N = 128; c.width = c.height = N; const x = c.getContext('2d'), m = N / 2;
  const g = x.createRadialGradient(m - 6, m - 8, 2, m, m, m); g.addColorStop(0, '#2C4644'); g.addColorStop(.45, '#183230'); g.addColorStop(.8, '#0E1A1C'); g.addColorStop(1, '#06080A');
  x.fillStyle = g; x.fillRect(0, 0, N, N);
  const sky = x.createLinearGradient(0, 0, 0, m); sky.addColorStop(0, 'rgba(190,210,230,.22)'); sky.addColorStop(1, 'rgba(190,210,230,0)');
  x.fillStyle = sky; x.beginPath(); x.arc(m, m, m * .92, Math.PI, TAU); x.fill();
  x.lineWidth = 1.5;
  for (const [rr, a] of [[.72, .2], [.5, .16], [.3, .12]]) { x.strokeStyle = `rgba(140,200,190,${a})`; x.beginPath(); x.arc(m + 2, m + 3, m * rr, 0, TAU); x.stroke(); }   // lens elements inside
  x.strokeStyle = 'rgba(235,245,255,.5)'; x.lineWidth = 5; x.lineCap = 'round'; x.shadowColor = 'rgba(235,245,255,.8)'; x.shadowBlur = 6;
  x.beginPath(); x.arc(m, m, m * .78, Math.PI * 1.12, Math.PI * 1.52); x.stroke();                                                                        // reflection arc
  x.shadowBlur = 0;
  const d = x.createRadialGradient(m * .62, m * .58, 0, m * .62, m * .58, 9); d.addColorStop(0, 'rgba(255,255,255,.95)'); d.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = d; x.fillRect(0, 0, N, N);                                                                                                                       // glint
  const p = x.createRadialGradient(m * 1.3, m * 1.35, 0, m * 1.3, m * 1.35, 14); p.addColorStop(0, 'rgba(170,120,220,.35)'); p.addColorStop(1, 'rgba(170,120,220,0)');
  x.fillStyle = p; x.fillRect(0, 0, N, N);                                                                                                                       // coating flare
  return new THREE.CanvasTexture(c);
})();
const lensMatAmber = new THREE.MeshBasicMaterial({ map: scopeLensTex, color: 0xF0D8B8, side: THREE.DoubleSide });   // warm-coated objective
const lensMatScope = new THREE.MeshBasicMaterial({ map: scopeLensTex, side: THREE.DoubleSide });
// a clear glossy skin over the glass, so it catches moving highlights as the gun turns
const lensSheen = new THREE.MeshPhongMaterial({ color: 0x000000, specular: 0xFFFFFF, shininess: 140, envMap: gunEnv, reflectivity: .35, combine: THREE.MixOperation, transparent: true, opacity: .3, depthWrite: false, side: THREE.DoubleSide });
const recessMat = new THREE.MeshBasicMaterial({ color: 0x0C0D0E, side: THREE.BackSide });
// three-dot pistol sights: two dots on the rear notch, one on the front blade
function dotSights(g, rearZ, frontZ, base, S, big = false) {
  // the dots are short pegs set into the sight faces (a flat disc floating just off a face flickered)
  const peg = (x, y, z, r, m) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .004, 12), m); d.rotation.x = Math.PI / 2; d.position.set(x, y, z); g.add(d); };
  // rear: two posts kept within the slide's width, with a notch between them for the front post
  // big-frame sights: a wider notch and a taller, thicker front blade with a larger dot, so the front post
  // reads clearly between the rear posts instead of hiding against the slide
  const gap = big ? .0115 : .0095, pw = big ? .008 : .007, fw = big ? .0065 : .0045, fd = big ? .0026 : .0019;
  for (const x of [-gap, gap]) { Bx(g, GC.black, pw, base, S, rearZ - .008, rearZ + .008, x); peg(x, S - .006, rearZ + .008, big ? .0017 : .0019, dotMat); }
  Bx(g, GC.black, gap * 2 + pw, base, base + .0015, rearZ - .008, rearZ + .008);   // thin base: the notch floor sits below the front dot
  // front: a blade with a green tritium dot near its top
  Bx(g, GC.black, fw, base, S, frontZ - .004, frontZ + .004);
  peg(0, S - fd - .0012, frontZ + .004, fd, tritMat);
}
// a pistol-sized red dot: low body, open window just above the slide. Returns the sight line height.
function miniReflex(g, z, base) {
  const S = base + .022, w = .026;
  Bx(g, GC.dark, w + .002, base, base + .008, z - .024, z + .018);                       // body on the slide
  for (const x of [-1, 1]) Bx(g, GC.dark, .003, base + .006, S + .015, z - .02, z - .008, x * (w / 2 - .0015));  // window posts
  Bx(g, GC.dark, w, S + .012, S + .016, z - .02, z - .008);                              // hood
  Bx(g, GC.dark, w - .004, base + .008, base + .011, z - .006, z + .016);                // rear housing, below the sight line
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(w - .003, .026), lensMat); lens.position.set(0, S + .001, z - .014); g.add(lens);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(.0013, 12), reticleMat); dot.position.set(0, S, z - .0145); g.add(dot);
  return S;
}
function reflexSight(g, z, base, S) {
  Bx(g, GC.dark, .034, base, base + .008, z - .03, z + .03);                 // clamp on the rail
  if (S - .022 > base + .009) Bx(g, GC.dark, .028, base + .008, S - .022, z - .025, z + .03);            // body
  Bx(g, GC.dark, .006, S - .024, S + .024, z - .022, z - .012, -.023); Bx(g, GC.dark, .006, S - .024, S + .024, z - .022, z - .012, .023);
  Bx(g, GC.dark, .052, S + .02, S + .026, z - .022, z - .012);
  // frame bottom: one full-width piece from the window straight down to the clamp, so the frame sits solidly on its mount
  if (S - .022 > base + .006) Bx(g, GC.dark, .052, base + .006, S - .022, z - .022, z - .012);
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(.04, .04), lensMat); lens.position.set(0, S, z - .017); g.add(lens);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(.0017, 12), reticleMat); dot.position.set(0, S, z - .018); g.add(dot);
  return z + .03;
}
function holoSight(g, z, base, S) {
  const L = .09;
  Bx(g, GC.dark, .036, base, base + .009, z - L / 2, z + L / 2);             // rail clamp
  Bx(g, GC.black, .044, base + .009, S - .026, z - L / 2, z + L / 2);        // battery housing
  for (const x of [-.026, .026]) Bx(g, GC.black, .006, S - .028, S + .028, z - L / 2, z + L / 2 - .02, x);
  Bx(g, GC.black, .058, S + .024, S + .03, z - L / 2, z + L / 2 - .02);       // hood
  for (const x of [-.017, .017]) Bx(g, GC.metal, .008, base + .015, S - .03, z + L / 2 - .002, z + L / 2 + .006, x); // buttons
  const lens = new THREE.Mesh(new THREE.PlaneGeometry(.048, .05), lensMat); lens.position.set(0, S, z - L / 2 + .012); g.add(lens);
  const ring = new THREE.Mesh(new THREE.RingGeometry(.0078, .0088, 28), holoMat); ring.position.set(0, S, z - L / 2 + .011); g.add(ring);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(.0013, 10), holoMat); dot.position.set(0, S, z - L / 2 + .011); g.add(dot);
  return z + L / 2;
}
// 2.5x prism sight: the tube is only drawn from outside, so looking through it shows one clean ring
function acogSight(g, z, base, S) {
  const L = .11, r = .024;
  Bx(g, GC.dark, .034, base, base + .009, z - .035, z + .035);
  Bx(g, GC.dark, .026, base + .009, S - r + .004, z - .03, z + .03);
  const part = (r0, r1, z0, z1) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, z1 - z0, 20, 1, true), tubeMat); m.rotation.x = Math.PI / 2; m.position.set(0, S, (z0 + z1) / 2); g.add(m); };
  // glass at both ends: solid from the hip so you can't see the floor through the body; hidden while aiming so you look through
  // lenses sit a little way inside each end, so the tube's rim and a retaining ring frame them. Shown from the hip;
  // hidden while aiming, when you look through the scope instead.
  for (const [zEnd, rr, dir] of [[z - L / 2 - .03, r + .0055, -1], [z + L / 2 + .02, r + .0025, 1]]) {
    const zl = zEnd - dir * .014;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(rr, 24), lensMatHip); lens.position.set(0, S, zl); if (dir < 0) lens.rotation.y = Math.PI; lens.userData.inner = true; g.add(lens);
    const ring = new THREE.Mesh(new THREE.RingGeometry(rr - .0035, rr + .0005, 24), tubeMat); ring.position.set(0, S, zl + dir * .0005); if (dir < 0) ring.rotation.y = Math.PI; ring.userData.inner = true; g.add(ring);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(rr + .0006, rr + .0006, .015, 20, 1, true), recessMat); wall.rotation.x = Math.PI / 2; wall.position.set(0, S, zEnd - dir * .007); wall.userData.inner = true; g.add(wall);
  }

  part(r, r, z - L / 2, z + L / 2); part(r + .006, r + .006, z - L / 2 - .03, z - L / 2); part(r + .003, r + .003, z + L / 2, z + L / 2 + .02);
  { const fr = new THREE.Mesh(new THREE.RingGeometry(r + .001, r + .006, 24), tubeMat); fr.position.set(0, S, z - L / 2); fr.rotation.y = Math.PI; g.add(fr); }
  Bx(g, 0x3A3E44, .012, S + r - .002, S + r + .01, z - .03, z + .03); Bx(g, 0xE0603A, .006, S + r + .01, S + r + .014, z - .025, z + .025);
  const eye = new THREE.Mesh(new THREE.RingGeometry(r * .97, r + .004, 28), tubeMat); eye.position.set(0, S, z + L / 2 + .02); g.add(eye);
  const sh = new THREE.Shape(); sh.moveTo(-.0035, -.0028); sh.lineTo(0, .0022); sh.lineTo(.0035, -.0028); sh.lineTo(.0026, -.0028); sh.lineTo(0, .0008); sh.lineTo(-.0026, -.0028); sh.lineTo(-.0035, -.0028);
  const chev = new THREE.Mesh(new THREE.ShapeGeometry(sh), holoMat); chev.position.set(0, S - .0004, z - L / 2 + .01); g.add(chev);
  const post = new THREE.Mesh(new THREE.PlaneGeometry(.0006, .008), new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })); post.position.set(0, S - .0068, z - L / 2 + .01); g.add(post);
  return z + L / 2 + .02;
}
// a recessed lens framed by the tube rim and a black retaining ring (same look as the ACOG's)
function scopeLens(g, zEnd, rr, dir, S, mat = lensMatHip, depth = .012) {
  const zl = zEnd - dir * depth;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(rr, 28), mat); lens.position.set(0, S, zl); if (dir < 0) lens.rotation.y = Math.PI; g.add(lens);
  const ring = new THREE.Mesh(new THREE.RingGeometry(rr - .0035, rr + .0005, 28), tubeMat); ring.position.set(0, S, zl + dir * .0005); if (dir < 0) ring.rotation.y = Math.PI; g.add(ring);
  if (mat !== lensMatHip) { const sh = new THREE.Mesh(new THREE.CircleGeometry(rr - .003, 28), lensSheen); sh.position.set(0, S, zl + dir * .0003); if (dir < 0) sh.rotation.y = Math.PI; g.add(sh); }
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(rr + .0006, rr + .0006, depth + .001, 24, 1, true), recessMat); wall.rotation.x = Math.PI / 2; wall.position.set(0, S, zEnd - dir * depth / 2); g.add(wall);
}
// cylinder standing along y (turrets), or lying along x when side is set
function Cy(g, c, r, y0, y1, x, z, seg = 16, side = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, Math.abs(y1 - y0), seg), pmat(c));
  if (side) { m.rotation.z = Math.PI / 2; m.position.set(x + (y0 + y1) / 2, z.y, z.z); } else m.position.set(x, (y0 + y1) / 2, z);
  g.add(m); return m;
}
// 10x sniper scope: big objective bell, smooth main tube, turret saddle with elevation / windage / parallax knobs,
// power ring and rubber eyecup at the back, two rings down to the rail, and recessed coated lenses at both ends
function scopeSight(g, z, base, S) {
  const r = .0165, F = z - .24, B = z + .22;
  // objective: bell, taper into the tube, knurled front rim
  // open-ended shells at both ends: a closed cylinder's end cap sat in front of the lens and looked like a lens cap
  const shell = (c, r0, r1, z0, z1) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, z1 - z0, 28, 1, true), pmat(c)); m.rotation.x = Math.PI / 2; m.position.set(0, S, (z0 + z1) / 2); g.add(m); return m; };
  const face = (c, r0, r1, zz, dir) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 28), pmat(c)); m.position.set(0, S, zz); if (dir < 0) m.rotation.y = Math.PI; g.add(m); };
  shell(GC.dark, .029, .029, F, F + .06);                                     // bell
  Cz(g, GC.dark, .029, F + .06, F + .095, S, 28, 0, r);                       // taper (wide at the front)
  shell(GC.black, .0305, .0305, F, F + .012);                                 // front rim
  face(GC.black, .0254, .0305, F, -1);                                        // rim face round the lens
  for (let k = 0; k < 3; k++) Cz(g, GC.black, .0295, F + .02 + k * .012, F + .026 + k * .012, S, 28);   // grip bands
  scopeLens(g, F, .025, -1, S, lensMatAmber, .014);
  // main tube
  Cz(g, GC.dark, r, F + .095, B - .1, S, 24);
  // turret saddle and knobs
  Cz(g, GC.dark, r + .005, z - .035, z + .035, S, 24);
  Bx(g, GC.dark, .03, S, S + r + .006, z - .03, z + .03);
  const knob = (pos, side, sgn) => {
    // base, knurled cap, a white zero line
    if (!side) { Cy(g, GC.dark, .0125, S + r + .004, S + r + .012, 0, pos, 18); Cy(g, GC.black, .0135, S + r + .012, S + r + .026, 0, pos, 18); Bx(g, 0xE8E2D0, .002, S + r + .012, S + r + .026, pos - .0136, pos - .0128); }
    else { const c = { y: S, z: pos }; Cy(g, GC.dark, .011, 0, sgn * .009, sgn * (r + .002), c, 18, true); Cy(g, GC.black, .012, 0, sgn * .014, sgn * (r + .011), c, 18, true); }
  };
  knob(z, false);
  knob(z, true, 1);                                                           // windage, right
  { const c = { y: S, z: z + .005 }; Cy(g, GC.black, .009, 0, -.012, -(r + .004), c, 16, true); }   // parallax, left
  // eyepiece: power ring with ribs, then the ocular bell and a soft rubber eyecup
  Cz(g, GC.dark, r + .002, B - .1, B - .085, S, 24, 0, .021);
  Cz(g, GC.black, .0215, B - .085, B - .055, S, 24);
  for (let k = 0; k < 5; k++) Cz(g, GC.dark, .0225, B - .082 + k * .006, B - .079 + k * .006, S, 24);
  Bx(g, 0xE0603A, .003, S + .021, S + .024, B - .072, B - .066);            // magnification mark
  Cz(g, GC.dark, .0215, B - .055, B - .02, S, 24, 0, .0235);
  shell(GC.black, .0245, .026, B - .02, B);                                   // eyecup
  face(GC.black, .0204, .026, B, 1);                                          // eyecup lip
  scopeLens(g, B, .02, 1, S, lensMatScope, .016);
  // rings and bases
  for (const dz of [-.075, .1]) {
    Cz(g, GC.metal, r + .004, z + dz - .011, z + dz + .011, S, 24);
    Bx(g, GC.metal, .028, base, S - r + .002, z + dz - .011, z + dz + .011);
    Bx(g, GC.metal, .036, base, base + .007, z + dz - .013, z + dz + .013);
    for (const x of [-.0185, .0185]) Cy(g, GC.black, .0028, base + .0015, base + .0055, x, z + dz, 8, false);   // cross-bolt heads
  }
  return B;
}
// spent casing for ejection fx
const brassGeo = new THREE.CylinderGeometry(.0045, .0045, .022, 6);

/* ================= GUN BUILDERS =================
   Every part touches the next. Barrel parts go in R.bar (barrel attachments move them), the stock in R.stock.
   Returned s = { z: optic position, base: rail top, rear: [z, y], front: [z, y] } for the sights. */
const BUILD = {
  ar(g, R) {
    R.S = .102;
    Bx(g, GC.dark, .056, .004, .052, -.17, .13);                       // upper
    Bx(g, GC.body, .052, -.045, .004, -.12, .1);                       // lower
    Bx(g, GC.body, .05, -.08, -.045, -.125, -.05);                     // magwell
    const top = rail(g, .052, -.17, .13, .03);
    Bx(g, GC.black, .003, .014, .04, -.04, .03, .0285); Bx(g, GC.metal, .006, .02, .036, .045, .065, .03); // port, forward assist
    R.bolt = Bx(g, GC.metal, .03, .046, .058, .13, .165);
    Cz(g, GC.dark, .016, .1, .3, .024);
    Bx(R.stock, GC.poly, .044, -.032, .044, .2, .36); Bx(R.stock, GC.poly, .03, .044, .056, .21, .34); Bx(R.stock, GC.black, .05, -.04, .056, .36, .38);
    Grip(g, GC.dark, .034, .1, .044, -.04, .065, -.32);
    trig(g, -.045, .005);
    magazine(g, R, -.08, -.087, [0, 1, 2, 3].map(k => [GC.metal, .033, .043, .064 - k * .001, .06 + k * .08]));
    Bx(g, GC.poly, .064, -.024, .052, -.48, -.17);
    for (let k = 0; k < 6; k++) Bx(g, GC.black, .066, .0, .02, -.45 + k * .045, -.43 + k * .045);
    rail(g, .052, -.47, -.18, .03, GC.poly);
    Cz(R.bar, GC.metal, .011, -.68, -.48, .03); Bx(R.bar, GC.dark, .022, .016, .06, -.6, -.575);
    R.mdev = Cz(R.bar, GC.dark, .015, -.73, -.68, .03, 8); R.barEnd = -.68;
    R.muzzle = -.73; R.muzzleY = .03; R.muzzleR = .012; R.barrel = { r: .011, y: .03, z0: -.48 };
    R.fore = { x: 0, y: -.026, z: -.33 }; R.grip = { x: 0, y: -.085, z: .085 }; R.eject = { x: .035, y: .028, z: -.005 };
    return { z: .0, base: top, rear: [.1, top], front: [-.587, .06] };
  },
  bulldog(g, R) {
    // bullpup: magazine behind the grip, one long shell with a high rail
    R.S = .124; R.rearZ = .03; R.relief = .24;
    Bx(g, GC.od, .066, -.065, .045, -.26, .3);
    Bx(g, GC.od, .058, .045, .075, -.3, .07);
    const top = rail(g, .075, -.29, .05, .03);
    Bx(g, GC.od, .05, .045, .07, .1, .28);                                   // cheek riser
    Bx(g, GC.od, .064, -.035, .045, -.38, -.26);                             // handguard
    for (let k = 0; k < 3; k++) Bx(g, GC.black, .066, -.01, .01, -.37 + k * .035, -.355 + k * .035);
    Bx(g, GC.black, .004, -.02, .02, .08, .16, .0335); R.eject = { x: .04, y: .0, z: .12 };
    Cz(R.bar, GC.metal, .012, -.52, -.38, .015); R.mdev = Cz(R.bar, GC.dark, .017, -.56, -.52, .015, 8); R.barEnd = -.52;
    Grip(g, GC.dark, .034, .1, .044, -.065, -.12, -.25);
    trig(g, -.065, -.175);
    magazine(g, R, -.065, .1, [[GC.metal, .033, .1, .064, .12], [GC.metal, .033, .03, .062, .18]]);
    Bx(R.stock, GC.black, .07, -.07, .05, .3, .32);
    R.bolt = Bx(g, GC.metal, .012, .0, .016, -.1, -.07, -.036);
    R.muzzle = -.56; R.muzzleY = .015; R.muzzleR = .013; R.fore = { x: 0, y: -.04, z: -.31 }; R.grip = { x: 0, y: -.11, z: -.1 }; R.barrel = { r: .012, y: .015, z0: -.38 };
    return { z: -.1, base: top, rear: [.03, top], front: [-.27, top] };
  },
  kestrel(g, R) {
    // stamped rifle: tan furniture, curved mag, gas tube over the barrel, rear sight up front
    R.S = .088; R.rearZ = -.13; R.relief = .32;
    Bx(g, GC.metal, .054, -.03, .045, -.2, .12);
    Cz(g, GC.metal, .026, -.15, .12, .045, 14); Bx(g, GC.metal, .052, .045, .058, -.14, .12);   // dust cover
    Bx(g, GC.black, .003, .0, .035, -.08, .02, .0275);
    Bx(g, GC.tan, .06, -.032, .03, -.42, -.2);                                // lower handguard
    Bx(g, GC.tan, .044, .03, .06, -.38, -.2);                                 // gas tube cover
    Cz(g, GC.metal, .009, -.5, -.38, .046);
    Bx(g, GC.metal, .03, .03, .06, -.2, -.14);                                // rear sight block
    Bx(R.bar, GC.metal, .024, .005, .06, -.52, -.48);                         // gas block
    Cz(R.bar, GC.metal, .011, -.68, -.42, .012); Bx(R.bar, GC.metal, .018, .012, .05, -.63, -.6);
    R.mdev = Cz(R.bar, GC.dark, .015, -.72, -.68, .012, 8); R.barEnd = -.68;
    magazine(g, R, -.03, -.09, [0, 1, 2, 3, 4, 5].map(k => [GC.tan, .034, .03, .066 - k * .001, .08 + k * .085]));   // banana mag, curving forward
    Grip(g, GC.tan, .032, .095, .042, -.03, .075, -.3);
    trig(g, -.03, .02, GC.metal);
    woodStock(R.stock, .044, [[.105, .04], [.36, .047], [.36, -.076], [.25, -.06], [.105, -.042]], GC.tan); Bx(R.stock, GC.black, .048, -.08, .05, .36, .38);   // stock flares out towards the butt
    R.bolt = Bx(g, GC.metal, .014, .02, .034, .0, .03, .034);
    R.muzzle = -.72; R.muzzleY = .012; R.muzzleR = .011; R.fore = { x: 0, y: -.036, z: -.3 }; R.grip = { x: 0, y: -.08, z: .1 }; R.barrel = { r: .011, y: .012, z0: -.42 };
    R.eject = { x: .035, y: .02, z: -.03 };
    R.railOn = () => rail(g, .058, .1, -.12, .03);
    return { z: -.02, base: .07, rear: [-.17, .06], front: [-.615, .05] };
  },
  smg(g, R) {
    R.S = .076;
    Bx(g, GC.body, .054, -.035, .04, -.25, .1);
    const top = rail(g, .04, .09, -.14, .028);
    Bx(g, GC.black, .003, .0, .03, -.05, .01, .0275);
    Bx(g, GC.dark, .058, -.03, .028, -.36, -.25);
    for (let k = 0; k < 3; k++) Bx(g, GC.black, .06, -.012, .01, -.35 + k * .035, -.335 + k * .035);
    Cz(R.bar, GC.metal, .01, -.44, -.36, .012); Bx(R.bar, GC.dark, .024, .002, .04, -.4, -.37);
    Bx(g, GC.body, .042, -.06, -.035, -.12, -.07);
    magazine(g, R, -.06, -.095, [[GC.metal, .03, .16, .044, .14]]);
    Grip(g, GC.dark, .032, .09, .042, -.035, .075, -.25);
    trig(g, -.035, .005);
    for (const x of [-.018, .018]) Cz(R.stock, GC.metal, .005, .1, .32, .0, 6, x);
    Bx(R.stock, GC.dark, .05, -.04, .03, .31, .33);
    R.bolt = Bx(g, GC.metal, .012, .01, .024, -.21, -.18, -.034);
    R.muzzle = -.44; R.muzzleY = .012; R.muzzleR = .01; R.fore = { x: 0, y: -.04, z: -.3 }; R.grip = { x: 0, y: -.08, z: .09 }; R.barrel = { r: .01, y: .012, z0: -.36 };
    R.eject = { x: .034, y: .015, z: -.02 };
    return { z: -.03, base: top, rear: [.09, top], front: [-.385, .04] };
  },
  wasp(g, R) {
    // compact PDW: the magazine runs up through the pistol grip, a short handguard and a sliding wire stock
    R.S = .082;
    Bx(g, GC.dark, .05, -.03, .044, -.25, .075);                              // receiver
    Bx(g, GC.body, .046, -.054, -.03, -.25, -.08);                            // handguard under the barrel
    for (let k = 0; k < 3; k++) Bx(g, GC.black, .048, -.047, -.039, -.235 + k * .045, -.21 + k * .045);  // grip ribs
    const top = rail(g, .044, .065, -.235, .026);
    Bx(g, GC.black, .003, .0, .03, -.07, -.015, .0255);                       // ejection port
    Cz(g, GC.dark, .016, -.27, -.25, .014, 12);                               // barrel nut
    Cz(R.bar, GC.metal, .0105, -.34, -.27, .014); R.mdev = Cz(R.bar, GC.black, .0145, -.37, -.34, .014, 8); R.barEnd = -.34;
    Grip(g, GC.dark, .034, .1, .046, -.03, .06, -.26);                        // pistol grip
    magazine(g, R, -.03, .06, [[GC.black, .026, .17, .032, -.26]]);           // through the grip, poking out below
    trig(g, -.03, .0);
    for (const x of [-.017, .017]) Cz(R.stock, GC.metal, .0045, .075, .24, .02, 6, x);
    Bx(R.stock, GC.dark, .046, -.025, .05, .24, .262); Bx(R.stock, GC.black, .05, -.03, .054, .262, .272);
    R.bolt = Bx(g, GC.metal, .012, .012, .026, -.17, -.14, -.031);
    R.muzzle = -.37; R.muzzleY = .014; R.muzzleR = .011; R.fore = { x: 0, y: -.054, z: -.17 }; R.grip = { x: 0, y: -.08, z: .075 }; R.barrel = { r: .0105, y: .014, z0: -.27 };
    R.eject = { x: .03, y: .02, z: -.04 };
    return { z: -.07, base: top, rear: [.055, top], front: [-.225, top] };
  },
  brute(g, R) {
    R.S = .084;   // sight line close to the rail, so optics sit down on the gun
    Bx(g, GC.body, .06, -.04, .045, -.26, .1);
    const top = rail(g, .045, .09, -.22, .028);
    Bx(g, GC.black, .003, .0, .035, -.06, .0, .0305);
    Bx(g, GC.dark, .062, -.042, .028, -.38, -.26);                          // handguard tall enough to take the barrel
    for (let k = 0; k < 3; k++) Bx(g, GC.black, .064, -.03, -.01, -.37 + k * .04, -.35 + k * .04);
    Cz(R.bar, GC.metal, .011, -.47, -.37, .012); Cz(R.bar, GC.dark, .016, -.395, -.378, .012, 12);   // barrel and nut, seated in the handguard
    Bx(g, GC.body, .048, -.065, -.04, -.13, -.06);
    magazine(g, R, -.065, -.095, [[GC.dark, .036, .15, .05, .05]]);
    Grip(g, GC.dark, .034, .09, .044, -.04, .07, -.28);
    trig(g, -.04, .005);
    for (const x of [-.022, .022]) Bx(R.stock, GC.dark, .01, -.022, .0, .1, .32, x);
    Bx(R.stock, GC.dark, .055, -.05, .02, .31, .335);
    R.bolt = Bx(g, GC.metal, .012, .015, .028, -.2, -.17, -.036);
    R.muzzle = -.47; R.muzzleY = .012; R.muzzleR = .012; R.fore = { x: 0, y: -.047, z: -.32 }; R.grip = { x: 0, y: -.085, z: .09 }; R.barrel = { r: .011, y: .012, z0: -.38 };
    R.eject = { x: .036, y: .02, z: -.03 };
    return { z: -.05, base: top, rear: [.09, top], front: [-.21, top] };
  },
  lmg(g, R) {
    R.S = .11;
    Bx(g, GC.body, .078, -.045, .05, -.2, .16);
    const cover = new THREE.Group(); cover.position.set(0, .05, .0); g.add(cover); R.bolt = cover; R.coverPivot = true;
    Bx(cover, GC.dark, .074, 0, .02, -.2, 0); Bx(cover, GC.metal, .02, .02, .03, -.18, -.02);
    const top = rail(g, .05, .16, .01, .03);
    Bx(g, GC.black, .003, -.02, .03, -.12, -.03, .0395);
    Cz(g, GC.dark, .03, -.5, -.2, .01, 10);
    for (let k = 0; k < 5; k++) Cz(g, GC.black, .031, -.47 + k * .055, -.455 + k * .055, .01, 10);
    Cz(R.bar, GC.metal, .013, -.76, -.5, .01); Bx(R.bar, GC.dark, .024, .0, .062, -.735, -.71);
    R.mdev = Cz(R.bar, GC.dark, .02, -.8, -.76, .01, 6); R.barEnd = -.76;
    for (const x of [-.02, .02]) Bx(R.bar, GC.metal, .01, -.042, -.03, -.68, -.44, x);
    Bx(R.bar, GC.dark, .05, -.044, .0, -.7, -.66);                         // bipod clamp round the barrel
    Bx(R.bar, GC.dark, .052, -.044, -.017, -.47, -.43);                     // hinge block under the shroud
    const box = new THREE.Group(); box.position.set(-.01, -.045, -.075); g.add(box);
    Bx(box, GC.poly, .09, -.11, 0, -.055, .055); Bx(box, GC.poly, .02, -.03, 0, -.03, .03, -.05);
    R.mag = box; R.magH = .11; R.magBot = { y: -.11, z: 0, rx: 0 };
    for (let k = 0; k < 4; k++) Bx(g, GC.brass, .012, -.04 + k * .012, -.03 + k * .012, -.1 + k * .008, -.09 + k * .008, .045);
    Grip(g, GC.dark, .034, .1, .044, -.045, .1, -.3);
    trig(g, -.045, .035);
    Bx(R.stock, GC.dark, .05, -.05, .04, .16, .42); Bx(R.stock, GC.black, .055, -.06, .045, .42, .44);
    Bx(g, GC.metal, .012, .04, .1, -.32, -.29); Bx(g, GC.metal, .012, .09, .1, -.32, -.2); Bx(g, GC.metal, .012, .05, .1, -.215, -.2);  // carry handle
    R.muzzle = -.8; R.muzzleY = .01; R.muzzleR = .014; R.fore = { x: 0, y: -.045, z: -.33 }; R.grip = { x: 0, y: -.1, z: .12 }; R.barrel = { r: .013, y: .01, z0: -.5 };
    R.eject = { x: .045, y: .0, z: -.07 };
    return { z: .08, base: top, rear: [.13, top], front: [-.722, .062] };
  },
  anvil(g, R) {
    R.S = .124;
    Bx(g, GC.od, .088, -.055, .06, -.22, .18);
    const cover = new THREE.Group(); cover.position.set(0, .06, .0); g.add(cover); R.bolt = cover; R.coverPivot = true;
    Bx(cover, GC.dark, .084, 0, .022, -.22, 0);
    const top = rail(g, .06, .18, .02, .032);
    Bx(g, GC.black, .003, -.02, .035, -.14, -.03, .0445);
    Cz(g, GC.dark, .036, -.58, -.22, .015, 12);
    for (let k = 0; k < 7; k++) Cz(g, GC.black, .037, -.55 + k * .045, -.535 + k * .045, .015, 12);
    Cz(R.bar, GC.metal, .016, -.86, -.58, .015); Bx(R.bar, GC.dark, .026, .0, .076, -.83, -.81);
    R.mdev = Cz(R.bar, GC.dark, .024, -.92, -.86, .015, 6); R.barEnd = -.86;
    for (const x of [-.026, .026]) Bx(R.bar, GC.metal, .012, -.05, -.036, -.8, -.5, x);
    Bx(R.bar, GC.dark, .066, -.052, .002, -.81, -.77); Bx(R.bar, GC.dark, .066, -.052, -.018, -.55, -.51);   // bipod clamp and hinge
    const box = new THREE.Group(); box.position.set(-.012, -.055, -.09); g.add(box);
    Bx(box, GC.od, .11, -.13, 0, -.065, .065); Bx(box, GC.dark, .03, -.03, 0, -.03, .03, -.06);
    R.mag = box; R.magH = .13; R.magBot = { y: -.13, z: 0, rx: 0 };
    for (let k = 0; k < 4; k++) Bx(g, GC.brass, .014, -.05 + k * .014, -.036 + k * .014, -.12 + k * .01, -.108 + k * .01, .055);
    Grip(g, GC.dark, .036, .1, .044, -.055, .12, -.3);
    trig(g, -.055, .055);
    Bx(R.stock, GC.dark, .06, -.065, .05, .18, .46); Bx(R.stock, GC.black, .065, -.075, .055, .46, .485);
    Bx(g, GC.metal, .014, .05, .115, -.36, -.33); Bx(g, GC.metal, .014, .105, .115, -.36, -.22); Bx(g, GC.metal, .014, .06, .115, -.235, -.22);
    R.muzzle = -.92; R.muzzleY = .015; R.muzzleR = .016; R.fore = { x: 0, y: -.07, z: -.38 }; R.grip = { x: 0, y: -.11, z: .14 }; R.barrel = { r: .016, y: .015, z0: -.58 };
    R.eject = { x: .05, y: .0, z: -.08 };
    return { z: .1, base: top, rear: [.15, top], front: [-.82, .076] };
  },
  shotgun(g, R) {
    R.S = .064;
    Bx(g, GC.body, .056, -.04, .042, -.12, .12);
    Bx(g, GC.black, .003, -.01, .025, -.06, .02, .0285); R.eject = { x: .034, y: .01, z: -.02 };
    Cz(g, GC.dark, .015, -.6, -.12, -.014);
    Cz(R.bar, GC.metal, .017, -.68, -.12, .024); Bx(R.bar, GC.dark, .012, .041, .046, -.66, -.14);
    R.pump = Bx(g, GC.wood, .06, -.042, .012, -.37, -.21);
    for (let k = 0; k < 5; k++) Bx(R.pump, GC.dark, .062, .004, .007, -.06 + k * .03, -.052 + k * .03);
    trig(g, -.04, .03);
    woodStock(R.stock, .045, [[.11, .036], [.2, .022], [.418, .024], [.418, -.104], [.22, -.062], [.15, -.064], [.11, -.04]]);
    Bx(R.stock, GC.black, .05, -.108, .03, .415, .432);
    R.muzzle = -.68; R.muzzleY = .024; R.muzzleR = .017; R.fore = { x: 0, y: -.048, z: -.29 }; R.grip = { x: 0, y: -.065, z: .16 }; R.barrel = { r: .017, y: .024, z0: -.12 }; R.barStretch = -.12;
    R.shotFront = true;
    R.railOn = () => rail(g, .042, .1, -.08, .028);
    return { z: .0, base: .054, rear: [.09, .042], front: [-.655, .046] };
  },
  riot(g, R) {
    R.S = .09;
    Bx(g, GC.dark, .06, -.04, .05, -.18, .14);
    const top = rail(g, .05, .12, -.15, .028);
    Bx(g, GC.black, .003, -.005, .035, -.06, .02, .0305); R.eject = { x: .036, y: .015, z: -.02 };
    Bx(g, GC.poly, .066, -.038, .04, -.42, -.18);
    for (let k = 0; k < 4; k++) Bx(g, GC.black, .068, .0, .02, -.41 + k * .05, -.39 + k * .05);
    Cz(R.bar, GC.metal, .017, -.6, -.42, .016); R.mdev = Cz(R.bar, GC.dark, .022, -.62, -.6, .016, 8); R.barEnd = -.6;
    magazine(g, R, -.04, -.085, [[GC.poly, .05, .12, .085, .12]]);
    Grip(g, GC.dark, .034, .1, .044, -.04, .085, -.3);
    trig(g, -.04, .02);
    Bx(R.stock, GC.poly, .05, -.045, .045, .14, .34); Bx(R.stock, GC.black, .054, -.055, .05, .34, .36);
    R.bolt = Bx(g, GC.metal, .012, .02, .034, -.1, -.07, -.036);
    R.muzzle = -.62; R.muzzleY = .016; R.muzzleR = .018; R.fore = { x: 0, y: -.05, z: -.3 }; R.grip = { x: 0, y: -.09, z: .1 }; R.barrel = { r: .017, y: .016, z0: -.42 };
    return { z: -.02, base: top, rear: [.1, top], front: [-.4, .04] };
  },
  coach(g, R) {
    // side-by-side double barrel; the barrels hinge down to reload
    const S = R.S = .066; R.rearZ = .06; R.relief = .2; R.ironsDone = true;
    Bx(g, GC.metal, .07, -.035, .04, -.06, .08);
    const pv = new THREE.Group(); pv.position.set(0, -.02, -.06); g.add(pv); R.hinge = pv;
    const bg = new THREE.Group(); pv.add(bg);
    for (const x of [-.018, .018]) Cz(bg, GC.dark, .017, -.5, .0, .045, 14, x);
    Bx(bg, GC.dark, .012, .062, .068, -.5, .0);
    { const fe = Cz(bg, GC.wood, .021, -.3, -.045, .011, 20); fe.scale.set(1.38, 1, 1.02); }   // rounded wooden forend
    Cz(bg, GC.wood, .021, -.045, -.035, .011, 20, 0, .016).scale.set(1.38, 1, 1.02);
    Bx(bg, 0xE8E2C0, .005, .068, .086, -.49, -.484);
    Bx(g, GC.metal, .012, .04, .066, .05, .07);
    Bx(g, GC.metal, .008, .04, .06, .07, .085);                                   // hammer spur
    trig(g, -.035, .035, GC.metal);
    woodStock(R.stock, .047, [[.07, .038], [.17, .024], [.418, .006], [.418, -.118], [.2, -.064], [.12, -.06], [.07, -.034]]);
    Bx(R.stock, GC.dark, .052, -.122, .012, .415, .432);
    R.muzzle = -.56; R.muzzleY = .025; R.muzzleR = .036; R.fore = { x: 0, y: -.045, z: -.24 }; R.grip = { x: 0, y: -.06, z: .12 }; R.barrel = null;
    return { z: .0, base: .07, rear: [.06, .07], front: [-.49, .07] };
  },
  dmr(g, R) {
    // wooden-stocked battle rifle
    R.S = .102;
    Bx(g, GC.wood, .054, -.06, .02, -.38, .12);                                    // stock body and forend
    Bx(g, GC.metal, .048, .02, .06, -.2, .1);                                      // receiver
    Bx(g, GC.wood, .044, .02, .046, -.38, -.2);                                    // upper handguard
    Bx(g, GC.black, .003, .03, .055, -.12, -.04, .0245); R.eject = { x: .03, y: .05, z: -.08 };
    Cz(g, GC.metal, .009, -.5, -.38, -.025);
    Cz(R.bar, GC.metal, .011, -.68, -.38, .033); Cz(R.bar, GC.metal, .0155, -.664, -.632, .033, 14); Bx(R.bar, GC.metal, .009, .044, .057, -.655, -.641);   // front sight collar and riser (was a big square block)
    R.mdev = Cz(R.bar, GC.dark, .016, -.73, -.68, .033, 8); R.barEnd = -.68;
    magazine(g, R, -.06, -.04, [[GC.metal, .036, .09, .07, .08]]);
    trig(g, -.06, .065, GC.metal);
    woodStock(R.stock, .05, [[.11, .02], [.2, .018], [.418, .036], [.418, -.112], [.22, -.084], [.15, -.08], [.11, -.06]]);
    Bx(R.stock, GC.black, .054, -.116, .042, .415, .432);
    R.bolt = Bx(g, GC.metal, .014, .03, .046, -.08, -.04, .03);
    R.muzzle = -.73; R.muzzleY = .033; R.muzzleR = .012; R.fore = { x: 0, y: -.065, z: -.3 }; R.grip = { x: 0, y: -.07, z: .14 }; R.barrel = { r: .011, y: .033, z0: -.38 };
    R.railOn = () => rail(g, .06, .08, -.14, .03);
    return { z: -.04, base: .072, rear: [.08, .06], front: [-.645, .056] };
  },
  sniper(g, R) {
    R.S = .094; R.rearZ = .2;
    Bx(g, GC.wood, .048, -.045, .01, -.5, -.1);
    Bx(g, GC.wood, .05, -.07, .012, -.1, .12);
    woodStock(R.stock, .05, [[.11, .012], [.2, .012], [.23, .042], [.36, .044], [.418, .04], [.418, -.112], [.21, -.09], [.15, -.088], [.11, -.07]]);   // with a raised cheek piece
    Bx(R.stock, GC.black, .054, -.116, .046, .415, .432);
    Cz(g, GC.metal, .021, -.16, .1, .02, 14);
    Cz(R.bar, GC.dark, .013, -.76, -.16, .02, 12, 0, .016); R.mdev = Cz(R.bar, GC.metal, .02, -.82, -.76, .02, 8); R.barEnd = -.76;
    for (const x of [-.0205, .0205]) Bx(R.bar, GC.black, .002, .012, .028, -.8, -.775, x);
    magazine(g, R, -.07, -.04, [[GC.metal, .036, .055, .07, 0]]);
    trig(g, -.07, .065, GC.metal);
    const bolt = new THREE.Group(); bolt.position.set(.02, .025, .075); g.add(bolt);
    Bx(bolt, GC.metal, .045, -.005, .005, -.005, .005, .022); const knob = new THREE.Mesh(new THREE.SphereGeometry(.011, 10, 8), pmat(GC.black)); knob.position.set(.046, 0, 0); bolt.add(knob);
    R.bolt = bolt; R.eject = { x: .03, y: .03, z: -.02 };
    R.muzzle = -.82; R.muzzleY = .02; R.muzzleR = .014; R.fore = { x: 0, y: -.05, z: -.3 }; R.grip = { x: 0, y: -.075, z: .15 }; R.barrel = { r: .013, y: .02, z0: -.16, c: GC.dark };
    return { z: -.04, base: .041, rear: [.1, .041], front: [-.7, .033] };
  },
  hammer(g, R) {
    // chassis sniper: tan aluminium, skeleton stock, fluted barrel
    R.S = .098; R.rearZ = .19;
    Bx(g, GC.tan, .05, -.035, .02, -.2, .1);
    Cz(g, GC.metal, .021, -.18, .1, .022, 14);
    const top = rail(g, .043, .1, -.18, .028);
    Bx(g, GC.tan, .056, -.035, .02, -.52, -.2);
    for (let k = 0; k < 4; k++) Bx(g, GC.black, .058, -.02, .005, -.48 + k * .07, -.46 + k * .07);
    Cz(R.bar, GC.dark, .012, -.8, -.52, .022); R.mdev = Cz(R.bar, GC.metal, .019, -.86, -.8, .022, 6); R.barEnd = -.8;
    magazine(g, R, -.035, -.07, [[GC.dark, .04, .06, .075, 0]]);
    Grip(g, GC.dark, .034, .09, .044, -.035, .09, -.3);
    trig(g, -.035, .03);
    Bx(R.stock, GC.tan, .016, .0, .022, .1, .36); Bx(R.stock, GC.tan, .016, -.085, -.065, .16, .36); Bx(R.stock, GC.tan, .016, -.065, .0, .1, .16);
    Bx(R.stock, GC.black, .04, -.095, .03, .36, .38); Bx(R.stock, GC.dark, .03, .022, .045, .2, .32);
    const bolt = new THREE.Group(); bolt.position.set(.02, .027, .065); g.add(bolt);
    Bx(bolt, GC.metal, .04, -.005, .005, -.005, .005, .02); const knob = new THREE.Mesh(new THREE.SphereGeometry(.012, 10, 8), pmat(GC.black)); knob.position.set(.042, 0, 0); bolt.add(knob);
    R.bolt = bolt; R.eject = { x: .03, y: .03, z: -.02 };
    R.muzzle = -.86; R.muzzleY = .022; R.muzzleR = .014; R.fore = { x: 0, y: -.045, z: -.36 }; R.grip = { x: 0, y: -.085, z: .11 }; R.barrel = { r: .012, y: .022, z0: -.52, c: GC.dark };
    return { z: -.04, base: top, rear: [.08, top], front: [-.7, .03] };
  },
  pistol(g, R, o) { return pistolKit(g, R, o, { z0: -.15, slideC: GC.dark, frameC: GC.body, gripC: GC.body, gripH: .1, S: .05 }); },
  trio(g, R, o) { return pistolKit(g, R, o, { z0: -.17, slideC: GC.black, frameC: GC.od, gripC: GC.od, gripH: .1, S: .052, longMag: .04 }); },
  magnum(g, R, o) { return pistolKit(g, R, o, { z0: -.2, slideC: GC.metal, frameC: GC.metal, gripC: GC.black, gripH: .108, S: .064, big: true }); },
  mp(g, R, o) {
    const s = pistolKit(g, R, o, { z0: -.16, slideC: GC.dark, frameC: GC.body, gripC: GC.body, gripH: .1, S: .052, longMag: .09 });
    Bx(g, GC.dark, .026, -.06, -.02, -.12, -.09);                            // front grip
    R.mdev = Cz(R.bar, GC.dark, .013, -.21, -.165, .024, 8); R.barEnd = -.165;
    R.muzzle = -.21; R.muzzleR = .012;
    return s;
  },
  revolver(g, R) {
    const S = R.S = .07; R.rearZ = .03; R.relief = .26; R.ironsDone = true;
    Bx(g, GC.metal, .03, -.03, .05, -.06, .05);
    Bx(g, GC.metal, .022, .05, .06, -.06, .05);                               // top strap
    R.cyl = Cz(g, GC.metal, .024, -.04, .02, .014, 8);
    for (let k = 0; k < 6; k++) { const a = k * TAU / 6, c = new THREE.Mesh(new THREE.CircleGeometry(.0045, 8), pmat(GC.black)); c.position.set(Math.cos(a) * .014, .014 + Math.sin(a) * .014, .0205); R.cyl.add(c); c.position.set(Math.cos(a) * .014, .0305, Math.sin(a) * .014); c.rotation.x = -Math.PI / 2; }
    Cz(R.bar, GC.metal, .01, -.25, -.06, .034); Bx(R.bar, GC.metal, .016, .0, .024, -.24, -.06);
    Bx(R.bar, GC.metal, .004, .044, S, -.24, -.228); Bx(R.bar, 0xE8A040, .004, S - .004, S, -.229, -.227);
    Grip(g, GC.wood, .036, .1, .044, -.025, .04, -.42);                          // grip panels stand proud of the frame (same width flickered)
    trig(g, -.03, .0, GC.metal);
    Bx(g, GC.dark, .008, .05, .057, .046, .062); Bx(g, GC.dark, .008, .053, .058, .058, .072);   // hammer kept below the sight notch, spur pointing back
    for (const x of [-.0105, .0105]) Bx(g, GC.metal, .007, .06, S, .03, .04, x);
    R.muzzle = -.25; R.muzzleY = .034; R.muzzleR = .009; R.fore = null; R.grip = { x: 0, y: -.07, z: .075 }; R.barrel = { r: .01, y: .034, z0: -.06 }; R.barStretch = -.06; R.laserTop = .0;
    R.eject = null;
    return { z: .0, base: .06, rear: [.035, .06], front: [-.234, .044], pistol: true };
  },
  rpg(g, R) {
    // shoulder-fired tube with a flared venturi, pistol grip and front grip below, flip-up sights on top, warhead up front
    const y = .03, r = .042;
    R.S = .124; R.rearZ = .14; R.relief = .24;
    Cz(g, GC.od, r, -.5, .32, y, 18);                                         // launch tube
    Cz(g, GC.dark, r + .006, -.52, -.46, y, 18);                              // muzzle band
    Cz(g, GC.dark, r + .005, .08, .14, y, 18);                                // rear band
    Cz(g, GC.dark, r + .002, .32, .44, y, 18, 0, r + .024);                   // venturi
    { const ring = new THREE.Mesh(new THREE.RingGeometry(r - .004, r + .026, 20), pmat(GC.black)); ring.position.set(0, y, .441); g.add(ring); }
    Bx(g, GC.od, .03, y - r - .012, y - r + .006, -.3, .1);                   // under-rail on the tube
    Bx(g, GC.dark, .036, -.045, y - r - .01, -.05, .08);                      // trigger housing
    Grip(g, GC.dark, .034, .1, .046, -.045, .07, -.25);                       // pistol grip
    trig(g, -.045, .0);
    Hang(g, GC.dark, .03, .085, .036, y - r - .01, -.22, .08);                // front grip
    Bx(g, GC.dark, .012, y + r - .006, y + r + .006, -.31, -.27); Bx(g, GC.dark, .012, y + r - .006, y + r + .006, .1, .14); // sight mounts
    Cz(g, 0xE0603A, r + .003, .25, .27, y, 18);                               // safety band
    // the loaded rocket: hidden once fired, slid back in on reload
    const wh = new THREE.Group(); wh.position.set(0, y, -.5); g.add(wh);
    Cz(wh, GC.dark, .012, -.34, -.22, 0, 14, 0, .055); Cz(wh, GC.tan, .055, -.22, -.1, 0, 14); Cz(wh, GC.tan, .055, -.1, -.045, 0, 14, 0, .026); Cz(wh, GC.dark, .025, -.045, .02, 0, 10);
    R.warhead = wh;
    R.muzzle = -.52; R.muzzleY = y; R.muzzleR = .05; R.fore = { x: 0, y: -.08, z: -.215 }; R.grip = { x: 0, y: -.095, z: .085 };
    R.barrel = null; R.eject = null;
    return { z: -.1, base: y + r + .006, rear: [.12, y + r + .006], front: [-.29, y + r + .006] };
  },
  atomizer(g, R) {
    // a stubby ray pistol: finned body, glowing coils and a dish emitter
    const S = R.S = .07; R.rearZ = .05; R.relief = .27; R.ironsDone = true;
    const glow = new THREE.MeshBasicMaterial({ color: 0x8CFF6A });
    Cz(g, 0xB24A2E, .034, -.14, .06, .02, 12);
    for (let k = 0; k < 3; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.038, .007, 6, 16), glow); ring.position.set(0, .02, -.1 + k * .05); g.add(ring); }
    Cz(g, GC.metal, .016, -.23, -.14, .02, 10);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(.045, .015, .04, 14), pmat(0xD9D2C2)); dish.rotation.x = -Math.PI / 2; dish.position.set(0, .02, -.25); g.add(dish);
    const core = new THREE.Mesh(new THREE.SphereGeometry(.014, 10, 8), glow); core.position.set(0, .02, -.265); g.add(core);
    Bx(g, 0xB24A2E, .008, .05, .08, -.1, .04); Bx(g, 0xB24A2E, .07, .016, .024, -.03, .07);
    Grip(g, GC.dark, .03, .1, .045, -.01, .065, -.25);
    trig(g, -.012, .01);
    for (const x of [-.01, .01]) Bx(g, GC.dark, .007, .05, S, .045, .055, x);
    Bx(g, GC.dark, .004, .05, S, -.175, -.168); Bx(g, 0x8CFF6A, .004, S - .004, S, -.174, -.17);
    R.muzzle = -.27; R.muzzleY = .02; R.muzzleR = .02; R.fore = null; R.grip = { x: 0, y: -.055, z: .085 }; R.barrel = null; R.eject = null;
    return { z: 0, base: .05, rear: [.05, .05], front: [-.17, .05], pistol: true };
  },
};
// handguns: frame, a slide that runs back over a fixed barrel, three-dot sights, guard and trigger
function pistolKit(g, R, o, P) {
  // the big frame carries a raised rib down the slide, so its sights stand on the rib and the sight line sits higher
  const z0 = P.z0, top = P.S - .008, sh = P.big ? .044 : .038, sBase = P.big ? top + .004 : top, S = R.S = P.big ? P.S + .007 : P.S;
  R.rearZ = .045; R.relief = .28; R.ironsDone = o.optic === 'iron';
  Bx(g, P.frameC, .028, -.02, .006, z0 + .02, .05);                         // frame with dust cover
  for (let k = 0; k < 3; k++) Bx(g, GC.black, .03, -.016, -.012, z0 + .03 + k * .012, z0 + .036 + k * .012);
  Cz(g, GC.metal, P.big ? .01 : .0075, z0 - .003, z0 + .05, top - sh / 2, 10);            // barrel (stays put)
  Bx(g, GC.metal, .016, top - sh / 2 - .006, top - .006, -.045, -.005);    // barrel hood, seen through the port
  const sl = new THREE.Group(); g.add(sl); R.slide = sl;
  Bx(sl, P.slideC, P.big ? .034 : .03, top - sh, top - .012, z0, .06);
  Bx(sl, P.slideC, P.big ? .03 : .026, top - .012, top, z0, .06);
  Bx(sl, GC.black, .004, top - .025, top - .004, -.05, -.002, .0151 + (P.big ? .002 : 0)); // ejection port
  for (let k = 0; k < 5; k++) Bx(sl, GC.black, (P.big ? .036 : .032), top - sh + .006, top - .014, .022 + k * .007, .025 + k * .007);
  if (P.big) Bx(sl, P.slideC, .016, top, top + .004, z0, .04);
  if (o.optic === 'iron') dotSights(sl, .047, z0 + .012, sBase, S, P.big);
  Grip(g, P.gripC, .03, P.gripH, .046, -.004, .05, -.22);
  Bx(g, P.frameC, .02, -.012, .004, .038, .062);                            // beavertail
  trig(g, -.02, -.01, P.frameC === GC.metal ? GC.metal : GC.dark);
  const mh = P.gripH - .02 + (P.longMag || 0);
  const mg = new THREE.Group(); mg.position.set(0, -.012, .052); mg.rotation.x = -.22; g.add(mg);
  Bx(mg, GC.metal, .022, -mh, 0, -.016, .016); Bx(mg, GC.black, .034, -mh - .01, -mh + .001, -.025, .021);   // base plate a little wider than the grip
  R.mag = mg; R.magH = mh; R.magBot = { y: -mh - .01, z: -.002, rx: 0 };
  Bx(g, GC.metal, .004, -.012, -.004, -.0, .02, .0155);                      // slide stop
  R.muzzle = z0 - .003; R.muzzleY = top - sh / 2; R.muzzleR = P.big ? .01 : .0075; R.fore = null; R.grip = { x: 0, y: -.06, z: .062 };
  R.barrel = { r: P.big ? .01 : .0075, y: top - sh / 2, z0: z0 + .01 };
  R.eject = { x: .02, y: top - .01, z: -.03 };
  R.railOn = () => { Bx(sl, GC.black, .022, top, top + .006, -.03, .02); return top + .006; };
  return { z: -.005, base: top, rear: [.047, top], front: [z0 + .012, top], pistol: true };
}

/* ---------- z-fighting guard ----------
   Two parts whose faces lie in the same plane, facing the same way and overlapping, flicker as the depth test
   flips between them. After a gun is built, find every such pair among the axis-aligned boxes and cylinder caps
   and grow the smaller part a hair (0.35 mm) along that axis so one face always wins. */
function deZfight(root, GROW = .00035) {
  const items = [];
  // Parts tilted about x (raked grips, magazines) are compared too: everything is carried into the frame of its
  // own tilt, and only parts sharing exactly the same tilt are compared with each other.
  const rotX = (a, y, z) => [y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  const walk = (o, ox, oy, oz, rx) => {
    for (const c of o.children) {
      const [py, pz] = rotX(rx, c.position.y, c.position.z), cx = ox + c.position.x, cy = oy + py, cz = oz + pz;
      if (c.isMesh) addItem(c, cx, cy, cz, rx);
      else if (!c.rotation.y && !c.rotation.z && c.scale.x === 1 && c.scale.y === 1 && c.scale.z === 1 && c.children.length) walk(c, cx, cy, cz, rx + c.rotation.x);
    }
  };
  const addItem = (m, wx, wy, wz, prx) => {
    // instanced meshes (picket fences) draw many copies from one transform: scaling that would move every copy
    if (m.isInstancedMesh) return;
    const P = m.geometry && m.geometry.parameters, mt = m.material;
    if (!P || !mt || mt.transparent || mt.isMeshBasicMaterial) return;
    const r = m.rotation, s = m.scale;
    let half, flat, key, frame;
    if (P.depth !== undefined && P.width !== undefined) {
      if (r.y || r.z) return;
      frame = prx + r.x;
      half = [P.width / 2 * s.x, P.height / 2 * s.y, P.depth / 2 * s.z]; flat = [1, 1, 1]; key = ['x', 'y', 'z'];
    } else if (P.radiusTop !== undefined && !P.openEnded) {
      const R0 = Math.max(P.radiusTop, P.radiusBottom);
      if (r.y || r.z || prx) return;
      frame = 0;
      if (Math.abs(Math.abs(r.x) - Math.PI / 2) < 1e-6) { half = [R0 * s.x, R0 * s.z, P.height / 2 * s.y]; flat = [0, 0, 1]; key = ['x', 'z', 'y']; }
      else if (!r.x) { half = [R0 * s.x, P.height / 2 * s.y, R0 * s.z]; flat = [0, 1, 0]; key = ['x', 'y', 'z']; }
      else return;
    } else return;
    if (!(half[0] > 1e-6 && half[1] > 1e-6 && half[2] > 1e-6)) return;
    const [fy, fz] = rotX(-frame, wy, wz);
    items.push({ m, c: [wx, fy, fz], half, flat, key, frame });
  };
  walk(root, 0, 0, 0, 0);
  const E = Math.min(2e-5, GROW * .05);
  const lo = (it, a) => it.c[a] - it.half[a], hi = (it, a) => it.c[a] + it.half[a];
  const overlap = (A, B, a) => Math.min(hi(A, a), hi(B, a)) - Math.max(lo(A, a), lo(B, a)) > 1e-5;
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    // sweep along x so big maps don't compare every pair
    items.sort((p, q) => lo(p, 0) - lo(q, 0));
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const A = items[i], B = items[j];
      if (lo(B, 0) > hi(A, 0) + 1e-4) break;
      if (Math.abs(A.frame - B.frame) > 1e-6) continue;
      for (let a = 0; a < 3; a++) {
        if (!A.flat[a] || !B.flat[a]) continue;
        const b = (a + 1) % 3, cc = (a + 2) % 3;
        if (!overlap(A, B, b) || !overlap(A, B, cc)) continue;
        if (Math.abs(lo(A, a) - lo(B, a)) > E && Math.abs(hi(A, a) - hi(B, a)) > E) continue;
        // grow the smaller one
        const vA = A.half[0] * A.half[1] * A.half[2], vB = B.half[0] * B.half[1] * B.half[2], S = vA <= vB ? A : B;
        const k = (S.half[a] + GROW) / S.half[a];
        S.m.scale[S.key[a]] *= k; S.half[a] += GROW; changed = true;
      }
    }
    if (!changed) break;
  }
}

/* atts: list of attachment keys (or a { slot: key } object, or a single key) */
function buildGun(key, optic = 'iron', atts = null) {
  if (!BUILD[key]) key = 'ar';
  if (typeof atts === 'string') atts = atts !== 'none' ? [atts] : [];
  else if (atts && !Array.isArray(atts)) atts = attList(atts);
  atts = (atts || []).filter(a => attsFor(key).includes(a));
  const has = k => atts.includes(k);
  if (!opticsFor(key).includes(optic)) optic = defaultOptic(key);
  const g = new THREE.Group();
  const R = { group: g, key, S: .1, rearZ: .1, relief: .14, muzzle: -.7, muzzleY: .04, muzzleR: .012, mag: null, magH: .1, bolt: null, pump: null, slide: null, cyl: null, hinge: null, laser: null, warhead: null, glMuzzle: null,
    grip: { x: 0, y: -.09, z: .08 }, fore: { x: 0, y: -.01, z: -.32 }, eject: { x: .04, y: .03, z: 0 }, bar: new THREE.Group(), stock: new THREE.Group() };
  g.add(R.bar); g.add(R.stock);
  const s = BUILD[key](g, R, { optic, has });
  let S = R.S;
  // sights
  if (optic === 'reflex' && s.pistol) {
    // the dot sits low on the slide, so the sight line (and where you look when aiming) moves down to it
    const base = R.railOn ? R.railOn() : s.base;
    S = R.S = miniReflex(R.slide || g, s.z, base);
  } else if (optic === 'iron') {
    if (!R.ironsDone) {
      if (R.shotFront) { rearSight(g, s.rear[0], s.rear[1], S); Bx(R.bar, GC.metal, .005, s.front[1], S - .006, s.front[0] - .003, s.front[0] + .003); const b = new THREE.Mesh(new THREE.SphereGeometry(.0045, 8, 6), dotMat); b.position.set(0, S - .004, s.front[0]); R.bar.add(b); }
      else { rearSight(g, s.rear[0], s.rear[1], S); frontPost(R.barrel && s.front[0] < R.barrel.z0 - .005 ? R.bar : g, s.front[0], s.front[1], S); }
    }
  } else {
    let base = s.base;
    if (R.railOn) base = R.railOn();
    const host = R.slide && s.pistol ? R.slide : g;
    // every optic needs a minimum height above its rail to clear its own mount. Guns built with a low sight line
    // (the Kestrel's irons sit close to the dust cover) raise it for the optic, so the sight sits on the rail like
    // on every other gun instead of sinking into the receiver.
    const lift = { reflex: .03, holo: .036, acog: .038, scope: .022 }[optic] || 0;
    if (!s.pistol && S < base + lift) S = R.S = base + lift;
    if (optic === 'reflex') reflexSight(host, s.z, base, S);
    else if (optic === 'holo') holoSight(g, s.z - .01, base, S);
    else if (optic === 'acog') { const rear = acogSight(g, s.z - .02, base, S); R.relief = Math.max(.1, rear + .16 - R.rearZ); }
    else if (optic === 'scope') { const rear = scopeSight(g, s.z, base, S); if (WEAPONS[key].type !== 'sniper') R.relief = Math.max(.12, rear + .16 - R.rearZ); }
  }
  // barrel
  // Long barrel: the barrel grows out of its own muzzle end, at its own radius and colour, so it always reads as
  // one piece; only the muzzle device moves out to the new tip. Guns whose whole front end is one barrel assembly
  // (revolver, pump shotgun) stretch that assembly from where it meets the frame instead.
  if (R.barrel && has('longbarrel')) {
    const ext = s.pistol ? .05 : .1;
    if (R.barStretch !== undefined) {
      const z0 = R.barStretch, len = z0 - R.muzzle, k = (len + ext) / len;
      R.bar.scale.z = k; R.bar.position.z = z0 * (1 - k); R.muzzle -= ext; if (R.barEnd !== undefined) R.barEnd = z0 + (R.barEnd - z0) * k;
    } else {
      const tip = R.mdev ? R.barEnd : R.muzzle, host = R.mdev ? R.bar : g;
      Cz(host, R.barrel.c || GC.metal, R.barrel.r, tip - ext, tip + .004, R.barrel.y, 12);
      Cz(host, GC.dark, R.barrel.r * 1.08, tip - .006, tip + .006, R.barrel.y, 12);   // thread collar where the extension starts
      if (R.mdev) { R.mdev.position.z -= ext; R.barEnd -= ext; }
      R.muzzle -= ext;
    }
  }
  if (R.barrel && has('shortbarrel')) { const cut = s.pistol ? .03 : .08; R.bar.position.z += cut; R.muzzle += cut; }
  if (key === 'coach' && has('longbarrel')) { R.hinge.children[0].scale.z = 1.18; R.muzzle -= .09; }
  if (key === 'coach' && has('shortbarrel')) { R.hinge.children[0].scale.z = .72; R.muzzle += .14; }
  // muzzle devices
  // a muzzle attachment replaces the gun's own muzzle device
  const anyMuzzle = has('suppressor') || has('compensator') || has('flashhider');
  if (anyMuzzle && R.mdev) { R.mdev.visible = false; R.muzzle = R.barEnd + R.bar.position.z; }
  const mY = R.muzzleY, mR = R.muzzleR, mz = R.muzzle;
  if (has('suppressor')) { const L = s.pistol ? .12 : .17; Cz(g, GC.dark, mR + .011, mz - L, mz + .005, mY, 16); Cz(g, GC.metal, mR + .012, mz - L, mz - L + .012, mY, 16); Cz(g, GC.metal, mR + .012, mz - .005, mz + .008, mY, 16); R.muzzle -= L; }
  else if (has('compensator')) { Bx(g, GC.dark, mR * 2 + .014, mY - mR - .007, mY + mR + .007, mz - .05, mz + .004); for (const x of [-1, 1]) for (let k = 0; k < 3; k++) Bx(g, GC.black, .002, mY - .004, mY + .008, mz - .044 + k * .015, mz - .036 + k * .015, x * (mR + .0075)); R.muzzle -= .05; }
  else if (has('flashhider')) { Cz(g, GC.dark, mR + .005, mz - .012, mz + .004, mY, 10); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; Bx(g, GC.dark, .005, mY - .0025, mY + .0025, mz - .05, mz - .01, 0).position.set(Math.cos(a) * (mR + .002), mY + Math.sin(a) * (mR + .002), mz - .03); } R.muzzle -= .05; }
  // underbarrel
  if (R.fore && has('grip')) { const t = R.fore.y; Bx(g, GC.black, .03, t - .008, t, R.fore.z - .025, R.fore.z + .025); Bx(g, GC.dark, .026, t - .085, t - .008, R.fore.z - .016, R.fore.z + .016); Bx(g, GC.black, .03, t - .095, t - .085, R.fore.z - .019, R.fore.z + .019); R.fore = { x: 0, y: t - .04, z: R.fore.z, kind: 'vgrip' }; }
  if (R.fore && has('gl')) {
    // 40mm launcher clamped under the handguard: tube, breech, its own little trigger; the off hand cups the tube
    const t = R.fore.y, z = R.fore.z, r = .022, y = t - .012 - r;
    Bx(g, GC.black, .026, t - .012, t, z - .11, z + .07);                         // mount
    Cz(g, GC.od, r, z - .19, z + .06, y, 16);                                      // barrel
    Cz(g, GC.dark, r + .004, z - .2, z - .175, y, 16);                             // muzzle ring
    { const bore = new THREE.Mesh(new THREE.CircleGeometry(r - .005, 14), pmat(GC.black)); bore.position.set(0, y, z - .2005); bore.rotation.y = Math.PI; g.add(bore); }
    Bx(g, GC.od, .044, y - r + .002, t - .012, z + .06, z + .115);                // breech
    for (const pz of [z + .062, z + .089]) Bx(g, GC.dark, .008, y - r - .026, y - r + .004, pz - .004, pz + .004);   // trigger guard posts
    Bx(g, GC.dark, .009, y - r - .029, y - r - .023, z + .057, z + .094);          // guard bottom
    Hang(g, GC.metal, .005, .02, .006, y - r + .002, z + .075, .35);               // trigger
    R.glMuzzle = { y, z: z - .2 };
    R.fore = { x: 0, y: y - r + .006, z: z - .06 };
  }
  if (R.fore && has('angled')) { const t = R.fore.y; Bx(g, GC.black, .03, t - .008, t, R.fore.z - .04, R.fore.z + .04); Hang(g, GC.dark, .026, .045, .075, t - .006, R.fore.z + .0, -.65); R.fore = { x: 0, y: t + .002, z: R.fore.z + .045 }; }   // hand on the handguard, heel of the palm against the grip's sloped back
  if (has('laser')) {
    const lx = R.fore ? .044 : 0, ly = R.fore ? (R.barrel ? R.barrel.y : mY) - .008 : -.03, lz = R.fore ? R.fore.z - .06 : Math.max(R.muzzle * .65, -.13);
    if (R.fore) Bx(g, GC.black, .014, ly - .006, ly + .006, lz - .02, lz + .02, lx - .016);   // mount to the handguard
    else { const top = R.laserTop !== undefined ? R.laserTop : -.016; if (top - (ly + .012) > .002) Bx(g, GC.black, .016, ly + .012, top + .002, lz - .02, lz + .02); }   // mount up to the frame or underlug
    Bx(g, GC.black, .022, ly - .012, ly + .012, lz - .035, lz + .035, lx); Bx(g, 0x7A1A14, .012, ly + .012, ly + .016, lz - .005, lz + .015, lx);
    const tip = new THREE.Mesh(new THREE.CircleGeometry(.005, 10), new THREE.MeshBasicMaterial({ color: 0xFF3020 })); tip.position.set(lx, ly, lz - .0355); tip.rotation.y = Math.PI; g.add(tip);
    R.laser = { x: lx, y: ly, z: lz - .036 };
  }
  deZfight(g);
  // magazine
  if (has('extmag') && R.mag) { R.mag.scale.y = 1.4; R.magH *= 1.4; }
  // fast mags: an orange pull tab hanging from the base plate, wherever the mag's bottom ends up (curved mags too)
  if (has('fastmag') && R.mag) { const b = R.magBot || { y: -R.magH, z: 0, rx: 0 }; Hang(R.mag, 0xE0603A, .012, .022, .016, b.y + .002, b.z, b.rx); }
  // stock
  // stocks resize about the point where they meet the gun, so a light or heavy stock stays attached
  const stockScale = (sx, sy, sz) => {
    let front = 1e9;
    for (const c of R.stock.children) {
      if (c.userData.front !== undefined) { front = Math.min(front, c.userData.front); continue; }
      const P = c.geometry && c.geometry.parameters, hz = P ? (P.depth !== undefined ? P.depth / 2 : P.height !== undefined ? P.height / 2 : 0) : 0;
      if (Number.isFinite(c.position.z - hz)) front = Math.min(front, c.position.z - hz);
    }
    if (front > 1e8) return;
    R.stock.scale.set(sx, sy, sz); R.stock.position.set(0, 0, front * (1 - sz) - .002);
  };
  if (has('lightstock')) stockScale(.75, .7, .92);
  if (has('heavystock')) stockScale(1.15, 1.1, 1.04);
  R.magY = R.mag ? R.mag.position.y : 0; R.boltZ = R.bolt ? R.bolt.position.z : 0; R.pumpZ = R.pump ? R.pump.position.z : 0; R.slideZ = R.slide ? R.slide.position.z : 0; R.magZ = R.mag ? R.mag.position.z : 0;
  return R;
}
