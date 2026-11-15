// Step 6 — Bus systems: computer, pointing, thermal control, sensors, cables, and on-board
// propulsion where needed (Normal only; Easy uses the standard kit from the research build list).

import { mount, h } from '../dom.js';
import { setKit } from '../../state/actions.js';
import { getScenario } from '../../data/scenarios.js';
import { KITS, bundleTotals } from '../../data/bundles.js';
import { computeResources } from '../../engine/resources.js';
import { kg, money } from '../../utils/format.js';
import { subQuestion, componentCards } from './common.js';

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
      'Not sure? ',
      h('button', { class: 'btn btn-small', type: 'button', key: 'use-standard-kit', onClick: () => dispatch(setKit('standard')) },
        state.design.kit === 'standard' ? '✓ Using the standard kit' : 'Use the standard kit'),
      tot ? ` — the research build list for this mission (${kg(tot.mass)}, ${money(tot.cost)}: the sum of its parts).` : '',
    ]),
    ...cats.flatMap(([cat, title]) => [subQuestion(title, cat), componentCards(state, dispatch, cat, MASS_COST, before)]),
  );
}
