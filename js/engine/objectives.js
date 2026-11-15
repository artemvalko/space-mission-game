// evaluateObjectives(state, sim) → [{ id, icon, label, met, why, kpi }] — PURE.
// Mission KPIs replace "science points" (research §8.5). Judged on what happened in the simulation;
// simulated output is always labelled as simulated in the UI.
//   comms:   packet delivery ≥95% of accepted test packets, ground contact, latency, power margin, safe deorbit
//   nav:     clock reference, ranging signal, orbit achieved/known, nav message  → satellite_success
//            constellation_success (≥4 visible satellites) is shown separately and can never be met by one satellite
//   weather: valid radiometer samples ≥90%, calibration, data delivered ≥95%, coverage, reference comparison
// Plus: service period, model budget, schedule.

import { ROLE_INFO, getInstrument } from '../data/instruments.js';
import { computeResources, getSelection, downlinkServes, payloadNeeds } from './resources.js';
import { money, months, pct } from '../utils/format.js';
import { evaluateDependencies } from './dependencies.js';

const MIN_VISIBLE_FOR_3D = 4; // research §1.1 / §4.5 (fact, S02)

/** Design-level facts every KPI needs. */
function designFacts(state, res) {
  const sel = getSelection(state);
  return { sel, roles: sel.roles, scenario: sel.scenario, res };
}

const kpi = (id, icon, label, met, why) => ({ id, icon, label, met: !!met, why, kpi: true });

export function evaluateObjectives(state, sim, res = computeResources(state)) {
  const { sel, roles, scenario } = designFacts(state, res);
  if (!scenario) return [];
  const s = sim.summary;
  const flew = sim.reachedOrbit && sim.outcome !== 'lost';
  const inc = (cat) => sel.included.has(cat) || !!sel.components[cat];
  const allowed = (o) => !!o && scenario.allowedOrbits.includes(o.id);
  const avail = s.serviceFraction ?? 0; // simulated share of the planned months with full service
  const out = [];

  if (scenario.id === 'mission_comms_iot') {
    const chain = res.data.chainOk;
    const delivery = flew && chain ? avail : 0;
    out.push(kpi('packet_delivery', 'mail', 'Packets delivered ≥95%', delivery >= scenario.data.target,
      `Simulated: ${pct(delivery)} of accepted test packets delivered (target 95%).${chain ? '' : ' The store-and-forward chain is incomplete.'}`));
    out.push(kpi('ground_contact', 'antenna', 'Ground contact (gateway passes)', flew && res.data.groundOk === true && (sel.included.has('downlink') || downlinkServes(sel.components.downlink, 'iot')),
      res.data.groundOk ? 'Gateways collect the stored packets on each pass.' : 'No IoT gateway receives the packets.'));
    out.push(kpi('latency', 'clock', 'Latency reported honestly', flew && chain,
      'One LEO satellite: a message waits until the next gateway pass — minutes to hours, not instant.'));
    out.push(kpi('power_margin', 'power', 'Power margin kept', flew && (res.power.reference || (res.power.margin != null && res.power.margin > 0)) && res.battery.status !== 'over',
      res.power.reference ? 'The real satellite\'s power system flew and worked.' : res.power.margin != null ? `Average ${pct(res.power.margin)} spare; battery ${res.battery.status === 'over' ? 'too small' : 'OK in the 35-min shadow'}.` : 'Power not known.'));
    out.push(kpi('safe_deorbit', 'recycle', 'Safe retirement plan', sel.prep.disposal && res.planet.valid, res.planet.valid ? res.planet.explanation : res.planet.whyNot || 'No disposal plan.'));
  } else if (scenario.id === 'mission_navigation_meo') {
    const thermalOk = inc('thermal');
    const clockName = sel.reference?.clocks ? getInstrument(sel.reference.clocks)?.plainName : sel.instruments.find((i) => i.role === 'atomic_clocks')?.plainName;
    out.push(kpi('clock_reference', 'clock', 'Clock reference OK', flew && roles.has('atomic_clocks') && thermalOk,
      roles.has('atomic_clocks') ? `${clockName ?? 'Atomic clocks'}${thermalOk ? ', kept at a stable temperature' : ' — but no thermal control'}.` : 'No atomic clocks: no precise reference time.'));
    out.push(kpi('ranging_signal', 'wave', 'Ranging signal OK', flew && roles.has('nav_signal') && roles.has('nav_antenna') && roles.has('atomic_clocks'),
      `Simulated signal availability ${pct(flew ? avail : 0)}.`));
    const lra = roles.has('lra');
    out.push(kpi('orbit_known', 'compass', 'Orbit achieved and known', flew && allowed(sel.orbit) && res.data.groundOk === true,
      allowed(sel.orbit) ? `${sel.orbit.plainName} reached; monitoring stations track it${lra ? ' — and lasers measure it to under 1 cm (LRA)' : ''}.` : 'Not in a navigation MEO orbit.'));
    out.push(kpi('nav_message', 'satellite', 'Navigation message uploaded', flew && res.data.chainOk,
      res.data.chainOk ? 'The ground uploads clock and orbit corrections; the satellite broadcasts them.' : `Chain incomplete: ${res.data.missing?.join(', ')}.`));
  } else {
    const { missing } = payloadNeeds(sel);
    const sensorOk = !missing.includes('atmo_sensor');
    const calOk = !missing.includes('calibration');
    const valid = flew && sensorOk && calOk ? avail : 0;
    out.push(kpi('valid_samples', 'cloud', 'Valid observations ≥90%', valid >= scenario.data.validTarget,
      `Simulated: ${pct(valid)} of planned observations valid (target 90%).`));
    const needsCal = payloadNeeds(sel).needed.includes('calibration');
    out.push(kpi('calibration', 'sliders', 'Calibration OK', flew && calOk && inc('thermal'),
      !needsCal ? (sel.reference ? 'Part of the flown instrument.' : 'This sensor needs no separate calibration module (radar / GNSS-RO).') : roles.has('calibration') ? 'On-board calibration + stable temperatures.' : 'No calibration: absolute temperatures cannot be trusted.'));
    const measured = res.data.deliveredFraction;
    const delivered = flew ? measured ?? (res.data.chainOk ? 1 : 0) : 0;
    out.push(kpi('data_delivered', 'signal', 'Data delivered ≥95%', delivered >= scenario.data.deliveredTarget,
      measured != null ? `The link can send ${pct(measured)} of the daily data (theoretical, before overheads).` : res.data.chainOk ? 'Not measured: a data rate or contact time is not public — the downlink chain is complete.' : 'No working downlink chain.'));
    const COVER = { sso_550_650: 'SSO: the whole Earth at the same local time.', leo_550_32deg: '32°: frequent tropical revisits, no poles.', iss_400_516: 'ISS orbit: no poles; decays sooner.', leo_550: 'LEO: covers the latitudes of its tilt.' };
    out.push(kpi('coverage', 'globe', 'Coverage', flew && allowed(sel.orbit) && (sel.included.has('sensors') || !!sel.components.sensors || !!sel.components.computer?.providesGnss),
      allowed(sel.orbit) ? `${COVER[sel.orbit.id] ?? ''} Samples are geolocated.` : 'Not an orbit this mission can use.'));
    out.push(kpi('reference_comparison', 'chart', 'Compared with NASA GPM', flew && res.data.groundOk === true && delivered > 0,
      'The processing chain compares the (simulated) measurements with the real NASA GPM IMERG reference.'));
  }

  // The chosen goal (objective variant): judged by the dependency matrix — a physically valid build for the
  // wrong goal flies (engineering GO) but does NOT meet this goal, with the reason.
  const goal = goalObjective(sel);
  if (goal) out.push(goal);

  // Service period
  if (scenario.minMonths) {
    out.push({ id: 'lifetime', icon: 'hourglass', label: `Works ≥${scenario.minMonths} months`, met: flew && s.monthsOperated >= scenario.minMonths,
      why: `Worked ${months(s.monthsOperated)}; the mission needs at least ${months(scenario.minMonths)}.` });
  }
  // Model budget
  const spent = res.budget.used + (s.extraCostM ?? 0);
  out.push({ id: 'budget', icon: 'money', label: 'Inside the model budget', met: spent <= scenario.budgetM + 1e-9,
    why: `Spent ${money(spent)} of ${money(scenario.budgetM)}${s.extraCostM ? ` (incl. ${money(s.extraCostM)} of reserve used in flight)` : ''}${res.budget.launchUnknown ? '; launch price on request (not counted)' : ''}.` });
  // Schedule window
  if (scenario.deadlineMonths) {
    const [lo, hi] = scenario.deadlineMonths;
    const ready = lo + (s.delayMonths ?? 0);
    out.push({ id: 'deadline', icon: 'calendar', label: `Ready within ${lo}–${hi} months`, met: ready <= hi,
      why: `Planned ready at month ${lo}${s.delayMonths ? ` + ${s.delayMonths} months of delay` : ''}; window ends at month ${hi}.` });
  }
  return out;
}

/** "Meets the goal: …" from the dependency matrix (not a KPI). met only when every goal rule is satisfied. */
export function goalObjective(sel) {
  const v = sel.variant;
  if (!v) return null;
  const deps = evaluateDependencies(sel);
  const VERDICT_WHY = { met: 'This design has what the goal needs.', todo: 'Not chosen yet.' };
  return { id: 'goal', icon: v.icon, label: `Meets the goal: ${v.label}`, met: deps.verdict === 'met', verdict: deps.verdict,
    why: deps.reasons.length ? deps.reasons.join(' ') : VERDICT_WHY[deps.verdict] ?? '' };
}

/** satellite_success: all mission KPIs met (one satellite doing its own job). */
export function satelliteSuccess(objectives) {
  const k = objectives.filter((o) => o.kpi);
  return k.length > 0 && k.every((o) => o.met);
}

/**
 * constellation_success (navigation): a 3D position needs ≥4 satellites visible at once.
 * Never achievable with one satellite — shown as "what the full constellation would add".
 */
export function constellationStatus(visibleSatellites = 1) {
  const met = visibleSatellites >= MIN_VISIBLE_FOR_3D;
  return {
    id: 'constellation_success', met, visibleSatellites, needed: MIN_VISIBLE_FOR_3D,
    why: met ? `${visibleSatellites} satellites in view: a receiver can solve 3 coordinates + its clock error.`
      : `Only ${visibleSatellites} satellite${visibleSatellites === 1 ? '' : 's'} in view: a receiver needs at least ${MIN_VISIBLE_FOR_3D} at the same time for a 3D position.`,
  };
}

/**
 * Check a claim a player (or customer) might make about one satellite — research's "impossible claims".
 * Returns { id, met: false|true, why }.
 */
export function checkClaim(state, claimId) {
  const sel = getSelection(state);
  switch (claimId) {
    case 'global_24_7':
      return { id: claimId, met: false, why: 'One LEO satellite sees a place for a few minutes per pass; 24/7 worldwide service needs a constellation.' };
    case 'global_3d_fix':
      return { ...constellationStatus(1), id: claimId };
    case 'climate_trend':
      return { id: claimId, met: false, why: 'An 18–24-month demonstration cannot prove a decades-long climate trend; that needs long calibrated records or a constellation.' };
    case 'hourly_cyclone_revisit':
      return { id: claimId, met: false, why: `One satellite in ${sel.orbit?.plainName ?? 'SSO'} cannot see every tropical storm every hour. NASA TROPICS used a low-inclination constellation for frequent revisits.` };
    default:
      return { id: claimId, met: false, why: 'Unknown claim.' };
  }
}

export { ROLE_INFO };

/**
 * How well this design fits the chosen objective variant (0–1). Only the mission-performance part of
 * the score uses it: a physically valid but less suitable build is never a failure.
 */
export function variantFit(state) {
  const sel = getSelection(state);
  const v = sel.variant;
  if (!v) return { value: 1, variant: null, parts: [] };
  const sensor = sel.instruments.find((i) => i.sensor)?.id ?? sel.reference?.sensor ?? null;
  const language = sel.reference?.language ?? sel.instruments.find((i) => i.role === 'iot_transceiver')?.language ?? null;
  const clockId = sel.reference?.clocks ?? sel.instruments.find((i) => i.role === 'atomic_clocks')?.id ?? null;
  const clock = clockId === 'clock_phm_rubidium_4' ? 'phm_rafs' : clockId ? getInstrument(clockId)?.clockType ?? null : null;
  const pick = { orbit: sel.orbit?.id, sensor, structure: sel.components.structure?.id, language, clock };
  const parts = v.fit.map((f) => {
    const option = pick[f.dim] ?? null;
    return { dim: f.dim, option, factor: option != null && f.map[option] != null ? f.map[option] : f.other };
  });
  const value = parts.length ? parts.reduce((a, p) => a + p.factor, 0) / parts.length : 1;
  return { value, variant: v, parts };
}
