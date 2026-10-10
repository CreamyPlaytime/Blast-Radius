// Blast Radius \u00B7 tracers and impact effects
'use strict';

/* ================= FX POOLS ================= */
const tracerMat = new THREE.LineBasicMaterial({ color: 0xFFE6A8, transparent: true, opacity: .75 });
const tracers = [];
for (let i = 0; i < 48; i++) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const l = new THREE.Line(geo, tracerMat); l.visible = false; l.frustumCulled = false; l.life = 0; scene.add(l); tracers.push(l);
}
let tracerI = 0;
const tracerMats = {};
function tracer(ax, ay, az, bx, by, bz, color) {
  const len = Math.hypot(bx - ax, by - ay, bz - az); if (len < .3) return;
  const l = tracers[tracerI++ % tracers.length]; const a = l.geometry.attributes.position.array;
  l.material = color ? (tracerMats[color] || (tracerMats[color] = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .95 }))) : tracerMat;
  const seg = Math.min(len, 6), t = rand(.2, .7) * (1 - seg / len);
  const ux = (bx - ax) / len, uy = (by - ay) / len, uz = (bz - az) / len;
  a[0] = ax + ux * t * len; a[1] = ay + uy * t * len; a[2] = az + uz * t * len;
  a[3] = a[0] + ux * seg; a[4] = a[1] + uy * seg; a[5] = a[2] + uz * seg;
  l.geometry.attributes.position.needsUpdate = true; l.visible = true; l.life = color ? .09 : .05;
}
// tracer rounds: a thick glowing streak instead of a one-pixel line
const glowGeo = new THREE.BoxGeometry(1, 1, 1), glowMats = {}, glows = [];
let glowI = 0;
function glowTracer(ax, ay, az, bx, by, bz, color) {
  const len = Math.hypot(bx - ax, by - ay, bz - az); if (len < .3) return;
  let m = glows[glowI++ % 24];
  if (!m) { m = new THREE.Mesh(glowGeo); m.frustumCulled = false; scene.add(m); glows.push(m); }
  m.material = glowMats[color] || (glowMats[color] = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
  const seg = Math.min(len, 9);
  m.scale.set(.03, .03, seg);
  m.position.set(ax + (bx - ax) * seg / len * .5, ay + (by - ay) * seg / len * .5, az + (bz - az) * seg / len * .5);
  m.lookAt(bx, by, bz);
  // the streak races from the muzzle to the impact
  m.userData.v = (m.userData.v || new THREE.Vector3()).set(bx - ax, by - ay, bz - az).multiplyScalar(Math.max(0, len - seg) / len / .09);
  m.life = .09; m.visible = true;
}
const sparkGeo = new THREE.BoxGeometry(.07, .07, .07);
const sparkMats = { wall: new THREE.MeshBasicMaterial({ color: 0xE8DCC0 }), blood: new THREE.MeshBasicMaterial({ color: 0xA8231A }), zap: new THREE.MeshBasicMaterial({ color: 0x8CFF6A }), gore: new THREE.MeshBasicMaterial({ color: 0x5A1E12 }), fire: new THREE.MeshBasicMaterial({ color: 0xFF8A2A }) };
const sparks = [];
for (let i = 0; i < 80; i++) { const m = new THREE.Mesh(sparkGeo, sparkMats.wall); m.visible = false; m.v = new THREE.Vector3(); m.life = 0; scene.add(m); sparks.push(m); }
let sparkI = 0;
function burst(x, y, z, kind, n = 4) {
  for (let k = 0; k < n; k++) {
    const m = sparks[sparkI++ % sparks.length]; m.material = sparkMats[kind]; m.position.set(x, y, z);
    m.v.set(rand(-2, 2), rand(.5, 3), rand(-2, 2)); m.life = rand(.15, .3); m.visible = true;
  }
}
function updateFx(dt) {
  for (const l of tracers) if (l.visible) { l.life -= dt; if (l.life <= 0) l.visible = false; }
  for (const m of glows) if (m.visible) { m.life -= dt; m.position.addScaledVector(m.userData.v, Math.min(dt, Math.max(0, m.life + dt))); if (m.life <= 0) m.visible = false; }
  for (const m of sparks) if (m.visible) { m.life -= dt; m.v.y -= 12 * dt; m.position.addScaledVector(m.v, dt); if (m.life <= 0) m.visible = false; }
}
