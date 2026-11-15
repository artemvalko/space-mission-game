// Helpers shared by the design-step screens.

import { h } from '../dom.js';
import { term } from '../tooltip.js';
import { choiceCard, levels, previewDelta } from '../card.js';
import { CATEGORY_PLAIN, NONE, getComponent, componentsByCategory, costFor } from '../../data/components.js';
import { getScenario } from '../../data/scenarios.js';
import { whyComponent } from '../../engine/explain.js';
import { selectComponent } from '../../state/actions.js';
import { kg, money, watts, wh } from '../../utils/format.js';

/** Sub-question heading inside a step ("Control radio", "Ground segment"…), with the real term + what it is for. */
export function subQuestion(title, category, extra) {
  const info = category ? CATEGORY_PLAIN[category] : null;
  // Title only; the real term + "what is it for" sit behind the ⓘ glossary popover and the tooltip.
  return h('div', { class: 'subq' }, [
    h('h2', { title: info ? `${info.realTerm}: ${info.whatFor}` : null }, [info ? h('span', { 'aria-hidden': 'true' }, `${info.icon} `) : null, title,
      info ? [' ', term(info.glossary, 'ⓘ')] : null]),
    extra,
  ]);
}

/** Options for a category that fit the current frame size (mission's own parts first). */
export function optionsFor(state, category) {
  const structure = getComponent(state.design.components.structure);
  const sid = state.scenarioId;
  return componentsByCategory(category)
    .filter((c) => !structure || c.formFactor === structure.formFactor)
    .sort((a, b) => Number(b.missions.includes(sid)) - Number(a.missions.includes(sid)));
}

const partDetails = (c, sid) => [
  ['Mass', c.mass == null ? 'not in our data' : kg(c.mass)],
  ['Cost', c.cost == null ? 'not in our data' : money(costFor(c, sid))],
  ...(c.arrayW ? [['Array output (full sun)', `${watts(c.arrayW)}${c.arrayWMax ? `–${watts(c.arrayWMax)}` : ''}`]] : []),
  ...(c.capacityWh ? [['Capacity', `${wh(c.capacityWh)} (60% usable)`]] : []),
  ...(c.rateMbps ? [['Data rate (example)', `${c.rateMbps} Mbps`]] : []),
];

/**
 * Standard cards for a bus category. `meterDefs`: [{ label, symbol, value(c), log? }] (max 3).
 * Categories with a "none" option (CATEGORY_PLAIN[cat].noneText) also get a "leave it out" card.
 */
export function componentCards(state, dispatch, category, meterDefs, before) {
  const sid = state.scenarioId;
  const scenario = getScenario(sid);
  const options = optionsFor(state, category);
  const meterLevels = meterDefs.map((m) => levels(options.map((c) => m.value(c) ?? 0), { log: m.log !== false }));
  const info = CATEGORY_PLAIN[category];
  const card = (c, i) => {
    const selected = state.design.components[category] === c.id;
    const own = c.missions.includes(sid);
    return choiceCard({
      key: `comp-${c.id}`,
      icon: c.icon,
      title: c.plainName,
      realTerm: c.name,
      oneLiner: c.oneLiner,
      whatFor: c.why,
      badges: own ? [c.status === 'recommended' ? 'Recommended' : 'Research build ★'] : [],
      meters: meterDefs.map((m, k) => ({ label: m.label, symbol: m.symbol, level: meterLevels[k][i] })),
      details: partDetails(c, sid),
      data: c,
      selected,
      delta: selected ? null : `If chosen: ${previewDelta(state, selectComponent(category, c.id), before)}`,
      why: whyComponent(c, sid),
      onSelect: () => dispatch(selectComponent(category, c.id)),
    });
  };
  // Progressive disclosure: this mission's parts + the chosen one up front, other valid parts folded.
  const pairs = options.map((c, i) => [c, i]);
  const anyOwn = options.some((o) => o.missions.includes(sid));
  const front = pairs.filter(([c]) => c.missions.includes(sid) || state.design.components[category] === c.id || !anyOwn);
  const more = pairs.filter((x) => !front.includes(x));
  const cards = front.map(([c, i]) => card(c, i));
  if (info.noneText) {
    const selected = state.design.components[category] === NONE;
    const needed = scenario?.requiredBus.includes(category);
    cards.push(choiceCard({
      key: `comp-none-${category}`,
      icon: '🚫',
      title: info.noneText,
      oneLiner: selected ? `${needed ? '⚠️ ' : ''}${cap(info.noneWhy)}` : null,
      badges: needed ? [] : ['Fine for this mission'],
      selected,
      warn: selected && needed,
      delta: selected ? null : `If chosen: ${previewDelta(state, selectComponent(category, NONE), before)}`,
      why: `${info.realTerm}: ${info.whatFor} Without it: ${info.noneWhy}`,
      whyTitle: info.noneText,
      onSelect: () => dispatch(selectComponent(category, NONE)),
    }));
  }
  return h('div', {}, [
    h('div', { class: 'choices' }, cards),
    more.length > 0 && h('details', { class: 'fold' }, [h('summary', { title: 'More valid options from other research builds' }, `＋${more.length} more`), h('div', { class: 'choices' }, more.map(([c, i]) => card(c, i)))]),
  ]);
}

export const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
