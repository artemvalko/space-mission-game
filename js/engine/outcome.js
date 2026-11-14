// describeOutcome(state, sim) → { outcome, title, caption, tip, missed } — PURE.
// ONE plain caption explaining WHAT happened and WHY, built from engine numbers.
// Also: effectsSummary(effects) → short trade-off chips for event choices.

import { getSelection, computeResources } from './resources.js';
import { evaluateObjectives } from './objectives.js';
import { operatingConditions } from './simulation.js';
import { kg, pct, watts, num, years, money, months } from '../utils/format.js';

const TIPS = {
  science: 'Add tools that suit your orbit, steadier pointing, or a faster radio so more data gets home.',
  lifetime: 'Stronger thrusters keep a satellite in orbit longer — and avoid ignoring hardware failures.',
  deadline: 'Pick parts that are quicker to build (basic parts beat advanced ones on time).',
  budget: 'Cheaper parts or a smaller rocket leave money for surprises.',
};

export function describeOutcome(state, sim) {
  const sel = getSelection(state);
  const res = computeResources(state);
  const rocket = sel.launcher?.plainName ?? 'rocket';
  const orbit = sel.orbit?.plainName ?? 'its orbit';
  const base = { outcome: sim.outcome, missed: [] };

  switch (sim.outcome) {
    case 'launch_failure':
      return { ...base, title: 'Launch failure', caption: `The ${rocket} failed. It succeeds ${pct(sel.launcher?.reliability ?? 0)} of launches — this time it didn't.`, tip: 'Even proven rockets fail sometimes. A more reliable rocket improves your odds.' };
    case 'too_heavy':
      return { ...base, title: 'Too heavy!', caption: res.mass.available == null
        ? `The ${rocket} can't reach ${orbit} at all. Your satellite fell back and burned up.`
        : `The rocket couldn't lift ${kg(res.mass.used)} — it was built for ${kg(res.mass.available)}. Your satellite fell back and burned up.`,
      tip: 'Pick a bigger rocket or lighter parts.' };
    case 'wrong_orbit': {
      const prop = sel.components.propulsion;
      return { ...base, title: 'Stuck too low', caption: `Your thrusters could only push ${num(prop?.deltaV ?? 0)} m/s, but ${orbit} needs ${num(sel.orbit?.requiredDeltaV ?? 0)} m/s. The satellite got stuck too low and fell back.`, tip: 'Pick stronger thrusters for far-away orbits.' };
    }
    case 'lost': {
      const m = sim.summary.monthsOperated;
      if (sim.failureCause === 'power') {
        return { ...base, title: 'Out of power', caption: `Your satellite needed ${watts(res.power.used)} but made only ${watts(res.power.available ?? 0)}. It ran out of power and went dark in month ${m}.`, tip: 'Use bigger solar wings, fewer power-hungry tools, or a nuclear battery far from the Sun.' };
      }
      if (sim.failureCause === 'comms') {
        const why = res.data.status === 'blocked' ? `${sel.ground?.plainName ?? 'your antennas'} can't hear that far` : 'its radio was far too weak for deep space';
        return { ...base, title: 'Signal lost', caption: `Earth couldn't hear your satellite: ${why}. Without a signal the mission was lost in month ${m}.`, tip: 'Far from Earth, use the big dish antenna and the giant deep-space dishes.' };
      }
      return { ...base, title: 'Too many breakdowns', caption: `Too many broken parts: toughness fell to ${pct(sim.summary.finalHealth)}. The satellite stopped responding in month ${m}.`, tip: 'Fix failures instead of ignoring them, and choose more reliable parts.' };
    }
    case 'success':
      return { ...base, title: 'Mission accomplished!', caption: `Your satellite worked for ${years(sim.summary.monthsOperated / 12)} and sent home ${num(sim.summary.scienceCollected)} science points. Every goal was met.`, tip: 'Try a harder mission, or beat your score with a cheaper design.' };
    case 'partial': {
      const objectives = evaluateObjectives(state, sim, res);
      const missed = objectives.filter((o) => !o.met);
      return { ...base, missed, title: 'Partial success', caption: `Your satellite worked, but missed: ${missed.map((o) => o.label.toLowerCase()).join(', ')}.`, tip: TIPS[missed[0]?.id] ?? 'Check the gauges before launch — every red one costs you later.' };
    }
    default:
      return { ...base, title: 'Mission in progress', caption: '', tip: '' };
  }
}

/** Trade-off chips for an event choice, shown before the player decides. */
export function effectsSummary(effects) {
  const out = [];
  for (const [k, v] of Object.entries(effects)) {
    if (k === 'science') out.push({ text: `${v >= 1 ? '+' : '−'}${pct(Math.abs(v - 1))} science`, good: v >= 1 });
    else if (k === 'budgetM') out.push({ text: `${v > 0 ? '+' : '−'}${money(Math.abs(v))} cost`, good: v <= 0 });
    else if (k === 'lifetimeYears') out.push({ text: `${v > 0 ? '+' : '−'}${years(Math.abs(v))} lifetime`, good: v > 0 });
    else if (k === 'health') out.push({ text: `${v > 0 ? '+' : '−'}${pct(Math.abs(v))} toughness`, good: v > 0 });
    else if (k === 'launchReliability') out.push({ text: `${v > 0 ? '+' : '−'}${pct(Math.abs(v))} launch success`, good: v > 0 });
    else if (k === 'delayMonths') out.push({ text: `+${months(v)} delay`, good: false });
  }
  return out;
}

/** Which visual problems the orbit view should show (pure helper for the UI). */
export function visualConditions(state) {
  const res = computeResources(state);
  const c = operatingConditions(res);
  return {
    ...c,
    powerProblem: res.power.status === 'over' || res.battery.status === 'over',
    dataOverflow: (res.data.lostFraction ?? 0) > 0,
    eclipseFraction: getSelection(state).orbit?.eclipseFraction ?? 0,
    batteryRatio: res.battery.available ? res.battery.used / res.battery.available : 0,
  };
}
