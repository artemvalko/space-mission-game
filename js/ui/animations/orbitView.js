// Scene 5 — Operations orbit view, plus problem modes:
//   6 power problem (dims in shadow, battery drains red, grey "SAFE MODE", recovers or stays dark)
//   7 data overflow (storage fills, extra packets turn red and fade — "lost data")
//   8 comms loss (signal waves fade before Earth, "📡 NO SIGNAL" blinks)
// The satellite orbits the planet matching the chosen orbit (circle LEO/SSO/GEO, ellipse HEO,
// halo loop at L2, transfer arc then orbit for Moon/Mars), flashes over ground stations, data
// packets fly to the dish, the science counter ticks. Timeline with event markers, Pause/1×/4×,
// mini-gauges (battery, data, science, money, toughness).
//
// orbitView(container, { state, sim, toMonth, modes? }) → Promise resolving when playback reaches
// toMonth. The view persists on the container between calls (one view per simulation run).

import { h, s } from '../dom.js';
import { getSelection, computeResources } from '../../engine/resources.js';
import { visualConditions } from '../../engine/outcome.js';
import { getEvent } from '../../data/events.js';
import { W, H, stars, miniSat, setT, reducedMotion, lerp, clamp01, nextFrame } from './core.js';
import { money, num, pct } from '../../utils/format.js';
import { drawView, viewKind } from './instrumentView.js';
import { addGalleryImage } from '../gallery.js';
import { sound } from '../sound.js';

const IMAGE_EVERY_MONTHS = 6;
const MAX_IMAGES = 6;

const SEC_PER_MONTH = 0.32; // at 1×
const STATIONS = { gs_single: [-90], gs_global: [-90, 30, 150], gs_dsn: [-30, 90, 210] };
const EVENT_ICON = { hardware_failure: '🔧', solar_flare: '☀️', debris: '☄️', budget_cut: '💸', launch_delay: '⏱', discovery: '✨' };

function geometry(orbitId) {
  const C = { cx: 400, cy: 225 };
  switch (orbitId) {
    case 'geo': return { earth: { ...C, r: 55 }, center: { ...C, r: 55 }, path: { type: 'circle', ...C, r: 185 }, period: 8, contactArc: 70 };
    case 'sso': return { earth: { ...C, r: 85 }, center: { ...C, r: 85 }, path: { type: 'ellipse', ...C, rx: 128, ry: 46, rot: -68 }, period: 3.4, contactArc: 25 };
    case 'heo': {
      const a = 262; const b = 108; const c = Math.sqrt(a * a - b * b);
      return { earth: { cx: 330 + c, cy: 225, r: 34 }, center: { cx: 330 + c, cy: 225, r: 34 }, path: { type: 'kepler', cx: 330, cy: 225, a, b, e: c / a }, period: 6, contactApogee: true };
    }
    case 'l2': return { sun: { cx: -70, cy: 225, r: 130 }, earth: { cx: 430, cy: 225, r: 24 }, center: null, path: { type: 'halo', cx: 640, cy: 225, rx: 26, ry: 72 }, period: 6, far: true, transfer: { x0: 455, y0: 225, x1: 640, y1: 153, bend: -60 } };
    case 'lunar': return { earth: { cx: 130, cy: 250, r: 42 }, moon: { cx: 570, cy: 215, r: 34 }, center: { cx: 570, cy: 215, r: 34 }, path: { type: 'circle', cx: 570, cy: 215, r: 62 }, period: 3.6, far: true, transfer: { x0: 172, y0: 250, x1: 570, y1: 153, bend: -140 } };
    case 'mars': return { earth: { cx: 100, cy: 345, r: 16 }, mars: { cx: 560, cy: 195, r: 62 }, center: { cx: 560, cy: 195, r: 62 }, path: { type: 'circle', cx: 560, cy: 195, r: 98 }, period: 4, far: true, transfer: { x0: 116, y0: 345, x1: 560, y1: 97, bend: -200 } };
    default: return { earth: { ...C, r: 85 }, center: { ...C, r: 85 }, path: { type: 'circle', ...C, r: 112 }, period: 3, contactArc: 22 };
  }
}

function posOnPath(p, phase) {
  const th = phase * Math.PI * 2;
  switch (p.type) {
    case 'circle': return { x: p.cx + Math.cos(th) * p.r, y: p.cy + Math.sin(th) * p.r };
    case 'ellipse': {
      const x = Math.cos(th) * p.rx; const y = Math.sin(th) * p.ry; const r = (p.rot * Math.PI) / 180;
      return { x: p.cx + x * Math.cos(r) - y * Math.sin(r), y: p.cy + x * Math.sin(r) + y * Math.cos(r) };
    }
    case 'halo': return { x: p.cx + Math.cos(th) * p.rx, y: p.cy + Math.sin(th) * p.ry };
    case 'kepler': {
      // Solve Kepler's equation so the satellite races at perigee and lingers at apogee.
      const M = th;
      let E = M;
      for (let i = 0; i < 6; i++) E -= (E - p.e * Math.sin(E) - M) / (1 - p.e * Math.cos(E));
      return { x: p.cx - Math.cos(E) * p.a, y: p.cy + Math.sin(E) * p.b };
    }
    default: return { x: 0, y: 0 };
  }
}

function pathNode(p) {
  switch (p.type) {
    case 'circle': return s('circle', { cx: p.cx, cy: p.cy, r: p.r, class: 'an-orbit' });
    case 'ellipse': return s('ellipse', { cx: p.cx, cy: p.cy, rx: p.rx, ry: p.ry, transform: `rotate(${p.rot} ${p.cx} ${p.cy})`, class: 'an-orbit' });
    case 'halo': return s('ellipse', { cx: p.cx, cy: p.cy, rx: p.rx, ry: p.ry, class: 'an-orbit' });
    case 'kepler': return s('ellipse', { cx: p.cx, cy: p.cy, rx: p.a, ry: p.b, class: 'an-orbit' });
    default: return s('g');
  }
}

const quad = (tr, u) => {
  const mx = (tr.x0 + tr.x1) / 2; const my = (tr.y0 + tr.y1) / 2 + tr.bend;
  const a = 1 - u;
  return { x: a * a * tr.x0 + 2 * a * u * mx + u * u * tr.x1, y: a * a * tr.y0 + 2 * a * u * my + u * u * tr.y1 };
};

class OrbitView {
  constructor(container, state, sim) {
    this.key = `${sim.seed}:${sim.relaunches}`;
    this.state = state;
    this.sim = sim;
    const sel = getSelection(state);
    this.res = computeResources(state);
    this.vis = visualConditions(state);
    this.orbit = sel.orbit;
    this.g = geometry(sel.orbit?.id);
    this.month = 0;
    this.speed = 1;
    this.paused = false;
    this.phase = 0;
    this.battery = 1;
    this.safeMode = false;
    this.storage = 0;
    this.packetAcc = 0;
    this.packetTimer = 0;
    this.lostAcc = 0;
    this.waveTimer = 0;
    this.target = 0;
    this.resolve = null;
    this.planned = Math.max(1, sim.summary.plannedMonths || Math.round(this.res.lifetime.value * 12));
    this.camera = sel.instruments.find((i) => viewKind(i.id) !== 'relay') ?? null;
    this.lastImage = -IMAGE_EVERY_MONTHS + 2;
    this.images = 0;
    this.imaging = null;
    this.build(container, sel);
    this.last = null;
    this.raf = nextFrame((ts) => this.loop(ts));
  }

  build(container, sel) {
    const g = this.g;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'anim-svg', role: 'img', 'aria-label': `Your satellite in ${sel.orbit?.plainName ?? 'orbit'}` });
    svg.append(s('rect', { x: 0, y: 0, width: W, height: H, class: 'an-space' }), stars(120, 5));
    if (g.sun) svg.append(s('circle', { cx: g.sun.cx, cy: g.sun.cy, r: g.sun.r, class: 'an-sun' }));
    else svg.append(s('g', { class: 'an-sunlight' }, [s('line', { x1: 14, y1: H - 30, x2: 70, y2: H - 30 }), s('text', { x: 14, y: H - 12, class: 'an-small-label' }, '☀ sunlight →')]));
    // Shadow band behind the body we orbit (height from the orbit's eclipse fraction)
    if (g.center && this.vis.eclipseFraction > 0) {
      const R = g.path.r ?? g.path.a ?? 120;
      const half = Math.max(g.center.r * 0.4, Math.min(R, R * Math.sin(Math.PI * this.vis.eclipseFraction)));
      this.shadow = { x: g.center.cx, y0: g.center.cy - half, y1: g.center.cy + half };
      svg.append(s('rect', { x: g.center.cx, y: g.center.cy - half, width: W - g.center.cx, height: half * 2, class: 'an-shadow' }));
    }
    if (g.transfer) svg.append(s('path', { d: `M ${g.transfer.x0} ${g.transfer.y0} Q ${(g.transfer.x0 + g.transfer.x1) / 2} ${(g.transfer.y0 + g.transfer.y1) / 2 + g.transfer.bend} ${g.transfer.x1} ${g.transfer.y1}`, class: 'an-transfer' }));
    svg.append(pathNode(g.path));
    const e = g.earth;
    svg.append(s('circle', { cx: e.cx, cy: e.cy, r: e.r, class: 'an-earth' }));
    svg.append(s('path', { d: `M ${e.cx} ${e.cy - e.r} A ${e.r} ${e.r} 0 0 1 ${e.cx} ${e.cy + e.r} Z`, class: 'an-night' }));
    if (g.moon) svg.append(s('circle', { cx: g.moon.cx, cy: g.moon.cy, r: g.moon.r, class: 'an-moon' }));
    if (g.mars) svg.append(s('circle', { cx: g.mars.cx, cy: g.mars.cy, r: g.mars.r, class: 'an-mars' }));
    if (g.path.type === 'halo') svg.append(s('text', { x: g.path.cx, y: g.path.cy + 96, class: 'an-small-label', 'text-anchor': 'middle' }, 'L2'));
    // Ground stations
    this.dishes = (STATIONS[sel.ground?.id] ?? [-90]).map((deg) => {
      const a = (deg * Math.PI) / 180;
      const x = e.cx + Math.cos(a) * (e.r + 3); const y = e.cy + Math.sin(a) * (e.r + 3);
      const node = s('g', { class: 'an-dish' }, [s('circle', { cx: x, cy: y, r: Math.max(3, e.r * 0.09) }), s('circle', { cx: x, cy: y, r: 10, class: 'an-dish-glow' })]);
      svg.append(node);
      return { deg, x, y, node };
    });
    this.packets = s('g', {});
    this.waves = s('g', {});
    this.sat = miniSat(1.3);
    this.satLabel = s('text', { class: 'an-sat-label', 'text-anchor': 'middle' }, '');
    svg.append(this.packets, this.waves, this.sat, this.satLabel);

    // HUD
    const gauge = (icon, label) => {
      const val = h('span', { class: 'hud-val' });
      const bar = h('div', { class: 'hud-bar' }, h('div', { class: 'hud-fill' }));
      return { el: h('div', { class: 'hud-item' }, [h('span', { class: 'hud-label' }, `${icon} ${label}`), val, bar]), val, fill: bar.firstChild };
    };
    this.hud = { battery: gauge('🔋', 'Battery'), data: gauge('📡', 'Data'), science: gauge('🔬', 'Science'), money: gauge('💰', 'Money'), health: gauge('🛡️', 'Toughness') };
    const hudEl = h('div', { class: 'hud' }, Object.values(this.hud).map((x) => x.el));
    this.timeFill = h('div', { class: 'tl-fill' });
    this.timeMarkers = h('div', { class: 'tl-markers' });
    this.monthLabel = h('span', { class: 'tl-label' });
    const ctrl = (label, fn, key) => h('button', { class: 'btn btn-small', type: 'button', 'data-ctl': key, onClick: fn }, label);
    this.ctrls = h('div', { class: 'tl-controls' }, [
      ctrl('⏸ Pause', () => this.setPaused(!this.paused), 'pause'),
      ctrl('1×', () => this.setSpeed(1), 'speed1'),
      ctrl('4×', () => this.setSpeed(4), 'speed4'),
    ]);
    const timeline = h('div', { class: 'timeline-bar' }, [h('div', { class: 'tl-track' }, [this.timeFill, this.timeMarkers]), this.monthLabel, this.ctrls]);
    this.skipBtn = h('button', { class: 'anim-skip', type: 'button', 'data-anim-skip': '' }, 'Skip ▶▶');
    this.skipBtn.addEventListener('click', () => this.jump());
    this.overlay = h('div', { class: 'anim-overlay' });
    this.photo = h('div', { class: 'downlink', hidden: true });
    this.root = h('div', { class: 'anim-stage', 'data-scene': 'orbit' }, [svg, hudEl, this.photo, this.overlay, this.skipBtn]);
    this.wrap = h('div', { class: 'orbit-wrap' }, [this.root, timeline]);
    container.replaceChildren(this.wrap);
    container.__orbitView = this;
    this.syncControls();
    this.renderMarkers();
  }

  update(state, sim) {
    this.state = state;
    this.sim = sim;
    this.planned = Math.max(1, sim.summary.plannedMonths || this.planned);
    this.renderMarkers();
  }

  renderMarkers() {
    const evs = [...this.sim.events.filter((e) => e.month > 0), ...(this.sim.pending && this.sim.pending.month > 0 ? [this.sim.pending] : [])];
    this.timeMarkers.replaceChildren(...evs.map((e) => h('span', {
      class: ['tl-marker', e.eventId === 'hardware_failure' && 'bad', e === this.sim.pending && 'pending'],
      style: { left: `${clamp01(e.month / this.planned) * 100}%` }, title: `Month ${e.month}: ${getEvent(e.eventId)?.title}`,
    }, EVENT_ICON[e.eventId] ?? '•')));
  }

  setSpeed(x) { this.speed = x; this.paused = false; this.syncControls(); }
  setPaused(p) { this.paused = p; this.syncControls(); }
  syncControls() {
    this.ctrls.querySelector('[data-ctl="pause"]').textContent = this.paused ? '▶ Play' : '⏸ Pause';
    this.ctrls.querySelector('[data-ctl="speed1"]').classList.toggle('btn-active', !this.paused && this.speed === 1);
    this.ctrls.querySelector('[data-ctl="speed4"]').classList.toggle('btn-active', !this.paused && this.speed === 4);
  }

  /** Play until `target` month; resolves when reached. */
  playTo(target) {
    this.target = Math.max(this.month, target);
    this.skipBtn.hidden = false;
    if (reducedMotion()) { this.jump(); }
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.checkDone();
    });
  }

  jump() {
    this.month = this.target;
    this.draw(0);
    this.checkDone();
  }

  checkDone() {
    if (this.month >= this.target - 1e-9 && this.resolve) {
      const r = this.resolve; this.resolve = null;
      this.skipBtn.hidden = true;
      r('done');
    }
  }

  satPos() {
    const g = this.g;
    if (g.transfer && this.month < 1.5) return quad(g.transfer, clamp01(this.month / 1.5));
    return posOnPath(g.path, this.phase);
  }

  inShadow(p) {
    const sh = this.shadow;
    return !!sh && p.x > sh.x && p.y > sh.y0 && p.y < sh.y1;
  }

  contact(p) {
    const v = this.vis;
    if (v.commsDead) return null;
    const g = this.g;
    if (g.far) return this.month >= 1.5 ? this.dishes[0] : null;
    if (g.contactApogee) {
      const d = Math.hypot(p.x - g.earth.cx, p.y - g.earth.cy);
      return d > 260 ? this.dishes[0] : null;
    }
    const ang = (Math.atan2(p.y - g.earth.cy, p.x - g.earth.cx) * 180) / Math.PI;
    return this.dishes.find((d) => Math.abs(((ang - d.deg + 540) % 360) - 180) < (g.contactArc ?? 25)) ?? null;
  }

  loop(ts) {
    if (!this.root.isConnected) { if (this.resolve) { this.resolve('detached'); this.resolve = null; } return; }
    const dt = this.last == null ? 0 : Math.min(100, ts - this.last);
    this.last = ts;
    if (!this.paused && this.month < this.target) {
      this.month = Math.min(this.target, this.month + (dt / 1000) * this.speed / SEC_PER_MONTH);
      this.phase = (this.phase + (dt / 1000) * this.speed / this.g.period) % 1;
      this.draw(dt * this.speed);
      this.checkDone();
    } else {
      this.draw(0);
    }
    this.raf = nextFrame((t) => this.loop(t));
  }

  draw(dt) {
    const p = this.satPos();
    const v = this.vis;
    setT(this.sat, p.x, p.y, 0, 1);
    const shade = this.inShadow(p);
    // Battery model (visual): drains in shadow, recharges in sun if there is enough power.
    const period = this.g.period;
    if (v.powerDead) this.battery = Math.max(0, this.battery - dt / 1500);
    else if (shade) this.battery -= (dt / 1000) * (Math.min(v.batteryRatio, 2) / Math.max(0.2, (this.vis.eclipseFraction || 0.3) * period));
    else if (v.powerFactor >= 1) this.battery += (dt / 1000) * (1.6 / period);
    else this.battery -= (dt / 1000) * ((1 - v.powerFactor) * 0.9) / period;
    this.battery = clamp01(this.battery);
    if (this.battery <= 0.01) this.safeMode = true;
    if (this.safeMode && this.battery > 0.3 && !v.powerDead) this.safeMode = false;
    this.sat.classList.toggle('dim', shade);
    this.sat.classList.toggle('safe', this.safeMode);
    this.satLabel.setAttribute('x', p.x); this.satLabel.setAttribute('y', p.y - 18);

    // Comms
    const dish = this.safeMode ? null : this.contact(p);
    this.dishes.forEach((d) => d.node.classList.toggle('on', d === dish));
    if (v.commsDead) {
      this.waveTimer += dt;
      if (this.waveTimer > 380) { this.waveTimer = 0; this.spawnWave(p); }
      this.satLabel.textContent = Math.floor(performance.now() / 450) % 2 ? '📡 NO SIGNAL' : '';
    } else {
      this.satLabel.textContent = this.safeMode ? 'SAFE MODE' : '';
    }
    if (dish && dt > 0 && !this.imaging && this.camera && this.images < MAX_IMAGES && this.month - this.lastImage >= IMAGE_EVERY_MONTHS) this.startImage();
    if (this.imaging) this.revealImage(dt);
    if (dish && dt > 0) {
      this.packetTimer += dt;
      if (this.packetTimer > 160) {
        this.packetTimer = 0;
        this.lostAcc += v.dataLostFraction;
        const lost = this.lostAcc >= 1;
        if (lost) this.lostAcc -= 1;
        this.spawnPacket(p, dish, lost);
      }
      this.storage = Math.max(0, this.storage - dt / 1400);
    } else if (dt > 0) {
      this.storage = Math.min(1, this.storage + (dt / 2600) * (v.dataOverflow ? 2 : 0.6));
    }
    this.animatePackets(dt);
    this.updateHud();
  }

  /** Downlinked picture: revealed scanline by scanline, then saved to the Results gallery. */
  startImage() {
    const m = Math.max(1, Math.round(this.month));
    this.lastImage = this.month;
    this.images += 1;
    const canvas = drawView(document.createElement('canvas'), this.camera.id, { seed: (this.sim.seed % 997) + m, lostRows: this.vis.dataLostFraction });
    canvas.className = 'downlink-canvas';
    canvas.style.clipPath = 'inset(0 0 100% 0)';
    this.photo.replaceChildren(h('div', { class: 'downlink-label' }, `📥 Month ${m} · ${this.camera.plainName}`), canvas);
    this.photo.hidden = false;
    this.imaging = { canvas, u: 0, m };
    sound.radio();
  }

  revealImage(dt) {
    const im = this.imaging;
    im.u = Math.min(1, im.u + dt / 1600);
    im.canvas.style.clipPath = `inset(0 0 ${100 - im.u * 100}% 0)`;
    if (im.u >= 1) {
      const img = new Image();
      img.src = im.canvas.toDataURL('image/png');
      img.alt = `Picture from month ${im.m}`;
      addGalleryImage({ key: `${this.key}:${im.m}`, label: `Month ${im.m} · ${this.camera.plainName}${this.vis.dataLostFraction > 0 ? ' (some data lost)' : ''}`, node: img });
      this.imaging = null;
    }
  }

  spawnPacket(from, dish, lost) {
    const node = s('rect', { width: 6, height: 6, rx: 1, class: lost ? 'an-packet lost' : 'an-packet' });
    node.__p = { x0: from.x, y0: from.y, x1: dish.x, y1: dish.y, u: 0, lost };
    this.packets.append(node);
  }

  spawnWave(p) {
    const e = this.g.earth;
    const ang = Math.atan2(e.cy - p.y, e.cx - p.x);
    const node = s('path', { class: 'an-wave' });
    node.__w = { x: p.x, y: p.y, ang, u: 0 };
    this.waves.append(node);
  }

  animatePackets(dt) {
    const speed = this.g.far ? 1 / 1600 : 1 / 650;
    for (const n of [...this.packets.children]) {
      const q = n.__p;
      q.u += dt * speed;
      const x = lerp(q.x0, q.x1, q.u); const y = lerp(q.y0, q.y1, q.u);
      n.setAttribute('x', x - 3); n.setAttribute('y', y - 3);
      if (q.lost) n.setAttribute('opacity', Math.max(0, 1 - q.u * 2.2));
      if (q.u >= 1 || (q.lost && q.u > 0.45)) n.remove();
    }
    for (const n of [...this.waves.children]) {
      const w = n.__w;
      w.u += dt / 1400;
      const r = 12 + w.u * 160;
      const a0 = w.ang - 0.5; const a1 = w.ang + 0.5;
      n.setAttribute('d', `M ${w.x + Math.cos(a0) * r} ${w.y + Math.sin(a0) * r} A ${r} ${r} 0 0 1 ${w.x + Math.cos(a1) * r} ${w.y + Math.sin(a1) * r}`);
      n.setAttribute('opacity', Math.max(0, 0.9 - w.u * 1.6)); // fades long before reaching Earth
      if (w.u > 0.6) n.remove();
    }
  }

  /** Values at the current playback month (events up to now applied). */
  current() {
    const m = this.month;
    const past = this.sim.events.filter((e) => e.month <= m);
    let health = this.res.health.value; let extra = 0;
    const relaunchExtra = this.sim.summary.extraCostM - this.sim.events.reduce((acc, e) => acc + (getEvent(e.eventId).choices[e.choiceIndex].effects.budgetM ?? 0), 0);
    for (const e of past) {
      const eff = getEvent(e.eventId).choices[e.choiceIndex].effects;
      health += eff.health ?? 0;
      extra += eff.budgetM ?? 0;
    }
    const ticks = this.sim.ticks;
    const i = Math.min(ticks.length - 1, Math.floor(m));
    const a = ticks[Math.max(0, i)]?.science ?? 0;
    const b = ticks[Math.min(ticks.length - 1, i + 1)]?.science ?? a;
    const science = lerp(a, b, m - Math.floor(m));
    const gen = this.res.data.generated ?? 0;
    const down = this.vis.commsDead ? 0 : (this.res.data.downlink ?? 0);
    return { health, money: this.res.budget.used + extra + Math.max(0, relaunchExtra), science, sent: Math.min(gen, down) * 30 * m, lost: Math.max(0, gen - down) * 30 * m };
  }

  updateHud() {
    const c = this.current();
    const set = (k, text, frac, cls) => {
      const g = this.hud[k];
      g.val.textContent = text;
      g.fill.style.width = `${clamp01(frac) * 100}%`;
      g.el.className = `hud-item ${cls ?? ''}`;
    };
    set('battery', pct(this.battery), this.battery, this.battery < 0.25 ? 'bad' : this.battery < 0.5 ? 'tight' : 'ok');
    const sentTotal = c.sent + c.lost;
    set('data', this.vis.commsDead ? 'no signal' : `${num(c.sent)} GB sent${c.lost > 0 ? ` · ${num(c.lost)} lost` : ''}`, sentTotal ? c.sent / sentTotal : this.vis.commsDead ? 0 : 1, this.vis.commsDead ? 'bad' : c.lost > 0 ? 'tight' : 'ok');
    const need = this.state.scenarioId ? (this.res.science.required ?? 0) * (this.res.lifetime.required ?? 1) : 0;
    set('science', num(c.science), need ? c.science / need : 1, need && c.science >= need ? 'ok' : '');
    const budget = this.res.budget.available ?? c.money;
    set('money', money(c.money), c.money / budget, c.money > budget ? 'bad' : 'ok');
    set('health', pct(c.health, 0), c.health, c.health < 0.9 ? 'bad' : c.health < 0.95 ? 'tight' : 'ok');
    this.timeFill.style.width = `${clamp01(this.month / this.planned) * 100}%`;
    this.monthLabel.textContent = `Month ${Math.floor(this.month)} of ${this.planned}`;
  }

  /** Grey the satellite out and let it drift (used before the "mission lost" scene). */
  dim() { this.sat.classList.add('dead'); }
}

/** Get (or create) the persistent orbit view for this simulation and play to `toMonth`. */
export function orbitView(container, { state, sim, toMonth }) {
  let v = container.__orbitView;
  const key = `${sim.seed}:${sim.relaunches}`;
  if (!v || v.key !== key || !container.contains(v.wrap)) v = new OrbitView(container, state, sim);
  else v.update(state, sim);
  return v.playTo(toMonth ?? (sim.pending ? sim.pending.month : sim.summary.monthsOperated));
}

export const getOrbitView = (container) => container.__orbitView ?? null;
