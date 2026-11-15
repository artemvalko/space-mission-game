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
import { selectLauncher, selectDeployer, setSatsPerLaunch } from '../../state/actions.js';
import { compareToggle } from './common.js';
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
  if (l.costType === 'reported') return l.priceText;
  const p = launchPrice(l, massKg);
  return `${money(p)}${l.publishedAnchor ? ` (estimate; public anchor ${money(l.publishedAnchor.priceM)} = ${l.publishedAnchor.what})` : ''}`;
};

/** "What's inside this rocket?" — info only: no prices, no mixing parts between rockets (§6.2). */
function insidePanel(l) {
  if (!l) return null;
  const fam = ROCKET_FAMILY[l.family];
  return h('details', { class: 'panel', key: 'inside-rocket' }, [
    h('summary', {}, h('strong', {}, `🔧 Inside ${fam.name}`)),
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
  const launcherCard = (l) => {
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
        oneLiner: cannotReach ? (l.deliversTo ? '✗ Stops at GTO.' : "✗ Can't reach your orbit.")
          : tooSmall ? `✗ Only ${kg(capacity)} there.` : l.oneLiner,
        whatFor: `${l.description} ${l.headline}`,
        warn: cannotReach || tooSmall,
        badges: [`${ct.icon} ${ct.label}`, ...(cannotReach ? ["Can't reach"] : tooSmall ? ['Too small'] : overkill ? ['Overkill'] : [])],
        details: [['Price', priceText(l, mass)], ...(l.pairNote ? [['Pairs', l.pairNote]] : []), ...Object.entries(l.capacityKg).map(([oid, c]) => [`To ${getOrbit(oid)?.plainName ?? oid}`, c == null ? 'reaches; no single published number' : `${kg(c)} (headline)`]),
          ...(l.gtoCapacityKg ? [['To GTO', `${kg(l.gtoCapacityKg)} (headline)`]] : [])],
        data: l,
        selected,
        delta: selected ? null : `If chosen: ${previewDelta(state, selectLauncher(l.id), before)}`,
        why: whyLauncher(l, orbit),
        onSelect: () => dispatch(selectLauncher(l.id)),
      });
  };
  // Rockets that reach your orbit first (up to 4); the rest fold away.
  const reachable = LAUNCHERS.filter((l) => !orbit || launcherReach(l, orbit).reaches || l.id === state.design.launcherId);
  const frontL = reachable.slice(0, 4);
  const moreL = LAUNCHERS.filter((l) => !frontL.includes(l));

  mount(container,
    h('div', { class: 'weigh-in' }, [
      h('span', { class: 'weigh-icon', 'aria-hidden': 'true' }, '⚖️'),
      h('div', {}, [
        h('div', { class: 'weigh-big', title: `${kg(mass)}: ${before.mass.reserveFraction ? 'parts + 15% design reserve.' : 'launch mass incl. the satellite\'s own propellant.'} The mass must fit at THAT orbit.` }, `→ ${orbit ? orbit.plainName.split(' (')[0] : '?'}`),
      ]),
    ]),
    scaleBox(state, before),
    h('div', { class: 'choices' }, frontL.map(launcherCard)),
    moreL.length > 0 && h('details', { class: 'fold' }, [h('summary', {}, `✗ Can't reach your orbit (${moreL.length})`), h('div', { class: 'choices' }, moreL.map(launcherCard))]),
    pairsToggle(state, dispatch),
    compareToggle('rocket', frontL, scenario?.id, ['Rocket', 'Mass', 'To your orbit', 'Price', 'Trade-off']),
    insidePanel(getLauncher(state.design.launcherId)),
    h('div', { class: 'subq' }, h('h2', { title: 'Holds the satellite during launch and releases it in orbit.' }, ['🔩 Adapter ', term('deployer', 'ⓘ')])),
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
        oneLiner: d.oneLiner,
        whatFor: d.description,
        disabled: (wrongSize || wrongRocket) && !selected,
        disabledReason: wrongSize ? '✗ Wrong size for your frame.' : '✗ Not used by this rocket.',
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

/** Galileo flew in pairs: 2 satellites share one launch (halves its cost per satellite). */
function pairsToggle(state, dispatch) {
  const l = getLauncher(state.design.launcherId);
  if (!l?.pairs || getComponent(state.design.components.structure)?.id !== 'str_gnss_meo') return null;
  const n = state.design.satsPerLaunch === 2 ? 2 : 1;
  return h('div', { class: 'variant-row', title: l.pairNote }, [
    h('span', { class: 'muted' }, '🛰 Per launch: '),
    ...[1, 2].map((k) => h('button', { class: ['mini', n === k && 'active'], type: 'button', key: `pairs-${k}`, 'aria-pressed': n === k ? 'true' : 'false', onClick: () => dispatch(setSatsPerLaunch(k)) }, `${k} sat${k > 1 ? 's' : ''}`)),
  ]);
}
