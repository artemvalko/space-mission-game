// Start screen: title, one-line pitch, Play solo / Play as a team / How to play, Easy–Normal.
// Team names and roles are set here only.

import { mount, h, s } from '../dom.js';
import { mulberry32 } from '../../utils/random.js';
import { nextFrame } from '../animations/core.js';
import { rerender } from '../view.js';
import { ROLES } from '../../data/roles.js';
import { SCENARIOS } from '../../data/scenarios.js';
import { leaderboard, unlockedBadges } from '../storage.js';
import { BADGES } from '../../engine/achievements.js';
import {
  MAX_PLAYERS, setMode, setDifficulty, addPlayer, removePlayer, renamePlayer, assignRole, goToScreen,
} from '../../state/actions.js';

const SLIDES = [
  { icon: '🎯', title: 'Pick a mission', text: 'Every mission has a goal — like spotting forest fires. Your goal and checklist stay at the top of the screen.' },
  { icon: '🛠️', title: 'Answer one question per step', text: 'Choose the size, science tools, power, radio, orbit and rocket. Four gauges show money, weight, power and data. Green is good, red is over.' },
  { icon: '🚀', title: 'Launch and fly', text: 'The Flight Director tells you what to fix. When everything is ready, launch! Things will happen in space — your decisions matter.' },
];

let slide = -1; // view-only: -1 = closed
let boardScenario = 'wildfire'; // view-only: leaderboard tab

function howToPlay() {
  if (slide < 0) return null;
  const s = SLIDES[slide];
  const close = () => { slide = -1; rerender(); };
  return h('div', { class: 'modal-backdrop', onClick: (e) => { if (e.target === e.currentTarget) close(); } },
    h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'How to play' }, [
      h('div', { class: 'modal-icon', 'aria-hidden': 'true' }, s.icon),
      h('h2', {}, `${slide + 1}. ${s.title}`),
      h('p', { class: 'modal-text' }, s.text),
      h('div', { class: 'slide-dots' }, SLIDES.map((_, i) => h('span', { class: i === slide ? 'on' : '' }))),
      h('div', { class: 'button-row' }, [
        h('button', { class: 'btn btn-ghost', type: 'button', key: 'howto-close', onClick: close }, 'Close'),
        slide < SLIDES.length - 1
          ? h('button', { class: 'btn btn-primary', type: 'button', key: 'howto-next', onClick: () => { slide += 1; rerender(); } }, 'Next →')
          : h('button', { class: 'btn btn-primary', type: 'button', key: 'howto-done', onClick: close }, 'Got it!'),
      ]),
    ]));
}

function teamPanel(state, dispatch) {
  return h('div', { class: 'team-panel' }, [
    h('h2', {}, 'Who is playing?'),
    h('p', { class: 'muted' }, 'Everyone shares this screen. Each step says whose decision it is — the others can advise.'),
    h('div', { class: 'player-list' }, state.players.map((p, i) => h('div', { class: 'player-row' }, [
      h('input', {
        class: 'input', type: 'text', value: p.name, maxlength: 20, 'aria-label': `Player ${i + 1} name`, key: `player-name-${i}`,
        onChange: (e) => dispatch(renamePlayer(i, e.target.value)),
      }),
      h('select', { class: 'input', 'aria-label': `Player ${i + 1} role`, key: `player-role-${i}`, onChange: (e) => dispatch(assignRole(i, e.target.value)) },
        ROLES.map((r) => h('option', { value: r.id, selected: r.id === p.roleId }, `${r.icon} ${r.name}`))),
      state.players.length > 2
        ? h('button', { class: 'btn btn-ghost', type: 'button', key: `player-remove-${i}`, 'aria-label': `Remove ${p.name}`, onClick: () => dispatch(removePlayer(i)) }, '✕')
        : h('span'),
    ]))),
    state.players.length < MAX_PLAYERS && h('button', { class: 'btn btn-ghost', type: 'button', key: 'add-player', onClick: () => dispatch(addPlayer('')) }, '+ Add player'),
    h('ul', { class: 'role-hints' }, ROLES.map((r) => h('li', {}, [h('strong', {}, `${r.icon} ${r.name}: `), r.description]))),
    h('button', { class: 'btn btn-primary btn-big', type: 'button', key: 'start-team', onClick: () => dispatch(goToScreen('pickMission')) }, 'Start mission →'),
  ]);
}

// ── Animated backdrop (Phase 4 P3 #13): parallax stars, rotating Earth, satellite orbiting the title.
const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function starLayer(n, seed, size, cls) {
  const rng = mulberry32(seed);
  return s('svg', { class: `sky-layer ${cls}`, viewBox: '0 0 1200 600', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' },
    Array.from({ length: n }, () => s('circle', { cx: rng() * 1200, cy: rng() * 600, r: size * (0.5 + rng()), opacity: 0.3 + rng() * 0.7 })));
}

function heroBackdrop() {
  const earth = s('svg', { class: 'hero-earth', viewBox: '0 0 200 200', 'aria-hidden': 'true' }, [
    s('defs', {}, [
      s('clipPath', { id: 'earthClip' }, s('circle', { cx: 100, cy: 100, r: 96 })),
      s('radialGradient', { id: 'earthShade', cx: '35%', cy: '35%' }, [s('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.25 }), s('stop', { offset: 0.6, 'stop-color': '#000', 'stop-opacity': 0 }), s('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': 0.55 })]),
    ]),
    s('circle', { cx: 100, cy: 100, r: 96, class: 'he-ocean' }),
    s('g', { 'clip-path': 'url(#earthClip)' }, s('g', { class: 'he-land' }, [0, 200].map((ox) => s('g', { transform: `translate(${ox} 0)` }, [
      s('path', { d: 'M20 60 q30 -25 60 -5 q10 25 -15 40 q-30 10 -45 -35z' }), s('path', { d: 'M60 120 q20 -10 30 15 q-5 30 -25 40 q-15 -20 -5 -55z' }),
      s('path', { d: 'M120 50 q35 -15 60 10 q-5 30 -35 25 q-25 0 -25 -35z' }), s('path', { d: 'M140 120 q25 5 30 25 q-20 15 -35 0z' }),
    ])))),
    s('circle', { cx: 100, cy: 100, r: 96, fill: 'url(#earthShade)' }),
    s('circle', { cx: 100, cy: 100, r: 99, class: 'he-atmo' }),
  ]);
  const orbitSvg = s('svg', { class: 'hero-orbit', viewBox: '0 0 800 220', 'aria-hidden': 'true' });
  const ring = s('ellipse', { cx: 400, cy: 110, rx: 360, ry: 70, class: 'ho-ring' });
  const sat = s('g', { class: 'ho-sat' }, [
    s('rect', { x: -16, y: -4, width: 10, height: 8, class: 'an-minisat-panel' }), s('rect', { x: 6, y: -4, width: 10, height: 8, class: 'an-minisat-panel' }),
    s('rect', { x: -6, y: -6, width: 12, height: 12, rx: 2, class: 'an-minisat-body' }),
  ]);
  orbitSvg.append(ring, sat);
  const place = (a) => {
    const x = 400 + Math.cos(a) * 360; const y = 110 + Math.sin(a) * 70;
    sat.setAttribute('transform', `translate(${x} ${y}) scale(${0.8 + 0.3 * Math.sin(a)})`);
    sat.style.opacity = Math.sin(a) < -0.2 ? 0.45 : 1; // "behind" the title
  };
  place(0.6);
  if (!reduce()) {
    const t0 = performance.now();
    const loop = (ts) => { if (!orbitSvg.isConnected && ts - t0 > 1000) return; place(0.6 + (ts - t0) / 2600); nextFrame(loop); };
    nextFrame(loop);
  }
  return { sky: h('div', { class: 'hero-sky', 'aria-hidden': 'true' }, [starLayer(140, 3, 0.8, 'far'), starLayer(70, 9, 1.3, 'mid'), starLayer(30, 21, 2, 'near')]), earth, orbitSvg };
}

function onParallax(e) {
  if (reduce()) return;
  const hero = e.currentTarget;
  const r = hero.getBoundingClientRect();
  hero.style.setProperty('--mx', (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
  hero.style.setProperty('--my', (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
}

function board() {
  const rows = leaderboard(boardScenario, 10);
  return h('section', { class: 'leaderboard' }, [
    h('h2', {}, '🏆 Top 10'),
    h('div', { class: 'board-tabs', role: 'tablist' }, SCENARIOS.filter((sc) => !sc.sandbox).map((sc) => h('button', {
      class: ['mini', sc.id === boardScenario && 'active'], type: 'button', role: 'tab', 'aria-selected': sc.id === boardScenario ? 'true' : 'false', key: `board-${sc.id}`,
      onClick: () => { boardScenario = sc.id; rerender(); },
    }, `${sc.icon} ${sc.name}`))),
    rows.length === 0
      ? h('p', { class: 'muted' }, 'No finished missions yet — be the first!')
      : h('table', { class: 'summary-table board' }, [
        h('thead', {}, h('tr', {}, ['#', 'Team', 'Grade', 'Score', 'Date'].map((x) => h('th', {}, x)))),
        h('tbody', {}, rows.map((a, i) => h('tr', {}, [h('td', {}, String(i + 1)), h('td', {}, a.team), h('td', { class: 'board-grade' }, a.grade), h('td', {}, String(a.total)), h('td', { class: 'muted small' }, new Date(a.at).toLocaleDateString())]))),
      ]),
  ]);
}

export function render(container, state, dispatch) {
  const backdrop = heroBackdrop();
  mount(container, 
    h('div', { class: 'hero', onPointermove: onParallax }, [
      backdrop.sky,
      backdrop.earth,
      h('div', { class: 'hero-title-wrap' }, [backdrop.orbitSvg, h('h1', { class: 'hero-title' }, 'Mission Control')]),
      h('p', { class: 'hero-tagline' }, 'Design a real space mission. Stay on budget. Get the science.'),
      h('div', { class: 'hero-buttons' }, [
        h('button', { class: 'btn btn-primary btn-big', type: 'button', key: 'play-solo', onClick: () => { dispatch(setMode('solo')); dispatch(goToScreen('pickMission')); } }, '▶ Play solo'),
        h('button', { class: ['btn', 'btn-big', state.mode === 'team' && 'btn-active'], type: 'button', key: 'play-team', onClick: () => dispatch(setMode('team')) }, '👥 Play as a team (2–4)'),
        h('button', { class: 'btn btn-ghost btn-big', type: 'button', key: 'how-to', onClick: () => { slide = 0; rerender(); } }, '❓ How to play'),
      ]),
      h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Difficulty' }, ['easy', 'normal'].map((d) =>
        h('label', { class: ['seg', state.difficulty === d && 'active'] }, [
          h('input', { type: 'radio', name: 'difficulty', value: d, checked: state.difficulty === d, key: `difficulty-${d}`, onChange: () => dispatch(setDifficulty(d)) }),
          h('span', {}, d === 'easy' ? '🙂 Easy' : '🧠 Normal'),
        ]))),
      h('p', { class: 'muted small' }, state.difficulty === 'easy'
        ? 'Easy: fewer choices — power comes as one pack and the computer, pointing and thrusters are picked for you.'
        : 'Normal: you choose every part yourself.'),
    ]),
    state.mode === 'team' && teamPanel(state, dispatch),
    board(),
    (() => { const have = unlockedBadges(); return h('section', { class: 'leaderboard' }, [h('h2', {}, `🏅 Your badges: ${BADGES.filter((b) => have.has(b.id)).length} of ${BADGES.length}`), h('div', { class: 'badge-row' }, BADGES.map((b) => h('span', { class: ['badge-pill', have.has(b.id) ? 'earned' : 'locked'], title: `${b.name}: ${b.text}` }, `${b.icon} ${b.name}`)))]); })(),
    howToPlay(),
  );
}
