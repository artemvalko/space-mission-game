// goalChecklist(state) → chips for the "Mission Goal" strip — PURE.
// Each chip: { id, icon, label, status: 'todo'|'ok'|'bad', hint }
// 'todo' (neutral) until the player has made the choices that decide it.

import { TAG_INFO } from '../data/instruments.js';
import { computeResources, getSelection } from './resources.js';
import { money, months, num, years } from '../utils/format.js';

export function goalChecklist(state, res = computeResources(state)) {
  const sel = getSelection(state);
  const { scenario, instruments, orbit } = sel;
  if (!scenario) return [];
  const chips = [];
  const anyChoice = sel.componentList.length > 0 || instruments.length > 0 || sel.launcher;

  for (const tag of scenario.requiredTags) {
    const info = TAG_INFO[tag] ?? { icon: '🔧', plainName: tag };
    const has = instruments.some((i) => i.tags.includes(tag));
    chips.push({ id: `tag-${tag}`, icon: info.icon, label: info.plainName, status: has ? 'ok' : instruments.length ? 'bad' : 'todo', hint: `Your goal needs a ${info.plainName.toLowerCase()}.` });
  }
  if (!scenario.sandbox) {
    chips.push({
      id: 'money', icon: '💰', label: money(scenario.budgetM),
      status: !anyChoice ? 'todo' : res.budget.status === 'over' ? 'bad' : 'ok',
      hint: `Budget: spend at most ${money(scenario.budgetM)} (now ${money(res.budget.used)}).`,
    });
    chips.push({
      id: 'time', icon: '📅', label: months(scenario.deadlineMonths).replace(' mo', ' months'),
      status: !anyChoice ? 'todo' : res.time.status === 'over' ? 'bad' : 'ok',
      hint: `Be ready to launch within ${months(scenario.deadlineMonths)} (now ${months(res.time.used)}).`,
    });
  }
  if (scenario.minScience > 0) {
    chips.push({
      id: 'science', icon: '🔬', label: `${num(scenario.minScience)} science`,
      status: !instruments.length ? 'todo' : res.science.ok ? 'ok' : 'bad',
      hint: `Collect at least ${num(scenario.minScience)} science points per year (now ${num(res.science.value)}).`,
    });
  }
  chips.push({
    id: 'lifetime', icon: '⏳', label: years(scenario.minLifetimeYears).replace(' yr', ' years'),
    status: !orbit ? 'todo' : res.lifetime.ok ? 'ok' : 'bad',
    hint: `Keep working for at least ${years(scenario.minLifetimeYears)}.`,
  });
  return chips;
}
