// Step 11 — Results (debrief): grade + score breakdown bars, what went well / what hurt,
// "Try this next time", objectives, personal goals, event log with decisions, real mission
// matches, image gallery, compare with the previous attempt, print / share.

import { mount, h, s } from '../dom.js';
import { getScenario } from '../../data/scenarios.js';
import { getComponent } from '../../data/components.js';
import { getInstrument } from '../../data/instruments.js';
import { getNoGoReason, ROLES } from '../../data/roles.js';
import { matchRealMissions, alternativeArchitectures } from '../../engine/matching.js';
import { checkClaim, constellationStatus } from '../../engine/objectives.js';
import { computeResources, getSelection } from '../../engine/resources.js';
import { sourceLinks, dataBadge } from '../card.js';
import { constellationFix } from '../animations/constellation.js';
import { kg } from '../../utils/format.js';
import { describeOutcome, effectsSummary } from '../../engine/outcome.js';
import { eventLog } from '../../engine/scoring.js';
import { attemptRecord, teamNameOf } from '../../engine/attempt.js';
import { previousAttempt, newBadges } from '../storage.js';
import { earnedBadges } from '../../engine/achievements.js';
import { missionPatch } from '../animations/patch.js';
import { renderGallery } from '../gallery.js';
import { newMission, goToScreen } from '../../state/actions.js';
import { encodeDesign } from '../../utils/share.js';
import { money, num, pct, signed } from '../../utils/format.js';
import { rerender } from '../view.js';

let shareUrl = null; // view-only

function header(state, score, d) {
  const scenario = getScenario(state.scenarioId);
  const patch = s('svg', { viewBox: '-120 -120 240 240', class: 'results-patch', role: 'img', 'aria-label': 'Mission patch' },
    missionPatch({ name: scenario.name, team: teamNameOf(state), orbitId: state.design.orbitId ?? 'leo_550', r: 110, cracked: !score.success }));
  return h('div', { class: ['results-hero', `outcome-${score.outcome}`] }, [
    patch,
    h('div', { class: 'results-grade', 'aria-label': `Grade ${score.grade}` }, score.grade),
    h('div', { class: 'results-head' }, [
      h('div', { class: 'results-title' }, d.title),
      h('div', { class: 'results-total' }, `${num(score.total)} / 1000 points`),
      h('p', { class: 'results-caption' }, d.caption),
    ]),
  ]);
}

function breakdown(score) {
  return h('section', { class: 'panel' }, [
    h('h2', {}, '📊 Score breakdown'),
    h('div', { class: 'score-bars' }, score.parts.map((p) => h('div', { class: 'score-bar' }, [
      h('div', { class: 'score-bar-head' }, [h('span', {}, `${p.label} (${Math.round(p.weight * 100)}%)`), h('strong', {}, `${p.points} / ${p.max}`)]),
      h('div', { class: 'gauge-bar' }, h('div', { class: ['gauge-fill', p.score >= 0.8 ? 'fill-ok' : p.score >= 0.5 ? 'fill-tight' : 'fill-bad'], style: { width: `${p.score * 100}%` } })),
      h('div', { class: 'muted small' }, p.why),
    ]))),
  ]);
}

function wellHurt(score) {
  const list = (items, cls) => (items.length ? h('ul', { class: `insights ${cls}` }, items.map((t) => h('li', {}, t))) : h('p', { class: 'muted' }, 'Nothing to report.'));
  return h('div', { class: 'results-grid' }, [
    h('section', { class: 'panel' }, [h('h2', {}, '✅ What went well'), list(score.insights.good, 'good')]),
    h('section', { class: 'panel' }, [h('h2', {}, '⚠️ What hurt your mission'), list(score.insights.bad, 'bad')]),
  ]);
}

function objectivesPanel(score, state) {
  return h('div', { class: 'results-grid' }, [
    h('section', { class: 'panel' }, [
      h('h2', {}, ['🎯 Mission KPIs & objectives', h('span', { class: 'simulated-tag' }, 'simulated mission output')]),
      h('ul', { class: 'checklist' }, score.objectives.map((o) => h('li', { class: o.met ? 'ok' : 'bad' }, [
        h('strong', {}, `${o.met ? '✓' : '✗'} ${o.icon} ${o.label}${o.kpi ? ' (KPI)' : ''}`), h('div', { class: 'muted small' }, o.why),
      ]))),
      state.scenarioId === 'mission_navigation_meo' && (() => {
        const c = constellationStatus(1);
        return h('div', { class: 'small' }, [h('strong', {}, `${score.stats.satelliteSuccess ? '✓' : '✗'} satellite_success`), ' — your one satellite doing its own job. ',
          h('strong', {}, '✗ constellation_success'), ` — ${c.why} That is what the full constellation adds.`]);
      })(),
    ]),
    h('section', { class: 'panel' }, [
      h('h2', {}, state.mode === 'team' ? '👥 Personal goals' : '🎩 Role goals (all hats)'),
      h('ul', { class: 'checklist' }, score.personalGoals.map((g) => h('li', { class: g.met ? 'ok' : 'bad' }, [
        h('strong', {}, `${g.met ? '✓' : '✗'} ${g.icon} ${g.name}`), h('div', { class: 'small' }, g.text), h('div', { class: 'muted small' }, g.reason),
      ]))),
      state.mode === 'team' && h('p', { class: 'small muted' }, score.votes.unanimous ? '🗳️ Unanimous Go — teamwork bonus!' : `🗳️ ${score.votes.go} of ${score.votes.voters} voted Go.${Object.entries(state.voteReasons).map(([r, id]) => ` ${ROLES.find((x) => x.id === r)?.name}: "${getNoGoReason(id)?.text}".`).join('')}`),
    ]),
  ]);
}

function badgesPanel(state, score, sim) {
  const badges = earnedBadges(state, score, sim);
  const fresh = new Set(newBadges());
  return h('section', { class: 'panel' }, [
    h('h2', {}, `🏅 Badges (${badges.filter((b) => b.earned).length} of ${badges.length} this mission)`),
    h('div', { class: 'badge-grid' }, badges.map((b) => h('div', { class: ['badge-card', b.earned ? 'earned' : 'locked', fresh.has(b.id) && 'new'], title: b.text }, [
      h('div', { class: 'badge-icon', 'aria-hidden': 'true' }, b.icon),
      h('div', { class: 'badge-name' }, [b.name, fresh.has(b.id) && h('span', { class: 'badge-new' }, ' NEW!')]),
      h('div', { class: 'small muted' }, b.earned ? b.why : b.text),
    ]))),
  ]);
}

function eventsPanel(sim, state) {
  const log = eventLog(sim);
  const name = (id) => getComponent(id)?.plainName ?? getInstrument(id)?.plainName;
  return h('section', { class: 'panel' }, [
    h('h2', {}, ['📜 Mission log', h('span', { class: 'simulated-tag' }, 'simulated events')]),
    log.length === 0
      ? h('p', { class: 'muted' }, sim.reachedOrbit ? 'A quiet mission — no events.' : 'The mission ended before anything happened in space.')
      : h('ol', { class: 'event-log' }, log.map((e) => h('li', {}, [
        h('div', {}, [h('strong', {}, `${e.month === 0 ? 'Before launch' : `Month ${e.month}`}: ${e.title}`), e.itemId ? ` (${name(e.itemId)})` : '']),
        h('div', { class: 'small' }, [h('em', {}, `Decision: ${e.choice}. `), e.explanation]),
        h('div', { class: 'event-effects' }, effectsSummary(e.effects, getScenario(state.scenarioId)?.costModel.reserve).map((x) => h('span', { class: ['fx', x.good ? 'fx-good' : 'fx-bad'] }, x.text))),
      ]))),
  ]);
}

/** "Your design vs the real thing": your (model) build next to the matched real mission (facts, sourced). */
function realMissions(state) {
  const matches = matchRealMissions(state, 2);
  const res = computeResources(state);
  const sel = getSelection(state);
  const mine = [
    ['Frame', sel.components.structure?.plainName ?? '—'],
    ['Mass', `${kg(res.mass.used)}${res.mass.reserveFraction ? ' (incl. 15% reserve)' : ''}`],
    ['Orbit', sel.orbit ? `${sel.orbit.plainName}` : '—'],
    ['Payload', sel.instruments.map((i) => i.plainName).join(', ') || '—'],
    ['Launch', sel.launcher?.plainName ?? '—'],
    ['Budget', `${money(res.budget.used)} of ${money(sel.scenario.budgetM)}`],
  ];
  return h('section', { class: 'panel' }, [
    h('h2', {}, '🛰️ Your design vs the real thing'),
    matches.length === 0 ? h('p', { class: 'muted' }, 'No real analog for this mission.') : h('div', { class: 'card-grid' }, [
      h('div', { class: 'card real-mission' }, [
        h('div', { class: 'card-title' }, ['Your design ', dataBadge('model')]),
        h('table', { class: 'compare-real' }, h('tbody', {}, mine.map(([k, v]) => h('tr', {}, [h('th', {}, k), h('td', {}, v)])))),
        h('p', { class: 'small muted' }, 'Your numbers come from the research\'s educational build list — estimates, not official specs.'),
      ]),
      ...matches.map(({ mission: m }) => h('div', { class: 'card real-mission' }, [
        h('div', { class: 'card-title' }, [m.name, ' ', dataBadge('fact')]),
        h('div', { class: 'card-subtitle' }, `${m.agency} · ${m.orbitText}`),
        h('table', { class: 'compare-real' }, h('tbody', {}, m.facts.map(([k, v]) => h('tr', {}, [h('th', {}, k), h('td', {}, v)])))),
        h('p', { class: 'card-desc' }, m.description),
        h('p', { class: 'small' }, sourceLinks(m.sources)),
      ])),
    ]),
  ]);
}

/** The mission's "impossible claim" lesson (+ for navigation: 1 satellite → no fix, 4 → fix). */
function lessonCard(state) {
  const sc = getScenario(state.scenarioId);
  const claim = sc.impossibleClaim;
  const check = checkClaim(state, claim.id);
  const box = sc.id === 'mission_navigation_meo' ? h('div', { class: 'map-box' }) : null;
  if (box) queueMicrotask(() => constellationFix(box, {}));
  const extra = sc.id === 'mission_weather_mw' ? checkClaim(state, 'hourly_cyclone_revisit') : null;
  return h('section', { class: 'panel lesson-card' }, [
    h('h2', {}, `💡 Lesson: ${claim.title}`),
    h('p', {}, claim.text),
    h('p', { class: 'small' }, [h('strong', {}, `✗ "${claim.id === 'global_3d_fix' ? 'One satellite gives everyone a 3D position' : claim.id === 'global_24_7' ? 'One satellite gives 24/7 worldwide service' : 'One short mission proves a climate trend'}" — `), check.why]),
    extra && h('p', { class: 'small' }, [h('strong', {}, '✗ "Every tropical storm, every hour" — '), extra.why]),
    box,
  ]);
}

/** Other correct architectures for the same goal (info only, sourced). */
function alternativesCard(state) {
  const alts = alternativeArchitectures(state);
  if (!alts.length) return null;
  return h('section', { class: 'panel' }, [
    h('h2', {}, '🧭 Alternative correct architectures'),
    h('p', { class: 'muted small' }, 'Different, also-correct ways to approach this goal — for information. Not scored.'),
    h('div', { class: 'card-grid' }, alts.map((m) => h('div', { class: 'card real-mission' }, [
      h('div', { class: 'card-title' }, [m.name, ' ', dataBadge('fact')]),
      h('div', { class: 'card-subtitle' }, `${m.agency} · ${m.orbitText}`),
      h('ul', { class: 'small' }, m.facts.map(([k, v]) => h('li', {}, `${k}: ${v}`))),
      h('p', { class: 'card-desc' }, m.description),
      m.lesson && h('p', { class: 'small ok-text' }, m.lesson),
      h('p', { class: 'small' }, sourceLinks(m.sources)),
    ]))),
  ]);
}

function compare(state) {
  const cur = attemptRecord(state, Number.MAX_SAFE_INTEGER);
  const prev = previousAttempt(cur);
  if (!prev) return h('section', { class: 'panel' }, [h('h2', {}, '🔁 Compare attempts'), h('p', { class: 'muted' }, 'This is your first finished attempt at this mission. Play it again to compare!')]);
  // [label, previous, now, format, deltaFormat, lowerIsBetter]
  const n = (v) => num(v);
  const p = (v) => (v == null ? '—' : pct(v));
  const dn = (d) => signed(Math.round(d), num);
  const dp = (d) => `${d > 0 ? '+' : '−'}${num(Math.abs(d * 100))} pts`;
  const dm = (d) => signed(d, money);
  const rows = [
    ['Total score', prev.total, cur.total, n, dn, false],
    ...Object.keys(cur.parts).map((k) => [`· ${k[0].toUpperCase()}${k.slice(1)}`, prev.parts[k] ?? 0, cur.parts[k], n, dn, false]),
    ['Money spent', prev.summary.spent, cur.summary.spent, money, dm, true],
    ['Rocket fullness', prev.summary.massPct, cur.summary.massPct, p, dp, true],
    ['Power used', prev.summary.powerPct, cur.summary.powerPct, p, dp, true],
    ['Data lost', prev.summary.dataLost, cur.summary.dataLost, p, dp, true],
    ['Mission KPIs met', prev.summary.kpiShare ?? 0, cur.summary.kpiShare, p, dp, false],
  ];
  return h('section', { class: 'panel' }, [
    h('h2', {}, '🔁 Compare attempts'),
    h('p', { class: 'muted small' }, `Previous: grade ${prev.grade} (${new Date(prev.at).toLocaleString()}) → now: grade ${cur.grade}.`),
    h('table', { class: 'summary-table compare' }, [
      h('thead', {}, h('tr', {}, [h('th', {}, ''), h('th', {}, 'Previous'), h('th', {}, 'Now'), h('th', {}, 'Change')])),
      h('tbody', {}, rows.map(([label, a, b, fmt, dfmt, lower]) => {
        const d = (b ?? 0) - (a ?? 0);
        const better = Math.abs(d) < 1e-6 ? null : lower ? d < 0 : d > 0;
        return h('tr', {}, [h('th', {}, label), h('td', {}, fmt(a)), h('td', {}, fmt(b)),
          h('td', { class: better == null ? 'muted' : better ? 'ok-text' : 'error-text' }, better == null ? '=' : dfmt(d))]);
      })),
    ]),
  ]);
}

function actions(state, dispatch) {
  const share = () => {
    shareUrl = `${location.origin}${location.pathname}#${encodeDesign(state)}`;
    try { navigator.clipboard?.writeText(shareUrl); } catch { /* clipboard may be blocked */ }
    rerender();
  };
  return h('div', { class: 'results-actions no-print' }, [
    h('button', { class: 'btn', type: 'button', key: 'print', onClick: () => window.print() }, '🖨️ Print / Save as PDF'),
    h('button', { class: 'btn', type: 'button', key: 'share', onClick: share }, '🔗 Share design'),
    h('button', { class: 'btn', type: 'button', key: 'improve', onClick: () => dispatch(goToScreen('finalCheck')) }, '🛠️ Improve this design'),
    h('button', { class: 'btn btn-primary', type: 'button', key: 'new', onClick: () => { shareUrl = null; dispatch(newMission()); } }, '🚀 New mission'),
    shareUrl && h('div', { class: 'share-box' }, [
      h('label', { class: 'small muted', for: 'share-url' }, 'Link copied (or copy it here) — opening it loads this design:'),
      h('input', { class: 'input', id: 'share-url', readonly: true, value: shareUrl, onFocus: (e) => e.target.select() }),
    ]),
  ]);
}

export function render(container, state, dispatch) {
  const score = state.score;
  const sim = state.simulation;
  if (!score || !sim?.complete) {
    mount(container, h('p', { class: 'muted' }, 'No results yet — finish a mission first.'));
    return;
  }
  const d = describeOutcome(state, sim);
  mount(container,
    h('div', { class: 'print-only print-title' }, `Mission report — ${getScenario(state.scenarioId).name} — ${teamNameOf(state)} — ${new Date().toLocaleDateString()}`),
    header(state, score, d),
    score.noGo && h('p', { class: 'step-hint' }, '⛔ This design was NO-GO. It was only simulated to show what physics would do — recorded as a failed mission. Real missions never launch with a failed hard gate.'),
    breakdown(score),
    wellHurt(score),
    score.tips.length > 0 && h('section', { class: 'panel tips' }, [h('h2', {}, '💡 Try this next time'), h('ol', {}, score.tips.map((t) => h('li', {}, t)))]),
    d.tip && !score.success && h('p', { class: 'step-hint' }, ['🧑‍🚀 Flight Director: ', d.tip]),
    badgesPanel(state, score, sim),
    objectivesPanel(score, state),
    lessonCard(state),
    eventsPanel(sim, state),
    renderGallery(state),
    realMissions(state),
    alternativesCard(state),
    compare(state),
    actions(state, dispatch),
  );
}
