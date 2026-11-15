# Mission Control — Real Satellite Missions Game

**▶ Play it live: https://artemvalko.github.io/space-mission-game/**

Mission Control is an educational browser game. You design **one of three real-world satellite missions**,
pass the engineering **GO / NO-GO** review, launch it and operate it, while managing mass, power,
budget and data. Every choice is a trade-off. Every outcome is animated and explained in plain English.
Play solo or as a team of 2–4 on one screen. Plain HTML, CSS and JavaScript: no build step, no libraries.

## The three missions
| Mission | Difficulty | What you build | Real mission inspiration |
|---|---|---|---|
| 📡 **Connect Remote Sensors** | ★ | A 6U CubeSat in low orbit (~550 km) that stores short messages from remote IoT sensors and forwards them over ground gateways. Model budget $6M. | Sateliot (6U IoT CubeSats by Alén Space) |
| 🌦️ **Weather Under the Clouds** | ★★ | A 6U CubeSat with a passive 5-channel microwave radiometer + calibration in a sun-synchronous orbit (550–650 km), compared with NASA GPM data. Model budget $18M. | NASA TEMPEST-D and TROPICS |
| 📍 **Precise Time for Navigation** | ★★★ | One ~700 kg Galileo-class navigation satellite with 4 atomic clocks and an L-band signal in MEO (23,222 km, 56°). Model budget $280M. | ESA Galileo FOC |

Every step offers **several real options** (EnduroSat frames, panels and EPS batteries, real radios,
CubeSpace / Blue Canyon pointing units, OBCs, AWS / KSAT ground stations, Electron, Ariane 62, ISS
deploy…) and you can also fly a **complete real satellite** (Swarm, Astrocast, Sateliot, TROPICS,
RainCube, GPS III) using its public total mass. Pick a **goal** for your mission — e.g. *Watch hurricanes
often* or *Measure rain inside storms* — and different builds can each be right. Use **⚖️ Compare** to
see options side by side.

Each mission also teaches one **impossible claim**: one low satellite ≠ 24/7 worldwide service; one
navigation satellite ≠ a 3D position (that needs ≥4 in view); one 18-month CubeSat ≠ a climate trend.

## How to run locally
```bash
git clone https://github.com/artemvalko/space-mission-game.git
cd space-mission-game
python3 -m http.server 8000
# open http://localhost:8000
```
Self-test: `http://localhost:8000/js/engine/resources.test.html` (or `tools/run-tests.sh` headless).
Animation debug page: `http://localhost:8000/animations.html`.

## How to play
1. **Start**: play solo or as a team (names + roles), Easy or Normal.
2. **Pick a mission**: the goal and checklist stay at the top of the screen.
3. **Build it, one question per step**: size → mission payload → power → talking to Earth →
   (Normal: bus systems) → orbit → rocket & adapter → launch prep (tests, licence, and **how it retires**: burn up / controlled fall into the ocean / leave in orbit).
4. **Final check (Flight Readiness Review)**: 11 hard gates, a full cost breakdown and team votes.
   A failed gate is **NO-GO**. The review shows what is broken, which card fixes it, and whether
   another correct design exists. You can still *simulate what would happen* (recorded as a failed mission).
5. **Mission**: Go/No-Go poll, factory-to-pad montage, countdown, then your satellite flies.
   Simulated events (solar storms, debris, faults) stop the clock, and you decide what to do.
6. **Results**: grade, mission KPIs, the lesson, your design vs the real mission, alternative
   correct architectures, links to real NASA data, badges, compare and share.

The four gauges (💰 Money, ⚖️ Mass, ⚡ Power, 📡 Data) are green when OK, amber when tight and red
when over. 🔊 mutes sound; animations respect "reduce motion".

## Data sources
**Real data only.** Every number comes from the research document
[`docs/NASA_Hackathon_Mission_Control_Deep_Research_UA.md`](docs/NASA_Hackathon_Mission_Control_Deep_Research_UA.md)
(sources checked on 15 November 2026). Each card's *Details* shows a badge and a source link:

- **✔ Real fact**: confirmed by an official source (ESA, NASA, SpaceX, Rocket Lab, CubeSat spec).
- **🏷 Catalog price**: a public catalog price or spec of one product (not a quote for a mission).
- **≈ Estimate**: an educational estimate from the research (part breakdowns, mission budgets). Never official.
- **📰 Reported**: a press or third-party figure (e.g. Electron ~$7.5M). Never official.
- **💰 ? / ⚖️ ?**: the price or mass is **not public**. The game never guesses: an unknown price makes the
  budget *uncertain* (real engineers would ask for a quote), an unknown mass cannot be verified — fly a
  real satellite whose total mass is public instead.
- **✉️ Price on request (RFQ)**: not public, so the game never invents one.

Options supplement: [`docs/OPTIONS_RESEARCH.md`](docs/OPTIONS_RESEARCH.md) (O01–O56: EnduroSat, GomSpace, CubeSpace, Blue Canyon, ISISPACE, Space Inventor, AWS, KSAT, Swarm, Astrocast, Lacuna, Rocket Lab, NASA TROPICS / TEMPEST-D / RainCube, Spire, GPS III, Galileo L12–L14).
End-of-life sources: D01–D12 (HPS ADEO drag sail D09–D10, ENPULSION NANO ion thruster D11–D12, Ferreira 2024 GRL on aluminium oxide from reentries, NOAA/PNAS stratospheric metals, ESA re-entry safety and Clean Space, Point Nemo, Astroscale ELSA-M, FCC 5-year rule).

### Planet impact (end of life)
Every mission chooses how its satellite retires. Each option shows three meters — 🛰️ debris, ☁️ atmosphere, 🧍 ground risk —
and none is perfect (Sustainability is scored out of 40; no option gets 40). Burning up releases aluminium oxide:
**≈ launch mass × 0.30 × 0.40 = mass × 0.12** (a science estimate from Ferreira 2024, always badged; a 6U of 8.68 kg ≈ 1.0 kg).
Low orbits can't stay up (5-year rule), CubeSats can't do a controlled ocean reentry (no thrusters), and MEO
satellites can only move to a disposal orbit.

Main sources: CubeSat Design Specification (S01), GPS.gov (S02), ESA Galileo (S04, S05, S15, S30),
NASA TROPICS (S06), NASA/JPL TEMPEST-D (S07), EnduroSat (S08, S09), SpaceX Rideshare / Falcon 9 /
Capabilities & Services / Falcon Heavy (S11, S12, S14, S21), Rocket Lab Electron (S13), NOAA GOES-R (S16),
NASA Small Spacecraft SoA (S17), ITU (S20), FCC debris rule (S22), NASA GPM / EONET / DONKI (S23–S26),
Alén Space / Sateliot (S31), ESA Celeste (S32–S34). The full list with URLs is in the
in-game **📚 Sources & data honesty** panel and in [`js/data/sources.js`](js/data/sources.js).

Launch reliability percentages are not shown, because there is no honest single number for them.
Events during the mission are simulated and labelled that way. Real NASA data is shown separately and
labelled real.

For developers: see [`CLAUDE.md`](CLAUDE.md).
