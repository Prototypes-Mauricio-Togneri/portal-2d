# Stage 04a — Mechanics

Status: Draft
Last revised: 2026-11-19

## Goal

Today only the subject and a carried box go through portals; shots and lasers never do, and lasers are fixed tiles. This stage adds a set of original mechanics that send more things through portals or give movement a new shape, while keeping the rules discrete: slide floors, rotating arrows and live lasers (emitters, beams, receivers, mirror boxes). Each mechanic ships complete: exact rules, one element file, chamber format support, drawing in stage 03's reworked look, documentation, rule fixtures, and a teach and a proof chamber with recorded solutions, which prove it in play and open its run in the campaign. Growing the campaign to its full 20 chambers, with a catalogue, links and a Play menu that scale, is stage 04b's (`04b_campaign.md`); the two were one stage until README decision 15 split them.

## Depends on

Stages 00, 01 and 03 are done: their parts below are what they delivered, though Phase 0 still checks each hook. Stage 02 stopped after its prototype (README decision 10).

**From stage 00 (fixes)**, done

- The game canvas sharp on high-DPI screens; one local check command.

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
- "Moves" is settled: the game counts one move for each step that puts the subject on another tile (README decision 8). A slide moves the subject several tiles on one key, in one step, so it counts as one move.
- Input owning the game keys, remappable, in two layouts: Default (the arrows, A and D for the portals, Space, and Shift, held to turn in place) and Custom. The mouse plays no part in the game. This stage adds no keys.

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
- The bundle-size watch and the unused-asset check.
- Kept from stage 03's notes when its file was removed (2026-11-14):
  - Every chamber must fit the screen whole, since there is no camera: this stage's chambers stay within that, as does stage 05's grid cap.
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

Decisions 1–19 were made while this stage and stage 04b were one stage (README decision 15), so "this stage" and "here" in them mean both. Stage 04b cites them, and later ones, as "04a decision N".

| # | Date | Decision |
|---|---|---|
| 1 | 2026-11-06 | Mechanics lean original: names, look and combinations are this game's own, not copies of another game's elements. Names here are working names, settled when this stage is revisited |
| 2 | 2026-11-06 | Today's rules are deleted after stage 01 (README decision 3), so new mechanics only need to work in v2 |
| 3 | 2026-11-06 | The rules stay discrete: everything happens inside one step, nothing depends on time |
| 4 | 2026-11-06 | No new keys. Every mechanic works with the game keys there are: the moves, both portals, interact and turning in place (by default the arrows, A, D, Space and Shift; the mouse, which aimed and shot, has since gone) |
| 5 | 2026-11-06 | A mechanic the solver cannot judge within budget does not ship (stage 05 publishes only solver-checked chambers). Superseded by README decision 10: no solver judges chambers; a mechanic ships on its chambers' recorded solutions and its rule fixtures |
| 6 | 2026-11-08 | A mechanic's chambers go into the campaign in this same stage: its teach chamber and the rest of its run, as the campaign plan sets (replaces "a teach and a proof chamber per mechanic; full wings are stage 04's job"). Since README decision 15, this stage builds each mechanic's teach and proof chamber (R7), and stage 04b the rest of its run |
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
| 17 | 2026-11-15 | Medals dropped from the plan, with their phase, their open decisions (thresholds) and storing the best moves and portals: the time stays the only score (README open decision 1 settled) |
| 18 | 2026-11-15 | The other open decisions settled as recommended: today's laser tiles stay their own element; unfinished chambers go straight into the catalogue while only the author plays, and into a development-only lab list once friends play; a beam stops at the subject, which it leaves unharmed; a mirror box's angle is fixed in the chamber file; and the solver check skips, and names, each chamber it can't handle. With every open decision settled, the section was removed; their options stay in git history |
| 19 | 2026-11-15 | Loading chambers without a hand-kept list dropped: it would only save one import line per chamber, the play order stays a hand-typed list anyway, the engine scripts can't use Vite's loading and keep their own list, and TypeScript would stop checking each chamber file against the chamber type. Chambers stay imported by hand in `src/services/chamber_catalogue.ts`; the catalogue check stays |
| 20 | 2026-11-17 | The subject can walk into, stand in and cross a beam. A beam blocks nothing; it stops at the subject and leaves it unharmed (decision 18), so standing in a beam switches its receiver off until the subject steps out. Today's laser tiles stay the light that blocks walking, and a beam is only a signal, so the two differ in what they do, not only in colour. This replaces the draft rule that a beam blocks walking like a lit laser field. That rule repeated the laser tiles, and it came bundled with decision 18's option without being weighed on its own |
| 21 | 2026-11-18 | The slide floor looks like candidate A, "Hairlines", of the look-and-motion mockup (https://claude.ai/artifact/GtCKTDDaa8iUshquvW3Q3J): the floor tile a shade cooler, with thin diagonal lines that run on across neighbouring tiles, keeping the floor's groove so every tile stays a tile. Candidates B (a polished grey slab with no groove, under a soft sheen) and C (the same slab in pale lilac) were not chosen. Its SVG source is written out under Phase 1, step 2 |
| 22 | 2026-11-18 | A slide is drawn along the path the step reports: the rules step also returns the tiles a slide passed (only when it slid), and the subject glides along them, through portals, instead of jumping to its end. Recomputing the path in the browser was rejected: a fizzler passed mid-slide closes portals and resets the carried box inside the step, so the browser would have to copy the rules |
| 23 | 2026-11-18 | During a slide, what happens on the way shows when the subject gets there: a passed fizzler's break-up, the box leaving the subject's hands, the crossing's sound, and at the end the slide stop and whatever the step's settling changed (buttons, doors, the exit and the rest). A new press flushes what is still waiting. Every other step keeps playing everything in the press's frame, as today |
| 24 | 2026-11-18 | A chamber file lists slide floors as it lists walls: each entry one tile (`x`, `y`) or a rectangle (`xFrom`, `xTo`, `yFrom`, `yTo`, both ends inclusive), since a slide area is usually a whole room or lane |
| 25 | 2026-11-18 | Phase 1 is built R1–R6 first. R7 (the teach and test chambers, their recorded solutions and the cold playtest) follows once the author has tried slide floors in the playground |
| 26 | 2026-11-19 | A slide floor may share its tile with a button, a fizzler, a laser, a light barrier, a box's start and the subject's start, so a slide over a fizzler or a button can happen in a real chamber. It stays out of the validator's one-fixture-per-tile list and gets its own check: it can't share a tile with a wall, ditch, door, exit, arrow or switch |
| 27 | 2026-11-19 | A resting box ahead stops a slide on the tile before it, as it stops a walk |
| 28 | 2026-11-19 | A slide refused for looping through portals still turns the subject to face the pressed way, as a crossing refused from rest does today; nothing else changes. The draft had left even the facing unchanged |
| 29 | 2026-11-19 | Mid-slide, a portal whose exit tile can't be entered stops the slide in front of it silently, with no `refused`; a crossing tried from rest is still refused with the error sound |
| 30 | 2026-11-19 | The slide floor's interactions are written into its rules in `docs/elements.md`, and Phase 0's interaction table is built later, in Phase 0 or Phase 4. R1 stays unticked until the table holds the slide floor's row |
| 31 | 2026-11-19 | The chamber sign's pictograms go in two rows of seven, room for fourteen kinds once live lasers add theirs, instead of one row of ten |
| 32 | 2026-11-19 | The slide floor's names are working names (decision 1): element `slideFloor`, chamber file field `slideFloors`, sprite `slide_floor`, events `slideStarted` and `slideStopped`, definition property `continuesMovement`, avoiding "sliding", which already names the doors', grates' and blocked walls' opening animation. Phase 0's "Names and colours" stays open |
| 33 | 2026-11-19 | Slide start and slide stop play no sound until real sound files exist: both events map to no `Sound`, and no audio file is added |
| 34 | 2026-11-19 | After a slide onto the open exit, the chamber-complete dialog opens when the slide's drawing ends; the clock still stops at the press, so the time shown is unchanged |
| 35 | 2026-11-19 | A load or a reset while a slide is drawn drops what the slide still has waiting (its sounds, effects and completion), as a load already clears every other effect; only a press plays it all first. Firing it, as plan step 6 first said, would have saved and reported a completion for the run being thrown away |

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
- **R7 Chambers.** A teach chamber and one proof chamber (test or twist, the parts of a run in stage 04b's campaign plan), where decision 18 puts them (once friends play, stage 04b's lab list, which needs no mechanic and is built first), each with a recorded solution; they are the first of the mechanic's about 4 campaign chambers (decision 16), and stage 04b builds the rest. The author plays each cold and writes down any confusion as teach notes in stage 04b's campaign plan table. Verified by the local checks plus the playtest notes.

### Sounds and colours

Filled in from the real results during the mechanic phases and Phase 4:

| # | Mechanic | Sounds needed | Colours |
|---|---|---|---|
| 1 | Slide floors | Slide start, slide stop: none yet, both events silent (decision 33) | The floor a shade cooler, rgb(232, 235, 242), crossed by lines of rgb(168, 173, 186) |
| 2 | Rotating arrows | Arrow turn | Turned-arrow notch |
| 3 | Live lasers | Beam hum, receiver on/off | Beam, emitter, receiver, mirror box |

### Phase 0 — Ready the stage

- [ ] **Revisit.** Re-read stage 01's element definition contract, format v2 and replay format, and stage 03's palette module and animation layer. Rename everything in this file to their real names; set the status to Ready.
- [ ] **Hook check.** Compare the three hooks under *Depends on* with what stage 01's element system supports. For each missing hook, either add it to the engine once, as its own step here, with replays proving no change to existing chambers, or drop the mechanics that need it (go/no-go point 1).
- [x] **Settle the open decisions.** Record the answers under *Decisions made* (decisions 16–18). The choice of mechanics also sets the chamber counts in stage 04b's campaign plan table and which mechanic phases run.
- [x] **Interaction table.** Add a section to `docs/elements.md` listing every element against every other. Each cell is a rule, "can't happen" (chamber validation forbids it) or "to do". Existing elements fill their cells first, from the current rules.
- [ ] **Outcome assertions in replays.** Confirm stage 01's replay format can assert an outcome: completes, does not complete, or reaches an expected state hash. It already can: every recorded solution and fixture pins whether the chamber completes, its moves, its portals and its final state hash, and the replay check reports each mismatch. Verified by one passing and one deliberately failing fixture.
- [ ] **Names and colours.** Choose names for the new elements and colours for them from stage 03's palette module (decision 1, R3 constraints), and record them in `docs/elements.md`.

### Phase 1 — Slide floors

**Where this stands (2026-11-19).** Planned in detail below, in one session that will not be around to explain it, so this section is meant to be enough on its own. The author chose decisions 21–34; 26–34 answered the proposals planning left open, and the spec below holds them (plan step 1 is done). Plan steps 1–11 are done, and R1–R4 and R6 ticked (R1 once the interaction table, `docs/elements.md` "Interactions", held the slide floor's row; R5 waits for R7): the sprite, the element and its chamber file field, the slide rule with its path, the fixtures, the drawing and motion, the chamber sign, the playground's slide room and the gallery's strip, and the docs. Next is R7, once the author has tried slide floors in the playground (decision 25). The mockup (decision 21's link; read it with the Artifact tool's `read` action) shows the three candidate tiles and a chamber playing the spec below with the game's own sprites. Its few lines of rules script were written for the page and are not code to copy into the game.

#### Spec

The draft, with what planning and decisions 20–34 settled folded in.

- A floor tile with no state of its own; not linkable in this version. It blocks nothing: walking, shots and portals treat it as plain floor, apart from what follows.
- When the subject enters a slide floor (by walking, or by coming out of a portal), it keeps moving in its travel direction, one tile at a time, all inside the same step. A subject at rest on a slide floor (a slide that ended against a wall) that moves onto another slide floor enters it, so it slides again; one that moves onto plain floor just steps.
- Each tile entered gets the same checks as a step onto it (`canEnter` and `boxBlocksEntry` in `step.ts`). An open ditch, a laser that is on, a light barrier that is on, a closed door, a closed exit, an arrow pointing any other way, or a resting box (decision 27) stops the slide on the current tile. A beam doesn't (decision 20). An arrow pointing the travel's way is entered, and the slide stops on it (arrows are not slide floor).
- A fizzler that is on fires as the subject passes over it: both portals close and a carried box goes back to its start, as the fizzler rule does. The slide goes on, and a wall whose portal the fizzler closed is a plain wall for the rest of the slide.
- If the next tile is a wall holding a portal whose open side faces the subject, and the other portal is open, the subject comes out of the other portal facing away from it (`crossed`). It keeps sliding that way if the exit tile is a slide floor, and stops there otherwise. Mid-slide, a crossing whose exit tile can't be entered stops the slide in front of the portal, silently, with no `refused` (decision 29); a crossing tried from rest is refused as today, with the error sound.
- Entering a plain tile ends the slide on it. Entering the open exit ends the slide and completes the chamber.
- Buttons, switches and beams react only to the tile where the subject stops: passing over a button does not press it, and sliding through a beam does not cut it (decision 20).
- Loose boxes don't slide; a box can be put down on, and picked up from, a slide floor as from plain floor. A carried box travels with the subject.
- Turning in place on a slide floor (with the turn key) doesn't move the subject. A turn towards the way the subject already faces is a move, as today, so it may slide. Shooting from a slide floor works as usual.
- If a slide would enter the same tile in the same direction twice (a loop through portals), the whole move is refused: the state stays as before the key but for the facing, which turns to the pressed way, as a crossing refused from rest does (decision 28), and `refused` plays the error sound. The tile the subject started on doesn't count as entered.
- A slide counts as one move (README decision 8). A slide that ends back on its start tile counts none, as a crossing back onto the same tile does today; if the facing is also unchanged, `step` returns the very same state, so nothing is drawn, though its events still play.
- Events: `slideStarted` the first time in a step the subject moves on from a slide floor tile it entered; `slideStopped` when that slide ends. Entering a slide floor and being stopped at once reports neither. Neither plays a sound yet (decision 33).
- Chamber validation: a slide floor can't share a tile with a wall, ditch, door, exit, arrow or switch. It may share one with a button, a fizzler, a laser, a light barrier, a box's start and the subject's start (decision 26). It can't stand on the chamber's edge. A tile listed twice in the slide floors is an error, as it is for walls.

#### To confirm

Nothing left. The nine proposals planning left open were answered on 2026-11-19 as decisions 26–34: tile sharing (26), a box ahead (27), a refused loop's facing (28), a blocked crossing mid-slide (29), the interaction table (30), the chamber sign (31), the names (32), the sounds (33) and the completion dialog (34). Two answers differ from the proposals: a refused loop turns the subject (28), and the slide plays no sound yet (33). Code details the proposals named and the decisions leave out: today a floor tile holds at most one of light barrier, ditch, door, exit, fizzler, arrow, button, switch and laser (`FIXTURES` in `validate_chamber.ts`), which the slide floor stays out of (26); today's `crossPortal` emits `refused` when its exit tile can't be entered, so the slide needs its own crossing that doesn't (29); and "sliding" is in `SlidingKind` and `slidingDrawing` in `element_drawings.ts`, `drawTileSlid` in `tile_painter.ts` and "Sliding" in `docs/sprites.md` (32).

#### The code as it is (found 2026-11-18)

So a new session doesn't have to explore again. Line numbers drift; the names don't.

- **Element definitions.** `ElementDefinition` in `src/game/rules/element_definition.ts`, built with `defineElement<Entry>()({...})`: `kind`, `fileKey`, `count` (`'one'` or `'many'`), `sitsOn`, `layer`, `linkable`, `defaultBlocked` (`null` means no blocked flag), `blocksWalking`, `blocksShots`, `stopsShootingFrom`, `takesPortals` (nothing reads it), `reactsToSubject` (only the solver's walk graph reads it), `events`, and `hooks`: `interact`, `subjectInside` (the fizzler rule), `everyPass` (the button), `linkUnblocked`, `linkBlocked`, each `(draft, index)`. No hook runs when the subject enters a tile, and none can keep it moving. The arrow (`elements/arrow.ts`) is the simplest definition to copy: `layer: 'floorMarks'`, `blocksWalking: 'alongDirection'`, everything else never or false, no hooks. `ELEMENT_REGISTRY` in `element_registry.ts` lists every definition; its order is the drawing order within a layer. `CORE_STEP_EVENTS` there owns the two portal-opened events, `crossed` and `refused`.
- **The step** (`src/game/rules/step.ts`). `move` checks `allowsWay` on the current tile (on an arrow only its way acts), faces the subject, returns there for a turn, then either crosses (`portalEntrance` on the wall ahead, then `crossPortal`) or calls `draft.moveSubject` when `canEnter` and not `boxBlocksEntry`. It moves one tile and has no loop. `crossPortal` checks the exit tile with `canEnter` and `boxBlocksEntry`, then moves, faces the exit side and emits `crossed`, or emits `refused`. `step()` makes a `StateDraft`, runs the action (`runAction`), `draft.carryBoxAlong()`, then `settle`: passes capped at 32 (`PASS_CAP`), each running the `subjectInside` hooks of the elements on the subject's tile only, then every `everyPass` hook, then `destroyBoxesOnBlockedTiles`; then the exit check at the subject's tile. It returns the very same state object when nothing changed. `StepResult` is `{state, events}`.
- **The fizzler rule** (`applyFizzlerRule`, `elements/fizzler.ts`) runs only at the tile where the subject ends, so a fizzler passed mid-slide is missed unless the slide runs it. It is safe to run more than once a step: it reports `fizzled` at most once, and not at all when the subject started the step in a field that is on (it then has no portals or box to lose).
- **The draft** (`state_draft.ts`): `moveSubject`, `face`, `emit`, `closePortals`, `destroyCarriedBox`, `carryBoxAlong`, `toState()`, and reads from `StateReader`. There is no rollback, and an emitted event can't be withdrawn.
- **Events.** `GameEvent` in `src/game/game_event.ts` is a plain string union (a type plus a const object), with no payload. Each event has exactly one owner, a definition's `events` or `CORE_STEP_EVENTS`, checked by `checkRegistryEvents` in `scripts/check_chambers.ts`. `Level.SOUNDS` in `src/game/level.ts` maps every event to a `Sound` or `null`, so the build asks for each new one. `Sound`s are in `src/game/sound.ts` (`new Sound(importedUrl, volume)`); a `Sound` played again restarts itself, cutting off the first; several `Sound`s may share one file.
- **Format and loader.** `ChamberData` in `src/game/chamber_data.ts`; its element fields are typed from the registry. `WallData = PositionData | WallRangeData` (`{xFrom, xTo, yFrom, yTo}`, both ends inclusive), read by `readWall` in `src/game/rules/chamber_parser.ts`, where `CHAMBER_FIELDS` lists every field by hand (`checkRegistryFields` in `check_chambers.ts` compares it with the registry) and `readChamber` reads each list by hand. The compiled chamber (`compiled_chamber.ts`) indexes every registered kind by tile with no change (`elementAt(kind, x, y)`, constant time, `NO_ELEMENT` when none), and `listEntries` (`chamber_entries.ts`) already expands rectangles for any kind.
- **Validator** (`src/game/rules/validate_chamber.ts`). `OccupantKind` is a hand-written union; `placeElements` has one line per kind; `placeWalls` and `placeWall` handle rectangles and report a tile listed twice; anything sharing a wall's tile is reported as inside a wall; `FIXTURES` allows at most one of its kinds per tile (two crossing lasers aside); a box or the subject may start only where every fixture is a button (`startsBadly`); `EDGE_KINDS` is what may stand on the edge; `describeKind` words a kind whose name is more than one word ("a lightBarrier" otherwise).
- **Hashes.** A chamber's hash (`getChamberHash` in `src/game/replay_data.ts`) hashes the parsed chamber, where a missing list is `undefined` and dropped, so every existing chamber keeps its hash as long as it leaves `slideFloors` out (an empty list would change it). The slide floor has no flag, so no state hash changes either: every recorded solution and fixture must still pass unchanged.
- **Drawing.** `BACKDROP_LAYERS` in `src/game/renderer.ts` is floor, floorMarks and structure, drawn once per chamber and tile size. `drawFloor` paints the `floor` sprite on every tile and never draws the `'floor'` layer's elements, so an element on layer `'floor'` is drawn nowhere today. `drawBackdropCover` draws the floorMarks layer (arrows) over the antlines, which an opaque tile would hide. Both backdrop paths (`drawBackdrop` and `composeBackdrop`, which redraws when an antline lights) call `drawFloor`. `ELEMENT_DRAWINGS` in `src/game/element_drawings.ts` is a `Record` over every kind, so the build asks for an entry. Sprites: `SPRITE_SHAPES` in `src/game/sprite_set.ts` (its key order is the gallery's order; shape `'tile'` takes 256 or 384 px); files are found by name (`import.meta.glob` in `sprite_sources.ts`); `npm run assets:check` requires one file per key, so the file goes in first; `RAISED_SPRITES` gets the drop shadow (not this one).
- **Animation.** `StepAnimation` (`src/game/step_animation.ts`) has one fixed `STEP_MILLISECONDS = 120`, a cubic ease-out and a one-frame lead; `StepTransition` is `{from, to, events, progress}`. `subjectPose` (`src/game/subject_pose.ts`) works from `from` and `to` alone: a one-tile glide, or a single crossing found from the portals before it; anything else shows the subject at its end at once. `Level.applyStep` knows the action but doesn't pass it on, and starts every effect in the press's frame: element transitions (`changes.start`), fizzle particles (`fizzle.start(before, after, events, time)`, which puts a lost carried box's burst at `after`'s subject tile), box fall, portal openings, miss ripple, then `playEvents`. The subject's sprite (holding a box or the gun) comes from the state drawn.
- **Moves.** `Level` counts a move when the subject's tile changes, and `countsAsMove` (`src/game/rules/step_counts.ts`) does the same for the replay runner and the solver; `createReplay` checks the two agree. No change needed. Comments that say "tiles stepped onto" (`analytics.ts`, `level.ts`, `replay_data.ts`, `replay_runner.ts`, AGENTS.md's analytics rule) should say "steps that put the subject on another tile".
- **Solver.** `walk_graph.ts` treats the tiles of every kind with `reactsToSubject` as event tiles: walks never lead onto one and a walk from one goes nowhere. `scripts/check_solver.ts` checks walks only from states along the recorded solutions of chamber files, and every move onto an event tile goes through the rules' step. Traced, not run: with `reactsToSubject: true` on the slide floor, every solver check should pass, and nothing in the state key, shot lines or action filter assumes a move goes one tile. Decision 18's skip mechanism is not built. The solver ignores extra fields on `StepResult`.
- **Chamber sign.** `src/components/chamber_sign.vue`: `SIGN_ELEMENTS`, a hand list of `{kind, field, name}`, each shown dark when the chamber file's list is non-empty; the grid is `repeat(10, 1fr)`. `src/components/element_pictogram.vue`: one hand-drawn SVG per kind on a 48 × 48 viewBox in a `v-if` chain, with line-weight classes; nothing checks that a kind has one.
- **Fixtures.** `Fixture = {name, behaviour, chamber, actions, expected: {completed, moves, portals, finalHash}}` in `scripts/fixtures/fixtures.ts`; each chamber is a JSON file in `scripts/fixtures/`, imported at the top and typed `ChamberData`, read without the layout checks; `listFixtureChambers()` feeds the random walk. No helper prints a hash: write a placeholder, run `npm run replay:check`, and copy the actual hash it prints, but only once the outcome is checked to be the intended one (by reasoning, or by a throwaway script that prints the end state). Validator cases: `ChamberCase = {name, data, problems}` in `scripts/fixtures/format_examples.ts`, each problem the exact printed line, also copied from a failing `npm run chamber:check`. `scripts/fixtures/format_v2_example.json` is meant to hold every addition to the format.
- **Playground** (`src/dev/playground.json`): 15 × 15, a cross whose four arms each test one group, every arm used, the corners solid wall. Its layout is described by hand in AGENTS.md (Chambers) and in a comment in `src/services/chamber_catalogue.ts`.
- **Sprite gallery.** The specimen chamber is `specimenData(on)` in `src/dev/gallery_layouts.ts` (10 × 8; free floor tiles include (1,6), (2,6) and (3,6)); its description is in `src/dev/sprite_gallery.html`.

#### Plan

Steps in order; each says what it changes and how it is checked. After every step that changes code: `npm run lint:fix`, then `npm run build` (it type-checks first). Every existing recorded solution and fixture must keep passing unchanged throughout.

1. **R1, the spec.** Done 2026-11-19: the author's answers (decisions 26–34) are in the spec above, and "To confirm" is empty. The interaction table, with the slide floor's row, followed the same day (decision 30), so R1 is ticked.
2. **The sprite.** Add `art/sprites/slide_floor.svg` with the source below, then export it as AGENTS.md says, opaque like `floor`: `inkscape art/sprites/slide_floor.svg --export-type=png --export-filename=slide_floor.png`, then `convert slide_floor.png -quality 90 -alpha off src/assets/images/chamber/slide_floor.webp` (delete the PNG). Add `slide_floor: 'tile'` to `SPRITE_SHAPES` right after `floor`. In `docs/sprites.md`: the transparency list of sprites that fill their tile, the count sentence before "The set", a row after `floor` in "The set" (renumber the rows after it), and `slide_floor` in row 1 of "Order". In AGENTS.md, add `slide_floor` to the sprites exported with `-alpha off`. Checked by `npm run assets:check` and the sprite gallery (`/src/dev/sprite_gallery.html` in `npm run dev`).

   The source. Its face is a shade cooler and greyer than the floor's (232, 235, 242 against 239, 241, 248), under the floor's texture at a little less strength. Over it run twelve lines along x + y = 21.33 + 42.67 k (k = 0 to 11, six to a tile's width), so they meet their neighbours' lines across every edge. Last come the floor's own lip and groove:

   ```svg
   <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
     <!--
       A slide floor (docs/sprites.md): the floor tile a shade cooler, with thin
       diagonal lines that run on across neighbouring tiles, so a run of slide
       floor reads as one hatched surface; it keeps the floor's groove.
     -->
     <defs>
       <!-- The floor's mottling and grain, a little fainter, wrapping at the tile's edges -->
       <filter id="texture" filterUnits="userSpaceOnUse" x="0" y="0" width="256" height="256" color-interpolation-filters="sRGB">
         <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="11" stitchTiles="stitch" result="mottle"/>
         <feColorMatrix in="mottle" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 0.06" result="softLayer"/>
         <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="5" stitchTiles="stitch" result="grain"/>
         <feColorMatrix in="grain" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 0.04" result="grainLayer"/>
         <feMerge>
           <feMergeNode in="softLayer"/>
           <feMergeNode in="grainLayer"/>
         </feMerge>
       </filter>
       <clipPath id="tile">
         <rect x="0" y="0" width="256" height="256"/>
       </clipPath>
     </defs>

     <!-- The tile's face -->
     <rect x="0" y="0" width="256" height="256" fill="rgb(232, 235, 242)"/>
     <rect x="0" y="0" width="256" height="256" filter="url(#texture)"/>

     <!-- The diagonal lines, x + y = 21.33 + 42.67 k, so they repeat every tile -->
     <g clip-path="url(#tile)" stroke="rgb(168, 173, 186)" stroke-width="6">
       <line x1="85.33" y1="-64" x2="-64" y2="85.33"/>
       <line x1="128" y1="-64" x2="-64" y2="128"/>
       <line x1="170.67" y1="-64" x2="-64" y2="170.67"/>
       <line x1="213.33" y1="-64" x2="-64" y2="213.33"/>
       <line x1="256" y1="-64" x2="-64" y2="256"/>
       <line x1="298.67" y1="-64" x2="-64" y2="298.67"/>
       <line x1="341.33" y1="-64" x2="-64" y2="341.33"/>
       <line x1="384" y1="-64" x2="-64" y2="384"/>
       <line x1="426.67" y1="-64" x2="-64" y2="426.67"/>
       <line x1="469.33" y1="-64" x2="-64" y2="469.33"/>
       <line x1="512" y1="-64" x2="-64" y2="512"/>
       <line x1="554.67" y1="-64" x2="-64" y2="554.67"/>
     </g>

     <!-- The floor's lit lip just inside the groove, and half of the groove shared with each neighbour -->
     <rect x="5.5" y="5.5" width="245" height="245" fill="none" stroke="rgb(237, 238, 243)" stroke-width="3"/>
     <rect x="2" y="2" width="252" height="252" fill="none" stroke="rgb(186, 187, 194)" stroke-width="4"/>
   </svg>
   ```

   In the mockup it read clearly apart from plain floor at 40 px a tile (chamber 1 on a 1080p screen); at the home menu map's 16 px it turns into a faint hatch, still apart from the floor.
3. **R2, the element and the format.**
   - `src/game/rules/element_definition.ts`: a new required property `continuesMovement: boolean` ("entering its tile keeps the subject moving the same way"), the movement-continuation hook Phase 0 names, kept as data; set it to `false` in every existing definition.
   - `src/game/rules/elements/slide_floor.ts` (new): `kind: 'slideFloor'`, `fileKey: 'slideFloors'`, `count: 'many'`, `sitsOn: 'floor'`, `layer: 'floor'`, `linkable: false`, `defaultBlocked: null`, `blocksWalking: 'never'`, `blocksShots: 'never'`, `stopsShootingFrom: 'never'`, `takesPortals: 'never'`, `reactsToSubject: true` (R5), `continuesMovement: true`, `events: [GameEvent.SLIDE_STARTED, GameEvent.SLIDE_STOPPED]`, no hooks. Its entry type is `WallData`, or a new alias of it named for floors in `chamber_data.ts`.
   - `element_registry.ts`: its line (first, as the only floor-layer element) and the doc comments.
   - `game_event.ts`: `SLIDE_STARTED` and `SLIDE_STOPPED`. `level.ts`: their entries in `SOUNDS`, both `null` for now (decision 33), so `sound.ts` doesn't change.
   - `chamber_parser.ts`: `slideFloors` in `CHAMBER_FIELDS`, and its list read in `readChamber` with the walls' reader. Leave it out of the parsed object when the file leaves it out, so old hashes hold.
   - `validate_chamber.ts`: `'slideFloor'` in `OccupantKind`, placed like walls (rectangles, a tile listed twice), wording "a slide floor" in `describeKind`, kept out of `FIXTURES` and `EDGE_KINDS`, and a new check in `checkOverlaps`: a slide floor on a ditch, door, exit, arrow or switch is an error (a wall is already caught by "inside a wall"). Leave `startsBadly` alone, so the subject and boxes may start on it.
   - `draw_layer.ts`: its comment, which says the core step draws the floor and one fixed element per floor tile.
   - `scripts/fixtures/format_examples.ts`: a broken case for each new problem (a slide floor on each of ditch, door, exit, arrow and switch, a slide floor listed twice, a rectangle whose from corner is past its to corner, a slide floor on the edge), plus slide floors, a tile and a rectangle, in `format_v2_example.json`.
   - Checked by the build, `npm run chamber:check` (the new cases report exactly their pinned problems; the registry checks pass), and `npm run replay:check`, `npm run smoke:engine` and `npm run random:walk` passing unchanged.
4. **The slide rule** (`src/game/rules/step.ts`, `state_draft.ts`).
   - After `move` steps the subject onto a tile, or `crossPortal` brings it out onto one, and the tile holds an element with `continuesMovement` (read from the registry, like the other lookup tables at the top of `step.ts`), run the slide: take the next tile the way the subject faces. On a wall, cross if `portalEntrance` finds a portal and the exit tile passes `canEnter` and `boxBlocksEntry` (then emit `crossed` and face the exit side), else stop: mid-slide a blocked exit tile stops it silently (decision 29). Otherwise step on when `canEnter` and not `boxBlocksEntry`, else stop. Stop after entering a tile without `continuesMovement` (the open exit included; `settle` completes the chamber).
   - Before moving on from each tile it passes, run the `subjectInside` hooks of the elements on that tile, as `runPass` does (this is the fizzler rule; the final tile is left to `settle`, as today). Emit `slideStarted` on the first move on from a slide floor tile, and `slideStopped` when the slide ends.
   - Keep a set of (tile, way) entered in the slide; it bounds the loop (at most four entries a tile). On a repeat, the action reports a whole refusal: `step()` then drops the draft and returns the state before the key with the subject turned to face the pressed way (decision 28; the very same state when it already faced that way) and only `refused`, without settling. No rollback is needed.
   - `StepResult` gains `path`: an empty shared constant (no allocation, so the solver, which calls `step` millions of times, pays nothing) unless the step slid. Otherwise one leg per tile entered, starting with the move or crossing that began it: the tile, the way, whether it came out of a portal, the events emitted while entering it (the draft records how many events existed when each leg began), and the state after entering it (`draft.toState()`, before settling). Return it from `step()`; `startChamber` returns the empty path. The solver, the replay runner and the scripts ignore it.
   - Checked by the build, `npm run chamber:check` (each new event has one owner), `npm run replay:check` and `npm run random:walk` unchanged, and the fixtures of step 5.
5. **R4, the fixtures** (`scripts/fixtures/fixtures.ts`, one small JSON chamber per case or shared, in `scripts/fixtures/`, a `behaviour` line each). Done 2026-11-19: 22 fixtures on eight shared chambers (`scripts/fixtures/slide_*.json`), the cases below plus four more spec bullets (from rest on slide floor onto plain floor, and onto slide floor; a crossing mid-slide onto plain floor; a slide a portal brings back onto its start tile, `moves: 0`); with the fizzler skipped mid-slide, the replay check failed `slide_through_fizzler` alone. One per spec bullet and edge case: slide to a wall (stops on the last slide floor); onto a plain tile (stops on it); through a portal onto a slide floor, then onto a plain tile; from plain floor into a portal whose exit tile is slide floor (slides); a fizzler mid-slide, with both portals open and a box carried (portals closed, box back at its start, slide goes on, `moves: 1`); an arrow pointing the slide's way (stops on it) and one pointing elsewhere (stops before it); an open ditch, a laser on and a light barrier on ahead (stops before each); the exit mid-slide (completes); a refused loop (only the facing changes, to the pressed way, `moves: 0`); a button passed over (not pressed) and one stopped on (pressed, its link acting); a box ahead (stops before it); a carried box (ends on the final tile, put down there afterwards); a mid-slide crossing that can't come out (stops in front of the portal, no `refused`); a turn in place on slide floor (doesn't move). Get each hash as "The code as it is" says, after checking its outcome. Checked by `npm run replay:check` passing, and failing once with the slide deliberately broken (say, the fizzler not run mid-slide), then reverted.
6. **R3, drawing and motion.** Done 2026-11-19. The timing, the pose along the path and the state shown were checked under Node on the fixture chambers, and in headless Chrome (the extension wasn't connected) on the playground's slide room: a slide through its field with both portals open, caught part way with the page's time slowed, at pixel ratio 1 and 2, and with reduced motion; the other cases of step 5 weren't played in the browser. Unlike the plan below, `fizzle_particles.ts` did change: each burst keeps its own start time, so a slide's stop that destroys a box joins the break-up of a fizzler the slide passed instead of replacing it.
   - `renderer.ts`: `drawFloor` also draws the `'floor'` layer's elements after the plain floor, so slide floors sit under the antlines, arrows and walls in both backdrop paths; update its comments. `element_drawings.ts`: `slideFloor: drawSlideFloors`, which draws `slide_floor` on every tile of every entry (rectangles expanded), modelled on `drawSwitches`. It joins no other list there or in `element_transitions.ts`.
   - `step_animation.ts`: `start` also takes the path; a step that slid lasts (units + 1) × 60 ms, counting one unit for a plain leg and two for a crossing, and its distance along the path is one tile every 60 ms until the last unit, then an ease-out (1 − (1 − t)²) over the last 120 ms, which starts at that same speed. Every other step keeps the 120 ms cubic ease-out. The one-frame lead stays. A six-tile slide takes about 0.42 s.
   - `subject_pose.ts`: with a path, the pose along it: a plain leg glides; a crossing leg slides into the entry portal facing it, clipped to the tile it left, then out of the exit portal, clipped to the tile it reached, as `crossingPose` does; distances rounded to whole canvas pixels. Without a path, today's code, unchanged.
   - What is drawn during a slide (`renderer.ts`, `level.ts`): the state of the leg the subject is at least half-way into (portals, boxes, buttons, flags, and the subject's sprite, holding a box or the gun), then the step's final state once the slide ends.
   - `level.ts` (decision 23): for a step that slid, nothing but the counts, the log and the clock happens at the press. Each leg's events and effects wait for the moment the subject is half-way into that leg's tile (for a crossing, the moment it passes through the portal): its sounds, and, when `fizzled` is among them, `fizzle.start(previous leg's state, this leg's state, its events, time)`, which breaks up the portals and puts a lost carried box's burst at this leg's tile, so `fizzle_particles.ts` needs no change. `slideStarted` fires as the subject reaches the first slide floor tile it moves on from. At the slide's end: `slideStopped` and every event from settling, with the element transitions, box fall, portal openings and ripple started from the last leg's state to the final state, and `onCompleted` (decision 34). A press while a slide is drawn ends it at once, as today, after first firing everything still waiting, in order; a load or a reset drops it (decision 35). The clock stops at the press that completes the chamber, since `onCompleted`, which pauses the game, now waits for the slide's end. Pausing doesn't hold them, since the step animation already runs while paused. With `prefers-reduced-motion`, nothing glides and everything happens at the press, as today.
   - Leave out the mockup's motion trail (after-images while sliding); the spec doesn't ask for it.
   - Checked in the browser (AGENTS.md, "Testing in the browser": `npm run dev`, a new tab, muted as AGENTS.md says) on the playground once step 8 is done: every case of step 5 played by hand, at pixel ratio 1 and 2, and with reduced motion; and the sprite gallery.
7. **The chamber sign** (use the `frontend-design` skill). Done 2026-11-19: the pictogram is the tile's square crossed by three hatch lines the sprite's way, after the arrow in the sign's order, so the first row holds the floor's elements and the second the walls and fields; checked by headless Chrome screenshots of the playground's sign and chamber 1's, and the rail still fits a 1080 px window. `element_pictogram.vue`: a slide floor pictogram in the style of the others, for example a square tile with three diagonal hatch lines. `chamber_sign.vue`: its `{kind: 'slideFloor', field: 'slideFloors', name: …}` line in `SIGN_ELEMENTS`, and the grid: two rows of seven columns instead of one row of ten (`repeat(10, 1fr)`; decision 31). AGENTS.md says "ten kinds" and "all in one row"; make it eleven, in two rows. Checked by a browser screenshot of the sign in a chamber with and without slide floors.
8. **Playground and gallery.** Done 2026-11-19, both pages checked in headless Chrome: a 4 × 4 slide room in the bottom left corner, entered down from the left arm, with a fizzler field across it held off by a button on its slide floor that the room's box can hold down, and an antline from the button to the field; the gallery text in `sprite_gallery.html` ("every element") needed no change.
   - `src/dev/playground.json`: give the slide floor a place (AGENTS.md asks it of every new element), for example a slide room carved out of a solid corner and reached from one arm: one rectangle of slide floor, walls that take portals at its far ends, a fizzler across it, a button on slide floor and a box. Update its description in AGENTS.md (Chambers) and in `chamber_catalogue.ts`'s comment.
   - `src/dev/gallery_layouts.ts`: slide floor on (1,6) to (3,6) of the specimen chamber, and the specimen's description in `sprite_gallery.html`.
   - Checked by `npm run chamber:check`, `npm run smoke:engine` and `npm run random:walk`, and both pages in the browser.
9. **R5, the solver.** Done 2026-11-19: `docs/solver.md` names slide floors among the event tiles, and `npm run solver:check` passes. `reactsToSubject: true` (step 3) makes the solver's walks end on slide floor; `docs/solver.md` lists the event tiles, and says a new mechanic should declare its own. Checked by `npm run solver:check` passing. It only runs on campaign chambers, so it meets no slide floor until R7: tick R5 then.
10. **R6, the docs.** Done 2026-11-19, each part read against the code.
    - `docs/elements.md`: the element table row; the `slideFloors` field under "Chamber format"; the slide under "Move or turn" and "Crossing a portal", and its interactions (fizzlers, buttons, arrows, boxes, the exit, portals, loops); the new problems under "What the validator rejects" and the sharing rule there; "Adding an element", step 1 (`continuesMovement`) and step 7 (the floor layer is now drawn into the backdrop, under the antlines).
    - `docs/game_summary.md`: the tiles table, "How each tile looks" (next to the floor's "very light grey"), and the line that a step glides the subject one tile.
    - `docs/level_design.md`: slide pitfalls under "States to avoid" and "Dead ends" (a slide that ends somewhere the subject can never leave; a loop the player can set up only to be refused).
    - AGENTS.md: the rules' element count ("walls and the eleven elements" becomes twelve), the definition contract, the renderer's backdrop description, the step animation and effect timing in "Game/Vue boundary", the sign's "ten kinds" and "all in one row", the slide's two events among those with no sound (beside the portal closed by a fizzler and the destroyed box), the playground, the fixtures, the `-alpha off` list, and "tiles stepped onto".
    - The comments that say a move is one tile (see "Moves" above, and `draw_layer.ts`, `miss_ripple.ts`).
    - The sounds and colours table above: the slide floor's colours (face 232, 235, 242; lines 168, 173, 186), and no sounds yet (decision 33).
    - Checked by reading each against the code.
11. **Wrap-up.** Done 2026-11-19: `npm run verify` passes, after recording a new bundle baseline the author accepted (the JS had grown 11.1% since the baseline of 2026-11-14, about 5 KB of it from this phase). The code was reviewed turn by turn as it was built; the last turn changed only docs and comments, so it had no review of its own. `npm run lint:fix`, `npm run build`, then `npm run verify` (R5 asks for it), then the `delta-review` skill on every changed file. Tick only the R-steps finished: R2, R3, R4 and R6; R1 once the interaction table holds the slide floor's row (decision 30); R5 after R7.

#### After R1–R6

R7, once the author has tried slide floors in the playground (decision 25): a teach and a test chamber, ids 4 and 5 (the next free ids; files `src/chambers/chamber_4.json` and `chamber_5.json`), each with an entry in `src/services/chamber_catalogue.ts` and `scripts/chamber_files.ts`, and a recorded solution made by completing it in `npm run dev` and pressing Download solution, moved next to it. Then `npm run verify` with them in (R5), and the author's cold playtest, with teach notes in stage 04b's campaign plan table.

Chambers. Teach: a slide-floor room where stepping on slides you to the far wall, and the exit can only be reached by placing a portal so the slide comes out facing it. Test: two slides joined by portals, where the order you place them in matters. The twist and combine ideas are stage 04b's.

Built 2026-11-19, with the cold playtest and its teach notes still to do. Chamber 4 (teach): the first step slides across a slide room to a ledge, from which a portal is aimed across a ditch at the far end of the exit lane; the slide out of it stops under the exit (fewest portals 2). Chamber 5 (test): the same move twice, where the second lane is entered only by sliding back into the portal just come out of, so the other portal is the one to move (3 portals, both pars). A portal can only be aimed along a lane from a spot past a ditch at its end, which became `docs/level_design.md` guideline 25. Neither has links, so neither has antlines. The Chrome extension wasn't connected, so each solution was written from the solver's fewest-portals route by a one-off script, through the same replay runner and file layout as Download solution; both were then played through to completion in headless Chrome, and the home menu showed both rows and their maps.

- [x] **R1 Spec.** Finalise the spec above and fill the slide floor's row. The spec is final (plan step 1, decisions 26–34), and the row is in the interaction table (decision 30).
- [x] **R2 Element and format.** The slide floor element file and its optional list in format v2. Plan step 3.
- [x] **R3 Drawing and sounds.** A pale floor tile with thin diagonal lines (decision 21); slide start and stop events, silent for now (decision 33). Plan steps 2, 6 and 7.
- [x] **R4 Fixtures.** Slide to a wall, onto a normal tile, through a portal onto a slide and onto a normal tile, a fizzler mid-slide, an arrow mid-slide, the exit mid-slide, a refused loop, and a button passed over without being pressed, plus the other cases in plan step 5.
- [x] **R5 Solver check.** A slide carries the subject past the next tile, where the solver's walks expect it to stop, unless the slide floor counts as an element that reacts to the subject (`reactsToSubject` in its definition): walks then end there, which likely keeps them right. `npm run verify` passes with the slide chambers in (decision 18). Plan step 9; ticked after R7. Done 2026-11-19: `npm run verify` passes with chambers 4 and 5 in.
- [x] **R6 Docs.** The slide floor in `docs/elements.md`. Plan step 10.
- [ ] **R7 Chambers.** Teach and test chambers, solutions, a cold playtest. After R1–R6 (decision 25).

### Phase 2 — Rotating arrows

Draft spec:
- An arrow gains an optional link `id` and an optional `turnedDirection`. Arrows without an id behave exactly as today, so no upgrade is needed.
- Activated through a link, it points `turnedDirection`; deactivated, it points its original direction. A button holds it turned while pressed; a switch turns it for good (switches only ever activate).
- If the subject stands on the arrow when it turns, it stays, and can then leave only in the new direction. As today, the other three directions, moves and turns alike, do nothing on it.
- Slides stop on arrows (Phase 1).
- State: the arrow's link flag, the same kind as a blocked wall's.

Chambers. Teach: an arrow corridor that only leads away from the exit until a switch turns the last arrow. Twist: the button that turns the arrow is the tile you stand on, so stepping off turns it back behind you, a one-way trap. The test and combine ideas are stage 04b's.

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
- A beam blocks nothing (decision 20): the subject walks into, stands in and crosses it. The beam stops at the subject, so standing in it switches its receiver off until the subject steps out. Lit laser fields stay what blocks walking. Portal shots pass beams.
- **Receiver**: sits on a wall tile and listens on one face. Lit, it acts as a pressed button (activates its links); unlit, as a released button (deactivates them). As with a button (settled in stage 01), deactivating a link to a box does nothing.
- **Mirror box**: carried like a box (Space). It holds buttons down like a box, goes through portals with the subject, is reset by fizzlers like a box, and reflects beams by a fixed `/` or `\` (decision 18).
- **Settling a step**: apply the action and the subject's movement; trace the beams; evaluate buttons (by position) and receivers (by beams) in chamber data order; apply their links; trace again; repeat until nothing changes. If a state repeats (a receiver opening a door that blocks its own beam), stop at the first repeat, keep that state, and report it in the local checks as an oscillation warning.

Chambers. Teach: one emitter and one receiver that opens the exit door, with a wall between them; place a portal pair to route the beam around. Test: the beam has to turn a corner, coming out of a portal on a perpendicular wall. The twist and combine ideas are stage 04b's.

- [ ] **R1 Spec.** Finalise the spec above, including the settling rule, and fill the rows for emitter, beam, receiver and mirror box.
- [ ] **R2 Element and format.** Element files for emitter, receiver and mirror box; optional lists in format v2. Laser fields stay their own element (decision 18).
- [ ] **R3 Drawing and sounds.** The beam as a thin line, coloured unlike a laser field; emitter and receiver as wall notches; the mirror box as a box with a diagonal. Receiver on/off events.
- [ ] **R4 Fixtures.** A straight beam, a beam through portals, a beam loop, a beam blocked by the subject, the subject walking into a beam and out again (its receiver off, then lit again), a slide passing through a beam and one ending in it, stepping onto the tile in front of a door a beam holds open (the door closes), a mirror bend, a mirror carried through a portal, a receiver opening and closing a door, an oscillation that settles deterministically, a fizzler resetting a carried mirror.
- [ ] **R5 Solver check.** Each mirror box adds a tile to the key, like a box (8 bits on today's chamber sizes). Beams add no bits, being derived. But the subject blocks them and can walk into them (decisions 18 and 20), so any walk into or out of a beam can change links, which the solver's walks and shared shots assume it can't. The check will likely skip, and name, every laser chamber. `npm run verify` passes with the laser chambers in (decision 18).
- [ ] **R6 Docs.** All four entries in `docs/elements.md`, with the settling rule written out. Add a `docs/level_design.md` guideline: a beam must not cross something its own receiver holds open (a door, the exit, a bridged ditch, or a laser or light barrier held off). Stepping onto it cuts the beam and switches it under the subject (decision 20).
- [ ] **R7 Chambers.** Teach and test chambers, solutions, a cold playtest; neither raises an oscillation warning in the replay check or the random walk.

### Phase 4 — Wrap-up

- [ ] **Interaction table complete.** No "to do" cells left; each cell is backed by a rule fixture or forbidden by chamber validation.
- [ ] **Docs and AGENTS.md.** `docs/elements.md` covers every element; AGENTS.md's layout and rules mention the new elements.
- [ ] **Sounds and colours table.** Fill it in with the real results. Verify: every row the plan keeps is filled in.
- [ ] **README.** Update the stage status and record any new decisions.
- [ ] **Status.** Set this file to Done once every *Done when* box is ticked.

## Local checks added

- Rule fixtures replay with their expected outcome (completes, does not complete, or expected state).
- Chamber validation: forbidden element overlaps (Phase 1); emitters and receivers sit on wall tiles with an open face.
- Oscillation warning: any chamber or fixture in which the replay check or the random walk meets a repeating receiver state is reported.
- The solver check skips, and names, each chamber it can't handle (decision 18).
- No new size check: the engine smoke check and the random walk already print each chamber's state size, so growth from each mechanic stays visible.

## Done when

- [ ] Slide floors, rotating arrows and live lasers (emitter, receiver, mirror box) have each passed R1–R7.
- [ ] The interaction table is complete, each cell backed by a fixture or forbidden by validation.
- [ ] No mechanic needed engine changes outside its own files beyond the hooks added in Phase 0, or the exceptions are listed here.
- [ ] The sounds and colours table is filled in.
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
- **New elements must read clearly.** Slide floor and plain floor, beam and laser field must stay distinct, all the more since a laser field blocks walking and a beam doesn't (decision 20). R3's check and the cold playtests catch this.
- **"Moves" changes meaning.** A slide moves many tiles on one key. Follow stage 01's definition (one move) and note any change in meaning, because analytics parameter names are permanent and their history spans the change.
- **Feeling borrowed.** Keep names, looks and combinations original (decision 1).

## Notes for later stages

- **Stage 05:** the editor needs a palette entry for each element, placement validation (the same rules as the local chamber validation), link editing for receivers and rotating arrows.
- **Stage 02 (stopped):** if the solver is ever revisited, its state key (`docs/solver.md`) must grow with the new state: mirror box positions and link flags for arrows and emitters.
- Notes (filled in during this stage): the sounds and colours table.
