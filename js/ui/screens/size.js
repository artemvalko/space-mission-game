// Step 2 — Satellite size: CubeSat / Small / Medium / Large (the structure).

import { mount, h } from '../dom.js';
import { choiceCard, levels, previewDelta } from '../card.js';
import { SIZE_CLASSES, getComponent, sizeClassOf } from '../../data/components.js';
import { getScenario } from '../../data/scenarios.js';
import { computeResources } from '../../engine/resources.js';
import { whyComponent, CATEGORY_WHY } from '../../engine/explain.js';
import { selectComponent } from '../../state/actions.js';
import { kg, money, months, pct } from '../../utils/format.js';
import { subQuestion } from './common.js';

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const scenario = getScenario(state.scenarioId);
  const currentId = state.design.components.structure;
  const currentClass = sizeClassOf(currentId);
  const reps = SIZE_CLASSES.map((sc) => getComponent(sc.structures.includes(currentId) ? currentId : sc.defaultStructure));
  const weight = levels(reps.map((c) => c.mass));
  const cost = levels(reps.map((c) => c.cost));
  const room = levels(reps.map((c) => c.maxPayloadMass));

  mount(container, 
    subQuestion('Satellite frame', 'structure'),
    h('div', { class: 'choices' }, SIZE_CLASSES.map((sc, i) => {
      const c = reps[i];
      const selected = currentClass?.id === sc.id;
      return choiceCard({
        key: `size-${sc.id}`,
        icon: sc.icon,
        title: sc.plainName,
        realTerm: c.name,
        oneLiner: c.oneLiner,
        badges: scenario?.recommendedSize === sc.id ? ['Recommended ★'] : [],
        meters: [
          { label: 'Weight', symbol: '●', level: weight[i] },
          { label: 'Cost', symbol: '$', level: cost[i] },
          { label: 'Room for tools', symbol: '▣', level: room[i] },
        ],
        extra: selected && sc.structures.length > 1
          ? h('div', { class: 'mini-options no-select', role: 'radiogroup', 'aria-label': 'CubeSat size' }, sc.structures.map((id) => {
            const s = getComponent(id);
            return h('button', {
              type: 'button', class: ['mini', id === currentId && 'active'], key: `cube-${id}`, 'aria-pressed': id === currentId ? 'true' : 'false',
              onClick: () => dispatch(selectComponent('structure', id)),
            }, s.plainName.replace('CubeSat ', ''));
          }))
          : null,
        details: [['Weight', kg(c.mass)], ['Carries up to', kg(c.maxPayloadMass)], ['Cost', money(c.cost)], ['Build time', months(c.devMonths)], ['Reliability', pct(c.reliability, 1)]],
        selected,
        delta: selected ? null : `If chosen: ${previewDelta(state, selectComponent('structure', c.id), before)}`,
        why: `${CATEGORY_WHY.structure} ${whyComponent(c)}`,
        onSelect: () => dispatch(selectComponent('structure', c.id)),
      });
    })),
  );
}
