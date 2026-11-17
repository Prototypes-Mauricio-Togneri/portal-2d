# Level Design

Guidelines for designing a chamber (`src/chambers/`), beyond what the chamber check rejects (`docs/elements.md`, "What the validator rejects"): first the states a chamber should never let the player reach, then the guidelines that keep the player out of them. The rules allow all of these states, and nothing checks these guidelines: they keep the player out of states that look broken, keep each chamber fair, and keep it checkable. Break one only on purpose.

## States to avoid

A chamber should never let the player reach one of these, whatever they do and in whatever order. Each ends with the guidelines below that prevent it.

### The player is stuck

Only Restart chamber gets the player out (guideline 13).

- **Frozen on an arrow:** the subject stands on an arrow, which lets it move only its own way, and that way is shut: a wall without a portal it can cross, an arrow pointing back, or a door, ditch, laser or light barrier that is blocked, often because stepping onto the arrow released the button holding it open (guideline 14).
- **Shut in:** the subject is in a part of the chamber it can't leave: one it entered past an arrow, or by a portal when no portal it can shoot from inside brings it out again, or the portal it came out of closed behind it (guidelines 2, 13, 14 and 15).
- **A needed box out of reach:** a box the route still needs lies where the subject can't get to it, such as beyond a one-way passage, in a part reached only by portal, or on a start tile it was sent back to that the subject can't reach, or can't leave with the box (guidelines 5, 13 and 15).
- **A box that can't be put down:** in a pocket, the subject carries a box it can't put down (standing on a switch, or on another box with no tile in front to take it), and it can't shoot while carrying one (guideline 16).

### Something looks broken

- **Standing in something that blocks:** the subject stands in a closed door, over an open ditch, or in a laser or a light barrier that is on (guidelines 1 and 2).
- **The exit closing as the chamber completes:** stepping from a button onto the exit it opens completes the chamber as the exit closes, so the button never needed its box (guideline 1).
- **An element out of step with its buttons:** a door stays closed while a button linked to it is held down, or stands open before its button has been pressed (guideline 4).
- **A box that jumps home unseen:** a box resting on another box's start tile is sent to its own start, without any sign, when that box is sent back; and a box picked up from inside a fizzler that is on goes back to its start with only the pickup sound (guideline 6).
- **A shot that does nothing:** the portal keys do nothing, without a sound, while the subject stands in a fizzler that is on (guideline 11).

### Something is lost without warning

- **Fizzled by the subject's own step:** stepping off a fizzler's button, crossing a portal from it, or picking its box up from the fizzler's tile switches the fizzler on under the subject: both portals close and a carried box breaks up (guideline 3).
- **A portal closing by itself:** a portal facing a fizzler closes when the fizzler switches on, and one on a blocked wall closes, without a sound, when the wall is blocked again (guidelines 2 and 11).

### The puzzle is bypassed

- **A box delivered by its start tile:** a box sent back lands on its start tile wherever that is, so a start beyond a barrier delivers it past the barrier, and a start on a button presses the button from anywhere (guideline 6).
- **A portal route the design didn't intend:** shots fly over lasers, ditches, boxes and arrows, so a portal can skip a laser, a ditch or a one-way passage (guidelines 12 and 19).
- **A pass through a blocked element:** a closed door, an open ditch, or a laser or a light barrier that is on, switched under the subject, lets it walk out the far side without holding the button (guidelines 1 and 2).

The rules already keep out the rest, so a design never needs to guard against them: the subject coming out of a portal onto a tile it couldn't walk onto, into a doorway or onto the exit; a box lying in a closed door, over an open ditch, or in a laser, a light barrier or a fizzler that is on; a box on the exit or a switch, or two boxes on one tile; a carried box inside a fizzler that is on; and the subject leaving the chamber. A layout that starts in a broken state is rejected by the chamber check.

## Never switch something under the subject

Releasing a button closes or switches back on what it holds open, even under the subject. The rules leave the subject unharmed, but it is left standing in a closed door, over an open ditch, or inside a laser or a light barrier, which looks broken, and it can then walk out the far side, past the element, without holding the button.

1. Don't put a button next to an element it links that keeps the subject out while blocked: a door, a ditch, a laser, a light barrier or the exit. Stepping off the button onto the element closes it under the subject, and so does picking up, from the element's tile, the box holding the button down. Stepping onto the exit completes the chamber even as it closes, so its button would never need a box.
2. Don't let a portal carry the subject straight from a button onto such an element: if a button stands in front of a wall side that can take a portal, no wall side facing one of its linked ditches, lasers or light barriers should take one. Doors and the exit are safe, since a wall side facing one never takes a portal. Nor should any side of a blocked wall the button links take one: crossing from the button out of a portal there blocks the wall again, which closes that portal, and the way back with it.
3. A fizzler next to its own button fizzles the subject as it steps off: both portals close and a carried box breaks up. So does picking the button's box up from the fizzler's tile, and crossing from the button out of a portal facing the fizzler, so if the button stands in front of a wall side that can take a portal, no wall side facing the fizzler should take one. Use these only as a deliberate trap.

## Links

4. Don't link an element to a button and to anything else that switches it, another button or a switch, directly or through a group. A button acts only when it goes down or comes up, and coming up blocks its links whatever else holds them: with two buttons on one door, releasing either closes the door while the other is still held, and one step from one button onto the other can end with the door closed under a pressed button. An element a button links should also start blocked, since one that starts unblocked stays open until the button has been pressed and released.

## Boxes

5. A box that breaks up or falls goes back to its start tile: a fizzler destroys a box carried into it, and a door closing, a ditch opening, or a laser, a light barrier or a fizzler switching on destroys a box lying there. Keep each box's start tile reachable for as long as the box is needed, with a way from there to where it is needed that crosses no fizzler that is on.
6. A box's start tile is where it lands, from anywhere, each time it is sent back, so make it a place where a box may appear at any time: not beyond a barrier the box shouldn't cross, and not on a button unless pressing it then is meant. A box resting on another box's start tile is sent to its own start, without any sign, when that box lands, so keep start tiles off the natural places to put a box down. Keep them off a fizzler's neighbours too, where picking the box up from inside the field only plays the pickup sound.
7. A box is put down on the tile the subject faces, and with the arrow keys the subject faces only the way it last walked: it can face a floor tile without stepping onto it only by walking straight at it, or by coming out of a portal facing it. Give each tile a box must be put down on, a button above all, a straight approach two tiles long, or a portal facing it; the middle of a 3 × 3 room has none from inside the room. Standing on the tile itself and facing a wall puts the box down there too.
8. Send a box back with a switch, not a button: a button sends it back when pressed, but releasing it does nothing (the chamber check warns).
9. Keep the chamber within the solver's state key, 64 bits: `npm run solve` prints each chamber's width (today's use 29 to 53 bits). Each box adds about 8 bits, and each element a link reaches 1.

## Portals

10. Some wall sides never take a portal: those facing a door or the exit, those behind the end plate of a run of lasers or light barriers, and, on a wall tile that already holds a portal, every side but the opposite one. Don't plan a route that needs one.
11. A fizzler switching on closes a portal facing it, so a portal in front of a fizzler lasts only while the fizzler is off, and a portal on a blocked wall lasts only while the wall isn't blocked, closing without a sound. While the subject stands in a fizzler that is on, the portal keys do nothing, without a sound, so don't put one where the player would stand to aim.
12. Shots fly over lasers and ditches, even on or open, and over boxes, buttons, switches and arrows; only a wall, a closed door or exit, and a fizzler or a light barrier that is on stop one. Check which wall sides each part of the chamber can shoot, since a portal can skip a laser, a ditch or a one-way passage.

## Dead ends

13. Steps can't be taken back, so a stuck player's only way out is Restart chamber. Avoid dead ends a player can walk into without noticing, such as an arrow leading into a pocket with no way back. A chamber that can be lost on purpose should make it obvious.
14. On an arrow, only its own way does anything, so the tile it points to must always let the subject on: not a wall without a portal it can cross, nor an arrow pointing back, nor a door, ditch, laser or light barrier that can be blocked while the subject stands on the arrow, above all one whose button the subject leaves by stepping onto the arrow. A portal facing an arrow tile only lets the subject out, and only when the arrow points away from the wall: the subject can never walk back into it.
15. A part of the chamber the subject reaches only by portal needs a way back: a wall side it can shoot from inside that brings it out again, and the portal it came out of must not close behind it (guidelines 2 and 11).
16. The subject can't shoot while carrying a box, nor put the box down while standing on a switch, or on another box with no tile in front to take it, so a pocket it can enter carrying a box needs a tile there to put the box down.

## Antlines

17. Draw antlines in the tutorial and the early chambers, from each button or switch to what it links, so the player learns how links work; later chambers can leave them out.

## Checking a chamber

18. Record its solution by playing it through (Download solution in the completion dialog, in `npm run dev`), and record it again after any change to the chamber but its antlines.
19. Run `npm run chamber:check` and `npm run replay:check`. `npm run solve -- --par src/chambers/chamber_N.json --max-states=40000000` finds the fewest moves and the fewest portals, which shows any shortcut the design didn't intend.
