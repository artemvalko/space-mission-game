// Helpers shared by the design-step screens.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { term, infoTerm } from '../tooltip.js';
import { choiceCard, levels, previewDelta } from '../card.js';
import { CATEGORY_PLAIN, NONE, getComponent, componentsByCategory, costFor } from '../../data/components.js';
import { getScenario } from '../../data/scenarios.js';
import { whyComponent } from '../../engine/explain.js';
import { selectComponent } from '../../state/actions.js';
import { kg, money, watts, wh } from '../../utils/format.js';
import { rerender } from '../view.js';

/** Sub-question heading inside a step ("Control radio", "Ground segment"…), with the real term + what it is for. */
export function subQuestion(title, category, extra) {
  const info = category ? CATEGORY_PLAIN[category] : null;
  // Title only; the real term + "what is it for" sit behind the info-icon glossary popover and the tooltip.
  return h('div', { class: 'subq' }, [
    h('h2', { title: info ? `${info.realTerm}: ${info.whatFor}` : null }, [info ? icon(info.icon, 18) : null, info ? ' ' : null, title,
      info ? [' ', infoTerm(info.glossary)] : null]),
    extra,
  ]);
}

/**
 * Options for a category that fit the current frame: the mission's research part first, then shared
 * real products. Another mission's research card is a duplicate of the same thing → hidden.
 */
export function optionsFor(state, category) {
  const structure = getComponent(state.design.components.structure);
  const sid = state.scenarioId;
  const chosenId = state.design.components[category];
  return componentsByCategory(category)
    .filter((c) => !structure || c.formFactor === structure.formFactor)
    .filter((c) => c.id === chosenId || !c.missions.length || c.missions.includes(sid))
    .sort((a, b) => Number(b.missions.includes(sid)) - Number(a.missions.includes(sid)));
}

const partDetails = (c, sid) => [
  ['Mass', c.mass != null ? kg(c.mass) : c.massClassOf ? '≈ research SDR class (estimate)' : 'not public (?)'],
  ['Price', c.cost != null ? money(costFor(c, sid)) : 'not public (?)'],
  ...(c.costText ? [['Price sources', c.costText]] : []),
  ...(c.massText ? [['Mass sources', c.massText]] : []),
  ...(c.arrayW ? [['Array output (full sun)', `${watts(c.arrayW)}${c.arrayWMax ? `–${watts(c.arrayWMax)}` : ''}`]] : []),
  ...(c.capacityWh ? [['Capacity', `${wh(c.capacityWh)} (60% usable)`]] : []),
  ...(c.rateMbps ? [['Data rate', `${c.rateMbps} Mbps`]] : []),
  ...(c.powerW ? [['Power', watts(c.powerW)]] : []),
];

/** Why a part is physically impossible for the current design ('' = possible). */
export function partWhyNot(c, state) {
  const structure = getComponent(state.design.components.structure);
  if (c.fitsUnits && structure?.units && !c.fitsUnits.includes(structure.units)) return `Made for a ${c.fitsUnits.join('/')}U frame.`;
  if (c.requiresComms && state.design.components.comms !== c.requiresComms) return 'Needs the S-band transceiver as control radio.';
  return '';
}

// ── Compare toggle (view-only): side-by-side table of the visible options of a step.
const compareOpen = new Set();
const cell = (v) => (v == null ? '?' : v);
/** Row values for any option kind (part, payload, orbit, launcher, ground, structure). */
export function compareRow(o, sid) {
  const mass = o.reference ? `${o.reference.totalMassKg} kg (real)` : 'mass' in o ? (o.mass != null ? `${o.mass} kg` : o.massClassOf ? '≈1.5 kg' : '?') : o.altitudeText ?? '—';
  const power = o.arrayW ? `${o.arrayW} W` : o.capacityWh ? `${o.capacityWh} Wh` : o.powerW ? `${o.powerW} W` : o.rateMbps ? `${o.rateMbps} Mbps` : o.inclinationText ?? '—';
  const price = 'cost' in o ? (o.cost != null ? money(costFor(o, sid)) : '?') : 'priceM' in o ? (o.priceM != null ? money(o.priceM) : '?') : '—';
  return [o.plainName, cell(mass), cell(power), cell(price), o.oneLiner ?? ''];
}
export function compareToggle(key, items, sid, headers = ['Option', 'Mass', 'Power / size', 'Price', 'Trade-off']) {
  const open = compareOpen.has(key);
  return h('div', { class: 'compare-box' }, [
    h('button', { class: ['btn', 'btn-small', open && 'btn-active'], type: 'button', key: `compare-${key}`, 'aria-pressed': open ? 'true' : 'false',
      title: 'Show the options side by side', onClick: () => { if (open) compareOpen.delete(key); else compareOpen.add(key); rerender(); } }, [icon('layers', 14), ' Compare']),
    open && h('table', { class: 'compare-real compare-table' }, [
      h('thead', {}, h('tr', {}, headers.map((t) => h('th', {}, t)))),
      h('tbody', {}, items.map((o) => h('tr', {}, compareRow(o, sid).map((v) => h('td', {}, v))))),
    ]),
  ]);
}

/**
 * Standard cards for a bus category. `meterDefs`: [{ label, icon, value(c), log? }] (max 3).
 * Shows up to `max` options up front (chosen + research part first); the rest fold under "+N more".
 * Impossible options stay visible but greyed with a one-line reason.
 * Categories with a "none" option (CATEGORY_PLAIN[cat].noneText) also get a "leave it out" card (folded).
 */
export function componentCards(state, dispatch, category, meterDefs, before, { max = 3, compare = true } = {}) {
  const sid = state.scenarioId;
  const scenario = getScenario(sid);
  const options = optionsFor(state, category);
  const meterLevels = meterDefs.map((m) => levels(options.map((c) => m.value(c) ?? 0), { log: m.log !== false }));
  const info = CATEGORY_PLAIN[category];
  const card = (c, i) => {
    const selected = state.design.components[category] === c.id;
    const own = c.missions.includes(sid);
    const whyNot = partWhyNot(c, state);
    return choiceCard({
      key: `comp-${c.id}`,
      icon: c.icon,
      title: c.plainName,
      realTerm: c.name,
      oneLiner: c.oneLiner,
      whatFor: c.why,
      badges: own ? [c.status === 'recommended' ? 'Recommended' : 'Research build'] : [],
      meters: meterDefs.map((m, k) => ({ label: m.label, icon: m.icon, level: meterLevels[k][i] })),
      details: partDetails(c, sid),
      data: c,
      selected,
      disabled: !!whyNot && !selected,
      warn: !!whyNot && selected,
      disabledReason: `${whyNot}`,
      delta: selected || whyNot ? null : `If chosen: ${previewDelta(state, selectComponent(category, c.id), before)}`,
      why: `${whyNot ? `${whyNot} ` : ''}${whyComponent(c, sid)}`,
      onSelect: () => dispatch(selectComponent(category, c.id)),
    });
  };
  const chosenId = state.design.components[category];
  const pairs = options.map((c, i) => [c, i]);
  // Order: chosen, this mission's research part, possible real products, impossible ones last.
  const rank = ([c]) => (c.id === chosenId ? 0 : c.missions.includes(sid) ? 1 : partWhyNot(c, state) ? 3 : 2);
  const sorted = [...pairs].sort((a, b) => rank(a) - rank(b));
  const front = sorted.slice(0, max);
  const more = sorted.slice(max);
  const cards = front.map(([c, i]) => card(c, i));
  const extra = more.map(([c, i]) => card(c, i));
  if (info.noneText) {
    const selected = state.design.components[category] === NONE;
    const needed = scenario?.requiredBus.includes(category);
    (selected ? cards : extra).push(choiceCard({
      key: `comp-none-${category}`,
      icon: 'ban',
      title: info.noneText,
      oneLiner: selected ? cap(info.noneWhy) : null,
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
    extra.length > 0 && h('details', { class: 'fold' }, [h('summary', { title: `${extra.length} more real options (and leaving it out)` }, `+${extra.length}`), h('div', { class: 'choices' }, extra)]),
    compare && compareToggle(`cat-${category}`, options, sid),
  ]);
}

export const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
