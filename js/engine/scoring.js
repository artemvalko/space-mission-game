// scoreMission(state, sim) → full mission score — PURE.
//
// Weights: Science 35%, Objectives met 25%, Resource efficiency 15%, Survivability 15%,
// Teamwork 10% (solo: the teamwork weight is shared out over the other four, proportionally).
// Total 0–1000, grade S/A/B/C/D/F.
//
// Returns { total, grade, success, outcome, parts[], objectives[], personalGoals[], votes,
//           insights: { good[], bad[] }, tips[], stats }

import { computeResources, getSelection } from './resources.js';
import { evaluateObjectives } from './objectives.js';
import { evaluateRoleGoals, voteStatus } from './roleGoals.js';
import { getEvent } from '../data/events.js';
import { money, num, pct, gbDay, kg, watts } from '../utils/format.js';

export const WEIGHTS = { science: 0.35, objectives: 0.25, efficiency: 0.15, survivability: 0.15, teamwork: 0.10 };
export const GRADES = [['S', 900], ['A', 800], ['B', 650], ['C', 500], ['D', 350], ['F', 0]];
export const SCIENCE_FULL_MARKS = 1.5; // collecting 1.5× the needed science = full science score

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** Weights for this mode (solo redistributes teamwork). Always sums to 1. */
export function weightsFor(mode) {
  if (mode === 'team') return { ...WEIGHTS };
  const rest = 1 - WEIGHTS.teamwork;
  const out = {};
  for (const [k, w] of Object.entries(WEIGHTS)) out[k] = k === 'teamwork' ? 0 : w / rest;
  return out;
}

/**
 * How good is a margin? 10–30% is best (1), ~0% is risky (0.3), over the limit is 0,
 * more than 50% spare is wasteful (0.5).
 */
export function marginQuality(m) {
  if (m == null || Number.isNaN(m)) return 0.5;
  if (m < 0) return 0;
  if (m < 0.1) return 0.3 + 7 * m;
  if (m <= 0.3) return 1;
  if (m <= 0.5) return 1 - (m - 0.3) * 2.5;
  return 0.5;
}

export function gradeFor(total, outcome) {
  const g = GRADES.find(([, min]) => total >= min)[0];
  return g === 'S' && outcome !== 'success' ? 'A' : g; // S only for a full success
}

export function scoreMission(state, sim) {
  const res = computeResources(state);
  const sel = getSelection(state);
  const { scenario } = sel;
  const s = sim.summary;
  const weights = weightsFor(state.mode);
  const objectives = evaluateObjectives(state, sim, res);
  const personalGoals = evaluateRoleGoals(state, sim);
  const votes = voteStatus(state);
  const flew = sim.reachedOrbit;

  // ── Science
  const need = scenario.minScience > 0 ? scenario.minScience * scenario.minLifetimeYears : 0;
  const sciRatio = need ? s.scienceCollected / need : (s.scienceCollected > 0 ? SCIENCE_FULL_MARKS : 0);
  const science = flew ? clamp01(sciRatio / SCIENCE_FULL_MARKS) : 0;

  // ── Objectives
  const objMet = objectives.filter((o) => o.met).length;
  const objectivesScore = objectives.length ? objMet / objectives.length : 1;

  // ── Efficiency: budget left + mass margin + power margin
  const spent = res.budget.used + s.extraCostM;
  const budgetLeft = scenario.sandbox ? 0.2 : (scenario.budgetM - spent) / scenario.budgetM;
  const massMargin = res.mass.available ? 1 - res.mass.used / res.mass.available : -1;
  const powerMargin = res.power.available ? 1 - res.power.used / res.power.available : -1;
  const efficiency = (marginQuality(budgetLeft) + marginQuality(massMargin) + marginQuality(powerMargin)) / 3;

  // ── Survivability: how long it lasted, how healthy it stayed, not lost, no relaunches
  const lasted = flew ? clamp01(s.monthsOperated / Math.max(1, s.plannedMonths)) : 0;
  const healthQ = clamp01((s.finalHealth - 0.85) / (0.99 - 0.85));
  const survivability = flew
    ? clamp01(lasted * 0.5 + healthQ * 0.3 + (sim.outcome === 'lost' ? 0 : 0.2) - 0.1 * s.relaunches)
    : 0;

  // ── Teamwork: personal goals + unanimous Go
  const goalsMet = personalGoals.filter((g) => g.met).length;
  const teamwork = state.mode === 'team'
    ? clamp01(0.8 * (goalsMet / Math.max(1, personalGoals.length)) + (votes.unanimous ? 0.2 : 0))
    : 0;

  const raw = { science, objectives: objectivesScore, efficiency, survivability, teamwork };
  const WHY = {
    science: flew ? `${num(s.scienceCollected)} of ${num(need)} science points needed (${num(sciRatio * 100)}%). Full marks at 150%.` : 'The satellite never reached its orbit, so no science.',
    objectives: `${objMet} of ${objectives.length} mission objectives met.`,
    efficiency: `Budget left ${pct(budgetLeft)}, weight margin ${pct(Math.max(massMargin, -1))}, power margin ${pct(Math.max(powerMargin, -1))}. Best: 10–30% spare.`,
    survivability: flew ? `Worked ${num(lasted * 100)}% of the planned time; toughness ended at ${pct(s.finalHealth)}${sim.outcome === 'lost' ? '; the satellite was lost' : ''}${s.relaunches ? `; ${s.relaunches} relaunch` : ''}.` : 'It never reached orbit.',
    teamwork: state.mode === 'team' ? `${goalsMet} of ${personalGoals.length} personal goals met${votes.unanimous ? ' + unanimous Go bonus' : ''}.` : 'Solo game — this weight is shared by the other parts.',
  };
  const LABEL = { science: 'Science', objectives: 'Objectives met', efficiency: 'Resource efficiency', survivability: 'Survivability', teamwork: 'Teamwork' };
  const parts = Object.keys(WEIGHTS).map((id) => ({
    id, label: LABEL[id], weight: weights[id], score: raw[id],
    max: Math.round(weights[id] * 1000), points: Math.round(raw[id] * weights[id] * 1000), why: WHY[id],
  })).filter((p) => p.weight > 0);
  const total = Math.max(0, Math.min(1000, parts.reduce((a, p) => a + p.points, 0)));

  const stats = { spent, budgetLeft, massMargin, powerMargin, sciRatio, lostFraction: res.data.lostFraction ?? 0 };
  return {
    total,
    grade: gradeFor(total, sim.outcome),
    success: sim.outcome === 'success',
    outcome: sim.outcome,
    parts,
    objectives,
    personalGoals,
    votes,
    insights: insights(sim, res, sel, stats),
    tips: tips(parts, objectives, res, stats),
    stats,
  };
}

/** "What went well" / "What hurt your mission": short sentences with numbers. */
function insights(sim, res, sel, st) {
  const good = [];
  const bad = [];
  const s = sim.summary;
  const { scenario } = sel;
  if (res.data.generated > 0 && res.data.downlink != null) {
    if (st.lostFraction > 0) bad.push({ w: st.lostFraction, text: `${pct(st.lostFraction)} of data lost: you collect ${gbDay(res.data.generated)} but can send only ${gbDay(res.data.downlink)}.` });
    else good.push({ w: 0.5, text: `No data lost — the link sends ${gbDay(res.data.downlink)}, more than the ${gbDay(res.data.generated)} you collect.` });
  }
  if (!scenario.sandbox) {
    if (st.budgetLeft < 0) bad.push({ w: 1, text: `Over budget by ${money(-st.budgetLeft * scenario.budgetM)} (spent ${money(st.spent)} of ${money(scenario.budgetM)}).` });
    else if (st.budgetLeft > 0.5) bad.push({ w: 0.3, text: `${pct(st.budgetLeft)} of the budget was never used — that money could have bought more science.` });
    else good.push({ w: 0.4, text: `Spent ${money(st.spent)} of ${money(scenario.budgetM)} — ${money(scenario.budgetM - st.spent)} to spare.` });
  }
  if (res.power.available != null) {
    if (st.powerMargin < 0) bad.push({ w: 0.9, text: `Power deficit: the satellite used ${watts(res.power.used)} but made only ${watts(res.power.available)}.` });
    else if (st.powerMargin < 0.1) bad.push({ w: 0.3, text: `Only ${pct(st.powerMargin)} power to spare — one bad day and it's in safe mode.` });
    else good.push({ w: 0.3, text: `Power margin ${pct(st.powerMargin)}: enough spare electricity.` });
  }
  if (res.mass.available != null) {
    if (st.massMargin < 0) bad.push({ w: 1, text: `The satellite was ${kg(res.mass.used - res.mass.available)} too heavy for the rocket.` });
    else if (st.massMargin > 0.6) bad.push({ w: 0.2, text: `The rocket was only ${pct(1 - st.massMargin)} full — a smaller, cheaper rocket would have done.` });
    else good.push({ w: 0.25, text: `The rocket was ${pct(1 - st.massMargin)} full — a good fit.` });
  }
  if (sim.reachedOrbit) {
    if (st.sciRatio >= 1) good.push({ w: 0.8, text: `Science: ${num(s.scienceCollected)} points — ${num(st.sciRatio, 1)}× what the mission needed.` });
    else bad.push({ w: 0.9, text: `Science: ${num(s.scienceCollected)} points — only ${pct(st.sciRatio)} of what the mission needed.` });
    if (s.hardwareFailures > 0) bad.push({ w: 0.2 * s.hardwareFailures, text: `${s.hardwareFailures} hardware failure${s.hardwareFailures > 1 ? 's' : ''} — toughness ended at ${pct(s.finalHealth)}.` });
    else if (s.eventsSurvived) good.push({ w: 0.3, text: `Survived ${s.eventsSurvived} space event${s.eventsSurvived > 1 ? 's' : ''} without a hardware failure.` });
  }
  return {
    good: good.sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.text),
    bad: bad.sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.text),
  };
}

/** 2–3 concrete suggestions from the biggest losses. */
function tips(parts, objectives, res, st) {
  const out = [];
  const byLoss = [...parts].sort((a, b) => (b.max - b.points) - (a.max - a.points));
  for (const p of byLoss) {
    if (out.length >= 3 || p.points >= p.max * 0.9) continue;
    if (p.id === 'science') {
      out.push(st.lostFraction > 0.1
        ? 'Send more data home: a faster radio, or antennas around the world for more contact per day.'
        : 'Add a science tool that suits your orbit (×1.3 science) or upgrade to steadier pointing.');
    } else if (p.id === 'objectives') {
      const miss = objectives.find((o) => !o.met);
      if (miss?.id === 'budget') out.push('Stay on budget: swap advanced parts for basic ones, or use a smaller rocket.');
      else if (miss?.id === 'deadline') out.push('Be ready on time: basic parts are quicker to build than advanced ones.');
      else if (miss?.id === 'lifetime') out.push('Last longer: stronger thrusters keep the satellite in orbit, and fix failures instead of ignoring them.');
      else if (miss) out.push(`Meet "${miss.label}": ${miss.why}`);
    } else if (p.id === 'efficiency') {
      if (st.massMargin > 0.6) out.push(`Try a smaller rocket: yours was only ${pct(1 - st.massMargin)} full.`);
      else if (st.powerMargin < 0.1) out.push('Leave 10–30% spare power: bigger solar wings or fewer power-hungry tools.');
      else if (st.budgetLeft < 0.1) out.push('Keep 10–30% of the budget spare for surprises.');
      else out.push('Aim for 10–30% spare money, weight and power — not too tight, not wasteful.');
    } else if (p.id === 'survivability') {
      out.push(res.health.value < 0.97 ? 'Choose more reliable parts (basic, flight-proven) to avoid breakdowns.' : 'Pick a more reliable rocket, and answer hardware failures instead of ignoring them.');
    } else if (p.id === 'teamwork') {
      out.push('Check every role\'s personal goal on the Final check before you vote Go.');
    }
  }
  // Not enough yet? Add tips from the clearest measured problems (biggest first).
  const extra = [
    [st.powerMargin < 0, 'Fix the power deficit: bigger solar wings, a bigger power pack, or fewer power-hungry tools.'],
    [st.lostFraction > 0.1, `You lost ${pct(st.lostFraction)} of your data: pick a faster radio or antennas around the world.`],
    [st.budgetLeft < 0.05, 'Keep 10–30% of the budget spare for surprises.'],
    [st.massMargin > 0.6, `Try a smaller rocket: yours was only ${pct(1 - st.massMargin)} full.`],
    [res.health.value < 0.97, 'Choose more reliable (basic, flight-proven) parts to avoid breakdowns.'],
  ];
  for (const [when, text] of extra) if (out.length < 2 && when && !out.some((t) => t.split(':')[0] === text.split(':')[0])) out.push(text);
  return [...new Set(out)].slice(0, 3);
}

/** Event log entries with the decision and its consequences (for the Results screen). */
export function eventLog(sim) {
  return sim.events.map((e) => {
    const ev = getEvent(e.eventId);
    const c = ev.choices[e.choiceIndex];
    return { month: e.month, eventId: e.eventId, title: ev.title, choice: c.label, explanation: c.explanation, effects: c.effects, itemId: e.itemId ?? null };
  });
}
