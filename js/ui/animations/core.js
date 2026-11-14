// Animation core: every scene is `(container, params) → Promise` built on play().
// - SVG + CSS + requestAnimationFrame only.
// - Every scene has a "Skip ▶▶" button that jumps to the final frame.
// - prefers-reduced-motion: show the final frame + caption immediately.
// - A scene ends with ONE caption (what happened and why). `hold` adds buttons and waits for a
//   click (resolves with the button's value); `linger` keeps the caption up for N ms.

import { h, s } from '../dom.js';
import { mulberry32 } from '../../utils/random.js';

export const W = 800;
export const H = 450;

export const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Frame scheduler. Real browsers use requestAnimationFrame. Test hook: headless Chrome with a
// virtual-time budget fires rAF only once, so tests set window.__animTimerFrames = true to drive
// frames with 16 ms timers instead (same code paths, same timing).
// window.__animFreeze = true stops scheduling (used to screenshot a scene mid-animation).
export const nextFrame = (cb) => (window.__animFreeze ? 0 : window.__animTimerFrames ? setTimeout(() => cb(performance.now()), 16) : requestAnimationFrame(cb));
export const cancelFrame = (id) => (window.__animTimerFrames ? clearTimeout(id) : cancelAnimationFrame(id));

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Local progress of t inside [a, b] → 0..1 */
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const ease = {
  in: (t) => t * t * t,
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => { const c = 1.7; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
};

export function mixColor(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) => Math.round(lerp((pa >> shift) & 255, (pb >> shift) & 255, t));
  return `#${((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1)}`;
}

let uid = 0;
export const newId = (p) => `${p}-${++uid}`;

/** Deterministic starfield group. */
export function stars(n = 80, seed = 7, { w = W, hgt = H } = {}) {
  const rng = mulberry32(seed);
  return s('g', { class: 'an-stars' }, Array.from({ length: n }, () =>
    s('circle', { cx: rng() * w, cy: rng() * hgt, r: rng() < 0.12 ? 1.6 : 0.8, opacity: 0.4 + rng() * 0.6 })));
}

/** Linear-gradient sky; returns { defs, rect, set(topHex, bottomHex) }. */
export function sky(top, bottom) {
  const id = newId('sky');
  const s1 = s('stop', { offset: '0', 'stop-color': top });
  const s2 = s('stop', { offset: '1', 'stop-color': bottom });
  const defs = s('defs', {}, s('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 }, [s1, s2]));
  const rect = s('rect', { x: 0, y: 0, width: W, height: H, fill: `url(#${id})` });
  return { defs, rect, set: (t, b) => { s1.setAttribute('stop-color', t); s2.setAttribute('stop-color', b); } };
}

/** Create the stage DOM inside `container` (replacing its children). */
export function makeStage(container, { label = 'Animation', scene = '', overlay = false } = {}) {
  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'anim-svg', role: 'img', 'aria-label': label, preserveAspectRatio: 'xMidYMid meet' });
  const html = h('div', { class: 'anim-html' });
  const caption = h('div', { class: 'anim-caption', 'aria-live': 'polite' });
  const actions = h('div', { class: 'anim-actions' });
  const skip = h('button', { class: 'anim-skip', type: 'button', 'data-anim-skip': '' }, 'Skip ▶▶');
  const root = h('div', { class: ['anim-stage', overlay && 'anim-overlay-stage'], 'data-scene': scene }, [svg, html, caption, actions, skip]);
  container.replaceChildren(root);
  return { root, svg, html, caption, actions, skip };
}

/**
 * Run a scene.
 * @param {HTMLElement} container
 * @param {object} o
 * @param {string} o.scene     id (data-scene attribute — tests and the debug page use it)
 * @param {string} o.label     aria label
 * @param {number} o.duration  ms
 * @param {(stage) => { frame(t, ms), final?() }} o.setup
 * @param {string|Function} [o.caption]
 * @param {true|{label,value,primary?}[]} [o.hold]  buttons to wait for
 * @param {number} [o.linger]  ms to keep the caption before resolving (no buttons)
 * @param {boolean} [o.overlay] transparent stage on top of another view
 * @returns {Promise<any>} resolves with the clicked button value (or 'done')
 */
export function play(container, o) {
  return new Promise((resolve) => {
    const stage = makeStage(container, { label: o.label, scene: o.scene, overlay: o.overlay });
    const scene = o.setup(stage);
    let raf = 0;
    let t0 = null;
    let done = false;

    const end = () => {
      if (done) return;
      done = true;
      cancelFrame(raf);
      scene.frame?.(1, o.duration);
      scene.final?.();
      stage.skip.remove();
      const text = typeof o.caption === 'function' ? o.caption() : o.caption;
      if (text) { stage.caption.textContent = text; stage.caption.classList.add('show'); }
      const buttons = o.hold === true ? [{ label: 'Continue ▶', value: 'continue', primary: true }] : o.hold;
      if (buttons?.length) {
        buttons.forEach((b, i) => {
          const btn = h('button', {
            class: ['btn', (b.primary ?? i === 0) && 'btn-primary'], type: 'button', 'data-anim-action': b.value,
            onClick: () => resolve(b.value),
          }, b.label);
          stage.actions.append(btn);
        });
        stage.actions.querySelector('button')?.focus({ preventScroll: true });
      } else if (o.linger && text && !reducedMotion()) {
        setTimeout(() => resolve('done'), o.linger);
      } else {
        resolve('done');
      }
    };
    stage.skip.addEventListener('click', end);
    o.onStart?.();
    stage.end = end;

    if (reducedMotion()) { end(); return; }
    const loop = (ts) => {
      if (!stage.root.isConnected) { done = true; resolve('detached'); return; }
      if (t0 === null) t0 = ts;
      const ms = ts - t0;
      const t = Math.min(1, ms / o.duration);
      scene.frame(t, ms);
      if (t >= 1) end();
      else raf = nextFrame(loop);
    };
    raf = nextFrame(loop);
  });
}

/** Simple rocket drawing for scenes (origin = bottom centre). */
export function rocketShape(launcher = {}, scale = 1) {
  const rel = launcher.heightRel ?? 0.8;
  const H2 = 150 * rel * scale;
  const w = (16 + 12 * rel) * scale;
  const parts = [
    s('rect', { x: -w / 2, y: -H2 + w, width: w, height: H2 - w, rx: 3, class: 'rk-body' }),
    s('path', { d: `M ${-w / 2} ${-H2 + w} Q 0 ${-H2 - w * 0.6} ${w / 2} ${-H2 + w} Z`, class: 'rk-nose' }),
    s('rect', { x: -w / 2, y: -H2 * 0.55, width: w, height: 4 * scale, class: 'rk-stripe' }),
    s('polygon', { points: `${-w / 2},0 ${-w / 2 - 9 * scale},${8 * scale} ${-w / 2},${-14 * scale}`, class: 'rk-fin' }),
    s('polygon', { points: `${w / 2},0 ${w / 2 + 9 * scale},${8 * scale} ${w / 2},${-14 * scale}`, class: 'rk-fin' }),
  ];
  if (launcher.size === 'heavy') {
    parts.unshift(
      s('rect', { x: -w / 2 - 11 * scale, y: -H2 * 0.6, width: 10 * scale, height: H2 * 0.6, rx: 4, class: 'rk-booster' }),
      s('rect', { x: w / 2 + 1 * scale, y: -H2 * 0.6, width: 10 * scale, height: H2 * 0.6, rx: 4, class: 'rk-booster' }),
    );
  }
  return { node: s('g', { class: 'rocket-art' }, parts), height: H2, width: w };
}

/** Flame group (origin = nozzle); call flicker(ms, power 0..1). */
export function flame(scale = 1) {
  const outer = s('polygon', { class: 'an-flame-outer' });
  const inner = s('polygon', { class: 'an-flame-inner' });
  const g = s('g', {}, [outer, inner]);
  const flicker = (ms, power = 1, wild = 0) => {
    const j = Math.sin(ms / 37) * 0.18 + Math.sin(ms / 13) * 0.08 + (wild ? (Math.random() - 0.5) * wild : 0);
    const L = Math.max(0, (40 + 22 * j) * power * scale);
    const w = 12 * scale * Math.max(power, 0.3);
    outer.setAttribute('points', `${-w},0 ${w},0 0,${L}`);
    inner.setAttribute('points', `${-w * 0.5},0 ${w * 0.5},0 0,${L * 0.6}`);
  };
  flicker(0);
  return { node: g, flicker };
}

/** Pool of smoke puffs. spawn(x, y) then update(dtMs). */
export function smoke(max = 40, seed = 3) {
  const rng = mulberry32(seed);
  const g = s('g', { class: 'an-smoke' });
  const puffs = Array.from({ length: max }, () => {
    const c = s('circle', { r: 0, opacity: 0 });
    g.append(c);
    return { c, life: 0, x: 0, y: 0, vx: 0, vy: 0, r: 0 };
  });
  let next = 0;
  return {
    node: g,
    spawn(x, y, spread = 1) {
      const p = puffs[next++ % max];
      Object.assign(p, { life: 1, x, y, vx: (rng() - 0.5) * 2.2 * spread, vy: rng() * 0.6, r: 6 + rng() * 6 });
    },
    update(dt) {
      for (const p of puffs) {
        if (p.life <= 0) continue;
        p.life -= dt / 1600;
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        p.r += dt * 0.035;
        p.c.setAttribute('cx', p.x); p.c.setAttribute('cy', p.y); p.c.setAttribute('r', p.r);
        p.c.setAttribute('opacity', Math.max(0, p.life * 0.55));
      }
    },
  };
}

/** Small satellite marker used in orbit scenes. */
export function miniSat(scale = 1) {
  return s('g', { class: 'an-minisat' }, [
    s('rect', { x: -14 * scale, y: -3 * scale, width: 9 * scale, height: 6 * scale, class: 'an-minisat-panel' }),
    s('rect', { x: 5 * scale, y: -3 * scale, width: 9 * scale, height: 6 * scale, class: 'an-minisat-panel' }),
    s('rect', { x: -5 * scale, y: -5 * scale, width: 10 * scale, height: 10 * scale, rx: 1.5, class: 'an-minisat-body' }),
  ]);
}

export const setT = (node, x, y, rot = 0, sc = 1) => node.setAttribute('transform', `translate(${x} ${y}) rotate(${rot}) scale(${sc})`);
