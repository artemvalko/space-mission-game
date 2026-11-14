// Phase 4 P1 #1 — "What your instrument sees": procedural canvas preview of the target as each
// instrument sees it. Low-res cameras are rendered small and upscaled with
// `image-rendering: pixelated`; the hi-res camera is sharp; thermal is a heat-map with glowing
// fire hotspots; radar sees through the cloud layer that blocks cameras; the spectrometer adds
// coloured spectrum bars; telescopes show a blurry vs crisp galaxy.
//
// drawView(canvas, instrumentId, { seed, lostRows }) draws a still (also used for downlinked
// mission pictures). instrumentView(container, params) is the ≤1 s scan-reveal scene.

import { h } from '../dom.js';
import { mulberry32 } from '../../utils/random.js';
import { play, seg } from './core.js';

export const VIEW_W = 320;
export const VIEW_H = 180;

// Pixel width each instrument effectively resolves (lower = more pixelated).
const RESOLUTION = {
  ins_camera: 72, ins_cubecam: 32, ins_hires: 320, ins_thermal: 80, ins_cube_ir: 40,
  ins_sar: 160, ins_spectrometer: 96, ins_gamma: 48, ins_magnetometer: 320,
  ins_uv_telescope: 320, ins_ir_telescope: 320, ins_relay: 320,
};

const KIND = {
  ins_camera: 'camera', ins_cubecam: 'camera', ins_hires: 'camera', ins_thermal: 'thermal', ins_cube_ir: 'thermal',
  ins_sar: 'radar', ins_spectrometer: 'spectrometer', ins_gamma: 'gamma', ins_magnetometer: 'magnet',
  ins_uv_telescope: 'telescope-blur', ins_ir_telescope: 'telescope', ins_relay: 'relay',
};

export const VIEW_CAPTION = {
  camera: 'Sharper images cost more weight and data.',
  thermal: 'Heat cameras see fires through smoke — and at night.',
  radar: 'Radar sees through clouds and darkness, but in black and white.',
  spectrometer: 'Each colour bar tells what the ground is made of.',
  gamma: 'Blue patches: hydrogen — maybe water ice just under the surface.',
  magnet: 'Invisible magnetic field lines, measured point by point.',
  telescope: 'A big cold mirror: crisp, faint galaxies.',
  'telescope-blur': 'A small telescope: the galaxy is blurry.',
  relay: 'A relay has no pictures — it passes messages along.',
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

function renderFull(kind, m, seed) {
  const img = new ImageData(VIEW_W, VIEW_H);
  const rng = mulberry32(seed + 99);
  for (let y = 0; y < VIEW_H; y++) {
    for (let x = 0; x < VIEW_W; x++) {
      const c = cell(m, x, y);
      let r; let g; let b;
      if (kind === 'thermal') {
        const base = c.water ? 0.08 : c.town ? 0.45 : 0.22 + c.h * 0.12;
        [r, g, b] = heat(base + c.fire * 0.9);
      } else if (kind === 'radar') {
        const rough = c.water ? 0.08 : c.town ? 0.9 : 0.35 + c.t * 0.35;
        const v = Math.max(0, Math.min(1, rough * (0.6 + rng() * 0.8))) * 235;
        r = g = b = v;
      } else if (kind === 'gamma') {
        const ice = c.h > 0.62 ? (c.h - 0.62) * 3 : 0;
        r = 60 + c.t * 40; g = 45 + c.t * 30; b = 40 + ice * 215;
      } else {
        // True-colour (camera, spectrometer base)
        if (c.water) [r, g, b] = [30, 70, 140];
        else if (c.town) [r, g, b] = [150, 145, 140];
        else [r, g, b] = [30 + c.t * 40, 80 + c.h * 70, 30 + c.t * 20];
        if (c.fire > 0) [r, g, b] = [r + (255 - r) * c.fire, g + (120 - g) * c.fire, b * (1 - c.fire)];
        const fog = Math.max(c.smoke * 0.7, c.cloud > 0 ? Math.min(1, c.cloud * 1.6) : 0);
        r += (235 - r) * fog; g += (235 - g) * fog; b += (240 - b) * fog;
      }
      const i = (y * VIEW_W + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  return img;
}

function drawGalaxy(ctx, seed, blur) {
  const rng = mulberry32(seed);
  ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + rng() * 0.8})`; ctx.fillRect(rng() * VIEW_W, rng() * VIEW_H, 1, 1); }
  ctx.save();
  ctx.filter = blur ? 'blur(4px)' : 'none';
  ctx.translate(VIEW_W / 2, VIEW_H / 2); ctx.rotate(-0.4);
  for (let i = 0; i < 1400; i++) {
    const arm = i % 2; const t = rng() * 3.2; const r = 6 + t * 26;
    const a = t * 2.1 + arm * Math.PI + (rng() - 0.5) * 0.5;
    ctx.fillStyle = `rgba(${200 + rng() * 55},${170 + rng() * 60},${220 + rng() * 35},${0.25 + rng() * 0.5})`;
    ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r * 0.55, 1.4, 1.4);
  }
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
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
  if (kind === 'telescope' || kind === 'telescope-blur') {
    drawGalaxy(ctx, seed, kind === 'telescope-blur');
  } else if (kind === 'magnet') {
    ctx.fillStyle = '#071226'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.lineWidth = 1.5;
    for (let k = 1; k <= 8; k++) {
      ctx.strokeStyle = `hsl(${180 + k * 14} 80% 60%)`;
      ctx.beginPath();
      for (let a = -Math.PI / 2 + 0.05; a < Math.PI / 2; a += 0.05) {
        const r = k * 18 * Math.cos(a) ** 2;
        ctx.lineTo(VIEW_W / 2 + r * Math.cos(a) * 1.6, VIEW_H / 2 - r * Math.sin(a));
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#2a7de1'; ctx.beginPath(); ctx.arc(VIEW_W / 2, VIEW_H / 2, 12, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'relay') {
    ctx.fillStyle = '#071226'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.strokeStyle = '#3ddc84'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, 150); ctx.lineTo(160, 40); ctx.lineTo(280, 150); ctx.stroke();
    ctx.setLineDash([]); ctx.font = '28px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('🧑‍🚀', 40, 160); ctx.fillText('🛰️', 160, 48); ctx.fillText('🌍', 280, 160);
  } else {
    const m = sceneModel(seed);
    const full = renderFull(kind === 'spectrometer' ? 'camera' : kind, m, seed);
    const res = RESOLUTION[instrumentId] ?? 96;
    const small = document.createElement('canvas');
    small.width = res; small.height = Math.round((res * VIEW_H) / VIEW_W);
    const fullC = document.createElement('canvas'); fullC.width = VIEW_W; fullC.height = VIEW_H;
    fullC.getContext('2d').putImageData(full, 0, 0);
    small.getContext('2d').drawImage(fullC, 0, 0, small.width, small.height);
    ctx.imageSmoothingEnabled = false; // pixelated upscale for low-res instruments
    ctx.drawImage(small, 0, 0, VIEW_W, VIEW_H);
    if (kind === 'spectrometer') {
      const bars = [['#5b3cff', 0.3], ['#2f8cff', 0.35], ['#2bd46a', 0.85], ['#e6e13a', 0.5], ['#ff8a2e', 0.4], ['#ff3b3b', 0.9]];
      ctx.fillStyle = 'rgba(4,8,18,.78)'; ctx.fillRect(VIEW_W - 112, 10, 102, 74);
      bars.forEach(([c, v], i) => { ctx.fillStyle = c; ctx.fillRect(VIEW_W - 104 + i * 15, 76 - v * 58, 11, v * 58); });
    }
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
export function instrumentView(container, { instrumentId = 'ins_camera', seed = 7, caption, label } = {}) {
  const kind = viewKind(instrumentId);
  return play(container, {
    scene: 'instrument-view', label: label ?? 'What your instrument sees', duration: 800,
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
