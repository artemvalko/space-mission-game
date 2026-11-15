// Step 9 — Launch prep checklist (research §11.1, §6.3 step 9): tests, frequency licence / ITU
// coordination, debris-mitigation / disposal plan. Missing items = NO-GO.

import { mount, h } from '../dom.js';
import { term } from '../tooltip.js';
import { dataBadge, sourceLinks } from '../card.js';
import { getScenario } from '../../data/scenarios.js';
import { togglePrep } from '../../state/actions.js';
import { money } from '../../utils/format.js';

export const PREP_ITEMS = [
  {
    id: 'tests', icon: '🧪', title: 'Test the satellite: vibration, thermal-vacuum, EMC',
    why: 'Launch shakes everything; space is a hot-and-cold vacuum; radios must not disturb each other. Untested hardware is not allowed on a rocket.',
    cost: (sc) => ['Design, software, assembly & tests (AIT)', sc.costModel.ait], sources: ['S01', 'S17'],
  },
  {
    id: 'licence', icon: '📜', title: 'Get a frequency licence (national licence + ITU coordination)',
    why: 'Radio frequencies cannot be picked freely — IoT, navigation and weather links all need a licence and international coordination.',
    cost: (sc) => ['Frequency licence, regulation, EMC', sc.costModel.licensing], sources: ['S20'],
  },
  {
    id: 'disposal', icon: '♻️', title: 'Write a debris-mitigation / disposal plan',
    why: 'Every mission must end safely, without leaving junk. Example: US FCC rules ask listed LEO systems to dispose within 5 years after the mission — rules differ by country and orbit.',
    cost: null, sources: ['S22'],
  },
];

export function render(container, state, dispatch) {
  const scenario = getScenario(state.scenarioId);
  const prep = state.design.prep ?? {};
  const needsProp = scenario?.requiredBus.includes('propulsion');
  mount(container,
    h('p', { class: 'step-hint' }, ['Launching is not just hardware. Real missions pass tests, licensing and a ', term('deorbit', 'disposal plan'), ' before a Flight Readiness Review says GO. Missing items = NO-GO.']),
    h('div', { class: 'prep-list' }, PREP_ITEMS.map((it) => {
      const done = !!prep[it.id];
      const cost = scenario && it.cost ? it.cost(scenario) : null;
      return h('label', { class: ['prep-item', done && 'done'], key: `prep-${it.id}` }, [
        h('input', { type: 'checkbox', checked: done, onChange: (e) => dispatch(togglePrep(it.id, e.target.checked)) }),
        h('div', {}, [
          h('div', {}, h('strong', {}, `${it.icon} ${it.title}`)),
          h('div', { class: 'small' }, it.why),
          it.id === 'disposal' && needsProp && h('div', { class: 'small muted' }, 'In MEO the air never pulls the satellite down: the plan needs the satellite\'s own thrusters and propellant.'),
          h('div', { class: 'small muted' }, [cost ? [`Budget line: ${cost[0]} ${money(cost[1])} `, dataBadge('model'), ' · '] : '', sourceLinks(it.sources)]),
        ]),
      ]);
    })),
    h('p', { class: 'muted small' }, 'Next: the Final check — the Flight Readiness Review with every hard gate, the full cost table and the GO / NO-GO vote.'),
  );
}
