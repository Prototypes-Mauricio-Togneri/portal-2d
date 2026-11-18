# Chamber Elements

Reference for the elements a chamber file (`src/chambers/*.json`) can contain, carried over from the original game's help page with the light barrier and the blocked wall added in place of its barrier, followed by the chamber file format, the rules and what adding an element touches.

| # | Element | Description | Can be activated/deactivated? | Can portals go through it? | Can the subject go through it? | Quantity |
|---|---------|-------------|-------------------------------|----------------------------|--------------------------------|----------|
| 1 | Subject | The initial position of the subject | No | No | No | 1 |
| 2 | Wall | A solid wall, which holds portals | No | No | No | 0..∞ |
| 3 | Blocked wall | A wall that refuses portals while blocked | Yes | No | No | 0..∞ |
| 4 | Light barrier | A field of light, on a floor tile only | Yes | No | No | 0..∞ |
| 5 | Ditch | A hole in the floor | Yes | Yes | No | 0..∞ |
| 6 | Box | Can be picked up and used to activate buttons | Yes | Yes | No | 0..∞ |
| 7 | Button | Activates/deactivates other elements while the subject or a box is on it | No | Yes | Yes | 0..∞ |
| 8 | Switch | Can only be switched on. Activates/deactivates other elements | No | Yes | Yes | 0..∞ |
| 9 | Door | Must be unlocked in order to pass | Yes | No | No | 0..∞ |
| 10 | Fizzler | Resets portals and boxes (if the subject is carrying one) | Yes | No | Yes | 0..∞ |
| 11 | Exit | Reach it to complete the test chamber | Yes | No | No | 1 |
| 12 | Laser | Obstructs the passage of the subject | Yes | Yes | No | 0..∞ |
| 13 | Arrow | Limits the movement of the subject | No | Yes | Yes | 0..∞ |

## Notes

- Activate/deactivate means the element changes its state when a button is pushed or a switch is turned on, if they are linked to the element.
- Blocked walls, light barriers, ditches, doors, fizzlers, exits and lasers can be locked or unlocked by enabling their linked activator. Boxes, instead, are reset to their original position.
- Buttons and switches can be linked to many objects. For example, pushing a button can unlock a door and switch off a light barrier at the same time.

## Chamber format

A chamber file is a JSON object in format 2 (`ChamberData` in `src/game/chamber_data.ts`). Positions are tiles: `x` grows to the right and `y` upwards from the bottom row, both from 0. Every coordinate, size, id and count is a whole number. `version`, `size`, `subject` and `exit` are required; every list, `groups` and `par` may be left out, and a list left out means the chamber has none of that element. A field the format doesn't name is an error.

| # | Field | Holds |
|---|-------|-------|
| 1 | `version` | The format's version: `2`. |
| 2 | `size` | `width` and `height`, in tiles, each 1 or more. |
| 3 | `subject` | Where the subject starts: `x`, `y` and `direction` (`UP`, `DOWN`, `LEFT` or `RIGHT`), all required. |
| 4 | `exit` | The exit, a single entry: `x`, `y`, and optionally `id` and `blocked`. |
| 5 | `walls` | One tile (`x`, `y`) or a rectangle of tiles (`xFrom`, `xTo`, `yFrom`, `yTo`, both ends included, each from no greater than its to): walls, which take portals. |
| 6 | `blockedWalls` | One tile (`x`, `y`, and optionally `id` and `blocked`) or a rectangle of tiles (corners as for `walls`, and optionally `blocked`): blocked walls, which refuse portals while blocked. Only a one-tile entry can have an `id`, so only it can be linked. |
| 7 | `ditches`, `doors`, `fizzlers` | `x`, `y`, and optionally `id` and `blocked`. |
| 8 | `lasers` | `x`, `y`, `direction` (`H` or `V`: how it is drawn and which walls end its run, which take no portal, and two lasers can share a tile only when they cross), and optionally `id` and `blocked`. |
| 9 | `lightBarriers` | `x`, `y`, `direction` (`H` or `V`: how it is drawn and which walls end its run, which take no portal), and optionally `id` and `blocked`. |
| 10 | `boxes` | `x`, `y`, and optionally `id`. |
| 11 | `buttons`, `switches` | `x`, `y` and `links`, all required: the ids of the elements and link groups it acts on (see [links](#links)). |
| 12 | `arrows` | `x`, `y` and `direction` (`UP`, `DOWN`, `LEFT` or `RIGHT`), all required: the one way the subject can enter the tile. |
| 13 | `groups` | Link groups, each with an `id` and `links`, both required: the ids of the elements it stands for, never another group. |
| 14 | `antlines` | Dotted lines on the floor, each with `link` and `path`, both required: `link` the id of the one element it leads to, never a group's, and `path` its corner tiles (`x`, `y`), at least two, from the tile of a button or switch that links that element to the element's own tile. |
| 15 | `par` | How well the chamber can be solved, for medals: optionally `moves` and `portals`, each 0 or more. Reserved: nothing writes it yet (see `docs/solver.md`). |

- **`id`:** 1 or more, unique among every element and group, and needed only by what a button, switch or group links to; an element without one can't be linked.
- **`blocked`:** true when absent (see [blocking](#blocking)).
- **`antlines`:** only drawn, as in the original game, to show which button or switch acts on which element: they change nothing in the rules, the solver or the recorded solutions. A chamber may have none, and a link needs none; they are meant mostly for the tutorial and the early chambers. A line is lit while the element it leads to is unblocked (a door or the exit open, a laser, a light barrier or a fizzler off, a ditch bridged, a blocked wall taking portals), so a line to a box never lights, and two buttons on one door both light when it opens. Each corner shares a row or a column with the one before it, so the line runs straight between them; it may run under walls, hidden there and showing again beyond, and under any element. The chamber's hash, which a recorded solution keeps, leaves them out, so adding, moving or removing one needs no new recording. How they look: `docs/sprites.md`.
- **Other versions:** a file whose `version` is missing or not 2 is refused.

## Rules

The rules the game plays, in `src/game/rules/` (`step.ts`), pinned by each chamber's recorded solution and by the behaviour fixtures (`npm run replay:check`). They follow the original game's rules apart from the [changes from the original rules](#changes-from-the-original-rules) listed at the end, and add two elements the original game didn't have, in place of its barrier: the light barrier, which plays a barrier's rules on a floor tile (fixture: `light_barrier_switches_off_and_on`), and the blocked wall, which a link can switch between refusing and taking portals, as a barrier on a wall did (fixture: `blocked_wall_switches_off_and_on`).

Tiles are counted with x growing to the right and y growing upwards from the bottom row, so "up" is towards a higher y. Chambers the validator rejects (see [what the validator rejects](#what-the-validator-rejects)) are outside these rules.

### Blocking

Blocked walls, light barriers, ditches, doors, the exit, fizzlers and lasers each have one flag, `blocked` in the chamber file (true when absent). Blocked means: a blocked wall refuses portals, a ditch is open, a door or the exit is closed, a light barrier, a fizzler or a laser is on. Buttons and switches change it through [links](#links); nothing else does.

### A step

The player gives one action per step: move or turn (up, down, left or right), shoot blue, shoot orange, or interact. A step carries out every consequence of its action before it ends; nothing waits for a later step.

1. The action runs (see [Actions](#actions)).
2. A carried box moves onto the subject's tile.
3. Then, repeated until a pass changes nothing:
   1. the [fizzler rule](#the-fizzler-rule);
   2. every [button](#buttons), in the chamber's list order, with its links;
   3. every [box lying where something blocks](#a-box-where-something-blocks), in the chamber's list order.

   It always ends, because a pass moves nothing but boxes, and only ever to their start tiles. A cap of 32 passes still guards against a mistake: a 32nd pass that still changes something is an error.
4. The [exit check](#the-exit).

Once the chamber is completed, a step changes nothing.

A chamber starts from its file's state, settled like the end of a step: with no action before them, the repeat loop runs until a pass changes nothing, then the exit check, and their events are reported. So a button under the subject or a box starts pressed, with its links acted on.

Events are reported in the order they happen. The rules keep no counters: the game counts a move for each step that puts the subject on another tile (a portal crossing included) and a portal for each portal-opened event.

### Actions

#### Move or turn

On an arrow tile, the three directions other than the arrow's do nothing at all. Every other move or turn first faces the subject that way. A turn does only that, unless the subject already faced that way: then it moves like a move. The game takes a turn for a move key pressed while the turn key (Shift by default) is held. To move, it looks at the next tile in that direction:

- **Outside the chamber:** a [wall that takes no portals](#outside-the-chamber).
- **A wall, blocked or not:** if both portals are open and this wall holds one of them on the side facing the subject, the subject [crosses](#crossing-a-portal) that portal. Otherwise nothing more happens.
- **Any other tile:** the subject steps onto it if it can enter it. It can't enter a tile with a blocked light barrier, ditch, door, exit or laser, nor a tile where a box rests, nor an arrow tile unless it moves the arrow's way. Fizzlers, buttons and switches never stop it. Walking into something it can't enter leaves it facing that way, without a sound.

Only the tile the subject moves onto is checked, never the one it leaves (see [something blocking under the subject](#something-blocking-under-the-subject), and a box sent back under it in [one box per tile](#one-box-per-tile)).

#### Crossing a portal

The subject comes out on the tile in front of the other portal, facing away from that portal's wall. That tile is checked like a step onto it, in that facing, so an arrow there must point the way the subject comes out, and no box may rest there. If the subject can enter it, it is put there: `crossed`. If not, the crossing is refused: `refused`, and the subject stays in front of the portal it walked into, facing it. A carried box comes along. Two portals can face the same tile; walking from it into one of them brings the subject back onto it, facing the new way, if the check allows.

#### Shoot blue or orange

While the subject stands in a fizzler that is on, the portal keys do nothing, without a sound. While it carries a box, they are refused: `refused`, with the error sound and no ripple, since no shot leaves (it can't stand in a fizzler that is on while carrying one, so the two never meet). Otherwise the shot leaves the subject's tile the way it faces and goes on tile by tile; the subject's own tile never stops it.

- A fizzler or a light barrier that is on, a closed door or the closed exit stops it: a miss. Ditches, lasers, boxes, buttons, switches, arrows and anything not blocked let it through.
- Reaching the edge of the chamber is a miss.
- A wall takes the portal on its side facing the subject, unless that side faces a door or the exit, open or closed, or a laser or a light barrier running towards the wall (the wall at the end of its run, behind its end plate), on or off, or it already holds a portal, of either colour, on that side or on either neighbouring side; a portal on the far side doesn't stop it. A blocked wall takes it the same way only while it isn't blocked; while it is, the shot is a miss.

A hit opens the portal of that colour there, closing it wherever it was before: `bluePortalOpened` or `orangePortalOpened`. A miss: `refused` (the game plays the shot sound instead of the error sound, and draws a ripple where the shot stopped, see `docs/sprites.md`).

#### Interact

- On a switch: while carrying a box, `refused`. Otherwise the switch is used: `switchUsed`, then it unblocks its links. It can be used any number of times, and each use unblocks its links again (so a linked box is sent back each time).
- Otherwise, while carrying a box: the box is put down on the tile the subject faces, `boxPutDown`, if a move that way could step onto that tile now (as below, for picking a box up from there), no fizzler there is on, no box rests there, since a tile holds [one box](#one-box-per-tile), and it holds neither the exit, where nothing would destroy a box when it closes, nor a switch, which the box would hide. Otherwise `refused`: a box is never put down on the subject's own tile.
- Otherwise, facing a tile where a box rests: the subject picks it up from where it stands, `boxPickedUp`, if a move that way could step onto that tile now but for the box (see [Move or turn](#move-or-turn): an arrow there must point that way, and nothing else there may block walking) and no fizzler there is on. The carried box then sits on the subject's tile, so a button the box held is released in the same step. The subject never picks up a box under it (see [one box per tile](#one-box-per-tile)).
- Otherwise nothing happens.

A box picked up while the subject stands in a fizzler that is on, from the tile it faces, is destroyed in the same step (see [the fizzler rule](#the-fizzler-rule)).

### The fizzler rule

If the subject stands in a fizzler that is on, both portals close and a carried box is destroyed: it goes back to its start tile (see [one box per tile](#one-box-per-tile)) and is no longer carried. `fizzled` is reported at most once per step, and only if the subject wasn't standing in a fizzler that was on when the step began: it walked or crossed into the field, or the field turned on under it. Nothing remembers having been inside a field.

### A box where something blocks

A box lying on a tile where a door is closed, a ditch is open, or a laser, a light barrier or a fizzler is on is destroyed: it goes back to its start tile (see [one box per tile](#one-box-per-tile)), `boxDestroyed`. That happens when the element closes or switches on under it; a box is never put down where one already has (see [Interact](#interact)). A carried box is left to the [fizzler rule](#the-fizzler-rule). The exit is left out, since no box can lie on it: the subject reaching it completes the chamber. A box's start is plain floor or a button, so each box is destroyed at most once in a step. The game shows a box falling into a ditch still open at the end of the step, and breaking up anywhere else as a fizzle breaks up a carried box, both without a sound.

### One box per tile

A tile holds at most one box. The carried box, which sits on the subject's tile, doesn't count, but a resting box keeps the subject off its tile (see [Move or turn](#move-or-turn)), and no box is put down where another rests (see [Interact](#interact)). A box sent back to its start tile, destroyed by a fizzler or where something blocks, or sent back by a link, sends the box resting there, if any, back to its own start the same way, and so on. Each box moves at most once, so the chain ends. Nothing reports it.

A box sent back to its start tile in any of these ways while the subject stands there lands under the subject. The subject can walk off it but not back on, and picks it up only from beside it, facing it. This is the only way the subject and a resting box share a tile.

### Buttons

A button is held down while the subject or any box is on its tile. Each pass judges the buttons in the chamber's list order, and each one acts on its links at once, so a later button sees what an earlier one did. Going down: `buttonPressed`, then it unblocks its links in order. Coming up: `buttonReleased`, then it blocks its links in order.

### Links

A button or switch names its links by element id. Only blocked walls (one tile each), light barriers, ditches, boxes, fizzlers, doors, lasers and the exit can be linked. A link can also name a link group (format 2), which stands for its elements: they act at the group's place in the list, in the group's order.

| # | Element | Unblocked (button pressed, switch used) | Blocked (button released) |
|---|---------|-----------------------------------------|---------------------------|
| 1 | Blocked wall | Takes portals | Refuses portals, and a portal on any of its sides closes |
| 2 | Light barrier | Off | On |
| 3 | Ditch | Bridged | Open |
| 4 | Door | Opened: `doorOpened` | Closed: `doorClosed` |
| 5 | Exit | Opened: `exitOpened` | Closed: `exitClosed` |
| 6 | Fizzler | Off | On (see [the fizzler rule](#the-fizzler-rule)), and a portal on a wall side facing it closes: `portalFizzled` |
| 7 | Laser | Off | On |
| 8 | Box | Back to its start tile (see [one box per tile](#one-box-per-tile)), unless it is carried | Nothing; the validator warns about a box linked to a button |

A door or the exit reports its event only when it actually opens or closes, and a fizzler reports `portalFizzled` only when it closes a portal; the others are silent.

A blocked wall is a wall in every state: it stops walking and shots, and joins the walls around it. Blocking it closes a portal already on it, silently. A fizzler switching on closes a portal on a wall side facing its tile, one opened while it was off (a fizzler that is on stops shots and keeps the subject from shooting): `portalFizzled`, which the game shows by breaking the portal up, with no sound. A light barrier stands only on a floor tile, which never holds a portal, so switching it on closes none.

### The exit

A step that ends with the subject on the exit completes the chamber. The subject can only get there while the exit is open, since walking and crossing a portal both refuse a closed exit, so the chamber is completed even when the same step closes the exit under it.

### Something blocking under the subject

A door or the exit closing, a ditch opening, or a light barrier or a laser turning on under the subject does nothing to it: it can still turn, shoot, interact and walk off. A box it carries is kept, and no box lies there with it, since a box shares the subject's tile only on the box's start (see [one box per tile](#one-box-per-tile)), which is plain floor or a button. A fizzler turning on under the subject runs the fizzler rule in that same step. Chambers avoid this state (`docs/level_design.md`).

### Outside the chamber

Outside the chamber's edge counts as a wall that takes no portals, and the validator requires enclosed chambers.

### What the validator rejects

A chamber file is read field by field, then checked as a whole (`src/game/rules/`, run on every chamber by `npm run chamber:check`). Each problem names its field and its tile, where it has them. Errors keep a chamber from loading:

- **Fields:** a missing field, an unknown or misspelled one (an `id` on a blocked wall rectangle among them), a value of the wrong kind or out of range (see the [chamber format](#chamber-format)), a wall or blocked wall rectangle whose from corner is past its to corner, an antline path with fewer than two corners, or a `version` other than 2.
- **Ids and links:** an id used twice (elements and groups share the ids), a link naming an id nothing has, and a group naming another group.
- **Antlines:** an antline leading to an id nothing has, or to a group, since an antline leads to one element; a corner outside the chamber, the same as the corner before it, or sharing neither a row nor a column with it (only the first such corner is reported); a first corner on no button or switch that links the element, by its id or through a group; and a last corner away from the element's tile.
- **Bounds:** anything outside the chamber, and the same wall tile listed twice, by walls or blocked walls.
- **What shares a tile:** a wall or blocked wall holds nothing else, so the subject, the exit and a light barrier are never inside a wall. A floor tile holds at most one of a light barrier, ditch, door, exit, fizzler, arrow, button, switch or laser, except two lasers that cross (one `H`, one `V`). A box and the subject start on plain floor or a button, with at most one box per tile, and the subject never on a box, since a box keeps it off its tile.
- **The edge:** every tile on the chamber's edge holds a wall, a blocked wall, a door or the exit, so the chamber is enclosed.

One warning doesn't keep a chamber from loading: a button linked to a box, since releasing the button does nothing to the box.

### Changes from the original rules

Every way these rules differ from the original game's, which this game played until stage 01 replaced them, each with its short id and the behaviour fixtures that pin it (`scripts/fixtures/fixtures.ts`). These rules take one action per step, finish it before the next and change nothing once the chamber is completed.

1. **`portal_exit_checked`** — Coming out of a portal onto a tile the subject couldn't walk onto is refused, with the error sound. The original rules ignored every walking check there, so the subject could stand on an open ditch, in a laser that is on, on a closed door or a wrong-way arrow. Fixtures: `portal_onto_open_ditch_refused`, `portal_onto_active_laser_refused`.
2. **`closed_exit_by_portal`** — A portal never brings the subject onto the closed exit, since no portal opens on a wall side facing the exit (`no_portal_beside_door`). The original rules completed the chamber. This is the closed-exit case of `portal_exit_checked`, kept as an id of its own because of the completion. Fixture: `no_portal_beside_door_or_exit`.
3. **`box_link_release`** — Releasing a button linked to a box does nothing to the box. The original rules stopped the game with an error. Fixture: `box_linked_button_release_does_nothing`.
4. **`fizzler_without_flag`** — The fizzler rule runs every step. The original rules counted the subject as inside a field until it stood on a tile with no fizzler at all, even after stepping onto one that is off, and nothing fizzled while it was inside: walking on from such a tile into another field, or that fizzler turning on, kept the portals, and a box picked up inside a field was kept. Fixture: `fizzler_rule_every_step`.
5. **`no_late_effects`** — Everything a step causes happens within it, in the step's order. In the original rules some effects landed a frame late, so a key pressed in that frame acted first: a button behind a carried box released a frame later; a fizzler fired a frame later when the subject came out of a portal into it or it turned on under the subject; the exit completed at the start of the next frame; each frame judged the buttons once, so a chain of links took several frames. The late effects also reordered events, which could change the settled result. The button a carried box left was released after every other button event of that frame, so when it shared a link with the button the subject stepped onto, the link always ended blocked; these rules follow the list order and can end with it unblocked. And a portal crossing into a fizzler that was on reported `crossed`, then the button events, then `fizzled`; these rules reported `fizzled` before the button events, until `fizzler_closes_facing_portal` made such a crossing impossible. Fixtures: `carried_box_off_button_closes_door_at_once`, `portal_onto_fizzler_fizzles_at_once`, `carried_box_buttons_in_list_order`.
6. **`one_action_per_step`** — One action per step, in the order pressed. In the original rules a frame could carry several keys: only one arrow counted (up, then down, left, right), blue beat orange, and they ran move, then shoot, then interact; a box put down in the same frame as a move stayed on the tile the subject left. No fixture: a step takes exactly one action.
7. **`carried_box_link`** — A link to a carried box does nothing. In the original rules the box went to its start tile for the rest of that frame, where it could hold a button down for one frame, then returned to the subject. No current chamber links a button to a box. Fixture: `carried_box_link_does_nothing`.
8. **`edge_is_wall`** — Outside the chamber's edge is wall that takes no portals. The original rules never checked the edge when walking, so only the chamber's own walls kept the subject in, and a shot checked it only before each tile, so a wall just past the edge could take a portal (the validator rejects walls outside the chamber). Fixture: `edge_is_wall`.
9. **`completed_is_final`** — Once the chamber is completed, a step changes nothing. The original rules kept applying keys after completion, which only showed in frame recordings, since the game pauses at the completion dialog. No fixture: the replay check plays every action on each recorded solution's completed state, and none may change it or report anything.
10. **`every_laser_blocks`** — Two lasers crossing on a tile keep the subject out while either of them is on. In the original rules only the first one listed there counted, so with that one off the subject walked into the other while it was still on. No current chamber shows it: chamber 1's crossing pair is linked by nothing and always on. Fixture: `crossing_lasers_either_blocks`.
11. **`no_shot_while_carrying`** — The portal keys don't shoot while the subject carries a box: `refused`, with the error sound. The original rules let it shoot with a box in hand. Putting the box down, shooting and picking it up again costs no extra move, except on a switch, or where no tile the subject can face can take the box; since the box goes down only on the tile faced, a shot at a wall takes turning away to put it down first and back to shoot, more presses but no extra move. Fixture: `no_shot_while_carrying`.
12. **`one_box_per_tile`** — A tile holds at most one box, the carried one aside: putting a box down on the tile faced where another rests is refused, with the error sound, and a box sent back to its start tile sends the box resting there back to its own start. The original rules let any number of boxes share a tile, through either. No recorded solution ever had two boxes on one tile. Fixtures: `no_box_put_down_on_a_box`, `box_sent_home_sends_box_home`.
13. **`no_portal_beside_door`** — A wall side facing a door or the exit never takes a portal, open or closed: a shot there misses. The original rules let one open there whenever a shot reached it, past the open door or exit or from inside it, and kept it when the door or exit closed, so a portal could bring the subject into a doorway or onto the exit. No recorded solution used one. Fixture: `no_portal_beside_door_or_exit`.
14. **`fizzler_closes_facing_portal`** — A fizzler switching on closes a portal on a wall side facing its tile: `portalFizzled`. The original rules kept it, so the subject could come out of it into the field that is on; now that happens only when the crossing itself switches the field on, such as by leaving the button that held it off. No recorded solution had a portal facing a fizzler. Fixture: `fizzler_on_closes_portal_facing_it`.
15. **`no_portal_behind_end_plate`** — The wall at the end of a run of lasers or light barriers, behind its end plate, never takes a portal, on or off: a shot there misses. A wall alongside the run still takes one. The original rules let one open there whenever a shot reached it (at any time for a laser, which lets shots through, and while it was off for a light barrier), drawn over the plate. No recorded solution used one; chambers 1 and 3 lost 18 and 8 such wall sides. Fixture: `no_portal_behind_end_plate`.
16. **`box_in_reach`** — Interact also picks up a box on the tile the subject faces, when it has nothing in its hands and no switch underfoot, if a move that way could step onto that tile but for the box and no fizzler there is on; otherwise nothing happens, silently. The original rules picked up only a box on the subject's own tile. No recorded solution pressed interact facing a box with none underfoot, so none changed; two solver fixtures' fewest moves dropped, carrying a box through a portal from 9 to 7 and holding a box on a button from 13 to 11. Fixtures: `box_picked_up_from_faced_tile`, `box_out_of_reach`, `box_reached_from_fizzler_destroyed`.
17. **`box_destroyed_where_blocked`** — A box lying where a door closes, a ditch opens, or a laser, a light barrier or a fizzler switches on goes back to its start tile, `boxDestroyed`; no box is put down where one of them already blocks. The original rules left it there, inside the closed door, over the open pit or in the beam, out of reach until the element opened again. No recorded solution ever left a box on such a tile. Fixtures: `box_breaks_up_in_closing_door`, `box_falls_into_opening_ditch`, `box_breaks_up_in_laser_turning_on`, `box_breaks_up_in_light_barrier_turning_on`, `box_breaks_up_in_fizzler_turning_on`, `box_not_put_down_facing_open_ditch`.
18. **`box_put_down_in_front`** — Interact puts a carried box down on the tile the subject faces, when that tile can take it (a move that way could step onto it, no fizzler there is on, no box rests there, and it holds neither the exit nor a switch), and otherwise refuses it, with the error sound, never putting it on the subject's own tile (`box_blocks_its_tile`). The original rules put it down only on the subject's own tile. Every recorded solution had to be recorded again, since each put a box down facing a tile that could take it; four solver fixtures' fewest moves dropped: a box through a portal from 7 to 5, a box on a button from 11 to 9, a box round a fizzler from 10 to 8 (and from 13 to 11 with no portal), and putting a box down to free the hands from 18 to 14. Fixtures: `box_put_down_in_front`, `box_not_put_down_facing_exit`, `box_not_put_down_facing_switch`, `box_not_put_down_facing_a_box`, `box_not_put_down_facing_fizzler`, `box_kept_on_switch`.
19. **`box_blocks_its_tile`** — A resting box keeps the subject off its tile: walking into it only turns the subject that way, without a sound, and a crossing that would come out on it is refused, with the error sound; the carried box doesn't count, and shots still pass boxes. Boxes are picked up and put down only on the tile the subject faces, never on its own, so the subject shares a tile with a resting box only when that box is sent back to its start under it. The original rules let the subject walk onto boxes, and picked up and put down a box only on its own tile. Every recorded solution had to be recorded again, since each picked up or put down a box underfoot; the solver fixture with a box round a fizzler had its box moved off the subject's start tile, its pars unchanged (8 moves with 2 portals, 11 with none). Fixtures: `box_blocks_walking`, `portal_onto_box_refused`, `box_sent_home_under_subject`, `box_not_put_down_facing_wall`.

## Adding an element

Element types are described by data in `src/game/rules/`, but a new one still touches several files, because the chamber file reader, the validator, the walls' portal taking and the switching animation list elements by hand:

1. **Definition:** a file in `src/game/rules/elements/` that calls `defineElement` with its entry type. It gives the fixed properties (its name, its field in a chamber file, one entry or a list, the tiles it sits on, its draw layer, whether links reach it, its blocked flag's default or none, when it blocks walking, shots and shooting from its tile, when it takes portals, whether it reacts to the subject entering or leaving, its events) and hooks for the rest (`interact`, `subjectInside`, `everyPass`, `linkUnblocked`, `linkBlocked`). Nothing reads when it takes portals (`takesPortals`): which tiles are walls and can take portals, and which of their sides (none facing a door or the exit, or a laser or a light barrier running towards the wall), is written out in `src/game/rules/compiled_chamber.ts`, and whether a wall takes a portal now in `takesPortalsNow` (`step.ts`), so an element that sits on a wall, takes portals or keeps them off the walls beside it also touches both. An element that destroys a box lying on it while blocked goes in `BOX_DESTROYING_KINDS` (`elements/box.ts`); the game draws such a box breaking up, but on a ditch, where it falls (`src/game/destroyed_boxes.ts`).
2. **Registry:** its line in `ELEMENT_REGISTRY` (`element_registry.ts`), whose order is the drawing order within a layer. The element fields of `ChamberData`, the compiled chamber's lookups and the state's blocked flags follow from it.
3. **Entry type:** a new one in `src/game/chamber_data.ts`, when none of the existing ones fits.
4. **Reader:** its field in `CHAMBER_FIELDS` and its list read in `chamber_parser.ts`.
5. **Validator:** its kind in `validate_chamber.ts`, placed on its tiles, and in the lists of what may share a tile, what may stand on the edge and what links can reach; a kind whose name is more than one word also needs its wording in the inside-a-wall message (`describeKind`), or it reads "a lightBarrier".
6. **Events:** each new one in `src/game/game_event.ts`, with its sound in `Level` (`src/game/level.ts`), or none.
7. **Drawing:** its entry in `ELEMENT_DRAWINGS` (`src/game/element_drawings.ts`), drawing its sprite for each state; each new sprite in the set (`src/game/sprite_set.ts` and `docs/sprites.md`), drawn in code as an SVG in `art/sprites/` and exported to its file in `src/assets/images/chamber/` (as `AGENTS.md` says) before it joins the set, since `npm run assets:check` requires every sprite's file, and in `RAISED_SPRITES` when it stands raised, so it gets the shared drop shadow; in `GAP_SIDE_KINDS` when it lines a gap that a door, the exit or a fizzler turns to fill (see `docs/sprites.md`, turning); and, when links switch it, its kind in `TRANSITION_KINDS` and `TRANSITION_STYLES` (`src/game/element_transitions.ts`), with its drawing part way through the change, or it switches at once. The floor marks and structure layers are drawn once per chamber as its backdrop, over the antlines (`src/game/renderer.ts`), so an element on them must look the same in every state. An antline to a linkable element lights while the element is unblocked; one with no blocked flag, as the box, needs its own answer in the antline drawing (`src/game/antline_drawing.ts`), which the build asks for.
8. **Docs and fixtures:** its row in the table at the top, its field under [chamber format](#chamber-format), its rule under [rules](#rules) and [what the validator rejects](#what-the-validator-rejects); behaviour fixtures in `scripts/fixtures/fixtures.ts`, and a case in `scripts/fixtures/format_examples.ts` for each new validator problem.
9. **Playground:** a place in the development-only playground (`src/dev/playground.json`, see `AGENTS.md`), switched by a button when it can be, so it can be tried by hand.
10. **Chamber sign:** its pictogram in `src/components/element_pictogram.vue` and its line in the sign's list (`src/components/chamber_sign.vue`), where it is shown dark in the chambers that hold it; the row holds exactly ten (its column count is fixed in the sign's styles), so an eleventh needs that count raised, which makes every pictogram smaller, or it wraps alone onto a second row.

The recorded solutions change only when an existing chamber or its route changes. The build catches a missing drawing or sound. `npm run chamber:check` catches a field missing from the reader's field list or used by two elements, an event with no owner or two, and an element that blocks only while blocked but has no blocked flag. Nothing catches a validator line, the list read in `chamber_parser.ts`, or the chamber sign's line, left out.
