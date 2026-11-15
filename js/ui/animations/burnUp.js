// End of life — burn up (DISPOSAL.md): reentry plasma glow, the satellite breaks apart, and a faint
// particle cloud slowly drifts down toward an "ozone layer" band (D01, D02 — science estimate).

import { s } from '../dom.js';
import { play, W, H, seg, ease, stars, miniSat, setT, lerp, newId } from './core.js';
import { mulberry32 } from '../../utils/random.js';
import { sound } from '../sound.js';

export const BURN_UP_CAPTION = 'Particles can take up to 30 years to reach the ozone layer (science estimate).';

export function burnUp(container, { caption, kg = null, hold = false, linger = 1800 } = {}) {
  return play(container, {
    scene: 'burn-up', label: 'The satellite burns up and leaves aluminium-oxide particles high in the air', duration: 5600,
    caption: caption ?? `${kg != null ? `≈ ${kg.toFixed(1)} kg of aluminium oxide (science estimate). ` : ''}${BURN_UP_CAPTION}`, hold, linger,
    setup({ svg }) {
      const glowId = newId('plasma');
      svg.append(s('defs', {}, s('radialGradient', { id: glowId }, [s('stop', { offset: 0, 'stop-color': '#fff3c4' }), s('stop', { offset: 0.45, 'stop-color': '#ff9a3c' }), s('stop', { offset: 1, 'stop-color': '#ff4d1a', 'stop-opacity': 0 })])));
      svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'an-space' }), stars(70, 12));
      svg.append(s('rect', { x: 0, y: 300, width: W, height: 26, class: 'an-ozone' }), s('text', { x: 16, y: 318, class: 'an-small-label' }, 'ozone layer'));
      svg.append(s('path', { d: `M 0 ${H} Q ${W / 2} ${H - 60} ${W} ${H} Z`, class: 'an-earth-limb' }));
      const sat = miniSat(1.4);
      const fire = s('circle', { r: 0, fill: `url(#${glowId})` });
      const rng = mulberry32(7);
      const bits = Array.from({ length: 6 }, () => ({ node: s('rect', { width: 5, height: 5, class: 'an-minisat-body' }), vx: (rng() - 0.5) * 60, vy: rng() * 40 }));
      const dust = Array.from({ length: 70 }, () => ({ node: s('circle', { r: 1.6, class: 'an-dust' }), x: 330 + rng() * 260, y0: 150 + rng() * 40, v: 0.5 + rng() }));
      svg.append(...dust.map((d) => d.node), fire, sat, ...bits.map((b) => b.node));
      let played = false;
      return {
        frame(t) {
          const fall = ease.in(seg(t, 0, 0.35));
          const x = lerp(120, 460, fall); const y = lerp(60, 160, fall);
          setT(sat, x, y, 40 * fall);
          const heat = seg(t, 0.15, 0.4);
          fire.setAttribute('cx', x); fire.setAttribute('cy', y); fire.setAttribute('r', heat * 40);
          if (heat > 0 && !played) { played = true; sound.radio(); }
          const brk = seg(t, 0.35, 0.5);
          sat.setAttribute('opacity', 1 - brk);
          bits.forEach((b) => { setT(b.node, x + b.vx * brk, y + b.vy * brk); b.node.setAttribute('opacity', brk > 0 ? 1 - seg(t, 0.45, 0.6) : 0); });
          fire.setAttribute('opacity', 1 - seg(t, 0.45, 0.6));
          // Slow drift of the oxide cloud toward the ozone band.
          const drift = seg(t, 0.4, 1);
          dust.forEach((d) => { d.node.setAttribute('cx', d.x); d.node.setAttribute('cy', d.y0 + drift * (140 * d.v)); d.node.setAttribute('opacity', drift > 0 ? 0.25 + 0.35 * drift : 0); });
        },
      };
    },
  });
}
