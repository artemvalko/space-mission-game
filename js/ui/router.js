// Screen switching driven by state.screen: numbered step tabs (current = underline, done = check icon),
// question header (+ team owner badge), the screen itself, and Back / Next.

import { mount, h } from './dom.js';
import { icon, initials } from './icons.js';
import { goToScreen } from '../state/actions.js';
import { ROLES } from '../data/roles.js';
import { STEPS, getStep, visibleSteps, isReachable, nextStep, prevStep } from './steps.js';

import * as start from './screens/start.js';
import * as pickMission from './screens/pickMission.js';
import * as size from './screens/size.js';
import * as science from './screens/science.js';
import * as power from './screens/power.js';
import * as comms from './screens/comms.js';
import * as brains from './screens/brains.js';
import * as orbit from './screens/orbit.js';
import * as rocket from './screens/rocket.js';
import * as launchPrep from './screens/launchPrep.js';
import * as finalCheck from './screens/finalCheck.js';
import * as operations from './screens/operations.js';
import * as results from './screens/results.js';

const MODULES = { start, pickMission, size, science, power, comms, brains, orbit, rocket, launchPrep, finalCheck, operations, results };

export function renderStepList(container, state, dispatch) {
  const steps = visibleSteps(state);
  const currentIdx = STEPS.findIndex((s) => s.id === state.screen);
  container.replaceChildren(h('ol', { class: 'steps' }, steps.map((st) => {
    const idx = STEPS.findIndex((s) => s.id === st.id);
    const current = st.id === state.screen;
    const done = !current && st.answered?.(state) && (idx < currentIdx || st.id !== 'results');
    // Numbered tabs: the number is a CSS counter ("01"), only the current step shows its name
    // (the others: name in the tooltip / aria-label); done steps get a small check icon.
    return h('li', { class: ['step', current && 'current', done && 'done'] },
      h('button', {
        type: 'button', key: `step-${st.id}`, disabled: !isReachable(st.id, state),
        'aria-current': current ? 'step' : null, title: st.label, 'aria-label': `${st.label}${done ? ' (done)' : ''}`,
        onClick: () => dispatch(goToScreen(st.id)),
      }, [current ? h('span', { class: 'step-name' }, st.label) : null, done ? icon('check', 12) : null]));
  })));
}

function ownerBadge(state, step) {
  if (state.mode !== 'team' || !step.owner) return null;
  const role = ROLES.find((r) => r.id === step.owner);
  const players = state.players.filter((p) => p.roleId === step.owner).map((p) => p.name);
  return h('div', { class: 'owner-badge' }, players.length
    ? [h('span', { class: 'monogram monogram-sm', 'aria-hidden': 'true' }, initials(players.join(' '))), ` ${players.join(' & ')} decides`]
    : [icon('team', 14), ' Decide together']);
}

function navBar(state, dispatch) {
  const step = getStep(state.screen);
  const prev = prevStep(state);
  const next = nextStep(state);
  const showNext = next && state.screen !== 'finalCheck';
  const blocked = step.answered && !step.answered(state);
  return h('div', { class: 'nav-bar' }, [
    prev
      ? h('button', { class: 'btn btn-ghost', type: 'button', key: 'nav-back', title: `Back: ${prev.label}`, onClick: () => dispatch(goToScreen(prev.id)) }, '← Back')
      : h('span'),
    showNext && h('button', {
      class: 'btn btn-primary btn-big', type: 'button', key: 'nav-next', disabled: blocked || !isReachable(next.id, state),
      onClick: () => dispatch(goToScreen(next.id)),
      title: `Next: ${next.verb}`,
    }, 'Next →'),
  ]);
}

export function renderRouter(container, state, dispatch) {
  const mod = MODULES[state.screen] ?? start;
  const step = getStep(state.screen);
  const screenEl = h('section', { class: `screen screen-${state.screen}` });
  if (step.question && state.screen !== 'start') {
    mount(screenEl, h('header', { class: 'question', title: `Step ${visibleSteps(state).findIndex((s) => s.id === step.id) + 1} · NASA phase: ${step.phase}` }, [
      h('h1', {}, step.question),
      ownerBadge(state, step),
    ]));
  }
  mod.render(screenEl, state, dispatch);
  container.replaceChildren(screenEl, state.screen === 'start' ? h('span') : navBar(state, dispatch));
}
