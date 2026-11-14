// Step 6 — Brains & steering: computer + pointing system + thrusters (Normal only;
// Easy uses an automatic "Standard kit" and skips this step).

import { mount, h } from '../dom.js';
import { setKit } from '../../state/actions.js';
import { computeResources } from '../../engine/resources.js';
import { subQuestion, componentCards } from './common.js';

export function render(container, state, dispatch) {
  const before = computeResources(state);
  mount(container, 
    h('div', { class: 'step-hint' }, [
      'Not sure? ',
      h('button', { class: 'btn btn-small', type: 'button', key: 'use-standard-kit', onClick: () => dispatch(setKit('standard')) },
        state.design.kit === 'standard' ? '✓ Using the standard kit' : 'Use the standard kit'),
      ' — a sensible computer, steady pointing and thrusters strong enough for your orbit.',
    ]),
    subQuestion('Computer', 'computer'),
    componentCards(state, dispatch, 'computer', [
      { label: 'Toughness', symbol: '🛡', value: (c) => c.reliability, log: false },
      { label: 'Memory', symbol: '▣', value: (c) => c.storageGB },
      { label: 'Cost', symbol: '$', value: (c) => c.cost },
    ], before),
    subQuestion('Pointing system', 'adcs'),
    componentCards(state, dispatch, 'adcs', [
      { label: 'Sharpness', symbol: '🎯', value: (c) => c.scienceBonus, log: false },
      { label: 'Power use', symbol: '⚡', value: (c) => c.power },
      { label: 'Cost', symbol: '$', value: (c) => c.cost },
    ], before),
    subQuestion('Thrusters', 'propulsion'),
    componentCards(state, dispatch, 'propulsion', [
      { label: 'Push', symbol: '💨', value: (c) => c.deltaV },
      { label: 'Weight', symbol: '●', value: (c) => c.mass },
      { label: 'Cost', symbol: '$', value: (c) => c.cost },
    ], before),
  );
}
