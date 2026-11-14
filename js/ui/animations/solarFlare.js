// Scene 9 — Solar flare: the Sun pulses orange, a wave sweeps across, sparks and an aurora.
// Outcome depends on the choice: safe mode → a shield bubble; keep observing → sparks hit (red flash).

import { s } from '../dom.js';
import { sound } from '../sound.js';
import { play, W, H, seg, ease, newId } from './core.js';

export function solarFlare(container, { x = 500, y = 160, phase = 'intro', choiceIndex = 0, caption, linger = 1800 } = {}) {
  const intro = phase === 'intro';
  return play(container, {
    onStart: () => { if (phase === 'intro') sound.radio(); },
    scene: intro ? 'solar-flare' : 'solar-flare-outcome', overlay: true, label: 'Solar flare', duration: intro ? 2600 : 1800, caption, linger: intro ? 0 : linger,
    setup({ svg }) {
      const id = newId('flare');
      svg.append(s('defs', {}, s('radialGradient', { id }, [s('stop', { offset: 0, 'stop-color': '#fff1b8' }), s('stop', { offset: 0.5, 'stop-color': '#ff9a3c' }), s('stop', { offset: 1, 'stop-color': '#ff5b1a', 'stop-opacity': 0 })])));
      const sun = s('circle', { cx: 30, cy: 30, r: 60, fill: `url(#${id})` });
      const wave = s('circle', { cx: 30, cy: 30, r: 0, class: 'an-flare-wave' });
      const aurora = s('path', { d: `M ${x - 120} ${y + 70} Q ${x - 40} ${y + 30} ${x + 30} ${y + 72} T ${x + 160} ${y + 60}`, class: 'an-aurora', opacity: 0 });
      const sparks = s('g', {}, Array.from({ length: 10 }, (_, i) => s('line', { class: 'an-spark', 'data-i': i })));
      const shield = s('circle', { cx: x, cy: y, r: 0, class: 'an-shield' });
      const hit = s('circle', { cx: x, cy: y, r: 16, class: 'an-hit', opacity: 0 });
      svg.append(sun, aurora, wave, sparks, shield, hit);
      return {
        frame(t, ms) {
          const pulse = intro ? 1 + 0.25 * Math.sin(ms / 90) * (1 - seg(t, 0.8, 1)) : 1;
          sun.setAttribute('r', 60 * pulse * (intro ? 1 + ease.out(seg(t, 0, 0.3)) * 0.6 : 1.2));
          const wv = intro ? seg(t, 0.2, 0.9) : seg(t, 0, 0.6);
          wave.setAttribute('r', wv * Math.hypot(W, H)); wave.setAttribute('opacity', wv > 0 ? 0.8 * (1 - wv) : 0);
          aurora.setAttribute('opacity', intro ? seg(t, 0.4, 0.7) * (0.6 + 0.4 * Math.sin(ms / 160)) : 0.5 * (1 - t));
          const sp = intro ? seg(t, 0.55, 1) : choiceIndex === 1 ? seg(t, 0, 0.7) : 0;
          [...sparks.children].forEach((l, i) => {
            const a = (i / 10) * Math.PI * 2 + ms / 300; const r0 = 14 + ((ms / 7 + i * 13) % 26);
            l.setAttribute('x1', x + Math.cos(a) * r0); l.setAttribute('y1', y + Math.sin(a) * r0);
            l.setAttribute('x2', x + Math.cos(a) * (r0 + 6)); l.setAttribute('y2', y + Math.sin(a) * (r0 + 6));
            l.setAttribute('opacity', sp > 0 && Math.sin(ms / 40 + i) > 0 ? 1 : 0);
          });
          shield.setAttribute('r', !intro && choiceIndex === 0 ? ease.back(seg(t, 0, 0.4)) * 30 : 0);
          hit.setAttribute('opacity', !intro && choiceIndex === 1 && Math.sin(ms / 60) > 0.3 ? 0.8 * (1 - t) : 0);
        },
      };
    },
  });
}
