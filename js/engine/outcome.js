// describeOutcome(state, sim) → { outcome, title, caption, tip, missed } — PURE.
// ONE plain caption explaining WHAT happened and WHY, built from engine numbers.
// Also: effectsSummary(effects) → short trade-off chips for event choices.

import { getSelection, computeResources } from './resources.js';
import { evaluateObjectives } from './objectives.js';
import { validateDesign } from './validation.js';
import { firstFailedGate, operatingConditions } from './simulation.js';
import { kg, pct, watts, months, money, num } from '../utils/format.js';

const TIPS = {
  budget: 'Cut cost: check the launch line.',
  deadline: 'Delays can miss the window.',
  lifetime: 'Don\'t ignore faults: a weak satellite can be lost.',
};

const NO_GO_NOTE = ' NO-GO: real missions never fly like this.';

export function describeOutcome(state, sim) {
  const sel = getSelection(state);
  const res = computeResources(state);
  const rocket = sel.launcher?.plainName ?? 'rocket';
  const orbit = sel.orbit?.plainName ?? 'its orbit';
  const base = { outcome: sim.outcome, missed: [] };
  const gate = sim.noGo ? firstFailedGate(validateDesign(state, res)) : null;
  const gateText = gate ? ` ${gate.issue.message}` : '';
  const note = sim.noGo ? NO_GO_NOTE : '';

  switch (sim.outcome) {
    case 'scrubbed':
      return { ...base, title: 'Launch scrubbed', caption: `${gateText.trim()}${note}`, tip: 'Finish the Launch prep checklist.' };
    case 'too_heavy':
      return { ...base, title: 'It does not fit', caption: res.mass.available != null && res.mass.used > res.mass.available
        ? `${kg(res.mass.used)} vs ${kg(res.mass.available)} limit: it can't fly safely.${note}`
        : `${gateText.trim()}${note}`,
      tip: 'Use the frame, parts and adapter made for this mission.' };
    case 'wrong_orbit':
      return { ...base, title: 'Wrong orbit', caption: `${gateText.trim()}${note}`, tip: 'Pick the right orbit and a rocket that reaches it.' };
    case 'lost': {
      const m = sim.summary.monthsOperated;
      if (sim.failureCause === 'power') {
        return { ...base, title: 'Out of power', caption: res.battery.status === 'over'
          ? `Dark in Earth's shadow: no battery power. Lost in month ${m}.${note}`
          : `Needs ${watts(res.power.used)}, array gave ${res.power.available == null ? '?' : `${num(res.power.available, 1)} W`}. Lost in month ${m}.${note}`,
        tip: 'Check sunlight AND shadow power.' };
      }
      if (sim.failureCause === 'comms') {
        return { ...base, title: 'Nobody hears it', caption: `${gateText.trim() || 'The link was broken.'} Lost in month ${m}.${note}`, tip: 'Radios + the right ground segment.' };
      }
      if (sim.noGo) {
        return { ...base, title: 'A bus system was missing', caption: `${gateText.trim()} Failed in month ${m}.${note}`, tip: 'Every satellite needs a full bus.' };
      }
      return { ...base, title: 'Lost after damage', caption: `Two risky choices broke it in month ${m} (simulated).`, tip: TIPS.lifetime };
    }
    case 'success':
      return { ...base, title: 'Mission accomplished!', caption: `${months(sim.summary.monthsOperated)}, every KPI met (simulated service ${pct(sim.summary.serviceFraction)}).`, tip: 'Try a harder mission.' };
    case 'partial': {
      const objectives = evaluateObjectives(state, sim, res);
      const missed = objectives.filter((o) => !o.met);
      return { ...base, missed, title: sim.noGo ? 'It flew — but could not do the job' : 'Partial success',
        caption: `${sim.noGo ? `${gateText.trim()} ` : ''}Missed: ${missed.slice(0, 2).map((o) => o.label.toLowerCase()).join(', ')}${missed.length > 2 ? ` +${missed.length - 2}` : ''}.${note}`,
        tip: sim.noGo ? 'Add the mission payload that physically does this job.' : TIPS[missed[0]?.id] ?? missed[0]?.why ?? 'Check the gauges before launch.' };
    }
    default:
      return { ...base, title: 'Mission in progress', caption: '', tip: '' };
  }
}

/** Trade-off chips for an event choice, shown before the player decides. */
export function effectsSummary(effects, reserveM = null) {
  const out = [];
  for (const [k, v] of Object.entries(effects)) {
    if (k === 'performance') out.push({ text: `${v >= 1 ? '+' : '−'}${pct(Math.abs(v - 1))} service`, good: v >= 1 });
    else if (k === 'reserveShare') out.push({ text: `−${pct(v)} of reserve${reserveM != null ? ` (${money(reserveM * v)})` : ''}`, good: false });
    else if (k === 'damage') out.push({ text: 'satellite weakened', good: false });
    else if (k === 'delayMonths') out.push({ text: `+${months(v)} delay`, good: false });
    else if (k === 'bonusService') out.push({ text: `+${pct(v)} service`, good: true });
    else if (k === 'debrisPenalty') out.push({ text: `−${v} debris score`, good: false });
  }
  return out;
}

/** Which visual problems the orbit view should show (pure helper for the UI). */
export function visualConditions(state) {
  const res = computeResources(state);
  const c = operatingConditions(res);
  const orbit = getSelection(state).orbit;
  return {
    ...c,
    powerProblem: c.powerDead || c.batteryDead,
    dataOverflow: (res.data.lostFraction ?? 0) > 0,
    eclipseFraction: orbit?.sunlitFraction != null ? 1 - orbit.sunlitFraction : 0,
    batteryRatio: res.battery.available ? (res.battery.used ?? 0) / res.battery.available : 0,
  };
}
