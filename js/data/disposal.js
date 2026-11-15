// End of life — three ways to retire a satellite, and each one has a cost (DISPOSAL.md).
// REAL DATA ONLY: sources D01–D08 (js/data/sources.js). The aluminium-oxide number is a SCIENCE
// ESTIMATE derived from a simulation study (D01) and is always badged "≈ science estimate".
//
// The existing end-of-life methods (components `eol_*`: natural decay, drag sail, turn broadside)
// are the sub-options of "Let it burn up".

// ≈ Al₂O₃ from reentry = launch mass × 0.30 (aluminium share, D01 assumption)
//                                       × 0.40 (30 kg Al₂O₃ from 75 kg Al, D01) = launch mass × 0.12
export const ALU_SHARE = 0.30;
export const OXIDE_PER_ALU = 30 / 75;
export const AL2O3_PER_KG = ALU_SHARE * OXIDE_PER_ALU; // 0.12
/** Model estimate of aluminium oxide released if a satellite of this mass burns up (kg). */
export const al2o3Kg = (launchMassKg) => (launchMassKg ?? 0) * AL2O3_PER_KG;
export const EMISSION_BADGE = '≈ science estimate (Ferreira 2024)';

// Orbits the air pulls down within years (low orbits); MEO/GEO never come down by themselves.
export const LOW_ORBITS = ['leo_550', 'sso_550_650', 'leo_550_32deg', 'iss_400_516'];
export const HIGH_ORBITS = ['meo_gnss', 'meo_gps_20200', 'geo'];

// Planet-impact score weights (game scoring, not data): debris 15 · atmosphere 15 · ground 10 = 40.
export const PLANET_MAX = { debris: 15, atmosphere: 15, ground: 10 };

export const DISPOSAL_STRATEGIES = [
  {
    id: 'disp_burn_up', icon: '🔥', plainName: 'Let it burn up', name: 'Uncontrolled reentry (natural decay / drag sail / turn broadside)',
    oneLiner: 'No junk left, but oxide in the air.',
    why: 'The air slowly drags a low satellite down and it burns up. No debris stays — but burning releases aluminium-oxide particles high in the atmosphere (D01, D02).',
    subOptions: 'eol', dataKind: 'fact', sources: ['D01', 'D02', 'D04', 'O55', 'S22'], ref: 'DISPOSAL.md',
  },
  {
    id: 'disp_controlled_ocean', icon: '🌊', plainName: 'Controlled fall into the ocean', name: 'Controlled reentry over the South Pacific (Point Nemo)',
    oneLiner: 'Safest for people; needs thrusters and fuel.',
    why: 'A deorbit burn aims the reentry at the uninhabited South Pacific near Point Nemo (D06). The parts that burn still release oxide; surviving parts sink. It needs more propellant and higher-thrust engines (D05).',
    dataKind: 'fact', sources: ['D04', 'D05', 'D06'], ref: 'DISPOSAL.md',
  },
  {
    id: 'disp_leave_in_orbit', icon: '🛰️', plainName: 'Leave it in orbit', name: 'Stay in space (MEO/GEO: move to a disposal orbit)',
    oneLiner: 'Clean air, but one more piece of junk.',
    why: 'Nothing burns, nothing falls — but the satellite stays in space as one more object to track. In MEO it uses its own thrusters to move out of the working orbit.',
    dataKind: 'fact', sources: ['S22', 'O55'], ref: 'DISPOSAL.md',
  },
];

// Optional add-on (D07): a docking plate lets a future tug capture and remove the satellite.
export const DOCKING_PLATE = {
  id: 'addon_docking_plate', icon: '🧲', plainName: 'Docking plate (Astroscale)', name: 'Astroscale docking plate for future capture (ELSA-M)',
  oneLiner: 'A future tug can remove it.', why: 'A plate a servicing spacecraft can grab and pull down (ELSA-M demo planned 2026).',
  mass: null, cost: null, dataKind: 'fact', sources: ['D07'], ref: 'DISPOSAL.md',
};

const byId = new Map(DISPOSAL_STRATEGIES.map((d) => [d.id, d]));
export const getDisposal = (id) => (id ? byId.get(id) ?? null : null);

// The honest "Why?" lines for the step (D01, D03, D04).
export const DISPOSAL_WHY = [
  'Burning up a 250 kg satellite makes ~30 kg of aluminium-oxide particles (simulation, D01).',
  'Spacecraft metals are already in ~10% of stratospheric particles (NOAA, D03).',
  'Uncontrolled reentry is only allowed if the risk to people is ≤ 1 in 10,000 (ESA, D04).',
  'Scientists don’t yet know the full ozone effect.',
];
