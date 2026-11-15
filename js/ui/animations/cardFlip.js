// Scene 12 — Budget cut / launch delay: the money or time card shakes, then flips to show
// what the decision cost.

import { h } from '../dom.js';
import { icon } from '../icons.js';
import { sound } from '../sound.js';
import { play, seg } from './core.js';

export function cardFlip(container, { kind = 'budget', title, front, back = '', phase = 'intro', caption, linger = 1800 } = {}) {
  const intro = phase === 'intro';
  const front0 = kind === 'budget' ? 'money' : 'calendar';
  return play(container, {
    onStart: () => { if (phase === 'intro') sound.radio(); },
    scene: intro ? `card-${kind}` : `card-${kind}-outcome`, overlay: true, label: title ?? 'Card flip', duration: intro ? 1600 : 1400, caption, linger: intro ? 0 : linger,
    setup({ html }) {
      const card = h('div', { class: 'flip-card' }, [
        h('div', { class: 'flip-face flip-front' }, [h('div', { class: 'flip-icon' }, icon(front0, 32)), h('div', { class: 'flip-title' }, title), h('div', { class: 'flip-text' }, front)]),
        h('div', { class: 'flip-face flip-back' }, [h('div', { class: 'flip-icon' }, icon(kind === 'budget' ? 'chart' : 'hourglass', 32)), h('div', { class: 'flip-text' }, back)]),
      ]);
      html.append(h('div', { class: 'flip-wrap' }, card));
      return {
        frame(t, ms) {
          if (intro) {
            const shake = Math.sin(ms / 30) * 6 * seg(t, 0.2, 0.7) * (1 - seg(t, 0.7, 1));
            card.style.transform = `translateX(${shake}px) scale(${0.8 + 0.2 * seg(t, 0, 0.2)})`;
          } else {
            card.style.transform = `rotateY(${180 * seg(t, 0, 0.5)}deg)`;
          }
        },
      };
    },
  });
}
