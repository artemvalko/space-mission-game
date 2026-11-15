// Step 11 — Results (debrief): grade + score breakdown bars, what went well / what hurt,
// "Try this next time", objectives, personal goals, event log with decisions, real mission
// matches, image gallery, compare with the previous attempt, print / share.

import { LOST_JUNK, LOST_TUG } from '../../engine/scoring.js';
import { icon } from '../icons.js';
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
      h('div', { class: 'results-total' }, `${num(score.total)} / 1000`),
      h('p', { class: 'results-caption' }, d.caption),
    ]),
  ]);
}

function breakdown(score) {
  return h('section', { class: 'panel' }, [
    h('div', { class: 'score-bars' }, score.parts.map((p) => h('div', { class: 'score-bar', title: `${p.why}${p.bonus ? '' : ` (weight ${Math.round(p.weight * 100)}%)`}` }, [
      h('div', { class: 'score-bar-head' }, [h('span', {}, p.bonus ? `Sustainability (best for your orbit: ${p.best}/40)` : p.label), h('strong', { class: 'num' }, `${p.points}/${p.max}`)]),
      h('div', { class: 'gauge-bar' }, h('div', { class: ['gauge-fill', p.score >= 0.8 ? 'fill-ok' : p.score >= 0.5 ? 'fill-tight' : 'fill-bad'], style: { width: `${p.score * 100}%` } })),
      p.retire === 'failed' && h('p', { class: 'small retire-failed' }, [icon('satellite', 14), ` ${LOST_JUNK}`]),
      p.retire === 'tug' && h('p', { class: 'small muted' }, [icon('magnet', 14), ` ${LOST_TUG}`]),
    ]))),
  ]);
}

function wellHurt(score) {
  const list = (items, cls) => (items.length ? h('ul', { class: `insights ${cls}` }, items.map((t) => h('li', {}, t))) : h('p', { class: 'muted' }, 'Nothing to report.'));
  return h('div', { class: 'results-grid' }, [
    h('section', { class: 'panel' }, [h('h2', {}, [icon('check', 18), ' Went well']), list(score.insights.good, 'good')]),
    h('section', { class: 'panel' }, [h('h2', {}, [icon('warning', 18), ' Hurt']), list(score.insights.bad, 'bad')]),
  ]);
}

function objectivesPanel(score, state) {
  return h('div', { class: 'results-grid' }, [
    h('section', { class: 'panel' }, [
      h('h2', {}, ['KPIs', h('span', { class: 'simulated-tag', title: 'Simulated mission output — not real data' }, 'simulated')]),
      h('ul', { class: 'checklist' }, score.objectives.map((o) => h('li', { class: o.met ? 'ok' : 'bad' }, [
        h('strong', {}, [icon(o.met ? 'check' : 'cross', 14), ' ', icon(o.icon, 14), ` ${o.label}${o.kpi ? ' (KPI)' : ''}`]), h('div', { class: 'muted small' }, o.why),
      ]))),
      state.scenarioId === 'mission_navigation_meo' && (() => {
        const c = constellationStatus(1);
        return h('div', { class: 'small' }, [h('strong', {}, [icon(score.stats.satelliteSuccess ? 'check' : 'cross', 14), ' satellite_success']), ' — your one satellite doing its own job. ',
          h('strong', {}, [icon('cross', 14), ' constellation_success']), ` — ${c.why} That is what the full constellation adds.`]);
      })(),
    ]),
    h('section', { class: 'panel' }, [
      h('h2', {}, state.mode === 'team' ? 'Personal goals' : 'Role goals'),
      h('ul', { class: 'checklist' }, score.personalGoals.map((g) => h('li', { class: g.met ? 'ok' : 'bad' }, [
        h('strong', {}, [icon(g.met ? 'check' : 'cross', 14), ' ', icon(g.icon, 14), ` ${g.name}`]), h('div', { class: 'small' }, g.text), h('div', { class: 'muted small' }, g.reason),
      ]))),
      state.mode === 'team' && h('p', { class: 'small muted' }, score.votes.unanimous ? 'Unanimous Go — teamwork bonus!' : `${score.votes.go} of ${score.votes.voters} voted Go.${Object.entries(state.voteReasons).map(([r, id]) => ` ${ROLES.find((x) => x.id === r)?.name}: "${getNoGoReason(id)?.text}".`).join('')}`),
    ]),
  ]);
}

function badgesPanel(state, score, sim) {
  const badges = earnedBadges(state, score, sim);
  const fresh = new Set(newBadges());
  return h('section', { class: 'panel' }, [
    h('h2', {}, `Badges ${badges.filter((b) => b.earned).length}/${badges.length}`),
    h('div', { class: 'badge-grid' }, badges.map((b) => h('div', { class: ['badge-card', b.earned ? 'earned' : 'locked', fresh.has(b.id) && 'new'], title: b.text }, [
      h('div', { class: 'badge-icon', 'aria-hidden': 'true' }, icon(b.icon, 24)),
      h('div', { class: 'badge-name' }, [b.name, fresh.has(b.id) && h('span', { class: 'badge-new' }, ' NEW!')]),
      h('div', { class: 'small muted' }, b.earned ? b.why : b.text),
    ]))),
  ]);
}

function eventsPanel(sim, state) {
  const log = eventLog(sim);
  const name = (id) => getComponent(id)?.plainName ?? getInstrument(id)?.plainName;
  return h('section', { class: 'panel' }, [
    h('h2', {}, ['Log', h('span', { class: 'simulated-tag', title: 'Simulated events — not real statistics' }, 'simulated')]),
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
    h('h2', {}, 'Vs the real thing'),
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
  const extra = sc.id === 'mission_weather_mw' ? checkClaim(state, 'hourly_cyclone_revisit') : null;
  // One highlighted line; the explanation (and the constellation animation) opens on click.
  return h('details', { class: 'panel lesson-card fold', onToggle: (e) => { if (box && e.target.open && !box.firstChild) constellationFix(box, {}); } }, [
    h('summary', { class: 'lesson-line' }, claim.title),
    h('p', {}, claim.text),
    h('p', { class: 'small' }, [h('strong', {}, `"${claim.id === 'global_3d_fix' ? 'One satellite gives everyone a 3D position' : claim.id === 'global_24_7' ? 'One satellite gives 24/7 worldwide service' : 'One short mission proves a climate trend'}" — `), check.why]),
    extra && h('p', { class: 'small' }, [h('strong', {}, '"Every tropical storm, every hour" — '), extra.why]),
    box,
  ]);
}

/**
 * Real NASA data (research §11.2) — kept SEPARATE from the simulated mission output and labelled real.
 * Static links only: the game never fetches or fakes data (an API key would be needed for live calls).
 */
function realDataCard(state, sim) {
  const items = [];
  if (state.scenarioId === 'mission_weather_mw') {
    items.push(h('li', {}, [h('strong', {}, 'NASA GPM IMERG — real precipitation estimates. '),
      'Your satellite\'s measurements above are simulated; a real mission compares its data with this reference. ',
      sourceLinks(['S23', 'S24'])]));
  }
  if (sim.events.some((e) => e.eventId === 'solar_flare')) {
    items.push(h('li', {}, [h('strong', {}, 'NASA DONKI — real space weather. '),
      'Your solar storm was a simulated event; real flares, CMEs and geomagnetic storms are catalogued here. ',
      sourceLinks(['S26'])]));
  }
  items.push(h('li', {}, [h('strong', {}, 'NASA EONET — real natural events (storms, fires…). '), sourceLinks(['S25'])]));
  return h('section', { class: 'panel' }, [
    h('h2', {}, ['NASA data', h('span', { class: 'real-tag', title: 'Real data — not from your satellite' }, 'real')]),
    h('ul', { class: 'small' }, items),
  ]);
}

/** Other correct architectures for the same goal (info only, sourced). */
function alternativesCard(state) {
  const alts = alternativeArchitectures(state);
  if (!alts.length) return null;
  return h('section', { class: 'panel' }, [
    h('h2', {}, 'Other correct designs'),
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
  if (!prev) return h('section', { class: 'panel' }, [h('h2', {}, 'Compare'), h('p', { class: 'muted' }, 'This is your first finished attempt at this mission. Play it again to compare!')]);
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
    h('h2', {}, 'Compare'),
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

/** "Your choices vs real missions": each chosen option that really flew, as a tiny chip. */
function heritageStrip(state) {
  const sel = getSelection(state);
  const picks = [
    ['Satellite', sel.components.structure], ...sel.instruments.map((i) => [i.plainName, i]), ['Pointing', sel.components.adcs],
    ['Orbit', sel.orbit], ['Rocket', sel.launcher], ['Ground', sel.ground],
  ].filter(([, it]) => it?.heritage);
  if (!picks.length) return null;
  return h('div', { class: 'variant-row', 'aria-label': 'Your choices vs real missions' }, [
    h('span', { class: 'muted' }, 'Like the real thing:'),
    ...picks.map(([what, it]) => h('span', { class: 'pill', title: `${it.plainName}: ${it.heritage} (real mission)` }, `${what} = ${it.heritage}`)),
  ]);
}

/** "Other valid builds you could try" for the chosen objective variant (all proven PASS by the self-test). */
function otherBuilds(state) {
  const sel = getSelection(state);
  const v = sel.variant;
  if (!v?.builds?.length) return null;
  return h('section', { class: 'panel' }, [
    h('h2', {}, `Other valid builds (${v.builds.length})`),
    h('p', { class: 'muted small' }, `Different real ways to reach "${v.label}" — each one passes every hard gate, with different mass, power, cost and coverage.`),
    h('ul', { class: 'small' }, v.builds.map((b) => h('li', {}, b.label))),
    sel.scenario.variants.length > 1 && h('p', { class: 'muted small' }, `Other goals for this mission: ${sel.scenario.variants.filter((x) => x.id !== v.id).map((x) => x.label).join(' · ')}.`),
  ]);
}

/** Collapse a results panel: its <h2> becomes the <summary> (progressive disclosure). */
function fold(el) {
  if (!el) return null;
  if (el.classList.contains('results-grid')) { [...el.children].forEach((c) => c.replaceWith(fold(c))); return el; }
  const h2 = el.querySelector('h2');
  const d = h('details', { class: `${el.className} fold` });
  d.append(h('summary', {}, h2 ? [...h2.childNodes] : 'More'));
  h2?.remove();
  d.append(...el.childNodes);
  return d;
}

/** Top 3 insights (problems first) in one list. */
function topInsights(score) {
  const items = [...score.insights.bad.map((t) => ['warning', t, 'bad']), ...score.insights.good.map((t) => ['check', t, 'good'])].slice(0, 3);
  return items.length ? h('ul', { class: 'insights insights-icons' }, items.map(([i, t, c]) => h('li', { class: `ins-${c}` }, [icon(i, 14), h('span', {}, t)]))) : null;
}

function actions(state, dispatch) {
  const share = () => {
    shareUrl = `${location.origin}${location.pathname}#${encodeDesign(state)}`;
    try { navigator.clipboard?.writeText(shareUrl); } catch { /* clipboard may be blocked */ }
    rerender();
  };
  return h('div', { class: 'results-actions no-print' }, [
    h('button', { class: 'btn', type: 'button', key: 'print', title: 'Print / Save as PDF', onClick: () => { document.querySelectorAll('.screen-results details').forEach((x) => { x.open = true; }); window.print(); } }, [icon('print', 14), ' Print']),
    h('button', { class: 'btn', type: 'button', key: 'share', title: 'Share design', onClick: share }, [icon('link', 14), ' Share']),
    h('button', { class: 'btn', type: 'button', key: 'improve', title: 'Improve this design', onClick: () => dispatch(goToScreen('finalCheck')) }, [icon('wrench', 14), ' Improve']),
    h('button', { class: 'btn btn-primary', type: 'button', key: 'new', onClick: () => { shareUrl = null; dispatch(newMission()); } }, 'New mission'),
    shareUrl && h('div', { class: 'share-box' }, [
      h('label', { class: 'small muted', for: 'share-url' }, 'Link copied:'),
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
    score.noGo && h('p', { class: 'step-hint', title: 'It was only simulated to show what physics would do. Real missions never launch with a failed hard gate.' }, 'NO-GO design: recorded as a failed mission.'),
    breakdown(score),
    topInsights(score),
    (score.tips[0] ?? (!score.success && d.tip)) && h('p', { class: 'step-hint' }, [icon('bulb', 14), ' ', score.tips[0] ?? d.tip]),
    heritageStrip(state),
    score.stats.budgetUncertain && h('p', { class: 'small muted', title: score.stats.unknownPrices.join(', ') }, `${score.stats.unknownPrices.length} price${score.stats.unknownPrices.length > 1 ? 's' : ''} not public: real engineers would request a quote (RFQ).`),
    lessonCard(state),
    // Everything else is one click away.
    fold(otherBuilds(state)),
    fold(objectivesPanel(score, state)),
    fold(badgesPanel(state, score, sim)),
    fold(wellHurt(score)),
    score.tips.length > 1 && fold(h('section', { class: 'panel tips' }, [h('h2', {}, 'More tips'), h('ol', {}, score.tips.map((t) => h('li', {}, t)))])),
    fold(eventsPanel(sim, state)),
    fold(renderGallery(state)),
    fold(realMissions(state)),
    fold(alternativesCard(state)),
    fold(realDataCard(state, sim)),
    fold(compare(state)),
    actions(state, dispatch),
  );
}
