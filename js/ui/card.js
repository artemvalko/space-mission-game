// Big choice cards: icon, plain name, ONE consequence sentence, max 3 simple meters.
// Exact numbers live in an expandable "Details". Delta preview on hover/focus is computed by
// running the action through the (pure) reducer on a copy of the state.

import { h } from './dom.js';
import { whyButton, term } from './tooltip.js';
import { reducer } from '../state/reducer.js';
import { computeResources } from '../engine/resources.js';
import { formatDelta } from '../engine/explain.js';
import { sound } from './sound.js';

/** "What if I dispatched this?" → "+40 kg, +120 W, +$15M" */
export function previewDelta(state, action, before = computeResources(state)) {
  return formatDelta(before, computeResources(reducer(state, action)));
}

/**
 * Relative levels 1–3 for a list of values (log scale for wide ranges like mass/cost).
 * Equal values → 2. Use for "Weight ●●○" style meters.
 */
export function levels(values, { log = true } = {}) {
  const f = (v) => (log ? Math.log10(Math.max(v, 0) + 1) : v);
  const xs = values.map(f);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  return xs.map((x) => (max - min < 1e-9 ? 2 : 1 + Math.round((2 * (x - min)) / (max - min))));
}

/** One meter: label + 3 symbols (filled up to level). */
export function meter({ label, symbol = '●', level, text }) {
  return h('div', { class: 'meter', title: text ?? `${label}: ${level}/3` }, [
    h('span', { class: 'meter-label' }, label),
    h('span', { class: 'meter-dots', 'aria-label': `${level} of 3` },
      [1, 2, 3].map((n) => h('span', { class: n <= level ? 'on' : 'off' }, symbol))),
  ]);
}

/**
 * @param {object} o
 * @param {string} o.key           unique key (focus restore + tests)
 * @param {string} o.icon
 * @param {string} o.title         plain name
 * @param {string} [o.realTerm]    small grey subtitle (real engineering name)
 * @param {string} [o.glossary]    glossary id for the real term
 * @param {string} o.oneLiner      ONE consequence sentence
 * @param {object[]} [o.meters]    max 3 { label, symbol, level }
 * @param {[string,string][]} [o.details]  exact numbers (collapsed)
 * @param {string[]} [o.badges]
 * @param {boolean} o.selected
 * @param {boolean} [o.disabled]
 * @param {string} [o.disabledReason]
 * @param {string} [o.delta]       hover preview, e.g. "If chosen: +40 kg, +$15M"
 * @param {string|Function} [o.why]
 * @param {Function} o.onSelect
 * @param {Node} [o.art]           optional picture (SVG) at the top
 */
export function choiceCard(o) {
  const meters = (o.meters ?? []).slice(0, 3); // rule: never more than 3 stats by default
  const card = h('div', {
    class: ['choice', o.selected && 'selected', o.disabled && 'disabled', o.warn && 'warn'],
    tabindex: o.disabled ? -1 : 0,
    role: 'button',
    'aria-pressed': o.selected ? 'true' : 'false',
    'aria-disabled': o.disabled ? 'true' : null,
    key: o.key,
    onClick: (e) => { if (!o.disabled && !e.target.closest('details, .why-btn, .term, .no-select')) { sound.click(); o.onSelect(); } },
    onKeydown: (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === card && !o.disabled) { e.preventDefault(); o.onSelect(); }
    },
  }, [
    o.art && h('div', { class: 'choice-art' }, o.art),
    h('div', { class: 'choice-head' }, [
      h('span', { class: 'choice-icon', 'aria-hidden': 'true' }, o.icon),
      h('div', { class: 'choice-titles' }, [
        h('div', { class: 'choice-title' }, o.title),
        o.realTerm && h('div', { class: 'choice-real' }, o.glossary ? term(o.glossary, o.realTerm) : o.realTerm),
      ]),
      o.selected && h('span', { class: 'choice-check', 'aria-hidden': 'true' }, '✓'),
    ]),
    (o.badges?.length ?? 0) > 0 && h('div', { class: 'badges' }, o.badges.map((b) => h('span', { class: `badge badge-${b.replace(/[^a-z-]/gi, '').toLowerCase()}` }, b))),
    h('p', { class: 'choice-one' }, o.disabled && o.disabledReason ? o.disabledReason : o.oneLiner),
    meters.length > 0 && h('div', { class: 'meters' }, meters.map(meter)),
    o.extra,
    h('div', { class: 'choice-foot' }, [
      o.details?.length ? h('details', { class: 'choice-details' }, [
        h('summary', {}, 'Details'),
        h('dl', {}, o.details.map(([k, v]) => h('div', {}, [h('dt', {}, k), h('dd', {}, v)]))),
      ]) : h('span'),
      o.why && whyButton(o.whyTitle ?? o.title, o.why),
    ]),
    o.delta && !o.disabled && h('div', { class: 'delta' }, o.delta),
  ]);
  return card;
}
