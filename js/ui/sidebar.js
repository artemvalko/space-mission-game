// Right-hand panel: live satellite picture, 4 fuel gauges, the Flight Director advisor,
// and a collapsible "Details" drawer. DOM is created once and updated in place so the
// gauges animate smoothly (CSS transitions) and can shake once when they go over.

import { h } from './dom.js';
import { term } from './tooltip.js';
import { renderSatellite } from './satellite.js';
import { computeResources } from '../engine/resources.js';
import { validateDesign } from '../engine/validation.js';
import { advise } from '../engine/advisor.js';
import { goToScreen } from '../state/actions.js';
import { getStep } from './steps.js';
import { kg, watts, money, gbDay, months, pct, num, wh } from '../utils/format.js';

const WORD = { ok: 'OK', caution: 'Tight', over: 'Over', blocked: 'Over', unknown: 'To do' };
const GAUGES = [
  { key: 'budget', icon: '💰', label: 'Money' },
  { key: 'mass', icon: '⚖️', label: 'Weight' },
  { key: 'power', icon: '⚡', label: 'Power' },
  { key: 'data', icon: '📡', label: 'Data' },
];

let els = null;
const lastStatus = {};
let lastAdvice = '';

function build(container, dispatch) {
  const gauges = {};
  const gaugeList = h('div', { class: 'gauges' }, GAUGES.map((g) => {
    const fill = h('div', { class: 'gauge-fill' });
    const word = h('span', { class: 'gauge-word' });
    const text = h('div', { class: 'gauge-text' });
    const row = h('div', { class: 'gauge', 'data-gauge': g.key }, [
      h('div', { class: 'gauge-head' }, [h('span', { class: 'gauge-label' }, [h('span', { 'aria-hidden': 'true' }, g.icon), ` ${g.label}`]), word]),
      h('div', { class: 'gauge-bar' }, fill),
      text,
    ]);
    gauges[g.key] = { row, fill, word, text };
    return row;
  }));
  const advisorText = h('p', { class: 'advisor-text' });
  const advisorFix = h('button', { class: 'btn btn-small', type: 'button', key: 'advisor-fix' });
  const advisor = h('div', { class: 'advisor', role: 'status', 'aria-live': 'polite' }, [
    h('div', { class: 'advisor-avatar', 'aria-hidden': 'true' }, '🧑‍🚀'),
    h('div', { class: 'advisor-body' }, [h('div', { class: 'advisor-name' }, 'Flight Director'), advisorText, advisorFix]),
  ]);
  const detailsList = h('dl', { class: 'details-list' });
  const details = h('details', { class: 'drawer' }, [h('summary', {}, 'Details'), detailsList]);
  const pic = h('div', { class: 'sat-frame' });
  container.replaceChildren(pic, advisor, gaugeList, details);
  advisorFix.addEventListener('click', () => { if (advisorFix.dataset.step) dispatch(goToScreen(advisorFix.dataset.step)); });
  return { container, pic, gauges, advisor, advisorText, advisorFix, detailsList };
}

function gaugeView(res) {
  switch (res.key) {
    case 'budget': return res.available == null ? '' : `${money(res.used)} of ${money(res.available)}${res.launchUnknown ? ' (+ launch RFQ)' : ''}`;
    case 'mass':
      if (res.status === 'blocked') return "This rocket can't reach your orbit";
      return res.available == null ? `${kg(res.used)} — pick a frame & rocket to compare` : `${kg(res.used)} of ${kg(res.available)} allowed`;
    case 'power':
      if (res.available == null) return res.used ? `Needs ${watts(res.used)} avg — ${res.generation === null && res.consumption ? 'pick array & orbit' : 'pick a solar array'}` : 'Pick a solar array';
      return `Needs ${watts(res.used)} of ${num(res.available, 1)} W avg`;
    case 'data':
      if (res.status === 'blocked') return 'Wrong ground segment — nobody receives it';
      if (res.kind === 'packets') return res.status === 'unknown' ? 'Store & forward — pick radio, downlink, gateways' : res.chainOk ? 'Store & forward chain complete' : `Missing: ${res.missing.join(', ')}`;
      if (res.kind === 'nav') return res.status === 'unknown' ? 'Navigation broadcast — pick payload & ground' : res.chainOk ? 'L-band broadcast + time uplink ready' : `Missing: ${res.missing.join(', ')}`;
      if (res.available == null) return res.used ? `Makes ${gbDay(res.used)} — pick downlink & station` : 'Pick the radiometer first';
      return `Makes ${gbDay(res.used)}, sends ${gbDay(res.available)} (theory)`;
    default: return '';
  }
}

export function renderSidebar(container, state, dispatch) {
  if (!els || els.container !== container) els = build(container, dispatch);
  const res = computeResources(state);
  const issues = validateDesign(state, res);

  els.pic.replaceChildren(renderSatellite(state), h('div', { class: 'sat-caption' }, 'Your satellite'));

  for (const g of GAUGES) {
    const r = res[g.key];
    const el = els.gauges[g.key];
    let status = r.status;
    const ratio = r.ratio == null ? 0 : Number.isFinite(r.ratio) ? r.ratio : 1.2;
    el.fill.style.width = `${Math.min(ratio, 1) * 100}%`;
    el.row.className = `gauge gauge-${status}`;
    el.word.textContent = WORD[status];
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
    els.advisorFix.textContent = a.tone === 'ok' ? `Go to ${getStep(a.step).label} →` : `Fix it: ${getStep(a.step).label} →`;
  }

  const row = (label, value, status, glossary) => [
    h('dt', {}, glossary ? term(glossary, label) : label),
    h('dd', { class: status ? `st-${status}` : null }, value),
  ];
  els.detailsList.replaceChildren(...[
    ...row('📅 Planning window', res.time.range ? `${res.time.range[0]}–${res.time.range[1]} months` : 'none given', null),
    ...row('⏳ Mission plan', `${months(res.lifetime.plannedMonths)}${res.lifetime.required ? ` (need ≥${months(res.lifetime.required * 12)})` : ''}`, null),
    ...row('🎯 Mission payload', pct(res.science.payloadShare ?? 0), !state.design.instrumentIds.length ? null : res.science.ok ? 'ok' : 'over', 'payload'),
    ...row('🔋 Battery in shadow', res.battery.usable == null ? '—' : res.battery.needWh == null ? `${wh(res.battery.usable)} usable` : `${num(res.battery.needWh, 2)} of ${wh(res.battery.usable)} usable`, res.battery.status === 'unknown' ? null : res.battery.status, 'eclipse'),
    ...row('🚀 Launch', res.launch.reaches == null ? '—' : res.launch.reaches ? 'reaches your orbit' : 'cannot reach your orbit', res.launch.reaches == null ? null : res.launch.reaches ? 'ok' : 'over'),
  ]);
}

/** Reset change-tracking (e.g. on a new mission) so nothing shakes on first render. */
export function resetSidebarTracking() {
  for (const k of Object.keys(lastStatus)) delete lastStatus[k];
}
