// Step 9 — Launch prep checklist (research §11.1, §6.3 step 9): tests, frequency licence / ITU
// coordination, debris-mitigation / disposal plan. Missing items = NO-GO.

import { mount, h } from '../dom.js';
import { icon } from '../icons.js';
import { term, infoTerm, whyButton } from '../tooltip.js';
import { dataBadge, sourceLinks } from '../card.js';
import { getScenario } from '../../data/scenarios.js';
import { togglePrep, selectDisposal, toggleDockingPlate, selectComponent } from '../../state/actions.js';
import { DISPOSAL_STRATEGIES, DOCKING_PLATE, DISPOSAL_WHY, PLANET_MAX, EMISSION_BADGE } from '../../data/disposal.js';
import { choiceCard } from '../card.js';
import { money, num } from '../../utils/format.js';
import { getComponent, CATEGORY_PLAIN, COMPONENTS } from '../../data/components.js';
import { validateDesign } from '../../engine/validation.js';
import { computeResources } from '../../engine/resources.js';

export const PREP_ITEMS = [
  {
    id: 'tests', icon: 'flask', title: 'Shake, heat & radio tests', long: 'Test the satellite: vibration, thermal-vacuum, EMC.',
    why: 'Launch shakes everything; space is a hot-and-cold vacuum; radios must not disturb each other. Untested hardware is not allowed on a rocket.',
    cost: (sc) => ['Design, software, assembly & tests (AIT)', sc.costModel.ait], sources: ['S01', 'S17'],
  },
  {
    id: 'licence', icon: 'document', title: 'Frequency licence', long: 'Get a frequency licence (national licence + ITU coordination).',
    why: 'Radio frequencies cannot be picked freely — IoT, navigation and weather links all need a licence and international coordination.',
    cost: (sc) => ['Frequency licence, regulation, EMC', sc.costModel.licensing], sources: ['S20'],
  },
  {
    id: 'disposal', icon: 'recycle', title: 'Disposal plan', long: 'Write a debris-mitigation / disposal plan.',
    why: 'Every mission must end safely, without leaving junk. Example: US FCC rules ask listed LEO systems to dispose within 5 years after the mission — rules differ by country and orbit.',
    cost: null, sources: ['S22'],
  },
];

const level = (v, max) => Math.max(1, Math.min(3, Math.ceil((v / max) * 3)));

/** "How will your satellite retire?" — 3 strategies with debris / atmosphere / ground meters (DISPOSAL.md). */
function retireCards(state, dispatch, res) {
  const planet = res.planet;
  const chosen = state.design.disposalId ?? (state.design.prep?.disposal ? planet.strategyId : null);
  return h('div', { class: 'choices' }, DISPOSAL_STRATEGIES.map((d) => {
    const o = planet.options.find((x) => x.id === d.id);
    const selected = chosen === d.id;
    const line = d.id === 'disp_burn_up' && o.kg ? `No junk, but ≈${o.kg.toFixed(1)} kg oxide in the air.` : d.oneLiner;
    return choiceCard({
      key: `disp-${d.id}`,
      icon: d.icon,
      title: d.plainName,
      realTerm: d.name,
      oneLiner: line,
      whatFor: d.why,
      badges: o.kg ? ['≈ science estimate'] : [],
      meters: [
        { label: `Debris: ${o.debris}/${PLANET_MAX.debris} (more = less junk)`, icon: 'satellite', level: level(o.debris, PLANET_MAX.debris) },
        { label: `Atmosphere: ${o.atmosphere}/${PLANET_MAX.atmosphere}${o.kg ? ` (≈ ${num(o.kg, 1)} kg Al₂O₃, ${EMISSION_BADGE})` : ''}`, icon: 'cloud', level: level(o.atmosphere, PLANET_MAX.atmosphere) },
        { label: `Ground risk: ${o.ground}/${PLANET_MAX.ground}`, icon: 'user', level: level(o.ground, PLANET_MAX.ground) },
      ],
      details: [['Debris', `${o.debris} / ${PLANET_MAX.debris}`], ['Atmosphere', o.kg ? `≈ ${num(o.kg, 1)} kg aluminium oxide (${EMISSION_BADGE})` : 'nothing burns'],
        ['Ground risk', { ok: 'safe (burns up fully or falls in the ocean)', 'needs-controlled': 'must pass the 1-in-10,000 rule (D04)', 'n.a.': 'nothing falls' }[o.groundRisk]],
        ['Score', `${o.score} / 40 (no option gets 40)`]],
      data: d,
      selected,
      disabled: !o.valid && !selected,
      warn: !o.valid && selected,
      disabledReason: `${o.reason}`,
      why: `${d.why} ${o.reason ? `Here: ${o.reason}` : ''}`,
      onSelect: () => dispatch(selectDisposal(d.id)),
    });
  }));
}

// One-line reasons for the compact row (the full reason is in the tooltip).
const shortReason = (r) => (/5-year/.test(r) ? 'Breaks 5-year rule' : /far too low/.test(r) ? 'Thrust too low' : /Needs thrusters/.test(r) ? 'Needs thrusters' : /Air never/.test(r) ? 'Air never pulls it down' : /Not in our data/.test(r) ? 'Not in our data' : r);

/** Compact strategy row: valid one selectable, greyed ones keep their one-line reason. */
function strategyRow(state, dispatch, res) {
  const planet = res.planet;
  return h('div', { class: 'strategy-row' }, DISPOSAL_STRATEGIES.map((d) => {
    const o = planet.options.find((x) => x.id === d.id);
    const selected = planet.strategyId === d.id && state.design.prep?.disposal;
    return h('button', {
      type: 'button', key: `strat-${d.id}`, class: ['strategy-chip', selected && 'selected', !o.valid && 'disabled'], disabled: !o.valid,
      title: `${d.name}. ${d.why}${o.reason ? ` ${o.reason}` : ''}`, onClick: () => dispatch(selectDisposal(d.id)),
    }, [h('strong', {}, [icon(d.icon, 14), ` ${d.plainName}`]), !o.valid && h('span', { class: 'small muted' }, `${shortReason(o.reason)}`)]);
  }));
}

const planetMeters = (m) => [
  { label: `Debris ${m.debris}/${PLANET_MAX.debris} (more = less junk)`, icon: 'satellite', level: level(m.debris, PLANET_MAX.debris) },
  { label: `Atmosphere ${m.atmosphere}/${PLANET_MAX.atmosphere}${m.kg ? ` (≈ ${num(m.kg, 1)} kg Al₂O₃, ${EMISSION_BADGE})` : ''}`, icon: 'cloud', level: level(m.atmosphere, PLANET_MAX.atmosphere) },
  { label: `Ground risk ${m.ground}/${PLANET_MAX.ground}`, icon: 'user', level: level(m.ground, PLANET_MAX.ground) },
];

/** The burn-up methods as main cards: planet meters + mass + power + PRICE ? (price marks via dataMarks). */
function comeDownCards(state, dispatch) {
  const current = state.design.components.eol;
  return COMPONENTS.filter((c) => c.category === 'eol').map((c) => {
    const hyp = { ...state, design: { ...state.design, disposalId: 'disp_burn_up', prep: { ...state.design.prep, disposal: true }, components: { ...state.design.components, eol: c.id } } };
    const r = computeResources(hyp);
    const o = r.planet.options.find((x) => x.id === 'disp_burn_up');
    const err = validateDesign(hyp, r).find((e) => e.severity === 'error' && e.gate === 'legal_safety_disposal_plan_pass');
    const massKg = c.autoSized ? r.mass.sail?.massKg ?? c.mass : c.mass;
    const selected = current === c.id;
    return choiceCard({
      key: `eol-${c.id}`, icon: c.icon, title: c.plainName, realTerm: c.name, oneLiner: c.oneLiner, whatFor: c.why, data: c,
      meters: planetMeters(o),
      // Mass + power only when there is any (no "0" noise); price marks come from dataMarks (PRICE ?).
      extra: (massKg || c.firePowerW) ? h('p', { class: 'small muted stat-line', title: 'Mass · power when firing' }, [massKg ? [icon('weight', 13), ` ${num(massKg, 2)} kg`] : '', massKg && c.firePowerW ? ' · ' : '', c.firePowerW ? [icon('power', 13), ` ${c.firePowerW} W`] : '']) : null,
      details: [['Mass', massKg ? `${num(massKg, 2)} kg${c.autoSized && r.mass.sail ? ` (${r.mass.sail.name}, sized for your satellite)` : ''}` : 'none'],
        ...(c.firePowerW ? [['Power', `${c.powerRangeW[0]}–${c.powerRangeW[1]} W (${c.firePowerW} W at full thrust)`], ['Thrust', `${c.thrustUN} µN · ${c.propellantG} g propellant · > ${c.totalImpulseNs.toLocaleString('en')} Ns`]] : []),
        ['Price', c.cost == null ? 'not public (?)' : c.cost === 0 ? 'free' : money(c.cost)]],
      selected, disabled: !!err && !selected, warn: !!err && selected, disabledReason: err ? `${err.message}` : '',
      why: c.why,
      onSelect: () => { dispatch(selectComponent('eol', c.id)); if (state.design.disposalId !== 'disp_burn_up') dispatch(selectDisposal('disp_burn_up')); },
    });
  });
}

/** Docking plate as a toggle card next to the options (PRICE ? MASS ? — not public, D07). */
function plateCard(state, dispatch, res) {
  const on = !!state.design.dockingPlate;
  return choiceCard({
    key: 'docking-plate', icon: DOCKING_PLATE.icon, title: DOCKING_PLATE.plainName, realTerm: DOCKING_PLATE.name,
    oneLiner: DOCKING_PLATE.oneLiner, whatFor: DOCKING_PLATE.why, data: DOCKING_PLATE,
    details: [['Mass', 'not public (?)'], ['Price', 'not public (?)'], ['Effect', 'better debris score; saves the debris points if the satellite is lost']],
    selected: on, why: `${DOCKING_PLATE.why} Mass and price not public (D07).`,
    onSelect: () => dispatch(toggleDockingPlate(!on)),
  });
}

export function render(container, state, dispatch) {
  const scenario = getScenario(state.scenarioId);
  const prep = state.design.prep ?? {};
  const isCube = getComponent(state.design.components.structure)?.formFactor === 'cubesat';
  const res = computeResources(state);
  const planet = res.planet;
  const burning = planet.strategyId === 'disp_burn_up' && planet.valid;
  const single = planet.options.filter((o) => o.valid).length === 1;
  mount(container,
    h('p', { class: 'step-hint', title: 'Real missions pass tests, licensing and a disposal plan before the Flight Readiness Review says GO.' }, ['Missing any = NO-GO. ', infoTerm('deorbit')]),
    h('div', { class: 'prep-list' }, PREP_ITEMS.filter((it) => it.id !== 'disposal').map((it) => {
      const done = !!prep[it.id];
      const cost = scenario && it.cost ? it.cost(scenario) : null;
      const more = () => [
        it.long, it.why,
        h('p', {}, [cost ? [`Budget line: ${cost[0]} ${money(cost[1])} `, dataBadge('model', { full: true }), ' · '] : '', sourceLinks(it.sources)]),
      ].filter(Boolean);
      // Item = icon + 2–4 words; the explanation is in the tooltip and the "?" popover.
      return h('label', { class: ['prep-item', done && 'done'], key: `prep-${it.id}`, title: `${it.long} ${it.why}` }, [
        h('input', { type: 'checkbox', checked: done, onChange: (e) => dispatch(togglePrep(it.id, e.target.checked)) }),
        h('strong', {}, [icon(it.icon, 16), ` ${it.title}`]),
        whyButton(it.title, more),
      ]);
    })),
    // Retirement: no choice is perfect — pick the best compromise (DISPOSAL.md).
    h('div', { class: 'subq' }, h('h2', {}, [icon('recycle', 18), ' How will it retire? ',
      whyButton('Why does retirement matter?', () => [...DISPOSAL_WHY, h('p', {}, sourceLinks(['D01', 'D03', 'D04']))])])),
    // Only one strategy possible (CubeSat in LEO → burn up; MEO → disposal orbit): show the strategies as a
    // compact row and make the real choice — HOW it comes down — the main cards.
    single ? strategyRow(state, dispatch, res) : retireCards(state, dispatch, res),
    planet.valid && planet.fleetKg != null && h('p', { class: 'small muted', title: 'Reentries in 2022 made ~17 t; full mega-constellations could make >360 t per year (D01, science estimate).' },
      `×${planet.fleet} If all ${planet.fleet} satellites burn up: ≈ ${num(planet.fleetKg, 1)} kg.`),
    isCube && burning && h('div', { class: 'subq' }, h('h2', { title: CATEGORY_PLAIN.eol.whatFor }, [icon('flame', 18), ' How will it come down?'])),
    h('div', { class: 'choices' }, [...(isCube && burning ? comeDownCards(state, dispatch) : []), plateCard(state, dispatch, res)]),
  );
}
