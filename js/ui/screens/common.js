// Helpers shared by the design-step screens.

import { h } from '../dom.js';
import { term } from '../tooltip.js';
import { choiceCard, levels, previewDelta } from '../card.js';
import { CATEGORY_PLAIN, getComponent, isCubeSat, componentsByCategory } from '../../data/components.js';
import { whyComponent } from '../../engine/explain.js';
import { selectComponent } from '../../state/actions.js';
import { kg, watts, money, months, pct } from '../../utils/format.js';

/** Sub-question heading inside a step ("Radio", "Ground stations"…), with the real term. */
export function subQuestion(title, category, extra) {
  const info = category ? CATEGORY_PLAIN[category] : null;
  return h('div', { class: 'subq' }, [
    h('h2', {}, [info ? h('span', { 'aria-hidden': 'true' }, `${info.icon} `) : null, title]),
    info && h('span', { class: 'subq-real' }, ['Real term: ', term(info.glossary, info.realTerm)]),
    extra,
  ]);
}

/** Options for a category that fit the current frame (CubeSat parts only in CubeSats). */
export function optionsFor(state, category) {
  const cube = isCubeSat(getComponent(state.design.components.structure));
  return componentsByCategory(category).filter((c) => isCubeSat(c) === cube);
}

/**
 * Standard card for a bus component. `meterDefs`: [{ label, symbol, value(c), log? }] (max 3).
 */
export function componentCards(state, dispatch, category, meterDefs, before) {
  const options = optionsFor(state, category);
  const meterLevels = meterDefs.map((m) => levels(options.map(m.value), { log: m.log !== false }));
  return h('div', { class: 'choices' }, options.map((c, i) => {
    const selected = state.design.components[category] === c.id;
    return choiceCard({
      key: `comp-${c.id}`,
      icon: c.icon,
      title: c.plainName,
      realTerm: c.name,
      oneLiner: c.oneLiner,
      badges: c.tier === 'advanced' ? ['Advanced'] : [],
      meters: meterDefs.map((m, k) => ({ label: m.label, symbol: m.symbol, level: meterLevels[k][i] })),
      details: [
        ['Weight', kg(c.mass)], ['Power use', watts(c.power)], ['Cost', money(c.cost)],
        ['Reliability', pct(c.reliability, 1)], ['Build time', months(c.devMonths)],
      ],
      selected,
      delta: selected ? null : `If chosen: ${previewDelta(state, selectComponent(category, c.id), before)}`,
      why: whyComponent(c),
      onSelect: () => dispatch(selectComponent(category, c.id)),
    });
  }));
}
