// Step 9 — Launch prep checklist (research §11.1, §6.3 step 9): tests, frequency licence / ITU
// coordination, debris-mitigation / disposal plan. Missing items = NO-GO.

import { mount, h } from '../dom.js';
import { term, whyButton } from '../tooltip.js';
import { dataBadge, sourceLinks } from '../card.js';
import { getScenario } from '../../data/scenarios.js';
import { togglePrep } from '../../state/actions.js';
import { money } from '../../utils/format.js';
import { getComponent, CATEGORY_PLAIN } from '../../data/components.js';
import { computeResources } from '../../engine/resources.js';
import { componentCards } from './common.js';

export const PREP_ITEMS = [
  {
    id: 'tests', icon: '🧪', title: 'Shake, heat & radio tests', long: 'Test the satellite: vibration, thermal-vacuum, EMC.',
    why: 'Launch shakes everything; space is a hot-and-cold vacuum; radios must not disturb each other. Untested hardware is not allowed on a rocket.',
    cost: (sc) => ['Design, software, assembly & tests (AIT)', sc.costModel.ait], sources: ['S01', 'S17'],
  },
  {
    id: 'licence', icon: '📜', title: 'Frequency licence', long: 'Get a frequency licence (national licence + ITU coordination).',
    why: 'Radio frequencies cannot be picked freely — IoT, navigation and weather links all need a licence and international coordination.',
    cost: (sc) => ['Frequency licence, regulation, EMC', sc.costModel.licensing], sources: ['S20'],
  },
  {
    id: 'disposal', icon: '♻️', title: 'Disposal plan', long: 'Write a debris-mitigation / disposal plan.',
    why: 'Every mission must end safely, without leaving junk. Example: US FCC rules ask listed LEO systems to dispose within 5 years after the mission — rules differ by country and orbit.',
    cost: null, sources: ['S22'],
  },
];

export function render(container, state, dispatch) {
  const scenario = getScenario(state.scenarioId);
  const prep = state.design.prep ?? {};
  const needsProp = scenario?.requiredBus.includes('propulsion');
  const isCube = getComponent(state.design.components.structure)?.formFactor === 'cubesat';
  mount(container,
    h('p', { class: 'step-hint', title: 'Real missions pass tests, licensing and a disposal plan before the Flight Readiness Review says GO.' }, ['Missing any = NO-GO. ', term('deorbit', 'ⓘ')]),
    h('div', { class: 'prep-list' }, PREP_ITEMS.map((it) => {
      const done = !!prep[it.id];
      const cost = scenario && it.cost ? it.cost(scenario) : null;
      const more = () => [
        it.long, it.why,
        it.id === 'disposal' && needsProp ? 'In MEO the air never pulls the satellite down: the plan needs the satellite\'s own thrusters and propellant.' : '',
        h('p', {}, [cost ? [`Budget line: ${cost[0]} ${money(cost[1])} `, dataBadge('model', { full: true }), ' · '] : '', sourceLinks(it.sources)]),
      ].filter(Boolean);
      // Item = icon + 2–4 words; the explanation is in the tooltip and the "?" popover.
      return h('label', { class: ['prep-item', done && 'done'], key: `prep-${it.id}`, title: `${it.long} ${it.why}` }, [
        h('input', { type: 'checkbox', checked: done, onChange: (e) => dispatch(togglePrep(it.id, e.target.checked)) }),
        h('strong', {}, `${it.icon} ${it.title}`),
        whyButton(it.title, more),
      ]);
    })),
    // The disposal plan becomes a real choice for CubeSats in LEO (options §1.9).
    isCube && h('div', { class: 'subq' }, h('h2', { title: CATEGORY_PLAIN.eol.whatFor }, ['♻️ How will it end? ', term('deorbit', 'ⓘ')])),
    isCube && componentCards(state, dispatch, 'eol', [{ label: 'Mass', symbol: '●', value: (c) => c.mass ?? 0 }], computeResources(state), { max: 3 }),
  );
}
