// Scene 11 — Hardware failure: the specific failed part on the player's satellite blinks red.
// Outcome: backup mode → amber; software fix → green; ignore → stays dim red.

import { s } from '../dom.js';
import { renderSatellite } from '../satellite.js';
import { sound } from '../sound.js';
import { play, W, H, seg, ease } from './core.js';

const OUTCOME_CLASS = ['part-amber', 'part-ok', 'part-dim'];

export function hardwareFailure(container, { state, itemId, phase = 'intro', choiceIndex = 0, caption, linger = 1800 } = {}) {
  const intro = phase === 'intro';
  return play(container, {
    onStart: () => { if (phase === 'intro') sound.radio(); },
    scene: intro ? 'hardware-failure' : 'hardware-failure-outcome', overlay: true, label: 'A part of the satellite fails', duration: intro ? 2200 : 1600, caption, linger: intro ? 0 : linger,
    setup({ svg }) {
      const panel = s('rect', { x: W / 2 - 190, y: 40, width: 380, height: 290, rx: 18, class: 'an-zoom-panel' });
      const sat = state ? renderSatellite(state, { glow: false }) : s('svg');
      sat.setAttribute('x', W / 2 - 180); sat.setAttribute('y', 50); sat.setAttribute('width', 360); sat.setAttribute('height', 270);
      const wrap = s('g', {}, [panel, sat]);
      svg.append(wrap);
      const part = sat.querySelector(`[data-id="${itemId}"]`) ?? sat.querySelector('[data-part="structure"]');
      part?.classList.add('part-fail');
      return {
        frame(t) {
          const z = intro ? ease.back(seg(t, 0, 0.3)) : 1;
          wrap.setAttribute('transform', `translate(${W / 2} ${H / 2 - 40}) scale(${0.6 + 0.4 * z}) translate(${-W / 2} ${-(H / 2 - 40)})`);
          wrap.setAttribute('opacity', intro ? seg(t, 0, 0.2) : 1 - seg(t, 0.75, 1));
          if (!intro && t > 0.15) { part?.classList.remove('part-fail'); part?.classList.add(OUTCOME_CLASS[choiceIndex] ?? 'part-amber'); }
        },
      };
    },
  });
}
