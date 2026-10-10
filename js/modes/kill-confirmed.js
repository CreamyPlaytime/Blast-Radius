// Blast Radius \u00B7 kill confirmed tags
'use strict';

/* ---------- kill confirmed tags ---------- */
const tagGeo = new THREE.BoxGeometry(.26, .38, .04);
function spawnTag(v) {
  const team = v.team;
  const col = G.mode === 'ffa' ? 0xD9773F : TEAMS[team].color;
  const m = new THREE.Mesh(tagGeo, new THREE.MeshBasicMaterial({ color: col }));
  const halo = new THREE.Mesh(new THREE.RingGeometry(.35, .5, 20), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .45, side: THREE.DoubleSide, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = -.75; m.add(halo);
  m.position.set(v.pos.x, v.pos.y + .85, v.pos.z);
  scene.add(m);
  const tg = { mesh: m, team, x: v.pos.x, z: v.pos.z, y: v.pos.y, t: G.now, nid: ++NET.tagSeq };
  G.tags.push(tg);
  return tg;
}
function updateTags(dt) {
  for (let i = G.tags.length - 1; i >= 0; i--) {
    const tg = G.tags[i];
    tg.mesh.rotation.y += dt * 3; tg.mesh.position.y = tg.y + .85 + Math.sin(G.now * 4 + i) * .08;
    if (netClient()) continue;   // the host decides who picked a tag up
    let taker = null;
    for (const e of G.ents) if (e.alive && Math.hypot(e.pos.x - tg.x, e.pos.z - tg.z) < (e.team === tg.team && e.isBot ? 1.0 : 1.7) && Math.abs(e.pos.y - tg.y) < 1.5) { taker = e; break; }
    if (taker || G.now - tg.t > 30) {
      if (taker) {
        if (taker.team !== tg.team) {
          G.teamScore[taker.team]++; taker.confirms++; taker.score += 50;
          if (taker === G.player) { popup('Kill confirmed  +50'); sndTag(true); }
        } else {
          taker.score += 25;
          if (taker === G.player) { popup('Kill denied  +25'); sndTag(false); }
        }
        if (taker.human && taker.net) netEmit(['tg', taker.net.id, taker.team !== tg.team ? 1 : 0]);
      }
      scene.remove(tg.mesh); G.tags.splice(i, 1);
      checkEnd();
    }
  }
}
