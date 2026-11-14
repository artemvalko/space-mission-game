// The single source of truth. Only the reducer may produce new versions of it.

export function emptyDesign() {
  return {
    components: {
      structure: null, power: null, battery: null, comms: null,
      computer: null, adcs: null, propulsion: null,
    },
    instrumentIds: [],
    orbitId: null,
    launcherId: null,
    groundId: null,
    powerPack: null,   // Easy: 'small'|'medium'|'large' → sets power + battery
    kit: null,         // Easy: 'standard'|'upgraded' → sets computer + pointing + thrusters
  };
}

export function createInitialState() {
  return {
    screen: 'start',          // see SCREENS in actions.js
    mode: 'solo',             // solo|team
    difficulty: 'easy',       // easy|normal (easy: bundled choices, auto kit, CubeSat default for CubeSat Classroom)
    players: [{ name: 'Player 1', roleId: 'director' }],
    activeRoleId: 'director',
    scenarioId: null,
    design: { ...emptyDesign(), kit: 'standard' },
    votes: {},                // roleId -> 'go'|'nogo'
    voteReasons: {},          // roleId -> No-Go reason id
    relaunches: 0,            // launches repeated after a failure (each costs extra)
    simulation: null,
    score: null,
  };
}

export const initialState = createInitialState();
