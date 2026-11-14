// Step 1 — Pick a mission: illustrated cards (icon, one line, difficulty stars, budget only).

import { mount, h } from '../dom.js';
import { choiceCard } from '../card.js';
import { SCENARIOS, getScenario, EASY_DEFAULT_SCENARIO } from '../../data/scenarios.js';
import { selectScenario } from '../../state/actions.js';
import { money, months, years, num } from '../../utils/format.js';

const stars = (n) => (n === 0 ? 'Free play' : '★'.repeat(n) + '☆'.repeat(3 - n));

export function render(container, state, dispatch) {
  const current = getScenario(state.scenarioId);
  mount(container, 
    h('div', { class: 'choices choices-wide' }, SCENARIOS.map((sc) => choiceCard({
      key: `scenario-${sc.id}`,
      icon: sc.icon,
      title: sc.name,
      oneLiner: sc.oneLiner,
      badges: [
        ...(state.difficulty === 'easy' && sc.id === EASY_DEFAULT_SCENARIO ? ['Start here'] : []),
      ],
      extra: h('div', { class: 'mission-meta' }, [
        h('span', { class: 'stars', 'aria-label': `Difficulty ${sc.stars} of 3` }, stars(sc.stars)),
        !sc.sandbox && h('span', {}, `💰 ${money(sc.budgetM)}`),
      ]),
      selected: sc.id === state.scenarioId,
      onSelect: () => dispatch(selectScenario(sc.id)),
    }))),
    current && h('div', { class: 'brief' }, [
      h('div', { class: 'brief-icon', 'aria-hidden': 'true' }, current.icon),
      h('div', {}, [
        h('p', { class: 'brief-text' }, current.brief),
        !current.sandbox && h('p', { class: 'muted' },
          `You have ${money(current.budgetM)} and ${months(current.deadlineMonths).replace(' mo', ' months')} to build it. It must work for ${years(current.minLifetimeYears).replace(' yr', ' years')} and collect ${num(current.minScience)} science points a year.`),
      ]),
    ]),
  );
}
