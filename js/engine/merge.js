// Blast Radius · Ultra low graphics: merge a map's static scenery into a few big meshes
'use strict';

/* Every crate, wall, step and rail on a map is its own mesh with its own vertex buffers: about 1,400 of them on a
   menu map. A desktop graphics card shrugs that off, but a console's browser reserves memory per buffer and runs
   out. On Ultra low, once a map is built, every mesh that never moves is baked (in world space) into one big mesh
   per material and per 24 m square of the map. The look is identical; the buffers and draw calls drop to a few
   dozen. Collision is untouched (it uses the box list, not the meshes).

   Left alone: anything a map keeps a handle on to animate (the derrick's pump arms, Riptide's radar and sea, the
   rain), the day and night skies (shown and hidden), see-through materials (they must be drawn in order),
   instanced meshes, and anything hidden.                                                                    */
const MERGE_CELL = 24, MERGE_ATTRS = ['position', 'normal', 'uv', 'color'];
function mergeSkipSet() {
  const skip = new Set();
  const add = o => { if (o && o.isObject3D) o.traverse(c => skip.add(c)); };
  add(SKY.day); add(SKY.night);
  if (MAP) for (const v of Object.values(MAP)) {
    if (!v || typeof v !== 'object') continue;
    if (v.isObject3D) { add(v); continue; }
    const list = Array.isArray(v) ? v : [];
    for (const it of list) { if (!it || typeof it !== 'object') continue; if (it.isObject3D) add(it); else for (const w of Object.values(it)) if (w && w.isObject3D) add(w); }
  }
  return skip;
}
function mergeStatic(root) {
  const skip = mergeSkipSet(), groups = new Map(), P = new THREE.Vector3();
  root.updateMatrixWorld(true);
  const fixed = o => { for (let a = o; a && a !== root; a = a.parent) { if (skip.has(a) || !a.visible) return false; } return true; };
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !fixed(o)) return;
    const m = o.material, g = o.geometry;
    if (!m || Array.isArray(m) || m.transparent || !g || !g.isBufferGeometry || !g.attributes.position) return;
    if (g.groups && g.groups.length) return;
    if (g.morphAttributes && Object.keys(g.morphAttributes).length) return;
    const names = Object.keys(g.attributes);
    if (names.some(n => !MERGE_ATTRS.includes(n))) return;
    P.setFromMatrixPosition(o.matrixWorld);
    const sig = MERGE_ATTRS.filter(n => g.attributes[n]).map(n => n + g.attributes[n].itemSize).join(',');
    const key = `${m.uuid}|${sig}|${o.renderOrder}|${Math.floor(P.x / MERGE_CELL)},${Math.floor(P.z / MERGE_CELL)}`;
    let G = groups.get(key); if (!G) groups.set(key, G = { m, sig, list: [], cast: false, recv: false, order: o.renderOrder });
    G.list.push(o); G.cast = G.cast || o.castShadow; G.recv = G.recv || o.receiveShadow;
  });
  // Ultra low keeps lighting to the sun, the sky light and the night torch: every point light (street lamps, the
  // cockpit glow) adds code to every lit shader, which a console has to compile at each map load
  const lamps = []; root.traverse(o => { if (o.isPointLight || o.isSpotLight) lamps.push(o); });
  for (const l of lamps) l.parent.remove(l);
  let before = 0, after = 0;
  const V = new THREE.Vector3(), N3 = new THREE.Matrix3();
  for (const G of groups.values()) {
    before += G.list.length;
    if (G.list.length < 2) { after++; continue; }
    const names = MERGE_ATTRS.filter(n => G.sig.includes(n)), first = G.list[0].geometry;
    const size = {}; for (const n of names) size[n] = first.attributes[n].itemSize;
    // flatten everything to plain triangles first (no index to stitch together)
    const parts = G.list.map(o => ({ o, g: o.geometry.index ? o.geometry.toNonIndexed() : o.geometry }));
    let count = 0; for (const p of parts) count += p.g.attributes.position.count;
    const out = {}; for (const n of names) out[n] = new Float32Array(count * size[n]);
    let at = 0;
    for (const { o, g } of parts) {
      const c = g.attributes.position.count, M = o.matrixWorld;
      N3.getNormalMatrix(M);
      for (const n of names) {
        const A = g.attributes[n], s = size[n], dst = out[n];
        for (let i = 0; i < c; i++) {
          const k = (at + i) * s;
          if (n === 'position') { V.fromBufferAttribute(A, i).applyMatrix4(M); dst[k] = V.x; dst[k + 1] = V.y; dst[k + 2] = V.z; }
          else if (n === 'normal') { V.fromBufferAttribute(A, i).applyMatrix3(N3).normalize(); dst[k] = V.x; dst[k + 1] = V.y; dst[k + 2] = V.z; }
          else { dst[k] = A.getX(i); if (s > 1) dst[k + 1] = A.getY(i); if (s > 2) dst[k + 2] = A.getZ(i); if (s > 3) dst[k + 3] = A.getW(i); }
        }
      }
      at += c;
      if (g !== o.geometry) g.dispose();
      o.parent.remove(o);
    }
    const geo = new THREE.BufferGeometry();
    for (const n of names) geo.setAttribute(n, new THREE.BufferAttribute(out[n], size[n]));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, G.m);
    mesh.castShadow = G.cast; mesh.receiveShadow = G.recv; mesh.renderOrder = G.order;
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    root.add(mesh);
    after++;
  }
  return { before, after };
}
