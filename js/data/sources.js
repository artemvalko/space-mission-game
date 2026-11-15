// Source list (research §12, checked 15 Nov 2026). Every number in js/data/* carries
// `sources: ['Sxx', …]` pointing here, plus `dataKind`:
//   'fact'    — confirmed by an official source for a specific system (ESA, NASA, SpaceX, Rocket Lab, CubeSat spec)
//   'catalog' — a public catalog price/spec of one specific product on 15 Nov 2026 (not a quote)
//   'model'   — an educational estimate made in the research (BOM breakdowns, budgets). Never official.

export const SOURCES = [
  { code: 'S01', title: 'Cal Poly CubeSat Design Specification Rev 14.1 (via NASA)', url: 'https://www.nasa.gov/wp-content/uploads/2018/01/cubesatdesignspecificationrev14_12022-02-09.pdf', confirms: 'Typical CubeSat mass limits 3U 6 kg / 6U 12 kg / 12U 24 kg, dispenser, mechanics and tests.' },
  { code: 'S02', title: 'GPS.gov — Space Segment', url: 'https://www.gps.gov/space-segment', confirms: 'GPS flies in MEO at about 20,200 km; 24 slots in six planes; several satellites are needed for a fix.' },
  { code: 'S03', title: 'NASA Small Spacecraft Technology — Communications', url: 'https://www.nasa.gov/smallsat-institute/sst-soa/soa-communications/', confirms: 'Radio bands, TT&C and communication options for small satellites.' },
  { code: 'S04', title: 'ESA — Galileo Facts and Figures', url: 'https://www.esa.int/Applications/Satellite_navigation/Galileo/Facts_and_figures', confirms: 'Galileo FOC ~700–733 kg, MEO 23,222 km, 56°, power, 4 atomic clocks, antennas.' },
  { code: 'S05', title: 'ESA — Galileo Satellite Anatomy', url: 'https://www.esa.int/Applications/Satellite_navigation/Galileo/Satellite_anatomy', confirms: 'Passive hydrogen masers, rubidium clocks, signal generation, thermal and attitude control.' },
  { code: 'S06', title: 'NASA — TROPICS mission facts', url: 'https://www.nasa.gov/blogs/smallsatellites/2023/05/25/mission-facts-about-nasas-tropics/', confirms: '3U CubeSats of ~5.4 kg, low-inclination (~30°) orbits, passive microwave sounding.' },
  { code: 'S07', title: 'NASA/JPL — TEMPEST-D', url: 'https://www.jpl.nasa.gov/missions/temporal-experiment-for-storms-and-tropical-systems-demonstration-tempest-d/', confirms: 'A 5-channel microwave radiometer filling about 4U inside a 6U CubeSat.' },
  { code: 'S08', title: 'EnduroSat — 6U deployable solar array', url: 'https://www.endurosat.com/products/6u-deployable-solar-array/', confirms: 'Catalog price $59k–$88k, 655–1065 g, up to 38.4 W in LEO.' },
  { code: 'S09', title: 'EnduroSat — 6U fixed solar panel', url: 'https://www.endurosat.com/cubesat-store/cubesat-solar-panels/6u-solar-panel/', confirms: 'Catalog price $20k, 392 g, 19.2 W.' },
  { code: 'S10', title: 'ISISPACE — 6U platform overview', url: 'https://www.isispace.nl/wp-content/uploads/2018/07/ISIS-6U-CubeSat-Brochure.pdf', confirms: 'Typical list of 6U bus systems (structure, TT&C, ADCS, EPS…).' },
  { code: 'S11', title: 'SpaceX — Smallsat Rideshare', url: 'https://new.spacex.com/rideshare', confirms: 'From $350k per 50 kg to SSO, +$7k per extra kg; dispensers and slots.' },
  { code: 'S12', title: 'SpaceX — Falcon 9', url: 'https://www.spacex.com/vehicles/falcon-9/', confirms: '2 stages, 9 Merlin + 1 Merlin Vacuum, LOX/RP-1, fairing 5.2 × 13.1 m, up to 22,800 kg LEO / 8,300 kg GTO.' },
  { code: 'S13', title: 'Rocket Lab — Electron', url: 'https://rocketlabcorp.com/launch/electron/', confirms: '2 stages + optional Kick Stage, 9 + 1 Rutherford engines, LOX/kerosene, ~300 kg to LEO.' },
  { code: 'S14', title: 'SpaceX — Capabilities & Services (PDF)', url: 'https://www.spacex.com/assets/media/Capabilities%26Services.pdf', confirms: '$74M for a standard Falcon 9 launch to GTO (2026) — not a MEO quote.' },
  { code: 'S15', title: 'ESA — €1.47 bn contracts for 12 second-generation Galileo satellites', url: 'https://www.esa.int/Applications/Satellite_navigation/ESA_signs_contract_for_new_generation_of_Galileo', confirms: 'Programme cost context only — not the price of one FOC satellite.' },
  { code: 'S16', title: 'NOAA — GOES-R instruments', url: 'https://www.nesdis.noaa.gov/our-satellites/currently-flying/goes-east-west/goes-r-series-spacecraft-instruments', confirms: 'GEO Advanced Baseline Imager with 16 channels; lightning mapper.' },
  { code: 'S17', title: 'NASA — State of the Art of Small Spacecraft Technology 2026', url: 'https://www.nasa.gov/smallsat-institute/sst-soa/', confirms: 'Subsystem-by-subsystem reference from open sources; not an endorsement or a price list.' },
  { code: 'S18', title: 'GomSpace — NanoCom AX100', url: 'https://gomspace.com/product/nanocom-ax100/', confirms: 'A real VHF/UHF transceiver of 24.5 g.' },
  { code: 'S19', title: 'NASA — historical CubeSat project costs (Decadal Survey supplement)', url: 'https://science.nasa.gov/wp-content/uploads/2023/05/NASAHeliophysics__CubeSatsBalloonsSRs__DecadalSurveySupplemental.pdf', confirms: 'Historical full costs of ~$4–8M per LEO CubeSat project — context, not a fixed price.' },
  { code: 'S20', title: 'ITU — Satellite regulation and coordination', url: 'https://www.itu.int/en/mediacentre/backgrounders/Pages/Regulation-of-Satellite-Systems.aspx', confirms: 'International spectrum coordination and national licensing.' },
  { code: 'S21', title: 'SpaceX — Falcon Heavy', url: 'https://www.spacex.com/vehicles/falcon-heavy/', confirms: '~63.8 t to LEO in the stated configuration — a very large launcher.' },
  { code: 'S22', title: 'US Federal Register — FCC orbital debris 5-year rule (2024)', url: 'https://regulations.justia.com/regulations/fedreg/2024/08/09/2024-17093.html', confirms: 'Disposal within 5 years after mission end for listed US-licensed LEO systems — not a universal law.' },
  { code: 'S23', title: 'NASA — GPM IMERG', url: 'https://gpm.nasa.gov/data/imerg', confirms: 'Real precipitation products, near-real-time and long climate series.' },
  { code: 'S24', title: 'NASA — GPM Data Directory', url: 'https://gpm.nasa.gov/data/directory', confirms: 'How to access Earth-science data and its formats.' },
  { code: 'S25', title: 'NASA — EONET', url: 'https://eonet.gsfc.nasa.gov/', confirms: 'Real natural-event metadata (storms, fires…) and an API.' },
  { code: 'S26', title: 'NASA — Open APIs (DONKI)', url: 'https://api.nasa.gov/', confirms: 'Solar flares, CMEs and geomagnetic storms (space weather).' },
  { code: 'S27', title: 'NOAA GOES — Registry of Open Data', url: 'https://registry.opendata.aws/noaa-goes/', confirms: 'Real GEO weather observations and open-data terms.' },
  { code: 'S28', title: 'EnduroSat — 2022 platform catalog', url: 'https://www.endurosat.com/wp-content/uploads/2022/02/Endurosat_Product_Catalogue_02_22.pdf', confirms: 'Example 6U bus ~4.2–4.8 kg (historical, not a current promise).' },
  { code: 'S29', title: 'NASA — mission cost tools', url: 'https://www.nasa.gov/ocfo/ppc-corner/ppc-models-tools/', confirms: 'Real budgets need a cost model (e.g. NASA COMPACT for CubeSats).' },
  { code: 'S30', title: 'ESA — Galileo satellites overview', url: 'https://www.esa.int/Applications/Satellite_navigation/Galileo/Galileo_satellites', confirms: 'Galileo FOC antennas and power.' },
  { code: 'S31', title: 'Alén Space — 4 × Sateliot 5G/IoT CubeSats', url: 'https://alen.space/alen-space-designs-and-manufactures-four-satellites-for-sateliots-5g-constellation/', confirms: 'Maker: 6U / 10 kg each, SSO 500–600 km, 5-year design life; a real 5G-IoT analog.' },
  { code: 'S32', title: 'ESA — Celeste IOD: facts and figures', url: 'https://www.esa.int/articles/about-us/directorates/resilience-navigation-and-connectivity/navigation/celeste/celeste-iod-facts-and-figures', confirms: 'Real 12U/20 kg and 16U/30 kg satellites, L/S-band, LEO 500–600 km, Rocket Lab Electron.' },
  { code: 'S33', title: 'ESA — Celeste broadcasts first navigation signal from LEO (Apr 2026)', url: 'https://www.esa.int/articles/about-us/directorates/resilience-navigation-and-connectivity/navigation/celeste/esa-s-celeste-broadcasts-first-navigation-signal-from-low-earth-orbit', confirms: 'Launch on 28 Mar 2026 and first LEO navigation signals from both satellites in April 2026.' },
  { code: 'S34', title: 'ESA — Celeste in-orbit demonstration constellation', url: 'https://www.esa.int/articles/about-us/directorates/resilience-navigation-and-connectivity/navigation/celeste/celeste-in-orbit-demonstration-constellation', confirms: 'Precise timing tests without atomic clocks; a later test of miniature atomic clocks.' },
];

const byCode = new Map(SOURCES.map((s) => [s.code, s]));
export const getSource = (code) => byCode.get(code) ?? null;

/** Badge for a dataKind (UI). */
export const DATA_KIND = {
  fact: { icon: '✔', label: 'Real fact', cls: 'fact', text: 'Confirmed by an official source for this specific system.' },
  catalog: { icon: '🏷', label: 'Catalog price', cls: 'catalog', text: 'A public catalog price/spec of one product on 15 Nov 2026 — not a quote for a whole mission.' },
  model: { icon: '≈', label: 'Estimate', cls: 'model', text: 'An educational estimate from our research. Not an official number.' },
};

// Research §12.1 — honest limits of the data (plain English).
export const DATA_LIMITATIONS = [
  'Part masses and prices in our build lists are educational estimates (≈). No manufacturer published them; only some single real products and general satellite classes are confirmed.',
  'Store prices depend on version, date, country, testing and contract — a catalog price is never the price of a whole space mission.',
  'A rocket\'s headline LEO or GTO capacity is not a guaranteed capacity to any other orbit such as MEO or SSO.',
  'Real prices for a Rocket Lab Electron launch, a Falcon 9 MEO mission, atomic-clock kits or a NASA radiometer are not public. The game shows "Price on request (RFQ)" or a labelled estimate.',
  'ESA Celeste (navigation from low orbit) is a different architecture. It proves a small satellite can send navigation signals — not that one small satellite gives worldwide positioning.',
  'Rocket parts (engines, stages) have no public per-part prices. You learn what they do; the budget uses the launch contract price only.',
  'The game budget is not a real financial estimate. Real projects need design reviews, trajectory and link-budget analysis, thermal and power simulations, ESA/NASA standards and supplier quotes.',
  'Events during the mission (solar storms, debris, breakdowns) are simulated for the game. Their chances are not real statistics.',
];
