// validateDesign(state) → [{ severity, resource, step, message, why, gate, fix, alternative }] — PURE.
// Hard gates BEFORE any score (research §8.5). Every failed gate says
//   (a) which physical requirement is broken (`why`), (b) which card fixes it (`fix`),
//   (c) whether another correct architecture exists (`alternative`, or null)        — research §10 UI test.
//
// severity: 'todo'    = not chosen yet — NOT an error (a fresh mission shows zero red); blocks launch
//           'error'   = a failed hard gate → NO-GO (the launch button is locked; "Simulate what would happen" stays)
//           'warning' = launchable, but an objective will be missed (e.g. over the model budget)
//           'caution' = close to a limit
//           'info'    = tips

import { CATEGORY_PLAIN, isCubeSat } from '../data/components.js';
import { ROLE_INFO } from '../data/instruments.js';
import { payloadWhyNot } from '../data/scenarios.js';
import { GROUND_WHY_NOT } from '../data/groundStations.js';
import { computeResources, getSelection } from './resources.js';
import { kg, num, pct, money, watts } from '../utils/format.js';

export const SEVERITY_ORDER = { error: 0, warning: 1, caution: 2, todo: 3, info: 4 };

// Which step chooses each part.
export const STEP_FOR_CATEGORY = {
  structure: 'size', power: 'power', battery: 'power', comms: 'comms', downlink: 'comms',
  computer: 'brains', adcs: 'brains', thermal: 'brains', sensors: 'brains', harness: 'brains', propulsion: 'brains', propellant: 'brains',
};

// The hard gates of research §8.5 (ids used by tests and the Final check list).
export const GATES = [
  { id: 'orbit_service_compatible', label: 'Orbit fits the service' },
  { id: 'spacecraft_size_mass_volume_compatible', label: 'Size, mass and volume' },
  { id: 'mandatory_payload_complete', label: 'Mission payload complete' },
  { id: 'bus_support_complete', label: 'Bus complete (control radio, power, battery, computer, pointing, thermal)' },
  { id: 'launcher_trajectory_compatible', label: 'Rocket reaches the real target orbit' },
  { id: 'launch_adapter_compatible', label: 'Dispenser / adapter compatible' },
  { id: 'ground_network_compatible', label: 'Ground network fits the mission' },
  { id: 'power_peak_and_average_pass', label: 'Power: average and peak' },
  { id: 'battery_eclipse_pass', label: 'Battery lasts the eclipse' },
  { id: 'communications_link_pass', label: 'Communications link works' },
  { id: 'legal_safety_disposal_plan_pass', label: 'Tests, licence and disposal plan' },
];

const plain = (item) => item?.plainName ?? item?.name ?? '';
const SIZE_NAME = { '6u': 'a 6U CubeSat', large: 'a ~700 kg Galileo-class bus' };

export function validateDesign(state, resources = computeResources(state)) {
  const out = [];
  const add = (severity, gate, resource, step, message, why = '', fix = '', alternative = null) =>
    out.push({ severity, gate, resource, step, message, why, fix, alternative });
  const sel = getSelection(state);
  const { orbit, launcher, deployer, ground, scenario, components, instruments, left, prep } = sel;

  if (!scenario) {
    add('todo', null, 'design', 'pickMission', 'Pick a mission to begin.');
    return out;
  }
  const { mass, power, battery, data, budget } = resources;
  const structure = components.structure;
  const roles = new Set(instruments.map((i) => i.role));

  // ── To do (in step order) — never errors
  if (!structure) add('todo', 'spacecraft_size_mass_volume_compatible', 'design', 'size', 'Choose how big your satellite is.');
  if (!instruments.length) add('todo', 'mandatory_payload_complete', 'design', 'science', 'Choose the mission payload.');
  const unchosen = (cats) => cats.filter((c) => !components[c] && !left.has(c));
  if (unchosen(['power', 'battery']).length) add('todo', 'power_peak_and_average_pass', 'design', 'power', 'Choose how your satellite gets power.');
  if (unchosen(scenario.requiredBus.filter((c) => STEP_FOR_CATEGORY[c] === 'comms')).length || !ground) add('todo', 'communications_link_pass', 'design', 'comms', 'Choose the control radio, mission downlink and ground segment.');
  const busTodo = unchosen(scenario.requiredBus.filter((c) => STEP_FOR_CATEGORY[c] === 'brains'));
  if (busTodo.length) add('todo', 'bus_support_complete', 'design', 'brains', `Choose the bus systems: ${busTodo.map((c) => CATEGORY_PLAIN[c].plainName.toLowerCase()).join(', ')}.`);
  if (!orbit) add('todo', 'orbit_service_compatible', 'design', 'orbit', 'Choose an orbit.');
  if (!launcher || !deployer) add('todo', 'launcher_trajectory_compatible', 'design', 'rocket', 'Choose a launch service and a dispenser/adapter.');
  const prepMissing = [['tests', 'vibration, thermal-vacuum and EMC tests'], ['licence', 'frequency licence / ITU coordination'], ['disposal', 'debris-mitigation / disposal plan']].filter(([k]) => !prep[k]);
  if (prepMissing.length) {
    add('todo', 'legal_safety_disposal_plan_pass', 'legal', 'launchPrep', `NO-GO until the launch-prep checklist is done: ${prepMissing.map(([, t]) => t).join(', ')}.`,
      'Real launches need tested hardware, licensed frequencies and a safe end-of-life plan.', 'Tick the items on the Launch prep step.');
  }

  // ── Gate: orbit fits the service
  if (orbit && !scenario.allowedOrbits.includes(orbit.id)) {
    const alt = scenario.id === 'mission_navigation_meo' && orbit.id === 'leo_550'
      ? 'A LEO navigation DEMO is a real, different mission: ESA Celeste (12U, 20 kg, LEO 500–600 km) — it tests the signal, not worldwide positioning.'
      : scenario.id === 'mission_comms_iot' && orbit.id === 'geo' ? 'A heavy GEO telecom satellite is a different, valid concept — but not this 6U build.'
        : scenario.id === 'mission_weather_mw' && orbit.id === 'geo' ? 'NOAA GOES-R in GEO is a valid but much bigger weather architecture (16-channel imager).' : null;
    add('error', 'orbit_service_compatible', 'orbit', 'orbit', `${plain(orbit)} does not fit this mission. ${scenario.orbitWhy[orbit.id] ?? ''}`.trim(),
      'The orbit must match what the service needs (coverage, altitude, signal geometry).', `Pick ${scenario.recommendedOrbits.map((id) => id === 'leo_550' ? 'Low orbit (~550 km)' : id === 'sso_550_650' ? 'Sun-synchronous orbit' : 'Navigation orbit (MEO)').join(' or ')}.`, alt);
  } else if (orbit && !scenario.recommendedOrbits.includes(orbit.id)) {
    add('info', 'orbit_service_compatible', 'orbit', 'orbit', `${plain(orbit)} can work, but it is not the recommended orbit.`, scenario.orbitWhy[orbit.id] ?? '');
  }

  // ── Gate: size, mass, volume
  if (structure) {
    const cube = isCubeSat(structure);
    const wantCube = scenario.size !== 'large';
    if (cube !== wantCube) {
      add('error', 'spacecraft_size_mass_volume_compatible', 'mass', 'size', wantCube
        ? `A ~700 kg bus is overkill for this mission — the research build is ${SIZE_NAME[scenario.size]}.`
        : 'A Galileo-class navigation node is a ~700 kg satellite. A CubeSat (max 24 kg) cannot carry four atomic clocks and an L-band payload.',
      wantCube ? 'Bigger is not better: mass, launch and money all grow for nothing.' : 'The navigation payload alone is ~178 kg in our build.',
      `Pick ${SIZE_NAME[scenario.size]} on the Size step.`, wantCube ? null : 'A small-satellite navigation DEMO exists (ESA Celeste, 12U) — but it is a different mission.');
    } else if (cube && structure.units !== 6 && scenario.size === '6u') {
      add('error', 'spacecraft_size_mass_volume_compatible', 'mass', 'size', structure.units < 6
        ? `${plain(structure)} is too small: max ${kg(structure.maxMassKg)} and ${structure.units} units of room.`
        : `${plain(structure)} would be valid, but our research only models a 6U build — its frame mass and price are not in our data.`,
      structure.units < 6 ? 'The mission build needs more mass and volume than a 3U allows (CubeSat spec, S01).' : 'Real data only: we never invent a frame mass or price.',
      'Pick CubeSat 6U.', structure.units < 6 && scenario.id === 'mission_weather_mw' ? 'NASA TROPICS uses 3U CubeSats — with a different, smaller radiometer and a constellation.' : null);
    }
    if (mass.misfits.length) {
      add('error', 'spacecraft_size_mass_volume_compatible', 'mass', 'science', `Some parts do not fit this frame size: ${mass.misfits.length} part(s) are built for a ${cube ? 'large satellite' : 'CubeSat'}.`,
        'CubeSat parts and large-satellite parts are not interchangeable.', 'Use the parts made for your frame size.');
    }
    if (!mass.volume.ok) {
      add('error', 'spacecraft_size_mass_volume_compatible', 'mass', 'size', `The payload needs ${mass.volume.used}U but the ${plain(structure)} has only ${mass.volume.available}U — it will not fit.`,
        'A 4U radiometer cannot fit in a 3U body (TEMPEST-D used 4U inside a 6U, S07).', 'Pick CubeSat 6U.', scenario.id === 'mission_weather_mw' ? 'NASA TROPICS fits a different 3U radiometer — with a constellation.' : null);
    }
  }
  if (mass.status === 'over' && mass.available != null) {
    const byDispenser = mass.available === mass.limit && isCubeSat(structure);
    add('error', 'spacecraft_size_mass_volume_compatible', 'mass', byDispenser ? 'science' : 'rocket',
      byDispenser ? `Too heavy for the ${plain(structure).replace(' frame', '')} dispenser: ${kg(mass.used)} checked vs ${kg(mass.available)} limit.`
        : `Too heavy: ${kg(mass.used)} vs ${kg(mass.available)} the ${plain(launcher)} can lift to this orbit.`,
      byDispenser ? 'Mass over the dispenser limit is a mechanical and safety incompatibility (S01).' : 'A rocket\'s capacity is a hard physical limit.',
      byDispenser ? 'Remove parts that are not needed.' : 'Pick a launch service that can lift it to this orbit.');
  } else if (mass.status === 'caution') {
    add('caution', 'spacecraft_size_mass_volume_compatible', 'mass', 'rocket', `Mass is close to the limit (${pct(mass.ratio)}).`, mass.explanation);
  }
  if (mass.unknown.length) {
    add('info', null, 'mass', 'science', 'Some chosen items have no mass or price in our research data — they are counted as 0.', 'Real data only.');
  }

  // ── Gate: mandatory payload + no useless payload
  if (instruments.length) {
    for (const ins of instruments) {
      const why = payloadWhyNot(scenario, ins);
      if (why) add('error', 'mandatory_payload_complete', 'science', 'science', `The ${plain(ins).toLowerCase()} does not serve this mission. ${why}`,
        'A bigger or extra instrument cannot replace the one the mission physically needs.', `Remove the ${plain(ins).toLowerCase()}.`);
    }
    for (const role of scenario.requiredRoles) {
      if (!roles.has(role)) {
        const info = ROLE_INFO[role];
        const msg = role === 'atomic_clocks' ? 'For a Galileo node you need precise on-board time: which part provides it?'
          : role === 'iot_transceiver' ? 'You can command the satellite, but it does not receive users\' messages yet.'
            : role === 'calibration' ? 'Without calibration the radiometer\'s temperatures cannot be trusted.'
              : `The mission needs the ${info.plainName.toLowerCase()}.`;
        add('error', 'mandatory_payload_complete', 'science', 'science', msg,
          role === 'atomic_clocks' ? 'No precise reference time → no navigation signal (applies to this MEO Galileo-class build).' : role === 'iot_transceiver' ? 'TT&C is not the commercial service payload.' : 'This part does the mission itself.',
          `Add the ${info.plainName.toLowerCase()} on the Mission payload step.`,
          role === 'atomic_clocks' ? 'ESA Celeste tests precise time WITHOUT atomic clocks — but as a LEO demo, not a Galileo node.' : null);
      }
    }
  }

  // ── Gate: bus complete
  for (const cat of scenario.requiredBus) {
    if (left.has(cat)) {
      const info = CATEGORY_PLAIN[cat];
      add('error', cat === 'battery' ? 'battery_eclipse_pass' : 'bus_support_complete', cat === 'battery' ? 'battery' : 'design', STEP_FOR_CATEGORY[cat],
        `${info.noneText ?? `No ${info.plainName.toLowerCase()}`}: ${info.noneWhy ?? 'the satellite cannot work without it.'}`,
        `${info.realTerm}: ${info.whatFor}`, `Add a ${info.plainName.toLowerCase()}.`);
    }
  }

  // ── Gate: launcher reaches the real target orbit
  if (launcher && orbit && mass.reaches === false) {
    const gto = launcher.deliversTo;
    const tooHeavyEvenLeo = launcher.capacityKg.leo_550 != null && mass.used > launcher.capacityKg.leo_550;
    add('error', 'launcher_trajectory_compatible', 'launch', 'rocket',
      gto ? `${plain(launcher)} drops you in ${gto} — not in ${plain(orbit)}.`
        : tooHeavyEvenLeo ? `${plain(launcher)} cannot lift ${kg(mass.used)} even to low orbit (~${kg(launcher.capacityKg.leo_550)} headline), and it cannot reach ${plain(orbit)}.`
          : `${plain(launcher)} does not deliver to ${plain(orbit)}.`,
      gto ? 'GTO is not MEO: without a transfer stage or apogee engine plus a calculated burn, the satellite stays in the wrong orbit.' : 'An orbit or inclination is never "fixed for free" after launch.',
      scenario.launchers.length ? `Pick ${scenario.launchers.map((id) => id === 'lv_f9_dedicated_meo' ? 'Falcon 9 dedicated with MEO injection' : 'a Falcon 9 rideshare seat').join(' or ')}.` : '',
      null);
  }
  if (launcher?.overkillFor?.includes(scenario.id) && mass.reaches !== false) {
    add('caution', null, 'launch', 'rocket', `${plain(launcher)} can do it, but it is overkill for this mission.`, 'A bigger or more expensive rocket is not automatically a better mission.');
  }
  if (budget.launchUnknown) {
    add('info', null, 'budget', 'rocket', `${plain(launcher)}: price on request (RFQ). The game leaves it out of the budget — not comparable on cost.`, 'No public price exists; a real mission asks the operator.');
  }

  // ── Gate: adapter / dispenser
  if (deployer && structure && deployer.formFactor !== structure.formFactor) {
    add('error', 'launch_adapter_compatible', 'launch', 'rocket', `The ${plain(deployer).toLowerCase()} does not fit ${isCubeSat(structure) ? 'a CubeSat' : 'a large satellite'}.`,
      'The adapter must match the satellite\'s mechanical interface.', `Pick the ${isCubeSat(structure) ? 'CubeSat dispenser' : 'large-satellite adapter'}.`);
  }
  if (deployer && launcher && !launcher.adapters.includes(deployer.id)) {
    add('error', 'launch_adapter_compatible', 'launch', 'rocket', `${plain(launcher)} does not offer the ${plain(deployer).toLowerCase()} for this kind of launch.`,
      'Adapter and launcher must be compatible.', 'Pick a matching launch service or adapter.');
  }

  // ── Gate: ground network
  if (ground && ground.serves !== scenario.groundServes) {
    add('error', 'ground_network_compatible', 'ground', 'comms', `The signal is there, but nobody on Earth receives and checks it: ${GROUND_WHY_NOT[ground.serves]?.[scenario.groundServes] ?? 'wrong ground segment.'}`,
      'Each service needs its own receiving / monitoring network.', 'Pick the ground segment made for this mission.');
  }

  // ── Gate: power (average + peak)
  if (components.power && orbit) {
    if (power.generation == null) {
      add('error', 'power_peak_and_average_pass', 'power', 'power', `A ${watts(components.power.arrayW)} CubeSat array is not a power system for ${plain(orbit)}.`,
        'A 6U with 38 W cannot simply move to a far orbit without a new architecture.', 'Fly the orbit the build was designed for.');
    } else if (power.used > power.generation + 1e-9) {
      add('error', 'power_peak_and_average_pass', 'power', 'power', `Not enough power: the mission needs ${num(power.used, 1)} W on average but the array gives ${num(power.generation, 2)} W.`,
        power.explanation, 'Use a bigger array or an orbit with more sunlight.');
    } else if (power.peakOk === false) {
      add('error', 'power_peak_and_average_pass', 'power', 'power', `Peak load ${watts(power.peak)} is more than the array can give.`, power.explanation, 'Use a bigger array.');
    } else if (power.margin != null && power.margin < 0.1) {
      add('caution', 'power_peak_and_average_pass', 'power', 'power', `Power is tight: only ${pct(power.margin)} spare.`, power.explanation);
    }
  }
  // ── Gate: battery in eclipse
  if (components.battery && battery.needWh != null && battery.needWh > battery.usable) {
    add('error', 'battery_eclipse_pass', 'battery', 'power', 'In sunlight there is enough power, but in the shadow the satellite switches off.', battery.explanation, 'Pick a bigger battery.');
  }

  // ── Gate: communications link (TT&C + mission chain)
  if (data.status === 'over' && !data.blocked) {
    add('error', 'communications_link_pass', 'data', 'comms', data.kind === 'gb'
      ? `Only ${pct(data.deliveredFraction ?? 0)} of the measurements reach Earth — the mission needs ≥95%.`
      : `The service chain is broken: missing ${data.missing.join(', ')}.`,
    data.explanation, data.kind === 'gb' ? 'Use the S-band science downlink and the science station.' : 'Complete the chain on the Talking to Earth / Mission payload steps.');
  }

  // ── Budget (not a hard gate: the mission objective "on budget" will fail)
  if (budget.status === 'over') {
    add('warning', null, 'budget', 'rocket', `You are ${money(budget.used - budget.available)} over the ${money(budget.available)} model budget.`, budget.explanation, 'Choose cheaper options; check the launch line.');
  } else if (budget.status === 'caution') {
    add('caution', null, 'budget', 'rocket', `You are eating into the project reserve (${money(budget.reserveLeft)} left; plan ${money(budget.plannedReserve)}).`, budget.explanation);
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/** Problems caused by choices (errors only). */
export const hasBlockingErrors = (issues) => issues.some((i) => i.severity === 'error');
/** Launch needs every choice made and no failed hard gate. */
export const canLaunch = (issues) => !issues.some((i) => i.severity === 'error' || i.severity === 'todo');

/** Status of each §8.5 gate: 'pass' | 'fail' | 'todo'. */
export function gateStatus(issues) {
  return GATES.map((g) => {
    const mine = issues.filter((i) => i.gate === g.id);
    const status = mine.some((i) => i.severity === 'error') ? 'fail' : mine.some((i) => i.severity === 'todo') ? 'todo' : 'pass';
    return { ...g, status, issues: mine.filter((i) => i.severity === 'error' || i.severity === 'todo') };
  });
}
