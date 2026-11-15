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
    id: 'payload_iot_sdr', category: 'service_payload', role: 'iot_transceiver', icon: '📡', plainName: 'IoT message radio', name: 'Two-way narrowband IoT transceiver (SDR / LoRa-like)', formFactor: 'cubesat',
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
    id: 'clock_phm_rubidium_4', category: 'timing', role: 'atomic_clocks', icon: '⏱️', plainName: '4 atomic clocks', name: '2 passive hydrogen masers + 2 rubidium clocks + clock monitoring', formFactor: 'large',
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
    id: 'payload_mw_radiometer', category: 'service_payload', role: 'mw_radiometer', icon: '🌦️', plainName: 'Microwave radiometer', name: '5-channel passive microwave radiometer + scan mechanism', formFactor: 'cubesat', volumeU: 4,
    mass: 2.70, cost: 4.00, missions: [M_WX], status: 'must', dataKind: 'model', sources: ['S06', 'S07'], ref: '§5.3',
    oneLiner: 'Measures the atmosphere\'s natural microwave glow — through clouds, day and night.', why: 'The main science measurement.',
    realExample: { text: 'NASA/JPL TEMPEST-D: a 5-channel radiometer filling about 4U of a 6U CubeSat (S07). NASA TROPICS: 3U, ~5.4 kg, 12 channels (S06).', dataKind: 'fact', sources: ['S06', 'S07'] },
  },
  {
    id: 'radiometer_calibration', category: 'calibration', role: 'calibration', icon: '🎚️', plainName: 'Calibration module', name: 'Radiometer calibration / reference module', formFactor: 'cubesat',
    mass: 0.25, cost: 0.30, missions: [M_WX], status: 'must', dataKind: 'model', sources: [], ref: '§5.3',
    oneLiner: 'Makes temperatures trustworthy.', about: 'Checks the radiometer against a known reference so temperatures are trustworthy.', why: 'Accurate, stable temperatures.',
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
  camera: { icon: '📷', plainName: 'Camera' },
};
// Back-compat alias (older UI code used TAG_INFO).
export const TAG_INFO = ROLE_INFO;

export const PAYLOAD_PLAIN = {
  service_payload: { icon: '🎯', plainName: 'Mission payload', realTerm: 'Service payload', whatFor: 'The reason the satellite exists.' },
  timing: { icon: '⏱️', plainName: 'Timing', realTerm: 'Timing (atomic frequency standards)', whatFor: 'Navigation is built on precise time.' },
  calibration: { icon: '🎚️', plainName: 'Calibration', realTerm: 'Calibration / reference', whatFor: 'Makes measurements trustworthy.' },
};
