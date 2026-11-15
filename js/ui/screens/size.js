// Step 2 — Satellite size: 3U / 6U / 12U / large bus (~700 kg class). Wrong sizes are greyed
// with an honest reason (research §6.3, §7.2).

import { mount, h } from '../dom.js';
import { choiceCard, levels, previewDelta } from '../card.js';
import { SIZE_CLASSES, sizeClassOf, structureFor, isCubeSat } from '../../data/components.js';
import { getScenario } from '../../data/scenarios.js';
import { computeResources } from '../../engine/resources.js';
import { whyComponent } from '../../engine/explain.js';
import { selectComponent } from '../../state/actions.js';
import { kg, money } from '../../utils/format.js';

/** Honest reason why a size does not fit this mission ('' = it fits). */
export function sizeWhyNot(scenario, sc) {
  if (!scenario) return '';
  if (scenario.size === 'large') return sc.id === 'large' ? '' : 'A Galileo node needs ~700 kg.';
  if (sc.id === 'large') return 'Overkill for a 6U job.';
  if (sc.id === '3u') return scenario.id === 'mission_weather_mw' ? 'Too small: the 4U radiometer won\'t fit.' : 'Too small: ~8.7 kg vs 6 kg limit.';
  if (sc.id === '12u') return 'Valid, but not in our data.';
  return '';
}

/** The full honest reason behind sizeWhyNot (shown under "Why?"). */
const SIZE_WHY_LONG = {
  large: 'A Galileo-class node is a ~700 kg satellite: four atomic clocks and an L-band payload will never fit a CubeSat.',
  overkill: 'Overkill: a ~700 kg bus for a job a 6U CubeSat can do (research §7.2).',
  '3u_wx': 'The 4U radiometer cannot fit in 3U. NASA TROPICS uses 3U CubeSats — with a different, smaller radiometer and a constellation.',
  '3u': 'The build (~8.7 kg with reserve) is over the typical 3U limit of 6 kg (CubeSat spec, S01).',
  '12u': 'A 12U is a valid size (ESA Celeste IOD-1 is a real 12U), but our research only models a 6U build — there is no real frame mass or price for 12U here, and we never invent one.',
};
function sizeWhyLong(scenario, sc) {
  if (scenario.size === 'large') return SIZE_WHY_LONG.large;
  if (sc.id === 'large') return SIZE_WHY_LONG.overkill;
  if (sc.id === '3u') return scenario.id === 'mission_weather_mw' ? SIZE_WHY_LONG['3u_wx'] : SIZE_WHY_LONG['3u'];
  return SIZE_WHY_LONG['12u'];
}

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const scenario = getScenario(state.scenarioId);
  const currentId = state.design.components.structure;
  const currentClass = sizeClassOf(currentId);
  const reps = SIZE_CLASSES.map((sc) => structureFor(sc, scenario?.id));
  const limit = levels(reps.map((c) => c.maxMassKg ?? c.targetMassKg ?? 1));

  mount(container,
    h('p', { class: 'step-hint', title: 'CubeSats are built from 10 cm units; the dispenser on the rocket sets a strict mass limit (CubeSat spec, S01).' }, '📦 Dispenser limits: 3U 6 kg · 6U 12 kg · 12U 24 kg'),
    h('div', { class: 'choices' }, SIZE_CLASSES.map((sc, i) => {
      const c = reps[i];
      const selected = currentClass?.id === sc.id;
      const why = sizeWhyNot(scenario, sc);
      return choiceCard({
        key: `size-${sc.id}`,
        icon: sc.icon,
        title: sc.plainName,
        realTerm: c.name,
        oneLiner: c.oneLiner,
        whatFor: c.why,
        badges: scenario && !why ? ['Research build ★'] : [],
        meters: [{ label: 'Mass limit', symbol: '●', level: limit[i] }],
        details: [
          [isCubeSat(c) ? 'Mass limit (CubeSat spec)' : 'Launch mass target', kg(c.maxMassKg ?? c.targetMassKg)],
          ['Frame mass', c.mass == null ? 'not in our data' : kg(c.mass)],
          ['Frame cost', c.cost == null ? 'not in our data' : money(c.cost)],
          ...(c.units ? [['Room', `${c.units} units (10 cm cubes)`]] : []),
        ],
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
    })),
  );
}
