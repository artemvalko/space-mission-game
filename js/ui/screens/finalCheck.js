// Step 9 — Final check (Point Design + Design Review): the satellite, goal checklist,
// Flight Director report, team votes and the big LAUNCH button.

import { mount, h } from '../dom.js';
import { renderSatellite } from '../satellite.js';
import { ROLES, NO_GO_REASONS, getNoGoReason } from '../../data/roles.js';
import { evaluateRoleGoals, voteStatus } from '../../engine/roleGoals.js';
import { rerender } from '../view.js';
import { computeResources } from '../../engine/resources.js';
import { validateDesign, canLaunch, gateStatus } from '../../engine/validation.js';
import { goalChecklist } from '../../engine/goals.js';
import { getScenario } from '../../data/scenarios.js';
import { dataBadge } from '../card.js';
import { money } from '../../utils/format.js';
import { castVote, runSimulation, goToScreen } from '../../state/actions.js';
import { newSeed } from '../../utils/random.js';
import { getStep } from '../steps.js';

const SEV = { error: { icon: '⛔', cls: 'bad' }, warning: { icon: '⚠️', cls: 'bad' }, caution: { icon: '◐', cls: 'tight' }, todo: { icon: '○', cls: 'todo' } };

/** Hard-gate list (research §8.5): each failed gate → (a) broken requirement, (b) fixing card, (c) alternative. */
function gatesPanel(issues, dispatch) {
  const gates = gateStatus(issues);
  return h('ul', { class: 'gate-list' }, gates.map((g) => h('li', { class: g.status }, [
    h('strong', {}, `${g.status === 'pass' ? '✓' : g.status === 'fail' ? '⛔' : '○'} ${g.label}`),
    ...g.issues.map((i) => h('div', { class: 'gate-detail' }, [
      h('div', {}, i.message),
      i.severity === 'error' && i.why && h('div', { class: 'muted' }, ['(a) Requirement: ', i.why]),
      i.severity === 'error' && i.fix && h('div', {}, ['(b) Fix: ', i.fix, ' ', i.step && h('button', { class: 'btn btn-small', type: 'button', onClick: () => dispatch(goToScreen(i.step)) }, `${getStep(i.step).label} →`)]),
      i.severity === 'error' && h('div', { class: 'muted' }, ['(c) Another correct architecture? ', i.alternative ?? 'Not for this mission — fix the design.']),
      i.severity === 'todo' && i.step && h('button', { class: 'btn btn-small', type: 'button', onClick: () => dispatch(goToScreen(i.step)) }, `Go: ${getStep(i.step).label} →`),
    ])),
  ])));
}

function report(issues, dispatch) {
  const shown = issues.filter((i) => ['warning', 'caution'].includes(i.severity) || (i.severity === 'error' && !i.gate));
  if (!shown.length) return null;
  return h('ul', { class: 'report' }, shown.map((i) => h('li', { class: `report-${SEV[i.severity].cls}` }, [
    h('span', { class: 'report-icon', 'aria-hidden': 'true' }, SEV[i.severity].icon),
    h('span', { class: 'report-text' }, i.message),
    i.step && h('button', { class: 'btn btn-small', type: 'button', onClick: () => dispatch(goToScreen(i.step)) }, `Fix: ${getStep(i.step).label} →`),
  ])));
}

/** Full cost breakdown: hardware is only one line (research §3.5, §4.6, §5.5). */
export function costTable(res, scenario) {
  const b = res.budget;
  return h('table', { class: 'cost-table' }, [
    h('thead', {}, h('tr', {}, [h('th', {}, 'Budget line'), h('th', {}, ''), h('th', { class: 'num' }, '$M')])),
    h('tbody', {}, [
      ...b.lines.map((l) => h('tr', {}, [h('td', {}, [l.label, l.note ? h('span', { class: 'muted small' }, ` — ${l.note}`) : '']), h('td', {}, dataBadge(l.dataKind)), h('td', { class: 'num' }, l.value == null ? 'RFQ' : money(l.value))])),
      h('tr', {}, [h('td', {}, 'Project reserve left'), h('td', {}, dataBadge('model')), h('td', { class: ['num', b.reserveLeft < 0 && 'error-text'] }, money(b.reserveLeft ?? 0))]),
      h('tr', { class: 'total' }, [h('td', {}, 'Model budget'), h('td', {}, dataBadge('model')), h('td', { class: 'num' }, money(scenario.budgetM))]),
    ]),
  ]);
}

let pickingReasonFor = null; // view-only: role currently choosing a No-Go reason
let exploded = false;          // view-only: exploded view of the satellite

function roleGoals(state) {
  const goals = evaluateRoleGoals(state);
  const owner = (roleId) => state.players.filter((p) => p.roleId === roleId).map((p) => p.name).join(' & ');
  return h('div', { class: 'panel' }, [
    h('h2', {}, state.mode === 'team' ? '🎯 Personal goals (live)' : '🎩 Role goals (live) — you wear every hat'),
    h('ul', { class: 'checklist' }, goals.map((g) => h('li', { class: g.met ? 'ok' : 'bad' }, [
      h('strong', {}, `${g.met ? '✓' : '✗'} ${g.icon} ${g.name}${state.mode === 'team' && owner(g.roleId) ? ` — ${owner(g.roleId)}` : ''}`),
      h('div', { class: 'small' }, g.text),
      h('div', { class: 'muted small' }, g.reason),
    ]))),
  ]);
}

function votes(state, dispatch) {
  if (state.mode !== 'team') return null;
  const roles = ROLES.filter((r) => state.players.some((p) => p.roleId === r.id));
  const vs = voteStatus(state);
  return h('div', { class: 'panel' }, [
    h('h2', {}, '🗳️ Team vote: Go or No-Go?'),
    h('p', { class: 'muted small' }, `Launch needs a majority: ${vs.needed} of ${vs.voters} Go. Now: ${vs.go} Go, ${vs.nogo} No-Go.${vs.unanimous ? ' Unanimous — teamwork bonus!' : ''}`),
    h('div', { class: 'votes' }, roles.map((r) => {
      const v = state.votes[r.id];
      const names = state.players.filter((p) => p.roleId === r.id).map((p) => p.name).join(' & ');
      const reason = getNoGoReason(state.voteReasons[r.id]);
      return h('div', { class: ['vote', v && `vote-${v}`] }, [
        h('div', { class: 'vote-who' }, `${r.icon} ${names}`),
        h('div', { class: 'vote-role muted small' }, r.name),
        h('div', { class: 'button-row' }, [
          h('button', { class: ['btn', 'btn-small', v === 'go' && 'btn-go'], type: 'button', key: `vote-go-${r.id}`, onClick: () => { pickingReasonFor = null; dispatch(castVote(r.id, 'go')); } }, 'Go'),
          h('button', { class: ['btn', 'btn-small', v === 'nogo' && 'btn-nogo'], type: 'button', key: `vote-nogo-${r.id}`, onClick: () => { pickingReasonFor = r.id; rerender(); } }, 'No-Go'),
        ]),
        reason && h('div', { class: 'vote-reason' }, `“${reason.text}”`),
        pickingReasonFor === r.id && h('div', { class: 'reason-picker' }, [
          h('div', { class: 'small muted' }, 'Why No-Go? (everyone will see it)'),
          ...NO_GO_REASONS.map((x) => h('button', { class: 'btn btn-small', type: 'button', key: `reason-${r.id}-${x.id}`, onClick: () => { pickingReasonFor = null; dispatch(castVote(r.id, 'nogo', x.id)); } }, x.text)),
        ]),
      ]);
    })),
  ]);
}

export function render(container, state, dispatch) {
  const res = computeResources(state);
  const issues = validateDesign(state, res);
  const vs = voteStatus(state);
  const go = canLaunch(issues);
  const ready = go && vs.majority;
  const chips = goalChecklist(state, res);
  const scenario = getScenario(state.scenarioId);
  const todos = issues.filter((i) => i.severity === 'todo' && i.step !== 'launchPrep');
  const canSimulate = !go && todos.length === 0;

  mount(container,
    h('div', { class: 'final-grid' }, [
      h('div', { class: 'panel final-sat' }, [
        (() => {
          const svg = renderSatellite(state, { glow: false, exploded });
          if (exploded) requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('go')));
          return svg;
        })(),
        h('button', { class: 'btn btn-small', type: 'button', key: 'explode', 'aria-pressed': exploded ? 'true' : 'false', onClick: () => { exploded = !exploded; rerender(); } }, exploded ? '🧩 Put it back together' : '💥 Exploded view'),
        h('ul', { class: 'goal-list' }, chips.map((c) => h('li', { class: `goal-${c.status}` }, [
          h('span', { 'aria-hidden': 'true' }, c.status === 'ok' ? '✓' : c.status === 'bad' ? '✗' : '○'), ` ${c.icon} ${c.hint}`,
        ]))),
      ]),
      h('div', { class: 'panel' }, [
        h('h2', {}, `🧑‍🚀 Flight Readiness Review: ${go ? 'GO ✓' : 'NO-GO ⛔'}`),
        h('p', { class: 'muted small' }, 'Hard gates are checked before any score. A failed gate is NO-GO — physics does not negotiate.'),
        gatesPanel(issues, dispatch),
        report(issues, dispatch),
      ]),
    ]),
    scenario && h('div', { class: 'panel' }, [h('h2', {}, '💰 Full cost breakdown (model budget)'), costTable(res, scenario),
      h('p', { class: 'muted small' }, 'Hardware is only one line. All lines are educational estimates from our research — not real quotes.')]),
    roleGoals(state),
    votes(state, dispatch),
    h('div', { class: 'launch-box' }, [
      h('button', {
        class: 'btn btn-launch', type: 'button', disabled: !ready, key: 'launch',
        onClick: () => dispatch(runSimulation(newSeed())),
      }, go ? '🚀 LAUNCH' : '⛔ NO-GO'),
      !ready && h('p', { class: 'muted' }, todos.length
        ? `Finish ${todos.length === 1 ? 'this step' : 'these steps'} first: ${[...new Set(todos.map((t) => getStep(t.step).label))].join(', ')}.`
        : !go ? 'NO-GO: fix the ⛔ gates above. Real missions never launch like this.' : `The team needs a majority Go: ${vs.go} of ${vs.needed} so far.`),
      canSimulate && h('button', { class: 'btn btn-ghost', type: 'button', key: 'simulate-anyway', onClick: () => dispatch(runSimulation(newSeed(), true)) }, '🧪 Simulate what would happen'),
      canSimulate && h('p', { class: 'muted small' }, 'Plays out the first failed gate as an animation and records a failed mission — so you can see why real missions never fly a NO-GO.'),
      ready && issues.some((i) => i.severity === 'warning') && h('p', { class: 'muted' }, 'You can launch with ⚠️ warnings — but an objective will be missed.'),
    ]),
  );
}
