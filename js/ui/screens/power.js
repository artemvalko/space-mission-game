// Step 4 — Power: solar array + battery, with the eclipse explanation (research §3.3, §5.4, §8.2).
// Easy: one bundled power pack (sum of its research parts). Normal: array + battery separately.

import { mount, h } from '../dom.js';
import { term } from '../tooltip.js';
import { choiceCard, previewDelta } from '../card.js';
import { POWER_PACKS, bundleTotals } from '../../data/bundles.js';
import { getComponent, isCubeSat } from '../../data/components.js';
import { computeResources } from '../../engine/resources.js';
import { selectPowerPack } from '../../state/actions.js';
import { kg, watts, wh, money, num } from '../../utils/format.js';
import { subQuestion, componentCards } from './common.js';

function eclipseNote(res) {
  const { power, battery } = res;
  if (power.generation == null) return null;
  return h('div', { class: 'panel small' }, [
    h('strong', {}, '☀️ Sunlight vs 🌑 shadow — '),
    `average power ${num(power.generation, 2)} W for a ${watts(power.used)} load`,
    battery.needWh != null && battery.usable != null ? `; shadow needs ${num(battery.needWh, 2)} Wh of ${wh(battery.usable)} usable` : '',
    '. ', term('dutyCycle', 'Why an average?'), ' · ', term('eclipse', 'What is an eclipse?'),
  ]);
}

function packCards(state, dispatch, before) {
  const structure = getComponent(state.design.components.structure);
  const cube = structure ? isCubeSat(structure) : null;
  const packs = POWER_PACKS.filter((p) => cube == null || (p.formFactor === 'cubesat') === cube);
  return h('div', { class: 'choices' }, packs.map((p) => {
    const array = getComponent(p.parts.power);
    const battery = getComponent(p.parts.battery);
    const tot = bundleTotals(p.parts, state.scenarioId);
    const selected = state.design.powerPack === p.id;
    const own = p.missions.includes(state.scenarioId);
    return choiceCard({
      key: `pack-${p.id}`,
      icon: p.icon,
      title: p.plainName,
      realTerm: `${array.name}${battery ? ` + ${battery.name}` : ''}`,
      oneLiner: p.oneLiner,
      whatFor: 'Solar wings make electricity in sunlight; the battery keeps the satellite alive in Earth\'s shadow.',
      badges: own ? ['Research build ★'] : [],
      details: [['Array (full sun)', watts(array.arrayW)], ['Battery', battery ? wh(battery.capacityWh) : 'none'],
        ['Mass (sum of parts)', kg(tot.mass)], ['Cost (sum of parts)', money(tot.cost)]],
      data: array,
      selected,
      warn: selected && p.trap,
      delta: selected ? null : `If chosen: ${previewDelta(state, selectPowerPack(p.id), before)}`,
      why: p.trap ? 'In sunlight there is enough power, but in the shadow the satellite switches off (research §7.3 "power_only_peak").' : `${array.why} ${battery?.why ?? ''}`,
      onSelect: () => dispatch(selectPowerPack(p.id)),
    });
  }));
}

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const hint = h('p', { class: 'step-hint' }, ['Solar wings only work in sunlight. In Earth\'s shadow (', term('eclipse', 'eclipse'), ') the battery must carry the load — and only 60% of it is used, to keep it healthy.']);
  if (state.difficulty === 'easy') {
    mount(container, hint, eclipseNote(before), packCards(state, dispatch, before));
    return;
  }
  mount(container,
    hint, eclipseNote(before),
    subQuestion('Solar array + EPS', 'power'),
    componentCards(state, dispatch, 'power', [
      { label: 'Power', symbol: '⚡', value: (c) => c.arrayW },
      { label: 'Mass', symbol: '●', value: (c) => c.mass },
      { label: 'Cost', symbol: '$', value: (c) => c.cost },
    ], before),
    subQuestion('Battery', 'battery'),
    componentCards(state, dispatch, 'battery', [
      { label: 'Storage', symbol: '🔋', value: (c) => c.capacityWh },
      { label: 'Mass', symbol: '●', value: (c) => c.mass },
      { label: 'Cost', symbol: '$', value: (c) => c.cost },
    ], before),
  );
}
