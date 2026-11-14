// Science instruments (the "payload").
// Schema: { id, name, tier, mass, power, cost, reliability, devMonths, dataGBperDay, science, tags, description }
// (reliability + devMonths extend the brief's schema: the reliability and time formulas use every chosen item.)

export const INSTRUMENT_TAGS = [
  'imaging', 'thermal', 'radar', 'spectrometer', 'magnetometer', 'telescope', 'relay',
];

export const INSTRUMENTS = [
  {
    id: 'ins_camera', icon: "📷", plainName: "Wide camera", oneLiner: "Colour photos of big areas. Spots smoke and clouds.", name: 'Wide-Field Optical Camera', tier: 'basic',
    mass: 15, power: 25, cost: 8, reliability: 0.98, devMonths: 10, dataGBperDay: 20, science: 30, tags: ['imaging'],
    description: 'Colour pictures of large areas. Great for spotting smoke and clouds.',
  },
  {
    id: 'ins_thermal', icon: "🌡️", plainName: "Heat camera", oneLiner: "Sees heat — finds fires, even at night.", name: 'Thermal Infrared Imager', tier: 'basic',
    mass: 20, power: 40, cost: 12, reliability: 0.97, devMonths: 12, dataGBperDay: 10, science: 35, tags: ['thermal', 'imaging'],
    description: 'Sees heat instead of light — spots fires, volcanoes and warm oceans, even at night.',
  },
  {
    id: 'ins_hires', icon: "🔍", plainName: "Sharp camera", oneLiner: "Sees cars from space. Makes huge amounts of data.", name: 'High-Resolution Imager', tier: 'advanced',
    mass: 45, power: 80, cost: 30, reliability: 0.96, devMonths: 20, dataGBperDay: 60, science: 60, tags: ['imaging'],
    description: 'Sees details as small as a car. Produces huge amounts of data.',
  },
  {
    id: 'ins_sar', icon: "📡", plainName: "Radar", oneLiner: "Sees through clouds and darkness. Needs lots of power.", name: 'Synthetic Aperture Radar', tier: 'advanced',
    mass: 90, power: 400, cost: 45, reliability: 0.95, devMonths: 26, dataGBperDay: 80, science: 70, tags: ['radar'],
    description: 'Bounces radio waves off the surface — works through clouds and darkness. Very power hungry.',
  },
  {
    id: 'ins_spectrometer', icon: "🌈", plainName: "Material finder", oneLiner: "Splits light into colours to find out what things are made of.", name: 'Imaging Spectrometer', tier: 'basic',
    mass: 30, power: 50, cost: 20, reliability: 0.97, devMonths: 16, dataGBperDay: 25, science: 55, tags: ['spectrometer'],
    description: 'Splits light into hundreds of colours to find out what things are made of.',
  },
  {
    id: 'ins_gamma', icon: "☢️", plainName: "Ice finder", oneLiner: "Detects water ice hidden under the ground.", name: 'Gamma-Ray Spectrometer', tier: 'advanced',
    mass: 25, power: 30, cost: 22, reliability: 0.97, devMonths: 18, dataGBperDay: 1, science: 45, tags: ['spectrometer'],
    description: 'Detects elements like hydrogen (water ice!) just below the surface.',
  },
  {
    id: 'ins_magnetometer', icon: "🧲", plainName: "Magnet sensor", oneLiner: "Measures magnetic fields. Light and cheap.", name: 'Magnetometer', tier: 'basic',
    mass: 5, power: 5, cost: 3, reliability: 0.995, devMonths: 6, dataGBperDay: 0.1, science: 15, tags: ['magnetometer'],
    description: 'Measures magnetic fields. Light, cheap, almost no data.',
  },
  {
    id: 'ins_uv_telescope', icon: "🔭", plainName: "Small UV telescope", oneLiner: "Looks at hot young stars.", name: 'Compact UV Telescope', tier: 'basic',
    mass: 80, power: 60, cost: 35, reliability: 0.96, devMonths: 22, dataGBperDay: 8, science: 60, tags: ['telescope'],
    description: 'Small telescope observing hot young stars in ultraviolet light.',
  },
  {
    id: 'ins_ir_telescope', icon: "🔭", plainName: "Big infrared telescope", oneLiner: "Sees the first galaxies. Huge, heavy and expensive.", name: 'Infrared Space Telescope', tier: 'advanced',
    mass: 250, power: 200, cost: 120, reliability: 0.94, devMonths: 40, dataGBperDay: 30, science: 150, tags: ['telescope', 'thermal'],
    description: 'Large cold mirror that sees the faint glow of the first galaxies. Needs a very cold, stable place.',
  },
  {
    id: 'ins_relay', icon: "📶", plainName: "Relay radio", oneLiner: "Passes messages for astronauts and rovers.", name: 'Communications Relay Transponder', tier: 'basic',
    mass: 25, power: 120, cost: 15, reliability: 0.98, devMonths: 12, dataGBperDay: 0, science: 40, tags: ['relay'],
    description: 'Forwards signals between Earth and spacecraft or bases that cannot see Earth directly.',
  },
  {
    id: 'ins_cubecam', icon: "📷", plainName: "CubeSat camera", oneLiner: "A tiny camera that fits in a shoebox satellite.", name: 'CubeSat Camera', tier: 'basic', formFactor: 'cubesat',
    mass: 1.2, power: 5, cost: 0.5, reliability: 0.95, devMonths: 6, dataGBperDay: 2, science: 20, tags: ['imaging'],
    description: 'A small telescope camera that fits in 2U. Sees fields and cities, not individual cars.',
  },
  {
    id: 'ins_cube_ir', icon: "🌡️", plainName: "CubeSat heat sensor", oneLiner: "Blurry, but spots big fires.", name: 'CubeSat Thermal Sensor', tier: 'basic', formFactor: 'cubesat',
    mass: 2, power: 6, cost: 0.8, reliability: 0.94, devMonths: 8, dataGBperDay: 1, science: 18, tags: ['thermal', 'imaging'],
    description: 'An uncooled infrared camera — blurry, but it can spot large fires and hot volcanoes.',
  },
];

const byId = new Map(INSTRUMENTS.map((i) => [i.id, i]));
export const getInstrument = (id) => (id ? byId.get(id) ?? null : null);

// Plain names + icons for instrument types (goal chips, badges).
export const TAG_INFO = {
  imaging: { icon: '📷', plainName: 'Camera' },
  thermal: { icon: '🌡️', plainName: 'Heat sensor' },
  radar: { icon: '📡', plainName: 'Radar' },
  spectrometer: { icon: '🌈', plainName: 'Material finder' },
  magnetometer: { icon: '🧲', plainName: 'Magnet sensor' },
  telescope: { icon: '🔭', plainName: 'Telescope' },
  relay: { icon: '📶', plainName: 'Relay radio' },
};
