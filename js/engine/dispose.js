// Blast Radius · freeing models that are thrown away (guns on every weapon swap, soldiers on every spawn)
'use strict';

/* Removing a model from the scene doesn't free its vertex buffers or textures on the graphics card. Every weapon
   swap, every respawn and every bot at the end of a match used to leave its model's buffers behind. A desktop
   card never notices; a console's browser runs out after a few matches.

   disposeModel frees a thrown-away model's geometry and textures. The pieces several models share (the soldier
   and zombie part caches, the zombie templates, the map textures) are skipped, and materials are left alone, so
   nothing needs its shaders compiled again. Freeing something three.js still uses elsewhere is harmless: it is
   simply uploaded again the next time it is drawn.                                                          */
function disposeModel(root) {
  if (!root || !root.traverse) return;
  const keepG = new Set(), keepT = new Set();
  try { for (const g of Object.values(gcache)) keepG.add(g); } catch (e) {}
  try { for (const g of Object.values(zGeoCache)) keepG.add(g); } catch (e) {}
  try { for (const t of Object.values(zTemplates)) t.traverse(o => { if (o.geometry) keepG.add(o.geometry); }); } catch (e) {}
  try { for (const t of Object.values(texCache)) keepT.add(t); } catch (e) {}
  try { for (const t of Object.values(softTexCache)) keepT.add(t); } catch (e) {}
  try { for (const t of Object.values(dropTexCache)) keepT.add(t); } catch (e) {}
  root.traverse(o => {
    if (o.geometry && !keepG.has(o.geometry)) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) if (m.map && !keepT.has(m.map)) m.map.dispose();
  });
}
