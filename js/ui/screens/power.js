// Step 4 — Power. Easy: one bundled "Power pack" choice. Normal: power source + battery.

import { mount, h } from '../dom.js';
import { choiceCard, levels, previewDelta } from '../card.js';
import { POWER_PACKS } from '../../data/bundles.js';
import { getComponent, isCubeSat } from '../../data/components.js';
import { computeResources } from '../../engine/resources.js';
import { CATEGORY_WHY } from '../../engine/explain.js';
import { selectPowerPack } from '../../state/actions.js';
import { kg, watts, wh, money } from '../../utils/format.js';
import { subQuestion, componentCards } from './common.js';

function packCards(state, dispatch, before) {
  const cube = isCubeSat(getComponent(state.design.components.structure));
  const parts = POWER_PACKS.map((p) => {
    const set = (cube ? p.cubesat : p.standard) ?? p.standard;
    return { power: getComponent(set.power), battery: getComponent(set.battery) };
  });
  const out = levels(parts.map((x) => x.power.outputW));
  const weight = levels(parts.map((x) => x.power.mass + x.battery.mass));
  const cost = levels(parts.map((x) => x.power.cost + x.battery.cost));
  return h('div', { class: 'choices' }, POWER_PACKS.map((p, i) => {
    const x = parts[i];
    const selected = state.design.powerPack === p.id;
    const disabled = cube && !p.cubesat;
    return choiceCard({
      key: `pack-${p.id}`,
      icon: p.icon,
      title: p.plainName,
      realTerm: `${x.power.plainName} + ${x.battery.plainName.toLowerCase()}`,
      oneLiner: cube && p.cubesat ? 'Mini solar wings + CubeSat battery. Just right for a CubeSat.' : p.oneLiner,
      meters: [
        { label: 'Power', symbol: '⚡', level: out[i] },
        { label: 'Weight', symbol: '●', level: weight[i] },
        { label: 'Cost', symbol: '$', level: cost[i] },
      ],
      details: [['Solar output (full sun)', watts(x.power.outputW)], ['Battery', wh(x.battery.capacityWh)],
        ['Weight', kg(x.power.mass + x.battery.mass)], ['Cost', money(x.power.cost + x.battery.cost)]],
      selected,
      disabled,
      disabledReason: '✗ A CubeSat only has room for the small pack.',
      delta: selected ? null : `If chosen: ${previewDelta(state, selectPowerPack(p.id), before)}`,
      why: `${CATEGORY_WHY.power} ${CATEGORY_WHY.battery}`,
      onSelect: () => dispatch(selectPowerPack(p.id)),
    });
  }));
}

export function render(container, state, dispatch) {
  const before = computeResources(state);
  if (state.difficulty === 'easy') {
    mount(container, 
      h('p', { class: 'step-hint' }, 'Solar panels make electricity in sunlight; the battery keeps everything running in the planet\'s shadow.'),
      packCards(state, dispatch, before),
    );
    return;
  }
  mount(container, 
    subQuestion('Power source', 'power'),
    componentCards(state, dispatch, 'power', [
      { label: 'Power', symbol: '⚡', value: (c) => c.outputW },
      { label: 'Weight', symbol: '●', value: (c) => c.mass },
      { label: 'Cost', symbol: '$', value: (c) => c.cost },
    ], before),
    subQuestion('Battery', 'battery'),
    componentCards(state, dispatch, 'battery', [
      { label: 'Storage', symbol: '🔋', value: (c) => c.capacityWh },
      { label: 'Weight', symbol: '●', value: (c) => c.mass },
      { label: 'Cost', symbol: '$', value: (c) => c.cost },
    ], before),
  );
}
