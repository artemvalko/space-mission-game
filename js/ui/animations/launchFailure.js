// Scene 3 — Launch failure (reliability roll): wobble, flame flicker, explosion flash + debris,
// screen shake. Caption includes the rocket's success rate.

import { s } from '../dom.js';
import { mulberry32 } from '../../utils/random.js';
import { sound } from '../sound.js';
import { play, W, H, seg, ease, sky, rocketShape, flame, smoke, setT } from './core.js';

export function launchFailure(container, { launcher, caption, hold = true } = {}) {
  return play(container, {
    scene: 'launch-failure', label: 'The rocket explodes during launch', duration: 4200, caption, hold,
    setup({ svg }) {
      const bg = sky('#2f6fae', '#8fc4ea');
      const world = s('g', {}, [bg.rect]);
      const rk = rocketShape(launcher, 1.1);
      const fl = flame(1.2);
      const rocket = s('g', {}, [fl.node, rk.node]);
      const sm = smoke(50, 9);
      const rng = mulberry32(42);
      const debris = Array.from({ length: 16 }, () => ({
        node: s('rect', { width: 4 + rng() * 8, height: 3 + rng() * 6, class: rng() < 0.5 ? 'rk-body' : 'rk-nose' }),
        vx: (rng() - 0.5) * 0.5, vy: -0.15 - rng() * 0.35, spin: (rng() - 0.5) * 1.4,
      }));
      const debrisG = s('g', { opacity: 0 }, debris.map((d) => d.node));
      const fire = [0, 1, 2].map((i) => s('circle', { r: 0, class: `an-fire an-fire-${i}` }));
      const fireG = s('g', {}, fire);
      const flash = s('rect', { x: 0, y: 0, width: W, height: H, class: 'an-flash', opacity: 0 });
      world.append(sm.node, rocket, fireG, debrisG);
      svg.append(bg.defs, world, flash);
      let last = 0;
      let bx = W / 2;
      let by = 0;
      let boomed = false;
      return {
        frame(t, ms) {
          if (t >= 0.52 && !boomed) { boomed = true; sound.explosion(); }
          const dt = ms - last; last = ms;
          const climb = ease.out(seg(t, 0, 0.5));
          const y = 400 - climb * 190;
          const wob = Math.sin(ms / 85) * 14 * seg(t, 0.2, 0.5) + Math.sin(ms / 33) * 4 * seg(t, 0.35, 0.5);
          const alive = t < 0.52;
          if (alive) { bx = W / 2 + wob * 0.6; by = y - rk.height * 0.5; }
          setT(rocket, W / 2 + wob * 0.6, y, wob * 0.5);
          rocket.setAttribute('opacity', alive ? 1 : 0);
          fl.flicker(ms, 1, seg(t, 0.35, 0.52) * 1.4);
          fl.node.setAttribute('opacity', t > 0.4 && Math.sin(ms / 23) > 0.6 ? 0.25 : 1);
          if (alive && dt > 0) sm.spawn(W / 2 + wob * 0.6, y + 30, 0.6);
          sm.update(dt);
          const boom = seg(t, 0.52, 0.85);
          flash.setAttribute('opacity', t >= 0.52 ? Math.max(0, 1 - seg(t, 0.52, 0.62)) * 0.9 : 0);
          fire.forEach((c, i) => {
            c.setAttribute('cx', bx + (i - 1) * 18); c.setAttribute('cy', by + (i % 2) * 14);
            c.setAttribute('r', boom > 0 ? ease.out(boom) * (70 - i * 15) : 0);
            c.setAttribute('opacity', boom > 0 ? 1 - boom : 0);
          });
          debrisG.setAttribute('opacity', t >= 0.52 ? 1 - seg(t, 0.85, 1) : 0);
          const tt = Math.max(0, ms - 0.52 * 4200);
          debris.forEach((d) => setT(d.node, bx + d.vx * tt, by + d.vy * tt + 0.00025 * tt * tt, d.spin * tt));
          const shake = t >= 0.52 ? (1 - seg(t, 0.52, 0.8)) * 10 : 0;
          setT(world, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        },
        final() { setT(world, 0, 0); },
      };
    },
  });
}
