// Registry of all animation scenes. Every scene: (container, params) → Promise.

export { countdown } from './countdown.js';
export { launchSuccess } from './launchSuccess.js';
export { tooHeavy } from './tooHeavy.js';
export { orbitView, getOrbitView } from './orbitView.js';
export { solarFlare } from './solarFlare.js';
export { debris } from './debris.js';
export { hardwareFailure } from './hardwareFailure.js';
export { cardFlip } from './cardFlip.js';
export { discovery } from './discovery.js';
export { missionSuccess } from './missionSuccess.js';
export { missionPartial } from './missionPartial.js';
export { missionLost } from './missionLost.js';
export { reducedMotion } from './core.js';

import { solarFlare } from './solarFlare.js';
import { debris } from './debris.js';
import { hardwareFailure } from './hardwareFailure.js';
import { cardFlip } from './cardFlip.js';
import { discovery } from './discovery.js';
export { constellationFix } from './constellation.js';

/** Scene for a random event id. */
export const EVENT_SCENES = {
  hardware_failure: hardwareFailure,
  solar_flare: solarFlare,
  debris,
  budget_cut: (c, p) => cardFlip(c, { ...p, kind: 'budget', title: 'Budget cut!' }),
  launch_delay: (c, p) => cardFlip(c, { ...p, kind: 'delay', title: 'Launch delay' }),
  rare_storm: discovery,
};

export { instrumentView, drawView } from './instrumentView.js';
export { balanceScale } from './balanceScale.js';
export { goConsole } from './goConsole.js';
export { montage } from './montage.js';
export { groundTrack, trackPoints } from './groundTrack.js';
export { endOfLife } from './endOfLife.js';
