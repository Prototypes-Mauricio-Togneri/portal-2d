# Chamber Elements

Reference for the elements a chamber file (`src/chambers/*.json`) can contain, carried over from the original game's help page with the light barrier and the blocked wall added in place of its barrier, and the slide floor, the arrow a link turns, the emitter, the receiver and the mirror box, which the original game didn't have, followed by the chamber file format, the rules and what adding an element touches.

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
| 13 | Arrow | Limits the movement of the subject; one with a turned way is turned by a link | Yes, when linked | Yes | Yes | 0..∞ |
| 14 | Slide floor | A floor tile that keeps the subject moving the way it entered it | No | Yes | Yes | 0..∞ |
| 15 | Emitter | A wall tile that sends a ray from one face while it is on | Yes | No | No | 0..∞ |
| 16 | Receiver | A wall tile that activates/deactivates other elements while a ray reaches its listening face | No | No | No | 0..∞ |
| 17 | Mirror box | A box with a mirror, which turns a ray a quarter turn while it rests | Yes | Yes | No | 0..∞ |

## Notes

- Activate/deactivate means the element changes its state when a button is pushed, a switch is turned on or a receiver lights, if they are linked to the element.
- Blocked walls, light barriers, ditches, doors, fizzlers, exits and lasers can be locked or unlocked by enabling their linked activator. Emitters are switched on and off. Arrows with a turned way are turned between their own way and their turned way. Boxes, mirror boxes among them, instead, are reset to their original position.
- Buttons, switches and receivers can be linked to many objects. For example, pushing a button can unlock a door and switch off a light barrier at the same time.

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
| 7 | `emitters` | `x`, `y` and `direction` (`UP`, `DOWN`, `LEFT` or `RIGHT`: the face it fires from), all required, and optionally `id` and `blocked`: emitters, wall tiles of their own that send a ray while they are on (see [rays](#rays)). An emitter's `blocked` is false when absent, so it starts on. |
| 8 | `receivers` | `x`, `y`, `direction` (`UP`, `DOWN`, `LEFT` or `RIGHT`: the face it listens on) and `links`, all required, the links as a button's: receivers, wall tiles of their own that act on their links while a ray reaches that face (see [receivers](#receivers)). |
| 9 | `slideFloors` | One tile (`x`, `y`) or a rectangle of tiles (corners as for `walls`): slide floors, which keep the subject moving (see [a slide](#a-slide)). They have no `id` or `blocked`, so links never reach them. |
| 10 | `ditches`, `doors`, `fizzlers` | `x`, `y`, and optionally `id` and `blocked`. |
| 11 | `lasers` | `x`, `y`, `direction` (`H` or `V`: how it is drawn and which walls end its run, which take no portal, and two lasers can share a tile only when they cross), and optionally `id` and `blocked`. |
| 12 | `lightBarriers` | `x`, `y`, `direction` (`H` or `V`: how it is drawn and which walls end its run, which take no portal), and optionally `id` and `blocked`. |
| 13 | `boxes` | `x`, `y`, and optionally `id` and `mirror` (`/` or `\`, written `"\\"` in JSON): a box with a `mirror` is a mirror box, its mirror from corner to corner, bottom left to top right for `/` and top left to bottom right for `\`, with y growing upwards (see [rays](#rays)). |
| 14 | `buttons`, `switches` | `x`, `y` and `links`, all required: the ids of the elements and link groups it acts on (see [links](#links)). |
| 15 | `arrows` | `x`, `y` and `direction` (`UP`, `DOWN`, `LEFT` or `RIGHT`), all required: the one way the subject can enter the tile; and optionally `id` and `turnedDirection` (`UP`, `DOWN`, `LEFT` or `RIGHT`), always together, a quarter turn from `direction`: the way it points while a link holds it turned (see [links](#links)). An arrow takes no `blocked`: every one starts pointing its `direction`, so one meant to start turned swaps its two ways. |
| 16 | `groups` | Link groups, each with an `id` and `links`, both required: the ids of the elements it stands for, never another group. |
| 17 | `antlines` | Dotted lines on the floor, each with `link` and `path`, both required: `link` the id of the one element it leads to, never a group's, and `path` its corner tiles (`x`, `y`), at least two, from the tile of a button, switch or receiver that links that element to the element's own tile. |
| 18 | `par` | How well the chamber can be solved, for medals: optionally `moves` and `portals`, each 0 or more. Reserved: nothing writes it yet (see `docs/solver.md`). |

- **`id`:** 1 or more, unique among every element and group, and needed only by what a button, switch, receiver or group links to; an element without one can't be linked.
- **`blocked`:** true when absent, but on an emitter, where it is false (see [blocking](#blocking)).
- **`antlines`:** only drawn, as in the original game, to show which button, switch or receiver acts on which element: they change nothing in the rules, the solver or the recorded solutions. A chamber may have none, and a link needs none; they are meant mostly for the tutorial and the early chambers. A line is lit while the element it leads to is unblocked (a door or the exit open, a laser, a light barrier or a fizzler off, a ditch bridged, a blocked wall taking portals, an arrow turned, an emitter on), so a line to a box never lights, and two buttons on one door both light when it opens. Each corner shares a row or a column with the one before it, so the line runs straight between them; it may run under walls, hidden there and showing again beyond, and under any element. A line from a receiver starts on the receiver's wall tile, hidden under it up to the floor. The chamber's hash, which a recorded solution keeps, leaves them out, so adding, moving or removing one needs no new recording. How they look: `docs/sprites.md`.
- **Other versions:** a file whose `version` is missing or not 2 is refused.

## Rules

The rules the game plays, in `src/game/rules/` (`step.ts`), pinned by each chamber's recorded solution and by the behaviour fixtures (`npm run replay:check`). They follow the original game's rules apart from the [changes from the original rules](#changes-from-the-original-rules) listed at the end, and add two elements the original game didn't have, in place of its barrier: the light barrier, which plays a barrier's rules on a floor tile (fixture: `light_barrier_switches_off_and_on`), and the blocked wall, which a link can switch between refusing and taking portals, as a barrier on a wall did (fixture: `blocked_wall_switches_off_and_on`). They also add one with no counterpart there, the slide floor, which keeps the subject moving (see [a slide](#a-slide); fixtures: every `slide_*` one, and `portal_onto_slide_floor_slides`), and let a link turn an arrow (see [links](#links); fixtures: every `arrow_*` one, `slide_stops_on_turned_arrow`, `slide_stops_before_turned_back_arrow`, `portal_onto_turned_arrow` and `portal_onto_turned_back_arrow_refused`). Three more pieces have no counterpart there either: the emitter, which sends a ray, the receiver, which acts on its links while a ray reaches it, and the mirror box, a box that turns a ray (see [rays](#rays) and [receivers](#receivers), where their fixtures are named).

Tiles are counted with x growing to the right and y growing upwards from the bottom row, so "up" is towards a higher y. Chambers the validator rejects (see [what the validator rejects](#what-the-validator-rejects)) are outside these rules.

### Blocking

Blocked walls, light barriers, ditches, doors, the exit, fizzlers and lasers each have one flag, `blocked` in the chamber file (true when absent). Blocked means: a blocked wall refuses portals, a ditch is open, a door or the exit is closed, a light barrier, a fizzler or a laser is on. An arrow with a turned way has the flag too, but no `blocked` field, so it always starts blocked: blocked, it points its own way (`direction`), unblocked, its turned way. Emitters have it as well, but false when absent: a blocked emitter is off, so an emitter starts on unless its file says `blocked: true`. Buttons, switches and receivers change it through [links](#links); nothing else does.

### A step

The player gives one action per step: move or turn (up, down, left or right), shoot blue, shoot orange, or interact. A step carries out every consequence of its action before it ends; nothing waits for a later step.

1. The action runs (see [Actions](#actions)); a move onto slide floor goes on as [a slide](#a-slide), within this step.
2. A carried box moves onto the subject's tile.
3. Then, repeated until a pass changes nothing:
   1. the [fizzler rule](#the-fizzler-rule);
   2. every [button](#buttons), in the chamber's list order, with its links;
   3. every [receiver](#receivers), in the chamber's list order, with its links, each judged on the rays as they are after every change made before it;
   4. every [box lying where something blocks](#a-box-where-something-blocks), in the chamber's list order.

   It always ends. The subject doesn't move while a step settles, so a button changes only as a box moves, and boxes move only to their start tiles, at most once each in a step. Apart from boxes, every link a button going down or a receiver lighting acts on lets more light through (a door or the exit opens, a light barrier switches off, an emitter switches on) or changes nothing a ray meets (a ditch, a laser or a fizzler switches off, a blocked wall takes portals, an arrow turns), and every link a button coming up or a receiver going dark acts on lets less through (a door or the exit closes, a light barrier switches on, an emitter switches off, a fizzler or a blocked wall closes a portal) or changes nothing a ray meets. So no receiver can put out its own light, and settling can't flip back and forth. A cap of 32 passes still guards against a mistake: a 32nd pass that still changes something is an error. That settling ends is argued here, not proven. The behaviour fixtures (two receivers holding each other's doors, a relay through an emitter) and the random walk test it. Nothing in the game catches the error, so play would stop; a chamber that reaches the cap means revisiting this argument, not raising the cap.
4. The [exit check](#the-exit).

Once the chamber is completed, a step changes nothing.

A chamber starts from its file's state, settled like the end of a step: with no action before them, the repeat loop runs until a pass changes nothing, then the exit check, and their events are reported. So a button under the subject or a box starts pressed, and a receiver a ray reaches starts lit, each with its links acted on.

Events are reported in the order they happen. The rules keep no counters: the game counts a move for each step that puts the subject on another tile (a portal crossing included, and a slide as one, however many tiles it crosses) and a portal for each portal-opened event.

### Actions

#### Move or turn

On an arrow tile, the three directions other than the arrow's do nothing at all. An arrow's way, here and everywhere in these rules, is the way it points now, which a link can turn (see [links](#links)). Every other move or turn first faces the subject that way. A turn does only that, unless the subject already faced that way: then it moves like a move. The game takes a turn for a move key pressed while the turn key (Shift by default) is held. To move, it looks at the next tile in that direction:

- **Outside the chamber:** a [wall that takes no portals](#outside-the-chamber).
- **A wall tile** (a wall, blocked or not, an emitter or a receiver): if both portals are open and this wall holds one of them on the side facing the subject, the subject [crosses](#crossing-a-portal) that portal. Otherwise nothing more happens.
- **Any other tile:** the subject steps onto it if it can enter it. It can't enter a tile with a blocked light barrier, ditch, door, exit or laser, nor a tile where a box rests, nor an arrow tile unless it moves the arrow's way. Fizzlers, buttons, switches and rays never stop it. Walking into something it can't enter leaves it facing that way, without a sound.

Only the tile the subject moves onto is checked, never the one it leaves (see [something blocking under the subject](#something-blocking-under-the-subject), and a box sent back under it in [one box per tile](#one-box-per-tile)).

A subject that steps onto slide floor slides on (see [a slide](#a-slide)). Standing on slide floor changes nothing else: a turn only turns it, a shot leaves as from anywhere, and a move onto plain floor is one step.

#### Crossing a portal

The subject comes out on the tile in front of the other portal, facing away from that portal's wall. That tile is checked like a step onto it, in that facing, so an arrow there must point the way the subject comes out, and no box may rest there. If the subject can enter it, it is put there: `crossed`, and on slide floor it slides on from there, the way it came out (see [a slide](#a-slide)). If not, the crossing is refused: `refused`, and the subject stays in front of the portal it walked into, facing it. A carried box comes along. Two portals can face the same tile; walking from it into one of them brings the subject back onto it, facing the new way, if the check allows.

#### A slide

A subject that enters slide floor, by a move or out of a portal, keeps moving the way it faces, one tile at a time, within the same step:

- **A floor tile ahead** is checked like a step onto it (see [Move or turn](#move-or-turn)): an open ditch, a laser or a light barrier that is on, a closed door, the closed exit, an arrow pointing another way or a resting box stops the slide on the tile it is on. A tile it can enter, it enters: on slide floor it goes on; on any other tile, an arrow pointing its way and the open exit included, it stops there.
- **A wall ahead** stops it, unless the wall holds a portal on the side facing the subject while the other portal is open: then it crosses (see [crossing a portal](#crossing-a-portal)) and goes on the way it came out if it came out onto slide floor, or stops there if not. A crossing onto a tile the subject can't enter stops the slide in front of the entry portal, silently, where a crossing tried from rest is `refused`.
- **On each tile it passes**, the carried box comes along and the [fizzler rule](#the-fizzler-rule) runs: a fizzler that is on closes both portals and destroys a carried box, and the slide goes on; a wall whose portal closed is a plain wall for the rest of it. Buttons are judged only once the slide has ended, as the step goes on, so passing over a button doesn't press it, and stopping on one does. So are receivers: passing through a ray doesn't cut it, and stopping in one does (see [rays](#rays)).
- **A loop:** a slide that would enter a tile the same way it already entered it in this slide (going round through two portals; the tile it started from doesn't count) is refused whole: nothing changes but the subject's facing, which turns to the way pressed, as a refused crossing leaves it; `refused`, and nothing settles.

Loose boxes never slide; a box is put down on slide floor and picked up from it as on plain floor. A slide counts as one move, and as none when it ends back on the tile it started from; with the facing also unchanged, the step changes nothing, though its events are still reported. It reports `slideStarted` the first time the subject moves on from a slide floor tile it entered, and `slideStopped` when that slide ends; entering slide floor and stopping at once reports neither. Neither plays a sound yet. The game draws a slide along its path, showing what happens on each tile as the subject gets there and the rest once it stops (see `AGENTS.md`).

#### Shoot blue or orange

While the subject stands in a fizzler that is on, the portal keys do nothing, without a sound. While it carries a box, they are refused: `refused`, with the error sound and no ripple, since no shot leaves (it can't stand in a fizzler that is on while carrying one, so the two never meet). Otherwise the shot leaves the subject's tile the way it faces and goes on tile by tile; the subject's own tile never stops it.

- A fizzler or a light barrier that is on, a closed door or the closed exit stops it: a miss. Ditches, lasers, boxes, buttons, switches, arrows, rays and anything not blocked let it through.
- Reaching the edge of the chamber is a miss.
- A wall takes the portal on its side facing the subject, unless that side faces a door or the exit, open or closed, or a laser or a light barrier running towards the wall (the wall at the end of its run, behind its end plate), on or off, or it already holds a portal, of either colour, on that side or on either neighbouring side; a portal on the far side doesn't stop it. A blocked wall takes it the same way only while it isn't blocked; while it is, the shot is a miss. An emitter or a receiver takes none, on any face: the shot is a miss.

A hit opens the portal of that colour there, closing it wherever it was before: `bluePortalOpened` or `orangePortalOpened`. A miss: `refused` (the game plays the shot sound instead of the error sound, and draws a ripple where the shot stopped, see `docs/sprites.md`).

#### Interact

- On a switch: while carrying a box, `refused`. Otherwise the switch is used: `switchUsed`, then it unblocks its links. It can be used any number of times, and each use unblocks its links again (so a linked box is sent back each time).
- Otherwise, while carrying a box: the box is put down on the tile the subject faces, `boxPutDown`, if a move that way could step onto that tile now (as below, for picking a box up from there), no fizzler there is on, no box rests there, since a tile holds [one box](#one-box-per-tile), and it holds neither the exit, where nothing would destroy a box when it closes, nor a switch, which the box would hide. Otherwise `refused`: a box is never put down on the subject's own tile.
- Otherwise, facing a tile where a box rests: the subject picks it up from where it stands, `boxPickedUp`, if a move that way could step onto that tile now but for the box (see [Move or turn](#move-or-turn): an arrow there must point that way, and nothing else there may block walking) and no fizzler there is on. The carried box then sits on the subject's tile, so a button the box held is released in the same step. The subject never picks up a box under it (see [one box per tile](#one-box-per-tile)).
- Otherwise nothing happens.

A box picked up while the subject stands in a fizzler that is on, from the tile it faces, is destroyed in the same step (see [the fizzler rule](#the-fizzler-rule)).

### The fizzler rule

If the subject stands in a fizzler that is on, both portals close and a carried box is destroyed (a slide also runs this rule on each tile it passes, see [a slide](#a-slide)): it goes back to its start tile (see [one box per tile](#one-box-per-tile)) and is no longer carried. `fizzled` is reported at most once per step, and only if the subject wasn't standing in a fizzler that was on when the step began: it walked or crossed into the field, or the field turned on under it. Nothing remembers having been inside a field.

### A box where something blocks

A box lying on a tile where a door is closed, a ditch is open, or a laser, a light barrier or a fizzler is on is destroyed: it goes back to its start tile (see [one box per tile](#one-box-per-tile)), `boxDestroyed`. That happens when the element closes or switches on under it; a box is never put down where one already has (see [Interact](#interact)). A carried box is left to the [fizzler rule](#the-fizzler-rule). The exit is left out, since no box can lie on it: the subject reaching it completes the chamber. A box's start is plain floor or a button, so each box is destroyed at most once in a step. The game shows a box falling into a ditch still open at the end of the step, and breaking up anywhere else as a fizzle breaks up a carried box, both without a sound.

### One box per tile

A tile holds at most one box. The carried box, which sits on the subject's tile, doesn't count, but a resting box keeps the subject off its tile (see [Move or turn](#move-or-turn)), and no box is put down where another rests (see [Interact](#interact)). A box sent back to its start tile, destroyed by a fizzler or where something blocks, or sent back by a link, sends the box resting there, if any, back to its own start the same way, and so on. Each box moves at most once, so the chain ends. Nothing reports it.

A box sent back to its start tile in any of these ways while the subject stands there lands under the subject. The subject can walk off it but not back on, and picks it up only from beside it, facing it. This is the only way the subject and a resting box share a tile.

### Rays

An emitter or a receiver is a wall tile of its own: wherever these rules speak of a wall, it counts as one, stopping walking, shots and rays and joining the walls around it, but neither takes a portal on any face, so a shot at one misses whichever face it meets (fixture: `shots_at_devices_miss`).

An emitter that is on sends a ray from its firing face. A ray isn't stored: the rules trace every ray from the state whenever settling judges a receiver (`traceRays` in `src/game/rules/rays.ts`), and the game draws them from the state it shows. Each starts on the floor tile in front of its emitter, travelling away from it, and goes on tile by tile:

- **A floor tile** stops it, on that tile, while the subject stands there (with a carried box), a box with no mirror rests there, a light barrier there is on, or a door or the exit there is closed. A resting mirror box turns it (below), and it goes on from that tile. Everything else lets it through, in any state: ditches, fizzlers, lasers, buttons, switches, arrows and slide floors (fixtures: `ray_lights_receiver_from_start`, `ray_passes_floor_elements`, `ray_stopped_by_door_exit_barrier`).
- **A wall tile** (a wall, a blocked wall in any state, an emitter, a receiver, or outside the chamber's edge) stops it at the face it meets, unless that face is a receiver's listening face, which lights that [receiver](#receivers), or holds a portal while the other portal is open: then the ray goes on from the tile in front of the other portal, travelling away from that portal's wall (fixtures: `ray_through_portals`, `ray_into_lone_portal_stops`).

A mirror box plays every box rule (carried, picked up, put down, holding a button down, sent back by a link, destroyed where something blocks), and its mirror stays the same wherever it goes, through portals too. Resting, it turns a ray entering its tile, from any side, a quarter turn: with y growing upwards, `/` turns a ray going right to up, up to right, left to down and down to left; `\` turns right to down, down to right, left to up and up to left. Carried, it is on the subject's tile, where the subject stops the ray first (fixtures: `mirror_boxes_turn_rays`, `mirror_box_through_portal`, `fizzled_mirror_box_turns_ray_again`).

A ray blocks nothing and harms nothing: the subject walks into, stands in and walks through one, shots pass it, a box in one isn't destroyed, and rays cross each other freely.

Rays count only while a step settles and at a chamber's start, since only settling judges receivers. A slide passing through a ray doesn't cut it, and one that stops in it does. Walking into a ray, or coming out of a portal into it, darkens what it lit within that step, and walking out lights it again. A shot that opens or moves a portal routes rays through it within that step, and a portal a fizzler or a blocked wall closes no longer passes them. Putting a box down in a ray cuts it there (a mirror box turns it instead), and picking the box up lets the ray on past that tile (fixtures: `subject_cuts_ray`, `subject_leaves_ray`, `box_put_down_cuts_ray`, `box_picked_up_from_ray`, `slide_through_ray_changes_nothing`, `slide_stopping_in_ray_cuts_it`). A door, the exit or a light barrier that a receiver holds open or off while that receiver's own ray crosses it closes or switches on as soon as anything cuts the ray before it, and then stops the ray itself, so it stays that way once the cut ends (fixture: `ray_held_door_closes_behind_subject`).

A ray never enters a tile the same way twice, and two rays never reach one receiver at once. A ray can enter a tile a given way from one place only, fixed by the state: from the tile behind it (and only from one side of it, when a mirror box rests there) or, when that tile is a wall, out of the portal on its face; and nothing leads back onto the tile in front of an emitter, which takes no portal. So a ray's path never repeats, and two rays reaching one receiver would share every tile back to one emitter. The rules still stop a ray that would enter a tile the same way twice, a guard that never acts; a receiver two emitters can light is lit by one at a time (fixtures: `receiver_lit_by_either_emitter`, `receiver_dark_when_neither_reaches`).

### Buttons

A button is held down while the subject or any box is on its tile. Each pass judges the buttons in the chamber's list order, and each one acts on its links at once, so a later button sees what an earlier one did. Going down: `buttonPressed`, then it unblocks its links in order. Coming up: `buttonReleased`, then it blocks its links in order.

### Receivers

A receiver is lit while a ray reaches its listening face (see [rays](#rays)), and acts as a button held down while it is lit. Each pass judges the receivers after the buttons, in the chamber's list order, and each one acts on its links at once. Lighting: `receiverLit`, then it unblocks its links in order. Going dark: `receiverUnlit`, then it blocks them in order. Neither plays a sound yet. Its lit flag is kept in the state, as a button's pressed flag is, so it acts only when that flag changes, and settling always leaves the flag matching the rays.

Each receiver is judged on the rays as they are after every change made before it, not on one tracing per pass: with one per pass, two receivers that each open the other's door could flip together forever. Two such receivers end both lit or both dark: a button opening the first door lights both within the step, and its coming up darkens both (fixtures: `ray_lights_receiver_from_start`, `receivers_hold_each_others_doors`, `receivers_let_go_together`). A receiver linked to an emitter relays: lighting switches the emitter on, whose ray can light another receiver within the same step, and going dark switches it off (fixtures: `receiver_relays_to_emitter`, `cut_relay_darkens_both`; an emitter on a button instead: `button_switches_emitter_on`, `button_switches_emitter_off`). When a receiver and a button, or two receivers, link one element, the latest change wins, as for two buttons: a receiver that stays lit doesn't undo a button coming up (fixture: `receiver_and_button_latest_wins`).

### Links

A button, switch or receiver names its links by element id. Only blocked walls (one tile each), light barriers, ditches, boxes, fizzlers, doors, lasers, the exit, arrows with a turned way and emitters can be linked. A link can also name a link group (format 2), which stands for its elements: they act at the group's place in the list, in the group's order.

| # | Element | Unblocked (button pressed, switch used, receiver lit) | Blocked (button released, receiver dark) |
|---|---------|-------------------------------------------------------|------------------------------------------|
| 1 | Blocked wall | Takes portals | Refuses portals, and a portal on any of its sides closes |
| 2 | Light barrier | Off | On |
| 3 | Ditch | Bridged | Open |
| 4 | Door | Opened: `doorOpened` | Closed: `doorClosed` |
| 5 | Exit | Opened: `exitOpened` | Closed: `exitClosed` |
| 6 | Fizzler | Off | On (see [the fizzler rule](#the-fizzler-rule)), and a portal on a wall side facing it closes: `portalFizzled` |
| 7 | Laser | Off | On |
| 8 | Box | Back to its start tile (see [one box per tile](#one-box-per-tile)), unless it is carried | Nothing; the validator warns about a box linked to a button or a receiver |
| 9 | Arrow | Points its turned way: `arrowTurned`; a subject on it turns with it | Points its own way: `arrowTurned`; a subject on it turns with it |
| 10 | Emitter | On: its ray leaves its firing face (see [rays](#rays)) | Off: it sends no ray |

A door or the exit reports its event only when it actually opens or closes, an arrow `arrowTurned` only when it actually turns, and a fizzler reports `portalFizzled` only when it closes a portal; the others are silent.

An arrow turning under the subject turns the subject with it, to face the arrow's new way, so on an arrow the subject always faces the way it points, and its shots fly that way; a carried box stays carried. It can then leave only that way. An arrow turns only as links act: as a button goes down or comes up, or a receiver lights or goes dark, while the step settles (a chamber's start included), or on a switch's use. A slide judges no button or receiver until it ends, so no arrow turns mid-slide, but a slide's end can turn one, under the subject too.

A blocked wall is a wall in every state: it stops walking and shots, and joins the walls around it. Blocking it closes a portal already on it, silently. A fizzler switching on closes a portal on a wall side facing its tile, one opened while it was off (a fizzler that is on stops shots and keeps the subject from shooting): `portalFizzled`, which the game shows by breaking the portal up, with no sound. A light barrier stands only on a floor tile, which never holds a portal, so switching it on closes none.

### The exit

A step that ends with the subject on the exit completes the chamber. The subject can only get there while the exit is open, since walking and crossing a portal both refuse a closed exit, so the chamber is completed even when the same step closes the exit under it.

### Something blocking under the subject

A door or the exit closing, a ditch opening, or a light barrier or a laser turning on under the subject does nothing to it: it can still turn, shoot, interact and walk off. A box it carries is kept, and no box lies there with it, since a box shares the subject's tile only on the box's start (see [one box per tile](#one-box-per-tile)), which is plain floor or a button. A fizzler turning on under the subject runs the fizzler rule in that same step. A receiver can do this through its own ray: stepping onto an open door, a bridged ditch, or a laser or a light barrier that is off, which a receiver holds so while its own ray crosses that tile, cuts the ray and switches the tile under the subject (see [rays](#rays)). Chambers avoid this state (`docs/level_design.md`). An arrow turning under the subject turns it with it (see [links](#links)), which chambers may use.

### Outside the chamber

Outside the chamber's edge counts as a wall that takes no portals, and the validator requires enclosed chambers.

### What the validator rejects

A chamber file is read field by field, then checked as a whole (`src/game/rules/`, run on every chamber by `npm run chamber:check`). Each problem names its field and its tile, where it has them. Errors keep a chamber from loading:

- **Fields:** a missing field, an unknown or misspelled one (an `id` on a blocked wall rectangle among them), a value of the wrong kind or out of range (a box's `mirror` other than `/` or `\` among them; see the [chamber format](#chamber-format)), a wall, blocked wall or slide floor rectangle whose from corner is past its to corner, an antline path with fewer than two corners, or a `version` other than 2.
- **Ids and links:** an id used twice (elements, arrows with a turned way and emitters among them, and groups share the ids), a link naming an id nothing has, a receiver's links included, and a group naming another group.
- **Arrows:** an arrow with a turned way but no `id`, or an `id` but no turned way, and a turned way that is the arrow's own way or opposite it (a half turn), so every turn is a quarter turn.
- **Emitters and receivers:** an emitter whose firing face, or a receiver whose listening face, looks outside the chamber or onto a wall tile, since it fires onto, or listens on, a floor tile inside the chamber.
- **Antlines:** an antline leading to an id nothing has, or to a group, since an antline leads to one element; a corner outside the chamber, the same as the corner before it, or sharing neither a row nor a column with it (only the first such corner is reported); a first corner on no button, switch or receiver that links the element, by its id or through a group; and a last corner away from the element's tile.
- **Bounds:** anything outside the chamber, the same wall tile listed twice, by walls, blocked walls, emitters or receivers, and the same slide floor tile listed twice.
- **What shares a tile:** a wall tile (a wall, a blocked wall, an emitter or a receiver) holds nothing else, so the subject, the exit and a light barrier are never inside a wall. A floor tile holds at most one of a light barrier, ditch, door, exit, fizzler, arrow, button, switch or laser, except two lasers that cross (one `H`, one `V`). A slide floor lies under what shares its tile, which can be a button, a fizzler, a laser, a light barrier, a box's start or the subject's start, but never a ditch, a door, the exit, an arrow or a switch. A box and the subject start on plain floor, slide floor or a button, with at most one box per tile, and the subject never on a box, since a box keeps it off its tile.
- **The edge:** every tile on the chamber's edge holds a wall, a blocked wall, an emitter, a receiver, a door or the exit, so the chamber is enclosed, and no slide floor stands there.

One warning doesn't keep a chamber from loading: a button or a receiver linked to a box, since releasing the button, or the receiver going dark, does nothing to the box.

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

## Interactions

Every element against every other. Each cell names the rules below that bring the two together: what one does to the other, on the same tile or beside it, and what the validator forbids (the V rules), a case that can't happen in a chamber that loads. `·` would mean that nothing does, which holds for no pair today, and `—` that a chamber holds only one of it. The portals and the carried box have rows of their own, and the box's row is a box resting on the floor. The mirror box's row is a resting mirror box, which plays every box rule too, so it is the box's row with its mirror's rules added; carried, a mirror box is the carried box. The ray's row is what each element does to a ray, on its tile or at its face. A new element adds its row and column; a cell not yet decided reads *to do* until its rule is written, and none does now. Each rule names the behaviour fixtures that play it (`scripts/fixtures/fixtures.ts`), and each V rule what the validator rejects, so every cell is backed by a fixture or by the validator.

| # | Element | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 |
|---|---------|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Subject | — | P1 P5 | M1 V1 | M1 V1 | M2 U1 V4 | M2 U1 V4 | M4 B3 V4 | M6 | M5 K3 | M5 K4 V4 | M2 U1 V4 | M5 F1 V4 | M2 X1 V4 | M2 U1 V4 | M3 A2 V4 | SL1 | M1 RY1 V1 | M1 RY1 V1 | M4 B3 RY5 V4 | RY3 RY6 RY7 |
| 2 | Portal | P1 P5 | P1 P5 | P1 P5 | P2 P5 | P3 P5 P7 | P4 P5 | P4 P5 | P5 P8 | P4 | P4 | P3 P6 | P3 F1 F2 | P3 P6 | P4 P5 P7 | P4 P5 | P4 SL3 SL6 | P1 RY1 | P1 RY1 | P4 P5 RY5 | RY4 RY6 RY7 |
| 3 | Wall | M1 V1 | P1 P5 | V1 | V1 | P7 V1 | V1 | V1 | B2 | V1 | V1 | P6 V1 | F2 V1 | P6 V1 | P7 V1 | V1 | SL2 V1 | V1 V5 | V1 V5 | V1 | RY4 |
| 4 | Blocked wall | M1 V1 | P2 P5 | V1 | V1 | P7 V1 | V1 | V1 | B2 | K1 V1 | K1 V1 | P6 V1 | F2 V1 | P6 V1 | P7 V1 | V1 | SL2 V1 | V1 V5 | RY8 V1 V5 | V1 | P2 RY4 |
| 5 | Light barrier | M2 U1 V4 | P3 P5 P7 | P7 V1 | P7 V1 | V2 | V2 | B1 V4 | B2 U1 | K1 V2 | K1 V2 | V2 | V2 | V2 | V2 | V2 | SL2 | V1 | RY8 V1 | B1 V4 | RY3 RY12 |
| 6 | Ditch | M2 U1 V4 | P4 P5 | V1 | V1 | V2 | V2 | B1 V4 | B2 U1 | K1 V2 | K1 V2 | V2 | V2 | V2 | V2 | V2 | SL2 V3 | V1 | RY8 V1 | B1 V4 | RY3 RY12 |
| 7 | Box | M4 B3 V4 | P4 P5 | V1 | V1 | B1 V4 | B1 V4 | B4 V4 | B2 B4 | B5 B6 | B2 B6 K4 V4 | B1 V4 | B1 B3 V4 | B2 V4 | B1 V4 | B3 V4 | SL2 SL7 | V1 | B6 V1 | B4 V4 | RY3 RY6 RY7 |
| 8 | Carried box | M6 | P5 P8 | B2 | B2 | B2 U1 | B2 U1 | B2 B4 | — | B6 | B2 B6 K4 | B2 U1 | F1 B2 | B2 | B2 U1 | B2 | SL7 | B2 | B2 B6 | B2 B4 | RY3 RY5 |
| 9 | Button | M5 K3 | P4 | V1 | K1 V1 | K1 V2 | K1 V2 | B5 B6 | B6 | K2 V2 | V2 | K1 V2 | K1 V2 | K1 V2 | K1 V2 | A1 V2 | SL5 | K1 RY2 V1 | RY8 RY10 V1 | B5 B6 | RY3 |
| 10 | Switch | M5 K4 V4 | P4 | V1 | K1 V1 | K1 V2 | K1 V2 | B2 B6 K4 V4 | B2 B6 K4 | V2 | V2 | K1 V2 | K1 V2 | K1 V2 | K1 V2 | A1 V2 | SL2 V3 | K1 RY2 V1 | RY10 V1 | B2 B6 K4 V4 | RY3 |
| 11 | Door | M2 U1 V4 | P3 P6 | P6 V1 | P6 V1 | V2 | V2 | B1 V4 | B2 U1 | K1 V2 | K1 V2 | V2 | V2 | V2 | V2 | V2 | SL2 V3 | V1 | RY8 V1 | B1 V4 | RY3 RY12 |
| 12 | Fizzler | M5 F1 V4 | P3 F1 F2 | F2 V1 | F2 V1 | V2 | V2 | B1 B3 V4 | F1 B2 | K1 V2 | K1 V2 | V2 | F3 V2 | V2 | V2 | V2 | SL4 | V1 | RY8 V1 | B1 B3 RY5 V4 | F1 F2 RY3 RY4 |
| 13 | Exit | M2 X1 V4 | P3 P6 | P6 V1 | P6 V1 | V2 | V2 | B2 V4 | B2 | K1 V2 | K1 V2 | V2 | V2 | — | V2 | V2 | SL2 V3 | V1 | RY8 V1 | B2 V4 | RY3 RY12 |
| 14 | Laser | M2 U1 V4 | P4 P5 P7 | P7 V1 | P7 V1 | V2 | V2 | B1 V4 | B2 U1 | K1 V2 | K1 V2 | V2 | V2 | V2 | L1 V2 | V2 | SL2 | V1 | RY8 V1 | B1 V4 | RY3 RY12 |
| 15 | Arrow | M3 A2 V4 | P4 P5 | V1 | V1 | V2 | V2 | B3 V4 | B2 | A1 V2 | A1 V2 | V2 | V2 | V2 | V2 | V2 | SL2 V3 | V1 | A1 RY8 V1 | B3 V4 | RY3 |
| 16 | Slide floor | SL1 | P4 SL3 SL6 | SL2 V1 | SL2 V1 | SL2 | SL2 V3 | SL2 SL7 | SL7 | SL5 | SL2 V3 | SL2 V3 | SL4 | SL2 V3 | SL2 | SL2 V3 | SL1 V3 | SL2 V1 | SL2 V1 | SL2 SL7 | RY3 RY7 |
| 17 | Emitter | M1 RY1 V1 | P1 RY1 | V1 V5 | V1 V5 | V1 | V1 | V1 | B2 | K1 RY2 V1 | K1 RY2 V1 | V1 | V1 | V1 | V1 | V1 | SL2 V1 | V1 V5 | RY9 V1 V5 | V1 | RY2 RY11 |
| 18 | Receiver | M1 RY1 V1 | P1 RY1 | V1 V5 | RY8 V1 V5 | RY8 V1 | RY8 V1 | B6 V1 | B2 B6 | RY8 RY10 V1 | RY10 V1 | RY8 V1 | RY8 V1 | RY8 V1 | RY8 V1 | A1 RY8 V1 | SL2 V1 | RY9 V1 V5 | RY8 RY10 V1 V5 | B6 V1 | RY8 RY11 |
| 19 | Mirror box | M4 B3 RY5 V4 | P4 P5 RY5 | V1 | V1 | B1 V4 | B1 V4 | B4 V4 | B2 B4 | B5 B6 | B2 B6 K4 V4 | B1 V4 | B1 B3 RY5 V4 | B2 V4 | B1 V4 | B3 V4 | SL2 SL7 | V1 | B6 V1 | B4 V4 | RY5 RY6 |
| 20 | Ray | RY3 RY6 RY7 | RY4 RY6 RY7 | RY4 | P2 RY4 | RY3 RY12 | RY3 RY12 | RY3 RY6 RY7 | RY3 RY5 | RY3 | RY3 | RY3 RY12 | F1 F2 RY3 RY4 | RY3 RY12 | RY3 RY12 | RY3 | RY3 RY7 | RY2 RY11 | RY8 RY11 | RY5 RY6 | RY6 RY11 |

Moving ([move or turn](#move-or-turn)):

- **M1:** the subject never steps into a wall tile (a wall, a blocked wall, an emitter or a receiver), outside the edge included; walking into one only turns it, unless a portal there takes it through (P5) (fixtures: `walking_into_wall_tiles_only_turns`, `edge_is_wall`).
- **M2:** the subject can't step onto a light barrier or a laser that is on, an open ditch, or a closed door or exit, and can once it isn't blocked; walking into one only turns it (fixtures: `open_ditch_and_closed_exit_refuse_until_switched`, `light_barrier_switches_off_and_on`, `crossing_lasers_either_blocks`, `carried_box_off_button_closes_door_at_once`).
- **M3:** an arrow lets the subject onto its tile only moving the way it points now, and on it only moves and turns that way do anything (fixtures: `arrow_turned_back_when_released`, `arrow_turned_by_switch_for_good`, `arrow_turns_subject_with_it`).
- **M4:** a resting box keeps the subject off its tile; the two share a tile only when the box is sent back to its start under the subject (fixtures: `box_blocks_walking`, `box_sent_home_under_subject`).
- **M5:** a button, a switch or a fizzler never stops the subject (fixtures: `button_switches_emitter_on`, `switch_sends_box_back_each_use`, `fizzler_rule_every_step`).
- **M6:** the carried box rides on the subject's tile wherever it goes, through portals and along slides (fixtures: `carried_box_buttons_in_list_order`, `mirror_box_through_portal`, `slide_carries_box`).

Portals ([shoot blue or orange](#shoot-blue-or-orange), [crossing a portal](#crossing-a-portal)):

- **P1:** a shot leaves the subject's tile the way it faces and opens its portal on the first wall it reaches, on the side facing the subject, when that side takes portals and neither portal is on it or on a neighbouring side of that wall; a portal opened elsewhere closes where it was (fixtures: `portal_refused_on_or_beside_a_portal`, `no_portal_beside_door_or_exit`).
- **P2:** a blocked wall takes a portal only while it isn't blocked, and blocking it closes a portal on it (fixture: `blocked_wall_switches_off_and_on`).
- **P3:** a light barrier or a fizzler that is on, a closed door and the closed exit stop a shot: a miss. A shot past an open door or the open exit on the chamber's edge leaves the chamber, and misses too (fixtures: `shots_stopped_until_switched_off`, `shots_over_switch_and_button_out_of_open_edge`, `light_barrier_switches_off_and_on`).
- **P4:** shots pass over ditches, lasers, boxes, buttons, switches, arrows and slide floors, whatever their state (fixtures: `shots_over_switch_and_button_out_of_open_edge`, `portal_onto_open_ditch_refused`, `portal_onto_active_laser_refused`, `portal_onto_box_refused`, `blocked_wall_switches_off_and_on`, `portal_onto_turned_arrow`, `slide_through_portal_slides_on`).
- **P5:** walking into a wall side that holds one portal, with the other open, brings the subject out in front of the other, facing away from its wall, with a carried box, when it could step onto that tile; otherwise the crossing is refused, so an open ditch, a light barrier or a laser that is on, a resting box or an arrow pointing another way in front of the far portal refuses it (fixtures: `portal_onto_open_ditch_refused`, `portal_onto_active_laser_refused`, `portal_onto_box_refused`, `portal_onto_turned_back_arrow_refused`, `portal_onto_turned_arrow`, `portal_onto_fizzler_fizzles_at_once`, `portal_onto_slide_floor_slides`, `mirror_box_through_portal`).
- **P6:** no wall side facing a door or the exit takes a portal, open or closed, so no portal leads into a doorway or onto the exit (fixture: `no_portal_beside_door_or_exit`).
- **P7:** a wall side facing a laser or a light barrier that runs towards it, behind its end plate, takes no portal, on or off; a wall alongside one does (fixture: `no_portal_behind_end_plate`).
- **P8:** the portal keys don't shoot while the subject carries a box: `refused` (fixture: `no_shot_while_carrying`).

Fizzlers ([the fizzler rule](#the-fizzler-rule), [links](#links)):

- **F1:** while the subject stands in a fizzler that is on, both portals close and a carried box is destroyed, back to its start; from there the portal keys do nothing (fixtures: `fizzler_rule_every_step`, `portal_onto_fizzler_fizzles_at_once`, `box_reached_from_fizzler_destroyed`, `no_shot_from_inside_fizzler`).
- **F2:** a fizzler switching on closes a portal on a wall side facing its tile (fixtures: `fizzler_on_closes_portal_facing_it`, `portal_onto_fizzler_fizzles_at_once`).
- **F3:** nothing remembers a field: walking from a fizzler that is off into one that is on fizzles, as walking in from plain floor does (fixture: `fizzler_rule_every_step`).

Boxes ([interact](#interact), [a box where something blocks](#a-box-where-something-blocks), [one box per tile](#one-box-per-tile)):

- **B1:** a box lying where a door closes, a ditch opens, or a laser, a light barrier or a fizzler switches on is destroyed, back to its start (fixtures: `box_breaks_up_in_closing_door`, `box_falls_into_opening_ditch`, `box_breaks_up_in_laser_turning_on`, `box_breaks_up_in_light_barrier_turning_on`, `box_breaks_up_in_fizzler_turning_on`).
- **B2:** a carried box goes down only on the tile faced, where a move could step now, no fizzler is on and no box rests, and never on the exit or a switch; facing anything else, a wall included, interact is refused (fixtures: `box_put_down_in_front`, `box_not_put_down_facing_wall`, `box_not_put_down_facing_exit`, `box_not_put_down_facing_switch`, `box_not_put_down_facing_a_box`, `box_not_put_down_facing_fizzler`, `box_not_put_down_facing_open_ditch`, `box_breaks_up_in_laser_turning_on`, `box_breaks_up_in_light_barrier_turning_on`).
- **B3:** a box is picked up from the tile faced only where a move could step onto it but for the box and no fizzler there is on; one picked up while the subject stands in a fizzler that is on is destroyed at once (fixtures: `box_picked_up_from_faced_tile`, `box_out_of_reach`, `box_reached_from_fizzler_destroyed`).
- **B4:** a tile holds one resting box: a box sent back to its start sends the box resting there back to its own start, and so on (fixtures: `box_sent_home_sends_box_home`, `no_box_put_down_on_a_box`).
- **B5:** a box on a button holds it down, and picking it up releases the button in the same step (fixtures: `box_picked_up_from_faced_tile`, `box_put_down_in_front`).
- **B6:** a button, a switch or a receiver linked to a box sends it back to its start when it unblocks it, unless it is carried; releasing a button, or a receiver going dark, does nothing to it (fixtures: `button_press_sends_box_back`, `button_release_leaves_box`, `switch_sends_box_back_each_use`, `receiver_sends_boxes_back`, `receiver_going_dark_leaves_boxes`, `carried_box_link_does_nothing`).

Buttons, switches and links ([buttons](#buttons), [links](#links), [interact](#interact)):

- **K1:** a button unblocks its links as it goes down and blocks them as it comes up, so another button sharing a link can undo it while it stays down; a switch unblocks them each time it is used. Links reach one-tile blocked walls, light barriers, ditches, doors, fizzlers, lasers, the exit, arrows with a turned way (A1) and emitters (RY2), and boxes (B6) (fixtures: `light_barrier_switches_off_and_on`, `blocked_wall_switches_off_and_on`, `carried_box_buttons_in_list_order`, `open_ditch_and_closed_exit_refuse_until_switched`, `shots_stopped_until_switched_off`, `exit_closing_as_subject_steps_on_completes`, `button_switches_emitter_on`).
- **K2:** each pass judges the buttons in list order, each acting at once, so a later one sees what an earlier one did (fixture: `carried_box_buttons_in_list_order`).
- **K3:** a button is held down while the subject stands on it (fixtures: `portal_onto_fizzler_fizzles_at_once`, `button_switches_emitter_on`, `slide_stops_on_button`).
- **K4:** standing on a switch, interact uses it, any number of times, so it never picks up the box in front; while a box is carried it is refused, and the box stays carried (fixtures: `switch_sends_box_back_each_use`, `box_kept_on_switch`).

The exit, lasers and what switches under the subject ([the exit](#the-exit), [something blocking under the subject](#something-blocking-under-the-subject)):

- **X1:** a step that ends with the subject on the exit completes the chamber, even when the exit closes in that step (fixtures: `exit_closing_as_subject_steps_on_completes`, `slide_onto_open_exit_completes`).
- **L1:** two lasers share a tile only when they cross, and either keeps the subject out while it is on (fixture: `crossing_lasers_either_blocks`).
- **U1:** a door closing, a ditch opening, or a light barrier or a laser switching on under the subject does nothing to it or to a box it carries; it can still walk off. The exit never closes under it, since a step that ends there completes the chamber (X1) (fixture: `blockers_switch_under_subject`).

Slides ([a slide](#a-slide)):

- **SL1:** entering slide floor keeps the subject moving its way within the step, tile by tile, until it enters a tile that isn't slide floor, where it stops, or can't enter the next; at rest on slide floor, a move onto more slide floor slides again, and turning only turns (fixtures: `slide_stops_at_wall`, `slide_stops_on_plain_floor`, `slide_floor_to_plain_floor_steps`, `slide_floor_to_slide_floor_slides`, `slide_floor_turn_stays`).
- **SL2:** a slide stops in front of a wall it can't cross, a light barrier or a laser that is on, an open ditch, a closed door or exit, an arrow pointing another way or a resting box, and on an arrow pointing its way, a bridged ditch, an open door, a switch or the open exit, which completes the chamber (fixtures: `slide_stops_before_closed_door_exit_and_devices`, `slide_stops_on_switch_open_door_and_bridged_ditch`, `slide_stops_before_open_ditch`, `slide_stops_before_laser`, `slide_stops_before_light_barrier`, `slide_stops_before_box`, `slide_stops_before_wrong_way_arrow`, `slide_stops_on_arrow`, `slide_onto_open_exit_completes`).
- **SL3:** a slide crosses portals as a walk does and goes on when it comes out onto slide floor; a crossing it can't come out of stops it in front of the portal, silently (fixtures: `slide_through_portal_slides_on`, `slide_through_portal_onto_plain_floor_stops`, `slide_crossing_blocked_stops_silently`, `slide_back_to_start_no_move`).
- **SL4:** the fizzler rule runs on each tile a slide passes, and the slide goes on (fixture: `slide_through_fizzler`).
- **SL5:** buttons are judged only where a slide stops, so passing over one doesn't press it (fixtures: `slide_passes_button`, `slide_stops_on_button`).
- **SL6:** a slide that would enter a tile the same way twice, looping through portals, is refused whole: the subject only turns (fixture: `slide_loop_refused`).
- **SL7:** loose boxes don't slide, and go down on and come up from slide floor as from plain floor; a carried box slides with the subject (fixtures: `slide_carries_box`, `slide_through_fizzler`).

Turning arrows ([links](#links)):

- **A1:** a link turns an arrow with a turned way: unblocked, it points its turned way, blocked, its own way, `arrowTurned` when it turns; it turns only as a button goes down or comes up, a receiver lights or goes dark, or a switch is used, never mid-slide (fixtures: `arrow_turned_back_when_released`, `arrow_turned_by_switch_for_good`, `receiver_turns_arrow`, `slide_stops_on_turned_arrow`).
- **A2:** an arrow turning under the subject turns the subject with it, so on an arrow the subject always faces the way it points (fixtures: `arrow_turned_back_under_subject`, `arrow_turns_subject_with_it`, `receiver_turns_arrow`).

Rays, emitters, receivers and mirror boxes ([rays](#rays), [receivers](#receivers)):

- **RY1:** an emitter or a receiver is a wall tile of its own: walking, shots and rays stop at it as at a wall (RY4), but it takes no portal on any face, so a shot at it misses (fixture: `shots_at_devices_miss`).
- **RY2:** an emitter that is on sends a ray from its firing face onto the floor in front of it; blocked means off, it starts on unless its file says `blocked: true`, and a link switches it on as a button goes down, a switch is used or a receiver lights, and off as a button comes up or a receiver goes dark (fixtures: `ray_lights_receiver_from_start`, `button_switches_emitter_on`, `button_switches_emitter_off`).
- **RY3:** on a floor tile, a ray stops where the subject stands, a box with no mirror rests, a light barrier is on, or a door or the exit is closed, and passes ditches, fizzlers, lasers, buttons, switches, arrows and slide floors, whatever their state (fixtures: `subject_cuts_ray`, `box_put_down_cuts_ray`, `ray_stopped_by_door_exit_barrier`, `ray_passes_floor_elements`).
- **RY4:** a ray stops at the face of a wall tile it meets (a wall, a blocked wall in any state, an emitter, a receiver or outside the edge), but a receiver's listening face lights the receiver, and a face holding a portal while the other is open sends the ray on from the tile in front of the other portal, away from its wall; a portal that closes no longer passes it (fixtures: `ray_through_portals`, `ray_into_lone_portal_stops`).
- **RY5:** a resting mirror box turns a ray entering its tile, from any side, a quarter turn (with y upwards, `/` right to up, up to right, left to down and down to left; `\` right to down, down to right, left to up and up to left), and its mirror stays the same wherever the box goes, through portals and back to its start; carried, it rides on the subject's tile, where the subject stops the ray first (fixtures: `mirror_boxes_turn_rays`, `mirror_box_through_portal`, `fizzled_mirror_box_turns_ray_again`).
- **RY6:** a ray blocks nothing and harms nothing: the subject walks into, stands in and walks through one, shots pass it, a box in one isn't destroyed, and rays cross each other freely (fixtures: `subject_cuts_ray`, `subject_leaves_ray`, `box_put_down_cuts_ray`, `receiver_lit_by_either_emitter`).
- **RY7:** rays count only while a step settles and at a chamber's start: walking or coming out of a portal into a ray, putting a box down in one (a mirror box turns it instead) or ending a slide in one cuts it within that step, walking out or picking the box up lets it on, and a shot that opens or moves a portal routes rays through it within that step; a slide passing through a ray cuts nothing (fixtures: `subject_cuts_ray`, `subject_leaves_ray`, `box_put_down_cuts_ray`, `box_picked_up_from_ray`, `slide_through_ray_changes_nothing`, `slide_stopping_in_ray_cuts_it`, `ray_through_portals`).
- **RY8:** a receiver is lit while a ray reaches its listening face and acts as a button held down while it is: lighting, `receiverLit`, it unblocks its links; going dark, `receiverUnlit`, it blocks them. Each pass judges the receivers after the buttons, in list order, each on the rays after every change before it, so two receivers holding each other's doors end both lit or both dark (fixtures: `ray_lights_receiver_from_start`, `receivers_hold_each_others_doors`, `receivers_let_go_together`).
- **RY9:** a receiver linked to an emitter relays: lighting switches the emitter on, whose ray may light another receiver within the same step, and going dark switches it off (fixtures: `receiver_relays_to_emitter`, `cut_relay_darkens_both`).
- **RY10:** when a receiver shares a link with a button, a switch or another receiver, the latest change wins, as between two buttons (K1): a receiver that stays lit doesn't undo a button coming up (fixture: `receiver_and_button_latest_wins`).
- **RY11:** a ray never enters a tile the same way twice, and two rays never reach one receiver at once, so a receiver two emitters can light is lit by one at a time (fixtures: `receiver_lit_by_either_emitter`, `receiver_dark_when_neither_reaches`).
- **RY12:** a door, the exit or a light barrier that a receiver holds open or off while that receiver's own ray crosses it closes or switches on once anything cuts the ray before it, then stops the ray itself, so it stays that way once the cut ends (fixture: `ray_held_door_closes_behind_subject`); stepping onto a door or a light barrier held so, or onto a ditch or a laser a receiver holds bridged or off the same way, cuts the ray there and switches it under the subject (U1).

Can't happen ([what the validator rejects](#what-the-validator-rejects)):

- **V1:** a wall tile (a wall, a blocked wall, an emitter or a receiver) holds nothing else, and no wall tile is listed twice, by walls, blocked walls, emitters or receivers.
- **V2:** a floor tile holds at most one of a light barrier, ditch, door, exit, fizzler, arrow, button, switch or laser, but for two lasers that cross.
- **V3:** a slide floor never shares a tile with a ditch, a door, the exit, an arrow or a switch, and no slide floor tile is listed twice; it may share one with a button, a fizzler, a laser, a light barrier, a box's start and the subject's start.
- **V4:** the subject and the boxes start on plain floor, slide floor or a button, one box to a tile and never one under the subject.
- **V5:** an emitter's firing face and a receiver's listening face look onto a floor tile inside the chamber, never onto a wall tile or outside it.

## Adding an element

Element types are described by data in `src/game/rules/`, but a new one still touches several files, because the chamber file reader, the validator, the walls' portal taking, the rays and the switching animation list elements by hand:

1. **Definition:** a file in `src/game/rules/elements/` that calls `defineElement` with its entry type. It gives the fixed properties (its name, its field in a chamber file, one entry or a list, the tiles it sits on, its draw layer, whether links reach it, its blocked flag's default or none, when it blocks walking, shots and shooting from its tile, when it stops a ray on its floor tile (`blocksRays`: never, or while blocked, as a light barrier that is on and a closed door or exit), when it takes portals, whether it reacts to the subject entering or leaving, whether entering it keeps the subject moving (`continuesMovement`), its events) and hooks for the rest (`interact`, `subjectInside`, `everyPass`, `linkUnblocked`, `linkBlocked`). Nothing reads when it takes portals (`takesPortals`): which tiles are walls and can take portals, and which of their sides (none facing a door or the exit, or a laser or a light barrier running towards the wall), is written out in `src/game/rules/compiled_chamber.ts`, and whether a wall takes a portal now in `takesPortalsNow` (`step.ts`), so an element that sits on a wall, takes portals or keeps them off the walls beside it also touches both. An element that is a wall tile of its own, as the emitter and the receiver are, sits on `'wall'`: the step and the rays stop at it by reading the walls (`isWall`), and read the blocking properties only of elements on floor tiles, so its `blocksRays` is `'never'`; one that takes no portal on any face goes in `DEVICE_KINDS` in `compiled_chamber.ts`, which marks its tiles as walls but not as walls that take portals. The rays read `blocksRays` in `src/game/rules/rays.ts`, which handles the subject, resting boxes and mirror boxes itself, so an element that stops a ray in another way, or turns one, touches it too. An element that destroys a box lying on it while blocked goes in `BOX_DESTROYING_KINDS` (`elements/box.ts`); the game draws such a box breaking up, but on a ditch, where it falls (`src/game/destroyed_boxes.ts`).
2. **Registry:** its line in `ELEMENT_REGISTRY` (`element_registry.ts`), whose order is the drawing order within a layer. The element fields of `ChamberData`, the compiled chamber's lookups and the state's blocked flags follow from it.
3. **Entry type:** a new one in `src/game/chamber_data.ts`, when none of the existing ones fits.
4. **Reader:** its field in `CHAMBER_FIELDS` and its list read in `chamber_parser.ts`.
5. **Validator:** its kind in `validate_chamber.ts`, placed on its tiles, and in the lists of what may share a tile, what may stand on the edge and what links can reach; a wall tile of its own among the wall kinds (`WALL_KINDS`), placed with the walls, and, when it faces a way, in the check that its face looks onto the floor (`checkDeviceFaces`); one with links in the link checks (`checkTriggers`) and the antline's first corner (`isLinkedFrom`); a kind whose name is more than one word, or starts with a vowel, also needs its wording in `describeKind`, or it reads "a lightBarrier" or "a emitter".
6. **Events:** each new one in `src/game/game_event.ts`, with its sound in `Level` (`src/game/level.ts`), or none.
7. **Drawing:** its entry in `ELEMENT_DRAWINGS` (`src/game/element_drawings.ts`), drawing its sprite for each state; each new sprite in the set (`src/game/sprite_set.ts` and `docs/sprites.md`), drawn in code as an SVG in `art/sprites/` and exported to its file in `src/assets/images/chamber/` (as `AGENTS.md` says) before it joins the set, since `npm run assets:check` requires every sprite's file, and in `RAISED_SPRITES` when it stands raised, so it gets the shared drop shadow; in `GAP_SIDE_KINDS` when it lines a gap that a door, the exit or a fizzler turns to fill (see `docs/sprites.md`, turning); and, when links switch it, its kind in `TRANSITION_KINDS` and `TRANSITION_STYLES` (`src/game/element_transitions.ts`), with its drawing part way through the change, or it switches at once. The floor, floor marks and structure layers are drawn once per chamber as its backdrop, the floor layer's elements (the slide floors) under the antlines and the other two over them (`src/game/renderer.ts`), so an element on them must look the same in every state, or be left out of the backdrop and drawn every frame right over it instead, as the arrows a link turns are (`drawTurnableArrows` in `element_drawings.ts`, which also draws an arrow's turn part way, the arrow being in `TRANSITION_KINDS`). An antline to a linkable element lights while the element is unblocked; one with no blocked flag, as the box, needs its own answer in the antline drawing (`src/game/antline_drawing.ts`), which the build asks for.
8. **Docs and fixtures:** its row in the table at the top, its field under [chamber format](#chamber-format), its rule under [rules](#rules) and [what the validator rejects](#what-the-validator-rejects), its row and column in the [interaction table](#interactions), every cell a rule, a case the validator forbids or *to do*, and any rule they need, each rule naming the fixtures that play it; behaviour fixtures in `scripts/fixtures/fixtures.ts`, and a case in `scripts/fixtures/format_examples.ts` for each new validator problem.
9. **Playground:** a place in the development-only playground (`src/dev/playground.json`, see `AGENTS.md`), switched by a button when it can be, so it can be tried by hand.
10. **Chamber sign:** its pictogram in `src/components/element_pictogram.vue` and its line in the sign's list (`src/components/chamber_sign.vue`), where it is shown dark in the chambers that hold it; it lays them out in rows of seven (the column count is fixed in the sign's styles), and its fourteen (the mirror box's among them, though it is a box) fill two rows, so the next starts a third row and makes the sign taller.

The recorded solutions change only when an existing chamber or its route changes. The build catches a missing drawing or sound. `npm run chamber:check` catches a field missing from the reader's field list or used by two elements, an event with no owner or two, and an element that blocks walking, shots, shooting or rays only while blocked but has no blocked flag. Nothing catches a validator line, the list read in `chamber_parser.ts`, or the chamber sign's line, left out.
