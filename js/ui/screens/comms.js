// Step 5 — Talking to Earth: the control radio (TT&C), the mission downlink and the ground segment.
// "Controlling the satellite" and "doing the mission" are different radios (research §7.1).

import { mount, h } from '../dom.js';
import { term } from '../tooltip.js';
import { choiceCard, previewDelta } from '../card.js';
import { GROUND_STATIONS, GROUND_WHY_NOT } from '../../data/groundStations.js';
import { getScenario } from '../../data/scenarios.js';
import { computeResources } from '../../engine/resources.js';
import { whyGround, GROUND_WHY } from '../../engine/explain.js';
import { selectGround } from '../../state/actions.js';
import { money } from '../../utils/format.js';
import { groundTrack } from '../animations/groundTrack.js';
import { subQuestion, componentCards } from './common.js';

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const scenario = getScenario(state.scenarioId);
  const needsDownlink = scenario?.requiredBus.includes('downlink');

  mount(container,
    h('div', { class: 'panel small' }, [
      h('strong', {}, '📻 ≠ 📶 Two different radios. '),
      'The control radio (', term('ttc', 'TT&C'), ') lets the team command the satellite and check its health. The mission radio does the job itself: ',
      scenario?.data.kind === 'nav' ? 'for navigation, the L-band payload broadcasts the signal (chosen on the Mission payload step).' : 'it sends the mission\'s messages or measurements down to Earth.',
    ]),
    subQuestion('Control radio', 'comms'),
    componentCards(state, dispatch, 'comms', [
      { label: 'Mass', symbol: '●', value: (c) => c.mass },
      { label: 'Cost', symbol: '$', value: (c) => c.cost },
    ], before),
    needsDownlink && subQuestion('Mission downlink', 'downlink'),
    needsDownlink && componentCards(state, dispatch, 'downlink', [
      { label: 'Mass', symbol: '●', value: (c) => c.mass },
      { label: 'Cost', symbol: '$', value: (c) => c.cost },
    ], before),
    state.design.groundId && (() => {
      const box = h('div', { class: 'map-box' });
      groundTrack(box, { orbitId: state.design.orbitId ?? scenario?.recommendedOrbits[0] ?? 'leo_550', groundId: state.design.groundId, mode: 'stations' });
      return h('div', { class: 'panel map-panel' }, [h('strong', {}, `🗺️ Your ground segment: ${GROUND_STATIONS.find((g) => g.id === state.design.groundId).plainName} (illustration)`), box]);
    })(),
    subQuestion('Ground segment on Earth', null, h('span', { class: 'subq-real' }, ['Real term: ', term('groundSegment', 'Ground segment'), ' · What is it for? Receives, checks and controls — on Earth.'])),
    h('div', { class: 'choices' }, GROUND_STATIONS.map((g) => {
      const selected = state.design.groundId === g.id;
      const wrong = scenario && g.serves !== scenario.groundServes;
      const whyNot = wrong ? GROUND_WHY_NOT[g.serves]?.[scenario.groundServes] : '';
      return choiceCard({
        key: `gs-${g.id}`,
        icon: g.icon,
        title: g.plainName,
        realTerm: g.name,
        oneLiner: wrong ? `✗ ${whyNot}` : g.oneLiner,
        whatFor: wrong ? null : g.description.split('. ')[0] + '.',
        warn: wrong,
        badges: wrong ? ['Other mission'] : ['Research build ★'],
        details: [['Model cost', money(g.cost)], ...(g.contactHoursPerDay ? [['Contact (example)', `${g.contactHoursPerDay} h/day`]] : [])],
        data: g,
        selected,
        delta: selected ? null : `If chosen: ${previewDelta(state, selectGround(g.id), before)}`,
        why: wrong ? `${whyNot} ${GROUND_WHY}` : `${GROUND_WHY} ${whyGround(g)}`,
        onSelect: () => dispatch(selectGround(g.id)),
      });
    })),
  );
}
