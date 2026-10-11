// Blast Radius · multiplayer: parties on this computer and online.
//
// Every window runs its own soldier. One window hosts: it runs the bots, the zombies, the score and the
// clock, and every other window shows them as puppets that follow what the host sends. Each player owns
// their own health, so a hit on someone else is sent to them and they decide whether it killed them.
//
// Two ways to talk:
//  - on this computer, windows of the same browser use a BroadcastChannel (instant, no internet)
//  - online, the claude.ai artifact "room" relays each window's state to everyone in the same code
// Both carry the same thing: each window keeps one small state object (who it is, its soldier, and for
// the host the match and the snapshot) plus a short ring of numbered events (hits, kills, grenades).
'use strict';

const NET_VER = 2;
const NET = {
  on: false, role: 'solo', kind: null, code: null, tr: null,
  id: Math.random().toString(36).slice(2, 9),
  peers: new Map(),       // id -> { st, name, role, seen, lastSeq, joinedAt }
  ents: new Map(),        // net id -> entity in the current match
  teams: {},              // player id -> team (decided by the host)
  ep: 0, inMatch: false, sitOut: 0, starting: false, meta: null, hostMeta: null, roster: [],
  seq: 0, evOut: [], pend: new Map(), acc: 0, hostId: null, msg: '', localSeen: null,
  joinDraft: '', splitFrame: null, p2Win: null, zBreak: 0, dropSeq: 0, tagSeq: 0, autoJoinT: 0,
};
const netHost = () => NET.on && NET.role === 'host';
const netClient = () => NET.on && NET.role === 'client';
const netMine = e => !NET.on || !e || !e.net || e.net.mine;
const gameLive = () => G.state === 'playing' || (NET.on && G.state === 'paused');
let NET_GHOST = false;     // true while a copy of someone else's grenade goes off: effects only, no damage
const r2 = v => Math.round(v * 100) / 100, r1 = v => Math.round(v * 10) / 10;
const ZK_LIST = ['walker', 'crawler', 'bloater', 'hazmat', 'brute', 'dog'];

/* ================= WINDOW LINKS =================
   Windows the game opened itself (a Player 2 window, the right half of a split screen) also talk to
   the window that opened them directly, and the host passes messages on between the two paths.     */
const LINK = { handlers: {} };
function linkWindows() {
  const out = [];
  try {
    if (SEAT.linked === 'opener' && window.opener && !window.opener.closed) out.push(window.opener);
    if (SEAT.linked === 'parent' && window.parent && window.parent !== window) out.push(window.parent);
    if (NET.p2Win && !NET.p2Win.closed) out.push(NET.p2Win);
    if (NET.splitFrame && NET.splitFrame.contentWindow) out.push(NET.splitFrame.contentWindow);
  } catch (e) {}
  return out;
}
function linkPost(kind, m, except) { for (const w of linkWindows()) if (w !== except) try { w.postMessage({ __br: kind, m }, '*'); } catch (e) {} }
window.addEventListener('message', e => {
  const d = e.data; if (!d || typeof d !== 'object' || !d.__br) return;
  if (!linkWindows().includes(e.source)) return;
  if (d.__br === 'pads') { PADS.recv(d.m); if (netHost()) linkPost('pads', d.m, e.source); return; }
  const h = LINK.handlers[d.__br]; if (h) h(d.m, e.source);
});
LINK.handlers.party = (m, src) => {
  if (m && m.s && m.s.r === 'host' && m.from !== NET.id) NET.localSeen = { id: m.from, name: String(m.s.n || 'Player').slice(0, 16), t: nowMs() };
  if (NET.tr && NET.tr.recv) NET.tr.recv(m, src);
};

/* ================= TRANSPORTS ================= */
class LocalTransport {
  constructor(onState, onLeave) {
    this.state = {}; this.peers = new Map(); this.last = 0; this.dirty = true; this.onState = onState; this.onLeave = onLeave;
    try { this.ch = new BroadcastChannel('blastradius.party.local'); this.ch.onmessage = ev => this.recv(ev.data, null); } catch (e) { this.ch = null; }
  }
  // src: the linked window it came over, or null for the shared channel. The host passes it on to the other path.
  recv(m, src) {
    if (!m || m.from === NET.id) return;
    if (NET.role === 'host') { if (src) { if (this.ch) try { this.ch.postMessage(m); } catch (e) {} } linkPost('party', m, src); }
    if (m.bye) { if (this.peers.delete(m.from)) this.onLeave(m.from); return; }
    this.peers.set(m.from, nowMs()); this.onState(m.from, m.s);
  }
  send(m) { if (this.ch) try { this.ch.postMessage(m); } catch (e) {} linkPost('party', m); }
  set(st) { this.state = st; this.dirty = true; }
  tick() {
    const t = nowMs();
    if (this.dirty || t - this.last > 400) { this.last = t; this.dirty = false; this.send({ from: NET.id, s: this.state }); }
    for (const [id, seen] of this.peers) if (t - seen > 4000) { this.peers.delete(id); this.onLeave(id); }
  }
  close() { this.send({ from: NET.id, bye: 1 }); try { if (this.ch) this.ch.close(); } catch (e) {} }
}
// Online without Claude: the host's own browser is the server. PeerJS's free matchmaking server only
// introduces the players; after that every friend is connected straight to the host, and the host passes
// each friend's state on to the others. Inside claude.ai the page can't make these connections, so there
// the online game goes through the claude.ai room instead (RoomTransport).
const IN_CLAUDE = (() => { try { return !!(window.claude && typeof window.claude.use === 'function') || /claude/i.test(location.hostname); } catch (e) { return true; } })();
const PEER_PREFIX = 'blastradius-v1-';
const PEER_LIBS = ['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
const peerCtor = () => window.Peer || (window.peerjs && window.peerjs.Peer) || null;
function loadPeerLib() {
  return new Promise((res, rej) => {
    if (peerCtor()) return res();
    let i = 0;
    const next = () => {
      if (i >= PEER_LIBS.length) return rej(Object.assign(new Error('lib'), { type: 'lib' }));
      const sc = document.createElement('script'); sc.src = PEER_LIBS[i++];
      sc.onload = () => peerCtor() ? res() : next(); sc.onerror = next;
      document.head.appendChild(sc);
    };
    next();
  });
}
class PeerTransport extends LocalTransport {
  constructor(onState, onLeave) { super(onState, onLeave); if (this.ch) { this.ch.close(); this.ch = null; } this.conns = new Map(); }
  open(role, code) {
    return loadPeerLib().then(() => new Promise((res, rej) => {
      const P = peerCtor();
      if (typeof RTCPeerConnection === 'undefined') return rej(Object.assign(new Error('rtc'), { type: 'browser-incompatible' }));
      const peer = role === 'host' ? new P(PEER_PREFIX + code) : new P();
      this.peer = peer;
      let done = false;
      const fail = e => { if (done) { if (NET.tr === this && e && e.type === 'network' && NET.role === 'client' && !this.conns.size) netKick('Lost the connection to the online game.', true); return; } done = true; try { peer.destroy(); } catch (x) {} rej(e); };
      peer.on('error', fail);
      peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (x) {} }, 1500); });
      peer.on('open', () => {
        if (role === 'host') { peer.on('connection', c => c.on('open', () => this.add(c))); done = true; res(); return; }
        const c = peer.connect(PEER_PREFIX + code, { serialization: 'json' });
        const t = setTimeout(() => fail(Object.assign(new Error('timeout'), { type: 'peer-unavailable' })), 15000);
        c.on('open', () => { clearTimeout(t); this.add(c); if (!done) { done = true; res(); } });
        c.on('error', fail);
      });
    }));
  }
  add(c) {
    this.conns.set(c.peer, c);
    c.on('data', m => this.recv(m, c));
    c.on('close', () => { this.conns.delete(c.peer); if (NET.tr === this && NET.role === 'client' && !this.conns.size) netKick('Lost the connection to the host.', true); });
    this.dirty = true;
  }
  // the host passes every friend's message on to the other friends
  recv(m, from) {
    if (!m || typeof m !== 'object' || m.from === NET.id) return;
    if (NET.role === 'host') for (const c of this.conns.values()) if (c !== from && c.open) try { c.send(m); } catch (e) {}
    if (m.bye) { if (this.peers.delete(m.from)) this.onLeave(m.from); return; }
    this.peers.set(m.from, nowMs()); this.onState(m.from, m.s);
  }
  send(m) { for (const c of this.conns.values()) if (c.open) try { c.send(m); } catch (e) {} }
  close() { this.send({ from: NET.id, bye: 1 }); const p = this.peer; setTimeout(() => { try { p && p.destroy(); } catch (e) {} }, 150); }
}
class RoomTransport {
  constructor(onState, onLeave) { this.onState = onState; this.onLeave = onLeave; this.pend = null; this.seen = new Map(); this.busy = false; }
  async open(role, code) {
    const C = window.claude;
    if (!C || typeof C.use !== 'function') throw new Error('unavailable');
    const room = await C.use('room');
    if (!room) throw new Error('unavailable');
    this.r = await room.join('br-' + code.toLowerCase());
    this.unsub = this.r.onPeers(ch => {
      for (const p of ch.peers) {
        if (p.sameTab) continue;
        const st = p.presence;
        if (this.seen.get(p.peer) === st) continue;
        this.seen.set(p.peer, st);
        if (st && st.id) this.onState(st.id, st);
      }
      for (const p of ch.left) { const st = this.seen.get(p.peer); this.seen.delete(p.peer); if (st && st.id) this.onLeave(st.id); }
    }, () => { if (NET.tr === this) netKick('Lost the connection to the online game.', true); });
  }
  set(st) { this.pend = st; }
  tick() {
    if (!this.r || !this.pend || this.busy) return;
    const st = this.pend; this.pend = null; this.busy = true;
    this.r.presence(st).catch(() => {}).finally(() => { this.busy = false; });
  }
  close() { try { if (this.unsub) this.unsub(); if (this.r) this.r.leave(); } catch (e) {} }
}
setInterval(() => { if (NET.tr) NET.tr.tick(); }, 50);

// on this computer: notice a game hosted in another window, so the menu can offer to join it
try {
  const disc = new BroadcastChannel('blastradius.party.local');
  disc.onmessage = ev => {
    const m = ev.data; if (!m || m.from === NET.id || !m.s || m.s.r !== 'host') return;
    NET.localSeen = { id: m.from, name: String(m.s.n || 'Player').slice(0, 16), t: nowMs() };
  };
} catch (e) {}
const localHostSeen = () => NET.localSeen && nowMs() - NET.localSeen.t < 2500 && !(NET.on && NET.kind === 'local') ? NET.localSeen : null;

/* ================= JOINING AND LEAVING ================= */
async function netOpen(kind, role, code) {
  netLeave(true);
  NET.kind = kind; NET.role = role; NET.code = code || null; NET.peers.clear(); NET.teams = {}; NET.ep = 0; NET.msg = ''; NET.hostId = role === 'host' ? NET.id : null;
  NET.inMatch = false; NET.sitOut = 0; NET.evOut = []; NET.pend.clear();
  NET.via = kind === 'local' ? 'local' : IN_CLAUDE ? 'room' : 'peer';
  const T = { local: LocalTransport, room: RoomTransport, peer: PeerTransport }[NET.via];
  const tr = new T(netOnState, netOnLeave);
  if (kind === 'online') await tr.open(role, code);
  NET.tr = tr; NET.on = true; NET.openedAt = nowMs();
  PADS.party = kind === 'local' ? 'local' : null; padsHello();
  if (role === 'host') NET.teams[NET.id] = 'A';
  netTick(1);
}
function netLeave(quiet) {
  if (NET.tr) NET.tr.close();
  NET.tr = null; NET.on = false; NET.role = 'solo'; NET.kind = null; NET.code = null; NET.peers.clear(); NET.inMatch = false; NET.hostId = null;
  PADS.party = null;
  if (NET.splitFrame) netSplit(false);
  if (!quiet && G.state !== 'menu') toMenu();
}
async function netHostLocal() {
  if (localHostSeen()) { NET.msg = `${localHostSeen().name} is already hosting on this computer. Join that game instead.`; renderMenu(); return; }
  await netOpen('local', 'host');
  go('lobby');
}
async function netJoinLocal() {
  if (SEAT.n === 1) useSeatProfile(2);   // another tab on the same computer: Player 2's own callsign and classes
  await netOpen('local', 'client');
  NET.msg = 'Connecting…';
  go('lobby');
  setTimeout(() => { if (NET.on && NET.kind === 'local' && !NET.hostId) netKick('No game found on this computer. Host one in the first window.', true); }, 5000);
}
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
function netOnlineError(e, code) {
  const t = e && e.type;
  if (IN_CLAUDE) return 'Online play here needs you signed into claude.ai. To play online without Claude, use the copy of the game you host yourself.';
  if (t === 'peer-unavailable') return `No game found with code ${code}. Check the code, and that the host is still in the lobby.`;
  if (t === 'lib' || t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return 'Couldn\u2019t reach the matchmaking server. Check your internet connection and try again.';
  if (t === 'browser-incompatible') return 'This browser can\u2019t make direct connections. Try Chrome, Edge, Opera or Firefox.';
  return 'Couldn\u2019t start the online game. Try again in a moment.';
}
async function netHostOnline() {
  NET.msg = 'Setting up\u2026'; renderMenu();
  for (let tries = 0; tries < 4; tries++) {
    const code = Array.from({ length: 4 }, () => CODE_ABC[Math.random() * CODE_ABC.length | 0]).join('');
    try { await netOpen('online', 'host', code); go('lobby'); return; }
    catch (e) { netLeave(true); if (e && e.type === 'unavailable-id') continue; NET.msg = netOnlineError(e, code); renderMenu(); return; }
  }
  NET.msg = netOnlineError(null); renderMenu();
}
async function netJoinOnline(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (code.length !== 4) { NET.msg = 'Type the 4-letter code from the host first.'; renderMenu(); return; }
  NET.msg = `Looking for game ${code}\u2026`; renderMenu();
  try {
    await netOpen('online', 'client', code); NET.msg = 'Connecting\u2026'; go('lobby');
    setTimeout(() => { if (NET.on && NET.code === code && !NET.hostId) netKick(`No game found with code ${code}.`, true); }, 9000);
  } catch (e) { netLeave(true); NET.msg = netOnlineError(e, code); renderMenu(); }
}
// back out to the party menu with a message (the host left, the match ended, the connection dropped)
function netKick(msg, leave) {
  const wasLocalJoin = NET.kind === 'local' && NET.role === 'client';
  if (leave) netLeave(true);
  NET.inMatch = false; NET.msg = msg || '';
  if (G.state !== 'menu') toMenu();
  else if (!$('#loading').hidden) { $('#loading').hidden = true; showMenu(); }
  if (MENU.screen !== 'party' && MENU.screen !== 'lobby') { MENU.stack = [['main', 0]]; MENU.screen = leave ? 'party' : 'lobby'; MENU.sel = 0; }
  if (leave && MENU.screen === 'lobby') { MENU.screen = 'party'; MENU.sel = 0; }
  if (menuActive()) renderMenu();
  if (leave && wasLocalJoin && SEAT.n > 1) NET.autoJoinT = 20;
}
window.addEventListener('pagehide', () => { if (NET.tr) NET.tr.close(); });

/* ================= RECEIVING ================= */
function netOnLeave(id) {
  const P = NET.peers.get(id); NET.peers.delete(id);
  netDropHuman(id);
  if (netClient() && id === NET.hostId) { netKick(`${P ? P.name : 'The host'} left, so the game ended.`, true); return; }
  if (netHost()) delete NET.teams[id];
  netLobbyChanged();
}
function netOnState(id, st) {
  if (!st || st.v !== NET_VER || !NET.on) return;
  let P = NET.peers.get(id), fresh = false;
  if (!P) { P = { id, lastSeq: null, joinedAt: nowMs() }; NET.peers.set(id, P); fresh = true; }
  const oldName = P.name;
  P.st = st; P.name = String(st.n || 'Player').slice(0, 16); P.role = st.r; P.seen = nowMs();
  if (st.r === 'host' && netClient()) { if (!NET.hostId) { NET.hostId = id; NET.msg = ''; fresh = true; } }
  if (netHost() && st.r === 'host') return;   // two hosts in one party: ignore the other one
  if (netClient() && st.r === 'host' && id === NET.hostId) netFromHost(st);
  if (NET.inMatch) {
    if (st.p && st.p.ep === NET.ep && st.ep === NET.ep) netHumanState(id, P, st.p);
    else netDropHuman(id);
  }
  if (Array.isArray(st.ev)) netEvents(P, st.ev, st.ep);
  if (fresh || oldName !== P.name) netLobbyChanged();
}
function netFromHost(st) {
  const m = st.m || {};
  const prevMeta = NET.hostMeta; NET.hostMeta = m;
  NET.teams = st.ht || {};
  if (m.st === 'play' && m.ep) {
    if ((!NET.inMatch || NET.ep !== m.ep) && NET.sitOut !== m.ep && !NET.starting) { netClientStart(m); return; }
  } else if (NET.inMatch || NET.starting) { NET.starting = false; netKick(m.st === 'lobby' ? 'The host went back to the lobby.' : ''); return; }
  if (!prevMeta || prevMeta.st !== m.st || prevMeta.k !== m.k || prevMeta.mode !== m.mode || prevMeta.map !== m.map || prevMeta.teams !== m.teams) netLobbyChanged();
  if (!NET.inMatch || NET.ep !== m.ep) return;
  const my = NET.teams[NET.id];
  if (my && G.player && G.player.team !== my && !G.zm) { G.player.team = my; if (G.player.alive) spawn(G.player); for (const e of G.ents) if (e !== G.player) netTag(e); lastHud = ''; }
  if (st.ro) netRoster(st.ro);
  if (st.s) netSnapshot(st.s);
  if (st.z && G.zm) netZombieSnap(st.z);
}
function netEvents(P, ev, ep) {
  let max = P.lastSeq === null ? -1 : P.lastSeq;
  const first = P.lastSeq === null;
  const todo = [];
  for (const e of ev) { if (!Array.isArray(e)) continue; const s = e[0]; if (first) { if (s > max) max = s; continue; } if (s > P.lastSeq) { todo.push(e); if (s > max) max = s; } }
  P.lastSeq = max;
  if (!NET.inMatch || ep !== NET.ep) return;
  todo.sort((a, b) => a[0] - b[0]);
  for (const e of todo) { try { netEvent(P, e); } catch (err) { console.warn('net event', err); } }
}

/* ================= SENDING ================= */
function netEmit(ev) {
  NET.seq++;
  NET.evOut.push([NET.seq, ...ev]);
  while (NET.evOut.length > 20) NET.evOut.shift();
}
function netTick(dt) {
  if (!NET.on || !NET.tr) return;
  NET.acc += dt; if (NET.acc < .05) return; NET.acc = 0;
  for (const d of NET.pend.values()) netEmit(['d', d.t, d.a, r1(d.amt), d.head, d.w, d.ly === undefined ? -1 : r2(d.ly)]);
  NET.pend.clear();
  const st = { v: NET_VER, id: NET.id, n: settings.profile.name || 'Player', r: NET.role, ep: NET.inMatch ? NET.ep : 0, m: null, ht: null, ro: null, s: null, z: null, p: null, ev: NET.evOut };
  if (netHost()) {
    if (!NET.inMatch && !(NET.meta && NET.meta.st === 'play')) NET.meta = netLobbyMeta();
    st.m = NET.meta; st.ht = NET.teams;
    if (NET.inMatch && G.player) { st.ro = NET.roster; st.s = netHostSnap(); if (G.zm) st.z = netZSnap(); }
  }
  if (NET.inMatch && G.player && (G.state === 'playing' || G.state === 'paused' || G.state === 'ended' || G.state === 'killcam' || G.state === 'finalcam')) st.p = netMyState();
  netFit(st);
  NET.tr.set(st);
}
// the online room takes at most 4 KiB per window: trim the least useful parts until it fits
function netFit(st) {
  if (NET.via !== 'room') return;   // only the claude.ai room has a size limit
  const enc = new TextEncoder(), LIM = 3700, size = () => enc.encode(JSON.stringify(st)).length;
  if (size() < LIM) return;
  st.ev = st.ev.slice(-10); if (size() < LIM) return;
  if (st.s && st.s.st) { st.s.st = null; if (size() < LIM) return; }
  if (st.z && st.z.e) { const hs = netHumans(); const dist = r => Math.min(...hs.map(h => Math.hypot(h.pos.x - r[1], h.pos.z - r[3]))); st.z.e.sort((a, b) => dist(a) - dist(b)); while (st.z.e.length > 6 && size() >= LIM) st.z.e.pop(); }
  if (size() >= LIM) st.ev = st.ev.slice(-5);
  if (size() >= LIM && st.ro) st.ro = st.ro.slice(0, 8);
}
function netLobbyMeta() {
  const S = settings;
  return { st: 'lobby', ep: NET.ep, k: S.mpKind, mode: S.mode, map: S.map, time: S.time, diff: S.difficulty, allies: S.allies, enemies: S.enemies, ffa: S.ffaBots, teams: S.mpTeams, zs: S.zmStart, zd: S.zmDiff, zm: zmMapKey(S.zmMap) };
}
function netPoseFlags(e, combat) {
  return (e.alive ? 1 : 0) | ((e.stance === 'crouch' ? 1 : e.stance === 'prone' ? 2 : 0) << 1) | (e.slideT > 0 ? 8 : 0) | (e.sprinting ? 16 : 0) | (e.meleeT > 0 ? 32 : 0) | (combat ? 128 : 0);
}
// a soldier's state for other windows: where they are and look, plus how far they're aimed in and how far
// through a reload they are (both used by kill cams, which replay through the killer's eyes)
function netPose(e, f) {
  const mine = e === G.player, w = e.weapons && e.weapons[e.wi];
  const ads = mine ? G.adsT : (e.adsK || 0), rl = w && w.reloading && !w.shellMode && w.reloadDur ? 1 - w.reloadT / w.reloadDur : -1;
  const q = [r2(e.pos.x), r2(e.pos.y), r2(e.pos.z), r2(e.yaw), r2(e.pitch), f, (e.sc || 0) % 1000, r1(e.vel.x), r1(e.vel.z), Math.round(Math.max(0, e.health)), r2(ads), r2(rl)];
  // your grenade or throwing knife in hand (aiming, then the throw), sent only while it's happening, for kill cams
  if (mine) {
    const H = G.hold, thr = !H && G.throwT > 0;
    if (H || thr) q.push(H ? r2(clamp(H.t / .18, 0, 1)) : -1, thr ? r2(clamp(1 - G.throwT / .32, 0, 1)) : -1, EQ_TYPES.indexOf(H ? H.type : G.throwType), thr && G.thrown ? 1 : 0);
  }
  return q;
}
function netMyState() {
  const p = G.player, w = weapon(p) || p.weapons[0], Z = G.zm;
  let f = (p.alive ? 1 : 0) | ((p.stance === 'crouch' ? 1 : p.stance === 'prone' ? 2 : 0) << 1) | (p.slideT > 0 ? 8 : 0) | (G.sprinting ? 16 : 0) | (G.meleeT > 0 ? 32 : 0) | (!G.sprinting ? 128 : 0);
  if (Z && Z.down > 0) f |= 64;
  if (Z && Z.down > 0 && Z.bleed) f |= 512;
  if (Z && Z.dead) f |= 256;
  const q = netPose(p, f);
  return { ep: NET.ep, q, w: w ? w.key : 'pistol', o: w ? w.optic : 'iron', zp: Z ? Z.points : 0, zk: Z ? Z.kills : 0, zh: Z ? Z.heads : 0, zt: Z ? Z.total : 0 };
}
function netHostSnap() {
  const s = { tl: Math.max(0, Math.round(G.timeLeft === Infinity ? 0 : G.timeLeft)), ts: [G.teamScore.A, G.teamScore.B], end: G.ended ? 1 : 0, e: [], st: [], tg: null };
  if (!G.zm) for (const b of G.ents) {
    if (!b.isBot || b.human || !b.net) continue;
    const combat = !b.sprinting && G.now - (b.lastSeenT || -99) < 1.2;
    s.e.push([+b.net.id.slice(1), ...netPose(b, netPoseFlags(b, combat))]);
  }
  if (!G.zm) for (const e of G.ents) if (e.net && !e.isZombie) s.st.push([e.net.id, e.kills, e.deaths, e.score, e.confirms || 0]);
  if (G.mode === 'kc') s.tg = G.tags.map(t => [t.nid, t.team, r2(t.x), r2(t.y), r2(t.z)]);
  return s;
}
function netZSnap() {
  const Z = G.zm;
  const z = { r: Z.round, n: Z.roundN || 0, b: Z.breakT > 0 ? 1 : 0, dg: Z.dogRound ? 1 : 0, pw: [r1(Math.max(0, Z.power.instakill)), r1(Math.max(0, Z.power.double))], ov: Z.over ? 1 : 0, dr: Z.drops.map(d => [d.nid, Object.keys(ZM_POWERUPS).indexOf(d.type), r2(d.x), r2(d.y), r2(d.z)]), e: [] };
  for (const e of G.ents) {
    if (!e.isZombie || !e.alive) continue;
    const f = 1 | (e.runner ? 2 : 0) | (e.attackT > 0 ? 4 : 0);
    z.e.push([e.zn, r2(e.pos.x), r2(e.pos.y), r2(e.pos.z), r2(e.yaw), f, ZK_LIST.indexOf(e.kind), Math.round(Math.max(0, e.riseT) * 10), Math.round(e.health), r1(e.vel.x), r1(e.vel.z)]);
  }
  return z;
}

/* ================= PUPPETS ================= */
function netRegister(e, id, mine) { e.net = { id, mine }; NET.ents.set(id, e); return e; }
function netForget(e) {
  if (!e) return;
  if (e.model) { scene.remove(e.model.group); disposeModel(e.model.group); }
  const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1);
  if (e.net) NET.ents.delete(e.net.id);
}
function netTeamColor(team) { return G.mode === 'ffa' ? 0xD9773F : TEAMS[team] ? TEAMS[team].color : 0x4F95DB; }
function netTag(e) {
  if (!e || !e.model || e === G.player || e.isZombie) return;
  if (e.tag) { e.model.group.remove(e.tag); e.tag = null; }
  if (G.mode === 'ffa' || !G.player || e.team !== G.player.team) return;
  e.tag = nameTag(e.name, e.human ? '#B9F28C' : '#8FC2F2'); e.tag.position.y = 2.15; e.model.group.add(e.tag);
}
const netKey = (k, fallback) => WEAPONS[k] ? k : fallback;
function netPuppet(id, name, team, key, optic, human) {
  key = netKey(key, 'ar');
  const cls = Object.assign(botLoadout(), { primary: key, optic: opticsFor(key).includes(optic) ? optic : defaultOptic(key), atts: noAtts(), perks: [] });
  const e = makeEntity(name, team, true, cls);
  if (e.tag) { e.model.group.remove(e.tag); e.tag = null; }
  e.human = !!human; e.wkey = key; e.alive = false; e.model.group.visible = false; e.sc = undefined;
  e.lethal = 'frag'; e.tact = 'flash'; e.lethalN = 0; e.tactN = 0;
  netRegister(e, id, false);
  G.ents.push(e); netTag(e);
  return e;
}
function netRebuild(e, key, optic) {
  key = netKey(key, e.wkey || 'ar');
  const vis = e.model ? e.model.group.visible : false;
  if (e.model) { scene.remove(e.model.group); disposeModel(e.model.group); }
  e.tag = null;
  e.model = buildSoldier(netTeamColor(e.team), key, optic || defaultOptic(key), null); scene.add(e.model.group); e.model.group.visible = vis;
  e.weapons[0] = makeWeapon(key, optic, null); e.wi = 0; e.wkey = key;
  netTag(e);
}
function netRoster(ro) {
  const want = new Set();
  for (const [id, name, team, key, optic] of ro) {
    want.add(id);
    if (!NET.ents.has(id)) netPuppet(id, String(name).slice(0, 16), team, key, optic, false);
  }
  for (const [id, e] of NET.ents) if (id[0] === 'b' && !want.has(id)) netForget(e);
}
function netHumans() {
  const out = [];
  if (G.player) out.push(G.player);
  for (const e of G.ents) if (e.human) out.push(e);
  return out;
}
function netTeamOf(id) {
  if (NET.teams[id]) return NET.teams[id];
  if (!netHost()) return G.mode === 'ffa' ? 'F9' : 'A';
  // the host seats a player who arrived mid-match
  const used = Object.values(NET.teams);
  let t = 'A';
  if (G.zm) t = 'A';
  else if (G.mode === 'ffa') t = 'F' + used.length;
  else if (NET.meta && NET.meta.teams === 'versus') t = used.filter(x => x === 'A').length > used.filter(x => x === 'B').length ? 'B' : 'A';
  NET.teams[id] = t;
  return t;
}
function netHumanState(id, P, p) {
  const nid = 'h' + id;
  let e = NET.ents.get(nid);
  const team = netTeamOf(id);
  if (!e) e = netPuppet(nid, P.name, team, p.w, p.o, true);
  if (e.name !== P.name) { e.name = P.name; netTag(e); }
  if (e.team !== team) { e.team = team; netRebuild(e, e.wkey, p.o); }
  if (p.w !== e.wkey) netRebuild(e, p.w, p.o);
  e.zp = p.zp || 0; e.zk = p.zk || 0; e.zh = p.zh || 0; e.zt = p.zt || 0;
  netApplyPose(e, p.q);
}
function netDropHuman(id) { const e = NET.ents.get('h' + id); if (e) netForget(e); }
function netApplyPose(e, q) {
  if (!Array.isArray(q)) return;
  const [x, y, z, yaw, pitch, f, sc, vx, vz, hp, ads, rl] = q;
  const T = e.nt || (e.nt = {});
  T.ads = typeof ads === 'number' ? ads : 0; T.rl = typeof rl === 'number' ? rl : -1;
  const eq = q.length >= 16 ? q : null;   // a friend holding or throwing equipment
  e.eqH = eq && typeof eq[12] === 'number' ? eq[12] : -1; e.eqT = eq && typeof eq[13] === 'number' ? eq[13] : -1;
  e.eqY = eq && typeof eq[14] === 'number' ? eq[14] : -1; e.eqR = eq ? eq[15] : 0;
  Object.assign(T, { x, y, z, yaw, pitch, f, vx, vz, t: nowMs() });
  const alive = !!(f & 1);
  if (alive && !e.alive) netPuppetLive(e);
  else if (!alive && e.alive) netPuppetDie(e, null, false);
  e.health = hp;
  if (e.sc === undefined) e.sc = sc;
  else if (sc !== e.sc) { const n = Math.min(3, (sc - e.sc + 1000) % 1000); e.sc = sc; if (alive) for (let k = 0; k < n; k++) netPuppetShot(e); }
}
function netPuppetLive(e) {
  const T = e.nt;
  e.alive = true; e.health = e.maxHealth || 100; e.dd = null; e.killFrom = null; e.burnT = 0;
  e.pos.set(T.x, T.y, T.z); e.yaw = T.yaw;
  if (e.model) { e.model.group.visible = true; e.model.group.rotation.set(0, e.yaw, 0); e.model.group.position.copy(e.pos); if (e.model.flash) e.model.flash.visible = false; }
}
function netPuppetDie(e, a, head) {
  if (!e.alive) { if (a && !e.killFrom) { e.killFrom = { x: a.pos.x, z: a.pos.z }; e.killHead = !!head; } return; }
  e.alive = false; e.health = 0; e.deathT = G.now; e.dd = null; e.killHead = !!head;
  e.killFrom = a ? { x: a.pos.x, z: a.pos.z } : null;
  if (e.model && e.model.flash) e.model.flash.visible = false;
}
const _po = new THREE.Vector3(), _pd2 = new THREE.Vector3();
function netPuppetShot(e) {
  const w = weapon(e); if (!w) return;
  e.lastShotT = G.now;
  soundAt(e, w);
  const supp = w.has('suppressor');
  if (e.model && e.model.flash && !supp) { e.model.flash.visible = true; e.model.flash.rotation.z = Math.random() * 3; e.flashT = .045; }
  if (!w.d.proj) {
    eyeOf(e, _po); dirFrom(e.yaw, e.pitch, _pd2);
    const T = rayWorld(_po, _pd2, 160);
    if (!G.zm) G.events.push({ t: G.now, k: 'shot', id: e.id, x: _po.x + _pd2.x * T, y: _po.y + _pd2.y * T, z: _po.z + _pd2.z * T, snd: w.d.snd, supp });
    const rx = Math.cos(e.yaw), rz = -Math.sin(e.yaw);
    const M = modelMuzzle(e, new THREE.Vector3(), _po) || new THREE.Vector3(_po.x + _pd2.x * .7 + rx * .06, _po.y + _pd2.y * .7 - .12, _po.z + _pd2.z * .7 + rz * .06);
    const am = w.am || AMMO.std, hx = _po.x + _pd2.x * T, hy = _po.y + _pd2.y * T, hz = _po.z + _pd2.z * T;
    if (am.glow) glowTracer(M.x, M.y, M.z, hx, hy, hz, am.glow);
    else tracer(M.x, M.y, M.z, hx, hy, hz, am.fire ? 0xFF7A20 : w.d.tracer);
  }
  if (netHost()) {
    const hear = supp ? 9 : 32;
    for (const b of G.ents) if (b.isBot && !b.human && b.alive && isEnemy(b, e) && b.pos.distanceTo(e.pos) < hear) { b.lastKnown = e.pos.clone(); b.lastKnownT = G.now; }
  }
}
function updatePuppet(e, dt) {
  if (e.isZombie) { netZombiePuppet(e, dt); return; }
  if (e.flashT > 0) { e.flashT -= dt; if (e.flashT <= 0 && e.model && e.model.flash) e.model.flash.visible = false; }
  if (!e.alive) { if (e.model && G.now - e.deathT < 3.2) animateDead(e); return; }
  const T = e.nt; if (!T) return;
  const lag = Math.min(.12, (nowMs() - T.t) / 1000);
  const tx = T.x + T.vx * lag, tz = T.z + T.vz * lag, k = Math.min(1, dt * 14);
  if (Math.hypot(tx - e.pos.x, tz - e.pos.z) > 4 || Math.abs(T.y - e.pos.y) > 3) e.pos.set(tx, T.y, tz);
  else { e.pos.x += (tx - e.pos.x) * k; e.pos.y += (T.y - e.pos.y) * Math.min(1, dt * 18); e.pos.z += (tz - e.pos.z) * k; }
  e.vel.set(T.vx, 0, T.vz);
  e.yaw = wrap(e.yaw + wrap(T.yaw - e.yaw) * Math.min(1, dt * 20)); e.pitch += (T.pitch - e.pitch) * Math.min(1, dt * 20);
  e.adsK = lerp(e.adsK || 0, T.ads || 0, Math.min(1, dt * 18)); e.rlProg = T.rl === undefined ? -1 : T.rl;
  const st = (T.f >> 1) & 3;
  e.stance = (T.f & 64) ? 'prone' : st === 2 ? 'prone' : st === 1 ? 'crouch' : 'stand';
  e.slideT = T.f & 8 ? .4 : 0; e.sprinting = !!(T.f & 16); e.meleeT = T.f & 32 ? .2 : 0;
  e.height = e.slideT > 0 ? 1.0 : STANCE[e.stance].h;
  e.onGround = true;
  if (e.model) { e.model.group.visible = true; poseSoldier(e, dt, !!(T.f & 128) && !e.sprinting, !!(T.f & 32)); }
  if (e.tag) e.tag.visible = !(T.f & 64) || true;
}

/* ================= SNAPSHOTS FROM THE HOST ================= */
function netSnapshot(s) {
  if (typeof s.tl === 'number' && !G.zm) G.timeLeft = s.tl;
  if (s.ts) { G.teamScore.A = s.ts[0]; G.teamScore.B = s.ts[1]; }
  for (const r of s.e || []) { const e = NET.ents.get('b' + r[0]); if (e) netApplyPose(e, r.slice(1)); }
  for (const [id, k, d, sc, cf] of s.st || []) { const e = NET.ents.get(id); if (e) { e.kills = k; e.deaths = d; e.score = sc; e.confirms = cf; } }
  if (G.mode === 'kc') netMirrorTags(s.tg || []);
  if (s.end && !G.ended && !G.zm) { G.ended = true; G.endT = 0; beginEnding(); }
}
function netMirrorTags(list) {
  const want = new Map(list.map(t => [t[0], t]));
  for (let i = G.tags.length - 1; i >= 0; i--) { const t = G.tags[i]; if (!want.has(t.nid)) { scene.remove(t.mesh); G.tags.splice(i, 1); } else want.delete(t.nid); }
  for (const [nid, team, x, y, z] of want.values()) { const tg = spawnTag({ team, pos: { x, y, z } }); tg.nid = nid; }
}
function netZombieSnap(z) {
  const Z = G.zm; if (!Z) return;
  if (z.r && z.r !== Z.round) zmRoundFx(z.r, !!z.dg, z.n);
  if (z.b && !NET.zBreak) zmBreakFx();
  NET.zBreak = z.b;
  Z.power.instakill = z.pw[0]; Z.power.double = z.pw[1];
  if (z.ov && !Z.over) zmGameOverAll();
  // power-ups lying around
  const want = new Map(z.dr.map(d => [d[0], d]));
  for (let i = Z.drops.length - 1; i >= 0; i--) { const d = Z.drops[i]; if (!want.has(d.nid)) { scene.remove(d.sprite); Z.drops.splice(i, 1); } else want.delete(d.nid); }
  for (const [nid, ti, x, y, zz] of want.values()) { zmSpawnDrop(x, y, zz, Object.keys(ZM_POWERUPS)[ti] || 'maxammo'); Z.drops[Z.drops.length - 1].nid = nid; }
  // the undead
  const seen = new Set();
  for (const r of z.e) {
    const id = 'z' + r[0]; seen.add(id);
    let e = NET.ents.get(id);
    if (!e) e = netMakeZombie(r);
    else if (!e.alive) continue;
    const kind = ZK_LIST[r[6]] || 'walker';
    if (kind !== e.kind && kind === 'crawler') zmMakeCrawler(e);
    const T = e.nt; Object.assign(T, { x: r[1], y: r[2], z: r[3], yaw: r[4], f: r[5], vx: r[9] || 0, vz: r[10] || 0, t: nowMs() });
    e.runner = !!(r[5] & 2); e.health = r[8];
    if (r[7] <= 0) e.riseT = Math.min(e.riseT, 0);
  }
  for (const [id, e] of NET.ents) if (id[0] === 'z' && !seen.has(id) && e.alive) { netPuppetDie(e, null, false); e.attackT = 0; }
}
function netMakeZombie(r) {
  const [zn, x, y, z, yaw, f, ki, rise, hp] = r;
  const kind = ZK_LIST[ki] || 'walker', K = ZKINDS[kind];
  const e = {
    id: zid++, zn, name: kind === 'dog' ? 'Hellhound' : 'Zombie', kind, isDog: kind === 'dog', team: 'Z', isZombie: true, isBot: false,
    pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), yaw, pitch: 0, height: K.h, stance: kind === 'crawler' ? 'prone' : 'stand', slideT: 0, onGround: true,
    health: hp, maxHealth: hp, alive: true, riseT: rise / 10, runner: !!(f & 2), limp: zn % 2, attackT: 0, kills: 0, deaths: 0, score: 0, weapons: [], lastShotT: -99, deathT: 0,
    walkPhase: Math.random() * 6, groanT: rand(1, 5), stunT: 0, blindT: 0, model: kind === 'dog' ? buildHound() : buildZombie(kind), nt: { x, y, z, yaw, f, vx: 0, vz: 0, t: nowMs() },
  };
  scene.add(e.model.group); G.ents.push(e); netRegister(e, 'z' + zn, false);
  if (e.riseT > 0) {
    poseRising(e);
    if (e.isDog) { lightning(x, z); flashLight.position.set(x, 3, z); flashLight.intensity = 7; puff(x, .6, z, softTex(255, 140, 50), .4, 3.2, .5, 1); burst(x, .3, z, 'zap', 10); }
    else { zombieRise(e); burst(x, .1, z, 'gore', 8); puff(x, .3, z, softTex(80, 66, 50), .5, 2.2, 1.2, .6, .3); }
  }
  return e;
}
function netZombiePuppet(z, dt) {
  if (!z.alive) { animateDead(z); return; }
  const T = z.nt;
  if (z.riseT > 0) { z.riseT -= dt; z.pos.set(T.x, T.y, T.z); poseRising(z); return; }
  const lag = Math.min(.12, (nowMs() - T.t) / 1000), tx = T.x + T.vx * lag, tz = T.z + T.vz * lag, k = Math.min(1, dt * 12);
  if (Math.hypot(tx - z.pos.x, tz - z.pos.z) > 4) z.pos.set(tx, T.y, tz);
  else { z.pos.x += (tx - z.pos.x) * k; z.pos.y += (T.y - z.pos.y) * Math.min(1, dt * 16); z.pos.z += (tz - z.pos.z) * k; }
  z.vel.set(T.vx, 0, T.vz);
  z.yaw = wrap(z.yaw + wrap(T.yaw - z.yaw) * Math.min(1, dt * 12));
  const atk = !!(T.f & 4);
  if (atk && !z.atkWas) { z.attackT = z.isDog ? .35 : z.kind === 'brute' ? .75 : .55; if (z.isDog) dogBark(z); else zombieAttack(z); }
  z.atkWas = atk;
  if (z.attackT > 0) z.attackT -= dt;
  z.groanT -= dt; if (z.groanT <= 0) { z.groanT = rand(3, 8); if (z.isDog) dogBark(z); else zombieGroan(z); }
  poseZombie(z, dt);
}

/* ================= HITS, KILLS AND THINGS THAT FLY ================= */
// a hit on something another window owns: sent to that window, which applies it
function netDamage(v, a, amt, head, wkey) {
  if (G.zm && v.isZombie && a === G.player && G.zm.power.instakill > 0) amt = Math.max(amt, v.health + 1e4);
  const aid = a && a.net ? a.net.id : '';
  const key = v.net.id + '|' + aid + '|' + wkey;
  let d = NET.pend.get(key);
  if (!d) NET.pend.set(key, d = { t: v.net.id, a: aid, amt: 0, head: 0, w: wkey, ly: undefined });
  d.amt += amt; if (head) d.head = 1;
  if (v.lastHitY !== undefined) d.ly = v.lastHitY;
  v.lastHitY = undefined;
  // feedback right away for the shooter, guessing whether it kills from the health we last heard
  if (a === G.player) {
    const pred = (v._predHp === undefined || G.now - (v._predT || 0) > .6 ? v.health : v._predHp) - amt;
    v._predHp = pred; v._predT = G.now;
    if (!G.zm) G.events.push({ t: G.now, k: 'hit', id: a.id, head, kill: pred <= 0 });
    hitmarker(pred <= 0); sndHit(head, pred <= 0); rumble(.1, .3, 50);
    if (G.zm && v.isZombie && pred > 0) zmAddPoints(10);
  }
}
function netKill(v, a, head, wkey) {
  if (!NET.on || !v.net) return;
  netEmit(['k', v.net.id, a && a.net ? a.net.id : v.net.id, head ? 1 : 0, wkey]);
}
function netProj(pr) {
  if (!NET.on || !pr || pr.ghost || !pr.owner || !pr.owner.net || !netMine(pr.owner)) return;
  netEmit(['pr', pr.owner.net.id, pr.type, r2(pr.pos.x), r2(pr.pos.y), r2(pr.pos.z), r2(pr.vel.x), r2(pr.vel.y), r2(pr.vel.z), r2(pr.fuse)]);
}
function netEvent(P, e) {
  const type = e[1];
  if (type === 'd') {
    const [, , tid, aid, amt, head, w, ly] = e;
    const v = NET.ents.get(tid); if (!v || !netMine(v)) return;
    const a = NET.ents.get(aid) || v;
    v.lastHitY = ly >= 0 ? ly : undefined;
    applyDamage(v, a, amt, !!head, WEAPONS[w] || ['claw', 'bite', 'blast', 'nuke'].includes(w) ? w : 'ar');
  } else if (type === 'k') {
    const [, , vid, aid, head, w] = e;
    netRemoteKill(NET.ents.get(vid), NET.ents.get(aid), !!head, WEAPONS[w] ? w : 'ar');
  } else if (type === 'zk') {
    const [, , zidn, aid, head, w] = e;
    netRemoteZombieKill(NET.ents.get('z' + zidn), NET.ents.get(aid), !!head, w);
  } else if (type === 'pr') {
    const [, , oid, ptype, x, y, z, vx, vy, vz, fuse] = e;
    const owner = NET.ents.get(oid); if (!owner || !FUSE[ptype]) return;
    const pr = { type: ptype, owner, pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(vx, vy, vz), fuse, mesh: nadeMesh(ptype), stuck: false, attach: null, resting: false, ghost: true };
    if (PFLY[ptype]) { pr.impact = true; pr.age = 0; pr.trailT = 0; pr.mesh.lookAt(x - vx, y - vy, z - vz); }
    pr.mesh.position.copy(pr.pos); G.proj.push(pr);
    const { d, pan } = relPan(owner); if (!PFLY[ptype] && d < 25) foley('throw', .4 * (1 - d / 25), pan);
    if (ptype === 'gl40') playGun('gl', .9 * clamp(1 - d / 90, .05, 1), pan, false, d);
  } else if (type === 'pu') {
    if (G.zm) zmApplyDrop(e[2]);
  } else if (type === 'tg') {
    const t = NET.ents.get(e[2]);
    if (t === G.player) { if (e[3]) { popup('Kill confirmed  +50'); sndTag(true); } else { popup('Kill denied  +25'); sndTag(false); } }
  } else if (type === 'rv') {
    if (e[2] === (G.player && G.player.net && G.player.net.id)) zmRevivedByTeam(P.name);
  }
}
function netRemoteKill(v, a, head, wkey) {
  if (!v) return;
  a = a || v;
  const suicide = a === v;
  netPuppetDie(v, a, head);
  if (netHost()) {
    v.deaths++; v.streak = 0;
    if (!suicide) { a.kills++; a.streak = (a.streak || 0) + 1; a.score += 100 + (head ? 25 : 0); }
    if (G.mode === 'tdm' && !suicide && G.teamScore[a.team] !== undefined) G.teamScore[a.team]++;
    if (G.mode === 'kc') { const tg = spawnTag(v); if (a.isBot && !a.human && !suicide) a.claimTag = tg; }
  }
  if (a === G.player && !suicide) {
    if (!netHost()) a.streak = (a.streak || 0) + 1;
    const w = a.weapons[0]; w.reserve = Math.min(w.reserve + Math.ceil(w.mag / 2), w.d.reserve * 2);
    if (hasPerk(a, 'scavenger')) dropPack(v.pos.x, v.pos.y, v.pos.z);
    popup(wkey === 'knife' ? 'Knife kill  +100' : wkey === 'tknife' ? 'Long shot  +100' : head ? 'Headshot  +125' : 'Kill  +100');
    if (a.streak === 3) popup('3 kill streak');
    if (a.streak === 5) popup('5 kill streak');
  }
  annKill(v, a, head); if (!suicide) calloutKill(a, v); calloutAllyDown(v);
  // the last kill of the match is the final kill cam, whoever's window it happened in
  if (!suicide) { const wi = a.weapons.find(x => x && x.key === wkey) || weapon(a) || v.weapons[0]; G.lastKill = { t: G.now, killer: a.id, victim: v.id, wkey, head, name: a.name, vname: v.name, w: { key: wi.key, optic: wi.optic, atts: (wi.atts || []).slice() } }; }
  dropWeapon(v, v.weapons[0], v.pos.x, v.pos.y, v.pos.z);
  addKillfeed(a, v, wkey, head);
  if (netHost()) checkEnd();
}
function netRemoteZombieKill(z, a, head, wkey) {
  if (!z) return;
  if (z.alive) {
    netPuppetDie(z, a, head); z.attackT = 0;
    if (z.isDog) { puff(z.pos.x, .6, z.pos.z, softTex(255, 120, 40), .4, 2.4, .5, .9); puff(z.pos.x, .7, z.pos.z, softTex(60, 50, 45), .6, 2.6, 1.3, .7, .5); z.model.group.visible = false; }
    if (z.kind === 'bloater') zmBloaterFx(z);
  }
  if (a === G.player) zmKillPoints(z, head, wkey);
}

/* ================= THE MATCH ================= */
// the host's settings for a match it is starting
function netStartCfg() {
  const m = netLobbyMeta();
  NET.ep = Math.max((NET.ep || 0) + 1, (Date.now() / 1000 | 0) % 100000);
  m.st = 'play'; m.ep = NET.ep; NET.inMatch = false;
  // seat everyone: co-op puts all players on Vanguard, versus alternates, free-for-all gives each their own
  const ids = [NET.id, ...[...NET.peers.values()].filter(P => P.role !== 'host' && nowMs() - P.seen < 5000).sort((a, b) => a.joinedAt - b.joinedAt).map(P => P.id)];
  NET.teams = {};
  ids.forEach((id, i) => { NET.teams[id] = m.k === 'zm' ? 'A' : m.mode === 'ffa' ? 'F' + i : m.teams === 'versus' ? (i % 2 ? 'B' : 'A') : 'A'; });
  NET.meta = m;
  return m;
}
// bots to add for a match the host is starting, given how many players are on each team
function netBotPlan(m) {
  const humans = Object.values(NET.teams);
  if (m.mode === 'ffa') return { ffa: Math.max(0, m.ffa - (humans.length - 1)) };
  const hA = humans.filter(t => t === 'A').length, hB = humans.filter(t => t === 'B').length;
  if (m.teams === 'versus') { const big = Math.max(hA, hB); return { A: m.allies + big - hA, B: m.allies + big - hB }; }
  return { A: Math.max(0, m.allies - (hA - 1)), B: m.enemies };
}
function netMatchBegun() {
  NET.inMatch = true; NET.starting = false; NET.evOut = []; NET.pend.clear(); NET.zBreak = 0;
  NET.ents.clear();
  netRegister(G.player, 'h' + NET.id, true);
  if (netHost()) {
    NET.roster = [];
    for (const e of G.ents) if (e.isBot) { netRegister(e, 'b' + e.id, true); NET.roster.push(['b' + e.id, e.name, e.team, e.cls.primary, e.cls.optic]); }
    for (const e of G.ents) if (e !== G.player) netTag(e);
  }
  for (const P of NET.peers.values()) P.lastSeq = null;
}
function netClientStart(m) {
  NET.starting = true;
  if (G.state !== 'menu') { if (document.pointerLockElement) document.exitPointerLock(); clearMatch(); G.state = 'menu'; $('#hud').hidden = true; $('#pause').hidden = true; $('#end').hidden = true; vmRoot.visible = true; }
  if (!$('#editor').hidden) closeEditor();
  NET.ep = m.ep; NET.cfg = m;
  const host = NET.peers.get(NET.hostId);
  const zm = m.k === 'zm';
  showLoading(zm ? `Zombies · with ${host ? host.name : 'the host'}` : `${MODES[m.mode] ? MODES[m.mode].name : 'Match'} · with ${host ? host.name : 'the host'}`, zm ? MAPS[zmMapKey(m.zm)].name : (MAPS[m.map] || MAPS.acres).name,
    zm ? ZTIPS[Math.random() * ZTIPS.length | 0] : TIPS[Math.random() * TIPS.length | 0], zm, () => {
      if (!NET.on || !NET.hostMeta || NET.hostMeta.ep !== m.ep || NET.hostMeta.st !== 'play') { NET.starting = false; showMenu(); return; }
      if (zm) startZombies(m); else startMatch(m);
    });
}
// a client stepping out of a match that is still going
function netSitOut() { if (netClient() && NET.inMatch) { NET.sitOut = NET.ep; NET.inMatch = false; } }

/* ================= LOBBY AND WINDOWS ================= */
let lobbySig = '';
function netLobbyChanged() {
  if (typeof menuActive !== 'function' || !menuActive()) return;
  if (MENU.screen !== 'lobby' && MENU.screen !== 'party') return;
  const ae = document.activeElement; if (ae && ae.tagName === 'INPUT') return;   // don't redraw under someone typing
  const sig = [...NET.peers.values()].map(P => P.id + P.name + P.role).join() + '|' + NET.msg + '|' + JSON.stringify(NET.hostMeta || {}) + NET.hostId + NET.inMatch + NET.sitOut;
  if (sig === lobbySig) return; lobbySig = sig;
  renderMenu();
}
setInterval(() => {
  if (typeof menuActive === 'function' && menuActive() && MENU.screen === 'party') netLobbyChanged();
  // a Player 2 window joins the game on this computer by itself
  if (SEAT.n > 1 && !NET.on && NET.autoJoinT > 0) { NET.autoJoinT -= .5; if (localHostSeen()) { NET.autoJoinT = 0; netJoinLocal(); } }
}, 500);
// the whole page as it first loaded, to start a Player 2 window or the right half of a split screen
function netChildDoc() {
  const head = document.head.outerHTML.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<head>/i, `<head><base href="${location.href.replace(/"/g, '&quot;')}">`);
  const scripts = [...document.querySelectorAll('script[src]')].map(s => `<script src="${s.getAttribute('src')}"></` + 'script>').join('\n');
  return `<!doctype html><html>${head}<body>${SEAT.markup}\n${scripts}</body></html>`;
}
// build the game in a fresh blank window: the page structure first, then each script in order
function netBuildWindow(w) {
  const d = w.document;
  d.open(); d.write('<!doctype html><html><head></head><body></body></html>'); d.close();
  const base = d.createElement('base'); base.href = location.href; d.head.appendChild(base);
  d.head.insertAdjacentHTML('beforeend', document.head.innerHTML.replace(/<script[\s\S]*?<\/script>/gi, ''));
  d.body.innerHTML = SEAT.markup;
  for (const el of document.querySelectorAll('script[src]')) {
    const sc = d.createElement('script'); sc.src = new URL(el.getAttribute('src'), location.href).href; sc.async = false; d.body.appendChild(sc);
  }
}
function netOpenP2() {
  let w = null;
  try {
    if (NET.p2Win && !NET.p2Win.closed) { NET.p2Win.focus(); return true; }
    w = window.open('', 'br-seat-2', 'popup,width=1280,height=760');
    if (!w) throw new Error('blocked');
    if (!w.SEAT) netBuildWindow(w);
    NET.p2Win = w;
    return true;
  } catch (e) {
    NET.msg = 'Your browser blocked the new window. Open this game in another tab instead and pick “Join” under Play with friends.';
    renderMenu();
    return false;
  }
}
function netSplit(on) {
  if (on && !NET.splitFrame) {
    const f = document.createElement('iframe');
    f.name = 'br-seat-2-split'; f.className = 'brsplit'; f.setAttribute('allow', 'gamepad; fullscreen; autoplay'); f.setAttribute('tabindex', '-1');
    f.srcdoc = netChildDoc();
    document.documentElement.appendChild(f);
    NET.splitFrame = f; document.body.classList.add('split');
  } else if (!on && NET.splitFrame) {
    NET.splitFrame.remove(); NET.splitFrame = null; document.body.classList.remove('split');
  }
  resize();
}
function netFullscreen() {
  toggleFullscreen();
}
// a Player 2 window starts on the party screen and looks for the game to join
if (SEAT.n > 1) {
  NET.autoJoinT = 20;
  setTimeout(() => { MENU.stack = [['main', 0]]; MENU.screen = 'party'; MENU.sel = 0; menuContext(); renderMenu(); }, 50);
}
