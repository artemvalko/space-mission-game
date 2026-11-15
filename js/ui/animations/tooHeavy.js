// Scene 4 — Too heavy / wrong orbit (NO-GO designs simulated anyway): the rocket climbs slowly,
// runs out of fuel (or can't get to the target orbit), the satellite falls back with a re-entry glow.

import { s } from '../dom.js';
import { sound } from '../sound.js';
import { play, W, H, seg, ease, sky, stars, rocketShape, flame, setT, lerp, newId } from './core.js';

export function tooHeavy(container, { launcher, reason = 'too_heavy', caption, hold = true } = {}) {
  return play(container, {
    scene: reason === 'wrong_orbit' ? 'wrong-orbit' : 'too-heavy', label: 'The satellite fails to reach orbit and falls back', duration: 5600, caption, hold,
    setup({ svg }) {
      const bg = sky('#163a66', '#3d7bb5');
      const glowId = newId('glow');
      const defs = s('defs', {}, s('radialGradient', { id: glowId }, [
        s('stop', { offset: '0', 'stop-color': '#fff3c4' }), s('stop', { offset: '.4', 'stop-color': '#ff9a3c' }), s('stop', { offset: '1', 'stop-color': '#ff4d1a', 'stop-opacity': 0 }),
      ]));
      const st = stars(60, 4);
      st.setAttribute('opacity', 0.5);
      const ground = s('path', { d: `M 0 ${H} Q ${W / 2} ${H - 80} ${W} ${H} Z`, class: 'an-earth-limb' });
      const rk = rocketShape(launcher, 0.7);
      const fl = flame(0.8);
      const rocket = s('g', {}, [fl.node, rk.node]);
      const sat = s('rect', { x: -6, y: -6, width: 12, height: 12, class: 'an-minisat-body' });
      const glow = s('circle', { r: 0, fill: `url(#${glowId})` });
      const trail = s('path', { class: 'an-trail', d: '' });
      const satG = s('g', { opacity: 0 }, [trail, glow, sat]);
      const gaugeLabel = reason === 'wrong_orbit' ? 'ORBIT' : 'FUEL';
      const gaugeFill = s('rect', { x: 34, y: 120, width: 18, height: 200, class: 'an-fuel' });
      const gauge = s('g', {}, [
        s('rect', { x: 30, y: 116, width: 26, height: 208, rx: 4, class: 'an-gauge-frame' }), gaugeFill,
        s('text', { x: 43, y: 342, class: 'an-small-label', 'text-anchor': 'middle' }, gaugeLabel),
      ]);
      const warn = s('text', { x: W / 2, y: 70, class: 'an-big-label an-warn', 'text-anchor': 'middle', opacity: 0 }, reason === 'wrong_orbit' ? 'Wrong orbit!' : 'Too heavy!');
      svg.append(defs, bg.defs, bg.rect, st, ground, rocket, satG, gauge, warn);
      // Trajectory: slow arc up, then the satellite falls along a parabola.
      const path = (u) => ({ x: lerp(180, 520, u), y: 420 - Math.sin(u * Math.PI * 0.9) * 270 });
      const fall = (u) => ({ x: lerp(520, 720, u), y: lerp(path(1).y, 460, u * u) });
      const trailPts = [];
      let failed = false;
      return {
        frame(t, ms) {
          if (t >= 0.45 && !failed) { failed = true; sound.fail(); }
          const up = ease.out(seg(t, 0, 0.5));
          const p = path(up);
          const next = path(Math.min(1, up + 0.01));
          const ang = Math.atan2(next.y - p.y, next.x - p.x) * 180 / Math.PI + 90;
          setT(rocket, p.x, p.y, ang);
          const fuel = 1 - seg(t, 0, 0.48);
          gaugeFill.setAttribute('y', 120 + (1 - fuel) * 200); gaugeFill.setAttribute('height', fuel * 200);
          gaugeFill.classList.toggle('low', fuel < 0.25);
          fl.flicker(ms, Math.max(0, fuel) * 0.9, fuel < 0.2 ? 0.8 : 0);
          warn.setAttribute('opacity', t > 0.45 && t < 0.75 && Math.sin(ms / 120) > -0.3 ? 1 : 0);
          const f = ease.in(seg(t, 0.55, 1));
          const fp = t < 0.55 ? path(up) : fall(f);
          satG.setAttribute('opacity', t >= 0.52 ? 1 : 0);
          setT(sat, fp.x, fp.y, ms / 8);
          if (t >= 0.55) {
            setT(rocket, p.x + (t - 0.55) * 300, p.y + (t - 0.55) ** 2 * 900, ang + (t - 0.55) * 200);
            rocket.setAttribute('opacity', 1 - seg(t, 0.6, 0.8));
          }
          const heat = seg(t, 0.68, 0.95);
          glow.setAttribute('cx', fp.x); glow.setAttribute('cy', fp.y); glow.setAttribute('r', heat * 34 * (1 + Math.sin(ms / 40) * 0.08));
          if (t >= 0.55) { trailPts.push(`${fp.x},${fp.y}`); if (trailPts.length > 26) trailPts.shift(); }
          trail.setAttribute('d', trailPts.length > 1 ? `M ${trailPts.join(' L ')}` : '');
          trail.setAttribute('opacity', heat);
          sat.setAttribute('opacity', 1 - seg(t, 0.9, 1));
        },
      };
    },
  });
}
