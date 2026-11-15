// Easy-mode bundles built from the research build lists (BOMs). One choice sets several parts.
// A bundle's mass and cost are always the SUM of its parts (bundleTotals) — nothing extra.

import { getComponent, costFor, isCubeSat, M_COMMS, M_NAV, M_WX } from './components.js';

// Power packs = solar array + EPS + battery. 'solar_only' is the "power_only_peak" trap (§7.3).
export const POWER_PACKS = [
  { id: 'pack_6u_60', formFactor: 'cubesat', icon: '🔋', plainName: '6U power pack · 60 Wh', parts: { power: 'eps_solar_6u', battery: 'battery_6u_60wh' }, missions: [M_COMMS], oneLiner: 'Wings + 60 Wh battery.', about: 'Fold-out wings + 60 Wh battery (communications build).' },
  { id: 'pack_6u_80', formFactor: 'cubesat', icon: '🔋', plainName: '6U power pack · 80 Wh', parts: { power: 'eps_solar_6u', battery: 'battery_6u_80wh' }, missions: [M_WX], oneLiner: 'Wings + 80 Wh battery.', about: 'Fold-out wings + 80 Wh battery (weather build).' },
  { id: 'pack_6u_solar_only', formFactor: 'cubesat', icon: '☀️', plainName: 'Solar wings only (no battery)', parts: { power: 'eps_solar_6u', battery: 'none' }, missions: [], trap: true, oneLiner: 'Lighter… and in shadow?', about: 'Lighter and cheaper… but what happens in Earth\'s shadow?' },
  { id: 'pack_gnss', formFactor: 'large', icon: '🔋', plainName: 'Galileo-class power', parts: { power: 'pwr_gnss_solar', battery: 'bat_gnss_2500wh' }, missions: [M_NAV], oneLiner: '1.6 kW wings + 2.5 kWh.', about: '1.6–1.9 kW class wings + redundant 2.5 kWh battery.' },
  { id: 'pack_gnss_solar_only', formFactor: 'large', icon: '☀️', plainName: 'Big wings only (no battery)', parts: { power: 'pwr_gnss_solar', battery: 'none' }, missions: [], trap: true, oneLiner: 'Saves 35 kg… and in shadow?', about: 'Saves 35 kg… but nothing keeps the clocks running in the shadow.' },
];
export const getPowerPack = (id) => POWER_PACKS.find((p) => p.id === id) ?? null;

// "Standard bus kit" per mission (Easy auto kit) — straight from each research BOM.
export const KITS = [
  {
    id: 'standard', plainName: 'Standard bus kit (from the research build)',
    byMission: {
      [M_COMMS]: { computer: 'obc_6u', adcs: 'adcs_6u', thermal: 'thermal_6u', sensors: 'gnss_receiver_bus', harness: 'harness_mech_6u', propulsion: 'none', propellant: 'none' },
      [M_WX]: { computer: 'obc_weather', adcs: 'adcs_weather', thermal: 'thermal_weather', sensors: 'sun_orbit_sensors', harness: 'harness_misc_weather', propulsion: 'none', propellant: 'none' },
      [M_NAV]: { computer: 'obc_rad_hard', adcs: 'adcs_precision_meo', thermal: 'thermal_meo', sensors: 'none', harness: 'integration_harness_meo', propulsion: 'prop_meo_stationkeeping', propellant: 'propellant_meo' },
    },
  },
];
export const getKit = (id) => KITS.find((k) => k.id === id) ?? null;

/** Mass and model cost of a bundle = the sum of its parts (never more). */
export function bundleTotals(parts, scenarioId) {
  let mass = 0; let cost = 0;
  for (const id of Object.values(parts)) {
    const c = getComponent(id);
    if (c) { mass += c.mass ?? 0; cost += costFor(c, scenarioId); }
  }
  return { mass, cost };
}

/** Apply design.powerPack and design.kit (if set) to design.components. Pure. */
export function applyBundles(design, scenarioId) {
  const components = { ...design.components };
  const structure = getComponent(components.structure);
  const cube = structure ? isCubeSat(structure) : null;
  let powerPack = design.powerPack;
  const pack = getPowerPack(powerPack);
  if (pack) {
    // A pack must match the frame size; otherwise fall back to this mission's pack of the right size.
    const fits = cube == null || (pack.formFactor === 'cubesat') === cube;
    const chosen = fits ? pack : POWER_PACKS.find((p) => !p.trap && (p.formFactor === 'cubesat') === cube && p.missions.includes(scenarioId))
      ?? POWER_PACKS.find((p) => !p.trap && (p.formFactor === 'cubesat') === cube);
    powerPack = chosen.id;
    Object.assign(components, chosen.parts);
  }
  const kit = getKit(design.kit);
  if (kit && scenarioId && kit.byMission[scenarioId]) {
    // The kit follows the frame size: a CubeSat frame gets the 6U kit, a large bus the Galileo-class kit.
    const own = kit.byMission[scenarioId];
    const ownIsCube = isCubeSat(getComponent(own.computer));
    const pick = cube == null || ownIsCube === cube ? own
      : Object.values(kit.byMission).find((k) => isCubeSat(getComponent(k.computer)) === cube);
    Object.assign(components, pick);
  }
  return { ...design, powerPack, components };
}
