// Step 5 — Talking to Earth: the radio on the satellite + the ground stations on Earth.

import { mount, h } from '../dom.js';
import { term } from '../tooltip.js';
import { choiceCard, levels, previewDelta } from '../card.js';
import { GROUND_STATIONS } from '../../data/groundStations.js';
import { getOrbit } from '../../data/orbits.js';
import { getScenario } from '../../data/scenarios.js';
import { computeResources } from '../../engine/resources.js';
import { whyGround, GROUND_WHY } from '../../engine/explain.js';
import { selectGround } from '../../state/actions.js';
import { money, num } from '../../utils/format.js';
import { groundTrack } from '../animations/groundTrack.js';
import { subQuestion, componentCards } from './common.js';

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const orbit = getOrbit(state.design.orbitId);
  const scenario = getScenario(state.scenarioId);
  const contact = levels(GROUND_STATIONS.map((g) => g.contactHours), { log: false });
  const cost = levels(GROUND_STATIONS.map((g) => g.opsCostPerYear));

  mount(container, 
    h('p', { class: 'step-hint' }, 'Your pictures only count once they reach Earth. A faster radio sends more per minute; more antennas on Earth give you more minutes.'),
    subQuestion('Radio on the satellite', 'comms'),
    componentCards(state, dispatch, 'comms', [
      { label: 'Speed', symbol: '📡', value: (c) => c.rateMbps },
      { label: 'Power use', symbol: '⚡', value: (c) => c.power },
      { label: 'Cost', symbol: '$', value: (c) => c.cost },
    ], before),
    state.design.groundId && (() => {
      const box = h('div', { class: 'map-box' });
      groundTrack(box, { orbitId: state.design.orbitId ?? 'leo', groundId: state.design.groundId, mode: 'stations' });
      return h('div', { class: 'panel map-panel' }, [h('strong', {}, `🗺️ Your antennas: ${GROUND_STATIONS.find((g) => g.id === state.design.groundId).plainName}`), box]);
    })(),
    subQuestion('Ground stations on Earth', null, h('span', { class: 'subq-real' }, ['Real term: ', term('groundSegment', 'Ground segment')])),
    h('div', { class: 'choices' }, GROUND_STATIONS.map((g, i) => {
      const selected = state.design.groundId === g.id;
      const cannotReach = orbit?.requiresDeepSpaceGround && !g.deepSpace;
      const hours = orbit && !cannotReach ? Math.min(24, g.contactHours * orbit.contactFactor) : null;
      return choiceCard({
        key: `gs-${g.id}`,
        icon: g.icon,
        title: g.plainName,
        realTerm: g.name,
        oneLiner: cannotReach ? `✗ Can't hear a satellite at ${orbit.plainName}.` : g.oneLiner,
        warn: cannotReach,
        badges: [...(g.deepSpace ? ['Deep space'] : [])],
        meters: [
          { label: 'Contact', symbol: '⏱', level: contact[i] },
          { label: 'Reach', symbol: '🌍', level: g.deepSpace ? 3 : 1 },
          { label: 'Cost/year', symbol: '$', level: cost[i] },
        ],
        details: [['Contact per day', hours == null ? `${num(g.contactHours)} h (base)` : `${num(hours, 1)} h at your orbit`],
          ['Cost per year', money(g.opsCostPerYear)], ['Mission total', money(g.opsCostPerYear * (scenario?.minLifetimeYears ?? 0))]],
        selected,
        delta: selected ? null : `If chosen: ${previewDelta(state, selectGround(g.id), before)}`,
        why: `${GROUND_WHY} ${whyGround(g, orbit)}`,
        onSelect: () => dispatch(selectGround(g.id)),
      });
    })),
  );
}
