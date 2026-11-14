// Records of finished attempts (saved to localStorage by ui/storage.js) — PURE.

import { computeResources, getSelection } from './resources.js';

export const teamNameOf = (state) => (state.mode === 'team'
  ? `Team ${state.players.map((p) => p.name).join(' · ')}`
  : state.players[0]?.name ?? 'Player 1');

/** Unique key of a finished run (so it is saved once). */
export const attemptKey = (state) => {
  const s = state.simulation;
  return s ? `${state.scenarioId}:${JSON.stringify(state.design)}:${s.seed}:${state.relaunches}:${s.decisions.join('')}` : null;
};

/** Build the record for a finished attempt. `at` = timestamp from the caller. */
export function attemptRecord(state, at) {
  const res = computeResources(state);
  const { scenario } = getSelection(state);
  const sim = state.simulation;
  const score = state.score;
  return {
    key: attemptKey(state),
    at,
    scenarioId: state.scenarioId,
    scenarioName: scenario?.name ?? '',
    team: teamNameOf(state),
    mode: state.mode,
    difficulty: state.difficulty,
    design: state.design,
    summary: {
      spent: score.stats.spent,
      budget: scenario?.budgetM ?? null,
      massPct: res.mass.ratio,
      powerPct: res.power.ratio,
      dataLost: res.data.lostFraction ?? 0,
      science: sim.summary.scienceCollected,
      months: sim.summary.monthsOperated,
    },
    parts: Object.fromEntries(score.parts.map((p) => [p.id, p.points])),
    total: score.total,
    grade: score.grade,
    outcome: sim.outcome,
  };
}
