// Extra costs that come from what happens after launch — PURE.

import { computeResources, getSelection } from './resources.js';

// After a launch failure you need a new rocket AND a spare satellite. The design already
// exists, so the spare costs half of the original hardware.
export const SPARE_HARDWARE_FRACTION = 0.5;

/** $M for ONE relaunch of this design. */
export function relaunchCostM(state, res = computeResources(state)) {
  const { launcher } = getSelection(state);
  return (launcher?.cost ?? 0) + res.budget.hardware * SPARE_HARDWARE_FRACTION;
}
