// Step 3 — Science tools: "Needed for your goal ★" badges; incompatible tools greyed with a
// one-line reason; tools too heavy for the frame are tucked into a collapsed group.

import { mount, h } from '../dom.js';
import { term } from '../tooltip.js';
import { choiceCard, levels, previewDelta } from '../card.js';
import { INSTRUMENTS } from '../../data/instruments.js';
import { getScenario, incompatibleTagsOf } from '../../data/scenarios.js';
import { getOrbit } from '../../data/orbits.js';
import { getComponent, isCubeSat } from '../../data/components.js';
import { computeResources } from '../../engine/resources.js';
import { whyInstrument } from '../../engine/explain.js';
import { addInstrument, removeInstrument } from '../../state/actions.js';
import { kg, watts, money, months, pct, num, gbDay } from '../../utils/format.js';
import { instrumentView, drawView, viewKind, VIEW_CAPTION } from '../animations/instrumentView.js';
import { getInstrument } from '../../data/instruments.js';

// View-only: which tool the "What it sees" panel shows, and which one already played its reveal.
let previewId = null;
let playedId = null;

function previewPanel() {
  const ins = getInstrument(previewId);
  const box = h('div', { class: 'iv-box' });
  const panel = h('div', { class: 'panel iv-panel' }, [
    h('div', { class: 'iv-head' }, [h('strong', {}, `👁️ What the ${ins?.plainName.toLowerCase() ?? 'tool'} sees`), h('span', { class: 'muted small' }, 'Point at a tool to look through it.')]),
    box,
  ]);
  showPreview(box, previewId);
  return panel;
}

function showPreview(box, id) {
  if (!id) return;
  const head = box.parentElement?.querySelector('.iv-head strong');
  if (head) head.textContent = `👁️ What the ${getInstrument(id).plainName.toLowerCase()} sees`;
  if (id === playedId) {
    // Already revealed once: show the still picture instantly (no replay on every re-render).
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

const firstSentence = (text) => (text ?? '').split(/(?<=\.)\s/)[0];

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const scenario = getScenario(state.scenarioId);
  const orbit = getOrbit(state.design.orbitId);
  const structure = getComponent(state.design.components.structure);
  const cube = isCubeSat(structure);
  const chosen = new Set(state.design.instrumentIds);
  const { payload } = before.mass;

  const pool = INSTRUMENTS.filter((ins) =>
    chosen.has(ins.id) || ((ins.formFactor === 'cubesat') === cube && (state.difficulty !== 'easy' || ins.tier === 'basic')));
  const sciLv = levels(pool.map((i) => i.science));
  const dataLv = levels(pool.map((i) => i.dataGBperDay));
  const costLv = levels(pool.map((i) => i.cost));
  const needed = (ins) => scenario?.requiredTags.some((t) => ins.tags.includes(t));
  const tooHeavy = (ins) => structure && ins.mass > structure.maxPayloadMass && !chosen.has(ins.id);

  const card = (ins) => {
    const i = pool.indexOf(ins);
    const hover = () => {
      if (previewId === ins.id) return;
      previewId = ins.id;
      const box = document.querySelector('.iv-box');
      if (box) showPreview(box, ins.id);
    };
    const selected = chosen.has(ins.id);
    const bad = incompatibleTagsOf(scenario, ins);
    const heavy = tooHeavy(ins);
    const action = selected ? removeInstrument(ins.id) : addInstrument(ins.id);
    const goodFit = orbit && ins.tags.some((t) => orbit.goodFor.includes(t));
    const built = choiceCard({
      key: `ins-${ins.id}`,
      icon: ins.icon,
      title: ins.plainName,
      realTerm: ins.name,
      oneLiner: ins.oneLiner,
      badges: [
        ...(needed(ins) && !bad.length ? ['Needed for your goal ★'] : []),
        ...(goodFit && !bad.length ? ['Suits your orbit'] : []),
      ],
      meters: [
        { label: 'Science', symbol: '🔬', level: sciLv[i] },
        { label: 'Data', symbol: '📡', level: dataLv[i] },
        { label: 'Cost', symbol: '$', level: costLv[i] },
      ],
      details: [['Weight', kg(ins.mass)], ['Power use', watts(ins.power)], ['Cost', money(ins.cost)], ['Data', gbDay(ins.dataGBperDay)],
        ['Science points', num(ins.science)], ['Reliability', pct(ins.reliability, 1)], ['Build time', months(ins.devMonths)]],
      selected,
      disabled: (bad.length > 0 || heavy) && !selected,
      warn: bad.length > 0 && selected,
      disabledReason: bad.length ? `✗ ${firstSentence(scenario.incompatibleWhy[bad[0]])}` : heavy ? `✗ Too heavy for your frame (${kg(ins.mass)}, frame carries ${kg(structure.maxPayloadMass)}).` : null,
      delta: `${selected ? 'If removed' : 'If added'}: ${previewDelta(state, action, before)}`,
      whyTitle: bad.length ? `Why not the ${ins.plainName}?` : ins.plainName,
      why: bad.length ? scenario.incompatibleWhy[bad[0]] : whyInstrument(ins, orbit),
      onSelect: () => dispatch(action),
    });
    built.addEventListener('mouseenter', hover);
    built.addEventListener('focusin', hover);
    return built;
  };

  const usable = pool.filter((i) => !incompatibleTagsOf(scenario, i).length && !tooHeavy(i))
    .sort((a, b) => Number(needed(b)) - Number(needed(a)));
  const incompatible = pool.filter((i) => incompatibleTagsOf(scenario, i).length && !chosen.has(i.id));
  const heavy = pool.filter((i) => tooHeavy(i) && !incompatibleTagsOf(scenario, i).length);

  if (!previewId || !pool.some((i) => i.id === previewId)) {
    previewId = state.design.instrumentIds.find((id) => pool.some((i) => i.id === id)) ?? usable[0]?.id ?? null;
  }
  mount(container, 
    previewId && previewPanel(),
    h('p', { class: 'step-hint' }, [
      'Pick one or more. ',
      structure ? `Your ${structure.plainName.toLowerCase()} can carry ${kg(structure.maxPayloadMass)} of tools — you've used ${kg(payload.used)}.` : 'Choose a satellite size first to see how much it can carry.',
      ' ', term('payload', 'What is a payload?'),
    ]),
    h('div', { class: 'choices' }, usable.map(card)),
    incompatible.length > 0 && h('div', { class: 'group' }, [
      h('h2', { class: 'group-title' }, 'Not useful for this mission'),
      h('div', { class: 'choices' }, incompatible.map(card)),
    ]),
    heavy.length > 0 && h('details', { class: 'group' }, [
      h('summary', { class: 'group-title' }, `${heavy.length} tool${heavy.length > 1 ? 's are' : ' is'} too heavy for your satellite`),
      h('div', { class: 'choices' }, heavy.map(card)),
    ]),
  );
}
