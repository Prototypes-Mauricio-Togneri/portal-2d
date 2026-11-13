# Portal 2D

A desktop puzzle game, a fan take on Valve's Portal. The player guides a test subject across grid-based test chambers to the exit, using a pair of portals (one blue, one orange) to get past walls, gaps and obstacles. There are no enemies, no physics and no way to die: each chamber is a puzzle of where to place portals, what to carry where, and in which order to open things.

## The view

- Seen from straight above: the chamber is a grid of square tiles, drawn flat.
- The camera never moves: the whole chamber is always on screen, scaled to fit and centred. There is no scrolling and nothing outside the chamber to explore.
- Beside the chamber, a side panel shows the chamber's number and a timer.

## Turn by turn

- Nothing moves on its own. The game advances one action at a time, and only when the player acts.
- The actions: move (up, down, left or right), turn in place without moving, shoot a blue portal, shoot an orange portal, and interact (use a switch, pick up or put down a box).
- Each action and everything it causes (a button pressed, a door opening, a fizzler firing) happens at once, before the next action.
- Steps can be undone and redone.

## The subject

- Stands on one tile and always faces one of the four directions. The way it faces matters, because portals are shot that way.
- Moving in a direction first turns it that way, then steps onto the next tile if it can enter it. Walking into something it can't enter only turns it.
- Can carry one box at a time. The box goes everywhere with it, through portals too.

## Portals

- There is one blue and one orange portal. Shooting a colour again moves that portal: the old one closes.
- A shot leaves in the direction the subject faces and travels in a straight line, instantly (no projectile is shown). The first wall it reaches takes the portal, on the side facing the subject.
- A shot misses (an error sound, nothing on screen) when a closed door, the closed exit, a raised barrier or a fizzler that is on is in the way, or when the wall can't take a portal there.
- A wall tile can't take a portal on a side that already holds one, or on the two sides next to it; only the opposite side is still free. Shots never go through portals.
- Crossing: with both portals open, walking into a wall on the side that holds a portal takes the subject through. It comes out on the tile in front of the other portal, facing away from it.
- A crossing is refused (error sound) when the subject couldn't walk onto that tile, for example an open ditch, a closed door or a laser that is on. It then stays where it was.

## Tiles

| #   | Tile    | What it does                                                                                                   | Can the subject walk on it?          | Does a shot pass through?                  | Can a button or switch change it? |
| --- | ------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------ | --------------------------------- |
| 1   | Floor   | Empty tile, with nothing in the file                                                                           | Yes                                  | Yes                                        | No                                |
| 2   | Wall    | Holds portals; a wall can also be set to refuse them                                                           | No (only by crossing a portal on it) | Stops the shot, which opens a portal there | No                                |
| 3   | Barrier | Raised or lowered; can also sit on a wall tile, where it keeps portals off the wall                            | Only when lowered                    | Only when lowered                          | Yes                               |
| 4   | Ditch   | A hole, open or bridged                                                                                        | Only when bridged                    | Yes                                        | Yes                               |
| 5   | Door    | Closed or open                                                                                                 | Only when open                       | Only when open                             | Yes                               |
| 6   | Exit    | Reaching it completes the chamber; closed or open                                                              | Only when open                       | Only when open                             | Yes                               |
| 7   | Fizzler | When on, closes both portals and sends a carried box back to its start                                         | Yes                                  | Only when off                              | Yes                               |
| 8   | Laser   | Horizontal or vertical; two can cross on one tile                                                              | Only when off                        | Yes                                        | Yes                               |
| 9   | Box     | Can be carried; holds a button down; several can share a tile                                                  | Yes                                  | Yes                                        | Yes (sent back to its start)      |
| 10  | Button  | Held down while the subject or a box is on it; its linked elements change while it's held                      | Yes                                  | Yes                                        | No                                |
| 11  | Switch  | Interact to use it (not while carrying a box); it changes its linked elements, and using it again repeats that | Yes                                  | Yes                                        | No                                |
| 12  | Arrow   | One-way: the subject can enter only in the arrow's direction, and can only move or turn that way while on it   | Only in its direction                | Yes                                        | No                                |

Every chamber is closed in by walls (or barriers, doors and the exit) along its edge, and has exactly one exit. Beyond the edge counts as a wall that takes no portals.

## How each tile looks

| #   | Tile             | Looks like                                                                                          |
| --- | ---------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Floor            | Very light grey                                                                                     |
| 2   | Wall             | Mid grey with a dark edge; a wall that refuses portals looks the same                               |
| 3   | Barrier          | Raised: a grey tile, light in the centre and dark at the edge. Lowered: not shown                   |
| 4   | Ditch            | Open: a near-black hole. Bridged: plain floor                                                       |
| 5   | Door             | Closed: purple with a magenta edge. Open: plain floor                                               |
| 6   | Exit             | Closed: looks like a closed door. Open: plain floor (in today's chambers, a gap in the outer wall)  |
| 7   | Fizzler          | On: a see-through blue-grey tile over whatever is under it. Off: not shown                          |
| 8   | Laser            | On: a thin pink line across the tile, horizontal or vertical. Off: not shown                        |
| 9   | Box              | A brown square; smaller on a button, so the button still shows                                      |
| 10  | Button           | A red square; looks the same pressed or not                                                         |
| 11  | Switch           | An orange square with a red edge; doesn't show whether it was used                                  |
| 12  | Arrow            | A grey triangle pointing its way                                                                    |
| 13  | Subject          | A green square with a triangle pointing the way it faces: white, or brown while it carries a box    |
| 14  | Portal           | The half of the wall tile facing the floor, filled blue or orange                                   |

- A step glides the subject one tile; a crossing slides it into one portal and out of the other. Everything else changes at once.
- Each event has a sound: a portal opening (one per colour), a miss or refused crossing, a box picked up, a fizzle, a crossing, a door or the exit opening or closing, a button pressed or released, a switch used.

## Buttons, switches and links

- A button or switch is linked to elements elsewhere in the chamber: barriers, ditches, doors, the exit, fizzlers, lasers and boxes. One can be linked to many, and several can share an element.
- Pressing a button, or using a switch, opens what it is linked to: a barrier lowers, a ditch is bridged, a door or the exit opens, a fizzler or laser turns off, a box goes back to its start (unless it's being carried).
- Releasing a button closes them again: the barrier rises (closing a portal on its tile), the ditch opens, the door or exit closes, the fizzler or laser turns back on. A released button does nothing to a box.
- A button stays pressed only while the subject or a box is on it, so a box left on it keeps a door open while the subject walks away.
- A switch only opens. Using it again repeats that (sending a linked box back each time); it never closes anything. It can't be used while carrying a box, so a box can't be put down on a switch.
- Each element starts open or closed as the chamber sets it, before any button or switch acts on it.

## Fizzlers in detail

- Entering a fizzler that is on (walking, coming out of a portal, or the fizzler turning on under the subject) closes both portals and sends a carried box back to its start.
- While standing in a fizzler that is on, no portal can be shot.
- A box lying on the floor is never affected.

## Other details

- Something closing under the subject (a door, the exit, a barrier, a ditch, a laser) doesn't hurt it: it can still turn, shoot, interact and walk off.
- Boxes never block the subject or shots, and several can lie on one tile.
- Once the subject reaches the open exit, the chamber is complete and nothing more changes.

## Chambers and progress

- Four chambers so far: the Tutorial (12 × 10 tiles), then chambers 1 (20 × 20), 2 (23 × 13) and 3 (23 × 17). The roadmap aims for 20.
- The timer starts with the first action in a chamber and stops when the chamber is complete. The only score is the time: there are no medals or move targets yet.
- Finishing a chamber shows the time and the best time (or "New best time"), with Next chamber, Play again and Back to menu.
- The pause menu offers Continue, Restart chamber and Exit chamber; restarting or leaving asks for confirmation first.
- Progress is kept on the device: which chambers are completed and each one's best time.

## Screens

- **Loading screen:** the first screen of every visit; it loads the sounds and images, then waits for Start.
- **Home screen:** a menu on the wall of a test-room photo: Play (the chambers, each with its best time, a figure that turns green once completed, and a map preview of the chamber), Settings (sound effects, music, reset progress) and About (links and the changelog).
- **Chamber screen:** the chamber over a blurred test-room photo, with the side panel beside it.
- Desktop only: phones and tablets get a notice instead of the game.
