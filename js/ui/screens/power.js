// Step 4 — Power: solar array + battery, with the eclipse explanation (research §3.3, §5.4, §8.2).
// Easy: one bundled power pack (sum of its research parts). Normal: array + battery separately.

import { priceOf } from '../../engine/resources.js';
import { mount, h } from '../dom.js';
import { icon } from '../icons.js';
import { term, infoTerm } from '../tooltip.js';
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
  // One visual line instead of a paragraph: sun = average power vs load · eclipse = shadow need vs usable battery.
  const okP = power.generation >= power.used;
  const okB = battery.needWh == null || (battery.usable != null && battery.needWh <= battery.usable);
  return h('div', { class: 'panel small', title: 'Average = array × time in sunlight × 0.8. The battery uses 60% of its charge in the shadow.' }, [
    h('span', { class: okP ? 'ok-text' : 'error-text' }, [icon('sun', 14), ` ${num(power.generation, 1)} W ${okP ? '≥' : '<'} `, icon('power', 14), ` ${watts(power.used)}`]), ' ', infoTerm('dutyCycle'),
    battery.needWh != null && battery.usable != null ? ['  ·  ', h('span', { class: okB ? 'ok-text' : 'error-text' }, [icon('eclipse', 14), ` ${num(battery.needWh, 1)} / ${wh(battery.usable)}`]), ' ', infoTerm('eclipse')] : '',
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
      meters: [],
      badges: own ? ['Research build'] : [],
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
  const hint = h('p', { class: 'step-hint', title: 'Only 60% of the battery is used, to keep it healthy.' }, [icon('sun', 14), ' Wings work in sunlight. ', icon('battery', 14), ' Battery covers the ', term('eclipse', 'shadow'), '.']);
  if (state.difficulty === 'easy') {
    mount(container, hint, eclipseNote(before), packCards(state, dispatch, before));
    return;
  }
  mount(container,
    hint, eclipseNote(before),
    subQuestion('Solar array + EPS', 'power'),
    componentCards(state, dispatch, 'power', [
      { label: 'Power', icon: 'power', value: (c) => c.arrayW },
      { label: 'Mass', icon: 'weight', value: (c) => c.mass },
      { label: 'Cost', icon: 'money', value: (c) => priceOf(c).value },
    ], before, { max: 4 }),
    subQuestion('Battery', 'battery'),
    componentCards(state, dispatch, 'battery', [
      { label: 'Storage', icon: 'battery', value: (c) => c.capacityWh },
      { label: 'Mass', icon: 'weight', value: (c) => c.mass },
    ], before, { max: 4 }),
  );
}
