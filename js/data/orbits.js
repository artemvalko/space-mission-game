// Orbits and destinations.
// Schema: { id, name, altitudeKm, altitudeText, eclipseFraction, eclipseMinutes, solarIntensity,
//           contactFactor, requiresDeepSpaceGround?, distanceFactor, baseLifetimeYears, requiredDeltaV,
//           coverage, goodFor, description, diagram }
// contactFactor × groundStation.contactHours = contact hours/day (capped at 24).
//   (low orbits zoom past stations quickly; GEO/HEO stay in view for hours)
// requiresDeepSpaceGround: only a deep-space ground segment can talk to it (blocking otherwise).
// distanceFactor multiplies the antenna data rate (1 = LEO reference; tiny = far away).
// diagram.kind drives the schematic SVG on the orbit screen.

export const ORBITS = [
  {
    id: 'leo', icon: "🌍", plainName: "Low orbit", oneLiner: "Low and close: sharp photos, short contact with Earth.", name: 'Low Earth Orbit (LEO)', altitudeKm: 500, altitudeText: '500 km',
    eclipseFraction: 0.38, eclipseMinutes: 36, solarIntensity: 1,
    contactFactor: 0.75, distanceFactor: 1, baseLifetimeYears: 5, requiredDeltaV: 50,
    coverage: 'Passes over a ground station a few times a day; sees most of Earth over time.',
    goodFor: ['imaging', 'radar', 'magnetometer'],
    description: 'Close to Earth: cheap to reach and fast to talk to, but in Earth\'s shadow ~38% of every 95-minute orbit.',
    diagram: { kind: 'circle', body: 'earth', radius: 1.25 },
  },
  {
    id: 'sso', icon: "🌗", plainName: "Same-time-every-day orbit", oneLiner: "Passes over each place at the same time daily — best for watching Earth.", name: 'Sun-Synchronous Orbit (SSO)', altitudeKm: 700, altitudeText: '700 km (polar)',
    eclipseFraction: 0.33, eclipseMinutes: 33, solarIntensity: 1,
    contactFactor: 1, distanceFactor: 1, baseLifetimeYears: 7, requiredDeltaV: 100,
    coverage: 'Passes over every place on Earth at the same local time each day — perfect for comparing images.',
    goodFor: ['imaging', 'thermal', 'spectrometer', 'radar'],
    description: 'A polar orbit that keeps the same angle to the Sun. The favourite orbit for Earth observation.',
    diagram: { kind: 'circle', body: 'earth', radius: 1.5, polar: true },
  },
  {
    id: 'geo', icon: "📍", plainName: "Parked over one spot", oneLiner: "Always sees the same side of Earth and always in contact — but far away.", name: 'Geostationary Orbit (GEO)', altitudeKm: 35786, altitudeText: '35,786 km',
    eclipseFraction: 0.01, eclipseMinutes: 72, solarIntensity: 1,
    contactFactor: 12, distanceFactor: 0.6, baseLifetimeYears: 15, requiredDeltaV: 1500,
    coverage: 'Hovers over one spot on the equator and always sees the same third of Earth.',
    goodFor: ['relay', 'thermal'],
    description: 'Orbits once per day, so it seems to stand still in the sky. Always in contact; eclipses only in spring and autumn.',
    diagram: { kind: 'circle', body: 'earth', radius: 2.4 },
  },
  {
    id: 'heo', icon: "🥚", plainName: "Long stretched orbit", oneLiner: "Hangs over the far north for hours at a time.", name: 'Highly Elliptical Orbit (Molniya)', altitudeKm: 39900, altitudeText: '500 × 39,900 km',
    eclipseFraction: 0.05, eclipseMinutes: 60, solarIntensity: 1,
    contactFactor: 6, distanceFactor: 0.5, baseLifetimeYears: 8, requiredDeltaV: 300,
    coverage: 'Hangs for hours over high northern latitudes, where GEO satellites are too low in the sky.',
    goodFor: ['relay', 'magnetometer'],
    description: 'A stretched orbit: it races past Earth at the bottom and lingers slowly at the top.',
    diagram: { kind: 'ellipse', body: 'earth' },
  },
  {
    id: 'l2', icon: "🌌", plainName: "Deep space (L2)", oneLiner: "Cold and dark, 1.5 million km away — perfect for telescopes.", name: 'Sun–Earth L2 Point', altitudeKm: 1500000, altitudeText: '1.5 million km',
    eclipseFraction: 0, eclipseMinutes: 0, solarIntensity: 1,
    contactFactor: 1, requiresDeepSpaceGround: true, distanceFactor: 0.05, baseLifetimeYears: 10, requiredDeltaV: 500,
    coverage: 'Looks away from the Sun, Earth and Moon at the same time — the whole sky is dark and cold.',
    goodFor: ['telescope', 'thermal'],
    description: 'A balance point beyond Earth where a spacecraft keeps pace with Earth around the Sun. Home of big space telescopes.',
    diagram: { kind: 'lagrange' },
  },
  {
    id: 'lunar', icon: "🌙", plainName: "Around the Moon", oneLiner: "Sees all of the Moon, including the far side.", name: 'Lunar Orbit', altitudeKm: 100, altitudeText: '100 km above the Moon',
    eclipseFraction: 0.4, eclipseMinutes: 48, solarIntensity: 1,
    contactFactor: 1.5, requiresDeepSpaceGround: true, distanceFactor: 0.15, baseLifetimeYears: 3, requiredDeltaV: 1000,
    coverage: 'Covers the whole Moon, including the far side that never faces Earth.',
    goodFor: ['relay', 'imaging', 'spectrometer', 'magnetometer'],
    description: 'Lumpy lunar gravity bends low orbits, so they need frequent corrections to last.',
    diagram: { kind: 'lunar' },
  },
  {
    id: 'mars', icon: "🔴", plainName: "Around Mars", oneLiner: "Weak sunlight and a very slow radio link home.", name: 'Mars Orbit', altitudeKm: 400, altitudeText: '400 km above Mars',
    eclipseFraction: 0.35, eclipseMinutes: 40, solarIntensity: 0.43,
    contactFactor: 1.25, requiresDeepSpaceGround: true, distanceFactor: 0.002, baseLifetimeYears: 6, requiredDeltaV: 2200,
    coverage: 'Maps the whole planet; signals take 4–24 minutes to reach Earth.',
    goodFor: ['imaging', 'spectrometer', 'radar', 'magnetometer'],
    description: 'Far from the Sun (only 43% of the sunlight) and very far from Earth. Getting into orbit needs a big engine burn.',
    diagram: { kind: 'circle', body: 'mars', radius: 1.3 },
  },
];

const byId = new Map(ORBITS.map((o) => [o.id, o]));
export const getOrbit = (id) => (id ? byId.get(id) ?? null : null);
