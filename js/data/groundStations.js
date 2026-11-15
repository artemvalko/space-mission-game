// Ground segments — one real architecture per mission (research §2 table, §3.4, §4.5, §5.4, §7.2).
// The Deep Space Network option is gone: it is not needed for MEO/GEO (§2 audit).
// Schema: { id, icon, plainName, name, oneLiner, description, serves: 'iot'|'gnss'|'weather',
//           cost ($M, the mission's ground line in the research budget), contactHoursPerDay?,
//           missions, dataKind, sources, ref, whyNotFor: { [serves]: text } }

import { M_COMMS, M_NAV, M_WX } from './components.js';

export const GROUND_STATIONS = [
  {
    id: 'gs_iot_gateways', icon: '📡', plainName: 'IoT gateway stations (1–3)', name: '1–3 licensed IoT gateways + mission control', serves: 'iot',
    cost: 0.50, missions: [M_COMMS], dataKind: 'model', sources: [], ref: '§3.4 · §3.5',
    oneLiner: 'Collects messages on each pass.', about: 'Collects the stored messages on each pass and passes them to the internet.',
    description: '1–3 gateway stations with licences and network links, test IoT terminals on the ground, a control centre and pass-planning tools.',
  },
  {
    id: 'gs_gnss_monitoring', icon: '🧭', plainName: 'GNSS monitoring + time uplink', name: 'Monitoring stations, time reference, orbit & clock centre, C-band uplink', serves: 'gnss',
    cost: 15, missions: [M_NAV], dataKind: 'model', sources: ['S04'], ref: '§4.5 · §4.6',
    oneLiner: 'Measures the satellite\'s clock and orbit and uploads corrections.',
    description: 'A time reference (UTC), a network of monitoring stations, precise orbit and clock determination centres and a C-band uplink for navigation data. Without it even a perfect clock does not give users an accurate position.',
  },
  {
    id: 'gs_weather_science', icon: '🌦️', plainName: 'Science receiving + processing', name: 'Science data receiver + calibration chain + reference comparison', serves: 'weather', contactHoursPerDay: 1,
    cost: 1.10, missions: [M_WX], dataKind: 'model', sources: ['S23'], ref: '§5.4 · §5.5',
    oneLiner: 'Receives and checks the measurements.', about: 'Receives the measurements, calibrates them and compares them with NASA GPM data.',
    description: 'Science receiving stations, weather-data processing, calibration, time and position tagging, and comparison with reference data (NASA GPM IMERG). The research example uses about 1 hour of contact per day.',
  },
];

// Honest reasons why a ground segment does not fit another mission (§7.2).
export const GROUND_WHY_NOT = {
  iot: { gnss: 'IoT gateways only collect messages. A GNSS node needs clock and orbit monitoring and a time uplink.', weather: 'IoT gateways are not a science receiving and calibration chain.' },
  gnss: { iot: 'A GNSS monitoring network does not collect users\' IoT messages.', weather: 'A GNSS timing network does not receive or calibrate weather measurements.' },
  weather: { iot: 'A science station does not collect or forward users\' IoT messages.', gnss: 'A science station cannot monitor clocks or upload navigation messages.' },
};

const byId = new Map(GROUND_STATIONS.map((g) => [g.id, g]));
export const getGroundStation = (id) => (id ? byId.get(id) ?? null : null);
