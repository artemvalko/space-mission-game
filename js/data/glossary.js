// Simple explanations of space terms, for "Why?" popovers and inline glossary terms.
// Keyed by term id: { term, text }

export const GLOSSARY = {
  altitude: { term: 'Orbit altitude', text: 'How high above the surface the spacecraft flies. Higher orbits see more of the planet at once, last longer, but are further away for radio and need more rocket power to reach.' },
  deltaV: { term: 'Delta-v (Δv)', text: 'How much a spacecraft can change its speed with its own engine, in metres per second. Every orbit change costs delta-v — like fuel range for a car.' },
  propellant: { term: 'Propellant', text: 'The "fuel" a rocket engine pushes out to move. The more delta-v you need, the more propellant you carry — and propellant is heavy.' },
  dataRate: { term: 'Data rate', text: 'How fast the radio can send data, in megabits per second (Mbps). Signals get weaker with distance, so the same antenna is much slower far from Earth.' },
  downlink: { term: 'Downlink', text: 'Sending data from the spacecraft down to Earth. You can only do it while a ground antenna can "see" the spacecraft.' },
  contactTime: { term: 'Contact time', text: 'How many hours per day a ground station can talk to the spacecraft. Low orbits zoom past stations in minutes; GEO is always visible.' },
  eclipse: { term: 'Eclipse', text: 'When the planet blocks the Sun from the spacecraft. Solar panels produce nothing, so batteries must keep everything running.' },
  depthOfDischarge: { term: 'Depth of discharge', text: 'How much of a battery you empty in each cycle. Using only ~60% makes batteries last thousands of cycles.' },
  solarIntensity: { term: 'Solar intensity', text: 'How strong the sunlight is compared to Earth. At Mars it is only 43% — solar panels produce less than half the power.' },
  rtg: { term: 'RTG', text: 'Radioisotope Thermoelectric Generator: makes electricity from the heat of radioactive material. Works in darkness and far from the Sun.' },
  margin: { term: 'Margin', text: 'Extra reserve engineers add because designs always grow. A 15% mass margin means "assume it will end up 15% heavier than planned".' },
  reliability: { term: 'Reliability', text: 'The chance a part keeps working for the whole mission. Flight-proven parts are more reliable than brand-new or cheap commercial ones.' },
  health: { term: 'Spacecraft health', text: 'The average reliability of all your parts. Lower health means more hardware failures during the mission — each one forces a tough decision.' },
  groundSegment: { term: 'Ground segment', text: 'Everything on Earth that operates the mission: antennas, control rooms and the team. More antennas = more contact time, but higher yearly costs.' },
  dsn: { term: 'Deep Space Network', text: 'NASA\'s three giant antenna complexes in California, Spain and Australia, about 120° apart, so a far-away spacecraft is always visible to one of them.' },
  cubesat: { term: 'CubeSat', text: 'A standard small satellite built from 10 cm cubes ("units"): 3U is loaf-sized, 6U shoebox-sized. Cheap and quick to build, popular with universities.' },
  phases: { term: 'Mission phases', text: 'NASA splits a project into phases: concept studies, trade studies, a "point design" (one complete candidate design), design reviews, then operations.' },
  tradeStudy: { term: 'Trade study', text: 'Comparing options side by side (mass, cost, power, risk…) to choose the best balance. Almost every choice in this game is a trade study.' },
  bus: { term: 'Spacecraft bus', text: 'The "body" of the spacecraft: structure, power, radio, computer and steering. It carries and serves the payload.' },
  payload: { term: 'Payload', text: 'What the mission is really for — the cameras, telescopes and other instruments.' },
  adcs: { term: 'ADCS', text: 'Attitude Determination and Control System: knows which way the spacecraft points and turns it. Steady pointing = sharper science.' },
  lagrange: { term: 'Lagrange point', text: 'A spot where the gravity of two big bodies (like the Sun and Earth) balances, so a spacecraft can stay there with little fuel.' },
  sunSync: { term: 'Sun-synchronous', text: 'An orbit that crosses each place on Earth at the same local time every day, so lighting conditions in images stay the same.' },
  devTime: { term: 'Development time', text: 'Months needed to design, build and test hardware. The slowest part sets the pace, then everything is integrated and tested together.' },
};

export const getTerm = (id) => GLOSSARY[id] ?? null;
