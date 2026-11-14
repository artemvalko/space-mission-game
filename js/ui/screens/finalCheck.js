// Step 9 — Final check (Point Design + Design Review): the satellite, goal checklist,
// Flight Director report, team votes and the big LAUNCH button.

import { mount, h } from '../dom.js';
import { renderSatellite } from '../satellite.js';
import { previewDelta } from '../card.js';
import { ROLES, NO_GO_REASONS, getNoGoReason } from '../../data/roles.js';
import { evaluateRoleGoals, voteStatus } from '../../engine/roleGoals.js';
import { rerender } from '../view.js';
import { computeResources } from '../../engine/resources.js';
import { validateDesign, canLaunch } from '../../engine/validation.js';
import { goalChecklist } from '../../engine/goals.js';
import { castVote, runSimulation, goToScreen, setKit } from '../../state/actions.js';
import { newSeed } from '../../utils/random.js';
import { getStep } from '../steps.js';

const SEV = { error: { icon: '⛔', cls: 'bad' }, warning: { icon: '⚠️', cls: 'bad' }, caution: { icon: '◐', cls: 'tight' }, todo: { icon: '○', cls: 'todo' } };

function report(issues, dispatch) {
  const shown = issues.filter((i) => i.severity !== 'info');
  if (!shown.length) return h('div', { class: 'report report-ok' }, [h('strong', {}, '✓ All systems go! '), 'Every gauge is green and your goal is reachable.']);
  return h('ul', { class: 'report' }, shown.map((i) => h('li', { class: `report-${SEV[i.severity].cls}` }, [
    h('span', { class: 'report-icon', 'aria-hidden': 'true' }, SEV[i.severity].icon),
    h('span', { class: 'report-text' }, i.message),
    i.step && h('button', { class: 'btn btn-small', type: 'button', onClick: () => dispatch(goToScreen(i.step)) }, `${i.severity === 'todo' ? 'Go' : 'Fix'}: ${getStep(i.step).label} →`),
  ])));
}

function kitToggle(state, dispatch, before) {
  if (state.difficulty !== 'easy') return null;
  const other = state.design.kit === 'upgraded' ? 'standard' : 'upgraded';
  return h('div', { class: 'kit-toggle' }, [
    h('div', {}, [h('strong', {}, '🧠 Brains & steering: '), state.design.kit === 'upgraded' ? 'Upgraded kit (radiation-proof computer, super-steady pointing)' : 'Standard kit (picked for you)']),
    h('button', { class: 'btn btn-small', type: 'button', key: 'kit-toggle', onClick: () => dispatch(setKit(other)) },
      other === 'upgraded' ? `⬆ Upgrade (${previewDelta(state, setKit('upgraded'), before)})` : '⬇ Back to standard kit'),
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
  const ready = canLaunch(issues) && vs.majority;
  const chips = goalChecklist(state, res);
  const todos = issues.filter((i) => i.severity === 'todo');

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
        h('h2', {}, '🧑‍🚀 Flight Director\'s report'),
        report(issues, dispatch),
        kitToggle(state, dispatch, res),
      ]),
    ]),
    roleGoals(state),
    votes(state, dispatch),
    h('div', { class: 'launch-box' }, [
      h('button', {
        class: 'btn btn-launch', type: 'button', disabled: !ready, key: 'launch',
        onClick: () => dispatch(runSimulation(newSeed())),
      }, '🚀 LAUNCH'),
      !ready && h('p', { class: 'muted' }, todos.length
        ? `Finish ${todos.length === 1 ? 'this step' : 'these steps'} first: ${todos.map((t) => getStep(t.step).label).join(', ')}.`
        : !canLaunch(issues) ? 'Fix the ⛔ problems above first.' : `The team needs a majority Go: ${vs.go} of ${vs.needed} so far.`),
      ready && issues.some((i) => i.severity === 'warning') && h('p', { class: 'muted' }, 'You can launch with ⚠️ warnings — but your mission will suffer. Your call!'),
    ]),
  );
}
