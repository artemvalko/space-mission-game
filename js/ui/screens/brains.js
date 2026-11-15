// Step 6 — Bus systems: the real choices are the computer and the pointing system (options §1.5, §1.8).
// Thermal + cables + sensors are one "included" line (no real alternatives in our data); the end-of-life
// choice is on Launch prep. Normal only; Easy uses the standard kit. Navigation: fixed inside the platform.

import { priceOf } from '../../engine/resources.js';
import { mount, h } from '../dom.js';
import { icon } from '../icons.js';
import { setKit } from '../../state/actions.js';
import { getScenario } from '../../data/scenarios.js';
import { KITS, FIXED_BUS, bundleTotals } from '../../data/bundles.js';
import { computeResources } from '../../engine/resources.js';
import { kg, money, num } from '../../utils/format.js';
import { subQuestion, componentCards } from './common.js';
import { getComponent } from '../../data/components.js';

const MASS_COST = [
  { label: 'Mass', icon: 'weight', value: (c) => c.mass },
  { label: 'Cost', icon: 'money', value: (c) => priceOf(c).value },
];

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const scenario = getScenario(state.scenarioId);
  const kitParts = scenario ? KITS[0].byMission[scenario.id] : null;
  const tot = kitParts ? bundleTotals(kitParts, scenario.id) : null;
  // Thermal control, cables and position sensors have no real alternatives in our data: one line.
  const fixed = FIXED_BUS.map((cat) => getComponent(state.design.components[cat])).filter(Boolean);
  const fixedKg = fixed.reduce((a, c) => a + (c.mass ?? 0), 0);
  mount(container,
    h('div', { class: 'step-hint' }, [
      h('button', { class: 'btn btn-small', type: 'button', key: 'use-standard-kit', title: tot ? `The research build list for this mission: ${kg(tot.mass)}, ${money(tot.cost)} (the sum of its parts).` : null, onClick: () => dispatch(setKit('standard')) },
        state.design.kit === 'standard' ? [icon('check', 14), ' Standard kit'] : 'Use standard kit'),
    ]),
    subQuestion('Computer', 'computer'),
    componentCards(state, dispatch, 'computer', MASS_COST, before),
    subQuestion('Pointing system', 'adcs'),
    componentCards(state, dispatch, 'adcs', MASS_COST, before),
    fixed.length > 0 && h('p', { class: 'muted small', title: fixed.map((c) => `${c.plainName} (${c.name}): ${kg(c.mass)}`).join(' · ') }, `Thermal + cables + sensors included: +${num(fixedKg, 2)} kg`),
  );
}
