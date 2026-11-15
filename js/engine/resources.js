// computeResources(state) — the heart of the trade-off game. PURE: no DOM, no randomness.
// Formulas follow research §8 (docs/NASA_Hackathon_Mission_Control_Deep_Research_UA.md):
//   Mass  (§8.1): 6U → Σ parts + 15% design reserve, checked against the CubeSat limit (S01);
//                 Galileo-class → Σ parts incl. 110 kg propellant = launch mass (no extra 15%).
//   Power (§8.2): avg_solar = array_W × sunlit_fraction × 0.80; avg_load = mission duty-cycle model;
//                 battery usable = Wh × 0.6 vs need = load × eclipse_h; peak load checked where given.
//   Data  (§8.4): theoretical_GB = Mbps × contact_s / 8 / 1000 (before overheads). IoT counts packets;
//                 navigation is not judged by GB/day.
//   Budget: hardware + AIT + launch + deployer + ground + licensing + operations; reserve = what is left.
//
// Bar resources (mass, power, battery, data, budget, time) return:
//   { key, label, unit, used, available, ratio, status, ok, explanation, ...extra }
//   status: 'ok' | 'caution' | 'over' | 'blocked' | 'unknown'
// Number resources (lifetime, health, launch, science) return { key, label, value, ..., ok, explanation }.

import { COMPONENT_CATEGORIES, NONE, getComponent, costFor, isCubeSat } from '../data/components.js';
import { getInstrument } from '../data/instruments.js';
import { getOrbit } from '../data/orbits.js';
import { getLauncher, getDeployer, launchPrice } from '../data/launchers.js';
import { getScenario } from '../data/scenarios.js';
import { getGroundStation, groundServes } from '../data/groundStations.js';

/** Does this downlink serve this kind of data? (`serves` may be a string or a list) */
export const downlinkServes = (dl, kind) => !!dl && (Array.isArray(dl.serves) ? dl.serves.includes(kind) : dl.serves === kind);
import { kg, watts, wh, gbDay, money, months, pct, num } from '../utils/format.js';

// Research constants (§3.3, §5.4, §8.1, §8.2) — all [model] values from the research.
export const MASS_RESERVE_6U = 0.15;      // design mass reserve for CubeSat builds
export const SOLAR_DERATE = 0.80;         // losses + ageing factor
export const BATTERY_DOD = 0.6;           // allowed depth of discharge
export const DEFAULT_PREP = { tests: false, licence: false, disposal: false };

const round = (x, d = 6) => Math.round(x * 10 ** d) / 10 ** d;

/** Resolve ids in state into data objects. Missing selections are null; 'none' is recorded in `left`. */
export function getSelection(state) {
  const d = state.design;
  const components = {};
  const left = new Set(); // categories deliberately left out ('none')
  for (const cat of COMPONENT_CATEGORIES) {
    const id = d.components?.[cat] ?? null;
    if (id === NONE) left.add(cat);
    components[cat] = getComponent(id);
  }
  return {
    components,
    left,
    componentList: Object.values(components).filter(Boolean),
    instruments: (d.instrumentIds ?? []).map(getInstrument).filter(Boolean),
    orbit: getOrbit(d.orbitId),
    launcher: getLauncher(d.launcherId),
    deployer: getDeployer(d.deployerId),
    ground: getGroundStation(d.groundId),
    scenario: getScenario(state.scenarioId),
    prep: { ...DEFAULT_PREP, ...(d.prep ?? {}) },
  };
}

function barStatus(used, available) {
  if (available == null || used == null) return { ratio: null, status: 'unknown' };
  const ratio = available > 0 ? used / available : used > 0 ? Infinity : 0;
  const status = ratio <= 0.9 ? 'ok' : ratio <= 1 + 1e-9 ? 'caution' : 'over';
  return { ratio, status };
}

function bar(key, label, unit, used, available, explanation, extra = {}) {
  const { ratio, status } = barStatus(used, available);
  const finalStatus = extra.blocked ? 'blocked' : extra.status ?? status;
  const { status: _ignored, ...rest } = extra;
  return {
    key, label, unit, used, available, ratio, status: finalStatus,
    ok: finalStatus !== 'over' && finalStatus !== 'blocked',
    explanation, ...rest,
  };
}

// ─── Mass (§8.1) ─────────────────────────────────────────────────────────────
/** Capacity of a launcher to an orbit: { reaches, capacity (kg | null = not published) }. */
export function launcherReach(launcher, orbit) {
  if (!launcher || !orbit) return { reaches: null, capacity: null };
  const reaches = Object.prototype.hasOwnProperty.call(launcher.capacityKg, orbit.id);
  return { reaches, capacity: reaches ? launcher.capacityKg[orbit.id] : null };
}

function computeMass(sel) {
  const { componentList, instruments, components, launcher, orbit } = sel;
  const items = [...componentList, ...instruments];
  const unknown = items.filter((it) => it.mass == null);
  const parts = round(items.reduce((a, it) => a + (it.mass ?? 0), 0));
  const structure = components.structure;
  const cube = isCubeSat(structure);
  const reserveFraction = structure ? (structure.reserveFraction ?? (cube ? MASS_RESERVE_6U : 0)) : 0;
  const reserve = round(parts * reserveFraction);
  const total = round(parts + reserve);
  const propellant = components.propellant?.mass ?? 0;
  const limit = structure ? (cube ? structure.maxMassKg : structure.targetMassKg ?? null) : null;
  const { reaches, capacity } = launcherReach(launcher, orbit);

  // Volume: only volumes the research gives (the radiometer is ~4U, S07).
  const payloadUnits = instruments.reduce((a, i) => a + (i.volumeU ?? 0), 0);
  const volume = { used: payloadUnits, available: structure?.units ?? null, ok: !structure?.units || payloadUnits <= structure.units };
  // Size fit: big-satellite parts cannot go in a CubeSat and vice-versa.
  const misfits = structure ? items.filter((it) => it !== structure && it.formFactor !== 'any' && it.formFactor !== structure.formFactor) : [];

  let available = limit;
  if (capacity != null && (available == null || capacity < available)) available = capacity;
  const blocked = reaches === false;

  const breakdown = reserveFraction > 0
    ? `Parts ${kg(parts)} + ${pct(reserveFraction)} design reserve ${kg(reserve)} = ${kg(total)} checked.`
    : `Launch mass ${kg(total)} (includes ${kg(propellant)} of the satellite's own propellant — no extra 15% on top).`;
  let explanation = breakdown;
  if (cube && structure) explanation += ` Typical ${structure.plainName.replace(' frame', '')} limit: ${kg(structure.maxMassKg)} (CubeSat spec, S01).`;
  if (!cube && limit) explanation += ` Model launch mass target: ${kg(limit)} (real Galileo FOC: ~700–733 kg).`;
  if (blocked) explanation += ` ${launcher.plainName} cannot deliver to ${orbit.plainName}.`;
  else if (capacity != null) explanation += ` ${launcher.plainName} headline capacity to this orbit: ${kg(capacity)}.`;
  else if (reaches) explanation += ` ${launcher.plainName} reaches this orbit; there is no single published capacity number for it, so the ${cube ? 'dispenser' : 'contracted profile'} sets the limit.`;
  if (unknown.length) explanation += ` Not in our data (counted as 0): ${unknown.map((u) => u.plainName).join(', ')}.`;
  if (!volume.ok) explanation += ` ⚠ The payload needs ${volume.used}U but the frame has only ${volume.available}U.`;

  // A large bus is checked against the model launch-mass target: at or below it is fine (not "tight").
  const status = !cube && structure && available === limit && limit != null && total <= limit + 1e-9 ? 'ok' : undefined;
  return bar('mass', 'Mass', 'kg', total, available, explanation, {
    status, blocked, parts, reserve, reserveFraction, propellant, limit, capacity, reaches, unknown: unknown.map((u) => u.id),
    dry: parts - propellant, volume, misfits: misfits.map((m) => m.id),
    payload: { used: payloadUnits, available: structure?.units ?? null, ok: volume.ok },
  });
}

// ─── Power (§8.2) ────────────────────────────────────────────────────────────
function computePower(sel) {
  const { components, orbit, scenario, left } = sel;
  const pm = scenario?.powerModel ?? null;
  const load = pm?.avgLoadW ?? 0;
  const peak = pm?.peakLoadW ?? null;
  const src = components.power;
  if (!src) {
    return bar('power', 'Power', 'W', load || null, null,
      `Planned average load: ${watts(load)}${pm ? ' (mission duty-cycle model)' : ''}. Choose a solar array.`,
      { consumption: load, generation: null, peak, peakOk: null, missing: left.has('power') });
  }
  let generation = null;
  let explanation;
  if (orbit && orbit.sunlitFraction != null) {
    generation = round(src.arrayW * orbit.sunlitFraction * SOLAR_DERATE, 4);
    explanation = `Array ${watts(src.arrayW)} × ${pct(orbit.sunlitFraction)} of the time in sunlight × ${num(SOLAR_DERATE, 2)} (losses & ageing) = ${num(generation, 2)} W on average.`;
  } else if (orbit && !isCubeSat(src)) {
    generation = src.arrayW;
    explanation = `${src.plainName}: ${watts(src.arrayW)}–${watts(src.arrayWMax ?? src.arrayW)} class (we use the lower value). The research gives no single sunlight/shadow split for ${orbit.plainName}.`;
  } else if (orbit) {
    explanation = `The research gives no sunlight/shadow split for ${orbit.plainName}, and a ${watts(src.arrayW)} CubeSat array was never designed for it.`;
  } else {
    explanation = `Up to ${watts(src.arrayW)} in full sunlight. Pick an orbit to see how long it sits in Earth's shadow.`;
  }
  explanation += ` Planned average load: ${watts(load)} — modes take turns (duty cycle), it is not the sum of all peaks.`;
  const peakOk = peak == null ? null : peak <= src.arrayW;
  if (peak != null) explanation += ` Peak load ${watts(peak)} vs array ${watts(src.arrayW)}: ${peakOk ? 'OK' : 'too high'}.`;
  if (generation != null && load > generation) explanation += ` You are ${num(load - generation, 2)} W short.`;
  const margin = generation ? 1 - load / generation : null;
  const status = generation == null ? 'unknown' : peakOk === false ? 'over' : undefined;
  return bar('power', 'Power', 'W', load, generation, explanation, { consumption: load, generation, peak, peakOk, margin, status });
}

// ─── Battery (§8.2) ──────────────────────────────────────────────────────────
function computeBattery(sel, load) {
  const { orbit, components, left } = sel;
  const battery = components.battery;
  const eclipseH = orbit?.eclipseMinutes != null ? orbit.eclipseMinutes / 60 : null;
  const needWh = eclipseH != null ? round(load * eclipseH, 4) : null;
  const usable = battery ? battery.capacityWh * BATTERY_DOD : left.has('battery') ? 0 : null;
  let explanation;
  if (!orbit) explanation = 'Pick an orbit to find out how long the satellite sits in shadow.';
  else if (eclipseH == null) explanation = `The research gives no single eclipse length for ${orbit.plainName} (it changes with the season), so the game checks that a correctly sized battery is on board.`;
  else explanation = `In a ${num(orbit.eclipseMinutes)}-minute shadow: ${watts(load)} × ${num(orbit.eclipseMinutes)}/60 h = ${num(needWh, 2)} Wh needed.`;
  if (battery) {
    explanation += ` ${battery.plainName}: ${wh(battery.capacityWh)} × 60% usable = ${wh(usable)}.`;
    if (needWh != null && needWh > usable) explanation += ' Not enough — it would switch off in the dark.';
  } else if (left.has('battery')) {
    explanation += ' No battery: in the shadow the satellite switches off.';
  } else {
    explanation += ' Choose a battery.';
  }
  let status;
  if (left.has('battery')) status = 'over';
  else if (battery && needWh == null && orbit) status = 'ok';
  return bar('battery', 'Battery', 'Wh', needWh, usable, explanation, { needWh, usable, status, missing: left.has('battery') });
}

// ─── Data (§8.4) ─────────────────────────────────────────────────────────────
const SERVE_NAME = { iot: 'IoT gateways', gnss: 'GNSS monitoring network', weather: 'science receiving station' };

function computeData(sel) {
  const { scenario, components, instruments, ground, orbit, left } = sel;
  const kind = scenario?.data.kind ?? 'gb';
  const roles = new Set(instruments.map((i) => i.role));
  const groundOk = ground ? groundServes(ground, scenario?.groundServes) : null;
  const groundBlocked = groundOk === false;
  const base = { kind, groundOk, contactHours: ground?.contactHoursPerDay ?? null };

  if (kind === 'gb') {
    const dl = components.downlink;
    const generated = roles.has('mw_radiometer') ? scenario.data.generatedGBperDay : 0;
    let downlink = null;
    let explanation = roles.has('mw_radiometer') ? `The radiometer makes about ${scenario.data.generatedText}.` : 'No radiometer — no measurements to send yet.';
    if (groundBlocked) {
      downlink = 0;
      explanation += ` The ${ground.plainName} cannot receive or process weather measurements.`;
    } else if (left.has('downlink')) {
      downlink = 0;
      explanation += ' No science downlink: the data stays on board.';
    } else if (dl && ground && dl.rateMbps) {
      const hours = ground.contactHoursPerDay ?? 0;
      downlink = round((dl.rateMbps * hours * 3600) / 8 / 1000, 4);
      explanation += ` ${num(dl.rateMbps)} Mbps × ${num(hours)} h of contact per day × 3600 / 8 / 1000 = ${gbDay(downlink)} — in theory, before protocol overheads, re-sends and station availability (the real figure is lower).`;
    } else {
      explanation += ' Pick the science downlink and the ground station to see how much reaches Earth.';
    }
    const lostFraction = downlink != null && generated > 0 ? Math.max(0, 1 - downlink / generated) : 0;
    return bar('data', 'Data', 'GB/day', generated, downlink, explanation, { ...base, blocked: groundBlocked, generated, downlink, lostFraction, deliveredFraction: generated > 0 && downlink != null ? Math.min(1, downlink / generated) : null });
  }

  // Packets (IoT) or navigation broadcast: judged as a complete chain, not GB/day.
  const chain = kind === 'packets'
    ? [
      ['IoT radio + antennas', roles.has('iot_transceiver') && roles.has('iot_antenna')],
      ['packet memory (computer)', !!components.computer?.storesPackets],
      ['packet downlink', downlinkServes(components.downlink, 'iot')],
      ['IoT gateways on Earth', groundOk === true],
    ]
    : [
      ['navigation signal + L-band antenna', roles.has('nav_signal') && roles.has('nav_antenna')],
      ['C-band uplink + S-band control', components.comms?.id === 'ttc_c_s_band'],
      ['GNSS monitoring + time uplink on Earth', groundOk === true],
    ];
  const missing = chain.filter(([, ok]) => !ok).map(([name]) => name);
  const chosen = !!ground && (kind === 'packets' ? !!components.downlink || left.has('downlink') : !!components.comms);
  const chainOk = missing.length === 0;
  let explanation = kind === 'packets'
    ? 'IoT messages are bytes, not photos: the satellite stores packets during passes and dumps them over a gateway. '
    : 'Navigation is a broadcast: the L-band signal goes to every receiver below, while the ground uploads clock and orbit corrections. It is not measured in GB/day. ';
  explanation += chainOk ? 'The chain is complete.' : `Missing: ${missing.join(', ')}.`;
  if (groundBlocked) explanation += ` The ${ground.plainName} is not a ${SERVE_NAME[scenario.groundServes]}.`;
  if (orbit && kind === 'packets') explanation += ' With one low satellite, a message waits until the next gateway pass (latency = minutes to hours).';
  const status = !chosen && !groundBlocked ? 'unknown' : chainOk ? 'ok' : 'over';
  return bar('data', 'Data', kind === 'packets' ? 'packets' : 'signal', null, null, explanation, {
    ...base, status, blocked: groundBlocked, chain, chainOk, missing, generated: 0, downlink: null, lostFraction: chainOk ? 0 : chosen ? 1 : 0,
    deliveredFraction: chosen ? (chainOk ? 1 : 0) : null,
  });
}

// ─── Budget (research cost tables §3.5, §4.6, §5.5) ─────────────────────────
function computeBudget(sel, massKg) {
  const { componentList, instruments, launcher, deployer, ground, scenario, prep } = sel;
  const sid = scenario?.id;
  const cm = scenario?.costModel ?? { ait: 0, licensing: 0, ops: 0, reserve: 0 };
  const items = [...componentList, ...instruments];
  const hardware = round(items.reduce((a, it) => a + costFor(it, sid), 0));
  const unknownCost = items.filter((it) => it.cost == null).map((it) => it.id);
  const launchCost = launcher ? launchPrice(launcher, massKg) : 0;
  const launchUnknown = launcher != null && launchCost == null;
  const lines = [
    { id: 'hardware', label: 'Satellite hardware (build list)', value: hardware, dataKind: 'model' },
    { id: 'ait', label: 'Design, software, assembly & tests (AIT)', value: prep.tests ? cm.ait : 0, dataKind: 'model', note: prep.tests ? '' : 'tests not planned yet' },
    { id: 'launch', label: 'Launch service', value: launchUnknown ? null : launchCost, dataKind: launcher ? (launcher.costType === 'published' ? 'catalog' : launcher.costType === 'rfq' ? 'rfq' : 'model') : 'model', note: launchUnknown ? 'price on request (RFQ) — not counted' : '' },
    { id: 'deployer', label: 'Dispenser / adapter & integration', value: deployer?.cost ?? 0, dataKind: 'model', note: deployer?.costNote ?? '' },
    { id: 'ground', label: 'Ground segment', value: ground?.cost ?? 0, dataKind: 'model' },
    { id: 'licensing', label: 'Frequency licence, regulation, EMC', value: prep.licence ? cm.licensing : 0, dataKind: 'model', note: prep.licence ? '' : 'licence not planned yet' },
    { id: 'ops', label: 'Operations', value: scenario ? cm.ops : 0, dataKind: 'model' },
  ];
  const used = round(lines.reduce((a, l) => a + (l.value ?? 0), 0));
  const available = scenario ? scenario.budgetM : null;
  const reserveLeft = available == null ? null : round(available - used);
  const plannedReserve = cm.reserve;
  let status;
  if (available != null) status = used > available + 1e-9 ? 'over' : reserveLeft < plannedReserve - 1e-6 ? 'caution' : 'ok';
  let explanation = lines.filter((l) => l.value || l.note).map((l) => `${l.label} ${l.value == null ? 'RFQ' : money(l.value)}`).join(' + ') + ` = ${money(used)}.`;
  if (available != null) {
    explanation += used <= available
      ? ` Project reserve left: ${money(reserveLeft)} of ${money(available)} (the research plan keeps ${money(plannedReserve)}).`
      : ` That is ${money(used - available)} over the ${money(available)} model budget.`;
  }
  if (launchUnknown) explanation += ` ${launcher.plainName} has no public price — the launch line is "not comparable on cost".`;
  explanation += ' All budget lines are educational estimates, not real quotes.';
  return bar('budget', 'Budget', '$M', used, available, explanation, {
    status, hardware, launch: launchCost, launchUnknown, lines, reserveLeft, plannedReserve, unknownCost, ops: cm.ops,
  });
}

// ─── Time (no build-time model in the research: only the planning window) ───
function computeTime(sel) {
  const { scenario } = sel;
  const range = scenario?.deadlineMonths ?? null;
  const explanation = range
    ? `Planning window ${range[0]}–${range[1]} months (research model). The research budget plan fits this window; launch delays push you towards the end of it.`
    : 'The research gives no build deadline for this mission.';
  return { key: 'time', label: 'Time', unit: 'months', used: range ? range[0] : null, available: range ? range[1] : null, ratio: null, status: 'ok', ok: true, explanation, range };
}

// ─── Number resources ────────────────────────────────────────────────────────
function computeLifetime(sel) {
  const { scenario } = sel;
  const planned = scenario ? scenario.simMonths : 0;
  const required = scenario?.minMonths ?? null;
  const explanation = scenario
    ? `Mission plan: ${months(planned)} of operations${required ? ` (at least ${months(required)} required)` : ''}. Lifetime is limited by the weakest resource — a power, link or thermal flaw ends it early. Extra thrusters do not "add years".`
    : 'Pick a mission.';
  return { key: 'lifetime', label: 'Lifetime', value: planned / 12, plannedMonths: planned, required: required != null ? required / 12 : null, ok: true, explanation };
}

function computeLaunch(sel, mass) {
  const { launcher, orbit } = sel;
  if (!launcher) return { key: 'launch', label: 'Launch', value: null, ok: true, reaches: null, explanation: 'Pick a launch service.' };
  const explanation = mass.reaches === false
    ? `${launcher.plainName} cannot deliver to ${orbit?.plainName ?? 'this orbit'}.`
    : `${launcher.plainName}: ${launcher.headline} No launch-success percentage is shown — a real one depends on the exact rocket, date and definition of success.`;
  return { key: 'launch', label: 'Launch', value: null, ok: mass.reaches !== false, reaches: mass.reaches, capacity: mass.capacity, explanation };
}

/** Planned mission readiness (0–1): share of the mission's required payload roles + service chain present. */
function computePerformance(sel, data) {
  const { scenario, instruments } = sel;
  if (!scenario) return { key: 'science', label: 'Mission performance', value: 0, required: 1, ok: false, explanation: 'Pick a mission.' };
  const roles = new Set(instruments.map((i) => i.role));
  const have = scenario.requiredRoles.filter((r) => roles.has(r)).length;
  const payloadShare = have / scenario.requiredRoles.length;
  const chain = data.deliveredFraction ?? 0;
  const value = round(payloadShare * (data.status === 'unknown' ? 1 : chain));
  const explanation = `Mission payload ${have} of ${scenario.requiredRoles.length} required parts; data/service chain ${data.status === 'unknown' ? 'not chosen yet' : pct(chain)}.`;
  return { key: 'science', label: 'Mission performance', value, required: 1, ok: value >= 1 - 1e-9, explanation, payloadShare };
}

// ─── Public API ──────────────────────────────────────────────────────────────
export function computeResources(state) {
  const sel = getSelection(state);
  const mass = computeMass(sel);
  const power = computePower(sel);
  const battery = computeBattery(sel, power.consumption);
  const data = computeData(sel);
  const budget = computeBudget(sel, mass.used);
  const time = computeTime(sel);
  const lifetime = computeLifetime(sel);
  const launch = computeLaunch(sel, mass);
  const science = computePerformance(sel, data);
  const health = { key: 'health', label: 'Reliability', value: null, ok: true, explanation: 'No reliability percentages: the research has no real numbers for them (§8.6).' };
  return { mass, power, battery, data, budget, time, lifetime, health, launch, science };
}

export const BAR_KEYS = ['mass', 'power', 'battery', 'data', 'budget'];
export const NUMBER_KEYS = ['lifetime', 'launch', 'science'];
