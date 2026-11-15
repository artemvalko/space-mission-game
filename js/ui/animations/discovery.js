// Scene 13 — Rare storm in view (weather, simulated event): sparkle burst around the satellite.

import { s } from '../dom.js';
import { sound } from '../sound.js';
import { play, seg, ease, setT } from './core.js';

const STAR = '0,-10 2.5,-3 10,-3 4,2 6,10 0,5 -6,10 -4,2 -10,-3 -2.5,-3';

export function discovery(container, { x = 500, y = 160, phase = 'intro', bonus = '+5% service', caption, linger = 1800 } = {}) {
  const intro = phase === 'intro';
  return play(container, {
    onStart: () => { if (phase === 'intro') sound.radio(); },
    scene: intro ? 'discovery' : 'discovery-outcome', overlay: true, label: 'A huge storm in view', duration: intro ? 2000 : 1600, caption, linger: intro ? 0 : linger,
    setup({ svg }) {
      const stars = Array.from({ length: 14 }, (_, i) => ({ node: s('polygon', { points: STAR, class: 'an-sparkle' }), a: (i / 14) * Math.PI * 2, d: 40 + (i % 3) * 22 }));
      const label = s('text', { x, y, class: 'an-bonus', 'text-anchor': 'middle', opacity: 0 }, intro ? 'Huge storm in view!' : bonus);
      svg.append(...stars.map((st) => st.node), label);
      return {
        frame(t, ms) {
          const b = ease.out(seg(t, 0, 0.7));
          stars.forEach((st) => {
            setT(st.node, x + Math.cos(st.a) * st.d * b, y + Math.sin(st.a) * st.d * b, ms / 5, 0.4 + b * 0.8);
            st.node.setAttribute('opacity', 1 - seg(t, 0.6, 1));
          });
          setT(label, x, y - 30 - seg(t, 0.2, 1) * 40);
          label.setAttribute('opacity', seg(t, 0.15, 0.35) * (1 - seg(t, 0.85, 1)));
        },
      };
    },
  });
}
