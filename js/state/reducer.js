// All state transitions. Pure: (state, action) -> new state. Never mutate `state`.

import { T, SCREENS, MAX_PLAYERS } from './actions.js';
import { emptyDesign } from './initialState.js';
import { ROLES } from '../data/roles.js';
import { COMPONENT_CATEGORIES, getComponent, isCubeSat } from '../data/components.js';
import { getScenario, EASY_DEFAULT_STRUCTURE } from '../data/scenarios.js';
import { applyBundles, getPowerPack, getKit } from '../data/bundles.js';
import { getInstrument } from '../data/instruments.js';
import { getOrbit } from '../data/orbits.js';
import { getLauncher } from '../data/launchers.js';
import { getGroundStation } from '../data/groundStations.js';
import { getNoGoReason } from '../data/roles.js';
import { voteStatus } from '../engine/roleGoals.js';
import { runSimulation } from '../engine/simulation.js';
import { scoreMission } from '../engine/scoring.js';

// Any design change re-applies Easy bundles and invalidates votes and old results.
const withDesign = (state, design) => ({ ...state, design: applyBundles(design), votes: {}, voteReasons: {}, simulation: null, score: null, relaunches: 0 });

const firstFreeRole = (players) =>
  (ROLES.find((r) => !players.some((p) => p.roleId === r.id)) ?? ROLES[0]).id;

// In team mode, the active role must belong to some player.
function fixActiveRole(state) {
  if (state.mode === 'solo') return state;
  if (state.players.some((p) => p.roleId === state.activeRoleId)) return state;
  return { ...state, activeRoleId: state.players[0]?.roleId ?? 'director' };
}

// Easy + a CubeSat-friendly mission → start with a 6U CubeSat frame (if no frame chosen yet).
function applyEasyDefaults(state) {
  if (state.difficulty !== 'easy') return state;
  const scenario = getScenario(state.scenarioId);
  if (!scenario?.cubesatFeasible || state.design.components.structure) return state;
  return withDesign(state, { ...state.design, components: { ...state.design.components, structure: EASY_DEFAULT_STRUCTURE } });
}

// Switching between a CubeSat and a full-size frame drops parts of the wrong size
// (they become "to do" again instead of an error). Easy bundles then refill them.
function changeStructure(design, structureId) {
  const wasCube = isCubeSat(getComponent(design.components.structure));
  const nowCube = isCubeSat(getComponent(structureId));
  const components = { ...design.components, structure: structureId };
  if (wasCube !== nowCube) {
    for (const cat of COMPONENT_CATEGORIES) {
      const c = getComponent(components[cat]);
      if (cat !== 'structure' && c && isCubeSat(c) !== nowCube) components[cat] = null;
    }
  }
  return { ...design, components };
}

// Replay the simulation with a decision list; score only when the run is complete.
function withSimulation(state, seed, decisions) {
  const simulation = runSimulation(state, seed, decisions);
  const score = simulation.complete ? scoreMission(state, simulation) : null;
  return { ...state, simulation, score };
}

export function reducer(state, action) {
  switch (action.type) {
    case T.GO_TO_SCREEN:
      if (!SCREENS.includes(action.screen)) return state;
      return { ...state, screen: action.screen };

    case T.SET_MODE: {
      if (action.mode !== 'solo' && action.mode !== 'team') return state;
      let players = action.mode === 'solo' ? state.players.slice(0, 1) : state.players;
      if (action.mode === 'team' && players.length < 2) {
        players = [...players, { name: `Player ${players.length + 1}`, roleId: firstFreeRole(players) }];
      }
      return fixActiveRole({ ...state, mode: action.mode, players });
    }

    case T.SET_DIFFICULTY: {
      if (action.difficulty !== 'easy' && action.difficulty !== 'normal') return state;
      // Easy uses bundles (auto kit); Normal lets players pick every part.
      const design = action.difficulty === 'easy'
        ? { ...state.design, kit: state.design.kit ?? 'standard' }
        : { ...state.design, kit: null, powerPack: null };
      return applyEasyDefaults(withDesign({ ...state, difficulty: action.difficulty }, design));
    }

    case T.ADD_PLAYER: {
      if (state.mode !== 'team' || state.players.length >= MAX_PLAYERS) return state;
      const name = action.name?.trim() || `Player ${state.players.length + 1}`;
      return { ...state, players: [...state.players, { name, roleId: firstFreeRole(state.players) }] };
    }

    case T.REMOVE_PLAYER: {
      if (state.players.length <= 1) return state;
      const players = state.players.filter((_, i) => i !== action.index);
      return fixActiveRole({ ...state, players });
    }

    case T.RENAME_PLAYER: {
      const players = state.players.map((p, i) =>
        i === action.index ? { ...p, name: action.name.trim() || p.name } : p);
      return { ...state, players };
    }

    case T.ASSIGN_ROLE: {
      const players = state.players.map((p, i) => (i === action.index ? { ...p, roleId: action.roleId } : p));
      return fixActiveRole({ ...state, players });
    }

    case T.SET_ACTIVE_ROLE:
      return { ...state, activeRoleId: action.roleId };

    case T.SELECT_SCENARIO:
      return applyEasyDefaults({ ...state, scenarioId: action.scenarioId, votes: {}, simulation: null, score: null });

    case T.SELECT_COMPONENT: {
      if (!COMPONENT_CATEGORIES.includes(action.category)) return state;
      if (action.category === 'structure') return withDesign(state, changeStructure(state.design, action.componentId));
      // Picking a single power/brains part by hand turns the matching bundle off.
      const design = { ...state.design, components: { ...state.design.components, [action.category]: action.componentId } };
      if (action.category === 'power' || action.category === 'battery') design.powerPack = null;
      if (['computer', 'adcs', 'propulsion'].includes(action.category)) design.kit = null;
      return withDesign(state, design);
    }

    case T.SELECT_POWER_PACK:
      if (action.packId !== null && !getPowerPack(action.packId)) return state;
      return withDesign(state, { ...state.design, powerPack: action.packId });

    case T.SET_KIT:
      if (action.kit !== null && !getKit(action.kit)) return state;
      return withDesign(state, { ...state.design, kit: action.kit });

    case T.ADD_INSTRUMENT:
      if (state.design.instrumentIds.includes(action.instrumentId)) return state;
      return withDesign(state, {
        ...state.design, instrumentIds: [...state.design.instrumentIds, action.instrumentId],
      });

    case T.REMOVE_INSTRUMENT:
      return withDesign(state, {
        ...state.design, instrumentIds: state.design.instrumentIds.filter((id) => id !== action.instrumentId),
      });

    case T.SELECT_ORBIT:
      return withDesign(state, { ...state.design, orbitId: action.orbitId });

    case T.SELECT_LAUNCHER:
      return withDesign(state, { ...state.design, launcherId: action.launcherId });

    case T.SELECT_GROUND:
      return withDesign(state, { ...state.design, groundId: action.groundId });

    case T.CAST_VOTE: {
      if (action.vote === 'nogo' && !getNoGoReason(action.reason)) return state; // a No-Go needs a reason
      const votes = { ...state.votes };
      const voteReasons = { ...state.voteReasons };
      if (action.vote === 'go' || action.vote === 'nogo') votes[action.roleId] = action.vote; else delete votes[action.roleId];
      if (action.vote === 'nogo') voteReasons[action.roleId] = action.reason; else delete voteReasons[action.roleId];
      return { ...state, votes, voteReasons };
    }

    // Engine functions are pure and seeded, so calling them here keeps the reducer pure.
    case T.RUN_SIMULATION:
      if (!voteStatus(state).majority) return state; // team mode: launch needs a majority Go
      return { ...withSimulation({ ...state, relaunches: 0 }, action.seed, []), screen: 'operations' };

    case T.RELAUNCH:
      if (state.simulation?.outcome !== 'launch_failure') return state;
      return withSimulation({ ...state, relaunches: state.relaunches + 1 }, action.seed, []);

    case T.CHOOSE_EVENT_OPTION: {
      const sim = state.simulation;
      if (!sim?.pending) return state;
      return withSimulation(state, sim.seed, [...sim.decisions, action.choiceIndex]);
    }

    case T.LOAD_DESIGN: {
      const sh = action.shared;
      if (!sh || !getScenario(sh.scenarioId)) return state;
      const d = sh.design ?? {};
      const components = { ...emptyDesign().components };
      for (const cat of COMPONENT_CATEGORIES) components[cat] = getComponent(d.components?.[cat])?.category === cat ? d.components[cat] : null;
      const design = {
        ...emptyDesign(), components,
        instrumentIds: (d.instrumentIds ?? []).filter((id) => getInstrument(id)),
        orbitId: getOrbit(d.orbitId) ? d.orbitId : null,
        launcherId: getLauncher(d.launcherId) ? d.launcherId : null,
        groundId: getGroundStation(d.groundId) ? d.groundId : null,
        powerPack: getPowerPack(d.powerPack) ? d.powerPack : null,
        kit: getKit(d.kit) ? d.kit : null,
      };
      const difficulty = sh.difficulty === 'normal' ? 'normal' : 'easy';
      return withDesign({ ...state, difficulty, scenarioId: sh.scenarioId, screen: 'finalCheck' }, design);
    }

    case T.NEW_MISSION:
      return {
        ...state,
        screen: 'pickMission',
        scenarioId: null,
        design: { ...emptyDesign(), kit: state.difficulty === 'easy' ? 'standard' : null },
        votes: {},
        voteReasons: {},
        simulation: null,
        score: null,
        relaunches: 0,
      };

    default:
      return state;
  }
}
