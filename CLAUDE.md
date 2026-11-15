# CLAUDE.md — Mission Control (Space Mission Design Game)

## Project goal
A browser game for students (reading level: a 12-year-old): design one of **three real satellite
missions**, pass the hard engineering gates (GO / NO-GO), fly it and learn the trade-offs real
engineers face — **money, mass, power, data** — with **real data only**. Every outcome is **shown**
with an animation and **explained** in one plain sentence built from engine numbers.

**Sources of truth:** `docs/NASA_Hackathon_Mission_Control_Deep_Research_UA.md` (research, S01–S34, §
numbers cited as `ref`) + `docs/OPTIONS_RESEARCH.md` (real alternative options, O01–O56, `ref: 'options §…'`).
Where they disagree on a catalog price, the store price is used and the others are listed in Details.

## Data honesty rule (never break it)
- **Never invent a number.** Every mass, power, price, capacity, altitude, budget and date comes from
  the research. Each data item stores `dataKind` (`fact` | `catalog` | `model` | `reported`) and
  `sources: ['Sxx' | 'Oxx']` (codes in `js/data/sources.js`, S01–S34 + O01–O56 + D01–D10 end of life), plus `ref`.
- UI badges: ✔ Real fact · 🏷 Catalog price · ≈ Estimate · 📰 Reported (press / third-party, never
  official) · ✉️ Price on request (RFQ). Card faces show "💰 ?" / "⚖️ ?" for NOT PUBLIC values and
  "⚖️ ≈" for a same-class research estimate (IoT radios borrow the research SDR mass).
- **Unknown-value rule (options §5):** NOT PUBLIC = `null`, never 0 and never guessed.
  - Unknown price → budget **uncertain** (amber hatched gauge, "N items have no public price"); cost
    efficiency uses known items only; Results say "real engineers would request a quote (RFQ)".
  - Unknown mass (or unknown frame limit) → mass gate **"cannot verify"** = NO-GO, offering a
    **reference build**: a complete real satellite whose total mass is public (Swarm 0.4 kg, Astrocast
    4.5 kg, Sateliot 10 kg, TROPICS 5.4 kg, RainCube 12 kg, GPS III 3,681 kg). Its bus + payload are
    "included"; only add-ons that really flew on it (`flewOn`) can be added.
  - Unknown data rate / contact time → link "not measurable" (info), judged on a complete chain. Details on every
  card show the badge + source links (`ui/card.js#provenance`); catalog anchors (EnduroSat S08/S09,
  GomSpace S18…) are shown as "Real product example" and never mixed into model prices.
- Not public (Electron price, Falcon Heavy profile price) → `costType: 'rfq'`, `priceM: null`: left out
  of the budget and of the efficiency score ("not comparable on cost").
- Values the research does not give stay `null` ("not in our data"), e.g. 3U/12U frame mass, GEO altitude,
  MEO eclipse, the distractor camera.
- **No launch reliability numbers** and no random launch failure (§8.6). Events are labelled
  **simulated**; their rates are game settings, never shown. Real data (NASA GPM, DONKI, EONET) is a
  separate, labelled "real" card with static links — never mixed with simulated mission output.
- Header button **📚 Sources & data honesty** lists every source and the §12.1 limitations.

Solo, or hot-seat team of 2–4 (Director, Engineer, Scientist, Flight Dynamics). UI language: English.

## How to run
```bash
cd space-mission-game
python3 -m http.server        # then open http://localhost:8000
```
- Self-test: `/js/engine/resources.test.html` (title shows PASS/FAIL; 240 checks: data honesty, research
  BOM sums, power/battery/data numbers, every §10 QA case C-01…ALL-02, alternatives vs distractors,
  NO-GO rule, simulation replay, scoring, role goals, votes, sharing, badges, and every PASS build of
  every objective variant + EPS/solar thresholds, uncertain budget, reference-build mass path, disposal strategies + planet impact, design-reactive events).
- Dev tools: `tools/word-count.sh tools/word-count.before.json` (visible words per screen) and
  `tools/options-count.html` (selectable options per mission × step).
- Animation debug page: `/animations.html` — plays every scene in isolation with real sample data.
- No build step, no npm, no libraries, no external assets. Vanilla ES modules.

## Git workflow (follow for every change)
- Repo: https://github.com/artemvalko/space-mission-game · Live: https://artemvalko.github.io/space-mission-game/ (GitHub Pages from `main` root — every push redeploys).
- After every finished change: run `tools/run-tests.sh` (headless self-test). **Never commit if it fails.**
  Then `git add -A && git commit -m "<short clear message>" && git push`.
- Before any big change: `git tag v1-before-<name> && git push origin v1-before-<name>` so we can roll back.
- Keep paths relative (the site lives under `/space-mission-game/`).

## Hard rules
1. **One state object.** All game state lives in the store (`js/state/`); it changes ONLY via
   `dispatch(action)`. The store deep-freezes state (mutation throws).
2. **Actions are plain serializable objects** (`{ type, ...payload }`). Randomness/time comes from the
   caller (`runSimulation(newSeed())`) so the reducer stays pure.
3. **Engine is pure** (`js/engine/*`): state/data in → numbers + plain-English strings out. No DOM,
   no `Math.random`, no `Date`, no storage. Seeded RNG only (`utils/random.js`).
4. **Simulation is seeded and replayable**: same state + seed + decisions → same result.
5. **Data is JS** (`export const …`), with UI fields `icon`, `plainName`, `oneLiner` on parts.
6. View-only UI state (modals, which preview is shown, exploded view, playback) lives in module
   variables in `ui/`; re-render with `ui/view.js#rerender()`. Side effects (localStorage, sound)
   only in `ui/` (and `main.js` subscribers).
7. **Animations**: SVG + CSS + requestAnimationFrame (canvas allowed for instrument pictures), one
   module per scene in `js/ui/animations/`, signature `(container, params) → Promise`. Every scene
   has **Skip ▶▶**, respects `prefers-reduced-motion` (final frame + caption), and is playable from
   `animations.html`. Design-screen animations are ≤ 1 s and never block input.

## UI principles (Phase 1 redesign)
1. **One question per screen**, plain English, 2–4 big choice cards.
2. **Goal always visible**: "Mission Goal" strip with live checklist chips (todo / ✓ / ✗).
3. **Cards show max 3 stats** as simple meters (●●○, $$○, ⚡⚡○) + ONE consequence sentence; exact
   numbers in a collapsed "Details". Plain name first, real term as a grey subtitle (+ glossary).
4. **Four gauges** (💰 Money, ⚖️ Weight, ⚡ Power, 📡 Data) with OK / Tight / Over; everything else in
   the "Details" drawer.
5. **No errors for unchosen things**: unchosen = `todo` severity; a fresh mission shows zero red.
6. **Advisor** ("Flight Director") shows ONE most important message + "Fix it" jump (`engine/advisor.js`).
7. **Live satellite picture** (`ui/satellite.js`): new parts snap in with a glow; exploded view.
8. Colour has meaning only: green OK, amber tight, red over; one accent (blue) for selection.
9. **Word budgets (playtest: players don't read)** — visible by default: question ≤8 words (+ at most one
   hint line ≤12); card = title + ≤3 icon meters + one line ≤10 words (real term, "What is it for?",
   numbers, sources → Details; long text → `about` / Why?); advisor ≤15 words + Fix button; goal strip
   = icon chips; gate message ≤12 words + fix button, requirement/fix/alternative behind "Why?";
   data badges icon-only (✔ 🏷 ≈ ✉️) with tooltips. Screens ≤ ~120 visible words (Results ~200).
   Progressive disclosure, never deletion: everything stays one click away (Details, Why?, folds,
   tooltips, Sources panel). Measure with `tools/word-count.sh tools/word-count.before.json`.
10. **Real choices**: every step shows 2–4 real options up front (rest under "＋N"), impossible ones greyed
   with a one-line reason, a "⚖️ Compare" table, heritage chips ("🛰 TROPICS"), and the Flight Director's
   one-line "Change:" note after each choice. Another mission's research card is a duplicate → hidden.

## The three missions (`js/data/scenarios.js`)
| id | Name | Budget (model) | Correct build (research §13) |
|---|---|---|---|
| `mission_comms_iot` ★ | Connect Remote Sensors | $6.00M | 6U (7.55 → 8.68 kg) · IoT SDR + antennas · UHF TT&C · S-band downlink · LEO 550 · IoT gateways · F9 rideshare + dispenser |
| `mission_weather_mw` ★★ | Weather Under the Clouds | $18.00M | 6U (8.60 → 9.89 kg) · 5-ch radiometer + calibration · UHF TT&C · S-band science · SSO 550–650 · science station · F9 rideshare + dispenser |
| `mission_navigation_meo` ★★★ | Precise Time for Navigation | $280M | ~700 kg bus incl. 110 kg propellant · 4 atomic clocks + nav signal + L-band · C/S-band TT&C · MEO 23,222 km / 56° · GNSS monitoring · F9 dedicated MEO injection ($90M model) + large adapter |

**Objective variants** (`scenario.variants`, chosen as chips on the Mission step, `design.variantId`):
comms *Cheapest coverage / Standard phone chips / Licensed, reliable link*; weather *Global humidity map /
Watch hurricanes often / Measure rain inside storms*; navigation *Join Galileo / GPS-style node*. Each has
a `fit` (dimension → factor) that scales **only** mission performance (`objectives.js#variantFit`) — a
valid but less suitable build is never a failure — and `builds`: real PASS builds (≥2 each), proven by
the self-test and suggested on Results ("Other valid builds").

Each mission has an **impossible claim** lesson (`impossibleClaim`, `objectives.js#checkClaim`): one LEO
satellite ≠ 24/7 coverage; one GNSS satellite ≠ 3D positioning (needs ≥4 in view); one 18-month CubeSat
≠ a climate trend (+ "every cyclone every hour" needs a constellation).

## Flow (screens = `SCREENS` in `state/actions.js`; metadata in `ui/steps.js`)
| # | Screen id | Step | Owner (team) |
|---|---|---|---|
| 0 | `start` | Start: solo / team (names + roles) / How to play, Easy–Normal, leaderboard, badges | — |
| 1 | `pickMission` | Three mission cards (stars, model budget, real mission inspiration) | Director |
| 2 | `size` | 3U / 6U / 12U / large bus; wrong sizes greyed with a reason | Engineer |
| 3 | `science` | **Mission payload** (+ Timing for nav, + Calibration for weather) + distractors with "why not" | Scientist |
| 4 | `power` | Solar array + battery (Easy: power pack), eclipse explanation | Engineer |
| 5 | `comms` | **Talking to Earth**: control radio (TT&C) ≠ mission downlink + ground segment | Flight |
| 6 | `brains` | **Bus systems**: computer + pointing (real choices); thermal + cables + sensors = one "included" line (Normal; Easy = research kit; navigation: fixed inside the platform, step hidden) | Engineer |
| 7 | `orbit` | Orbit (true relative scale, ground track illustration, GEO as distractor, GPS info card) | Flight |
| 8 | `rocket` | **Rocket & adapter**: price-type badges, dispenser/adapter, "What's inside this rocket?", balance scale | Flight |
| 9 | `launchPrep` | Checklist: tests (vibration, TVAC, EMC), frequency licence/ITU + **How will it retire?** (3 strategy cards with 🛰️ ☁️ 🧍 meters; burn-up speed = natural decay / drag sail / broadside, folded; docking-plate add-on) | Director |
| 10 | `finalCheck` | Flight Readiness Review: 11 hard gates, full cost table, role goals, votes, LAUNCH / NO-GO + "Simulate what would happen" | Director |
| 11 | `operations` | Go/No-Go console → montage → countdown → orbit view with simulated events | Flight |
| 12 | `results` | Grade, KPIs, lesson card (+ constellation animation), your design vs the real thing, alternatives, real NASA data, log, compare, share | Director |

Launch needs no `todo`/`error` issues and (team) a majority Go. A NO-GO design can only be
**simulated anyway** (`runSimulation(seed, true)`): it plays the first failed gate and is recorded as a
failed mission (grade F).

## Folder responsibilities
| Path | Responsibility |
|---|---|
| `index.html` | Shell: top bar, `#goal-strip`, `#step-list`, `#screen`, `#sidebar`; `modulepreload` list. |
| `animations.html` | Debug page: every scene with sample states/simulations. |
| `css/main.css` · `components.css` · `animations.css` · `print.css` | Theme/layout · UI components · scenes · mission-report printing. |
| `js/main.js` | Store, render loop, autosave + badge unlock, share-link loading, card tilt, warp, mute. |
| `js/state/*` | `store.js`, `actions.js` (types, creators, `SCREENS`), `reducer.js`, `initialState.js`. |
| `js/data/*` | `sources.js` (S01–S34, `DATA_KIND`, limitations), components (bus parts + `CATEGORY_PLAIN`, `SIZE_CLASSES`), instruments (mission payloads + `ROLE_INFO`), orbits, launchers (+ `DEPLOYERS`, `ROCKET_PARTS`, `COST_TYPE`), ground stations, scenarios, events, roles, real missions, glossary, `bundles.js` (power packs + research kits + `applyBundles`). |
| `js/engine/resources.js` | `computeResources(state)`, `getSelection`, constants. |
| `js/engine/validation.js` | `validateDesign` → `{ severity, gate, resource, step, message, why, fix, alternative }`, `GATES`, `gateStatus`, `canLaunch`. |
| `js/engine/advisor.js` · `goals.js` | One advisor message · goal-strip chips. |
| `js/engine/simulation.js` | `runSimulation(state, seed, decisions, { autoChoice })`, `operatingConditions`. |
| `js/engine/objectives.js` · `outcome.js` | Mission KPIs, `satelliteSuccess`, `constellationStatus`, `checkClaim` · captions/tips/effect chips. |
| `js/engine/scoring.js` · `roleGoals.js` · `achievements.js` · `attempt.js` | Score/grade/insights/tips · role goals + vote rules · badges · saved-attempt records. |
| `js/engine/matching.js` · `explain.js` | Real analog + alternative architectures · "Why?" texts + delta previews. |
| `js/ui/router.js` · `steps.js` | Step list, question header, owner badge, Back/Next. |
| `js/ui/sidebar.js` · `goalStrip.js` · `satellite.js` · `card.js` | Gauges/advisor/details · goal chips · live satellite SVG · choice cards + meters. |
| `js/ui/screens/*.js` | One module per screen: `render(container, state, dispatch)` (use `mount()` not `append`). |
| `js/ui/animations/*.js` | One module per scene (see below) + `core.js` (play, stage, helpers) + `index.js` registry. |
| `js/ui/storage.js` · `gallery.js` · `sound.js` · `view.js` · `tooltip.js` · `dom.js` | localStorage (attempts, leaderboard, badges) · mission pictures · WebAudio · re-render hook · popovers · `h/s/mount`. |
| `js/utils/*` | `format.js`, `random.js` (mulberry32), `share.js` (URL-hash encode/decode). |

## Data schema (extend, never invent numbers)
- **Part** (`components.js`, `instruments.js`): `{ id, category, icon, plainName, name (real term), oneLiner,
  why ("What is it for?"), mass|null, cost|null, costByMission?, formFactor: 'cubesat'|'large'|'any',
  missions, status: 'must'|'recommended', dataKind, sources, ref, realExample? }` + category fields
  (`maxMassKg`, `units`, `reserveFraction`, `targetMassKg`, `arrayW`, `capacityWh`, `rateMbps`, `serves`,
  `storesPackets`, `volumeU`, `role`).
- Bus categories (`design.components`): structure, power, battery, comms (= TT&C), downlink, computer,
  adcs, thermal, sensors, harness, propulsion, propellant. A category may hold `'none'` (left out on
  purpose → a hard-gate error if the mission requires it). Payload categories: service_payload, timing,
  calibration (all in `design.instrumentIds`).
- **Orbit**: `altitudeKm|[min,max]|null, inclinationDeg, sunlitFraction|null, eclipseMinutes|null, infoOnly?`.
- **Launch service**: `costType: published|modeled|rfq, priceM|null, priceFn?, publishedAnchor?,
  capacityKg: { orbitId: kg|null }` (key present = reaches; null = no published number), `adapters`,
  `overkillFor`, `deliversTo` (GTO-only). **Deployer**: `dep_cubesat` (limit = frame `maxMassKg`) /
  `dep_large_adapter` (included in launch price).
- **Scenario**: `budgetM, deadlineMonths, minMonths, simMonths, size, requiredRoles, requiredBus,
  recommendedOrbits, allowedOrbits, orbitWhy, groundServes, costModel {ait, licensing, ops, reserve},
  powerModel {avgLoadW, peakLoadW?}, data {kind: packets|gb|nav}, kpis, impossibleClaim, payloadWhyNot`.

## State shape
```js
{
  screen, mode: 'solo'|'team', difficulty: 'easy'|'normal', players: [{ name, roleId }], activeRoleId,
  scenarioId,
  design: { components: { structure, power, battery, comms, downlink, computer, adcs, thermal, sensors,
                          harness, propulsion, propellant },   // id | 'none' | null
            instrumentIds: [], orbitId, launcherId, deployerId, groundId,
            powerPack, kit: null|'standard', prep: { tests, licence, disposal },
            variantId, satsPerLaunch, disposalId, dockingPlate },
  votes, voteReasons, simulation: null | { …, noGo }, score,
}
```
Easy: `kit: 'standard'` = the research build list for the mission; power packs = array + battery.
Bundle mass/cost are always the sum of their parts (`bundleTotals`). Switching CubeSat ↔ large bus drops
wrong-size parts and payloads (→ todo). Selecting another mission starts a fresh design.

## Formulas (engine/resources.js — research §8)
- **Mass**: 6U → Σ parts × 1.15 (design reserve) vs frame/dispenser limit 3U 6 · 6U 12 · 12U 24 kg (S01);
  Galileo-class → Σ parts incl. 110 kg propellant vs 700 kg target (no extra 15%). Launcher headline
  capacity at the chosen orbit also limits. Volume: radiometer ~4U (S07).
- **Power**: `array_W × sunlit_fraction × 0.80` (LEO 0.60, SSO 0.67) vs mission duty-cycle load (15 W, 17 W,
  1.1 kW avg / 1.5 kW peak). MEO: array class 1.6 kW (no single eclipse value in the research).
- **Battery**: `Wh × 0.6` vs `load × 35/60 h` (comms 36 vs 8.75 Wh; weather 48 vs 9.92 Wh).
- **Data**: weather `Mbps × contact_s / 8 / 1000` = 2.25 GB/day theoretical vs 2 GB/day; IoT = packet
  chain; navigation = broadcast chain (not GB/day).
- **Budget**: hardware + AIT + launch + dispenser + ground + licensing + ops; reserve = what is left
  (correct builds leave exactly the research reserve 0.59 / 2.61 / 20 $M).
- No lifetime bonus from thrusters; the mission flies its planned months (`simMonths`).

## End of life / planet impact (data/disposal.js, resources.planet — DISPOSAL.md)
- Strategies: `disp_burn_up` 🔥 (sub-options = `eol_*` parts), `disp_controlled_ocean` 🌊, `disp_leave_in_orbit` 🛰️
  (MEO: disposal orbit); add-on `addon_docking_plate` (D07, mass/price null → budget uncertain, not in mass check).
  `design.disposalId` / `design.dockingPlate`; `selectDisposal` also ticks `prep.disposal` (old designs default:
  burn-up in LEO, disposal orbit in MEO).
- Validity (`disposalWhyNot`, gate `legal_safety_disposal_plan_pass`): leave-in-orbit in low orbits = NO-GO (S22);
  ocean reentry: CubeSats have no thrusters (D05), MEO "not in our data"; burn-up in MEO impossible; MEO disposal
  orbit needs thrusters + propellant. Large-sat burn-up → caution "1-in-10,000 rule" (D04).
- `resources.planet`: `debrisScore`, `atmosphereKg` = launch mass × 0.12 (**model**, "≈ science estimate (Ferreira
  2024)"), `groundRisk` ok | needs-controlled | n.a., per-option meters/score, `best`, fleet multiplier
  (`reference.fleet`: Swarm 150, Astrocast 64, TROPICS 4). Meter points are game scores, not data.
- Events react to the design (`simulation.js#eventChoices/eventContext`): thruster dodge, spare computer
  (obc_si_quad), rad-hard halves storm damage, low battery margin note, MEO radiation-belt note, and the
  end-of-mission "Extend or retire?" event. Multipliers only; chosen label/effects stored in the event log.
- Drag sail = HPS ADEO (D09, vendor fact): auto-sized in `computeMass` via `disposal.js#dragSailFor` — ADEO small 0.45 kg
  (1–20 kg sats, ≤6U) or ADEO 0.8 kg (5–50 kg, 12U / references), added after the design reserve; none fits → NO-GO.
  Price NOT PUBLIC → budget uncertain. Effect "6–10× quicker" is a 📰 manufacturer claim (D10), used only as
  "Deorbits much faster: meets the 5-year rule" — no invented years.
- Lost in flight (`scoring.js#retirementAfterLoss`): only natural decay still works ('passive', keeps points). Drag
  sail, broadside, ocean reentry, disposal orbit need a working satellite → 'failed': debris 0/15 + "Lost before it
  could retire: now it is space junk." in Results — unless a docking plate was fitted ('tug': debris kept, budget uncertain).

## Hard gates (engine/validation.js — §8.5)
orbit_service_compatible · spacecraft_size_mass_volume_compatible · mandatory_payload_complete ·
bus_support_complete · launcher_trajectory_compatible · launch_adapter_compatible ·
ground_network_compatible · power_peak_and_average_pass · battery_eclipse_pass ·
communications_link_pass · legal_safety_disposal_plan_pass. Each failed gate = `error` (NO-GO) with
`why` (requirement), `fix` (card) and `alternative` (other correct architecture or null). Unchosen = `todo`.
Over the model budget is a `warning` (objective fails), not a gate.

## Mission KPIs & scoring (objectives.js, scoring.js)
- comms: packet delivery ≥95% (simulated), ground contact, latency (honest: next pass), power margin, safe deorbit.
- nav: clock reference, ranging signal, orbit achieved/known, nav message → `satellite_success`;
  `constellation_success` needs ≥4 visible satellites — shown, never achievable with one.
- weather: valid samples ≥90%, calibration, data delivered ≥95%, coverage (SSO + sensors), GPM comparison.
- Plus service period, model budget, schedule window.
- Score: Mission performance 35% (KPIs 70% + simulated service 30%) · Objectives 25% · Efficiency 15%
  (mass margin [large bus: within 700 kg], power margin, budget left — skipped if launch is RFQ) ·
  Survivability 15% · Teamwork 10% (solo redistributes) · + **Sustainability** bonus up to 40 (debris 15 · atmosphere 15 ·
  ground 10 from the chosen retirement; no option gets 40; "best possible for your orbit" shown; extending the mission
  costs debris points). NO-GO runs → F.
- Role goals: Director = model budget + schedule + licence & disposal; Engineer = mass/power margins ≥10%
  + thermal; Scientist = all KPIs; Flight = recommended orbit + rocket reaches it + working link.

## Simulation (engine/simulation.js)
`outcome`: `pending | scrubbed | too_heavy | wrong_orbit | lost | partial | success`; `failureCause`:
`prep | mass | orbit | power | comms | hardware | payload`. GO designs always reach orbit. Simulated events
(`perYear` game rates) change `performance`, spend `reserveShare` of the model reserve, or add `damage`
(2 = lost). Seeded and replayable.

## Animation system (js/ui/animations/)
`core.js#play(container, { scene, label, duration, setup, caption, hold, linger, overlay, onStart })`
creates the stage (SVG 800×450 + HTML layer + caption + actions + Skip), runs frames, and resolves with
the clicked button value. `nextFrame` uses rAF (test hooks: `window.__animTimerFrames` drives frames
with timers in headless Chrome; `window.__animFreeze` freezes for screenshots).

| Scene | Module | Used by |
|---|---|---|
| Countdown & liftoff · launch success · too heavy / wrong orbit (NO-GO simulated) | `countdown`, `launchSuccess`, `tooHeavy` | Operations |
| Orbit view (LEO / SSO / MEO at true relative scale with 56° tilt / GEO; power dead, comms loss, HUD, timeline) | `orbitView` | Operations |
| Simulated events: solar storm · debris · hardware fault · budget cut / launch delay · huge storm (weather) | `solarFlare`, `debris`, `hardwareFailure`, `cardFlip`, `discovery` (`EVENT_SCENES`) | Operations |
| Mission success · partial · lost · end of life (deorbit / leave MEO / no disposal plan) | `missionSuccess`, `missionPartial`, `missionLost`, `endOfLife` (+ `patch.js`) | Operations |
| Retirement: burn up (oxide cloud → ozone band) · controlled ocean reentry (Point Nemo) · docking-plate tug | `burnUp`, `oceanReentry`, `tugRemoval` | Operations (by chosen strategy) |
| Go/No-Go console (also NO-GO / scrubbed) · factory-to-pad montage | `goConsole`, `montage` | Operations |
| What your payload does (IoT store-and-forward, GNSS clock + ranging, radiometer vs RGB — illustrations) · balance scale · ground track / stations map | `instrumentView`, `balanceScale`, `groundTrack` | Payload, Rocket, Orbit, Comms steps |
| 1 satellite → no fix, 4 → 3D fix | `constellation` | Results (navigation lesson) |

Also: card tilt + step warp (CSS, `main.js`), exploded satellite view (`satellite.js`, Final check),
animated start screen (`screens/start.js`), team reaction avatars (`screens/operations.js`), sounds
(`ui/sound.js`, mute in header, saved in localStorage).

## Storage (ui/storage.js — localStorage, all wrapped in try/catch)
- `missionControl.attempts.v1`: finished attempts (`engine/attempt.js` record: scenario, design, summary,
  score parts, total, grade, team, date). Saved once per attempt key (design + seed + decisions).
- Top-10 leaderboard per scenario (start screen); "Compare attempts" (Results) vs the previous one.
- `missionControl.badges.v1`: unlocked badges (Penny Pincher, Every Bit Home, Survivor, Featherweight, Perfect Team).
- `missionControl.muted`: sound on/off.
- Share design: `#d=<base64url JSON>` (`utils/share.js`); opening the link loads it into Final check
  (`LOAD_DESIGN` sanitises unknown ids).

## Conventions
- `mount(el, …children)` (skips null/false) instead of `Element.append` in screens.
- New JS module? Add it to the `modulepreload` lists in `index.html`, `animations.html` and the test
  page (between the `modulepreload:start/end` markers) — parallel loading, and reliable headless tests.
- Ids `snake_case` with prefixes (`pwr_`, `ins_`, `lv_`, `gs_`); action types `'domain/verbNoun'`.
- Every number shown has an explanation nearby (Why?, glossary `term()`, Details).
- Keep `resources.test.html` passing; add a demo to `animations.html` for every new scene.

## Roadmap (next)
1. Optional navigation path "LEO-PNT demo (Celeste-style)" (§4.8) — only real anchors, RFQ for parts.
2. Live NASA data (DONKI, GPM) behind an API key, with the static-link fallback kept.
3. Online multiplayer: sync the action log (`store.getLog()`); every client runs the same pure reducer.
