// "What your payload does": procedural canvas ILLUSTRATIONS (never real data):
//   iot        — sensors light up, packets are stored on board, then dumped over a gateway
//   gnss       — clock ticks + ranging-signal rings reaching a receiver
//   radiometer — microwave brightness-temperature map seeing through clouds vs an RGB camera
//                that only sees cloud tops
//   camera     — the distractor: a colour photo where clouds hide what is below
//
// drawView(canvas, instrumentId, { seed, lostRows }) draws a still (also used for downlinked
// mission pictures). instrumentView(container, params) is the ≤1 s scan-reveal scene.

import { h } from '../dom.js';
import { mulberry32 } from '../../utils/random.js';
import { play, seg } from './core.js';

export const VIEW_W = 320;
export const VIEW_H = 180;

// Pixel width each payload's picture effectively resolves (lower = more pixelated).
const RESOLUTION = { dist_rgb_camera: 96 };

const KIND = {
  payload_iot_sdr: 'iot', ant_iot_deploy: 'iot',
  clock_phm_rubidium_4: 'gnss', nav_signal_rf: 'gnss', antenna_lband_nav: 'gnss',
  payload_mw_radiometer: 'radiometer', radiometer_calibration: 'radiometer',
  iot_lora: 'iot', iot_lband: 'iot', iot_nbiot_ntn: 'iot',
  wx_tropics_radiometer: 'radiometer', wx_raincube_radar: 'radiometer', wx_gnss_ro: 'gnss', wx_ciras_ir: 'radiometer',
  clk_rafs_3: 'gnss', clk_drafs_demo: 'gnss', clk_none_leo: 'gnss', nav_lra: 'gnss',
  dist_rgb_camera: 'camera',
};

export const VIEW_CAPTION = {
  iot: 'Collect → store → dump at a gateway.',
  gnss: 'Precise time → signal → distance.',
  radiometer: 'Microwaves see through clouds; cameras don\'t.',
  camera: 'Only cloud tops.',
};
export const viewKind = (id) => KIND[id] ?? 'camera';

// ── Procedural Earth scene (deterministic) ─────────────────────────────────────
function valueNoise(rng, gw, gh) {
  const g = Array.from({ length: (gw + 1) * (gh + 1) }, () => rng());
  return (x, y) => {
    const fx = (x / VIEW_W) * gw; const fy = (y / VIEW_H) * gh;
    const x0 = Math.floor(fx); const y0 = Math.floor(fy); const tx = fx - x0; const ty = fy - y0;
    const v = (i, j) => g[Math.min(gh, j) * (gw + 1) + Math.min(gw, i)];
    const a = v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx;
    const b = v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx;
    return a * (1 - ty) + b * ty;
  };
}

function sceneModel(seed) {
  const rng = mulberry32(seed);
  const n1 = valueNoise(rng, 16, 9);
  const n2 = valueNoise(rng, 48, 27);
  const fires = [0, 1, 2].map(() => ({ x: 40 + rng() * 200, y: 30 + rng() * 120, r: 4 + rng() * 5 }));
  const clouds = [0, 1, 2, 3].map(() => ({ x: rng() * VIEW_W, y: rng() * VIEW_H, r: 22 + rng() * 30 }));
  const riverY = (x) => 95 + Math.sin(x / 38) * 22;
  return { n1, n2, fires, clouds, riverY };
}

/** Per-pixel classification used by every view. */
function cell(m, x, y) {
  const water = Math.abs(y - m.riverY(x)) < 7;
  const town = x > 245 && y > 30 && y < 85 && m.n2(x, y) > 0.35;
  let fire = 0;
  for (const f of m.fires) fire = Math.max(fire, 1 - Math.hypot(x - f.x, y - f.y) / (f.r * 2.6));
  let cloud = 0;
  for (const c of m.clouds) cloud = Math.max(cloud, 1 - Math.hypot(x - c.x, (y - c.y) * 1.6) / c.r);
  const smoke = m.fires.some((f) => x > f.x - 6 && x < f.x + 40 && Math.abs(y - (f.y - (x - f.x) * 0.35)) < 6 + (x - f.x) * 0.2) ? 0.55 : 0;
  return { water, town, fire: Math.max(0, fire), cloud: Math.max(0, cloud), smoke, h: m.n1(x, y), t: m.n2(x, y) };
}

const heat = (v) => { // 0..1 → dark blue → purple → red → yellow → white
  const stops = [[10, 12, 60], [90, 20, 140], [220, 40, 40], [255, 190, 40], [255, 255, 230]];
  const p = Math.max(0, Math.min(0.999, v)) * (stops.length - 1); const i = Math.floor(p); const t = p - i;
  return stops[i].map((c, k) => c + (stops[i + 1][k] - c) * t);
};

function renderFull(kind, m) {
  const img = new ImageData(VIEW_W, VIEW_H);
  for (let y = 0; y < VIEW_H; y++) {
    for (let x = 0; x < VIEW_W; x++) {
      const c = cell(m, x, y);
      let r; let g; let b;
      // True colour: clouds hide what is below.
      if (c.water) [r, g, b] = [30, 70, 140];
      else if (c.town) [r, g, b] = [150, 145, 140];
      else [r, g, b] = [30 + c.t * 40, 80 + c.h * 70, 30 + c.t * 20];
      const fog = c.cloud > 0 ? Math.min(1, c.cloud * 1.6) : 0;
      r += (235 - r) * fog; g += (235 - g) * fog; b += (240 - b) * fog;
      const i = (y * VIEW_W + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  return img;
}

function label(ctx, text, x, y, color = '#ededed', align = 'left') {
  ctx.font = '500 11px ui-monospace, Menlo, monospace'; ctx.textAlign = align; ctx.fillStyle = 'rgba(0,0,0,.75)';
  const w = ctx.measureText(text).width;
  const x0 = align === 'center' ? x - w / 2 - 4 : x - 4;
  ctx.fillRect(x0, y - 11, w + 8, 15);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function drawIot(ctx, seed) {
  const rng = mulberry32(seed);
  ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#141414';
  [[20, 60, 90, 70], [150, 40, 70, 60], [230, 100, 70, 60]].forEach(([x, y, w, hh]) => { ctx.beginPath(); ctx.ellipse(x + w / 2, y + hh / 2, w / 2, hh / 2, 0, 0, Math.PI * 2); ctx.fill(); });
  const sensors = Array.from({ length: 9 }, () => [20 + rng() * 280, 40 + rng() * 120]);
  const sat = [160, 22];
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([3, 3]);
  sensors.forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(sat[0], sat[1]); ctx.stroke(); });
  ctx.setLineDash([]);
  sensors.forEach(([x, y]) => { ctx.fillStyle = '#ededed'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#e6edf7'; ctx.fillRect(sat[0] - 6, sat[1] - 5, 12, 10);
  ctx.fillStyle = '#7a7a7a'; ctx.fillRect(sat[0] - 20, sat[1] - 3, 12, 6); ctx.fillRect(sat[0] + 8, sat[1] - 3, 12, 6);
  const gw = [290, 160];
  ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sat[0] + 10, sat[1] + 6); ctx.lineTo(gw[0], gw[1] - 10); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = '#bdbdbd'; ctx.beginPath(); ctx.arc(gw[0], gw[1], 6, 0, Math.PI * 2); ctx.fill();
  label(ctx, 'sensors', 10, 175, '#ededed');
  label(ctx, 'stored on board', sat[0] + 24, sat[1] + 4);
  label(ctx, 'gateway: dump', 210, 150, '#bdbdbd');
}

function drawGnss(ctx) {
  ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const sat = [60, 40]; const rx = [250, 150];
  ctx.fillStyle = '#141414'; ctx.fillRect(0, 158, VIEW_W, 22);
  for (let k = 1; k <= 6; k++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - k * 0.12})`; ctx.beginPath(); ctx.arc(sat[0], sat[1], k * 36, 0, Math.PI / 2); ctx.stroke();
  }
  ctx.fillStyle = '#e6edf7'; ctx.fillRect(sat[0] - 7, sat[1] - 6, 14, 12);
  ctx.fillStyle = '#7a7a7a'; ctx.fillRect(sat[0] - 24, sat[1] - 3, 14, 6); ctx.fillRect(sat[0] + 10, sat[1] - 3, 14, 6);
  // clock face
  ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(28, 120, 16, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(28 + Math.cos(a) * 12, 120 + Math.sin(a) * 12); ctx.lineTo(28 + Math.cos(a) * 15, 120 + Math.sin(a) * 15); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(28, 120); ctx.lineTo(28, 108); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = '#ededed'; ctx.beginPath(); ctx.arc(rx[0], rx[1], 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ededed'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(sat[0], sat[1]); ctx.lineTo(rx[0], rx[1]); ctx.stroke(); ctx.setLineDash([]);
  label(ctx, 'atomic time', 50, 124, '#bdbdbd');
  label(ctx, 'ranging signal (L-band)', 120, 70, '#a1a1a1');
  label(ctx, 'receiver: distance = time × light speed', 312, 140, '#ededed', 'right');
}

function drawRadiometer(ctx, m) {
  const half = VIEW_W / 2;
  const img = new ImageData(VIEW_W, VIEW_H);
  for (let y = 0; y < VIEW_H; y++) {
    for (let x = 0; x < VIEW_W; x++) {
      const c = cell(m, x, y);
      let r; let g; let b;
      if (x < half) {
        // RGB camera: clouds are bright white and hide everything below
        [r, g, b] = c.water ? [30, 70, 140] : [30 + c.t * 40, 80 + c.h * 70, 30 + c.t * 20];
        const fog = c.cloud > 0 ? Math.min(1, c.cloud * 1.8) : 0;
        r += (240 - r) * fog; g += (240 - g) * fog; b += (245 - b) * fog;
      } else {
        // Microwave brightness temperature: moisture/rain structure visible through the clouds
        [r, g, b] = heat(0.25 + c.h * 0.35 + c.cloud * 0.35);
      }
      const i = (y * VIEW_W + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = '#e6edf7'; ctx.fillRect(half - 1, 0, 2, VIEW_H);
  label(ctx, 'colour camera: cloud tops', 8, 16);
  label(ctx, 'microwaves: through clouds', half + 8, 16);
  label(ctx, 'illustration', VIEW_W - 8, VIEW_H - 6, '#bdbdbd', 'right');
}

const cache = new Map(); // `${id}:${seed}:${lostRows}` → offscreen canvas (procedural drawing is ~10 ms)

/** Draw the still picture an instrument would produce into `canvas` (VIEW_W × VIEW_H). */
export function drawView(canvas, instrumentId, { seed = 7, lostRows = 0 } = {}) {
  const key = `${instrumentId}:${seed}:${lostRows}`;
  canvas.width = VIEW_W; canvas.height = VIEW_H;
  if (cache.has(key)) { canvas.getContext('2d').drawImage(cache.get(key), 0, 0); return canvas; }
  const off = document.createElement('canvas');
  off.width = VIEW_W; off.height = VIEW_H;
  paint(off, instrumentId, seed, lostRows);
  if (cache.size > 40) cache.delete(cache.keys().next().value);
  cache.set(key, off);
  canvas.getContext('2d').drawImage(off, 0, 0);
  return canvas;
}

function paint(canvas, instrumentId, seed, lostRows) {
  const ctx = canvas.getContext('2d');
  const kind = viewKind(instrumentId);
  if (kind === 'iot') {
    drawIot(ctx, seed);
  } else if (kind === 'gnss') {
    drawGnss(ctx);
  } else if (kind === 'radiometer') {
    drawRadiometer(ctx, sceneModel(seed));
  } else {
    const m = sceneModel(seed);
    const full = renderFull('camera', m, seed);
    const res = RESOLUTION[instrumentId] ?? 96;
    const small = document.createElement('canvas');
    small.width = res; small.height = Math.round((res * VIEW_H) / VIEW_W);
    const fullC = document.createElement('canvas'); fullC.width = VIEW_W; fullC.height = VIEW_H;
    fullC.getContext('2d').putImageData(full, 0, 0);
    small.getContext('2d').drawImage(fullC, 0, 0, small.width, small.height);
    ctx.imageSmoothingEnabled = false; // pixelated upscale for low-res instruments
    ctx.drawImage(small, 0, 0, VIEW_W, VIEW_H);
    label(ctx, 'illustration', VIEW_W - 8, VIEW_H - 6, '#bdbdbd', 'right');
  }
  // Data overflow: lost rows never arrive — they come out as red noise.
  if (lostRows > 0) {
    const rng = mulberry32(seed + 5);
    ctx.fillStyle = 'rgba(255, 70, 70, .55)';
    for (let y = 0; y < VIEW_H; y += 6) if (rng() < lostRows) ctx.fillRect(0, y, VIEW_W, 6);
  }
}

/**
 * ≤1 s scan-reveal of an instrument's view (design screens: never blocks input).
 * params: { instrumentId, seed, caption, label }
 */
export function instrumentView(container, { instrumentId = 'payload_iot_sdr', seed = 7, caption, label: sceneLabel } = {}) {
  const kind = viewKind(instrumentId);
  return play(container, {
    scene: 'instrument-view', label: sceneLabel ?? 'What your payload does', duration: 800,
    caption: caption ?? VIEW_CAPTION[kind],
    setup({ html }) {
      const canvas = drawView(document.createElement('canvas'), instrumentId, { seed });
      canvas.className = 'iv-canvas';
      const scan = h('div', { class: 'iv-scan' });
      html.append(h('div', { class: 'iv-wrap' }, [canvas, scan]));
      return {
        frame(t) {
          const p = seg(t, 0, 1);
          canvas.style.clipPath = `inset(0 0 ${100 - p * 100}% 0)`;
          scan.style.top = `${p * 100}%`;
          scan.style.opacity = p < 1 ? 1 : 0;
        },
        final() { canvas.style.clipPath = 'none'; scan.style.opacity = 0; },
      };
    },
  });
}
