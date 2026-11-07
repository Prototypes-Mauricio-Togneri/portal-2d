# Chamber Elements

Reference for the elements a chamber file (`src/chambers/*.json`) can contain, carried over from the original game's help page, followed by the chamber file format and the rules.

| # | Element | Description | Can be activated/deactivated? | Can portals go through it? | Can the subject go through it? | Quantity |
|---|---------|-------------|-------------------------------|----------------------------|--------------------------------|----------|
| 1 | Subject | The initial position of the subject | No | No | No | 1 |
| 2 | Wall | A solid wall, the only element that can hold a portal | No | No | No | 0..∞ |
| 3 | Barrier | A barrier | Yes | No | No | 0..∞ |
| 4 | Ditch | A hole in the floor | Yes | Yes | No | 0..∞ |
| 5 | Box | Can be picked up and used to activate buttons | Yes | Yes | Yes | 0..∞ |
| 6 | Button | Activates/deactivates other elements while the subject or a box is on it | No | Yes | Yes | 0..∞ |
| 7 | Switch | Can only be switched on. Activates/deactivates other elements | No | Yes | Yes | 0..∞ |
| 8 | Door | Must be unlocked in order to pass | Yes | No | No | 0..∞ |
| 9 | Fizzler | Resets portals and boxes (if the subject is carrying one) | Yes | No | Yes | 0..∞ |
| 10 | Exit | Reach it to complete the test chamber | Yes | No | No | 1 |
| 11 | Laser | Obstructs the passage of the subject | Yes | Yes | No | 0..∞ |
| 12 | Arrow | Limits the movement of the subject | No | Yes | Yes | 0..∞ |

## Notes

- Activate/deactivate means the element changes its state when a button is pushed or a switch is turned on, if they are linked to the element.
- Barriers, ditches, doors, fizzlers, exits and lasers can be locked or unlocked by enabling their linked activator. Boxes, instead, are reset to their original position.
- Buttons and switches can be linked to many objects. For example, pushing a button can unlock a door and enable a barrier at the same time.

## Chamber format

A chamber file is a JSON object in format 2 (`ChamberData` in `src/game/chamber_data.ts`). Positions are tiles: `x` grows to the right and `y` upwards from the bottom row, both from 0. Every coordinate, size, id and count is a whole number. `version`, `size`, `subject` and `exit` are required; every list, `groups` and `par` may be left out, and a list left out means the chamber has none of that element. A field the format doesn't name is an error.

| # | Field | Holds |
|---|-------|-------|
| 1 | `version` | The format's version: `2`. |
| 2 | `size` | `width` and `height`, in tiles, each 1 or more. |
| 3 | `subject` | Where the subject starts: `x`, `y` and `direction` (`UP`, `DOWN`, `LEFT` or `RIGHT`), all required. |
| 4 | `exit` | The exit, a single entry: `x`, `y`, and optionally `id` and `blocked`. |
| 5 | `walls` | One tile (`x`, `y`) or a rectangle of tiles (`xFrom`, `xTo`, `yFrom`, `yTo`, both ends included, each from no greater than its to), each with an optional `takesPortals`: true when absent, false for a wall that refuses portals. |
| 6 | `barriers`, `ditches`, `doors`, `fizzlers` | `x`, `y`, and optionally `id` and `blocked`. |
| 7 | `lasers` | `x`, `y`, `direction` (`H` or `V`: how it is drawn, and two lasers can share a tile only when they cross), and optionally `id` and `blocked`. |
| 8 | `boxes` | `x`, `y`, and optionally `id`. |
| 9 | `buttons`, `switches` | `x`, `y` and `links`, all required: the ids of the elements and link groups it acts on (see [links](#links)). |
| 10 | `arrows` | `x`, `y` and `direction` (`UP`, `DOWN`, `LEFT` or `RIGHT`), all required: the one way the subject can enter the tile. |
| 11 | `groups` | Link groups, each with an `id` and `links`, both required: the ids of the elements it stands for, never another group. |
| 12 | `par` | How well the chamber can be solved, for medals: optionally `moves` and `portals`, each 0 or more. Left empty until the solver (stage 02) fills it. |

- **`id`:** 1 or more, unique among every element and group, and needed only by what a button, switch or group links to; an element without one can't be linked.
- **`blocked`:** true when absent (see [blocking](#blocking)).
- **Older files:** a file without a `version` is format 1, upgraded when read (`src/game/rules/upgrade_chamber.ts`): it gets `version: 2`, and an `id` of 0, which format 1 read as no id, is removed. A file with a newer version than the game plays is refused.

## Rules

The rules the game plays, in `src/game/rules/` (`step.ts`), pinned by each chamber's recorded solution and by the behaviour fixtures (`npm run replay:check`). They follow the original game's rules apart from the [changes from the original rules](#changes-from-the-original-rules) listed at the end.

Tiles are counted with x growing to the right and y growing upwards from the bottom row, so "up" is towards a higher y. Chambers the validator rejects (see [what the validator rejects](#what-the-validator-rejects)) are outside these rules.

### Blocking

Barriers, ditches, doors, the exit, fizzlers and lasers each have one flag, `blocked` in the chamber file (true when absent). Blocked means: a barrier is raised, a ditch is open, a door or the exit is closed, a fizzler or a laser is on. Buttons and switches change it through [links](#links); nothing else does.

### A step

The player gives one action per step: move or turn (up, down, left or right), shoot blue, shoot orange, or interact. Undo and redo are not actions: they bring back an earlier state, outside the rules. A step carries out every consequence of its action before it ends; nothing waits for a later step.

1. The action runs (see [Actions](#actions)).
2. A carried box moves onto the subject's tile.
3. Then, repeated until a pass changes nothing:
   1. the [fizzler rule](#the-fizzler-rule);
   2. every [button](#buttons), in the chamber's list order, with its links.

   It always ends, because a pass moves nothing but boxes, and only ever to their start tiles. A cap of 32 passes still guards against a mistake: reaching it is an error.
4. The [exit check](#the-exit).

Once the chamber is completed, a step changes nothing.

A chamber starts from its file's state, settled like the end of a step: with no action before them, the repeat loop runs until a pass changes nothing, then the exit check, and their events are reported. So a button under the subject or a box starts pressed, with its links acted on, a subject placed in a fizzler that is on fizzles, and a subject placed on the exit completes the chamber.

Events are reported in the order they happen. The rules keep no counters: the game counts a move for each step that puts the subject on another tile (a portal crossing included) and a portal for each portal-opened event.

### Actions

#### Move or turn

On an arrow tile, the three directions other than the arrow's do nothing at all. Every other move or turn first faces the subject that way. With the turn key held that is all, unless it already faced that way: then it moves as if the key weren't held. To move, it looks at the next tile in that direction:

- **Outside the chamber:** a [wall that takes no portals](#outside-the-chamber).
- **A wall:** if both portals are open and this wall holds one of them on the side facing the subject, the subject [crosses](#crossing-a-portal) that portal. Otherwise nothing more happens.
- **Any other tile:** the subject steps onto it if it can enter it. It can't enter a tile with a blocked barrier, ditch, door, exit or laser, nor an arrow tile unless it moves the arrow's way. Fizzlers, boxes (even while carrying one), buttons and switches never stop it. Walking into something it can't enter leaves it facing that way, without a sound.

Only the tile the subject moves onto is checked, never the one it leaves (see [something blocking under the subject](#something-blocking-under-the-subject)).

#### Crossing a portal

The subject comes out on the tile in front of the other portal, facing away from that portal's wall. That tile is checked like a step onto it, in that facing, so an arrow there must point the way the subject comes out. If the subject can enter it, it is put there: `crossed`. If not, the crossing is refused: `refused`, and the subject stays in front of the portal it walked into, facing it. A carried box comes along. Two portals can face the same tile; walking from it into one of them brings the subject back onto it, facing the new way, if the check allows.

#### Shoot blue or orange

While the subject stands in a fizzler that is on, the portal keys do nothing, without a sound. Otherwise the shot leaves the subject's tile the way it faces and goes on tile by tile; the subject's own tile never stops it.

- A fizzler that is on, a raised barrier, a closed door or the closed exit stops it: a miss. Ditches, lasers, boxes, buttons, switches, arrows and anything not blocked let it through.
- Reaching the edge of the chamber is a miss.
- A wall takes the portal on its side facing the subject, unless it already holds a portal, of either colour, on that side or on either neighbouring side; a portal on the far side doesn't stop it. A raised barrier on the wall's tile stops the shot first.

A hit opens the portal of that colour there, closing it wherever it was before: `bluePortalOpened` or `orangePortalOpened`. A miss: `refused`.

#### Interact

- On a switch: while carrying a box, `refused`. Otherwise the switch is used: `switchUsed`, then it unblocks its links. It can be used any number of times, and each use unblocks its links again (so a linked box is sent back each time).
- Otherwise, while carrying a box: the box is put down on the subject's tile, without a sound. A tile can hold several boxes.
- Otherwise, on a tile with a box: the subject picks it up (the first one in the chamber's box list): `boxPickedUp`.
- Otherwise nothing happens.

### The fizzler rule

If the subject stands in a fizzler that is on, both portals close and a carried box is destroyed: it goes back to its start tile and is no longer carried. `fizzled` is reported at most once per step, and only if the subject wasn't standing in a fizzler that was on when the step began: it walked or crossed into the field, or the field turned on under it. Nothing remembers having been inside a field.

### Buttons

A button is held down while the subject or any box is on its tile. Each pass judges the buttons in the chamber's list order, and each one acts on its links at once, so a later button sees what an earlier one did. Going down: `buttonPressed`, then it unblocks its links in order. Coming up: `buttonReleased`, then it blocks its links in order.

### Links

A button or switch names its links by element id. Only barriers, ditches, boxes, fizzlers, doors, lasers and the exit can be linked. A link can also name a link group (format 2), which stands for its elements: they act at the group's place in the list, in the group's order.

| # | Element | Unblocked (button pressed, switch used) | Blocked (button released) |
|---|---------|-----------------------------------------|---------------------------|
| 1 | Barrier | Lowered | Raised, and a portal on its tile closes |
| 2 | Ditch | Bridged | Open |
| 3 | Door | Opened: `doorOpened` | Closed: `doorClosed` |
| 4 | Exit | Opened: `exitOpened` | Closed: `exitClosed` |
| 5 | Fizzler | Off | On (see [the fizzler rule](#the-fizzler-rule)) |
| 6 | Laser | Off | On |
| 7 | Box | Back to its start tile, unless it is carried | Nothing; the validator warns about a box linked to a button |

A door or the exit reports its event only when it actually opens or closes; the others are silent.

A barrier can sit on a wall tile. While raised it stops shots before they reach the wall, so the wall takes no portal, and raising it closes a portal already there.

### The exit

A step that ends with the subject on the exit completes the chamber. The subject can only get there while the exit is open, since walking and crossing a portal both refuse a closed exit, so the chamber is completed even when the same step closes the exit under it.

### Something blocking under the subject

A door or the exit closing, a barrier rising, a ditch opening or a laser turning on under the subject does nothing to it: it can still turn, shoot, interact and walk off. A box on such a tile stays there. A fizzler turning on under the subject runs the fizzler rule in that same step.

### Outside the chamber

Outside the chamber's edge counts as a wall that takes no portals, and the validator requires enclosed chambers.

### What the validator rejects

A chamber file is upgraded to the current format, then read field by field, then checked as a whole (`src/game/rules/`, run on every chamber by `npm run chamber:check`). Each problem names its field and, where it has one, its tile. Errors keep a chamber from loading:

- **Fields:** a missing field, an unknown or misspelled one, a value of the wrong kind or out of range (see the [chamber format](#chamber-format)), a wall rectangle whose from corner is past its to corner, or a format newer than the game plays.
- **Ids and links:** an id used twice (elements and groups share the ids), a link naming an id nothing has, and a group naming another group.
- **Bounds:** anything outside the chamber, and the same wall tile listed twice.
- **What shares a tile:** a wall holds nothing but at most one barrier, so the subject and the exit are never inside a wall. A floor tile holds at most one of a barrier, ditch, door, exit, fizzler, arrow, button, switch or laser, except two lasers that cross (one `H`, one `V`). A box and the subject start on plain floor or a button, with at most one box per tile; the subject and a box may share it.
- **The edge:** every tile on the chamber's edge holds a wall, a barrier, a door or the exit, so the chamber is enclosed.

One warning doesn't keep a chamber from loading: a button linked to a box, since releasing the button does nothing to the box.

### Changes from the original rules

Every way these rules differ from the original game's, which this game played until stage 01 replaced them, each with its short id and the behaviour fixtures that pin it (`scripts/fixtures/fixtures.ts`). These rules take one action per step, finish it before the next and change nothing once the chamber is completed.

1. **`portal_exit_checked`** — Coming out of a portal onto a tile the subject couldn't walk onto is refused, with the error sound. The original rules ignored every walking check there, so the subject could stand on an open ditch, in a laser that is on, on a raised barrier, a closed door or a wrong-way arrow. Fixtures: `portal_onto_open_ditch_refused`, `portal_onto_active_laser_refused`.
2. **`closed_exit_by_portal`** — Coming out of a portal onto the closed exit is refused like any tile the subject can't enter. The original rules completed the chamber. This is the closed-exit case of `portal_exit_checked`, kept as an id of its own because of the completion. Fixture: `portal_onto_closed_exit_refused`.
3. **`box_link_release`** — Releasing a button linked to a box does nothing to the box. The original rules stopped the game with an error. Fixture: `box_linked_button_release_does_nothing`.
4. **`fizzler_without_flag`** — The fizzler rule runs every step. The original rules counted the subject as inside a field until it stood on a tile with no fizzler at all, even after stepping onto one that is off, and nothing fizzled while it was inside: walking on from such a tile into another field, or that fizzler turning on, kept the portals, and a box picked up inside a field was kept. Fixture: `fizzler_rule_every_step`.
5. **`no_late_effects`** — Everything a step causes happens within it, in the step's order. In the original rules some effects landed a frame late, so a key pressed in that frame acted first: a button behind a carried box released a frame later; a fizzler fired a frame later when the subject came out of a portal into it or it turned on under the subject; the exit completed at the start of the next frame; each frame judged the buttons once, so a chain of links took several frames. The late effects also reordered events, which could change the settled result. The button a carried box left was released after every other button event of that frame, so when it shared a link with the button the subject stepped onto, the link always ended blocked; these rules follow the list order and can end with it unblocked. And a portal crossing into a fizzler reported `crossed`, then the button events, then `fizzled`, where these rules report `fizzled` before the button events. Fixtures: `carried_box_off_button_closes_door_at_once`, `portal_onto_fizzler_fizzles_at_once`, `carried_box_buttons_in_list_order`.
6. **`one_action_per_step`** — One action per step, in the order pressed. In the original rules a frame could carry several keys: only one arrow counted (up, then down, left, right), blue beat orange, and they ran move, then shoot, then interact; a box put down in the same frame as a move stayed on the tile the subject left. No fixture: a step takes exactly one action.
7. **`carried_box_link`** — A link to a carried box does nothing. In the original rules the box went to its start tile for the rest of that frame, where it could hold a button down for one frame, then returned to the subject. No current chamber links a button to a box. Fixture: `carried_box_link_does_nothing`.
8. **`edge_is_wall`** — Outside the chamber's edge is wall that takes no portals. The original rules never checked the edge when walking, so only the chamber's own walls kept the subject in, and a shot checked it only before each tile, so a wall just past the edge could take a portal (the validator rejects walls outside the chamber). Fixture: `edge_is_wall`.
9. **`completed_is_final`** — Once the chamber is completed, a step changes nothing. The original rules kept applying keys after completion, which only showed in frame recordings, since the game pauses at the completion dialog. No fixture: the replay check plays every action on each recorded solution's completed state, and none may change it or report anything.
10. **`every_laser_blocks`** — Two lasers crossing on a tile keep the subject out while either of them is on. In the original rules only the first one listed there counted, so with that one off the subject walked into the other while it was still on. No current chamber shows it: chamber 1's crossing pair is linked by nothing and always on. Fixture: `crossing_lasers_either_blocks`.
