// Role personal goals — PURE.
// evaluateRoleGoals(state, sim?) → [{ roleId, icon, name, text, met, reason }]
// Without a simulation (Final check) goals are judged on the design ("live"); with a finished
// simulation they are judged on what actually happened.

import { ROLES } from '../data/roles.js';
import { isCubeSat } from '../data/components.js';
import { computeResources, getSelection } from './resources.js';
import { validateDesign } from './validation.js';
import { evaluateObjectives } from './objectives.js';
import { money, months, pct } from '../utils/format.js';

export const MARGIN_GOAL = 0.10;     // engineer: mass & power margins

const CHECKS = {
  // Director: model budget + schedule + licensing/disposal ready.
  director_budget_schedule(ctx) {
    const { res, scenario, sim, sel } = ctx;
    const spent = res.budget.used + (sim?.summary.extraCostM ?? 0);
    const inBudget = spent <= scenario.budgetM + 1e-9;
    const range = scenario.deadlineMonths;
    const ready = range ? range[0] + (sim?.summary.delayMonths ?? 0) : null;
    const onTime = !range || ready <= range[1];
    const paperwork = sel.prep.licence && sel.prep.disposal;
    return { met: inBudget && onTime && paperwork, reason: `${money(spent)} of ${money(scenario.budgetM)}${res.budget.launchUnknown ? ' (launch RFQ not counted)' : ''}${range ? `; ready at month ${ready} of ${range[1]}` : ''}; licence ${sel.prep.licence ? 'done' : 'missing'}, disposal plan ${sel.prep.disposal ? 'done' : 'missing'}.` };
  },
  // Engineer: mass / power / thermal margins.
  engineer_margins(ctx) {
    const { res, sel } = ctx;
    const cube = isCubeSat(sel.components.structure);
    const massOk = res.mass.status !== 'unknown' && res.mass.available != null && (cube || !res.mass.limit ? 1 - res.mass.used / res.mass.available >= MARGIN_GOAL : res.mass.used <= res.mass.limit + 1e-9);
    const powerMargin = res.power.margin;
    const thermal = !!sel.components.thermal || sel.included.has('thermal');
    const met = massOk && powerMargin != null && powerMargin >= MARGIN_GOAL && thermal;
    const massText = res.mass.available == null ? 'unknown' : cube || !res.mass.limit ? pct(1 - res.mass.used / res.mass.available) : res.mass.used <= res.mass.limit ? 'within the 700 kg target' : 'over the target';
    return { met, reason: `Mass margin ${massText}, power margin ${powerMargin == null ? 'unknown' : pct(powerMargin)} (need 10%), thermal control ${thermal ? 'yes' : 'no'}.` };
  },
  // Scientist: mission performance KPIs.
  scientist_science(ctx) {
    const { res, state, sim } = ctx;
    if (sim) {
      const k = evaluateObjectives(state, sim, res).filter((o) => o.kpi);
      return { met: k.every((o) => o.met), reason: `${k.filter((o) => o.met).length} of ${k.length} mission KPIs met.` };
    }
    return { met: res.science.ok, reason: res.science.explanation };
  },
  // Flight dynamics: orbit + launch + link.
  flight_data_orbit(ctx) {
    const { res, scenario, sel, state } = ctx;
    // "Recommended" follows the chosen objective variant when it has an orbit preference.
    const orbitFit = sel.variant?.fit.find((f) => f.dim === 'orbit');
    const recommended = !!sel.orbit && (orbitFit ? orbitFit.map[sel.orbit.id] === 1 : scenario.recommendedOrbits.includes(sel.orbit.id));
    const issues = validateDesign(state, res);
    const launchOk = !!sel.launcher && !issues.some((i) => i.severity === 'error' && ['launcher_trajectory_compatible', 'launch_adapter_compatible'].includes(i.gate));
    const linkOk = res.data.status === 'ok';
    return { met: recommended && launchOk && linkOk, reason: `Orbit ${recommended ? 'recommended' : 'not the recommended one'}; rocket ${launchOk ? 'reaches it' : 'does not fit'}; link ${linkOk ? 'works' : 'broken or not chosen'}.` };
  },
};

export function evaluateRoleGoals(state, sim = null) {
  const sel = getSelection(state);
  if (!sel.scenario) return [];
  const ctx = { res: computeResources(state), scenario: sel.scenario, sel, sim, state };
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
