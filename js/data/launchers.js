// Launch services, payload adapters/dispensers and rocket part info cards — REAL DATA ONLY
// (research §1.1, §3.4, §4.4, §6.1, §6.2). There is NO launch-reliability number any more (§8.6):
// a launch fails only because of the design.
//
// Launch service schema:
//   { id, icon, plainName, name, family: 'falcon'|'electron', size, heightRel (drawing only), oneLiner, description,
//     costType: 'published' | 'modeled' | 'rfq', priceM | null, priceFn?(massKg) → $M,
//     publishedAnchor?: { priceM, what, sources }, dataKind, sources, ref,
//     capacityKg: { [orbitId]: kg | null }   ← key present = can reach that orbit; null = no published number
//     headline?: text, adapters: [deployerId], overkillFor?: [scenarioId], deliversTo? }
// A missing capacityKg key means the launcher cannot reach that orbit.

import { M_COMMS, M_WX, M_NAV } from './components.js';

export const LAUNCHERS = [
  {
    id: 'lv_falcon9_rideshare', icon: 'layers', plainName: 'Falcon 9 rideshare', name: 'Falcon 9 rideshare (Transporter-type) + dispenser', family: 'falcon', size: 'medium', heightRel: 0.95,
    costType: 'published', priceM: 0.35, priceFn: (kgMass) => 0.35 + Math.max(0, kgMass - 50) * 0.007,
    dataKind: 'catalog', sources: ['S11', 'S12'], ref: '§3.4 · §6.1',
    capacityKg: { leo_550: null, sso_550_650: null },
    headline: 'SpaceX advertises rideshare "from $350,000 per 50 kg to SSO, +$7,000 per extra kg".',
    adapters: ['dep_cubesat'],
    oneLiner: 'A cheap seat on a shared rocket.', about: 'A seat on a shared Falcon 9 — cheap, if the flight goes to your orbit.',
    description: 'Your CubeSat rides in a dispenser next to other satellites. The $350k is a public starting price, not a personal offer: broker contracts, the dispenser, integration and the exact orbit can change the full price.',
  },
  {
    id: 'lv_electron_kickstage', heritage: 'TROPICS (2023)', icon: 'rocket', plainName: 'Rocket Lab Electron', name: 'Electron (2 stages + Kick Stage)', family: 'electron', size: 'small', heightRel: 0.55,
    costType: 'reported', priceM: 7.5, priceText: '~$7.5M reported list (up to ~$8.4M in a 2026 analyst estimate) — not an official price',
    dataKind: 'reported', sources: ['S13', 'O28', 'O29', 'O34'], ref: '§1.1 · §6.1 · options §2.3',
    capacityKg: { leo_550: 300, sso_550_650: 200, leo_550_32deg: 300 },
    headline: 'Up to ~300 kg to LEO, ~200 kg to SSO (headline values). TROPICS launched on Electron (May 2023).',
    adapters: ['dep_cubesat'],
    oneLiner: 'Your own rocket, your own orbit.', about: 'Your own small rocket: you choose the exact low orbit and date. Several times more per kg than a rideshare.',
    description: 'A dedicated small launcher with an optional Kick Stage for a precise low orbit. Its price is only reported by press/analysts (~$7.5M) — Rocket Lab does not publish one.'
  },
  {
    id: 'lv_f9_dedicated_meo', heritage: 'Galileo L12/L13 (2024)', icon: 'rocket', plainName: 'Falcon 9 to MEO', name: 'Falcon 9 dedicated + contracted MEO injection', family: 'falcon', size: 'medium', heightRel: 0.95,
    costType: 'modeled', priceM: 90, publishedAnchor: { priceM: 74, what: 'standard Falcon 9 launch to GTO (not MEO)', sources: ['S14'] },
    dataKind: 'model', sources: ['S12', 'S14'], ref: '§4.4 · §6.1',
    capacityKg: { meo_gnss: null, meo_gps_20200: null, leo_550: 22800, sso_550_650: null },
    pairs: true, pairNote: 'Galileo L12 (28 Apr 2024) and L13 (17 Sep 2024) each carried 2 satellites; reported €180M for the 2 launches.', pairSources: ['O41', 'O42', 'O43'],
    headline: 'Falcon 9: up to 22,800 kg to LEO and 8,300 kg to GTO (headline values for specific configurations).',
    adapters: ['dep_large_adapter', 'dep_cubesat'], overkillFor: [M_COMMS, M_WX],
    oneLiner: 'Whole rocket, ride to MEO.', about: 'The whole rocket for you, with a contracted ride to MEO.',
    description: 'Only valid with a confirmed injection profile to the target MEO orbit. The game uses a $90M launch/injection package (estimate): $74M is the public price of a standard GTO launch, the rest is a margin for the different orbit and services. Not a SpaceX offer.',
  },
  {
    id: 'lv_f9_gto_standard', icon: 'rocket', plainName: 'Falcon 9 to GTO', name: 'Falcon 9 standard launch to GTO', family: 'falcon', size: 'medium', heightRel: 0.95,
    costType: 'published', priceM: 74,
    dataKind: 'fact', sources: ['S14', 'S12'], ref: '§4.4',
    capacityKg: {}, deliversTo: 'GTO (geostationary transfer orbit)', gtoCapacityKg: 8300,
    headline: '$74M for a standard Falcon 9 launch to GTO (2026), up to 8,300 kg to GTO.',
    adapters: ['dep_large_adapter'],
    oneLiner: 'Cheaper — but stops at GTO.', about: 'Cheaper — but it drops you in GTO, not in your MEO orbit.',
    description: 'GTO is not MEO. Without a transfer stage or apogee engine — and a calculated burn and propellant mass — the satellite would stay in the wrong orbit.',
  },
  {
    id: 'lv_falcon_heavy', icon: 'rocket', plainName: 'Falcon Heavy', name: 'Falcon Heavy', family: 'heavy', size: 'heavy', heightRel: 1,
    costType: 'rfq', priceM: null,
    dataKind: 'fact', sources: ['S21'], ref: '§4.4 · §6.1',
    capacityKg: { leo_550: 63800, meo_gnss: null, meo_gps_20200: null },
    headline: '~63.8 t to LEO in the stated configuration.',
    adapters: ['dep_large_adapter'], overkillFor: [M_COMMS, M_WX, M_NAV],
    oneLiner: 'Huge. Bigger is not better.', about: 'Huge. It can do it — but a bigger rocket is not a better mission.',
    description: 'Physically able to fly demanding profiles, but overkill for one ~700 kg satellite unless you have extra payload or a special trajectory. Its price for such a profile is not public.',
  },
  {
    id: 'lv_ariane62', heritage: 'Galileo L14 (2025)', icon: 'rocket', plainName: 'Ariane 62', name: 'Ariane 62 — 2 Galileo satellites (L14)', family: 'ariane', size: 'medium', heightRel: 0.9,
    costType: 'rfq', priceM: null,
    dataKind: 'fact', sources: ['O44'], ref: 'options §4.3',
    capacityKg: { meo_gnss: null },
    headline: 'Galileo L14 (17 Dec 2025): first Galileo flight on Ariane 6; separation 3 h 55 min after liftoff.',
    adapters: ['dep_large_adapter'], pairs: true, pairNote: 'Carried 2 Galileo satellites on L14.', pairSources: ['O44'],
    oneLiner: 'European ride, 2 at once; price not public.',
    description: 'Europe\'s new launcher put two Galileo satellites into their MEO orbit. Its price for this profile is not public (RFQ).',
  },
  {
    id: 'lv_iss_deploy', heritage: 'TEMPEST-D, RainCube (2018)', icon: 'home', plainName: 'ISS deploy', name: 'ISS deployment (NanoRacks / NASA CSLI)', family: 'iss', size: 'small', heightRel: 0.75,
    costType: 'rfq', priceM: null,
    dataKind: 'fact', sources: ['O16', 'O30'], ref: 'options §2.3 · §3.4',
    capacityKg: { iss_400_516: null },
    headline: 'TEMPEST-D and RainCube were deployed from the ISS on 13 Jul 2018 into ~400 km, 51.6°.',
    adapters: ['dep_cubesat'],
    oneLiner: 'Easiest ride; only the ISS orbit.',
    description: 'Your CubeSat rides up with ISS cargo and is pushed out from the station. Easy, but you get the ISS orbit: low, 51.6°, shorter life. Price not public.',
  },
];

const byId = new Map(LAUNCHERS.map((l) => [l.id, l]));
export const getLauncher = (id) => (id ? byId.get(id) ?? null : null);

/** Launch price for this spacecraft mass ($M) or null if not public (RFQ). */
export const launchPrice = (l, massKg = 0, satsPerLaunch = 1) => {
  if (!l) return 0;
  if (l.costType === 'rfq' || l.priceM == null) return null;
  const p = l.priceFn ? l.priceFn(massKg) : l.priceM;
  return l.pairs && satsPerLaunch === 2 ? p / 2 : p; // two satellites share one launch
};

export const COST_TYPE = {
  published: { icon: 'tag', label: 'Published price', text: 'A public starting price from the launch company — not a personal offer.' },
  modeled: { icon: 'chart', label: 'Estimate', text: 'An educational estimate from our research — not an official quote.' },
  reported: { icon: 'document', label: 'Reported price', text: 'A press / analyst figure — not an official price.' },
  rfq: { icon: 'mail', label: 'Price on request (RFQ)', text: 'No public price. A real mission asks the operator for a quote.' },
};

// ── Payload adapters / dispensers (research category deployer_adapter)
export const DEPLOYERS = [
  {
    id: 'dep_cubesat', icon: 'box', plainName: 'CubeSat dispenser', name: 'CubeSat dispenser + mechanical interface + integration', formFactor: 'cubesat',
    cost: 0.25, dataKind: 'model', sources: ['S01'], ref: '§3.5 · §5.5',
    oneLiner: 'Box that pushes a CubeSat out.', about: 'A spring-loaded box that pushes your CubeSat out. Its mass limit follows your CubeSat size.',
    description: 'Holds the CubeSat during launch and releases it in orbit. Typical mass limits: 3U 6 kg, 6U 12 kg, 12U 24 kg — the final limit is agreed with the dispenser supplier.',
  },
  {
    id: 'dep_large_adapter', icon: 'wrench', plainName: 'Large-satellite adapter', name: 'Payload adapter + separation system for a large satellite', formFactor: 'large',
    cost: 0, costNote: 'included in the launch service', dataKind: 'model', sources: ['S12'], ref: '§6.2',
    oneLiner: 'Holds a big satellite, then releases.', about: 'Bolts a big satellite to the rocket and separates it in orbit.',
    description: 'Mechanical and electrical interface between the rocket and a large satellite. Its cost is part of the launch/integration contract — not added twice.',
  },
];
const depById = new Map(DEPLOYERS.map((d) => [d.id, d]));
export const getDeployer = (id) => (id ? depById.get(id) ?? null : null);

// ── "What's inside this rocket?" — info only: no prices, no mixing parts between rockets (§6.2).
export const ROCKET_PARTS = [
  { id: 'launch_first_stage', icon: 'rocket', plainName: 'First stage', falcon: '9 Merlin engines', electron: '9 Rutherford engines', sources: ['S12', 'S13'] },
  { id: 'launch_first_stage_propellants', icon: 'tank', plainName: 'Rocket propellants', falcon: 'LOX + RP-1 (kerosene)', electron: 'LOX + kerosene', sources: ['S12', 'S13'] },
  { id: 'launch_second_stage', icon: 'rocket', plainName: 'Second stage', falcon: '1 Merlin Vacuum engine', electron: '1 vacuum Rutherford engine', sources: ['S12', 'S13'] },
  { id: 'launch_kick_or_transfer', icon: 'arrowRight', plainName: 'Kick / transfer stage', falcon: 'For MEO: a contracted route or stage only if needed — not a standard part', electron: 'Kick Stage for a precise low orbit', sources: ['S13'] },
  { id: 'launch_guidance', icon: 'chip', plainName: 'Guidance & avionics', falcon: 'Built-in navigation and engine/stage control', electron: 'Electron\'s own avionics', sources: ['S12', 'S13'] },
  { id: 'launch_tanks', icon: 'flask', plainName: 'Tanks', falcon: 'Oxidiser and fuel tanks, feed lines', electron: 'Oxidiser and fuel tanks', sources: ['S12', 'S13'] },
  { id: 'launch_interstage', icon: 'link', plainName: 'Interstage & separation', falcon: 'Interstage and stage separation', electron: 'Standard separation system', sources: ['S12', 'S13'] },
  { id: 'launch_fairing', icon: 'shield', plainName: 'Fairing (nose cover)', falcon: '5.2 m wide, 13.1 m tall', electron: 'Electron\'s own fairing', sources: ['S12', 'S13'] },
  { id: 'launch_payload_adapter', icon: 'wrench', plainName: 'Payload adapter', falcon: '6U dispenser or a large-satellite interface', electron: 'Dispenser/adapter for the mission', sources: ['S12', 'S13'] },
  { id: 'launch_range_and_tests', icon: 'document', plainName: 'Launch campaign & tests', falcon: 'Range safety, vibration tests — inside the launch price', electron: 'The same — inside the launch price', sources: ['S12', 'S13'] },
];
export const ROCKET_FAMILY = {
  falcon: { name: 'Falcon 9', facts: 'Two stages, up to 22,800 kg to LEO and 8,300 kg to GTO (headline values).', sources: ['S12'] },
  electron: { name: 'Electron', facts: 'Two stages + optional Kick Stage, about 300 kg to LEO.', sources: ['S13'] },
  ariane: { name: 'Ariane 6', facts: 'Ariane 62 carried two Galileo satellites on L14 (17 Dec 2025). Our research has no part-by-part data for it.', sources: ['O44'], noParts: true },
  iss: { name: 'ISS deploy', facts: 'The CubeSat rides to the ISS as cargo and is deployed from the station (~400 km, 51.6°).', sources: ['O16', 'O30'], noParts: true },
  heavy: { name: 'Falcon Heavy', facts: 'About 63.8 t to LEO in the stated configuration. Our research has no part-by-part data for it.', sources: ['S21'], noParts: true },
};
