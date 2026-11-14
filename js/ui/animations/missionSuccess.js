// Scene 14 — Mission success: final orbit, mission patch animates in, star confetti, grade stamp.

import { s } from '../dom.js';
import { mulberry32 } from '../../utils/random.js';
import { sound } from '../sound.js';
import { play, W, H, seg, ease, stars, setT, lerp, miniSat } from './core.js';
import { missionPatch } from './patch.js';

export function missionSuccess(container, { name, team, orbitId, grade = 'A', caption, hold = true } = {}) {
  return play(container, {
    scene: 'mission-success', label: 'Mission success', duration: 3800, caption, hold,
    setup({ svg }) {
      svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'an-space' }), stars(120, 31));
      const planet = s('circle', { cx: 160, cy: 330, r: 70, class: orbitId === 'mars' ? 'an-mars' : orbitId === 'lunar' ? 'an-moon' : 'an-earth' });
      const ring = s('ellipse', { cx: 160, cy: 330, rx: 120, ry: 40, class: 'an-orbit' });
      const sat = miniSat(1.2);
      const patch = missionPatch({ name, team, orbitId, r: 110 });
      const rng = mulberry32(5);
      const conf = Array.from({ length: 46 }, () => ({ node: s('polygon', { points: '0,-6 1.8,-2 6,-2 2.6,1 4,6 0,3 -4,6 -2.6,1 -6,-2 -1.8,-2', class: rng() < 0.5 ? 'an-conf-a' : 'an-conf-b' }), x: rng() * W, v: 0.12 + rng() * 0.2, d: rng() * 300, spin: (rng() - 0.5) * 0.6 }));
      const stamp = s('g', { opacity: 0 }, [
        s('rect', { x: -60, y: -60, width: 120, height: 120, rx: 14, class: 'an-stamp' }),
        s('text', { x: 0, y: 30, class: 'an-stamp-text', 'text-anchor': 'middle' }, grade),
      ]);
      svg.append(planet, ring, sat, ...conf.map((c) => c.node), patch, stamp);
      let chimed = false;
      return {
        frame(t, ms) {
          if (t >= 0.55 && !chimed) { chimed = true; sound.chime(); }
          const a = ms / 900;
          setT(sat, 160 + Math.cos(a) * 120, 330 + Math.sin(a) * 40);
          const p = ease.back(seg(t, 0.05, 0.4));
          setT(patch, W / 2, H / 2 - 10, (1 - p) * -40, Math.max(0.01, p));
          conf.forEach((c) => {
            const y = -20 + ((ms * c.v + c.d) % (H + 40));
            setT(c.node, c.x + Math.sin(ms / 400 + c.d) * 14, y, ms * c.spin);
            c.node.setAttribute('opacity', seg(t, 0.2, 0.3));
          });
          const st = seg(t, 0.55, 0.72);
          stamp.setAttribute('opacity', st > 0 ? 1 : 0);
          setT(stamp, W / 2 + 190, H / 2 - 90, -14, lerp(3, 1, ease.out(st)));
        },
      };
    },
  });
}
