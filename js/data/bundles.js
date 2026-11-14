// Easy-mode bundles: one choice that sets several components at once.
// Pure data + pure resolver functions (used by the reducer).

import { getComponent, isCubeSat, COMPONENTS } from './components.js';
import { getOrbit } from './orbits.js';

// Power pack → { power, battery } for standard frames; CubeSats only fit the small pack.
export const POWER_PACKS = [
  {
    id: 'small', icon: '🔋', plainName: 'Small power pack', oneLiner: "Body solar cells + small battery. Light and cheap — fine for small satellites.",
    standard: { power: 'pwr_body_solar', battery: 'bat_small' }, cubesat: { power: 'pwr_cube_solar', battery: 'bat_cube' },
  },
  {
    id: 'medium', icon: '🔋', plainName: 'Medium power pack', oneLiner: 'Fold-out solar wings + medium battery. Plenty for most missions.',
    standard: { power: 'pwr_deploy_solar', battery: 'bat_medium' }, cubesat: null,
  },
  {
    id: 'large', icon: '🔋', plainName: 'Large power pack', oneLiner: 'Fold-out wings + large battery. For power-hungry tools and long shadows.',
    standard: { power: 'pwr_deploy_solar', battery: 'bat_large' }, cubesat: null,
  },
];
export const getPowerPack = (id) => POWER_PACKS.find((p) => p.id === id) ?? null;

// "Brains & steering" kits (computer + pointing + thrusters). Thrusters are picked automatically:
// the cheapest ones strong enough for the chosen orbit.
export const KITS = [
  { id: 'standard', plainName: 'Standard kit', computer: 'cpu_basic', adcs: 'adcs_rw', cubesat: { computer: 'cpu_cube', adcs: 'adcs_cube', propulsion: 'prop_cube' } },
  { id: 'upgraded', plainName: 'Upgraded kit', computer: 'cpu_radhard', adcs: 'adcs_fine', cubesat: { computer: 'cpu_cube', adcs: 'adcs_cube', propulsion: 'prop_cube' } },
];
export const getKit = (id) => KITS.find((k) => k.id === id) ?? null;

/** Cheapest full-size thrusters that can reach the orbit (Gentle thrusters if no orbit yet). */
export function autoThrusters(orbitId) {
  const need = getOrbit(orbitId)?.requiredDeltaV ?? 0;
  const options = COMPONENTS
    .filter((c) => c.category === 'propulsion' && !isCubeSat(c) && c.deltaV >= need)
    .sort((a, b) => a.cost - b.cost);
  return (options[0] ?? COMPONENTS.find((c) => c.id === 'prop_biprop')).id;
}

/** Apply design.powerPack and design.kit (if set) to design.components. Pure. */
export function applyBundles(design) {
  const cube = isCubeSat(getComponent(design.components.structure));
  const components = { ...design.components };
  const pack = getPowerPack(design.powerPack);
  let powerPack = design.powerPack;
  if (pack) {
    // CubeSats only fit the small pack: fall back to it automatically.
    const parts = cube ? (pack.cubesat ?? POWER_PACKS[0].cubesat) : pack.standard;
    if (cube && !pack.cubesat) powerPack = POWER_PACKS[0].id;
    Object.assign(components, parts);
  }
  const kit = getKit(design.kit);
  if (kit) {
    if (cube) Object.assign(components, kit.cubesat);
    else Object.assign(components, { computer: kit.computer, adcs: kit.adcs, propulsion: autoThrusters(design.orbitId) });
  }
  return { ...design, powerPack, components };
}
