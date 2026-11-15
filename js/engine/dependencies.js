// evaluateDependencies(sel) — reads the mission dependency matrix (data/missionDependencies.js). PURE.
// Single source of truth for the payload / timing / calibration / ground checks and the objective verdict.
//
// Per rule result: 'ok' | 'partly' | 'missing' | 'wrong' | 'todo' | 'n/a'
//   ok      = satisfied by a chosen item          partly = satisfied only by a `partialBy` item
//   missing = not satisfied (reason: whyAlternatives if a look-alike substitute is chosen, else whyRequired)
//   wrong   = an `incompatible` rule hit a chosen item     todo = nothing chosen in that category yet
// Goal verdict: 'met' | 'partly' | 'not_met' | 'todo' (only `scope: 'goal'` rules count; `optional` never does).

import { rulesFor, HONEST_LIMITS } from '../data/missionDependencies.js';
import { getComponent } from '../data/components.js';
import { getInstrument } from '../data/instruments.js';
import { getOrbit } from '../data/orbits.js';
import { getGroundStation } from '../data/groundStations.js';

/** Plain name of any item id (part, payload, orbit, ground). */
export const itemName = (id) => (getInstrument(id) ?? getComponent(id) ?? getOrbit(id) ?? getGroundStation(id))?.plainName ?? id;

/** Every id the design has chosen, incl. what a reference build carries inside (its sensor / clocks). */
export function chosenIds(sel) {
  const ids = new Set();
  for (const c of Object.values(sel.components ?? {})) if (c) ids.add(c.id);
  for (const i of sel.instruments ?? []) ids.add(i.id);
  for (const x of [sel.orbit, sel.launcher, sel.deployer, sel.ground]) if (x) ids.add(x.id);
  if (sel.reference?.sensor) ids.add(sel.reference.sensor);
  if (sel.reference?.clocks) ids.add(sel.reference.clocks);
  return ids;
}

/** Has the player chosen anything yet in the rule's category? (no → 'todo', never an error) */
function categoryChosen(rule, sel) {
  switch (rule.category) {
    case 'payload': case 'timing': case 'calibration': case 'platform': return sel.instruments.length > 0 || !!sel.reference;
    case 'orbit': return !!sel.orbit;
    case 'ground': return !!sel.ground;
    case 'downlink': return !!sel.reference || !!sel.components.downlink || !!sel.components.comms || sel.left?.has('downlink');
    case 'power': return !!sel.components.power;
    default: return true;
  }
}

function judge(rule, sel, ids) {
  const has = (list) => list.filter((id) => ids.has(id));
  if (rule.status === 'incompatible') {
    const hit = has(rule.incompatibleWithAsSubstitute);
    return hit.length
      ? { result: 'wrong', items: hit, reason: rule.whyNotById?.[hit[0]] ?? rule.whyAlternatives }
      : { result: 'n/a', items: [], reason: '' };
  }
  if (rule.status === 'conditional' && !has(rule.dependsOn).length) return { result: 'n/a', items: [], reason: '' };
  const ok = has(rule.satisfiedBy);
  if (ok.length) return { result: 'ok', items: ok, reason: rule.whyRequired };
  const part = has(rule.partialBy);
  if (part.length) return { result: 'partly', items: part, reason: rule.whyAlternatives || rule.whyRequired };
  if (!categoryChosen(rule, sel)) return { result: 'todo', items: [], reason: rule.whyRequired };
  const sub = has(rule.incompatibleWithAsSubstitute);
  return { result: 'missing', items: sub, substitute: sub[0] ?? null, reason: sub.length ? (rule.whyNotById?.[sub[0]] ?? rule.whyAlternatives) : rule.whyRequired };
}

/**
 * @returns {{ rules: object[], mission: object[], goal: object[], verdict: 'met'|'partly'|'not_met'|'todo',
 *            reasons: string[], limits: {id,text}[] }}
 */
export function evaluateDependencies(sel) {
  const scenario = sel.scenario;
  if (!scenario) return { rules: [], mission: [], goal: [], verdict: 'todo', reasons: [], limits: [] };
  const ids = chosenIds(sel);
  const variantId = sel.variant?.id ?? null;
  const rules = rulesFor(scenario.id, variantId).map((rule) => ({ ...rule, ...judge(rule, sel, ids) }));
  const goal = rules.filter((r) => r.scope === 'goal' && r.status !== 'optional');
  const bad = goal.filter((r) => r.result === 'missing' || r.result === 'wrong');
  const verdict = bad.length ? 'not_met' : goal.some((r) => r.result === 'todo') ? 'todo' : goal.some((r) => r.result === 'partly') ? 'partly' : 'met';
  const reasons = [...bad, ...goal.filter((r) => r.result === 'partly')].map((r) => r.reason);
  const limits = (HONEST_LIMITS[scenario.id] ?? []).filter((l) => !l.variants || l.variants.includes(variantId));
  return { rules, mission: rules.filter((r) => r.scope === 'mission'), goal, verdict, reasons, limits };
}

/** Mission-level payload/timing/calibration rules as roles: { needed, missing } (back-compat with payloadNeeds). */
export function missionPayloadNeeds(sel) {
  const ev = evaluateDependencies(sel);
  const pay = ev.mission.filter((r) => ['payload', 'timing', 'calibration'].includes(r.category) && r.status !== 'incompatible' && r.result !== 'n/a');
  return { needed: pay.map((r) => r.capability), missing: pay.filter((r) => r.result !== 'ok').map((r) => r.capability) };
}

/** Is the chosen ground network right for the mission? true | false | null (none chosen). */
export function groundRuleOk(sel) {
  if (!sel.ground || !sel.scenario) return null;
  const r = evaluateDependencies(sel).mission.find((x) => x.capability === 'ground_network');
  return r ? r.result === 'ok' : null;
}

/** Why an item does not fit this mission ('' = it does) — from the matrix (payload and ground cards). */
export function matrixWhyNot(scenarioId, variantId, itemId) {
  for (const r of rulesFor(scenarioId, variantId)) {
    if (r.scope !== 'mission') continue;
    if (r.capability === 'ground_network' || r.capability === 'other_mission_payload') {
      if (r.incompatibleWithAsSubstitute.includes(itemId)) return r.whyNotById?.[itemId] ?? r.whyAlternatives;
    }
  }
  return '';
}

/** Rules an item takes part in (for Why? / "Change:" lines): what it satisfies, what it switches on, where it is only a look-alike. */
export function rulesForItem(scenarioId, variantId, itemId) {
  const rules = rulesFor(scenarioId, variantId);
  return {
    satisfies: rules.filter((r) => r.satisfiedBy.includes(itemId)),
    partly: rules.filter((r) => r.partialBy.includes(itemId)),
    needs: rules.filter((r) => r.status === 'conditional' && r.dependsOn.includes(itemId)),
    notASubstitute: rules.filter((r) => r.status !== 'incompatible' && r.incompatibleWithAsSubstitute.includes(itemId)),
    wrong: rules.filter((r) => r.status === 'incompatible' && r.incompatibleWithAsSubstitute.includes(itemId)),
  };
}

/** One short dependency line for an item (≤ 12 words), e.g. "RainCube radar → needs deployable wings + science downlink". */
export function dependencyLine(scenarioId, variantId, itemId) {
  const r = rulesForItem(scenarioId, variantId, itemId);
  const needs = r.needs.map((x) => CAP_SHORT[x.capability] ?? x.capability.replace(/_/g, ' '));
  if (r.notASubstitute.some((x) => x.scope === 'goal')) return `${itemName(itemId)}: wrong for this goal`;
  if (r.wrong.length) return `${itemName(itemId)}: not for this mission`;
  const ins = getInstrument(itemId);
  if (ins && ['service_payload', 'timing'].includes(ins.category)) {
    // Every payload needs the mission's data path home.
    const path = rulesFor(scenarioId, variantId).find((x) => x.scope === 'mission' && x.category === 'downlink');
    if (path) needs.push(CAP_SHORT[path.capability]);
  }
  return needs.length ? `${itemName(itemId)} → needs ${needs.join(' + ')}` : '';
}

const CAP_SHORT = {
  calibration: 'calibration', radar_power: 'deployable wings', science_downlink: 'science downlink', packet_downlink: 'packet downlink',
  control_uplink: 'C-band uplink', ground_network: 'ground network',
};
