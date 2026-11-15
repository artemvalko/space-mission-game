// Phase 4 P1 #3 — Factory-to-pad montage (~5 s, skippable): assembly → shake table →
// thermal-vacuum chamber → truck to the pad → rollout. A calendar flips through the build months.

import { s } from '../dom.js';
import { renderSatellite } from '../satellite.js';
import { play, W, H, seg, ease, lerp, setT } from './core.js';

const STAGES = ['🔧 Assembly', '📳 Shake test', '🧊 Thermal-vacuum test', '🚚 Truck to the pad', '🚀 Rollout'];

export function montage(container, { state, devMonths = null, caption = 'Real satellites are tested to survive launch and space.', hold = false, linger = 1600 } = {}) {
  return play(container, {
    scene: 'montage', label: 'From the factory to the launch pad', duration: 5200, caption, hold, linger,
    setup({ svg }) {
      svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'mt-bg' }));
      const floor = s('rect', { x: 0, y: 330, width: W, height: 120, class: 'mt-floor' });
      const sat = state ? renderSatellite(state, { glow: false }) : s('svg');
      sat.setAttribute('x', -90); sat.setAttribute('y', -150); sat.setAttribute('width', 180); sat.setAttribute('height', 135);
      const satG = s('g', {}, sat);
      const arm = s('g', {}, [s('rect', { x: -6, y: -150, width: 12, height: 120, class: 'mt-arm' }), s('rect', { x: -30, y: -150, width: 60, height: 10, class: 'mt-arm' })]);
      const table = s('rect', { x: -110, y: 0, width: 220, height: 18, class: 'mt-table' });
      const waves = s('g', {}, [0, 1, 2].map((i) => s('path', { d: `M ${-120 + i * 10} 30 q 20 -12 40 0 t 40 0 t 40 0 t 40 0 t 40 0`, class: 'mt-wave' })));
      const chamber = s('g', {}, [s('rect', { x: -140, y: -190, width: 280, height: 210, rx: 100, class: 'mt-chamber' })]);
      const truck = s('g', {}, [
        s('rect', { x: -150, y: 0, width: 260, height: 26, rx: 4, class: 'mt-truck' }), s('rect', { x: 110, y: -36, width: 60, height: 62, rx: 6, class: 'mt-cab' }),
        ...[-120, -40, 60, 140].map((x) => s('circle', { cx: x, cy: 34, r: 14, class: 'mt-wheel' })),
      ]);
      const rocket = s('g', {}, [
        s('rect', { x: -26, y: -260, width: 52, height: 240, rx: 4, class: 'rk-body' }),
        s('path', { d: 'M -26 -260 Q 0 -310 26 -260 Z', class: 'rk-nose' }),
        s('rect', { x: -80, y: -20, width: 160, height: 20, class: 'mt-crawler' }),
      ]);
      const stageLabel = s('text', { x: 40, y: 60, class: 'mt-stage' }, '');
      const cal = s('g', {}, [
        s('rect', { x: W - 150, y: 80, width: 110, height: 100, rx: 10, class: 'mt-cal' }),
        s('rect', { x: W - 150, y: 80, width: 110, height: 26, rx: 10, class: 'mt-cal-top' }),
        s('text', { x: W - 95, y: 99, class: 'mt-cal-head', 'text-anchor': 'middle' }, 'MONTH'),
      ]);
      const calNum = s('text', { x: W - 95, y: 162, class: 'mt-cal-num', 'text-anchor': 'middle' }, '0');
      cal.append(calNum);
      svg.append(floor, waves, chamber, table, satG, arm, truck, rocket, stageLabel);
      if (devMonths) svg.append(cal); // only when the research gives a planning window
      return {
        frame(t, ms) {
          const k = Math.min(4, Math.floor(t * 5));
          const lt = (t * 5) % 1;
          stageLabel.textContent = STAGES[k];
          if (devMonths) calNum.textContent = String(Math.round(ease.inOut(t) * devMonths));
          const show = (node, on) => node.setAttribute('opacity', on ? 1 : 0);
          show(arm, k === 0); show(table, k === 1); show(waves, k === 1); show(chamber, k === 2); show(truck, k === 3); show(rocket, k === 4);
          show(satG, k < 4);
          if (k === 0) { setT(arm, lerp(260, 400, ease.out(seg(lt, 0, 0.6))), 330); setT(satG, 400, 330, 0, lerp(0.6, 1, seg(lt, 0.3, 0.8))); }
          if (k === 1) { const j = Math.sin(ms / 25) * 5; setT(table, 400 + j, 330); setT(satG, 400 + j, 330); setT(waves, 400, 330); }
          if (k === 2) {
            setT(chamber, 400, 330); setT(satG, 400, 330);
            chamber.firstChild.setAttribute('class', `mt-chamber ${Math.sin(ms / 220) > 0 ? 'cold' : 'hot'}`);
          }
          if (k === 3) { const x = lerp(160, 900, ease.inOut(lt)); setT(truck, x, 300); setT(satG, x - 20, 300, 0, 0.7); }
          if (k === 4) setT(rocket, lerp(-80, 400, ease.out(seg(lt, 0, 0.8))), 330);
        },
      };
    },
  });
}
