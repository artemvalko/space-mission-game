// Team roles for hot-seat play. `focus` lists dashboard resource keys the role should watch.
// personalGoal.check is a key evaluated in engine/roleGoals.js (live on Final check, final in scoring).

export const ROLES = [
  {
    id: 'director', name: 'Mission Director', icon: '★',
    focus: ['budget', 'time'],
    description: 'Keeps the mission on budget and on schedule, and has the final say at the Go/No-Go review.',
    personalGoal: { text: 'Finish with at least 10% of the budget left and launch on time.', check: 'director_budget_schedule' },
  },
  {
    id: 'engineer', name: 'Systems Engineer', icon: '⚙',
    focus: ['mass', 'power', 'battery', 'health'],
    description: 'Makes sure all the parts fit together: enough power, enough battery and not too heavy for the rocket.',
    personalGoal: { text: 'Keep mass and power margins of at least 10%.', check: 'engineer_margins' },
  },
  {
    id: 'scientist', name: 'Lead Scientist', icon: '✦',
    focus: ['data', 'science'],
    description: 'Chooses the instruments and fights for as much science as possible.',
    personalGoal: { text: 'Beat the science target by at least 20%.', check: 'scientist_science' },
  },
  {
    id: 'flight', name: 'Flight Dynamics & Ops', icon: '↗',
    focus: ['data', 'lifetime', 'launch'],
    description: 'Picks the orbit, the rocket and the ground stations, keeps the radio link to Earth working, and calls the shots during operations.',
    personalGoal: { text: 'Lose at most 10% of the data, and fly a recommended orbit.', check: 'flight_data_orbit' },
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
  { id: 'science', text: 'Not enough science' },
  { id: 'risk', text: 'Too risky — parts may fail' },
  { id: 'check', text: 'I need more time to check' },
];
export const getNoGoReason = (id) => NO_GO_REASONS.find((r) => r.id === id) ?? null;
