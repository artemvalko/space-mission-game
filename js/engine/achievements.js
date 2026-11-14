// Phase 4 P2 #9 — Achievement badges — PURE. earnedBadges(state, score, sim) → [{ ...badge, earned, why }]

import { pct } from '../utils/format.js';

export const BADGES = [
  { id: 'penny', icon: '🪙', name: 'Penny Pincher', text: 'Finish with at least 20% of the budget left.' },
  { id: 'zero_data', icon: '📡', name: 'Zero Data Lost', text: 'Get every bit of data home.' },
  { id: 'survivor', icon: '🛡️', name: 'Survivor', text: 'Survive 3 or more space events.' },
  { id: 'featherweight', icon: '🪶', name: 'Featherweight', text: 'Keep a weight margin of 25% or more.' },
  { id: 'perfect_team', icon: '🤝', name: 'Perfect Team', text: 'Every team member meets their personal goal.' },
];

export function earnedBadges(state, score, sim) {
  const st = score.stats;
  const flew = sim.reachedOrbit;
  const checks = {
    penny: [flew && st.budgetLeft >= 0.2, `${pct(Math.max(st.budgetLeft, 0))} of the budget left`],
    zero_data: [flew && sim.outcome !== 'lost' && st.lostFraction === 0, st.lostFraction === 0 ? 'no data lost' : `${pct(st.lostFraction)} of data lost`],
    survivor: [flew && sim.outcome !== 'lost' && sim.summary.eventsSurvived >= 3, `${sim.summary.eventsSurvived} events survived`],
    featherweight: [flew && st.massMargin >= 0.25, `weight margin ${pct(Math.max(st.massMargin, 0))}`],
    perfect_team: [state.mode === 'team' && score.personalGoals.every((g) => g.met), state.mode === 'team' ? `${score.personalGoals.filter((g) => g.met).length} of ${score.personalGoals.length} goals met` : 'team games only'],
  };
  return BADGES.map((b) => ({ ...b, earned: !!checks[b.id][0], why: checks[b.id][1] }));
}
