// Phase 4 P1 #2 — Balance scale on the Rocket step: your satellite (left pan) vs what the rocket
// can lift (right pan). Tips smoothly from the previous angle; overweight slams down red with
// "Too heavy by X kg". ≤ 0.7 s, never blocks input.

import { s } from '../dom.js';
import { svgIcon } from '../icons.js';
import { play, seg, ease, lerp, setT } from './core.js';
import { kg } from '../../utils/format.js';

/** Beam angle in degrees (+ = satellite side down). */
export function scaleAngle(massKg, capacityKg) {
  if (!capacityKg) return 0;
  const r = massKg / capacityKg;
  return r > 1 ? 16 : Math.max(-14, (r - 1) * 18);
}

export function balanceScale(container, { massKg = 0, capacityKg = null, fromAngle = 0, rocketName = 'rocket' } = {}) {
  const to = scaleAngle(massKg, capacityKg);
  const over = capacityKg != null && massKg > capacityKg;
  return play(container, {
    scene: 'balance-scale', label: `Your satellite ${kg(massKg)} vs ${capacityKg == null ? 'no rocket yet' : `${kg(capacityKg)} the rocket can lift`}`, duration: over ? 700 : 550,
    setup({ svg }) {
      const cx = 400; const cy = 150; const L = 230;
      const beam = s('g', {}, [
        s('rect', { x: -L, y: -5, width: 2 * L, height: 10, rx: 5, class: ['bs-beam', over && 'over'].filter(Boolean).join(' ') }),
        s('circle', { cx: 0, cy: 0, r: 9, class: 'bs-pivot' }),
      ]);
      const pan = (label, sub, cls) => {
        const g = s('g', {}, [
          s('line', { x1: -40, y1: 0, x2: 0, y2: -90, class: 'bs-string' }), s('line', { x1: 40, y1: 0, x2: 0, y2: -90, class: 'bs-string' }),
          s('path', { d: 'M -60 0 Q 0 34 60 0 Z', class: `bs-pan ${cls}` }),
          typeof label === 'string' ? s('text', { x: 0, y: -16, class: 'bs-label', 'text-anchor': 'middle' }, label) : svgIcon(label.icon, -20, -58, 40, { class: 'bs-icon' }),
          s('text', { x: 0, y: 56, class: 'bs-sub', 'text-anchor': 'middle' }, sub),
        ]);
        return g;
      };
      const left = pan({ icon: 'satellite' }, kg(massKg), over ? 'over' : '');
      const right = pan(capacityKg == null ? '?' : { icon: 'rocket' }, capacityKg == null ? '' : `≤ ${kg(capacityKg)}`, '');
      const stand = s('g', {}, [s('polygon', { points: `${cx - 50},420 ${cx + 50},420 ${cx + 10},${cy} ${cx - 10},${cy}`, class: 'bs-stand' })]);
      const warn = s('text', { x: cx, y: 60, class: 'bs-warn', 'text-anchor': 'middle', opacity: 0 }, over ? `+${kg(massKg - capacityKg)} too heavy!` : '');
      const root = s('g', {}, [stand, left, right, beam, warn]);
      svg.append(root);
      const place = (deg, shake = 0) => {
        const a = (deg * Math.PI) / 180;
        setT(beam, cx + shake, cy, deg);
        setT(left, cx - Math.cos(a) * L + shake, cy - Math.sin(a) * L + 90);
        setT(right, cx + Math.cos(a) * L + shake, cy + Math.sin(a) * L + 90);
      };
      return {
        frame(t, ms) {
          const p = over ? ease.in(seg(t, 0, 0.55)) : ease.inOut(t);
          const shake = over && t > 0.55 ? Math.sin(ms / 18) * 6 * (1 - seg(t, 0.55, 1)) : 0;
          place(lerp(fromAngle, to, p), shake);
          warn.setAttribute('opacity', over ? seg(t, 0.5, 0.7) : 0);
        },
      };
    },
  });
}
