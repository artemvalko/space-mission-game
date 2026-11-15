// The "Flight Director" advisor: ONE most important message in plain words — PURE.
// advise(state) → { tone: 'ok'|'tight'|'bad', text, step|null, stepLabel }

import { validateDesign } from './validation.js';
import { computeResources } from './resources.js';

const PRIORITY = ['error', 'warning', 'caution', 'todo'];

export function advise(state, issues = validateDesign(state, computeResources(state))) {
  if (!state.scenarioId) return { tone: 'ok', text: 'Welcome! Pick a mission to begin.', step: 'pickMission' };

  for (const severity of PRIORITY) {
    const issue = issues.find((i) => i.severity === severity);
    if (!issue) continue;
    if (severity === 'todo') {
      // Prefer the to-do for the step the player is on, else the first one.
      const here = issues.find((i) => i.severity === 'todo' && i.step === state.screen) ?? issue;
      const doneSomething = issues.filter((i) => i.severity === 'todo').length < 7;
      return { tone: 'ok', text: `${doneSomething ? 'Next: ' : ''}${lowerFirst(here.message, doneSomething)}`, step: here.step };
    }
    return { tone: severity === 'caution' ? 'tight' : 'bad', text: issue.message, step: issue.step, why: issue.why };
  }
  return { tone: 'ok', text: 'All systems go! Launch from the Final check.', step: 'finalCheck' };
}

const lowerFirst = (s, lower) => (lower ? s.charAt(0).toLowerCase() + s.slice(1) : s);
