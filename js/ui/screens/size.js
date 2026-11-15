// Step 2 — Satellite size / platform: real frames (part by part) and Reference builds (a complete real
// satellite whose total mass is public). Up to 4 cards up front; the rest under "+N more".
// Impossible sizes stay visible but greyed with an honest one-line reason (research §6.3, §7.2).

import { mount, h } from '../dom.js';
import { choiceCard, levels, previewDelta } from '../card.js';
import { SIZE_CLASSES, sizeClassOf, structureFor, isCubeSat } from '../../data/components.js';
import { getScenario } from '../../data/scenarios.js';
import { computeResources } from '../../engine/resources.js';
import { whyComponent } from '../../engine/explain.js';
import { selectComponent } from '../../state/actions.js';
import { kg, money } from '../../utils/format.js';
import { compareToggle } from './common.js';

// Which size classes each mission shows up front (the rest fold under "+N more").
const FRONT = {
  mission_comms_iot: ['6u', 'ref_sateliot', 'ref_astrocast', 'ref_swarm'],
  mission_weather_mw: ['6u', 'ref_tropics', 'ref_raincube', '12u'],
  mission_navigation_meo: ['large', 'ref_gps'],
};

/** Honest reason why a size does not fit this mission ('' = it fits). */
export function sizeWhyNot(scenario, sc) {
  if (!scenario) return '';
  const st = structureFor(sc, scenario.id);
  if (st.reference) return st.missions.includes(scenario.id) ? '' : 'Built for another mission.';
  if (scenario.size === 'large') return sc.id === 'large' ? '' : 'A navigation node needs hundreds of kg.';
  if (sc.id === 'large') return 'Overkill for a CubeSat job.';
  if (sc.id === '3u') return scenario.id === 'mission_weather_mw' ? 'Too small: the 4U radiometer won\'t fit.' : 'Too small: ~8.7 kg vs 6 kg limit.';
  return '';
}

/** The full honest reason behind sizeWhyNot (shown under "?"). */
const SIZE_WHY_LONG = {
  large: 'A Galileo- or GPS-class node is a 700–3,681 kg satellite: atomic clocks and an L-band payload will never fit a CubeSat. (ESA Celeste tests navigation signals from a 12U in LEO — a different mission.)',
  overkill: 'Overkill: a ~700 kg bus for a job a CubeSat can do (research §7.2).',
  '3u_wx': 'The 4U radiometer cannot fit in 3U. NASA TROPICS fits a different, 1U radiometer in a 3U — try the TROPICS reference build.',
  '3u': 'The research build (~8.7 kg with reserve) is over the typical 3U limit of 6 kg (CubeSat spec, S01). Astrocast is a real 3U at ~4.5 kg — try its reference build.',
  other: 'This real satellite was built for a different job.',
};
function sizeWhyLong(scenario, sc) {
  if (structureFor(sc, scenario.id).reference) return SIZE_WHY_LONG.other;
  if (scenario.size === 'large') return SIZE_WHY_LONG.large;
  if (sc.id === 'large') return SIZE_WHY_LONG.overkill;
  return scenario.id === 'mission_weather_mw' ? SIZE_WHY_LONG['3u_wx'] : SIZE_WHY_LONG['3u'];
}

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const scenario = getScenario(state.scenarioId);
  const currentId = state.design.components.structure;
  const currentClass = sizeClassOf(currentId);
  // Reference builds of other missions are hidden; everything else is shown (greyed if impossible).
  const classes = SIZE_CLASSES.filter((sc) => !sc.reference || structureFor(sc, scenario?.id).missions.includes(scenario?.id));
  const reps = classes.map((sc) => structureFor(sc, scenario?.id));
  const massOfRep = (c) => c.reference?.totalMassKg ?? c.maxMassKg ?? c.targetMassKg ?? 1;
  const weight = levels(reps.map(massOfRep));

  const card = (sc) => {
    const i = classes.indexOf(sc);
    const c = reps[i];
    const selected = currentClass?.id === sc.id;
    const why = sizeWhyNot(scenario, sc);
    return choiceCard({
      key: `size-${sc.id}`,
      icon: sc.icon,
      title: c.reference ? c.plainName : sc.plainName,
      realTerm: c.name,
      oneLiner: c.oneLiner,
      whatFor: c.why,
      badges: [...(scenario && !why && c.missions.includes(scenario.id) && !c.reference ? ['Research build ★'] : [])],
      meters: [{ label: c.reference ? 'Real total mass' : 'Mass limit', symbol: '●', level: weight[i] }],
      details: c.reference
        ? [['Real total mass', c.reference.massText], ['What it includes', 'its own bus and payload — you still choose orbit, rocket, ground and launch prep'], ...(c.reference.fleet ? [['Constellation', `${c.reference.fleet} satellites planned`]] : []), ...(c.reference.designLifeYears ? [['Design life', `${c.reference.designLifeYears} years`]] : []), ['Price', 'not public (?)']]
        : [[isCubeSat(c) ? 'Mass limit (CubeSat spec)' : 'Launch mass target', c.maxMassKg ?? c.targetMassKg ? kg(c.maxMassKg ?? c.targetMassKg) : 'not public (?)'],
          ['Frame mass', c.mass == null ? 'not public (?)' : kg(c.mass)],
          ['Frame price', c.cost == null ? 'not public (?)' : money(c.cost)],
          ...(c.costText ? [['Price sources', c.costText]] : []),
          ...(c.units ? [['Room', `${c.units} units (10 cm cubes)`]] : [])],
      data: c,
      selected,
      disabled: !!why && !selected,
      warn: !!why && selected,
      disabledReason: `✗ ${why}`,
      delta: selected || why ? null : `If chosen: ${previewDelta(state, selectComponent('structure', c.id), before)}`,
      why: why ? sizeWhyLong(scenario, sc) : whyComponent(c, scenario?.id),
      whyTitle: why ? `Why not ${sc.plainName}?` : sc.plainName,
      onSelect: () => dispatch(selectComponent('structure', c.id)),
    });
  };
  const frontIds = FRONT[scenario?.id] ?? classes.map((sc) => sc.id);
  const front = classes.filter((sc) => frontIds.includes(sc.id) || sc.id === currentClass?.id);
  const more = classes.filter((sc) => !front.includes(sc));

  mount(container,
    h('p', { class: 'step-hint', title: 'CubeSats are built from 10 cm units; the dispenser sets a strict mass limit (CubeSat spec, S01). A reference build uses a real satellite\'s public total mass.' },
      scenario?.size === 'large' ? '🛰 Pick a real navigation platform.' : '📦 Build part by part, or fly a real satellite (🛰).'),
    h('div', { class: 'choices' }, front.map(card)),
    more.length > 0 && h('details', { class: 'fold' }, [h('summary', {}, `＋${more.length} more sizes`), h('div', { class: 'choices' }, more.map(card))]),
    compareToggle('size', reps.filter((c, i) => front.includes(classes[i])), scenario?.id),
  );
}
