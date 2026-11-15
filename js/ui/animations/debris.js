// Scene 10 — Space debris: a fragment approaches. Dodge → thruster puff + orbit shift;
// accept the risk → impact flash, a small part breaks off.

import { s } from '../dom.js';
import { sound } from '../sound.js';
import { play, W, seg, ease, lerp, setT } from './core.js';

export function debris(container, { x = 500, y = 160, phase = 'intro', choiceIndex = 0, caption, linger = 1800 } = {}) {
  const intro = phase === 'intro';
  return play(container, {
    onStart: () => { if (phase === 'intro') sound.radio(); },
    scene: intro ? 'debris' : 'debris-outcome', overlay: true, label: 'Space debris', duration: intro ? 2400 : 2000, caption, linger: intro ? 0 : linger,
    setup({ svg }) {
      const rock = s('polygon', { points: '-9,-4 -3,-10 7,-7 10,2 3,9 -7,6', class: 'an-debris' });
      const warn = s('text', { class: 'an-warn-label', 'text-anchor': 'middle' }, 'DEBRIS');
      const ghost = s('rect', { x: -7, y: -7, width: 14, height: 14, class: 'an-ghost-sat', opacity: 0 });
      const puffs = s('g', {}, [0, 1, 2, 3].map(() => s('circle', { r: 0, class: 'an-puff' })));
      const flash = s('circle', { cx: x, cy: y, r: 0, class: 'an-hit' });
      const chip = s('rect', { x: -3, y: -2, width: 6, height: 4, class: 'an-minisat-panel', opacity: 0 });
      svg.append(rock, warn, ghost, puffs, flash, chip);
      return {
        frame(t, ms) {
          if (intro) {
            const u = ease.out(seg(t, 0, 0.9));
            setT(rock, lerp(W + 30, x + 46, u), lerp(y - 60, y - 8, u), ms / 6);
            warn.setAttribute('x', x); warn.setAttribute('y', y - 34);
            warn.setAttribute('opacity', Math.sin(ms / 140) > -0.2 ? 1 : 0.2);
            return;
          }
          warn.setAttribute('opacity', 0);
          const u = seg(t, 0, 1);
          if (choiceIndex === 0) {
            setT(rock, lerp(x + 46, x - 180, u), lerp(y - 8, y + 40, u), ms / 6);
            [...puffs.children].forEach((c, i) => { c.setAttribute('cx', x - 10 - i * 6 * u * 3); c.setAttribute('cy', y + 4 + i * 2); c.setAttribute('r', 3 + u * 8); c.setAttribute('opacity', Math.max(0, 0.8 - u)); });
            setT(ghost, x, y - ease.out(seg(t, 0, 0.6)) * 18); ghost.setAttribute('opacity', 0.8 * (1 - seg(t, 0.7, 1)));
          } else {
            const hitT = seg(t, 0, 0.25);
            setT(rock, lerp(x + 46, x + 4, hitT) - seg(t, 0.25, 1) * 120, y - 8 + seg(t, 0.25, 1) * 60, ms / 3);
            flash.setAttribute('r', t > 0.22 ? ease.out(seg(t, 0.22, 0.6)) * 40 : 0);
            flash.setAttribute('opacity', t > 0.22 ? 1 - seg(t, 0.22, 0.7) : 0);
            const c = seg(t, 0.25, 1);
            chip.setAttribute('opacity', t > 0.25 ? 1 - seg(t, 0.8, 1) : 0);
            setT(chip, x + c * 90, y + c * 70 + c * c * 40, ms / 2);
          }
        },
      };
    },
  });
}
