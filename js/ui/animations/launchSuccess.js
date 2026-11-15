// Scene 2 — Launch success: stage separation, fairing opens, the player's actual satellite drifts
// out and unfolds its panels/antenna, "In orbit!" burst.

import { s } from '../dom.js';
import { renderSatellite } from '../satellite.js';
import { sound } from '../sound.js';
import { play, W, H, seg, ease, stars, flame, setT, lerp } from './core.js';

export function launchSuccess(container, { state, caption = 'In orbit!', hold = true } = {}) {
  return play(container, {
    scene: 'launch-success', label: 'Satellite separates and unfolds in orbit', duration: 4600, caption, hold,
    setup({ svg }) {
      svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'an-space' }), stars(110, 21));
      svg.append(s('circle', { cx: W / 2, cy: 1320, r: 960, class: 'an-earth-limb' }), s('circle', { cx: W / 2, cy: 1320, r: 975, class: 'an-atmo' }));
      const lower = s('g', {}, [s('rect', { x: -22, y: 0, width: 44, height: 120, rx: 3, class: 'rk-body' }), s('rect', { x: -22, y: 40, width: 44, height: 5, class: 'rk-stripe' })]);
      const fl = flame(1.1);
      const upper = s('g', {}, [fl.node, s('rect', { x: -22, y: -70, width: 44, height: 70, rx: 3, class: 'rk-body' })]);
      const fairL = s('path', { d: 'M 0 -170 Q -40 -150 -26 -70 L 0 -70 Z', class: 'rk-nose' });
      const fairR = s('path', { d: 'M 0 -170 Q 40 -150 26 -70 L 0 -70 Z', class: 'rk-nose' });
      const sat = state ? renderSatellite(state, { glow: false }) : s('svg');
      sat.setAttribute('x', -80); sat.setAttribute('y', -165); sat.setAttribute('width', 160); sat.setAttribute('height', 120);
      const satG = s('g', { opacity: 0 }, sat);
      const unfold = [...sat.querySelectorAll('[data-part="power"], [data-part="comms"]')];
      unfold.forEach((g) => g.classList.add('an-unfold'));
      const vehicle = s('g', {}, [lower, upper, satG, fairL, fairR]);
      const burst = s('circle', { cx: 0, cy: 0, r: 0, class: 'an-burst' });
      const label = s('text', { x: 0, y: 0, class: 'an-big-label', 'text-anchor': 'middle', opacity: 0 }, 'In orbit!');
      svg.append(vehicle, burst, label);
      let last = 0;
      let chimed = false;
      return {
        frame(t, ms) {
          if (t >= 0.84 && !chimed) { chimed = true; sound.chime(); }
          const dt = ms - last; last = ms;
          setT(vehicle, W / 2, 300);
          const sep = ease.out(seg(t, 0.08, 0.35));
          setT(lower, 0, sep * 260, sep * 12);
          lower.setAttribute('opacity', 1 - seg(t, 0.2, 0.4));
          fl.flicker(ms, seg(t, 0.12, 0.2) * (1 - seg(t, 0.3, 0.38)));
          const open = ease.out(seg(t, 0.32, 0.5));
          setT(fairL, -open * 120, open * 40, -open * 60);
          setT(fairR, open * 120, open * 40, open * 60);
          fairL.setAttribute('opacity', 1 - seg(t, 0.4, 0.55)); fairR.setAttribute('opacity', 1 - seg(t, 0.4, 0.55));
          const out = ease.inOut(seg(t, 0.42, 0.62));
          satG.setAttribute('opacity', seg(t, 0.38, 0.45));
          setT(satG, out * 40, -out * 70, 0, lerp(1, 1.35, out));
          upper.setAttribute('opacity', 1 - seg(t, 0.55, 0.7));
          const u = ease.back(seg(t, 0.62, 0.85));
          unfold.forEach((g) => { g.style.transform = `scale(${Math.max(0.05, u)}, ${Math.max(0.3, u)})`; });
          const b = seg(t, 0.84, 1);
          burst.setAttribute('cx', W / 2 + 40); burst.setAttribute('cy', 170);
          burst.setAttribute('r', b * 220); burst.setAttribute('opacity', b > 0 ? 1 - b : 0);
          setT(label, W / 2, 70 + (1 - ease.back(seg(t, 0.84, 0.95))) * 20, 0, 0.6 + 0.4 * ease.back(seg(t, 0.84, 0.95)));
          label.setAttribute('opacity', seg(t, 0.84, 0.9));
          void dt;
        },
        final() { unfold.forEach((g) => { g.style.transform = ''; }); },
      };
    },
  });
}
