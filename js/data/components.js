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
  'structure', 'power', 'battery', 'comms', 'downlink', 'computer', 'adcs', 'thermal', 'sensors', 'harness', 'propulsion', 'propellant', 'eol',
];

// Categories a working satellite cannot fly without (research §8.5 "bus_support_complete").
export const REQUIRED_BUS = ['structure', 'power', 'battery', 'comms', 'computer', 'adcs', 'thermal', 'harness'];

// A category may also hold the value 'none' (the player chose to leave it out on purpose).
export const NONE = 'none';

export const CATEGORY_LABELS = {
  structure: 'Structure', power: 'Solar array + EPS', battery: 'Battery', comms: 'TT&C radio', downlink: 'Service / science downlink',
  computer: 'On-board computer', adcs: 'Attitude control (ADCS)', thermal: 'Thermal control', sensors: 'Orbit & time sensors',
  harness: 'Harness & integration', propulsion: 'On-board propulsion', propellant: 'On-board propellant', eol: 'End of life',
};

const MODEL = 'model';

export const COMPONENTS = [
  // ── Structure. maxMassKg = typical CubeSat limit (fact S01); units = CubeSat size.
  {
    id: 'str_cube_3u', category: 'structure', icon: 'cube', plainName: 'CubeSat 3U', name: 'EnduroSat 3U CubeSat Structure', formFactor: 'cubesat', units: 3, maxMassKg: 6,
    mass: 0.285, cost: 0.0042, costText: '$3,900–4,200 store (we count $4,200); avg $3,300–3,600 FY2021', missions: [], dataKind: 'catalog', sources: ['S01', 'O46', 'O47'], ref: 'options §1.7',
    oneLiner: 'Loaf-sized, up to 6 kg.', about: 'Loaf-sized: up to 6 kg and 3 units of room.', why: 'The skeleton that holds everything and survives the launch.',
  },
  {
    id: 'str_6u', category: 'structure', icon: 'cube', plainName: 'CubeSat 6U frame', name: '6U structure + mechanical interfaces', formFactor: 'cubesat', units: 6, maxMassKg: 12, reserveFraction: 0.15,
    mass: 1.10, cost: 0.06, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: ['S01'], ref: '§3.2',
    oneLiner: 'Shoebox-sized, up to 12 kg.', about: 'Shoebox-sized: up to 12 kg in a standard dispenser.', why: 'Holds the electronics and survives the launch.',
  },
  {
    id: 'str_6u_weather', category: 'structure', icon: 'cube', plainName: 'CubeSat 6U frame', name: '6U structure (weather build)', formFactor: 'cubesat', units: 6, maxMassKg: 12, reserveFraction: 0.15,
    mass: 1.10, cost: 0.07, missions: [M_WX], status: 'must', dataKind: MODEL, sources: ['S01', 'S07'], ref: '§5.3',
    oneLiner: 'Shoebox: 4U radiometer + 2U bus.', about: 'Shoebox-sized: 4U for the radiometer + 2U for the bus.', why: 'Room for the 4U radiometer and the bus systems.',
  },
  {
    id: 'str_cube_12u', category: 'structure', icon: 'cube', plainName: 'CubeSat 12U XL', name: 'EnduroSat 12U XL CubeSat Structure', formFactor: 'cubesat', units: 12, maxMassKg: 24,
    mass: 2.44, cost: 0.013, missions: [], dataKind: 'catalog', sources: ['S01', 'S32', 'O46', 'O48'], ref: 'options §1.7',
    oneLiner: 'Two shoeboxes, up to 24 kg.', about: 'Two shoeboxes: up to 24 kg. ESA Celeste IOD-1 is a real 12U.', why: 'A bigger CubeSat for heavier payloads.',
  },
  {
    id: 'str_gnss_meo', category: 'structure', icon: 'layers', plainName: 'Galileo-class bus (~700 kg)', name: 'Reinforced structure + radiation shielding', formFactor: 'large', units: null, reserveFraction: 0, targetMassKg: 700,
    mass: 150, cost: 22, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: ['S04'], ref: '§4.3',
    oneLiner: '~700 kg body for MEO.', about: 'A ~700 kg class navigation satellite body built for 12+ years in MEO.', why: 'Long MEO service and mechanical stability.',
    realExample: { text: 'Real Galileo FOC satellites weigh about 700–733 kg at launch and are designed for more than 12 years.', dataKind: 'fact', sources: ['S04'] },
  },

  // ── Solar array + EPS (power generation). arrayW = output in full sunlight.
  {
    id: 'eps_solar_6u', category: 'power', icon: 'sun', plainName: 'Fold-out solar wings + EPS', name: 'Deployable solar array + EPS', formFactor: 'cubesat', arrayW: 38.4,
    mass: 1.05, cost: 0.16, missions: [M_COMMS, M_WX], status: 'must', dataKind: MODEL, sources: ['S08'], ref: '§3.2 · §3.3',
    oneLiner: '38.4 W in sun, 0 in shadow.', about: 'Up to 38.4 W in full sunlight; nothing in Earth\'s shadow.', why: 'Makes and distributes electricity.',
    realExample: { text: 'EnduroSat 6U deployable solar array: $59,000–88,000, 655–1065 g, up to 38.4 W in LEO (S08). A fixed 6U panel: $20,000, 392 g, 19.2 W (S09). Panel prices only — not a full EPS.', dataKind: 'catalog', sources: ['S08', 'S09'] },
  },
  {
    id: 'pwr_gnss_solar', category: 'power', icon: 'panel', plainName: 'Big solar wings + EPS', name: 'Large deployable solar arrays + EPS', formFactor: 'large', arrayW: 1600, arrayWMax: 1900,
    mass: 80, cost: 12, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: ['S04'], ref: '§4.3',
    oneLiner: '1.6–1.9 kW class.', about: '1.6–1.9 kW class arrays for a navigation satellite.', why: 'Power for clocks, signal generator and transmitters.',
    realExample: { text: 'Real Galileo FOC: about 1.4–1.9 kW of useful power, depending on the batch (S04).', dataKind: 'fact', sources: ['S04', 'S30'] },
  },

  // ── Battery. capacityWh; usable = 60% (depth of discharge).
  {
    id: 'battery_6u_60wh', category: 'battery', icon: 'battery', plainName: 'Battery 60 Wh', name: 'Li-ion battery 60 Wh', formFactor: 'cubesat', capacityWh: 60,
    mass: 0.60, cost: 0.05, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: [], ref: '§3.2',
    oneLiner: 'Power for shadow and peaks.', about: 'Keeps the satellite alive in the shadow and during radio peaks.', why: 'Energy for eclipse, launch and peak radio sessions.',
  },
  {
    id: 'battery_6u_80wh', category: 'battery', icon: 'battery', plainName: 'Battery 80 Wh', name: 'Li-ion battery 80 Wh', formFactor: 'cubesat', capacityWh: 80,
    mass: 0.55, cost: 0.06, missions: [M_WX], status: 'must', dataKind: MODEL, sources: [], ref: '§5.3',
    oneLiner: 'More energy for shadow and peaks.', about: 'More energy for the shadow and the sensor\'s power peaks.', why: 'Energy for eclipse and instrument peaks.',
  },
  {
    id: 'bat_gnss_2500wh', category: 'battery', icon: 'battery', plainName: 'Battery 2.5 kWh', name: 'Redundant battery 2.5 kWh', formFactor: 'large', capacityWh: 2500,
    mass: 35, cost: 5, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: [], ref: '§4.3',
    oneLiner: 'Power for shadow and safe mode.', about: 'Redundant energy store for shadow and safe mode.', why: 'Power in eclipse and in safe mode.',
  },

  // ── TT&C: controlling the satellite (NOT the mission payload).
  {
    id: 'ttc_uhf', category: 'comms', icon: 'radio', plainName: 'Control radio (UHF)', name: 'UHF/VHF telemetry & command (TT&C)', formFactor: 'cubesat',
    mass: 0.30, cost: 0.05, costByMission: { [M_WX]: 0.06 }, missions: [M_COMMS, M_WX], status: 'must', dataKind: MODEL, sources: ['S03', 'S17'], ref: '§3.2 · §5.3',
    oneLiner: 'Commands the satellite.', about: 'Lets the team command the satellite. It is not the mission radio.', why: 'Controlling the satellite — not a replacement for the payload.',
    realExample: { text: 'GomSpace NanoCom AX100 is a real 24.5 g VHF/UHF transceiver — but on its own it is not the whole TT&C system (S18).', dataKind: 'catalog', sources: ['S18'] },
  },
  {
    id: 'ttc_c_s_band', category: 'comms', icon: 'antenna', plainName: 'C-band uplink + S-band control', name: 'C-band uplink + S-band TT&C + antennas', formFactor: 'large',
    mass: 25, cost: 4, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: ['S04'], ref: '§4.3',
    oneLiner: 'Commands and clock corrections.', about: 'Commands, data and clock corrections from the ground.', why: 'Commands, data and time synchronisation.',
    realExample: { text: 'Galileo satellites use C-band for the uplink and S-band for telemetry and commands (S04).', dataKind: 'fact', sources: ['S04'] },
  },

  // ── Service / science downlink (separate from TT&C).
  {
    id: 'dl_sband', category: 'downlink', icon: 'signal', plainName: 'S-band packet downlink', name: 'S-band transmitter + antenna to the gateway', formFactor: 'cubesat', serves: 'iot',
    mass: 0.35, cost: 0.12, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: ['S03'], ref: '§3.2',
    oneLiner: 'Dumps messages to a gateway.', about: 'Dumps the stored user messages to a ground gateway.', why: 'Sends the stored packets down to Earth.',
  },
  {
    id: 'science_sband', category: 'downlink', icon: 'signal', plainName: 'S-band science downlink', name: 'S-band downlink + antenna', formFactor: 'cubesat', serves: 'weather', rateMbps: 5,
    mass: 0.40, cost: 0.14, missions: [M_WX], status: 'must', dataKind: MODEL, sources: ['S03'], ref: '§5.3 · §5.4',
    oneLiner: 'Sends the measurements down.', about: '5 Mbps example rate for the measurements.', why: 'Sends the measurements to the science station.',
  },

  // ── On-board computer.
  {
    id: 'obc_6u', category: 'computer', icon: 'chip', plainName: 'Computer + packet memory', name: 'On-board computer + packet storage', formFactor: 'cubesat', storesPackets: true,
    mass: 0.25, cost: 0.10, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: [], ref: '§3.2',
    oneLiner: 'Stores messages between passes.', about: 'Stores messages until the next gateway pass.', why: 'Routing, storing and protecting user messages.',
  },
  {
    id: 'obc_weather', category: 'computer', icon: 'chip', plainName: 'Computer + data buffer', name: 'On-board computer + data buffer', formFactor: 'cubesat', storesPackets: true,
    mass: 0.30, cost: 0.15, missions: [M_WX], status: 'must', dataKind: MODEL, sources: [], ref: '§5.3',
    oneLiner: 'Reads and stores the data.', about: 'Reads the sensor and stores data between passes.', why: 'Storage and sensor read-out.',
  },
  {
    id: 'obc_rad_hard', category: 'computer', icon: 'shield', plainName: 'Radiation-hard computer', name: 'Rad-hard computer, memory, error control', formFactor: 'large',
    mass: 20, cost: 6, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: [], ref: '§4.3',
    oneLiner: 'Survives years of MEO radiation.', why: 'Control and navigation-data processing.',
  },

  // ── ADCS (pointing).
  {
    id: 'adcs_6u', category: 'adcs', icon: 'compass', plainName: 'Pointing unit', name: 'Sun/Earth sensors, magnetometers, wheels, magnetorquers', formFactor: 'cubesat',
    mass: 0.70, cost: 0.18, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: [], ref: '§3.2',
    oneLiner: 'Points the antennas.', about: 'Keeps the antennas pointed and the satellite steady.', why: 'Points the antennas; keeps it stable.',
  },
  {
    id: 'adcs_weather', category: 'adcs', icon: 'target', plainName: 'Accurate pointing unit', name: 'Relatively precise ADCS', formFactor: 'cubesat',
    mass: 0.75, cost: 0.26, missions: [M_WX], status: 'must', dataKind: MODEL, sources: [], ref: '§5.3',
    oneLiner: 'Keeps the scan geometry right.', why: 'Correct scanning geometry.',
  },
  {
    id: 'adcs_precision_meo', category: 'adcs', icon: 'target', plainName: 'Precision pointing', name: 'Gyros, star trackers, reaction wheels', formFactor: 'large',
    mass: 30, cost: 7, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: ['S05'], ref: '§4.3',
    oneLiner: 'Points the beam at Earth.', about: 'Keeps the L-band beam pointed at Earth.', why: 'Points the navigation beam at Earth.',
  },

  // ── Thermal control.
  {
    id: 'thermal_6u', category: 'thermal', icon: 'thermometer', plainName: 'Thermal control', name: 'Thermal protection + temperature sensors', formFactor: 'cubesat',
    mass: 0.25, cost: 0.05, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: [], ref: '§3.2',
    oneLiner: 'Not too hot, not too cold.', about: 'Keeps the electronics in a safe temperature range.', why: 'Safe temperatures for the electronics.',
  },
  {
    id: 'thermal_weather', category: 'thermal', icon: 'thermometer', plainName: 'Thermal control', name: 'Thermal control (weather build)', formFactor: 'cubesat',
    mass: 0.25, cost: 0.10, missions: [M_WX], status: 'must', dataKind: MODEL, sources: ['S07'], ref: '§5.3',
    oneLiner: 'Keeps the detectors stable.', about: 'Keeps the detectors stable — vital for a radiometer.', why: 'Stable detectors.',
  },
  {
    id: 'thermal_meo', category: 'thermal', icon: 'thermometer', plainName: 'Radiators, blankets & heaters', name: 'Radiators, MLI, heaters, temperature control', formFactor: 'large',
    mass: 35, cost: 4, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: ['S05'], ref: '§4.3',
    oneLiner: 'Stable temperature for the clocks.', about: 'Atomic clocks need a very stable temperature.', why: 'Temperature stability for the clocks.',
  },

  // ── Orbit & time sensors.
  {
    id: 'gnss_receiver_bus', category: 'sensors', icon: 'satellite', plainName: 'GNSS receiver (own position)', name: 'GNSS receiver for the satellite\'s own orbit', formFactor: 'cubesat',
    mass: 0.10, cost: 0.04, missions: [M_COMMS], status: 'recommended', dataKind: MODEL, sources: [], ref: '§3.2',
    oneLiner: 'Knows its own position.', about: 'Tells the satellite where IT is. It does not give navigation to people on Earth.', why: 'Navigation of the spacecraft itself — not a GNSS service.',
  },
  {
    id: 'sun_orbit_sensors', category: 'sensors', icon: 'compass', plainName: 'Sun / orbit / time sensors', name: 'Sun, orbit and time sensors', formFactor: 'cubesat',
    mass: 0.25, cost: 0.08, missions: [M_WX], status: 'must', dataKind: MODEL, sources: [], ref: '§5.3',
    oneLiner: 'Where and when for each sample.', about: 'Tags every measurement with where and when it was taken.', why: 'Geolocation of every measurement.',
  },

  // ── Harness & integration.
  {
    id: 'harness_mech_6u', category: 'harness', icon: 'link', plainName: 'Cables & mechanisms', name: 'Harness, mechanisms, mounting reserve', formFactor: 'cubesat',
    mass: 1.00, cost: 0.12, missions: [M_COMMS], status: 'must', dataKind: MODEL, sources: [], ref: '§3.2',
    oneLiner: 'Connects everything together.', about: 'Turns a pile of boxes into one working satellite.', why: 'A working, integrated assembly.',
  },
  {
    id: 'harness_misc_weather', category: 'harness', icon: 'link', plainName: 'Cables & mounts', name: 'Harness, mounts, mechanical reserve', formFactor: 'cubesat',
    mass: 0.70, cost: 0.16, missions: [M_WX], status: 'must', dataKind: MODEL, sources: [], ref: '§5.3',
    oneLiner: 'Connects everything together.', about: 'Ties the radiometer and the bus together.', why: 'Integration.',
  },
  {
    id: 'integration_harness_meo', category: 'harness', icon: 'link', plainName: 'Cables & integration', name: 'Harness, mounts, mechanical reserves', formFactor: 'large',
    mass: 25, cost: 5, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: [], ref: '§4.3',
    oneLiner: 'Makes all systems work together.', why: 'Interaction and compatibility of systems.',
  },

  // ── On-board propulsion (the satellite's own thrusters — never the rocket's fuel).
  {
    id: 'prop_meo_stationkeeping', category: 'propulsion', icon: 'wind', plainName: 'Station-keeping thrusters', name: 'Thrusters, valves, lines, tanks (dry)', formFactor: 'large',
    mass: 12, cost: 5, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: [], ref: '§4.3',
    oneLiner: 'Keeps and leaves the orbit.', about: 'Corrects the orbit and moves the satellite away at end of life.', why: 'Orbit corrections and disposal.',
  },
  {
    id: 'propellant_meo', category: 'propellant', icon: 'tank', plainName: 'On-board propellant', name: 'On-board propellant (110 kg)', formFactor: 'large',
    mass: 110, cost: 1, missions: [M_NAV], status: 'must', dataKind: MODEL, sources: [], ref: '§4.3',
    oneLiner: 'Fuel for the satellite\'s own manoeuvres — not Falcon 9 fuel.', why: 'Manoeuvres after separation.',
  },

  // ═══ Options supplement (docs/OPTIONS_RESEARCH.md). NOT PUBLIC = null, never 0. ═══════════════
  // ── More real frames (§1.7)
  {
    id: 'str_es_6u_xl', category: 'structure', icon: 'cube', plainName: 'CubeSat 6U XL', name: 'EnduroSat 6U XL CubeSat Structure', formFactor: 'cubesat', units: 6, maxMassKg: 12,
    mass: null, cost: 0.0076, missions: [], dataKind: 'catalog', sources: ['S01', 'O46'], ref: 'options §1.7',
    oneLiner: 'Real store frame; mass not public.', why: 'Holds the electronics and survives the launch.',
  },
  {
    id: 'str_es_8u', category: 'structure', icon: 'cube', plainName: 'CubeSat 8U', name: 'EnduroSat 8U CubeSat Structure', formFactor: 'cubesat', units: 8, maxMassKg: null,
    mass: null, cost: 0.0093, missions: [], dataKind: 'catalog', sources: ['O46'], ref: 'options §1.7',
    oneLiner: 'Roomy; mass and limit not public.', why: 'A bigger CubeSat frame.',
  },
  // ── Reference builds: complete REAL satellites whose total mass is public (§5 rule 4).
  // reference.includes = categories that come with the satellite; payloadRoles = what its payload does.
  {
    id: 'ref_swarm_spacebee', heritage: 'Swarm', category: 'structure', icon: 'swarm', plainName: 'Swarm SpaceBEE (real)', name: 'Swarm SpaceBEE — whole satellite, 0.25U', formFactor: 'cubesat', units: 0.25, maxMassKg: null,
    mass: null, cost: null, missions: ['mission_comms_iot'], dataKind: 'reported', sources: ['O20', 'O21', 'O22'], ref: 'options §2.1',
    reference: { totalMassKg: 0.4, massText: '~400 g (tracking database: 0.284 kg)', payloadRoles: ['iot_transceiver', 'iot_antenna'], language: 'swarm', fleet: 150, licensingNote: 'The FCC refused Swarm’s first licence in 2017: satellites this small are hard to track.' },
    oneLiner: 'Tiny and cheap; needs ~150 sats.', why: 'A complete flown IoT satellite — you use its real total mass.',
  },
  {
    id: 'ref_astrocast_3u', heritage: 'Astrocast', category: 'structure', icon: 'signal', plainName: 'Astrocast 3U (real)', name: 'Astrocast — whole satellite, 3U', formFactor: 'cubesat', units: 3, maxMassKg: 6,
    mass: null, cost: null, missions: ['mission_comms_iot'], dataKind: 'reported', sources: ['O23', 'O24', 'O25'], ref: 'options §2.1',
    reference: { totalMassKg: 4.5, massText: '~4.5 kg', payloadRoles: ['iot_transceiver', 'iot_antenna'], language: 'lband', fleet: 64 },
    oneLiner: 'Licensed L-band; 64 sats planned.', why: 'A complete flown IoT satellite — you use its real total mass.',
  },
  {
    id: 'ref_sateliot_6u', heritage: 'Sateliot', category: 'structure', icon: 'phone', plainName: 'Sateliot 6U (real)', name: 'Sateliot (Alén Space) — whole satellite, 6U', formFactor: 'cubesat', units: 6, maxMassKg: 12,
    mass: null, cost: null, missions: ['mission_comms_iot'], dataKind: 'fact', sources: ['S31'], ref: '§3.1 · options §2.1',
    reference: { totalMassKg: 10, massText: '10 kg', payloadRoles: ['iot_transceiver', 'iot_antenna'], language: 'nbiot', designLifeYears: 5 },
    oneLiner: 'Talks to standard phone IoT chips.', why: 'A complete flown IoT satellite — you use its real total mass.',
  },
  {
    id: 'ref_tropics_3u', heritage: 'TROPICS', category: 'structure', icon: 'storm', plainName: 'TROPICS 3U (real)', name: 'NASA TROPICS — whole satellite, 3U', formFactor: 'cubesat', units: 3, maxMassKg: 6,
    mass: null, cost: null, missions: ['mission_weather_mw'], dataKind: 'fact', sources: ['O32', 'O33', 'O34'], ref: 'options §3.1–3.2',
    reference: { totalMassKg: 5.4, massText: '5.34–5.4 kg', payloadRoles: ['mw_radiometer', 'calibration'], sensor: 'wx_tropics_radiometer', powerW: 15, fleet: 4 },
    oneLiner: '12 channels in 3U; spins at 30 rpm.', why: 'A complete flown weather satellite — you use its real total mass.',
  },
  {
    id: 'ref_raincube_6u', heritage: 'RainCube', category: 'structure', icon: 'rain', plainName: 'RainCube 6U (real)', name: 'NASA/JPL RainCube — whole satellite, 6U', formFactor: 'cubesat', units: 6, maxMassKg: 12,
    mass: null, cost: null, missions: ['mission_weather_mw'], dataKind: 'fact', sources: ['O30', 'O35', 'O36'], ref: 'options §3.1–3.2',
    reference: { totalMassKg: 12, massText: '12 kg — right at the 6U limit', payloadRoles: ['precip_radar'], sensor: 'wx_raincube_radar' },
    oneLiner: 'Rain radar; right at 12 kg.', why: 'A complete flown weather satellite — you use its real total mass.',
  },
  {
    id: 'ref_gps_iii', heritage: 'GPS III', category: 'structure', icon: 'satellite', plainName: 'GPS III (real)', name: 'GPS III (Lockheed Martin) — whole satellite', formFactor: 'large', units: null, reserveFraction: 0,
    mass: null, cost: null, missions: ['mission_navigation_meo'], dataKind: 'fact', sources: ['O40'], ref: 'options §4.1',
    reference: { totalMassKg: 3681, massText: '8,115 lb ≈ 3,681 kg (on orbit 4,764 lb)', payloadRoles: ['atomic_clocks', 'nav_signal', 'nav_antenna'], clocks: 'clk_rafs_3', designLifeYears: 15 },
    oneLiner: '~5× heavier; 15-year design life.', why: 'A complete real navigation satellite — you use its real total mass.',
  },
  // ── Solar (§1.1, EnduroSat [CATALOG]). Where listings disagree we count the higher mass and show both.
  {
    id: 'pwr_6u_fixed', category: 'power', icon: 'sun', plainName: '6U fixed panel', name: 'EnduroSat 6U Solar Panel (body-mounted)', formFactor: 'cubesat', arrayW: 19.2, fitsUnits: [6, 8, 12],
    mass: 0.545, cost: 0.0162, costText: '$16,200 store · $20,000 (research S09)', massText: '390 g · newer page 545 g (we count 545 g)',
    missions: [], dataKind: 'catalog', sources: ['O01', 'O02', 'S09'], ref: 'options §1.1',
    oneLiner: 'Cheap, nothing to unfold; half the power.', why: 'Makes electricity in sunlight.',
  },
  {
    id: 'pwr_6u_deploy', category: 'power', icon: 'panel', plainName: '6U deployable wings', name: 'EnduroSat 6U Deployable Solar Array', formFactor: 'cubesat', arrayW: 38.4, fitsUnits: [6, 8, 12],
    mass: 1.065, cost: 0.0484, costText: '$48,400 store · $51,300 satsearch · $59–88k (research S08)', massText: '655–1065 g (we count 1065 g)',
    missions: [], dataKind: 'catalog', sources: ['O01', 'O03', 'S08'], ref: 'options §1.1',
    oneLiner: 'Double power; must unfold correctly.', why: 'Makes electricity in sunlight — 19.2 W per side.',
  },
  {
    id: 'pwr_3u_deploy', category: 'power', icon: 'panel', plainName: '3U deployable wings', name: 'EnduroSat 3U Deployable Solar Array', formFactor: 'cubesat', arrayW: 16.8, fitsUnits: [3],
    mass: null, cost: 0.0333, costText: '$19,800–33,300 store (we count $33,300)',
    missions: [], dataKind: 'catalog', sources: ['O01', 'O04'], ref: 'options §1.1',
    oneLiner: 'For a 3U only; mass not public.', why: 'Makes electricity in sunlight — 8.4 W per side.',
  },
  {
    id: 'pwr_8u_deploy', category: 'power', icon: 'panel', plainName: '8U deployable wings', name: 'EnduroSat 8U Deployable Solar Array', formFactor: 'cubesat', arrayW: 48, fitsUnits: [6, 8, 12],
    mass: 1.035, cost: 0.0604, costText: '$20,100–60,400 store (we count $60,400)', massText: '930–1035 g (we count 1035 g)',
    missions: [], dataKind: 'catalog', sources: ['O01', 'O05'], ref: 'options §1.1',
    oneLiner: 'More power than a 6U needs.', why: 'Makes electricity in sunlight — 24 W per side.',
  },
  // ── EPS + battery (§1.2, EnduroSat 2022 catalog — historical; prices NOT PUBLIC)
  {
    id: 'bat_eps1', category: 'battery', icon: 'battery', plainName: 'EPS I · 10.2 Wh', name: 'EnduroSat EPS I (power board + battery)', formFactor: 'cubesat', capacityWh: 10.2,
    mass: 0.208, cost: null, estimatedFrom: 'battery_6u_60wh', missions: [], dataKind: 'catalog', sources: ['O06'], ref: 'options §1.2',
    oneLiner: 'Lightest — too small for a long shadow?', why: 'Power board + battery for the shadow.',
  },
  {
    id: 'bat_eps1plus', category: 'battery', icon: 'battery', plainName: 'EPS I+ · 20.4 Wh', name: 'EnduroSat EPS I+ (power board + battery)', formFactor: 'cubesat', capacityWh: 20.4,
    mass: 0.298, cost: null, estimatedFrom: 'battery_6u_60wh', missions: [], dataKind: 'catalog', sources: ['O06'], ref: 'options §1.2',
    oneLiner: 'Just enough, thin margin.', why: 'Power board + battery for the shadow.',
  },
  {
    id: 'bat_eps2', category: 'battery', icon: 'battery', plainName: 'EPS II · 84 Wh', name: 'EnduroSat EPS II (redundant buses)', formFactor: 'cubesat', capacityWh: 84,
    mass: 1.28, cost: null, estimatedFrom: 'battery_6u_80wh', missions: [], dataKind: 'catalog', sources: ['O06'], ref: 'options §1.2',
    oneLiner: 'Huge margin, ~1 kg heavier.', why: 'Power board + battery with redundant buses.',
  },
  // ── Control radio (§1.3)
  {
    id: 'ttc_es_uhf2', category: 'comms', icon: 'radio', plainName: 'UHF Transceiver II', name: 'EnduroSat UHF Transceiver II (19.2 kbps)', formFactor: 'cubesat', rateMbps: 0.0192,
    mass: 0.094, cost: 0.0063, costText: '$6,300 list (2026) · $4,600 avg FY2021', missions: [], dataKind: 'catalog', sources: ['O07', 'O08', 'O09'], ref: 'options §1.3',
    oneLiner: 'Light, cheap, slow: commands only.', why: 'Controlling the satellite.',
  },
  {
    id: 'ttc_gom_ax100', category: 'comms', icon: 'radio', plainName: 'GomSpace AX100', name: 'GomSpace NanoCom AX100 (VHF/UHF)', formFactor: 'cubesat',
    mass: 0.0245, cost: null, estimatedFrom: 'ttc_uhf', missions: [], dataKind: 'catalog', sources: ['S18'], ref: 'options §1.3',
    oneLiner: 'Only 24.5 g; price not public.', why: 'Controlling the satellite.',
  },
  {
    id: 'ttc_es_sband_trx', category: 'comms', icon: 'antenna', plainName: 'S-band transceiver', name: 'EnduroSat S-Band Transceiver (full duplex, 125 kbps)', formFactor: 'cubesat', rateMbps: 0.125, peakW: 12,
    mass: 0.246, cost: 0.014, missions: [], dataKind: 'catalog', sources: ['O10', 'O11'], ref: 'options §1.3',
    oneLiner: 'Faster; can carry data too. 12 W peak.', why: 'Controlling the satellite (and small data).',
  },
  // ── Data downlink (§1.4)
  {
    id: 'dl_es_sband_tx', category: 'downlink', icon: 'signal', plainName: 'S-band transmitter', name: 'EnduroSat S-Band Transmitter (20 Mbps)', formFactor: 'cubesat', serves: ['iot', 'weather'], rateMbps: 20,
    mass: 0.25, cost: null, estimatedFrom: 'science_sband', missions: [], dataKind: 'catalog', sources: ['O12'], ref: 'options §1.4',
    oneLiner: 'Fast enough for science data.', why: 'Sends the mission data to Earth (needs S-band ground).',
  },
  {
    id: 'dl_es_xband_tx', category: 'downlink', icon: 'signal', plainName: 'X-band transmitter', name: 'EnduroSat X-Band Transmitter (150 Mbps)', formFactor: 'cubesat', serves: ['iot', 'weather'], rateMbps: 150, needsXband: true,
    mass: 0.396, cost: null, missions: [], dataKind: 'catalog', sources: ['O13'], ref: 'options §1.4',
    oneLiner: 'Overkill here; needs X-band ground.', why: 'Very fast downlink — far more than bytes or 8 kbps need.',
  },
  {
    id: 'dl_reuse_sband_trx', category: 'downlink', icon: 'recycle', plainName: 'Reuse the S-band transceiver', name: 'S-Band Transceiver used as downlink (125 kbps)', formFactor: 'cubesat', serves: ['iot', 'weather'], rateMbps: 0.125, requiresComms: 'ttc_es_sband_trx',
    mass: 0, cost: 0, missions: [], dataKind: 'catalog', sources: ['O10'], ref: 'options §1.4',
    oneLiner: 'No extra box; fine for bytes.', why: 'One radio for control AND data — only if it is your control radio.',
  },
  // ── Pointing (§1.5; prices NOT PUBLIC)
  {
    id: 'adcs_cubespace_small', category: 'adcs', icon: 'compass', plainName: 'CubeSpace 3-Axis Small', name: 'CubeSpace CubeADCS 3-Axis Small (~0.1° class)', formFactor: 'cubesat',
    mass: 0.55, cost: null, estimatedFrom: 'adcs_6u', missions: [], dataKind: 'fact', sources: ['O14'], ref: 'options §1.5',
    oneLiner: 'Light; enough to point down.', why: 'Points antennas and sensors.',
  },
  {
    id: 'adcs_bct_xact15', heritage: 'ASTERIA, MinXSS', category: 'adcs', icon: 'target', plainName: 'Blue Canyon XACT-15', name: 'Blue Canyon XACT-15 (0.007°)', formFactor: 'cubesat',
    mass: 0.885, cost: null, estimatedFrom: 'adcs_6u', missions: [], dataKind: 'fact', sources: ['O14', 'O15'], ref: 'options §1.5',
    oneLiner: 'Very precise; flew on ASTERIA.', why: 'Points antennas and sensors very precisely.',
  },
  {
    id: 'adcs_bct_xact50', category: 'adcs', icon: 'target', plainName: 'Blue Canyon XACT-50', name: 'Blue Canyon XACT-50 (0.007°, big wheels)', formFactor: 'cubesat',
    mass: 1.23, cost: null, estimatedFrom: 'adcs_6u', missions: [], dataKind: 'fact', sources: ['O14', 'O15'], ref: 'options §1.5',
    oneLiner: 'For heavy sats; overkill on a light 6U.', why: 'Points heavier satellites.',
  },
  // ── On-board computer (§1.8)
  {
    id: 'obc_es_type1', category: 'computer', icon: 'chip', plainName: 'OBC Type I', name: 'EnduroSat Onboard Computer Type I (0.9 W)', formFactor: 'cubesat', storesPackets: true, powerW: 0.9,
    mass: 0.13, cost: null, estimatedFrom: 'obc_si_quad', massText: '58 g (satcatalog) · 130 g (2022 catalog; we count 130 g)', missions: [], dataKind: 'catalog', sources: ['O50', 'O06'], ref: 'options §1.8',
    oneLiner: 'Light; stores data on microSD.', why: 'Runs the satellite and stores data.',
  },
  {
    id: 'obc_es_gnss', category: 'computer', icon: 'satellite', plainName: 'OBC with GNSS', name: 'EnduroSat Onboard Computer with GNSS (8 GB)', formFactor: 'cubesat', storesPackets: true, providesGnss: true,
    mass: 0.18, cost: null, estimatedFrom: 'obc_si_quad', missions: [], dataKind: 'catalog', sources: ['O51'], ref: 'options §1.8',
    oneLiner: 'Built-in GNSS: no separate receiver.', why: 'Runs the satellite, stores data and knows its own position (20 ns time).',
  },
  {
    id: 'obc_isis_iobc', category: 'computer', icon: 'chip', plainName: 'ISISPACE iOBC', name: 'ISISPACE iOBC (0.4 W)', formFactor: 'cubesat', storesPackets: true, powerW: 0.4,
    mass: 0.094, cost: null, estimatedFrom: 'obc_si_quad', costText: 'price on request (RFQ)', missions: [], dataKind: 'catalog', sources: ['O52', 'O53'], ref: 'options §1.8',
    oneLiner: 'Lowest power; flying since 2012.', why: 'Runs the satellite and stores data.',
  },
  {
    id: 'obc_si_quad', category: 'computer', icon: 'chip', plainName: 'Space Inventor OBC (4 cores)', name: 'Space Inventor OBC — 4 independent computers', formFactor: 'cubesat', storesPackets: true,
    mass: 0.16, cost: null, priceEUR: 0.009, costText: '€9,000 MSRP (converted at the fixed game rate EUR_TO_USD)', missions: [], dataKind: 'catalog', sources: ['O54'], ref: 'options §1.8',
    oneLiner: 'Built-in redundancy: 4 computers.', why: 'Runs the satellite with spare brains.',
  },
  // ── End of life (§1.9, CubeSats in LEO)
  {
    id: 'eol_natural_decay', category: 'eol', icon: 'decay', plainName: 'Natural decay', name: 'Do nothing: air drag slowly pulls it down', formFactor: 'cubesat',
    mass: 0, cost: 0, missions: ['mission_comms_iot', 'mission_weather_mw'], dataKind: 'fact', sources: ['O55'], ref: 'options §1.9',
    oneLiner: 'Free but slow.', why: 'Drag slowly pulls it down; slow from higher orbits, best low down.',
  },
  {
    id: 'eol_drag_sail', category: 'eol', icon: 'sail', plainName: 'Drag sail', name: 'HPS ADEO drag sail (size picked from satellite mass)', formFactor: 'cubesat',
    // Vendor mass (D09): ADEO small 0.45 kg for 1–20 kg satellites, ADEO 0.8 kg for 5–50 kg — the engine
    // picks the size (resources.js computeMass). `mass` here = the small sail, for the card. Price NOT PUBLIC.
    mass: 0.45, autoSized: true, cost: null, missions: [], dataKind: 'fact', sources: ['D09', 'D10', 'O55'], ref: 'D09 ADEO',
    oneLiner: 'Deorbits much faster.',
    why: 'A sail unfolds at the end of the mission and adds drag, so the satellite re-enters much sooner — about 6 to 10 times quicker than without a sail (manufacturer claim, reported, D10). ADEO-N2 deployed in orbit in Dec 2022 (TRL 9, D09). It must deploy, so the satellite has to be working. Price not public.',
  },
  {
    id: 'eol_attitude_drag', category: 'eol', icon: 'rotate', plainName: 'Turn broadside', name: 'Raise drag with the pointing system', formFactor: 'cubesat', needsAdcs: true,
    mass: 0, cost: 0, missions: [], dataKind: 'fact', sources: ['O55'], ref: 'options §1.9',
    oneLiner: 'No hardware.', why: 'Turning broadside raises drag at low altitude.',
  },
  {
    id: 'eol_nano_thruster', category: 'eol', icon: 'rocket', plainName: 'Ion thruster', name: 'ENPULSION NANO — FEEP electric thruster, active deorbit', formFactor: 'cubesat', needsAdcs: true,
    // Vendor facts (D11): dry 0.68 kg / wet 0.9 kg, 8–40 W (40 W at nominal thrust), 330 µN, 220 g propellant,
    // > 5,000 Ns, ~100 × 100 × 82.5 mm (≈ 1U). Price NOT PUBLIC. Added after the design reserve (vendor mass).
    mass: 0.9, dryMassKg: 0.68, afterReserve: true, minUnits: 1, firePowerW: 40, powerRangeW: [8, 40], thrustUN: 330, propellantG: 220, totalImpulseNs: 5000, sizeMm: [100, 100, 82.5],
    cost: null, missions: [], deorbitThruster: true, dataKind: 'fact', sources: ['D11', 'D12', 'O55'], ref: 'D11 ENPULSION NANO',
    oneLiner: 'Lowers its orbit on command.',
    why: 'A tiny ion thruster (330 µN) lowers the orbit on command, within the 5-year rule. It needs 40 W to fire — more than a 6U makes on average — so it fires in bursts on battery. It cannot steer itself: a working pointing system (ADCS) must aim it (D12). Its thrust is far too low for a controlled ocean reentry (D05). Price not public.',
  },
];

const byId = new Map(COMPONENTS.map((c) => [c.id, c]));
export const getComponent = (id) => (id && id !== NONE ? byId.get(id) ?? null : null);
export const componentsByCategory = (category) => COMPONENTS.filter((c) => c.category === category);
export const isCubeSat = (c) => c?.formFactor === 'cubesat';
/** Model cost of a part for this mission (some research rows differ per mission). */
// ONE fixed euro → dollar rate for the few euro catalog prices (Space Inventor OBC €9,000). A game constant,
// labelled wherever it is used — not a live exchange rate, and not from the research.
export const EUR_TO_USD = 1.08;
export const EUR_RATE_LABEL = `€1 = $${EUR_TO_USD} (fixed game rate, not live)`;

export const costFor = (part, scenarioId) => (part ? part.costByMission?.[scenarioId] ?? part.cost : 0);

// Plain-English names for the UI; real engineering term as a subtitle; research category (§7.1).
export const CATEGORY_PLAIN = {
  structure: { icon: 'satellite', plainName: 'Satellite frame', realTerm: 'Structure', researchCategory: 'structure', glossary: 'bus', whatFor: 'The skeleton that carries everything through launch.' },
  power: { icon: 'sun', plainName: 'Solar wings', realTerm: 'Power generation (solar array + EPS)', researchCategory: 'power_generation', glossary: 'eclipse', whatFor: 'Makes electricity — but only in sunlight.' },
  battery: { icon: 'battery', plainName: 'Battery', realTerm: 'Energy storage', researchCategory: 'battery', glossary: 'eclipse', whatFor: 'Keeps the satellite alive in Earth\'s shadow.', noneText: 'No battery — lighter!', noneWhy: 'it switches off in Earth\'s shadow.' },
  comms: { icon: 'radio', plainName: 'Control radio', realTerm: 'TT&C — telemetry, tracking & command', researchCategory: 'ttc', glossary: 'ttc', whatFor: 'Lets the team on Earth control the satellite.', noneText: 'No control radio', noneWhy: 'nobody can command it or hear its health.' },
  downlink: { icon: 'signal', plainName: 'Mission downlink', realTerm: 'Service / science downlink', researchCategory: 'service_downlink', glossary: 'downlink', whatFor: 'Sends the mission\'s data (messages or measurements) to Earth.', noneText: 'No mission downlink', noneWhy: 'the data stays on board.' },
  computer: { icon: 'chip', plainName: 'Computer', realTerm: 'On-board computer (OBC) + flight software', researchCategory: 'computer', glossary: 'bus', whatFor: 'Runs the satellite and stores data between passes.' },
  adcs: { icon: 'target', plainName: 'Pointing system', realTerm: 'ADCS — attitude determination & control', researchCategory: 'adcs', glossary: 'adcs', whatFor: 'Points antennas and sensors the right way.' },
  thermal: { icon: 'thermometer', plainName: 'Thermal control', realTerm: 'Thermal management', researchCategory: 'thermal', glossary: 'thermal', whatFor: 'Keeps electronics, clocks and sensors at a safe, stable temperature.', noneText: 'No thermal control', noneWhy: 'it may overheat or freeze.' },
  sensors: { icon: 'compass', plainName: 'Position & time sensors', realTerm: 'Orbit / Sun / time sensors', researchCategory: 'adcs', glossary: 'gnss', whatFor: 'Knows where the satellite is and when.', noneText: 'No extra sensors', noneWhy: 'measurements cannot be geolocated.' },
  harness: { icon: 'link', plainName: 'Cables & integration', realTerm: 'Harness & integration', researchCategory: 'structure', glossary: 'bus', whatFor: 'Connects every box into one working satellite.' },
  propulsion: { icon: 'wind', plainName: 'Thrusters', realTerm: 'On-board propulsion', researchCategory: 'onboard_propulsion', glossary: 'deltaV', whatFor: 'Orbit corrections and moving away safely at end of life.', noneText: 'No thrusters', noneWhy: 'it cannot keep or leave a MEO orbit.' },
  eol: { icon: 'recycle', plainName: 'End of life', realTerm: 'Deorbit / disposal method', researchCategory: 'operations', glossary: 'deorbit', whatFor: 'How the satellite leaves orbit when the mission ends.' },
  propellant: { icon: 'tank', plainName: 'Propellant', realTerm: 'On-board propellant', researchCategory: 'onboard_propulsion', glossary: 'propellant', whatFor: 'Fuel for the satellite\'s own thrusters (never the rocket\'s fuel).', noneText: 'No propellant', noneWhy: 'thrusters without fuel do nothing.' },
};

// Satellite sizes offered on the "Satellite size" step (research §6.3: 3U / 6U / 12U / large bus).
export const SIZE_CLASSES = [
  { id: '3u', icon: 'cube', plainName: 'CubeSat 3U', structures: ['str_cube_3u'] },
  { id: '6u', icon: 'cube', plainName: 'CubeSat 6U', structures: ['str_6u', 'str_6u_weather'] },
  { id: '6uxl', icon: 'cube', plainName: 'CubeSat 6U XL', structures: ['str_es_6u_xl'] },
  { id: '8u', icon: 'cube', plainName: 'CubeSat 8U', structures: ['str_es_8u'] },
  { id: '12u', icon: 'cube', plainName: 'CubeSat 12U XL', structures: ['str_cube_12u'] },
  { id: 'large', icon: 'layers', plainName: 'Galileo FOC bus (~700 kg)', structures: ['str_gnss_meo'] },
  // Reference builds: a complete real satellite with a public total mass.
  { id: 'ref_swarm', icon: 'swarm', plainName: 'Swarm SpaceBEE', structures: ['ref_swarm_spacebee'], reference: true },
  { id: 'ref_astrocast', icon: 'signal', plainName: 'Astrocast 3U', structures: ['ref_astrocast_3u'], reference: true },
  { id: 'ref_sateliot', icon: 'phone', plainName: 'Sateliot 6U', structures: ['ref_sateliot_6u'], reference: true },
  { id: 'ref_tropics', icon: 'storm', plainName: 'TROPICS 3U', structures: ['ref_tropics_3u'], reference: true },
  { id: 'ref_raincube', icon: 'rain', plainName: 'RainCube 6U', structures: ['ref_raincube_6u'], reference: true },
  { id: 'ref_gps', icon: 'satellite', plainName: 'GPS III', structures: ['ref_gps_iii'], reference: true },
];
export const sizeClassOf = (structureId) => SIZE_CLASSES.find((s) => s.structures.includes(structureId)) ?? null;
/** The structure part a size class resolves to for this mission. */
export const structureFor = (sizeClass, scenarioId) =>
  getComponent(sizeClass.structures.find((id) => getComponent(id).missions.includes(scenarioId)) ?? sizeClass.structures[0]);
