// "What a full constellation adds" (navigation lesson, Results): first ONE satellite — the receiver
// gets the time and one distance (a sphere), no position; then FOUR satellites in view — the range
// circles meet at the receiver → 3D fix (3 coordinates + the receiver's clock error).
// Research §1.1 / §4.5 (S02): at least 4 simultaneously visible GNSS satellites are needed.

import { s } from '../dom.js';
import { play, W, H, seg, ease, stars, miniSat, setT } from './core.js';

export function constellationFix(container, { caption, hold = false, linger = 0 } = {}) {
  return play(container, {
    scene: 'constellation-fix', label: 'One navigation satellite gives no position; four give a 3D fix', duration: 5200, hold, linger,
    caption: caption ?? 'One satellite: time + one distance — no position. Four in view: the distances meet in one point → a 3D position. That is what the full constellation adds.',
    setup({ svg }) {
      svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'an-space' }), stars(80, 23));
      const earth = s('circle', { cx: W / 2, cy: H + 260, r: 420, class: 'an-earth' });
      const rx = W / 2; const ry = H - 150; // receiver on the ground
      const receiver = s('g', {}, [s('circle', { cx: rx, cy: ry, r: 9, class: 'wm-sat' }), s('text', { x: rx, y: ry + 30, class: 'an-small-label', 'text-anchor': 'middle' }, 'receiver')]);
      const pos = [[W / 2 - 40, 70], [150, 120], [W - 150, 110], [W / 2 + 230, 40]];
      const sats = pos.map(([x, y]) => { const g = miniSat(1.4); setT(g, x, y); g.setAttribute('opacity', 0); return g; });
      const rings = pos.map(([x, y]) => s('circle', { cx: x, cy: y, r: Math.hypot(rx - x, ry - y), class: 'an-orbit', opacity: 0 }));
      const label = s('text', { x: W / 2, y: 36, class: 'an-big-label', 'text-anchor': 'middle', opacity: 0 }, '');
      const fix = s('circle', { cx: rx, cy: ry, r: 0, class: 'an-burst' });
      svg.append(earth, ...rings, ...sats, receiver, fix, label);
      return {
        frame(t) {
          const one = seg(t, 0, 0.12);
          sats[0].setAttribute('opacity', one);
          rings[0].setAttribute('opacity', seg(t, 0.1, 0.25) * 0.8);
          const many = seg(t, 0.45, 0.75);
          for (let i = 1; i < 4; i++) {
            const k = seg(many, (i - 1) / 3, i / 3);
            sats[i].setAttribute('opacity', k);
            rings[i].setAttribute('opacity', k * 0.8);
          }
          const phase1 = t < 0.45;
          label.textContent = phase1 ? '1 satellite → ? no position' : t < 0.8 ? 'more satellites in view…' : '4 satellites → 3D fix';
          label.setAttribute('opacity', 1);
          label.setAttribute('class', `an-big-label${phase1 ? ' an-warn' : ''}`);
          const f = ease.out(seg(t, 0.8, 1));
          fix.setAttribute('r', f * 26);
          fix.setAttribute('opacity', 1 - f * 0.6);
        },
      };
    },
  });
}
