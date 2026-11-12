# Roadmap

> This folder is the author's plan, not work for agents. See `AGENTS.md`: build nothing from it unless asked, and only tick a checkbox for a step you were asked to do and finished.

## How these files work

- Stages are done **in order**. Each stage depends only on stages before it, so by the time a stage starts, everything it needs is already built.
- Every stage is written in as much detail as possible now, then **revisited right before it starts** (re-read against the code as it is then, update, set the status to Ready).
- Status values: **Draft** (written ahead, expect changes), **Ready** (revisited, safe to start), **In progress**, **Done**, **Stopped** (ended early by one of its go/no-go points).
- Steps are checkboxes. Tick one when it is implemented **and** verified. Each step is small enough to finish and check in one sitting.
- Each stage ends with a **Done when** checklist (the stage is finished only when every box is ticked) and **Go/no-go points** (results that change later plans).
- The engineering backbone (originally stage 7) is not a stage: its local checks are steps inside each stage, growing as the game grows. Everything runs locally on demand; there is no cloud CI.

## Files

| # | File | Status | Contents |
|---|---|---|---|
| 1 | `00_fixes.md` (file removed) | Done | Records keyed by permanent id (one-time migration, chamber number taken from list order), high-DPI blur fix, missing analytics events, first local check command |
| 2 | `01_engine_v2.md` (file removed) | Done | Sounds out of the rules, engine runnable without a browser, replays on today's engine, recorded solutions and a local replay check, undo/redo, input rewrite (remappable keys), v2 rules and chamber format, the three inherited bugs fixed, v2 checked against the old rules, old engine deleted |
| 3 | `02_solver.md` (file removed; see `docs/solver.md`) | Stopped | Solver prototype on the current chambers (go/no-go: no-go on 2026-11-08, decision 10); the rest was dropped: solvability and par in the local checks, shortcut finder, dead-end warning, hints, generated chambers |
| 4 | `03_look_and_sound.md` | Draft | Visual rework with blueprint mode, reactive music, one tutorial chamber (chamber 0) |
| 5 | `04_mechanics_campaign.md` | Draft | Lasers through portals, slide floors, conveyors and rotating arrows, timed buttons, mirror blocks, echo; the campaign completed at 20 chambers, a menu and catalogue that scale, chamber numbering and links, medals |
| 6 | `05_creator_platform.md` | Draft | Editor, sharing in the link, share only what you solved |
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
- Hosting rewrites every path to `/index.html`. Routes: `/`, `/chamber/<digits>`, and a catch-all that redirects home. The no-cache headers cover `/`, `/index.html`, `/settings` (stale: no such route; removed 2026-11-06) and `/chamber/**`; any new route must be added there.
- Chambers are static imports listed by hand in `chamber_catalogue.ts`, all in the main bundle (about 204 KB today; each chamber adds about 0.6–0.8 KB gzipped). The Play menu draws every chamber as a fixed-height row and cannot scroll.
- The full `firebase` package is installed but only `firebase/app` and `firebase/analytics` are used; the config holds only `apiKey`, `projectId` and `appId`, and the Firebase app is created only inside analytics startup in production builds.
- The name "Portal" belongs to Valve.

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
| 10 | 2026-11-08 | Stage 02 stops after phase A (its go/no-go 1): the solver can't prove the current chambers solvable within 60 s each. With every pruning built, chamber 3 takes 110 s and chambers 1 and 2 give up after 10 minutes, past 6 million states each. Dropped: solvability and par checks, par in chamber files, the shortcut report, hints and the dead-end warning, solver difficulty metrics (open decision 2 settled: difficulty from measured clear rates) and generated chambers. Stage 03 keeps new mechanics small and relies on recorded solutions; stage 05's "publish only what you solved" relies on the creator's replay alone, with no par. Stages 03–05 must take this in when revisited. What the stage learned, and what a revisit would start from, is in `docs/solver.md` |
| 11 | 2026-11-08 | Stages 03 and 04 swap. Identity, look and sound come first (now stage 03, `03_identity_look_sound.md`) and add only a tutorial chamber, numbered 0 (chamber numbers count from 0), so chambers 1–3 keep their numbers and links. Mechanics and the rest of the campaign follow (now stage 04, `04_mechanics_campaign.md`), with the catalogue, menu and links that scale, difficulty from data and medals. The campaign has 20 chambers in total (0–19), with no wings. All seven mechanics stay in the plan; how they fit is settled when stage 04 is revisited. In decisions 1–10, "stage 03" means the mechanics stage and "stage 04" the campaign, identity, look and sound stage |
| 12 | 2026-11-08 | A private fan game: played only by the author and a few friends, never published on Steam or any other platform. It stays "Portal 2D" with Valve's name, logo and assets (open decision 5 settled), so stage 03 drops all identity work and becomes "Look and sound" (`03_look_and_sound.md`). Stage 03 also drops the colour-blind palettes, portal shapes and relaxed mode, the camera (every chamber fits the screen) and preview deploys; the renderer stays on the 2D canvas unless stage 03's profiling shows it can't hold 60 fps (open decision 4 settled). Stages 04 and 05 were updated to match |
| 13 | 2026-11-09 | The author is the only player during development; a few friends will play later (decision 12). No compatibility work, ever: saves and settings may be reset by updates, with no migrations, and links and the chamber and replay formats may break. Done in the code the same day: chamber format 1 support removed (the upgrader and its example), the progress migration from version 1 and the guard against overwriting a newer save removed, and the format, ruleset and chamber-id fields dropped from recorded solutions. Analytics was removed and restored the same day, so it stays as it was (Firebase events, the attempts counter, the undo count). Kept: permanent chamber ids (they name the chamber files, key stored progress and are analytics' `chamber_id`), the recorded solutions and their checks, and the chamber hash. For the plan: links may follow position with no redirects (open decision 6 settled), no retired-id list, no data migrations. Difficulty from player data and the histogram stay dropped, since a few friends are far below any useful sample (stage 04 had set about 50 players), so the chamber order comes from playtests, with the friends' analytics informing them. Stage 05's Stage B (accounts, community) is removed, since a few friends are no audience (open decisions 7 and 8 settled). Stages 03–05 were updated to match, and stages 04 and 05 now also apply decision 10 in full |

## Open decisions

Each one belongs to the stage that must settle it, and appears there with options.

| # | Question | Recommendation | Settled in |
|---|---|---|---|
| 1 | Do ranked runs allow undo? (How moves are counted was settled in 01, decision 8) | Undo allowed but shown on the result | 04 (medals) |
| 2 | Is the solver's difficulty score worth building? | No: use measured clear rates; keep solver metrics as a designer aid | 02 (settled by decision 10: no solver metrics) |
| 3 | Echo (a ghost replaying your previous attempt): build it? | Design it last or cut it: the ghost's whole input history becomes part of the state | 04 |
| 4 | GPU renderer or the current 2D canvas? | Stay on the 2D canvas; move only if profiling shows a real need | 03 (settled by decision 12: the 2D canvas) |
| 5 | The game's name and identity | Settle it in stage 03, before anything is shared publicly in stage 05 | 03 (settled by decision 12: stays "Portal 2D", a private fan game) |
| 6 | Chamber numbering and links once chambers are inserted and reordered | Links by permanent id, with old `/chamber/0`–`/chamber/3` redirected (stage 03 only makes the count start at 0) | 04 (settled by decision 13: links stay by position, no redirects) |
| 7 | When does Stage B (accounts, publishing) start? | Only once there is an audience; stage 05 sets the threshold | 05 (settled by decision 13: never, Stage B removed) |
| 8 | Firestore security rules need checking, but AGENTS.md says the project has no tests by design | Allow rules tests against the local emulator as the one exception | 05 (settled by decision 13: moot, no Firestore) |

## Order and dependencies

| # | Stage | Needs | Unlocks |
|---|---|---|---|
| 1 | 00 Fixes | — | Safe reordering of chambers; analytics history for stage 04; first local check |
| 2 | 01 Engine v2 | 00 | Replays, undo, a browser-free pure step, data-described elements, chamber format v2 |
| 3 | 02 Solver | 01 | The prototype's measurements only (stopped after phase A, decision 10) |
| 4 | 03 Look and sound | 01 | The visual and music rework, a tutorial chamber |
| 5 | 04 Mechanics and campaign | 01, 03 | New element types, each with rule fixtures, docs and chambers with recorded solutions; 20 chambers, medals |
| 6 | 05 Creator platform | 01, 03, 04 | Editor, shared chambers |

## Engineering backbone (woven in)

Local commands only, growing stage by stage:

| # | Stage | Adds |
|---|---|---|
| 1 | 00 | One command that runs lint, type check and build without changing files (recommended name: `npm run verify`) |
| 2 | 01 | Engine loads under Node; every recorded solution is replayed and must complete; v2 checked against the old rules |
| 3 | 02 | The solver check in `npm run verify`; no solvability or par check (stopped after phase A, decision 10) |
| 4 | 03–05 | Bundle size watch |
| 5 | 04 | Each new mechanic ships with at least one chamber and a recorded solution; the catalogue check |

## What we deliberately skip

- Real-time physics or 3D: they break the discrete rules that the solver and replays depend on.
- Chambers made by an LLM as a headline feature. Generated chambers judged by the solver, the alternative, were dropped too (decision 10).
- Ads or sales: this is a private fan game, never published (decision 12).
- Compatibility work: saves and settings may be reset by updates (no migrations, ever), and links and the chamber and replay formats may break (decision 13).
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
