// Blast Radius \u00B7 shared helpers
'use strict';

const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const wrap = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* Inside claude.ai the game is embedded in another page, and the browser won't move keyboard focus into it
   in response to a controller. So the game keeps its own record of the focused button: every focus() call
   and every click updates it, it gets the .vf class for its highlight, and activeEl() reads it back.       */
const VF = { el: null };
function vfSet(el) { if (VF.el === el) return; if (VF.el && VF.el.classList) VF.el.classList.remove('vf'); VF.el = el || null; if (VF.el && VF.el.classList) VF.el.classList.add('vf'); }
{
  const nFocus = HTMLElement.prototype.focus, nBlur = HTMLElement.prototype.blur;
  HTMLElement.prototype.focus = function (o) { vfSet(this); try { return nFocus.call(this, o); } catch (e) {} };
  HTMLElement.prototype.blur = function () { if (VF.el === this) vfSet(null); try { return nBlur.call(this); } catch (e) {} };
  document.addEventListener('focusin', e => vfSet(e.target), true);
}
function activeEl() {
  const v = VF.el;
  if (v && v.isConnected && v.offsetParent !== null) return v;
  return document.activeElement;
}

if (typeof THREE === 'undefined') {
  document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;inset:auto 16px 16px;color:#E9DCC0;font:600 16px system-ui">The 3D engine failed to load. Check your connection and reload the page.</p>');
  throw new Error('three.js did not load');
}
