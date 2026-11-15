// The single source of truth. Only the reducer may produce new versions of it.

import { COMPONENT_CATEGORIES } from '../data/components.js';

export function emptyDesign() {
  return {
    // One id per bus category (data/components.js COMPONENT_CATEGORIES); 'none' = left out on purpose.
    components: Object.fromEntries(COMPONENT_CATEGORIES.map((c) => [c, null])),
    instrumentIds: [],  // mission payload (service payload + timing + calibration)
    orbitId: null,
    launcherId: null,
    deployerId: null,   // CubeSat dispenser or large-satellite adapter
    groundId: null,
    powerPack: null,   // Easy: power pack id (data/bundles.js) → sets solar array + battery
    kit: null,         // Easy: 'standard' → bus kit from the research build list
    prep: { tests: false, licence: false, disposal: false }, // launch-prep checklist (§11.1)
    variantId: null,    // objective variant (data/scenarios.js variants; null = the first)
    satsPerLaunch: 1,   // 1 or 2 satellites share one launch (Galileo pairs)
  };
}

export function createInitialState() {
  return {
    screen: 'start',          // see SCREENS in actions.js
    mode: 'solo',             // solo|team
    difficulty: 'easy',       // easy|normal (easy: bundled choices + auto bus kit from the research build list)
    players: [{ name: 'Player 1', roleId: 'director' }],
    activeRoleId: 'director',
    scenarioId: null,
    design: { ...emptyDesign(), kit: 'standard' },
    votes: {},                // roleId -> 'go'|'nogo'
    voteReasons: {},          // roleId -> No-Go reason id
    simulation: null,
    score: null,
  };
}

export const initialState = createInitialState();
