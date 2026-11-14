// Role personal goals — PURE.
// evaluateRoleGoals(state, sim?) → [{ roleId, icon, name, text, met, reason }]
// Without a simulation (Final check) goals are judged on the design ("live"); with a finished
// simulation they are judged on what actually happened.

import { ROLES } from '../data/roles.js';
import { computeResources, getSelection } from './resources.js';
import { money, months, num, pct } from '../utils/format.js';

export const MARGIN_GOAL = 0.10;     // director budget / engineer margins
export const SCIENCE_GOAL = 1.2;     // scientist: 1.2 × minScience
export const DATA_LOSS_GOAL = 0.10;  // flight: at most 10% lost

const CHECKS = {
  director_budget_schedule(ctx) {
    const { res, scenario, sim } = ctx;
    if (scenario.sandbox) return { met: true, reason: 'Sandbox: no budget to watch.' };
    const spent = res.budget.used + (sim?.summary.extraCostM ?? 0);
    const left = (scenario.budgetM - spent) / scenario.budgetM;
    const ready = res.time.used + (sim?.summary.delayMonths ?? 0);
    const onTime = ready <= scenario.deadlineMonths;
    const met = left >= MARGIN_GOAL && onTime;
    return { met, reason: `${pct(Math.max(left, -9))} of the budget left (${money(spent)} of ${money(scenario.budgetM)}); ready in ${months(ready)} of ${months(scenario.deadlineMonths)}.` };
  },
  engineer_margins(ctx) {
    const { res } = ctx;
    const massMargin = res.mass.available ? 1 - res.mass.used / res.mass.available : null;
    const powerMargin = res.power.available ? 1 - res.power.used / res.power.available : null;
    const met = massMargin != null && powerMargin != null && massMargin >= MARGIN_GOAL && powerMargin >= MARGIN_GOAL;
    const f = (m) => (m == null ? 'unknown' : pct(m));
    return { met, reason: `Weight margin ${f(massMargin)}, power margin ${f(powerMargin)} (need 10% each).` };
  },
  scientist_science(ctx) {
    const { res, scenario, sim } = ctx;
    if (!scenario.minScience) return { met: true, reason: 'No science target on this mission.' };
    const rate = sim
      ? (sim.summary.monthsOperated > 0 ? sim.summary.scienceCollected / (sim.summary.monthsOperated / 12) : 0)
      : res.science.value;
    const need = scenario.minScience * SCIENCE_GOAL;
    return { met: rate >= need, reason: `${num(rate)} science points per year; the goal is ${num(need)} (target ${num(scenario.minScience)} + 20%).` };
  },
  flight_data_orbit(ctx) {
    const { res, scenario, sel, sim } = ctx;
    const lost = sim?.conditions?.commsDead ? 1 : res.data.lostFraction ?? 0;
    const recommended = !scenario.recommendedOrbits.length || scenario.recommendedOrbits.includes(sel.orbit?.id);
    return { met: lost <= DATA_LOSS_GOAL && recommended && !!sel.orbit, reason: `${pct(lost)} of data lost (max 10%); orbit ${recommended && sel.orbit ? 'is' : 'is not'} a recommended one.` };
  },
};

export function evaluateRoleGoals(state, sim = null) {
  const sel = getSelection(state);
  if (!sel.scenario) return [];
  const ctx = { res: computeResources(state), scenario: sel.scenario, sel, sim };
  return ROLES.map((r) => {
    const { met, reason } = (CHECKS[r.personalGoal.check] ?? (() => ({ met: false, reason: 'Unknown goal.' })))(ctx);
    return { roleId: r.id, icon: r.icon, name: r.name, text: r.personalGoal.text, met, reason };
  });
}

/** Roles that vote: in team mode the roles players hold; solo: nobody votes. */
export function votingRoles(state) {
  if (state.mode !== 'team') return [];
  return ROLES.filter((r) => state.players.some((p) => p.roleId === r.id)).map((r) => r.id);
}

/** Team launch rule: a strict majority of voting roles must say Go. Solo: always true. */
export function voteStatus(state) {
  const voters = votingRoles(state);
  const go = voters.filter((id) => state.votes[id] === 'go').length;
  const nogo = voters.filter((id) => state.votes[id] === 'nogo').length;
  const needed = Math.floor(voters.length / 2) + 1;
  return {
    voters: voters.length, go, nogo, needed,
    majority: voters.length === 0 || go >= needed,
    unanimous: voters.length > 0 && go === voters.length,
  };
}
