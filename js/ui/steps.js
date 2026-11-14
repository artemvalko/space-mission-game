// Step metadata for the guided flow: plain-English question, owner role, "answered" rule.
// UI-only (the engine/advisor refer to steps by id).

import { SCREENS } from '../state/actions.js';

const c = (state) => state.design.components;

export const STEPS = [
  { id: 'start', label: 'Start', icon: '🏠' },
  { id: 'pickMission', label: 'Mission', icon: '🎯', verb: 'Pick your mission', question: 'Which mission will you fly?', phase: 'Concept', owner: 'director',
    answered: (s) => !!s.scenarioId },
  { id: 'size', label: 'Size', icon: '📦', verb: 'Choose the satellite size', question: 'How big is your satellite?', phase: 'Trade study', owner: 'engineer',
    answered: (s) => !!c(s).structure },
  { id: 'science', label: 'Science tools', icon: '🔬', verb: 'Choose your science tools', question: 'Which science tools will it carry?', phase: 'Trade study', owner: 'scientist',
    answered: (s) => s.design.instrumentIds.length > 0 },
  { id: 'power', label: 'Power', icon: '⚡', verb: 'Choose your power', question: 'How will it get electricity?', phase: 'Trade study', owner: 'engineer',
    answered: (s) => !!(c(s).power && c(s).battery) },
  { id: 'comms', label: 'Talking to Earth', icon: '📡', verb: 'Choose how to talk to Earth', question: 'How will it talk to Earth?', phase: 'Trade study', owner: 'flight',
    answered: (s) => !!(c(s).comms && s.design.groundId) },
  { id: 'brains', label: 'Brains & steering', icon: '🧠', verb: 'Choose brains & steering', question: 'Which computer, pointing system and thrusters?', phase: 'Trade study', owner: 'engineer',
    answered: (s) => !!(c(s).computer && c(s).adcs && c(s).propulsion), skip: (s) => s.difficulty === 'easy' },
  { id: 'orbit', label: 'Orbit', icon: '🌍', verb: 'Choose your orbit', question: 'Where will your satellite fly?', phase: 'Trade study', owner: 'flight',
    answered: (s) => !!s.design.orbitId },
  { id: 'rocket', label: 'Rocket', icon: '🚀', verb: 'Choose your rocket', question: 'Which rocket will launch it?', phase: 'Trade study', owner: 'flight',
    answered: (s) => !!s.design.launcherId },
  { id: 'finalCheck', label: 'Final check', icon: '✅', verb: 'Final check', question: 'Is everything ready for launch?', phase: 'Point design & review', owner: 'director',
    answered: (s) => !!s.simulation },
  { id: 'operations', label: 'Mission', icon: '🛰️', verb: 'Fly the mission', question: 'Your satellite is flying!', phase: 'Operations', owner: 'flight',
    answered: (s) => !!s.simulation?.complete },
  { id: 'results', label: 'Results', icon: '🏆', verb: 'See the results', question: 'How did your mission go?', phase: 'Debrief', owner: 'director',
    answered: () => true },
];

if (STEPS.map((s) => s.id).join() !== SCREENS.join()) throw new Error('steps.js out of sync with SCREENS');

export const getStep = (id) => STEPS.find((s) => s.id === id) ?? STEPS[0];

/** Steps visible in the step list for this state (Easy hides "Brains & steering"). */
export const visibleSteps = (state) => STEPS.filter((s) => s.id !== 'start' && !s.skip?.(state));

export function isReachable(id, state) {
  const i = SCREENS.indexOf(id);
  if (i <= SCREENS.indexOf('pickMission')) return true;
  if (!state.scenarioId) return false;
  if (id === 'operations') return state.simulation != null;
  if (id === 'results') return state.simulation?.complete === true;
  return true;
}

export function nextStep(state, fromId = state.screen) {
  const steps = STEPS.filter((s) => !s.skip?.(state));
  const i = steps.findIndex((s) => s.id === fromId);
  return steps[i + 1] ?? null;
}

export function prevStep(state, fromId = state.screen) {
  const steps = STEPS.filter((s) => !s.skip?.(state));
  const i = steps.findIndex((s) => s.id === fromId);
  return i > 0 ? steps[i - 1] : null;
}
