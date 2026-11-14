// "Mission Goal" strip: icon + one-line objective + checklist chips that tick live.

import { h } from './dom.js';
import { getScenario } from '../data/scenarios.js';
import { goalChecklist } from '../engine/goals.js';

const MARK = { ok: '✓', bad: '✗', todo: '' };
const lastChip = {};

export function renderGoalStrip(container, state) {
  const scenario = getScenario(state.scenarioId);
  if (!scenario) {
    container.replaceChildren(h('div', { class: 'goal-empty' }, '🎯 Pick a mission to see your goal here.'));
    return;
  }
  const chips = goalChecklist(state);
  container.replaceChildren(
    h('div', { class: 'goal-main' }, [
      h('span', { class: 'goal-icon', 'aria-hidden': 'true' }, scenario.icon),
      h('div', {}, [
        h('div', { class: 'goal-label' }, `Mission goal · ${scenario.name}`),
        h('div', { class: 'goal-text' }, scenario.oneLiner),
      ]),
    ]),
    h('ul', { class: 'goal-chips', 'aria-label': 'Goal checklist' }, chips.map((c) => {
      const pop = c.status === 'ok' && lastChip[c.id] && lastChip[c.id] !== 'ok';
      lastChip[c.id] = c.status;
      return h('li', { class: ['chip', `chip-${c.status}`, pop && 'pop'], title: c.hint }, [
        h('span', { 'aria-hidden': 'true' }, c.icon), ` ${c.label} `,
        h('span', { class: 'chip-mark', 'aria-label': c.status }, MARK[c.status]),
      ]);
    })),
  );
}
