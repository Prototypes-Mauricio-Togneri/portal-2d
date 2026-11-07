# Stage 03 — Mechanics where more things go through portals

Status: Draft
Last revised: 2026-11-06

## Goal

Today only the subject and a carried box go through portals; shots and lasers never do, and lasers are fixed tiles. This stage adds a set of original mechanics that send more things through portals or give movement a new shape, while keeping the rules discrete and solvable: slide floors, rotating arrows, live lasers (emitters, beams, receivers, mirror boxes), conveyors, timed buttons, and possibly push blocks and echo. Each mechanic ships complete: exact rules, one element file, chamber format support, flat drawing, solver support, documentation, rule fixtures, a teach chamber and a proof chamber. Stage 04 then builds the wings of chambers around them, using the chamber counts and teach notes this stage hands over.

## Depends on

None of this exists yet. These are assumptions; Phase 0 checks them against what stages 01 and 02 actually delivered.

**From stage 01 (engine v2)**

- A pure step: *state + one action → next state*, with a copyable state and the one-frame lags of today's engine gone.
- Elements described by data, one file per type, declaring at least: blocks walking, blocks shots, holds portals, linkable, per-element state, drawing.
- Hooks this stage needs from that element system (Phase 0 checks each one):
  1. **Movement continuation**: an element can keep the subject moving after it enters a tile (slide floors), or move it after its step (conveyors).
  2. **After-step update**: an element acts once per tick after the subject's move (conveyors, timed buttons).
  3. **Derived state recomputed every step**: state that is calculated, not stored (beams, lit receivers).
  4. **Solid movable objects**: walking into one pushes it (push blocks).
  5. **Per-element counters** stored in the state (timed buttons).
  6. **Link actions beyond open/close**: an element can do something else when linked (rotate an arrow, switch a conveyor on).
- Landing checks applied on every tile the subject enters, including coming out of a portal (stage 01 fixes the inherited bug). Slide floors depend on this.
- Chamber format v2 with a version number, automatic upgrades, optional element lists and "one switch driving groups".
- Replays and recorded solutions, a local replay check, and sounds sent as events instead of played by the rules.
- A settled definition of "moves" (README open decision 1). Slides and conveyors move the subject several tiles on one key, so the definition matters here.
- Input owning arrows, A, D, Space and Ctrl (remappable). This stage adds no keys.

**Stage 01 as built, 2026-11-07** (kept from its notes when its file was removed)

- Hooks an element definition (`src/game/rules/elements/`) can have today: `interact`, `subjectInside`, `everyPass`, `linkUnblocked` and `linkBlocked`. 9 of the 11 element types have hooks, but six only set their own flag. The core step has element-specific code only for boxes (carrying, pick-up, put-down) and the exit check.
- The six hooks above: link actions beyond open and close (6) fit `linkUnblocked` and `linkBlocked` as they are; derived state (3) fits a pass hook in the step's repeat loop, which is where travelling and bending lasers go; an after-step update (2) and movement continuation (1) need new hook slots, after the repeat loop and after the action; per-element counters (5) need a new section in the state layout; solid movable objects (4) need walking to ask a hook. None needs the step reshaped.
- A new element isn't one file yet: the chamber file reader and the validator still list elements by hand (see "Adding an element" in `docs/elements.md`). Making them read the registry is the step that would bring a new element close to one file.

**From stage 02 (solver)**

- A solver over the v2 state with a compact state encoding, a per-chamber budget (time and states), a local "solve every chamber" check, par storage, the shortcut finder and the dead-end warning.
- If the solver prototype failed in stage 02, see go/no-go point 6.

**How elements work today** (the base the new mechanics extend)

- Walking: `State.updateSubjectPosition` (`src/game/state.ts:312`) refuses a tile with an active barrier, door, closed exit, open ditch or lit laser, and only enters an arrow moving in its direction. Walking into a wall holding a portal, from the tile in front of it, with both portals open, sends the subject out of the other portal (`exitPortal`, `state.ts:396`), which today skips every landing check.
- Shots: `getCollisionWall` (`state.ts:201`) traces a straight line that stops at active fizzlers, barriers, doors and a closed exit, passes lasers, ditches and boxes, and lands on a wall tile.
- Links: buttons activate their links when pressed and deactivate them when released (`button.ts`); switches only ever activate (`switch.ts`). Only barriers, boxes, ditches, doors, the exit, fizzlers and lasers can be linked (`chamber.ts:19`); arrows cannot. Linking a box resets it to its start, and deactivating one throws (`chamber.ts:316`).
- Lasers: one on/off tile each; `direction` (`H`/`V`) only changes the drawing (`laser.ts`, `renderer.ts:427`).
- Arrows: fixed, unlinkable (`arrow.ts`, `chamber.ts:68`).
- Boxes block nothing, can stack, follow the subject at the end of the frame (`subject.ts:95`), and a fizzler resets a carried box to its start (`subject.ts:70`).
- Barriers can sit on wall tiles (chamber 2 has 8 like this, chamber 3 has 1). A raised barrier stops shots before they reach the wall, so that wall takes portals only while the barrier is down, and raising it removes the portal (`chamber.ts:316`). This is already a switchable portal surface.
- Drawing: `Renderer.render` (`renderer.ts:548`) draws floor, arrows, walls, then each active blocker, portals, buttons, switches, boxes, subject, and fizzlers last. Colours are hex literals on each element class.

## Decisions made

| # | Date | Decision |
|---|---|---|
| 1 | 2026-11-06 | Mechanics lean original: names, look and combinations are this game's own, not copies of another game's elements. Names here are working names; stage 04 may rename them for the identity |
| 2 | 2026-11-06 | Today's rules are deleted after stage 01 (README decision 3), so new mechanics only need to work in v2 |
| 3 | 2026-11-06 | The rules stay discrete: everything happens inside one step, nothing depends on time |
| 4 | 2026-11-06 | No new keys. Every mechanic works with arrows, A, D, Space and Ctrl |
| 5 | 2026-11-06 | A mechanic the solver cannot judge within budget does not ship (stage 05 publishes only solver-checked chambers) |
| 6 | 2026-11-06 | This stage builds a teach chamber and one proof chamber per mechanic. Full wings of chambers are stage 04's job |

## Open decisions

**1. Echo: build it?** (README open decision 3)
- *A. Cut it.* No cost, and the stage ends sooner.
- *B. Design it last, with hard limits:* one ghost, a recording capped at about 40 ticks, a ghost that only walks and holds buttons (no portals, no carrying, no switches). The solver then has to search the first attempt's recordings and the second attempt together; that cost is measured on the teach chamber before anything else is built.
- *C. Replace it with something cheaper:* for example a second subject you hand control to. The state grows by one position instead of a whole input history, but it needs a key to switch, which breaks decision 4.
- **Recommendation: B, decided at Phase 7.** Cut it if the teach chamber's two-phase search misses the solver budget.

**2. What happens to today's laser tiles once live lasers exist?**
- *A. Keep them as their own element* (a fixed "laser field"). Existing chambers stay unchanged and need no upgrade.
- *B. Convert them to emitter plus beam* through a format upgrade. One laser family, but today's chambers change behaviour (beams could then bend through portals) and their recorded solutions must be redone.
- *C. Remove them.* All three current chambers use lasers or would need redesign.
- **Recommendation: A.** Stage 04 can restyle them so the two read as different things.

**3. Where do this stage's chambers live before stage 04 places them?**
- *A. A development-only lab list:* lab chambers outside the catalogue, playable only in `npm run dev` and included in the local checks. They get permanent catalogue ids only when stage 04 adds them to the game.
- *B. Append them to the public catalogue.* Playable straight away, but the Play menu cannot scroll yet (stage 04 fixes that) and the order is temporary.
- *C. Keep them only as replay and solver fixtures.* Nobody can play them by hand, so no cold playtest.
- **Recommendation: A.**

**4. What counts as one tick for timed buttons and conveyors?**
- *A. One action that moves the subject:* a step, a portal crossing or a whole slide each count as one tick. Turning, shooting and interacting don't count, so there is no free "wait" action.
- *B. Every accepted action,* turns and shots included. Turning in place becomes a way to wait, which makes timers trivial.
- *C. Real time.* Breaks the pure step. Rejected.
- **Recommendation: A**, with the same unit as stage 01's "moves" if that decision allows it.

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
- *A. Both, one tile per tick.* Most puzzles, and the most solver states.
- *B. Loose boxes only.* "The world moves when you move" without forcing the subject around.
- *C. The subject only.* Overlaps with slide floors.
- **Recommendation: A**, falling back to B if the solver budget fails.

## Steps

### Mechanic order

Ordered by design value against solver cost, cheapest high-value first, so the element system is proven on small mechanics before the biggest one:

| # | Mechanic | Design value | New solver state | Why here |
|---|---|---|---|---|
| 1 | Slide floors | High: momentum through portals, very much this game's own | None: a slide is resolved inside one step, and it shortens search depth | Best ratio; also tests the "movement continuation" hook and the landing checks stage 01 fixed |
| 2 | Rotating arrows | Medium alone, high with slides | One flag per linked arrow (a link flag, like a barrier's) | Tiny; proves "link actions beyond open/close" |
| 3 | Live lasers (emitters, beams, receivers, mirror boxes) | Highest: beams bend through portals, which matches the stage's theme | Beams and lit receivers are derived, not stored; mirror boxes add positions like boxes do | Biggest mechanic, built once the hooks are proven |
| 4 | Conveyors | Medium-high: the world moves as you do; boxes travel through portals on their own | No new fields, but box positions change every tick, so many more states are reachable | Moderate cost; reuses the tick from open decision 4 |
| 5 | Timed buttons | Medium: route-length puzzles | One counter (0..N) per timed button, up to ×(N+1) states each | Cheap to build, expensive to solve; capped |
| 6 | Push blocks that bend beams 90° | Medium, overlaps with mirror boxes | Solid block positions; pushing creates dead ends | New action (push) and dead ends; gated by go/no-go point 4 |
| 7 | Echo | High novelty | A whole recorded input history | Gated by open decision 1 |

### The recipe

Every mechanic phase repeats these seven steps (R1–R7). Each phase below gives the mechanic-specific content.

- **R1 Rules spec.** Finalise the draft spec in this file and fill the mechanic's row of the interaction table (Phase 0). Verified by checking every column: portals (subject, shots, beams), loose and carried boxes, fizzlers, buttons, switches, arrows, ditches, barriers, doors, exit, laser fields and every earlier new mechanic.
- **R2 Element and format.** One element definition file in stage 01's layout, plus an optional list in format v2 whose type accepts the JSON import without a cast. Add an upgrade only if an existing element changes. Verified by the build, and by every existing replay still passing unchanged.
- **R3 Drawing and sound events.** Flat drawing in the current look (the rework is stage 04), hex colours in `src/game/`, no portal blue or orange, and none of the UI's meanings (red = caution, green = completed). Sound events reuse existing sounds as placeholders. Verified in `npm run dev` at 1× and 2× pixel ratio, with the sound setting off silencing it.
- **R4 Rule fixtures.** One tiny chamber and recorded inputs for each spec bullet and edge case, each asserting its expected outcome. Verified by the local replay check passing, and failing once when the rule is deliberately broken (a one-off spot check, then reverted).
- **R5 Solver.** Successor generation and state encoding. Record the states explored and the time on the fixtures and the teach chamber. Verified by staying within stage 02's budget.
- **R6 Docs.** A `docs/elements.md` row, notes and interactions; AGENTS.md if rules text or keyboard ownership changes. Verified by reading the docs against the spec.
- **R7 Chambers.** A teach chamber and one proof chamber (test or twist) in the lab, each with a recorded solution, par from the solver and a clean shortcut-finder report. The author plays each cold and writes down any confusion as signage notes for stage 04. Verified by the local checks plus the playtest notes.

### Phase 0 — Ready the stage

- [ ] **Revisit.** Re-read stage 01's element definition contract, format v2 and replay format, and stage 02's state encoding and budget. Rename everything in this file to their real names; set the status to Ready.
- [ ] **Hook check.** Compare the six hooks under *Depends on* with what stage 01's element system supports. For each missing hook, either add it to the engine once, as its own step here, with replays proving no change to existing chambers, or drop the mechanics that need it (go/no-go point 1).
- [ ] **Settle open decisions 2–7.** Record the answers under *Decisions made* (echo waits for Phase 7).
- [ ] **Lab chambers.** Set up the home chosen in open decision 3. For option A: a lab folder of chamber files, a development-only way to open one (registered only when `import.meta.env.DEV`, so it never ships), and the local checks covering it. Verified by opening a lab chamber in `npm run dev` and confirming the production build contains none.
- [ ] **Interaction table.** Add a section to `docs/elements.md` listing every element against every other. Each cell is a rule, "can't happen" (chamber validation forbids it) or "to do". Existing elements fill their cells first, from the current rules.
- [ ] **Outcome assertions in replays.** Confirm stage 01's replay format can assert an outcome: completes, does not complete, or reaches an expected state hash. Add it if missing. Verified by one passing and one deliberately failing fixture.
- [ ] **Names and colours.** Choose working names and flat colours for the new elements (decision 1, R3 constraints) and record them in `docs/elements.md`.

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
- A slide counts as one tick and, subject to stage 01's decision, one move.
- Chamber validation: a slide floor can't share a tile with a wall, ditch, door, exit, arrow, switch or conveyor.

Chambers. Teach: a slide-floor room where stepping on slides you to the far wall, and the exit can only be reached by placing a portal so the slide comes out facing it. Test: two slides joined by portals, where the order you place them in matters. Twist: an active fizzler on the slide path wipes your portals mid-slide, so the portal you were aiming for is gone. Combine: carry a box across slides and through a portal to a button you can only reach by sliding.

- [ ] **R1 Spec.** Finalise the spec above and fill the slide floor's row.
- [ ] **R2 Element and format.** The slide floor element file and its optional list in format v2.
- [ ] **R3 Drawing and sounds.** A pale floor tile with thin diagonal lines; slide start and stop events, with placeholder sounds.
- [ ] **R4 Fixtures.** Slide to a wall, onto a normal tile, through a portal onto a slide and onto a normal tile, a fizzler mid-slide, an arrow mid-slide, the exit mid-slide, a refused loop, and a button passed over without being pressed.
- [ ] **R5 Solver.** A slide as one successor; record states and time.
- [ ] **R6 Docs.** The slide floor in `docs/elements.md`.
- [ ] **R7 Chambers.** Teach and test chambers in the lab, solutions, par, a cold playtest.

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
- [ ] **R5 Solver.** The arrow's flag in the state encoding; record states and time.
- [ ] **R6 Docs.** Update the arrow's row: "Can be activated/deactivated?" becomes "Yes, when linked".
- [ ] **R7 Chambers.** Teach and twist chambers in the lab, solutions, par, a cold playtest.

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
- **Receiver**: sits on a wall tile and listens on one face. Lit, it acts as a pressed button (activates its links); unlit, as a released button (deactivates them). So the rule that box links can't be deactivated also applies to receivers until stage 01 settles box links.
- **Mirror box**: carried like a box (Space). It holds buttons down like a box, goes through portals with the subject, is reset by fizzlers like a box, and reflects beams by a fixed `/` or `\` (open decision 6).
- **Settling a step**: apply the action and the subject's movement; trace the beams; evaluate buttons (by position) and receivers (by beams) in chamber data order; apply their links; trace again; repeat until nothing changes. If a state repeats (a receiver opening a door that blocks its own beam), stop at the first repeat, keep that state, and report it in the local checks as an oscillation warning.

Chambers. Teach: one emitter and one receiver that opens the exit door, with a wall between them; place a portal pair to route the beam around. Test: the beam has to turn a corner, coming out of a portal on a perpendicular wall. Twist: once routed, the beam blocks your own path, so you must route it, stand in it to switch the receiver off, or route it again after crossing. Combine: carry a mirror box through portals to bend a beam onto a receiver behind a fizzler (the box resets if you carry it through).

- [ ] **R1 Spec.** Finalise the spec above, including the settling rule, and fill the rows for emitter, beam, receiver and mirror box.
- [ ] **R2 Element and format.** Element files for emitter, receiver and mirror box; optional lists in format v2. Laser fields are kept as decided in open decision 2.
- [ ] **R3 Drawing and sounds.** The beam as a thin line, coloured unlike a laser field; emitter and receiver as wall notches; the mirror box as a box with a diagonal. Receiver on/off events.
- [ ] **R4 Fixtures.** A straight beam, a beam through portals, a beam loop, a beam blocked by the subject, a mirror bend, a mirror carried through a portal, a receiver opening and closing a door, an oscillation that settles deterministically, a fizzler resetting a carried mirror.
- [ ] **R5 Solver.** Beam tracing in the step; mirror box positions in the state. Record states and time; confirm no shipped chamber raises an oscillation warning.
- [ ] **R6 Docs.** All four entries in `docs/elements.md`, with the settling rule written out.
- [ ] **R7 Chambers.** Teach and test chambers in the lab, solutions, par, a cold playtest.

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
- [ ] **R5 Solver.** The after-step update in the successor; record states and time, and compare A against B of open decision 7 if the budget is tight.
- [ ] **R6 Docs.** The conveyor in `docs/elements.md`.
- [ ] **R7 Chambers.** Teach and twist chambers in the lab, solutions, par, a cold playtest.

### Phase 5 — Timed buttons

Draft spec:
- A button with `holdTicks: N` (1–9). It is pressed while the subject or a box is on it, like a button today.
- Once nothing is on it, it stays down for N more ticks, counting down by one per tick, then releases (its links deactivate). Pressing it again while it counts down sets it back to N.
- A box on it holds it indefinitely. A box reset by a fizzler, or a box conveyed off it, starts the countdown.
- The tick follows open decision 4: a portal crossing counts as one tick, and so does a whole slide.
- The drawing shows N small marks that disappear as it counts down.
- Limits until the solver says otherwise: N ≤ 9, and at most 2 timed buttons per chamber.

Chambers. Teach: a timed button opens a door 5 steps away; get there in time. Test: the only route that's short enough goes through portals. Twist: a long slide counts as one tick, so sliding beats the timer. Combine: a conveyor delivers a box to a timed button after you've left it.

- [ ] **R1 Spec.** Finalise the spec above and fill the timed button's row.
- [ ] **R2 Element and format.** The `holdTicks` field, the per-button counter in the state, and the after-step countdown.
- [ ] **R3 Drawing and sounds.** Countdown marks on the button; a tick event (placeholder sound).
- [ ] **R4 Fixtures.** Released and expired, pressed again mid-countdown, a box holding it, a fizzled box starting the countdown, a portal crossing counted as one tick, a slide counted as one tick.
- [ ] **R5 Solver.** Counters in the state encoding; record states and time; confirm or tighten the limits.
- [ ] **R6 Docs.** The timed button in `docs/elements.md`.
- [ ] **R7 Chambers.** Teach and test chambers in the lab, solutions, par, a cold playtest.

### Phase 6 — Push blocks that bend beams 90° (gated)

Only if go/no-go point 4 says yes.

Draft spec:
- A solid block. It blocks walking and shots, holds buttons down, and reflects beams by a fixed `/` or `\`. It can't be carried.
- Walking into it pushes it one tile if the tile beyond is free for a block (not a wall, active barrier, closed door, closed exit, open ditch, another block, the exit, or a switch); otherwise the move is refused.
- Pushed into a wall holding a portal (open side facing it, both portals open), it comes out of the other portal if that exit tile is free for it.
- Pushed onto an active fizzler, it resets to its start.
- Pushing can create dead ends (a block in a corner), so stage 02's dead-end warning must exist first.

Chambers. Teach: push a block onto a button. Test: push it so its mirror sends a beam to a receiver. Twist: push it through a portal. Combine: a beam, a block and a mirror box together.

- [ ] **Go/no-go.** Decide using go/no-go point 4; record the reason either way.
- [ ] **R1 Spec.** Finalise the spec above and fill the push block's row.
- [ ] **R2 Element and format.** The push block element file, its optional list, and the solid-movable hook.
- [ ] **R3 Drawing and sounds.** A heavy block with a diagonal; a push event.
- [ ] **R4 Fixtures.** A push, a refused push, a push through a portal, a block holding a button, a block bending a beam, a block reset by a fizzler, a dead end the warning reports.
- [ ] **R5 Solver.** Block positions in the state; record states and time.
- [ ] **R6 Docs.** The push block in `docs/elements.md`.
- [ ] **R7 Chambers.** Teach and test chambers in the lab, solutions, par, a cold playtest.

### Phase 7 — Echo (gated by open decision 1)

Draft spec for option B (only if chosen):
- An "echo pad" floor tile. Stepping on it ends the current attempt: the chamber resets to its start, and a ghost replays the attempt just ended, one action per tick, alongside the new attempt.
- The ghost walks and holds buttons down. It doesn't shoot, carry, use switches or go through portals; walking into a portal wall stops it.
- One ghost at most. A recording longer than the cap (about 40 ticks) can't start an echo.
- Solver: two phases. Search first-attempt paths for the ghost schedules they produce (when each button is held), then solve the second attempt with that schedule fixed. The cost is roughly the number of distinct schedules times the second search.

- [ ] **Decide.** Measure a hand-built teach chamber with a throwaway two-phase solver against the budget; settle open decision 1 and close README open decision 3.
- [ ] **If built, R1–R7.** Run the recipe as in the earlier phases, with fixtures for: the ghost holding a button, the ghost stopped by a portal wall, the recording cap, and the reset on the echo pad.
- [ ] **If cut.** Record the reason under *Decisions made* and remove the echo pad from the names list.

### Phase 8 — Wrap-up

- [ ] **Interaction table complete.** No "to do" cells left; each cell is backed by a rule fixture or forbidden by chamber validation.
- [ ] **Docs and AGENTS.md.** `docs/elements.md` covers every element; AGENTS.md's layout and rules mention the new elements and the lab chambers.
- [ ] **Hand-off to stage 04.** Fill in the table under *Notes for later stages* with real numbers from the playtests.
- [ ] **README.** Update the stage status, close open decision 3, and record any new decisions.
- [ ] **Status.** Set this file to Done once every *Done when* box is ticked.

## Local checks added

- Lab chambers are included in the replay and solve checks.
- Rule fixtures replay with their expected outcome (completes, does not complete, or expected state).
- Chamber validation: forbidden element overlaps (Phases 1, 4, 6); emitters and receivers sit on wall tiles with an open face; `holdTicks` within 1–9; every element type a chamber uses has solver support.
- Oscillation warning: any chamber in which the solver meets a repeating receiver state is reported.
- Per-chamber solver cost (states and time) is printed, so growth from each mechanic stays visible.

## Done when

- [ ] Slide floors, rotating arrows, live lasers (emitter, receiver, mirror box), conveyors and timed buttons have each passed R1–R7.
- [ ] Push blocks are built and passed R1–R7, or were dropped by go/no-go point 4 with the reason recorded.
- [ ] Echo is decided (README open decision 3 closed), and either built through R1–R7 or cut with the reason recorded.
- [ ] The interaction table is complete, each cell backed by a fixture or forbidden by validation.
- [ ] Local checks pass: every chamber and fixture replays with its expected outcome; every chamber solves within budget; shipped chambers raise no oscillation warnings.
- [ ] No mechanic needed engine changes outside its own files beyond the hooks added in Phase 0, or the exceptions are listed here.
- [ ] `docs/elements.md`, AGENTS.md and `todo/README.md` are up to date.
- [ ] The hand-off table for stage 04 is filled in.

## Go/no-go points

1. **Hook check (Phase 0).** If a hook a mechanic needs is missing from stage 01 and adding it would reshape the step itself, redesign the mechanic to avoid it or drop it.
2. **Solver budget (every R5).** If a teach or proof chamber exceeds stage 02's budget, redesign first: cap counts (fewer timed buttons, smaller N), narrow scope (conveyors move only boxes), or forbid combinations. Drop the mechanic if that fails. It never ships unsolvable by the solver (decision 5).
3. **Laser oscillation (Phase 3).** If oscillations show up in natural play (fixtures or playtests), restrict them. Either forbid a receiver from linking to anything a beam reaching it passes through (checked by validation), or make receivers latch on like switches.
4. **Push blocks (Phase 6).** Build them only if mirror boxes can't express the laser puzzles the author wants, and stage 02's dead-end warning exists.
5. **Echo (Phase 7).** Build it only if the two-phase search solves its teach chamber within budget; otherwise cut it.
6. **No solver from stage 02.** Mechanics still ship with replays and rule fixtures, but the costly ones (timed buttons, push blocks, echo) are dropped, and stage 05's "publish only what the solver checked" rule must be rethought.

## Risks

- **Interactions multiply.** Each new element must be defined against every other. The interaction table and fixtures exist so that gaps show up as "to do" cells, not as player bug reports.
- **Beams settle in surprising ways.** Feedback through receivers and loops through portals are handled by deterministic rules and warnings, but they can still confuse players. Watch the playtest notes.
- **Solver growth.** Conveyors (boxes drift every tick), timed buttons (counters), push blocks (dead ends) and echo (histories) each multiply the states. The printed per-chamber cost shows it early.
- **Readability before stage 04.** In the flat look, new tiles can be confused with old ones: slide floor with plain floor, conveyor with arrow, beam with laser field. The cold playtests catch this; stage 04 fixes it properly.
- **"Moves" changes meaning.** A slide or a conveyor ride moves many tiles on one key. Follow stage 01's definition and note any change in meaning, because analytics parameter names are permanent and their history spans the change.
- **Lab chambers leaking.** If lab chambers reach the public catalogue early, the Play menu overflows (it can't scroll until stage 04) and they would need permanent ids too soon.
- **Feeling borrowed.** Keep names, looks and combinations original (decision 1); stage 04 owns the final identity.

## Notes for later stages

**Teach → test → twist → combine (input for stage 04's wings).** Each mechanic gets a run of chambers:
- *Teach*: the mechanic alone, with no way to fail at understanding it. 1–2 chambers.
- *Test*: the mechanic alone, but you must use it on purpose. About 3 chambers.
- *Twist*: an unexpected consequence of the rules (a fizzler mid-slide, a beam blocking your own path). About 3 chambers.
- *Combine*: with earlier mechanics. 3–4 chambers.

That's 10–12 chambers per mechanic, which matches the roadmap's ~12 per wing.

**Hand-off table for stage 04** (filled in during Phase 8):

| # | Mechanic | Chambers for its wing | Teach notes (signage, confusion seen) | Sounds needed | Colours to rework |
|---|---|---|---|---|---|
| 1 | Slide floors | 10–12 | — | Slide start, slide stop | Slide floor |
| 2 | Rotating arrows | 6–8 (could share a wing with slides) | — | Arrow turn | Turned-arrow notch |
| 3 | Live lasers | 12+ (could be two wings) | — | Beam hum, receiver on/off | Beam, emitter, receiver, mirror box |
| 4 | Conveyors | 10–12 | — | Conveyor movement | Conveyor |
| 5 | Timed buttons | 8–10 | — | Countdown tick, release | Countdown marks |
| 6 | Push blocks (if built) | 8–10 | — | Push | Push block |
| 7 | Echo (if built) | 8–10 | — | Echo start, ghost | Ghost, echo pad |

- **Stage 04:** the existing elements need wings too (portal basics, boxes and buttons, fizzlers, barriers and doors, arrows, laser fields, ditches). Barriers over walls (switchable portal surfaces, already used in chambers 2 and 3) deserve a teach chamber of their own.
- **Stage 04:** the chamber screen's controls legend needs no new keys (decision 4), but the visual rework must give every new element a distinct, readable look, including in blueprint and colour-blind modes.
- **Stage 05:** the editor needs a palette entry for each element, placement validation (the same rules as the local chamber validation), link editing for receivers, timed buttons, rotating arrows and conveyors, and must offer only elements the solver supports.
- **Stage 02:** the state encoding grows with each mechanic (mirror box and push block positions, timed button counters, link flags for arrows, conveyors and emitters). Plan its format so new fields can be added without breaking stored par values.
