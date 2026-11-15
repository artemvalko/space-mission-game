// Step 7 — Orbit: visual picker — a small SVG per orbit + one plain line.

import { mount, h, s } from '../dom.js';
import { term } from '../tooltip.js';
import { choiceCard, previewDelta } from '../card.js';
import { ORBITS, PLAYABLE_ORBITS } from '../../data/orbits.js';
import { getScenario, variantOf } from '../../data/scenarios.js';
import { computeResources } from '../../engine/resources.js';
import { whyOrbit } from '../../engine/explain.js';
import { selectOrbit } from '../../state/actions.js';
import { pct } from '../../utils/format.js';
import { groundTrack } from '../animations/groundTrack.js';
import { compareToggle } from './common.js';

let trackShown = null; // view-only: which orbit the map shows

function trackPanel(orbitId, groundId) {
  const box = h('div', { class: 'map-box' });
  const panel = h('div', { class: 'panel map-panel' }, [h('div', { class: 'iv-head', title: 'Illustration — point at an orbit to see where it flies over Earth.' }, [h('strong', { class: 'map-title' }, '🗺️')]), box]);
  showTrack(box, orbitId, groundId);
  return panel;
}

function showTrack(box, orbitId, groundId) {
  if (!orbitId) return;
  trackShown = orbitId;
  const t = box.parentElement?.querySelector('.map-title');
  if (t) t.textContent = `🗺️ ${ORBITS.find((o) => o.id === orbitId)?.plainName}`;
  groundTrack(box, { orbitId, groundId });
}
const label = (x, y, text, anchor = 'middle') => s('text', { x, y, class: 'svg-label', 'text-anchor': anchor }, text);
const sat = (cx, cy) => s('rect', { x: cx - 3, y: cy - 3, width: 6, height: 6, class: 'svg-sat' });

/**
 * Orbit diagram at TRUE relative scale (Earth radius = 14 px): LEO hugs the surface, MEO is
 * ~4.6 Earth radii out. GEO has no altitude in our research data, so it is drawn beyond MEO, not to scale.
 */
export function orbitDiagram(orbit) {
  const d = orbit.diagram;
  const cx = 120; const cy = 82; const br = 14;
  const parts = [
    s('line', { x1: 6, y1: 14, x2: 40, y2: 14, class: 'svg-sunray' }),
    s('rect', { x: cx, y: cy - br, width: 240 - cx, height: br * 2, class: 'svg-shadow' }),
  ];
  // Faint reference ring for MEO so every card shows the same scale.
  const meoR = br * (6371 + 23222) / 6371;
  if (!d.geo && !['meo_gnss', 'meo_gps_20200'].includes(orbit.id)) parts.push(s('circle', { cx, cy, r: meoR, class: 'svg-orbit faint' }, s('title', {}, 'MEO ring for scale')));
  if (d.geo) {
    parts.push(s('circle', { cx, cy, r: meoR, class: 'svg-orbit faint' }), label(cx + meoR * 0.7, cy - meoR * 0.75, 'MEO'));
    parts.push(s('circle', { cx, cy, r: 110, class: 'svg-orbit' }), sat(cx - 77.8, cy - 77.8), label(cx, 156, 'not to scale'));
  } else {
    const r = br * d.r;
    if (d.tilt) parts.push(s('ellipse', { cx, cy, rx: r, ry: r * Math.cos((d.tilt * Math.PI) / 180), transform: `rotate(-${90 - d.tilt / 2} ${cx} ${cy})`, class: 'svg-orbit' }), sat(cx + r * 0.6, cy - r * 0.35));
    else if (d.polar) parts.push(s('ellipse', { cx, cy, rx: r, ry: r * 0.28, transform: `rotate(-80 ${cx} ${cy})`, class: 'svg-orbit' }), sat(cx + 2, cy - r));
    else parts.push(s('circle', { cx, cy, r, class: 'svg-orbit' }), sat(cx - r * 0.7071, cy - r * 0.7071));
    parts.push(s('title', {}, `${orbit.altitudeText}${d.tilt ? ` · tilted ${d.tilt}°` : ''} — true relative scale`));
  }
  parts.push(s('circle', { cx, cy, r: br, class: 'svg-earth' }));
  return s('svg', { viewBox: '0 0 240 160', class: 'orbit-diagram', role: 'img', 'aria-label': `Diagram of ${orbit.name}` }, parts);
}

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const scenario = getScenario(state.scenarioId);
  const shownId = state.design.orbitId ?? trackShown ?? scenario?.recommendedOrbits[0] ?? 'leo_550';
  // "Recommended" follows the chosen objective variant (e.g. 32° for hurricanes) when it prefers an orbit.
  const orbitFit = variantOf(scenario, state.design.variantId)?.fit.find((f) => f.dim === 'orbit');
  const bestFor = (o) => (orbitFit ? orbitFit.map[o.id] === 1 : scenario?.recommendedOrbits.includes(o.id));
  const okOrbit = (o) => !scenario || scenario.allowedOrbits.includes(o.id) || o.id === state.design.orbitId;
  const sorted = [...PLAYABLE_ORBITS].sort((a, b) => Number(!scenario?.allowedOrbits.includes(a.id)) - Number(!scenario?.allowedOrbits.includes(b.id)));
  const card = (o) => {
    const selected = o.id === state.design.orbitId;
    const allowed = !scenario || scenario.allowedOrbits.includes(o.id);
    const built = choiceCard({
      key: `orbit-${o.id}`,
      icon: o.icon,
      title: o.plainName,
      realTerm: `${o.name} · ${o.altitudeText}`,
      oneLiner: allowed ? o.oneLiner : '✗ Wrong for this mission.',
      whatFor: o.description,
      art: orbitDiagram(o),
      badges: bestFor(o) ? ['Recommended ★'] : allowed ? ['Also works'] : ['Wrong for this mission'],
      details: [['Altitude', o.altitudeText], ['Inclination', o.inclinationText],
        ['In sunlight', o.sunlitFraction != null ? `${pct(o.sunlitFraction)} of the time` : 'no single value in our data'],
        ['Shadow (eclipse)', o.eclipseMinutes != null ? `${o.eclipseMinutes} min (6U power model)` : 'changes with the season']],
      data: o,
      selected,
      warn: !allowed,
      delta: selected ? null : `If chosen: ${previewDelta(state, selectOrbit(o.id), before)}`,
      why: whyOrbit(o, scenario),
      onSelect: () => dispatch(selectOrbit(o.id)),
    });
    const hover = () => { if (trackShown !== o.id) { const box = document.querySelector('.map-box'); if (box) showTrack(box, o.id, state.design.groundId); } };
    built.addEventListener('mouseenter', hover);
    built.addEventListener('focusin', hover);
    return built;
  };
  const info = ORBITS.filter((o) => o.infoOnly && scenario?.id === 'mission_navigation_meo');
  mount(container,
    h('p', { class: 'step-hint', title: 'The orbit decides coverage, sunlight, shadow and which rocket can get you there. Diagrams are at true relative scale.' }, ['📏 True scale: ', term('leo', 'LEO'), ' hugs Earth, ', term('meo', 'MEO'), ' is far.']),
    trackPanel(shownId, state.design.groundId),
    h('div', { class: 'choices' }, sorted.filter((o) => okOrbit(o)).map(card)),
    sorted.some((o) => !okOrbit(o)) && h('details', { class: 'fold' }, [h('summary', {}, `✗ Wrong for this mission (${sorted.filter((o) => !okOrbit(o)).length})`), h('div', { class: 'choices' }, sorted.filter((o) => !okOrbit(o)).map(card))]),
    compareToggle('orbit', sorted.filter((o) => okOrbit(o)), scenario?.id, ['Orbit', 'Altitude', 'Tilt', 'Price', 'Trade-off']),
    info.length > 0 && h('details', { class: 'group fold' }, [
      h('summary', { class: 'group-title' }, 'ℹ️ Also correct: GPS orbit'),
      h('div', { class: 'choices' }, info.map((o) => choiceCard({
        key: `orbit-info-${o.id}`, icon: o.icon, title: o.plainName, realTerm: `${o.name} · ${o.altitudeText}`, oneLiner: o.oneLiner,
        art: orbitDiagram(o), badges: ['Info only'], data: o, selected: false, disabled: true, disabledReason: o.oneLiner, why: o.description, onSelect: () => {},
      }))),
    ]),
  );
}
