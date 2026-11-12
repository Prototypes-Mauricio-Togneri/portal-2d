# Stage 04 — Mechanics and campaign

Status: Draft
Last revised: 2026-11-09

## Goal

Today only the subject and a carried box go through portals; shots and lasers never do, and lasers are fixed tiles. This stage adds a set of original mechanics that send more things through portals or give movement a new shape, while keeping the rules discrete: slide floors, rotating arrows, live lasers (emitters, beams, receivers, mirror boxes), conveyors, timed buttons, and possibly push blocks and echo. Each mechanic ships complete: exact rules, one element file, chamber format support, drawing in stage 03's reworked look, documentation, rule fixtures and its chambers with recorded solutions. The campaign then grows to its full length: 20 handcrafted chambers in total, numbered 0–19 (stage 03's tutorial as chamber 0, today's three chambers, and 16 new ones built here around the mechanics and the existing elements), in one list with no wings, with a catalogue, links and a Play menu that scale to that many, an order set by playtests (the friends' analytics informing them), and medals on time, moves and portals.

## Depends on

Stages 00 and 01 are done: their parts below are what they delivered, though Phase 0 still checks each hook. Stage 02 stopped after its prototype (README decision 10). Stage 03's parts are assumptions, which Phase 0 checks against what that stage actually delivered.

**From stage 00 (fixes)**, done

- Completions and best times keyed by permanent id; the game canvas sharp on high-DPI screens; analytics sending quits on tab close, an attempt counter and first-completion and new-best flags, collecting since 00 shipped (months of history by now); one local check command.

**From stage 01 (engine v2)**, done 2026-11-07

- A pure step: `step(chamber, state, action)` (`src/game/rules/step.ts`) gives the next state and its events, on an immutable state. Every effect lands inside the step, so the original rules' one-frame lags are gone.
- Elements described by data, one definition file per type in `src/game/rules/elements/`. Each declares when it blocks walking and shots, whether it takes portals, whether links reach it, its blocked flag (the only per-element state today) and its draw layer. How it is drawn stays browser-side in `src/game/element_drawings.ts`.
- Hooks this stage needs from that element system (Phase 0 checks each one; see "Stage 01 as built" below for what exists):
  1. **Movement continuation**: an element can keep the subject moving after it enters a tile (slide floors), or move it after its step (conveyors).
  2. **After-step update**: an element acts once per tick after the subject's move (conveyors, timed buttons).
  3. **Derived state recomputed every step**: state that is calculated, not stored (beams, lit receivers).
  4. **Solid movable objects**: walking into one pushes it (push blocks).
  5. **Per-element counters** stored in the state (timed buttons).
  6. **Link actions beyond open/close**: an element can do something else when linked (rotate an arrow, switch a conveyor on).
- The same entry check on every tile the subject enters, coming out of a portal included (stage 01 fixed the inherited bug: `portal_exit_checked` in `docs/elements.md`). Slide floors depend on this.
- Chamber format 2 with a version number, optional element lists and link groups (one button or switch driving a group). The upgrader from format 1 was removed (README decision 13).
- Replays and recorded solutions, a local replay check, and sounds sent as events instead of played by the rules.
- "Moves" is settled: the game counts one move for each step that puts the subject on another tile, undone ones included, and redo counts nothing (README decision 8). Slides and conveyors move the subject several tiles on one key, in one step, so a slide or a conveyor ride counts as one move.
- Input owning the game keys, remappable, by default the arrows, A, D, Space, Ctrl, Z and X (undo, redo). This stage adds no keys.

**Stage 01 as built, 2026-11-07** (kept from its notes when its file was removed)

- Hooks an element definition (`src/game/rules/elements/`) can have today: `interact` (the switch), `subjectInside` (the fizzler rule), `everyPass` (the button), `linkUnblocked` and `linkBlocked`. 9 of the 11 element types have hooks, but six of them only set their own flag on a link (the door and the exit also report opening and closing, the barrier also closes a portal on its tile). The core step has element-specific code only for boxes (carrying, pick-up, put-down) and the exit check.
- The six hooks above: link actions beyond open and close (6) fit `linkUnblocked` and `linkBlocked` as they are; derived state (3) fits a pass hook in the step's repeat loop, which is where travelling and bending lasers go; an after-step update (2) and movement continuation (1) need new hook slots, after the repeat loop and after the action; per-element counters (5) need a new section in the state layout (`state_layout.ts`); solid movable objects (4) need walking to ask a hook. None needs the step reshaped.
- A new element isn't one file yet: the chamber file reader and the validator still list elements by hand (see "Adding an element" in `docs/elements.md`). Making them read the registry is the step that would bring a new element close to one file.

**What stage 02 left** (stopped, README decision 10)

- No solvability check, no par from a solver, no shortcut finder, no dead-end warning and no generated chambers. Every chamber is proven solvable by its recorded solution, and every rule by its fixtures.
- The solver prototype in `src/solver/` and its check, `npm run solver:check`, which `npm run verify` runs on every chamber file (`docs/solver.md`). No mechanic depends on the solver; keeping that check passing is all it asks (R5, open decision 12).

**From stage 03 (look and sound)**

- The palette module (`src/game/palette.ts`) with named `rgba()` colours, imported directly by the drawing code, and blueprint mode; the hex-literal exception in `AGENTS.md` lifted.
- The animation layer (purely visual interpolation between consecutive states), so the movement new elements cause can animate, with `prefers-reduced-motion` showing plain steps.
- Music on the Web Audio API, with layers driven by game events.
- The tutorial first in the list (permanent id 0), as chamber 0 (stage 03 settled that numbers count from 0). Links still follow position.
- The bundle-size watch and the unused-asset check.

**How elements work today** (the base the new mechanics extend; the full rules are under "Rules" in `docs/elements.md`, the code in `src/game/rules/`)

- Walking: `move` in `step.ts` first faces the subject the way pressed; on an arrow tile only the arrow's way acts. Then `canEnter` refuses a wall, a tile outside the chamber, a tile with a blocked barrier, ditch, door, exit or laser (each definition's `blocksWalking`), and an arrow tile entered against its way. Walking into a wall that holds a portal on the side facing the subject, with both portals open, crosses it (`crossPortal`). The tile in front of the other portal goes through the same `canEnter`, so a crossing onto a tile the subject can't enter is refused.
- Shots: `shoot` in `step.ts` goes tile by tile the way the subject faces. A fizzler that is on, a raised barrier, a closed door or the closed exit stops it (`blocksShots`); everything else lets it through. It opens the portal on the first wall it reaches if that wall takes portals and no portal sits on that side or a neighbouring side; outside the edge counts as a wall that takes none. Standing in a fizzler that is on silences the portal keys (`stopsShootingFrom`).
- Links: `CompiledChamber` (`compiled_chamber.ts`) resolves each button's and switch's links once, groups expanded. The draft's `applyLinks` (`state_draft.ts`) runs each linked element's `linkUnblocked` or `linkBlocked` hook. A button (`elements/button.ts`, judged in every pass) unblocks its links going down and blocks them coming up. A switch (`elements/switch.ts`, on the interact key) only ever unblocks them, and is refused while the subject carries a box. Only barriers, ditches, boxes, fizzlers, doors, lasers and the exit can be linked (`linkable`).
- The repeat loop: after the action and the carried box following, `settle` in `step.ts` runs passes until one changes nothing (capped at 32), then the exit check. A pass runs the hooks of the elements on the subject's tile (the fizzler rule), then every element's pass hook (the buttons).
- Lasers: one on/off tile each, blocking walking only. `direction` (`H`/`V`) changes only the drawing and lets two crossing lasers share a tile, which either one blocks while it is on.
- Arrows: fixed and unlinkable (`elements/arrow.ts`, `blocksWalking: 'alongDirection'`).
- Boxes: block nothing, and a tile can hold several (the validator allows one per tile at the start). Picking up and putting down are in the core step's `interact`, not a box hook. A carried box moves onto the subject's tile after each action (`carryBoxAlong` in `state_draft.ts`). The fizzler rule sends a carried box back to its start, and a link sends a box back unless it is carried; releasing a button linked to a box does nothing (the validator warns).
- Barriers can sit on wall tiles (`sitsOn: 'floorOrWall'`; chamber 2 has 8 like this, chamber 3 has 1). A raised barrier stops shots before they reach the wall, so that wall takes portals only while the barrier is down, and raising it closes a portal there (`raiseBarrier` in `elements/barrier.ts`). This is already a switchable portal surface. Format 2 also lets a wall entry refuse portals for good (`takesPortals: false`), which no chamber uses yet.
- Drawing: `Renderer.render` (`src/game/renderer.ts`) draws layer by layer (`DRAW_LAYERS` in `draw_layer.ts`): floor, arrows, walls, the blockers that are blocked, portals, buttons and switches, boxes, the subject, and fizzlers last. Inside a layer, each element type is drawn in registry order by its entry in `ELEMENT_DRAWINGS` (`src/game/element_drawings.ts`). Colours are named `rgba()` colours in stage 03's palette module, `src/game/palette.ts`, which `element_drawings.ts`, `renderer.ts` and `tile_painter.ts` import.

## Decisions made

| # | Date | Decision |
|---|---|---|
| 1 | 2026-11-06 | Mechanics lean original: names, look and combinations are this game's own, not copies of another game's elements. Names here are working names, settled when this stage is revisited |
| 2 | 2026-11-06 | Today's rules are deleted after stage 01 (README decision 3), so new mechanics only need to work in v2 |
| 3 | 2026-11-06 | The rules stay discrete: everything happens inside one step, nothing depends on time |
| 4 | 2026-11-06 | No new keys. Every mechanic works with arrows, A, D, Space and Ctrl |
| 5 | 2026-11-06 | A mechanic the solver cannot judge within budget does not ship (stage 05 publishes only solver-checked chambers). Superseded by README decision 10: no solver judges chambers; a mechanic ships on its chambers' recorded solutions and its rule fixtures |
| 6 | 2026-11-08 | A mechanic's chambers go into the campaign in this same stage: its teach chamber and the rest of its run, as the campaign plan sets (replaces "a teach and a proof chamber per mechanic; full wings are stage 04's job") |
| 7 | 2026-11-06 | Chamber links (`/chamber/N`, by position) stay as they are until this stage picks the numbering scheme (README decision 4); stage 03 only made the count start at 0 for the tutorial. Settled by README decision 13: links stay by position, with no redirects (open decision 9) |
| 8 | 2026-11-06 | Unchanged from `AGENTS.md`: desktop only; colour meanings (blue interaction and success, orange the second portal, red caution, green a completed chamber); `localStorage` keys keep the `portal-2d.` prefix, as a convention, and analytics event and parameter names never change, even after a rename (renaming one splits its history) |
| 9 | 2026-11-08 | Stages 03 and 04 swapped (README decision 11): look and sound come first, so this stage builds on the reworked look and sound |
| 10 | 2026-11-08 | The campaign is 20 chambers in total, numbered 0–19: the tutorial (0), today's three (1–3) and 16 new ones built here. No wings: one ordered list, with no wing manifest, wing menu level, wing unlocking, wing music or wing analytics parameter (replaces about 120 chambers in about 10 wings) |
| 11 | 2026-11-08 | All seven mechanics stay in this plan; how many make the campaign is settled at this stage's revisit (open decision 8) |
| 12 | 2026-11-08 | Medals and difficulty from data moved here from the old stage 04, since they need the final chambers |
| 13 | 2026-11-09 | The author is the only player during development, and a few friends play later (README decision 13): no compatibility work, so links stay by position with no redirect table, no retired-id list and no migration of stored progress. Difficulty from player data and the histogram are dropped, since a few friends are far below any useful sample: the chamber order comes from playtests, with the friends' analytics informing them. Analytics stays. Lab chambers matter once friends play (open decision 3) |
| 14 | 2026-11-09 | README decision 10 applied in full: no solvability check, no par from a solver, no shortcut finder, no dead-end warning, no generated, daily or endless chambers. Mechanics ship on recorded solutions and rule fixtures; the medals' par is the best recorded solution, labelled "target" (open decision 11). The old go/no-go point that dropped timed buttons, push blocks and echo without a solver is superseded by README decision 11 (all seven mechanics stay in the plan), and the solver-budget and medal-par points are removed (the data-volume point went with decision 13) |

## Open decisions

**1. Echo: build it?** (README open decision 3)
- *A. Cut it.* No cost, and the stage ends sooner.
- *B. Design it last, with hard limits:* one ghost, a recording capped at about 40 ticks, a ghost that only walks and holds buttons (no portals, no carrying, no switches). Cost: the recording becomes part of the state, every element must be defined against a second walker, and the rule fixtures grow with it.
- *C. Replace it with something cheaper:* for example a second subject you hand control to. The state grows by one position instead of a whole input history, but it needs a key to switch, which breaks decision 4.
- **Recommendation: B, decided at Phase 7.** Cut it if a teach chamber sketched by hand doesn't make a puzzle worth that cost, or if building it would reach beyond its own files and the hooks Phase 0 adds.

**2. What happens to today's laser tiles once live lasers exist?**
- *A. Keep them as their own element* (a fixed "laser field"). Existing chambers stay unchanged and need no upgrade.
- *B. Convert them to emitter plus beam,* rewriting the chamber files that use them (no upgrader, README decision 13). One laser family, but today's chambers change behaviour (beams could then bend through portals) and their recorded solutions must be redone.
- *C. Remove them.* All three current chambers use lasers or would need redesign.
- **Recommendation: A.** R3 draws the two so they read as different things.

**3. Where do a mechanic's chambers live while being built?**
- *A. A development-only lab list:* lab chambers outside the catalogue, playable only in `npm run dev` and included in the local checks. A chamber moves into the catalogue, with a permanent id, once it is finished (recorded solution, cold playtest).
- *B. Straight into the catalogue.* Playable at once, with no extra route. While only the author plays (README decision 13), an unfinished chamber reaches nobody and an early permanent id costs nothing; once friends play, unfinished chambers would reach them. Cost: the Play menu can't scroll until Phase 10, so the list must stay short until then.
- *C. Keep them only as replay fixtures.* Nobody can play them by hand, so no cold playtest.
- **Recommendation: B while only the author plays, A once friends play**, so unfinished chambers never reach them.

**4. What counts as one tick for timed buttons and conveyors?**
- *A. One action that moves the subject:* a step, a portal crossing or a whole slide each count as one tick. Turning, shooting and interacting don't count, so there is no free "wait" action.
- *B. Every accepted action,* turns and shots included. Turning in place becomes a way to wait, which makes timers trivial.
- *C. Real time.* Breaks the pure step. Rejected.
- **Recommendation: A.** It is the same unit as "moves", which is settled: README decision 8 counts each step that puts the subject on another tile as one move, so a portal crossing or a whole slide is one.

**5. What happens when a beam reaches the subject?**
- *A. The subject blocks the beam:* the beam ends at the subject's tile and nothing happens to the subject. Walking into a lit beam tile is refused, as with lasers today. Standing in a beam becomes a tool (it switches a receiver off).
- *B. The beam acts like a fizzler on the subject:* portals cleared, carried box reset. That's harsher, and it is a second way to lose portals.
- *C. The beam passes through the subject harmlessly.* Simple, but it wastes a design lever.
- **Recommendation: A.**

**6. How does a mirror box's angle get set?**
- *A. Fixed in the chamber data* (`/` or `\`). Simplest; the puzzle is where you put it.
- *B. Set by the subject's facing when it is dropped.* More expressive, but it adds an orientation to every mirror box state.
- *C. Rotated with a key.* Breaks decision 4.
- **Recommendation: A** for the first version; revisit B after playtests.

**7. Do conveyors move the subject, loose boxes, or both?**
- *A. Both, one tile per tick.* Most puzzles, and the most states.
- *B. Loose boxes only.* "The world moves when you move" without forcing the subject around.
- *C. The subject only.* Overlaps with slide floors.
- **Recommendation: A.**

**8. Which mechanics make the campaign?** The campaign has 16 new chambers in all (decision 10). A full teach → test → twist → combine run is 10–12 chambers per mechanic, so spread over all seven, each gets about 2 and the existing elements get none.
- *A. All seven,* about 2 chambers each. Cost: each mechanic is taught and then left behind, with no room for hard chambers.
- *B. A few,* for example slide floors, rotating arrows and live lasers, about 5 chambers each; the rest are cut or left for later. Cost: fewer new ideas in the campaign.
- *C. More than 20 chambers.* Cost: reopens README decision 11.
- **Recommendation: settle it at this stage's revisit, after stage 03.** The answer also sets which of Phases 1–7 run.

**9. Chamber numbering and links** (README open decision 6). Links follow position. This stage inserts 16 chambers among the existing ones, and playtests may reorder them, so any link built from position will shift.
- *A. Links by permanent id* (`/chamber/<id>`); the screen shows the position number. Cost: the number in the address differs from the one on screen.
- *B. Links by a permanent slug per chamber* (`/chamber/<slug>`). Cost: every chamber needs a unique title, kept forever like an id.
- *C. Links by position* (`/chamber/N`), as today. Cost: shifts whenever this stage inserts or reorders chambers.
- **Settled by README decision 13: C**, with no redirect table. There is no compatibility work, so a friend's old link may open another chamber or none, and that is accepted. (The recommendation was A, with old links redirected.)

**10. Medals and undo** (README open decision 1, medals side; counting is settled in 01).
- *A. Moves count every step taken, undone ones included; undo is allowed and shown on the result.* Cost: undo costs moves, which some players may find harsh.
- *B. Undo allowed in casual play, disabled in a "ranked" run.* Cost: two modes to explain and build.
- *C. Moves count the final path only.* Cost: anyone reaches the target by undoing; the medal is meaningless.
- **Recommendation: A**, matching the README.

**11. Medal thresholds.**
- Par is the chamber's best recorded solution (no solver finds the optimum, README decision 10), so it is labelled "target", not "par". Moves and portals: gold at the target, silver within 125 % of it (rounded up), bronze for completing. Time thresholds start from the author's own best run × a factor.
- **Recommendation: as above.** Revisit the 125 % after playtests.

**12. What does the solver check do with a mechanic it doesn't know?** (R5; added 2026-11-09, replacing the histogram, which README decision 13 removed.) The prototype stays and its check runs in `npm run verify` (README decision 10), but it only knows today's elements, and most mechanics break it once their chambers are in `src/chambers/`.
- *A. Teach the solver each mechanic:* its state in the key, and the walks, shot lines and skipped actions made to match. Cost: solver work for a stopped stage, on every mechanic; timed buttons, push blocks and echo may not fit the 64-bit key at all.
- *B. Skip what it doesn't know:* the check leaves out, and names, each chamber that uses an element the solver doesn't support or whose key needs more than 64 bits, and keeps checking the rest and its solver fixtures. Cost: a small change to `scripts/check_solver.ts`; the prototype is checked on fewer chambers as the campaign grows.
- *C. Remove the prototype and its check.* Cost: a revisit starts from git history instead of working code (`docs/solver.md` stays).
- **Recommendation: B**, settled in Phase 0, before the first mechanic's chambers exist.

## Steps

### Mechanic order

Ordered by design value against state growth and build cost, cheapest high-value first, so the element system is proven on small mechanics before the biggest one:

| # | Mechanic | Design value | New state | Why here |
|---|---|---|---|---|
| 1 | Slide floors | High: momentum through portals, very much this game's own | None: a slide is resolved inside one step | Best ratio; also tests the "movement continuation" hook and the landing checks stage 01 fixed |
| 2 | Rotating arrows | Medium alone, high with slides | One flag per linked arrow (a link flag, like a barrier's) | Tiny; proves "link actions beyond open/close" |
| 3 | Live lasers (emitters, beams, receivers, mirror boxes) | Highest: beams bend through portals, which matches the stage's theme | Beams and lit receivers are derived, not stored; mirror boxes add positions like boxes do | Biggest mechanic, built once the hooks are proven |
| 4 | Conveyors | Medium-high: the world moves as you do; boxes travel through portals on their own | No new fields, but box positions change every tick, so many more states are reachable | Moderate cost; reuses the tick from open decision 4 |
| 5 | Timed buttons | Medium: route-length puzzles | One counter (0..N) per timed button, up to ×(N+1) states each | Cheap to build, but it multiplies the states; capped |
| 6 | Push blocks that bend beams 90° | Medium, overlaps with mirror boxes | Solid block positions; pushing creates dead ends | New action (push) and dead ends; gated by go/no-go point 3 |
| 7 | Echo | High novelty | A whole recorded input history | Gated by open decision 1 |

### The recipe

Every mechanic phase repeats these seven steps (R1–R7). Each phase below gives the mechanic-specific content.

- **R1 Rules spec.** Finalise the draft spec in this file and fill the mechanic's row of the interaction table (Phase 0). Verified by checking every column: portals (subject, shots, beams), loose and carried boxes, fizzlers, buttons, switches, arrows, ditches, barriers, doors, exit, laser fields and every earlier new mechanic.
- **R2 Element and format.** One element definition file in stage 01's layout, plus an optional list in format v2 whose type accepts the JSON import without a cast. If an existing element changes, rewrite the chamber files that use it; there is no upgrader (README decision 13). Verified by the build, and by every existing replay still passing unchanged.
- **R3 Drawing and sound events.** Drawing in stage 03's look: colours from its palette module, in the standard look and in blueprint mode, distinct from every existing element; no portal blue or orange, and none of the UI's meanings (red = caution, green = completed). Movement the mechanic causes animates through stage 03's animation layer, and reduced motion shows plain steps. Sound events get sounds in the style of stage 03's sound, or reuse existing sounds until those exist. Verified in `npm run dev` at 1× and 2× pixel ratio, in the standard look and in blueprint mode, with the sound setting off silencing it.
- **R4 Rule fixtures.** One tiny chamber and recorded inputs for each spec bullet and edge case, each asserting its expected outcome. Verified by the local replay check passing, and failing once when the rule is deliberately broken (a one-off spot check, then reverted).
- **R5 Solver check.** No solver judges the mechanic (README decision 10), but `npm run verify` runs `npm run solver:check` (`scripts/check_solver.ts`) on every chamber file in `src/chambers/`, and fails when:
  - the chamber's state key needs more than 64 bits. The key holds the subject's tile and facing, the carried box, both portals, each box's tile and one bit per linked element's blocked flag; today's chambers need 52–53, a third box adds 8–9 bits and a fourth doesn't fit;
  - a state along its recorded solution or 100,000 seeded random steps doesn't come back unchanged from the key. Unpacking sets each button pressed exactly when the subject or a box is on it, and any state value the key doesn't hold to 0;
  - from a state along its recorded solution, the rules' step disagrees with the solver's walks (a move onto a plain tile only steps the subject, and its carried box, one tile; a tile whose element reacts to the subject, `reactsToSubject`, ends a walk), its shared shots (a shot from anywhere on a line gives the same result, apart from the subject's tile), its skipped no-op interacts and moves, or its regions.

  So a mechanic that adds state, makes a plain move do more than step the subject, or makes a shot's result depend on where on its line the subject stands, fails `npm run verify` as soon as one of its chambers is in. Handle it as open decision 12 settles. Verified by `npm run verify` passing with the mechanic's chambers in.
- **R6 Docs.** A `docs/elements.md` row, notes and interactions; AGENTS.md if rules text or keyboard ownership changes. Verified by reading the docs against the spec.
- **R7 Chambers.** A teach chamber and one proof chamber (test or twist), where open decision 3 puts them, each with a recorded solution; they join the campaign as the campaign plan sets (open decision 8). The author plays each cold and writes down any confusion as signage notes in the campaign plan table. Verified by the local checks plus the playtest notes.

### Campaign plan

**Teach → test → twist → combine.** Each mechanic, and each existing element the campaign teaches, gets a run of chambers:
- *Teach*: the mechanic alone, with no way to fail at understanding it.
- *Test*: the mechanic alone, but you must use it on purpose.
- *Twist*: an unexpected consequence of the rules (a fizzler mid-slide, a beam blocking your own path).
- *Combine*: with earlier mechanics.

A full run was planned at 10–12 chambers per mechanic (1–2 teach, about 3 test, about 3 twist, 3–4 combine). With 16 new chambers for the whole campaign (decision 10), that no longer fits: a run shrinks to a teach chamber and one or two more, or some mechanics are left out (open decision 8). A combine chamber can serve two mechanics at once.

The existing elements need chambers too (portal basics, boxes and buttons, doors and switches, barriers and ditches, fizzlers, arrows, laser fields); the tutorial (chamber 0) and today's three chambers already cover some of them. Barriers over walls (switchable portal surfaces, already used in chambers 2 and 3) deserve a teach chamber of their own.

**Campaign plan table** (chamber counts set at the revisit by open decision 8; the rest filled in from the playtests during the mechanic phases and Phase 8):

| # | Mechanic or element | New chambers | Teach notes (signage, confusion seen) | Sounds needed | Colours |
|---|---|---|---|---|---|
| 1 | Existing elements | — | — | — | — |
| 2 | Slide floors | — | — | Slide start, slide stop | Slide floor |
| 3 | Rotating arrows | — | — | Arrow turn | Turned-arrow notch |
| 4 | Live lasers | — | — | Beam hum, receiver on/off | Beam, emitter, receiver, mirror box |
| 5 | Conveyors | — | — | Conveyor movement | Conveyor |
| 6 | Timed buttons | — | — | Countdown tick, release | Countdown marks |
| 7 | Push blocks (if built) | — | — | Push | Push block |
| 8 | Echo (if built) | — | — | Echo start, ghost | Ghost, echo pad |
| 9 | Total | 16 (20 with chambers 0–3) | | | |

### Phase 0 — Ready the stage

- [ ] **Revisit.** Re-read stage 01's element definition contract, format v2 and replay format, and stage 03's palette module and animation layer. Rename everything in this file to their real names; set the status to Ready.
- [ ] **Hook check.** Compare the six hooks under *Depends on* with what stage 01's element system supports. For each missing hook, either add it to the engine once, as its own step here, with replays proving no change to existing chambers, or drop the mechanics that need it (go/no-go point 1).
- [ ] **Settle open decisions 2–8 and 12.** Record the answers under *Decisions made* (echo waits for Phase 7). Open decision 8 also sets the chamber counts in the campaign plan table and which of Phases 1–7 run.
- [ ] **Lab chambers (only once open decision 3 calls for A, when friends play).** A lab folder of chamber files, a development-only way to open one (registered only when `import.meta.env.DEV`, so it never ships), and the local checks covering it. Verified by opening a lab chamber in `npm run dev` and confirming the production build contains none. If friends start playing only later in this stage, build it then; if they never do during it, tick it with "not applicable".
- [ ] **Interaction table.** Add a section to `docs/elements.md` listing every element against every other. Each cell is a rule, "can't happen" (chamber validation forbids it) or "to do". Existing elements fill their cells first, from the current rules.
- [ ] **Outcome assertions in replays.** Confirm stage 01's replay format can assert an outcome: completes, does not complete, or reaches an expected state hash. Add it if missing. Verified by one passing and one deliberately failing fixture.
- [ ] **Names and colours.** Choose names for the new elements and colours for them from stage 03's palette module, in the standard look and in blueprint mode (decision 1, R3 constraints), and record them in `docs/elements.md`.

### Phase 1 — Slide floors

Draft spec:
- A floor tile with no state of its own; not linkable in this version.
- When the subject enters a slide floor (by walking, by coming out of a portal or by being conveyed), it keeps moving in its travel direction, one tile at a time, all inside the same step.
- Each tile entered gets the full landing checks. An open ditch, a lit laser field or beam, a raised barrier, a closed door or a closed exit stops the slide on the current tile. An arrow stops it unless the travel matches the arrow's direction, in which case the subject enters the arrow and stops there (arrows are not slide floor). An active fizzler fires as the subject passes (portals cleared, carried box reset) and the slide goes on.
- If the next tile is a wall holding a portal whose open side faces the subject, and the other portal is open, the subject comes out of the other portal facing away from it. It keeps sliding in that direction if the exit tile is a slide floor, and stops there otherwise.
- Entering a normal tile ends the slide on it. Entering the open exit ends the slide and completes the chamber.
- Buttons and switches react only to the tile where the subject stops; passing over a button does not press it.
- Loose boxes don't slide. A carried box travels with the subject.
- Ctrl-turning on a slide floor doesn't move the subject. Shooting from a slide floor works as usual.
- If a slide would enter the same tile in the same direction twice (a loop through portals), the whole move is refused: the state stays as before the key and an "action refused" sound event plays.
- A slide counts as one tick and one move (README decision 8).
- Chamber validation: a slide floor can't share a tile with a wall, ditch, door, exit, arrow, switch or conveyor.

Chambers. Teach: a slide-floor room where stepping on slides you to the far wall, and the exit can only be reached by placing a portal so the slide comes out facing it. Test: two slides joined by portals, where the order you place them in matters. Twist: an active fizzler on the slide path wipes your portals mid-slide, so the portal you were aiming for is gone. Combine: carry a box across slides and through a portal to a button you can only reach by sliding.

- [ ] **R1 Spec.** Finalise the spec above and fill the slide floor's row.
- [ ] **R2 Element and format.** The slide floor element file and its optional list in format v2.
- [ ] **R3 Drawing and sounds.** A pale floor tile with thin diagonal lines; slide start and stop events, with placeholder sounds.
- [ ] **R4 Fixtures.** Slide to a wall, onto a normal tile, through a portal onto a slide and onto a normal tile, a fizzler mid-slide, an arrow mid-slide, the exit mid-slide, a refused loop, and a button passed over without being pressed.
- [ ] **R5 Solver check.** A slide carries the subject past the next tile, where the solver's walks expect it to stop, unless the slide floor counts as an element that reacts to the subject (`reactsToSubject` in its definition): walks then end there, which likely keeps them right. `npm run verify` passes with the slide chambers in (open decision 12).
- [ ] **R6 Docs.** The slide floor in `docs/elements.md`.
- [ ] **R7 Chambers.** Teach and test chambers, solutions, a cold playtest.

### Phase 2 — Rotating arrows

Draft spec:
- An arrow gains an optional link `id` and an optional `turnedDirection`. Arrows without an id behave exactly as today, so no upgrade is needed.
- Activated through a link, it points `turnedDirection`; deactivated, it points its original direction. A button holds it turned while pressed; a switch turns it for good (switches only ever activate).
- If the subject stands on the arrow when it turns, it stays, and can then leave only in the new direction. Ctrl-turning follows the arrow, as today.
- Slides stop on arrows (Phase 1).
- State: the arrow's link flag, the same kind as a barrier's.

Chambers. Teach: an arrow corridor that only leads away from the exit until a switch turns the last arrow. Test: an arrow held turned by a button you must put a box on. Twist: the button that turns the arrow is the tile you stand on, so stepping off turns it back behind you, a one-way trap. Combine: arrows that change where a slide ends.

- [ ] **R1 Spec.** Finalise the spec above and fill the rotating arrow's row.
- [ ] **R2 Element and format.** Make arrows linkable; add the optional `id` and `turnedDirection`.
- [ ] **R3 Drawing and sounds.** A small notch showing the other direction; a turn event.
- [ ] **R4 Fixtures.** Turned by a button and back, turned by a switch for good, turning while the subject stands on it, a slide ending on a turned arrow.
- [ ] **R5 Solver check.** Each linked arrow adds a blocked flag, one more key bit. If the turn is stored as that flag and walking reads it through `allowsWay`, the check likely passes as it is. `npm run verify` passes with the arrow chambers in (open decision 12).
- [ ] **R6 Docs.** Update the arrow's row: "Can be activated/deactivated?" becomes "Yes, when linked".
- [ ] **R7 Chambers.** Teach and twist chambers, solutions, a cold playtest.

### Phase 3 — Live lasers (emitters, beams, receivers, mirror boxes)

Draft spec:
- **Emitter**: sits on a wall tile and fires from one face. It can be linked (on/off), on by default. The wall still holds portals on its other faces.
- **Beam**: not stored. After every change within a step, it is traced from each lit emitter, tile by tile:
  - It passes floor, ditches, fizzlers, laser fields, buttons, switches, arrows, slide floors, conveyors and loose boxes.
  - It stops at walls, active barriers, closed doors, a closed exit, the subject (open decision 5, option A) and the chamber edge.
  - At a wall side holding a portal whose open side faces the beam, with both portals open, it continues from the other portal's exit tile in that portal's direction.
  - At a mirror box it turns 90° by the box's angle.
  - At a receiver's face it lights the receiver and stops.
  - If it would enter the same tile in the same direction twice, it stops (a beam loop through portals).
- A tile a beam crosses blocks walking, like a lit laser field. Portal shots pass beams.
- **Receiver**: sits on a wall tile and listens on one face. Lit, it acts as a pressed button (activates its links); unlit, as a released button (deactivates them). As with a button (settled in stage 01), deactivating a link to a box does nothing.
- **Mirror box**: carried like a box (Space). It holds buttons down like a box, goes through portals with the subject, is reset by fizzlers like a box, and reflects beams by a fixed `/` or `\` (open decision 6).
- **Settling a step**: apply the action and the subject's movement; trace the beams; evaluate buttons (by position) and receivers (by beams) in chamber data order; apply their links; trace again; repeat until nothing changes. If a state repeats (a receiver opening a door that blocks its own beam), stop at the first repeat, keep that state, and report it in the local checks as an oscillation warning.

Chambers. Teach: one emitter and one receiver that opens the exit door, with a wall between them; place a portal pair to route the beam around. Test: the beam has to turn a corner, coming out of a portal on a perpendicular wall. Twist: once routed, the beam blocks your own path, so you must route it, stand in it to switch the receiver off, or route it again after crossing. Combine: carry a mirror box through portals to bend a beam onto a receiver behind a fizzler (the box resets if you carry it through).

- [ ] **R1 Spec.** Finalise the spec above, including the settling rule, and fill the rows for emitter, beam, receiver and mirror box.
- [ ] **R2 Element and format.** Element files for emitter, receiver and mirror box; optional lists in format v2. Laser fields are kept as decided in open decision 2.
- [ ] **R3 Drawing and sounds.** The beam as a thin line, coloured unlike a laser field; emitter and receiver as wall notches; the mirror box as a box with a diagonal. Receiver on/off events.
- [ ] **R4 Fixtures.** A straight beam, a beam through portals, a beam loop, a beam blocked by the subject, a mirror bend, a mirror carried through a portal, a receiver opening and closing a door, an oscillation that settles deterministically, a fizzler resetting a carried mirror.
- [ ] **R5 Solver check.** Each mirror box adds a tile to the key, like a box (8–9 bits on today's chamber sizes). Beams add no bits, being derived, but if the subject blocks them (open decision 5, A), where it stands can change links, which the solver's walks and shared shots assume it can't. `npm run verify` passes with the laser chambers in (open decision 12).
- [ ] **R6 Docs.** All four entries in `docs/elements.md`, with the settling rule written out.
- [ ] **R7 Chambers.** Teach and test chambers, solutions, a cold playtest; neither raises an oscillation warning in the replay check or the random walk.

### Phase 4 — Conveyors

Draft spec:
- A floor tile with a direction. It can be linked (on/off), on by default.
- At the end of every tick (open decision 4), everything standing on an active conveyor moves one tile in its direction, all at once: the subject and loose boxes (open decision 7). Boxes may stack, as today. There is no chaining: one tile per tick, even onto another conveyor.
- The subject moves only where walking would allow; otherwise it stays. Carried onto a slide floor, it slides. Carried into a wall holding a portal from the tile in front of it, with both portals open, it goes through, exactly as if it had walked.
- A loose box moves unless the next tile is a wall, an active barrier, a closed door or a closed exit. A box moved onto an open ditch falls and resets to its start, as a fizzled box does. A box carried into a wall holding a portal (open side facing it, both portals open) comes out of the other portal. This is the first time a box goes through a portal without the subject (a twist, confirmed at R1).
- A box conveyed onto a button presses it in the same step's settling.
- Chamber validation: a conveyor can't share a tile with a wall, ditch, door, exit, arrow, switch or slide floor.

Chambers. Teach: a conveyor that brings a box to a button while you walk elsewhere. Test: count your steps so the box arrives as you reach the door. Twist: a conveyor feeds a box into a portal, which sends it to a button in a room you can't enter. Combine: a conveyor feeding a timed button (after Phase 5), or a conveyor that a receiver switches on (lasers).

- [ ] **R1 Spec.** Finalise the spec above, deciding on boxes going through portals alone, and fill the conveyor's row.
- [ ] **R2 Element and format.** The conveyor element file, its optional list, and its after-step update.
- [ ] **R3 Drawing and sounds.** Floor with repeated chevrons, kept distinct from arrows (thinner, several per tile); a conveyor movement event.
- [ ] **R4 Fixtures.** Subject carried, subject blocked, a box carried onto a button, a box into a ditch, a box through a portal, the subject carried through a portal, the subject carried onto a slide, a conveyor switched off.
- [ ] **R5 Solver check.** Conveyors move the subject and loose boxes on every tick, so a step changes more than the subject's tile, which the solver's walks assume it can't. `npm run verify` passes with the conveyor chambers in (open decision 12).
- [ ] **R6 Docs.** The conveyor in `docs/elements.md`.
- [ ] **R7 Chambers.** Teach and twist chambers, solutions, a cold playtest.

### Phase 5 — Timed buttons

Draft spec:
- A button with `holdTicks: N` (1–9). It is pressed while the subject or a box is on it, like a button today.
- Once nothing is on it, it stays down for N more ticks, counting down by one per tick, then releases (its links deactivate). Pressing it again while it counts down sets it back to N.
- A box on it holds it indefinitely. A box reset by a fizzler, or a box conveyed off it, starts the countdown.
- The tick follows open decision 4: a portal crossing counts as one tick, and so does a whole slide.
- The drawing shows N small marks that disappear as it counts down.
- Limits: N ≤ 9, and at most 2 timed buttons per chamber.

Chambers. Teach: a timed button opens a door 5 steps away; get there in time. Test: the only route that's short enough goes through portals. Twist: a long slide counts as one tick, so sliding beats the timer. Combine: a conveyor delivers a box to a timed button after you've left it.

- [ ] **R1 Spec.** Finalise the spec above and fill the timed button's row.
- [ ] **R2 Element and format.** The `holdTicks` field, the per-button counter in the state, and the after-step countdown.
- [ ] **R3 Drawing and sounds.** Countdown marks on the button; a tick event (placeholder sound).
- [ ] **R4 Fixtures.** Released and expired, pressed again mid-countdown, a box holding it, a fizzled box starting the countdown, a portal crossing counted as one tick, a slide counted as one tick.
- [ ] **R5 Solver check.** Each timed button adds a counter the key doesn't hold, and a button counting down is pressed with nothing on it, which unpacking a key rules out, so the key check fails as soon as a countdown runs. `npm run verify` passes with the timed button chambers in (open decision 12).
- [ ] **R6 Docs.** The timed button in `docs/elements.md`.
- [ ] **R7 Chambers.** Teach and test chambers, solutions, a cold playtest.

### Phase 6 — Push blocks that bend beams 90° (gated)

Only if go/no-go point 3 says yes.

Draft spec:
- A solid block. It blocks walking and shots, holds buttons down, and reflects beams by a fixed `/` or `\`. It can't be carried.
- Walking into it pushes it one tile if the tile beyond is free for a block (not a wall, active barrier, closed door, closed exit, open ditch, another block, the exit, or a switch); otherwise the move is refused.
- Pushed into a wall holding a portal (open side facing it, both portals open), it comes out of the other portal if that exit tile is free for it.
- Pushed onto an active fizzler, it resets to its start.
- Pushing can create dead ends (a block in a corner). No warning reports them (README decision 10): undo and Restart chamber get the player out.

Chambers. Teach: push a block onto a button. Test: push it so its mirror sends a beam to a receiver. Twist: push it through a portal. Combine: a beam, a block and a mirror box together.

- [ ] **Go/no-go.** Decide using go/no-go point 3; record the reason either way.
- [ ] **R1 Spec.** Finalise the spec above and fill the push block's row.
- [ ] **R2 Element and format.** The push block element file, its optional list, and the solid-movable hook.
- [ ] **R3 Drawing and sounds.** A heavy block with a diagonal; a push event.
- [ ] **R4 Fixtures.** A push, a refused push, a push through a portal, a block holding a button, a block bending a beam, a block reset by a fizzler.
- [ ] **R5 Solver check.** Each block adds a tile to the key, and walking into one pushes it, so a move changes more than the subject's tile, which the solver's walks assume it can't. `npm run verify` passes with the push block chambers in (open decision 12).
- [ ] **R6 Docs.** The push block in `docs/elements.md`.
- [ ] **R7 Chambers.** Teach and test chambers, solutions, a cold playtest.

### Phase 7 — Echo (gated by open decision 1)

Draft spec for option B (only if chosen):
- An "echo pad" floor tile. Stepping on it ends the current attempt: the chamber resets to its start, and a ghost replays the attempt just ended, one action per tick, alongside the new attempt.
- The ghost walks and holds buttons down. It doesn't shoot, carry, use switches or go through portals; walking into a portal wall stops it.
- One ghost at most. A recording longer than the cap (about 40 ticks) can't start an echo.

- [ ] **Decide.** Sketch a teach chamber by hand and judge it as open decision 1 says, with no solver (README decision 10); settle open decision 1 and close README open decision 3.
- [ ] **If built, R1–R7.** Run the recipe as in the earlier phases, with fixtures for: the ghost holding a button, the ghost stopped by a portal wall, the recording cap, and the reset on the echo pad. For R5, the recording is state far beyond the solver's key.
- [ ] **If cut.** Record the reason under *Decisions made* and remove the echo pad from the names list.

### Phase 8 — Mechanics wrap-up

- [ ] **Interaction table complete.** No "to do" cells left; each cell is backed by a rule fixture or forbidden by chamber validation.
- [ ] **Docs and AGENTS.md.** `docs/elements.md` covers every element; AGENTS.md's layout and rules mention the new elements, and the lab chambers if open decision 3 chose A.
- [ ] **Campaign plan table.** Fill in its teach notes, sounds and colours with real results from the playtests. Verify: every row the plan keeps is filled in.

### Phase 9 — Catalogue and links that scale

- [ ] **Load chambers without a hand-kept list.** Replace the static imports in `src/services/chamber_catalogue.ts` with `import.meta.glob`, excluding stage 01's recorded solutions, which sit next to the chamber files as `chamber_N.solution.json` (for example `['@/chambers/chamber_*.json', '!@/chambers/*.solution.json']`). The play order stays one typed list of permanent ids; chamber files stay named by permanent id (`chamber_<id>.json`), and display numbers come from position, never typed by hand. Renaming a chamber file renames its solution file too. Start eager (every chamber in the bundle; 20 chambers ≈ 12–16 KB gzipped); switch to lazy loading only if stage 03's bundle-size watch flags it. Verify: build output size recorded before and after.
- [ ] **Catalogue check.** A local check that every chamber file appears in the play order exactly once, ids are unique, and every chamber has a recorded solution (from 01's checks). Verify: break each rule once on purpose and the check fails.
- [ ] **Numbering and links** (open decision 9, settled by README decision 13). Links stay by position (`/chamber/N`): the route in `src/router.ts` doesn't change, and there is no redirect table; unknown chambers still fall back home. Verify: in `npm run preview`, the first and the last number open their chambers and an unknown one goes home.
- [ ] **Progress follows the chamber.** Progress is already keyed by id (00); links and the last chamber kept in memory follow position, as today. Verify: reorder two chambers in the play order locally; completions, best times and the highlight on return follow the chamber.
- [ ] **Analytics stays comparable.** `chamber_number` keeps meaning the position in the list (0 for the tutorial, then 1, 2, 3…), like the links (open decision 9), and `chamber_id` follows the chamber across reorders; no new parameter is needed. Verify: a production preview build sends the position as `chamber_number` (GA4 DebugView).

### Phase 10 — A Play menu that scales

- [ ] **Design the scrolling chamber list** (uses the frontend-design skill). Today the home menu has up to three columns (sections, rows, detail) and the Play list can't scroll. Twenty chambers don't fit as fixed-height rows, so the chamber column scrolls, with the map staying in the third column. It must keep the keyboard model in `AGENTS.md` (Up/Down within a column with wrapping, Right/Enter steps in, Left/Escape steps back, one Tab stop per column, hover highlights, held Enter ignored), and leave room for stage 05's Editor entry. Verify: the design is written down here before building.
- [ ] **Build the scrolling chamber list** (uses the frontend-design skill). The highlighted row scrolls into view, the cascade still lines up with `--menu-row-height`, and interface sounds play as `AGENTS.md` lists. Verify: keyboard-only and pointer-only walks through all 20 chambers, wrapping from the last to the first; `prefers-reduced-motion` respected.
- [ ] **Back from a chamber.** Play opens with that chamber highlighted, focused and scrolled into view, as today. Verify: back from the first, a middle and the last chamber.
- [ ] **Update `AGENTS.md`.** Keyboard ownership, the layout description and the UI direction for the new menu.

### Phase 11 — Campaign content

- [ ] **Chamber plan.** List the 16 new chambers in this file, in play order together with chambers 0–3, each with its mechanic or element and its part (teach, test, twist or combine), following the campaign plan table and open decision 8. Starting order: the existing elements first, then the new mechanics in the order built. Later reorders follow playtests, with the friends' analytics informing them: a chamber never moves before the chambers that teach what it needs, the tutorial stays first, and each reorder goes in the changelog. Verify: every mechanic this stage shipped has chambers or a recorded reason it doesn't, and the total is 20.
- [ ] **Authoring workflow before the editor.** Until stage 05's editor exists: hand-write chamber v2 JSON; a development-only route (behind `import.meta.env.DEV`, never in production builds) that loads a chamber file from disk and reloads on save, extending this stage's lab route (Phase 0, if open decision 3 chose A) rather than adding a second one; record the solution by playing it with 01's recorder; tick a per-chamber checklist (solution recorded, one playtest by someone else). Verify: one chamber goes through the whole workflow; a production build has no development route.
- [ ] **Place chambers 0–3 in the campaign.** The tutorial and today's three chambers keep permanent ids 0 and 1–3 wherever the plan puts them; their links follow their new places. Verify: their completions and best times survive.
- [ ] **Author release 1** (about four new chambers; each release ships with a changelog entry in `src/services/changelog.ts`). Verify: `npm run verify` and the catalogue check pass; playtested.
- [ ] **Author release 2.** Same checks.
- [ ] **Author release 3.** Same checks.
- [ ] **Author release 4.** Same checks; the campaign reaches 20 chambers.

### Phase 12 — Medals

- [ ] **Store the best moves and portals.** Extend `src/services/progress.ts` to keep the best moves and fewest portals per chamber id alongside the best time, inside stage 00's progress record, with no version bump or migration (README decision 13; every access in `try`/`catch`, cleared by Reset progress). Update `AGENTS.md`'s persistence section. Verify: complete a chamber twice with different results; reload; Reset progress clears all three.
- [ ] **Medal rules** (open decisions 10 and 11). A small service that turns best values and each chamber's target (its best recorded solution's moves and portals) into medals on three axes. Today only the engine scripts read solution files, so the build needs those counts. Verify: worked examples in a table here match its output for edge cases (exactly the target, one over, better than the target).
- [ ] **Medals on the result dialog and chamber rows** (uses the frontend-design skill). Three axes, plus an "undo used" mark on the result when it applies. Colours keep their `AGENTS.md` meanings; medals must not rely on colour alone. Verify: keyboard flow in the chamber-complete dialog unchanged; contrast checked.
- [ ] **Analytics.** Add medal parameters to `chamber_complete` (new names only; never rename existing ones). Verify: DebugView.

### Phase 13 — Wrap-up

- [ ] **Docs.** `AGENTS.md` (keyboard model, layout, persistence, analytics parameters, chamber numbering and links), `docs/elements.md` and the changelog match what shipped.
- [ ] **README.** Update the stage status, close open decisions 1 and 3 (6 was settled by decision 13), and record any new decisions.
- [ ] **Status.** Set this file to Done once every *Done when* box is ticked.

## Local checks added

- Lab chambers, if open decision 3 chose A, are included in the local checks.
- Rule fixtures replay with their expected outcome (completes, does not complete, or expected state).
- Chamber validation: forbidden element overlaps (Phases 1, 4, 6); emitters and receivers sit on wall tiles with an open face; `holdTicks` within 1–9.
- Oscillation warning: any chamber or fixture in which the replay check or the random walk meets a repeating receiver state is reported.
- The solver check copes with each mechanic as open decision 12 settles (with B, it names the chambers it skips).
- No new size check: the engine smoke check and the random walk already print each chamber's state size, so growth from each mechanic stays visible.
- Catalogue check: every chamber file in the play order exactly once, ids unique, every chamber with a recorded solution.

## Done when

- [ ] Slide floors, rotating arrows, live lasers (emitter, receiver, mirror box), conveyors and timed buttons have each passed R1–R7, or were left out by open decision 8 with the reason recorded.
- [ ] Push blocks are built and passed R1–R7, or were dropped by go/no-go point 3 or open decision 8 with the reason recorded.
- [ ] Echo is decided (README open decision 3 closed), and either built through R1–R7 or cut with the reason recorded.
- [ ] The interaction table is complete, each cell backed by a fixture or forbidden by validation.
- [ ] No mechanic needed engine changes outside its own files beyond the hooks added in Phase 0, or the exceptions are listed here.
- [ ] The campaign plan table is filled in.
- [ ] 20 chambers ship, numbered 0–19, each with a recorded solution, with `npm run verify` and the catalogue check passing.
- [ ] Progress, best times and the return highlight follow chambers after a reorder.
- [ ] The scrolling Play menu works fully by keyboard and by pointer, and `AGENTS.md` describes it.
- [ ] Medals on three axes show on results and rows, are stored by id and are cleared by Reset progress.
- [ ] Local checks pass: every chamber and fixture replays with its expected outcome; shipped chambers raise no oscillation warnings.
- [ ] `docs/elements.md`, AGENTS.md and `todo/README.md` are up to date.

## Go/no-go points

Revised 2026-11-09 (decisions 13 and 14): the solver budget, no-solver, medal par and data volume points were removed and the rest renumbered. The no-solver point, which dropped timed buttons, push blocks and echo, is superseded by README decision 11 (all seven mechanics stay in the plan); the medal par point is now open decision 11.

1. **Hook check (Phase 0).** If a hook a mechanic needs is missing from stage 01 and adding it would reshape the step itself, redesign the mechanic to avoid it or drop it.
2. **Laser oscillation (Phase 3).** If oscillations show up in natural play (fixtures or playtests), restrict them. Either forbid a receiver from linking to anything a beam reaching it passes through (checked by validation), or make receivers latch on like switches.
3. **Push blocks (Phase 6).** Build them only if mirror boxes can't express the laser puzzles the author wants. No warning reports a dead end (README decision 10): undo and Restart chamber get the player out of one.
4. **Echo (Phase 7).** Build it only if a teach chamber sketched by hand shows it is worth its cost (open decision 1); otherwise cut it.

## Risks

- **Interactions multiply.** Each new element must be defined against every other. The interaction table and fixtures exist so that gaps show up as "to do" cells, not as player bug reports.
- **Beams settle in surprising ways.** Feedback through receivers and loops through portals are handled by deterministic rules and warnings, but they can still confuse players. Watch the playtest notes.
- **State growth.** Mirror boxes and push blocks (positions), timed buttons (counters) and echo (histories) each grow the state, and conveyors make far more of it reachable. The printed state size shows it early; each also breaks the solver check unless open decision 12 handles it.
- **New elements must read clearly in both looks.** Slide floor and plain floor, conveyor and arrow, beam and laser field must stay distinct in the standard look and blueprint mode. R3's check in both looks and the cold playtests catch this.
- **"Moves" changes meaning.** A slide or a conveyor ride moves many tiles on one key. Follow stage 01's definition (one move) and note any change in meaning, because analytics parameter names are permanent and their history spans the change.
- **Lab chambers leaking.** Once friends play, unfinished chambers in the catalogue reach them, and the Play menu overflows until Phase 10 makes it scroll. Switch to the lab list then (open decision 3).
- **Feeling borrowed.** Keep names, looks and combinations original (decision 1).
- **Mechanics barely used.** With 16 new chambers, a mechanic may get only one or two. Open decision 8 settles the fit before anything is built.
- **Content volume.** 16 chambers are most of the campaign phases' work. Ship them in small releases, so the game grows instead of waiting.
- **Reordering surprises players.** Display numbers and links change after a reorder, which friends will see. Progress is safe (keyed by id); say what changed in the changelog.

## Notes for later stages

- **Stage 05:** the editor needs a palette entry for each element, placement validation (the same rules as the local chamber validation), link editing for receivers, timed buttons, rotating arrows and conveyors.
- **Stage 05:** the editor reuses the chamber format, the solution recorder and the per-chamber authoring checklist.
- **Stage 05:** campaign links stay by position (README decision 13); any new route needs a no-cache header in `firebase.json`.
- **Stage 02 (stopped):** if the solver is ever revisited, its state key (`docs/solver.md`) must grow with the new state: mirror box and push block positions, timed button counters, link flags for arrows, conveyors and emitters.
- Notes (filled in during this stage): the campaign plan table, the chamber plan, the Play menu design, medal worked examples.
