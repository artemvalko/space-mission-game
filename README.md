# Mission Control — Space Mission Design Game

**Design a real space mission. Stay on budget. Get the science.**

Pick a mission (spot forest fires, relay calls from the Moon, photograph the first galaxies…), answer
one simple question per step to build your satellite, launch it — and watch what happens. Every
choice costs money, weight, power or data, and every outcome is shown with an animation and explained
in one sentence. Play solo or as a team of 2–4 on one screen.

## Run it
```bash
cd space-mission-game
python3 -m http.server
# open http://localhost:8000
```
No install, no build, no internet needed — plain HTML, CSS and JavaScript modules.

- Self-test: `http://localhost:8000/js/engine/resources.test.html`
- All animations in one place (for demos): `http://localhost:8000/animations.html`

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
