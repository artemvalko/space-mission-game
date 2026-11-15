// Spacecraft bus parts — every row of the three research build lists (BOMs: §3.2, §4.3, §5.3).
// REAL DATA ONLY: every number comes from docs/NASA_Hackathon_Mission_Control_Deep_Research_UA.md.
//
// Schema: { id, category, icon, plainName, name (real engineering term), oneLiner, why ("What is it for?"),
//           mass (kg) | null, cost ($M) | null, costByMission?: { [scenarioId]: $M },
//           formFactor: 'cubesat' | 'large', missions: [scenarioId], status: 'must'|'recommended',
//           dataKind: 'fact'|'catalog'|'model', sources: ['Sxx'], ref: research section,
//           realExample?: { text, dataKind, sources }  ← shown in Details, never mixed into the model price
//           …category fields (maxMassKg, units, arrayW, capacityWh, rateMbps, …) }
// mass/cost null = not given in the research (shown as "not in our data", counted as 0 and flagged).

export const M_COMMS = 'mission_comms_iot';
export const M_NAV = 'mission_navigation_meo';
export const M_WX = 'mission_weather_mw';

// Bus categories in design.components. Research §7.1 names in CATEGORY_PLAIN[...].researchCategory.
export const COMPONENT_CATEGORIES = [
  'structure', 'power', 'battery', 'comms', 'downlink', 'computer', 'adcs', 'thermal', 'sensors', 'harness', 'propulsion', 'propellant',
];

// Categories a working satellite cannot fly without (research §8.5 "bus_support_complete").
export const REQUIRED_BUS = ['structure', 'power', 'battery', 'comms', 'computer', 'adcs', 'thermal', 'harness'];

// A category may also hold the value 'none' (the player chose to leave it out on purpose).
export const NONE = 'none';

export const CATEGORY_LABELS = {
  structure: 'Structure', power: 'Solar array + EPS', battery: 'Battery', comms: 'TT&C radio', downlink: 'Service / science downlink',
  computer: 'On-board computer', adcs: 'Attitude control (ADCS)', thermal: 'Thermal control', sensors: 'Orbit & time sensors',
  harness: 'Harness & integration', propulsion: 'On-board propulsion', propellant: 'On-board propellant',
};

const MODEL = 'model';

export const COMPONENTS = [
  // ── Structure. maxMassKg = typical CubeSat limit (fact S01); units = CubeSat size.
  {
    id: 'str_cube_3u', category: 'structure', icon: '🧊', plainName: 'CubeSat 3U', name: 'CubeSat 3U structure', formFactor: 'cubesat', units: 3, maxMassKg: 6,
    mass: null, cost: null, missions: [], dataKind: 'fact', sources: ['S01'], ref: '§1.1',
    oneLiner: 'Loaf-sized: up to 6 kg and 3 units of room.', why: 'The skeleton that holds everything and survives the launch.',
  },
  {
    id: 'str_6u', category: 'structure', icon: '🧊', plainName: 'CubeSat 6U frame', name: '6U structure + mechanical interfaces', formFactor: 'cubesat', units: 6, maxMassKg: 12, reserveFraction: 0.15,
    mass: 1.10, cost: 0.06, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: ['S01'], ref: '§3.2',
    oneLiner: 'Shoebox-sized: up to 12 kg in a standard dispenser.', why: 'Holds the electronics and survives the launch.',
  },
  {
    id: 'str_6u_weather', category: 'structure', icon: '🧊', plainName: 'CubeSat 6U frame', name: '6U structure (weather build)', formFactor: 'cubesat', units: 6, maxMassKg: 12, reserveFraction: 0.15,
    mass: 1.10, cost: 0.07, missions: [M_WX], status: 'must', dataKind: MODEL, sources: ['S01', 'S07'], ref: '§5.3',
    oneLiner: 'Shoebox-sized: 4U for the radiometer + 2U for the bus.', why: 'Room for the 4U radiometer and the bus systems.',
  },
  {
    id: 'str_cube_12u', category: 'structure', icon: '🧊', plainName: 'CubeSat 12U', name: 'CubeSat 12U structure', formFactor: 'cubesat', units: 12, maxMassKg: 24,
    mass: null, cost: null, missions: [], dataKind: 'fact', sources: ['S01', 'S32'], ref: '§1.1',
    oneLiner: 'Two shoeboxes: up to 24 kg. ESA Celeste IOD-1 is a real 12U.', why: 'A bigger CubeSat for heavier payloads.',
  },
  {
    id: 'str_gnss_meo', category: 'structure', icon: '🏗️', plainName: 'Galileo-class bus (~700 kg)', name: 'Reinforced structure + radiation shielding', formFactor: 'large', units: null, reserveFraction: 0, targetMassKg: 700,
    mass: 150, cost: 22, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: ['S04'], ref: '§4.3',
    oneLiner: 'A ~700 kg class navigation satellite body built for 12+ years in MEO.', why: 'Long MEO service and mechanical stability.',
    realExample: { text: 'Real Galileo FOC satellites weigh about 700–733 kg at launch and are designed for more than 12 years.', dataKind: 'fact', sources: ['S04'] },
  },

  // ── Solar array + EPS (power generation). arrayW = output in full sunlight.
  {
    id: 'eps_solar_6u', category: 'power', icon: '☀️', plainName: 'Fold-out solar wings + EPS', name: 'Deployable solar array + EPS', formFactor: 'cubesat', arrayW: 38.4,
    mass: 1.05, cost: 0.16, missions: [M_COMMS, M_WX], status: 'must', dataKind: MODEL, sources: ['S08'], ref: '§3.2 · §3.3',
    oneLiner: 'Up to 38.4 W in full sunlight; nothing in Earth\'s shadow.', why: 'Makes and distributes electricity.',
    realExample: { text: 'EnduroSat 6U deployable solar array: $59,000–88,000, 655–1065 g, up to 38.4 W in LEO (S08). A fixed 6U panel: $20,000, 392 g, 19.2 W (S09). Panel prices only — not a full EPS.', dataKind: 'catalog', sources: ['S08', 'S09'] },
  },
  {
    id: 'pwr_gnss_solar', category: 'power', icon: '🔆', plainName: 'Big solar wings + EPS', name: 'Large deployable solar arrays + EPS', formFactor: 'large', arrayW: 1600, arrayWMax: 1900,
    mass: 80, cost: 12, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: ['S04'], ref: '§4.3',
    oneLiner: '1.6–1.9 kW class arrays for a navigation satellite.', why: 'Power for clocks, signal generator and transmitters.',
    realExample: { text: 'Real Galileo FOC: about 1.4–1.9 kW of useful power, depending on the batch (S04).', dataKind: 'fact', sources: ['S04', 'S30'] },
  },

  // ── Battery. capacityWh; usable = 60% (depth of discharge).
  {
    id: 'battery_6u_60wh', category: 'battery', icon: '🔋', plainName: 'Battery 60 Wh', name: 'Li-ion battery 60 Wh', formFactor: 'cubesat', capacityWh: 60,
    mass: 0.60, cost: 0.05, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: [], ref: '§3.2',
    oneLiner: 'Keeps the satellite alive in the shadow and during radio peaks.', why: 'Energy for eclipse, launch and peak radio sessions.',
  },
  {
    id: 'battery_6u_80wh', category: 'battery', icon: '🔋', plainName: 'Battery 80 Wh', name: 'Li-ion battery 80 Wh', formFactor: 'cubesat', capacityWh: 80,
    mass: 0.55, cost: 0.06, missions: [M_WX], status: 'must', dataKind: MODEL, sources: [], ref: '§5.3',
    oneLiner: 'More energy for the shadow and the sensor\'s power peaks.', why: 'Energy for eclipse and instrument peaks.',
  },
  {
    id: 'bat_gnss_2500wh', category: 'battery', icon: '🔋', plainName: 'Battery 2.5 kWh', name: 'Redundant battery 2.5 kWh', formFactor: 'large', capacityWh: 2500,
    mass: 35, cost: 5, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: [], ref: '§4.3',
    oneLiner: 'Redundant energy store for shadow and safe mode.', why: 'Power in eclipse and in safe mode.',
  },

  // ── TT&C: controlling the satellite (NOT the mission payload).
  {
    id: 'ttc_uhf', category: 'comms', icon: '📻', plainName: 'Control radio (UHF)', name: 'UHF/VHF telemetry & command (TT&C)', formFactor: 'cubesat',
    mass: 0.30, cost: 0.05, costByMission: { [M_WX]: 0.06 }, missions: [M_COMMS, M_WX], status: 'must', dataKind: MODEL, sources: ['S03', 'S17'], ref: '§3.2 · §5.3',
    oneLiner: 'Lets the team command the satellite. It is not the mission radio.', why: 'Controlling the satellite — not a replacement for the payload.',
    realExample: { text: 'GomSpace NanoCom AX100 is a real 24.5 g VHF/UHF transceiver — but on its own it is not the whole TT&C system (S18).', dataKind: 'catalog', sources: ['S18'] },
  },
  {
    id: 'ttc_c_s_band', category: 'comms', icon: '📡', plainName: 'C-band uplink + S-band control', name: 'C-band uplink + S-band TT&C + antennas', formFactor: 'large',
    mass: 25, cost: 4, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: ['S04'], ref: '§4.3',
    oneLiner: 'Commands, data and clock corrections from the ground.', why: 'Commands, data and time synchronisation.',
    realExample: { text: 'Galileo satellites use C-band for the uplink and S-band for telemetry and commands (S04).', dataKind: 'fact', sources: ['S04'] },
  },

  // ── Service / science downlink (separate from TT&C).
  {
    id: 'dl_sband', category: 'downlink', icon: '📶', plainName: 'S-band packet downlink', name: 'S-band transmitter + antenna to the gateway', formFactor: 'cubesat', serves: 'iot',
    mass: 0.35, cost: 0.12, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: ['S03'], ref: '§3.2',
    oneLiner: 'Dumps the stored user messages to a ground gateway.', why: 'Sends the stored packets down to Earth.',
  },
  {
    id: 'science_sband', category: 'downlink', icon: '📶', plainName: 'S-band science downlink', name: 'S-band downlink + antenna', formFactor: 'cubesat', serves: 'weather', rateMbps: 5,
    mass: 0.40, cost: 0.14, missions: [M_WX], status: 'must', dataKind: MODEL, sources: ['S03'], ref: '§5.3 · §5.4',
    oneLiner: '5 Mbps example rate for the measurements.', why: 'Sends the measurements to the science station.',
  },

  // ── On-board computer.
  {
    id: 'obc_6u', category: 'computer', icon: '💻', plainName: 'Computer + packet memory', name: 'On-board computer + packet storage', formFactor: 'cubesat', storesPackets: true,
    mass: 0.25, cost: 0.10, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: [], ref: '§3.2',
    oneLiner: 'Stores messages until the next gateway pass.', why: 'Routing, storing and protecting user messages.',
  },
  {
    id: 'obc_weather', category: 'computer', icon: '💻', plainName: 'Computer + data buffer', name: 'On-board computer + data buffer', formFactor: 'cubesat', storesPackets: true,
    mass: 0.30, cost: 0.15, missions: [M_WX], status: 'must', dataKind: MODEL, sources: [], ref: '§5.3',
    oneLiner: 'Reads the sensor and stores data between passes.', why: 'Storage and sensor read-out.',
  },
  {
    id: 'obc_rad_hard', category: 'computer', icon: '🛡️', plainName: 'Radiation-hard computer', name: 'Rad-hard computer, memory, error control', formFactor: 'large',
    mass: 20, cost: 6, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: [], ref: '§4.3',
    oneLiner: 'Survives years of MEO radiation.', why: 'Control and navigation-data processing.',
  },

  // ── ADCS (pointing).
  {
    id: 'adcs_6u', category: 'adcs', icon: '🧭', plainName: 'Pointing unit', name: 'Sun/Earth sensors, magnetometers, wheels, magnetorquers', formFactor: 'cubesat',
    mass: 0.70, cost: 0.18, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: [], ref: '§3.2',
    oneLiner: 'Keeps the antennas pointed and the satellite steady.', why: 'Points the antennas; keeps it stable.',
  },
  {
    id: 'adcs_weather', category: 'adcs', icon: '🎯', plainName: 'Accurate pointing unit', name: 'Relatively precise ADCS', formFactor: 'cubesat',
    mass: 0.75, cost: 0.26, missions: [M_WX], status: 'must', dataKind: MODEL, sources: [], ref: '§5.3',
    oneLiner: 'Keeps the scan geometry right.', why: 'Correct scanning geometry.',
  },
  {
    id: 'adcs_precision_meo', category: 'adcs', icon: '🎯', plainName: 'Precision pointing', name: 'Gyros, star trackers, reaction wheels', formFactor: 'large',
    mass: 30, cost: 7, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: ['S05'], ref: '§4.3',
    oneLiner: 'Keeps the L-band beam pointed at Earth.', why: 'Points the navigation beam at Earth.',
  },

  // ── Thermal control.
  {
    id: 'thermal_6u', category: 'thermal', icon: '🌡️', plainName: 'Thermal control', name: 'Thermal protection + temperature sensors', formFactor: 'cubesat',
    mass: 0.25, cost: 0.05, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: [], ref: '§3.2',
    oneLiner: 'Keeps the electronics in a safe temperature range.', why: 'Safe temperatures for the electronics.',
  },
  {
    id: 'thermal_weather', category: 'thermal', icon: '🌡️', plainName: 'Thermal control', name: 'Thermal control (weather build)', formFactor: 'cubesat',
    mass: 0.25, cost: 0.10, missions: [M_WX], status: 'must', dataKind: MODEL, sources: ['S07'], ref: '§5.3',
    oneLiner: 'Keeps the detectors stable — vital for a radiometer.', why: 'Stable detectors.',
  },
  {
    id: 'thermal_meo', category: 'thermal', icon: '🌡️', plainName: 'Radiators, blankets & heaters', name: 'Radiators, MLI, heaters, temperature control', formFactor: 'large',
    mass: 35, cost: 4, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: ['S05'], ref: '§4.3',
    oneLiner: 'Atomic clocks need a very stable temperature.', why: 'Temperature stability for the clocks.',
  },

  // ── Orbit & time sensors.
  {
    id: 'gnss_receiver_bus', category: 'sensors', icon: '🛰️', plainName: 'GNSS receiver (own position)', name: 'GNSS receiver for the satellite\'s own orbit', formFactor: 'cubesat',
    mass: 0.10, cost: 0.04, missions: [M_COMMS], status: 'recommended', dataKind: MODEL, sources: [], ref: '§3.2',
    oneLiner: 'Tells the satellite where IT is. It does not give navigation to people on Earth.', why: 'Navigation of the spacecraft itself — not a GNSS service.',
  },
  {
    id: 'sun_orbit_sensors', category: 'sensors', icon: '🧭', plainName: 'Sun / orbit / time sensors', name: 'Sun, orbit and time sensors', formFactor: 'cubesat',
    mass: 0.25, cost: 0.08, missions: [M_WX], status: 'must', dataKind: MODEL, sources: [], ref: '§5.3',
    oneLiner: 'Tags every measurement with where and when it was taken.', why: 'Geolocation of every measurement.',
  },

  // ── Harness & integration.
  {
    id: 'harness_mech_6u', category: 'harness', icon: '🔌', plainName: 'Cables & mechanisms', name: 'Harness, mechanisms, mounting reserve', formFactor: 'cubesat',
    mass: 1.00, cost: 0.12, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: [], ref: '§3.2',
    oneLiner: 'Turns a pile of boxes into one working satellite.', why: 'A working, integrated assembly.',
  },
  {
    id: 'harness_misc_weather', category: 'harness', icon: '🔌', plainName: 'Cables & mounts', name: 'Harness, mounts, mechanical reserve', formFactor: 'cubesat',
    mass: 0.70, cost: 0.16, missions: [M_WX], status: 'must', dataKind: MODEL, sources: [], ref: '§5.3',
    oneLiner: 'Ties the radiometer and the bus together.', why: 'Integration.',
  },
  {
    id: 'integration_harness_meo', category: 'harness', icon: '🔌', plainName: 'Cables & integration', name: 'Harness, mounts, mechanical reserves', formFactor: 'large',
    mass: 25, cost: 5, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: [], ref: '§4.3',
    oneLiner: 'Makes all systems work together.', why: 'Interaction and compatibility of systems.',
  },

  // ── On-board propulsion (the satellite's own thrusters — never the rocket's fuel).
  {
    id: 'prop_meo_stationkeeping', category: 'propulsion', icon: '💨', plainName: 'Station-keeping thrusters', name: 'Thrusters, valves, lines, tanks (dry)', formFactor: 'large',
    mass: 12, cost: 5, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: [], ref: '§4.3',
    oneLiner: 'Corrects the orbit and moves the satellite away at end of life.', why: 'Orbit corrections and disposal.',
  },
  {
    id: 'propellant_meo', category: 'propellant', icon: '🛢️', plainName: 'On-board propellant', name: 'On-board propellant (110 kg)', formFactor: 'large',
    mass: 110, cost: 1, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: [], ref: '§4.3',
    oneLiner: 'Fuel for the satellite\'s own manoeuvres — not Falcon 9 fuel.', why: 'Manoeuvres after separation.',
  },
];

const byId = new Map(COMPONENTS.map((c) => [c.id, c]));
export const getComponent = (id) => (id && id !== NONE ? byId.get(id) ?? null : null);
export const componentsByCategory = (category) => COMPONENTS.filter((c) => c.category === category);
export const isCubeSat = (c) => c?.formFactor === 'cubesat';
/** Model cost of a part for this mission (some research rows differ per mission). */
export const costFor = (part, scenarioId) => (part ? part.costByMission?.[scenarioId] ?? part.cost : 0);

// Plain-English names for the UI; real engineering term as a subtitle; research category (§7.1).
export const CATEGORY_PLAIN = {
  structure: { icon: '🛰️', plainName: 'Satellite frame', realTerm: 'Structure', researchCategory: 'structure', glossary: 'bus', whatFor: 'The skeleton that carries everything through launch.' },
  power: { icon: '☀️', plainName: 'Solar wings', realTerm: 'Power generation (solar array + EPS)', researchCategory: 'power_generation', glossary: 'eclipse', whatFor: 'Makes electricity — but only in sunlight.' },
  battery: { icon: '🔋', plainName: 'Battery', realTerm: 'Energy storage', researchCategory: 'battery', glossary: 'eclipse', whatFor: 'Keeps the satellite alive in Earth\'s shadow.', noneText: 'No battery — lighter!', noneWhy: 'In sunlight there is enough power, but in the shadow the satellite switches off.' },
  comms: { icon: '📻', plainName: 'Control radio', realTerm: 'TT&C — telemetry, tracking & command', researchCategory: 'ttc', glossary: 'ttc', whatFor: 'Lets the team on Earth control the satellite.', noneText: 'No control radio', noneWhy: 'Nobody could send commands or hear the satellite\'s health.' },
  downlink: { icon: '📶', plainName: 'Mission downlink', realTerm: 'Service / science downlink', researchCategory: 'service_downlink', glossary: 'downlink', whatFor: 'Sends the mission\'s data (messages or measurements) to Earth.', noneText: 'No mission downlink', noneWhy: 'The data would stay on board — nothing reaches users.' },
  computer: { icon: '💻', plainName: 'Computer', realTerm: 'On-board computer (OBC) + flight software', researchCategory: 'computer', glossary: 'bus', whatFor: 'Runs the satellite and stores data between passes.' },
  adcs: { icon: '🎯', plainName: 'Pointing system', realTerm: 'ADCS — attitude determination & control', researchCategory: 'adcs', glossary: 'adcs', whatFor: 'Points antennas and sensors the right way.' },
  thermal: { icon: '🌡️', plainName: 'Thermal control', realTerm: 'Thermal management', researchCategory: 'thermal', glossary: 'thermal', whatFor: 'Keeps electronics, clocks and sensors at a safe, stable temperature.', noneText: 'No thermal control', noneWhy: 'The system may overheat or freeze out of its safe range.' },
  sensors: { icon: '🧭', plainName: 'Position & time sensors', realTerm: 'Orbit / Sun / time sensors', researchCategory: 'adcs', glossary: 'gnss', whatFor: 'Knows where the satellite is and when.', noneText: 'No extra sensors', noneWhy: 'Optional for some missions; the weather mission needs it to geolocate measurements.' },
  harness: { icon: '🔌', plainName: 'Cables & integration', realTerm: 'Harness & integration', researchCategory: 'structure', glossary: 'bus', whatFor: 'Connects every box into one working satellite.' },
  propulsion: { icon: '💨', plainName: 'Thrusters', realTerm: 'On-board propulsion', researchCategory: 'onboard_propulsion', glossary: 'deltaV', whatFor: 'Orbit corrections and moving away safely at end of life.', noneText: 'No thrusters', noneWhy: 'Fine for a small LEO CubeSat that the air slowly pulls down; a MEO satellite needs them to keep and leave its orbit.' },
  propellant: { icon: '🛢️', plainName: 'Propellant', realTerm: 'On-board propellant', researchCategory: 'onboard_propulsion', glossary: 'propellant', whatFor: 'Fuel for the satellite\'s own thrusters (never the rocket\'s fuel).', noneText: 'No propellant', noneWhy: 'Thrusters without fuel cannot move the satellite.' },
};

// Satellite sizes offered on the "Satellite size" step (research §6.3: 3U / 6U / 12U / large bus).
export const SIZE_CLASSES = [
  { id: '3u', icon: '🧊', plainName: 'CubeSat 3U', structures: ['str_cube_3u'] },
  { id: '6u', icon: '🧊', plainName: 'CubeSat 6U', structures: ['str_6u', 'str_6u_weather'] },
  { id: '12u', icon: '🧊', plainName: 'CubeSat 12U', structures: ['str_cube_12u'] },
  { id: 'large', icon: '🏗️', plainName: 'Large bus (~700 kg class)', structures: ['str_gnss_meo'] },
];
export const sizeClassOf = (structureId) => SIZE_CLASSES.find((s) => s.structures.includes(structureId)) ?? null;
/** The structure part a size class resolves to for this mission. */
export const structureFor = (sizeClass, scenarioId) =>
  getComponent(sizeClass.structures.find((id) => getComponent(id).missions.includes(scenarioId)) ?? sizeClass.structures[0]);
