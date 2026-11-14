// Human-readable "why" texts for trade-offs. PURE: returns strings only.

import { kg, watts, money, gbDay, num, signed, pct } from '../utils/format.js';

export const CATEGORY_WHY = {
  structure: 'The structure is the skeleton. Bigger frames carry heavier instruments but add mass, cost and build time.',
  power: 'Everything on board runs on electricity. Solar panels are light and cheap but need sunlight; an RTG works anywhere but is heavy and very expensive.',
  battery: 'When the planet hides the Sun (eclipse), only the battery keeps the spacecraft alive. Longer eclipses and higher power use need bigger batteries.',
  comms: 'All your science is worthless if it never reaches Earth. Faster radios use more power; far from Earth only a deep-space antenna is good enough.',
  computer: 'The computer runs the spacecraft and stores data until the next contact. Radiation-hardened computers survive longer but cost more.',
  adcs: 'Attitude control points the spacecraft. Steadier pointing gives sharper images and a science bonus, but costs power, mass and money.',
  propulsion: 'Engines are needed to reach the final orbit, avoid debris and fight drag. More Δv means a longer mission — and more propellant mass.',
};

export function whyComponent(c) {
  const parts = [c.description];
  switch (c.category) {
    case 'structure': parts.push(`Can carry up to ${kg(c.maxPayloadMass)} of instruments.`); break;
    case 'power': parts.push(c.type === 'rtg'
      ? `Steady ${watts(c.outputW)} anywhere, day or night.`
      : `Up to ${watts(c.outputW)} in full sunlight at Earth's distance — less in shadow or far from the Sun.`); break;
    case 'battery': parts.push(`${num(c.capacityWh)} Wh stored, ~60% usable each eclipse.`); break;
    case 'comms': parts.push(`${num(c.rateMbps)} Mbps near Earth.${c.deepSpace ? ' Works in deep space.' : ' Not designed for deep space.'}`); break;
    case 'computer': parts.push(`${num(c.storageGB)} GB of onboard storage.`); break;
    case 'adcs': parts.push(`Pointing ${c.pointingAccuracy}; science ×${num(c.scienceBonus, 2)}.`); break;
    case 'propulsion': parts.push(`Δv ${num(c.deltaV)} m/s, adds ${num(c.lifetimeBonusYears)} yr of lifetime.`); break;
    default: break;
  }
  parts.push(`Reliability ${pct(c.reliability, 1)}${c.tier === 'advanced' ? ' — advanced tech: better performance, higher cost.' : '.'}`);
  return parts.join(' ');
}

export function whyInstrument(ins, orbit) {
  let text = `${ins.description} Produces ${gbDay(ins.dataGBperDay)} and ${num(ins.science)} base science points.`;
  if (orbit) {
    const good = ins.tags.some((t) => orbit.goodFor.includes(t));
    text += good
      ? ` ${orbit.name} is a good place for it (science ×1.3).`
      : ` ${orbit.name} is not ideal for it (science ×0.8).`;
  }
  return text;
}

export function whyOrbit(o) {
  return `${o.description} ${o.coverage} Shadow: ${pct(o.eclipseFraction)} of each orbit. Sunlight: ${pct(o.solarIntensity)}. Ground contact ×${num(o.contactFactor, 2)}${o.requiresDeepSpaceGround ? ' (needs a deep-space ground segment)' : ''}. Needs Δv ${num(o.requiredDeltaV)} m/s.`;
}

export const GROUND_WHY = 'Antennas on Earth receive your data and send commands. More stations around the globe mean more contact hours per day — but every station costs money each year. Far-away spacecraft can only be heard by huge deep-space dishes.';

export function whyGround(g, orbit) {
  let text = `${g.description} Base contact ${num(g.contactHours)} h/day, ${money(g.opsCostPerYear)} per year to operate.`;
  if (orbit) {
    if (orbit.requiresDeepSpaceGround && !g.deepSpace) text += ` It cannot reach ${orbit.name} at all.`;
    else text += ` At ${orbit.name}: ${num(Math.min(24, g.contactHours * orbit.contactFactor), 1)} h/day of contact.`;
  }
  return text;
}

export function whyLauncher(l, orbit) {
  let text = l.description;
  if (orbit) {
    const cap = l.capacityKg[orbit.id];
    text += cap == null ? ` It cannot reach ${orbit.name}.` : ` It can lift ${kg(cap)} to ${orbit.name}.`;
  }
  return `${text} Success rate ${pct(l.reliability)}.`;
}

/**
 * Compare two computeResources() results and describe what changes,
 * e.g. "+40 kg, +120 W, +$15M". Used for hover previews on cards.
 */
export function formatDelta(before, after) {
  const parts = [];
  const add = (d, fmt, suffix = '', eps = 0.05) => {
    if (d != null && Math.abs(d) > eps) parts.push(signed(d, fmt) + suffix);
  };
  add(after.mass.used - before.mass.used, kg);
  add(after.power.used - before.power.used, watts, ' use');
  if (before.power.available != null || after.power.available != null) {
    add((after.power.available ?? 0) - (before.power.available ?? 0), watts, ' gen');
  }
  add(after.budget.used - before.budget.used, money);
  add(after.data.used - before.data.used, gbDay);
  if (after.data.available != null && before.data.available != null) {
    add(after.data.available - before.data.available, gbDay, ' link');
  }
  add(after.science.value - before.science.value, (n) => `${num(n)} sci`, '', 0.5);
  if (before.health.value && after.health.value) add((after.health.value - before.health.value) * 100, (n) => `${num(n, 1)}%`, ' health', 0.05);
  return parts.length ? parts.join(', ') : 'no change';
}
