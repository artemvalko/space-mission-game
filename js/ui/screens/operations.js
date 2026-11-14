// Step 10 — Mission (operations). Every outcome is SHOWN with an animation chosen from the
// engine's explicit `outcome` / `failureCause`:
//   countdown → launch failure | too heavy / wrong orbit | launch success → orbit view
//   → (event intro → choice modal with trade-offs → event outcome)* → success | partial | lost.
// The controller (view-only state) lives in this module and survives re-renders: the same DOM
// root is re-mounted every render, so running animations keep going.

import { mount, h } from '../dom.js';
import { getSelection } from '../../engine/resources.js';
import { describeOutcome, effectsSummary } from '../../engine/outcome.js';
import { relaunchCostM } from '../../engine/costs.js';
import { teamNameOf } from '../../engine/attempt.js';
import { getEvent } from '../../data/events.js';
import { getComponent } from '../../data/components.js';
import { getInstrument } from '../../data/instruments.js';
import { ROLES } from '../../data/roles.js';
import { chooseEventOption, relaunch, goToScreen } from '../../state/actions.js';
import { newSeed } from '../../utils/random.js';
import { kg, money, pct } from '../../utils/format.js';
import {
  countdown, launchSuccess, launchFailure, tooHeavy, orbitView, getOrbitView,
  missionSuccess, missionPartial, missionLost, EVENT_SCENES, reducedMotion, goConsole, montage,
} from '../animations/index.js';
import { clearGallery } from '../gallery.js';
import { endOfLife } from '../animations/endOfLife.js';
import { computeResources } from '../../engine/resources.js';
import { getNoGoReason } from '../../data/roles.js';
import { votingRoles } from '../../engine/roleGoals.js';

const ctl = { root: null, stage: null, modal: null, reactions: null, key: null, token: null, running: false, state: null, dispatch: null };

// Team reaction avatars (Phase 4 P2 #10): one face per player, reacting at key moments.
const MOODS = { idle: '🙂', nervous: '😬', cheer: '🙌', party: '🥳', facepalm: '🤦', shock: '😱', meh: '😐', wow: '🤩' };
function react(mood) {
  const state = ctl.state;
  if (!ctl.reactions || !state) return;
  const people = state.mode === 'team' ? state.players : state.players.slice(0, 1);
  ctl.reactions.replaceChildren(...people.map((p, i) => {
    // Small variety: alternate cheer/party so a team doesn't look identical.
    const m = mood === 'cheer' && i % 2 ? 'party' : mood;
    return h('div', { class: 'react', title: `${p.name}: ${m}` }, [h('span', { class: 'react-face', 'aria-hidden': 'true' }, MOODS[m] ?? MOODS.idle), h('span', { class: 'react-name' }, p.name)]);
  }));
}
const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? 0 : ms));

function ensureRoot() {
  if (ctl.root) return;
  ctl.stage = h('div', { class: 'ops-stage' });
  ctl.modal = h('div', { class: 'ops-modal-host' });
  ctl.reactions = h('div', { class: 'reactions', 'aria-hidden': 'true' });
  ctl.root = h('div', { class: 'ops-root' }, [ctl.stage, ctl.reactions, ctl.modal]);
}

const itemName = (id) => getComponent(id)?.plainName ?? getInstrument(id)?.plainName ?? 'a part';
const describe = (ev, p) => ev.description.replace('{item}', itemName(p.itemId));


/** Modal: event + each choice with its trade-off. Resolves with the chosen index. */
function askChoice(ev, pending) {
  return new Promise((resolve) => {
    const state = ctl.state;
    const flight = state.mode === 'team' ? state.players.find((p) => p.roleId === 'flight') : null;
    const role = ROLES.find((r) => r.id === 'flight');
    ctl.modal.replaceChildren(h('div', { class: 'event-modal-backdrop' }, h('div', { class: 'event-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': ev.title }, [
      h('div', { class: 'event-when' }, pending.month === 0 ? 'Before launch' : `Month ${pending.month}`),
      h('h2', {}, ev.title),
      h('p', { class: 'event-desc' }, describe(ev, pending)),
      flight && h('p', { class: 'owner-badge' }, `👤 ${flight.name} (${role.name}) decides — others can advise.`),
      h('div', { class: 'event-choices' }, ev.choices.map((c, i) => h('button', {
        class: 'event-choice', type: 'button', 'data-choice': i,
        onClick: () => { ctl.modal.replaceChildren(); resolve(i); },
      }, [
        h('div', { class: 'event-choice-label' }, c.label),
        h('div', { class: 'event-choice-why' }, c.explanation),
        h('div', { class: 'event-effects' }, effectsSummary(c.effects).map((e) => h('span', { class: ['fx', e.good ? 'fx-good' : 'fx-bad'] }, e.text))),
      ]))),
    ])));
    ctl.modal.querySelector('.event-choice')?.focus({ preventScroll: true });
  });
}

async function eventFlow(container, alive) {
  const pending = ctl.state.simulation.pending;
  const ev = getEvent(pending.eventId);
  const scene = EVENT_SCENES[ev.id];
  const pos = getOrbitView(ctl.stage)?.satPos() ?? { x: 520, y: 170 };
  const params = { state: ctl.state, itemId: pending.itemId, x: pos.x, y: pos.y, front: describe(ev, pending) };
  react(ev.id === 'discovery' ? 'wow' : 'nervous');
  if (scene) await scene(container, { ...params, phase: 'intro' });
  if (!alive()) return;
  const choiceIndex = await askChoice(ev, pending);
  if (!alive()) return;
  ctl.dispatch(chooseEventOption(choiceIndex)); // synchronous: ctl.state now holds the replayed run
  const choice = ev.choices[choiceIndex];
  if (scene) await scene(container, { ...params, phase: 'outcome', choiceIndex, caption: choice.explanation, back: effectsSummary(choice.effects).map((e) => e.text).join(' · ') });
  if (container !== ctl.stage) container.replaceChildren();
  react('idle');
}

async function run(token) {
  ctl.running = true;
  const alive = () => ctl.token === token && ctl.root.isConnected;
  const sim = () => ctl.state.simulation;
  try {
    const state = ctl.state;
    const sel = getSelection(state);
    if (state.relaunches === 0) {
      // Go/No-Go console: team = real votes; solo = you wear every hat, all stations Go.
      const voters = votingRoles(state);
      const roles = (voters.length ? ROLES.filter((r) => voters.includes(r.id)) : ROLES).map((r) => ({
        icon: r.icon, name: r.name,
        who: state.players.filter((p) => p.roleId === r.id).map((p) => p.name).join(' & ') || (state.mode === 'solo' ? state.players[0]?.name : ''),
        vote: voters.length ? state.votes[r.id] ?? 'go' : 'go',
        reason: voters.length ? getNoGoReason(state.voteReasons[r.id])?.text : null,
      }));
      await goConsole(ctl.stage, { roles, caption: roles.every((r) => r.vote === 'go') ? 'All stations GO for launch.' : 'Not everyone agreed — the majority said GO.' });
      if (!alive()) return;
      await montage(ctl.stage, { state, devMonths: Math.round(computeResources(state).time.used) });
      if (!alive()) return;
    }
    if (sim().pending?.month === 0) {
      // Pre-launch event: no orbit view yet — play it over a launch-pad backdrop of its own.
      const overlay = h('div', { class: 'anim-overlay' });
      ctl.stage.replaceChildren(h('div', { class: 'anim-stage prelaunch-bg', 'data-scene': 'prelaunch' }, [h('div', { class: 'prelaunch-pad', 'aria-hidden': 'true' }, '🚀'), overlay]));
      await eventFlow(overlay, alive);
      if (!alive()) return;
    }
    react('nervous');
    await countdown(ctl.stage, { launcher: sel.launcher });
    if (!alive()) return;

    const first = sim();
    const d = describeOutcome(ctl.state, first);
    if (first.outcome === 'launch_failure') {
      react('facepalm');
      const v = await launchFailure(ctl.stage, {
        launcher: sel.launcher, caption: d.caption,
        hold: [{ label: `🔁 Try again (new launch, +${money(relaunchCostM(ctl.state))})`, value: 'retry' }, { label: 'See results', value: 'results', primary: false }],
      });
      if (!alive()) return;
      ctl.dispatch(v === 'retry' ? relaunch(newSeed()) : goToScreen('results'));
      return;
    }
    if (first.outcome === 'too_heavy' || first.outcome === 'wrong_orbit') {
      react('facepalm');
      await tooHeavy(ctl.stage, { launcher: sel.launcher, reason: first.outcome, caption: d.caption, hold: [{ label: 'See results →', value: 'results' }] });
      if (alive()) ctl.dispatch(goToScreen('results'));
      return;
    }
    react('cheer');
    await launchSuccess(ctl.stage, {
      state: ctl.state,
      caption: `✓ In orbit! The ${sel.launcher.plainName} (${pct(sel.launcher.reliability)} success rate) delivered your ${kg(first.summary.massKg)} satellite to ${sel.orbit.plainName.toLowerCase()}.`,
      hold: [{ label: 'Start the mission ▶', value: 'go' }],
    });
    if (!alive()) return;
    react('idle');

    for (;;) {
      const cur = sim();
      await orbitView(ctl.stage, { state: ctl.state, sim: cur });
      if (!alive()) return;
      if (!sim().pending) break;
      await eventFlow(getOrbitView(ctl.stage).overlay, alive);
      if (!alive()) return;
    }

    const fin = sim();
    const end = describeOutcome(ctl.state, fin);
    const info = { name: sel.scenario.name, team: teamNameOf(ctl.state), orbitId: sel.orbit.id, grade: ctl.state.score?.grade ?? (fin.outcome === 'success' ? 'A' : 'C'), caption: end.caption, hold: [{ label: 'See results →', value: 'results' }] };
    if (fin.outcome === 'lost') { react('shock'); getOrbitView(ctl.stage)?.dim(); await wait(1600); if (!alive()) return; }
    else {
      // Responsible retirement: deorbit, graveyard orbit or a last goodbye.
      await endOfLife(ctl.stage, { orbitId: sel.orbit.id });
      if (!alive()) return;
    }
    react(fin.outcome === 'success' ? 'cheer' : fin.outcome === 'partial' ? 'meh' : 'facepalm');
    if (fin.outcome === 'success') await missionSuccess(ctl.stage, info);
    else if (fin.outcome === 'partial') await missionPartial(ctl.stage, { ...info, missed: end.missed.map((m) => m.label) });
    else await missionLost(ctl.stage, { ...info, state: ctl.state, cause: fin.failureCause, tip: end.tip });
    if (alive()) ctl.dispatch(goToScreen('results'));
  } finally {
    if (ctl.token === token) ctl.running = false;
  }
}

export function render(container, state, dispatch) {
  ensureRoot();
  ctl.state = state;
  ctl.dispatch = dispatch;
  const sim = state.simulation;
  if (!sim) {
    mount(container, h('p', { class: 'muted' }, 'No mission running — launch from the Final check.'));
    return;
  }
  mount(container, h('p', { class: 'step-hint' }, 'Watch your mission fly. When something happens, the clock stops and the team decides.'), ctl.root);
  const key = `${sim.seed}:${state.relaunches}`;
  if (key !== ctl.key || !ctl.running) {
    if (key !== ctl.key && state.relaunches === 0) clearGallery();
    ctl.key = key;
    ctl.token = {};
    ctl.modal.replaceChildren();
    // Start after this render has attached the root to the page.
    const token = ctl.token;
    react('idle');
    queueMicrotask(() => { if (ctl.token === token) run(token); });
  }
}
