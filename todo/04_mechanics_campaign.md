# Stage 04 — Mechanics and campaign

Status: Draft
Last revised: 2026-11-15

## Goal

Today only the subject and a carried box go through portals; shots and lasers never do, and lasers are fixed tiles. This stage adds a set of original mechanics that send more things through portals or give movement a new shape, while keeping the rules discrete: slide floors, rotating arrows and live lasers (emitters, beams, receivers, mirror boxes). Each mechanic ships complete: exact rules, one element file, chamber format support, drawing in stage 03's reworked look, documentation, rule fixtures and its chambers with recorded solutions. The campaign then grows to its full length: 20 handcrafted chambers in total, numbered 0–19 (stage 03's tutorial as chamber 0, today's three chambers, and 16 new ones built here around the mechanics and the existing elements), in one list with no wings, with a catalogue, links and a Play menu that scale to that many, and an order set by playtests (the friends' analytics informing them).

## Depends on

Stages 00, 01 and 03 are done: their parts below are what they delivered, though Phase 0 still checks each hook. Stage 02 stopped after its prototype (README decision 10).

**From stage 00 (fixes)**, done

- Completions and best times keyed by permanent id; the game canvas sharp on high-DPI screens; analytics sending quits on tab close, an attempt counter and first-completion and new-best flags, collecting since 00 shipped (months of history by now); one local check command.

**From stage 01 (engine v2)**, done 2026-11-07

- A pure step: `step(chamber, state, action)` (`src/game/rules/step.ts`) gives the next state and its events, on an immutable state. Every effect lands inside the step, so the original rules' one-frame lags are gone.
- Elements described by data, one definition file per type in `src/game/rules/elements/`. Each declares when it blocks walking and shots, whether it takes portals, whether links reach it, its blocked flag (with each button's pressed flag, the only per-element state today) and its draw layer. How it is drawn stays browser-side in `src/game/element_drawings.ts`.
- Hooks this stage needs from that element system (Phase 0 checks each one; see "Stage 01 as built" below for what exists):
  1. **Movement continuation**: an element can keep the subject moving after it enters a tile (slide floors).
  2. **Derived state recomputed every step**: state that is calculated, not stored (beams, lit receivers).
  3. **Link actions beyond open/close**: an element can do something else when linked (rotate an arrow).
- The same entry check on every tile the subject enters, coming out of a portal included (stage 01 fixed the inherited bug: `portal_exit_checked` in `docs/elements.md`). Slide floors depend on this.
- Chamber format 2 with a version number, optional element lists and link groups (one button or switch driving a group). The upgrader from format 1 was removed (README decision 13).
- Replays and recorded solutions, a local replay check, and sounds sent as events instead of played by the rules.
- "Moves" is settled: the game counts one move for each step that puts the subject on another tile, undone ones included, and redo counts nothing (README decision 8). A slide moves the subject several tiles on one key, in one step, so it counts as one move.
- Input owning the game keys, remappable, in three layouts: Arrow keys, the default (the arrows, A and D for the portals, Space, Z and X for undo and redo), WASD and mouse (the mouse buttons shoot) and Custom. No key turns in place: the subject turns only to face the mouse pointer, when a mouse button is bound. This stage adds no keys.

**Stage 01 as built, 2026-11-07** (kept from its notes when its file was removed)

- Hooks an element definition (`src/game/rules/elements/`) can have today: `interact` (the switch), `subjectInside` (the fizzler rule), `everyPass` (the button), `linkUnblocked` and `linkBlocked`. 9 of the 11 element types have hooks, but six of them only set their own flag on a link (the door and the exit also report opening and closing, the barrier, now the blocked wall, also closes a portal on its tile; with the light barrier added, now 10 of 12 types have hooks and seven only set their flag). The core step has element-specific code only for boxes (carrying, pick-up, put-down), the exit check and whether a blocked wall takes portals.
- The three hooks above: link actions beyond open and close (3) fit `linkUnblocked` and `linkBlocked` as they are; derived state (2) fits a pass hook in the step's repeat loop, which is where travelling and bending lasers go; movement continuation (1) needs a new hook slot, after the action. None needs the step reshaped.
- A new element isn't one file yet: the chamber file reader and the validator still list elements by hand (see "Adding an element" in `docs/elements.md`). Making them read the registry is the step that would bring a new element close to one file.

**What stage 02 left** (stopped, README decision 10)

- No solvability check, no par from a solver, no shortcut finder, no dead-end warning and no generated chambers. Every chamber is proven solvable by its recorded solution, and every rule by its fixtures.
- The solver prototype in `src/solver/` and its check, `npm run solver:check`, which `npm run verify` runs on every chamber file (`docs/solver.md`). No mechanic depends on the solver; keeping that check passing is all it asks (R5, decision 18).

**From stage 03 (look and sound)**, done 2026-11-14

- The palette module (`src/game/palette.ts`) with named `rgba()` colours, imported directly by the drawing code; the hex-literal exception in `AGENTS.md` lifted.
- The chamber drawn from sprites (`docs/sprites.md`), done 2026-11-14: one WebP file per sprite in `src/assets/images/chamber/`, each drawn in code as an SVG in `art/sprites/` and exported, but for the subject's sprite, painted as a PNG; nothing drawn for a sprite without a file, so a new element's sprites need their files before they join the sprite set; the sprite gallery (`/src/dev/sprite_gallery.html` in `npm run dev`) showing each sprite and the game's drawing of every element. Blocked walls slide their steel apart or shut, ditches slide their grate, doors and the exit slide, fizzlers crumble, and lasers and light barriers fade when switched, and a fizzle breaks up what it takes.
- The animation layer (purely visual interpolation between consecutive states), so the movement new elements cause can animate, with `prefers-reduced-motion` showing plain steps.
- The tutorial first in the list (permanent id 0), as chamber 0 (stage 03 settled that numbers count from 0). Links still follow position.
- The bundle-size watch and the unused-asset check.
- Kept from stage 03's notes when its file was removed (2026-11-14):
  - Every chamber must fit the screen whole, since there is no camera: this stage's chambers stay within that, as does stage 05's grid cap.
  - The home menu's map doesn't redraw when only the pixel ratio changes (a window dragged to a denser screen without changing size), unlike the chamber screen.
  - Profiling baseline (2026-11-09, stage 03's "Profile first" step): chamber 3 (23 × 17, the largest canvas and the most elements), its settled start redrawn every frame, sized as the chamber screen sizes it in a 1920 × 1080 window. Chrome 155 on Linux, Intel UHD Graphics 620 (Mesa, through ANGLE), 8 cores, a 59.9 Hz display at pixel ratio 1, so ratio 2 is simulated by the canvas size (drawn at twice the size and shown at half). Median of 3 runs of 600 frames each, the range in brackets where runs differed:

    | # | Pixel ratio | Canvas | Draw time median / p95 / max | Frame interval median / p95 | Frames skipping a refresh |
    |---|---|---|---|---|---|
    | 1 | 1 | 1357 × 1003 | 0.5 / 0.7 / 1.0 ms (max 0.9–2.0) | 16.7 / 16.7 ms (p95 16.7–16.8) | 0 |
    | 2 | 2 | 2737 × 2023 | 0.5 / 0.7 / 1.0 ms (p95 0.7–0.8, max 0.9–1.1) | 16.7 / 16.8 ms | 0 |

    Both ratios hold 60 fps with a wide margin: drawing takes about 3 % of a frame, and no frame missed a refresh. About a quarter (ratio 1) to half (ratio 2) of the intervals read 16.8 ms instead of 16.7, which is timer rounding at a 59.9 Hz display, not a dropped frame. Draw time is what the canvas calls take on the main thread; the GPU's share shows only in the frame interval. The page draws on a plain background, while the chamber screen draws over a blurred photo beside the rail, so the real screen may cost more; recheck it there once the animation layer draws every frame. To run it again, open `/src/dev/render_profile.html` in `npm run dev`, with the window in front (a covered or minimized window slows its frames, and the page then says its numbers are not valid).

    Real-screen recheck (2026-11-10, stage 03's "Animation layer" step): chamber 3 on the chamber screen itself (over the blurred photo, beside the rail), same machine and display, in a maximized window with a 1920 × 910 page area, at pixel ratio 1. Left and Right presses, alternating every 50 ms for 10 s, kept a step animating, so the level drew on nearly every frame. Time per frame is everything the main thread runs in a frame, the level's frame and the screen's timer together. Median of 3 runs of about 600 frames each, the range in brackets where runs differed:

    | # | Pixel ratio | Canvas | Time per frame median / p95 / max | Frame interval median / p95 | Frames skipping a refresh |
    |---|---|---|---|---|---|
    | 1 | 1 | 1127 × 833 | 0.6 / 0.9 / 1.0 ms (median 0.6–0.7, max 1.0–1.2) | 16.7 / 16.7 ms (p95 16.7–16.8) | 0 |

    Drawing every frame on the real screen still takes about 4 % of a frame, and no frame missed a refresh.

    Depth and ambient life check (2026-11-13, stage 03's "Depth" and "Ambient life" steps): same machine and display, with every sprite still a placeholder plus three temporary glow files (the laser's and both portals', 384 px, removed afterwards), since a glow with no file isn't drawn. First the render profile: chamber 3's settled start, its backdrop copied, its ten laser tiles glowing and its two fizzlers shimmering (a shimmer since removed), every frame. Median of 3 runs of 600 frames each, the range in brackets where runs differed:

    | # | Pixel ratio | Canvas | Draw time median / p95 / max | Frame interval median / p95 | Frames skipping a refresh |
    |---|---|---|---|---|---|
    | 1 | 1 | 1357 × 1003 | 0.8 / 1.2 / 1.7 ms (max 1.6–4.8) | 16.7 / 16.7 ms (p95 16.7–16.8) | 0 |
    | 2 | 2 | 2737 × 2023 | 0.8 / 1.3 / 2.1 ms (p95 1.2–1.3, max 1.6–3.0) | 16.7 / 16.7 ms (p95 16.7–16.8) | 0 |

    Then chamber 3 on the chamber screen at pixel ratio 2, both portals open, so the level drew every frame for the glows and the shimmer alone. The page's `devicePixelRatio` was made to read 2 before the chamber opened, so the canvas was drawn at twice its size and shown at half, as on a dense screen (maximized window, 1920 × 910 page area). Time per frame is everything the main thread runs in a frame, as in the recheck above. Median of 3 runs of 659 frames each:

    | # | Pixel ratio | Canvas | Time per frame median / p95 / max | Frame interval median / p95 | Frames skipping a refresh |
    |---|---|---|---|---|---|
    | 1 | 2 | 2277 × 1683 | 1.0 / 1.6 / 2.2 ms (p95 1.5–1.6, max 2.0–2.6) | 16.7 / 16.7 ms (p95 16.7–16.8) | 0 |

    Every effect so far takes about 6 % of a frame at pixel ratio 2, and no frame missed a refresh, so the renderer stays on the 2D canvas (stage 03's renderer go/no-go point). With the page's reduced-motion query made to match, chamber 3 with its lasers and fizzlers on and a portal open drew nothing over 3 idle seconds, and a move drew one frame, with no glide. A first try, with the browser window behind another, ran idle frames at 30 Hz and drawn ones at 20 Hz; the render profile took that run as valid, since it only rejects idle frames slower than 50 ms.

    High-DPI check (2026-11-13, stage 03's "Check high-DPI again" step): Chrome at 200 % zoom on the same 1080p screen, so a pixel ratio of 2 and a 960 × 455 page. Each canvas's size in device pixels, as Chrome reports it (`devicePixelContentBoxSize`), matched its own pixels exactly, so every canvas pixel lands on one screen pixel: chamber 3 at 1035 × 765 (45 px tiles), and the home menu's map. Seen at full resolution, the walls with their bevels and shadows, the subject at rest and part way through a glide, and the pieces of a fizzle are all sharp. Zooming back to 100 % with chamber 3 open refit it at once, without a reload, to 1127 × 833, again one to one. At 200 % the page is too small for the home menu's map, which draws only 12 × 10 pixels; a real high-DPI screen gives it far more room. Sprites are only enlarged past their 256 px for the tutorial on a 6K-class screen (an estimate from the stage's margins: 434 page pixels across and 66 down). The author accepted 200 % zoom in place of a real high-DPI screen.

**How elements work today** (the base the new mechanics extend; the full rules are under "Rules" in `docs/elements.md`, the code in `src/game/rules/`)

- Walking: `move` in `step.ts` first faces the subject the way pressed; on an arrow tile only the arrow's way acts. Then `canEnter` refuses a wall (a blocked wall included), a tile outside the chamber, a tile with a blocked light barrier, ditch, door, exit or laser (each definition's `blocksWalking`), and an arrow tile entered against its way. Walking into a wall that holds a portal on the side facing the subject, with both portals open, crosses it (`crossPortal`). The tile in front of the other portal goes through the same `canEnter`, so a crossing onto a tile the subject can't enter is refused.
- Shots: `shoot` in `step.ts` goes tile by tile the way the subject faces. A fizzler or a light barrier that is on, a closed door or the closed exit stops it (`blocksShots`); everything else lets it through. It opens the portal on the first wall it reaches if that wall takes portals (a blocked wall only while unblocked) and no portal sits on that side or a neighbouring side; outside the edge counts as a wall that takes none. Standing in a fizzler that is on silences the portal keys (`stopsShootingFrom`), and carrying a box refuses them, with the error sound.
- Links: `CompiledChamber` (`compiled_chamber.ts`) resolves each button's and switch's links once, groups expanded. The draft's `applyLinks` (`state_draft.ts`) runs each linked element's `linkUnblocked` or `linkBlocked` hook. A button (`elements/button.ts`, judged in every pass) unblocks its links going down and blocks them coming up. A switch (`elements/switch.ts`, on the interact key) only ever unblocks them, and is refused while the subject carries a box. Only blocked walls (one tile each), light barriers, ditches, boxes, fizzlers, doors, lasers and the exit can be linked (`linkable`).
- The repeat loop: after the action and the carried box following, `settle` in `step.ts` runs passes until one changes nothing (capped at 32), then the exit check. A pass runs the hooks of the elements on the subject's tile (the fizzler rule), then every element's pass hook (the buttons).
- Lasers: one on/off tile each, blocking walking only. `direction` (`H`/`V`) changes only the drawing and lets two crossing lasers share a tile, which either one blocks while it is on.
- Arrows: fixed and unlinkable (`elements/arrow.ts`, `blocksWalking: 'alongDirection'`).
- Boxes: block nothing, and a tile holds at most one, the carried box aside: putting a box down on another is refused, and a box sent back to its start sends the box resting there back to its own start, and so on. Picking up and putting down are in the core step's `interact`, not a box hook. A carried box moves onto the subject's tile after each action (`carryBoxAlong` in `state_draft.ts`). The fizzler rule sends a carried box back to its start, and a link sends a box back unless it is carried; releasing a button linked to a box does nothing (the validator warns).
- Blocked walls (`blockedWalls` in the chamber file, `elements/blocked_wall.ts`) are walls that refuse portals while blocked and take them like any wall while not; walls in `walls` always take portals. Only a one-tile blocked wall can have an `id` and be linked: unblocking it lets it take portals, and blocking it again closes a portal on any of its sides (`blockWall`). Every chamber uses blocked walls; chamber 2 has 8 switchable ones and chamber 3 has 1, and the rest are never linked, so they refuse portals for good. This is already a switchable portal surface.
- Drawing: `Renderer.render` (`src/game/renderer.ts`) draws layer by layer (`DRAW_LAYERS` in `draw_layer.ts`): floor, arrows and walls, drawn once per chamber and tile size as a backdrop, then the blockers, portals, buttons and switches, boxes, the subject and fizzlers, then the lasers' and portals' glows, the fizzle particles and, last, a missed shot's ripple over everything. Inside a layer, each element type is drawn in registry order by its entry in `ELEMENT_DRAWINGS` (`src/game/element_drawings.ts`), as its sprite for its state (`src/game/sprite_set.ts`), through the tile painter, which turns sprites in quarter turns. A sprite with no file isn't drawn. Stage 03's palette module, `src/game/palette.ts`, holds only the colours drawn by code: the background behind the floor, the shared shadow and the ripple in each portal's colour.

## Decisions made

| # | Date | Decision |
|---|---|---|
| 1 | 2026-11-06 | Mechanics lean original: names, look and combinations are this game's own, not copies of another game's elements. Names here are working names, settled when this stage is revisited |
| 2 | 2026-11-06 | Today's rules are deleted after stage 01 (README decision 3), so new mechanics only need to work in v2 |
| 3 | 2026-11-06 | The rules stay discrete: everything happens inside one step, nothing depends on time |
| 4 | 2026-11-06 | No new keys. Every mechanic works with the game keys there are: the moves, both portals, interact, undo and redo (by default the arrows, A, D, Space, Z and X; Ctrl, which turned in place, has since gone) |
| 5 | 2026-11-06 | A mechanic the solver cannot judge within budget does not ship (stage 05 publishes only solver-checked chambers). Superseded by README decision 10: no solver judges chambers; a mechanic ships on its chambers' recorded solutions and its rule fixtures |
| 6 | 2026-11-08 | A mechanic's chambers go into the campaign in this same stage: its teach chamber and the rest of its run, as the campaign plan sets (replaces "a teach and a proof chamber per mechanic; full wings are stage 04's job") |
| 7 | 2026-11-06 | Chamber links (`/chamber/N`, by position) stay as they are until this stage picks the numbering scheme (README decision 4); stage 03 only made the count start at 0 for the tutorial. Settled by README decision 13: links stay by position, with no redirects |
| 8 | 2026-11-06 | Unchanged from `AGENTS.md`: desktop only; colour meanings (blue interaction and success, orange the second portal, red caution, green a completed chamber); `localStorage` keys keep the `portal-2d.` prefix, as a convention, and analytics event and parameter names never change, even after a rename (renaming one splits its history) |
| 9 | 2026-11-08 | Stages 03 and 04 swapped (README decision 11): look and sound come first, so this stage builds on the reworked look and sound |
| 10 | 2026-11-08 | The campaign is 20 chambers in total, numbered 0–19: the tutorial (0), today's three (1–3) and 16 new ones built here. No wings: one ordered list, with no wing manifest, wing menu level, wing unlocking, wing music or wing analytics parameter (replaces about 120 chambers in about 10 wings) |
| 11 | 2026-11-08 | All seven mechanics stay in this plan; how many make the campaign is settled at this stage's revisit (decision 16). Six since decision 15 dropped conveyors, three since decision 16 |
| 12 | 2026-11-08 | Medals and difficulty from data moved here from the old stage 04, since they need the final chambers. Difficulty from data was dropped by decision 13, medals by decision 17 |
| 13 | 2026-11-09 | The author is the only player during development, and a few friends play later (README decision 13): no compatibility work, so links stay by position with no redirect table, no retired-id list and no migration of stored progress. Difficulty from player data and the histogram are dropped, since a few friends are far below any useful sample: the chamber order comes from playtests, with the friends' analytics informing them. Analytics stays. Lab chambers matter once friends play (decision 18) |
| 14 | 2026-11-09 | README decision 10 applied in full: no solvability check, no par from a solver, no shortcut finder, no dead-end warning, no generated, daily or endless chambers. Mechanics ship on recorded solutions and rule fixtures; the medals' par is the best recorded solution, labelled "target" (medals since dropped, decision 17). The old go/no-go point that dropped timed buttons, push blocks and echo without a solver is superseded by README decision 11 (all seven mechanics stay in the plan), and the solver-budget and medal-par points are removed (the data-volume point went with decision 13) |
| 15 | 2026-11-15 | Conveyors dropped. They stood for the original game's Excursion Funnel, but as fixed floor tiles that portals never change they lost what made it a portal mechanic: their one use of their own (sending a box where the subject can't go) was small, carrying the subject overlapped with slide floors, and timed buttons already make timing puzzles. Six mechanics remain; their phase and open decision were removed and the rest renumbered |
| 16 | 2026-11-15 | The campaign's new mechanics are slide floors, rotating arrows and live lasers, about 4 chambers each, with about 4 for the existing elements. Echo, timed buttons and push blocks are dropped from the plan, with their phases, the open decisions only they needed (echo, what counts as a tick) and their go/no-go points; their specs stay in git history (README open decision 3 settled). The phases and open decisions left were renumbered |
| 17 | 2026-11-15 | Medals dropped from the plan, with their phase, their open decisions (undo, thresholds) and storing the best moves and portals: the time stays the only score (README open decision 1 settled) |
| 18 | 2026-11-15 | The other open decisions settled as recommended: today's laser tiles stay their own element; unfinished chambers go straight into the catalogue while only the author plays, and into a development-only lab list once friends play; a beam stops at the subject, which it leaves unharmed; a mirror box's angle is fixed in the chamber file; and the solver check skips, and names, each chamber it can't handle. With every open decision settled, the section was removed; their options stay in git history |
| 19 | 2026-11-15 | Loading chambers without a hand-kept list dropped: it would only save one import line per chamber, the play order stays a hand-typed list anyway, the engine scripts can't use Vite's loading and keep their own list, and TypeScript would stop checking each chamber file against the chamber type. Chambers stay imported by hand in `src/services/chamber_catalogue.ts`; the catalogue check stays |

## Steps

### Mechanic order

Ordered by design value against state growth and build cost, cheapest high-value first, so the element system is proven on small mechanics before the biggest one:

| # | Mechanic | Design value | New state | Why here |
|---|---|---|---|---|
| 1 | Slide floors | High: momentum through portals, very much this game's own | None: a slide is resolved inside one step | Best ratio; also tests the "movement continuation" hook and the landing checks stage 01 fixed |
| 2 | Rotating arrows | Medium alone, high with slides | One flag per linked arrow (a link flag, like a blocked wall's) | Tiny; proves "link actions beyond open/close" |
| 3 | Live lasers (emitters, beams, receivers, mirror boxes) | Highest: beams bend through portals, which matches the stage's theme | Beams and lit receivers are derived, not stored; mirror boxes add positions like boxes do | Biggest mechanic, built once the hooks are proven |

### The recipe

Every mechanic phase repeats these seven steps (R1–R7). Each phase below gives the mechanic-specific content.

- **R1 Rules spec.** Finalise the draft spec in this file and fill the mechanic's row of the interaction table (Phase 0). Verified by checking every column: portals (subject, shots, beams), loose and carried boxes, fizzlers, buttons, switches, arrows, ditches, blocked walls, light barriers, doors, exit, laser fields and every earlier new mechanic.
- **R2 Element and format.** One element definition file in stage 01's layout, plus an optional list in format v2 whose type accepts the JSON import without a cast. If an existing element changes, rewrite the chamber files that use it; there is no upgrader (README decision 13). Verified by the build, and by every existing replay still passing unchanged.
- **R3 Drawing and sound events.** Drawing in stage 03's look: a sprite for each state, added to `docs/sprites.md` and the sprite set, drawn in code as an SVG in `art/sprites/` and exported to its file; colours distinct from every existing element; no portal blue or orange, and none of the UI's meanings (red = caution, green = completed). Movement the mechanic causes animates through stage 03's animation layer, and reduced motion shows plain steps. Sound events get sounds in the style of stage 03's sound, or reuse existing sounds until those exist. Verified in the sprite gallery and in `npm run dev` at 1× and 2× pixel ratio, with the sound setting off silencing it.
- **R4 Rule fixtures.** One tiny chamber and recorded inputs for each spec bullet and edge case, each asserting its expected outcome. Verified by the local replay check passing, and failing once when the rule is deliberately broken (a one-off spot check, then reverted).
- **R5 Solver check.** No solver judges the mechanic (README decision 10), but `npm run verify` runs `npm run solver:check` (`scripts/check_solver.ts`) on every chamber file in `src/chambers/`, and fails when:
  - the chamber's state key needs more than 64 bits. The key holds the subject's tile and facing, the carried box, both portals, each box's tile and one bit per linked element's blocked flag; today's chambers need 49–53 (the tutorial 31), a third box adds 8 bits and a fourth doesn't fit;
  - a state along its recorded solution or 100,000 seeded random steps doesn't come back unchanged from the key. Unpacking sets each button pressed exactly when the subject or a box is on it, and any state value the key doesn't hold to 0;
  - from a state along its recorded solution, the rules' step disagrees with the solver's walks (a move onto a plain tile only steps the subject, and its carried box, one tile; a tile whose element reacts to the subject, `reactsToSubject`, ends a walk), its shared shots (a shot from anywhere on a line gives the same result, apart from the subject's tile), its skipped no-op interacts and moves, or its regions.

  So a mechanic that adds state, makes a plain move do more than step the subject, or makes a shot's result depend on where on its line the subject stands, fails `npm run verify` as soon as one of its chambers is in. As decision 18 settles, the check skips and names that chamber. Verified by `npm run verify` passing with the mechanic's chambers in.
- **R6 Docs.** A `docs/elements.md` row, notes and interactions; AGENTS.md if rules text or keyboard ownership changes. Verified by reading the docs against the spec.
- **R7 Chambers.** A teach chamber and one proof chamber (test or twist), where decision 18 puts them, each with a recorded solution; they join the campaign as the campaign plan sets (decision 16). The author plays each cold and writes down any confusion as signage notes in the campaign plan table. Verified by the local checks plus the playtest notes.

### Campaign plan

**Teach → test → twist → combine.** Each mechanic, and each existing element the campaign teaches, gets a run of chambers:
- *Teach*: the mechanic alone, with no way to fail at understanding it.
- *Test*: the mechanic alone, but you must use it on purpose.
- *Twist*: an unexpected consequence of the rules (a fizzler mid-slide, a beam blocking your own path).
- *Combine*: with earlier mechanics.

A full run was planned at 10–12 chambers per mechanic (1–2 teach, about 3 test, about 3 twist, 3–4 combine). With 16 new chambers for the whole campaign (decision 10), that no longer fits, so the campaign takes three mechanics at about 4 chambers each (decision 16). A combine chamber can serve two mechanics at once.

The existing elements need chambers too (portal basics, boxes and buttons, doors and switches, blocked walls, light barriers and ditches, fizzlers, arrows, laser fields); the tutorial (chamber 0) and today's three chambers already cover some of them. Switchable blocked walls (switchable portal surfaces, already used in chambers 2 and 3) deserve a teach chamber of their own.

**Campaign plan table** (chamber counts set by decision 16; the rest filled in from the playtests during the mechanic phases and Phase 4):

| # | Mechanic or element | New chambers | Teach notes (signage, confusion seen) | Sounds needed | Colours |
|---|---|---|---|---|---|
| 1 | Existing elements | About 4 | — | — | — |
| 2 | Slide floors | About 4 | — | Slide start, slide stop | Slide floor |
| 3 | Rotating arrows | About 4 | — | Arrow turn | Turned-arrow notch |
| 4 | Live lasers | About 4 | — | Beam hum, receiver on/off | Beam, emitter, receiver, mirror box |
| 5 | Total | 16 (20 with chambers 0–3) | | | |

### Phase 0 — Ready the stage

- [ ] **Revisit.** Re-read stage 01's element definition contract, format v2 and replay format, and stage 03's palette module and animation layer. Rename everything in this file to their real names; set the status to Ready.
- [ ] **Hook check.** Compare the three hooks under *Depends on* with what stage 01's element system supports. For each missing hook, either add it to the engine once, as its own step here, with replays proving no change to existing chambers, or drop the mechanics that need it (go/no-go point 1).
- [x] **Settle the open decisions.** Record the answers under *Decisions made* (decisions 16–18). The choice of mechanics also sets the chamber counts in the campaign plan table and which mechanic phases run.
- [ ] **Lab chambers (only once friends play, decision 18).** A lab folder of chamber files, a development-only way to open one (registered only when `import.meta.env.DEV`, so it never ships), and the local checks covering it. Verified by opening a lab chamber in `npm run dev` and confirming the production build contains none. If friends start playing only later in this stage, build it then; if they never do during it, tick it with "not applicable".
- [ ] **Interaction table.** Add a section to `docs/elements.md` listing every element against every other. Each cell is a rule, "can't happen" (chamber validation forbids it) or "to do". Existing elements fill their cells first, from the current rules.
- [ ] **Outcome assertions in replays.** Confirm stage 01's replay format can assert an outcome: completes, does not complete, or reaches an expected state hash. It already can: every recorded solution and fixture pins whether the chamber completes, its moves, its portals and its final state hash, and the replay check reports each mismatch. Verified by one passing and one deliberately failing fixture.
- [ ] **Names and colours.** Choose names for the new elements and colours for them from stage 03's palette module (decision 1, R3 constraints), and record them in `docs/elements.md`.

### Phase 1 — Slide floors

Draft spec:
- A floor tile with no state of its own; not linkable in this version.
- When the subject enters a slide floor (by walking or by coming out of a portal), it keeps moving in its travel direction, one tile at a time, all inside the same step.
- Each tile entered gets the full landing checks. An open ditch, a lit laser field or beam, a light barrier that is on, a closed door or a closed exit stops the slide on the current tile. An arrow stops it unless the travel matches the arrow's direction, in which case the subject enters the arrow and stops there (arrows are not slide floor). An active fizzler fires as the subject passes (portals cleared, carried box reset) and the slide goes on.
- If the next tile is a wall holding a portal whose open side faces the subject, and the other portal is open, the subject comes out of the other portal facing away from it. It keeps sliding in that direction if the exit tile is a slide floor, and stops there otherwise.
- Entering a normal tile ends the slide on it. Entering the open exit ends the slide and completes the chamber.
- Buttons and switches react only to the tile where the subject stops; passing over a button does not press it.
- Loose boxes don't slide. A carried box travels with the subject.
- Turning on a slide floor (to face the mouse pointer) doesn't move the subject. Shooting from a slide floor works as usual.
- If a slide would enter the same tile in the same direction twice (a loop through portals), the whole move is refused: the state stays as before the key and the existing `refused` event plays the error sound.
- A slide counts as one move (README decision 8).
- Chamber validation: a slide floor can't share a tile with a wall, ditch, door, exit, arrow or switch.

Chambers. Teach: a slide-floor room where stepping on slides you to the far wall, and the exit can only be reached by placing a portal so the slide comes out facing it. Test: two slides joined by portals, where the order you place them in matters. Twist: an active fizzler on the slide path wipes your portals mid-slide, so the portal you were aiming for is gone. Combine: carry a box across slides and through a portal to a button you can only reach by sliding.

- [ ] **R1 Spec.** Finalise the spec above and fill the slide floor's row.
- [ ] **R2 Element and format.** The slide floor element file and its optional list in format v2.
- [ ] **R3 Drawing and sounds.** A pale floor tile with thin diagonal lines; slide start and stop events, with placeholder sounds.
- [ ] **R4 Fixtures.** Slide to a wall, onto a normal tile, through a portal onto a slide and onto a normal tile, a fizzler mid-slide, an arrow mid-slide, the exit mid-slide, a refused loop, and a button passed over without being pressed.
- [ ] **R5 Solver check.** A slide carries the subject past the next tile, where the solver's walks expect it to stop, unless the slide floor counts as an element that reacts to the subject (`reactsToSubject` in its definition): walks then end there, which likely keeps them right. `npm run verify` passes with the slide chambers in (decision 18).
- [ ] **R6 Docs.** The slide floor in `docs/elements.md`.
- [ ] **R7 Chambers.** Teach and test chambers, solutions, a cold playtest.

### Phase 2 — Rotating arrows

Draft spec:
- An arrow gains an optional link `id` and an optional `turnedDirection`. Arrows without an id behave exactly as today, so no upgrade is needed.
- Activated through a link, it points `turnedDirection`; deactivated, it points its original direction. A button holds it turned while pressed; a switch turns it for good (switches only ever activate).
- If the subject stands on the arrow when it turns, it stays, and can then leave only in the new direction. As today, the other three directions, moves and turns alike, do nothing on it.
- Slides stop on arrows (Phase 1).
- State: the arrow's link flag, the same kind as a blocked wall's.

Chambers. Teach: an arrow corridor that only leads away from the exit until a switch turns the last arrow. Test: an arrow held turned by a button you must put a box on. Twist: the button that turns the arrow is the tile you stand on, so stepping off turns it back behind you, a one-way trap. Combine: arrows that change where a slide ends.

- [ ] **R1 Spec.** Finalise the spec above and fill the rotating arrow's row.
- [ ] **R2 Element and format.** Make arrows linkable; add the optional `id` and `turnedDirection`.
- [ ] **R3 Drawing and sounds.** A small notch showing the other direction; a turn event.
- [ ] **R4 Fixtures.** Turned by a button and back, turned by a switch for good, turning while the subject stands on it, a slide ending on a turned arrow.
- [ ] **R5 Solver check.** Each linked arrow adds a blocked flag, one more key bit. If the turn is stored as that flag and walking reads it through `allowsWay`, the check likely passes as it is. `npm run verify` passes with the arrow chambers in (decision 18).
- [ ] **R6 Docs.** Update the arrow's row: "Can be activated/deactivated?" becomes "Yes, when linked".
- [ ] **R7 Chambers.** Teach and twist chambers, solutions, a cold playtest.

### Phase 3 — Live lasers (emitters, beams, receivers, mirror boxes)

Draft spec:
- **Emitter**: sits on a wall tile and fires from one face. It can be linked (on/off), on by default. The wall still holds portals on its other faces.
- **Beam**: not stored. After every change within a step, it is traced from each lit emitter, tile by tile:
  - It passes floor, ditches, fizzlers, laser fields, buttons, switches, arrows, slide floors and loose boxes.
  - It stops at walls, light barriers that are on, closed doors, a closed exit, the subject (decision 18) and the chamber edge.
  - At a wall side holding a portal whose open side faces the beam, with both portals open, it continues from the other portal's exit tile in that portal's direction.
  - At a mirror box it turns 90° by the box's angle.
  - At a receiver's face it lights the receiver and stops.
  - If it would enter the same tile in the same direction twice, it stops (a beam loop through portals).
- A tile a beam crosses blocks walking, like a lit laser field. Portal shots pass beams.
- **Receiver**: sits on a wall tile and listens on one face. Lit, it acts as a pressed button (activates its links); unlit, as a released button (deactivates them). As with a button (settled in stage 01), deactivating a link to a box does nothing.
- **Mirror box**: carried like a box (Space). It holds buttons down like a box, goes through portals with the subject, is reset by fizzlers like a box, and reflects beams by a fixed `/` or `\` (decision 18).
- **Settling a step**: apply the action and the subject's movement; trace the beams; evaluate buttons (by position) and receivers (by beams) in chamber data order; apply their links; trace again; repeat until nothing changes. If a state repeats (a receiver opening a door that blocks its own beam), stop at the first repeat, keep that state, and report it in the local checks as an oscillation warning.

Chambers. Teach: one emitter and one receiver that opens the exit door, with a wall between them; place a portal pair to route the beam around. Test: the beam has to turn a corner, coming out of a portal on a perpendicular wall. Twist: once routed, the beam blocks your own path, so you must route it, stand in it to switch the receiver off, or route it again after crossing. Combine: carry a mirror box through portals to bend a beam onto a receiver behind a fizzler (the box resets if you carry it through).

- [ ] **R1 Spec.** Finalise the spec above, including the settling rule, and fill the rows for emitter, beam, receiver and mirror box.
- [ ] **R2 Element and format.** Element files for emitter, receiver and mirror box; optional lists in format v2. Laser fields stay their own element (decision 18).
- [ ] **R3 Drawing and sounds.** The beam as a thin line, coloured unlike a laser field; emitter and receiver as wall notches; the mirror box as a box with a diagonal. Receiver on/off events.
- [ ] **R4 Fixtures.** A straight beam, a beam through portals, a beam loop, a beam blocked by the subject, a mirror bend, a mirror carried through a portal, a receiver opening and closing a door, an oscillation that settles deterministically, a fizzler resetting a carried mirror.
- [ ] **R5 Solver check.** Each mirror box adds a tile to the key, like a box (8 bits on today's chamber sizes). Beams add no bits, being derived, but if the subject blocks them (decision 18), where it stands can change links, which the solver's walks and shared shots assume it can't. `npm run verify` passes with the laser chambers in (decision 18).
- [ ] **R6 Docs.** All four entries in `docs/elements.md`, with the settling rule written out.
- [ ] **R7 Chambers.** Teach and test chambers, solutions, a cold playtest; neither raises an oscillation warning in the replay check or the random walk.

### Phase 4 — Mechanics wrap-up

- [ ] **Interaction table complete.** No "to do" cells left; each cell is backed by a rule fixture or forbidden by chamber validation.
- [ ] **Docs and AGENTS.md.** `docs/elements.md` covers every element; AGENTS.md's layout and rules mention the new elements, and the lab chambers if they were built (decision 18).
- [ ] **Campaign plan table.** Fill in its teach notes, sounds and colours with real results from the playtests. Verify: every row the plan keeps is filled in.

### Phase 5 — Catalogue and links that scale

- [ ] **Catalogue check.** A local check that every chamber file appears in the play order exactly once, ids are unique, and every chamber has a recorded solution (from 01's checks). Verify: break each rule once on purpose and the check fails.
- [ ] **Numbering and links** (decision 7, settled by README decision 13). Links stay by position (`/chamber/N`): the route in `src/router.ts` doesn't change, and there is no redirect table; unknown chambers still fall back home. Verify: in `npm run preview`, the first and the last number open their chambers and an unknown one goes home.
- [ ] **Progress follows the chamber.** Progress is already keyed by id (00); links and the last chamber kept in memory follow position, as today. Verify: reorder two chambers in the play order locally; completions, best times and the highlight on return follow the chamber.
- [ ] **Analytics stays comparable.** `chamber_number` keeps meaning the position in the list (0 for the tutorial, then 1, 2, 3…), like the links (decision 7), and `chamber_id` follows the chamber across reorders; no new parameter is needed. Verify: a production preview build sends the position as `chamber_number` (GA4 DebugView).

### Phase 6 — A Play menu that scales

- [ ] **Design the scrolling chamber list** (uses the frontend-design skill). Today the home menu has up to three columns (sections, rows, detail) and the Play list can't scroll. Twenty chambers don't fit as fixed-height rows, so the chamber column scrolls, with the map staying in the third column. It must keep the keyboard model in `AGENTS.md` (Up/Down within a column with wrapping, Right/Enter steps in, Left/Escape steps back, one Tab stop per column, hover highlights, held Enter ignored), and leave room for stage 05's Editor entry. Verify: the design is written down here before building.
- [ ] **Build the scrolling chamber list** (uses the frontend-design skill). The highlighted row scrolls into view, the cascade still lines up with `--menu-row-height`, and interface sounds play as `AGENTS.md` lists. Verify: keyboard-only and pointer-only walks through all 20 chambers, wrapping from the last to the first; `prefers-reduced-motion` respected.
- [ ] **Back from a chamber.** Play opens with that chamber highlighted, focused and scrolled into view, as today. Verify: back from the first, a middle and the last chamber.
- [ ] **Update `AGENTS.md`.** Keyboard ownership, the layout description and the UI direction for the new menu.

### Phase 7 — Campaign content

- [ ] **Chamber plan.** List the 16 new chambers in this file, in play order together with chambers 0–3, each with its mechanic or element and its part (teach, test, twist or combine), following the campaign plan table and decision 16. Starting order: the existing elements first, then the new mechanics in the order built. Later reorders follow playtests, with the friends' analytics informing them: a chamber never moves before the chambers that teach what it needs, the tutorial stays first, and each reorder goes in the changelog. Verify: every mechanic this stage shipped has chambers or a recorded reason it doesn't, and the total is 20.
- [ ] **Authoring workflow before the editor.** Until stage 05's editor exists: hand-write chamber v2 JSON; a development-only route (behind `import.meta.env.DEV`, never in production builds) that loads a chamber file from disk and reloads on save, extending this stage's lab route (Phase 0, if built by then) rather than adding a second one; record the solution by playing it with 01's recorder; tick a per-chamber checklist (solution recorded, one playtest by someone else). Verify: one chamber goes through the whole workflow; a production build has no development route.
- [ ] **Place chambers 0–3 in the campaign.** The tutorial and today's three chambers keep permanent ids 0 and 1–3 wherever the plan puts them; their links follow their new places. Verify: their completions and best times survive.
- [ ] **Author release 1** (about four new chambers; each release ships with a changelog entry in `src/services/changelog.ts`). Verify: `npm run verify` and the catalogue check pass; playtested.
- [ ] **Author release 2.** Same checks.
- [ ] **Author release 3.** Same checks.
- [ ] **Author release 4.** Same checks; the campaign reaches 20 chambers.

### Phase 8 — Wrap-up

- [ ] **Docs.** `AGENTS.md` (keyboard model, layout, chamber numbering and links), `docs/elements.md` and the changelog match what shipped.
- [ ] **README.** Update the stage status and record any new decisions.
- [ ] **Status.** Set this file to Done once every *Done when* box is ticked.

## Local checks added

- Lab chambers, once built (decision 18), are included in the local checks.
- Rule fixtures replay with their expected outcome (completes, does not complete, or expected state).
- Chamber validation: forbidden element overlaps (Phase 1); emitters and receivers sit on wall tiles with an open face.
- Oscillation warning: any chamber or fixture in which the replay check or the random walk meets a repeating receiver state is reported.
- The solver check skips, and names, each chamber it can't handle (decision 18).
- No new size check: the engine smoke check and the random walk already print each chamber's state size, so growth from each mechanic stays visible.
- Catalogue check: every chamber file in the play order exactly once, ids unique, every chamber with a recorded solution.

## Done when

- [ ] Slide floors, rotating arrows and live lasers (emitter, receiver, mirror box) have each passed R1–R7.
- [ ] The interaction table is complete, each cell backed by a fixture or forbidden by validation.
- [ ] No mechanic needed engine changes outside its own files beyond the hooks added in Phase 0, or the exceptions are listed here.
- [ ] The campaign plan table is filled in.
- [ ] 20 chambers ship, numbered 0–19, each with a recorded solution, with `npm run verify` and the catalogue check passing.
- [ ] Progress, best times and the return highlight follow chambers after a reorder.
- [ ] The scrolling Play menu works fully by keyboard and by pointer, and `AGENTS.md` describes it.
- [ ] Local checks pass: every chamber and fixture replays with its expected outcome; shipped chambers raise no oscillation warnings.
- [ ] `docs/elements.md`, AGENTS.md and `todo/README.md` are up to date.

## Go/no-go points

Revised 2026-11-09 (decisions 13 and 14): the solver budget, no-solver, medal par and data volume points were removed and the rest renumbered. The no-solver point, which dropped timed buttons, push blocks and echo, is superseded by README decision 11 (all seven mechanics stay in the plan); the medal par point became an open decision, since dropped with the medals (decision 17). Revised 2026-11-15 (decision 16): the push block and echo points went with those mechanics.

1. **Hook check (Phase 0).** If a hook a mechanic needs is missing from stage 01 and adding it would reshape the step itself, redesign the mechanic to avoid it or drop it.
2. **Laser oscillation (Phase 3).** If oscillations show up in natural play (fixtures or playtests), restrict them. Either forbid a receiver from linking to anything a beam reaching it passes through (checked by validation), or make receivers latch on like switches.

## Risks

- **Interactions multiply.** Each new element must be defined against every other. The interaction table and fixtures exist so that gaps show up as "to do" cells, not as player bug reports.
- **Beams settle in surprising ways.** Feedback through receivers and loops through portals are handled by deterministic rules and warnings, but they can still confuse players. Watch the playtest notes.
- **State growth.** Mirror boxes (positions) grow the state. The printed state size shows it early; the solver check skips, and names, a chamber it can't handle (decision 18).
- **New elements must read clearly.** Slide floor and plain floor, beam and laser field must stay distinct. R3's check and the cold playtests catch this.
- **"Moves" changes meaning.** A slide moves many tiles on one key. Follow stage 01's definition (one move) and note any change in meaning, because analytics parameter names are permanent and their history spans the change.
- **Lab chambers leaking.** Once friends play, unfinished chambers in the catalogue reach them, and the Play menu overflows until Phase 6 makes it scroll. Switch to the lab list then (decision 18).
- **Feeling borrowed.** Keep names, looks and combinations original (decision 1).
- **Mechanics barely used.** With 16 new chambers, each mechanic gets about 4 (decision 16), so a full run doesn't fit; a combine chamber can serve two at once.
- **Content volume.** 16 chambers are most of the campaign phases' work. Ship them in small releases, so the game grows instead of waiting.
- **Reordering surprises players.** Display numbers and links change after a reorder, which friends will see. Progress is safe (keyed by id); say what changed in the changelog.

## Notes for later stages

- **Stage 05:** the editor needs a palette entry for each element, placement validation (the same rules as the local chamber validation), link editing for receivers and rotating arrows.
- **Stage 05:** the editor reuses the chamber format, the solution recorder and the per-chamber authoring checklist.
- **Stage 05:** campaign links stay by position (README decision 13); any new route needs a no-cache header in `firebase.json`.
- **Stage 02 (stopped):** if the solver is ever revisited, its state key (`docs/solver.md`) must grow with the new state: mirror box positions and link flags for arrows and emitters.
- Notes (filled in during this stage): the campaign plan table, the chamber plan and the Play menu design.
