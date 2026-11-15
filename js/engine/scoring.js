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
import { evaluateObjectives, satelliteSuccess, variantFit } from './objectives.js';
import { evaluateRoleGoals, voteStatus } from './roleGoals.js';
import { isCubeSat } from '../data/components.js';
import { getEvent } from '../data/events.js';
import { money, pct, kg, watts } from '../utils/format.js';

export const WEIGHTS = { science: 0.35, objectives: 0.25, efficiency: 0.15, survivability: 0.15, teamwork: 0.10 };
export const DISPOSAL_BONUS = 40; // Sustainability: debris 15 + atmosphere 15 + ground 10 (no option gets all 40)
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
  // The chosen objective variant scales mission performance only (a less suitable build is not a failure).
  const fit = variantFit(state);
  const performance = flew ? clamp01((kpiShare * 0.7 + (s.serviceFraction ?? 0) * 0.3) * (0.6 + 0.4 * fit.value)) : 0;

  // ── Objectives (all, incl. budget / schedule / service period)
  const objMet = objectives.filter((o) => o.met).length;
  const objectivesScore = objectives.length ? objMet / objectives.length : 1;

  // ── Efficiency: model budget left + mass margin + power margin
  const spent = res.budget.used + (s.extraCostM ?? 0);
  const budgetLeft = (scenario.budgetM - spent) / scenario.budgetM;
  const cube = isCubeSat(sel.components.structure);
  const massMargin = res.mass.available ? 1 - res.mass.used / res.mass.available : -1;
  const massQ = res.mass.reference && res.mass.available == null ? 0.5 // flown satellite, no published limit: unknown
    : cube || !res.mass.limit ? marginQuality(massMargin) : (res.mass.used <= res.mass.limit + 1e-9 ? 1 : 0);
  const powerMargin = res.power.margin ?? (res.power.reference ? null : -1);
  const terms = [massQ, marginQuality(powerMargin)];
  if (!res.budget.uncertain) terms.push(marginQuality(budgetLeft)); // NOT PUBLIC price: score known items only — no penalty, no bonus
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

  // ── Sustainability (re-uses the old disposal bonus slot): the planet-impact meters of the chosen
  //    retirement — debris 15, atmosphere 15, ground 10. No option scores 40: every choice is a compromise.
  const planet = res.planet;
  const disposalOk = flew && !sim.noGo && sel.prep.disposal && planet.valid;
  const sustain = disposalOk ? planet.score : 0;

  const raw = { science: performance, objectives: objectivesScore, efficiency, survivability, teamwork };
  const WHY = {
    science: flew ? `${kpis.filter((o) => o.met).length} of ${kpis.length} mission KPIs met; simulated service ${pct(s.serviceFraction ?? 0)} of the planned time${fit.variant ? `; fit for "${fit.variant.label}" ${pct(fit.value)}` : ''}.` : 'The satellite never reached its orbit, so the mission delivered nothing.',
    objectives: `${objMet} of ${objectives.length} mission objectives met.`,
    efficiency: `Budget left ${res.budget.uncertain ? 'uncertain (prices not public — real engineers would request a quote)' : pct(budgetLeft)}, mass margin ${cube || !res.mass.limit ? pct(Math.max(massMargin, -1)) : res.mass.used <= res.mass.limit ? 'within the 700 kg target' : 'over the target'}, power margin ${pct(Math.max(powerMargin, -1))}. Best: 10–30% spare.`,
    survivability: flew ? `Worked ${pct(lasted)} of the planned time${sim.outcome === 'lost' ? '; the satellite was lost' : ''}${s.damage ? '; it was weakened by a risky choice' : ''}.` : 'It never reached orbit.',
    teamwork: state.mode === 'team' ? `${goalsMet} of ${personalGoals.length} personal goals met${votes.unanimous ? ' + unanimous Go bonus' : ''}.` : 'Solo game — this weight is shared by the other parts.',
  };
  const LABEL = { science: 'Mission performance', objectives: 'Objectives met', efficiency: 'Resource efficiency', survivability: 'Survivability', teamwork: 'Teamwork' };
  const parts = Object.keys(WEIGHTS).map((id) => ({
    id, label: LABEL[id], weight: weights[id], score: raw[id],
    max: Math.round(weights[id] * 1000), points: Math.round(raw[id] * weights[id] * 1000), why: WHY[id],
  })).filter((p) => p.weight > 0);
  parts.push({ id: 'disposal', label: 'Sustainability', weight: 0, score: sustain / DISPOSAL_BONUS, max: DISPOSAL_BONUS, points: sustain, bonus: true, best: planet.best,
    why: disposalOk ? `${planet.explanation} Debris ${planet.meters.debris}/15 · atmosphere ${planet.meters.atmosphere}/15 · ground ${planet.meters.ground}/10. Best possible for your orbit: ${planet.best}/40.`
      : `No valid retirement plan. Best possible for your orbit: ${planet.best}/40.` });
  let total = Math.max(0, Math.min(1000, parts.reduce((a, p) => a + p.points, 0)));
  if (sim.noGo) total = Math.min(total, 340); // a NO-GO design is a failed mission

  const stats = { planetScore: sustain, planetBest: planet.best, atmosphereKg: planet.atmosphereKg, retire: planet.strategyId, spent, budgetLeft, massMargin, powerMargin, kpiShare, serviceFraction: s.serviceFraction ?? 0, lostFraction: res.data.lostFraction ?? 0, satelliteSuccess: satelliteSuccess(objectives),
    variantFit: fit.value, variantId: fit.variant?.id ?? null, budgetUncertain: !!res.budget.uncertain, unknownPrices: res.budget.unknownItems ?? [] };
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
  if (sim.noGo) bad.push({ w: 2, text: 'NO-GO design: only simulated.' });
  if (st.budgetLeft < 0) bad.push({ w: 1, text: `${money(-st.budgetLeft * scenario.budgetM)} over budget.` });
  else if (res.budget.uncertain) bad.push({ w: 0.35, text: `Budget uncertain: ${st.unknownPrices.length} price${st.unknownPrices.length > 1 ? 's' : ''} not public (RFQ).` });
  else good.push({ w: 0.4, text: `${money(scenario.budgetM - st.spent)} reserve left.` });
  if (res.power.margin != null) {
    if (st.powerMargin < 0) bad.push({ w: 0.9, text: `Power short: ${watts(res.power.used)} needed, ${watts(res.power.available)} made.` });
    else if (st.powerMargin < 0.1) bad.push({ w: 0.3, text: `Only ${pct(st.powerMargin)} spare power.` });
    else good.push({ w: 0.3, text: `Power margin ${pct(st.powerMargin)}.` });
  }
  if (res.mass.available != null) {
    if (res.mass.used > res.mass.available) bad.push({ w: 1, text: `${kg(res.mass.used - res.mass.available)} over the mass limit.` });
    else good.push({ w: 0.25, text: `Mass ${kg(res.mass.used)} of ${kg(res.mass.available)}.` });
  }
  if (sim.reachedOrbit && !sim.noGo && res.planet.valid) {
    const p = res.planet;
    good.push({ w: 0.5, text: p.strategyId === 'disp_leave_in_orbit' ? 'Retired to a disposal orbit: clean air, but it stays in space.'
      : `Your satellite burned up: no junk, ≈${p.atmosphereKg.toFixed(1)} kg aluminium oxide (science estimate).` });
  }
  if (sim.reachedOrbit) {
    const kp = objectives.filter((o) => o.kpi);
    const met = kp.filter((o) => o.met).length;
    if (met === kp.length) good.push({ w: 0.8, text: `All ${kp.length} KPIs met.` });
    else bad.push({ w: 0.9, text: `${kp.length - met} KPI${kp.length - met > 1 ? 's' : ''} missed: ${kp.find((o) => !o.met).label.toLowerCase()}${kp.length - met > 1 ? '…' : '.'}` });
    const s = sim.summary;
    if (s.hardwareFailures > 0) bad.push({ w: 0.2 * s.hardwareFailures, text: `${s.hardwareFailures} simulated fault${s.hardwareFailures > 1 ? 's' : ''}.` });
    else if (s.eventsSurvived) good.push({ w: 0.3, text: `${s.eventsSurvived} simulated event${s.eventsSurvived > 1 ? 's' : ''} handled.` });
  }
  return {
    good: good.sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.text),
    bad: bad.sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.text),
  };
}

/** 2–3 concrete suggestions from the biggest losses. */
function tips(parts, objectives, res, st, sim) {
  const out = [];
  if (sim.noGo) out.push('Fix every ⛔ gate on the Final check first.');
  const byLoss = [...parts].filter((p) => !p.bonus).sort((a, b) => (b.max - b.points) - (a.max - a.points));
  for (const p of byLoss) {
    if (out.length >= 3 || p.points >= p.max * 0.9) continue;
    if (p.id === 'science') {
      const miss = objectives.find((o) => o.kpi && !o.met);
      out.push(miss ? `Fix: ${miss.label.toLowerCase()}.` : 'Pick event answers that keep the service running.');
    } else if (p.id === 'objectives') {
      const miss = objectives.find((o) => !o.met && !o.kpi);
      if (miss?.id === 'budget') out.push('Cut cost: check the launch line.');
      else if (miss?.id === 'deadline') out.push('Avoid launch delays.');
      else if (miss?.id === 'lifetime') out.push('Don\'t ignore faults.');
      else if (miss) out.push(`Fix: ${miss.label.toLowerCase()}.`);
    } else if (p.id === 'efficiency') {
      if (st.powerMargin < 0.1) out.push('Keep 10–30% spare power.');
      else if (st.budgetLeft < 0.05) out.push('Keep some reserve.');
      else out.push('Aim for 10–30% spare money, mass, power.');
    } else if (p.id === 'survivability') {
      out.push('Don\'t ignore faults or storms.');
    } else if (p.id === 'teamwork') {
      out.push('Check role goals before voting Go.');
    }
  }
  if (!parts.find((p) => p.id === 'disposal')?.points) out.push('Choose a valid retirement plan: up to +40 points.');
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
