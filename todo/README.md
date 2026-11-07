# Roadmap

> This folder is the author's plan, not work for agents. See `AGENTS.md`: build nothing from it unless asked, and only tick a checkbox for a step you were asked to do and finished.

## How these files work

- Stages are done **in order**. Each stage depends only on stages before it, so by the time a stage starts, everything it needs is already built.
- Every stage is written in as much detail as possible now, then **revisited right before it starts** (re-read against the code as it is then, update, set the status to Ready).
- Status values: **Draft** (written ahead, expect changes), **Ready** (revisited, safe to start), **In progress**, **Done**.
- Steps are checkboxes. Tick one when it is implemented **and** verified. Each step is small enough to finish and check in one sitting.
- Each stage ends with a **Done when** checklist (the stage is finished only when every box is ticked) and **Go/no-go points** (results that change later plans).
- The engineering backbone (originally stage 7) is not a stage: its local checks are steps inside each stage, growing as the game grows. Everything runs locally on demand; there is no cloud CI.

## Files

| # | File | Status | Contents |
|---|---|---|---|
| 1 | `00_fixes.md` (file removed) | Done | Records keyed by permanent id (one-time migration, chamber number taken from list order), high-DPI blur fix, missing analytics events, first local check command |
| 2 | `01_engine_v2.md` | Done | Sounds out of the rules, engine runnable without a browser, replays on today's engine, recorded solutions and a local replay check, undo/redo, input rewrite (remappable keys), v2 rules and chamber format, the three inherited bugs fixed, v2 checked against the old rules, old engine deleted |
| 3 | `02_solver.md` | Draft | Solver prototype on the current chambers (go/no-go), solvability and par in the local checks, shortcut finder, dead-end warning, hints; generated chambers only if the prototype passes |
| 4 | `03_mechanics.md` | Draft | Lasers through portals, slide floors, conveyors and rotating arrows, timed buttons, mirror blocks, echo; teach → test → twist → combine |
| 5 | `04_campaign_identity_look_sound.md` | Draft | Identity, wings and tutorial chambers, a menu and catalogue that scale, chamber numbering and links, difficulty from data, medals, visual rework, colour-blind palettes and relaxed mode, reactive music |
| 6 | `05_creator_platform.md` | Draft | Stage A (editor, sharing in the link, publish only what you solved), Stage B gated on an audience |
## The idea

The moonshot isn't "more chambers". It is turning the rules into a pure function — *current state + one keypress → next state* — with the frame loop only animating and drawing. Once that exists, five things become possible: a solver that understands every chamber, replays, an editor, a daily puzzle, and leaderboards that can be verified by re-running a replay. Almost everything in stages 02–05 hangs off stage 01.

Two existing facts make this realistic: the rules never read the frame time, and `src/game/` is already walled off from Vue (enforced by lint).

## Where it starts (checked against the code on 2026-11-06)

These replace the rougher claims in the original roadmap. Re-check them when revisiting a stage; the code may have moved.

**Size and shape**

- Three chambers (`src/chambers/chamber_1..3.json`): 20×20, 23×13 and 23×17. Every one has 2 boxes. The engine has no size limit and no edge check; the walls in the data keep the subject inside.
- `src/game/` is about 2,850 lines. Nothing animates or stays in flight: a portal shot is traced in a single loop, doors flip a flag, nobody falls or dies.

**Time and frames**

- The rules ignore frame time (`State.update` takes it as `_`), but some effects land **one frame after the key**:
  - Buttons are checked before the carried box catches up, so walking off a button (or through a portal) carrying a box releases it a frame later, with its effects: doors close, barriers rise and remove portals, fizzlers turn on.
  - Every frame without a key steps the subject onto its own tile again, so a fizzler that turns on under the subject fires on a later frame.
  - The exit check runs first in the frame, so the win is reported a frame after arriving.
- So today's rules as a step function are: *apply the key, then run empty frames until the state stops changing*. Compare the state itself; the frame's "changed" result misses a fizzler firing this way.

**Boundaries**

- Nothing in `src/game/` imports Vue, components, services or chambers (`eslint.config.js`).
- But the rules play sounds directly (`state.ts`, `button.ts`, `door.ts`, `exit.ts`, `switch.ts`), and `sound.ts` creates its players when the module loads, so the engine cannot load under Node or in a Web Worker without stubbing audio.

**Elements and format**

- Each element type is written out in 5–6 places: its own class file, `chamber_data.ts`, `chamber.ts` (fields, setup, the linkable list, lookups), `state.ts` (walking checks and shot checks are separate lists), `renderer.ts`, and `docs/elements.md`.
- The chamber JSON has `size`, 10 required lists (walls, barriers, ditches, boxes, buttons, arrows, fizzlers, doors, switches, lasers), and a single subject and exit. The format accepts walls as single tiles or inclusive rectangles; today's chambers list them tile by tile (110–138 each). Elements carry an `id` used to link buttons and switches to what they open — not the catalogue's permanent chamber id.
- Barriers can sit on wall tiles (8 in chamber 2, 1 in chamber 3). A raised barrier stops shots before the wall, so that wall takes portals only while its barrier is down, and raising it removes the portal: a switchable portal surface that already exists.
- Links: a button opens its links when pressed and closes them when released, even ones that started open; a switch only ever opens. Linking a box sends it back to its start (chamber 1 has a switch linked to a box).
- Only the subject teleports; a carried box follows at the end of the frame. A laser is a single on/off tile that blocks walking only while on (its H/V setting only changes the drawing). Shots pass through lasers, ditches and boxes and never go through portals. Boxes block neither the subject nor shots, can stack on one tile, and can't be dropped on a switch.
- Arrows are fixed: they can't be linked, you can only enter one moving in its direction, and while on one every other arrow key and Ctrl are ignored.
- Portals land on any wall tile, on the side facing the shooter. Active fizzlers, barriers, doors and a closed exit stop shots. A wall holding a portal refuses shots on that side and both neighbouring sides. Each chamber has about 170–225 wall sides facing an open tile.

**State**

- What changes during play: subject x, y, facing and carried box; each portal's tile and facing; each box's x, y; each button's pressed flag; the open/closed flag of every linked barrier, ditch, door, fizzler, laser and the exit; an "inside a fizzler" flag; the won flag and the portal counter. The clock and step count live in `level.ts`.
- Switches hold no state. The open/closed flags depend on history (switches only ever open; buttons act once on press and once on release), so they can't be derived from positions.
- The rules change objects in place, elements hold references to the chamber, and every lookup scans a whole list.

**Input and drawing**

- Input reads the outdated `KeyboardEvent.keyCode`. Pressed keys collect in a set emptied every frame; per frame only one arrow counts (Up, then Down, Left, Right) and one portal key (A beats D), and an arrow plus a shot always runs move-then-shoot. Ctrl is read as held.
- The game canvas is sized in CSS pixels and ignores `devicePixelRatio`, so it is blurry on high-DPI screens. The home menu's chamber map already handles it (`chamber_map.vue`).
- `chamber_preview.ts` draws a fresh start state with the game's renderer; the renderer can draw any state.

**Inherited bugs** (kept by the frozen-rules rule until stage 01)

1. Coming out of a portal sets the position directly and skips the ditch, laser, barrier, door, closed-exit and arrow checks. Buttons and the exit still react (they are judged by position every frame); a fizzler fires one frame late.
2. Landing on a closed exit through a portal completes the chamber (the exit check never asks whether it is open).
3. Releasing a button linked to a box throws and stops the frame loop. No current chamber does this.
4. The "inside a fizzler" flag clears only on a tile with no fizzler at all, even a switched-off one.

**Services and hosting**

- Progress is stored by chamber **position**: `portal-2d.completed-chambers` (array of numbers) and `portal-2d.best-times` (number → hundredths). The `/chamber/:number` route is by position too, and each catalogue entry's `number` is typed by hand, separate from the list order.
- Analytics events carry `chamber_id` and `chamber_number`. Gaps: closing the tab records no quit; no attempt counter; no first-completion or new-best flag (the progress service already knows when a time is a new best); Reset sends `chamber_restart` but no new `chamber_start`; no run id (GA4 adds session ids, but linking a start to its end likely needs the BigQuery export — unverified).
- No tests, no CI. `npm run check` runs `lint:fix` then `build`; `npm run deploy` builds and runs `firebase deploy --only hosting`.
- Hosting rewrites every path to `/index.html`. Routes: `/`, `/chamber/<digits>`, and a catch-all that redirects home. The no-cache headers cover `/`, `/index.html`, `/settings` (stale: no such route) and `/chamber/**`; any new route must be added there.
- Chambers are static imports listed by hand in `chamber_catalogue.ts`, all in the main bundle (about 204 KB today; each chamber adds about 0.6–0.8 KB gzipped). The Play menu draws every chamber as a fixed-height row and cannot scroll.
- The full `firebase` package is installed but only `firebase/app` and `firebase/analytics` are used; the config holds only `apiKey`, `projectId` and `appId`, and the Firebase app is created only inside analytics startup in production builds.
- The name "Portal" and the Aperture Science logo on the loading screen belong to Valve.

## Decisions made

| # | Date | Decision |
|---|---|---|
| 1 | 2026-11-06 | `00_fixes.md` holds records by id (with migration), the blur fix and the analytics events. The rule bugs wait for stage 01, because rules are frozen until v2 |
| 2 | 2026-11-06 | The original stage 6 is split: remappable keys and gamepad go to stage 01's input rewrite; colour-blind palettes and relaxed mode go to stage 04 |
| 3 | 2026-11-06 | Today's rules become a **reference only**: v2 is checked against them on every recorded solution (except intended fixes), then the old engine is deleted. All chambers run on v2, with the fixes |
| 4 | 2026-11-06 | Chamber links (`/chamber/N`) stay by position until stage 04, which decides the numbering scheme |
| 5 | 2026-11-06 | `TODO.md` deleted: its two ideas are planned in stage 04 (tutorial chambers) and stage 05 (uploaded chambers with name, author, date, rating and thumbnail) |
| 6 | 2026-11-06 | The engineering backbone is woven into every stage as local tools, run on demand. No cloud CI |
| 7 | 2026-11-06 | Every stage is detailed now and revisited right before it starts |
| 8 | 2026-11-06 | Moves count every step taken, undone ones included, and redo counts nothing (open decision 1's counting half, settled in stage 01); whether ranked runs allow undo waits for stage 04 |
| 9 | 2026-11-07 | No gamepad support: stage 01's gamepad bridge (its step D8) is dropped and no stage plans it |

## Open decisions

Each one belongs to the stage that must settle it, and appears there with options.

| # | Question | Recommendation | Settled in |
|---|---|---|---|
| 1 | Do ranked runs allow undo? (How moves are counted was settled in 01, decision 8) | Undo allowed but shown on the result | 04 (medals) |
| 2 | Is the solver's difficulty score worth building? | No: use measured clear rates; keep solver metrics as a designer aid | 02 |
| 3 | Echo (a ghost replaying your previous attempt): build it? | Design it last or cut it: the ghost's whole input history becomes part of the state | 03 |
| 4 | GPU renderer or the current 2D canvas? | Stay on the 2D canvas; move only if profiling shows a real need | 04 |
| 5 | The game's name and identity | Settle it in stage 04, before anything is shared publicly in stage 05 | 04 |
| 6 | Chamber numbering and links once wings exist | Decide with the wing structure | 04 |
| 7 | When does Stage B (accounts, publishing) start? | Only once there is an audience; stage 05 sets the threshold | 05 |
| 8 | Firestore security rules need checking, but AGENTS.md says the project has no tests by design | Allow rules tests against the local emulator as the one exception | 05 |

## Order and dependencies

| # | Stage | Needs | Unlocks |
|---|---|---|---|
| 1 | 00 Fixes | — | Safe reordering of chambers; analytics history for stage 04; first local check |
| 2 | 01 Engine v2 | 00 | Replays, undo, a browser-free pure step, data-described elements, chamber format v2 |
| 3 | 02 Solver | 01 | Solvability and par checks, hints, a judge for generated and published chambers |
| 4 | 03 Mechanics | 01, 02 | New element types, each proven solvable and documented |
| 5 | 04 Campaign, identity, look, sound | 03 | ~120 chambers in wings, the original identity, the visual and music rework |
| 6 | 05 Creator platform | 01, 02, 04 | Editor, shared chambers, later accounts and publishing |

## Engineering backbone (woven in)

Local commands only, growing stage by stage:

| # | Stage | Adds |
|---|---|---|
| 1 | 00 | One command that runs lint, type check and build without changing files (recommended name: `npm run verify`) |
| 2 | 01 | Engine loads under Node; every recorded solution is replayed and must complete; v2 checked against the old rules |
| 3 | 02 | Every chamber is solved; par is compared with the stored value |
| 4 | 03 | Each new mechanic ships with at least one chamber, a recorded solution and a solver run |
| 5 | 04–05 | Preview deploys from the local machine (Firebase Hosting preview channels), bundle size watch |

## What we deliberately skip

- Real-time physics or 3D: they break the discrete rules that the solver and replays depend on.
- Chambers made by an LLM as a headline feature: generation judged by the solver does the real work.
- Ads or sales before the identity question is settled.
- Cloud CI (GitHub Actions and the like).
- Mobile layouts and touch controls (the game is desktop only).

## Stage file layout

Every stage file follows this layout:

```markdown
# Stage NN — Title

Status: Draft | Ready | In progress | Done
Last revised: YYYY-MM-DD

## Goal
One paragraph: what the player or the author gets when this stage is done.

## Depends on
Earlier stages and the specific things this stage uses from them.

## Decisions made
Settled choices that shape this stage, with the date.

## Open decisions
Each: the question, the options with their cost, and a recommendation.

## Steps
Grouped into phases. Each step:
- [ ] **Short title.** What changes, where (files), and how it is verified.

## Local checks added
Commands this stage adds to the local checks.

## Done when
- [ ] Testable conditions; the stage is finished only when every box is ticked.

## Go/no-go points
Results that change this stage's or later stages' plans, and what changes.

## Risks
What could go wrong and how to notice early.

## Notes for later stages
Things this stage learns or leaves that a later stage must pick up.
```
