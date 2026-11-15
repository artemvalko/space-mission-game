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
import { GROUND_WHY_NOT, groundServes } from '../data/groundStations.js';
import { computeResources, getSelection, payloadNeeds } from './resources.js';
import { getComponent } from '../data/components.js';
import { getInstrument } from '../data/instruments.js';
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
  const { orbit, launcher, deployer, ground, scenario, components, instruments, left, prep, reference, included } = sel;

  if (!scenario) {
    add('todo', null, 'design', 'pickMission', 'Pick a mission to begin.');
    return out;
  }
  const { mass, power, battery, data, budget } = resources;
  const structure = components.structure;
  const { missing: missingRoles } = payloadNeeds(sel);

  // ── To do (in step order) — never errors
  if (!structure) add('todo', 'spacecraft_size_mass_volume_compatible', 'design', 'size', 'Choose how big your satellite is.');
  if (!instruments.length && !reference) add('todo', 'mandatory_payload_complete', 'design', 'science', 'Choose the mission payload.');
  const unchosen = (cats) => cats.filter((c) => !components[c] && !left.has(c) && !included.has(c));
  if (unchosen(['power', 'battery']).length) add('todo', 'power_peak_and_average_pass', 'design', 'power', 'Choose solar wings and a battery.');
  if (unchosen(scenario.requiredBus.filter((c) => STEP_FOR_CATEGORY[c] === 'comms')).length || !ground) add('todo', 'communications_link_pass', 'design', 'comms', 'Choose the radios and a ground segment.');
  const busTodo = unchosen(scenario.requiredBus.filter((c) => STEP_FOR_CATEGORY[c] === 'brains' && !(c === 'sensors' && components.computer?.providesGnss)));
  if (busTodo.length) add('todo', 'bus_support_complete', 'design', 'brains', 'Choose the bus systems.', `Still open: ${busTodo.map((c) => CATEGORY_PLAIN[c].plainName.toLowerCase()).join(', ')}.`);
  if (!orbit) add('todo', 'orbit_service_compatible', 'design', 'orbit', 'Choose an orbit.');
  if (!launcher || !deployer) add('todo', 'launcher_trajectory_compatible', 'design', 'rocket', 'Choose a rocket and an adapter.');
  const prepMissing = [['tests', 'tests'], ['licence', 'licence'], ['disposal', 'disposal plan']].filter(([k]) => !prep[k]);
  if (prepMissing.length) {
    add('todo', 'legal_safety_disposal_plan_pass', 'legal', 'launchPrep', `NO-GO: missing ${prepMissing.map(([, t]) => t).join(', ')}.`,
      'Real launches need tested hardware (vibration, thermal-vacuum, EMC), licensed frequencies (ITU) and a safe end-of-life plan.', 'Tick the items on the Launch prep step.');
  }

  // ── Gate: orbit fits the service
  if (orbit && !scenario.allowedOrbits.includes(orbit.id)) {
    const alt = scenario.id === 'mission_navigation_meo' && orbit.id === 'leo_550'
      ? 'A LEO navigation DEMO is a real, different mission: ESA Celeste (12U, 20 kg, LEO 500–600 km) — it tests the signal, not worldwide positioning.'
      : scenario.id === 'mission_comms_iot' && orbit.id === 'geo' ? 'A heavy GEO telecom satellite is a different, valid concept — but not this 6U build.'
        : scenario.id === 'mission_weather_mw' && orbit.id === 'geo' ? 'NOAA GOES-R in GEO is a valid but much bigger weather architecture (16-channel imager).' : null;
    add('error', 'orbit_service_compatible', 'orbit', 'orbit', `${plain(orbit)}: wrong orbit for this mission.`,
      `${scenario.orbitWhy[orbit.id] ?? ''} The orbit must match what the service needs (coverage, altitude, signal geometry).`.trim(), `Pick ${scenario.recommendedOrbits.map((id) => id === 'leo_550' ? 'Low orbit (~550 km)' : id === 'sso_550_650' ? 'Sun-synchronous orbit' : 'Navigation orbit (MEO)').join(' or ')}.`, alt);
  } else if (orbit && !scenario.recommendedOrbits.includes(orbit.id)) {
    add('info', 'orbit_service_compatible', 'orbit', 'orbit', `${plain(orbit)} works, but is not recommended.`, scenario.orbitWhy[orbit.id] ?? '');
  }

  // ── Gate: size, mass, volume
  if (structure) {
    const cube = isCubeSat(structure);
    const wantCube = scenario.size !== 'large';
    if (cube !== wantCube) {
      add('error', 'spacecraft_size_mass_volume_compatible', 'mass', 'size', wantCube
        ? 'Overkill: a ~700 kg bus for a CubeSat job.'
        : 'A Galileo node needs a ~700 kg bus, not a CubeSat.',
      wantCube ? `Bigger is not better: mass, launch and money all grow for nothing. The research build is ${SIZE_NAME[scenario.size]}.` : 'A CubeSat (max 24 kg) cannot carry four atomic clocks and an L-band payload — the navigation payload alone is ~178 kg in our build.',
      `Pick ${SIZE_NAME[scenario.size]} on the Size step.`, wantCube ? null : 'A small-satellite navigation DEMO exists (ESA Celeste, 12U) — but it is a different mission.');
    }
    // (Other CubeSat sizes are valid when their mass and volume fit — checked below with real data.)
    if (reference && !structure.missions.includes(scenario.id)) {
      add('error', 'spacecraft_size_mass_volume_compatible', 'design', 'size', `${plain(structure)} was built for another job.`,
        'A reference build is a complete real satellite: its payload does a different mission.', 'Pick a reference build or frame for this mission.');
    }
    if (reference) {
      const extras = instruments.filter((i) => i.flewOn !== structure.id);
      if (extras.length) add('error', 'mandatory_payload_complete', 'science', 'science', `${plain(structure)} is complete: remove the extra payload.`,
        `A reference build already carries its own payload. Extra: ${extras.map(plain).join(', ')}. Only add-ons that really flew on it can be added.`, 'Remove the extra payload, or build part by part.');
      if (reference.licensingNote) add('caution', 'legal_safety_disposal_plan_pass', 'legal', 'launchPrep', 'Tiny satellites are hard to track: licensing risk.', reference.licensingNote);
    }
    if (mass.cannotVerify?.length) {
      const refs = ['ref_swarm_spacebee', 'ref_astrocast_3u', 'ref_sateliot_6u', 'ref_tropics_3u', 'ref_raincube_6u', 'ref_gps_iii'].filter((id) => getComponent(id).missions.includes(scenario.id)).map((id) => getComponent(id).plainName);
      add('error', 'spacecraft_size_mass_volume_compatible', 'mass', 'size', `Mass cannot be verified: ${mass.cannotVerify[0]} has no public mass.`,
        `We never guess a mass. Not public: ${mass.cannotVerify.join(', ')}. Without it the dispenser and rocket limits cannot be checked.`,
        'Pick parts with a public mass, or a Reference build (a real satellite\'s total mass).',
        refs.length ? `Reference builds with a public total mass: ${refs.join(', ')}.` : null);
    }
    if (mass.misfits.length) {
      add('error', 'spacecraft_size_mass_volume_compatible', 'mass', 'science', `${mass.misfits.length} part(s) are the wrong size for this frame.`,
        `They are built for a ${cube ? 'large satellite' : 'CubeSat'}. CubeSat parts and large-satellite parts are not interchangeable.`, 'Use the parts made for your frame size.');
    }
    if (!mass.volume.ok) {
      add('error', 'spacecraft_size_mass_volume_compatible', 'mass', 'size', `Payload needs ${mass.volume.used}U but the ${plain(structure)} has only ${mass.volume.available}U.`,
        'A 4U radiometer cannot fit in a 3U body (TEMPEST-D used 4U inside a 6U, S07).', 'Pick CubeSat 6U.', scenario.id === 'mission_weather_mw' ? 'NASA TROPICS fits a different 3U radiometer — with a constellation.' : null);
    }
  }
  if (mass.status === 'over' && mass.available != null) {
    const byDispenser = mass.available === mass.limit && isCubeSat(structure);
    add('error', 'spacecraft_size_mass_volume_compatible', 'mass', byDispenser ? 'science' : 'rocket',
      byDispenser ? `Too heavy for the ${plain(structure).replace(' frame', '')} dispenser: ${kg(mass.used)} vs ${kg(mass.available)}.`
        : `Too heavy: ${kg(mass.used)} vs ${kg(mass.available)} the rocket can lift.`,
      byDispenser ? 'Mass over the dispenser limit is a mechanical and safety incompatibility (S01).' : 'A rocket\'s capacity is a hard physical limit.',
      byDispenser ? 'Remove parts that are not needed.' : 'Pick a launch service that can lift it to this orbit.');
  } else if (mass.status === 'caution') {
    add('caution', 'spacecraft_size_mass_volume_compatible', 'mass', 'rocket', `Mass is near the limit (${pct(mass.ratio)}).`, mass.explanation);
  }
  if (mass.estimated?.length) {
    add('info', null, 'mass', 'science', '≈ IoT radio mass estimated from the research SDR class.', 'Its real mass is not public; the research gives a same-class estimate.');
  }

  // ── Gate: mandatory payload + no useless payload
  if (instruments.length || reference) {
    for (const ins of instruments) {
      if (ins.cancelled) add('error', 'mandatory_payload_complete', 'science', 'science', `${plain(ins)} was cancelled and never flew.`, ins.why, `Remove the ${plain(ins).toLowerCase()}.`);
      if (ins.flewOn && ins.flewOn.startsWith('ref_') && reference?.payloadRoles && structure.id === ins.flewOn) continue;
      if (ins.demo) add('caution', 'mandatory_payload_complete', 'science', 'science', `${plain(ins)}: new technology demo — extra risk.`, ins.why);
      const why = payloadWhyNot(scenario, ins);
      if (why) add('error', 'mandatory_payload_complete', 'science', 'science', `${plain(ins)}: ${why}`,
        'It does not serve this mission. A bigger or extra instrument cannot replace the one the mission physically needs.', `Remove the ${plain(ins).toLowerCase()}.`);
    }
    for (const role of missingRoles) {
      {
        const info = ROLE_INFO[role];
        const msg = role === 'atomic_clocks' ? 'No precise on-board time: add the atomic clocks.'
          : role === 'iot_transceiver' ? 'Commands work, but it does not receive users\' messages.'
            : role === 'calibration' ? 'No calibration: the temperatures cannot be trusted.'
              : role === 'atmo_sensor' ? 'No atmosphere sensor: add a radiometer, radar or GNSS-RO.'
                : `Missing: the ${info.plainName.toLowerCase()}.`;
        add('error', 'mandatory_payload_complete', 'science', 'science', msg,
          role === 'atomic_clocks' ? 'No precise reference time → no navigation signal (applies to this MEO Galileo-class build).' : role === 'iot_transceiver' ? 'TT&C is not the commercial service payload.' : 'This part does the mission itself.',
          `Add the ${info.plainName.toLowerCase()} on the Mission payload step.`,
          role === 'atomic_clocks' ? 'ESA Celeste tests precise time WITHOUT atomic clocks — but as a LEO demo, not a Galileo node.' : null);
      }
    }
  }

  // ── Gate: bus complete
  const gnssObc = !!components.computer?.providesGnss; // an OBC with GNSS replaces the separate position sensor
  for (const cat of scenario.requiredBus) {
    if (cat === 'sensors' && gnssObc) continue;
    if (left.has(cat) && !included.has(cat)) {
      const info = CATEGORY_PLAIN[cat];
      add('error', cat === 'battery' ? 'battery_eclipse_pass' : 'bus_support_complete', cat === 'battery' ? 'battery' : 'design', STEP_FOR_CATEGORY[cat],
        `${info.plainName} missing: ${info.noneWhy ?? 'the satellite cannot work without it.'}`,
        `${info.realTerm}: ${info.whatFor}`, `Add a ${info.plainName.toLowerCase()}.`);
    }
  }

  // ── Gate: launcher reaches the real target orbit
  if (launcher && orbit && mass.reaches === false) {
    const gto = launcher.deliversTo;
    const tooHeavyEvenLeo = launcher.capacityKg.leo_550 != null && mass.used > launcher.capacityKg.leo_550;
    add('error', 'launcher_trajectory_compatible', 'launch', 'rocket',
      gto ? `${plain(launcher)} only reaches GTO — not your orbit.`
        : tooHeavyEvenLeo ? `${plain(launcher)} can't lift ${kg(mass.used)} even to low orbit (~${kg(launcher.capacityKg.leo_550)}).`
          : `${plain(launcher)} can't reach your orbit.`,
      gto ? `It delivers to ${gto}. GTO is not MEO: without a transfer stage or apogee engine plus a calculated burn, the satellite stays in the wrong orbit.`
        : `${tooHeavyEvenLeo ? `It cannot reach ${plain(orbit)} either. ` : ''}An orbit or inclination is never "fixed for free" after launch.`,
      scenario.launchers.length ? `Pick ${scenario.launchers.map((id) => id === 'lv_f9_dedicated_meo' ? 'Falcon 9 to MEO (or Ariane 62)' : 'Falcon 9 rideshare').join(' or ')}.` : '',
      null);
  }
  if (launcher?.overkillFor?.includes(scenario.id) && mass.reaches !== false) {
    add('caution', null, 'launch', 'rocket', `${plain(launcher)}: works, but overkill here.`, 'A bigger or more expensive rocket is not automatically a better mission.');
  }
  if (budget.launchUnknown) {
    add('info', null, 'budget', 'rocket', `${plain(launcher)}: price on request (RFQ), not counted.`, 'No public price exists; a real mission asks the operator. The game leaves it out of the budget — not comparable on cost.');
  }

  // ── Gate: adapter / dispenser
  if (deployer && structure && deployer.formFactor !== structure.formFactor) {
    add('error', 'launch_adapter_compatible', 'launch', 'rocket', 'Wrong adapter for this satellite size.',
      `The ${plain(deployer).toLowerCase()} does not fit ${isCubeSat(structure) ? 'a CubeSat' : 'a large satellite'}. The adapter must match the satellite's mechanical interface.`, `Pick the ${isCubeSat(structure) ? 'CubeSat dispenser' : 'large-satellite adapter'}.`);
  }
  if (deployer && launcher && !launcher.adapters.includes(deployer.id)) {
    add('error', 'launch_adapter_compatible', 'launch', 'rocket', 'This rocket does not use this adapter.',
      `${plain(launcher)} does not offer the ${plain(deployer).toLowerCase()}. Adapter and launcher must be compatible.`, 'Pick a matching launch service or adapter.');
  }

  // ── Gate: ground network
  if (ground && !groundServes(ground, scenario.groundServes)) {
    add('error', 'ground_network_compatible', 'ground', 'comms', 'Wrong ground segment: nobody receives and checks the signal.',
      `${GROUND_WHY_NOT[[ground.serves].flat()[0]]?.[scenario.groundServes] ?? ''} Each service needs its own receiving / monitoring network.`.trim(), 'Pick the ground segment made for this mission.');
  }

  // ── Gate: power (average + peak)
  if (components.power && orbit) {
    if (power.generation == null) {
      add('error', 'power_peak_and_average_pass', 'power', 'power', 'This small array was not built for this orbit.',
        `A ${watts(components.power.arrayW)} CubeSat array is not a power system for ${plain(orbit)}. A 6U with 38 W cannot simply move to a far orbit without a new architecture.`, 'Fly the orbit the build was designed for.');
    } else if (power.payloadPeakOk === false) {
      add('error', 'power_peak_and_average_pass', 'power', 'power', `${plain(getInstrument(power.hungry))} needs ${num(power.hungryW, 1)} W; array gives ${num(components.power.arrayW, 1)} W.`,
        `${power.explanation} Even in full sunlight this array cannot run it. RainCube used deployable wings and ran its radar in bursts — after losing a power tracker, only ~40 min at a time (O36).`, 'Use deployable solar wings.');
    } else if (power.used > power.generation + 1e-9) {
      add('error', 'power_peak_and_average_pass', 'power', 'power', `Power short: needs ${num(power.used, 1)} W, makes ${num(power.generation, 1)} W.`,
        power.explanation, 'Use a bigger array or an orbit with more sunlight.');
    } else if (power.peakOk === false) {
      add('error', 'power_peak_and_average_pass', 'power', 'power', `Peak ${watts(power.peak)} is more than the array gives.`, power.explanation, 'Use a bigger array.');
    } else if (power.margin != null && power.margin < 0.1) {
      add('caution', 'power_peak_and_average_pass', 'power', 'power', `Power is tight: ${pct(power.margin)} spare.`, power.explanation);
    }
  }
  if (components.power?.fitsUnits && structure?.units && !components.power.fitsUnits.includes(structure.units)) {
    add('error', 'spacecraft_size_mass_volume_compatible', 'power', 'power', `${plain(components.power)} does not fit a ${structure.units}U frame.`,
      'Solar panels are made for one CubeSat size.', 'Pick the array made for your frame.');
  }
  // ── Gate: battery in eclipse
  if (components.battery && battery.needWh != null && battery.needWh > battery.usable) {
    add('error', 'battery_eclipse_pass', 'battery', 'power', 'Battery too small: it switches off in the shadow.', `In sunlight there is enough power, but not in the shadow. ${battery.explanation}`, 'Pick a bigger battery.');
  }

  // ── Gate: communications link (TT&C + mission chain)
  if (data.status === 'over' && !data.blocked) {
    add('error', 'communications_link_pass', 'data', 'comms', data.kind === 'gb'
      ? `Only ${pct(data.deliveredFraction ?? 0)} of data reaches Earth (need 95%).`
      : `Link broken: missing ${data.missing.join(', ')}.`,
    data.explanation, data.kind === 'gb' ? 'Use the S-band science downlink and the science station.' : 'Complete the chain on the Talking to Earth / Mission payload steps.');
  }

  const dl = components.downlink;
  if (dl?.requiresComms && components.comms?.id !== dl.requiresComms) {
    add('error', 'communications_link_pass', 'data', 'comms', 'Reuse needs the S-band transceiver as your control radio.', 'One radio can only do both jobs if it is installed.', 'Pick the S-band transceiver as the control radio.');
  }
  if (dl?.needsXband) {
    add('caution', null, 'data', 'comms', 'X-band is overkill here and needs X-band ground.', `150 Mbps is far more than IoT bytes or a radiometer's ~8 kbps (O16) need. X-band ground stations cost more${ground?.xband ? ' — your ground segment has X-band.' : ' — check that your ground segment has X-band (AWS does).'}`);
  }
  if (data.status === 'unknown' && data.unmeasured && data.chainOk) {
    add('info', null, 'data', 'comms', 'Data volume not measurable: a rate is not public.', data.explanation);
  }
  // ── End of life: the retirement strategy must be possible for this orbit and satellite (DISPOSAL.md)
  const planet = resources.planet;
  if (planet?.strategyId && planet.whyNot) {
    add('error', 'legal_safety_disposal_plan_pass', 'legal', 'launchPrep', planet.whyNot,
      'Every mission must retire safely: low orbits within 5 years (S22), uncontrolled reentries only if the risk to people is ≤ 1 in 10,000 (D04).', 'Pick a retirement option that fits your orbit.');
  }
  if (planet?.valid && planet.groundRisk === 'needs-controlled') {
    add('caution', 'legal_safety_disposal_plan_pass', 'legal', 'launchPrep', 'Large satellites must pass the 1-in-10,000 rule.', 'If the casualty risk is higher, uncontrolled reentry is not allowed (D04).');
  }
  if (sel.dockingPlate) add('info', null, 'mass', 'launchPrep', 'Docking plate: mass and price not public.', 'Not counted in the mass check; its price makes the budget uncertain (D07).');
  const eol = components.eol;
  if (eol?.id === 'eol_natural_decay' && orbit && ['leo_550', 'sso_550_650', 'leo_550_32deg'].includes(orbit.id)) {
    add('info', 'legal_safety_disposal_plan_pass', 'legal', 'launchPrep', 'Natural decay from 550+ km may miss the 5-year rule.', 'Higher orbits decay much slower (NASA SoA, O55). The FCC 5-year rule (S22) applies to listed US systems. Not verified with a decay model here.');
  }
  if (eol?.needsAdcs && !components.adcs && !included.has('adcs')) {
    add('error', 'legal_safety_disposal_plan_pass', 'legal', 'launchPrep', 'Turning broadside needs a pointing system.', eol.why, 'Add an ADCS.');
  }

  // ── Budget (not a hard gate: the mission objective "on budget" will fail)
  if (budget.status === 'over') {
    add('warning', null, 'budget', 'rocket', `${money(budget.used - budget.available)} over the model budget.`, budget.explanation, 'Choose cheaper options; check the launch line.');
  } else if (budget.uncertain) {
    add('caution', null, 'budget', null, `Budget uncertain: ${budget.unknownItems.length} item${budget.unknownItems.length > 1 ? 's have' : ' has'} no public price.`, `${budget.unknownItems.join(', ')}. Real engineers would request a quote (RFQ). Not a fail, and never a guess.`);
  } else if (budget.status === 'caution') {
    add('caution', null, 'budget', 'rocket', `Eating into the reserve: ${money(budget.reserveLeft)} left.`, `The research plan keeps ${money(budget.plannedReserve)}. ${budget.explanation}`);
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
