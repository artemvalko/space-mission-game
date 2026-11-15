// SIMULATED mission events. They are game mechanics, always labelled "simulated event" in the UI.
// Real phenomena (solar storms, space debris) are named, but the chances below are GAME settings,
// never real statistics, and are never shown to the player.
//
// Schema: { id, title, description, phase: 'prelaunch'|'orbit', missions?: [scenarioId], perYear (game rate),
//           realPhenomenon?: text, choices: [{ label, effects, explanation }] }
// `{item}` in a description is replaced with the name of the failing part.
// Choices may need a design feature (`requires`: 'thrusters' | 'spareComputer'); the engine shows only
// the choices the design allows (engine/simulation.js eventChoices). Multipliers only — never statistics.
// Effect keys (all optional):
//   performance  multiplier on the mission KPI from now on (packets / valid samples / signal availability)
//   reserveShare fraction of the mission's model project reserve spent
//   damage       +1 = the satellite is weakened (a second weakening ends the mission)
//   delayMonths  launch delay (pre-launch only)

import { M_WX } from './components.js';

export const EVENTS = [
  {
    id: 'hardware_failure', title: 'Hardware fault', phase: 'orbit', perYear: 0.35,
    description: 'Telemetry shows that the {item} is misbehaving.',
    choices: [
      { label: 'Switch to the backup mode', effects: { performance: 0.85 },
        explanation: 'The satellite keeps working in a reduced mode — the mission delivers less from now on.' },
      { label: 'Upload a software fix (uses project reserve)', effects: { reserveShare: 0.25, performance: 0.97 },
        explanation: 'Engineers write a patch. It costs part of your reserve but saves most of the service.' },
      { label: 'Ignore it and carry on', effects: { damage: 1 },
        explanation: 'Free today, but the satellite is weakened — another hit could end the mission.' },
      { label: 'Switch to a spare computer', effects: {}, requires: 'spareComputer',
        explanation: 'Your 4-core computer has spares built in (Space Inventor, O54): no service lost.' },
    ],
  },
  {
    id: 'solar_flare', title: 'Solar storm!', phase: 'orbit', perYear: 0.3,
    realPhenomenon: 'Real solar flares, CMEs and geomagnetic storms are tracked by NASA DONKI (S26).',
    description: 'The Sun released a burst of charged particles. They will reach the satellite within hours.',
    choices: [
      { label: 'Enter safe mode', effects: { performance: 0.97 },
        explanation: 'Switching the payload off protects the electronics, but you lose a few days of service.' },
      { label: 'Keep working', effects: { damage: 1, performance: 1.01 }, damageHalvedBy: 'radHard', unsafeIfLowBattery: true,
        explanation: 'You keep the service running, but radiation may damage the electronics.' },
    ],
    // Qualitative note for MEO (no numbers): navigation satellites fly through the radiation belts.
    highOrbitNote: ' In MEO the satellite flies through the radiation belts, so storms matter even more.',
  },
  {
    id: 'debris', title: 'Space debris warning', phase: 'orbit', perYear: 0.25,
    realPhenomenon: 'Space debris is real — that is why every mission needs a disposal plan.',
    description: 'A piece of an old rocket will pass close to your satellite.',
    choices: [
      { label: 'Go to safe attitude and wait', effects: { performance: 0.98 },
        explanation: 'You pause the service and turn the satellite to make a smaller target.' },
      { label: 'Accept the risk', effects: { damage: 1 },
        explanation: 'No collision — but tiny fragments chipped the solar wings and the satellite is weaker.' },
      { label: 'Dodge with a thruster burn', effects: { reserveShare: 0.05 }, requires: 'thrusters',
        explanation: 'Your own thrusters move the satellite out of the way: a little propellant and reserve, no damage. This is why propulsion matters.' },
    ],
  },
  {
    id: 'budget_cut', title: 'Budget cut', phase: 'orbit', perYear: 0.1,
    description: 'The programme\'s budget was reduced. Your mission must save money.',
    choices: [
      { label: 'Reduce the operations team', effects: { performance: 0.9 },
        explanation: 'Fewer people planning passes means less service per day.' },
      { label: 'Pay from the project reserve', effects: { reserveShare: 0.5 },
        explanation: 'Full service continues, but half of your reserve is gone.' },
    ],
  },
  {
    id: 'launch_delay', title: 'Launch delay', phase: 'prelaunch', perYear: 0.2,
    realStory: { mission_weather_mw: 'This really happened to TROPICS: the first two satellites were lost on 12 Jun 2022 when an Astra rocket stage shut down early (O34). Not a probability — a real story.' },
    description: 'A sensor on the rocket shows a strange reading during the countdown.',
    choices: [
      { label: 'Stand down and investigate', effects: { delayMonths: 3, reserveShare: 0.25 },
        explanation: 'Safety first: the delay costs time and reserve, but the launch is safe.' },
      { label: 'Launch anyway with a waiver', effects: { damage: 1 },
        explanation: 'You keep the schedule, but the shaking may have weakened the satellite.' },
    ],
  },
  {
    id: 'radar_power', title: 'Radar power limit', phase: 'orbit', perYear: 0.4, requiresRole: 'precip_radar',
    realPhenomenon: 'This really happened to RainCube: after losing a power tracker it could only run its radar ~40 min at a time (O36).',
    description: 'One power tracker failed. The radar can no longer run at full power for long.',
    choices: [
      { label: 'Run the radar in short bursts', effects: { performance: 0.95 },
        explanation: 'You keep measuring rain, but only in ~40-minute bursts.' },
      { label: 'Push it at full power', effects: { damage: 1 },
        explanation: 'More rain profiles today, but the batteries are stressed — the satellite is weaker.' },
    ],
  },
  {
    id: 'rare_storm', title: 'A huge storm in view!', phase: 'orbit', perYear: 0.15, missions: [M_WX],
    description: 'A powerful storm system is right under your orbit. Scientists want every measurement.',
    choices: [
      { label: 'Add extra observation passes (uses reserve)', effects: { reserveShare: 0.25, performance: 1.05 },
        explanation: 'More passes cost a little reserve, but the storm data is valuable.' },
      { label: 'Stick to the plan', effects: { performance: 1.02 },
        explanation: 'You note the storm and keep the planned schedule.' },
    ],
  },
  {
    id: 'end_of_mission', title: 'Extend the mission or retire now?', phase: 'end', perYear: 1, // asked once, at the end of every flown mission
    description: 'The planned mission is complete. The satellite still works.',
    choices: [
      { label: 'Retire now, as planned', effects: {},
        explanation: 'You follow your retirement plan with full margin.' },
      { label: 'Extend the mission', effects: { bonusService: 0.05, debrisPenalty: 3 },
        explanation: 'More service for users — but the satellite stays up longer and uses its disposal margin (debris score worse).' },
    ],
  },
];

const byId = new Map(EVENTS.map((e) => [e.id, e]));
export const getEvent = (id) => (id ? byId.get(id) ?? null : null);
export const eventApplies = (ev, scenarioId, roles = null) => (!ev.missions || ev.missions.includes(scenarioId)) && (!ev.requiresRole || !!roles?.has(ev.requiresRole));
