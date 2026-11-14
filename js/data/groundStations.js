// Ground segment: the antennas on Earth that talk to the spacecraft.
// Schema: { id, name, contactHours (h/day for a reference orbit; × orbit.contactFactor, max 24),
//           opsCostPerYear ($M), deepSpace (can reach L2 / Moon / Mars), description }

export const GROUND_STATIONS = [
  {
    id: 'gs_single', icon: "📡", plainName: "One antenna", oneLiner: "Cheap, but only a few short chats a day.", name: 'Single Ground Station', contactHours: 2, opsCostPerYear: 1, deepSpace: false,
    description: 'One antenna at your mission centre. Cheap to run, but a low-orbit satellite is only overhead a few times a day.',
  },
  {
    id: 'gs_global', icon: "🌍", plainName: "Antennas around the world", oneLiner: "Many more chats per day. Costs more each year.", name: 'Global Station Network', contactHours: 6, opsCostPerYear: 3, deepSpace: false,
    description: 'Rent time on antennas spread around the world (including near the poles). Many more passes per day — at a higher operations cost.',
  },
  {
    id: 'gs_dsn', icon: "🌌", plainName: "Giant deep-space dishes", oneLiner: "The only way to hear L2, the Moon or Mars. Expensive.", name: 'Deep Space Network-style Complex', contactHours: 8, opsCostPerYear: 6, deepSpace: true,
    description: 'Three giant 34–70 m dishes about 120° apart around the globe, so a distant spacecraft is always in view of one. The only way to hear L2, the Moon or Mars — and expensive.',
  },
];

const byId = new Map(GROUND_STATIONS.map((g) => [g.id, g]));
export const getGroundStation = (id) => (id ? byId.get(id) ?? null : null);
