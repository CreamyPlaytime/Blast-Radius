// Blast Radius \u00B7 front-end menus: title, main menu, multiplayer and zombies lobbies, options
'use strict';

/* Menus are lists you drive with the keyboard (arrows / WASD, Enter, Esc), a controller
   (D-pad or stick, A, B) or the mouse. Rows can be actions, choices (\u25C0 value \u25B6), sliders
   or text fields. Each screen can draw a panel on the right.                           */

const MENU = { screen: 'title', sel: 0, stack: [], items: [], rep: { dir: null, t: 0 }, lastLaunch: null };
const hashName = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const botLevel = n => 3 + hashName(n) % 50;
const cycle = (list, cur, d) => list[(list.indexOf(cur) + d + list.length) % list.length];
const TIPS = [
  'Tap crouch while sprinting to slide into cover.',
  'Crouch behind the upstairs window crates for a sniper nest with cover.',
  'Kill cams show you exactly where the shot came from. Use them.',
  'Iron sights line up exactly with the centre of the screen. Trust them.',
  'Hold a dropped gun\'s button to swap it for the one in your hands.',
  'A suppressor keeps you off the enemy minimap when you fire.',
  'Hold your grenade button to cook a frag. Let go before it beeps fast.',
  'Jump at a window or a low wall to climb through or over it.',
  'Perk Greed and Perk Overload wildcards let you run four or six perks.',
  'Press reload again to cancel a reload and get back to shooting.',
];
const ZTIPS = [
  'Every hit is worth 10 points. Body shots on early rounds build your bank.',
  'Headshots and knife kills pay the most.',
  'The mystery box costs 950 and can give you the Atomizer.',
  'Iron Hide lets you take far more hits before going down.',
  'Zombies dig up out of the yards. Keep an eye on the grass.',
  'Standing on a car buys you a second. Zombies can climb up after you.',
  'Every fifth round the hellhounds come. Back into a corner and listen.',
  'Bloaters burst when they die. Shoot them before they reach you.',
  'The upstairs rooms have one way in. Great until it isn\'t.',
];

/* ---------- screens ---------- */
const DIFFS = Object.keys(DIFF), MODE_KEYS = Object.keys(MODES).filter(k => !MODES[k].hidden);
const slider = (label, key, min, max, step, fmt, desc) => ({
  label, desc, kind: 'slider',
  value: () => { const v = settings[key], k = Math.round((v - min) / (max - min) * 10); return `<span class="seg10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</span>${fmt(v)}`; },
  change: d => { settings[key] = +clamp(settings[key] + d * step, min, max).toFixed(3); saveSettings(); if (key === 'vol' && master) master.gain.value = settings.vol; if (key === 'music') musicVolume(); },
});
// anti-aliasing can only change when the game reloads, so say so when the saved choice differs from what's running
const aaLabel = () => (settings.aa !== false ? 'On' : 'Off') + ((settings.aa !== false) !== AA_AT_START ? ' (on reload)' : '');
function screenDef(id) {
  const S = settings;
  if (id === 'main') return {
    crumb: '<b>Main menu</b>', head: '', big: true, items: [
      { label: 'Multiplayer', desc: `Custom games against bots. Team Deathmatch, Free-for-All and Kill Confirmed on ${MAP_KEYS().length} maps.`, act: () => go('mp'), side: sideRecordMP },
      { label: 'Zombies', desc: 'Survive endless rounds of the undead at night on Atomic Acres, Freight or Gate 9. Earn points, buy guns off the walls and gamble on the mystery box.', act: () => go('zm'), side: sideRecordZM },
      { label: 'Play with friends', desc: 'Team up or face off. Two windows on two monitors, split screen on one, or an online game friends join with a code.', act: () => go('party'), side: sidePartyInfo },
      { label: 'Create a Class', desc: `Build five loadouts from ${PRIMARIES.length} primaries and ${SECONDARIES.length} sidearms and launchers: optics, ammo types, up to five attachments, three to six perks and a wildcard.`, act: () => openEditor(S.classIdx), side: sideClasses },
      { label: 'Options', desc: 'Sensitivity, field of view, audio, kill cams and your callsign.', act: () => go('opt'), side: sideControls },
      { label: 'Switch player', small: true, desc: `Playing as ${esc(S.profile.name)}. Not you? Pick your own profile: everyone on this computer keeps their own callsign, classes, level and sensitivity.`, act: () => go('who'), side: sideWho },
    ],
  };
  if (id === 'who') {
    const list = listProfiles(), free = freeProfileSlot();
    return {
      crumb: '<b>Switch player</b>', head: '<small>Who\u2019s playing?</small>Players', side: sideWho, items: [
        ...list.map(p => ({ label: `${esc(p.name)}${p.slot === PROFILE_SLOT ? ' <small class="cur">\u2022 playing</small>' : ''}`, desc: `Level ${p.level}.${p.slot === PROFILE_SLOT ? ' This is the profile in use.' : ' Play as this profile: its callsign, classes, level and sensitivity.'}`, act: () => { useProfile(p.slot); uiSound('select'); back(); } })),
        ...(free ? [{ label: 'New player', sep: true, desc: 'Start a fresh profile with the default classes, then pick a callsign.', act: () => { useProfile(free, true); MENU.stack = [['main', 0]]; MENU.screen = 'opt'; MENU.sel = 0; menuContext(); renderMenu(); setTimeout(() => { const i = $('#optName'); if (i) { i.focus(); i.select(); } }, 30); } }] : []),
        { label: 'Back', sep: !free, desc: 'Keep playing as ' + esc(S.profile.name) + '.', act: back },
      ],
    };
  }
  if (id === 'mp') {
    const ffa = S.mode === 'ffa', M = MODES[S.mode];
    return {
      crumb: 'Multiplayer \u00B7 <b>Custom game</b>', head: '<small>Multiplayer</small>Custom Game', side: sideLobby, items: [
        { label: 'Start match', desc: `${M.name} on ${MAPS[S.map].name}. ${M.desc}`, act: launchMP },
        { label: 'Game mode', kind: 'choice', sep: true, value: () => M.name, change: d => { S.mode = cycle(MODE_KEYS, S.mode, d); }, desc: M.desc },
        { label: 'Map', kind: 'choice', value: () => MAPS[S.map].name, change: d => { S.map = cycle(MAP_KEYS(), S.map, d); loadMap(S.map, 'day'); }, desc: MAPS[S.map].desc },
        { label: ffa ? 'Opponents' : 'Friendly bots', kind: 'choice', value: () => ffa ? S.ffaBots : S.allies, change: d => { if (ffa) S.ffaBots = clamp(S.ffaBots + d, 1, 11); else S.allies = clamp(S.allies + d, 0, 5); }, desc: ffa ? 'How many bots you fight in Free-for-All.' : 'Bots on Vanguard, your team.' },
        ...(ffa ? [] : [{ label: 'Enemy bots', kind: 'choice', value: () => S.enemies, change: d => { S.enemies = clamp(S.enemies + d, 1, 6); }, desc: 'Bots on Ironside.' }]),
        { label: 'Bot difficulty', kind: 'choice', value: () => DIFF[S.difficulty].name, change: d => { S.difficulty = cycle(DIFFS, S.difficulty, d); }, desc: DIFF[S.difficulty].note },
        { label: 'Time limit', kind: 'choice', value: () => `${S.time} min`, change: d => { S.time = cycle([5, 10, 15], S.time, d); }, desc: `Or first to ${M.limit} ${M.unit}.` },
        { label: 'Kill cams', kind: 'choice', value: () => S.killcam !== false ? 'On' : 'Off', change: () => { S.killcam = S.killcam === false; }, desc: 'Replay your death from the killer\'s eyes, and the final kill of the match.' },
        { label: 'Class', kind: 'choice', sep: true, value: () => esc(S.classes[S.classIdx].name), change: d => { S.classIdx = (S.classIdx + d + 5) % 5; }, desc: classLine(S.classes[S.classIdx]) },
        { label: 'Create a Class', desc: 'Edit your five loadouts.', act: () => openEditor(S.classIdx) },
      ],
    };
  }
  if (id === 'zm') return {
    crumb: 'Zombies \u00B7 <b>Solo</b>', head: `<small>Zombies</small>${MAPS[zmMapKey(S.zmMap)].name}`, theme: 'zm', side: sideZombies, items: [
      { label: 'Start game', desc: 'You start with a pistol, a knife, two grenades and 500 points.', act: launchZM },
      zmMapItem(true),
      { label: 'Starting round', kind: 'choice', value: () => S.zmStart, change: d => { S.zmStart = cycle([1, 5, 10, 15, 20], S.zmStart, d); }, desc: 'Start later for a tougher fight. You get extra points to make up for it.' },
      { label: 'Difficulty', kind: 'choice', value: () => ZM_DIFF[S.zmDiff].name, change: d => { S.zmDiff = cycle(Object.keys(ZM_DIFF), S.zmDiff, d); }, desc: ZM_DIFF[S.zmDiff].desc },
    ],
  };
  if (id === 'opt') return {
    crumb: 'Options', head: '<small>Settings</small>Options', side: sideControls, items: [
      { label: 'Callsign', kind: 'text', desc: 'The name on your player card.', value: () => `<input id="optName" maxlength="14" value="${esc(S.profile.name)}" spellcheck="false">`, act: () => { const i = $('#optName'); if (i) { i.focus(); i.select(); } } },
      slider('Mouse sensitivity', 'sens', .2, 3, .1, v => v.toFixed(1), 'How fast the camera turns with the mouse.'),
      slider('Stick sensitivity', 'padSens', .3, 2.5, .1, v => v.toFixed(1), 'How fast the camera turns with the right stick.'),
      { label: 'Aim assist', kind: 'choice', value: () => ({ off: 'Off', standard: 'Standard', strong: 'Strong' })[S.aimAssist], change: d => { S.aimAssist = cycle(['off', 'standard', 'strong'], S.aimAssist, d); }, desc: 'Controller only. Slows your aim over targets, follows them as they strafe, and snaps onto anyone close to your crosshair when you aim down sights.' },
      slider('Field of view', 'fov', 65, 105, 2, v => `${v}\u00B0`, 'Wider shows more of the world. Narrower makes targets bigger.'),
      slider('Master volume', 'vol', 0, 1, .05, v => `${Math.round(v * 100)}`, 'Everything you hear.'),
      slider('Music volume', 'music', 0, 1, .05, v => `${Math.round(v * 100)}`, 'Menu music.'),
      slider('Voice volume', 'voiceVol', 0, 1, .05, v => `${Math.round(v * 100)}`, 'The announcer and your squad on the radio.'),
      { label: 'Announcer', kind: 'choice', value: () => S.announcer !== false ? 'On' : 'Off', change: () => { S.announcer = S.announcer === false; }, desc: 'Calls out the match start, multi-kills, streaks, the lead, the last minute and the result.' },
      { label: 'Squad callouts', kind: 'choice', value: () => S.callouts !== false ? 'On' : 'Off', change: () => { S.callouts = S.callouts === false; }, desc: 'Teammates near you call contacts, reloads, grenades and kills over the radio.' },
      { label: 'Kill cams', kind: 'choice', value: () => S.killcam !== false ? 'On' : 'Off', change: () => { S.killcam = S.killcam === false; }, desc: 'Replay your death from the killer\'s eyes.' },
      { label: 'Fullscreen', kind: 'choice', value: () => isFullscreen() ? 'On' : 'Off', change: () => toggleFullscreen(), desc: fullscreenNote() },
      { label: 'Shadows', kind: 'choice', sep: true, value: () => S.shadows !== false ? 'On' : 'Off', change: () => { S.shadows = S.shadows === false; applyShadows(); }, desc: 'Sun shadows from buildings, players and props. Turn off to save video memory on consoles and older machines.' + (IS_XBOX ? ' (Xbox detected: lighter settings were picked for you.)' : ' (This device was not detected as an Xbox.)') },
      { label: 'Anti-aliasing', kind: 'choice', value: () => aaLabel(), change: () => { S.aa = S.aa === false; }, desc: 'Smooths jagged edges. Takes effect the next time the game loads. Turn off on Xbox.' },
      { label: 'Graphics', kind: 'choice', value: () => ({ native: 'Native', low: 'Low', ultra: 'Ultra low' })[S.res] || 'Native', change: d => { S.res = cycle(['native', 'low', 'ultra'], S.res, d); applyResolution(); gfxReloadMap(); }, desc: 'Native draws at your screen\u2019s sharpness. Low draws at about 720p. Ultra low draws at about 540p and merges the scenery into a few big pieces, which uses far less video memory (for Xbox and older machines).' },
      { label: 'Performance stats', kind: 'choice', value: () => S.perf ? 'On' : 'Off', change: () => { S.perf = !S.perf; perfOn(S.perf); }, desc: 'Shows the frame rate and what each part of the game costs, and lists every hitch with its cause. Handy for tracking down stutter.' },
      { label: 'Switch player', desc: `Playing as ${esc(S.profile.name)}. Pick another saved profile or start a new one.`, act: () => go('who') },
      { label: 'Controls', sep: true, desc: 'Keyboard, mouse and controller layouts.', act: () => go('controls') },
    ],
  };
  if (id === 'party') {
    const seen = localHostSeen(), auto = SEAT.n > 1 && NET.autoJoinT > 0;
    return {
      crumb: 'Play with friends', head: '<small>Multiplayer</small>Play with friends', side: sidePartyInfo, items: [
        ...(seen ? [{ label: `Join ${esc(seen.name)}\u2019s game`, desc: 'Their game is open in another window of this browser on this computer.', act: netJoinLocal }] : []),
        ...(auto && !seen ? [{ label: 'Looking for the game\u2026', desc: 'This is a Player 2 window. It joins the game hosted in the first window by itself.', act: () => {} }] : []),
        { label: 'Host on this computer', desc: 'Play in two windows (drag the second onto another monitor) or split screen. Each player needs a controller, or one can use keyboard and mouse.', act: netHostLocal },
        { label: 'Host online game', desc: IN_CLAUDE ? 'Get a 4-letter code your friends type in. They need to be signed into claude.ai with this game shared to them.' : 'Your computer runs the game and you get a 4-letter code. Friends open this same game link and type it in. No accounts needed.', act: netHostOnline },
        { label: 'Code', kind: 'text', sep: true, desc: 'Type the 4-letter code the host sees.', value: () => `<input id="joinCode" maxlength="4" placeholder="ABCD" value="${esc(NET.joinDraft)}" spellcheck="false" autocomplete="off">`, act: () => { const i = $('#joinCode'); if (i) { i.focus(); i.select(); } } },
        { label: 'Join online game', desc: 'Join the online game with that code.', act: () => netJoinOnline(NET.joinDraft) },
        { label: 'Controller', kind: 'choice', sep: true, value: () => padLabel(), change: d => cyclePadPref(d), desc: 'Which controller this window listens to. Auto gives each window on this computer its own.' },
      ],
    };
  }
  if (id === 'lobby') return lobbyDef();
  if (id === 'controls') return {
    crumb: 'Options \u00B7 <b>Controls</b>', head: '<small>Options</small>Controls', side: sideControlsFull, items: [
      { label: 'Back', desc: 'Controls switch automatically to whatever you touched last.', act: back },
    ],
  };
}

/* ---------- the party lobby ---------- */
function lobbyDef() {
  const S = settings, host = netHost(), local = NET.kind === 'local';
  const hm = host ? netLobbyMeta() : (NET.hostMeta || {});
  const zm = hm.k === 'zm', M = MODES[hm.mode] || MODES.tdm, ffa = hm.mode === 'ffa', versus = hm.teams === 'versus';
  const common = [
    { label: 'Callsign', kind: 'text', sep: true, desc: 'Your name in the game and on the scoreboard.', value: () => `<input id="optName" maxlength="14" value="${esc(S.profile.name)}" spellcheck="false">`, act: () => { const i = $('#optName'); if (i) { i.focus(); i.select(); } } },
    { label: 'Class', kind: 'choice', value: () => esc(S.classes[S.classIdx].name), change: d => { S.classIdx = (S.classIdx + d + 5) % 5; }, desc: classLine(S.classes[S.classIdx]) },
    { label: 'Create a Class', desc: 'Edit your five loadouts.', act: () => openEditor(S.classIdx) },
    { label: 'Controller', kind: 'choice', value: () => padLabel(), change: d => cyclePadPref(d), desc: 'Which controller this window listens to. Auto gives each window on this computer its own; pick one by number if they get mixed up.' },
    ...(local && host ? [
      { label: 'Open Player 2 window', sep: true, desc: 'Opens a second game window that joins this party. Drag it onto your other monitor and press F11 for fullscreen.', act: () => { netOpenP2(); } },
      { label: 'Split screen', kind: 'choice', value: () => NET.splitFrame ? 'On' : 'Off', change: () => netSplit(!NET.splitFrame), desc: 'Player 2 plays on the right half of this screen, with their own controller.' },
    ] : []),
    { label: 'Switch player', desc: `Playing as ${esc(S.profile.name)}. Pick your own profile without leaving the party.`, act: () => go('who') },
    { label: 'Fullscreen', kind: 'choice', value: () => isFullscreen() ? 'On' : 'Off', change: () => toggleFullscreen(), desc: fullscreenNote() },
    { label: 'Leave party', desc: host ? 'Ends the party for everyone.' : 'Go back to playing on your own.', act: () => { netLeave(true); MENU.stack = [['main', 0]]; MENU.screen = 'party'; MENU.sel = 0; menuContext(); renderMenu(); } },
  ];
  if (!host) {
    const inPlay = hm.st === 'play';
    return {
      crumb: 'Play with friends \u00B7 <b>Lobby</b>', head: '<small>Party</small>Lobby', theme: zm ? 'zm' : '', side: sideLobbyParty, items: [
        { label: !NET.hostId ? 'Connecting\u2026' : inPlay ? (NET.sitOut === hm.ep ? 'Rejoin the match' : 'Joining\u2026') : 'Waiting for the host', desc: inPlay ? 'The host\u2019s match is under way.' : 'The host picks the game and starts it. You\u2019ll be pulled in automatically.', act: () => { if (inPlay) { NET.sitOut = 0; } } },
        ...common,
      ],
    };
  }
  const items = [
    { label: zm ? 'Start zombies' : 'Start match', desc: zm ? 'Everyone starts with a pistol and 500 points. Revive each other when you go down.' : `${M.name} on ${MAPS[S.map].name}. ${ffa ? 'Everyone for themselves.' : versus ? 'Players are split across both teams.' : 'Every player is on Vanguard, against the bots.'}`, act: () => { if (zm) launchZM(); else launchMP(); } },
    { label: 'Game', kind: 'choice', sep: true, value: () => zm ? 'Zombies' : 'Multiplayer', change: () => { S.mpKind = zm ? 'mp' : 'zm'; menuContext(); }, desc: 'Bots and team modes, or zombies together.' },
  ];
  if (zm) items.push(
    zmMapItem(false),
    { label: 'Starting round', kind: 'choice', value: () => S.zmStart, change: d => { S.zmStart = cycle([1, 5, 10, 15, 20], S.zmStart, d); }, desc: 'Start later for a tougher fight.' },
    { label: 'Difficulty', kind: 'choice', value: () => ZM_DIFF[S.zmDiff].name, change: d => { S.zmDiff = cycle(Object.keys(ZM_DIFF), S.zmDiff, d); }, desc: ZM_DIFF[S.zmDiff].desc },
  );
  else items.push(
    { label: 'Game mode', kind: 'choice', value: () => M.name, change: d => { S.mode = cycle(MODE_KEYS, S.mode, d); }, desc: M.desc },
    ...(ffa ? [] : [{ label: 'Teams', kind: 'choice', value: () => versus ? 'Versus' : 'Co-op vs bots', change: () => { S.mpTeams = versus ? 'coop' : 'versus'; }, desc: versus ? 'Players are split between Vanguard and Ironside, with bots filling both sides.' : 'All players on Vanguard together, against Ironside\u2019s bots.' }]),
    { label: 'Map', kind: 'choice', value: () => MAPS[S.map].name, change: d => { S.map = cycle(MAP_KEYS(), S.map, d); loadMap(S.map, 'day'); }, desc: MAPS[S.map].desc },
    ...(ffa ? [{ label: 'Bots', kind: 'choice', value: () => S.ffaBots, change: d => { S.ffaBots = clamp(S.ffaBots + d, 0, 11); }, desc: 'Bots in the free-for-all as well as the players.' }]
      : versus ? [{ label: 'Bots per team', kind: 'choice', value: () => S.allies, change: d => { S.allies = clamp(S.allies + d, 0, 5); }, desc: 'Each team gets this many bots, plus extra to even out the players.' }]
      : [{ label: 'Friendly bots', kind: 'choice', value: () => S.allies, change: d => { S.allies = clamp(S.allies + d, 0, 5); }, desc: 'Bots on your team besides the players.' },
         { label: 'Enemy bots', kind: 'choice', value: () => S.enemies, change: d => { S.enemies = clamp(S.enemies + d, 1, 8); }, desc: 'Bots on Ironside.' }]),
    { label: 'Bot difficulty', kind: 'choice', value: () => DIFF[S.difficulty].name, change: d => { S.difficulty = cycle(DIFFS, S.difficulty, d); }, desc: DIFF[S.difficulty].note },
    { label: 'Time limit', kind: 'choice', value: () => `${S.time} min`, change: d => { S.time = cycle([5, 10, 15], S.time, d); }, desc: `Or first to ${M.limit} ${M.unit}.` },
  );
  return { crumb: 'Play with friends \u00B7 <b>Lobby</b>', head: '<small>Party</small>Lobby', theme: zm ? 'zm' : '', side: sideLobbyParty, items: [...items, ...common] };
}
function partyRows() {
  const lvl = levelInfo(settings.profile.xp).level;
  const row = (n, tag, me) => `<div class="rp${me ? ' you' : ''}"><span class="lv">${tag}</span><span>${esc(n)}</span></div>`;
  const out = [row(settings.profile.name || 'You', netHost() ? 'H' : lvl, true)];
  for (const P of [...NET.peers.values()].sort((a, b) => (b.role === 'host') - (a.role === 'host') || a.joinedAt - b.joinedAt)) out.push(row(P.name, P.role === 'host' ? 'H' : 'P', false));
  return out.join('');
}
function sideLobbyParty() {
  const local = NET.kind === 'local', hm = netHost() ? netLobbyMeta() : (NET.hostMeta || {});
  const zm = hm.k === 'zm', M = MODES[hm.mode] || MODES.tdm;
  const what = !hm.k ? '' : zm ? `Zombies \u00B7 ${MAPS[zmMapKey(hm.zm)].name} \u00B7 round ${hm.zs || 1}` : `${M.name}${hm.mode === 'ffa' ? '' : hm.teams === 'versus' ? ' \u00B7 versus' : ' \u00B7 co-op'} \u00B7 ${(MAPS[hm.map] || MAPS.acres).name}`;
  const how = local
    ? (netHost() ? `<p><b>Two monitors:</b> open a Player 2 window (or open this game again in another tab and pick Join there), then drag it to your other monitor.</p><p><b>One monitor:</b> turn on split screen.</p><p class="dim">Each window reads its own controller. Sound plays from the window you last clicked.</p>` : `<p>You\u2019re playing on the same computer as the host. They pick the game and start it.</p>`)
    : (netHost() ? (NET.via === 'peer' ? `<p>Friends open this game\u2019s link, pick <b>Play with friends</b>, type this code and join.</p><p class="dim">Your computer is the server, so keep this window open and on screen while you play.</p>` : `<p>Friends open this game in claude.ai, pick <b>Play with friends</b>, type this code and join.</p>`) : `<p>The host starts the game.</p>`);
  return `<div class="card2"><p class="k">${local ? 'Party on this computer' : 'Online party'}</p>${NET.code ? `<h3>Code <span class="pcode">${NET.code}</span></h3>` : `<h3>Players</h3>`}
    ${NET.msg ? `<p class="netmsg">${esc(NET.msg)}</p>` : ''}${what ? `<p class="k" style="margin-top:6px">${esc(what)}</p>` : ''}
    <div class="roster one">${partyRows()}</div>${how}</div>`;
}
function sidePartyInfo() {
  return `<div class="card2"><p class="k">Play with friends</p><h3>Your squad</h3>
    ${NET.msg ? `<p class="netmsg">${esc(NET.msg)}</p>` : ''}
    <p><b>Two monitors:</b> host on this computer, then open a Player 2 window and drag it to the other screen. Or open this game in a second tab of the same browser and join from there.</p>
    <p><b>One monitor:</b> host, then turn on split screen.</p>
    <p><b>Online:</b> host online and share the code. ${IN_CLAUDE ? 'Here, friends need claude.ai and access to this game. The copy you host yourself needs no accounts.' : 'Your computer is the server. Friends just need this link and the code.'}</p>
    <p class="dim">Co-op against bots, versus, free-for-all, or zombies together.</p></div>`;
}

/* ---------- side panels ---------- */
function sideRecordMP() {
  const r = settings.profile.mp, kd = r.deaths ? (r.kills / r.deaths).toFixed(2) : r.kills.toFixed(2);
  return `<div class="card2"><p class="k">Service record</p><h3>Multiplayer</h3><div class="statgrid"><div><b>${r.matches}</b><span>Matches</span></div><div><b>${r.wins}</b><span>Wins</span></div><div><b>${r.kills}</b><span>Kills</span></div><div><b>${kd}</b><span>K/D</span></div><div><b>${r.deaths}</b><span>Deaths</span></div><div><b>${levelInfo(settings.profile.xp).level}</b><span>Level</span></div></div></div>` + mapCard(MAPS[settings.map].name, MAPS[settings.map].sub);
}
function sideRecordZM() {
  const r = settings.profile.zm;
  return `<div class="card2"><p class="k">Service record</p><h3>Zombies</h3><div class="statgrid"><div><b>${r.best}</b><span>Best round</span></div><div><b>${r.games}</b><span>Games</span></div><div><b>${r.kills}</b><span>Kills</span></div></div></div>`;
}
function sideClasses() {
  return `<div class="card2"><p class="k">Your classes</p>${settings.classes.map((c, i) => `<div class="perkrow" style="--c:${i === settings.classIdx ? 'var(--signal)' : 'rgba(236,226,204,.3)'}"><i></i>${esc(c.name)}<span>${WEAPONS[c.primary].name}</span></div>`).join('')}</div>`;
}
const KB_KEYS = [['W A S D', 'Move'], ['Mouse', 'Look \u00B7 left fire \u00B7 right aim'], ['Shift', 'Sprint'], ['Space', 'Jump \u00B7 climb ledges and windows'], ['C', 'Crouch \u00B7 hold to go prone \u00B7 slide'], ['R', 'Reload \u00B7 again to cancel'], ['F', 'Hold to use or buy'], ['V', 'Knife'], ['G / Q', 'Hold to cook or aim, release to throw'], ['R while holding', 'Cancel a throw'], ['1 2', 'Primary / sidearm'], ['Tab', 'Scoreboard'], ['Esc', 'Pause']];
const PAD_KEYS = [['LS / RS', 'Move / look \u00B7 L3 sprint \u00B7 R3 knife'], ['LT / RT', 'Aim / fire'], ['A', 'Jump \u00B7 climb'], ['B', 'Crouch \u00B7 hold to go prone \u00B7 slide'], ['X', 'Reload (again to cancel) \u00B7 hold to use'], ['Y', 'Swap weapon'], ['RB / LB', 'Hold to cook or aim, release to throw'], ['X while holding', 'Cancel a throw'], ['View', 'Scoreboard'], ['Start', 'Pause']];
const keyList = list => `<div class="keylist">${list.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join('')}</div>`;
function sideWho() {
  const list = listProfiles();
  return `<div class="card2"><p class="k">On this computer</p><h3>Players</h3><ul class="plist">${list.map(p => `<li><span>${esc(p.name)}</span>${p.slot === PROFILE_SLOT ? '<b>Playing</b>' : `<span>Lv ${p.level}</span>`}</li>`).join('')}</ul><p class="k" style="margin-top:14px">The game remembers who played last. Switch here any time, even in a party lobby.</p></div>`;
}
/* ---------- fullscreen: any page, any device that allows it ---------- */
function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
function isFullscreen() { return !!fsElement(); }
function fsAllowed() { const d = document.documentElement; return !!(d.requestFullscreen || d.webkitRequestFullscreen) && (document.fullscreenEnabled !== false || document.webkitFullscreenEnabled); }
const IS_IPHONE = /iPhone|iPod/.test(navigator.userAgent);
function fullscreenNote() {
  if (IS_IPHONE) return 'iPhones don\u2019t let web pages go fullscreen. In Safari tap Share, then Add to Home Screen, and open the game from that icon: it runs fullscreen with no browser bars.';
  if (!fsAllowed()) return 'This page isn\u2019t allowed to go fullscreen here. Open the game\u2019s own link (your GitHub Pages copy) to play fullscreen.';
  return 'Fill the whole screen. On a phone or tablet this also hides the browser bars and turns to landscape.';
}
function toggleFullscreen() {
  try {
    if (isFullscreen()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const d = document.documentElement, req = d.requestFullscreen || d.webkitRequestFullscreen;
    if (!req || !fsAllowed()) { popupMsg(fullscreenNote()); return; }
    const p = req.call(d, { navigationUI: 'hide' });
    const lock = () => { try { if (screen.orientation && screen.orientation.lock && matchMedia('(pointer:coarse)').matches) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} };
    if (p && p.then) p.then(lock).catch(() => popupMsg(fullscreenNote())); else lock();
  } catch (e) { popupMsg(fullscreenNote()); }
}
function popupMsg(t) { const d = $('#mDesc'); if (d && G.state === 'menu') d.textContent = t; }
for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => {
  if (typeof menuActive === 'function' && menuActive() && MENU.screen !== 'title') renderMenu();
  if (G.state === 'paused' && !$('#pauseOpts').hidden) renderPauseOpts();
  if (typeof resize === 'function') setTimeout(resize, 60);
});
$('#fsBtn').addEventListener('click', e => { e.stopPropagation(); toggleFullscreen(); uiSound('select'); });
$('#pcard').addEventListener('click', () => { if (G.state === 'menu' && MENU.screen !== 'title' && MENU.screen !== 'who') { go('who'); uiSound('select'); } });
function sideControls() { return `<div class="card2"><p class="k">${inputMode === 'pad' ? 'Controller' : 'Keyboard and mouse'}</p><h3>Controls</h3>${keyList(inputMode === 'pad' ? PAD_KEYS : KB_KEYS)}</div>`; }
function sideControlsFull() { return `<div class="card2"><p class="k">Keyboard and mouse</p>${keyList(KB_KEYS)}</div><div class="card2"><p class="k">Controller</p>${keyList(PAD_KEYS)}</div>`; }
function mapCard(name, sub) { return `<div class="card2"><p class="k">Map</p><h3>${name}</h3><p>${sub}</p><canvas class="mapcv" id="mMapCv" width="320" height="224"></canvas></div>`; }
function sideLobby() {
  const S = settings, M = MODES[S.mode], you = settings.profile.name || 'You', lvl = levelInfo(settings.profile.xp).level;
  const row = (n, l, me) => `<div class="rp${me ? ' you' : ''}"><span class="lv">${l}</span><span>${esc(n)}</span></div>`;
  let roster;
  if (S.mode === 'ffa') roster = `<div class="roster one">${row(you, lvl, true)}${NAMES.slice(0, S.ffaBots).map(n => row(n, botLevel(n))).join('')}</div>`;
  else roster = `<div class="roster"><h4 class="cA">Vanguard</h4><h4 class="cB">Ironside</h4><div>${row(you, lvl, true)}${NAMES.slice(0, S.allies).map(n => row(n, botLevel(n))).join('')}</div><div>${NAMES.slice(S.allies, S.allies + S.enemies).map(n => row(n, botLevel(n))).join('')}</div></div>`;
  return `<div class="card2"><p class="k">${M.short} \u00B7 ${S.time} min \u00B7 ${DIFF[S.difficulty].name} bots</p><h3>${M.name}</h3><p>${M.desc}</p>${roster}</div>` + mapCard(MAPS[settings.map].name, MAPS[settings.map].sub);
}
function sideZombies() {
  const r = settings.profile.zm;
  return `<div class="card2"><p class="k">How to survive</p><h3>The night shift</h3><p>Every hit is worth points. Spend them on guns chalked on the walls, the mystery box (950) and perk machines. Rounds get harder. One life, unless you bought Second Wind.</p>
    ${Object.values(ZM_PERKS).map(p => `<div class="perkrow" style="--c:${p.css}"><i></i>${p.name}<span>${p.cost}</span></div>`).join('')}
    <div class="statgrid"><div><b>${r.best}</b><span>Best round</span></div><div><b>${r.games}</b><span>Games</span></div><div><b>${r.kills}</b><span>Kills</span></div></div></div>`;
}

/* ---------- rendering ---------- */
function footerHtml() {
  const pad = inputMode === 'pad';
  const k = (kb, pd, cls, label, act) => `<span class="kp" data-act="${act}">${pad ? `<kbd class="pad ${cls}">${pd}</kbd>` : `<kbd>${kb}</kbd>`}${label}</span>`;
  if (MENU.screen === 'title') return '';
  let h = k('Enter', 'A', 'pA', 'Select', 'select');
  if (MENU.screen !== 'main') h += k('Esc', 'B', 'pB', 'Back', 'back');
  const it = MENU.items[MENU.sel];
  if (it && (it.kind === 'choice' || it.kind === 'slider')) h += k('\u25C0 \u25B6', '\u25C0\u25B6', 'wide', 'Change', 'none');
  return h;
}
function renderProfile() {
  const P = settings.profile, L = levelInfo(P.xp);
  $('#pcName').textContent = P.name || 'Player';
  $('#pcEmblem').textContent = L.level;
  $('#pcLvl').textContent = L.max ? 'Max level' : `Level ${L.level}`;
  $('#pcXp').style.width = `${L.max ? 100 : L.into / L.need * 100}%`;
}
function renderMenu() {
  const menu = $('#menu');
  const title = MENU.screen === 'title';
  $('#mTitle').hidden = !title; $('#mTop').hidden = title; $('#mBody').hidden = title;
  $('#mFoot').innerHTML = footerHtml();
  if (title) return;
  const def = screenDef(MENU.screen);
  MENU.items = def.items; MENU.def = def;
  MENU.sel = clamp(MENU.sel, 0, def.items.length - 1);
  menu.classList.toggle('zmtheme', def.theme === 'zm');
  $('#mCrumb').innerHTML = def.crumb;
  $('#mHead').innerHTML = def.head; $('#mHead').hidden = !def.head;
  const list = $('#mList'); list.className = 'mlist' + (def.big ? ' big' : '');
  list.innerHTML = def.items.map((it, i) => {
    const v = it.value ? it.value() : '';
    const val = it.kind === 'choice' ? `<span class="val"><i class="arr" data-d="-1">\u25C0</i>${v}<i class="arr" data-d="1">\u25B6</i></span>` : it.kind ? `<span class="val">${v}</span>` : '';
    return `<button type="button" class="mi${i === MENU.sel ? ' sel' : ''}${it.sep ? ' sep' : ''}${it.small ? ' small' : ''}" data-i="${i}"><span>${it.label}</span>${val}</button>`;
  }).join('');
  const codeIn = $('#joinCode');
  if (codeIn) {
    codeIn.addEventListener('input', () => { codeIn.value = codeIn.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); NET.joinDraft = codeIn.value; });
    codeIn.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { codeIn.blur(); netJoinOnline(codeIn.value); } else if (e.key === 'Escape') codeIn.blur(); });
  }
  const nameIn = $('#optName');
  if (nameIn) {
    nameIn.addEventListener('input', () => { settings.profile.name = nameIn.value.trim().slice(0, 14) || 'PLAYER'; saveSettings(); renderProfile(); });
    nameIn.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') nameIn.blur(); });
  }
  renderProfile();
  updateSel(true);
}
function updateSel(sideToo) {
  if (!MENU.def || MENU.screen === 'title') return;
  const it = MENU.items[MENU.sel];
  [...$('#mList').children].forEach((b, i) => { b.classList.toggle('sel', i === MENU.sel); if (i === MENU.sel && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' }); });
  $('#mDesc').textContent = it ? it.desc || '' : '';
  const side = (it && it.side) || MENU.def.side;
  if (sideToo !== false) {
    $('#mSide').innerHTML = side ? side() : '';
    const cv = $('#mMapCv');
    if (cv && typeof mmBase !== 'undefined') { const x = cv.getContext('2d'), k = Math.min(cv.width / mmBase.width, cv.height / mmBase.height), w = mmBase.width * k, h = mmBase.height * k; x.fillStyle = '#0d1114'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(mmBase, (cv.width - w) / 2, (cv.height - h) / 2, w, h); }
  }
  $('#mFoot').innerHTML = footerHtml();
}
function go(id) {
  MENU.stack.push([MENU.screen, MENU.sel]);
  MENU.screen = id; MENU.sel = 0;
  menuContext();
  renderMenu();
}
function back() {
  if (MENU.screen === 'main' || MENU.screen === 'title') return;
  if (MENU.screen === 'lobby') { netLeave(true); MENU.stack = [['main', 0]]; MENU.screen = 'party'; MENU.sel = 0; uiSound('back'); menuContext(); renderMenu(); return; }
  const [s, i] = MENU.stack.pop() || ['main', 0];
  MENU.screen = s; MENU.sel = i;
  uiSound('back');
  menuContext();
  renderMenu();
}
// zombies screens get the night map and the zombies theme music
function menuContext() {
  const hm = netHost() ? netLobbyMeta() : NET.hostMeta;
  const lobby = MENU.screen === 'lobby' && hm;
  const zm = MENU.screen === 'zm' || !!(lobby && hm.k === 'zm');
  loadMap(zm ? zmMapKey(lobby ? hm.zm : settings.zmMap) : lobby && MAPS[hm.map] ? hm.map : settings.map, zm ? 'night' : 'day');
  if (zm) zmNightSky();
  if (MENU.screen !== 'title') startMusic(zm ? 'zm' : 'mp');
}
function musicVolume() {
  if (!AC) return;
  if (settings.music <= 0) stopMusic();
  else if (MUSIC.on) MUSIC.bus.gain.setTargetAtTime(settings.music * .6, AC.currentTime, .1);
  else if (G.state === 'menu' || G.state === 'ended') startMusic();
}
function menuMove(d) {
  const n = MENU.items.length; if (!n) return;
  MENU.sel = (MENU.sel + d + n) % n;
  uiSound('move'); updateSel();
}
function menuChange(d) {
  const it = MENU.items[MENU.sel]; if (!it || !it.change) return;
  it.change(d); saveSettings(); uiSound('tick'); renderMenu();
}
function menuSelect() {
  if (MENU.screen === 'title') { pressStart(); return; }
  const it = MENU.items[MENU.sel]; if (!it) return;
  if (it.act) { uiSound('select'); it.act(); }
  else if (it.kind === 'choice') menuChange(1);
}
function pressStart() {
  initAudio(); uiSound('select');
  MENU.screen = 'main'; MENU.sel = 0; MENU.stack = [];
  menuContext(); renderMenu();
}
const menuActive = () => G.state === 'menu' && $('#editor').hidden && $('#loading').hidden && !$('#menu').hidden;

/* ---------- input ---------- */
window.addEventListener('keydown', e => {
  if (!menuActive()) return;
  if (activeEl() && (activeEl().id === 'optName' || activeEl().id === 'joinCode')) return;
  if (MENU.screen === 'title') { if (!e.repeat) pressStart(); e.preventDefault(); return; }
  const k = e.code;
  if (k === 'ArrowUp' || k === 'KeyW') { menuMove(-1); e.preventDefault(); }
  else if (k === 'ArrowDown' || k === 'KeyS') { menuMove(1); e.preventDefault(); }
  else if (k === 'ArrowLeft' || k === 'KeyA') { menuChange(-1); e.preventDefault(); }
  else if (k === 'ArrowRight' || k === 'KeyD') { menuChange(1); e.preventDefault(); }
  else if (k === 'Enter' || k === 'Space' || k === 'NumpadEnter') { menuSelect(); e.preventDefault(); }
  else if (k === 'Escape' || k === 'Backspace') { back(); e.preventDefault(); }
});
$('#mList').addEventListener('mousemove', e => {
  const b = e.target.closest('.mi'); if (!b) return;
  const i = +b.dataset.i; if (i !== MENU.sel) { MENU.sel = i; uiSound('move'); updateSel(); }
});
$('#mList').addEventListener('click', e => {
  const b = e.target.closest('.mi'); if (!b) return;
  MENU.sel = +b.dataset.i;
  const arr = e.target.closest('.arr');
  if (e.target.id === 'optName' || e.target.id === 'joinCode') return;
  if (arr) menuChange(+arr.dataset.d); else menuSelect();
});
$('#mFoot').addEventListener('click', e => {
  const k = e.target.closest('.kp'); if (!k) return;
  if (k.dataset.act === 'select') menuSelect(); else if (k.dataset.act === 'back') back();
});
$('#mTitle').addEventListener('click', () => { if (menuActive()) pressStart(); });
// controller: called every frame from the main loop while on the front end
function menuPad(gp, dt) {
  const B = i => !!gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .5);
  const E = i => B(i) && !pad.prev[i];
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  let dir = null;
  if (B(12) || ay < -.6) dir = 'up'; else if (B(13) || ay > .6) dir = 'down'; else if (B(14) || ax < -.6) dir = 'left'; else if (B(15) || ax > .6) dir = 'right';
  if (dir || gp.buttons.some(b => b.pressed)) { pad.lastUsed = nowMs(); if (inputMode !== 'pad') { setInputMode('pad'); updateSel(); } }
  if (MENU.screen === 'title') { if (gp.buttons.some((b, i) => (b.pressed) && !pad.prev[i])) pressStart(); return; }
  if (dir) {
    MENU.rep.t -= dt;
    if (MENU.rep.t <= 0) {
      if (dir === 'up') menuMove(-1); else if (dir === 'down') menuMove(1); else menuChange(dir === 'left' ? -1 : 1);
      MENU.rep.t = MENU.rep.dir === dir ? .12 : .34; MENU.rep.dir = dir;
    }
  } else { MENU.rep.t = 0; MENU.rep.dir = null; }
  if (E(0) || E(9)) menuSelect();
  if (E(1)) back();
}

/* ---------- launching ---------- */
function showLoading(mode, map, tip, zm, cb) {
  stopMusic(); uiSound('start');
  $('#menu').hidden = true;
  const L = $('#loading'); L.classList.toggle('zm', !!zm);
  $('#ldMode').textContent = mode; $('#ldMap').textContent = map; $('#ldTip').textContent = tip;
  const bar = L.querySelector('.ldbar i'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
  L.hidden = false;
  setTimeout(() => { L.hidden = true; cb(); }, 1600);
}
// with friends the host's launch sends everyone in: the settings travel with the match
function launchMP() {
  if (netClient()) return;
  MENU.lastLaunch = launchMP;
  let cfg = null;
  if (netHost()) { settings.mpKind = 'mp'; cfg = netStartCfg(); }
  showLoading(`${MODES[settings.mode].name} \u00B7 ${DIFF[settings.difficulty].name} bots`, MAPS[settings.map].name, TIPS[Math.random() * TIPS.length | 0], false, () => startMatch(cfg));
}
// the zombies map picker (solo screen and the party lobby share it)
function zmMapItem(sep) {
  const S = settings;
  return { label: 'Map', kind: 'choice', sep, value: () => ZM_MAPS[zmMapKey(S.zmMap)].label,
    change: d => { S.zmMap = cycle(Object.keys(ZM_MAPS), zmMapKey(S.zmMap), d); menuContext(); },
    desc: ZM_MAPS[zmMapKey(S.zmMap)].desc };
}
function launchZM() {
  if (netClient()) return;
  MENU.lastLaunch = launchZM;
  let cfg = null;
  if (netHost()) { settings.mpKind = 'zm'; cfg = netStartCfg(); }
  showLoading(`Zombies \u00B7 Round ${settings.zmStart} \u00B7 ${ZM_DIFF[settings.zmDiff].name}`, `${MAPS[zmMapKey(settings.zmMap)].name} \u00B7 Night`, ZTIPS[Math.random() * ZTIPS.length | 0], true, () => startZombies(cfg));
}
// after a match: back to the screen you launched from
function showMenu() {
  $('#menu').hidden = false;
  if (MENU.screen === 'title') MENU.screen = 'main';
  if (NET.on && MENU.screen !== 'lobby') { MENU.stack = [['main', 0], ['party', 0]]; MENU.screen = 'lobby'; MENU.sel = 0; }
  menuContext(); renderMenu();
}
function showGameScreen() {
  $('#menu').hidden = true; $('#end').hidden = true; $('#pause').hidden = true; $('#editor').hidden = true; $('#loading').hidden = true;
  $('#hud').hidden = false; $('#death').hidden = true;
  document.body.classList.remove('padnav');
  if (activeEl() && activeEl().blur) activeEl().blur();
}
// keyboard and controller focus for the pause and results screens
function menuFocusOverlay(sel) {
  const root = $(sel), first = root.querySelector('#pauseMain:not([hidden]) .btn, #end .btn') || root.querySelector('.btn');
  root.querySelectorAll('.btn.sel').forEach(x => x.classList.remove('sel'));
  // lit straight away, and focused once the browser has finished leaving pointer lock (focus can be dropped mid-exit)
  if (first) { first.classList.add('sel'); first.focus(); requestAnimationFrame(() => { if (!root.hidden && !root.contains(activeEl())) first.focus(); }); }
  if (inputMode === 'pad') document.body.classList.add('padnav');
}
window.addEventListener('keydown', e => {
  if (G.state === 'playing' || G.state === 'killcam' || G.state === 'finalcam') return;
  const root = ['#editor', '#pause', '#end'].map(s => $(s)).find(el => !el.hidden);
  if (!root || root.id === 'editor') return;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') { spatial('up'); uiSound('move'); e.preventDefault(); }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') { spatial('down'); uiSound('move'); e.preventDefault(); }
  // left / right move between class buttons; a focused slider takes them itself
  const onRange = activeEl() && activeEl().type === 'range';
  if (!onRange && (e.code === 'ArrowLeft' || e.code === 'KeyA')) { spatial('left'); uiSound('move'); e.preventDefault(); }
  if (!onRange && (e.code === 'ArrowRight' || e.code === 'KeyD')) { spatial('right'); uiSound('move'); e.preventDefault(); }
});
renderMenu();
