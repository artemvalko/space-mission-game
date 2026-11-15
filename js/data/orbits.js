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
    oneLiner: 'Close and cheap; short passes.', about: 'Close and cheap to reach — but it races past any spot in minutes.',
    description: 'A low orbit: the satellite flies over a place for a few minutes, so it must store messages and dump them over a ground station.',
    diagram: { r: (6371 + 550) / 6371 },
  },
  {
    id: 'sso_550_650', icon: '🌗', plainName: 'Sun-synchronous orbit (550–650 km)', name: 'Sun-Synchronous Orbit (SSO)', altitudeKm: [550, 650], altitudeText: '550–650 km',
    inclinationText: 'near-polar', inclinationDeg: null, sunlitFraction: 0.67, eclipseMinutes: 35,
    dataKind: 'model', sources: [], ref: '§5.3 · §5.4',
    oneLiner: 'Same time daily, whole Earth.', about: 'Passes over every place at the same local time — wide coverage, steady lighting.',
    description: 'A near-polar orbit that keeps the same angle to the Sun. Good for regular, wide coverage of the whole Earth.',
    diagram: { r: (6371 + 600) / 6371, polar: true },
  },
  {
    id: 'leo_550_32deg', icon: '🌀', plainName: 'Tropics orbit (550 km, 32°)', name: 'Low-inclination LEO (TROPICS)', altitudeKm: 550, altitudeText: '~550 km',
    inclinationText: '32–33°', inclinationDeg: 32, sunlitFraction: 0.60, eclipseMinutes: 35,
    dataKind: 'fact', sources: ['O32', 'O34'], ref: 'options §3.3 (power: research LEO model §3.3)',
    oneLiner: 'Frequent tropical revisits; no poles.',
    description: 'NASA TROPICS flies at 32–33° so it passes over tropical cyclones often — but it never sees the poles. Power uses the research LEO model (60% sunlight, 35-min shadow).',
    diagram: { r: (6371 + 550) / 6371, tilt: 32 },
  },
  {
    id: 'iss_400_516', icon: '🏠', plainName: 'ISS orbit (~400 km, 51.6°)', name: 'ISS deploy orbit', altitudeKm: 400, altitudeText: '~400 km',
    inclinationText: '51.6°', inclinationDeg: 51.6, sunlitFraction: 0.60, eclipseMinutes: 35,
    dataKind: 'fact', sources: ['O16', 'O30'], ref: 'options §2.3 · §3.3 (power: research LEO model §3.3)',
    oneLiner: 'Easy ride; decays sooner; no poles.',
    description: 'TEMPEST-D and RainCube were deployed from the ISS on 13 Jul 2018 into ~400 km, 51.6°. The easiest ride, but a lower orbit decays sooner and never covers the poles. Power uses the research LEO model.',
    diagram: { r: (6371 + 400) / 6371, tilt: 51.6 },
  },
  {
    id: 'meo_gnss', icon: '🧭', plainName: 'Navigation orbit (MEO 23,222 km)', name: 'Medium Earth Orbit — Galileo', altitudeKm: 23222, altitudeText: '23,222 km',
    inclinationText: '56°', inclinationDeg: 56, sunlitFraction: null, eclipseMinutes: null,
    dataKind: 'fact', sources: ['S04'], ref: '§1.1 · §4.4',
    oneLiner: 'Where Galileo flies.', about: 'Where Galileo flies: high enough that one satellite sees a big part of Earth.',
    description: 'Galileo satellites fly in MEO at 23,222 km with a 56° tilt. This is MEO — not GEO and not SSO.',
    diagram: { r: (6371 + 23222) / 6371, tilt: 56 },
  },
  {
    id: 'meo_gps_20200', icon: '🧭', plainName: 'GPS orbit (MEO ~20,200 km)', name: 'Medium Earth Orbit — GPS', altitudeKm: 20200, altitudeText: '~20,200 km',
    inclinationText: '55°', inclinationDeg: 55, sunlitFraction: null, eclipseMinutes: null,
    dataKind: 'fact', sources: ['S02', 'O40'], ref: '§1.1 · §4.4 · options §4.1',
    oneLiner: 'Where GPS flies.', about: 'Where GPS flies — a valid GNSS alternative with a different architecture.',
    description: 'GPS satellites fly in MEO at about 20,200 km, 55°, six planes (24 slots). A different, also correct, navigation architecture.',
    diagram: { r: (6371 + 20200) / 6371, tilt: 55 },
  },
  {
    id: 'geo', icon: '📍', plainName: 'Geostationary orbit (GEO)', name: 'Geostationary orbit (GEO)', altitudeKm: null, altitudeText: 'far above MEO, over the equator',
    inclinationText: '0° (equator)', inclinationDeg: 0, sunlitFraction: null, eclipseMinutes: null,
    dataKind: 'fact', sources: ['S16'], ref: '§3.4 · §5.2 · §7.2',
    oneLiner: 'Home of big satellites, not CubeSats.', about: 'Hovers over one spot — the home of big weather and TV satellites, not small CubeSats.',
    description: 'A satellite in GEO stays above one point of the equator. Big GEO satellites (like NOAA GOES) do real jobs there — but a small 6U CubeSat with 38 W cannot simply be moved there.',
    diagram: { r: null, geo: true }, // no altitude in our research → drawn beyond MEO, not to scale
  },
];

const byId = new Map(ORBITS.map((o) => [o.id, o]));
export const getOrbit = (id) => (id ? byId.get(id) ?? null : null);
/** Orbits a player can choose (info-only ones are shown as facts, not choices). */
export const PLAYABLE_ORBITS = ORBITS.filter((o) => !o.infoOnly);
