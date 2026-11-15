// runSimulation(state, seed, decisions, opts) → simulation result — PURE & seeded.
//
// The run is replayed from scratch every time: same state + seed + decisions = same result.
// When an event happens and there is no decision for it yet, the run STOPS and returns
// `pending` (the event waiting for the player). The reducer appends the player's choice to
// `decisions` and replays. This keeps all randomness reproducible and the state serializable.
//
// There is NO random launch-failure roll (research §8.6): a launch fails only because of the design.
// A physically invalid design is NO-GO; opts.anyway = "Simulate what would happen" plays out the
// first failed hard gate and records a failed mission (sim.noGo = true).
//
//   outcome:      'pending' | 'scrubbed' | 'too_heavy' | 'wrong_orbit' | 'lost' | 'partial' | 'success'
//   failureCause: null | 'prep' | 'mass' | 'orbit' | 'power' | 'comms' | 'thermal' | 'hardware' | 'payload'
//
// Events are SIMULATED (game rates, never real statistics). Their effects change the mission's service
// availability (`performance`), spend project reserve, or weaken the satellite (`damage`; 2 = lost).
//
// opts.autoChoice: resolve every event with this choice index, or (event) => index (tests / previews).

import { EVENTS, eventApplies } from '../data/events.js';
import { mulberry32 } from '../utils/random.js';
import { computeResources, getSelection } from './resources.js';
import { validateDesign } from './validation.js';
import { evaluateObjectives } from './objectives.js';

export const LOST_DAMAGE = 2; // a second weakening ends the mission

/** Design-level operating conditions (pure, from resources). Exported for the UI animations. */
export function operatingConditions(res) {
  const { power, battery, data } = res;
  const powerDead = power.available == null || power.used > power.available + 1e-9 || power.peakOk === false;
  const batteryDead = battery.status === 'over';
  const commsDead = data.status === 'blocked' || data.status === 'over';
  return {
    powerDead, batteryDead, commsDead,
    powerFactor: powerDead ? 0 : 1,
    batteryFactor: batteryDead ? 0 : 1,
    dataLostFraction: data.lostFraction ?? 0,
    safeModeFraction: powerDead || batteryDead ? 1 : 0,
  };
}

// Which failure a NO-GO design shows when it is simulated anyway (first matching gate wins).
const NO_GO_PLAY = [
  ['spacecraft_size_mass_volume_compatible', 'too_heavy', 'mass'],
  ['launch_adapter_compatible', 'too_heavy', 'mass'],
  ['launcher_trajectory_compatible', 'wrong_orbit', 'orbit'],
  ['orbit_service_compatible', 'wrong_orbit', 'orbit'],
  ['power_peak_and_average_pass', 'lost', 'power'],
  ['battery_eclipse_pass', 'lost', 'power'],
  ['ground_network_compatible', 'lost', 'comms'],
  ['communications_link_pass', 'lost', 'comms'],
  ['bus_support_complete', 'lost', 'hardware'],
  ['mandatory_payload_complete', 'partial', 'payload'],
  ['legal_safety_disposal_plan_pass', 'scrubbed', 'prep'],
];

// ── Events that react to the design (DISPOSAL.md phase 4). Multipliers / extra choices only.
const HIGH = ['meo_gnss', 'meo_gps_20200', 'geo'];
/** Design features the events care about. */
export function eventContext(sel, res) {
  const c = sel.components;
  const b = res.battery;
  return {
    thrusters: (!!c.propulsion && !!c.propellant) || sel.included.has('propulsion'),
    spareComputer: c.computer?.id === 'obc_si_quad',
    radHard: c.computer?.id === 'obc_rad_hard',
    lowBattery: b.usable != null && b.needWh ? b.usable / b.needWh - 1 < 0.2 : false,
    highOrbit: !!sel.orbit && HIGH.includes(sel.orbit.id),
  };
}
/** The choices this design allows for an event (with design-specific explanations). */
export function eventChoices(ev, ctx) {
  return ev.choices.filter((ch) => !ch.requires || ctx[ch.requires]).map((ch) => {
    let explanation = ch.explanation;
    if (ch.unsafeIfLowBattery && ctx.lowBattery) explanation += ' ⚠️ Your battery margin is under 20%: in a storm the battery cannot cover the extra load — safe mode is the only safe answer.';
    else if (ch.damageHalvedBy && ctx[ch.damageHalvedBy]) explanation += ' Your radiation-hard computer halves the chance of damage (simulated).';
    return { ...ch, explanation };
  });
}
/** Event description for this design (qualitative orbit notes, no numbers). */
export const eventDescription = (ev, ctx) => ev.description + (ev.highOrbitNote && ctx.highOrbit ? ev.highOrbitNote : '');

/** The first failed hard gate of a design (or null). */
export function firstFailedGate(issues) {
  for (const [gate, outcome, cause] of NO_GO_PLAY) {
    const hit = issues.find((i) => i.gate === gate && (i.severity === 'error' || (gate === 'legal_safety_disposal_plan_pass' && i.severity === 'todo')));
    if (hit) return { gate, outcome, cause, issue: hit };
  }
  return null;
}

export function runSimulation(state, seed, decisions = [], opts = {}) {
  const rng = mulberry32(seed);
  const res = computeResources(state);
  const sel = getSelection(state);
  const { scenario } = sel;
  const scenarioId = scenario?.id ?? null;
  const items = [...sel.componentList, ...sel.instruments];
  const cond = operatingConditions(res);
  const issues = validateDesign(state, res);
  const failed = firstFailedGate(issues);
  const noGo = !!opts.anyway && !!failed;
  const plannedMonths = scenario?.simMonths ?? 12;
  const reserveM = scenario?.costModel.reserve ?? 0;

  const mods = { performance: 1, reserveShare: 0, damage: 0, delayMonths: 0 };
  const events = [];
  const ticks = [];
  let pending = null;
  let launched = null;
  let reachedOrbit = false;
  let outcome = 'pending';
  let failureCause = null;
  let service = 0; // Σ monthly service availability (0..1 per month)
  let month = 0;

  /** Resolve an event with the recorded/auto decision. Returns false if we must wait for the player. */
  const ctx = eventContext(sel, res);
  function decide(event, eventMonth, extra = {}) {
    const index = events.length;
    const choices = eventChoices(event, ctx);
    const auto = typeof opts.autoChoice === 'function' ? opts.autoChoice({ ...event, choices }) : opts.autoChoice;
    const choiceIndex = index < decisions.length ? decisions[index] : auto;
    if (choiceIndex == null || !choices[choiceIndex]) {
      pending = { index, eventId: event.id, month: eventMonth, ...extra };
      return false;
    }
    const ch = choices[choiceIndex];
    for (const [k, v] of Object.entries(ch.effects)) {
      if (k === 'performance') mods.performance *= v;
      else if (k === 'damage' && ch.damageHalvedBy && ctx[ch.damageHalvedBy] && !(ch.unsafeIfLowBattery && ctx.lowBattery)) mods.damage += rng() < 0.5 ? v : 0;
      else mods[k] = (mods[k] ?? 0) + v;
    }
    // Snapshot of what was chosen (choices depend on the design), for the log and the orbit view.
    events.push({ index, month: eventMonth, eventId: event.id, choiceIndex, label: ch.label, explanation: ch.explanation, effects: ch.effects, ...extra });
    return true;
  }

  const result = () => {
    const serviceFraction = plannedMonths ? Math.min(1, service / plannedMonths + (mods.bonusService ?? 0)) : 0;
    const sim = {
      seed,
      decisions: decisions.slice(0, events.length),
      complete: pending == null,
      pending,
      launched,
      reachedOrbit,
      noGo,
      noGoGate: noGo ? failed.gate : null,
      outcome: pending ? 'pending' : outcome,
      failureCause,
      ticks,
      events,
      conditions: cond,
      summary: {
        monthsOperated: month,
        plannedMonths,
        serviceFraction,
        performanceMultiplier: mods.performance,
        hardwareFailures: events.filter((e) => e.eventId === 'hardware_failure').length,
        eventsSurvived: events.filter((e) => e.month > 0).length,
        reserveUsedM: Math.min(reserveM * mods.reserveShare, Number.MAX_VALUE),
        extraCostM: reserveM * mods.reserveShare,
        delayMonths: mods.delayMonths,
        damage: mods.damage,
        debrisPenalty: mods.debrisPenalty ?? 0,
        extended: (mods.debrisPenalty ?? 0) > 0,
        massKg: res.mass.used,
        capacityKg: res.mass.available,
      },
    };
    if (sim.complete && outcome === 'completed') {
      const objectives = evaluateObjectives(state, sim, res);
      sim.outcome = objectives.every((o) => o.met) ? 'success' : 'partial';
      sim.missed = objectives.filter((o) => !o.met).map((o) => o.id);
    }
    return sim;
  };

  // ── NO-GO designs simulated anyway: show what physics would do.
  if (noGo && failed.outcome !== 'partial') {
    if (failed.outcome === 'scrubbed') { launched = false; outcome = 'scrubbed'; failureCause = 'prep'; return result(); }
    launched = true;
    ticks.push({ month: 0, science: 0 });
    if (failed.outcome === 'too_heavy' || failed.outcome === 'wrong_orbit') { outcome = failed.outcome; failureCause = failed.cause; return result(); }
    reachedOrbit = true;
    month = 1;
    ticks.push({ month, science: 0 });
    outcome = 'lost'; failureCause = failed.cause;
    return result();
  }

  // ── Pre-launch (simulated)
  for (const ev of EVENTS.filter((e) => e.phase === 'prelaunch' && eventApplies(e, scenarioId, sel.roles))) {
    if (rng() < ev.perYear && !decide(ev, 0)) return result();
  }

  // ── Launch: the design passed every hard gate, so the rocket delivers it.
  launched = true;
  reachedOrbit = true;
  ticks.push({ month: 0, science: 0 });

  // ── Operations
  const payloadWorks = !noGo; // a NO-GO payload design flies but cannot do the mission
  const orbitEvents = EVENTS.filter((e) => e.phase === 'orbit' && eventApplies(e, scenarioId, sel.roles));
  while (month < plannedMonths) {
    month += 1;
    for (const ev of orbitEvents) {
      if (rng() < ev.perYear / 12) {
        const extra = ev.id === 'hardware_failure' && items.length ? { itemId: items[Math.floor(rng() * items.length)].id } : {};
        if (!decide(ev, month, extra)) { month -= 1; return result(); }
      }
    }
    if (mods.damage >= LOST_DAMAGE) { outcome = 'lost'; failureCause = 'hardware'; ticks.push({ month, science: service }); return result(); }
    service += payloadWorks ? Math.min(1, mods.performance) : 0;
    ticks.push({ month, science: service });
  }
  // End of the planned life: extend, or retire as planned? (ties events to the disposal choice)
  if (!noGo) {
    const endEv = EVENTS.find((e) => e.phase === 'end');
    if (endEv && !decide(endEv, plannedMonths)) return result();
  }
  outcome = 'completed';
  if (noGo) { outcome = 'partial'; failureCause = 'payload'; }
  return result();
}
