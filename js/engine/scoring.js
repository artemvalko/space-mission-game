// scoreMission(state, sim) → full mission score — PURE.
//
// Hard gates come first (engine/validation.js); the score only ranks designs.
// Weights: Mission performance 35%, Objectives met 25%, Resource efficiency 15%, Survivability 15%,
// Teamwork 10% (solo: the teamwork weight is shared out over the other four, proportionally),
// plus a small "Responsible disposal" bonus (+20). Total 0–1000, grade S/A/B/C/D/F.
// A physically valid but more expensive alternative is only "penalised" through its real
// resource consequences (budget, mass, power margins) — research §10.
// A NO-GO design that was simulated anyway is always a failed mission (grade F).
//
// Returns { total, grade, success, outcome, parts[], objectives[], personalGoals[], votes,
//           insights: { good[], bad[] }, tips[], stats }

import { computeResources, getSelection } from './resources.js';
import { evaluateObjectives, satelliteSuccess } from './objectives.js';
import { evaluateRoleGoals, voteStatus } from './roleGoals.js';
import { isCubeSat } from '../data/components.js';
import { getEvent } from '../data/events.js';
import { money, pct, kg, watts } from '../utils/format.js';

export const WEIGHTS = { science: 0.35, objectives: 0.25, efficiency: 0.15, survivability: 0.15, teamwork: 0.10 };
export const DISPOSAL_BONUS = 20;
export const GRADES = [['S', 900], ['A', 800], ['B', 650], ['C', 500], ['D', 350], ['F', 0]];

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** Weights for this mode (solo redistributes teamwork). Always sums to 1. */
export function weightsFor(mode) {
  if (mode === 'team') return { ...WEIGHTS };
  const rest = 1 - WEIGHTS.teamwork;
  const out = {};
  for (const [k, w] of Object.entries(WEIGHTS)) out[k] = k === 'teamwork' ? 0 : w / rest;
  return out;
}

/**
 * How good is a margin? 10–30% is best (1), ~0% is risky (0.3), over the limit is 0,
 * more than 50% spare is wasteful (0.5).
 */
export function marginQuality(m) {
  if (m == null || Number.isNaN(m)) return 0.5;
  if (m < 0) return 0;
  if (m < 0.1) return 0.3 + 7 * m;
  if (m <= 0.3) return 1;
  if (m <= 0.5) return 1 - (m - 0.3) * 2.5;
  return 0.5;
}

export function gradeFor(total, outcome) {
  const g = GRADES.find(([, min]) => total >= min)[0];
  return g === 'S' && outcome !== 'success' ? 'A' : g; // S only for a full success
}

export function scoreMission(state, sim) {
  const res = computeResources(state);
  const sel = getSelection(state);
  const { scenario } = sel;
  const s = sim.summary;
  const weights = weightsFor(state.mode);
  const objectives = evaluateObjectives(state, sim, res);
  const personalGoals = evaluateRoleGoals(state, sim);
  const votes = voteStatus(state);
  const flew = sim.reachedOrbit;

  // ── Mission performance: KPIs met + simulated service availability
  const kpis = objectives.filter((o) => o.kpi);
  const kpiShare = kpis.length ? kpis.filter((o) => o.met).length / kpis.length : 0;
  const performance = flew ? clamp01(kpiShare * 0.7 + (s.serviceFraction ?? 0) * 0.3) : 0;

  // ── Objectives (all, incl. budget / schedule / service period)
  const objMet = objectives.filter((o) => o.met).length;
  const objectivesScore = objectives.length ? objMet / objectives.length : 1;

  // ── Efficiency: model budget left + mass margin + power margin
  const spent = res.budget.used + (s.extraCostM ?? 0);
  const budgetLeft = (scenario.budgetM - spent) / scenario.budgetM;
  const cube = isCubeSat(sel.components.structure);
  const massMargin = res.mass.available ? 1 - res.mass.used / res.mass.available : -1;
  const massQ = cube || !res.mass.limit ? marginQuality(massMargin) : (res.mass.used <= res.mass.limit + 1e-9 ? 1 : 0);
  const powerMargin = res.power.margin ?? -1;
  const terms = [massQ, marginQuality(powerMargin)];
  if (!res.budget.launchUnknown) terms.push(marginQuality(budgetLeft)); // RFQ price: no penalty, no bonus
  const efficiency = terms.reduce((a, b) => a + b, 0) / terms.length;

  // ── Survivability: how long it worked, not lost, not weakened
  const lasted = flew ? clamp01(s.monthsOperated / Math.max(1, s.plannedMonths)) : 0;
  const survivability = flew
    ? clamp01(lasted * 0.6 + (sim.outcome === 'lost' ? 0 : 0.2) + (s.damage ? 0.1 : 0.2))
    : 0;

  // ── Teamwork: personal goals + unanimous Go
  const goalsMet = personalGoals.filter((g) => g.met).length;
  const teamwork = state.mode === 'team'
    ? clamp01(0.8 * (goalsMet / Math.max(1, personalGoals.length)) + (votes.unanimous ? 0.2 : 0))
    : 0;

  // ── Responsible disposal bonus (needs the plan — and thrusters + fuel where the orbit requires them)
  const needsProp = scenario.requiredBus.includes('propulsion');
  const disposalOk = flew && !sim.noGo && sel.prep.disposal && (!needsProp || (sel.components.propulsion && sel.components.propellant));

  const raw = { science: performance, objectives: objectivesScore, efficiency, survivability, teamwork };
  const WHY = {
    science: flew ? `${kpis.filter((o) => o.met).length} of ${kpis.length} mission KPIs met; simulated service ${pct(s.serviceFraction ?? 0)} of the planned time.` : 'The satellite never reached its orbit, so the mission delivered nothing.',
    objectives: `${objMet} of ${objectives.length} mission objectives met.`,
    efficiency: `Budget left ${res.budget.launchUnknown ? 'not comparable (launch RFQ)' : pct(budgetLeft)}, mass margin ${cube || !res.mass.limit ? pct(Math.max(massMargin, -1)) : res.mass.used <= res.mass.limit ? 'within the 700 kg target' : 'over the target'}, power margin ${pct(Math.max(powerMargin, -1))}. Best: 10–30% spare.`,
    survivability: flew ? `Worked ${pct(lasted)} of the planned time${sim.outcome === 'lost' ? '; the satellite was lost' : ''}${s.damage ? '; it was weakened by a risky choice' : ''}.` : 'It never reached orbit.',
    teamwork: state.mode === 'team' ? `${goalsMet} of ${personalGoals.length} personal goals met${votes.unanimous ? ' + unanimous Go bonus' : ''}.` : 'Solo game — this weight is shared by the other parts.',
  };
  const LABEL = { science: 'Mission performance', objectives: 'Objectives met', efficiency: 'Resource efficiency', survivability: 'Survivability', teamwork: 'Teamwork' };
  const parts = Object.keys(WEIGHTS).map((id) => ({
    id, label: LABEL[id], weight: weights[id], score: raw[id],
    max: Math.round(weights[id] * 1000), points: Math.round(raw[id] * weights[id] * 1000), why: WHY[id],
  })).filter((p) => p.weight > 0);
  parts.push({ id: 'disposal', label: 'Responsible disposal (bonus)', weight: 0, score: disposalOk ? 1 : 0, max: DISPOSAL_BONUS, points: disposalOk ? DISPOSAL_BONUS : 0, bonus: true,
    why: disposalOk ? 'A safe end-of-life plan (and the propulsion it needs) — no new space junk.' : 'No working disposal plan — the satellite could become space junk.' });
  let total = Math.max(0, Math.min(1000, parts.reduce((a, p) => a + p.points, 0)));
  if (sim.noGo) total = Math.min(total, 340); // a NO-GO design is a failed mission

  const stats = { spent, budgetLeft, massMargin, powerMargin, kpiShare, serviceFraction: s.serviceFraction ?? 0, lostFraction: res.data.lostFraction ?? 0, satelliteSuccess: satelliteSuccess(objectives) };
  return {
    total,
    grade: sim.noGo ? 'F' : gradeFor(total, sim.outcome),
    success: sim.outcome === 'success' && !sim.noGo,
    outcome: sim.outcome,
    noGo: !!sim.noGo,
    parts,
    objectives,
    personalGoals,
    votes,
    insights: insights(sim, res, sel, stats, objectives),
    tips: tips(parts, objectives, res, stats, sim),
    stats,
  };
}

/** "What went well" / "What hurt your mission": short sentences with numbers. */
function insights(sim, res, sel, st, objectives) {
  const good = [];
  const bad = [];
  const { scenario } = sel;
  if (sim.noGo) bad.push({ w: 2, text: 'The design was NO-GO: a real mission never launches like this — it was only simulated to show what would happen.' });
  if (st.budgetLeft < 0) bad.push({ w: 1, text: `Over the model budget by ${money(-st.budgetLeft * scenario.budgetM)} (spent ${money(st.spent)} of ${money(scenario.budgetM)}).` });
  else if (!res.budget.launchUnknown) good.push({ w: 0.4, text: `Spent ${money(st.spent)} of ${money(scenario.budgetM)} — ${money(scenario.budgetM - st.spent)} of reserve left.` });
  if (res.power.margin != null) {
    if (st.powerMargin < 0) bad.push({ w: 0.9, text: `Power deficit: the mission needs ${watts(res.power.used)} but the array gives ${watts(res.power.available)} on average.` });
    else if (st.powerMargin < 0.1) bad.push({ w: 0.3, text: `Only ${pct(st.powerMargin)} power to spare.` });
    else good.push({ w: 0.3, text: `Power margin ${pct(st.powerMargin)} (${watts(res.power.used)} needed, ${res.power.available.toFixed(2)} W available).` });
  }
  if (res.mass.available != null) {
    if (res.mass.used > res.mass.available) bad.push({ w: 1, text: `${kg(res.mass.used - res.mass.available)} over the mass limit (${kg(res.mass.used)} vs ${kg(res.mass.available)}).` });
    else good.push({ w: 0.25, text: `Mass ${kg(res.mass.used)} of ${kg(res.mass.available)} allowed.` });
  }
  if (sim.reachedOrbit) {
    const kp = objectives.filter((o) => o.kpi);
    const met = kp.filter((o) => o.met).length;
    if (met === kp.length) good.push({ w: 0.8, text: `All ${kp.length} mission KPIs met (simulated service ${pct(st.serviceFraction)}).` });
    else bad.push({ w: 0.9, text: `${kp.length - met} of ${kp.length} mission KPIs missed: ${kp.filter((o) => !o.met).map((o) => o.label.toLowerCase()).join(', ')}.` });
    const s = sim.summary;
    if (s.hardwareFailures > 0) bad.push({ w: 0.2 * s.hardwareFailures, text: `${s.hardwareFailures} simulated hardware fault${s.hardwareFailures > 1 ? 's' : ''} during the mission.` });
    else if (s.eventsSurvived) good.push({ w: 0.3, text: `Handled ${s.eventsSurvived} simulated event${s.eventsSurvived > 1 ? 's' : ''} without a hardware fault.` });
  }
  return {
    good: good.sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.text),
    bad: bad.sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.text),
  };
}

/** 2–3 concrete suggestions from the biggest losses. */
function tips(parts, objectives, res, st, sim) {
  const out = [];
  if (sim.noGo) out.push('Fix every ⛔ hard gate on the Final check before launching — each one tells you which card fixes it.');
  const byLoss = [...parts].filter((p) => !p.bonus).sort((a, b) => (b.max - b.points) - (a.max - a.points));
  for (const p of byLoss) {
    if (out.length >= 3 || p.points >= p.max * 0.9) continue;
    if (p.id === 'science') {
      const miss = objectives.find((o) => o.kpi && !o.met);
      out.push(miss ? `Meet "${miss.label}": ${miss.why}` : 'Answer events so the service keeps running (backup modes cost performance).');
    } else if (p.id === 'objectives') {
      const miss = objectives.find((o) => !o.met && !o.kpi);
      if (miss?.id === 'budget') out.push('Stay inside the model budget: check the launch line and the parts you added.');
      else if (miss?.id === 'deadline') out.push('Keep the schedule: a launch delay can push you past the planning window.');
      else if (miss?.id === 'lifetime') out.push('Last the whole service period: do not ignore faults — a weakened satellite can be lost.');
      else if (miss) out.push(`Meet "${miss.label}": ${miss.why}`);
    } else if (p.id === 'efficiency') {
      if (st.powerMargin < 0.1) out.push('Keep 10–30% spare power.');
      else if (st.budgetLeft < 0.05) out.push('Keep some project reserve for surprises.');
      else out.push('Aim for 10–30% spare money, mass and power — not too tight, not wasteful.');
    } else if (p.id === 'survivability') {
      out.push('Do not ignore faults or fly through storms: a second hit can end the mission.');
    } else if (p.id === 'teamwork') {
      out.push('Check every role\'s personal goal on the Final check before you vote Go.');
    }
  }
  if (!parts.find((p) => p.id === 'disposal')?.points) out.push('Add a disposal plan on the Launch prep step (+20 points for responsible disposal).');
  return [...new Set(out)].slice(0, 3);
}

/** Event log entries with the decision and its consequences (for the Results screen). */
export function eventLog(sim) {
  return sim.events.map((e) => {
    const ev = getEvent(e.eventId);
    const c = ev.choices[e.choiceIndex];
    return { month: e.month, eventId: e.eventId, title: ev.title, choice: c.label, explanation: c.explanation, effects: c.effects, itemId: e.itemId ?? null, simulated: true };
  });
}
