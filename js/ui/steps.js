// Step metadata for the guided flow: plain-English question, owner role, "answered" rule.
// UI-only (the engine/advisor refer to steps by id).

import { SCREENS } from '../state/actions.js';
import { getScenario } from '../data/scenarios.js';
import { getComponent } from '../data/components.js';
import { STEP_FOR_CATEGORY } from '../engine/validation.js';

const c = (state) => state.design.components;
const chosen = (state, cat) => c(state)[cat] != null; // a part id or 'none'
const isRef = (state) => !!getComponent(c(state).structure)?.reference;
// Navigation: the bus inside the platform (Galileo FOC part build or GPS III) is fixed.
const fixedPlatform = (state) => state.scenarioId === 'mission_navigation_meo';
const reqOn = (state, step) => {
  const sc = getScenario(state.scenarioId);
  return (sc?.requiredBus ?? []).filter((cat) => STEP_FOR_CATEGORY[cat] === step);
};

export const STEPS = [
  { id: 'start', label: 'Start', icon: 'home' },
  { id: 'pickMission', label: 'Mission', icon: 'target', verb: 'Pick your mission', question: 'Which mission will you fly?', phase: 'Concept', owner: 'director',
    answered: (s) => !!s.scenarioId },
  { id: 'size', label: 'Size', icon: 'box', verb: 'Choose the satellite size', question: 'How big is your satellite?', phase: 'Trade study', owner: 'engineer',
    answered: (s) => !!c(s).structure },
  { id: 'science', label: 'Payload', icon: 'target', verb: 'Choose the mission payload', question: 'What does it carry for the job?', phase: 'Trade study', owner: 'scientist',
    answered: (s) => s.design.instrumentIds.length > 0 || isRef(s) },
  { id: 'power', label: 'Power', icon: 'power', verb: 'Choose your power', question: 'Power for sunlight and shadow?', phase: 'Trade study', owner: 'engineer',
    answered: (s) => (chosen(s, 'power') && chosen(s, 'battery')) || isRef(s), skip: (s) => fixedPlatform(s) },
  { id: 'comms', label: 'Radio', icon: 'antenna', verb: 'Choose how to talk to Earth', question: 'How does it talk to Earth?', phase: 'Trade study', owner: 'flight',
    answered: (s) => (isRef(s) || reqOn(s, 'comms').every((cat) => chosen(s, cat))) && !!s.design.groundId },
  { id: 'brains', label: 'Bus', icon: 'chip', verb: 'Choose the bus systems', question: 'Which bus systems?', phase: 'Trade study', owner: 'engineer',
    answered: (s) => isRef(s) || reqOn(s, 'brains').every((cat) => chosen(s, cat)), skip: (s) => s.difficulty === 'easy' || fixedPlatform(s) },
  { id: 'orbit', label: 'Orbit', icon: 'globe', verb: 'Choose your orbit', question: 'Where will it fly?', phase: 'Trade study', owner: 'flight',
    answered: (s) => !!s.design.orbitId },
  { id: 'rocket', label: 'Rocket', icon: 'rocket', verb: 'Choose the rocket & adapter', question: 'Which rocket and adapter?', phase: 'Trade study', owner: 'flight',
    answered: (s) => !!s.design.launcherId && !!s.design.deployerId },
  { id: 'launchPrep', label: 'Prep', icon: 'document', verb: 'Prepare for launch', question: 'Tested, licensed, planned?', phase: 'Flight readiness', owner: 'director',
    answered: (s) => !!(s.design.prep?.tests && s.design.prep?.licence && s.design.prep?.disposal) },
  { id: 'finalCheck', label: 'Check', icon: 'check', verb: 'Final check', question: 'GO or NO-GO?', phase: 'Flight readiness review', owner: 'director',
    answered: (s) => !!s.simulation },
  { id: 'operations', label: 'Fly', icon: 'satellite', verb: 'Fly the mission', question: 'Your satellite is flying!', phase: 'Operations', owner: 'flight',
    answered: (s) => !!s.simulation?.complete },
  { id: 'results', label: 'Results', icon: 'trophy', verb: 'See the results', question: 'How did it go?', phase: 'Debrief', owner: 'director',
    answered: () => true },
];

if (STEPS.map((s) => s.id).join() !== SCREENS.join()) throw new Error('steps.js out of sync with SCREENS');

export const getStep = (id) => STEPS.find((s) => s.id === id) ?? STEPS[0];

/** Steps visible in the step list for this state (Easy hides "Bus systems": the kit comes from the research build). */
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
