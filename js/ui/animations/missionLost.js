// Scene 16 — Mission lost: the satellite greys out and drifts away; main cause + "Try this next time" tip.

import { s, h } from '../dom.js';
import { renderSatellite } from '../satellite.js';
import { sound } from '../sound.js';
import { play, W, H, seg, ease, stars, setT, miniSat } from './core.js';

export function missionLost(container, { state, cause = 'hardware', caption, tip, hold = true } = {}) {
  const ICON = { power: '🔋', comms: '📡', hardware: '🔧', thermal: '🌡️', payload: '🎯' };
  return play(container, {
    scene: 'mission-lost', label: 'Mission lost', duration: 4200, caption, hold,
    setup({ svg, html }) {
      svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'an-space' }), stars(90, 17));
      const sat = state ? renderSatellite(state, { glow: false }) : miniSat(3);
      if (state) { sat.setAttribute('x', -120); sat.setAttribute('y', -90); sat.setAttribute('width', 240); sat.setAttribute('height', 180); }
      const g = s('g', {}, sat);
      const icon = s('text', { x: W / 2, y: 80, class: 'an-cause', 'text-anchor': 'middle', opacity: 0 }, ICON[cause] ?? '⚠️');
      svg.append(g, icon);
      if (tip) html.append(h('div', { class: 'anim-tip' }, [h('strong', {}, 'Try this next time: '), tip]));
      const tipEl = html.querySelector('.anim-tip');
      let played = false;
      return {
        frame(t, ms) {
          if (t >= 0.1 && !played) { played = true; sound.fail(); }
          const grey = seg(t, 0.1, 0.45);
          g.style.filter = `grayscale(${grey}) brightness(${1 - grey * 0.45})`;
          const drift = ease.in(seg(t, 0.35, 1));
          setT(g, W / 2 + drift * 260, H / 2 + 10 - drift * 150, drift * 160 + Math.sin(ms / 500) * 3, 1 - drift * 0.75);
          g.setAttribute('opacity', 1 - seg(t, 0.8, 1) * 0.85);
          icon.setAttribute('opacity', seg(t, 0.15, 0.3) * (Math.sin(ms / 220) > -0.4 ? 1 : 0.3));
          if (tipEl) tipEl.style.opacity = seg(t, 0.7, 0.9);
        },
        final() { icon.setAttribute('opacity', 1); if (tipEl) tipEl.style.opacity = 1; },
      };
    },
  });
}
