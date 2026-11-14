# CLAUDE.md — Mission Control (Space Mission Design Game)

## Project goal
A browser game for students (reading level: a 12-year-old): design a space mission, fly it, and
learn the trade-offs real engineers face — **money, weight, power, data**, plus lifetime, toughness
(reliability) and science. Every outcome is **shown** with an animation and **explained** in one
plain sentence built from engine numbers. Solo, or hot-seat team of 2–4 (Director, Engineer,
Scientist, Flight Dynamics). UI language: English.

## How to run
```bash
cd space-mission-game
python3 -m http.server        # then open http://localhost:8000
```
- Self-test: `/js/engine/resources.test.html` (title shows PASS/FAIL; 165 checks: formulas, guided
  flow, simulation replay, Monte-Carlo balance, outcomes, scoring, votes, sharing, badges).
- Animation debug page: `/animations.html` — plays every scene in isolation with real sample data.
- No build step, no npm, no libraries, no external assets. Vanilla ES modules.

## Hard rules
1. **One state object.** All game state lives in the store (`js/state/`); it changes ONLY via
   `dispatch(action)`. The store deep-freezes state (mutation throws).
2. **Actions are plain serializable objects** (`{ type, ...payload }`). Randomness/time comes from the
   caller (`runSimulation(newSeed())`, `relaunch(newSeed())`) so the reducer stays pure.
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

## Flow (screens = `SCREENS` in `state/actions.js`; metadata in `ui/steps.js`)
| # | Screen id | Step | NASA phase | Owner (team) |
|---|---|---|---|---|
| 0 | `start` | Start: Play solo / team (names + roles) / How to play, Easy–Normal, leaderboard, badges | — | — |
| 1 | `pickMission` | Pick a mission (icon, one line, stars, budget) | Concept | Director |
| 2 | `size` | Satellite size: CubeSat (3U/6U/12U) / Small / Medium / Large | Trade study | Engineer |
| 3 | `science` | Science tools (+ "What your instrument sees") | Trade study | Scientist |
| 4 | `power` | Easy: power pack S/M/L · Normal: source + battery | Trade study | Engineer |
| 5 | `comms` | Radio + ground stations (+ stations map) | Trade study | Flight |
| 6 | `brains` | Computer + pointing + thrusters (Normal only; Easy = auto kit) | Trade study | Engineer |
| 7 | `orbit` | Orbit (+ ground-track map) | Trade study | Flight |
| 8 | `rocket` | Rocket (+ balance scale) | Trade study | Flight |
| 9 | `finalCheck` | Picture, goals, report, role goals, votes, LAUNCH | Point design & review | Director |
| 10 | `operations` | Animated mission with event decisions | Operations | Flight |
| 11 | `results` | Grade, breakdown, insights, tips, log, gallery, compare, share | Debrief | Director |

Next is disabled only if the current question is unanswered. Launch needs no `todo`/`error` issues
and (team) a majority Go; every No-Go carries a reason (`NO_GO_REASONS`).

## Folder responsibilities
| Path | Responsibility |
|---|---|
| `index.html` | Shell: top bar, `#goal-strip`, `#step-list`, `#screen`, `#sidebar`; `modulepreload` list. |
| `animations.html` | Debug page: every scene with sample states/simulations. |
| `css/main.css` · `components.css` · `animations.css` · `print.css` | Theme/layout · UI components · scenes · mission-report printing. |
| `js/main.js` | Store, render loop, autosave + badge unlock, share-link loading, card tilt, warp, mute. |
| `js/state/*` | `store.js`, `actions.js` (types, creators, `SCREENS`), `reducer.js`, `initialState.js`. |
| `js/data/*` | Components (+ `CATEGORY_PLAIN`, `SIZE_CLASSES`), instruments (+ `TAG_INFO`), orbits, launchers, ground stations, scenarios, events, roles (+ `NO_GO_REASONS`), real missions, glossary, `bundles.js` (power packs + kits + `applyBundles`). |
| `js/engine/resources.js` | `computeResources(state)`, `getSelection`, constants. |
| `js/engine/validation.js` | `validateDesign` → `{ severity, resource, step, message, why }`, `canLaunch`. |
| `js/engine/advisor.js` · `goals.js` | One advisor message · goal-strip chips. |
| `js/engine/simulation.js` | `runSimulation(state, seed, decisions, { autoChoice })`, `operatingConditions`. |
| `js/engine/objectives.js` · `outcome.js` · `costs.js` | Pass/fail objectives · captions/tips/effect chips · relaunch cost. |
| `js/engine/scoring.js` · `roleGoals.js` · `achievements.js` · `attempt.js` | Score/grade/insights/tips · role goals + vote rules · badges · saved-attempt records. |
| `js/engine/matching.js` · `explain.js` | Real-mission matches · "Why?" texts + delta previews. |
| `js/ui/router.js` · `steps.js` | Step list, question header, owner badge, Back/Next. |
| `js/ui/sidebar.js` · `goalStrip.js` · `satellite.js` · `card.js` | Gauges/advisor/details · goal chips · live satellite SVG · choice cards + meters. |
| `js/ui/screens/*.js` | One module per screen: `render(container, state, dispatch)` (use `mount()` not `append`). |
| `js/ui/animations/*.js` | One module per scene (see below) + `core.js` (play, stage, helpers) + `index.js` registry. |
| `js/ui/storage.js` · `gallery.js` · `sound.js` · `view.js` · `tooltip.js` · `dom.js` | localStorage (attempts, leaderboard, badges) · mission pictures · WebAudio · re-render hook · popovers · `h/s/mount`. |
| `js/utils/*` | `format.js`, `random.js` (mulberry32), `share.js` (URL-hash encode/decode). |

## State shape
```js
{
  screen: 'start', mode: 'solo'|'team', difficulty: 'easy'|'normal',
  players: [{ name, roleId }], activeRoleId,
  scenarioId: null,
  design: { components: { structure, power, battery, comms, computer, adcs, propulsion },
            instrumentIds: [], orbitId, launcherId, groundId,
            powerPack: null|'small'|'medium'|'large', kit: null|'standard'|'upgraded' },
  votes: { roleId: 'go'|'nogo' }, voteReasons: { roleId: reasonId },
  relaunches: 0, simulation: null, score: null,
}
```
Easy: `kit: 'standard'` by default; `applyBundles` (reducer, on every design change) fills power/battery
from the pack and computer/pointing/thrusters from the kit (thrusters strong enough for the orbit;
CubeSat parts in CubeSats). Switching CubeSat ↔ full-size drops parts that no longer fit (→ todo).

## Resource formulas (engine/resources.js)
Mass: dry + dry×Δv/10000 + 15% margin vs `launcher.capacityKg[orbit]` · Power: solar
`outputW × solarIntensity × (1 − eclipse)` or RTG · Battery: `consumption × eclipseMin/60` vs 60% of
capacity · Data: `rateMbps × distanceFactor × min(24, ground.contactHours × orbit.contactFactor) × 3600/8/1000`
· Budget: parts + launcher + `ground.opsCostPerYear × minLifetimeYears` · Time: slowest part + 6 ·
Lifetime: orbit + thrusters · Health: average reliability; failures/yr = (1−health)×8 (+0.3 per power or
battery overload) · Science: Σ science × orbit fit (1.3/0.8) × pointing bonus × min(1, downlink/data).

Validation severities: `todo` (unchosen; blocks launch only) · `error` (blocking: can't reach orbit,
payload > frame, CubeSat misfit, incompatible tool, ground can't reach) · `warning` (red; launchable,
including **too heavy** and **thrusters too weak**, which fail in flight) · `caution` · `info`.

## Simulation & outcomes (engine/simulation.js)
`outcome`: `pending | launch_failure | too_heavy | wrong_orbit | lost | partial | success`;
`failureCause`: `launch | mass | thrusters | power | comms | hardware`.
- Launch roll uses only `launcher.reliability` (+ waiver). Relaunch after a failure costs the rocket +
  50% of the hardware (`RELAUNCH` action, `state.relaunches`).
- Power below 2/3 of need, or a link Earth can't hear (blocked ground / near-Earth radio far away) →
  lost in month 1. Smaller deficits → safe-mode science loss + extra failures. Health < 85% → lost.
- Events pause the run (`pending`); `CHOOSE_EVENT_OPTION` appends the choice and replays.
- `success` = every objective met (`objectives.js`), else `partial`.

## Scoring (engine/scoring.js)
Science 35% (1.5× needed = full) · Objectives 25% · Efficiency 15% (budget left, mass & power margins;
`marginQuality`: 10–30% best, ~0% risky 0.3, over 0, >50% wasteful 0.5) · Survivability 15% · Teamwork 10%
(personal goals 80% + unanimous Go 20%; **solo redistributes** teamwork proportionally). Total 0–1000;
grades S ≥ 900 (success only), A ≥ 800, B ≥ 650, C ≥ 500, D ≥ 350, F. Also `insights.good/bad` (with
numbers), 2–3 `tips`, `eventLog(sim)`.

Role goals (`roleGoals.js`, live on Final check and final in Results): Director ≥ 10% budget left + on
time · Engineer mass & power margins ≥ 10% · Scientist science ≥ 1.2 × target · Flight ≤ 10% data lost +
recommended orbit.

## Animation system (js/ui/animations/)
`core.js#play(container, { scene, label, duration, setup, caption, hold, linger, overlay, onStart })`
creates the stage (SVG 800×450 + HTML layer + caption + actions + Skip), runs frames, and resolves with
the clicked button value. `nextFrame` uses rAF (test hooks: `window.__animTimerFrames` drives frames
with timers in headless Chrome; `window.__animFreeze` freezes for screenshots).

| Scene | Module | Used by |
|---|---|---|
| Countdown & liftoff · launch success · launch failure · too heavy / wrong orbit | `countdown`, `launchSuccess`, `launchFailure`, `tooHeavy` | Operations |
| Orbit view (+ power problem, data overflow, comms loss, HUD, timeline, Pause/1×/4×, downlinked pictures) | `orbitView` | Operations |
| Solar flare + aurora · debris · hardware failure · budget cut / launch delay · discovery | `solarFlare`, `debris`, `hardwareFailure`, `cardFlip`, `discovery` (`EVENT_SCENES`) | Operations (intro → modal → outcome) |
| Mission success · partial · lost · end of life (deorbit / graveyard / farewell) | `missionSuccess`, `missionPartial`, `missionLost`, `endOfLife` (+ `patch.js`) | Operations |
| Go/No-Go console · factory-to-pad montage | `goConsole`, `montage` | Operations (before countdown) |
| What your instrument sees · balance scale · ground track / stations map | `instrumentView`, `balanceScale`, `groundTrack` | Science, Rocket, Orbit, Comms steps |

Also: card tilt + step warp (CSS, `main.js`), exploded satellite view (`satellite.js`, Final check),
animated start screen (`screens/start.js`), team reaction avatars (`screens/operations.js`), sounds
(`ui/sound.js`, mute in header, saved in localStorage).

## Storage (ui/storage.js — localStorage, all wrapped in try/catch)
- `missionControl.attempts.v1`: finished attempts (`engine/attempt.js` record: scenario, design, summary,
  score parts, total, grade, team, date). Saved once per attempt key (design + seed + decisions).
- Top-10 leaderboard per scenario (start screen); "Compare attempts" (Results) vs the previous one.
- `missionControl.badges.v1`: unlocked badges (Penny Pincher, Zero Data Lost, Survivor, Featherweight, Perfect Team).
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
1. Per-decision "why" in the debrief timeline (what each choice changed in the score).
2. Tutorial overlay for the very first mission; more scenarios (asteroid, weather GEO).
3. Online multiplayer: sync the action log (`store.getLog()`); every client runs the same pure reducer.
