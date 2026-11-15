// Step 3 — Mission payload: the service payload cards for this mission (+ Timing for navigation,
// + Calibration for weather), then distractors with an honest "why not" (research §7.3).
// Payloads built for another frame size are greyed; same-size distractors stay selectable so the
// player can see the NO-GO they cause.

import { mount, h } from '../dom.js';
import { icon } from '../icons.js';
import { term } from '../tooltip.js';
import { choiceCard, previewDelta, priceCell } from '../card.js';
import { INSTRUMENTS, PAYLOAD_PLAIN, ROLE_INFO, getInstrument } from '../../data/instruments.js';
import { getScenario } from '../../data/scenarios.js';
import { matrixWhyNot } from '../../engine/dependencies.js';
import { getComponent } from '../../data/components.js';
import { computeResources } from '../../engine/resources.js';
import { whyCard } from '../../engine/explain.js';
import { addInstrument, removeInstrument } from '../../state/actions.js';
import { kg, money } from '../../utils/format.js';
import { instrumentView, drawView, viewKind, VIEW_CAPTION } from '../animations/instrumentView.js';
import { cap, compareToggle } from './common.js';

// View-only: which payload the "What it does" panel shows, and which one already played its reveal.
let previewId = null;
let playedId = null;

function previewPanel() {
  const box = h('div', { class: 'iv-box' });
  const panel = h('div', { class: 'panel iv-panel' }, [
    h('div', { class: 'iv-head', title: 'Illustration — point at a card to look.' }, [icon('eye', 16), ' ', h('strong', {}, '')]),
    box,
  ]);
  showPreview(box, previewId);
  return panel;
}

function showPreview(box, id) {
  if (!id) return;
  const head = box.parentElement?.querySelector('.iv-head strong');
  if (head) head.textContent = getInstrument(id).plainName;
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
  const payloadWhyNot = (sc, ins) => (sc ? matrixWhyNot(sc.id, state.design.variantId, ins.id) : '');

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
      oneLiner: whyNot ? `${cap(whyNot)}` : ins.oneLiner,
      whatFor: ins.why,
      badges: [...(ins.missions.includes(scenario?.id) && ['payload_iot_sdr', 'ant_iot_deploy', 'payload_mw_radiometer', 'radiometer_calibration', 'clock_phm_rubidium_4', 'nav_signal_rf', 'antenna_lband_nav'].includes(ins.id) ? ['Research build'] : []), ...(ins.category !== 'service_payload' ? [PAYLOAD_PLAIN[ins.category].plainName] : [])],
      details: [['Mass', ins.mass != null ? kg(ins.mass) : ins.massClassOf ? '≈ research SDR class (estimate)' : 'not public (?)'], ['Price', priceCell(ins, scenario?.id)],
        ...(ins.powerW ? [['Power', `${ins.powerW} W`]] : []), ...(ins.dataKbps ? [['Data rate', `${ins.dataKbps} kbps`]] : []),
        ...(ins.volumeU ? [['Volume', `about ${ins.volumeU}U`]] : [])],
      data: ins,
      selected,
      disabled: (!fits || ins.cancelled || (ins.leoOnly && scenario?.size === 'large')) && !selected,
      warn: !!whyNot && selected,
      disabledReason: ins.cancelled ? 'Cancelled: never flew.' : ins.leoOnly ? 'LEO demo only — not MEO.' : 'Wrong size for your frame.',
      delta: `${selected ? 'If removed' : 'If added'}: ${previewDelta(state, action, before)}`,
      whyTitle: whyNot ? `Why not the ${ins.plainName.toLowerCase()}?` : ins.plainName,
      // Why? micro-format (≤5 lines): what / why this goal (dependency matrix) / what it changes / better alternative / data level.
      why: () => whyCard(ins, { scenarioId: scenario?.id, variantId: state.design.variantId, change: `${selected ? 'If removed: ' : ''}${previewDelta(state, action, before)}`,
        unverified: ins.mass == null && !ins.massClassOf && ins.formFactor !== 'any' && !ins.flewOn }),
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

  const reference = structure?.reference ?? null;
  // A reference build brings its own payload: only add-ons that really flew on it can be added.
  const own = INSTRUMENTS.filter((i) => !payloadWhyNot(scenario, i) && !i.leoOnly && (!reference || i.flewOn === structure.id));
  const others = INSTRUMENTS.filter((i) => (payloadWhyNot(scenario, i) || i.leoOnly) && !own.includes(i));
  const partOnly = reference ? INSTRUMENTS.filter((i) => !payloadWhyNot(scenario, i) && !own.includes(i) && !i.leoOnly) : [];
  const groups = ['service_payload', 'timing', 'calibration'].map((cat) => [cat, own.filter((i) => i.category === cat)]).filter(([, list]) => list.length);
  const includedCard = reference && h('div', { class: 'choice selected', key: 'ins-included' }, [
    h('div', { class: 'choice-head' }, [h('span', { class: 'choice-icon', 'aria-hidden': 'true' }, icon('box', 20)), h('div', { class: 'choice-titles' }, h('div', { class: 'choice-title' }, `Included in ${structure.plainName.replace(' (real)', '')}`))]),
    h('p', { class: 'choice-one' }, reference.payloadRoles.map((r) => ROLE_INFO[r]?.plainName).join(' + ')),
  ]);
  if (!previewId || !INSTRUMENTS.some((i) => i.id === previewId)) previewId = state.design.instrumentIds[0] ?? own[0]?.id ?? null;

  mount(container,
    previewId && previewPanel(),
    h('p', { class: 'step-hint', title: 'Controlling the satellite (TT&C) is a different radio — you choose it on the Radio step.' }, [term('payload', 'Payload'), ' = the job. Control radio comes later.']),
    includedCard && h('div', { class: 'choices' }, includedCard),
    ...groups.map(([cat, list]) => h('div', { class: 'group' }, [
      h('h2', { class: 'group-title', title: PAYLOAD_PLAIN[cat].whatFor }, [icon(PAYLOAD_PLAIN[cat].icon, 16), ` ${PAYLOAD_PLAIN[cat].plainName}`]),
      h('div', { class: 'choices' }, list.map(card)),
    ])),
    partOnly.length > 0 && h('details', { class: 'group fold' }, [h('summary', { class: 'group-title', title: 'These need a part-by-part frame, not a complete real satellite.' }, `Part-by-part payloads (${partOnly.length})`), h('div', { class: 'choices' }, partOnly.map(card))]),
    compareToggle('payload', [...own], scenario?.id),
    others.length > 0 && h('details', { class: 'group', open: others.some((i) => chosen.has(i.id)) }, [
      h('summary', { class: 'group-title' }, `Not useful here (${others.length})`),
      h('div', { class: 'choices' }, others.map(card)),
    ]),
  );
}
