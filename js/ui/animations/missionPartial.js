// Scene 15 — Partial success: cracked/tarnished patch + list of what was missed.

import { s } from '../dom.js';
import { play, W, H, seg, ease, stars, setT } from './core.js';
import { missionPatch } from './patch.js';

export function missionPartial(container, { name, team, orbitId, missed = [], grade = 'C', caption, hold = true } = {}) {
  return play(container, {
    scene: 'mission-partial', label: 'Partial success', duration: 3400, caption, hold,
    setup({ svg }) {
      svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'an-space' }), stars(90, 13));
      const patch = missionPatch({ name, team, orbitId, r: 105, cracked: true });
      const lines = missed.slice(0, 5).map((m, i) => s('text', { x: 430, y: 150 + i * 38, class: 'an-missed', opacity: 0 }, `${m}`));
      const head = s('text', { x: 430, y: 110, class: 'an-small-head', opacity: 0 }, 'What was missed:');
      const stamp = s('text', { x: 250, y: 330, class: 'an-stamp-text an-stamp-dim', 'text-anchor': 'middle', opacity: 0 }, grade);
      svg.append(patch, head, ...lines, stamp);
      const cracks = [...patch.querySelectorAll('.patch-crack')];
      cracks.forEach((c) => { c.style.strokeDasharray = '400'; c.style.strokeDashoffset = '400'; });
      return {
        frame(t) {
          setT(patch, 220, H / 2 - 10, 0, Math.max(0.01, ease.out(seg(t, 0, 0.3))));
          cracks.forEach((c) => { c.style.strokeDashoffset = `${400 * (1 - seg(t, 0.3, 0.55))}`; });
          patch.classList.toggle('tarnish', t > 0.35);
          head.setAttribute('opacity', seg(t, 0.4, 0.5));
          lines.forEach((l, i) => l.setAttribute('opacity', seg(t, 0.5 + i * 0.08, 0.58 + i * 0.08)));
          stamp.setAttribute('opacity', seg(t, 0.85, 0.95));
        },
      };
    },
  });
}
