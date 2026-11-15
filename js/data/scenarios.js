// The three missions — REAL DATA ONLY (research §3, §4, §5, §9, §13).
// Schema: { id, icon, name, oneLiner, stars, brief, objective, realInspiration,
//           budgetM, deadlineMonths: [min, max] | null, minMonths (required service), simMonths (simulated),
//           size ('6u' | 'large'), requiredRoles (payload roles), requiredBus (categories),
//           recommendedOrbits, allowedOrbits (physically compatible with the service), orbitWhy,
//           groundServes, launchers (recommended), costModel { ait, licensing, ops, reserve } ($M, model),
//           powerModel { avgLoadW, peakLoadW?, note }, data { kind, … }, kpis, impossibleClaim,
//           payloadWhyNot { [instrumentId]: text }, dataKind, sources, ref }

import { M_COMMS, M_NAV, M_WX } from './components.js';

export const SCENARIOS = [
  {
    id: M_COMMS, icon: '📡', stars: 1, name: 'Connect Remote Sensors',
    oneLiner: 'Carry short messages from sensors where there is no phone network.',
    brief: 'Sensors on ocean buoys, in the mountains and at remote weather posts collect short messages. Build a satellite that picks them up as it flies over, stores them and passes them down to Earth. One demonstration satellite is enough to start — it is NOT 24/7 coverage of the whole planet.',
    objective: 'A 6U CubeSat in low orbit that delivers ≥95% of accepted test packets during its passes, for at least 1 year.',
    realInspiration: 'Sateliot (6U IoT CubeSats built by Alén Space)',
    budgetM: 6.00, deadlineMonths: [18, 24], minMonths: 12, simMonths: 12,
    size: '6u', requiredRoles: ['iot_transceiver', 'iot_antenna'],
    requiredBus: ['structure', 'power', 'battery', 'comms', 'downlink', 'computer', 'adcs', 'thermal', 'harness'],
    recommendedOrbits: ['leo_550'], allowedOrbits: ['leo_550', 'sso_550_650'],
    orbitWhy: {
      sso_550_650: 'Also works if it suits where your users are — the polar path is good for high latitudes but not always best for your network.',
      meo_gnss: 'MEO is far too high and expensive for a small IoT CubeSat.',
      geo: 'GEO is a different concept: a heavy telecom satellite. The same 6U IoT build with 38 W cannot simply work there.',
    },
    groundServes: 'iot', launchers: ['lv_falcon9_rideshare'],
    costModel: { ait: 2.50, licensing: 0.15, ops: 0.30, reserve: 0.59 },
    powerModel: { avgLoadW: 15, note: 'Average with modes taking turns (not the sum of all peaks). Radio sessions draw more for a short time; the battery covers them.' },
    data: { kind: 'packets', target: 0.95 },
    kpis: ['packet_delivery', 'ground_contact', 'latency', 'power_margin', 'safe_deorbit'],
    impossibleClaim: { id: 'global_24_7', title: 'One low satellite ≠ 24/7 worldwide service', text: 'A single LEO satellite passes over a place for a few minutes at a time. Messages wait on board until the next gateway pass. Continuous worldwide service needs many satellites.' },
    payloadWhyNot: {
      dist_rgb_camera: 'A camera takes pictures — it does not receive messages from sensors.',
      clock_phm_rubidium_4: 'Precise time is useful, but it is not the communication service — and 50 kg will never fit a 6U.',
      nav_signal_rf: 'A navigation signal generator broadcasts ranging codes, not users\' messages.',
      antenna_lband_nav: 'A big L-band navigation antenna does not hear IoT terminals.',
      payload_mw_radiometer: 'A radiometer measures the atmosphere; it carries no messages.',
      radiometer_calibration: 'Calibration is for a radiometer — this mission has none.',
    },
    dataKind: 'model', sources: ['S31', 'S11', 'S19'], ref: '§3',
  },
  {
    id: M_WX, icon: '🌦️', stars: 2, name: 'Weather Under the Clouds',
    oneLiner: 'Measure water vapour and temperature through clouds with microwaves.',
    brief: 'Scientists need water vapour, temperature profiles and rain structure. Build a small satellite with a passive microwave radiometer that measures the atmosphere\'s glow day and night, sends the data to a processing centre, checks its calibration and compares it with NASA GPM open data.',
    objective: 'A 6U CubeSat in SSO 550–650 km: ≥90% of planned observations valid, calibration OK, ≥95% of valid data delivered, for 18–24 months.',
    realInspiration: 'NASA TEMPEST-D (6U) and TROPICS (3U)',
    budgetM: 18.00, deadlineMonths: null, minMonths: 18, simMonths: 24,
    size: '6u', requiredRoles: ['mw_radiometer', 'calibration'],
    requiredBus: ['structure', 'power', 'battery', 'comms', 'downlink', 'computer', 'adcs', 'thermal', 'sensors', 'harness'],
    recommendedOrbits: ['sso_550_650'], allowedOrbits: ['sso_550_650', 'leo_550'],
    orbitWhy: {
      leo_550: 'Possible, but a non-SSO orbit changes the science geometry and lighting; SSO matches this mission\'s wide, regular coverage.',
      meo_gnss: 'Far too high for a small radiometer to see the atmosphere in detail.',
      geo: 'GEO weather satellites are big (NOAA GOES-R, 16-channel imager). A 6U with 38 W cannot do that job.',
    },
    groundServes: 'weather', launchers: ['lv_falcon9_rideshare'],
    costModel: { ait: 7.00, licensing: 0.15, ops: 1.00, reserve: 2.61 },
    powerModel: { avgLoadW: 17, note: 'Average over observe / idle / downlink modes. Radiometer and radio peaks are higher; the battery covers them.' },
    data: { kind: 'gb', generatedGBperDay: 2, generatedText: '1–2 GB/day after compression (we use 2)', validTarget: 0.90, deliveredTarget: 0.95 },
    kpis: ['valid_samples', 'calibration', 'data_delivered', 'coverage', 'reference_comparison'],
    impossibleClaim: { id: 'climate_trend', title: 'One 18-month CubeSat ≠ a climate trend', text: 'Climate trends need many years of calibrated measurements, a constellation, or a link to long existing data records. One short demonstration cannot prove a decades-long trend.' },
    payloadWhyNot: {
      dist_rgb_camera: 'The camera sees cloud tops, but not the temperature and humidity profiles inside.',
      payload_iot_sdr: 'An IoT radio carries messages — it makes no measurements.',
      ant_iot_deploy: 'IoT antennas only talk to ground terminals.',
      clock_phm_rubidium_4: 'Atomic clocks keep time; they do not measure the atmosphere — and 50 kg will never fit a 6U.',
      nav_signal_rf: 'A navigation signal generator measures nothing in the atmosphere.',
      antenna_lband_nav: 'A navigation antenna is not an atmospheric sensor.',
    },
    dataKind: 'model', sources: ['S06', 'S07', 'S11', 'S23'], ref: '§5',
  },
  {
    id: M_NAV, icon: '📍', stars: 3, name: 'Precise Time for Navigation',
    oneLiner: 'Launch one Galileo-class node of a satellite navigation system.',
    brief: 'Add one new satellite to a navigation constellation. It must keep precise time, receive corrections from ground stations and broadcast a special navigation signal to users on Earth. One satellite gives a time signal and a range measurement; worldwide positions only appear together with the other satellites.',
    objective: 'One ~700 kg navigation satellite in MEO (23,222 km, 56°): clocks OK, ranging signal OK, orbit known, navigation message OK.',
    realInspiration: 'ESA Galileo FOC',
    budgetM: 280, deadlineMonths: null, minMonths: null, simMonths: 12,
    size: 'large', requiredRoles: ['atomic_clocks', 'nav_signal', 'nav_antenna'],
    requiredBus: ['structure', 'power', 'battery', 'comms', 'computer', 'adcs', 'thermal', 'harness', 'propulsion', 'propellant'],
    recommendedOrbits: ['meo_gnss'], allowedOrbits: ['meo_gnss'],
    orbitWhy: {
      leo_550: 'Wrong for a classic Galileo-type MEO node (a LEO navigation DEMO is a different mission — see ESA Celeste).',
      sso_550_650: 'Great for many Earth-observation missions, but not for the Galileo MEO scheme.',
      geo: 'GEO is not a replacement for MEO without changing the whole constellation and its task.',
    },
    groundServes: 'gnss', launchers: ['lv_f9_dedicated_meo'],
    costModel: { ait: 30, licensing: 3, ops: 10, reserve: 20 },
    powerModel: { avgLoadW: 1100, peakLoadW: 1500, note: 'About 1.1 kW average and 1.5 kW peak (estimate). Check at beginning and end of life and in shadow.' },
    data: { kind: 'nav' },
    kpis: ['clock_reference', 'ranging_signal', 'orbit_known', 'nav_message'],
    impossibleClaim: { id: 'global_3d_fix', title: 'One GNSS satellite ≠ 3D positioning', text: 'A receiver needs at least 4 satellites in view at the same time to solve its 3 coordinates and its own clock error. One satellite gives time and one range — the full constellation gives positions.' },
    payloadWhyNot: {
      dist_rgb_camera: 'A camera studies Earth; it does not make navigation signals.',
      payload_iot_sdr: 'An IoT radio is a different service and is far too small for a navigation signal.',
      ant_iot_deploy: 'IoT antennas do not broadcast navigation signals.',
      payload_mw_radiometer: 'A weather radiometer studies the atmosphere, not navigation.',
      radiometer_calibration: 'Calibration is for a radiometer — this mission has none.',
    },
    dataKind: 'model', sources: ['S04', 'S05', 'S14', 'S02'], ref: '§4',
  },
];

export const EASY_DEFAULT_SCENARIO = M_COMMS;

const byId = new Map(SCENARIOS.map((s) => [s.id, s]));
export const getScenario = (id) => (id ? byId.get(id) ?? null : null);

/** Why a payload card does not serve this mission ('' = it does). */
export const payloadWhyNot = (scenario, instrument) => {
  if (!scenario || !instrument) return '';
  if (instrument.missions.includes(scenario.id)) return '';
  return scenario.payloadWhyNot[instrument.id] ?? 'This payload does not serve this mission.';
};
/** Back-compat helper: non-empty list when the payload does not fit the mission. */
export const incompatibleTagsOf = (scenario, instrument) => (payloadWhyNot(scenario, instrument) ? [instrument.role] : []);
