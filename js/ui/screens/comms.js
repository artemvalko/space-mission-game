// Step 5 — Talking to Earth: the control radio (TT&C), the mission downlink and the ground segment.
// "Controlling the satellite" and "doing the mission" are different radios (research §7.1).

import { priceOf } from '../../engine/resources.js';
import { mount, h } from '../dom.js';
import { icon } from '../icons.js';
import { term, infoTerm } from '../tooltip.js';
import { choiceCard, previewDelta, priceCell } from '../card.js';
import { GROUND_STATIONS } from '../../data/groundStations.js';
import { matrixWhyNot } from '../../engine/dependencies.js';
import { getScenario } from '../../data/scenarios.js';
import { computeResources } from '../../engine/resources.js';
import { whyCard } from '../../engine/explain.js';
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
  // Which network serves this mission comes from the dependency matrix ('' = it fits).
  const groundWhyNot = (g) => (scenario ? matrixWhyNot(scenario.id, state.design.variantId, g.id) : '');
  const groundServes = (g) => !groundWhyNot(g);
  const groundCard = (g) => {
      const selected = state.design.groundId === g.id;
      const whyNot = groundWhyNot(g);
      const wrong = !!whyNot;
      return choiceCard({
        key: `gs-${g.id}`,
        icon: g.icon,
        title: g.plainName,
        realTerm: g.name,
        oneLiner: g.oneLiner,
        whatFor: g.description,
        disabled: wrong && !selected,
        disabledReason: 'Not built for this mission.',
        warn: wrong,
        badges: g.missions.includes(scenario?.id) ? ['Research build'] : [],
        details: [['Model cost', priceCell(g, scenario?.id)], ['Contact time', g.contactHoursPerDay ? `${g.contactHoursPerDay} h/day (example)` : 'not public — data link unverified']],
        data: g,
        selected,
        delta: selected ? null : `If chosen: ${previewDelta(state, selectGround(g.id), before2)}`,
        why: () => whyCard(g, { scenarioId: scenario?.id, variantId: state.design.variantId, whyNot, change: selected ? '' : previewDelta(state, selectGround(g.id), before2) }),
        onSelect: () => dispatch(selectGround(g.id)),
      });
  };
  mount(container,
    h('p', { class: 'step-hint', title: scenario?.data.kind === 'nav' ? 'For navigation, the L-band payload (Payload step) broadcasts the signal.' : 'The control radio commands the satellite; the mission radio sends its data down.' },
      [term('ttc', 'Control'), ' ≠ mission radio.']),
    !fixedRadios && subQuestion('Control radio', 'comms'),
    !fixedRadios && componentCards(state, dispatch, 'comms', [
      { label: 'Mass', icon: 'weight', value: (c) => c.mass },
      { label: 'Cost', icon: 'money', value: (c) => priceOf(c).value },
    ], before, { max: 2, compare: false }),
    needsDownlink && !fixedRadios && subQuestion('Mission downlink', 'downlink'),
    needsDownlink && !fixedRadios && componentCards(state, dispatch, 'downlink', [
      { label: 'Speed', icon: 'signal', value: (c) => c.rateMbps },
      { label: 'Mass', icon: 'weight', value: (c) => c.mass },
    ], before, { max: 2, compare: false }),
    fixedRadios && h('p', { class: 'muted small' }, scenario?.size === 'large' ? 'Radios are part of the navigation platform.' : 'Radios are part of the real satellite.'),
    state.design.groundId && (() => {
      const box = h('div', { class: 'map-box' });
      groundTrack(box, { orbitId: state.design.orbitId ?? scenario?.recommendedOrbits[0] ?? 'leo_550', groundId: state.design.groundId, mode: 'stations' });
      return h('details', { class: 'panel map-panel fold' }, [h('summary', {}, [icon('map', 16), ' Map']), box]);
    })(),
    h('div', { class: 'subq' }, h('h2', { title: 'Receives, checks and controls — on Earth.' }, [icon('dish', 18), ' Ground segment ', infoTerm('groundSegment')])),
    h('div', { class: 'choices' }, GROUND_STATIONS.filter((g) => groundServes(g) || g.id === state.design.groundId).map(groundCard)),
    GROUND_STATIONS.some((g) => !groundServes(g) && g.id !== state.design.groundId) && h('details', { class: 'fold' }, [
      h('summary', {}, `Other missions (${GROUND_STATIONS.filter((g) => !groundServes(g) && g.id !== state.design.groundId).length})`),
      h('div', { class: 'choices' }, GROUND_STATIONS.filter((g) => !groundServes(g) && g.id !== state.design.groundId).map(groundCard))]),
    compareToggle('comms', [...(fixedRadios ? [] : [...optionsFor(state, 'comms'), ...(needsDownlink ? optionsFor(state, 'downlink') : [])]), ...GROUND_STATIONS.filter((g) => groundServes(g))], scenario?.id),
  );
}
