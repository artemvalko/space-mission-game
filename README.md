# Mission Control — Space Mission Design Game

**▶ Play it live: https://artemvalko.github.io/space-mission-game/**

Mission Control is an educational browser game: you design a real space mission (a fire-spotting satellite, a lunar relay, a deep-space telescope, a Mars orbiter…), launch it and operate it — while managing mass, power, budget, data and time. Every choice is a trade-off, every outcome is animated and explained in plain English. Play solo or as a team of 2–4 on one screen. Built for a hackathon with plain HTML, CSS and JavaScript — no build step, no libraries.

## How to run locally
```bash
git clone https://github.com/artemvalko/space-mission-game.git
cd space-mission-game
python3 -m http.server 8000
# open http://localhost:8000
```

## Controls & flow
- **Mouse / touch**: click cards to choose; hover a card to preview what changes; **Why?** buttons and dotted words explain terms.
- **Keyboard**: Tab to move, Enter/Space to choose, Esc closes pop-ups.
- **Flow**: Start → Pick a mission → Size → Science tools → Power → Talking to Earth → (Normal: Brains & steering) → Orbit → Rocket → Final check & 🚀 Launch → Mission (decide on events; Pause / 1× / 4× / Skip ▶▶) → Results.
- 🔊 in the top bar mutes sound.

## How to play
1. **Start** — Play solo or as a team (names + roles), Easy or Normal. "How to play" explains it in 30 seconds.
2. **Pick a mission** — your goal and checklist stay at the top of the screen.
3. **Build it, one question at a time** — size, science tools (see what each one sees!), power,
   talking to Earth, (Normal: brains & steering), orbit (with a ground-track map), rocket (with a balance scale).
4. **Final check** — your satellite (try the exploded view), goals, the Flight Director's report,
   team votes, then 🚀 LAUNCH.
5. **Mission** — Go/No-Go poll, factory-to-pad montage, countdown, then your satellite flies. Solar
   flares, debris and breakdowns stop the clock — decide what to do.
6. **Results** — grade S–F, what went well and what hurt, tips, badges, pictures from your mission,
   real missions like yours, compare with your last try, print or share your design.

The four gauges on the right (💰 Money, ⚖️ Weight, ⚡ Power, 📡 Data) are green when OK, amber when
tight and red when over. The 🧑‍🚀 Flight Director always tells you the most important thing to fix.

Sound can be muted with 🔊 in the top bar. Animations respect your system's "reduce motion" setting.

For developers: see [`CLAUDE.md`](CLAUDE.md).
