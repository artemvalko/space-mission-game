// Big choice cards: icon, plain name, ONE consequence sentence, max 3 simple meters.
// Exact numbers live in an expandable "Details". Delta preview on hover/focus is computed by
// running the action through the (pure) reducer on a copy of the state.

import { h } from './dom.js';
import { whyButton, term } from './tooltip.js';
import { reducer } from '../state/reducer.js';
import { computeResources } from '../engine/resources.js';
import { formatDelta } from '../engine/explain.js';
import { sound } from './sound.js';
import { getSource, DATA_KIND } from '../data/sources.js';

/**
 * Data-honesty badge: ✔ Real fact · 🏷 Catalog price · ≈ Estimate (or ✉️ RFQ).
 * Icon-only by default (label in the tooltip); `full: true` also prints the label (Details, panels).
 */
export function dataBadge(kind, { full = false } = {}) {
  const k = kind === 'rfq'
    ? { icon: '✉️', label: 'Price on request (RFQ)', cls: 'rfq', text: 'No public price — a real mission asks the operator for a quote.' }
    : DATA_KIND[kind];
  if (!k) return null;
  return h('span', { class: `data-badge data-${k.cls}${full ? '' : ' icon-only'}`, title: `${k.label}: ${k.text}`, 'aria-label': k.label }, full ? `${k.icon} ${k.label}` : k.icon);
}

// Card badges are icons on the card face; the words live in the tooltip.
const BADGE_ICON = {
  'Research build ★': '★', 'Needed for your goal ★': '★', 'Recommended ★': '★', Recommended: '☆', 'Fine for this mission': '✓',
  'Also works': '✓', 'Other mission': '✗', 'Wrong for this mission': '✗', "Can't reach": '✗', 'Too small': '✗', 'Info only': 'ℹ️',
  Timing: '⏱️', Calibration: '🎚️', Overkill: '⚠️',
};
function badgeFace(b) {
  if (BADGE_ICON[b]) return { face: BADGE_ICON[b], title: b };
  const m = /^(\S+)\s+(.+)$/u.exec(b);
  if (m && !/[A-Za-z0-9]/.test(m[1])) return { face: m[1], title: m[2] }; // "🏷 Published price" → 🏷
  return { face: b, title: b };
}

/** "Source: S04 · S05 · research §4.3" with links that open in a new tab. */
export function sourceLinks(codes = [], ref = null) {
  const links = codes.map(getSource).filter(Boolean).map((src) => h('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer', title: `${src.title} — ${src.confirms}`, class: 'src-link' }, src.code));
  if (!links.length && !ref) return null;
  const sep = (arr) => arr.flatMap((x, i) => (i ? [' · ', x] : [x]));
  return h('span', { class: 'sources' }, ['Source: ', ...sep(links), ref ? `${links.length ? ' · ' : ''}research ${ref}` : '']);
}

/** Provenance block for a data item: badge + sources + optional real product example. */
export function provenance(item) {
  if (!item) return null;
  const re = item.realExample;
  return h('div', { class: 'provenance' }, [
    h('div', { class: 'prov-row' }, [dataBadge(item.dataKind, { full: true }), ' ', sourceLinks(item.sources, item.ref)]),
    re && h('div', { class: 'real-example' }, [dataBadge(re.dataKind, { full: true }), h('strong', {}, ' Real product example: '), re.text, ' ', sourceLinks(re.sources)]),
  ]);
}

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
  // Icon meter: the label lives in the tooltip / aria-label, the face is only symbols.
  return h('div', { class: 'meter', title: text ?? `${label}: ${level}/3`, 'aria-label': `${label}: ${level} of 3` }, [
    h('span', { class: 'meter-dots', 'aria-hidden': 'true' },
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
 * @param {string} [o.whatFor]     "What is it for?" line
 * @param {object} [o.data]        item with dataKind / sources / ref / realExample → badge + source link in Details
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
        h('div', { class: 'choice-title', title: o.realTerm ?? null }, o.title),
      ]),
      o.selected && h('span', { class: 'choice-check', 'aria-hidden': 'true' }, '✓'),
    ]),
    (o.badges?.length ?? 0) > 0 && h('div', { class: 'badges' }, o.badges.map((b) => {
      const { face, title } = badgeFace(b);
      return h('span', { class: `badge badge-${b.replace(/[^a-z-]/gi, '').toLowerCase()}`, title, 'aria-label': title }, face);
    })),
    (o.disabled && o.disabledReason ? o.disabledReason : o.oneLiner) && h('p', { class: 'choice-one' }, o.disabled && o.disabledReason ? o.disabledReason : o.oneLiner),
    meters.length > 0 && h('div', { class: 'meters' }, meters.map(meter)),
    o.extra,
    h('div', { class: 'choice-foot' }, [
      o.details?.length || o.data || o.realTerm || o.whatFor ? h('details', { class: 'choice-details' }, [
        h('summary', {}, ['Details ', o.data && dataBadge(o.data.dataKind)]),
        o.realTerm && h('p', { class: 'choice-real' }, ['Real term: ', o.glossary ? term(o.glossary, o.realTerm) : o.realTerm]),
        o.whatFor && h('p', { class: 'choice-whatfor' }, [h('strong', {}, 'What is it for? '), o.whatFor]),
        o.details?.length && h('dl', {}, o.details.map(([k, v]) => h('div', {}, [h('dt', {}, k), h('dd', {}, v)]))),
        o.data && provenance(o.data),
      ]) : h('span'),
      o.why && whyButton(o.whyTitle ?? o.title, o.why),
    ]),
    o.delta && !o.disabled && h('div', { class: 'delta' }, o.delta),
  ]);
  return card;
}
