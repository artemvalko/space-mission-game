// matchRealMissions(state) → the real missions behind this mission (research §1, §12) — PURE.
// "Your design vs the real thing": the analog(s); "Alternative correct architectures": the alternatives.

import { realMissionsFor } from '../data/realMissions.js';
import { getSelection } from './resources.js';

/** @returns {{ mission, reason: string }[]} */
export function matchRealMissions(state, limit = 2) {
  const sel = getSelection(state);
  if (!sel.scenario) return [];
  return realMissionsFor(sel.scenario.id, 'analog').slice(0, limit).map((mission) => ({ mission, reason: `Real mission inspiration for "${sel.scenario.name}".` }));
}

export function alternativeArchitectures(state) {
  const sel = getSelection(state);
  return sel.scenario ? realMissionsFor(sel.scenario.id, 'alternative') : [];
}
