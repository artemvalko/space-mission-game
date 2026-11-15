// Real missions for "Your design vs the real thing" and "Alternative correct architectures".
// REAL DATA ONLY — every fact carries its source codes (research §1.1, §3.1, §4.1, §4.8, §5.1, §5.2, §12).
// Schema: { id, name, agency, missions: [scenarioId], kind: 'analog' | 'alternative', orbitText,
//           facts: [[label, value]], description, lesson?, sources, dataKind: 'fact' }

import { M_COMMS, M_NAV, M_WX } from './components.js';

export const REAL_MISSIONS = [
  {
    id: 'sateliot', name: 'Sateliot IoT/5G CubeSats', agency: 'Alén Space for Sateliot', missions: [M_COMMS], kind: 'analog',
    orbitText: 'Sun-synchronous orbit, 500–600 km',
    facts: [['Size', '6U'], ['Mass', '10 kg each'], ['Satellites built', '4'], ['Orbit', 'SSO 500–600 km'], ['Design life', '5 years']],
    description: 'Real small IoT/5G satellites: a 6U body, a telecom payload, a low orbit — and MANY satellites for coverage. Their 10 kg, 5G technology and lifetime belong to Sateliot; our 8.68 kg build and its prices are an educational model.',
    sources: ['S31'], dataKind: 'fact',
  },
  {
    id: 'galileo_foc', name: 'Galileo FOC', agency: 'ESA / EU', missions: [M_NAV], kind: 'analog',
    orbitText: 'MEO 23,222 km, 56°',
    facts: [['Launch mass', '~700–733 kg (by batch)'], ['Orbit', 'MEO 23,222 km, 56°'], ['Clocks', '2 passive hydrogen masers + 2 rubidium'], ['Signal', 'L-band, ~1200–1600 MHz'], ['Useful power', '~1.4–1.9 kW'], ['Service life', 'more than 12 years']],
    description: 'The European navigation satellites. Our 700 kg / $112M part breakdown is NOT published by ESA — it is an educational split of the real mass class.',
    sources: ['S04', 'S05', 'S30'], dataKind: 'fact',
  },
  {
    id: 'gps', name: 'GPS', agency: 'United States', missions: [M_NAV], kind: 'alternative',
    orbitText: 'MEO ~20,200 km',
    facts: [['Orbit', 'MEO ~20,200 km'], ['Constellation', '24 slots in six orbital planes'], ['Positioning', 'needs several satellites in view']],
    description: 'Another correct navigation architecture in a different MEO orbit. Like Galileo, it only gives positions as a constellation.',
    sources: ['S02'], dataKind: 'fact',
  },
  {
    id: 'celeste', name: 'ESA Celeste IOD-1 / IOD-2', agency: 'ESA', missions: [M_NAV], kind: 'alternative',
    orbitText: 'Quasi-polar LEO, 500–600 km',
    facts: [['Size / mass', 'IOD-1: 12U, 20 kg · IOD-2: 16U, 30 kg'], ['Signals', 'L-band and S-band'], ['Launcher', 'Rocket Lab Electron'], ['Launched', '28 March 2026'], ['First navigation signals', 'April 2026'], ['Timing', 'tests precise time WITHOUT atomic clocks on board'], ['Price', 'not public (RFQ)']],
    description: 'A LEO-PNT technology demo: navigation signals from small satellites in low orbit. A different mission from a Galileo node — it proves the signal, not worldwide positioning. Part masses and prices are not public.',
    lesson: 'Navigation is not only "MEO + big atomic clocks" — but a demo signal is not a global service.',
    sources: ['S32', 'S33', 'S34'], dataKind: 'fact',
  },
  {
    id: 'tempest_d', name: 'NASA TEMPEST-D', agency: 'NASA / JPL', missions: [M_WX], kind: 'analog',
    orbitText: 'Low Earth orbit',
    facts: [['Size', '6U CubeSat'], ['Payload', '5-channel microwave radiometer'], ['Payload volume', 'about 4U of the 6U']],
    description: 'Real proof that a 5-channel microwave radiometer fits in a 6U CubeSat. Our build is inspired by it, not a copy of its specification.',
    sources: ['S07'], dataKind: 'fact',
  },
  {
    id: 'tropics', name: 'NASA TROPICS', agency: 'NASA', missions: [M_WX], kind: 'alternative',
    orbitText: 'Low-inclination LEO (~30°) — not SSO',
    facts: [['Size', '3U CubeSat, ~5.4 kg'], ['Payload', 'passive microwave radiometer, 12 channels, ~90–205 GHz'], ['Orbit', 'low inclination (~30°) to revisit tropical cyclones often'], ['Fleet', 'a constellation of small satellites']],
    description: 'A different correct design: if your goal is to see tropical storms very often, use a low-inclination orbit and a constellation of 3U CubeSats.',
    sources: ['S06'], dataKind: 'fact',
  },
  {
    id: 'goes_r', name: 'NOAA GOES-R (ABI)', agency: 'NOAA / NASA', missions: [M_WX], kind: 'alternative',
    orbitText: 'Geostationary (GEO)',
    facts: [['Instrument', 'Advanced Baseline Imager, 16 channels'], ['Also', 'lightning mapper'], ['Orbit', 'GEO']],
    description: 'A big GEO weather satellite with a visible/infrared imager: a different payload and a different scale. It will not fit a 6U and costs orders of magnitude more.',
    sources: ['S16'], dataKind: 'fact',
  },
];

export const realMissionsFor = (scenarioId, kind) => REAL_MISSIONS.filter((m) => m.missions.includes(scenarioId) && (!kind || m.kind === kind));
