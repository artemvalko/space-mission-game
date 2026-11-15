// End of mission: LEO/SSO → the air slowly pulls it down and it burns up (deorbit); MEO/GEO →
// a last thruster burn moves it out of the busy orbit ("graveyard"). Caption on space-debris
// responsibility; without a disposal plan it says so honestly.

import { s } from '../dom.js';
import { play, W, H, seg, ease, stars, miniSat, setT, lerp, newId } from './core.js';
import { sound } from '../sound.js';

export const END_OF_LIFE_CAPTION = {
  deorbit: 'Mission over: following the disposal plan, it drops into the air and burns up — no junk left behind.',
  graveyard: 'Still in space: one more object to track. Its own thrusters moved it out of the busy orbit.',
  farewell: 'Mission over: one last message home, then the satellite is switched off.',
  none: 'Mission over — but there was no disposal plan. The satellite stays up as space junk. Real missions must plan this.',
};

export const endOfLifeKind = (orbitId) => (['leo_550', 'sso_550_650'].includes(orbitId) ? 'deorbit' : ['meo_gnss', 'geo'].includes(orbitId) ? 'graveyard' : 'farewell');

export function endOfLife(container, { orbitId = 'leo_550', disposal = true, caption, hold = false, linger = 1800 } = {}) {
  const kind = disposal ? endOfLifeKind(orbitId) : 'farewell';
  return play(container, {
    scene: `end-${kind}`, label: 'End of the mission', duration: 4200, caption: caption ?? END_OF_LIFE_CAPTION[disposal ? kind : 'none'], hold, linger,
    setup({ svg }) {
      const glowId = newId('reentry');
      svg.append(s('defs', {}, s('radialGradient', { id: glowId }, [s('stop', { offset: 0, 'stop-color': '#ffffff' }), s('stop', { offset: 0.45, 'stop-color': '#ffc58a', 'stop-opacity': 0.55 }), s('stop', { offset: 1, 'stop-color': '#ff9a3c', 'stop-opacity': 0 })])));
      svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'an-space' }), stars(100, 41));
      const sat = miniSat(1.6);
      const puff = s('g', {}, [0, 1, 2].map(() => s('circle', { r: 0, class: 'an-puff' })));
      const fire = s('circle', { r: 0, fill: `url(#${glowId})` });
      const parts = [];
      if (kind === 'farewell') {
        const earth = s('circle', { cx: 110, cy: 330, r: 26, class: 'an-earth' });
        const waves = s('g', {}, [0, 1, 2, 3].map(() => s('path', { class: 'an-wave' })));
        const bye = s('text', { x: 560, y: 120, class: 'an-big-label', 'text-anchor': 'middle', opacity: 0 }, 'Goodbye!');
        svg.append(earth, waves, sat, bye);
        parts.push({ waves, bye });
      } else {
        svg.append(s('circle', { cx: W / 2, cy: H / 2, r: 90, class: 'an-earth' }), s('circle', { cx: W / 2, cy: H / 2, r: 98, class: 'an-atmo' }));
        svg.append(s('circle', { cx: W / 2, cy: H / 2, r: kind === 'graveyard' ? 150 : 130, class: 'an-orbit' }));
        if (kind === 'graveyard') svg.append(s('circle', { cx: W / 2, cy: H / 2, r: 195, class: 'an-orbit graveyard' }), s('text', { x: W / 2, y: H / 2 - 200, class: 'an-small-label', 'text-anchor': 'middle' }, 'graveyard orbit'));
        svg.append(puff, fire, sat);
      }
      let played = false;
      return {
        frame(t, ms) {
          if (kind === 'farewell') {
            setT(sat, 560, 180, Math.sin(ms / 400) * 4);
            const [{ waves, bye }] = parts;
            [...waves.children].forEach((w, i) => {
              const u = ((t * 3 + i * 0.25) % 1);
              const r = 20 + u * 520;
              w.setAttribute('d', `M ${560 - r * 0.86} ${180 + r * 0.5 - 30} A ${r} ${r} 0 0 0 ${560 - r * 0.5} ${180 + r * 0.86}`);
              w.setAttribute('opacity', t < 0.8 ? 1 - u : 0);
            });
            sat.style.filter = `grayscale(${seg(t, 0.75, 1)})`;
            bye.setAttribute('opacity', seg(t, 0.55, 0.7));
            if (t > 0.75 && !played) { played = true; sound.radio(); }
            return;
          }
          const R0 = kind === 'graveyard' ? 150 : 130;
          const a = -Math.PI / 2 + t * Math.PI * 1.6;
          const burn = seg(t, 0.15, 0.3);
          const R = kind === 'graveyard' ? lerp(R0, 195, ease.inOut(seg(t, 0.25, 0.7))) : lerp(R0, 70, ease.in(seg(t, 0.3, 0.95)));
          const x = W / 2 + Math.cos(a) * R; const y = H / 2 + Math.sin(a) * R;
          setT(sat, x, y, (a * 180) / Math.PI);
          [...puff.children].forEach((c, i) => { c.setAttribute('cx', x - Math.cos(a) * (8 + i * 8)); c.setAttribute('cy', y - Math.sin(a) * (8 + i * 8)); c.setAttribute('r', burn > 0 && burn < 1 ? 4 + i * 2 : 0); c.setAttribute('opacity', 0.7); });
          if (burn > 0 && !played) { played = true; sound.radio(); }
          if (kind === 'deorbit') {
            const heat = seg(t, 0.6, 0.95);
            fire.setAttribute('cx', x); fire.setAttribute('cy', y); fire.setAttribute('r', heat * 34);
            sat.setAttribute('opacity', 1 - seg(t, 0.88, 1));
          }
        },
      };
    },
  });
}
