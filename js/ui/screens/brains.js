// Step 6 — Bus systems: computer, pointing, thermal control, sensors, cables, and on-board
// propulsion where needed (Normal only; Easy uses the standard kit from the research build list).

import { mount, h } from '../dom.js';
import { setKit } from '../../state/actions.js';
import { getScenario } from '../../data/scenarios.js';
import { KITS, bundleTotals } from '../../data/bundles.js';
import { computeResources } from '../../engine/resources.js';
import { kg, money } from '../../utils/format.js';
import { subQuestion, componentCards, optionsFor } from './common.js';
import { CATEGORY_PLAIN } from '../../data/components.js';

const MASS_COST = [
  { label: 'Mass', symbol: '●', value: (c) => c.mass },
  { label: 'Cost', symbol: '$', value: (c) => c.cost },
];

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const scenario = getScenario(state.scenarioId);
  const kitParts = scenario ? KITS[0].byMission[scenario.id] : null;
  const tot = kitParts ? bundleTotals(kitParts, scenario.id) : null;
  const cats = [['computer', 'Computer'], ['adcs', 'Pointing system'], ['thermal', 'Thermal control'], ['sensors', 'Position & time sensors'], ['harness', 'Cables & integration'], ['propulsion', 'Thrusters'], ['propellant', 'Propellant']];
  mount(container,
    h('div', { class: 'step-hint' }, [
      h('button', { class: 'btn btn-small', type: 'button', key: 'use-standard-kit', title: tot ? `The research build list for this mission: ${kg(tot.mass)}, ${money(tot.cost)} (the sum of its parts).` : null, onClick: () => dispatch(setKit('standard')) },
        state.design.kit === 'standard' ? '✓ Standard kit' : 'Use standard kit'),
    ]),
    // A category with only a "leave it out" option for this frame (e.g. thrusters in LEO) becomes one line.
    ...cats.flatMap(([cat, title]) => (optionsFor(state, cat).length === 0 && !scenario?.requiredBus.includes(cat)
      ? [h('p', { class: 'muted small', title: CATEGORY_PLAIN[cat].noneWhy }, `${CATEGORY_PLAIN[cat].icon} ${title}: not needed here`)]
      : [subQuestion(title, cat), componentCards(state, dispatch, cat, MASS_COST, before)])),
  );
}
