// Step 3 — Mission payload: the service payload cards for this mission (+ Timing for navigation,
// + Calibration for weather), then distractors with an honest "why not" (research §7.3).
// Payloads built for another frame size are greyed; same-size distractors stay selectable so the
// player can see the NO-GO they cause.

import { mount, h } from '../dom.js';
import { term } from '../tooltip.js';
import { choiceCard, previewDelta } from '../card.js';
import { INSTRUMENTS, PAYLOAD_PLAIN, getInstrument } from '../../data/instruments.js';
import { getScenario, payloadWhyNot } from '../../data/scenarios.js';
import { getComponent } from '../../data/components.js';
import { computeResources } from '../../engine/resources.js';
import { whyInstrument } from '../../engine/explain.js';
import { addInstrument, removeInstrument } from '../../state/actions.js';
import { kg, money } from '../../utils/format.js';
import { instrumentView, drawView, viewKind, VIEW_CAPTION } from '../animations/instrumentView.js';
import { cap } from './common.js';

// View-only: which payload the "What it does" panel shows, and which one already played its reveal.
let previewId = null;
let playedId = null;

function previewPanel() {
  const box = h('div', { class: 'iv-box' });
  const panel = h('div', { class: 'panel iv-panel' }, [
    h('div', { class: 'iv-head', title: 'Illustration — point at a card to look.' }, [h('strong', {}, '👁️')]),
    box,
  ]);
  showPreview(box, previewId);
  return panel;
}

function showPreview(box, id) {
  if (!id) return;
  const head = box.parentElement?.querySelector('.iv-head strong');
  if (head) head.textContent = `👁️ ${getInstrument(id).plainName}`;
  if (id === playedId) {
    const canvas = drawView(document.createElement('canvas'), id);
    canvas.className = 'iv-canvas';
    box.replaceChildren(h('div', { class: 'anim-stage iv-static', 'data-scene': 'instrument-view' }, [
      h('div', { class: 'anim-html' }, h('div', { class: 'iv-wrap' }, canvas)),
      h('div', { class: 'anim-caption show' }, VIEW_CAPTION[viewKind(id)]),
    ]));
    return;
  }
  playedId = id;
  instrumentView(box, { instrumentId: id });
}

const fitsFrame = (ins, structure) => !structure || ins.formFactor === 'any' || ins.formFactor === structure.formFactor;

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const scenario = getScenario(state.scenarioId);
  const structure = getComponent(state.design.components.structure);
  const chosen = new Set(state.design.instrumentIds);

  const card = (ins) => {
    const selected = chosen.has(ins.id);
    const whyNot = payloadWhyNot(scenario, ins);
    const fits = fitsFrame(ins, structure);
    const action = selected ? removeInstrument(ins.id) : addInstrument(ins.id);
    const built = choiceCard({
      key: `ins-${ins.id}`,
      icon: ins.icon,
      title: ins.plainName,
      realTerm: ins.name,
      oneLiner: whyNot ? `✗ ${cap(whyNot)}` : ins.oneLiner,
      whatFor: ins.why,
      badges: [...(!whyNot ? ['Needed for your goal ★'] : []), ...(ins.category !== 'service_payload' ? [PAYLOAD_PLAIN[ins.category].plainName] : [])],
      details: [['Mass', ins.mass == null ? 'not in our data' : kg(ins.mass)], ['Cost', ins.cost == null ? 'not in our data' : money(ins.cost)],
        ...(ins.volumeU ? [['Volume', `about ${ins.volumeU}U`]] : [])],
      data: ins,
      selected,
      disabled: !fits && !selected,
      warn: !!whyNot && selected,
      disabledReason: `✗ Wrong size for your frame.`,
      delta: `${selected ? 'If removed' : 'If added'}: ${previewDelta(state, action, before)}`,
      whyTitle: whyNot ? `Why not the ${ins.plainName.toLowerCase()}?` : ins.plainName,
      why: whyNot ? `${cap(whyNot)} ${ins.formFactor !== 'any' && !fits ? `It is built for a ${ins.formFactor === 'large' ? '~700 kg satellite' : 'CubeSat'}. ` : ''}Fix: use the payload this mission needs. ${whyInstrument(ins, null)}` : whyInstrument(ins, scenario),
      onSelect: () => dispatch(action),
    });
    const hover = () => {
      if (previewId === ins.id) return;
      previewId = ins.id;
      const box = document.querySelector('.iv-box');
      if (box) showPreview(box, ins.id);
    };
    built.addEventListener('mouseenter', hover);
    built.addEventListener('focusin', hover);
    return built;
  };

  const own = INSTRUMENTS.filter((i) => !payloadWhyNot(scenario, i));
  const others = INSTRUMENTS.filter((i) => payloadWhyNot(scenario, i));
  const groups = ['service_payload', 'timing', 'calibration'].map((cat) => [cat, own.filter((i) => i.category === cat)]).filter(([, list]) => list.length);
  if (!previewId || !INSTRUMENTS.some((i) => i.id === previewId)) previewId = state.design.instrumentIds[0] ?? own[0]?.id ?? null;

  mount(container,
    previewId && previewPanel(),
    h('p', { class: 'step-hint', title: 'Controlling the satellite (TT&C) is a different radio — you choose it on the Radio step.' }, ['🎯 ', term('payload', 'Payload'), ' = the job. Control radio comes later.']),
    ...groups.map(([cat, list]) => h('div', { class: 'group' }, [
      h('h2', { class: 'group-title', title: PAYLOAD_PLAIN[cat].whatFor }, `${PAYLOAD_PLAIN[cat].icon} ${PAYLOAD_PLAIN[cat].plainName}`),
      h('div', { class: 'choices' }, list.map(card)),
    ])),
    others.length > 0 && h('details', { class: 'group', open: others.some((i) => chosen.has(i.id)) }, [
      h('summary', { class: 'group-title' }, `✗ Not useful here (${others.length})`),
      h('div', { class: 'choices' }, others.map(card)),
    ]),
  );
}
