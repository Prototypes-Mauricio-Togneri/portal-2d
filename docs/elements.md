# Chamber Elements

Reference for the elements a chamber file (`src/chambers/*.json`) can contain, carried over from the original game's help page, followed by the v2 rules.

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

## Rules (v2)

The rules the v2 engine implements (stage 01, phase E). The game still plays today's rules (`src/game/classic/`) until stage 01 switches over; both behave the same except for the [changes from the original rules](#changes-from-the-original-rules) listed at the end.

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

   It always ends, because a pass moves nothing but boxes, and only ever to their start tiles. A cap still guards against a mistake: reaching it is an error, like today's settle cap.
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

- **Fields:** a missing field, an unknown or misspelled one, a value of the wrong kind (coordinates and ids are whole numbers, ids 1 or more, a size at least 1, directions `UP`, `DOWN`, `LEFT` or `RIGHT`, a laser `H` or `V`), a wall rectangle whose from corner is past its to corner, or a format newer than the game plays.
- **Ids and links:** an id used twice (elements and groups share the ids), a link naming an id nothing has, and a group naming another group.
- **Bounds:** anything outside the chamber, and the same wall tile listed twice.
- **What shares a tile:** a wall holds nothing but at most one barrier, so the subject and the exit are never inside a wall. A floor tile holds at most one of a barrier, ditch, door, exit, fizzler, arrow, button, switch or laser, except two lasers that cross (one `H`, one `V`). A box and the subject start on plain floor or a button, with at most one box per tile; the subject and a box may share it.
- **The edge:** every tile on the chamber's edge holds a wall, a barrier, a door or the exit, so the chamber is enclosed.

One warning doesn't keep a chamber from loading: a button linked to a box, since releasing the button does nothing to the box.

### Changes from the original rules

Where v2 differs from today's rules, each with the short id the engine comparison (`npm run compare:engines`) recognises it by and the behaviour fixtures in `scripts/fixtures/` that pin today's behaviour. Stage 01's phase F completes this list.

1. **`portal_exit_checked`** — Coming out of a portal onto a tile the subject couldn't walk onto is refused, with the error sound. Today it ignores every walking check, so the subject can stand on an open ditch, in a laser that is on, on a raised barrier, a closed door or a wrong-way arrow. Fixtures: `portal_onto_open_ditch`, `portal_onto_active_laser`.
2. **`closed_exit_by_portal`** — Coming out of a portal onto the closed exit is refused like any tile the subject can't enter. Today it completes the chamber. This is the closed-exit case of `portal_exit_checked`, kept as an id of its own because of the completion; the comparison tool reports it under this id. Fixture: `portal_onto_closed_exit_completes`.
3. **`box_link_release`** — Releasing a button linked to a box does nothing to the box. Today it stops the game with an error. Fixture: `box_linked_button_release_throws`.
4. **`fizzler_without_flag`** — The fizzler rule runs every step. Today the subject counts as inside a field until it stands on a tile with no fizzler at all, even after stepping onto one that is off, and nothing fizzles while it is inside: walking on from such a tile into another field, or that fizzler turning on, keeps the portals, and a box picked up inside a field is kept. Fixture: `fizzler_flag_kept_across_switched_off_fizzler`.
5. **`no_late_effects`** — Everything a step causes happens within it, in the step's order. Today some effects land a frame late, so a key pressed in that frame acts first: a button behind a carried box releases a frame later; a fizzler fires a frame later when the subject comes out of a portal into it or it turns on under the subject; the exit completes at the start of the next frame; each frame judges the buttons once, so a chain of links takes several frames. The late effects also reorder events, which can change the settled result. Today the button a carried box leaves is released after every other button event of that frame, so when it shares a link with the button the subject steps onto, the link always ends blocked; v2 follows the list order and can end with it unblocked. And a portal crossing into a fizzler reports `crossed`, then the button events, then `fizzled`, where v2 reports `fizzled` before the button events. Fixtures: `button_releases_behind_carried_box`, `portal_onto_fizzler_left_next_frame`, `portal_onto_fizzler_fires_a_frame_late`, `carried_box_button_released_last`.
6. **`one_action_per_step`** — One action per step, in the order pressed. Today a frame can carry several keys: only one arrow counts (up, then down, left, right), blue beats orange, and they run move, then shoot, then interact; a box put down in the same frame as a move stays on the tile the subject left. Live play has sent one key at a time since phase D, so only frame recordings notice. No fixture.
7. **`carried_box_link`** — A link to a carried box does nothing. Today the box goes to its start tile for the rest of that frame, where it can hold a button down for one frame, then returns to the subject. No fixture; no current chamber links a button to a box.
8. **`edge_is_wall`** — Outside the chamber's edge is wall that takes no portals. Today walking never checks the edge, so only the chamber's own walls keep the subject in, and a shot checks it only before each tile, so a wall just past the edge can take a portal (the validator rejects walls outside the chamber). Fixture: `walk_out_through_the_edge`.
9. **`completed_is_final`** — Once the chamber is completed, a step changes nothing. Today the rules keep applying keys after completion; live play pauses at the completion dialog, so only frame recordings notice. No fixture.
