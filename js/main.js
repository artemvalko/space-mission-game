// Bootstrap: create the store, render goal strip + step list + screen + sidebar on every change.

import { createStore } from './state/store.js';
import { reducer } from './state/reducer.js';
import { createInitialState } from './state/initialState.js';
import { goToScreen, loadDesign } from './state/actions.js';
import { attemptKey, attemptRecord } from './engine/attempt.js';
import { saveAttempt, unlockBadges } from './ui/storage.js';
import { earnedBadges } from './engine/achievements.js';
import { decodeDesign } from './utils/share.js';
import { renderRouter, renderStepList } from './ui/router.js';
import { renderSidebar } from './ui/sidebar.js';
import { renderGoalStrip } from './ui/goalStrip.js';
import { hidePopover } from './ui/tooltip.js';
import { setRerender } from './ui/view.js';
import { h, mount } from './ui/dom.js';
import { isMuted, setMuted } from './ui/sound.js';
import { SOURCES, DATA_KIND, DATA_LIMITATIONS } from './data/sources.js';
import { dataBadge } from './ui/card.js';
import { icon } from './ui/icons.js';

const store = createStore(reducer, createInitialState());
const { dispatch } = store;

const els = {
  screen: document.getElementById('screen'),
  sidebar: document.getElementById('sidebar'),
  goal: document.getElementById('goal-strip'),
  steps: document.getElementById('step-list'),
  actions: document.getElementById('header-actions'),
};

// Screens without the design sidebar / goal strip.
const NO_SIDEBAR = new Set(['start', 'pickMission', 'operations', 'results']);
const NO_CHROME = new Set(['start']);

let lastScreen = null;
let sourcesOpen = false; // view-only: "Sources & data honesty" panel

/** Header panel: every source (S01–S34) + the honest limits of the data (research §12, §12.1). */
function sourcesPanel() {
  if (!sourcesOpen) return null;
  const close = () => { sourcesOpen = false; render(); };
  return h('div', { class: 'modal-backdrop', onClick: (e) => { if (e.target === e.currentTarget) close(); } },
    h('div', { class: 'modal sources-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Sources and data honesty' }, [
      h('h2', {}, 'Sources & data honesty'),
      h('p', {}, 'Every number in this game comes from our research document. Each card says what kind of number it is:'),
      h('ul', {}, Object.keys(DATA_KIND).map((k) => h('li', {}, [dataBadge(k), ' ', DATA_KIND[k].text]))
        .concat(h('li', {}, [dataBadge('rfq'), ' No public price exists — the game never invents one.']))),
      h('p', {}, h('span', { class: 'simulated-tag' }, 'simulated'), ' Events and mission output (packets, measurements, pictures) are simulated for the game. Real NASA/NOAA data is always labelled real.'),
      h('h3', {}, 'Honest limits of the data'),
      h('ul', { class: 'small' }, DATA_LIMITATIONS.map((t) => h('li', {}, t))),
      h('h3', {}, `Sources (${SOURCES.length})`),
      h('table', {}, [h('thead', {}, h('tr', {}, [h('th', {}, 'Code'), h('th', {}, 'Source'), h('th', {}, 'What it confirms')])),
        h('tbody', {}, SOURCES.map((src) => h('tr', {}, [h('td', {}, src.code), h('td', {}, h('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer' }, src.title)), h('td', {}, src.confirms)])))]),
      h('p', { class: 'small muted' }, 'Sources checked on 15 November 2026. Prices change; a catalog price is never a quote for a whole mission.'),
      h('div', { class: 'button-row' }, h('button', { class: 'btn btn-primary', type: 'button', key: 'sources-close', onClick: close }, 'Close')),
    ]));
}

function render(state = store.getState()) {
  // Remember which control had focus so keyboard users keep their place after re-render.
  const focusKey = document.activeElement?.dataset?.key;
  hidePopover();
  document.body.dataset.screen = state.screen;
  document.body.classList.toggle('no-sidebar', NO_SIDEBAR.has(state.screen));
  document.body.classList.toggle('no-chrome', NO_CHROME.has(state.screen));

  if (!NO_CHROME.has(state.screen)) {
    renderGoalStrip(els.goal, state);
    renderStepList(els.steps, state, dispatch);
  }
  renderRouter(els.screen, state, dispatch);
  if (!NO_SIDEBAR.has(state.screen)) renderSidebar(els.sidebar, state, dispatch);
  els.actions.replaceChildren();
  mount(els.actions,
    state.mode === 'team' && h('span', { class: 'pill', title: state.players.map((p) => p.name).join(', ') }, [icon('team', 14), ` ${state.players.length}`]),
    h('span', { class: 'pill pill-mode', title: state.difficulty === 'easy' ? 'Easy' : 'Normal', role: 'img', 'aria-label': state.difficulty === 'easy' ? 'Easy mode' : 'Normal mode' }, icon(state.difficulty === 'easy' ? 'feather' : 'sliders', 14)),
    h('button', { class: 'top-link', type: 'button', key: 'sources', title: 'Sources & data honesty', onClick: () => { sourcesOpen = true; render(); } }, 'Sources'),
    h('button', { class: 'top-link', type: 'button', key: 'mute', 'aria-pressed': isMuted() ? 'true' : 'false', 'aria-label': isMuted() ? 'Sound off — turn on' : 'Sound on — mute', title: isMuted() ? 'Sound off' : 'Sound on', onClick: () => { setMuted(!isMuted()); render(); } }, icon(isMuted() ? 'mute' : 'sound', 16)),
  );

  document.getElementById('sources-host')?.remove();
  const panel = sourcesPanel();
  if (panel) { panel.id = 'sources-host'; document.body.append(panel); }

  if (state.screen !== lastScreen) {
    // Smooth "warp" into a new step (CSS animation; disabled for reduced motion).
    if (lastScreen !== null) els.screen.querySelector('.screen')?.classList.add('warp');
    window.scrollTo(0, 0);
    lastScreen = state.screen;
  } else if (focusKey) {
    document.querySelector(`[data-key="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
  }
}

document.getElementById('brand').addEventListener('click', () => dispatch(goToScreen('start')));

// Card tilt on hover (Phase 4 P3 #14): CSS reads --tx / --ty set from the pointer position.
const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
document.addEventListener('pointermove', (e) => {
  const card = e.target.closest?.('.choice:not(.disabled)');
  if (!card || reduce()) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--tx', `${(((e.clientX - r.left) / r.width) - 0.5) * 8}deg`);
  card.style.setProperty('--ty', `${(0.5 - ((e.clientY - r.top) / r.height)) * 8}deg`);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sourcesOpen) { sourcesOpen = false; render(); } });
document.addEventListener('pointerout', (e) => {
  const card = e.target.closest?.('.choice');
  if (card && !card.contains(e.relatedTarget)) { card.style.removeProperty('--tx'); card.style.removeProperty('--ty'); }
});

// Persist each finished attempt once (side effect kept out of the reducer).
let lastSaved = null;
function autosave(state) {
  if (!state.score || !state.simulation?.complete) return;
  const key = attemptKey(state);
  if (key === lastSaved) return;
  lastSaved = key;
  saveAttempt(attemptRecord(state, Date.now()));
  const fresh = unlockBadges(earnedBadges(state, state.score, state.simulation).filter((b) => b.earned).map((b) => b.id));
  if (fresh.length) render(); // show the NEW! marks
}

store.subscribe(render);
store.subscribe(autosave);

// "Share design" links: #d=… loads the design straight into the Final check.
const shared = decodeDesign(location.hash);
if (shared) dispatch(loadDesign(shared));
setRerender(render);
render();

// Handy for debugging in the console: __store.getState(), __store.getLog()
window.__store = store;
