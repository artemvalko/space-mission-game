// "Mission Goal" strip: icon + one-line objective + checklist chips that tick live.

import { h } from './dom.js';
import { icon } from './icons.js';
import { getScenario } from '../data/scenarios.js';
import { goalChecklist } from '../engine/goals.js';

const lastChip = {};

export function renderGoalStrip(container, state) {
  const scenario = getScenario(state.scenarioId);
  if (!scenario) {
    container.replaceChildren(h('div', { class: 'goal-empty' }, 'Pick a mission to see your goal here.'));
    return;
  }
  const chips = goalChecklist(state);
  container.replaceChildren(
    h('div', { class: 'goal-main', title: `Mission goal: ${scenario.objective}` }, [
      h('span', { class: 'goal-icon', 'aria-hidden': 'true' }, icon(scenario.icon, 18)),
      h('div', { class: 'goal-text' }, scenario.name),
    ]),
    h('ul', { class: 'goal-chips', 'aria-label': 'Goal checklist' }, chips.map((c) => {
      const pop = c.status === 'ok' && lastChip[c.id] && lastChip[c.id] !== 'ok';
      lastChip[c.id] = c.status;
      // Icon chips: only numbers (budget, months) stay as text; the rest is in the tooltip.
      const showLabel = ['money', 'time', 'lifetime'].includes(c.id);
      return h('li', { class: ['chip', `chip-${c.status}`, pop && 'pop'], title: `${c.label}: ${c.hint}`, 'aria-label': `${c.label} ${c.status}` }, [
        icon(c.icon, 14), showLabel ? ` ${c.label}` : '',
        h('span', { class: 'chip-dot', 'aria-hidden': 'true' }),
      ]);
    })),
  );
}
