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

import { COMPONENT_CATEGORIES, NONE, getComponent, costFor, isCubeSat, EUR_TO_USD, EUR_RATE_LABEL } from '../data/components.js';
import { getInstrument } from '../data/instruments.js';
import { getOrbit } from '../data/orbits.js';
import { getLauncher, getDeployer, launchPrice } from '../data/launchers.js';
import { getScenario, variantOf } from '../data/scenarios.js';
import { INCLUDED_IN_REFERENCE } from '../data/bundles.js';
import { DISPOSAL_STRATEGIES, DOCKING_PLATE, PLANET_MAX, LOW_ORBITS, HIGH_ORBITS, al2o3Kg, EMISSION_BADGE, dragSailFor, SAIL_EFFECT } from '../data/disposal.js';
import { getGroundStation } from '../data/groundStations.js';
import { missionPayloadNeeds, groundRuleOk } from './dependencies.js';

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
    disposalId: d.disposalId ?? null,
    dockingPlate: d.dockingPlate === true,
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

/** Normalised validity of one check (CLARITY P0.3): unknown is never a silent pass. */
export const VALIDITY = ['pass', 'fail', 'unverified', 'n/a'];

/**
 * Price of an item in $M (CLARITY P0.7): { value, kind, from?, fromName?, note? } — an unknown price is never 0.
 *   known     = research model / catalog / published price
 *   converted = euro catalog price at the one fixed game rate (EUR_TO_USD, labelled)
 *   estimate  = ROUGH: copied from the closest SAME-ROLE item with a known price (`estimatedFrom`) — badge ESTIMATE
 *   unknown   = no public price and no same-role analog → "?" (budget uncertain)
 */
export function priceOf(item, scenarioId = null) {
  if (!item) return { value: 0, kind: 'known' };
  const c = costFor(item, scenarioId);
  if (c != null) return { value: c, kind: 'known' };
  if (item.priceEUR != null) return { value: round(item.priceEUR * EUR_TO_USD), kind: 'converted', note: EUR_RATE_LABEL };
  if (item.estimatedFrom) {
    const a = getComponent(item.estimatedFrom) ?? getInstrument(item.estimatedFrom);
    const ap = a ? priceOf(a, scenarioId) : null;
    if (ap?.value != null && ap.kind !== 'estimate') return { value: ap.value, kind: 'estimate', from: a.id, fromName: `${a.plainName}${a.dataKind === 'model' ? ' model' : ''}` };
  }
  return { value: null, kind: 'unknown' };
}

/** Cheapest of a list (Compare tables): unknown prices never win; an estimate within 20% → "too close to call". */
export function cheapestOf(items, scenarioId = null) {
  const priced = items.filter((it) => 'cost' in it && priceOf(it, scenarioId).value != null).sort((a, b) => priceOf(a, scenarioId).value - priceOf(b, scenarioId).value);
  if (priced.length < 2) return { item: null, note: '' };
  const c = cheaperOf(priced[0], priced[1], scenarioId);
  if (c.why === 'too_close') return { item: null, note: 'too close to call: estimate' };
  return c.winner ? { item: c.winner, note: 'cheapest' } : { item: null, note: '' };
}

/**
 * Which of two items is cheaper? Unknown never wins; an estimate cannot beat a known price by less than 20%.
 * → { winner: a | b | null, why: 'cheaper' | 'unknown' | 'too_close' | 'same' }
 */
export function cheaperOf(a, b, scenarioId = null) {
  const pa = priceOf(a, scenarioId);
  const pb = priceOf(b, scenarioId);
  if (pa.value == null || pb.value == null) return { winner: pa.value == null && pb.value != null ? b : pb.value == null && pa.value != null ? a : null, why: 'unknown' };
  if (Math.abs(pa.value - pb.value) < 1e-12) return { winner: null, why: 'same' };
  const [lo, hi, plo, phi] = pa.value < pb.value ? [a, b, pa, pb] : [b, a, pb, pa];
  if ((plo.kind === 'estimate' || phi.kind === 'estimate') && (phi.value - plo.value) / phi.value < 0.2) return { winner: null, why: 'too_close' };
  return { winner: lo, why: 'cheaper', loser: hi };
}

/**
 * The payload roles this design must have, and which are missing.
 * Weather: any atmosphere sensor; a passive radiometer (part build) also needs calibration — radar and
 * GNSS-RO do not (options §3.1: GNSS-RO "needs no calibration").
 */
export function payloadNeeds(sel) {
  const { scenario, instruments, reference } = sel;
  if (!scenario) return { needed: [], missing: [] };
  // The mission dependency matrix decides (data/missionDependencies.js) — one source of truth.
  const { needed, missing } = missionPayloadNeeds(sel);
  const sensors = [...instruments.filter((i) => i.sensor), ...(reference?.sensor ? [getInstrument(reference.sensor)] : [])];
  return { needed, missing, sensors };
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
  // The drag sail is sized from the satellite mass (HPS ADEO, D09) and added after the design reserve.
  const sailPart = componentList.find((c) => c.autoSized);
  const items = (reference
    ? [...componentList.filter((c) => c !== structure), ...instruments.filter((i) => i.flewOn !== structure.id)]
    : [...componentList, ...instruments]).filter((c) => c !== sailPart && !c.afterReserve);
  const afterReserve = componentList.filter((c) => c.afterReserve);
  const unknown = items.filter((it) => massOf(it) == null && it.formFactor !== 'any');
  const distractorUnknown = items.filter((it) => massOf(it) == null && it.formFactor === 'any');
  const estimated = items.filter((it) => it.mass == null && massOf(it) != null);
  const parts = round(items.reduce((a, it) => a + (massOf(it) ?? 0), 0) + (reference?.totalMassKg ?? 0));
  const cube = isCubeSat(structure);
  const reserveFraction = structure && !reference ? (structure.reserveFraction ?? (cube ? MASS_RESERVE_6U : 0)) : 0;
  const reserve = round(parts * reserveFraction);
  const satKg = round(parts + reserve);
  const sail = sailPart ? dragSailFor(satKg, structure) : null;
  const addOnKg = afterReserve.reduce((a, c) => a + c.mass, 0);
  const total = round(satKg + (sail?.massKg ?? 0) + addOnKg);
  const tooSmallFor = afterReserve.filter((c) => c.minUnits && structure?.units != null && structure.units < c.minUnits).map((c) => c.plainName);
  const propellant = components.propellant?.mass ?? 0;
  const limit = structure ? (cube ? structure.maxMassKg ?? null : structure.targetMassKg ?? null) : null;
  const { reaches, capacity: cap1 } = launcherReach(launcher, orbit);
  // Two satellites on one launch share its capacity.
  const capacity = cap1 != null && launcher?.pairs && satsPerLaunch === 2 ? cap1 / 2 : cap1;
  // "Cannot verify": a part with no public mass, or a frame with no public limit (never guessed).
  const cannotVerify = unknown.map((u) => u.plainName);
  if (structure && cube && !reference && structure.maxMassKg == null) cannotVerify.push(`${structure.plainName} mass limit`);

  // Volume (CLARITY P0.4): the WHOLE satellite — payload + bus + radios + add-ons — against the frame's units.
  // Only published sizes count (radiometer ~4U S07, TROPICS 1U, RainCube 4.5U); a part with no published size
  // is never 0U: the check becomes "unverified". A reference build is its whole real satellite (its size is known).
  const payloadUnits = instruments.reduce((a, i) => a + (i.volumeU ?? 0), 0);
  const volParts = [...items, ...afterReserve, ...(sailPart ? [sailPart] : [])].filter((it) => it !== structure && it.mass !== 0);
  const knownUnits = round(volParts.reduce((a, it) => a + (it.volumeU ?? 0), 0));
  const noSize = volParts.filter((it) => it.volumeU == null);
  // CRITICAL = the mission's own measuring instrument has no published size (it drives the layout).
  // Non-critical = bus boards, radios and small payload electronics: noted, never downgrade GO.
  const critSize = noSize.filter((it) => instruments.includes(it) && it.sensor && it.category === 'service_payload');
  const units = structure?.units ?? null;
  const volValidity = !structure || units == null ? 'n/a' : knownUnits > units + 1e-9 ? 'fail' : noSize.length ? 'unverified' : 'pass';
  const volume = { used: knownUnits, available: units, ok: volValidity !== 'fail', validity: volValidity, critical: volValidity === 'unverified' && critSize.length > 0, unknownParts: noSize.map((it) => it.plainName), criticalParts: critSize.map((it) => it.plainName),
    explanation: volValidity === 'unverified' ? `Volume not verified: ${noSize.length} part${noSize.length > 1 ? 's have' : ' has'} no published size (never counted as 0U).${knownUnits ? ` Known: ${num(knownUnits)}U of ${num(units)}U.` : ''}`
      : volValidity === 'fail' ? `Parts with a published size already need ${num(knownUnits)}U; the frame has ${num(units)}U.`
        : volValidity === 'pass' ? (reference ? `Whole real satellite: ${num(units)}U.` : `${num(knownUnits)}U of ${num(units)}U.`) : '' };
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
  if (addOnKg) explanation += ` + ${afterReserve.map((c) => `${c.plainName} ${kg(c.mass)}`).join(', ')} (vendor mass).`;
  if (sail) explanation += ` + ${sail.name} drag sail ${kg(sail.massKg)} (HPS, D09).`;
  if (sailPart && !sail) explanation += ` No ADEO drag sail fits a ${kg(satKg)} satellite (1–50 kg).`;
  if (!volume.ok) explanation += ` ⚠ The payload needs ${volume.used}U but the frame has only ${volume.available}U.`;
  else if (volume.validity === 'unverified') explanation += ` ${volume.explanation}`;

  // A large bus is checked against the model launch-mass target: at or below it is fine (not "tight").
  let status = !cube && structure && available === limit && limit != null && total <= limit + 1e-9 ? 'ok' : undefined;
  if (cannotVerify.length && !blocked) status = 'unknown';
  // A flown reference satellite with no published dispenser/limit: its real total flew → not a failure.
  if (reference && available == null && !cannotVerify.length && !blocked) status = 'ok';
  const overNow = blocked || (status !== 'unknown' && available != null && total > available + 1e-9);
  const validity = !structure ? 'n/a' : overNow ? 'fail' : cannotVerify.length ? 'unverified' : 'pass';
  return bar('mass', 'Mass', 'kg', total, available, explanation, {
    status, blocked, validity, critical: validity === 'unverified', parts, reserve, reserveFraction, propellant, limit, capacity, reaches, unknown: unknown.map((u) => u.id),
    cannotVerify, estimated: estimated.map((u) => u.id), reference: !!reference, sail: sail ? { id: sail.id, name: sail.name, massKg: sail.massKg } : null, sailMisfit: !!sailPart && !sail, tooSmallFor,
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
      { consumption: null, generation: null, peak: null, peakOk: null, margin: null, status: 'ok', reference: true, validity: 'pass' });
  }
  // The most power-hungry payload must fit what the array gives in full sunlight (duty-cycled).
  const hungry = instruments.filter((i) => i.powerW != null).sort((a, b) => b.powerW - a.powerW)[0] ?? null;
  if (!src) {
    return bar('power', 'Power', 'W', load || null, null,
      `Planned average load: ${watts(load)}${pm ? ' (mission duty-cycle model)' : ''}. Choose a solar array.`,
      { consumption: load, generation: null, peak, peakOk: null, missing: left.has('power'), validity: left.has('power') ? 'fail' : 'n/a' });
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
  // No generation number in a chosen orbit = a CubeSat array far from home (a NO-GO in validation), not "unverified".
  const validity = !orbit ? 'n/a' : generation == null ? 'fail' : peakOk === false || load > generation + 1e-9 ? 'fail' : 'pass';
  return bar('power', 'Power', 'W', load, generation, explanation, { consumption: load, generation, peak, peakOk, payloadPeakOk, hungry: hungry?.id ?? null, hungryW: hungry?.powerW ?? null, margin, status, validity });
}

// ─── Battery (§8.2) ──────────────────────────────────────────────────────────
function computeBattery(sel, load) {
  const { orbit, components, left, reference } = sel;
  if (reference) return bar('battery', 'Battery', 'Wh', null, null, 'Included in the real satellite — its battery flew and worked.', { needWh: null, usable: null, status: 'ok', reference: true, validity: 'pass' });
  const battery = components.battery;
  const eclipseH = orbit?.eclipseMinutes != null ? orbit.eclipseMinutes / 60 : null;
  const needWh = eclipseH != null ? round(load * eclipseH, 4) : null;
  const usable = battery ? battery.capacityWh * BATTERY_DOD : left.has('battery') ? 0 : null;
  let explanation;
  if (!orbit) explanation = 'Pick an orbit to find out how long the satellite sits in shadow.';
  else if (eclipseH == null) explanation = `Not verified: the research gives no single eclipse length for ${orbit.plainName} (it changes with the season). The battery is on board, but its shadow time cannot be checked.`;
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
  else if (battery && needWh == null && orbit) status = 'unknown'; // unknown eclipse: never a silent "ok"
  const validity = left.has('battery') ? 'fail' : !battery || !orbit ? 'n/a' : needWh == null ? 'unverified' : needWh > usable + 1e-9 ? 'fail' : 'pass';
  return bar('battery', 'Battery', 'Wh', needWh, usable, explanation, { needWh, usable, status, missing: left.has('battery'), validity, critical: validity === 'unverified' });
}

// ─── Data (§8.4) ─────────────────────────────────────────────────────────────
const SERVE_NAME = { iot: 'IoT gateways', gnss: 'GNSS monitoring network', weather: 'science receiving station' };

function computeData(sel) {
  const { scenario, components, instruments, ground, orbit, left, roles } = sel;
  const kind = scenario?.data.kind ?? 'gb';
  const groundOk = groundRuleOk(sel); // the dependency matrix decides which network serves this mission
  const groundBlocked = groundOk === false;
  const base = { kind, groundOk, contactHours: ground?.contactHoursPerDay ?? null };

  if (kind === 'gb') {
    const dl = components.downlink;
    const sensors = instruments.filter((i) => i.sensor);
    // Data made per day comes from the CHOSEN instrument (CLARITY P0.6): its research data model if the research
    // gives one (TEMPEST-D-class radiometer: 1–2 GB/day after compression), else dataKbps × 86,400 s × duty cycle
    // (100% unless the data says otherwise; simulated). No rate in our data → unverified, never 0.
    const made = sensors.map((i) => (i.dataGBperDay != null ? { ins: i, gb: i.dataGBperDay, how: `${i.plainName}: about ${i.dataText}` }
      : i.dataKbps != null ? { ins: i, gb: round((i.dataKbps * 1000 * 86400 * (i.dutyCycle ?? 1)) / 8 / 1e9, 6), how: `${i.plainName}: ${num(i.dataKbps)} kbps × 86,400 s × ${pct(i.dutyCycle ?? 1)} duty (simulated)` }
        : { ins: i, gb: null, how: `${i.plainName}: data rate not in our data` }));
    const rateUnknown = !!sel.reference || made.some((m) => m.gb == null);
    const generated = !sensors.length ? 0 : rateUnknown ? null : round(made.reduce((a, m) => a + m.gb, 0), 6);
    let downlink = null;
    let explanation = !sensors.length ? 'No atmosphere sensor — no measurements to send yet.'
      : rateUnknown ? `${made.filter((m) => m.gb == null).map((m) => m.how).join('; ') || 'Data rate not public'} — the link cannot be measured (unverified), only checked for a complete chain.`
        : `Data made: ${made.map((m) => `${m.how} = ${gbDay(m.gb)}`).join('; ')}.${made.some((m) => m.ins.dataKbps && m.ins.dataGBperDay) ? made.filter((m) => m.ins.dataKbps && m.ins.dataGBperDay).map((m) => ` (The bare instrument stream is ${num(m.ins.dataKbps)} kbps = ${gbDay((m.ins.dataKbps * 1000 * 86400) / 8 / 1e9)}.)`).join('') : ''}`;
    if (sel.reference) {
      const ok = groundOk === true;
      return bar('data', 'Data', 'GB/day', null, null, `${explanation} The real satellite's downlink is included.${ok ? '' : ' Pick a ground segment that receives science data.'}`,
        { ...base, status: groundBlocked ? 'blocked' : ok ? 'ok' : 'unknown', blocked: groundBlocked, generated: null, downlink: null, lostFraction: 0, deliveredFraction: null, chainOk: ok, rateUnknown: true,
          validity: groundBlocked ? 'fail' : ok ? 'pass' : 'n/a' }); // the real satellite's downlink flew and delivered
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
    const over = groundBlocked || status === 'over' || (status == null && generated > 0 && downlink != null && downlink < generated);
    const validity = over ? 'fail' : unmeasured && chainOk ? 'unverified' : generated > 0 && downlink != null ? 'pass' : 'n/a';
    return bar('data', 'Data', 'GB/day', generated, downlink, explanation, { ...base, status, validity, critical: validity === 'unverified', blocked: groundBlocked, generated, downlink, lostFraction, chainOk, rateUnknown: generated == null, unmeasured,
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
    ...base, status, validity: status === 'ok' ? 'pass' : status === 'over' ? 'fail' : 'n/a', blocked: groundBlocked, chain, chainOk, missing, generated: 0, downlink: null, lostFraction: chainOk ? 0 : chosen ? 1 : 0,
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
  // Known prices + euro catalog prices (fixed rate) + ROUGH same-role estimates (CLARITY P0.6) are counted.
  // NOT PUBLIC prices with no same-role analog are never guessed: they make the budget "uncertain" (never $0).
  const priced = items.map((it) => ({ it, p: priceOf(it, sid) }));
  const hardware = round(priced.reduce((a, x) => a + (x.p.value ?? 0), 0));
  const unknownCost = priced.filter((x) => x.p.kind === 'unknown').map((x) => x.it.id);
  const estimatedItems = priced.filter((x) => x.p.kind === 'estimate').map((x) => ({ id: x.it.id, name: x.it.plainName, value: x.p.value, from: x.p.from, fromName: x.p.fromName }));
  const converted = priced.filter((x) => x.p.kind === 'converted').map((x) => x.it.plainName);
  const launchCost = launcher ? launchPrice(launcher, massKg, satsPerLaunch) : 0;
  const launchUnknown = launcher != null && launchCost == null;
  const groundUnknown = ground != null && ground.cost == null;
  const unknownItems = [...priced.filter((x) => x.p.kind === 'unknown').map((x) => x.it.plainName), ...(launchUnknown ? [launcher.plainName] : []), ...(groundUnknown ? [ground.plainName] : []),
    ...(sel.dockingPlate ? [DOCKING_PLATE.plainName] : [])];
  const uncertain = unknownItems.length > 0;
  const lines = [
    { id: 'hardware', label: 'Satellite hardware (build list)', value: hardware, dataKind: 'model',
      note: [estimatedItems.length ? `incl. ≈ ${money(estimatedItems.reduce((a, e) => a + e.value, 0))} rough estimates` : '', unknownCost.length ? `+ ${unknownCost.length} part${unknownCost.length > 1 ? 's' : ''} with no public price` : ''].filter(Boolean).join('; ') },
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
  if (estimatedItems.length) explanation += ` Rough estimates (copied from a same-role item with a known price, not a quote): ${estimatedItems.map((e) => `${e.name} ≈ ${money(e.value)} (like: ${e.fromName})`).join(', ')}.`;
  if (converted.length) explanation += ` Euro prices converted at ${EUR_RATE_LABEL}: ${converted.join(', ')}.`;
  if (uncertain) explanation += ` Budget uncertain: ${unknownItems.length} item${unknownItems.length > 1 ? 's have' : ' has'} no public price (${unknownItems.join(', ')}). Real engineers would request a quote (RFQ).`;
  explanation += ' All budget lines are educational estimates, not real quotes.';
  // Program status (CLARITY P0.7): OVER beats UNCERTAIN beats ESTIMATED beats FUNDED. Known (+ estimated) costs
  // over the budget → OVER; remaining "?" prices → UNCERTAIN; any rough estimate → ESTIMATED.
  const program = available == null ? null : status === 'over' ? 'over' : uncertain ? 'uncertain' : estimatedItems.length ? 'estimated' : 'funded';
  return bar('budget', 'Budget', '$M', used, available, explanation, {
    status, hardware, program, estimatedItems, estimated: estimatedItems.length > 0, launch: launchCost, launchUnknown, lines, reserveLeft, plannedReserve, unknownCost, ops: cm.ops, uncertain, unknownItems,
  });
}

// ─── Planet impact of the end-of-life choice (DISPOSAL.md) ──────────────────
/** Why a disposal strategy is impossible for this design ('' = valid). */
export function disposalWhyNot(strategyId, sel) {
  const { orbit, components, included } = sel;
  const cube = isCubeSat(components.structure);
  const high = orbit && HIGH_ORBITS.includes(orbit.id);
  const hasProp = (!!components.propulsion && !!components.propellant) || included.has('propulsion');
  if (strategyId === 'disp_leave_in_orbit') {
    if (orbit && LOW_ORBITS.includes(orbit.id)) return 'Breaks the 5-year rule in low orbit (S22).';
    if (high && !hasProp) return 'A disposal orbit needs thrusters and propellant.';
  }
  if (strategyId === 'disp_controlled_ocean') {
    if (cube && components.eol?.deorbitThruster) return 'Ion thrust is far too low: needs high-thrust engines (D05).';
    if (cube) return 'Needs thrusters + fuel. CubeSats in this game have none (D05).';
    if (high) return 'Not in our data: needs far more propellant than this design carries.';
  }
  if (strategyId === 'disp_burn_up' && high) return 'Air never pulls MEO satellites down.';
  return '';
}

/** Default strategy when only the old "disposal plan" flag is set (keeps older designs working). */
const defaultDisposal = (sel) => (sel.orbit && HIGH_ORBITS.includes(sel.orbit.id) ? 'disp_leave_in_orbit' : 'disp_burn_up');

/** Planet-impact meters (0..max) for one strategy: debris, atmosphere, ground. Game scores, not data. */
function planetMeters(strategyId, sel, massKg) {
  const cube = isCubeSat(sel.components.structure);
  const eol = sel.components.eol?.id;
  const plate = sel.dockingPlate ? 3 : 0; // a future tug can remove it
  if (strategyId === 'disp_burn_up') {
    // Faster decay (ISS orbit, drag sail, broadside) = fewer years as debris first.
    // Best: an ion thruster lowers the orbit on command; then sail / broadside / the low ISS orbit; slowest: natural decay.
    const fast = sel.orbit?.id === 'iss_400_516' || eol === 'eol_drag_sail' || eol === 'eol_attitude_drag';
    const base = eol === 'eol_nano_thruster' ? 14 : fast ? 12 : 9;
    return { debris: Math.min(PLANET_MAX.debris, base + plate), atmosphere: 5, ground: cube ? 10 : 3, groundRisk: cube ? 'ok' : 'needs-controlled', kg: al2o3Kg(massKg) };
  }
  if (strategyId === 'disp_controlled_ocean') return { debris: 15, atmosphere: 6, ground: 10, groundRisk: 'ok', kg: al2o3Kg(massKg) };
  return { debris: Math.min(PLANET_MAX.debris, 3 + plate * (5 / 3)), atmosphere: 15, ground: 10, groundRisk: 'n.a.', kg: 0 };
}

function computePlanet(sel, mass) {
  const chosen = sel.disposalId ?? (sel.prep.disposal ? defaultDisposal(sel) : null);
  const whyNot = chosen ? disposalWhyNot(chosen, sel) : '';
  const m = chosen ? planetMeters(chosen, sel, mass.used) : null;
  const options = DISPOSAL_STRATEGIES.map((d) => {
    const reason = disposalWhyNot(d.id, sel);
    const pm = planetMeters(d.id, sel, mass.used);
    return { id: d.id, valid: !reason, reason, ...pm, score: pm.debris + pm.atmosphere + pm.ground };
  });
  const best = Math.max(0, ...options.filter((o) => o.valid).map((o) => o.score));
  const fleet = sel.reference?.fleet ?? null;
  const score = m && !whyNot ? m.debris + m.atmosphere + m.ground : 0;
  let explanation = !chosen ? 'Choose how your satellite retires.'
    : whyNot ? whyNot
      : chosen === 'disp_leave_in_orbit' ? 'It stays in space: one more object to track, but nothing burns or falls.'
        : `${sel.components.eol?.id === 'eol_drag_sail' ? `${SAIL_EFFECT.text} ` : sel.components.eol?.deorbitThruster ? 'Lowers its orbit on command: meets the 5-year rule. ' : ''}It burns up: ≈ ${num(m.kg, 1)} kg of aluminium oxide (${EMISSION_BADGE}).`;
  if (chosen && !whyNot && m.kg && fleet) explanation += ` If all ${fleet} satellites burn up: ≈ ${num(m.kg * fleet, 1)} kg.`;
  return {
    key: 'planet', label: 'Planet impact', strategyId: chosen, valid: !!chosen && !whyNot, whyNot,
    debrisScore: m && !whyNot ? m.debris : 0, atmosphereKg: m ? m.kg : null, groundRisk: m?.groundRisk ?? null,
    meters: m && !whyNot ? { debris: m.debris, atmosphere: m.atmosphere, ground: m.ground } : null,
    score, max: PLANET_MAX.debris + PLANET_MAX.atmosphere + PLANET_MAX.ground, best, options,
    fleet, fleetKg: m && fleet ? m.kg * fleet : null, dockingPlate: sel.dockingPlate,
    ok: !whyNot, explanation, emissionBadge: EMISSION_BADGE, sources: ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'S22', 'O55'],
  };
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
  const planet = computePlanet(sel, mass);
  const health = { key: 'health', label: 'Reliability', value: null, ok: true, explanation: 'No reliability percentages: the research has no real numbers for them (§8.6).' };
  return { mass, power, battery, data, budget, time, lifetime, health, launch, science, planet };
}

export const BAR_KEYS = ['mass', 'power', 'battery', 'data', 'budget'];
export const NUMBER_KEYS = ['lifetime', 'launch', 'science'];
