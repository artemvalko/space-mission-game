// describeOutcome(state, sim) → { outcome, title, caption, tip, missed } — PURE.
// ONE plain caption explaining WHAT happened and WHY, built from engine numbers.
// Also: effectsSummary(effects) → short trade-off chips for event choices.

import { getSelection, computeResources } from './resources.js';
import { evaluateObjectives } from './objectives.js';
import { validateDesign } from './validation.js';
import { firstFailedGate, operatingConditions } from './simulation.js';
import { kg, pct, watts, months, money, num } from '../utils/format.js';

const TIPS = {
  budget: 'Stay inside the model budget: check the launch line and any parts you do not need.',
  deadline: 'A launch delay can push you past the planning window.',
  lifetime: 'Do not ignore faults — a weakened satellite can be lost before the service period ends.',
};

const NO_GO_NOTE = ' Real missions never launch with a NO-GO — this was only a simulation of what physics would do.';

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
      return { ...base, title: 'Launch scrubbed — NO-GO', caption: `The launch could not go ahead:${gateText}${note}`, tip: 'Finish the Launch prep checklist: tests, frequency licence and a disposal plan.' };
    case 'too_heavy':
      return { ...base, title: 'It does not fit', caption: res.mass.available != null && res.mass.used > res.mass.available
        ? `${kg(res.mass.used)} checked against a ${kg(res.mass.available)} limit — the ${rocket} and its dispenser cannot carry it safely.${note}`
        : `The satellite does not fit its frame, dispenser or adapter.${gateText}${note}`,
      tip: 'Use the frame size, parts and adapter made for this mission.' };
    case 'wrong_orbit':
      return { ...base, title: 'Wrong orbit', caption: `The ${rocket} cannot put the satellite where the mission needs it (${orbit}).${gateText}${note}`, tip: 'Pick the orbit the service needs, and a launch service that really reaches it.' };
    case 'lost': {
      const m = sim.summary.monthsOperated;
      if (sim.failureCause === 'power') {
        return { ...base, title: 'Out of power', caption: res.battery.status === 'over'
          ? `In sunlight there was enough power, but in Earth's shadow the battery could not keep it alive. It went dark in month ${m}.${note}`
          : `The mission needs ${watts(res.power.used)} on average but the array gave only ${res.power.available == null ? 'an unknown amount' : `${num(res.power.available, 2)} W`}. It went dark in month ${m}.${note}`,
        tip: 'Check average AND shadow power: array × sunlight × 0.8 must beat the load, and 60% of the battery must cover the shadow.' };
      }
      if (sim.failureCause === 'comms') {
        return { ...base, title: 'Nobody hears it', caption: `The signal never made it into a working ground chain:${gateText || ' the link was broken.'} The mission was lost in month ${m}.${note}`, tip: 'Control radio + mission downlink + the ground segment made for this mission.' };
      }
      if (sim.noGo) {
        return { ...base, title: 'A bus system was missing', caption: `${gateText.trim()} The satellite failed in month ${m}.${note}`, tip: 'Every satellite needs control radio, power, battery, computer, pointing and thermal control.' };
      }
      return { ...base, title: 'Lost after damage', caption: `Two risky choices weakened the satellite until it stopped responding in month ${m}. (Simulated events.)`, tip: TIPS.lifetime };
    }
    case 'success':
      return { ...base, title: 'Mission accomplished!', caption: `Your satellite worked for ${months(sim.summary.monthsOperated)} and met every mission KPI (simulated service ${pct(sim.summary.serviceFraction)}).`, tip: 'Try a harder mission, or keep more reserve with a leaner design.' };
    case 'partial': {
      const objectives = evaluateObjectives(state, sim, res);
      const missed = objectives.filter((o) => !o.met);
      return { ...base, missed, title: sim.noGo ? 'It flew — but could not do the job' : 'Partial success',
        caption: `${sim.noGo ? `${gateText.trim()} ` : ''}Missed: ${missed.map((o) => o.label.toLowerCase()).join(', ')}.${note}`,
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
