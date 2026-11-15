// Right-hand panel: live satellite picture, 4 fuel gauges, the Flight Director advisor,
// and a collapsible "Details" drawer. DOM is created once and updated in place so the
// gauges animate smoothly (CSS transitions) and can shake once when they go over.

import { h } from './dom.js';
import { icon } from './icons.js';
import { getComponent } from '../data/components.js';
import { term } from './tooltip.js';
import { renderSatellite } from './satellite.js';
import { computeResources } from '../engine/resources.js';
import { validateDesign } from '../engine/validation.js';
import { advise } from '../engine/advisor.js';
import { formatDelta } from '../engine/explain.js';
import { goToScreen } from '../state/actions.js';
import { getStep } from './steps.js';
import { kg, watts, money, gbDay, months, pct, num, wh } from '../utils/format.js';

const WORD = { ok: 'OK', caution: 'Tight', over: 'Over', blocked: 'Over', unknown: 'To do', uncertain: 'Uncertain', unverified: 'Unverified', estimated: 'Estimated' };
const GAUGES = [
  { key: 'budget', icon: 'money', label: 'Money' },
  { key: 'mass', icon: 'weight', label: 'Weight' },
  { key: 'power', icon: 'power', label: 'Power' },
  { key: 'data', icon: 'antenna', label: 'Data' },
];

let els = null;
let prevRes = null;       // resources before the last design change (view-only)
let lastDesignKey = null;
let lastChange = '';
const lastStatus = {};
let lastAdvice = '';

function build(container, dispatch) {
  const gauges = {};
  const gaugeList = h('div', { class: 'gauges' }, GAUGES.map((g) => {
    const fill = h('div', { class: 'gauge-fill' });
    const word = h('span', { class: 'gauge-word' });
    const text = h('span', { class: 'gauge-text' });
    const row = h('div', { class: 'gauge', 'data-gauge': g.key }, [
      h('div', { class: 'gauge-head' }, [h('span', { class: 'gauge-label' }, [icon(g.icon, 14), ` ${g.label}`]), text]),
      h('div', { class: 'gauge-bar' }, fill),
      h('div', { class: 'gauge-foot' }, word),
    ]);
    gauges[g.key] = { row, fill, word, text };
    return row;
  }));
  const advisorText = h('p', { class: 'advisor-text' });
  const changeLine = h('p', { class: 'advisor-change small' });
  const advisorFix = h('button', { class: 'btn btn-small', type: 'button', key: 'advisor-fix' });
  const advisor = h('div', { class: 'advisor', role: 'status', 'aria-live': 'polite' }, [
    h('div', { class: 'advisor-avatar monogram', 'aria-hidden': 'true' }, ['FD', h('span', { class: 'monogram-dot' })]),
    h('div', { class: 'advisor-body', title: 'Flight Director' }, [advisorText, changeLine, advisorFix]),
  ]);
  const detailsList = h('dl', { class: 'details-list' });
  const details = h('details', { class: 'drawer' }, [h('summary', {}, 'Details'), detailsList]);
  const pic = h('div', { class: 'sat-frame' });
  container.replaceChildren(pic, advisor, gaugeList, details);
  advisorFix.addEventListener('click', () => { if (advisorFix.dataset.step) dispatch(goToScreen(advisorFix.dataset.step)); });
  return { container, pic, gauges, advisor, advisorText, advisorFix, detailsList, changeLine };
}

function gaugeView(res) {
  switch (res.key) {
    case 'budget': return res.available == null ? '' : `${res.estimated ? '≈ ' : ''}${money(res.used)} / ${money(res.available)}${res.uncertain ? ` · ${res.unknownItems.length} price ?` : ''}`;
    case 'mass':
      if (res.status === 'blocked') return 'orbit unreachable';
      if (res.cannotVerify?.length) return `? ${res.cannotVerify[0]} mass not public`;
      if (res.reference) return `${num(res.used, 1)} kg real total${res.available ? ` / ${kg(res.available)}` : ''}`;
      return res.available == null ? kg(res.used) : `${num(res.used, 1)} / ${kg(res.available)}`;
    case 'power':
      if (res.reference) return 'real satellite (flew)';
      if (res.available == null) return res.used ? `${watts(res.used)} needed` : '—';
      return `${watts(res.used)} / ${num(res.available, 1)} W`;
    case 'data':
      if (res.status === 'blocked') return 'wrong ground';
      if (res.kind === 'packets' || res.kind === 'nav') return res.status === 'unknown' ? '—' : res.chainOk ? 'chain' : 'chain broken';
      if (res.rateUnknown && res.chainOk) return 'chain (rate not public)';
      if (res.available == null) return res.used ? `${num(res.used, 1)} GB/day` : '—';
      return `${num(res.used, 1)} / ${num(res.available, 2)} GB/day`;
    default: return '';
  }
}

export function renderSidebar(container, state, dispatch) {
  if (!els || els.container !== container) els = build(container, dispatch);
  const res = computeResources(state);
  const issues = validateDesign(state, res);

  els.pic.replaceChildren(renderSatellite(state));

  // Flight Director: one short line on what the last choice changed (e.g. "+1 kg · battery margin 412%").
  const designKey = `${state.scenarioId}:${JSON.stringify(state.design)}`;
  if (designKey !== lastDesignKey) {
    if (prevRes && lastDesignKey?.startsWith(`${state.scenarioId}:`)) {
      const delta = formatDelta(prevRes, res);
      const b = res.battery;
      const margin = b.usable != null && b.needWh ? ` · battery margin ${pct(b.usable / b.needWh)}` : '';
      const burst = getComponent(state.design.components.eol)?.firePowerW && res.power.consumption != null && getComponent(state.design.components.eol).firePowerW > res.power.consumption
        ? ` · fires at ${getComponent(state.design.components.eol).firePowerW} W > ${Math.round(res.power.consumption)} W average: bursts on battery` : '';
      lastChange = delta === 'no change' ? '' : `Change: ${delta}${margin}${burst}`;
    } else lastChange = '';
    prevRes = res;
    lastDesignKey = designKey;
  }
  els.changeLine.textContent = lastChange;
  els.changeLine.hidden = !lastChange;

  for (const g of GAUGES) {
    const r = res[g.key];
    const el = els.gauges[g.key];
    let status = r.status;
    if (g.key === 'budget' && r.uncertain && status !== 'over') status = 'uncertain'; // amber, hatched — not a fail
    // Unknown value (mass / eclipse / data rate): a visible "Unverified", never a silent OK (CLARITY P0.3).
    if (r.validity === 'unverified' && status !== 'over' && status !== 'blocked') status = 'unverified';
    const ratio = r.ratio == null ? 0 : Number.isFinite(r.ratio) ? r.ratio : 1.2;
    el.fill.style.width = `${Math.min(ratio, 1) * 100}%`;
    el.row.className = `gauge gauge-${status === 'uncertain' || status === 'unverified' ? 'caution gauge-uncertain' : status}`;
    el.word.textContent = g.key === 'budget' && r.program === 'estimated' && status === 'ok' ? WORD.estimated : WORD[status];
    el.text.textContent = gaugeView(r);
    const wasOver = lastStatus[g.key] === 'over' || lastStatus[g.key] === 'blocked';
    if ((status === 'over' || status === 'blocked') && !wasOver && lastStatus[g.key] !== undefined) {
      el.row.classList.add('shake');
      setTimeout(() => el.row.classList.remove('shake'), 600);
    }
    lastStatus[g.key] = status;
  }

  const a = advise(state, issues);
  els.advisor.className = `advisor advisor-${a.tone}`;
  if (a.text !== lastAdvice) {
    els.advisor.classList.add('slide');
    setTimeout(() => els.advisor.classList.remove('slide'), 400);
    lastAdvice = a.text;
  }
  els.advisorText.textContent = a.text;
  const showFix = a.step && a.step !== state.screen;
  els.advisorFix.hidden = !showFix;
  if (showFix) {
    els.advisorFix.dataset.step = a.step;
    els.advisorFix.textContent = a.tone === 'ok' ? `${getStep(a.step).label} →` : `Fix: ${getStep(a.step).label} →`;
  }

  const row = (label, value, status, glossary) => [
    h('dt', {}, glossary ? term(glossary, label) : label),
    h('dd', { class: status ? `st-${status}` : null }, value),
  ];
  els.detailsList.replaceChildren(...[
    ...row('Planning window', res.time.range ? `${res.time.range[0]}–${res.time.range[1]} months` : 'none given', null),
    ...row('Mission plan', `${months(res.lifetime.plannedMonths)}${res.lifetime.required ? ` (need ≥${months(res.lifetime.required * 12)})` : ''}`, null),
    ...row('Mission payload', pct(res.science.payloadShare ?? 0), !state.design.instrumentIds.length ? null : res.science.ok ? 'ok' : 'over', 'payload'),
    ...row('Battery in shadow', res.battery.usable == null ? '—' : res.battery.needWh == null ? `${wh(res.battery.usable)} usable` : `${num(res.battery.needWh, 2)} of ${wh(res.battery.usable)} usable`, res.battery.status === 'unknown' ? null : res.battery.status, 'eclipse'),
    ...row('Launch', res.launch.reaches == null ? '—' : res.launch.reaches ? 'reaches your orbit' : 'cannot reach your orbit', res.launch.reaches == null ? null : res.launch.reaches ? 'ok' : 'over'),
  ]);
}

/** Reset change-tracking (e.g. on a new mission) so nothing shakes on first render. */
export function resetSidebarTracking() {
  for (const k of Object.keys(lastStatus)) delete lastStatus[k];
}
