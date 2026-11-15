// Live satellite picture (SVG) built from the current design.
// Body size by frame, solar panels / RTG, antenna size, instrument modules, thrusters.
// Parts that were not in the previous render get a short "snap" glow.
// Each part is a <g data-part="category|instrument" data-id="..."> so animations can find it.

import { s } from './dom.js';
import { getSelection } from '../engine/resources.js';

const BODY = {
  str_cube_3u: [24, 54], str_6u: [40, 54], str_6u_weather: [40, 54], str_cube_12u: [52, 62],
  str_gnss_meo: [84, 76],
};

let previousKeys = new Set();

function grid(x, y, w, hgt, cols, rows, cls) {
  const lines = [];
  for (let i = 1; i < cols; i++) lines.push(s('line', { x1: x + (w * i) / cols, y1: y, x2: x + (w * i) / cols, y2: y + hgt, class: `${cls}-line` }));
  for (let j = 1; j < rows; j++) lines.push(s('line', { x1: x, y1: y + (hgt * j) / rows, x2: x + w, y2: y + (hgt * j) / rows, class: `${cls}-line` }));
  return [s('rect', { x, y, width: w, height: hgt, rx: 1.5, class: cls }), ...lines];
}

function instrumentShape(ins, x, y) {
  switch (ins.id) {
    case 'payload_iot_sdr': return [s('rect', { x: x - 6, y, width: 12, height: 8, class: 'sat-box' }), s('line', { x1: x, y1: y + 8, x2: x, y2: y + 20, class: 'sat-boom' })];
    case 'ant_iot_deploy': return [s('line', { x1: x - 10, y1: y, x2: x - 18, y2: y + 18, class: 'sat-boom' }), s('line', { x1: x + 10, y1: y, x2: x + 18, y2: y + 18, class: 'sat-boom' })];
    case 'clock_phm_rubidium_4': return [s('rect', { x: x - 9, y, width: 18, height: 10, class: 'sat-box' }), ...[-5, -1.5, 1.5, 5].map((dx) => s('circle', { cx: x + dx, cy: y + 5, r: 1.3, class: 'sat-gamma' }))];
    case 'nav_signal_rf': return [s('rect', { x: x - 8, y, width: 16, height: 9, class: 'sat-box' }), s('rect', { x: x - 6, y: y + 6, width: 12, height: 2, class: 'sat-uv' })];
    case 'antenna_lband_nav': return [s('rect', { x: x - 16, y: y + 2, width: 32, height: 6, class: 'sat-radar' }), ...[-10, -3, 4, 11].map((dx) => s('circle', { cx: x + dx - 0.5, cy: y + 5, r: 2, class: 'sat-lens' }))];
    case 'payload_mw_radiometer': return [s('rect', { x: x - 7, y, width: 14, height: 8, class: 'sat-box' }), s('ellipse', { cx: x, cy: y + 11, rx: 8, ry: 4, class: 'sat-dish' })];
    case 'radiometer_calibration': return [s('rect', { x: x - 4, y, width: 8, height: 6, class: 'sat-box' }), s('rect', { x: x - 3, y: y + 4, width: 6, height: 2, class: 'sat-rainbow' })];
    default: return [s('rect', { x: x - 6, y, width: 12, height: 6, class: 'sat-box' }), s('circle', { cx: x, cy: y + 8, r: 3.5, class: 'sat-lens' })];
  }
}

/**
 * Build the satellite SVG for a state.
 * opts.glow=false disables the snap animation; opts.exploded=true pulls the parts apart with labels
 * (add the `.go` class one frame later to animate it).
 */
export function renderSatellite(state, opts = {}) {
  const sel = getSelection(state);
  const c = sel.components;
  const cx = 120;
  const cy = 82;
  const [w, hgt] = BODY[c.structure?.id] ?? [58, 58];
  const bx = cx - w / 2;
  const by = cy - hgt / 2;
  const parts = []; // { key, cat, id, nodes, behind, anchor, item }

  // anchor = where the part sits (used to push it outwards in the exploded view and place its label)
  const add = (cat, id, nodes, behind = false, anchor = [cx, cy], item = null, keySuffix = '') =>
    parts.push({ key: `${cat}:${id}${keySuffix}`, cat, id, nodes, behind, anchor, item });

  // Power
  const p = c.power;
  if (p) {
    {
      const small = p.formFactor === 'cubesat';
      const pw = small ? 30 : 64;
      const ph = Math.min(hgt * 0.7, small ? 34 : 46);
      // Two wings as separate parts so the exploded view can pull them apart.
      add('power', p.id, [
        s('line', { x1: bx - 8, y1: cy, x2: bx, y2: cy, class: 'sat-boom' }),
        ...grid(bx - 8 - pw, cy - ph / 2, pw, ph, small ? 2 : 4, 2, 'sat-cells'),
      ], true, [bx - 8 - pw / 2, cy], p);
      add('power', p.id, [
        s('line', { x1: bx + w, y1: cy, x2: bx + w + 8, y2: cy, class: 'sat-boom' }),
        ...grid(bx + w + 8, cy - ph / 2, pw, ph, small ? 2 : 4, 2, 'sat-cells'),
      ], true, [bx + w + 8 + pw / 2, cy], null, ':right');
    }
  }

  // Antenna (top)
  const com = c.comms;
  if (com) {
    const top = by;
    if (com.id === 'ttc_uhf') add('comms', com.id, [s('line', { x1: cx + 8, y1: top, x2: cx + 8, y2: top - 24, class: 'sat-boom' }), s('circle', { cx: cx + 8, cy: top - 25, r: 2, class: 'sat-box' })], false, [cx + 8, top - 14], com);
    else {
      const r = 12;
      add('comms', com.id, [
        s('line', { x1: cx, y1: top, x2: cx, y2: top - 8, class: 'sat-boom' }),
        s('path', { d: `M ${cx - r} ${top - 8 - r * 0.55} Q ${cx} ${top - 8 + r * 0.25} ${cx + r} ${top - 8 - r * 0.55}`, class: 'sat-dish' }),
        s('line', { x1: cx, y1: top - 8, x2: cx, y2: top - 8 - r * 0.7, class: 'sat-feed' }),
      ], false, [cx, top - 12], com);
    }
  }

  // Mission downlink (patch antenna on top)
  const dl = c.downlink;
  if (dl) add('downlink', dl.id, [s('rect', { x: cx - 10, y: by - 4, width: 12, height: 4, class: 'sat-patch' })], false, [cx - 4, by - 4], dl);

  // Star tracker (pointing system)
  const adcs = c.adcs;
  if (adcs) {
    const st = adcs.formFactor === 'cubesat' ? 4 : 6;
    add('adcs', adcs.id, [s('rect', { x: bx + 3, y: by - st, width: st * 1.6, height: st, class: 'sat-box' }), s('circle', { cx: bx + 3 + st * 0.8, cy: by - st / 2, r: st / 3, class: 'sat-lens' })], false, [bx + 6, by - st / 2], adcs);
  }

  // Thrusters (bottom corners)
  const prop = c.propulsion;
  if (prop) {
    const cone = (x, y, size) => s('polygon', { points: `${x - size / 2},${y} ${x + size / 2},${y} ${x + size},${y + size * 1.2} ${x - size},${y + size * 1.2}`, class: 'sat-nozzle' });
    const yb = by + hgt;
    const anchor = [bx + w - 6, yb + 4];
    add('propulsion', prop.id, [cone(bx + 6, yb, 4), cone(bx + w - 6, yb, 4)], false, anchor, prop);
  }

  // Instruments (bottom, centred)
  const ins = sel.instruments;
  const slot = Math.min(22, (w + 20) / Math.max(1, ins.length));
  ins.forEach((it, i) => {
    const x = cx + (i - (ins.length - 1) / 2) * slot;
    add('instrument', it.id, instrumentShape(it, x, by + hgt), false, [x, by + hgt + 8], it);
  });

  // Body (drawn after "behind" parts, before front parts)
  const body = c.structure
    ? [
      s('rect', { x: bx, y: by, width: w, height: hgt, rx: 3, class: 'sat-body' }),
      ...(c.structure.formFactor === 'cubesat'
        ? Array.from({ length: Math.round(hgt / 18) - 1 }, (_, i) => s('line', { x1: bx, y1: by + ((i + 1) * hgt) / Math.round(hgt / 18), x2: bx + w, y2: by + ((i + 1) * hgt) / Math.round(hgt / 18), class: 'sat-unit' }))
        : [s('rect', { x: bx + 3, y: by + 3, width: w - 6, height: hgt - 6, rx: 2, class: 'sat-foil' })]),
    ]
    : [s('rect', { x: bx, y: by, width: w, height: hgt, rx: 4, class: 'sat-ghost' }), s('text', { x: cx, y: cy + 6, class: 'sat-ghost-text', 'text-anchor': 'middle' }, '?')];

  const keys = new Set(parts.map((pt) => pt.key).concat(c.structure ? [`structure:${c.structure.id}`] : []));
  const glow = opts.glow !== false;
  // Exploded view: each part moves outwards from the body (CSS transition on --dx/--dy) and
  // gets a label with its plain name + real engineering term.
  const EXPLODE = 30;
  const offset = (pt) => {
    let dx = pt.anchor[0] - cx; let dy = pt.anchor[1] - cy;
    const len = Math.hypot(dx, dy) || 1;
    if (len < 6) { dx = -1; dy = -1; }
    const n = Math.hypot(dx, dy);
    return [(dx / n) * EXPLODE, (dy / n) * EXPLODE];
  };
  const group = (pt) => {
    const [dx, dy] = offset(pt);
    const g = s('g', {
      'data-part': pt.cat, 'data-id': pt.id,
      class: ['part', glow && !previousKeys.has(pt.key) && previousKeys.size > 0 && 'snap'].filter(Boolean).join(' '),
      style: `--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px`,
    }, pt.nodes);
    return g;
  };
  // Labels in two columns (left / right of the satellite) with leader lines, so they never overlap.
  const labels = [];
  if (opts.exploded) {
    const items = parts.filter((pt) => pt.item).map((pt) => {
      const [dx, dy] = offset(pt);
      return { x: pt.anchor[0] + dx, y: pt.anchor[1] + dy, item: pt.item };
    });
    if (c.structure) items.push({ x: cx - w / 2 - EXPLODE * 0.2, y: cy, item: c.structure });
    const columns = [items.filter((it) => it.x < cx), items.filter((it) => it.x >= cx)];
    columns.forEach((col, side) => {
      col.sort((a, b) => a.y - b.y);
      let y = -30;
      const step = Math.max(17, Math.min(26, 230 / Math.max(1, col.length)));
      col.forEach((it) => {
        y = Math.max(y + step, Math.min(it.y, 205 - (col.length - col.indexOf(it) - 1) * step));
        const lx = side === 0 ? -46 : 286;
        const anchor = side === 0 ? 'start' : 'end';
        const lineEnd = side === 0 ? lx + 66 : lx - 66;
        labels.push(s('g', { class: 'part-label' }, [
          s('line', { x1: it.x, y1: it.y, x2: lineEnd, y2: y - 2, class: 'part-leader' }),
          s('text', { x: lx, y: y - 3, 'text-anchor': anchor, class: 'part-label-main' }, it.item.plainName ?? it.item.name),
          s('text', { x: lx, y: y + 4, 'text-anchor': anchor, class: 'part-label-real' }, it.item.name),
        ]));
      });
    });
  }

  const svg = s('svg', { viewBox: opts.exploded ? '-50 -40 340 260' : '0 0 240 180', class: ['satellite', opts.exploded && 'exploded'].filter(Boolean).join(' '), role: 'img', 'aria-label': describe(sel) }, [
    ...parts.filter((pt) => pt.behind).map(group),
    s('g', { 'data-part': 'structure', 'data-id': c.structure?.id ?? 'none', class: glow && c.structure && !previousKeys.has(`structure:${c.structure.id}`) && previousKeys.size > 0 ? 'snap' : null }, body),
    ...parts.filter((pt) => !pt.behind).map(group),
    ...labels,
  ]);
  if (glow) previousKeys = keys.size ? keys : new Set(['empty']);
  return svg;
}

function describe(sel) {
  const names = [sel.components.structure, ...Object.values(sel.components).filter((x) => x && x.category !== 'structure'), ...sel.instruments]
    .filter(Boolean).map((x) => x.plainName ?? x.name);
  return names.length ? `Your satellite: ${names.join(', ')}` : 'Your satellite (nothing chosen yet)';
}
