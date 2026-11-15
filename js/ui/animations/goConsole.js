// Phase 4 P1 #4 — Mission control Go/No-Go console: each role is a lamp that lights green or red
// one by one with a beep; all green → "GO FOR LAUNCH".

import { s } from '../dom.js';
import { play, W, H, seg, ease } from './core.js';
import { sound } from '../sound.js';

/** roles: [{ icon, name, who, vote: 'go'|'nogo', reason? }] */
export function goConsole(container, { roles = [], caption, hold = false, linger = 1400 } = {}) {
  const allGo = roles.every((r) => r.vote === 'go');
  const n = Math.max(1, roles.length);
  return play(container, {
    scene: 'go-console', label: 'Go / No-Go poll', duration: 900 + n * 650, caption, hold, linger,
    setup({ svg }) {
      svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'gc-bg' }));
      svg.append(s('text', { x: W / 2, y: 58, class: 'gc-title', 'text-anchor': 'middle' }, 'GO / NO-GO?'));
      const colW = Math.min(180, (W - 80) / n);
      const lamps = roles.map((r, i) => {
        const x = W / 2 + (i - (n - 1) / 2) * colW;
        const lamp = s('circle', { cx: x, cy: 200, r: 38, class: 'gc-lamp' });
        const glow = s('circle', { cx: x, cy: 200, r: 54, class: 'gc-glow', opacity: 0 });
        const word = s('text', { x, y: 212, class: 'gc-word', 'text-anchor': 'middle', opacity: 0 }, r.vote === 'go' ? 'GO' : 'NO');
        svg.append(glow, lamp, word,
          s('text', { x, y: 280, class: 'gc-role', 'text-anchor': 'middle' }, [s('title', {}, r.name), r.icon]),
          s('text', { x, y: 304, class: 'gc-who', 'text-anchor': 'middle' }, r.who ?? ''),
          r.reason ? s('text', { x, y: 328, class: 'gc-reason', 'text-anchor': 'middle' }, `“${r.reason}”`) : s('g'));
        return { lamp, glow, word, vote: r.vote, lit: false };
      });
      const big = s('text', { x: W / 2, y: 400, class: ['gc-big', allGo ? 'go' : 'mixed'].join(' '), 'text-anchor': 'middle', opacity: 0 }, allGo ? 'GO!' : roles.filter((r) => r.vote === 'go').length > roles.length / 2 ? 'GO (majority)' : 'NO-GO');
      svg.append(big);
      return {
        frame(t) {
          lamps.forEach((l, i) => {
            const on = seg(t, (0.25 + i * 650) / (900 + n * 650), (0.25 + i * 650 + 200) / (900 + n * 650));
            if (on > 0 && !l.lit) { l.lit = true; sound.beep(l.vote === 'go'); }
            l.lamp.setAttribute('class', `gc-lamp ${on > 0 ? l.vote : ''}`);
            l.glow.setAttribute('class', `gc-glow ${l.vote}`);
            l.glow.setAttribute('opacity', on * 0.6);
            l.word.setAttribute('opacity', on);
          });
          const b = seg(t, 0.85, 1);
          big.setAttribute('opacity', b);
          big.setAttribute('transform', `translate(${W / 2} 400) scale(${0.7 + 0.3 * ease.back(b)}) translate(${-W / 2} -400)`);
        },
        final() { lamps.forEach((l) => { l.lamp.setAttribute('class', `gc-lamp ${l.vote}`); l.word.setAttribute('opacity', 1); }); },
      };
    },
  });
}
