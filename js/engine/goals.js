// goalChecklist(state) → chips for the "Mission Goal" strip — PURE.
// Each chip: { id, icon, label, status: 'todo'|'ok'|'bad', hint }
// 'todo' (neutral) until the player has made the choices that decide it.

import { ROLE_INFO } from '../data/instruments.js';
import { computeResources, getSelection } from './resources.js';
import { money } from '../utils/format.js';

export function goalChecklist(state, res = computeResources(state)) {
  const sel = getSelection(state);
  const { scenario, instruments, orbit } = sel;
  if (!scenario) return [];
  const chips = [];
  const roles = new Set(instruments.map((i) => i.role));
  // Only the player's own choices count (Easy kits fill parts automatically).
  const anyChoice = !!sel.components.structure || instruments.length > 0 || !!sel.launcher;

  for (const role of scenario.requiredRoles) {
    const info = ROLE_INFO[role];
    chips.push({ id: `role-${role}`, icon: info.icon, label: info.plainName, status: roles.has(role) ? 'ok' : instruments.length ? 'bad' : 'todo', hint: `The mission needs the ${info.plainName.toLowerCase()}.` });
  }
  chips.push({
    id: 'orbit', icon: 'globe', label: orbit ? orbit.plainName.split(' (')[0] : 'Orbit',
    status: !orbit ? 'todo' : scenario.allowedOrbits.includes(orbit.id) ? 'ok' : 'bad',
    hint: 'The orbit must fit the service.',
  });
  chips.push({
    id: 'money', icon: 'money', label: money(scenario.budgetM),
    status: !anyChoice ? 'todo' : res.budget.status === 'over' ? 'bad' : 'ok',
    hint: `Model budget: at most ${money(scenario.budgetM)} (now ${money(res.budget.used)}).`,
  });
  if (scenario.deadlineMonths) {
    chips.push({ id: 'time', icon: 'calendar', label: `${scenario.deadlineMonths[0]}–${scenario.deadlineMonths[1]} mo`, status: anyChoice ? 'ok' : 'todo', hint: `Planning window ${scenario.deadlineMonths[0]}–${scenario.deadlineMonths[1]} months.` });
  }
  if (scenario.minMonths) {
    chips.push({ id: 'lifetime', icon: 'hourglass', label: `≥${scenario.minMonths} mo`, status: 'todo', hint: `Keep working for at least ${scenario.minMonths} months.` });
  }
  const prepDone = sel.prep.tests && sel.prep.licence && sel.prep.disposal;
  chips.push({ id: 'prep', icon: 'document', label: 'Tests · licence · disposal', status: prepDone ? 'ok' : 'todo', hint: 'Launch prep checklist: tests, frequency licence and a disposal plan.' });
  return chips;
}
