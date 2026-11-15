// Step 1 — Pick a mission: three big cards (icon, one line, difficulty, model budget, real inspiration).

import { mount, h } from '../dom.js';
import { choiceCard, dataBadge } from '../card.js';
import { SCENARIOS, getScenario, EASY_DEFAULT_SCENARIO } from '../../data/scenarios.js';
import { selectScenario } from '../../state/actions.js';
import { money } from '../../utils/format.js';

const stars = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

export function render(container, state, dispatch) {
  const current = getScenario(state.scenarioId);
  mount(container,
    h('div', { class: 'choices choices-wide' }, SCENARIOS.map((sc) => choiceCard({
      key: `scenario-${sc.id}`,
      icon: sc.icon,
      title: sc.name,
      oneLiner: sc.oneLiner,
      badges: [...(state.difficulty === 'easy' && sc.id === EASY_DEFAULT_SCENARIO ? ['Start here'] : [])],
      extra: h('div', { class: 'mission-meta' }, [
        h('span', { class: 'stars', 'aria-label': `Difficulty ${sc.stars} of 3` }, stars(sc.stars)),
        h('span', {}, [`💰 ${money(sc.budgetM)} `, dataBadge('model')]),
        h('div', { class: 'small muted' }, `Real mission inspiration: ${sc.realInspiration}`),
      ]),
      data: sc,
      selected: sc.id === state.scenarioId,
      onSelect: () => dispatch(selectScenario(sc.id)),
    }))),
    current && h('div', { class: 'brief' }, [
      h('div', { class: 'brief-icon', 'aria-hidden': 'true' }, current.icon),
      h('div', {}, [
        h('p', { class: 'brief-text' }, current.brief),
        h('p', { class: 'muted' }, [h('strong', {}, 'Goal: '), current.objective]),
        h('p', { class: 'muted small' }, [`Model budget ${money(current.budgetM)} `, dataBadge('model'),
          current.deadlineMonths ? ` · planning window ${current.deadlineMonths[0]}–${current.deadlineMonths[1]} months` : '',
          ' · Lesson: ', h('strong', {}, current.impossibleClaim.title)]),
      ]),
    ]),
  );
}
