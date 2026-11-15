// End of life — docking plate (DISPOSAL.md, D07): a small servicer tug docks with a magnet "click"
// and pulls the satellite down. Astroscale ELSA-M demo planned 2026.

import { s } from '../dom.js';
import { play, W, H, seg, ease, stars, miniSat, setT, lerp } from './core.js';
import { sound } from '../sound.js';

export const TUG_CAPTION = 'A docking plate lets a future tug grab the satellite and pull it down (Astroscale ELSA-M, demo planned 2026).';

export function tugRemoval(container, { caption, hold = false, linger = 1800 } = {}) {
  return play(container, {
    scene: 'tug-removal', label: 'A servicer tug docks and removes the satellite', duration: 5600, caption: caption ?? TUG_CAPTION, hold, linger,
    setup({ svg }) {
      svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'an-space' }), stars(80, 44));
      svg.append(s('path', { d: `M 0 ${H} Q ${W / 2} ${H - 70} ${W} ${H} Z`, class: 'an-earth-limb' }));
      const sat = miniSat(1.5);
      const tug = s('g', {}, [s('rect', { x: -14, y: -9, width: 28, height: 18, rx: 4, class: 'an-tug' }), s('rect', { x: 14, y: -3, width: 8, height: 6, class: 'an-minisat-panel' })]);
      const click = s('text', { class: 'an-big-label', 'text-anchor': 'middle', opacity: 0 }, 'click');
      svg.append(sat, tug, click);
      let clicked = false;
      return {
        frame(t) {
          const sx = 520; const sy = 150;
          const approach = ease.out(seg(t, 0, 0.4));
          const down = ease.in(seg(t, 0.55, 1));
          const satX = lerp(sx, 380, down); const satY = lerp(sy, 420, down);
          setT(sat, satX, satY, down * 30);
          setT(tug, lerp(80, satX - 38, approach) + (t > 0.4 ? 0 : 0), lerp(320, satY, approach), 0);
          if (t >= 0.4 && !clicked) { clicked = true; sound.radio(); }
          click.setAttribute('x', satX); click.setAttribute('y', satY - 40); click.setAttribute('opacity', t > 0.4 && t < 0.6 ? 1 : 0);
          sat.setAttribute('opacity', 1 - seg(t, 0.9, 1)); tug.setAttribute('opacity', 1 - seg(t, 0.9, 1));
        },
      };
    },
  });
}
