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
import { COST_TYPE } from '../data/launchers.js';
import { icon } from './icons.js';

/** Data-honesty tags: tiny mono uppercase labels with a hairline border (no emoji). */
export const KIND_TAG = { fact: 'FACT', catalog: 'CATALOG', model: 'ESTIMATE', reported: 'REPORTED', rfq: 'PRICE ?' };

/**
 * Data-honesty badge: FACT · CATALOG · ESTIMATE · REPORTED (or PRICE ? for RFQ).
 * The tag is the face; the explanation lives in the tooltip. `full: true` also prints the long label.
 */
export function dataBadge(kind, { full = false } = {}) {
  const k = kind === 'rfq'
    ? { label: 'Price on request (RFQ)', cls: 'rfq', text: 'No public price — a real mission asks the operator for a quote.' }
    : DATA_KIND[kind];
  if (!k) return null;
  const tag = KIND_TAG[kind] ?? k.label.toUpperCase();
  return h('span', { class: `data-badge data-${k.cls}`, title: `${k.label}: ${k.text}`, 'aria-label': k.label }, full && k.label.toUpperCase() !== tag ? [tag, h('span', { class: 'data-badge-long' }, ` ${k.label}`)] : tag);
}

// Card badges: a small icon or tag on the card face; the words live in the tooltip.
const BADGE_ICON = {
  'Research build': 'star', 'Needed for your goal': 'star', 'Recommended': 'star', 'Fine for this mission': 'check',
  'Also works': 'check', 'Other mission': 'cross', 'Wrong for this mission': 'cross', "Can't reach": 'cross', 'Too small': 'cross', 'Info only': 'info',
  Timing: 'clock', Calibration: 'sliders', Overkill: 'warning',
};
// Unknown price / mass: a hairline mono tag "[$ icon] ?" (the words are in the tooltip — keeps the word budget).
const TAG_FACE = {
  'PRICE ?': ['money', '?', 'Price not public — never guessed (budget becomes uncertain)'],
  'MASS ?': ['weight', '?', 'Mass not public — the mass gate cannot verify it'],
  'MASS ≈': ['weight', '≈', 'Mass estimated from the research model of the same class'],
};
function badgeFace(b) {
  if (TAG_FACE[b]) { const [name, mark, title] = TAG_FACE[b]; return { face: [icon(name, 12), mark], title, tag: true }; }
  if (b.startsWith('FLEW ')) return { face: icon('satellite', 16), title: `Flew on / used by ${b.slice(5)} (real mission)` };
  if (BADGE_ICON[b]) return { face: icon(BADGE_ICON[b], 14), title: b };
  const cost = Object.values(COST_TYPE).find((c) => c.label === b);
  if (cost) return { face: COST_TAG[b], title: `${cost.label}: ${cost.text}`, tag: true };
  return { face: b, title: b };
}
const COST_TAG = { 'Published price': 'CATALOG', Estimate: 'ESTIMATE', 'Reported price': 'REPORTED', 'Price on request (RFQ)': 'PRICE ?' };

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
 * Equal values → 2. Use for the 3-segment meters.
 */
export function levels(values, { log = true } = {}) {
  const f = (v) => (log ? Math.log10(Math.max(v, 0) + 1) : v);
  const xs = values.map(f);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  return xs.map((x) => (max - min < 1e-9 ? 2 : 1 + Math.round((2 * (x - min)) / (max - min))));
}

/** One meter: a tiny icon label + 3 thin segments (the words live in the tooltip / aria-label). */
export function meter({ label, icon: name, level, text }) {
  return h('div', { class: 'meter', title: text ?? `${label}: ${level}/3`, role: 'img', 'aria-label': `${label}: ${level} of 3` }, [
    name ? icon(name, 13) : h('span', { class: 'meter-label' }, label),
    h('span', { class: 'meter-seg', 'aria-hidden': 'true' }, [1, 2, 3].map((n) => h('span', { class: n <= level ? 'on' : 'off' }))),
  ]);
}

/**
 * @param {object} o
 * @param {string} o.key           unique key (focus restore + tests)
 * @param {string} o.icon          icon id (js/ui/icons.js)
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
/** Face markers for a data item: unknown price/mass ("?" — never 0) and a real-mission chip. */
export function dataMarks(d) {
  if (!d) return [];
  const out = [];
  if (('cost' in d && d.cost === null) || ('priceM' in d && d.priceM === null)) out.push('PRICE ?');
  if ('mass' in d && d.mass === null && !d.reference && d.formFactor !== 'any' && !d.leoOnly && !d.cancelled) out.push(d.massClassOf ? 'MASS ≈' : 'MASS ?');
  if (d.heritage) out.push(`FLEW ${d.heritage}`);
  return out;
}

export function choiceCard(o) {
  const meters = (o.meters ?? []).slice(0, 3); // rule: never more than 3 stats by default
  o = { ...o, badges: [...(o.badges ?? []), ...dataMarks(o.data)] };
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
      o.icon && h('span', { class: 'choice-icon', 'aria-hidden': 'true' }, typeof o.icon === 'string' ? icon(o.icon, 20) : o.icon),
      h('div', { class: 'choice-titles' }, [
        h('div', { class: 'choice-title', title: o.realTerm ?? null }, o.title),
      ]),
      o.selected && h('span', { class: 'choice-check', 'aria-hidden': 'true' }, icon('check', 14)),
    ]),
    (o.badges?.length ?? 0) > 0 && h('div', { class: 'badges' }, o.badges.map((b) => {
      const { face, title, tag } = badgeFace(b);
      return h('span', { class: ['badge', tag && 'badge-tag', `badge-${b.replace(/[^a-z-]/gi, '').toLowerCase()}`], title, 'aria-label': title }, face);
    })),
    (o.disabled && o.disabledReason ? o.disabledReason : o.oneLiner) && h('p', { class: 'choice-one' }, o.disabled && o.disabledReason ? o.disabledReason : o.oneLiner),
    meters.length > 0 && h('div', { class: 'meters' }, meters.map(meter)),
    o.extra,
    h('div', { class: 'choice-foot' }, [
      o.details?.length || o.data || o.realTerm || o.whatFor ? h('details', { class: 'choice-details' }, [
        h('summary', {}, 'Details'),
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
