// Step 5 — Talking to Earth: the control radio (TT&C), the mission downlink and the ground segment.
// "Controlling the satellite" and "doing the mission" are different radios (research §7.1).

import { mount, h } from '../dom.js';
import { term } from '../tooltip.js';
import { choiceCard, previewDelta } from '../card.js';
import { GROUND_STATIONS, GROUND_WHY_NOT, groundServes } from '../../data/groundStations.js';
import { getScenario } from '../../data/scenarios.js';
import { computeResources } from '../../engine/resources.js';
import { whyGround, GROUND_WHY } from '../../engine/explain.js';
import { selectGround } from '../../state/actions.js';
import { money } from '../../utils/format.js';
import { groundTrack } from '../animations/groundTrack.js';
import { subQuestion, componentCards, compareToggle, optionsFor } from './common.js';
import { getComponent } from '../../data/components.js';

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const scenario = getScenario(state.scenarioId);
  const needsDownlink = scenario?.requiredBus.includes('downlink');
  // Navigation platform and reference builds: the radios come with the satellite.
  const fixedRadios = scenario?.size === 'large' || !!getComponent(state.design.components.structure)?.reference;

  const before2 = before;
  const groundCard = (g) => {
      const selected = state.design.groundId === g.id;
      const wrong = scenario && !groundServes(g, scenario.groundServes);
      const whyNot = wrong ? GROUND_WHY_NOT[[g.serves].flat()[0]]?.[scenario.groundServes] ?? 'Not built for this mission.' : '';
      return choiceCard({
        key: `gs-${g.id}`,
        icon: g.icon,
        title: g.plainName,
        realTerm: g.name,
        oneLiner: g.oneLiner,
        whatFor: g.description,
        disabled: wrong && !selected,
        disabledReason: '✗ Not built for this mission.',
        warn: wrong,
        badges: g.missions.includes(scenario?.id) ? ['Research build ★'] : [],
        details: [['Model cost', money(g.cost)], ...(g.contactHoursPerDay ? [['Contact (example)', `${g.contactHoursPerDay} h/day`]] : [])],
        data: g,
        selected,
        delta: selected ? null : `If chosen: ${previewDelta(state, selectGround(g.id), before2)}`,
        why: wrong ? `${whyNot} ${GROUND_WHY}` : `${GROUND_WHY} ${whyGround(g)}`,
        onSelect: () => dispatch(selectGround(g.id)),
      });
  };
  mount(container,
    h('p', { class: 'step-hint', title: scenario?.data.kind === 'nav' ? 'For navigation, the L-band payload (Payload step) broadcasts the signal.' : 'The control radio commands the satellite; the mission radio sends its data down.' },
      ['📻 ', term('ttc', 'Control'), ' ≠ 📶 mission radio.']),
    !fixedRadios && subQuestion('Control radio', 'comms'),
    !fixedRadios && componentCards(state, dispatch, 'comms', [
      { label: 'Mass', symbol: '●', value: (c) => c.mass },
      { label: 'Cost', symbol: '$', value: (c) => c.cost },
    ], before, { max: 2, compare: false }),
    needsDownlink && !fixedRadios && subQuestion('Mission downlink', 'downlink'),
    needsDownlink && !fixedRadios && componentCards(state, dispatch, 'downlink', [
      { label: 'Speed', symbol: '📶', value: (c) => c.rateMbps },
      { label: 'Mass', symbol: '●', value: (c) => c.mass },
    ], before, { max: 2, compare: false }),
    fixedRadios && h('p', { class: 'muted small' }, scenario?.size === 'large' ? '📻 Radios are part of the navigation platform.' : '📻 Radios are part of the real satellite.'),
    state.design.groundId && (() => {
      const box = h('div', { class: 'map-box' });
      groundTrack(box, { orbitId: state.design.orbitId ?? scenario?.recommendedOrbits[0] ?? 'leo_550', groundId: state.design.groundId, mode: 'stations' });
      return h('details', { class: 'panel map-panel fold' }, [h('summary', {}, '🗺️ Map'), box]);
    })(),
    h('div', { class: 'subq' }, h('h2', { title: 'Receives, checks and controls — on Earth.' }, ['🌍 Ground segment ', term('groundSegment', 'ⓘ')])),
    h('div', { class: 'choices' }, GROUND_STATIONS.filter((g) => groundServes(g, scenario?.groundServes) || g.id === state.design.groundId).map(groundCard)),
    GROUND_STATIONS.some((g) => !groundServes(g, scenario?.groundServes) && g.id !== state.design.groundId) && h('details', { class: 'fold' }, [
      h('summary', {}, `✗ Other missions (${GROUND_STATIONS.filter((g) => !groundServes(g, scenario?.groundServes) && g.id !== state.design.groundId).length})`),
      h('div', { class: 'choices' }, GROUND_STATIONS.filter((g) => !groundServes(g, scenario?.groundServes) && g.id !== state.design.groundId).map(groundCard))]),
    compareToggle('comms', [...(fixedRadios ? [] : [...optionsFor(state, 'comms'), ...(needsDownlink ? optionsFor(state, 'downlink') : [])]), ...GROUND_STATIONS.filter((g) => groundServes(g, scenario?.groundServes))], scenario?.id),
  );
}
