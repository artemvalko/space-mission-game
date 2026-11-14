// Launch vehicles (fictional). capacityKg: payload mass per orbit id; a missing key = cannot reach.

export const LAUNCHERS = [
  {
    id: 'lv_rideshare', icon: "🎟️", plainName: "Ride-share seat", oneLiner: "Tiny and cheap — for CubeSats only.", heightRel: 0.55, name: 'Rideshare Slot', size: 'rideshare', cost: 1.5, reliability: 0.95,
    capacityKg: { leo: 24, sso: 20 },
    description: 'Buy a seat for a CubeSat on someone else\'s rocket. Very cheap — but you go where the main passenger goes, and only small satellites fit.',
  },
  {
    id: 'lv_sparrow', icon: "🚀", plainName: "Small rocket", oneLiner: "For light satellites in low orbits.", heightRel: 0.6, name: 'Sparrow-1', size: 'small', cost: 15, reliability: 0.94,
    capacityKg: { leo: 500, sso: 400 },
    description: 'Small, cheap rocket for light satellites in low Earth orbit. Newer design, a bit less proven.',
  },
  {
    id: 'lv_kestrel', icon: "🚀", plainName: "Medium rocket", oneLiner: "Reliable. Can send small probes to the Moon or Mars.", heightRel: 0.8, name: 'Kestrel-M', size: 'medium', cost: 60, reliability: 0.97,
    capacityKg: { leo: 5000, sso: 4000, geo: 1500, heo: 2500, l2: 1200, lunar: 900, mars: 500 },
    description: 'Reliable medium launcher with an upper stage that can send small probes beyond Earth.',
  },
  {
    id: 'lv_leviathan', icon: "🚀", plainName: "Heavy rocket", oneLiner: "Lifts almost anything anywhere. Very expensive.", heightRel: 1, name: 'Leviathan Heavy', size: 'heavy', cost: 150, reliability: 0.96,
    capacityKg: { leo: 20000, sso: 16000, geo: 7000, heo: 10000, l2: 6000, lunar: 5000, mars: 4000 },
    description: 'Huge rocket for the biggest observatories and interplanetary missions. Expensive!',
  },
];

const byId = new Map(LAUNCHERS.map((l) => [l.id, l]));
export const getLauncher = (id) => (id ? byId.get(id) ?? null : null);
