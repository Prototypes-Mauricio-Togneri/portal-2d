# Portal 2D

A desktop puzzle game, a fan take on Valve's Portal. The player guides a test subject across grid-based test chambers to the exit, using a pair of portals (one blue, one orange) to get past walls, gaps and obstacles. There are no enemies, no physics and no way to die: each chamber is a puzzle of where to place portals, what to carry where, and in which order to open things.

## The view

- Seen from straight above, with no perspective: the chamber is a grid of square tiles. Walls and other raised things cast a soft shadow.
- The camera never moves: the whole chamber is always on screen, scaled to fit and centred, but its tiles never grow larger than a chamber 16 tiles each way would get, so a small chamber leaves more of the room around it. There is no scrolling and nothing outside the chamber to explore.
- Beside the chamber, a side panel shows the chamber's sign (its number, its place in the list, a timer and an icon for each kind of element, dark for those the chamber holds) and the controls, drawn as the player's own keys.

## Turn by turn

- Nothing moves on its own. The game advances one action at a time, and only when the player acts.
- The actions: move (up, down, left or right), turn without moving (a move key pressed while holding the turn key, Shift by default), shoot a blue portal, shoot an orange portal, and interact (use a switch, pick up a box or put it down).
- Each action and everything it causes (a button pressed, a door opening, a fizzler firing) happens at once, before the next action.

## The subject

- Stands on one tile and always faces one of the four directions. The way it faces matters, because portals are shot that way.
- Moving in a direction first turns it that way, then steps onto the next tile if it can enter it, and keeps going while that tile is a slide floor (see [Slide floors](#slide-floors)). Walking into something it can't enter only turns it.
- Can carry one box at a time. It picks up the box on the tile it faces, if it could step onto that tile but for the box (not through an arrow pointing another way or something that blocks walking, and not from a fizzler that is on). It puts a box down only on the tile it faces, if it could step onto that tile and no box, exit, switch or fizzler that is on is there; otherwise the error sound plays. The box goes everywhere with it, through portals too. While carrying it, it can't shoot portals: trying plays the error sound.

## Portals

- There is one blue and one orange portal. Shooting a colour again moves that portal: the old one closes.
- A shot leaves in the direction the subject faces and travels in a straight line, instantly (no projectile is shown). The first wall it reaches takes the portal, on the side facing the subject.
- A hit plays its portal's opening sound. A shot misses (a shot sound, and a short ripple where it stopped) when a closed door, the closed exit, or a light barrier or a fizzler that is on is in the way, or when the wall can't take a portal there (a blocked wall refuses them while blocked, and the side of a wall facing a door or the exit never takes one, open or closed, nor does the wall at the end of a run of lasers or light barriers, behind its end plate, on or off).
- A wall tile can't take a portal on a side that already holds one, or on the two sides next to it; only the opposite side is still free. Shots never go through portals.
- Crossing: with both portals open, walking into a wall on the side that holds a portal takes the subject through. It comes out on the tile in front of the other portal, facing away from it.
- A crossing is refused (error sound) when the subject couldn't walk onto that tile, for example an open ditch, a laser that is on or a box. It then stays where it was. No portal ever faces a door or the exit, so a crossing never lands in a doorway.

## Tiles

| #   | Tile          | What it does                                                                                                                                    | Can the subject walk on it?                          | Does a shot pass through?                                       | Can a button or switch change it? |
| --- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- | --------------------------------- |
| 1   | Floor         | Empty tile, with nothing in the file                                                                                                            | Yes                                                  | Yes                                                             | No                                |
| 2   | Slide floor   | Keeps the subject moving: entering it, the subject goes on the same way, tile by tile, until it can't (see [Slide floors](#slide-floors))       | Yes, and slides on                                   | Yes                                                             | No                                |
| 3   | Wall          | Holds portals                                                                                                                                   | No (only by crossing a portal on it)                 | Stops the shot, which opens a portal there                      | No                                |
| 4   | Blocked wall  | Refuses portals while blocked; a button or switch can unblock a one-tile one so it takes portals, and blocking it again closes any portal on it | No (only by crossing a portal on it while unblocked) | Stops the shot, which opens a portal there only while unblocked | Yes, a one-tile one               |
| 5   | Light barrier | A field of light, on or off, horizontal or vertical; stands only on a floor tile                                                                | Only when off                                        | Only when off                                                   | Yes                               |
| 6   | Ditch         | A hole, open or bridged                                                                                                                         | Only when bridged                                    | Yes                                                             | Yes                               |
| 7   | Door          | Closed or open                                                                                                                                  | Only when open                                       | Only when open                                                  | Yes                               |
| 8   | Exit          | Reaching it completes the chamber; closed or open                                                                                               | Only when open                                       | Only when open                                                  | Yes                               |
| 9   | Fizzler       | When on, closes both portals and sends a carried box back to its start                                                                          | Yes                                                  | Only when off                                                   | Yes                               |
| 10  | Laser         | Horizontal or vertical; two can cross on one tile                                                                                               | Only when off                                        | Yes                                                             | Yes                               |
| 11  | Box           | Can be carried; holds a button down; one per tile                                                                                               | No (it is picked up from beside it)                  | Yes                                                             | Yes (sent back to its start)      |
| 12  | Button        | Held down while the subject or a box is on it; its linked elements change while it's held                                                       | Yes                                                  | Yes                                                             | No                                |
| 13  | Switch        | Interact to use it (not while carrying a box); it changes its linked elements, and using it again repeats that                                  | Yes                                                  | Yes                                                             | No                                |
| 14  | Arrow         | One-way: the subject can enter only in the arrow's direction, and can only move or turn that way while on it; a turnable one turns a quarter turn when its button or switch acts, turning a subject on it too | Only in its direction                                | Yes                                                             | Yes, a turnable one               |

Every chamber is closed in by walls (or blocked walls, doors and the exit) along its edge, and has exactly one exit. Beyond the edge counts as a wall that takes no portals.

## How each tile looks

| #   | Tile             | Looks like                                                                                          |
| --- | ---------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Floor            | Very light grey                                                                                     |
| 2   | Slide floor      | The floor a shade cooler, crossed by thin grey diagonal lines that run on across neighbouring tiles; it keeps the floor's groove, so each tile still shows |
| 3   | Wall             | Mid-grey raised blocks with bevelled edges; neighbouring walls join into one mass                   |
| 4   | Blocked wall     | Blocked: darker, riveted steel. Unblocked: a plain wall, with no mark that it can switch            |
| 5   | Light barrier    | On: a wide see-through pale teal band across the tile, horizontal or vertical, neighbours joined, a dark connector at each end. Off: only the connectors |
| 6   | Ditch            | Open: a deep pit, neighbours joined into one. Bridged: a steel grate over it                        |
| 7   | Door             | Closed: a burgundy panel with glowing pink strips and a ring. Open: plain floor                     |
| 8   | Exit             | Closed: shaped like a door, but dark steel with white lights. Open: plain floor (in today's chambers, a gap in the outer wall) |
| 9   | Fizzler          | On: a see-through cobalt-blue field with sparkles, over whatever is under it. Off: not shown        |
| 10  | Laser            | On: a glowing crimson beam, horizontal or vertical, neighbours joined, an end plate at each end. Off: only the end plates |
| 11  | Box              | A grey plated cube, a little smaller than its tile, so a button under it still shows                |
| 12  | Button           | A round red button on a white plate; its dome lights up while pressed                               |
| 13  | Switch           | The button's twin in yellow; doesn't show whether it was used                                       |
| 14  | Arrow            | A grey chevron pointing its way; a turnable one, a smaller chevron on a round disc cut into the floor, swinging round when it turns |
| 15  | Subject          | A painted test subject in an orange jumpsuit, portal gun pointing the way it faces; while carrying a box, it holds the box out in front instead |
| 16  | Portal           | A glowing blue or orange oval on the wall's edge facing the floor                                   |

- A step glides the subject one tile; a crossing slides it into one portal and out of the other; a slide glides it along its whole path, about 60 ms a tile, through any portals on the way, easing into its last tile. Turns happen at once, a subject turned by the arrow it stands on included.
- During a slide, what happens on the way shows as the subject gets there (a fizzler breaking up the portals, a crossing's sound), and what its stop sets off (a button, a door, the chamber's completion) when it stops: after a slide onto the exit, the completion dialog opens as the slide ends, though the timer stopped at the key press. A key pressed during a slide ends it at once, showing all it still had waiting.
- When switched, doors, the exit and blocked walls slide open or shut, a turnable arrow's chevron swings round its quarter turn, a ditch's grate slides in or out, a fizzler crumbles away or forms, and a laser or light barrier fades. A fizzle breaks the lost portals and a carried box into pieces, and so does a fizzler switching on with a portal facing it (silently), and a door closing or a laser, light barrier or fizzler switching on with a box lying there (silently); a box on a ditch that opens falls into the pit (silently), a missed shot ripples, a portal a shot opens grows open on its wall, and lasers and portals glow with a slow pulse.
- With reduced motion, nothing animates: everything changes at once and the glows hold steady.
- Each event has a sound: a portal opening (one per colour), a missed shot, a box picked up or put down (the same sound), a fizzle, a crossing, a door or the exit opening or closing, a button pressed or released, a switch used; a slide and an arrow turning have no sound of their own yet. Any refused action plays an error sound: a crossing, shooting or using a switch while carrying a box, or putting a box down facing a tile that can't take it.

## Buttons, switches and links

- A button or switch is linked to elements elsewhere in the chamber: blocked walls (one tile each), light barriers, ditches, doors, the exit, fizzlers, lasers, turnable arrows and boxes. One can be linked to many, and several can share an element.
- Pressing a button, or using a switch, opens what it is linked to: a blocked wall takes portals, a ditch is bridged, a door or the exit opens, a light barrier, fizzler or laser turns off, a turnable arrow turns to its other way, a box goes back to its start (unless it's being carried).
- Releasing a button closes them again: the blocked wall refuses portals (closing any portal on it), the ditch opens, the door or exit closes, the light barrier, fizzler or laser turns back on (a fizzler closing any portal facing it), the arrow turns back to its own way. A released button does nothing to a box.
- A button stays pressed only while the subject or a box is on it, so a box left on it keeps a door open while the subject walks away.
- A switch only opens. Using it again repeats that (sending a linked box back each time); it never closes anything. It can't be used while carrying a box, and a box is never put down on a switch, so none ever hides one.
- Each element starts open or closed as the chamber sets it, before any button or switch acts on it.
- Some links are shown by a dotted line on the floor, from the button or switch to the element, as in the original game, mostly in the tutorial and early chambers. It is cyan, and turns amber while the element is open in the sense above (a line to a box never does). It runs under walls and anything else on its way, and changes nothing in play.

## Fizzlers in detail

- Entering a fizzler that is on (walking, coming out of a portal, or the fizzler turning on under the subject) closes both portals and sends a carried box back to its start.
- A portal can be shot past a fizzler that is off, or from inside it, onto the wall beyond; when the fizzler turns on, that portal closes and breaks up. So a crossing lands in a fizzler that is on only when the crossing itself turns it on, for example by leaving the button that held it off.
- While standing in a fizzler that is on, no portal can be shot.
- A box lying in a fizzler that switches on is destroyed: it goes back to its start, breaking up. Any other box lying on the floor is affected only when it lies on the start tile of the box sent back, which sends it back to its own start.

## Slide floors

- Entering a slide floor, by walking onto it or coming out of a portal onto it, keeps the subject going the way it moves, tile by tile, all in the same action. It stops on the first tile that isn't slide floor (plain floor, an arrow pointing its way, or the open exit, which completes the chamber), or in front of anything it couldn't walk onto: a wall without a portal it can go through, an open ditch, a closed door or exit, a laser or a light barrier that is on, an arrow pointing another way, or a resting box.
- A slide goes through portals: sliding into a wall that holds a portal on that side, with the other one open, the subject comes out of the other portal, and slides on if it comes out onto slide floor. If it couldn't come out there, it stops in front of the portal, without the error sound a crossing from rest plays.
- On the way, a fizzler that is on still closes both portals and sends a carried box back to its start, and the slide goes on. A button passed over isn't pressed: only the tile where the slide stops counts.
- Standing on a slide floor, turning only turns; a move onto plain floor is a single step, and a move onto more slide floor slides again. Shooting, and picking up or putting down a box, work as on plain floor.
- Boxes don't slide: a box put down on slide floor stays there, and a carried box slides with the subject. A resting box stops a slide on the tile before it.
- A slide that would go round and round through two portals is refused: the error sound plays and the subject only turns the way pressed.

## Other details

- Something closing under the subject (a door, the exit, a light barrier, a ditch, a laser) doesn't hurt it: it can still turn, shoot, interact and walk off. A box it carries is kept.
- A box lying where a door closes, a ditch opens, or a laser, a light barrier or a fizzler switches on is destroyed: it goes back to its start, breaking up, or falling into the ditch.
- A box keeps the subject off its tile, but lets shots through. A tile holds one box: a box can't be put down where another lies, and a box sent back to its start sends one lying there back to its own start. A box sent back to its start while the subject stands there lands under it: the subject can walk off but not back on, and picks the box up from beside it.
- Once the subject reaches the open exit, the chamber is complete and nothing more changes.

## Chambers and progress

- Eight chambers so far: the Tutorial (12 × 10 tiles), then chambers 1 (20 × 20), 2 (23 × 13) and 3 (23 × 17), chambers 4 (13 × 9) and 5 (9 × 13), which teach and test slide floors, and chambers 6 (10 × 7) and 7 (10 × 9), which teach and twist turnable arrows. The roadmap aims for 20.
- The timer starts with the first press of a move, portal or interact key in a chamber and stops when the chamber is complete. The only score is the time: there are no medals or move targets.
- Finishing a chamber shows the time and the best time (or "New best time"), with Next chamber, Play again and Back to menu (after the last chamber, only Back to menu and Play again).
- The pause menu offers Continue, Restart chamber and Exit chamber; restarting or leaving asks for confirmation first.
- Progress is kept on the device: which chambers are completed, each one's best time and how many attempts it has had.

## Screens

- **Loading screen:** the first screen of every visit; it loads the sounds and images, then waits for Start.
- **Home screen:** a menu on the wall of a test-room photo: Play (the chambers, each with its best time, a figure that turns green once completed, and a map preview of the chamber), Settings (sound effects, music, controls and reset progress; the controls are Default, the arrows with A, D, Space and Shift, or Custom keys set one by one; the mouse plays no part in the game) and About (links, the changelog and feedback).
- **Chamber screen:** the chamber over a blurred test-room photo, with the side panel beside it.
- Desktop only: phones and tablets get a notice instead of the game.
