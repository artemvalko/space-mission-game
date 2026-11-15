// Achievement badges — PURE. earnedBadges(state, score, sim) → [{ ...badge, earned, why }]

import { pct } from '../utils/format.js';

export const BADGES = [
  { id: 'penny', icon: '🪙', name: 'Penny Pincher', text: 'Keep at least the research\'s planned project reserve.' },
  { id: 'zero_data', icon: '📡', name: 'Every Bit Home', text: 'Meet every mission KPI.' },
  { id: 'survivor', icon: '🛡️', name: 'Survivor', text: 'Handle 3 or more simulated events and finish the mission.' },
  { id: 'featherweight', icon: '🪶', name: 'Featherweight', text: 'Keep a mass margin of 25% or more (CubeSat builds).' },
  { id: 'perfect_team', icon: '🤝', name: 'Perfect Team', text: 'Every team member meets their personal goal.' },
];

export function earnedBadges(state, score, sim) {
  const st = score.stats;
  const flew = sim.reachedOrbit && !sim.noGo;
  const reserveShare = st.budgetLeft;
  const checks = {
    penny: [flew && score.objectives.find((o) => o.id === 'budget')?.met && reserveShare >= 0.09, `${pct(Math.max(reserveShare, 0))} of the budget left`],
    zero_data: [flew && sim.outcome !== 'lost' && st.satelliteSuccess, st.satelliteSuccess ? 'all KPIs met' : 'some KPIs missed'],
    survivor: [flew && sim.outcome !== 'lost' && sim.summary.eventsSurvived >= 3, `${sim.summary.eventsSurvived} events handled`],
    featherweight: [flew && st.massMargin >= 0.25, `mass margin ${pct(Math.max(st.massMargin, 0))}`],
    perfect_team: [state.mode === 'team' && score.personalGoals.every((g) => g.met), state.mode === 'team' ? `${score.personalGoals.filter((g) => g.met).length} of ${score.personalGoals.length} goals met` : 'team games only'],
  };
  return BADGES.map((b) => ({ ...b, earned: !!checks[b.id][0], why: checks[b.id][1] }));
}
