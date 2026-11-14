// Spacecraft bus components. Numbers are game-balanced, loosely inspired by real hardware.
// Schema: { id, category, name, tier, formFactor?: 'cubesat', mass (kg), power (W consumed), cost ($M),
//           reliability (0–1), devMonths, description, ...categoryFields }

export const COMPONENT_CATEGORIES = [
  'structure', 'power', 'battery', 'comms', 'computer', 'adcs', 'propulsion',
];

export const CATEGORY_LABELS = {
  structure: 'Structure',
  power: 'Power Source',
  battery: 'Battery',
  comms: 'Communications',
  computer: 'Flight Computer',
  adcs: 'Attitude Control (ADCS)',
  propulsion: 'Propulsion',
};

export const COMPONENTS = [
  // ── Structure: maxPayloadMass (kg of instruments it can carry)
  {
    id: 'str_compact', icon: "📦", plainName: "Small satellite", oneLiner: "Light and cheap. Carries up to 60 kg of science tools.", category: 'structure', name: 'Compact Aluminium Bus', tier: 'basic',
    mass: 60, power: 0, cost: 5, reliability: 0.995, devMonths: 12, maxPayloadMass: 60,
    description: 'Small and cheap frame. Fits a couple of light instruments.',
  },
  {
    id: 'str_honeycomb', icon: "🛰️", plainName: "Medium satellite", oneLiner: "The everyday workhorse. Carries up to 180 kg of tools.", category: 'structure', name: 'Honeycomb Mid-Size Bus', tier: 'basic',
    mass: 150, power: 0, cost: 12, reliability: 0.995, devMonths: 18, maxPayloadMass: 180,
    description: 'Workhorse frame used by many Earth-observation satellites.',
  },
  {
    id: 'str_composite', icon: "🏗️", plainName: "Large satellite", oneLiner: "Big and stiff — for telescopes and radars. Heavy and pricey.", category: 'structure', name: 'Carbon-Composite Large Bus', tier: 'advanced',
    mass: 260, power: 0, cost: 28, reliability: 0.99, devMonths: 24, maxPayloadMass: 450,
    description: 'Stiff, large frame for big telescopes and heavy radar payloads.',
  },

  // ── Power: type, outputW (solar output is at 1 AU, full sunlight)
  {
    id: 'pwr_body_solar', icon: "☀️", plainName: "Solar cells on the body", oneLiner: "Cheap and light, but small — and dark in Earth's shadow.", category: 'power', name: 'Body-Mounted Solar Panels', tier: 'basic',
    mass: 15, power: 0, cost: 3, reliability: 0.99, devMonths: 8, type: 'solar', outputW: 300,
    description: 'Solar cells glued to the spacecraft body. Simple, but limited area.',
  },
  {
    id: 'pwr_deploy_solar', icon: "🔆", plainName: "Fold-out solar wings", oneLiner: "Lots of power in sunlight. Must unfold correctly in space.", category: 'power', name: 'Deployable Solar Arrays', tier: 'basic',
    mass: 45, power: 0, cost: 10, reliability: 0.97, devMonths: 12, type: 'solar', outputW: 1200,
    description: 'Fold-out wings with lots of area. Must unfold correctly after launch.',
  },
  {
    id: 'pwr_rtg', icon: "☢️", plainName: "Nuclear battery (RTG)", oneLiner: "Works in the dark and far from the Sun. Very heavy and very expensive.", category: 'power', name: 'Radioisotope Generator (RTG)', tier: 'advanced',
    mass: 80, power: 0, cost: 70, reliability: 0.995, devMonths: 30, type: 'rtg', outputW: 450,
    description: 'Turns heat from decaying plutonium into electricity. Works anywhere, day or night — heavy and very expensive.',
  },

  // ── Battery: capacityWh
  {
    id: 'bat_small', icon: "🔋", plainName: "Small battery", oneLiner: "Enough for a light satellite in a short shadow.", category: 'battery', name: 'Li-ion Pack 500 Wh', tier: 'basic',
    mass: 6, power: 0, cost: 1, reliability: 0.98, devMonths: 6, capacityWh: 500,
    description: 'Enough for a light satellite through a short eclipse.',
  },
  {
    id: 'bat_medium', icon: "🔋", plainName: "Medium battery", oneLiner: "Keeps a medium satellite running on the night side.", category: 'battery', name: 'Li-ion Pack 1500 Wh', tier: 'basic',
    mass: 15, power: 0, cost: 3, reliability: 0.98, devMonths: 8, capacityWh: 1500,
    description: 'Standard choice for medium spacecraft.',
  },
  {
    id: 'bat_large', icon: "🔋", plainName: "Large battery", oneLiner: "For power-hungry tools or long shadows.", category: 'battery', name: 'High-Density Pack 4000 Wh', tier: 'advanced',
    mass: 30, power: 0, cost: 8, reliability: 0.97, devMonths: 12, capacityWh: 4000,
    description: 'Large energy store for power-hungry payloads or long eclipses.',
  },

  // ── Comms: rateMbps (at LEO reference distance), deepSpace
  {
    id: 'com_uhf', icon: "📻", plainName: "Simple radio", oneLiner: "Tiny and low-power — too slow for pictures.", category: 'comms', name: 'UHF Patch Antenna', tier: 'basic',
    mass: 3, power: 10, cost: 2, reliability: 0.99, devMonths: 6, rateMbps: 2, deepSpace: false,
    description: 'Tiny, low-power radio. Fine for telemetry, too slow for images.',
  },
  {
    id: 'com_xband', icon: "📡", plainName: "Fast radio", oneLiner: "Sends lots of pictures — but only near Earth.", category: 'comms', name: 'X-band Transmitter', tier: 'basic',
    mass: 12, power: 40, cost: 8, reliability: 0.98, devMonths: 10, rateMbps: 50, deepSpace: false,
    description: 'Fast downlink for Earth orbit missions.',
  },
  {
    id: 'com_hga', icon: "🛰️", plainName: "Big dish antenna", oneLiner: "Talks across deep space. Heavy and pricey.", category: 'comms', name: 'High-Gain Deep Space Antenna', tier: 'advanced',
    mass: 35, power: 80, cost: 25, reliability: 0.97, devMonths: 20, rateMbps: 150, deepSpace: true,
    description: 'Big dish that must point precisely at Earth. Talks to the deep-space network.',
  },

  // ── Computer: storageGB
  {
    id: 'cpu_basic', icon: "💻", plainName: "Standard computer", oneLiner: "Cheap. Good enough near Earth.", category: 'computer', name: 'Rad-Tolerant Computer', tier: 'basic',
    mass: 4, power: 15, cost: 3, reliability: 0.98, devMonths: 8, storageGB: 32,
    description: 'Commercial parts with shielding. Good enough near Earth.',
  },
  {
    id: 'cpu_radhard', icon: "🛡️", plainName: "Radiation-proof computer", oneLiner: "Survives years of space radiation. Costs more.", category: 'computer', name: 'Rad-Hard Flight Computer', tier: 'advanced',
    mass: 8, power: 30, cost: 12, reliability: 0.995, devMonths: 16, storageGB: 256,
    description: 'Built to survive radiation for years. Slower, but very reliable.',
  },

  // ── ADCS: pointingAccuracy (text), scienceBonus (multiplier)
  {
    id: 'adcs_mag', icon: "🧭", plainName: "Basic pointing", oneLiner: "Cheap, but wobbly — blurrier pictures.", category: 'adcs', name: 'Magnetorquers + Sun Sensors', tier: 'basic',
    mass: 5, power: 10, cost: 2, reliability: 0.99, devMonths: 6,
    pointingAccuracy: '~2°', scienceBonus: 1.0,
    description: 'Pushes against Earth\'s magnetic field. Cheap, but wobbly pointing.',
  },
  {
    id: 'adcs_rw', icon: "🎯", plainName: "Steady pointing", oneLiner: "Spinning wheels hold the camera steady. Sharper science.", category: 'adcs', name: 'Reaction Wheels + Star Tracker', tier: 'basic',
    mass: 20, power: 45, cost: 10, reliability: 0.97, devMonths: 14,
    pointingAccuracy: '~0.01°', scienceBonus: 1.15,
    description: 'Spinning wheels turn the spacecraft; a camera reads the stars to know where it points.',
  },
  {
    id: 'adcs_fine', icon: "🎯", plainName: "Super-steady pointing", oneLiner: "Telescope-grade steadiness. Best science, high price.", category: 'adcs', name: 'Fine Guidance System', tier: 'advanced',
    mass: 35, power: 70, cost: 30, reliability: 0.96, devMonths: 24,
    pointingAccuracy: '~1 arcsecond', scienceBonus: 1.35,
    description: 'Telescope-grade pointing stability. Sharp images, high price.',
  },

  // ── Propulsion: deltaV (m/s), lifetimeBonusYears
  {
    id: 'prop_coldgas', icon: "💨", plainName: "Gentle thrusters", oneLiner: "Small puffs of gas. Enough to stay in a low orbit.", category: 'propulsion', name: 'Cold Gas Thrusters', tier: 'basic',
    mass: 10, power: 5, cost: 3, reliability: 0.99, devMonths: 8, deltaV: 150, lifetimeBonusYears: 1,
    description: 'Squirts compressed gas. Safe and simple, very little push.',
  },
  {
    id: 'prop_hydrazine', icon: "🚀", plainName: "Standard thrusters", oneLiner: "Enough to reach high orbits and dodge debris.", category: 'propulsion', name: 'Hydrazine Monopropellant', tier: 'basic',
    mass: 40, power: 20, cost: 10, reliability: 0.98, devMonths: 14, deltaV: 1000, lifetimeBonusYears: 3,
    description: 'Classic satellite thrusters. Enough for orbit keeping and moderate transfers.',
  },
  {
    id: 'prop_biprop', icon: "🔥", plainName: "Big engine", oneLiner: "Strong enough to brake into orbit at the Moon or Mars.", category: 'propulsion', name: 'Bipropellant Main Engine', tier: 'advanced',
    mass: 90, power: 40, cost: 25, reliability: 0.97, devMonths: 20, deltaV: 2500, lifetimeBonusYears: 5,
    description: 'Powerful engine for orbit insertion at the Moon or Mars.',
  },
  // ── CubeSat family (formFactor: 'cubesat'). Tiny, cheap, quick to build — and less reliable.
  // A CubeSat structure only accepts CubeSat-sized parts (checked in engine/validation.js).
  {
    id: 'str_cube_3u', icon: "🧊", plainName: "CubeSat 3U", oneLiner: "Loaf-sized. Room for one tiny tool.", category: 'structure', name: 'CubeSat 3U', tier: 'basic', formFactor: 'cubesat',
    mass: 0.5, power: 0, cost: 0.1, reliability: 0.98, devMonths: 6, maxPayloadMass: 1.5,
    description: 'Three 10 cm cubes stacked — the size of a loaf of bread. Room for one tiny instrument.',
  },
  {
    id: 'str_cube_6u', icon: "🧊", plainName: "CubeSat 6U", oneLiner: "Shoebox-sized. Tiny, cheap and quick to build.", category: 'structure', name: 'CubeSat 6U', tier: 'basic', formFactor: 'cubesat',
    mass: 1.2, power: 0, cost: 0.2, reliability: 0.98, devMonths: 8, maxPayloadMass: 4,
    description: 'Shoebox-sized. The most popular size for student and science CubeSats.',
  },
  {
    id: 'str_cube_12u', icon: "🧊", plainName: "CubeSat 12U", oneLiner: "Two shoeboxes. Room for two tiny tools.", category: 'structure', name: 'CubeSat 12U', tier: 'basic', formFactor: 'cubesat',
    mass: 2.5, power: 0, cost: 0.4, reliability: 0.98, devMonths: 10, maxPayloadMass: 10,
    description: 'Twice a 6U. Enough room for a small camera plus a second sensor.',
  },
  {
    id: 'pwr_cube_solar', icon: "☀️", plainName: "Mini solar wings", oneLiner: "Small fold-out panels sized for a CubeSat.", category: 'power', name: 'CubeSat Deployable Panels', tier: 'basic', formFactor: 'cubesat',
    mass: 0.8, power: 0, cost: 0.3, reliability: 0.95, devMonths: 6, type: 'solar', outputW: 40,
    description: 'Small fold-out panels sized for CubeSats.',
  },
  {
    id: 'bat_cube', icon: "🔋", plainName: "CubeSat battery", oneLiner: "Phone-style cells for a CubeSat.", category: 'battery', name: 'CubeSat Battery 80 Wh', tier: 'basic', formFactor: 'cubesat',
    mass: 0.5, power: 0, cost: 0.1, reliability: 0.96, devMonths: 4, capacityWh: 80,
    description: 'A pack of phone-style lithium cells on a CubeSat card.',
  },
  {
    id: 'com_cube_sband', icon: "📶", plainName: "CubeSat radio", oneLiner: "Palm-sized. Fine for a small camera if you get enough passes.", category: 'comms', name: 'CubeSat S-band Radio', tier: 'basic', formFactor: 'cubesat',
    mass: 0.3, power: 8, cost: 0.2, reliability: 0.95, devMonths: 6, rateMbps: 2, deepSpace: false,
    description: 'Palm-sized radio. Fine for a small camera — if you get enough ground passes.',
  },
  {
    id: 'cpu_cube', icon: "💻", plainName: "CubeSat computer", oneLiner: "A tiny board. Radiation can make it reboot.", category: 'computer', name: 'CubeSat Flight Computer', tier: 'basic', formFactor: 'cubesat',
    mass: 0.1, power: 1, cost: 0.05, reliability: 0.94, devMonths: 4, storageGB: 8,
    description: 'Commercial microcontroller board. Cheap, but radiation can make it reboot.',
  },
  {
    id: 'adcs_cube', icon: "🧭", plainName: "CubeSat pointing", oneLiner: "Mini wheels in one small box.", category: 'adcs', name: 'CubeSat ADCS Unit', tier: 'basic', formFactor: 'cubesat',
    mass: 0.6, power: 3, cost: 0.15, reliability: 0.94, devMonths: 6,
    pointingAccuracy: '~0.5°', scienceBonus: 1.1,
    description: 'Mini reaction wheels, magnetorquers and sensors in one small box.',
  },
  {
    id: 'prop_cube', icon: "💨", plainName: "CubeSat thrusters", oneLiner: "A tiny thruster pack for dodging debris.", category: 'propulsion', name: 'CubeSat Cold-Gas Module', tier: 'basic', formFactor: 'cubesat',
    mass: 0.8, power: 2, cost: 0.2, reliability: 0.95, devMonths: 6, deltaV: 60, lifetimeBonusYears: 0.5,
    description: 'A tiny thruster pack: enough to dodge debris and tidy up the orbit.',
  },
];

const byId = new Map(COMPONENTS.map((c) => [c.id, c]));
export const getComponent = (id) => (id ? byId.get(id) ?? null : null);
export const componentsByCategory = (category) => COMPONENTS.filter((c) => c.category === category);
export const isCubeSat = (c) => c?.formFactor === 'cubesat';

// Plain-English names for the UI; the real engineering term is shown as a small subtitle.
export const CATEGORY_PLAIN = {
  structure: { icon: '🛰️', plainName: 'Satellite frame', realTerm: 'Structure / spacecraft bus', glossary: 'bus' },
  power: { icon: '☀️', plainName: 'Power source', realTerm: 'Electrical power subsystem', glossary: 'solarIntensity' },
  battery: { icon: '🔋', plainName: 'Battery', realTerm: 'Energy storage', glossary: 'eclipse' },
  comms: { icon: '📡', plainName: 'Radio', realTerm: 'Communications subsystem', glossary: 'dataRate' },
  computer: { icon: '💻', plainName: 'Computer', realTerm: 'Command & data handling', glossary: 'reliability' },
  adcs: { icon: '🎯', plainName: 'Pointing system', realTerm: 'ADCS', glossary: 'adcs' },
  propulsion: { icon: '💨', plainName: 'Thrusters', realTerm: 'Propulsion (delta-v)', glossary: 'deltaV' },
};

// Satellite sizes offered on the "Satellite size" step.
export const SIZE_CLASSES = [
  { id: 'cubesat', icon: '🧊', plainName: 'CubeSat', structures: ['str_cube_3u', 'str_cube_6u', 'str_cube_12u'], defaultStructure: 'str_cube_6u' },
  { id: 'small', icon: '📦', plainName: 'Small', structures: ['str_compact'], defaultStructure: 'str_compact' },
  { id: 'medium', icon: '🛰️', plainName: 'Medium', structures: ['str_honeycomb'], defaultStructure: 'str_honeycomb' },
  { id: 'large', icon: '🏗️', plainName: 'Large', structures: ['str_composite'], defaultStructure: 'str_composite' },
];
export const sizeClassOf = (structureId) => SIZE_CLASSES.find((s) => s.structures.includes(structureId)) ?? null;
