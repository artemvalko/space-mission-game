// validateDesign(state) → [{ severity, resource, step, message, why }]  — PURE.
// Messages are plain English for a 12-year-old; `why` holds the detailed explanation.
// `step` is the screen id where the player can fix the problem.
//
// severity: 'todo'    = not chosen yet — NOT an error, shown as "to do" (blocks launch only)
//           'error'   = blocking: caused by a choice, the mission cannot launch
//           'warning' = will hurt the mission (red), but players may launch and learn
//           'caution' = close to a limit (amber)
//           'info'    = tips
// Rule: nothing that is merely unchosen is ever an error — a fresh mission shows zero red.

import { COMPONENT_CATEGORIES, CATEGORY_PLAIN, isCubeSat } from '../data/components.js';
import { TAG_INFO } from '../data/instruments.js';
import { incompatibleTagsOf } from '../data/scenarios.js';
import { computeResources, getSelection } from './resources.js';
import { kg, num, pct, money, months, watts, gbDay, years } from '../utils/format.js';

export const SEVERITY_ORDER = { error: 0, warning: 1, caution: 2, todo: 3, info: 4 };

// Which step chooses each part.
export const STEP_FOR_CATEGORY = {
  structure: 'size', power: 'power', battery: 'power', comms: 'comms',
  computer: 'brains', adcs: 'brains', propulsion: 'brains',
};

const plain = (item) => item?.plainName ?? item?.name ?? '';

export function validateDesign(state, resources = computeResources(state)) {
  const out = [];
  const add = (severity, resource, step, message, why = '') => out.push({ severity, resource, step, message, why });
  const sel = getSelection(state);
  const { orbit, launcher, ground, scenario, components, instruments } = sel;

  if (!scenario) {
    add('todo', 'design', 'pickMission', 'Pick a mission to begin.');
    return out;
  }

  // ── To do (in step order) — never errors
  if (!components.structure) add('todo', 'design', 'size', 'Choose how big your satellite is.');
  if (!instruments.length) add('todo', 'design', 'science', 'Choose the science tools for your goal.');
  if (!components.power || !components.battery) add('todo', 'design', 'power', 'Choose how your satellite gets power.');
  if (!components.comms || !ground) add('todo', 'design', 'comms', 'Choose how your satellite talks to Earth.');
  if (!components.computer || !components.adcs || !components.propulsion) add('todo', 'design', 'brains', 'Choose the computer, pointing system and thrusters.');
  if (!orbit) add('todo', 'design', 'orbit', 'Choose an orbit.');
  if (!launcher) add('todo', 'design', 'rocket', 'Choose a rocket.');

  const { mass, power, battery, data, budget, time, lifetime, science } = resources;

  // ── Blocking problems caused by choices
  if (orbit && !scenario.allowedOrbits.includes(orbit.id)) {
    add('error', 'orbit', 'orbit', `${scenario.name} can't use ${plain(orbit)}. Pick one of the orbits this mission allows.`,
      'The customer needs the spacecraft somewhere else to meet the mission objective.');
  }
  if (mass.status === 'blocked') {
    add('error', 'mass', 'rocket', `The ${plain(launcher)} can't reach ${plain(orbit)} at all. Pick a bigger rocket.`, mass.explanation);
  } else if (mass.status === 'over') {
    // Launchable on purpose: players may fail and learn — the rocket can't lift it and it falls back.
    add('warning', 'mass', 'rocket', `Your satellite is ${kg(mass.used - mass.available)} too heavy for this rocket — it would fall back to Earth. Pick a bigger rocket or lighter parts.`, mass.explanation);
  } else if (mass.status === 'caution') {
    add('caution', 'mass', 'rocket', `Your satellite only just fits on the rocket (${pct(mass.ratio)} full).`, mass.explanation);
  }
  if (!mass.payload.ok) {
    add('error', 'mass', 'size', `Your science tools weigh ${kg(mass.payload.used)}, but this frame only carries ${kg(mass.payload.available)}. Pick a bigger satellite or fewer tools.`,
      'The frame is not strong enough to carry this payload through the shaking of launch.');
  }
  if (orbit && ground && orbit.requiresDeepSpaceGround && !ground.deepSpace) {
    add('error', 'ground', 'comms', `${plain(ground)} can't hear a satellite that far away. You need the giant deep-space dishes.`, data.explanation);
  }
  if (isCubeSat(components.structure)) {
    for (const cat of COMPONENT_CATEGORIES) {
      const c = components[cat];
      if (c && cat !== 'structure' && !isCubeSat(c)) {
        add('error', 'design', STEP_FOR_CATEGORY[cat], `The ${plain(c)} is too big for a CubeSat. Pick the CubeSat version.`,
          `CubeSats are built from 10 cm cubes. A ${num(c.mass)} kg ${CATEGORY_PLAIN[cat].plainName.toLowerCase()} does not fit.`);
      }
    }
  }
  for (const ins of instruments) {
    const bad = incompatibleTagsOf(scenario, ins);
    if (bad.length) {
      add('error', 'science', 'science', `The ${plain(ins)} doesn't help this mission. Remove it.`, scenario.incompatibleWhy[bad[0]] ?? '');
    }
  }
  const prop = components.propulsion;
  if (orbit && prop && prop.deltaV < orbit.requiredDeltaV) {
    add('warning', 'mass', 'brains', `Your thrusters are too weak to reach ${plain(orbit)} — the satellite would get stuck too low. Pick stronger thrusters.`,
      `They give Δv ${num(prop.deltaV)} m/s, but this orbit needs ${num(orbit.requiredDeltaV)} m/s.`);
  }

  // ── Warnings: allowed, but the mission will suffer
  if (power.status === 'over') {
    add('warning', 'power', 'power', `Not enough power: your satellite uses ${watts(power.consumption)} but makes only ${watts(power.generation)}. Pick a bigger power source or fewer tools.`, power.explanation);
  } else if (power.status === 'caution') {
    add('caution', 'power', 'power', `Power is tight (${pct(power.ratio)} used).`, power.explanation);
  }
  if (battery.status === 'over') {
    add('warning', 'battery', 'power', "The battery runs flat in the planet's shadow. Pick a bigger battery.", battery.explanation);
  }
  if (budget.status === 'over') {
    add('warning', 'budget', mostExpensiveStep(sel), `You're ${money(budget.used - budget.available)} over budget. Swap expensive parts for cheaper ones.`, budget.explanation);
  } else if (budget.status === 'caution') {
    add('caution', 'budget', mostExpensiveStep(sel), `Money is tight (${pct(budget.ratio)} of the budget spent).`, budget.explanation);
  }
  if (time.status === 'over') {
    add('warning', 'time', slowestStep(sel, time.slowestId), `Building this takes ${months(time.used)}, but you only have ${months(time.available)}. Pick parts that are quicker to build.`, time.explanation);
  }
  if (data.status === 'over') {
    add('warning', 'data', 'comms', `${pct(data.lostFraction)} of your data never reaches Earth: you collect ${gbDay(data.generated)} but can send only ${gbDay(data.downlink)}. Pick a faster radio or more antennas.`, data.explanation);
  } else if (data.status === 'caution') {
    add('caution', 'data', 'comms', `The radio link is almost full (${pct(data.ratio)}).`, data.explanation);
  }
  if (data.deepSpaceProblem) {
    add('warning', 'data', 'comms', 'Your radio is too weak for deep space. Pick the big dish antenna.', 'Far from Earth the signal is extremely weak.');
  }
  if (orbit && !lifetime.ok) {
    add('warning', 'lifetime', 'brains', `Your satellite would last ${years(lifetime.value)}, but the mission needs ${years(lifetime.required)}. Stronger thrusters keep it in orbit longer.`, lifetime.explanation);
  }
  if (instruments.length) {
    for (const tag of scenario.requiredTags) {
      if (!instruments.some((i) => i.tags.includes(tag))) {
        add('warning', 'science', 'science', `Your goal needs a ${TAG_INFO[tag]?.plainName.toLowerCase() ?? tag}. Add one.`, `The objective of ${scenario.name} cannot be met without it.`);
      }
    }
    if (!science.ok) {
      add('warning', 'science', 'science', `Not enough science yet: ${num(science.value)} of ${num(science.required)} points. Add tools that suit your orbit, or steadier pointing.`, science.explanation);
    }
  }

  // ── Tips
  if (orbit && scenario.recommendedOrbits.length && !scenario.recommendedOrbits.includes(orbit.id)) {
    add('info', 'orbit', 'orbit', 'This is not the recommended orbit for this mission.', 'It may still work — check science and lifetime carefully.');
  }
  if (orbit && components.power?.type === 'solar' && orbit.solarIntensity < 0.6) {
    add('info', 'power', 'power', 'Sunlight is weak here — big solar wings or a nuclear battery help.', `Only ${pct(orbit.solarIntensity)} of Earth's sunlight reaches this place.`);
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

function mostExpensiveStep(sel) {
  const items = [
    ...Object.entries(sel.components).filter(([, c]) => c).map(([cat, c]) => ({ cost: c.cost, step: STEP_FOR_CATEGORY[cat] })),
    ...sel.instruments.map((i) => ({ cost: i.cost, step: 'science' })),
    ...(sel.launcher ? [{ cost: sel.launcher.cost, step: 'rocket' }] : []),
  ];
  return items.sort((a, b) => b.cost - a.cost)[0]?.step ?? 'size';
}

function slowestStep(sel, slowestId) {
  if (sel.instruments.some((i) => i.id === slowestId)) return 'science';
  const entry = Object.entries(sel.components).find(([, c]) => c?.id === slowestId);
  return entry ? STEP_FOR_CATEGORY[entry[0]] : 'size';
}

/** Problems caused by choices (errors only). */
export const hasBlockingErrors = (issues) => issues.some((i) => i.severity === 'error');
/** Launch needs every choice made and no blocking problem. */
export const canLaunch = (issues) => !issues.some((i) => i.severity === 'error' || i.severity === 'todo');
