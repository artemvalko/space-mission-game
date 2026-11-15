// Scene 1 — Countdown & liftoff (always plays): pad, T-3-2-1, flame + smoke, camera follows
// the rocket, sky fades blue → black, stars appear.

import { s } from '../dom.js';
import { sound } from '../sound.js';
import { play, W, H, seg, ease, mixColor, sky, stars, rocketShape, flame, smoke, setT } from './core.js';

export function countdown(container, { launcher, caption = null, hold = false } = {}) {
  return play(container, {
    scene: 'countdown', label: 'Countdown and liftoff', duration: 5200, caption, hold,
    setup({ svg }) {
      const bg = sky('#000', '#000');
      const st = stars(90, 11);
      st.setAttribute('opacity', 0);
      const world = s('g', {}, [
        s('rect', { x: 0, y: 380, width: W, height: 200, class: 'an-ground' }),
        s('rect', { x: 330, y: 372, width: 140, height: 10, class: 'an-pad' }),
        s('rect', { x: 452, y: 170, width: 14, height: 205, class: 'an-tower' }),
        ...[0, 1, 2, 3, 4, 5, 6].map((i) => s('line', { x1: 452, y1: 190 + i * 28, x2: 466, y2: 204 + i * 28, class: 'an-tower-line' })),
      ]);
      const rk = rocketShape(launcher, 1.25);
      const fl = flame(1.3);
      const rocket = s('g', {}, [fl.node, rk.node]);
      const sm = smoke(60, 5);
      world.append(sm.node);
      const count = s('text', { x: W / 2, y: 110, class: 'an-count', 'text-anchor': 'middle' }, '');
      svg.append(bg.defs, bg.rect, st, world, rocket, count);
      let last = 0;
      let rumbled = false;
      return {
        frame(t, ms) {
          if (t >= 0.36 && !rumbled) { rumbled = true; sound.rumble(3.2); }
          const dt = ms - last; last = ms;
          const n = t < 0.12 ? 'T-3' : t < 0.24 ? '2' : t < 0.36 ? '1' : t < 0.55 ? 'LIFTOFF!' : '';
          count.textContent = n;
          count.setAttribute('opacity', t < 0.55 ? 1 : 0);
          const ign = seg(t, 0.3, 0.4);
          fl.flicker(ms, ign);
          fl.node.setAttribute('opacity', ign > 0 ? 1 : 0);
          const alt = ease.in(seg(t, 0.38, 1)) * 1100;
          const follow = Math.max(0, alt - 160);         // camera follows after the rocket climbs a bit
          const rocketY = 378 - (alt - follow);
          setT(rocket, W / 2, rocketY);
          setT(world, 0, follow);
          if (t > 0.3 && t < 0.75 && dt > 0) for (let i = 0; i < 2; i++) sm.spawn(W / 2 + (Math.random() - 0.5) * 20, 382, 1 + seg(t, 0.38, 0.6) * 2);
          sm.update(dt);
          const p = seg(t, 0.5, 1);
          bg.set(mixColor('#121212', '#000000', p), mixColor('#262626', '#050505', p));
          st.setAttribute('opacity', ease.inOut(p));
        },
      };
    },
  });
}
