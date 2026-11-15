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
    id: 'lv_falcon9_rideshare', icon: '🎟️', plainName: 'Falcon 9 rideshare seat', name: 'Falcon 9 rideshare (Transporter-type) + dispenser', family: 'falcon', size: 'medium', heightRel: 0.95,
    costType: 'published', priceM: 0.35, priceFn: (kgMass) => 0.35 + Math.max(0, kgMass - 50) * 0.007,
    dataKind: 'catalog', sources: ['S11', 'S12'], ref: '§3.4 · §6.1',
    capacityKg: { leo_550: null, sso_550_650: null },
    headline: 'SpaceX advertises rideshare "from $350,000 per 50 kg to SSO, +$7,000 per extra kg".',
    adapters: ['dep_cubesat'],
    oneLiner: 'A seat on a shared Falcon 9 — cheap, if the flight goes to your orbit.',
    description: 'Your CubeSat rides in a dispenser next to other satellites. The $350k is a public starting price, not a personal offer: broker contracts, the dispenser, integration and the exact orbit can change the full price.',
  },
  {
    id: 'lv_electron_kickstage', icon: '🚀', plainName: 'Rocket Lab Electron', name: 'Electron (2 stages + Kick Stage)', family: 'electron', size: 'small', heightRel: 0.55,
    costType: 'rfq', priceM: null,
    dataKind: 'fact', sources: ['S13'], ref: '§1.1 · §6.1',
    capacityKg: { leo_550: 300, sso_550_650: null },
    headline: 'Up to ~300 kg to LEO (headline value). The operator confirms the exact performance for your orbit.',
    adapters: ['dep_cubesat'],
    oneLiner: 'Your own small rocket: you choose the exact low orbit. Price on request.',
    description: 'A dedicated small launcher with an optional Kick Stage for a precise low orbit. Its real price is not public — do not assume the "$8M" you may read online.',
  },
  {
    id: 'lv_f9_dedicated_meo', icon: '🚀', plainName: 'Falcon 9 dedicated, MEO injection', name: 'Falcon 9 dedicated + contracted MEO injection', family: 'falcon', size: 'medium', heightRel: 0.95,
    costType: 'modeled', priceM: 90, publishedAnchor: { priceM: 74, what: 'standard Falcon 9 launch to GTO (not MEO)', sources: ['S14'] },
    dataKind: 'model', sources: ['S12', 'S14'], ref: '§4.4 · §6.1',
    capacityKg: { meo_gnss: null, leo_550: 22800, sso_550_650: null },
    headline: 'Falcon 9: up to 22,800 kg to LEO and 8,300 kg to GTO (headline values for specific configurations).',
    adapters: ['dep_large_adapter', 'dep_cubesat'], overkillFor: [M_COMMS, M_WX],
    oneLiner: 'The whole rocket for you, with a contracted ride to MEO.',
    description: 'Only valid with a confirmed injection profile to the target MEO orbit. The game uses a $90M launch/injection package (estimate): $74M is the public price of a standard GTO launch, the rest is a margin for the different orbit and services. Not a SpaceX offer.',
  },
  {
    id: 'lv_f9_gto_standard', icon: '🚀', plainName: 'Falcon 9 standard GTO launch', name: 'Falcon 9 standard launch to GTO', family: 'falcon', size: 'medium', heightRel: 0.95,
    costType: 'published', priceM: 74,
    dataKind: 'fact', sources: ['S14', 'S12'], ref: '§4.4',
    capacityKg: {}, deliversTo: 'GTO (geostationary transfer orbit)', gtoCapacityKg: 8300,
    headline: '$74M for a standard Falcon 9 launch to GTO (2026), up to 8,300 kg to GTO.',
    adapters: ['dep_large_adapter'],
    oneLiner: 'Cheaper — but it drops you in GTO, not in your MEO orbit.',
    description: 'GTO is not MEO. Without a transfer stage or apogee engine — and a calculated burn and propellant mass — the satellite would stay in the wrong orbit.',
  },
  {
    id: 'lv_falcon_heavy', icon: '🚀', plainName: 'Falcon Heavy', name: 'Falcon Heavy', family: 'heavy', size: 'heavy', heightRel: 1,
    costType: 'rfq', priceM: null,
    dataKind: 'fact', sources: ['S21'], ref: '§4.4 · §6.1',
    capacityKg: { leo_550: 63800, meo_gnss: null },
    headline: '~63.8 t to LEO in the stated configuration.',
    adapters: ['dep_large_adapter'], overkillFor: [M_COMMS, M_WX, M_NAV],
    oneLiner: 'Huge. It can do it — but a bigger rocket is not a better mission.',
    description: 'Physically able to fly demanding profiles, but overkill for one ~700 kg satellite unless you have extra payload or a special trajectory. Its price for such a profile is not public.',
  },
];

const byId = new Map(LAUNCHERS.map((l) => [l.id, l]));
export const getLauncher = (id) => (id ? byId.get(id) ?? null : null);

/** Launch price for this spacecraft mass ($M) or null if not public (RFQ). */
export const launchPrice = (l, massKg = 0) => (!l ? 0 : l.costType === 'rfq' ? null : l.priceFn ? l.priceFn(massKg) : l.priceM);

export const COST_TYPE = {
  published: { icon: '🏷', label: 'Published price', text: 'A public starting price from the launch company — not a personal offer.' },
  modeled: { icon: '≈', label: 'Estimate', text: 'An educational estimate from our research — not an official quote.' },
  rfq: { icon: '✉️', label: 'Price on request (RFQ)', text: 'No public price. A real mission asks the operator for a quote.' },
};

// ── Payload adapters / dispensers (research category deployer_adapter)
export const DEPLOYERS = [
  {
    id: 'dep_cubesat', icon: '📦', plainName: 'CubeSat dispenser', name: 'CubeSat dispenser + mechanical interface + integration', formFactor: 'cubesat',
    cost: 0.25, dataKind: 'model', sources: ['S01'], ref: '§3.5 · §5.5',
    oneLiner: 'A spring-loaded box that pushes your CubeSat out. Its mass limit follows your CubeSat size.',
    description: 'Holds the CubeSat during launch and releases it in orbit. Typical mass limits: 3U 6 kg, 6U 12 kg, 12U 24 kg — the final limit is agreed with the dispenser supplier.',
  },
  {
    id: 'dep_large_adapter', icon: '🔩', plainName: 'Large-satellite adapter', name: 'Payload adapter + separation system for a large satellite', formFactor: 'large',
    cost: 0, costNote: 'included in the launch service', dataKind: 'model', sources: ['S12'], ref: '§6.2',
    oneLiner: 'Bolts a big satellite to the rocket and separates it in orbit.',
    description: 'Mechanical and electrical interface between the rocket and a large satellite. Its cost is part of the launch/integration contract — not added twice.',
  },
];
const depById = new Map(DEPLOYERS.map((d) => [d.id, d]));
export const getDeployer = (id) => (id ? depById.get(id) ?? null : null);

// ── "What's inside this rocket?" — info only: no prices, no mixing parts between rockets (§6.2).
export const ROCKET_PARTS = [
  { id: 'launch_first_stage', icon: '1️⃣', plainName: 'First stage', falcon: '9 Merlin engines', electron: '9 Rutherford engines', sources: ['S12', 'S13'] },
  { id: 'launch_first_stage_propellants', icon: '🛢️', plainName: 'Rocket propellants', falcon: 'LOX + RP-1 (kerosene)', electron: 'LOX + kerosene', sources: ['S12', 'S13'] },
  { id: 'launch_second_stage', icon: '2️⃣', plainName: 'Second stage', falcon: '1 Merlin Vacuum engine', electron: '1 vacuum Rutherford engine', sources: ['S12', 'S13'] },
  { id: 'launch_kick_or_transfer', icon: '↗️', plainName: 'Kick / transfer stage', falcon: 'For MEO: a contracted route or stage only if needed — not a standard part', electron: 'Kick Stage for a precise low orbit', sources: ['S13'] },
  { id: 'launch_guidance', icon: '🧠', plainName: 'Guidance & avionics', falcon: 'Built-in navigation and engine/stage control', electron: 'Electron\'s own avionics', sources: ['S12', 'S13'] },
  { id: 'launch_tanks', icon: '🧪', plainName: 'Tanks', falcon: 'Oxidiser and fuel tanks, feed lines', electron: 'Oxidiser and fuel tanks', sources: ['S12', 'S13'] },
  { id: 'launch_interstage', icon: '🔗', plainName: 'Interstage & separation', falcon: 'Interstage and stage separation', electron: 'Standard separation system', sources: ['S12', 'S13'] },
  { id: 'launch_fairing', icon: '🥚', plainName: 'Fairing (nose cover)', falcon: '5.2 m wide, 13.1 m tall', electron: 'Electron\'s own fairing', sources: ['S12', 'S13'] },
  { id: 'launch_payload_adapter', icon: '🔩', plainName: 'Payload adapter', falcon: '6U dispenser or a large-satellite interface', electron: 'Dispenser/adapter for the mission', sources: ['S12', 'S13'] },
  { id: 'launch_range_and_tests', icon: '🧾', plainName: 'Launch campaign & tests', falcon: 'Range safety, vibration tests — inside the launch price', electron: 'The same — inside the launch price', sources: ['S12', 'S13'] },
];
export const ROCKET_FAMILY = {
  falcon: { name: 'Falcon 9', facts: 'Two stages, up to 22,800 kg to LEO and 8,300 kg to GTO (headline values).', sources: ['S12'] },
  electron: { name: 'Electron', facts: 'Two stages + optional Kick Stage, about 300 kg to LEO.', sources: ['S13'] },
  heavy: { name: 'Falcon Heavy', facts: 'About 63.8 t to LEO in the stated configuration. Our research has no part-by-part data for it.', sources: ['S21'], noParts: true },
};
