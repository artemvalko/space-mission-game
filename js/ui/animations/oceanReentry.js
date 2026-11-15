// End of life — controlled reentry into the ocean (DISPOSAL.md): a deorbit burn, a dashed track to
// Point Nemo on a small globe, and a splash (D04, D05, D06).

import { s } from '../dom.js';
import { play, W, H, seg, ease, stars, miniSat, setT, lerp } from './core.js';
import { sound } from '../sound.js';

export const OCEAN_CAPTION = 'Controlled reentry over the empty South Pacific (Point Nemo). Required when the risk to people is above 1 in 10,000 (ESA).';

export function oceanReentry(container, { caption, hold = false, linger = 1800 } = {}) {
  return play(container, {
    scene: 'ocean-reentry', label: 'A deorbit burn aims the satellite at the uninhabited South Pacific', duration: 5400, caption: caption ?? OCEAN_CAPTION, hold, linger,
    setup({ svg }) {
      svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'an-space' }), stars(60, 31));
      const cx = W / 2; const cy = H / 2 + 10; const r = 150;
      svg.append(s('circle', { cx, cy, r, class: 'an-earth' }), s('circle', { cx, cy, r: r + 8, class: 'an-atmo' }));
      const nemo = { x: cx + 40, y: cy + 90 };
      svg.append(s('text', { x: nemo.x + 12, y: nemo.y + 4, class: 'an-small-label' }, 'Point Nemo'));
      const track = s('path', { d: `M ${cx - 200} ${cy - 160} Q ${cx + 160} ${cy - 120} ${nemo.x} ${nemo.y}`, class: 'an-transfer', pathLength: 1000 });
      const sat = miniSat(1.2);
      const puff = s('circle', { r: 0, class: 'an-puff' });
      const splash = s('circle', { cx: nemo.x, cy: nemo.y, r: 0, class: 'an-splash' });
      svg.append(track, puff, sat, splash);
      let played = false;
      return {
        frame(t) {
          const burn = seg(t, 0.05, 0.2);
          puff.setAttribute('cx', cx - 210); puff.setAttribute('cy', cy - 160); puff.setAttribute('r', burn > 0 && burn < 1 ? 10 : 0);
          if (burn > 0 && !played) { played = true; sound.radio(); }
          const u = ease.inOut(seg(t, 0.2, 0.8));
          track.style.strokeDasharray = '6 8';
          const a = 1 - u;
          const mx = cx + 160; const my = cy - 120;
          const x = a * a * (cx - 200) + 2 * a * u * mx + u * u * nemo.x;
          const y = a * a * (cy - 160) + 2 * a * u * my + u * u * nemo.y;
          setT(sat, x, y, u * 120, 1 - u * 0.6);
          sat.setAttribute('opacity', 1 - seg(t, 0.78, 0.82));
          splash.setAttribute('r', seg(t, 0.8, 1) * 30); splash.setAttribute('opacity', 1 - seg(t, 0.85, 1));
        },
      };
    },
  });
}
