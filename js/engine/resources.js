// computeResources(state) — the heart of the trade-off game. PURE: no DOM, no randomness.
//
// Bar resources (mass, power, battery, data, budget, time) return:
//   { key, label, unit, used, available, ratio, status, ok, explanation, ...extra }
//   status: 'ok' (≤80%) | 'caution' (80–100%) | 'over' (>100%) | 'blocked' | 'unknown'
// Number resources (lifetime, health, launch, science) return { key, label, value, ..., ok, explanation }.

import { COMPONENT_CATEGORIES, getComponent } from '../data/components.js';
import { getInstrument } from '../data/instruments.js';
import { getOrbit } from '../data/orbits.js';
import { getLauncher } from '../data/launchers.js';
import { getScenario } from '../data/scenarios.js';
import { getGroundStation } from '../data/groundStations.js';
import { kg, watts, wh, gbDay, money, months, years, pct, num } from '../utils/format.js';

// Game constants (documented in CLAUDE.md)
export const MASS_MARGIN = 0.15;          // 15% of dry mass
export const PROPELLANT_DV_DIVISOR = 10000; // propellant = dry × Δv / 10000
export const BATTERY_DOD = 0.6;           // usable depth of discharge
export const MAX_CONTACT_HOURS = 24;
// Hardware failures per year = (1 − health) × FAILURE_RATE_FACTOR (+ stress from overloads).
// Health is an AVERAGE (≈0.94–0.99), so the factor is large enough to make differences visible:
// a flight-proven design (~98%) sees ~0.15 failures/yr, a cheap CubeSat (~95%) ~0.4/yr.
export const FAILURE_RATE_FACTOR = 8;
export const STRESS_FAILURES_PER_YEAR = 0.3; // each of: power deficit, battery too small
export const INTEGRATION_MONTHS = 6;      // integration & testing after the slowest part
export const GOOD_ORBIT_BONUS = 1.3;
export const POOR_ORBIT_PENALTY = 0.8;

const sum = (items, key) => items.reduce((acc, it) => acc + (it[key] ?? 0), 0);

/** Resolve ids in state into data objects. Missing selections are null. */
export function getSelection(state) {
  const d = state.design;
  const components = {};
  for (const cat of COMPONENT_CATEGORIES) components[cat] = getComponent(d.components[cat]);
  return {
    components,
    componentList: Object.values(components).filter(Boolean),
    instruments: d.instrumentIds.map(getInstrument).filter(Boolean),
    orbit: getOrbit(d.orbitId),
    launcher: getLauncher(d.launcherId),
    ground: getGroundStation(d.groundId),
    scenario: getScenario(state.scenarioId),
  };
}

function barStatus(used, available) {
  if (available == null) return { ratio: null, status: 'unknown' };
  const ratio = available > 0 ? used / available : used > 0 ? Infinity : 0;
  const status = ratio <= 0.8 ? 'ok' : ratio <= 1 ? 'caution' : 'over';
  return { ratio, status };
}

function bar(key, label, unit, used, available, explanation, extra = {}) {
  const { ratio, status } = barStatus(used, available);
  const finalStatus = extra.blocked ? 'blocked' : status;
  return {
    key, label, unit, used, available, ratio, status: finalStatus,
    ok: finalStatus !== 'over' && finalStatus !== 'blocked',
    explanation, ...extra,
  };
}

// ─── Mass ────────────────────────────────────────────────────────────────────
function computeMass(sel) {
  const { componentList, instruments, orbit, launcher, components } = sel;
  const busMass = sum(componentList, 'mass');
  const payloadMass = sum(instruments, 'mass');
  const dry = busMass + payloadMass;
  const dv = orbit ? orbit.requiredDeltaV : 0;
  const propellant = (dry * dv) / PROPELLANT_DV_DIVISOR;
  const margin = dry * MASS_MARGIN;
  const total = dry + propellant + margin;

  const structure = components.structure;
  const payload = {
    used: payloadMass,
    available: structure ? structure.maxPayloadMass : null,
    ok: !structure || payloadMass <= structure.maxPayloadMass,
  };

  let available = null;
  let blocked = false;
  let explanation;
  const breakdown = `Dry mass ${kg(dry)} (bus ${kg(busMass)} + instruments ${kg(payloadMass)}) + propellant ${kg(propellant)} + 15% margin ${kg(margin)} = ${kg(total)}.`;

  if (!launcher || !orbit) {
    explanation = `${breakdown} Pick an orbit and a launcher to see how much the rocket can lift.`;
  } else {
    const cap = launcher.capacityKg[orbit.id];
    if (cap == null) {
      blocked = true;
      explanation = `${launcher.name} cannot reach ${orbit.name} at all. Choose a bigger launcher or a closer orbit.`;
    } else {
      available = cap;
      explanation = total <= cap
        ? `${breakdown} ${launcher.name} can lift ${kg(cap)} to this orbit — ${kg(cap - total)} to spare.`
        : `${breakdown} That is ${kg(total - cap)} too heavy for ${launcher.name} (max ${kg(cap)} to this orbit). Remove heavy parts or pick a bigger rocket.`;
    }
  }
  if (orbit && dv > 0) {
    explanation += ` Reaching this orbit needs Δv ${num(dv)} m/s, so you carry ${kg(propellant)} of propellant.`;
  }
  if (!payload.ok) {
    explanation += ` ⚠ Instruments weigh ${kg(payloadMass)} but the ${structure.name} can only carry ${kg(structure.maxPayloadMass)}.`;
  }

  return bar('mass', 'Mass', 'kg', total, available, explanation, {
    blocked, dry, busMass, payloadMass, propellant, margin, payload,
  });
}

// ─── Power ───────────────────────────────────────────────────────────────────
function computePower(sel) {
  const { componentList, instruments, orbit, components } = sel;
  const consumption = sum(componentList, 'power') + sum(instruments, 'power');
  const src = components.power;
  if (!src) {
    return bar('power', 'Power', 'W', consumption, null,
      `Your spacecraft needs ${watts(consumption)}. Choose a power source to generate electricity.`,
      { consumption, generation: null });
  }

  let generation;
  let explanation;
  if (src.type === 'rtg') {
    generation = src.outputW;
    explanation = `The RTG gives a steady ${watts(generation)} everywhere — no sunlight needed. Consumption: ${watts(consumption)}.`;
  } else {
    const intensity = orbit ? orbit.solarIntensity : 1;
    const sunlit = orbit ? 1 - orbit.eclipseFraction : 1;
    generation = src.outputW * intensity * sunlit;
    explanation = orbit
      ? `Panels rated ${watts(src.outputW)} × ${pct(intensity)} sunlight strength × ${pct(sunlit)} of the time in sunlight = ${watts(generation)} on average. Consumption: ${watts(consumption)}.`
      : `Panels give up to ${watts(src.outputW)} in full sunlight. Pick an orbit to see shadows and distance from the Sun. Consumption: ${watts(consumption)}.`;
  }
  if (consumption > generation) {
    explanation += ` You are ${watts(consumption - generation)} short — use bigger arrays, fewer power-hungry instruments${orbit && orbit.solarIntensity < 0.6 ? ', or an RTG (sunlight is weak here)' : ''}.`;
  }
  return bar('power', 'Power', 'W', consumption, generation, explanation, { consumption, generation });
}

// ─── Battery ─────────────────────────────────────────────────────────────────
function computeBattery(sel, consumption) {
  const { orbit, components } = sel;
  const battery = components.battery;
  const needWh = orbit ? (consumption * orbit.eclipseMinutes) / 60 : 0;
  const usable = battery ? battery.capacityWh * BATTERY_DOD : null;

  let explanation;
  if (!orbit) {
    explanation = 'Pick an orbit to find out how long the spacecraft sits in shadow.';
  } else if (orbit.eclipseMinutes === 0) {
    explanation = `${orbit.name} has no eclipses — the battery only covers launch and emergencies.`;
  } else {
    explanation = `In the ${num(orbit.eclipseMinutes)}-minute eclipse the spacecraft uses ${watts(consumption)} × ${num(orbit.eclipseMinutes)}/60 h = ${wh(needWh)}.`;
  }
  if (battery) {
    explanation += ` The battery stores ${wh(battery.capacityWh)}, but only 60% is used (to keep it healthy) = ${wh(usable)} usable.`;
    if (needWh > usable) explanation += ' Not enough — the spacecraft would shut down in the dark. Pick a bigger battery or lower your power use.';
  } else {
    explanation += ' Choose a battery.';
  }
  return bar('battery', 'Battery', 'Wh', needWh, usable, explanation, { needWh, usable });
}

// ─── Data ────────────────────────────────────────────────────────────────────
/** Contact hours per day = ground.contactHours × orbit.contactFactor (max 24). Null if unknown. */
export function contactHours(ground, orbit) {
  if (!ground || !orbit) return null;
  if (orbit.requiresDeepSpaceGround && !ground.deepSpace) return 0;
  return Math.min(MAX_CONTACT_HOURS, ground.contactHours * orbit.contactFactor);
}

function computeData(sel) {
  const { instruments, orbit, components, ground } = sel;
  const generated = sum(instruments, 'dataGBperDay');
  const comms = components.comms;
  let downlink = null;
  let explanation;
  // Radio problem is independent of the ground problem — report both.
  const deepSpaceProblem = !!(comms && orbit && orbit.distanceFactor < 0.1 && !comms.deepSpace);
  const groundBlocked = !!(ground && orbit && orbit.requiresDeepSpaceGround && !ground.deepSpace);
  const hours = contactHours(ground, orbit);

  if (groundBlocked) {
    downlink = 0;
    explanation = `${orbit.name} is far beyond the reach of a ${ground.name}. Only a deep-space ground segment with giant dishes can hear a spacecraft there — choose one on the Ground step.`;
  } else if (!comms || !orbit || !ground) {
    explanation = `Instruments produce ${gbDay(generated)}. Pick a radio, an orbit and a ground segment to see how much can be sent home.`;
  } else {
    downlink = (comms.rateMbps * orbit.distanceFactor * hours * 3600) / 8 / 1000;
    explanation = `The ${comms.name} sends ${num(comms.rateMbps)} Mbps near Earth; at this distance it is ×${num(orbit.distanceFactor, 3)}. The ${ground.name} gives ${num(ground.contactHours, 1)} h × ${num(orbit.contactFactor, 2)} (orbit visibility) = ${num(hours, 1)} h of contact per day → ${gbDay(downlink)}.`;
    if (deepSpaceProblem) explanation += ' This radio is not built for deep space — ground stations can barely hear it.';
  }
  const lostFraction = downlink != null && generated > 0 ? Math.max(0, 1 - downlink / generated) : 0;
  if (downlink != null && !groundBlocked) {
    explanation = lostFraction > 0
      ? `Your instruments produce ${gbDay(generated)} but the antenna can only send ${gbDay(downlink)} from this orbit — ${pct(lostFraction)} of data will be lost. Try a better antenna or fewer data-heavy instruments. ${explanation}`
      : `Your instruments produce ${gbDay(generated)} and the link can send ${gbDay(downlink)} — all data gets home. ${explanation}`;
  }
  return bar('data', 'Data', 'GB/day', generated, downlink, explanation, {
    blocked: groundBlocked, generated, downlink, lostFraction, deepSpaceProblem, contactHours: hours,
  });
}

// ─── Budget ──────────────────────────────────────────────────────────────────
function computeBudget(sel) {
  const { componentList, instruments, launcher, scenario, ground } = sel;
  const hardware = sum(componentList, 'cost') + sum(instruments, 'cost');
  const launch = launcher ? launcher.cost : 0;
  const lifetimeYears = scenario ? scenario.minLifetimeYears : 0;
  const opsPerYear = ground ? ground.opsCostPerYear : 0;
  const ops = opsPerYear * lifetimeYears;
  const total = hardware + launch + ops;
  const available = scenario ? scenario.budgetM : null;
  let explanation = `Hardware ${money(hardware)} + launch ${money(launch)} + operations ${money(ops)} = ${money(total)}.`;
  explanation += ground
    ? ` Operations: ${ground.name} at ${money(opsPerYear)}/year × ${num(lifetimeYears)} required years.`
    : ' Choose a ground segment to add yearly operations costs.';
  if (available != null) {
    explanation += total <= available
      ? ` You have ${money(available - total)} left of ${money(available)}.`
      : ` That is ${money(total - available)} over the ${money(available)} budget — swap advanced parts for basic ones or use a cheaper launcher.`;
  }
  return bar('budget', 'Budget', '$M', total, available, explanation, { hardware, launch, ops });
}

// ─── Time ────────────────────────────────────────────────────────────────────
function computeTime(sel) {
  const { componentList, instruments, scenario } = sel;
  const items = [...componentList, ...instruments];
  const slowest = items.reduce((a, b) => (!a || b.devMonths > a.devMonths ? b : a), null);
  const devMonths = slowest ? slowest.devMonths + INTEGRATION_MONTHS : 0;
  const available = scenario ? scenario.deadlineMonths : null;
  let explanation = slowest
    ? `The slowest item, ${slowest.name}, takes ${months(slowest.devMonths)} to build, plus ${months(INTEGRATION_MONTHS)} to integrate and test everything = ${months(devMonths)}.`
    : 'Nothing chosen yet — development time starts when you pick parts.';
  if (available != null && devMonths > available) {
    explanation += ` The launch window is in ${months(available)} — you will miss it. Use simpler, faster-to-build parts.`;
  }
  return bar('time', 'Time', 'months', devMonths, available, explanation, { slowestId: slowest?.id ?? null });
}

// ─── Number resources ────────────────────────────────────────────────────────
function computeLifetime(sel) {
  const { orbit, components, scenario } = sel;
  const prop = components.propulsion;
  const base = orbit ? orbit.baseLifetimeYears : 0;
  const bonus = prop ? prop.lifetimeBonusYears : 0;
  const value = base + bonus;
  const required = scenario ? scenario.minLifetimeYears : null;
  let explanation = orbit
    ? `${orbit.name} lasts about ${years(base)} by itself; ${prop ? `${prop.name} adds ${years(bonus)}` : 'propulsion could extend it'} → ${years(value)}.`
    : 'Pick an orbit to estimate how long the mission can last.';
  if (orbit && required != null && value < required) {
    explanation += ` The mission must last ${years(required)} — add more propulsion for orbit corrections.`;
  }
  return { key: 'lifetime', label: 'Lifetime', value, required, ok: !orbit || required == null || value >= required, explanation };
}

function computeHealth(sel, power, battery) {
  const { componentList, instruments } = sel;
  const items = [...componentList, ...instruments];
  const value = items.length ? items.reduce((acc, it) => acc + it.reliability, 0) / items.length : null;
  const stress = (power.status === 'over' ? STRESS_FAILURES_PER_YEAR : 0) + (battery.status === 'over' ? STRESS_FAILURES_PER_YEAR : 0);
  const failuresPerYear = value == null ? 0 : (1 - value) * FAILURE_RATE_FACTOR + stress;
  const weakest = items.reduce((a, b) => (!a || b.reliability < a.reliability ? b : a), null);
  let explanation = items.length
    ? `Average reliability of your ${items.length} parts = ${pct(value, 1)}. Expect about ${num(failuresPerYear, 2)} hardware failures per year (each one needs a decision during the mission).${weakest ? ` Weakest part: ${weakest.name} (${pct(weakest.reliability, 1)}).` : ''}`
    : 'Pick parts to estimate how healthy the spacecraft will be.';
  if (stress > 0) explanation += ' Overloaded power or battery adds extra failures — electronics brown out in the dark.';
  return {
    key: 'health', label: 'Spacecraft health', value: value ?? 0, failuresPerYear, stress,
    ok: value == null || failuresPerYear < 0.5, explanation,
  };
}

function computeLaunchSuccess(sel) {
  const { launcher } = sel;
  const value = launcher ? launcher.reliability : null;
  const explanation = launcher
    ? `${launcher.name} reaches orbit ${pct(value)} of the time. Only the rocket matters here — the spacecraft's own reliability shows up later as hardware failures.`
    : 'Pick a launcher to see the chance of a successful launch.';
  return { key: 'launch', label: 'Launch success', value, ok: true, explanation };
}

function computeScience(sel, data) {
  const { instruments, orbit, components, scenario } = sel;
  const adcs = components.adcs;
  const bonus = adcs ? adcs.scienceBonus : 1;
  const dataFactor = data.downlink == null || data.generated === 0 ? 1 : Math.min(1, data.downlink / data.generated);
  let base = 0;
  const matched = [];
  for (const ins of instruments) {
    const orbitFactor = !orbit ? 1 : ins.tags.some((t) => orbit.goodFor.includes(t)) ? GOOD_ORBIT_BONUS : POOR_ORBIT_PENALTY;
    if (orbit && orbitFactor > 1) matched.push(ins.name);
    base += ins.science * orbitFactor;
  }
  const value = base * bonus * dataFactor;
  const required = scenario ? scenario.minScience : null;
  let explanation = instruments.length
    ? `Instrument points adjusted for orbit fit (×1.3 good, ×0.8 poor) = ${num(base)}; × pointing bonus ${num(bonus, 2)} × data delivered ${pct(dataFactor)} = ${num(value)}.`
    : 'Add instruments to produce science.';
  if (orbit && instruments.length) {
    explanation += matched.length ? ` Good orbit fit: ${matched.join(', ')}.` : ' None of your instruments suit this orbit well.';
  }
  if (required != null && value < required) explanation += ` Target: ${num(required)} points.`;
  return { key: 'science', label: 'Science', value, required, ok: required == null || value >= required, explanation, dataFactor, bonus };
}

// ─── Public API ──────────────────────────────────────────────────────────────
export function computeResources(state) {
  const sel = getSelection(state);
  const mass = computeMass(sel);
  const power = computePower(sel);
  const battery = computeBattery(sel, power.consumption);
  const data = computeData(sel);
  const budget = computeBudget(sel);
  const time = computeTime(sel);
  const lifetime = computeLifetime(sel);
  const health = computeHealth(sel, power, battery);
  const launch = computeLaunchSuccess(sel);
  const science = computeScience(sel, data);
  return { mass, power, battery, data, budget, time, lifetime, health, launch, science };
}

export const BAR_KEYS = ['mass', 'power', 'battery', 'data', 'budget', 'time'];
export const NUMBER_KEYS = ['lifetime', 'health', 'launch', 'science'];
