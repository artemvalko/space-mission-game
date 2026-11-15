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
import { getScenario, variantOf } from '../data/scenarios.js';
import { INCLUDED_IN_REFERENCE } from '../data/bundles.js';
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
  const instruments = (d.instrumentIds ?? []).map(getInstrument).filter(Boolean);
  // Reference build = a complete real satellite: its bus + payload are "included".
  const reference = components.structure?.reference ?? null;
  const included = new Set(reference ? INCLUDED_IN_REFERENCE : []);
  const roles = new Set([...instruments.map((i) => i.role), ...(reference?.payloadRoles ?? [])]);
  const scenario = getScenario(state.scenarioId);
  return {
    components,
    left,
    reference,
    included,
    roles,
    variant: variantOf(scenario, d.variantId),
    satsPerLaunch: d.satsPerLaunch === 2 ? 2 : 1,
    componentList: Object.values(components).filter(Boolean),
    instruments,
    orbit: getOrbit(d.orbitId),
    launcher: getLauncher(d.launcherId),
    deployer: getDeployer(d.deployerId),
    ground: getGroundStation(d.groundId),
    scenario,
    prep: { ...DEFAULT_PREP, ...(d.prep ?? {}) },
  };
}

/** Mass of a part: its own, or the "≈ same class" research estimate (IoT radios); null = NOT PUBLIC. */
export const massOf = (it) => (it.mass != null ? it.mass : it.massClassOf ? getInstrument(it.massClassOf)?.mass ?? null : null);

/**
 * The payload roles this design must have, and which are missing.
 * Weather: any atmosphere sensor; a passive radiometer (part build) also needs calibration — radar and
 * GNSS-RO do not (options §3.1: GNSS-RO "needs no calibration").
 */
export function payloadNeeds(sel) {
  const { scenario, instruments, reference, roles } = sel;
  if (!scenario) return { needed: [], missing: [] };
  const needed = [...scenario.requiredRoles];
  const sensors = [...instruments.filter((i) => i.sensor), ...(reference?.sensor ? [getInstrument(reference.sensor)] : [])];
  if (needed.includes('atmo_sensor') && instruments.some((i) => i.sensor && i.passive) && !reference) needed.push('calibration');
  const has = (r) => (r === 'atmo_sensor' ? sensors.length > 0 || [...roles].some((x) => ['mw_radiometer', 'precip_radar', 'gnss_ro'].includes(x)) : roles.has(r));
  return { needed, missing: needed.filter((r) => !has(r)), sensors };
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
  const { componentList, instruments, components, launcher, orbit, reference, satsPerLaunch } = sel;
  const structure = components.structure;
  // Reference build: the real total mass replaces part-by-part mass; add-ons that flew on it are inside it.
  const items = reference
    ? [...componentList.filter((c) => c !== structure), ...instruments.filter((i) => i.flewOn !== structure.id)]
    : [...componentList, ...instruments];
  const unknown = items.filter((it) => massOf(it) == null && it.formFactor !== 'any');
  const distractorUnknown = items.filter((it) => massOf(it) == null && it.formFactor === 'any');
  const estimated = items.filter((it) => it.mass == null && massOf(it) != null);
  const parts = round(items.reduce((a, it) => a + (massOf(it) ?? 0), 0) + (reference?.totalMassKg ?? 0));
  const cube = isCubeSat(structure);
  const reserveFraction = structure && !reference ? (structure.reserveFraction ?? (cube ? MASS_RESERVE_6U : 0)) : 0;
  const reserve = round(parts * reserveFraction);
  const total = round(parts + reserve);
  const propellant = components.propellant?.mass ?? 0;
  const limit = structure ? (cube ? structure.maxMassKg ?? null : structure.targetMassKg ?? null) : null;
  const { reaches, capacity: cap1 } = launcherReach(launcher, orbit);
  // Two satellites on one launch share its capacity.
  const capacity = cap1 != null && launcher?.pairs && satsPerLaunch === 2 ? cap1 / 2 : cap1;
  // "Cannot verify": a part with no public mass, or a frame with no public limit (never guessed).
  const cannotVerify = unknown.map((u) => u.plainName);
  if (structure && cube && !reference && structure.maxMassKg == null) cannotVerify.push(`${structure.plainName} mass limit`);

  // Volume: only volumes the research gives (the radiometer is ~4U, S07).
  const payloadUnits = instruments.reduce((a, i) => a + (i.volumeU ?? 0), 0);
  const volume = { used: payloadUnits, available: structure?.units ?? null, ok: !structure?.units || payloadUnits <= structure.units };
  // Size fit: big-satellite parts cannot go in a CubeSat and vice-versa.
  const misfits = structure ? items.filter((it) => it !== structure && it.formFactor !== 'any' && it.formFactor !== structure.formFactor) : [];

  let available = limit;
  if (capacity != null && (available == null || capacity < available)) available = capacity;
  const blocked = reaches === false;

  const breakdown = reference
    ? `Real total mass of ${structure.plainName.replace(' (real)', '')}: ${reference.massText}.${items.length ? ` Plus your extra parts ${kg(parts - reference.totalMassKg)}.` : ''}`
    : reserveFraction > 0
    ? `Parts ${kg(parts)} + ${pct(reserveFraction)} design reserve ${kg(reserve)} = ${kg(total)} checked.`
    : `Launch mass ${kg(total)} (includes ${kg(propellant)} of the satellite's own propellant — no extra 15% on top).`;
  let explanation = breakdown;
  if (cube && structure) explanation += ` Typical ${structure.plainName.replace(' frame', '')} limit: ${kg(structure.maxMassKg)} (CubeSat spec, S01).`;
  if (!cube && limit) explanation += ` Model launch mass target: ${kg(limit)} (real Galileo FOC: ~700–733 kg).`;
  if (blocked) explanation += ` ${launcher.plainName} cannot deliver to ${orbit.plainName}.`;
  else if (capacity != null) explanation += ` ${launcher.plainName} headline capacity to this orbit: ${kg(capacity)}.`;
  else if (reaches) explanation += ` ${launcher.plainName} reaches this orbit; there is no single published capacity number for it, so the ${cube ? 'dispenser' : 'contracted profile'} sets the limit.`;
  if (cannotVerify.length) explanation += ` Cannot verify: no public mass for ${cannotVerify.join(', ')} — we never guess it.`;
  if (estimated.length) explanation += ` ≈ Estimated with the research SDR class mass: ${estimated.map((u) => u.plainName).join(', ')}.`;
  if (distractorUnknown.length) explanation += ` No mass in our data: ${distractorUnknown.map((u) => u.plainName).join(', ')}.`;
  if (!volume.ok) explanation += ` ⚠ The payload needs ${volume.used}U but the frame has only ${volume.available}U.`;

  // A large bus is checked against the model launch-mass target: at or below it is fine (not "tight").
  let status = !cube && structure && available === limit && limit != null && total <= limit + 1e-9 ? 'ok' : undefined;
  if (cannotVerify.length && !blocked) status = 'unknown';
  // A flown reference satellite with no published dispenser/limit: its real total flew → not a failure.
  if (reference && available == null && !cannotVerify.length && !blocked) status = 'ok';
  return bar('mass', 'Mass', 'kg', total, available, explanation, {
    status, blocked, parts, reserve, reserveFraction, propellant, limit, capacity, reaches, unknown: unknown.map((u) => u.id),
    cannotVerify, estimated: estimated.map((u) => u.id), reference: !!reference,
    dry: parts - propellant, volume, misfits: misfits.map((m) => m.id),
    payload: { used: payloadUnits, available: structure?.units ?? null, ok: volume.ok },
  });
}

// ─── Power (§8.2) ────────────────────────────────────────────────────────────
function computePower(sel) {
  const { components, orbit, scenario, left, reference, instruments } = sel;
  const pm = scenario?.powerModel ?? null;
  const load = pm?.avgLoadW ?? 0;
  const peak = pm?.peakLoadW ?? null;
  const src = components.power;
  if (reference) {
    return bar('power', 'Power', 'W', null, null,
      `${components.structure.plainName}: its own real power system flew and worked${reference.powerW ? ` (${watts(reference.powerW)} satellite)` : ''}. The research gives no array/load split for it, so we do not recompute it.`,
      { consumption: null, generation: null, peak: null, peakOk: null, margin: null, status: 'ok', reference: true });
  }
  // The most power-hungry payload must fit what the array gives in full sunlight (duty-cycled).
  const hungry = instruments.filter((i) => i.powerW != null).sort((a, b) => b.powerW - a.powerW)[0] ?? null;
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
  const payloadPeakOk = hungry ? hungry.powerW <= src.arrayW : null;
  const peakOk = peak == null ? payloadPeakOk : peak <= src.arrayW && payloadPeakOk !== false;
  if (peak != null) explanation += ` Peak load ${watts(peak)} vs array ${watts(src.arrayW)}: ${peak <= src.arrayW ? 'OK' : 'too high'}.`;
  if (hungry) explanation += ` ${hungry.plainName} draws ${watts(hungry.powerW)} when on; the array gives up to ${watts(src.arrayW)} in full sun${payloadPeakOk ? ' — it runs in bursts (duty cycle).' : ' — not enough even in full sunlight.'}`;
  if (generation != null && load > generation) explanation += ` You are ${num(load - generation, 2)} W short.`;
  const margin = generation ? 1 - load / generation : null;
  const status = generation == null ? 'unknown' : peakOk === false ? 'over' : undefined;
  return bar('power', 'Power', 'W', load, generation, explanation, { consumption: load, generation, peak, peakOk, payloadPeakOk, hungry: hungry?.id ?? null, hungryW: hungry?.powerW ?? null, margin, status });
}

// ─── Battery (§8.2) ──────────────────────────────────────────────────────────
function computeBattery(sel, load) {
  const { orbit, components, left, reference } = sel;
  if (reference) return bar('battery', 'Battery', 'Wh', null, null, 'Included in the real satellite — its battery flew and worked.', { needWh: null, usable: null, status: 'ok', reference: true });
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
  const { scenario, components, instruments, ground, orbit, left, roles } = sel;
  const kind = scenario?.data.kind ?? 'gb';
  const groundOk = ground ? groundServes(ground, scenario?.groundServes) : null;
  const groundBlocked = groundOk === false;
  const base = { kind, groundOk, contactHours: ground?.contactHoursPerDay ?? null };

  if (kind === 'gb') {
    const dl = components.downlink;
    const sensors = instruments.filter((i) => i.sensor);
    // Only the research radiometer has a data model (1–2 GB/day). Other sensors' rates are not public.
    const modelled = sensors.some((i) => i.id === 'payload_mw_radiometer');
    const rateUnknown = sel.reference || sensors.some((i) => i.id !== 'payload_mw_radiometer');
    const generated = modelled && !rateUnknown ? scenario.data.generatedGBperDay : rateUnknown ? null : 0;
    let downlink = null;
    let explanation = modelled && !rateUnknown ? `The radiometer makes about ${scenario.data.generatedText}.` : rateUnknown ? 'Data rate of this sensor is not public — the link cannot be measured, only checked for a complete chain.' : 'No atmosphere sensor — no measurements to send yet.';
    if (sel.reference) {
      const ok = groundOk === true;
      return bar('data', 'Data', 'GB/day', null, null, `${explanation} The real satellite's downlink is included.${ok ? '' : ' Pick a ground segment that receives science data.'}`,
        { ...base, status: groundBlocked ? 'blocked' : ok ? 'ok' : 'unknown', blocked: groundBlocked, generated: null, downlink: null, lostFraction: 0, deliveredFraction: null, chainOk: ok, rateUnknown: true });
    }
    if (dl?.requiresComms && components.comms?.id !== dl.requiresComms) {
      downlink = 0;
      explanation += ` ${dl.plainName} only works if the S-band transceiver is your control radio.`;
    } else if (groundBlocked) {
      downlink = 0;
      explanation += ` The ${ground.plainName} cannot receive or process weather measurements.`;
    } else if (left.has('downlink')) {
      downlink = 0;
      explanation += ' No science downlink: the data stays on board.';
    } else if (dl && ground && dl.rateMbps && ground.contactHoursPerDay != null) {
      const hours = ground.contactHoursPerDay;
      downlink = round((dl.rateMbps * hours * 3600) / 8 / 1000, 4);
      explanation += ` ${num(dl.rateMbps, 3)} Mbps × ${num(hours)} h of contact per day × 3600 / 8 / 1000 = ${gbDay(downlink)} — in theory, before protocol overheads, re-sends and station availability (the real figure is lower).`;
    } else if (dl && ground) {
      explanation += ` ${ground.plainName}: contact time per day is not public, so the daily volume cannot be computed.`;
    } else {
      explanation += ' Pick the science downlink and the ground station to see how much reaches Earth.';
    }
    if (dl?.needsXband) explanation += ' X-band: far faster than this data needs, and it needs an X-band ground station.';
    const lostFraction = downlink != null && generated > 0 ? Math.max(0, 1 - downlink / generated) : 0;
    const chainOk = !!dl && !left.has('downlink') && groundOk === true && !(dl.requiresComms && components.comms?.id !== dl.requiresComms);
    const unmeasured = (generated == null || downlink == null) && !!dl && !!ground;
    let status;
    if (unmeasured && !groundBlocked) status = chainOk ? 'unknown' : 'over';
    return bar('data', 'Data', 'GB/day', generated, downlink, explanation, { ...base, status, blocked: groundBlocked, generated, downlink, lostFraction, chainOk, rateUnknown: generated == null, unmeasured,
      deliveredFraction: generated > 0 && downlink != null ? Math.min(1, downlink / generated) : null });
  }

  // Packets (IoT) or navigation broadcast: judged as a complete chain, not GB/day.
  const inc = (cat) => sel.included.has(cat);
  const dl = components.downlink;
  const dlOk = inc('downlink') || (downlinkServes(dl, 'iot') && !(dl.requiresComms && components.comms?.id !== dl.requiresComms));
  const chain = kind === 'packets'
    ? [
      ['IoT radio + antennas', roles.has('iot_transceiver') && roles.has('iot_antenna')],
      ['packet memory (computer)', inc('computer') || !!components.computer?.storesPackets],
      ['packet downlink', dlOk],
      ['IoT gateways on Earth', groundOk === true],
    ]
    : [
      ['navigation signal + L-band antenna', roles.has('nav_signal') && roles.has('nav_antenna')],
      ['C-band uplink + S-band control', inc('comms') || components.comms?.id === 'ttc_c_s_band'],
      ['GNSS monitoring + time uplink on Earth', groundOk === true],
    ];
  const missing = chain.filter(([, ok]) => !ok).map(([name]) => name);
  const chosen = !!ground && (kind === 'packets' ? !!components.downlink || left.has('downlink') || inc('downlink') : !!components.comms || inc('comms'));
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
  const { componentList, instruments, launcher, deployer, ground, scenario, prep, reference, satsPerLaunch } = sel;
  const sid = scenario?.id;
  const cm = scenario?.costModel ?? { ait: 0, licensing: 0, ops: 0, reserve: 0 };
  // Add-ons that flew on a reference satellite are part of it (its price is not public either way).
  const items = [...componentList, ...instruments.filter((i) => !(reference && i.flewOn === sel.components.structure.id))];
  const hardware = round(items.reduce((a, it) => a + (costFor(it, sid) ?? 0), 0));
  // NOT PUBLIC prices: never guessed. They make the budget "uncertain" (not a fail).
  const unknownCost = items.filter((it) => it.cost == null).map((it) => it.id);
  const launchCost = launcher ? launchPrice(launcher, massKg, satsPerLaunch) : 0;
  const launchUnknown = launcher != null && launchCost == null;
  const groundUnknown = ground != null && ground.cost == null;
  const unknownItems = [...items.filter((it) => it.cost == null).map((it) => it.plainName), ...(launchUnknown ? [launcher.plainName] : []), ...(groundUnknown ? [ground.plainName] : [])];
  const uncertain = unknownItems.length > 0;
  const lines = [
    { id: 'hardware', label: 'Satellite hardware (build list)', value: hardware, dataKind: 'model', note: unknownCost.length ? `+ ${unknownCost.length} part${unknownCost.length > 1 ? 's' : ''} with no public price` : '' },
    { id: 'ait', label: 'Design, software, assembly & tests (AIT)', value: prep.tests ? cm.ait : 0, dataKind: 'model', note: prep.tests ? '' : 'tests not planned yet' },
    { id: 'launch', label: 'Launch service', value: launchUnknown ? null : launchCost, dataKind: launcher ? ({ published: 'catalog', rfq: 'rfq', reported: 'reported' }[launcher.costType] ?? 'model') : 'model',
      note: launchUnknown ? 'price on request (RFQ) — not counted' : launcher?.pairs && satsPerLaunch === 2 ? 'half of one launch: 2 satellites share it' : '' },
    { id: 'deployer', label: 'Dispenser / adapter & integration', value: deployer?.cost ?? 0, dataKind: 'model', note: deployer?.costNote ?? '' },
    { id: 'ground', label: 'Ground segment', value: groundUnknown ? null : ground?.cost ?? 0, dataKind: groundUnknown ? 'rfq' : 'model', note: groundUnknown ? 'price not public — not counted' : '' },
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
  if (uncertain) explanation += ` Budget uncertain: ${unknownItems.length} item${unknownItems.length > 1 ? 's have' : ' has'} no public price (${unknownItems.join(', ')}). Real engineers would request a quote (RFQ).`;
  explanation += ' All budget lines are educational estimates, not real quotes.';
  return bar('budget', 'Budget', '$M', used, available, explanation, {
    status, hardware, launch: launchCost, launchUnknown, lines, reserveLeft, plannedReserve, unknownCost, ops: cm.ops, uncertain, unknownItems,
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
  const { scenario } = sel;
  if (!scenario) return { key: 'science', label: 'Mission performance', value: 0, required: 1, ok: false, explanation: 'Pick a mission.' };
  const { needed, missing } = payloadNeeds(sel);
  const have = needed.length - missing.length;
  const payloadShare = needed.length ? have / needed.length : 0;
  const chain = data.deliveredFraction ?? (data.chainOk ? 1 : 0);
  const value = round(payloadShare * (data.status === 'unknown' ? 1 : chain));
  const explanation = `Mission payload ${have} of ${needed.length} required parts; data/service chain ${data.status === 'unknown' ? 'not measured' : pct(chain)}.`;
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
