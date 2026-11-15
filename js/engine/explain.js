// Human-readable "why" texts for trade-offs. PURE: returns strings only.

import { CATEGORY_PLAIN } from '../data/components.js';
import { launcherReach } from './resources.js';
import { rulesForItem, itemName } from './dependencies.js';
import { rulesFor } from '../data/missionDependencies.js';
import { kg, watts, wh, money, num, signed, pct } from '../utils/format.js';

export const CATEGORY_WHY = Object.fromEntries(Object.entries(CATEGORY_PLAIN).map(([k, v]) => [k, `${v.plainName} (${v.realTerm}): ${v.whatFor}`]));

const statusText = (p, scenarioId) => (p.missions?.includes(scenarioId) ? (p.status === 'recommended' ? ' In the research build as recommended.' : ' In the research build for this mission.') : '');

export function whyComponent(c, scenarioId = null) {
  const parts = [`What is it for? ${c.why}`, c.about ?? c.oneLiner];
  if (c.arrayW) parts.push(`Up to ${watts(c.arrayW)}${c.arrayWMax ? `–${watts(c.arrayWMax)}` : ''} in full sunlight.`);
  if (c.capacityWh) parts.push(`${wh(c.capacityWh)} stored; 60% is used each cycle to keep it healthy.`);
  if (c.maxMassKg) parts.push(`Typical CubeSat limit: ${kg(c.maxMassKg)} (S01).`);
  if (c.rateMbps) parts.push(`Example rate ${num(c.rateMbps)} Mbps (research model).`);
  parts.push(statusText(c, scenarioId));
  return parts.filter(Boolean).join(' ');
}

const LEVEL_TAG = { fact: 'FACT', catalog: 'CATALOG', model: 'ESTIMATE', reported: 'REPORTED' };

/**
 * "Why?" micro-format (CLARITY P1.1): at most 5 short lines, only inside Why?/Details.
 *   What is it? · Why this mission/goal? (matrix) · What does it change? (engine delta) ·
 *   Better alternative (matrix, only if wrong) · Data source level.
 * @param item     part / payload / ground station
 * @param ctx      { scenarioId, variantId, change: string (formatDelta), unverified?: boolean }
 */
export function whyCard(item, { scenarioId = null, variantId = null, change = '', unverified = false } = {}) {
  const lines = [`What is it? ${item.about ?? item.oneLiner ?? item.why ?? ''}`.trim()];
  if (scenarioId) {
    const r = rulesForItem(scenarioId, variantId, item.id);
    const wrong = r.wrong[0];
    const lookAlike = r.notASubstitute[0];
    const fits = r.satisfies.find((x) => x.scope === 'goal') ?? r.satisfies.find((x) => x.status !== 'optional') ?? r.satisfies[0];
    const part = r.partly[0];
    const needs = r.needs.map((x) => x.whyRequired);
    if (wrong) lines.push(`Why not here? ${cap(wrong.whyNotById?.[item.id] ?? wrong.whyAlternatives)}`);
    else if (lookAlike && !fits) lines.push(`Why not here? ${lookAlike.whyAlternatives}`);
    else if (fits) lines.push(`Why this goal? ${fits.whyRequired}`);
    else if (part) lines.push(`Why this goal? Only partly: ${part.whyAlternatives || part.whyRequired}`);
    else if (item.why) lines.push(`Why this mission? ${item.why}`);
    if (change) lines.push(`What does it change? ${change}${needs.length ? `. ${needs[0]}` : '.'}`);
    else if (needs.length) lines.push(`What does it change? ${needs[0]}`);
    const better = wrong ? null : lookAlike && !fits ? lookAlike : part && !fits ? part : null;
    if (better?.satisfiedBy.length) lines.push(`Better alternative: ${better.satisfiedBy.slice(0, 2).map(itemName).join(' or ')}.`);
    else if (wrong) {
      const own = rulesFor(scenarioId, variantId).find((x) => x.scope === 'goal' && x.category === 'payload') ?? rulesFor(scenarioId, variantId).find((x) => x.scope === 'mission' && x.category === (getInstrumentCategory(item)));
      if (own?.satisfiedBy.length) lines.push(`Better alternative: ${own.satisfiedBy.slice(0, 2).map(itemName).join(' or ')}.`);
    }
  }
  lines.push(`Data: ${unverified ? 'UNVERIFIED (not public — never guessed)' : LEVEL_TAG[item.dataKind] ?? 'ESTIMATE'}${item.sources?.length ? ` (${item.sources.slice(0, 3).join(', ')})` : ''}.`);
  return lines.slice(0, 5);
}
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const getInstrumentCategory = (item) => (item.category === 'service_payload' ? 'payload' : item.category === 'timing' ? 'timing' : item.category === 'calibration' ? 'calibration' : item.serves ? 'ground' : item.category);

export function whyInstrument(ins, scenario) {
  const own = scenario && ins.missions.includes(scenario.id);
  return `What is it for? ${ins.why} ${ins.about ?? ins.oneLiner}${own ? ' Required by this mission.' : ''}`;
}

export function whyOrbit(o, scenario) {
  const parts = [o.description, `Altitude ${o.altitudeText}; inclination ${o.inclinationText}.`];
  if (o.sunlitFraction != null) parts.push(`In sunlight ${pct(o.sunlitFraction)} of the time; ${num(o.eclipseMinutes)}-minute shadow (the research's 6U power model).`);
  else parts.push('The research gives no single shadow length here — it changes with the season.');
  if (scenario?.orbitWhy[o.id]) parts.push(scenario.orbitWhy[o.id]);
  return parts.join(' ');
}

export const GROUND_WHY = 'Antennas and centres on Earth receive the mission data and control the satellite. Each mission needs its own kind: IoT gateways, a GNSS monitoring + time network, or a science receiving and processing chain.';

export function whyGround(g) {
  return `${g.description} Model cost in the research budget: ${money(g.cost)}.`;
}

export function whyLauncher(l, orbit) {
  let text = `${l.description} ${l.headline}`;
  if (orbit) {
    const { reaches, capacity } = launcherReach(l, orbit);
    text += !reaches ? ` It does not deliver to ${orbit.plainName}.` : capacity != null ? ` Headline capacity to this orbit: ${kg(capacity)}.` : ' It reaches this orbit; no single published capacity number for it.';
  }
  return `${text} No launch-success percentage is shown (§8.6).`;
}

/**
 * Compare two computeResources() results and describe what changes,
 * e.g. "+1.2 kg, +$0.35M". Used for hover previews on cards.
 */
export function formatDelta(before, after) {
  const parts = [];
  const add = (d, fmt, suffix = '', eps = 0.005) => {
    if (d != null && Number.isFinite(d) && Math.abs(d) > eps) parts.push(signed(d, fmt) + suffix);
  };
  add((after.mass.used ?? 0) - (before.mass.used ?? 0), (n) => `${num(n, 2)} kg`);
  if (before.power.available != null || after.power.available != null) {
    add((after.power.available ?? 0) - (before.power.available ?? 0), (n) => `${num(n, 1)} W`, ' avg power');
  }
  add((after.budget.used ?? 0) - (before.budget.used ?? 0), (n) => `$${num(n, 2)}M`);
  return parts.length ? parts.join(', ') : 'no change';
}
