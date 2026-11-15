// Start screen: eyebrow + display headline, Play solo / Play as a team / How to play, Easy–Normal,
// one line-art orbit centrepiece in a soft glow, text-only data credits; leaderboard + badges below the fold.
// Team names and roles are set here only.

import { mount, h, s } from '../dom.js';
import { icon, initials } from '../icons.js';
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
  { icon: 'target', title: 'Pick a real mission', text: 'Connect remote sensors, measure weather under the clouds, or launch a navigation satellite. Every number comes from real sources or is clearly marked as an estimate.' },
  { icon: 'wrench', title: 'Answer one question per step', text: 'Size, mission payload, power, radios, bus, orbit, rocket and launch prep. Four gauges show money, mass, power and data. Green is good, red is over.' },
  { icon: 'flag', title: 'GO or NO-GO', text: 'Physics first: a design that breaks a hard gate is NO-GO. The Flight Director shows what is broken, which card fixes it, and other correct designs.' },
  { icon: 'rocket', title: 'Launch and fly', text: 'Simulated events happen in space — your decisions matter. Then compare your design with the real mission that inspired it.' },
];

let slide = -1; // view-only: -1 = closed
let boardScenario = 'mission_comms_iot'; // view-only: leaderboard tab

function howToPlay() {
  if (slide < 0) return null;
  const s = SLIDES[slide];
  const close = () => { slide = -1; rerender(); };
  return h('div', { class: 'modal-backdrop', onClick: (e) => { if (e.target === e.currentTarget) close(); } },
    h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'How to play' }, [
      h('div', { class: 'modal-icon', 'aria-hidden': 'true' }, icon(s.icon, 28)),
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
        ROLES.map((r) => h('option', { value: r.id, selected: r.id === p.roleId }, r.name))),
      state.players.length > 2
        ? h('button', { class: 'btn btn-ghost', type: 'button', key: `player-remove-${i}`, 'aria-label': `Remove ${p.name}`, onClick: () => dispatch(removePlayer(i)) }, icon('cross', 16))
        : h('span'),
    ]))),
    state.players.length < MAX_PLAYERS && h('button', { class: 'btn btn-ghost', type: 'button', key: 'add-player', onClick: () => dispatch(addPlayer('')) }, '+ Add player'),
    h('ul', { class: 'role-hints' }, ROLES.map((r) => h('li', {}, [h('span', { class: 'monogram monogram-sm', 'aria-hidden': 'true' }, initials(r.name)), ' ', h('strong', {}, `${r.name}: `), r.description]))),
    h('button', { class: 'btn btn-primary btn-big', type: 'button', key: 'start-team', onClick: () => dispatch(goToScreen('pickMission')) }, 'Start mission →'),
  ]);
}

// ── Centrepiece: a thin-line planet limb, three orbit ellipses and one satellite dot in a soft glow.
const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function centrepiece() {
  const ORBITS = [
    { rx: 250, ry: 62, rot: -14 },
    { rx: 200, ry: 92, rot: 22 },
    { rx: 290, ry: 40, rot: -2 },
  ];
  const dot = s('circle', { r: 3.2, class: 'hv-sat' });
  const halo = s('circle', { r: 9, class: 'hv-sat-halo' });
  const svg = s('svg', { class: 'hero-visual', viewBox: '-320 -260 640 520', role: 'img', 'aria-label': 'A planet with three orbits and a satellite' }, [
    s('defs', {}, [
      s('radialGradient', { id: 'hvGlow' }, [s('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0.16 }), s('stop', { offset: 0.45, 'stop-color': '#fff', 'stop-opacity': 0.05 }), s('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 })]),
      s('clipPath', { id: 'hvBack' }, s('rect', { x: -320, y: -260, width: 640, height: 260 })),
    ]),
    s('circle', { r: 250, fill: 'url(#hvGlow)' }),
    ...ORBITS.map((o) => s('ellipse', { rx: o.rx, ry: o.ry, transform: `rotate(${o.rot})`, class: 'hv-orbit', 'clip-path': 'url(#hvBack)' })),
    s('circle', { r: 112, class: 'hv-planet' }),
    ...[-60, -20, 20, 60].map((y) => s('ellipse', { cy: y, rx: Math.sqrt(112 * 112 - y * y), ry: 6 + Math.abs(y) / 30, class: 'hv-lat' })),
    s('ellipse', { rx: 44, ry: 112, class: 'hv-lat' }),
    ...ORBITS.map((o) => s('path', { d: `M ${-o.rx} 0 A ${o.rx} ${o.ry} 0 0 0 ${o.rx} 0`, transform: `rotate(${o.rot})`, class: 'hv-orbit hv-orbit-front' })),
    halo, dot,
  ]);
  const o = ORBITS[0];
  const c = Math.cos((o.rot * Math.PI) / 180); const sn = Math.sin((o.rot * Math.PI) / 180);
  const place = (a) => {
    const x0 = Math.cos(a) * o.rx; const y0 = Math.sin(a) * o.ry;
    const x = x0 * c - y0 * sn; const y = x0 * sn + y0 * c;
    for (const el of [dot, halo]) { el.setAttribute('cx', x.toFixed(1)); el.setAttribute('cy', y.toFixed(1)); }
    const behind = Math.sin(a) < 0 && Math.hypot(x, y) < 112;
    dot.style.opacity = halo.style.opacity = behind ? 0 : 1;
  };
  place(0.5);
  if (!reduce()) {
    const t0 = performance.now();
    const loop = (ts) => { if (!svg.isConnected && ts - t0 > 1000) return; place(0.5 + (ts - t0) / 9000); nextFrame(loop); };
    nextFrame(loop);
  }
  return svg;
}

/** Sparse, dim, static dot field (replaces the busy starfield). */
function dotField() {
  const rng = mulberry32(7);
  return s('svg', { class: 'dot-field', viewBox: '0 0 1200 700', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' },
    Array.from({ length: 70 }, () => s('circle', { cx: (rng() * 1200).toFixed(0), cy: (rng() * 700).toFixed(0), r: (0.5 + rng() * 0.7).toFixed(2), opacity: (0.12 + rng() * 0.3).toFixed(2) })));
}

function board() {
  const rows = leaderboard(boardScenario, 10);
  return h('section', { class: 'leaderboard' }, [
    h('h2', {}, 'Top 10'),
    h('div', { class: 'board-tabs', role: 'tablist' }, SCENARIOS.map((sc) => h('button', {
      class: ['mini', sc.id === boardScenario && 'active'], type: 'button', role: 'tab', 'aria-selected': sc.id === boardScenario ? 'true' : 'false', key: `board-${sc.id}`,
      onClick: () => { boardScenario = sc.id; rerender(); },
      title: sc.name, 'aria-label': sc.name,
    }, icon(sc.icon, 16)))),
    rows.length === 0
      ? h('p', { class: 'muted' }, 'No scores yet.')
      : h('table', { class: 'summary-table board' }, [
        h('thead', {}, h('tr', {}, ['#', 'Team', 'Grade', 'Score', 'Date'].map((x) => h('th', {}, x)))),
        h('tbody', {}, rows.map((a, i) => h('tr', {}, [h('td', {}, String(i + 1)), h('td', {}, a.team), h('td', { class: 'board-grade' }, a.grade), h('td', {}, String(a.total)), h('td', { class: 'muted small' }, new Date(a.at).toLocaleDateString())]))),
      ]),
  ]);
}

export function render(container, state, dispatch) {
  const have = unlockedBadges();
  mount(container,
    h('div', { class: 'hero' }, [
      dotField(),
      h('div', { class: 'hero-copy' }, [
        h('p', { class: 'eyebrow' }, 'NASA Space Apps · Mission design game'),
        h('h1', { class: 'hero-title' }, ['Design a real', h('br'), 'space mission.']),
        h('p', { class: 'hero-tagline', title: 'Three real satellite missions. Real data only. Physics decides GO or NO-GO.' }, 'Real missions. Real data. GO or NO-GO?'),
        h('div', { class: 'hero-buttons' }, [
          h('button', { class: 'btn btn-primary btn-big', type: 'button', key: 'play-solo', onClick: () => { dispatch(setMode('solo')); dispatch(goToScreen('pickMission')); } }, 'Play solo'),
          h('button', { class: ['btn', 'btn-big', state.mode === 'team' && 'btn-active'], type: 'button', key: 'play-team', title: 'Play as a team (2–4 on one screen)', onClick: () => dispatch(setMode('team')) }, 'Play as a team'),
          h('button', { class: 'text-link', type: 'button', key: 'how-to', onClick: () => { slide = 0; rerender(); } }, ['How to play ', icon('arrowRight', 14)]),
        ]),
        h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Difficulty' }, ['easy', 'normal'].map((d) =>
          h('label', { class: ['seg', state.difficulty === d && 'active'], title: d === 'easy' ? 'Fewer choices: power pack + the standard bus kit from the research build list.' : 'You choose every part yourself.' }, [
            h('input', { type: 'radio', name: 'difficulty', value: d, checked: state.difficulty === d, key: `difficulty-${d}`, onChange: () => dispatch(setDifficulty(d)) }),
            h('span', {}, d === 'easy' ? 'Easy' : 'Normal'),
          ]))),
      ]),
      h('div', { class: 'hero-visual-wrap' }, centrepiece()),
      h('ul', { class: 'hero-points' }, ['Real hardware data', 'Real launch prices', 'Real trade-offs'].map((x) => h('li', {}, x))),
    ]),
    h('p', { class: 'hero-credits' }, 'Data: NASA · ESA · NOAA · SpaceX · Rocket Lab'),
    state.mode === 'team' && teamPanel(state, dispatch),
    h('div', { class: 'below-fold' }, [
      board(),
      h('section', { class: 'leaderboard badge-shelf' }, [
        h('h2', {}, `Badges ${BADGES.filter((b) => have.has(b.id)).length}/${BADGES.length}`),
        h('ul', { class: 'badge-list' }, BADGES.map((b) => h('li', { class: have.has(b.id) ? 'earned' : 'locked', title: `${b.name}: ${b.text}`, 'aria-label': `${b.name}${have.has(b.id) ? '' : ' (locked)'}` }, [icon(b.icon, 16), h('span', { 'aria-hidden': 'true' }, have.has(b.id) ? icon('check', 12) : icon('lock', 12))]))),
      ]),
    ]),
    howToPlay(),
  );
}
