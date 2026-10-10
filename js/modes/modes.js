// Blast Radius \u00B7 game modes, bot difficulty, teams
'use strict';

/* ================= DATA ================= */
const MODES = {
  tdm: { name: 'Team Deathmatch', short: 'TDM', desc: 'First team to the kill limit wins.', limit: 40, unit: 'kills', team: true },
  ffa: { name: 'Free-for-All', short: 'FFA', desc: 'Everyone for themselves. First to the limit.', limit: 25, unit: 'kills', team: false },
  zombies: { name: 'Zombies', short: 'ZM', desc: 'Survive the night.', limit: 0, unit: 'rounds', team: false, hidden: true },
  kc:  { name: 'Kill Confirmed', short: 'KC', desc: 'Grab enemy tags to score. Deny theirs.', limit: 20, unit: 'confirms', team: true },
};
const DIFF = {
  recruit: { name: 'Recruit', note: 'Slow to react, sprays wide. Good for learning the map.', react: .75, err: .05, initErr: .28, settle: 1.6, turn: 3.2, headP: .04, burst: [.25, .55], pause: [.45, .9], dmg: .65, crouchP: 0 },
  regular: { name: 'Regular', note: 'Reacts in under half a second and tracks you through cover.', react: .42, err: .03, initErr: .16, settle: 2.6, turn: 6, headP: .14, burst: [.3, .8], pause: [.25, .6], dmg: .85, crouchP: .2 },
  veteran: { name: 'Veteran', note: 'Fast reactions, tight bursts, goes for the head and crouches in fights.', react: .22, err: .017, initErr: .08, settle: 4.2, turn: 10, headP: .3, burst: [.5, 1.1], pause: [.12, .32], dmg: 1, crouchP: .35 },
};
const TEAMS = { A: { name: 'Vanguard', color: 0x4F95DB, css: 'cA' }, B: { name: 'Ironside', color: 0xE0623F, css: 'cB' } };
const NAMES = ['Hatch', 'Dusty', 'Rook', 'Ozzie', 'Pike', 'Juniper', 'Vance', 'Bishop', 'Reno', 'Mako', 'Sable', 'Tex', 'Coyote', 'Wren', 'Duke', 'Nova', 'Gage', 'Mesa'];
const STANCE = { stand: { h: 1.8, eye: 1.62, speed: 5 }, crouch: { h: 1.2, eye: 1.08, speed: 2.6 }, prone: { h: .6, eye: .42, speed: 1.1 } };
const SLIDE_T = .8;
