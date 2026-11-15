// Phase 4 P2 #6/#7/#11 — Ground track on a simplified world map (Orbit step) and the ground
// stations map (Talking to Earth step). The track draws itself with a coverage swath; GEO is a
// fixed dot with its coverage circle. Dishes blink when the satellite
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

// Station sites are ILLUSTRATIONS (example places), not real networks.
export const STATION_SITES = {
  gs_iot_gateways: [{ name: 'Gateway 1', lon: -80, lat: 28 }, { name: 'Gateway 2', lon: 15, lat: 60 }],
  gs_gnss_monitoring: [{ name: 'Monitor', lon: -100, lat: 40 }, { name: 'Monitor', lon: 10, lat: 50 }, { name: 'Monitor', lon: 120, lat: -30 }, { name: 'Monitor', lon: -50, lat: -20 }, { name: 'Monitor', lon: 70, lat: 20 }],
  gs_weather_science: [{ name: 'Science station', lon: 15, lat: 70 }],
};

// Illustration parameters for the drawing (the research gives no inclination for our LEO/SSO
// and no period values): LEO/SSO tracks are examples; MEO uses the real 56° tilt (S04).
const ORBIT_TRACK = {
  leo_550: { inc: 51.6, periodH: 1.58, swath: 16, orbits: 3 },
  sso_550_650: { inc: 97.8, periodH: 1.62, swath: 12, orbits: 3 },
  meo_gnss: { inc: 56, periodH: 14, swath: 70, orbits: 1 },
};

export const TRACK_CAPTION = {
  leo_550: 'Minutes over each place (illustration).',
  sso_550_650: 'Over the poles, whole Earth daily (illustration).',
  meo_gnss: 'High, slow, tilted 56° (illustration).',
  geo: 'Fixed above one spot.',
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
    const u = frac * 2 * Math.PI;
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
  const cap = caption ?? (mode === 'stations' ? 'Stations light up on each pass (illustration).' : TRACK_CAPTION[orbitId] ?? TRACK_CAPTION.leo_550);
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
      } else {
        pts = trackPoints(ORBIT_TRACK[orbitId] ? orbitId : 'leo_550');
        const o = ORBIT_TRACK[orbitId] ?? ORBIT_TRACK.leo_550;
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
