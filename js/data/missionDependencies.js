// Mission dependency matrix (CLARITY.md Phase 1) — ONE source of truth for "what does this mission + goal need?".
// The engine reads it (engine/dependencies.js): the payload, timing, calibration and ground checks, the objective
// verdict, the system map and the "Change:" dependency line. Physical gates (mass, orbit, launcher, power,
// battery) stay in engine/validation.js; rules they verify carry `checkedBy: <gate id>` and are shown, not re-judged.
// Docs: docs/MISSION_DEPENDENCY_MATRIX.md is GENERATED from this file (node tools/matrix-doc.mjs).
//
// Rule schema:
//   { id, missionId, variantId, capability, category ('payload'|'timing'|'calibration'|'ground'|'downlink'|'orbit'|'platform'|'power'),
//     scope: 'mission' (any goal of this mission: engineering GO/NO-GO) | 'goal' (this goal only: objective MET/PARTLY/NOT MET),
//     status: 'required' | 'one_of' | 'conditional' | 'optional' | 'incompatible',
//     satisfiedBy: [item ids, incl. reference builds], partialBy?: [ids that meet it only partly],
//     dependsOn: [ids that switch a conditional rule on], incompatibleWithAsSubstitute: [ids that look similar but do NOT count],
//     whyRequired, whyAlternatives (≤ 25 words, plain English), whyNotById?: { id: text },
//     evidence: [source codes], evidenceLevel: 'documented' | 'estimate' | 'assumption', checkedBy? }
// Item ids are real ids from components.js / instruments.js / orbits.js / groundStations.js — never invented.

import { M_COMMS, M_NAV, M_WX } from './components.js';
import { SCENARIOS } from './scenarios.js';
import { INSTRUMENTS } from './instruments.js';
import { GROUND_STATIONS, GROUND_WHY_NOT, groundServes } from './groundStations.js';

export const RULE_STATUS = ['required', 'one_of', 'conditional', 'optional', 'incompatible'];
export const EVIDENCE_LEVELS = ['documented', 'estimate', 'assumption'];

const TTC_RADIOS = ['ttc_uhf', 'ttc_es_uhf2', 'ttc_gom_ax100', 'ttc_es_sband_trx'];
const scenarioOf = (id) => SCENARIOS.find((s) => s.id === id);

/** Ground rule from the ground-station data (which network serves which mission). */
function groundRule(missionId) {
  const sc = scenarioOf(missionId);
  const ok = GROUND_STATIONS.filter((g) => groundServes(g, sc.groundServes)).map((g) => g.id);
  const wrong = GROUND_STATIONS.filter((g) => !groundServes(g, sc.groundServes));
  const WHY = {
    iot: 'Gateways on Earth collect the stored messages on each pass and pass them to the internet.',
    weather: 'A science station receives, calibrates and checks the measurements against NASA GPM.',
    gnss: 'Monitoring stations measure the clock and orbit and upload corrections; without them positions drift.',
  };
  return {
    capability: 'ground_network', category: 'ground', scope: 'mission', status: 'one_of', satisfiedBy: ok,
    incompatibleWithAsSubstitute: wrong.map((g) => g.id),
    whyRequired: WHY[sc.groundServes],
    whyAlternatives: 'Each service needs its own kind of ground network; another mission\'s network cannot receive or check this one.',
    whyNotById: Object.fromEntries(wrong.map((g) => [g.id, GROUND_WHY_NOT[[g.serves].flat()[0]]?.[sc.groundServes] ?? 'Not built for this mission.'])),
    evidence: ['S04', 'S23'], evidenceLevel: 'estimate',
  };
}

/** Payloads made for another mission (or none): their honest "why not" comes from scenarios.js. */
function otherPayloadRule(missionId) {
  const sc = scenarioOf(missionId);
  const wrong = INSTRUMENTS.filter((i) => !i.missions.includes(missionId));
  return {
    capability: 'other_mission_payload', category: 'payload', scope: 'mission', status: 'incompatible', satisfiedBy: [],
    incompatibleWithAsSubstitute: wrong.map((i) => i.id),
    whyRequired: 'A payload made for another job adds mass and cost but does nothing for this mission.',
    whyAlternatives: 'A bigger or extra instrument cannot replace the one this mission physically needs.',
    whyNotById: Object.fromEntries(wrong.map((i) => [i.id, sc.payloadWhyNot[i.id] ?? 'does not serve this mission.'])),
    evidence: [], evidenceLevel: 'documented',
  };
}

// ── Rules every goal of a mission shares (engineering: can it work at all?)
const MISSION_RULES = {
  [M_COMMS]: [
    { capability: 'iot_transceiver', category: 'payload', status: 'one_of',
      satisfiedBy: ['payload_iot_sdr', 'iot_lora', 'iot_lband', 'iot_nbiot_ntn', 'ref_swarm_spacebee', 'ref_astrocast_3u', 'ref_sateliot_6u'],
      incompatibleWithAsSubstitute: [...TTC_RADIOS, 'dl_sband', 'dl_es_sband_tx'],
      whyRequired: 'The IoT radio IS the service: it hears short messages from sensors on the ground.',
      whyAlternatives: 'The control radio (TT&C) only carries our commands and health data, never users\' messages.',
      evidence: ['S31', 'O24', 'O26'], evidenceLevel: 'documented' },
    { capability: 'iot_antenna', category: 'payload', status: 'required',
      satisfiedBy: ['ant_iot_deploy', 'ref_swarm_spacebee', 'ref_astrocast_3u', 'ref_sateliot_6u'],
      whyRequired: 'Small ground terminals are weak; fold-out service antennas let the satellite hear them.',
      whyAlternatives: 'The control-radio antenna is tuned for our ground station, not for thousands of small terminals.',
      evidence: [], evidenceLevel: 'estimate' },
    { capability: 'packet_downlink', category: 'downlink', status: 'one_of', checkedBy: 'communications_link_pass',
      satisfiedBy: ['dl_sband', 'dl_es_sband_tx', 'dl_es_xband_tx', 'dl_reuse_sband_trx', 'ref_swarm_spacebee', 'ref_astrocast_3u', 'ref_sateliot_6u'],
      whyRequired: 'Stored messages are dumped to a gateway over a packet downlink during each pass.',
      whyAlternatives: 'X-band works but is far faster than IoT bytes need and needs X-band ground.',
      evidence: ['S17'], evidenceLevel: 'estimate' },
  ],
  [M_WX]: [
    { capability: 'atmo_sensor', category: 'payload', status: 'one_of',
      satisfiedBy: ['payload_mw_radiometer', 'wx_tropics_radiometer', 'wx_raincube_radar', 'wx_gnss_ro', 'ref_tropics_3u', 'ref_raincube_6u'],
      incompatibleWithAsSubstitute: ['dist_rgb_camera', 'sun_orbit_sensors', 'gnss_receiver_bus'],
      whyRequired: 'An atmosphere sensor makes the measurements; without one there is no weather data at all.',
      whyAlternatives: 'Sun and orbit sensors only help the satellite know where it points; a camera sees cloud tops. Neither measures the air.',
      evidence: ['S06', 'S07', 'O35', 'O37'], evidenceLevel: 'documented' },
    { capability: 'calibration', category: 'calibration', status: 'conditional',
      dependsOn: ['payload_mw_radiometer', 'wx_tropics_radiometer'],
      satisfiedBy: ['radiometer_calibration', 'ref_tropics_3u'],
      whyRequired: 'A passive radiometer needs a known reference, or its temperatures cannot be trusted.',
      whyAlternatives: 'A radar or GNSS-RO needs no separate calibration module.',
      evidence: ['S07', 'O37'], evidenceLevel: 'documented' },
    { capability: 'science_downlink', category: 'downlink', status: 'one_of', checkedBy: 'communications_link_pass',
      satisfiedBy: ['science_sband', 'dl_es_sband_tx', 'dl_es_xband_tx', 'dl_reuse_sband_trx', 'ref_tropics_3u', 'ref_raincube_6u'],
      incompatibleWithAsSubstitute: TTC_RADIOS.filter((r) => r !== 'ttc_es_sband_trx'),
      whyRequired: 'Measurements are big; a science downlink sends them home during short station passes.',
      whyAlternatives: 'The UHF control radio is far too slow for science data; it only carries commands.',
      evidence: ['S17', 'S23'], evidenceLevel: 'estimate' },
    { capability: 'radar_power', category: 'power', status: 'conditional', checkedBy: 'power_peak_and_average_pass',
      dependsOn: ['wx_raincube_radar'], satisfiedBy: ['eps_solar_6u', 'pwr_6u_deploy', 'pwr_8u_deploy'],
      whyRequired: 'The radar draws 22 W when on: it needs deployable wings and runs in bursts.',
      whyAlternatives: 'A fixed 19.2 W panel cannot run it even in full sunlight.',
      evidence: ['O35', 'O36'], evidenceLevel: 'documented' },
  ],
  [M_NAV]: [
    { capability: 'atomic_clocks', category: 'timing', status: 'one_of',
      satisfiedBy: ['clock_phm_rubidium_4', 'clk_rafs_3', 'ref_gps_iii'],
      incompatibleWithAsSubstitute: ['clk_drafs_demo', 'clk_none_leo'],
      whyRequired: 'Every navigation signal is built on precise atomic time; without it the ranges are wrong.',
      whyAlternatives: 'A demo clock flies next to the standard clocks, not instead; no-clock timing is only a LEO demo (Celeste).',
      evidence: ['S05', 'O40', 'O45', 'S32'], evidenceLevel: 'documented' },
    { capability: 'nav_signal', category: 'payload', status: 'required', satisfiedBy: ['nav_signal_rf', 'ref_gps_iii'],
      whyRequired: 'The signal generator builds the ranging code and navigation message receivers use.',
      whyAlternatives: 'A clock alone keeps time but broadcasts nothing users can range to.',
      evidence: ['S05'], evidenceLevel: 'estimate' },
    { capability: 'nav_antenna', category: 'payload', status: 'required', satisfiedBy: ['antenna_lband_nav', 'ref_gps_iii'],
      whyRequired: 'An Earth-pointing L-band antenna beams the navigation signal to receivers below.',
      whyAlternatives: 'The control radio antenna talks to our stations only; users need the L-band broadcast.',
      evidence: ['S04', 'S05'], evidenceLevel: 'documented' },
    { capability: 'control_uplink', category: 'downlink', status: 'one_of', checkedBy: 'communications_link_pass',
      satisfiedBy: ['ttc_c_s_band', 'ref_gps_iii'],
      whyRequired: 'A C-band uplink carries clock and orbit corrections up; S-band controls the satellite.',
      whyAlternatives: 'A CubeSat UHF radio is the wrong size and band for a 700 kg navigation node.',
      evidence: ['S04'], evidenceLevel: 'estimate' },
  ],
};

// ── Rules that belong to ONE goal (objective: did it meet THIS goal?)
const GOAL_RULES = {
  [M_COMMS]: {
    cheapest: [
      { capability: 'cheap_platform', category: 'platform', status: 'optional', satisfiedBy: ['ref_swarm_spacebee', 'ref_astrocast_3u'],
        whyRequired: 'Cheapest coverage means many tiny satellites; Swarm (0.4 kg) and Astrocast (3U) were built that way.',
        whyAlternatives: 'A 6U works too, but each satellite is bigger and heavier to launch.',
        evidence: ['O20', 'O23'], evidenceLevel: 'documented' },
    ],
    phone_chips: [
      { capability: 'phone_standard', category: 'payload', status: 'required', satisfiedBy: ['iot_nbiot_ntn', 'ref_sateliot_6u'],
        incompatibleWithAsSubstitute: ['iot_lora', 'payload_iot_sdr', 'iot_lband', 'ref_swarm_spacebee', 'ref_astrocast_3u'],
        whyRequired: 'Normal phone IoT chips speak 5G NB-IoT; the satellite must speak the same standard.',
        whyAlternatives: 'LoRa, a custom radio or L-band IoT cannot talk to standard phone chips: choose 5G NB-IoT NTN.',
        evidence: ['S31'], evidenceLevel: 'documented' },
    ],
    licensed: [
      { capability: 'licensed_link', category: 'payload', status: 'required', satisfiedBy: ['iot_lband', 'ref_astrocast_3u'],
        incompatibleWithAsSubstitute: ['payload_iot_sdr', 'iot_lora', 'ref_swarm_spacebee'],
        whyRequired: 'A licensed, protected band (Astrocast L-band) means no one else may transmit there.',
        whyAlternatives: 'A generic SDR or LoRa radio is not the licensed L-band service: choose the L-band IoT payload.',
        evidence: ['O24', 'O25'], evidenceLevel: 'documented' },
    ],
  },
  [M_WX]: {
    global_humidity: [
      { capability: 'humidity_map', category: 'payload', status: 'one_of', satisfiedBy: ['payload_mw_radiometer', 'wx_tropics_radiometer', 'ref_tropics_3u'],
        partialBy: ['wx_gnss_ro'], incompatibleWithAsSubstitute: ['wx_raincube_radar', 'ref_raincube_6u'],
        whyRequired: 'A microwave radiometer maps humidity through clouds, day and night.',
        whyAlternatives: 'A rain radar sees only falling rain, not humidity in clear air. GNSS-RO gives sparse profiles only.',
        evidence: ['S07', 'O32', 'O35', 'O37'], evidenceLevel: 'documented' },
      { capability: 'same_local_time', category: 'orbit', status: 'required', satisfiedBy: ['sso_550_650'],
        partialBy: ['leo_550', 'leo_550_32deg', 'iss_400_516'],
        whyRequired: 'A sun-synchronous orbit passes each place at the same local time, so global maps compare fairly.',
        whyAlternatives: 'Other low orbits work, but local time drifts and some latitudes are never seen.',
        evidence: ['S06'], evidenceLevel: 'documented' },
    ],
    hurricanes: [
      { capability: 'storm_sounder', category: 'payload', status: 'one_of', satisfiedBy: ['wx_tropics_radiometer', 'payload_mw_radiometer', 'ref_tropics_3u'],
        partialBy: ['wx_raincube_radar', 'ref_raincube_6u'], incompatibleWithAsSubstitute: ['wx_gnss_ro'],
        whyRequired: 'A microwave radiometer measures temperature, humidity and rain inside storms through the clouds (TROPICS).',
        whyAlternatives: 'A radar measures rain but not the storm\'s temperature and humidity. GNSS-RO gives scattered profiles, not a storm picture.',
        evidence: ['S06', 'O32', 'O37'], evidenceLevel: 'documented' },
      { capability: 'tropical_revisit', category: 'orbit', status: 'required', satisfiedBy: ['leo_550_32deg', 'iss_400_516'],
        partialBy: ['leo_550', 'sso_550_650'],
        whyRequired: 'A low-tilt orbit crosses the tropics more often; TROPICS used about 30° for cyclones.',
        whyAlternatives: 'A polar or SSO orbit also crosses storms, but less often.',
        evidence: ['S06'], evidenceLevel: 'documented' },
    ],
    rain_inside: [
      { capability: 'rain_profile', category: 'payload', status: 'required', satisfiedBy: ['wx_raincube_radar', 'ref_raincube_6u'],
        incompatibleWithAsSubstitute: ['payload_mw_radiometer', 'wx_tropics_radiometer', 'ref_tropics_3u', 'wx_gnss_ro'],
        whyRequired: 'Only a radar sends a pulse and times the echoes, giving the rain layer by layer.',
        whyAlternatives: 'A radiometer measures humidity, not the rain profile; choose a radar.',
        evidence: ['O30', 'O35'], evidenceLevel: 'documented' },
    ],
  },
  [M_NAV]: {
    galileo: [
      { capability: 'galileo_clocks', category: 'timing', status: 'required', satisfiedBy: ['clock_phm_rubidium_4'],
        partialBy: ['clk_rafs_3', 'ref_gps_iii'],
        whyRequired: 'Galileo satellites carry 2 hydrogen masers + 2 rubidium clocks.',
        whyAlternatives: 'Rubidium-only clocks keep time too, but that is the GPS clock set, not Galileo\'s.',
        evidence: ['S05'], evidenceLevel: 'documented' },
      { capability: 'galileo_orbit', category: 'orbit', status: 'required', satisfiedBy: ['meo_gnss'], partialBy: ['meo_gps_20200'],
        whyRequired: 'Galileo satellites fly at 23,222 km and 56° in their own orbit planes.',
        whyAlternatives: 'The GPS orbit (20,200 km) is a navigation orbit, but not Galileo\'s planes.',
        evidence: ['S04'], evidenceLevel: 'documented' },
    ],
    gps: [
      { capability: 'gps_clocks', category: 'timing', status: 'required', satisfiedBy: ['clk_rafs_3', 'ref_gps_iii'],
        partialBy: ['clock_phm_rubidium_4'],
        whyRequired: 'GPS III satellites keep time with rubidium atomic clocks (RAFS).',
        whyAlternatives: 'Hydrogen masers also keep precise time, but that is the Galileo clock set.',
        evidence: ['O40'], evidenceLevel: 'documented' },
      { capability: 'gps_orbit', category: 'orbit', status: 'required', satisfiedBy: ['meo_gps_20200'], partialBy: ['meo_gnss'],
        whyRequired: 'GPS satellites fly at about 20,200 km in the GPS orbit planes.',
        whyAlternatives: 'The Galileo orbit (23,222 km) is a navigation orbit, but not the GPS planes.',
        evidence: ['O40'], evidenceLevel: 'documented' },
    ],
  },
};

// Honest limits (CLARITY P0.8): shown in Why? / Results; one LEO / GNSS / TROPICS-type satellite is never the whole system.
export const HONEST_LIMITS = {
  [M_COMMS]: [{ id: 'global_24_7', text: 'One LEO IoT satellite ≠ 24/7 global coverage: messages wait for the next pass.' }],
  [M_WX]: [{ id: 'climate_trend', text: 'Months of CubeSat data ≠ a climate trend: that needs many years of records.' },
    { id: 'hourly_cyclone_revisit', text: 'One TROPICS-type satellite ≠ frequent hurricane revisit: TROPICS flew 4.', variants: ['hurricanes'] }],
  [M_NAV]: [{ id: 'global_3d_fix', text: 'One GNSS satellite ≠ 3D positioning: a receiver needs at least 4 in view.' },
    { id: 'gto_not_meo', text: 'GTO ≠ MEO: without a transfer stage or apogee engine the satellite stays in the wrong orbit.' }],
};

const withDefaults = (r, missionId, variantId, scope) => ({
  status: 'required', satisfiedBy: [], partialBy: [], dependsOn: [], incompatibleWithAsSubstitute: [], whyAlternatives: '', whyNotById: null,
  checkedBy: null, evidence: [], evidenceLevel: 'assumption', scope,
  ...r,
  id: `${missionId.replace('mission_', '')}.${variantId}.${r.capability}`, missionId, variantId,
});

/** Every rule, one list per mission + goal variant (variant ids from scenarios.js — nothing renamed). */
export const MISSION_DEPENDENCIES = SCENARIOS.flatMap((sc) => sc.variants.flatMap((v) => [
  ...MISSION_RULES[sc.id].map((r) => withDefaults({ scope: 'mission', ...r }, sc.id, v.id, 'mission')),
  withDefaults(groundRule(sc.id), sc.id, v.id, 'mission'),
  withDefaults(otherPayloadRule(sc.id), sc.id, v.id, 'mission'),
  ...(GOAL_RULES[sc.id][v.id] ?? []).map((r) => withDefaults(r, sc.id, v.id, 'goal')),
]));

/** Rules for one mission + goal (default goal = the scenario's first variant). */
export function rulesFor(missionId, variantId) {
  const sc = scenarioOf(missionId);
  if (!sc) return [];
  const vid = sc.variants.some((v) => v.id === variantId) ? variantId : sc.variants[0].id;
  return MISSION_DEPENDENCIES.filter((r) => r.missionId === missionId && r.variantId === vid);
}
