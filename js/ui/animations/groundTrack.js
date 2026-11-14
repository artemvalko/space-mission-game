// Phase 4 P2 #6/#7/#11 — Ground track on a simplified world map (Orbit step) and the ground
// stations map (Talking to Earth step). The track draws itself with a coverage swath; GEO is a
// fixed dot with its coverage circle; far orbits get an inset. Dishes blink when the satellite
// passes over them. Night side shaded with a day/night terminator. ≤ 1 s, never blocks input.

import { s } from '../dom.js';
import { play, seg } from './core.js';

const MW = 800; const MH = 400; // equirectangular map (viewBox)
const X = (lon) => ((lon + 180) / 360) * MW;
const Y = (lat) => ((90 - lat) / 180) * MH;

const CONTINENTS = [
  [[-168, 65], [-140, 70], [-95, 72], [-75, 62], [-60, 50], [-80, 25], [-97, 18], [-105, 22], [-118, 33], [-125, 48], [-140, 60]],
  [[-80, 10], [-60, 8], [-35, -6], [-40, -22], [-58, -38], [-70, -55], [-75, -40], [-81, -5]],
  [[-10, 36], [0, 44], [-5, 48], [5, 52], [10, 58], [25, 70], [40, 68], [40, 45], [28, 40], [15, 38]],
  [[-17, 15], [-10, 30], [10, 37], [32, 31], [43, 12], [51, 11], [40, -5], [35, -25], [20, -35], [12, -15], [8, 4], [-8, 5]],
  [[40, 45], [40, 68], [60, 72], [100, 78], [140, 72], [170, 66], [160, 58], [140, 50], [130, 35], [120, 22], [105, 10], [98, 15], [80, 8], [70, 22], [58, 25], [48, 30]],
  [[114, -22], [122, -18], [132, -12], [142, -11], [150, -24], [146, -38], [136, -35], [118, -35]],
  [[-50, 60], [-20, 70], [-25, 82], [-60, 80]],
  [[-180, -70], [180, -70], [180, -90], [-180, -90]],
];

export const STATION_SITES = {
  gs_single: [{ name: 'Mission centre', lon: -80, lat: 28 }],
  gs_global: [{ name: 'Florida', lon: -80, lat: 28 }, { name: 'Svalbard', lon: 15, lat: 78 }, { name: 'Australia', lon: 147, lat: -35 }],
  gs_dsn: [{ name: 'California', lon: -117, lat: 35 }, { name: 'Spain', lon: -4, lat: 40 }, { name: 'Australia', lon: 149, lat: -35 }],
};

const ORBIT_TRACK = {
  leo: { inc: 51.6, periodH: 1.58, swath: 16, orbits: 3 },
  sso: { inc: 97.8, periodH: 1.65, swath: 12, orbits: 3 },
  heo: { inc: 63.4, periodH: 12, swath: 26, orbits: 2, ecc: 0.74 },
};

export const TRACK_CAPTION = {
  leo: 'Each orbit lands further west as Earth turns underneath.',
  sso: 'Almost over the poles: in a day it passes over the whole Earth.',
  geo: 'It stays above one spot and always sees the same third of Earth.',
  heo: 'It lingers for hours over the far north, then races past the south.',
  far: 'Too far for a ground track — it sees a whole planet at once.',
};

/** Sub-satellite points (lon, lat) for a few orbits. Pure maths; lon wraps to -180..180. */
export function trackPoints(orbitId, startLon = -100) {
  const o = ORBIT_TRACK[orbitId];
  if (!o) return [];
  const pts = [];
  const steps = 240 * o.orbits;
  const i = (o.inc * Math.PI) / 180;
  for (let k = 0; k <= steps; k++) {
    const frac = k / 240; // orbits elapsed
    let u;
    if (o.ecc) {
      // Molniya: solve Kepler so time is spent near apogee (argument of perigee 270°).
      const M = frac * 2 * Math.PI;
      let E = M; for (let n = 0; n < 6; n++) E -= (E - o.ecc * Math.sin(E) - M) / (1 - o.ecc * Math.cos(E));
      const nu = 2 * Math.atan2(Math.sqrt(1 + o.ecc) * Math.sin(E / 2), Math.sqrt(1 - o.ecc) * Math.cos(E / 2));
      u = nu + (270 * Math.PI) / 180;
    } else {
      u = frac * 2 * Math.PI;
    }
    const lat = Math.asin(Math.sin(i) * Math.sin(u)) * (180 / Math.PI);
    const lonIn = Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u)) * (180 / Math.PI);
    const earthTurn = frac * o.periodH * 15; // Earth turns 15° per hour
    let lon = startLon + lonIn - earthTurn;
    lon = ((lon + 540) % 360) - 180;
    pts.push([lon, lat]);
  }
  return pts;
}

function pathFrom(pts) {
  let d = '';
  pts.forEach(([lon, lat], k) => {
    const jump = k > 0 && Math.abs(lon - pts[k - 1][0]) > 180; // wrapped around the map edge
    d += `${k === 0 || jump ? 'M' : 'L'} ${X(lon).toFixed(1)} ${Y(lat).toFixed(1)} `;
  });
  return d;
}

function worldMap(svg) {
  svg.append(s('rect', { x: 0, y: 0, width: MW, height: MH, class: 'wm-ocean' }));
  for (const c of CONTINENTS) svg.append(s('polygon', { points: c.map(([lo, la]) => `${X(lo)},${Y(la)}`).join(' '), class: 'wm-land' }));
  for (let lat = -60; lat <= 60; lat += 30) svg.append(s('line', { x1: 0, y1: Y(lat), x2: MW, y2: Y(lat), class: 'wm-grid' }));
  // Day/night terminator (northern summer): night on the right, wavy edge.
  const pts = [];
  for (let lat = 90; lat >= -90; lat -= 6) pts.push(`${X(60 + 25 * Math.sin((lat * Math.PI) / 90))},${Y(lat)}`);
  svg.append(s('polygon', { points: `${pts.join(' ')} ${MW},${MH} ${MW},0`, class: 'wm-night' }));
}

/**
 * params: { orbitId, groundId, mode: 'track' | 'stations', caption }
 */
export function groundTrack(container, { orbitId = 'leo', groundId = null, mode = 'track', caption } = {}) {
  const far = ['l2', 'lunar', 'mars'].includes(orbitId);
  const cap = caption ?? (mode === 'stations' ? (far ? 'The giant dishes take turns as Earth spins, so one can always hear a far-away spacecraft.' : 'Dishes light up when the satellite flies over them.') : TRACK_CAPTION[far ? 'far' : orbitId] ?? TRACK_CAPTION.leo);
  return play(container, {
    scene: mode === 'stations' ? 'ground-stations' : 'ground-track', label: mode === 'stations' ? 'Ground stations map' : 'Ground track map', duration: 1000, caption: cap,
    setup({ svg }) {
      svg.setAttribute('viewBox', `0 0 ${MW} ${MH}`);
      worldMap(svg);
      const sites = STATION_SITES[groundId] ?? [];
      const dishes = sites.map((st) => {
        const g = s('g', { class: 'wm-dish' }, [s('circle', { cx: X(st.lon), cy: Y(st.lat), r: 14, class: 'wm-dish-ring' }), s('circle', { cx: X(st.lon), cy: Y(st.lat), r: 5, class: 'wm-dish-dot' })]);
        svg.append(g);
        return { ...st, g };
      });
      let pts = [];
      let track = null; let swath = null; let dot = null;
      if (orbitId === 'geo') {
        const lon = -75;
        swath = s('ellipse', { cx: X(lon), cy: Y(0), rx: (70 / 360) * MW, ry: (70 / 180) * MH, class: 'wm-swath-geo' });
        dot = s('circle', { cx: X(lon), cy: Y(0), r: 7, class: 'wm-sat' });
        svg.append(swath, dot);
      } else if (far) {
        const inset = s('g', {}, [
          s('rect', { x: MW - 250, y: 20, width: 230, height: 120, rx: 12, class: 'wm-inset' }),
          s('circle', { cx: MW - 200, cy: 80, r: 22, class: 'an-earth' }),
          s('circle', { cx: MW - 70, cy: 80, r: orbitId === 'mars' ? 20 : 12, class: orbitId === 'mars' ? 'an-mars' : orbitId === 'lunar' ? 'an-moon' : 'wm-l2' }),
          s('line', { x1: MW - 175, y1: 80, x2: MW - 90, y2: 80, class: 'wm-far-line' }),
          s('text', { x: MW - 135, y: 125, class: 'wm-inset-text', 'text-anchor': 'middle' }, { l2: '1.5 million km', lunar: '384,000 km', mars: '55–400 million km' }[orbitId]),
        ]);
        svg.append(inset);
      } else {
        pts = trackPoints(orbitId);
        const o = ORBIT_TRACK[orbitId];
        swath = s('path', { d: pathFrom(pts), class: 'wm-swath', 'stroke-width': (o.swath / 180) * MH });
        track = s('path', { d: pathFrom(pts), class: 'wm-track', pathLength: 1000 });
        dot = s('circle', { r: 7, class: 'wm-sat' });
        svg.append(swath, track, dot);
      }
      return {
        frame(t) {
          const p = seg(t, 0, 1);
          if (track) {
            track.style.strokeDasharray = '1000'; track.style.strokeDashoffset = `${1000 * (1 - p)}`;
            swath.style.opacity = 0.35 * p;
            const [lon, lat] = pts[Math.min(pts.length - 1, Math.floor(p * (pts.length - 1)))];
            dot.setAttribute('cx', X(lon)); dot.setAttribute('cy', Y(lat));
            dishes.forEach((d) => d.g.classList.toggle('on', Math.hypot(lon - d.lon, lat - d.lat) < 22));
          } else if (orbitId === 'geo') {
            swath.style.opacity = 0.35 * p;
            dishes.forEach((d) => d.g.classList.toggle('on', Math.hypot(d.lon + 75, d.lat) < 70));
          } else {
            dishes.forEach((d, k) => d.g.classList.toggle('on', Math.floor(p * dishes.length * 2) % dishes.length === k));
          }
        },
        final() {
          if (track) { track.style.strokeDashoffset = '0'; swath.style.opacity = 0.35; }
        },
      };
    },
  });
}
