// Step 8 — Rocket & adapter: launch services with price-type badges (published / estimate / RFQ),
// the CubeSat dispenser or large-satellite adapter, "What's inside this rocket?" (info only) and the
// balance scale (mass vs what can be carried to THAT orbit).

import { mount, h, s } from '../dom.js';
import { term } from '../tooltip.js';
import { choiceCard, previewDelta, sourceLinks } from '../card.js';
import { LAUNCHERS, DEPLOYERS, ROCKET_PARTS, ROCKET_FAMILY, COST_TYPE, getLauncher, launchPrice } from '../../data/launchers.js';
import { getOrbit } from '../../data/orbits.js';
import { getComponent } from '../../data/components.js';
import { getScenario } from '../../data/scenarios.js';
import { computeResources, launcherReach } from '../../engine/resources.js';
import { whyLauncher } from '../../engine/explain.js';
import { selectLauncher, selectDeployer } from '../../state/actions.js';
import { kg, money } from '../../utils/format.js';
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

function scaleBox(state, res) {
  const l = getLauncher(state.design.launcherId);
  const cap = res.mass.available;
  const mass = res.mass.used;
  const box = h('div', { class: 'scale-box' });
  const key = `${Math.round(mass * 100)}:${cap}`;
  const from = key === lastKey ? scaleAngle(mass, cap) : lastAngle;
  lastKey = key;
  lastAngle = scaleAngle(mass, cap);
  balanceScale(box, { massKg: mass, capacityKg: cap, fromAngle: from, rocketName: l ? `${l.plainName} + adapter` : 'Rocket' });
  return box;
}

const priceText = (l, massKg) => {
  if (l.costType === 'rfq') return 'Price on request (RFQ)';
  const p = launchPrice(l, massKg);
  return `${money(p)}${l.publishedAnchor ? ` (estimate; public anchor ${money(l.publishedAnchor.priceM)} = ${l.publishedAnchor.what})` : ''}`;
};

/** "What's inside this rocket?" — info only: no prices, no mixing parts between rockets (§6.2). */
function insidePanel(l) {
  if (!l) return null;
  const fam = ROCKET_FAMILY[l.family];
  return h('details', { class: 'panel', key: 'inside-rocket' }, [
    h('summary', {}, h('strong', {}, `🔧 What's inside this rocket? (${fam.name})`)),
    h('p', { class: 'small muted' }, [fam.facts, ' ', sourceLinks(fam.sources)]),
    fam.noParts ? null : h('table', { class: 'rocket-parts' }, [
      h('thead', {}, h('tr', {}, [h('th', {}, 'Part'), h('th', {}, fam.name)])),
      h('tbody', {}, ROCKET_PARTS.map((p) => h('tr', {}, [h('td', {}, `${p.icon} ${p.plainName}`), h('td', {}, p[l.family])]))),
    ]),
    h('p', { class: 'small muted' }, 'These parts come with the certified rocket — you cannot buy one engine or mix parts between rockets, and they have no public per-part prices. The budget uses the launch contract price. The rocket\'s own fuel is never added to your satellite\'s mass.'),
  ]);
}

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const orbit = getOrbit(state.design.orbitId);
  const structure = getComponent(state.design.components.structure);
  const mass = before.mass.used;
  const scenario = getScenario(state.scenarioId);

  mount(container,
    h('div', { class: 'weigh-in' }, [
      h('span', { class: 'weigh-icon', 'aria-hidden': 'true' }, '⚖️'),
      h('div', {}, [
        h('div', { class: 'weigh-big' }, `Your satellite: ${kg(mass)}`),
        h('div', { class: 'muted' }, `${before.mass.reserveFraction ? 'Parts + 15% design reserve. ' : 'Launch mass incl. the satellite\'s own propellant. '}${orbit ? `Going to: ${orbit.plainName} — the mass must fit at THAT orbit.` : 'Pick an orbit to see what each rocket can lift there.'}`),
      ]),
    ]),
    scaleBox(state, before),
    h('div', { class: 'choices' }, LAUNCHERS.map((l) => {
      const selected = state.design.launcherId === l.id;
      const { reaches, capacity } = launcherReach(l, orbit);
      const cannotReach = orbit && !reaches;
      const tooSmall = capacity != null && capacity < mass;
      const overkill = scenario && l.overkillFor?.includes(scenario.id) && !cannotReach;
      const ct = COST_TYPE[l.costType];
      return choiceCard({
        key: `lv-${l.id}`,
        icon: l.icon,
        title: l.plainName,
        realTerm: l.name,
        art: rocketArt(l, { wobble: selected && (tooSmall || cannotReach) }),
        oneLiner: cannotReach ? `✗ ${l.deliversTo ? `Delivers to ${l.deliversTo} — not ${orbit.plainName}.` : `Does not deliver to ${orbit.plainName}.`}`
          : capacity != null ? `${tooSmall ? '✗' : '✓'} Up to ${kg(capacity)} to this orbit (headline). ${l.oneLiner}` : `${orbit ? '✓ Reaches this orbit. ' : ''}${l.oneLiner}`,
        warn: cannotReach || tooSmall,
        badges: [`${ct.icon} ${ct.label}`, ...(cannotReach ? ["Can't reach"] : tooSmall ? ['Too small'] : overkill ? ['Overkill'] : [])],
        details: [['Price', priceText(l, mass)], ...Object.entries(l.capacityKg).map(([oid, c]) => [`To ${getOrbit(oid)?.plainName ?? oid}`, c == null ? 'reaches; no single published number' : `${kg(c)} (headline)`]),
          ...(l.gtoCapacityKg ? [['To GTO', `${kg(l.gtoCapacityKg)} (headline)`]] : [])],
        data: l,
        selected,
        delta: selected ? null : `If chosen: ${previewDelta(state, selectLauncher(l.id), before)}`,
        why: whyLauncher(l, orbit),
        onSelect: () => dispatch(selectLauncher(l.id)),
      });
    })),
    insidePanel(getLauncher(state.design.launcherId)),
    h('div', { class: 'subq' }, [h('h2', {}, '🔩 Dispenser / adapter'), h('span', { class: 'subq-real' }, ['Real term: ', term('deployer', 'Deployer / payload adapter'), ' · What is it for? Holds the satellite during launch and releases it in orbit.'])]),
    h('div', { class: 'choices' }, DEPLOYERS.map((d) => {
      const selected = state.design.deployerId === d.id;
      const wrongSize = structure && d.formFactor !== structure.formFactor;
      const l = getLauncher(state.design.launcherId);
      const wrongRocket = l && !l.adapters.includes(d.id);
      return choiceCard({
        key: `dep-${d.id}`,
        icon: d.icon,
        title: d.plainName,
        realTerm: d.name,
        oneLiner: wrongSize ? `✗ Made for ${d.formFactor === 'cubesat' ? 'CubeSats' : 'large satellites'} — not your frame.` : wrongRocket ? `✗ ${l.plainName} does not use it.` : d.oneLiner,
        whatFor: d.description,
        warn: wrongSize || wrongRocket,
        details: [['Model cost', d.cost ? money(d.cost) : d.costNote], ...(d.formFactor === 'cubesat' && structure?.maxMassKg ? [['Mass limit for your frame', kg(structure.maxMassKg)]] : [])],
        data: d,
        selected,
        delta: selected ? null : `If chosen: ${previewDelta(state, selectDeployer(d.id), before)}`,
        why: d.description,
        onSelect: () => dispatch(selectDeployer(d.id)),
      });
    })),
  );
}
