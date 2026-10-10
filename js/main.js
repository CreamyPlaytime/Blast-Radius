// Blast Radius \u00B7 main loop
'use strict';

/* ================= LOOP ================= */
camera.fov = 60; camera.updateProjectionMatrix();
loadMap(settings.map, 'day');
let last = nowMs(), menuT = 0, hudT = 0, annT = 1;
function frame(tMs) {
  requestAnimationFrame(frame); // first, so one bad frame can't stop the game
  const dt = clamp((tMs - last) / 1000, 0, .05); last = tMs;
  if (G.state === 'menu' || G.state === 'ended') {
    menuT += dt * .06;
    const O = MAP.orbit, C = MAP.center;
    camera.position.set(C[0] + Math.sin(menuT) * O.r, O.h + Math.sin(menuT * 2.3) * 2, C[1] + Math.cos(menuT) * O.r * (O.rz || 1));
    camera.rotation.set(0, 0, 0);
    camera.lookAt(C[0], O.look || 1.5, C[1]);
    if (G.state === 'ended') for (const e of G.ents) if ((e.isBot || e.isZombie) && !e.alive) animateDead(e);
    padMenu(dt);
  } else if (G.state === 'playing' || (NET.on && (G.state === 'paused' || G.state === 'killcam' || G.state === 'finalcam'))) {
    // with friends the match keeps running behind the pause menu and behind kill cams
    const realDt = dt, paused = G.state === 'paused', kc = !!G.kc;
    const sdt = G.ended ? dt * (NET.on ? 1 : .28) : dt;
    if (kc) { mouse.dx = 0; mouse.dy = 0; kbEdge.clear(); killcamInput(); clearInput(); }
    else if (paused) { padMenu(dt); clearInput(); } else buildInput(sdt);
    if (IN.pauseP && !G.ended && !paused) pauseGame();
    G.now += sdt;
    if (!G.ended && !netClient()) G.timeLeft -= sdt;
    if (G.zm) zmUpdate(sdt);
    else {
      for (const e of G.ents) {
        if (e === G.player) continue;
        if (!netMine(e)) { updatePuppet(e, sdt); continue; }
        if (e.alive) updateBot(e, sdt);
        else { animateDead(e); e.respawnT -= sdt; if (e.respawnT <= 0 && !G.ended) spawn(e); }
      }
      updateDrops();
    }
    updateProj(sdt);
    updateBurns(sdt);
    updateSmokes(sdt);
    if (!G.kc) updatePuffs(sdt);
    if (!G.kc) updatePlayer(sdt);
    else { const p = G.player; if (!p.alive) { p.respawnT = Math.max(p.respawnT - sdt, .5); animateDead(p); } else if (p.model) poseSoldier(p, sdt, true, false); }
    if (!G.zm) updateTags(sdt);
    updateDamageEls(realDt);
    if ((G.state === 'playing' || paused || G.kc) && !G.zm) recordFrame();
    if (G.bannerT > 0) { G.bannerT -= realDt; if (G.bannerT <= 0) $('#banner').classList.remove('on'); }
    hudT -= realDt; if (hudT <= 0 && (G.state === 'playing' || paused) && !G.kc) { hudT = 1 / 30; updateHud(); }
    if (!G.zm && G.timeLeft <= 0) checkEnd();
    annT -= realDt; if (annT <= 0) { annT = 1; annTick(); }
    if (G.ended && (G.state === 'playing' || paused)) {
      G.endT += realDt;
      if (G.zm) { if (G.endT > 3) { $('#banner').classList.remove('on'); zmShowGameOver(); } }
      else if (G.endT > (NET.on ? 3 : 2.1)) { $('#banner').classList.remove('on'); if (!(settings.killcam && startKillcam(G.lastKill, true))) endMatch(); }
    }
    if (G.kc) { updateKillcam(dt); updatePuffs(dt); }
  } else if (G.state === 'killcam' || G.state === 'finalcam') {
    mouse.dx = 0; mouse.dy = 0; kbEdge.clear();
    killcamInput();
    if (G.kc) { updateKillcam(dt); updatePuffs(dt); }
  } else { mouse.dx = 0; mouse.dy = 0; padMenu(dt); }
  if (G.state === 'menu' && lightingName === 'night') torch.intensity = 0;
  flashLight.intensity = Math.max(0, flashLight.intensity - dt * (flashLight.intensity > 2 ? 18 : 40));
  updateFx(dt);
  if (MAP.tick) MAP.tick(dt, MAP.state);
  renderer.clear();
  renderer.render(scene, camera);
  const p = G.player;
  if (G.kc) { renderer.clearDepth(); renderer.render(vmScene, vmCamera); }
  else if ((G.state === 'playing' || G.state === 'paused') && p && p.alive && vm && !(weapon(p).optic === 'scope' && G.adsT > .85)) {
    renderer.clearDepth();
    renderer.render(vmScene, vmCamera);
  }
  renderPreview(dt);
  musicTick();
  padsTick();
  netTick(dt);
}
requestAnimationFrame(frame);
