// Mission scenarios.
// Schema: { id, name, difficulty, brief, objective, budgetM, deadlineMonths, minLifetimeYears,
//           minScience, requiredTags, incompatibleTags, incompatibleWhy: { [tag]: text },
//           recommendedOrbits, allowedOrbits, cubesatFeasible?, sandbox? }
// incompatibleTags: instruments with any of these tags make no sense for the objective —
// they are shown greyed out with a "Why?" explanation (and are a blocking error if chosen).
// cubesatFeasible: on Easy difficulty the structure defaults to a CubeSat 6U.
// UI fields: icon, oneLiner, stars (0 = free play), recommendedSize ('cubesat'|'small'|'medium'|'large').

const ALL_ORBITS = ['leo', 'sso', 'geo', 'heo', 'l2', 'lunar', 'mars'];

const WHY = {
  telescopeEarth: 'Astronomy telescopes look away from Earth at faint stars. This mission needs to look down at Earth\'s surface.',
  relayEarth: 'A relay forwards signals for other spacecraft or bases. Nobody near this orbit needs one — it would just use power and money.',
  radarCube: 'Radar needs hundreds of watts and a big antenna. A CubeSat cannot power or carry it.',
  radarSky: 'Radar measures surfaces by bouncing radio waves off them. In deep space there is no surface to bounce off.',
  earthImagingSky: 'Earth cameras are built to photograph a bright planet up close. They are far too small and too "warm" to see faint galaxies.',
  telescopeMars: 'This mission studies the surface of Mars. A space telescope pointing at distant stars would not help find ice.',
};

export const SCENARIOS = [
  {
    id: 'cubesat_classroom', icon: "🏫", oneLiner: "Build a shoebox satellite that photographs your home town.", stars: 1, recommendedSize: "cubesat", name: 'CubeSat Classroom', difficulty: 'easy', cubesatFeasible: true,
    brief: 'Your school won a free spot on a rideshare rocket! Build a shoebox-sized CubeSat that photographs your home region.',
    objective: 'Fly a CubeSat camera in low Earth orbit for at least a year and send home enough pictures to meet the science target.',
    budgetM: 8, deadlineMonths: 18, minLifetimeYears: 1, minScience: 25,
    requiredTags: ['imaging'], incompatibleTags: ['telescope', 'radar', 'relay'],
    incompatibleWhy: { telescope: WHY.telescopeEarth, radar: WHY.radarCube, relay: WHY.relayEarth },
    recommendedOrbits: ['leo'], allowedOrbits: ['leo', 'sso'],
  },
  {
    id: 'wildfire', icon: "🔥", oneLiner: "Spot forest fires from space every day.", stars: 1, recommendedSize: "small", name: 'Wildfire Watch', difficulty: 'easy',
    brief: 'Forest fires are getting bigger every summer. Firefighters need fresh images of hot spots every day.',
    objective: 'Put a small satellite with a heat-sensing instrument into an orbit that passes over the same forests at the same time every day.',
    budgetM: 150, deadlineMonths: 30, minLifetimeYears: 3, minScience: 60,
    requiredTags: ['thermal'], incompatibleTags: ['telescope', 'relay'],
    incompatibleWhy: { telescope: WHY.telescopeEarth, relay: WHY.relayEarth },
    recommendedOrbits: ['sso'], allowedOrbits: ['leo', 'sso'],
  },
  {
    id: 'lunar_relay', icon: "🌙", oneLiner: "Relay radio calls for astronauts on the Moon's far side.", stars: 2, recommendedSize: "medium", name: 'Lunar Relay', difficulty: 'normal',
    brief: 'Astronauts are going to the Moon\'s far side, which never sees Earth. They need a radio relay overhead.',
    objective: 'Place a communications relay in lunar orbit and keep it working for at least 5 years.',
    budgetM: 250, deadlineMonths: 36, minLifetimeYears: 5, minScience: 40,
    requiredTags: ['relay'], incompatibleTags: ['telescope'],
    incompatibleWhy: { telescope: 'A big telescope adds hundreds of kilograms and dollars, and the relay must keep its antennas pointed at the Moon and Earth — not at the stars.' },
    recommendedOrbits: ['lunar'], allowedOrbits: ['lunar'],
  },
  {
    id: 'deep_sky', icon: "🔭", oneLiner: "Photograph the very first galaxies with a giant telescope.", stars: 3, recommendedSize: "large", name: 'Deep Sky Telescope', difficulty: 'hard',
    brief: 'Astronomers want to see the very first galaxies. Their faint light is infrared — and warm Earth glows in infrared too.',
    objective: 'Launch a large infrared telescope far from Earth\'s heat, with ultra-stable pointing.',
    budgetM: 600, deadlineMonths: 60, minLifetimeYears: 5, minScience: 150,
    requiredTags: ['telescope'], incompatibleTags: ['radar', 'relay'],
    incompatibleWhy: { radar: WHY.radarSky, relay: 'A relay transmitter is noisy and warm — exactly what a sensitive infrared telescope must avoid.' },
    recommendedOrbits: ['l2'], allowedOrbits: ['leo', 'heo', 'geo', 'l2'],
  },
  {
    id: 'mars_orbiter', icon: "🔴", oneLiner: "Map hidden water ice on Mars.", stars: 3, recommendedSize: "medium", name: 'Red Planet Orbiter', difficulty: 'hard',
    brief: 'Scientists think there is water ice hidden under the Martian dust. Future human explorers will need it.',
    objective: 'Get into orbit around Mars and map what the surface is made of. Remember: weak sunlight and a very long phone line home.',
    budgetM: 500, deadlineMonths: 48, minLifetimeYears: 4, minScience: 100,
    requiredTags: ['spectrometer'], incompatibleTags: ['telescope'],
    incompatibleWhy: { telescope: WHY.telescopeMars },
    recommendedOrbits: ['mars'], allowedOrbits: ['mars'],
  },
  {
    id: 'sandbox', icon: "🧪", oneLiner: "No rules. Try anything and watch the numbers react.", stars: 0, recommendedSize: null, name: 'Sandbox', difficulty: 'easy', sandbox: true,
    brief: 'No customer, no rules. Try any combination and watch how the numbers react.',
    objective: 'Experiment freely — every orbit and every part is available.',
    budgetM: 5000, deadlineMonths: 240, minLifetimeYears: 1, minScience: 0,
    requiredTags: [], incompatibleTags: [], incompatibleWhy: {},
    recommendedOrbits: [], allowedOrbits: ALL_ORBITS,
  },
];

export const EASY_DEFAULT_SCENARIO = 'cubesat_classroom';
export const EASY_DEFAULT_STRUCTURE = 'str_cube_6u';

const byId = new Map(SCENARIOS.map((s) => [s.id, s]));
export const getScenario = (id) => (id ? byId.get(id) ?? null : null);

/** Tags of `instrument` that conflict with the scenario objective (empty = compatible). */
export const incompatibleTagsOf = (scenario, instrument) =>
  scenario ? instrument.tags.filter((t) => scenario.incompatibleTags.includes(t)) : [];
