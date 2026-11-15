// evaluateObjectives(state, sim) → [{ id, icon, label, met, why, kpi }] — PURE.
// Mission KPIs replace "science points" (research §8.5). Judged on what happened in the simulation;
// simulated output is always labelled as simulated in the UI.
//   comms:   packet delivery ≥95% of accepted test packets, ground contact, latency, power margin, safe deorbit
//   nav:     clock reference, ranging signal, orbit achieved/known, nav message  → satellite_success
//            constellation_success (≥4 visible satellites) is shown separately and can never be met by one satellite
//   weather: valid radiometer samples ≥90%, calibration, data delivered ≥95%, coverage, reference comparison
// Plus: service period, model budget, schedule.

import { ROLE_INFO } from '../data/instruments.js';
import { computeResources, getSelection } from './resources.js';
import { money, months, pct } from '../utils/format.js';

const MIN_VISIBLE_FOR_3D = 4; // research §1.1 / §4.5 (fact, S02)

/** Design-level facts every KPI needs. */
function designFacts(state, res) {
  const sel = getSelection(state);
  const roles = new Set(sel.instruments.map((i) => i.role));
  return { sel, roles, scenario: sel.scenario, res };
}

const kpi = (id, icon, label, met, why) => ({ id, icon, label, met: !!met, why, kpi: true });

export function evaluateObjectives(state, sim, res = computeResources(state)) {
  const { sel, roles, scenario } = designFacts(state, res);
  if (!scenario) return [];
  const s = sim.summary;
  const flew = sim.reachedOrbit && sim.outcome !== 'lost';
  const avail = s.serviceFraction ?? 0; // simulated share of the planned months with full service
  const out = [];

  if (scenario.id === 'mission_comms_iot') {
    const chain = res.data.chainOk;
    const delivery = flew && chain ? avail : 0;
    out.push(kpi('packet_delivery', '📨', 'Packets delivered ≥95%', delivery >= scenario.data.target,
      `Simulated: ${pct(delivery)} of accepted test packets delivered (target 95%).${chain ? '' : ' The store-and-forward chain is incomplete.'}`));
    out.push(kpi('ground_contact', '📡', 'Ground contact (gateway passes)', flew && res.data.groundOk === true && sel.components.downlink?.serves === 'iot',
      res.data.groundOk ? 'Gateways collect the stored packets on each pass.' : 'No IoT gateway receives the packets.'));
    out.push(kpi('latency', '⏱️', 'Latency reported honestly', flew && chain,
      'One LEO satellite: a message waits until the next gateway pass — minutes to hours, not instant.'));
    out.push(kpi('power_margin', '⚡', 'Power margin kept', flew && res.power.margin != null && res.power.margin > 0 && res.battery.status !== 'over',
      res.power.margin != null ? `Average ${pct(res.power.margin)} spare; battery ${res.battery.status === 'over' ? 'too small' : 'OK in the 35-min shadow'}.` : 'Power not known.'));
    out.push(kpi('safe_deorbit', '♻️', 'Safe deorbit plan', sel.prep.disposal, sel.prep.disposal ? 'A disposal plan is in place.' : 'No disposal plan.'));
  } else if (scenario.id === 'mission_navigation_meo') {
    const thermalOk = !!sel.components.thermal;
    out.push(kpi('clock_reference', '⏱️', 'Clock reference OK', flew && roles.has('atomic_clocks') && thermalOk,
      roles.has('atomic_clocks') ? `Four clocks with spares${thermalOk ? ', kept at a stable temperature' : ' — but no thermal control'}.` : 'No atomic clocks: no precise reference time.'));
    out.push(kpi('ranging_signal', '〰️', 'Ranging signal OK', flew && roles.has('nav_signal') && roles.has('nav_antenna') && roles.has('atomic_clocks'),
      `Simulated signal availability ${pct(flew ? avail : 0)}.`));
    out.push(kpi('orbit_known', '🧭', 'Orbit achieved and known', flew && sel.orbit?.id === 'meo_gnss' && res.data.groundOk === true,
      sel.orbit?.id === 'meo_gnss' ? 'MEO 23,222 km reached; monitoring stations track it.' : 'Not in the Galileo MEO orbit.'));
    out.push(kpi('nav_message', '🛰️', 'Navigation message uploaded', flew && res.data.chainOk,
      res.data.chainOk ? 'The ground uploads clock and orbit corrections; the satellite broadcasts them.' : `Chain incomplete: ${res.data.missing?.join(', ')}.`));
  } else {
    const valid = flew && roles.has('mw_radiometer') && roles.has('calibration') ? avail : 0;
    out.push(kpi('valid_samples', '🌦️', 'Valid observations ≥90%', valid >= scenario.data.validTarget,
      `Simulated: ${pct(valid)} of planned observations valid (target 90%).`));
    out.push(kpi('calibration', '🎚️', 'Calibration OK', flew && roles.has('calibration') && !!sel.components.thermal,
      roles.has('calibration') ? 'On-board calibration + stable temperatures.' : 'No calibration: absolute temperatures cannot be trusted.'));
    const delivered = flew ? res.data.deliveredFraction ?? 0 : 0;
    out.push(kpi('data_delivered', '📶', 'Data delivered ≥95%', delivered >= scenario.data.deliveredTarget,
      `The link can send ${pct(delivered)} of the daily data (theoretical, before overheads).`));
    out.push(kpi('coverage', '🌍', 'Coverage', flew && sel.orbit?.id === 'sso_550_650' && !!sel.components.sensors,
      sel.orbit?.id === 'sso_550_650' ? 'SSO gives wide, regular coverage; sensors geolocate every sample.' : 'Not the SSO geometry this mission asked for.'));
    out.push(kpi('reference_comparison', '📊', 'Compared with NASA GPM', flew && res.data.groundOk === true && delivered > 0,
      'The processing chain compares the (simulated) measurements with the real NASA GPM IMERG reference.'));
  }

  // Service period
  if (scenario.minMonths) {
    out.push({ id: 'lifetime', icon: '⏳', label: `Works ≥${scenario.minMonths} months`, met: flew && s.monthsOperated >= scenario.minMonths,
      why: `Worked ${months(s.monthsOperated)}; the mission needs at least ${months(scenario.minMonths)}.` });
  }
  // Model budget
  const spent = res.budget.used + (s.extraCostM ?? 0);
  out.push({ id: 'budget', icon: '💰', label: 'Inside the model budget', met: spent <= scenario.budgetM + 1e-9,
    why: `Spent ${money(spent)} of ${money(scenario.budgetM)}${s.extraCostM ? ` (incl. ${money(s.extraCostM)} of reserve used in flight)` : ''}${res.budget.launchUnknown ? '; launch price on request (not counted)' : ''}.` });
  // Schedule window
  if (scenario.deadlineMonths) {
    const [lo, hi] = scenario.deadlineMonths;
    const ready = lo + (s.delayMonths ?? 0);
    out.push({ id: 'deadline', icon: '📅', label: `Ready within ${lo}–${hi} months`, met: ready <= hi,
      why: `Planned ready at month ${lo}${s.delayMonths ? ` + ${s.delayMonths} months of delay` : ''}; window ends at month ${hi}.` });
  }
  return out;
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
