// Step 7 — Orbit: visual picker — a small SVG per orbit + one plain line.

import { mount, h, s } from '../dom.js';
import { term } from '../tooltip.js';
import { choiceCard, levels, previewDelta } from '../card.js';
import { ORBITS } from '../../data/orbits.js';
import { getScenario } from '../../data/scenarios.js';
import { getGroundStation } from '../../data/groundStations.js';
import { computeResources } from '../../engine/resources.js';
import { whyOrbit } from '../../engine/explain.js';
import { selectOrbit } from '../../state/actions.js';
import { pct, num, years, ms } from '../../utils/format.js';
import { groundTrack } from '../animations/groundTrack.js';

let trackShown = null; // view-only: which orbit the map shows

function trackPanel(orbitId, groundId) {
  const box = h('div', { class: 'map-box' });
  const panel = h('div', { class: 'panel map-panel' }, [h('div', { class: 'iv-head' }, [h('strong', { class: 'map-title' }, '🗺️ Ground track'), h('span', { class: 'muted small' }, 'Point at an orbit to see where it flies over Earth.')]), box]);
  showTrack(box, orbitId, groundId);
  return panel;
}

function showTrack(box, orbitId, groundId) {
  if (!orbitId) return;
  trackShown = orbitId;
  const t = box.parentElement?.querySelector('.map-title');
  if (t) t.textContent = `🗺️ Ground track: ${ORBITS.find((o) => o.id === orbitId)?.plainName}`;
  groundTrack(box, { orbitId, groundId });
}
const label = (x, y, text, anchor = 'middle') => s('text', { x, y, class: 'svg-label', 'text-anchor': anchor }, text);
const sat = (cx, cy) => s('rect', { x: cx - 3, y: cy - 3, width: 6, height: 6, class: 'svg-sat' });

/** Schematic (not to scale) diagram for an orbit. */
export function orbitDiagram(orbit) {
  const d = orbit.diagram;
  const parts = [];
  const sunArrow = [
    s('line', { x1: 6, y1: 14, x2: 40, y2: 14, class: 'svg-sunray' }),
    label(8, 28, '☀ sunlight', 'start'),
  ];

  if (d.kind === 'circle') {
    const cx = 130, cy = 80, br = 26;
    const r = Math.min(br * d.radius, 72);
    parts.push(...sunArrow);
    // Shadow cone behind the planet (Sun is to the left)
    parts.push(s('rect', { x: cx, y: cy - br, width: 240 - cx, height: br * 2, class: 'svg-shadow' }));
    // Polar orbits are drawn as a steeply tilted ring crossing over the poles.
    parts.push(d.polar
      ? s('ellipse', { cx, cy, rx: r, ry: r * 0.3, transform: `rotate(-75 ${cx} ${cy})`, class: 'svg-orbit' })
      : s('circle', { cx, cy, r, class: 'svg-orbit' }));
    parts.push(s('circle', { cx, cy, r: br, class: d.body === 'mars' ? 'svg-mars' : 'svg-earth' }));
    parts.push(d.polar ? sat(cx + r * 0.26, cy - r * 0.97) : sat(cx - r * 0.7071, cy - r * 0.7071));
    parts.push(label(cx, 154, d.body === 'mars' ? 'Mars' : 'Earth'));
  } else if (d.kind === 'ellipse') {
    parts.push(...sunArrow);
    parts.push(s('ellipse', { cx: 108, cy: 84, rx: 95, ry: 40, class: 'svg-orbit' }));
    parts.push(s('circle', { cx: 190, cy: 84, r: 16, class: 'svg-earth' }));
    parts.push(sat(16, 84));
    parts.push(label(28, 140, 'apogee: slow, long contact', 'start'));
    parts.push(label(190, 120, 'perigee: fast'));
  } else if (d.kind === 'lagrange') {
    parts.push(s('circle', { cx: -150, cy: 80, r: 330, class: 'svg-orbit faint' }));
    parts.push(s('circle', { cx: 22, cy: 80, r: 16, class: 'svg-sun' }));
    parts.push(s('circle', { cx: 168, cy: 80, r: 7, class: 'svg-earth' }));
    parts.push(s('ellipse', { cx: 214, cy: 80, rx: 8, ry: 18, class: 'svg-orbit' }));
    parts.push(sat(214, 62));
    parts.push(label(22, 112, 'Sun'), label(168, 104, 'Earth'), label(214, 112, 'L2'));
    parts.push(label(120, 146, 'L2 keeps Sun, Earth and Moon behind the telescope'));
  } else if (d.kind === 'lunar') {
    parts.push(...sunArrow);
    parts.push(s('circle', { cx: 50, cy: 86, r: 18, class: 'svg-earth' }));
    parts.push(s('line', { x1: 70, y1: 86, x2: 166, y2: 86, class: 'svg-transfer' }));
    parts.push(s('circle', { cx: 186, cy: 86, r: 12, class: 'svg-moon' }));
    parts.push(s('circle', { cx: 186, cy: 86, r: 20, class: 'svg-orbit' }));
    parts.push(sat(186, 66));
    parts.push(label(50, 124, 'Earth'), label(186, 124, 'Moon'));
    parts.push(label(118, 78, '384,000 km'));
  }

  return s('svg', { viewBox: '0 0 240 160', class: 'orbit-diagram', role: 'img', 'aria-label': `Diagram of ${orbit.name} (not to scale)` }, parts);
}

export function render(container, state, dispatch) {
  const before = computeResources(state);
  const scenario = getScenario(state.scenarioId);
  const ground = getGroundStation(state.design.groundId);
  const contact = levels(ORBITS.map((o) => o.contactFactor * o.distanceFactor + 0.001));
  const sun = levels(ORBITS.map((o) => o.solarIntensity * (1 - o.eclipseFraction)), { log: false });
  const effort = levels(ORBITS.map((o) => o.requiredDeltaV));

  // Allowed orbits first; the rest stay visible but greyed out with a reason.
  const shownId = state.design.orbitId ?? trackShown ?? 'leo';
  const sorted = [...ORBITS].sort((a, b) => Number(!scenario?.allowedOrbits.includes(a.id)) - Number(!scenario?.allowedOrbits.includes(b.id)));
  mount(container, 
    h('p', { class: 'step-hint' }, ['The orbit changes everything: sunlight, how long you sit in the planet\'s ', term('eclipse', 'shadow'),
      ', how far your radio must reach, and how much rocket push it takes to get there.']),
    trackPanel(shownId, state.design.groundId),
    h('div', { class: 'choices' }, sorted.map((o) => {
      const i = ORBITS.indexOf(o);
      const selected = o.id === state.design.orbitId;
      const allowed = !scenario || scenario.allowedOrbits.includes(o.id);
      const hours = ground && !(o.requiresDeepSpaceGround && !ground.deepSpace) ? Math.min(24, ground.contactHours * o.contactFactor) : null;
      const built = choiceCard({
        key: `orbit-${o.id}`,
        icon: o.icon,
        title: o.plainName,
        realTerm: `${o.name} · ${o.altitudeText}`,
        oneLiner: o.oneLiner,
        art: orbitDiagram(o),
        badges: scenario?.recommendedOrbits.includes(o.id) ? ['Recommended ★'] : [],
        meters: [
          { label: 'Contact', symbol: '📡', level: contact[i] },
          { label: 'Sunlight', symbol: '☀', level: sun[i] },
          { label: 'Hard to reach', symbol: '🚀', level: effort[i] },
        ],
        details: [['Height', o.altitudeText], ['In shadow', pct(o.eclipseFraction)], ['Sunlight strength', pct(o.solarIntensity)],
          ['Contact with your antennas', hours == null ? (ground ? 'none' : 'pick ground stations') : `${num(hours, 1)} h/day`],
          ['Lasts about', years(o.baseLifetimeYears)], ['Push needed (Δv)', ms(o.requiredDeltaV)]],
        selected,
        disabled: !allowed && !selected,
        warn: !allowed && selected,
        disabledReason: `✗ ${scenario?.name} can't use this orbit.`,
        delta: selected ? null : `If chosen: ${previewDelta(state, selectOrbit(o.id), before)}`,
        why: whyOrbit(o),
        onSelect: () => dispatch(selectOrbit(o.id)),
      });
      const hover = () => { if (trackShown !== o.id) { const box = document.querySelector('.map-box'); if (box) showTrack(box, o.id, state.design.groundId); } };
      built.addEventListener('mouseenter', hover);
      built.addEventListener('focusin', hover);
      return built;
    })),
  );
}
