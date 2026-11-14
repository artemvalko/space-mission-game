// Real missions for the debrief "Missions like yours" comparison.
// Schema: { id, name, agency, launchYear, orbitId (closest game orbit), tags, cubesat?, description }

export const REAL_MISSIONS = [
  {
    id: 'landsat9', name: 'Landsat 9', agency: 'NASA / USGS', launchYear: 2021, orbitId: 'sso',
    tags: ['imaging', 'thermal'],
    description: 'Photographs all of Earth\'s land every 16 days in visible and thermal infrared light from a 705 km sun-synchronous orbit, continuing a record that started in 1972.',
  },
  {
    id: 'jwst', name: 'James Webb Space Telescope', agency: 'NASA / ESA / CSA', launchYear: 2021, orbitId: 'l2',
    tags: ['telescope', 'thermal'],
    description: 'A 6.5 m infrared telescope at Sun–Earth L2, kept extremely cold behind a tennis-court-sized sunshield to see the first galaxies.',
  },
  {
    id: 'mro', name: 'Mars Reconnaissance Orbiter', agency: 'NASA', launchYear: 2005, orbitId: 'mars',
    tags: ['imaging', 'spectrometer', 'radar', 'relay'],
    description: 'Maps Mars with a high-resolution camera, a spectrometer and a ground-penetrating radar — and relays data home for rovers on the surface.',
  },
  {
    id: 'lro', name: 'Lunar Reconnaissance Orbiter', agency: 'NASA', launchYear: 2009, orbitId: 'lunar',
    tags: ['imaging', 'thermal', 'spectrometer'],
    description: 'Has mapped the Moon in detail from low lunar orbit since 2009, measuring temperatures and searching for water ice in permanently shadowed craters.',
  },
  {
    id: 'tess', name: 'TESS', agency: 'NASA', launchYear: 2018, orbitId: 'heo',
    tags: ['telescope'],
    description: 'Hunts for planets around nearby stars with four wide-field cameras, from a highly elliptical 13.7-day orbit balanced with the Moon\'s gravity.',
  },
  {
    id: 'goesr', name: 'GOES-R (GOES-16)', agency: 'NOAA / NASA', launchYear: 2016, orbitId: 'geo',
    tags: ['imaging', 'thermal', 'magnetometer'],
    description: 'A geostationary weather satellite that images the whole Americas every 10 minutes, maps lightning and measures space weather with a magnetometer.',
  },
  {
    id: 'dove', name: 'Dove CubeSats (Planet)', agency: 'Planet (commercial)', launchYear: 2013, orbitId: 'leo',
    tags: ['imaging'], cubesat: true,
    description: 'Hundreds of shoebox-sized 3U CubeSats with small telescopes, flying as "flocks" in low orbits to photograph Earth\'s landmass every day.',
  },
];
