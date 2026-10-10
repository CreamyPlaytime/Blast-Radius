// Blast Radius · which seat this window is. The first window is seat 1; a Player 2 window or the
// right half of a split screen is opened by the game itself and named "br-seat-2" so it keeps its own
// callsign, classes and controller, and joins the party on this computer by itself.
'use strict';

const SEAT = (() => {
  let n = 1, split = false;
  try {
    const m = /^br-seat-(\d)(-split)?$/.exec(window.name || '');
    if (m) { n = Math.min(4, Math.max(1, +m[1])); split = !!m[2]; }
  } catch (e) {}
  // the page's markup before any script touched it, for opening another window of the game
  let markup = '';
  try { markup = document.body.innerHTML.replace(/<script[\s\S]*?<\/script>/gi, ''); } catch (e) {}
  // a window the game opened itself talks straight to the window that opened it, as well as over the
  // shared channel (a browser may keep a popup's storage apart from the page that opened it)
  const linked = n > 1 ? (split ? 'parent' : 'opener') : null;
  return { n, split, linked, born: Date.now() + Math.random(), markup };
})();
