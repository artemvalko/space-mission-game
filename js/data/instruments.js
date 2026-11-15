// Mission payload cards ("instruments" in the state = what the satellite exists for).
// Research categories (§7.1): service_payload, timing (navigation), calibration (weather).
// REAL DATA ONLY — numbers from the research BOMs (§3.2, §4.3, §5.3); distractors have no numbers.
//
// Schema: { id, category: 'service_payload'|'timing'|'calibration', role, icon, plainName, name, oneLiner, why,
//           mass | null, cost | null, formFactor: 'cubesat'|'large'|'any', volumeU?, missions, status,
//           distractor?: true, dataKind, sources, ref, realExample? }
// `role` is what the payload does — scenarios list the roles they need (data/scenarios.js).

import { M_COMMS, M_NAV, M_WX } from './components.js';

export const PAYLOAD_CATEGORIES = ['service_payload', 'timing', 'calibration'];

export const INSTRUMENTS = [
  // ── Communications / IoT store-and-forward (§3.2)
  {
    id: 'payload_iot_sdr', category: 'service_payload', role: 'iot_transceiver', language: 'sdr', icon: '📡', plainName: 'IoT radio (generic SDR)', name: 'Two-way narrowband IoT transceiver (SDR / LoRa-like)', formFactor: 'cubesat',
    mass: 1.50, cost: 0.35, missions: [M_COMMS], status: 'must', dataKind: 'model', sources: ['S31'], ref: '§3.2',
    oneLiner: 'Hears sensor messages, passes them on.', about: 'Hears short messages from sensors on Earth and sends them on.', why: 'Does the mission: receives and forwards users\' messages.',
    realExample: { text: 'Sateliot\'s IoT/5G satellites built by Alén Space are 6U, 10 kg each, for SSO 500–600 km with a 5-year design life (S31). Their transponder price is not public.', dataKind: 'fact', sources: ['S31'] },
  },
  {
    id: 'ant_iot_deploy', category: 'service_payload', role: 'iot_antenna', icon: '📶', plainName: 'Fold-out IoT antennas', name: 'Deployable IoT service antennas', formFactor: 'cubesat',
    mass: 0.35, cost: 0.08, missions: [M_COMMS], status: 'must', dataKind: 'model', sources: [], ref: '§3.2',
    oneLiner: 'Hears small ground terminals.', about: 'Lets the satellite hear small terminals on the ground.', why: 'The link to the terminals on the surface.',
  },

  // ── Navigation / GNSS node (§4.2, §4.3)
  {
    id: 'clock_phm_rubidium_4', category: 'timing', role: 'atomic_clocks', clockType: 'phm_rafs', heritage: 'Galileo', icon: '⏱️', plainName: '4 atomic clocks', name: '2 passive hydrogen masers + 2 rubidium clocks + clock monitoring', formFactor: 'large',
    mass: 50, cost: 22, missions: [M_NAV], status: 'must', dataKind: 'model', sources: ['S04', 'S05'], ref: '§4.2 · §4.3',
    oneLiner: 'Precise time for navigation.', about: 'The precise time every navigation signal is built on.', why: 'Reference time — with spares.',
    realExample: { text: 'Galileo FOC carries 2 passive hydrogen masers and 2 rubidium clocks (S05). Clock prices are not public.', dataKind: 'fact', sources: ['S05'] },
  },
  {
    id: 'nav_signal_rf', category: 'service_payload', role: 'nav_signal', icon: '〰️', plainName: 'Navigation signal generator', name: 'PRN code generator, frequency chain, navigation transmitters', formFactor: 'large',
    mass: 100, cost: 15, missions: [M_NAV], status: 'must', dataKind: 'model', sources: ['S05'], ref: '§4.3',
    oneLiner: 'Builds the navigation signal.', about: 'Builds the ranging code and the navigation message.', why: 'Forms the GNSS service itself.',
  },
  {
    id: 'antenna_lband_nav', category: 'service_payload', role: 'nav_antenna', icon: '📡', plainName: 'L-band navigation antenna', name: 'L-band Earth-pointing antenna', formFactor: 'large',
    mass: 28, cost: 4, missions: [M_NAV], status: 'must', dataKind: 'model', sources: ['S04', 'S05'], ref: '§4.3',
    oneLiner: 'Beams the signal to Earth.', about: 'Broadcasts the navigation signal to receivers on Earth.', why: 'Transmits the navigation signals to Earth.',
    realExample: { text: 'Galileo broadcasts in L-band, about 1200–1600 MHz (S04, S05).', dataKind: 'fact', sources: ['S04', 'S05'] },
  },

  // ── Weather / microwave radiometer (§5.2, §5.3)
  {
    id: 'payload_mw_radiometer', category: 'service_payload', role: 'mw_radiometer', sensor: true, passive: true, powerW: 3.8, dataKbps: 8, icon: '🌦️', plainName: 'TEMPEST-D radiometer', name: 'TEMPEST-D-class 5-channel radiometer, 89–182 GHz (research model)', formFactor: 'cubesat', volumeU: 4,
    mass: 2.70, cost: 4.00, missions: [M_WX], status: 'must', dataKind: 'model', sources: ['S06', 'S07'], ref: '§5.3',
    oneLiner: 'Measures the atmosphere\'s natural microwave glow — through clouds, day and night.', why: 'The main science measurement.',
    heritage: 'TEMPEST-D',
    realExample: { text: 'NASA/JPL TEMPEST-D: 5 channels 89–182 GHz in about 4U of a 6U; instrument 1.6 kg best estimate (3 kg allocation), 3.8 W, 8 kbps; flew 2018–2021 (S07, O16). Our 2.70 kg / $4.0M is the research model for the whole payload.', dataKind: 'fact', sources: ['S07', 'O16', 'O31'] },
  },
  {
    id: 'radiometer_calibration', category: 'calibration', role: 'calibration', icon: '🎚️', plainName: 'Calibration module', name: 'Radiometer calibration / reference module', formFactor: 'cubesat',
    mass: 0.25, cost: 0.30, missions: [M_WX], status: 'must', dataKind: 'model', sources: [], ref: '§5.3',
    oneLiner: 'Makes temperatures trustworthy.', about: 'Checks the radiometer against a known reference so temperatures are trustworthy.', why: 'Accurate, stable temperatures.',
  },

  // ═══ Options supplement (docs/OPTIONS_RESEARCH.md). NOT PUBLIC = null, never 0. ═══════════════
  // ── IoT payload "languages" (§2.2). Mass NOT PUBLIC: part builds borrow the research SDR mass as an
  //    "≈ same class" estimate (massClassOf); price stays unknown → uncertain budget.
  {
    id: 'iot_lora', category: 'service_payload', role: 'iot_transceiver', language: 'lora', massClassOf: 'payload_iot_sdr', icon: '📟', plainName: 'LoRa space gateway', name: 'LoRa / LoRaWAN store-and-forward receiver (like Lacuna Space)', formFactor: 'cubesat',
    mass: null, cost: null, missions: ['mission_comms_iot'], dataKind: 'fact', sources: ['O26', 'O27'], ref: 'options §2.2',
    oneLiner: 'Cheap standard LoRa sensors on the ground.', why: 'Receives LoRa messages from ordinary sensors.',
  },
  {
    id: 'iot_lband', category: 'service_payload', role: 'iot_transceiver', language: 'lband', massClassOf: 'payload_iot_sdr', icon: '📶', plainName: 'L-band licensed IoT', name: 'Licensed L-band IoT payload (like Astrocast)', formFactor: 'cubesat',
    mass: null, cost: null, missions: ['mission_comms_iot'], dataKind: 'fact', sources: ['O24', 'O25'], ref: 'options §2.2',
    oneLiner: 'Protected spectrum; access via a partner.', why: 'Licensed IoT link with tiny ground antennas.',
  },
  {
    id: 'iot_nbiot_ntn', category: 'service_payload', role: 'iot_transceiver', language: 'nbiot', massClassOf: 'payload_iot_sdr', icon: '📱', plainName: '5G NB-IoT NTN', name: '5G NB-IoT non-terrestrial network payload (like Sateliot)', formFactor: 'cubesat',
    mass: null, cost: null, missions: ['mission_comms_iot'], dataKind: 'fact', sources: ['S31'], ref: 'options §2.2',
    oneLiner: 'Works with standard phone IoT chips.', why: 'Talks to normal cellular IoT modules — the newest standard.',
  },
  // ── Weather sensors (§3.1)
  {
    id: 'wx_tropics_radiometer', category: 'service_payload', role: 'mw_radiometer', sensor: true, passive: true, powerW: 3, volumeU: 1, icon: '🌀', plainName: 'TROPICS radiometer', name: 'TROPICS 12-channel radiometer, 90–205 GHz', formFactor: 'cubesat',
    mass: null, cost: null, heritage: 'TROPICS', missions: ['mission_weather_mw'], dataKind: 'fact', sources: ['O32', 'O33', 'O34'], ref: 'options §3.1',
    oneLiner: 'More channels in 1U; mass not public.', why: 'Temperature + humidity profiles and precipitation.',
  },
  {
    id: 'wx_raincube_radar', category: 'service_payload', role: 'precip_radar', sensor: true, powerW: 22, volumeU: 4.5, icon: '🌧️', plainName: 'RainCube radar', name: 'RainCube Ka-band 35.75 GHz precipitation radar', formFactor: 'cubesat',
    mass: 7, cost: null, heritage: 'RainCube', missions: ['mission_weather_mw'], dataKind: 'fact', sources: ['O30', 'O35', 'O36'], ref: 'options §3.1',
    oneLiner: 'Measures rain directly; 22 W hungry.', why: 'A vertical rain profile inside storms (3U radar + antenna in 1.5U).',
    realExample: { text: 'RainCube: the first radar on a CubeSat (2018), 7 kg vs 336 kg for GPM’s KaPR. After losing a power tracker in orbit it could only run the radar ~40 min at a time (O36).', dataKind: 'fact', sources: ['O35', 'O36'] },
  },
  {
    id: 'wx_gnss_ro', category: 'service_payload', role: 'gnss_ro', sensor: true, icon: '📡', plainName: 'GNSS radio occultation', name: 'GNSS radio-occultation receiver (like Spire STRATOS)', formFactor: 'cubesat',
    mass: null, cost: null, missions: ['mission_weather_mw'], dataKind: 'fact', sources: ['O37', 'O38'], ref: 'options §3.1',
    oneLiner: 'No calibration needed; sparse profiles.', why: 'Measures how GPS signals bend through the air → temperature and humidity.',
  },
  {
    id: 'wx_ciras_ir', category: 'service_payload', role: 'ir_sounder', cancelled: true, icon: '❄️', plainName: 'CIRAS IR sounder', name: 'CIRAS infrared sounder (JPL) — cancelled', formFactor: 'cubesat',
    mass: null, cost: null, missions: [], dataKind: 'fact', sources: ['O39'], ref: 'options §3.1',
    oneLiner: 'Cancelled: needed a cryocooler.', why: 'An honest "too hard for now" card: real, but never flew.',
  },
  // ── Navigation clocks and add-ons (§4.2, §4.4). Masses/prices NOT PUBLIC; they fly inside GPS III.
  {
    id: 'clk_rafs_3', category: 'timing', role: 'atomic_clocks', clockType: 'rafs3', icon: '⏱️', plainName: '3 rubidium clocks', name: '3 rubidium atomic frequency standards (RAFS)', formFactor: 'large',
    mass: null, cost: null, flewOn: 'ref_gps_iii', heritage: 'GPS III', missions: ['mission_navigation_meo'], dataKind: 'fact', sources: ['O40'], ref: 'options §4.2',
    oneLiner: 'Proven and simpler (GPS III).', why: 'Reference time for GPS-style signals.',
  },
  {
    id: 'clk_drafs_demo', category: 'timing', role: 'clock_demo', demo: true, icon: '🧪', plainName: 'Digital rubidium (demo)', name: 'Digital rubidium clock DRAFS — technology demo', formFactor: 'large',
    mass: null, cost: null, flewOn: 'ref_gps_iii', heritage: 'GPS III SV10', missions: ['mission_navigation_meo'], dataKind: 'fact', sources: ['O45'], ref: 'options §4.2',
    oneLiner: 'New tech add-on; not a replacement yet.', why: 'First flown on GPS III SV10 (21 Apr 2026) next to the standard clocks.',
  },
  {
    id: 'clk_none_leo', category: 'timing', role: 'no_clock', leoOnly: true, icon: '🚫', plainName: 'No atomic clock', name: 'No atomic clock (Celeste IOD, LEO only)', formFactor: 'any',
    mass: null, cost: null, missions: [], dataKind: 'fact', sources: ['S32', 'S34'], ref: 'options §4.2',
    oneLiner: 'Only for a LEO demo, not MEO.', why: 'ESA Celeste IOD-1 tests timing without atomic clocks — in LEO.',
  },
  {
    id: 'nav_lra', category: 'service_payload', role: 'lra', addOn: true, icon: '🪞', plainName: 'Laser retroreflector', name: 'Laser retroreflector array (LRA)', formFactor: 'large',
    mass: null, cost: null, flewOn: 'ref_gps_iii', heritage: 'GPS III SV09/10', missions: ['mission_navigation_meo'], dataKind: 'fact', sources: ['O45'], ref: 'options §4.4',
    oneLiner: 'Orbit known to under 1 cm.', why: 'NASA lasers measure the distance — better orbit knowledge (GPS III SV09/SV10).',
  },
  // ── Distractor (§7.3, §5.2): real kind of instrument, but not part of any build → no numbers.
  {
    id: 'dist_rgb_camera', category: 'service_payload', role: 'camera', distractor: true, icon: '📷', plainName: 'Colour camera', name: 'Wide-angle RGB / optical camera', formFactor: 'any',
    mass: null, cost: null, missions: [], dataKind: 'model', sources: [], ref: '§7.3',
    oneLiner: 'Takes pretty pictures of cloud tops.', why: 'A common "looks useful" choice — see why it fails each mission.',
  },
];

const byId = new Map(INSTRUMENTS.map((i) => [i.id, i]));
export const getInstrument = (id) => (id ? byId.get(id) ?? null : null);

// Plain names + icons for payload roles (goal chips, objectives).
export const ROLE_INFO = {
  iot_transceiver: { icon: '📡', plainName: 'IoT message radio' },
  iot_antenna: { icon: '📶', plainName: 'IoT antennas' },
  atomic_clocks: { icon: '⏱️', plainName: 'Atomic clocks' },
  nav_signal: { icon: '〰️', plainName: 'Navigation signal' },
  nav_antenna: { icon: '📡', plainName: 'L-band antenna' },
  mw_radiometer: { icon: '🌦️', plainName: 'Microwave radiometer' },
  calibration: { icon: '🎚️', plainName: 'Calibration' },
  precip_radar: { icon: '🌧️', plainName: 'Rain radar' },
  gnss_ro: { icon: '📡', plainName: 'GNSS radio occultation' },
  atmo_sensor: { icon: '🌦️', plainName: 'Atmosphere sensor' },
  ir_sounder: { icon: '❄️', plainName: 'IR sounder' },
  clock_demo: { icon: '🧪', plainName: 'Clock demo' },
  no_clock: { icon: '🚫', plainName: 'No clock' },
  lra: { icon: '🪞', plainName: 'Laser retroreflector' },
  camera: { icon: '📷', plainName: 'Camera' },
};
// Back-compat alias (older UI code used TAG_INFO).
export const TAG_INFO = ROLE_INFO;

export const PAYLOAD_PLAIN = {
  service_payload: { icon: '🎯', plainName: 'Mission payload', realTerm: 'Service payload', whatFor: 'The reason the satellite exists.' },
  timing: { icon: '⏱️', plainName: 'Timing', realTerm: 'Timing (atomic frequency standards)', whatFor: 'Navigation is built on precise time.' },
  calibration: { icon: '🎚️', plainName: 'Calibration', realTerm: 'Calibration / reference', whatFor: 'Makes measurements trustworthy.' },
};
