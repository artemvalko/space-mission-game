// Orbits — REAL DATA ONLY (research §1.1, §3.4, §4.4, §5.4, §7.2).
// Schema: { id, icon, plainName, name, oneLiner, altitudeText, altitudeKm (number | [min, max] | null),
//           inclinationText, inclinationDeg | null, sunlitFraction | null, eclipseMinutes | null,
//           infoOnly?, dataKind, sources, ref, description, diagram }
// sunlitFraction / eclipseMinutes are the values the research uses in its 6U power calculations (model);
// for MEO/GEO the research gives no single eclipse value (it changes with the season), so they are null.
// diagram.r = drawing radius relative to Earth (true relative scale of altitudes where known).

export const EARTH_RADIUS_KM = 6371; // used only to draw orbits to scale (well-known constant, drawing only)

export const ORBITS = [
  {
    id: 'leo_550', icon: '🌍', plainName: 'Low orbit (~550 km)', name: 'Low Earth Orbit (LEO)', altitudeKm: 550, altitudeText: '~550 km',
    inclinationText: 'chosen for your users\' region', inclinationDeg: null, sunlitFraction: 0.60, eclipseMinutes: 35,
    dataKind: 'model', sources: [], ref: '§3.3 · §3.4',
    oneLiner: 'Close and cheap to reach — but it races past any spot in minutes.',
    description: 'A low orbit: the satellite flies over a place for a few minutes, so it must store messages and dump them over a ground station.',
    diagram: { r: (6371 + 550) / 6371 },
  },
  {
    id: 'sso_550_650', icon: '🌗', plainName: 'Sun-synchronous orbit (550–650 km)', name: 'Sun-Synchronous Orbit (SSO)', altitudeKm: [550, 650], altitudeText: '550–650 km',
    inclinationText: 'near-polar', inclinationDeg: null, sunlitFraction: 0.67, eclipseMinutes: 35,
    dataKind: 'model', sources: [], ref: '§5.3 · §5.4',
    oneLiner: 'Passes over every place at the same local time — wide coverage, steady lighting.',
    description: 'A near-polar orbit that keeps the same angle to the Sun. Good for regular, wide coverage of the whole Earth.',
    diagram: { r: (6371 + 600) / 6371, polar: true },
  },
  {
    id: 'meo_gnss', icon: '🧭', plainName: 'Navigation orbit (MEO 23,222 km)', name: 'Medium Earth Orbit — Galileo', altitudeKm: 23222, altitudeText: '23,222 km',
    inclinationText: '56°', inclinationDeg: 56, sunlitFraction: null, eclipseMinutes: null,
    dataKind: 'fact', sources: ['S04'], ref: '§1.1 · §4.4',
    oneLiner: 'Where Galileo flies: high enough that one satellite sees a big part of Earth.',
    description: 'Galileo satellites fly in MEO at 23,222 km with a 56° tilt. This is MEO — not GEO and not SSO.',
    diagram: { r: (6371 + 23222) / 6371, tilt: 56 },
  },
  {
    id: 'meo_gps_20200', icon: '🧭', plainName: 'GPS orbit (MEO ~20,200 km)', name: 'Medium Earth Orbit — GPS', altitudeKm: 20200, altitudeText: '~20,200 km',
    inclinationText: '—', inclinationDeg: null, sunlitFraction: null, eclipseMinutes: null, infoOnly: true,
    dataKind: 'fact', sources: ['S02'], ref: '§1.1 · §4.4',
    oneLiner: 'Where GPS flies — a valid GNSS alternative with a different architecture.',
    description: 'GPS satellites fly in MEO at about 20,200 km (24 slots in six planes). A different, also correct, navigation architecture — shown for information.',
    diagram: { r: (6371 + 20200) / 6371 },
  },
  {
    id: 'geo', icon: '📍', plainName: 'Geostationary orbit (GEO)', name: 'Geostationary orbit (GEO)', altitudeKm: null, altitudeText: 'far above MEO, over the equator',
    inclinationText: '0° (equator)', inclinationDeg: 0, sunlitFraction: null, eclipseMinutes: null,
    dataKind: 'fact', sources: ['S16'], ref: '§3.4 · §5.2 · §7.2',
    oneLiner: 'Hovers over one spot — the home of big weather and TV satellites, not small CubeSats.',
    description: 'A satellite in GEO stays above one point of the equator. Big GEO satellites (like NOAA GOES) do real jobs there — but a small 6U CubeSat with 38 W cannot simply be moved there.',
    diagram: { r: null, geo: true }, // no altitude in our research → drawn beyond MEO, not to scale
  },
];

const byId = new Map(ORBITS.map((o) => [o.id, o]));
export const getOrbit = (id) => (id ? byId.get(id) ?? null : null);
/** Orbits a player can choose (info-only ones are shown as facts, not choices). */
export const PLAYABLE_ORBITS = ORBITS.filter((o) => !o.infoOnly);
