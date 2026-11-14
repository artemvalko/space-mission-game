// Step 8 — Rocket: rockets drawn at different heights; "Can lift X kg to your orbit" vs
// "Your satellite: Y kg".

import { mount, h, s } from '../dom.js';
import { choiceCard, levels, previewDelta } from '../card.js';
import { LAUNCHERS } from '../../data/launchers.js';
import { getOrbit } from '../../data/orbits.js';
import { computeResources } from '../../engine/resources.js';
import { whyLauncher } from '../../engine/explain.js';
import { selectLauncher } from '../../state/actions.js';
import { kg, money, pct } from '../../utils/format.js';
import { getLauncher } from '../../data/launchers.js';
import { balanceScale, scaleAngle } from '../animations/balanceScale.js';

let lastAngle = 0;    // view-only: where the beam was, so it tips smoothly from there
let lastKey = null;   // skip replaying when nothing changed

/** Simple rocket drawing; heightRel 0–1. Boosters for the heavy one. */
export function rocketArt(l, { wobble = false } = {}) {
  const H = 110 * l.heightRel;
  const w = 10 + 10 * l.heightRel;
  const x = 60 - w / 2;
  const y = 120 - H;
  const parts = [
    s('rect', { x, y: y + w, width: w, height: H - w, rx: 2, class: 'rk-body' }),
    s('path', { d: `M ${x} ${y + w} Q ${60} ${y - w * 0.6} ${x + w} ${y + w} Z`, class: 'rk-nose' }),
    s('rect', { x, y: y + H * 0.45, width: w, height: 3, class: 'rk-stripe' }),
    s('polygon', { points: `${x},${120} ${x - 6},${126} ${x},${110}`, class: 'rk-fin' }),
    s('polygon', { points: `${x + w},${120} ${x + w + 6},${126} ${x + w},${110}`, class: 'rk-fin' }),
  ];
  if (l.size === 'heavy') {
    parts.unshift(
      s('rect', { x: x - 8, y: y + H * 0.35, width: 7, height: H * 0.65, rx: 3, class: 'rk-booster' }),
      s('rect', { x: x + w + 1, y: y + H * 0.35, width: 7, height: H * 0.65, rx: 3, class: 'rk-booster' }),
    );
  }
  return s('svg', { viewBox: '0 0 120 130', class: ['rocket-art', wobble && 'wobble'].filter(Boolean).join(' '), role: 'img', 'aria-label': `${l.plainName} drawing` }, [
    s('line', { x1: 10, y1: 126, x2: 110, y2: 126, class: 'rk-ground' }), ...parts,
  ]);
}

function scaleBox(state, mass, orbit) {
  const l = getLauncher(state.design.launcherId);
  const cap = l && orbit ? l.capacityKg[orbit.id] ?? 0 : null;
  const box = h('div', { class: 'scale-box' });
  const key = `${Math.round(mass)}:${cap}`;
  const from = key === lastKey ? scaleAngle(mass, cap) : lastAngle;
  lastKey = key;
  lastAngle = scaleAngle(mass, cap);
  balanceScale(box, { massKg: mass, capacityKg: cap, fromAngle: from, rocketName: l?.plainName ?? 'Rocket' });
  return box;
}

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const orbit = getOrbit(state.design.orbitId);
  const mass = before.mass.used;
  const lift = levels(LAUNCHERS.map((l) => (orbit ? l.capacityKg[orbit.id] ?? 0 : l.capacityKg.leo)));
  const cost = levels(LAUNCHERS.map((l) => l.cost));
  const success = levels(LAUNCHERS.map((l) => l.reliability), { log: false });

  mount(container, 
    h('div', { class: 'weigh-in' }, [
      h('span', { class: 'weigh-icon', 'aria-hidden': 'true' }, '⚖️'),
      h('div', {}, [
        h('div', { class: 'weigh-big' }, `Your satellite: ${kg(mass)}`),
        h('div', { class: 'muted' }, 'Including fuel and a 15% safety margin. ' + (orbit ? `Going to: ${orbit.plainName}.` : 'Pick an orbit to see what each rocket can lift there.')),
      ]),
    ]),
    scaleBox(state, mass, orbit),
    h('div', { class: 'choices' }, LAUNCHERS.map((l, i) => {
      const selected = state.design.launcherId === l.id;
      const cap = orbit ? l.capacityKg[orbit.id] : undefined;
      const cannotReach = orbit && cap == null;
      const tooSmall = cap != null && cap < mass;
      return choiceCard({
        key: `lv-${l.id}`,
        icon: l.icon,
        title: l.plainName,
        realTerm: l.name,
        art: rocketArt(l, { wobble: selected && tooSmall }),
        oneLiner: cannotReach ? `✗ Can't reach ${orbit.plainName} at all.`
          : cap != null ? `${tooSmall ? '✗' : '✓'} Can lift ${kg(cap)} to your orbit. ${l.oneLiner}` : l.oneLiner,
        warn: cannotReach || tooSmall,
        badges: [...(cannotReach ? ["Can't reach"] : tooSmall ? ['Too small'] : [])],
        meters: [
          { label: 'Lift', symbol: '⚖', level: lift[i] },
          { label: 'Cost', symbol: '$', level: cost[i] },
          { label: 'Success', symbol: '✓', level: success[i] },
        ],
        details: [['Cost', money(l.cost)], ['Success rate', pct(l.reliability)],
          ...Object.entries(l.capacityKg).map(([oid, kgCap]) => [`Lift to ${getOrbit(oid)?.plainName ?? oid}`, kg(kgCap)])],
        selected,
        delta: selected ? null : `If chosen: ${previewDelta(state, selectLauncher(l.id), before)}`,
        why: whyLauncher(l, orbit),
        onSelect: () => dispatch(selectLauncher(l.id)),
      });
    })),
  );
}
