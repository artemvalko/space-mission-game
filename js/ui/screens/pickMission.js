// Step 1 — Pick a mission: three big cards (icon, one line, difficulty, model budget, real inspiration).

import { mount, h } from '../dom.js';
import { icon } from '../icons.js';
import { choiceCard, dataBadge } from '../card.js';
import { SCENARIOS, getScenario, EASY_DEFAULT_SCENARIO } from '../../data/scenarios.js';
import { selectScenario, setVariant } from '../../state/actions.js';
import { money } from '../../utils/format.js';

const stars = (n) => [1, 2, 3].map((k) => h('span', { class: k <= n ? 'on' : 'off' }));

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
        h('span', { class: 'stars meter-seg', role: 'img', 'aria-label': `Difficulty ${sc.stars} of 3`, title: `Difficulty ${sc.stars} of 3` }, stars(sc.stars)),
        h('span', { class: 'num' }, [icon('money', 14), ` ${money(sc.budgetM)} `, dataBadge('model')]),
      ]),
      details: [['Real mission inspiration', sc.realInspiration], ['Goal', sc.objective], ...(sc.deadlineMonths ? [['Planning window', `${sc.deadlineMonths[0]}–${sc.deadlineMonths[1]} months`]] : [])],
      data: sc,
      selected: sc.id === state.scenarioId,
      onSelect: () => dispatch(selectScenario(sc.id)),
    }))),
    // Objective variant: different builds can each be "right" (docs/OPTIONS_RESEARCH.md).
    current?.variants && h('div', { class: 'variant-row', role: 'radiogroup', 'aria-label': 'Objective' }, [
      h('span', { class: 'eyebrow' }, 'Goal'),
      ...current.variants.map((v) => {
        const on = (state.design.variantId ?? current.variants[0].id) === v.id;
        return h('button', { class: ['mini', on && 'active'], type: 'button', key: `variant-${v.id}`, 'aria-pressed': on ? 'true' : 'false', title: v.text, onClick: () => dispatch(setVariant(v.id)) }, [icon(v.icon, 14), ` ${v.label}`]);
      }),
    ]),
    // The brief opens only on request (progressive disclosure).
    current && h('details', { class: 'brief fold', key: 'brief' }, [
      h('summary', {}, `${current.name}: the brief`),
      h('p', { class: 'brief-text' }, current.brief),
      h('p', { class: 'muted' }, [h('strong', {}, 'Goal: '), current.objective]),
      h('p', { class: 'muted small' }, [`Model budget ${money(current.budgetM)} `, dataBadge('model', { full: true }),
        current.deadlineMonths ? ` · planning window ${current.deadlineMonths[0]}–${current.deadlineMonths[1]} months` : '',
        ' · Lesson: ', h('strong', {}, current.impossibleClaim.title)]),
    ]),
  );
}
