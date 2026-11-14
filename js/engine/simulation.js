// runSimulation(state, seed, decisions, opts) → simulation result — PURE & seeded.
//
// The run is replayed from scratch every time: same state + seed + decisions = same result.
// When an event happens and there is no decision for it yet, the run STOPS and returns
// `pending` (the event waiting for the player). The reducer appends the player's choice to
// `decisions` and replays. This keeps all randomness reproducible and the state serializable.
//
// Explicit results for the UI (which animation to play) and scoring:
//   outcome:      'pending' | 'launch_failure' | 'too_heavy' | 'wrong_orbit' | 'lost' | 'partial' | 'success'
//   failureCause: null | 'launch' | 'mass' | 'thrusters' | 'power' | 'comms' | 'hardware'
//
// - Launch success uses only the launcher's reliability (+ pre-launch decisions).
// - Too heavy / thrusters too weak: the rocket flies, but the satellite never reaches its orbit.
// - Design flaws shape operations: a big power deficit or a radio Earth can't hear ends the
//   mission early; smaller deficits cost science (safe mode) and add hardware failures.
// - Spacecraft health sets the yearly chance of hardware-failure events; if repeated damage
//   pushes health below LOST_HEALTH the spacecraft is lost.
//
// opts.autoChoice: resolve every event with this choice index, or (event) => index (tests / previews).

import { EVENTS } from '../data/events.js';
import { mulberry32 } from '../utils/random.js';
import { computeResources, getSelection, FAILURE_RATE_FACTOR } from './resources.js';
import { evaluateObjectives } from './objectives.js';
import { relaunchCostM } from './costs.js';

const MAX_MONTHS = 120;
export const LOST_HEALTH = 0.85;          // below this average reliability the spacecraft dies
export const DEAD_POWER_RATIO = 2 / 3;    // generation below 2/3 of consumption = cannot survive

const applies = (event, orbitId) => event.appliesTo === 'all' || event.appliesTo.includes(orbitId);

/** Pick a part to fail, weighted by how unreliable it is. */
function pickFailingItem(rng, items) {
  const weights = items.map((it) => 1 - it.reliability + 0.005);
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Design-level operating conditions (pure, from resources). Exported for the UI animations. */
export function operatingConditions(res) {
  const { power, battery, data } = res;
  const powerRatio = power.available ? power.available / Math.max(power.used, 1e-9) : 0;
  const powerDead = power.used > 0 && (power.available == null || powerRatio < DEAD_POWER_RATIO);
  const powerFactor = power.used > 0 && power.available != null ? Math.min(1, powerRatio) : 1;
  const batteryFactor = battery.status === 'over' && battery.used > 0 ? Math.max(0, battery.available / battery.used) : 1;
  // Dead link = Earth can't hear the spacecraft at all. A slow link only loses data (science).
  const commsDead = data.status === 'blocked' || !!data.deepSpaceProblem;
  return {
    powerRatio, powerDead, powerFactor, batteryFactor, commsDead,
    dataLostFraction: data.lostFraction ?? 0,
    // Fraction of time the spacecraft spends in "safe mode" (instruments off).
    safeModeFraction: 1 - powerFactor * (1 - (1 - batteryFactor) * 0.5),
  };
}

export function runSimulation(state, seed, decisions = [], opts = {}) {
  const rng = mulberry32(seed);
  const res = computeResources(state);
  const sel = getSelection(state);
  const orbitId = sel.orbit?.id ?? null;
  const items = [...sel.componentList, ...sel.instruments];
  const cond = operatingConditions(res);
  const relaunches = state.relaunches ?? 0;

  const mods = { science: 1, budgetM: relaunches * relaunchCostM(state, res), lifetimeYears: 0, health: 0, launchReliability: 0, delayMonths: 0 };
  const events = [];
  const ticks = [];
  let pending = null;
  let launched = null;      // did the rocket lift off and work?
  let reachedOrbit = false; // did the satellite get to its working orbit?
  let outcome = 'pending';
  let failureCause = null;
  let science = 0;
  let month = 0;
  let plannedMonths = 0;

  /** Resolve an event with the recorded/auto decision. Returns false if we must wait for the player. */
  function decide(event, eventMonth, extra = {}) {
    const index = events.length;
    const auto = typeof opts.autoChoice === 'function' ? opts.autoChoice(event) : opts.autoChoice;
    const choiceIndex = index < decisions.length ? decisions[index] : auto;
    if (choiceIndex == null || !event.choices[choiceIndex]) {
      pending = { index, eventId: event.id, month: eventMonth, ...extra };
      return false;
    }
    for (const [k, v] of Object.entries(event.choices[choiceIndex].effects)) {
      if (k === 'science') mods.science *= v;
      else mods[k] += v;
    }
    events.push({ index, month: eventMonth, eventId: event.id, choiceIndex, ...extra });
    return true;
  }

  const result = () => {
    const sim = {
      seed,
      decisions: decisions.slice(0, events.length),
      complete: pending == null,
      pending,
      launched,
      reachedOrbit,
      outcome: pending ? 'pending' : outcome,
      failureCause,
      relaunches,
      ticks,
      events,
      conditions: cond,
      summary: {
        monthsOperated: month,
        plannedMonths,
        scienceCollected: science,
        hardwareFailures: events.filter((e) => e.eventId === 'hardware_failure').length,
        eventsSurvived: events.filter((e) => e.month > 0).length,
        extraCostM: mods.budgetM,
        relaunches,
        delayMonths: mods.delayMonths,
        scienceMultiplier: mods.science,
        healthChange: mods.health,
        finalHealth: Math.max(0, res.health.value + mods.health),
        failuresPerYearAtStart: res.health.failuresPerYear,
        massKg: res.mass.used,
        capacityKg: res.mass.available,
      },
    };
    if (sim.complete && (outcome === 'completed')) {
      const objectives = evaluateObjectives(state, sim, res);
      sim.outcome = objectives.every((o) => o.met) ? 'success' : 'partial';
      sim.missed = objectives.filter((o) => !o.met).map((o) => o.id);
    }
    return sim;
  };

  // ── Pre-launch
  for (const ev of EVENTS.filter((e) => e.phase === 'prelaunch' && applies(e, orbitId))) {
    if (rng() < ev.probability && !decide(ev, 0)) return result();
  }

  // ── Launch: only the rocket's reliability counts for lift-off
  const launchChance = Math.max(0, (sel.launcher?.reliability ?? 0) + mods.launchReliability);
  launched = rng() < launchChance;
  ticks.push({ month: 0, science: 0 });
  if (!launched) { outcome = 'launch_failure'; failureCause = 'launch'; return result(); }
  if (res.mass.status === 'over' || res.mass.status === 'blocked') { outcome = 'too_heavy'; failureCause = 'mass'; return result(); }
  const prop = sel.components.propulsion;
  if (sel.orbit && (!prop || prop.deltaV < sel.orbit.requiredDeltaV)) { outcome = 'wrong_orbit'; failureCause = 'thrusters'; return result(); }
  reachedOrbit = true;

  // ── Operations
  const monthlyScience = (res.science.value / 12) * (1 - cond.safeModeFraction);
  const orbitEvents = EVENTS.filter((e) => e.phase === 'orbit' && applies(e, orbitId));
  const stress = res.health.stress;
  while (month < MAX_MONTHS) {
    plannedMonths = Math.min(MAX_MONTHS, Math.round((res.lifetime.value + mods.lifetimeYears) * 12));
    if (month >= plannedMonths) break;
    month += 1;
    // Fatal design flaws show up in the first month of operations.
    if (cond.powerDead) { outcome = 'lost'; failureCause = 'power'; ticks.push({ month, science }); return result(); }
    if (cond.commsDead) { outcome = 'lost'; failureCause = 'comms'; ticks.push({ month, science }); return result(); }
    for (const ev of orbitEvents) {
      const perYear = ev.probabilityFrom === 'health'
        ? Math.max(0, 1 - (res.health.value + mods.health)) * FAILURE_RATE_FACTOR + stress
        : ev.probability;
      if (rng() < perYear / 12) {
        const extra = ev.probabilityFrom === 'health' && items.length ? { itemId: pickFailingItem(rng, items).id } : {};
        if (!decide(ev, month, extra)) { month -= 1; return result(); }
      }
    }
    if (res.health.value + mods.health < LOST_HEALTH) { outcome = 'lost'; failureCause = 'hardware'; ticks.push({ month, science }); return result(); }
    science += monthlyScience * mods.science;
    ticks.push({ month, science });
  }
  plannedMonths = Math.min(MAX_MONTHS, Math.round((res.lifetime.value + mods.lifetimeYears) * 12));
  outcome = 'completed';
  return result();
}
