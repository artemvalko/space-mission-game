// Team roles for hot-seat play. `focus` lists dashboard resource keys the role should watch.
// personalGoal.check is a key evaluated in engine/roleGoals.js (live on Final check, final in scoring).

export const ROLES = [
  {
    id: 'director', name: 'Mission Director', icon: '★',
    focus: ['budget', 'time'],
    description: 'Keeps the mission inside its model budget and schedule, makes sure the licence and disposal plan are ready, and has the final say at the Go/No-Go review.',
    personalGoal: { text: 'Stay inside the model budget, keep the schedule, and have the frequency licence + disposal plan ready.', check: 'director_budget_schedule' },
  },
  {
    id: 'engineer', name: 'Systems Engineer', icon: '⚙',
    focus: ['mass', 'power', 'battery'],
    description: 'Makes sure all the parts fit together: mass limit, power in sunlight and shadow, and thermal control.',
    personalGoal: { text: 'Mass inside its limit with ≥10% margin (Galileo node: within the 700 kg launch mass), power margin ≥10%, thermal control on board.', check: 'engineer_margins' },
  },
  {
    id: 'scientist', name: 'Lead Scientist', icon: '✦',
    focus: ['data', 'performance'],
    description: 'Chooses the mission payload and makes sure the mission KPIs are met.',
    personalGoal: { text: 'Meet every mission performance KPI (packets, signal or valid measurements).', check: 'scientist_science' },
  },
  {
    id: 'flight', name: 'Flight Dynamics & Ops', icon: '↗',
    focus: ['data', 'lifetime', 'launch'],
    description: 'Picks the orbit, the rocket, the adapter and the ground segment, keeps the link to Earth working, and calls the shots during operations.',
    personalGoal: { text: 'Fly the recommended orbit, on a rocket that really reaches it, with a working link to the right ground segment.', check: 'flight_data_orbit' },
  },
];

const byId = new Map(ROLES.map((r) => [r.id, r]));
export const getRole = (id) => (id ? byId.get(id) ?? null : null);

// Reasons a role can give for a No-Go vote (shown to the whole team).
export const NO_GO_REASONS = [
  { id: 'budget', text: "We're over budget" },
  { id: 'mass', text: 'Too heavy — no safety margin' },
  { id: 'power', text: 'Not enough power' },
  { id: 'data', text: "We can't send enough data home" },
  { id: 'science', text: 'The mission payload is not right' },
  { id: 'risk', text: 'Not ready: tests, licence or disposal plan missing' },
  { id: 'check', text: 'I need more time to check' },
];
export const getNoGoReason = (id) => NO_GO_REASONS.find((r) => r.id === id) ?? null;
