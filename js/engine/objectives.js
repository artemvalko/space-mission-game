// evaluateObjectives(state, sim) → [{ id, icon, label, met, why }]  — PURE.
// The mission's pass/fail objectives, judged on what actually happened in the simulation.
// Used by simulation (to classify success vs partial), scoring and the Results screen.

import { TAG_INFO } from '../data/instruments.js';
import { computeResources, getSelection } from './resources.js';
import { relaunchCostM } from './costs.js';
import { money, months, num, years } from '../utils/format.js';

export function evaluateObjectives(state, sim, res = computeResources(state)) {
  const { scenario, instruments } = getSelection(state);
  if (!scenario) return [];
  const out = [];
  const s = sim.summary;
  const flew = sim.reachedOrbit;

  if (scenario.minScience > 0) {
    const need = scenario.minScience * scenario.minLifetimeYears;
    out.push({
      id: 'science', icon: '🔬', label: 'Science target',
      met: flew && s.scienceCollected >= need,
      why: `Collected ${num(s.scienceCollected)} of the ${num(need)} science points needed (${num(scenario.minScience)} per year for ${years(scenario.minLifetimeYears)}).`,
    });
  }
  out.push({
    id: 'lifetime', icon: '⏳', label: 'Mission lifetime',
    met: flew && s.monthsOperated >= scenario.minLifetimeYears * 12,
    why: `Worked for ${months(s.monthsOperated)}; needed ${months(scenario.minLifetimeYears * 12)}.`,
  });
  if (!scenario.sandbox) {
    const ready = res.time.used + s.delayMonths;
    out.push({
      id: 'deadline', icon: '📅', label: 'Ready on time',
      met: ready <= scenario.deadlineMonths,
      why: `Ready to launch after ${months(ready)}; the deadline was ${months(scenario.deadlineMonths)}.`,
    });
    const spent = res.budget.used + s.extraCostM;
    out.push({
      id: 'budget', icon: '💰', label: 'On budget',
      met: spent <= scenario.budgetM,
      why: `Spent ${money(spent)} of ${money(scenario.budgetM)}${s.extraCostM ? ` (incl. ${money(s.extraCostM)} of surprises${s.relaunches ? ' and relaunches' : ''})` : ''}.`,
    });
  }
  for (const tag of scenario.requiredTags) {
    const info = TAG_INFO[tag] ?? { icon: '🔧', plainName: tag };
    const has = instruments.some((i) => i.tags.includes(tag));
    out.push({ id: `tag-${tag}`, icon: info.icon, label: `Carried a ${info.plainName.toLowerCase()}`, met: has, why: has ? `Your ${info.plainName.toLowerCase()} did the job.` : `The goal needed a ${info.plainName.toLowerCase()}.` });
  }
  return out;
}

export { relaunchCostM };
