// Procedural mission patch (SVG group): circle, orbit ring, planet, mission + team names.
// Used by the mission-end scenes and the Results screen.

import { s } from '../dom.js';
import { newId } from './core.js';

const BODY = { mars: ['#c1502e', '#f08a5d'], lunar: ['#9aa3b2', '#d0d6e0'], l2: ['#ffcf4a', '#fff1b8'] };

export function missionPatch({ name = 'MISSION', team = 'MISSION CONTROL', orbitId = 'leo', r = 90, cracked = false } = {}) {
  const idTop = newId('ptop');
  const idBot = newId('pbot');
  const grad = newId('pg');
  const [body, rim] = BODY[orbitId] ?? ['#2a7de1', '#7cc0ff'];
  const ring = orbitId === 'heo' ? { rx: r * 0.62, ry: r * 0.22 } : orbitId === 'geo' ? { rx: r * 0.66, ry: r * 0.3 } : { rx: r * 0.55, ry: r * 0.2 };
  const nodes = [
    s('defs', {}, [
      s('path', { id: idTop, d: `M ${-r * 0.78} 0 A ${r * 0.78} ${r * 0.78} 0 0 1 ${r * 0.78} 0` }),
      s('path', { id: idBot, d: `M ${-r * 0.86} 0 A ${r * 0.86} ${r * 0.86} 0 0 0 ${r * 0.86} 0` }),
      s('radialGradient', { id: grad, cx: '50%', cy: '40%' }, [s('stop', { offset: 0, 'stop-color': '#1b3a75' }), s('stop', { offset: 1, 'stop-color': '#07112a' })]),
    ]),
    s('circle', { r, class: 'patch-rim' }),
    s('circle', { r: r * 0.93, fill: `url(#${grad})` }),
    s('circle', { r: r * 0.64, class: 'patch-inner' }),
    ...[[-0.3, -0.35], [0.35, -0.42], [0.42, 0.1], [-0.45, 0.05], [0.1, -0.55]].map(([x, y]) => s('circle', { cx: x * r, cy: y * r, r: 1.6, class: 'patch-star' })),
    s('circle', { cx: 0, cy: r * 0.08, r: r * 0.26, fill: body, stroke: rim, 'stroke-width': 2 }),
    s('ellipse', { cx: 0, cy: r * 0.08, rx: ring.rx, ry: ring.ry, class: 'patch-ring', transform: `rotate(-18 0 ${r * 0.08})` }),
    s('rect', { x: ring.rx * 0.75 - 4, y: r * 0.08 - ring.ry * 0.9 - 4, width: 8, height: 8, class: 'patch-sat' }),
    s('text', { class: 'patch-text' }, s('textPath', { href: `#${idTop}`, startOffset: '50%', 'text-anchor': 'middle' }, name.toUpperCase())),
    s('text', { class: 'patch-text patch-team', dy: '0.9em' }, s('textPath', { href: `#${idBot}`, startOffset: '50%', 'text-anchor': 'middle' }, team.toUpperCase())),
  ];
  if (cracked) {
    nodes.push(s('path', { d: `M ${-r * 0.2} ${-r} L ${-r * 0.05} ${-r * 0.4} L ${-r * 0.25} ${-r * 0.1} L 0 ${r * 0.3} L ${-r * 0.1} ${r}`, class: 'patch-crack' }));
    nodes.push(s('path', { d: `M ${-r * 0.05} ${-r * 0.4} L ${r * 0.3} ${-r * 0.3} L ${r * 0.55} ${-r * 0.5}`, class: 'patch-crack' }));
  }
  return s('g', { class: ['patch', cracked && 'patch-cracked'].filter(Boolean).join(' ') }, nodes);
}
