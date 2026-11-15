// systemMap(state) — the satellite architecture as 6 blocks (CLARITY P1.3). PURE.
// Payload (what it is FOR) · Bus (what keeps it alive) · TT&C radio (how WE control it) · Downlink (how the
// mission data gets home) · Ground (who receives and checks it) · Launch & end of life.
// state per block: 'chosen' | 'missing' (not chosen yet) | 'wrong' (left out / does not fit) | 'not_needed' |
//                  'unverified' (a value the data does not give) | 'included' (inside a reference build)

import { computeResources, getSelection, payloadNeeds } from './resources.js';
import { evaluateDependencies } from './dependencies.js';
import { M_COMMS, M_NAV } from '../data/components.js';

const PAYLOAD_ROLE = {
  [M_COMMS]: 'What it is for: the IoT message radio.',
  [M_NAV]: 'What it is for: atomic clocks + navigation signal.',
  default: 'What it is for: the weather instrument.',
};

export const SYSTEM_BLOCKS = [
  { id: 'payload', label: 'Payload', icon: 'target', glossary: 'payload', steps: ['science'] },
  { id: 'bus', label: 'Bus', icon: 'cube', glossary: 'bus', steps: ['size', 'power', 'brains'], role: 'Keeps it alive: frame, power, battery, computer, pointing, heat.' },
  { id: 'ttc', label: 'TT&C radio', icon: 'radio', glossary: 'ttc', steps: ['comms'], role: 'How we control it — not the mission service.' },
  { id: 'downlink', label: 'Downlink', icon: 'signal', glossary: 'downlink', steps: ['comms'], role: 'How the mission data gets home.' },
  { id: 'ground', label: 'Ground', icon: 'antenna', glossary: 'groundSegment', steps: ['comms'], role: 'Who receives and checks it.' },
  { id: 'launch', label: 'Launch & end of life', icon: 'rocket', glossary: 'deorbit', steps: ['orbit', 'rocket', 'launchPrep'], role: 'How it gets up and how it retires.' },
];

const BUS_CATS = ['structure', 'power', 'battery', 'computer', 'adcs', 'thermal', 'sensors', 'harness', 'propulsion', 'propellant'];

export function systemMap(state, res = computeResources(state)) {
  const sel = getSelection(state);
  const { scenario, components, left, included, reference } = sel;
  if (!scenario) return [];
  const deps = evaluateDependencies(sel);
  const bad = (cats) => cats.some((c) => left.has(c) && !included.has(c));
  const open = (cats) => cats.filter((c) => !components[c] && !left.has(c) && !included.has(c));

  // Payload
  const needs = payloadNeeds(sel);
  const wrongPayload = deps.mission.some((r) => r.status === 'incompatible' && r.result === 'wrong')
    // …or it flies but cannot do THIS goal (e.g. a radiometer for "rain inside storms")
    || deps.goal.some((r) => ['payload', 'timing'].includes(r.category) && (r.result === 'missing' || r.result === 'wrong'));
  const payload = reference ? 'included'
    : !sel.instruments.length ? 'missing'
      : wrongPayload || needs.missing.length ? 'wrong'
        : res.mass.cannotVerify?.some((n) => sel.instruments.some((i) => i.plainName === n)) ? 'unverified' : 'chosen';

  // Bus: required bus categories (an OBC with GNSS replaces the position sensor)
  const busCats = scenario.requiredBus.filter((c) => BUS_CATS.includes(c) && !(c === 'sensors' && components.computer?.providesGnss));
  const busOpen = open(busCats);
  const unverifiedBus = ['mass', 'power', 'battery'].some((k) => res[k].validity === 'unverified') || !!res.mass.volume?.critical;
  const failedBus = ['mass', 'power', 'battery'].some((k) => res[k].validity === 'fail') || res.mass.volume?.validity === 'fail';
  const bus = !components.structure ? 'missing' : reference ? (failedBus ? 'wrong' : 'included')
    : bad(busCats) || failedBus ? 'wrong' : busOpen.length ? 'missing' : unverifiedBus ? 'unverified' : 'chosen';
  const busNote = res.mass.volume?.validity === 'unverified' && !res.mass.volume.critical ? `Not verified: ${res.mass.volume.unknownParts.length} parts have no published size.` : '';

  // TT&C
  const ttc = included.has('comms') ? 'included' : left.has('comms') ? 'wrong' : components.comms ? 'chosen' : 'missing';

  // Downlink (navigation broadcasts through its payload antenna: no separate data downlink)
  const needsDl = scenario.requiredBus.includes('downlink');
  const dl = !needsDl ? 'not_needed' : included.has('downlink') ? 'included' : left.has('downlink') ? 'wrong'
    : !components.downlink ? 'missing' : res.data.validity === 'fail' && res.data.groundOk !== false ? 'wrong' : res.data.validity === 'unverified' ? 'unverified' : 'chosen';

  // Ground
  const groundRule = deps.mission.find((r) => r.capability === 'ground_network');
  const ground = !sel.ground ? 'missing' : groundRule?.result !== 'ok' ? 'wrong'
    : scenario.data.kind === 'gb' && res.data.validity === 'unverified' && res.data.contactHours == null ? 'unverified' : 'chosen';

  // Launch & end of life
  const disposalChosen = !!sel.disposalId || sel.prep.disposal;
  const launch = res.mass.reaches === false || (res.planet.strategyId && res.planet.whyNot) || (sel.orbit && !scenario.allowedOrbits.includes(sel.orbit.id)) ? 'wrong'
    : sel.orbit && sel.launcher && sel.deployer && disposalChosen ? 'chosen' : 'missing';

  const state0 = { payload, bus, ttc, downlink: dl, ground, launch };
  const note = {
    payload: reference ? `Included in ${components.structure.plainName}.` : sel.instruments.map((i) => i.plainName).join(', '),
    bus: reference ? 'Included: the real satellite\'s own bus.' : busNote && !busOpen.length ? busNote : busOpen.length ? `Still open: ${busOpen.length} part${busOpen.length > 1 ? 's' : ''}.` : '',
    ttc: components.comms?.plainName ?? (included.has('comms') ? 'Included.' : ''),
    downlink: !needsDl ? 'Not needed: navigation broadcasts through its L-band payload.' : components.downlink?.plainName ?? (included.has('downlink') ? 'Included.' : ''),
    ground: sel.ground?.plainName ?? '',
    launch: [sel.orbit?.plainName, sel.launcher?.plainName].filter(Boolean).join(' · '),
  };
  return SYSTEM_BLOCKS.map((b) => ({
    ...b,
    role: b.id === 'payload' ? PAYLOAD_ROLE[scenario.id] ?? PAYLOAD_ROLE.default : b.role,
    state: state0[b.id],
    note: note[b.id],
    step: b.id === 'bus' ? (!components.structure ? 'size' : open(['power', 'battery']).length ? 'power' : scenario.size === 'large' ? 'power' : 'brains')
      : b.id === 'launch' ? (!sel.orbit ? 'orbit' : !sel.launcher || !sel.deployer ? 'rocket' : 'launchPrep') : b.steps[0],
  }));
}
