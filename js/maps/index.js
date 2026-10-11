// Blast Radius \u00B7 map loading. Every map builds into WORLD, so switching maps clears WORLD and rebuilds.
'use strict';

const MAP_KEYS = () => Object.keys(MAPS);
const sharedTex = () => new Set(Object.values(texCache));
const sharedMat = () => new Set(Object.values(matCache));
function clearWorld() {
  const keepT = sharedTex(), keepM = sharedMat();
  WORLD.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) {
      if (keepM.has(m) || m === glassMat) continue;
      if (m.map && !keepT.has(m.map)) m.map.dispose();
      m.dispose();
    }
  });
  for (let i = WORLD.children.length - 1; i >= 0; i--) WORLD.remove(WORLD.children[i]);
  boxes.length = 0; LAMPS.length = 0; SKY.day = SKY.night = null;
}
if (!MAPS[settings.map]) settings.map = 'acres';
function loadMap(id, light) {
  if (!MAPS[id]) id = 'acres';
  if (MAP && MAP.id === id) { if (light && light !== lightingName) applyLighting(light); return MAP; }
  clearWorld();
  MAP = MAPS[id]; MAP.id = id;
  MAP.state = {};
  MAP.build();
  deZfight(WORLD, .0025);   // nudge apart any boxes that share a face, so nothing flickers
  MAP.merged = settings.res === 'ultra';
  if (MAP.merged) mergeStatic(WORLD);   // Ultra low: bake the static scenery into a few big meshes
  // fit the sun's shadow box to the map
  const B = MAP.bounds, half = Math.max(B[1] - B[0], B[3] - B[2]) / 2 + 10, cx = (B[0] + B[1]) / 2, cz = (B[2] + B[3]) / 2;
  Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 220 });
  sun.target.position.set(cx, 0, cz); if (!sun.target.parent) scene.add(sun.target);
  sun.shadow.camera.updateProjectionMatrix();
  MAP.sunOff = [cx, cz];
  computeNav();
  drawMinimapBase();
  applyLighting(light || (lightingName === 'night' && MAP.lighting && !MAP.lighting.night ? 'day' : lightingName));
  return MAP;
}
