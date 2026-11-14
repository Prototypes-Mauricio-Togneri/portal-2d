# Light barrier

Tick a box when the step is implemented and verified.

## Goal and scope

Add a new chamber element, the **light barrier**: a pale teal field of light that stands on a floor tile, blocks walking and shots, never holds a portal, and can be switched off by a button or a switch. Switched off, the field vanishes and only its thin emitter strips stay on the floor. It works like the existing barrier on a floor tile, but looks different and is a separate element. That way both can be tried side by side in the development-only playground before deciding whether to keep the barrier.

Included:

- The element in the rules, the chamber file format, the file reader and the layout checks.
- Its two sprites: the field switched on, the emitter strips switched off.
- One behaviour fixture and one layout-check case that pin its rules.
- Two light barriers in the playground, next to the existing barrier; one in the sprite gallery's sample chamber.
- The docs that describe elements, sprites and the playground.

## Out of scope

- Removing, replacing or restyling the existing barrier. All 51 barriers in the four chambers stay as they are.
- Using the light barrier in any real chamber, or recording any chamber's solution again.
- A light barrier on top of a wall tile, or on the chamber's edge.
- A fade or flicker when it switches, and a glow sprite.
- A changelog entry: no chamber the player can open uses it.
- `todo/teach.md` and the other roadmap files under `todo/`.
- Noticed and left alone: `AGENTS.md` still describes sprite placeholders and a `sprite_placeholders` module, but the code has none; a sprite without a file is simply not drawn.

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
10. **Playground placement.** Two light barriers on either side of the floor barrier in the playground's down wing, switched by the same down button, so both elements change together.

## Facts checked in the code

Checked on 2026-11-14.

- The barrier's definition is `src/game/rules/elements/barrier.ts`: `sitsOn: 'floorOrWall'`, layer `blockers`, `linkable`, `defaultBlocked: true`, blocks walking and shots while blocked, `takesPortals: false`, no events; raising it also closes a portal on its tile (only possible on a wall tile).
- The barrier is listed by hand in: `src/game/rules/validate_chamber.ts` (the `OccupantKind` union, the `FIXTURES` list of fixed floor elements, `EDGE_KINDS`, the `placeElement` calls, the `addElements` calls for link targets), `src/game/rules/chamber_parser.ts` (`CHAMBER_FIELDS`, its `readList` call, the null check and the result object), `src/game/rules/element_registry.ts`, `src/game/element_drawings.ts` (`GAP_SIDE_KINDS` and `ELEMENT_DRAWINGS`) and `src/game/sprite_set.ts` (`SPRITE_SHAPES` and `RAISED_SPRITES`). The solver (`src/solver/`) names no element by hand.
- `describeKind` in `validate_chamber.ts` builds messages as "a <kind>", which would print "a lightBarrier"; the new kind needs its own wording, "a light barrier".
- `ELEMENT_DRAWINGS` is typed as a record over every element kind, so the build fails until the new kind has a drawing.
- The element registry check in `npm run chamber:check` currently reports 11 entries (walls and ten elements).
- Behaviour fixtures live in `scripts/fixtures/fixtures.ts`, each a tiny chamber JSON next to it plus actions and an expected result (completed, moves, portals, final hash). Its header comment says they pin changes from the original game's rules and how undo and redo replay.
- Layout-check cases live in `scripts/fixtures/format_examples.ts` (`CHAMBER_CASES`), each with the exact problems the check must print, such as `error exit at (5, 1): the exit can't be inside a wall (only one barrier can)`.
- The playground (`src/dev/playground.json`) has its down button at (7, 6) linked to ids 31 (fizzler at (7, 4)), 32 (barrier at (7, 2)) and 33 (barrier on the bottom wall at (7, 0)). Tiles (6, 2) and (8, 2) are plain floor.
- The sprite gallery's sample chamber (`specimenData` in `src/dev/gallery_layouts.ts`, 10 × 8) has plain floor at (8, 1), which is not next to a door, the exit or a fizzler and not in column 4 or row 3, which stay clear for the sample's shots.
- Bundle size: the last build had images at 300,097 bytes against a baseline of 287,773 in `scripts/bundle_baseline.json`. `npm run bundle:check` fails when a kind grows by more than both 10 % and 10 KB, which leaves about 16 KB for images. Each barrier sprite is about 9–10 KB, so two new sprites will probably go over. Unverified until built.
- No `plan-*.md` or `stage-*.md` file exists in the project root.

## What the user sees

1. In `npm run dev`, open Playground from the home menu.
2. In the down wing, below the fizzler, three blockers stand in a row: the hatched barrier in the middle and a pale teal light field on each side.
3. Step onto the down button (one step down from the start). The fizzler crumbles away, the barrier lowers and both light fields vanish at once, leaving only their thin emitter strips with dark slots.
4. Step off the button. The fields come back instantly, slots lit teal.
5. With a field on, the subject can't walk into it and a shot at it misses. With it off, the subject walks through and shots fly past.
6. Players of the real chambers see no change.

## Phase 1 — Sprites

Both sprites exist as files, the game knows their names, and the build and asset checks pass.

- [ ] **Draw the switched-off sprite.** Write `art/sprites/light_barrier_off.svg`, 256 × 256 px, transparent background: a thin dark emitter strip along each of the four edges, each with a dark slot, kept off the tile's very edge and its 128 px midlines as the sprite spec asks for details. Check by exporting it and looking at it on both a light floor and a grey wall background.
- [ ] **Draw the switched-on sprite.** Write `art/sprites/light_barrier_on.svg`, 256 × 256 px: the same emitter strips exactly, slots lit pale teal, and between them a see-through pale teal field with fine scan lines, so the floor shows faintly through it. No blue or orange. Check that at 40 px it reads as solid light and can't be taken for the fizzler's blue haze or the blue portal.
- [ ] **Export both.** For each: `inkscape art/sprites/<name>.svg --export-type=png --export-filename=<name>.png`, then `convert <name>.png -quality 90 -define webp:alpha-quality=100 src/assets/images/chamber/<name>.webp` (keep the alpha: no `-alpha off`, which is only for the opaque floor and strips). Delete the PNGs afterwards.
- [ ] **Register the sprites.** In `src/game/sprite_set.ts`, add `light_barrier_on: 'tile'` and `light_barrier_off: 'tile'` to `SPRITE_SHAPES`, right after the barrier's two. Leave `RAISED_SPRITES` unchanged.
- [ ] **Document the sprites.** In `docs/sprites.md`: add both to the table under "The set" (renumbering its rows), add `light_barrier_*` to the "Blockers" row under "Order", and add a "Teal" row with the chosen RGB to the colours with a meaning under "Look".
- [ ] **Verify.** `npm run lint:fix`, `npm run build`, `npm run assets:check`, then `npm run bundle:check`. If the bundle check fails on images, stop and ask the user whether to accept the growth before running `npm run bundle:baseline` (see Open decisions). In `npm run dev`, open `/src/dev/sprite_gallery.html` and confirm both sprites show as "in use" at 256 × 256 px.

## Phase 2 — Rules, reading and checks

Chamber files can hold light barriers, the rules play them like floor barriers, the game draws them, and the engine checks pin that.

- [ ] **Element definition.** Add `src/game/rules/elements/light_barrier.ts`, copied from `barrier.ts` with: kind `lightBarrier`, fileKey `lightBarriers`, `sitsOn: 'floor'`, the rest as the barrier (layer `blockers`, linkable, `defaultBlocked: true`, blocks walking and shots while blocked, `stopsShootingFrom: 'never'`, `takesPortals: false`, no events). Its link hooks only clear or set its blocked flag; no portal closing, since a floor tile never holds a portal. A JSDoc block on each function and the export.
- [ ] **Registry.** In `src/game/rules/element_registry.ts`, import it and add it right after `BARRIER_ELEMENT`.
- [ ] **File reader.** In `src/game/rules/chamber_parser.ts`, add `'lightBarriers'` to `CHAMBER_FIELDS` after `'barriers'`, read it with `readList(file.lightBarriers, 'lightBarriers', (entry, field) => this.readBlockable(entry, field))`, add it to the null check and to the result object.
- [ ] **Layout checks.** In `src/game/rules/validate_chamber.ts`: add `'lightBarrier'` to `OccupantKind` and to `FIXTURES` (at most one fixed element per floor tile); place its entries with `placeElement(element, 'lightBarrier', \`lightBarriers[${index}]\`)`; add `addElements(chamber.lightBarriers, 'lightBarrier', 'lightBarriers')` so links can reach it; make `describeKind` return "a light barrier" for it. Leave `EDGE_KINDS` and the "only one barrier can" wall rule unchanged, so a light barrier inside a wall or alone on the edge is refused.
- [ ] **Drawing.** In `src/game/element_drawings.ts`, add `lightBarrier: blockableDrawing('lightBarrier', 'light_barrier_on', 'light_barrier_off')` to `ELEMENT_DRAWINGS` and `'lightBarrier'` to `GAP_SIDE_KINDS`.
- [ ] **Behaviour fixture.** Add `scripts/fixtures/light_barrier.json`, a 7 × 3 format 2 chamber: walls along rows 0 and 2 and at (6, 1), the closed exit at (0, 1), the subject at (1, 1) facing `RIGHT`, a switch at (2, 1) linked to id 1, and a light barrier with id 1 at (3, 1). In `scripts/fixtures/fixtures.ts`, import it and add a fixture named `light_barrier_blocks_until_switched_off` with actions `blue`, `right`, `right`, `interact`, `blue`, `right`. Counted by hand: the first shot misses (stopped by the field), the second `right` is blocked, the switch turns the field off, the second shot opens a portal on the wall at (6, 1), and the last move enters (3, 1); so `completed: false`, `moves: 2`, `portals: 1`. Take `finalHash` from the replay check's report once the counts match. Widen the file's header comment to say fixtures also pin new elements' rules.
- [ ] **Layout-check case.** In `scripts/fixtures/format_examples.ts`, add a case with a light barrier on a wall tile, pinning the exact error the check prints for it (of the form `error lightBarriers[0] at (x, y): a light barrier can't be inside a wall (only one barrier can)`).
- [ ] **Rules docs.** In `docs/elements.md`: a "Light barrier" row in the table at the top; `lightBarriers` in the format table's row for blockable lists; the light barrier in "Blocking" (blocked means its field is on), in "Shoot blue or orange" (a light barrier that is on stops a shot), in the links table (unblocked: off; blocked: on), in "Something blocking under the subject", and in "What the validator rejects" (one fixed element per floor tile).
- [ ] **Agent docs.** In `AGENTS.md`, change "walls and the ten elements" to eleven, and list the new fixture where the behaviour fixtures are described if they are named.
- [ ] **Verify.** `npm run lint:fix`, `npm run build`, then `npm run chamber:check` (the registry check now reports 12 entries and the new case passes), `npm run replay:check` (the new fixture passes), `npm run smoke:engine`, `npm run random:walk` and `npm run solver:check`.

## Phase 3 — Playground and gallery

The light barrier can be tried by hand next to the barrier, and the gallery shows it in a chamber.

- [ ] **Playground.** In `src/dev/playground.json`, add `lightBarriers` with entries at (6, 2) id 34 and (8, 2) id 35, and add 34 and 35 to the links of the down button at (7, 6).
- [ ] **Gallery sample.** In `specimenData` in `src/dev/gallery_layouts.ts`, add `lightBarriers: [blockable(8, 1, on)]`, and mention it in the function's comment.
- [ ] **Docs.** In `AGENTS.md`, add the two light barriers to the playground's description of the down wing. In `docs/game_summary.md`, add a "Light barrier" row to "How each tile looks": on, a see-through pale teal field between emitter strips; off, only the strips.
- [ ] **Verify.** `npm run chamber:check`, `npm run smoke:engine` and `npm run random:walk` pass for `playground.json`. In the browser (`npm run dev`, a new tab, audio muted by running `const play = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { this.muted = true; return play.call(this) }` before pressing Start): open Playground, step onto the down button and off again and watch both fields vanish and return with the barrier; with them on, walk into one (blocked) and shoot one (miss); with the button held by a box, walk through. Open the sprite gallery and check the sample chamber at every size, everything on and everything off. Close the tab and stop the dev server.

## Phase 4 — Final check

The whole project check passes and the change is reviewed.

- [ ] **Full check.** `npm run verify` passes.
- [ ] **Review.** Run the `delta-review` skill on the files changed, and fix what it confirms.
- [ ] **Verify.** `npm run lint:fix` and `npm run build` pass again after any review fix.

## Tests

- Behaviour fixture `light_barrier_blocks_until_switched_off`, run by `npm run replay:check`.
- Layout-check case for a light barrier inside a wall, run by `npm run chamber:check`, together with its registry checks (fields, events, blocked flags).
- `npm run smoke:engine`, `npm run random:walk` and `npm run chamber:check` on the playground.
- `npm run solver:check`, to confirm the solver still agrees with the rules.
- `npm run assets:check` and `npm run bundle:check` for the new sprite files.
- Manual browser test in the playground and the sprite gallery, as in Phase 3.

## Risks

- **Colour confusion.** At 40 px, teal may read as the fizzler's blue field (which the subject can walk through) or the blue portal. Notice it in the gallery at 40 px and in the playground; push the teal further towards green or lighter if it does.
- **Busy runs.** Each tile draws its own four emitter strips, so a row of light barriers shows doubled strips between tiles. Check how a row looks in the playground's down wing.
- **Bundle limit.** Two new sprites will probably push images past the bundle check's limit (see Facts). Noticed at Phase 1's verify.
- **Turning doors.** Counting light barriers as lining a gap can turn a door, the exit or a fizzler next to them differently. No chamber has one next to a light barrier yet; watch for it when one does.
- **Unverified:** the exact error message text for a light barrier inside a wall, until the check prints it.

## Open decisions

- **Accepting the image growth.** If `npm run bundle:check` fails after Phase 1, the choices are: accept the growth and record a new baseline with `npm run bundle:baseline` (recommended: the sprites are needed, and each is about the size of a barrier sprite), or shrink the sprites (lower WebP quality, simpler scan lines) until the check passes. Ask the user; never record a new baseline without their yes.

## Done when

- [ ] A chamber file can list `lightBarriers`, and a light barrier on a wall tile or overlapping another fixed element is refused with a clear message.
- [ ] A light barrier that is on blocks walking and shots, and one switched off by a button or switch lets both through, as the fixture pins.
- [ ] Both sprites draw: a pale teal field with lit emitter strips when on, only the strips with dark slots when off, with no drop shadow.
- [ ] The playground's down wing shows two light barriers beside the barrier, all switched by the down button.
- [ ] The sprite gallery shows both sprites and a light barrier in its sample chamber.
- [ ] `docs/elements.md`, `docs/sprites.md`, `docs/game_summary.md` and `AGENTS.md` describe the light barrier.
- [ ] `npm run verify` passes, and the review found nothing left to fix.
- [ ] No existing chamber or recorded solution changed.

## Go/no-go points

- **Keep or remove the barrier.** After comparing the two in the playground, the user decides whether to remove the barrier. That would be a separate plan: it changes chambers 1, 2 and 3 and their recorded solutions, and the 9 barriers that shield walls in chambers 2 and 3 would need another answer, since the light barrier is floor only.
