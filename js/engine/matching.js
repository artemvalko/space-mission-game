// matchRealMissions(state, limit) → closest real missions by orbit + instrument tags — PURE.

import { REAL_MISSIONS } from '../data/realMissions.js';
import { getOrbit } from '../data/orbits.js';
import { isCubeSat } from '../data/components.js';
import { getSelection } from './resources.js';

const ORBIT_WEIGHT = 3;
const SIMILAR_ORBIT_WEIGHT = 1.5;   // LEO ≈ SSO
const TAG_WEIGHT = 4;               // × Jaccard overlap (0–1)
const CUBESAT_WEIGHT = 1;
const SIMILAR_ORBITS = [['leo', 'sso']];

const similar = (a, b) => SIMILAR_ORBITS.some((g) => g.includes(a) && g.includes(b));

/** @returns {{ mission, score, sharedTags: string[], sameOrbit: boolean, reason: string }[]} */
export function matchRealMissions(state, limit = 2) {
  const sel = getSelection(state);
  const myTags = new Set(sel.instruments.flatMap((i) => i.tags));
  const myOrbit = sel.orbit?.id ?? null;
  const cubesat = isCubeSat(sel.components.structure);

  return REAL_MISSIONS.map((mission) => {
    const sharedTags = mission.tags.filter((t) => myTags.has(t));
    const union = new Set([...mission.tags, ...myTags]).size;
    const jaccard = union ? sharedTags.length / union : 0;
    const sameOrbit = mission.orbitId === myOrbit;
    const nearOrbit = !sameOrbit && similar(mission.orbitId, myOrbit);
    const score = (sameOrbit ? ORBIT_WEIGHT : nearOrbit ? SIMILAR_ORBIT_WEIGHT : 0)
      + TAG_WEIGHT * jaccard
      + (cubesat && mission.cubesat ? CUBESAT_WEIGHT : 0);

    const parts = [];
    const orbitName = getOrbit(mission.orbitId)?.name ?? mission.orbitId;
    if (sameOrbit) parts.push(`Same orbit: ${orbitName}`);
    else if (nearOrbit) parts.push(`Similar orbit: ${orbitName}`);
    if (sharedTags.length) parts.push(`shared instruments: ${sharedTags.join(', ')}`);
    if (cubesat && mission.cubesat) parts.push('also a CubeSat');
    const reason = parts.join(' · ');
    return { mission, score, sharedTags, sameOrbit, reason };
  })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
