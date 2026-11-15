# Light barrier

Tick a box when the step is implemented and verified.

## Goal and scope

Add a new chamber element, the **light barrier**: a pale teal field of light that stands on a floor tile, blocks walking and shots, never holds a portal, and can be switched off by a button or a switch. Switched off, the field vanishes and only its thin emitter strips stay on the floor. It works like the existing barrier on a floor tile, but looks different and is a separate element. That way both can be tried side by side in the development-only playground before deciding whether to keep the barrier.

Included:

- The element in the rules, the chamber file format, the file reader and the layout checks.
- Its two sprites: the field switched on, the emitter strips switched off.
- One behaviour fixture and two layout-check cases that pin its rules.
- Two light barriers side by side in the playground, next to the existing barrier; one in the sprite gallery's sample chamber.
- The docs that describe elements, sprites and the playground.

## Out of scope

- Removing, replacing or restyling the existing barrier. All 51 barriers in the four chambers stay as they are.
- Using the light barrier in any real chamber, or recording any chamber's solution again.
- A light barrier on top of a wall tile, or on the chamber's edge.
- A fade or flicker when it switches, and a glow sprite.
- A changelog entry: no chamber the player can open uses it.
- `todo/teach.md` and the other roadmap files under `todo/`.
- Running the solver on a light barrier. The solver check (`npm run solver:check`) runs only the catalogue's chambers and the solver fixtures, none of which will hold one, and the roadmap asks nothing of the solver but that its check keeps passing; no mechanic depends on it.

## Decisions

1. **A new element, not a new look for the barrier.** Both can then be compared side by side; whether to remove the barrier is decided later.
2. **The barrier's floor rules.** While on (its `blocked` flag set, the default) it stops walking and shots; it never holds a portal, since only walls do. Switched off it lets both through. Buttons and switches reach it through links, like a barrier.
3. **Floor only.** It can't sit on a wall tile and can't close the chamber's edge. Chosen for simplicity, accepting that it can't stand in for the 9 barriers that shield walls in chambers 2 and 3 if the barrier is ever removed.
4. **Name: light barrier.** Element kind `lightBarrier`, chamber file field `lightBarriers`, sprites `light_barrier_on` and `light_barrier_off`. The name shows it is the barrier's twin.
5. **Pale teal, pushed towards green.** Chosen over white for the Portal 2 "hard light" feel. It must stay clearly apart from the blue portal (40, 140, 220), the fizzler's see-through cobalt (30, 80, 210 at 62 %) and the subject's green (0, 160, 100). Start near rgb(120, 230, 210) and adjust by eye.
6. **Off leaves the emitter strips.** A thin dark strip along each edge of the tile, its slot lit teal while on and dark while off, so a player sees where the field will come back (as the lasers' end plates do).
7. **No drop shadow.** It is light, not a solid block, so it is not in the list of raised sprites.
8. **Switches instantly.** No transition, as the barrier today.
9. **Drawn and treated like the barrier otherwise.** It sits in the `blockers` draw layer, right after the barrier in the element registry (so it is drawn after barriers), and counts as lining a gap when a door, the exit or a fizzler next to it decides which way to turn.
10. **Playground placement.** In the playground's down wing, the floor barrier moves one tile left and two light barriers stand side by side next to it, all three switched by the same down button, so both elements change together and a pair of light barriers shows how neighbouring emitter strips look.

## Facts checked in the code

Checked on 2026-11-14.

- The barrier's definition is `src/game/rules/elements/barrier.ts`: `sitsOn: 'floorOrWall'`, layer `blockers`, `linkable`, `defaultBlocked: true`, blocks walking and shots while blocked, `takesPortals: false`, no events; raising it also closes a portal on its tile (only possible on a wall tile).
- The barrier is listed by hand in: `src/game/rules/validate_chamber.ts` (the `OccupantKind` union, the `FIXTURES` list of fixed floor elements, `EDGE_KINDS`, the `placeElement` calls, the `addElements` calls for link targets), `src/game/rules/chamber_parser.ts` (`CHAMBER_FIELDS`, its `readList` call, the null check and the result object), `src/game/rules/element_registry.ts`, `src/game/element_drawings.ts` (`GAP_SIDE_KINDS` and `ELEMENT_DRAWINGS`) and `src/game/sprite_set.ts` (`SPRITE_SHAPES` and `RAISED_SPRITES`). The solver (`src/solver/`) names no element by hand.
- `describeKind` in `validate_chamber.ts` builds messages as "a <kind>", which would print "a lightBarrier"; the new kind needs its own wording, "a light barrier".
- `ELEMENT_DRAWINGS` is typed as a record over every element kind, so the build fails until the new kind has a drawing.
- The element registry check in `npm run chamber:check` currently reports 11 entries (walls and ten elements).
- Behaviour fixtures live in `scripts/fixtures/fixtures.ts`, each a tiny chamber JSON next to it plus actions and an expected result (completed, moves, portals, final hash). Its header comment says they pin changes from the original game's rules and how undo and redo replay.
- Behaviour fixtures are replayed without the layout checks, and the replay check compares only the final result. A wall face that already holds a portal refuses a second one, so two shots at the same face leave the same final state whether or not the first one got through.
- Layout-check cases live in `scripts/fixtures/format_examples.ts` (`CHAMBER_CASES`), each with the exact problems the check must print, such as `error exit at (5, 1): the exit can't be inside a wall (only one barrier can)`.
- In `validate_chamber.ts`, an element on a wall tile is refused before the one-fixed-element-per-floor-tile rule is looked at, so a light barrier inside a wall never tests that rule. A floor overlap prints the kinds as written in code, of the form `more than one element on a tile: lightBarrier (lightBarriers[0]), door (doors[0]); only two crossing lasers can share one`.
- The playground (`src/dev/playground.json`) has its down button at (7, 6) linked to ids 31 (fizzler at (7, 4)), 32 (barrier at (7, 2)) and 33 (barrier on the bottom wall at (7, 0)). The down room is the 3 × 3 floor at (6..8, 1..3); tiles (6, 2) and (8, 2) are plain floor.
- The gallery's sprite cards show each sprite only at full size (256 px); the sample chambers are drawn at the menu map's size and at 40, 100 and 230 px.
- The colours with a meaning in `docs/sprites.md` already include crimson (lasers), which has no CSS token in `src/assets/styles.css`, so a teal row fits the same table.
- The barrier is also named, besides the lists above, in `docs/elements.md` (the notes at the top, the walking rule under "Move or turn", the links paragraph), in `docs/sprites.md` (row 6 of "Turning": what lines a gap), in the comments around `GAP_SIDE_KINDS` and the gap-lining function in `element_drawings.ts`, and in `docs/game_summary.md` (the shots line, the tile table, the links lines and "Something closing under the subject").
- The sprite gallery's sample chamber (`specimenData` in `src/dev/gallery_layouts.ts`, 10 × 8) has plain floor at (8, 1), which is not next to a door, the exit or a fizzler and not in column 4 or row 3, which stay clear for the sample's shots.
- Bundle size: the last build had images at 300,097 bytes against a baseline of 287,773 in `scripts/bundle_baseline.json`. `npm run bundle:check` fails when a kind grows by more than both 10 % and 10 KB, which leaves about 16 KB for images. Each barrier sprite is about 9–10 KB, so two new sprites will probably go over. Unverified until built.
- No `plan-*.md` or `stage-*.md` file exists in the project root.

## What the user sees

1. In `npm run dev`, open Playground from the home menu.
2. In the down wing, below the fizzler, three blockers stand in a row: the hatched barrier on the left and two pale teal light fields side by side on its right.
3. Step onto the down button (one step down from the start). The fizzler crumbles away, the barrier lowers and both light fields vanish at once, leaving only their thin emitter strips with dark slots.
4. Step off the button. The fields come back instantly, slots lit teal.
5. With a field on, the subject can't walk into it and a shot at it misses. With it off, the subject walks through and shots fly past.
6. Players of the real chambers see no change.

## Phase 1 — Sprites

Both sprites exist as files, the game knows their names, and the build and asset checks pass.

- [x] **Draw the switched-off sprite.** Write `art/sprites/light_barrier_off.svg`, 256 × 256 px, transparent background: a thin dark emitter strip along each of the four edges, each with a dark slot, kept off the tile's very edge and its 128 px midlines as the sprite spec asks for details. Check by exporting it and looking at it on both a light floor and a grey wall background.
- [x] **Draw the switched-on sprite.** Write `art/sprites/light_barrier_on.svg`, 256 × 256 px: the same emitter strips exactly, slots lit pale teal, and between them a see-through pale teal field with fine scan lines, so the floor shows faintly through it. No blue or orange.
- [x] **Export both.** For each: `inkscape art/sprites/<name>.svg --export-type=png --export-filename=<name>.png`, then `convert <name>.png -quality 90 -define webp:alpha-quality=100 src/assets/images/chamber/<name>.webp` (keep the alpha: no `-alpha off`, which is only for the opaque floor and strips).
- [x] **Check the look at 40 px.** Nothing draws the sprites in a chamber yet, so compare the exported images directly: lay each over the floor sprite (`convert src/assets/images/chamber/floor.webp <name>.png -composite`), shrink the results and the fizzler and blue portal sprites (each over the floor too) to 40 px with `-resize 40x40`, and look at them side by side with `+append`. The field must read as solid light and must not be taken for the fizzler's blue haze or the blue portal; adjust the teal and export again if it is. Delete the PNGs afterwards.
- [x] **Register the sprites.** In `src/game/sprite_set.ts`, add `light_barrier_on: 'tile'` and `light_barrier_off: 'tile'` to `SPRITE_SHAPES`, right after the barrier's two. Leave `RAISED_SPRITES` unchanged.
- [x] **Document the sprites.** In `docs/sprites.md`: add both to the table under "The set" (renumbering its rows), add `light_barrier_*` to the "Blockers" row under "Order", and add a "Teal" row with the chosen RGB to the colours with a meaning under "Look".
- [x] **Verify.** `npm run lint:fix`, `npm run build`, `npm run assets:check`, then `npm run bundle:check`. If the bundle check fails on images, stop and ask the user whether to accept the growth before running `npm run bundle:baseline` (see Open decisions). In `npm run dev`, open `/src/dev/sprite_gallery.html` and confirm both sprites show as "in use" at 256 × 256 px.

## Phase 2 — Rules, reading and checks

Chamber files can hold light barriers, the rules play them like floor barriers, the game draws them, and the engine checks pin that.

- [x] **Element definition.** Add `src/game/rules/elements/light_barrier.ts`, copied from `barrier.ts` with: kind `lightBarrier`, fileKey `lightBarriers`, `sitsOn: 'floor'`, the rest as the barrier (layer `blockers`, linkable, `defaultBlocked: true`, blocks walking and shots while blocked, `stopsShootingFrom: 'never'`, `takesPortals: false`, no events). Its link hooks only clear or set its blocked flag; no portal closing, since a floor tile never holds a portal. A JSDoc block on each function and the export.
- [x] **Registry.** In `src/game/rules/element_registry.ts`, import it and add it right after `BARRIER_ELEMENT`.
- [x] **File reader.** In `src/game/rules/chamber_parser.ts`, add `'lightBarriers'` to `CHAMBER_FIELDS` after `'barriers'`, read it with `readList(file.lightBarriers, 'lightBarriers', (entry, field) => this.readBlockable(entry, field))`, add it to the null check and to the result object.
- [x] **Layout checks.** In `src/game/rules/validate_chamber.ts`: add `'lightBarrier'` to `OccupantKind` and to `FIXTURES` (at most one fixed element per floor tile); place its entries with `placeElement(element, 'lightBarrier', \`lightBarriers[${index}]\`)`; add `addElements(chamber.lightBarriers, 'lightBarrier', 'lightBarriers')` so links can reach it; make `describeKind` return "a light barrier" for it. Leave `EDGE_KINDS` and the "only one barrier can" wall rule unchanged, so a light barrier inside a wall or alone on the edge is refused.
- [x] **Drawing.** In `src/game/element_drawings.ts`, add `lightBarrier: blockableDrawing('lightBarrier', 'light_barrier_on', 'light_barrier_off')` to `ELEMENT_DRAWINGS` and `'lightBarrier'` to `GAP_SIDE_KINDS`, and add light barriers to the comments that list what lines a gap (above `GAP_SIDE_KINDS` and above the function that tests whether a tile lines a gap). In `docs/sprites.md`, add light barriers to row 6 of "Turning" (what lines a gap).
- [x] **Behaviour fixture.** Add `scripts/fixtures/light_barrier.json`, a 7 × 3 format 2 chamber: walls along rows 0 and 2 and at (6, 1), the closed exit at (0, 1), the subject at (1, 1) facing `RIGHT`, a button at (2, 1) linked to id 1, and a light barrier with id 1 at (4, 1). In `scripts/fixtures/fixtures.ts`, import it and add a fixture named `light_barrier_switches_off_and_on` with actions `orange`, `right`, `blue`, `right`, `right`. Counted by hand: the orange shot misses (stopped by the field at (4, 1)); the first `right` steps onto the button, which switches the field off; the blue shot passes (4, 1) and opens a portal on the wall at (6, 1); the second `right` steps off the button onto (3, 1), which switches the field back on; the third `right` is blocked by the field. So `completed: false`, `moves: 2`, `portals: 1`. Take `finalHash` from the replay check's report once the counts match. This pins all three behaviours: a field that let shots through while on would let the orange portal open first and the blue one be refused on the same wall face, changing the final state; a field that didn't come back on would let the last move through, giving 3 moves. Widen the file's header comment to say fixtures also pin new elements' rules.
- [x] **Layout-check cases.** In `scripts/fixtures/format_examples.ts`, add two cases, each pinning the exact problems the check prints: a light barrier on a wall tile (of the form `error lightBarriers[0] at (x, y): a light barrier can't be inside a wall (only one barrier can)`); and a light barrier sharing a floor tile with a door, with a switch linked to the light barrier, whose only problem must be the overlap (of the form `more than one element on a tile: lightBarrier (lightBarriers[0]), door (doors[0]); …`). The second case tests both the one-fixed-element-per-floor-tile rule and that links reach a light barrier (a link it can't reach would add an unknown-id error).
- [x] **Rules docs.** In `docs/elements.md`: a "Light barrier" row in the table at the top; light barriers in the notes under it (what links can lock or unlock); `lightBarriers` in the format table's row for blockable lists; the light barrier in "Blocking" (blocked means its field is on), in the walking rule under "Move or turn" (it can't enter a blocked light barrier), in "Shoot blue or orange" (a light barrier that is on stops a shot), in the links paragraph (what can be linked) and the links table (unblocked: off; blocked: on), in "Something blocking under the subject", and in "What the validator rejects" (one fixed element per floor tile).
- [x] **Agent docs.** In `AGENTS.md`, change "walls and the ten elements" to eleven, and list the new fixture where the behaviour fixtures are described if they are named.
- [x] **Verify.** `npm run lint:fix`, `npm run build`, then `npm run chamber:check` (the registry check now reports 12 entries and both new cases pass), `npm run replay:check` (the new fixture passes), `npm run smoke:engine`, `npm run random:walk` and `npm run solver:check` (existing chambers and solver fixtures still agree; it holds no light barrier).

## Phase 3 — Playground and gallery

The light barrier can be tried by hand next to the barrier, and the gallery shows it in a chamber.

- [x] **Playground.** In `src/dev/playground.json`, move the floor barrier with id 32 from (7, 2) to (6, 2), add `lightBarriers` with entries at (7, 2) id 34 and (8, 2) id 35, and add 34 and 35 to the links of the down button at (7, 6). The shot from the down button to the barrier on the bottom wall now crosses the light barrier at (7, 2), which is off while the button is held, like the rest.
- [x] **Gallery sample.** In `specimenData` in `src/dev/gallery_layouts.ts`, add `lightBarriers: [blockable(8, 1, on)]`, and mention it in the function's comment.
- [x] **Docs.** In `AGENTS.md`, update the playground's description of the down wing (the barrier and the two light barriers beside it). In `docs/game_summary.md`: add a "Light barrier" row to the tile table (what it does, and whether the subject can walk on it: only when off), and add light barriers to the line on what stops a shot, the lines on what links reach and what pressing and releasing does, and "Something closing under the subject".
- [x] **Verify.** `npm run chamber:check`, `npm run smoke:engine` and `npm run random:walk` pass for `playground.json`. In the browser (`npm run dev`, a new tab, audio muted by running `const play = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { this.muted = true; return play.call(this) }` before pressing Start): open Playground, step onto the down button and off again and watch both fields vanish and return with the barrier; with them on, walk into one (blocked) and shoot one (miss); with the button held by a box, walk through; check how the strips look where the two light barriers touch. Open the sprite gallery and check the sample chamber at every size, everything on and everything off, and that at 40 px the field reads as solid light and not as the fizzler or the blue portal. Close the tab and stop the dev server.

## Phase 4 — Final check

The whole project check passes and the change is reviewed.

- [x] **Review.** Run the `delta-review` skill on the files changed, and fix what it confirms.
- [x] **Verify.** `npm run lint:fix`, then `npm run verify` passes, after any review fix, as the last check of the finished change.

## Tests

- Behaviour fixture `light_barrier_switches_off_and_on`, run by `npm run replay:check`.
- Layout-check cases for a light barrier inside a wall and for one sharing a floor tile with a door (with a link to it), run by `npm run chamber:check`, together with its registry checks (fields, events, blocked flags).
- `npm run smoke:engine`, `npm run random:walk` and `npm run chamber:check` on the playground.
- `npm run solver:check`, to confirm the existing chambers and solver fixtures still agree with the rules; it never meets a light barrier.
- `npm run assets:check` and `npm run bundle:check` for the new sprite files.
- Manual browser test in the playground and the sprite gallery, as in Phase 3.

## Risks

- **Colour confusion.** At 40 px, teal may read as the fizzler's blue field (which the subject can walk through) or the blue portal. Notice it in the gallery at 40 px and in the playground; push the teal further towards green or lighter if it does.
- **Busy runs.** Each tile draws its own four emitter strips, so two light barriers side by side show doubled strips between them. Check how the pair looks in the playground's down wing.
- **Bundle limit.** Two new sprites will probably push images past the bundle check's limit (see Facts). Noticed at Phase 1's verify.
- **Turning doors.** Counting light barriers as lining a gap can turn a door, the exit or a fizzler next to them differently. No chamber has one next to a light barrier yet; watch for it when one does.
- **Unverified:** the exact error message text for a light barrier inside a wall, until the check prints it.

## Open decisions

- **Accepting the image growth.** If `npm run bundle:check` fails after Phase 1, the choices are: accept the growth and record a new baseline with `npm run bundle:baseline` (recommended: the sprites are needed, and each is about the size of a barrier sprite), or shrink the sprites (lower WebP quality, simpler scan lines) until the check passes. Ask the user; never record a new baseline without their yes.

## Done when

- [x] A chamber file can list `lightBarriers`, and a light barrier on a wall tile or overlapping another fixed element is refused with a clear message.
- [x] A light barrier that is on blocks walking and shots, one switched off by a button lets both through, and it blocks again when the button is released, as the fixture pins.
- [x] Both sprites draw: a pale teal field with lit emitter strips when on, only the strips with dark slots when off, with no drop shadow.
- [x] The playground's down wing shows two light barriers side by side beside the barrier, all switched by the down button.
- [x] The sprite gallery shows both sprites and a light barrier in its sample chamber.
- [x] `docs/elements.md`, `docs/sprites.md`, `docs/game_summary.md` and `AGENTS.md` describe the light barrier.
- [x] `npm run verify` passes, and the review found nothing left to fix.
- [x] No existing chamber or recorded solution changed.

## Go/no-go points

- **Keep or remove the barrier.** After comparing the two in the playground, the user decides whether to remove the barrier. That would be a separate plan: it changes chambers 1, 2 and 3 and their recorded solutions, and the 9 barriers that shield walls in chambers 2 and 3 would need another answer, since the light barrier is floor only.
