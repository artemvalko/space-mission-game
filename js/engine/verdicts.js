// missionVerdicts(state, sim?) — three INDEPENDENT verdicts (CLARITY P0.1). PURE.
//   engineering: can it fly?            GO | CONDITIONAL (something unverified) | NO-GO | TODO
//   objective:   did it meet THIS goal? MET | PARTLY | NOT MET | TODO   (dependency matrix + simulated KPIs)
//   program:     funded?                FUNDED | ESTIMATED | UNCERTAIN | OVER   (+ responsible disposal)
// A physically valid build for the wrong goal = engineering GO, objective NOT MET, with the reason.
// Also: the top 3 reasons (with numbers) and 1–2 fixes for the Results screen.

import { computeResources, getSelection } from './resources.js';
import { validateDesign, engineeringVerdict } from './validation.js';
import { evaluateDependencies, itemName } from './dependencies.js';
import { evaluateObjectives, satelliteSuccess } from './objectives.js';
import { money } from '../utils/format.js';

const PROGRAM = { funded: 'FUNDED', estimated: 'ESTIMATED', uncertain: 'UNCERTAIN', over: 'OVER' };
const OBJECTIVE = { met: 'MET', partly: 'PARTLY', not_met: 'NOT MET', todo: 'TODO' };

export function missionVerdicts(state, sim = null, res = computeResources(state)) {
  const sel = getSelection(state);
  const scenario = sel.scenario;
  const issues = validateDesign(state, res);
  const eng = engineeringVerdict(issues);
  const engineering = sim?.noGo ? 'NO-GO' : eng.verdict;

  // ── Objective: the matrix says whether the design CAN meet the goal; the simulation says whether it DID.
  const deps = evaluateDependencies(sel);
  let objective = OBJECTIVE[deps.verdict];
  const objReasons = deps.reasons.map((text) => ({ text, w: 2 }));
  const fixes = [];
  for (const r of deps.goal.filter((x) => x.result === 'missing' || x.result === 'wrong' || x.result === 'partly')) {
    if (r.satisfiedBy.length) fixes.push(`Choose ${r.satisfiedBy.slice(0, 2).map(itemName).join(' or ')}.`);
  }
  if (sim?.complete) {
    const objs = evaluateObjectives(state, sim, res);
    const kpis = objs.filter((o) => o.kpi);
    const missed = kpis.filter((o) => !o.met);
    if (sim.noGo || !sim.reachedOrbit) {
      objective = 'NOT MET';
      objReasons.unshift({ text: sim.noGo ? 'NO-GO design: it was only simulated.' : 'It never reached its orbit.', w: 3 });
    } else if (objective === 'MET' && !satelliteSuccess(objs)) {
      objective = 'PARTLY';
      objReasons.push({ text: `${missed.length} of ${kpis.length} mission KPIs missed (simulated): ${missed[0].label.toLowerCase()}.`, w: 1.5 });
    }
  }

  // ── Program: money + responsible end of life
  const b = res.budget;
  const spent = b.used + (sim?.summary?.extraCostM ?? 0);
  let program = PROGRAM[b.program] ?? 'TODO';
  if (scenario && spent > scenario.budgetM + 1e-9) program = 'OVER';
  const disposal = res.planet.valid ? 'responsible' : res.planet.strategyId ? 'invalid' : 'none';
  const progReasons = [];
  if (program === 'OVER') progReasons.push({ text: `${money(spent - scenario.budgetM)} over the ${money(scenario.budgetM)} model budget.`, w: 1.8 });
  else if (program === 'UNCERTAIN') progReasons.push({ text: `${b.unknownItems.length} price${b.unknownItems.length > 1 ? 's' : ''} not public (${b.unknownItems.slice(0, 2).join(', ')}): a real team asks for quotes.`, w: 1 });
  else if (program === 'ESTIMATED') progReasons.push({ text: `${b.estimatedItems.length} rough price estimate${b.estimatedItems.length > 1 ? 's' : ''} (≈ ${money(b.estimatedItems.reduce((a, e) => a + e.value, 0))}), copied from same-role parts.`, w: 0.8 });
  else if (program === 'FUNDED' && scenario) progReasons.push({ text: `${money(scenario.budgetM - spent)} reserve left of ${money(scenario.budgetM)}.`, w: 0.3 });
  if (disposal !== 'responsible') progReasons.push({ text: res.planet.whyNot || 'No valid retirement plan.', w: 1.2 });
  if (program === 'OVER') fixes.push('Cut cost: check the launch line.');

  // ── Engineering reasons
  const engReasons = [];
  if (engineering === 'NO-GO') {
    const e = eng.errors[0];
    if (e) { engReasons.push({ text: e.message, w: 3 }); if (e.fix) fixes.unshift(e.fix); }
  } else if (engineering === 'CONDITIONAL') {
    engReasons.push({ text: `${eng.unverified.length} check${eng.unverified.length > 1 ? 's' : ''} unverified: ${eng.unverified[0].message}`, w: 0.9 });
  }

  const reasons = [...engReasons, ...objReasons, ...progReasons].sort((a, b2) => b2.w - a.w).slice(0, 3).map((r) => r.text);
  return {
    engineering, objective, program, disposal,
    unverified: eng.unverified.map((i) => i.message),
    notes: eng.notes.map((i) => i.message),
    goal: sel.variant ? { id: sel.variant.id, label: sel.variant.label } : null,
    limits: deps.limits,
    reasons,
    fixes: [...new Set(fixes)].slice(0, 2),
  };
}

/** The three Results lines (question + verdict word). */
export const VERDICT_QUESTIONS = { engineering: 'Could it fly?', objective: 'Did it meet the goal?', program: 'Affordable & responsible?' };
/** Tone of a verdict word: ok | tight | bad. */
export function verdictTone(word) {
  if (['GO', 'MET', 'FUNDED'].includes(word)) return 'ok';
  if (['CONDITIONAL', 'CONDITIONAL GO', 'PARTLY', 'ESTIMATED', 'UNCERTAIN', 'TODO'].includes(word)) return 'tight';
  return 'bad';
}
