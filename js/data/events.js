// Random mission events.
// Schema: { id, title, description, phase: 'prelaunch'|'orbit', appliesTo: orbit ids | 'all',
//           probability (chance per year of operation; once for 'prelaunch'),
//           probabilityFrom?: 'health' (chance per year computed from spacecraft health instead),
//           choices: [{ label, effects, explanation }] }
// `{item}` in a description is replaced with the name of the failing part.
// Effect keys (all optional): budgetM (+extra cost), science (multiplier on future science),
// lifetimeYears (+/-), health (+/- spacecraft health → more/fewer hardware failures later),
// launchReliability (+/- launch success chance; prelaunch only), delayMonths (+).

export const EVENTS = [
  {
    id: 'hardware_failure', title: 'Hardware Failure', phase: 'orbit', probabilityFrom: 'health', appliesTo: 'all',
    description: 'Telemetry shows that the {item} is malfunctioning.',
    choices: [
      { label: 'Switch to backup mode', effects: { science: 0.85 },
        explanation: 'The spacecraft keeps working in a reduced mode — you lose some science from now on.' },
      { label: 'Upload a software fix ($5M)', effects: { budgetM: 5, science: 0.97 },
        explanation: 'Engineers on the ground write a patch. It costs money, but saves most of the science.' },
      { label: 'Ignore it and carry on', effects: { health: -0.03 },
        explanation: 'Free today, but the damaged part stresses the rest of the spacecraft — more failures become likely.' },
    ],
  },
  {
    id: 'solar_flare', title: 'Solar Flare!', phase: 'orbit', probability: 0.3, appliesTo: 'all',
    description: 'The Sun just released a burst of radiation. Charged particles will hit the spacecraft within hours.',
    choices: [
      { label: 'Enter safe mode', effects: { science: 0.97 },
        explanation: 'Switching instruments off protects the electronics, but you lose a few days of observations.' },
      { label: 'Keep observing', effects: { health: -0.02, science: 1.02 },
        explanation: 'You keep collecting data, but radiation may damage electronics — hardware failures become more likely.' },
    ],
  },
  {
    id: 'debris', title: 'Space Debris Warning', phase: 'orbit', probability: 0.25, appliesTo: ['leo', 'sso', 'geo', 'heo'],
    description: 'A piece of an old rocket will pass within 200 m of your spacecraft.',
    choices: [
      { label: 'Fire thrusters to dodge', effects: { lifetimeYears: -0.3 },
        explanation: 'Dodging uses propellant you were saving for later, so the mission ends a little sooner.' },
      { label: 'Accept the risk', effects: { health: -0.03 },
        explanation: 'No collision this time — but tiny fragments chipped the solar panels and the spacecraft is a bit more fragile.' },
    ],
  },
  {
    id: 'budget_cut', title: 'Budget Cut', phase: 'orbit', probability: 0.1, appliesTo: 'all',
    description: 'The space agency\'s budget was reduced. Your mission must save money.',
    choices: [
      { label: 'Reduce operations team', effects: { science: 0.9 },
        explanation: 'Fewer people planning observations means less science per day.' },
      { label: 'End the mission one year early', effects: { lifetimeYears: -1 },
        explanation: 'Full science while it lasts, but the mission is shorter.' },
    ],
  },
  {
    id: 'launch_delay', title: 'Launch Delay', phase: 'prelaunch', probability: 0.2, appliesTo: 'all',
    description: 'A sensor on the rocket shows a strange reading during the countdown.',
    choices: [
      { label: 'Stand down and investigate', effects: { delayMonths: 3, budgetM: 5 },
        explanation: 'Safety first: the delay costs time and money, but the launch will be safe.' },
      { label: 'Launch anyway with a waiver', effects: { launchReliability: -0.03 },
        explanation: 'You keep the schedule but accept a slightly higher chance that the rocket fails.' },
    ],
  },
  {
    id: 'discovery', title: 'Unexpected Discovery!', phase: 'orbit', probability: 0.1, appliesTo: 'all',
    description: 'Your instruments spotted something nobody expected. Scientists around the world are excited.',
    choices: [
      { label: 'Extend observations ($5M)', effects: { science: 1.25, budgetM: 5 },
        explanation: 'More observing time costs a little extra, but the discovery could be huge.' },
      { label: 'Stick to the plan', effects: { science: 1.1 },
        explanation: 'You note the discovery and continue the planned schedule.' },
    ],
  },
];

const byId = new Map(EVENTS.map((e) => [e.id, e]));
export const getEvent = (id) => (id ? byId.get(id) ?? null : null);
