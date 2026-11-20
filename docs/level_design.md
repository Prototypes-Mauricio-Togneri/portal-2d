# Level Design

Guidelines for designing a chamber (`src/chambers/`), beyond what the chamber check rejects (`docs/elements.md`, "What the validator rejects"): first the states a chamber should never let the player reach, then the guidelines that keep the player out of them. The rules allow all of these states, and nothing checks these guidelines: they keep the player out of states that look broken, keep each chamber fair, and keep it checkable. Break one only on purpose.

## States to avoid

A chamber should never let the player reach one of these, whatever they do and in whatever order. Each ends with the guidelines below that prevent it.

### The player is stuck

Only Restart chamber gets the player out (guideline 15).

- **Frozen on an arrow:** the subject stands on an arrow, which lets it move only its own way, and that way is shut: a wall without a portal it can cross, an arrow pointing back, or a door, ditch, laser or light barrier that is blocked, often because stepping onto the arrow released the button holding it open, or an arrow turned under the subject to a way that is shut (guideline 16).
- **Shut in:** the subject is in a part of the chamber it can't leave: one it entered past an arrow, or by a portal when no portal it can shoot from inside brings it out again, or the portal it came out of closed behind it (guidelines 2, 15, 16 and 17).
- **A needed box out of reach:** a box the route still needs lies where the subject can't get to it, such as beyond a one-way passage, in a part reached only by portal, or on a start tile it was sent back to that the subject can't reach, or can't leave with the box (guidelines 5, 15 and 17).
- **A box barring the way:** a box put down, or sent back, in a one-tile passage, a doorway or on a button the route must cross, with no tile beside it left that the subject can reach and pick it up from (guideline 9).
- **A box that can't be put down:** in a pocket, the subject carries a box it can't put down, since no tile it can face can take it (standing on a switch, on an arrow whose way faces a tile that can't take a box, or boxed in by walls and boxes), and it can't shoot while carrying one (guideline 18).
- **Stranded by a slide:** a slide leaves the subject on a tile every way off which slides it back, or in a room whose only way out is a portal, after a fizzler on the slide's way closed the portals (guidelines 21 and 23).
- **Shut by its own ray:** a door, the exit or a light barrier that a receiver holds open, standing in that receiver's own ray, shuts once anything cuts the ray before it, and from then on stops the ray itself, so it stays shut (guideline 29).

### Something looks broken

- **Standing in something that blocks:** the subject stands in a closed door, over an open ditch, or in a laser or a light barrier that is on (guidelines 1, 2, 22 and 29).
- **The exit closing as the chamber completes:** stepping from a button onto the exit it opens completes the chamber as the exit closes, so the button never needed its box (guideline 1).
- **An element out of step with its buttons:** a door stays closed while a button linked to it is held down, or stands open before its button has been pressed (guideline 4).
- **A box that jumps home unseen:** a box resting on another box's start tile is sent to its own start, without any sign, when that box is sent back; and a box picked up from inside a fizzler that is on goes back to its start with only the pickup sound (guideline 6).
- **A box under the subject:** a box sent back to its start while the subject stands there lands under it, the only way the two share a tile, and the subject must step off to pick it up from beside it (guideline 7).
- **A shot that does nothing:** the portal keys do nothing, without a sound, while the subject stands in a fizzler that is on (guideline 13).
- **A button slid over:** a slide over a button doesn't press it, so what the button opens stays shut as the subject slides past (guideline 20).
- **A move that only turns:** a slide that would loop through two portals forever is refused, with the error sound, and the subject only turns the way pressed (guideline 24).
- **A ray slid through:** a slide through a ray doesn't cut it, so its receiver stays lit as the subject slides past (guideline 31).

### Something is lost without warning

- **Fizzled by the subject's own step:** stepping off a fizzler's button, crossing a portal from it, or picking its box up from the fizzler's tile switches the fizzler on under the subject: both portals close and a carried box breaks up (guideline 3).
- **A portal closing by itself:** a portal facing a fizzler closes when the fizzler switches on, and one on a blocked wall closes, without a sound, when the wall is blocked again (guidelines 2 and 13).
- **Fizzled on the way:** a slide over a fizzler that is on closes both portals and breaks up a carried box, though the subject doesn't stop there (guideline 21).

### The puzzle is bypassed

- **A box delivered by its start tile:** a box sent back lands on its start tile wherever that is, so a start beyond a barrier delivers it past the barrier, and a start on a button presses the button from anywhere (guideline 6).
- **A portal route the design didn't intend:** shots fly over lasers, ditches, boxes and arrows, so a portal can skip a laser, a ditch or a one-way passage (guidelines 14 and 34).
- **A pass through a blocked element:** a closed door, an open ditch, or a laser or a light barrier that is on, switched under the subject, lets it walk out the far side without holding the button (guidelines 1, 2 and 22).

The rules already keep out the rest, so a design never needs to guard against them: the subject coming out of a portal onto a tile it couldn't walk onto, into a doorway or onto the exit; a box lying in a closed door, over an open ditch, or in a laser, a light barrier or a fizzler that is on; a box on the exit or a switch, two boxes on one tile, or the subject on a box, but for a box sent back to its start under it; a carried box inside a fizzler that is on; and the subject leaving the chamber. A layout that starts in a broken state is rejected by the chamber check.

## Never switch something under the subject

Releasing a button, or a receiver going dark, closes or switches back on what it holds open, even under the subject. The rules leave the subject unharmed, but it is left standing in a closed door, over an open ditch, or inside a laser or a light barrier, which looks broken, and it can then walk out the far side, past the element, without holding the button.

Arrows are the exception: an arrow a link turns may turn under the subject. The subject turns with it, so nothing looks broken, and it can then leave only the arrow's new way, so it walks past nothing. Guideline 16 still holds, for both ways the arrow can point.

1. Don't put a button next to an element it links that keeps the subject out while blocked: a door, a ditch, a laser, a light barrier or the exit. Stepping off the button onto the element closes it under the subject, and so does picking up, from the element's tile, the box holding the button down. Stepping onto the exit completes the chamber even as it closes, so its button would never need a box.
2. Don't let a portal carry the subject straight from a button onto such an element: if a button stands in front of a wall side that can take a portal, no wall side facing one of its linked ditches, lasers or light barriers should take one. Doors and the exit are safe, since a wall side facing one never takes a portal. Nor should any side of a blocked wall the button links take one: crossing from the button out of a portal there blocks the wall again, which closes that portal, and the way back with it.
3. A fizzler next to its own button fizzles the subject as it steps off: both portals close and a carried box breaks up. So does picking the button's box up from the fizzler's tile, and crossing from the button out of a portal facing the fizzler, so if the button stands in front of a wall side that can take a portal, no wall side facing the fizzler should take one. Use these only as a deliberate trap.

## Links

4. Don't link an element to a button or a receiver and to anything else that switches it, another button, a receiver or a switch, directly or through a group. A button acts only when it goes down or comes up, and a receiver only when it lights or goes dark, and coming up or going dark blocks its links whatever else holds them: with two buttons on one door, releasing either closes the door while the other is still held, and one step from one button onto the other can end with the door closed under a pressed button. An element a button or a receiver links should also start blocked, since one that starts unblocked stays open until the button has been pressed and released, or the receiver lit and darkened; an emitter starts on unless its file says `blocked: true`, so one a link switches on needs it. This holds for an arrow a link turns too: one button, receiver or switch per arrow.

## Boxes

5. A box that breaks up or falls goes back to its start tile: a fizzler destroys a box carried into it, and a door closing, a ditch opening, or a laser, a light barrier or a fizzler switching on destroys a box lying there. Keep each box's start tile within reach, from a tile beside it, for as long as the box is needed, with a way from there to where it is needed that crosses no fizzler that is on.
6. A box's start tile is where it lands, from anywhere, each time it is sent back, so make it a place where a box may appear at any time: not beyond a barrier the box shouldn't cross, and not on a button unless pressing it then is meant. A box resting on another box's start tile is sent to its own start, without any sign, when that box lands, so keep start tiles off the natural places to put a box down. Keep them off a fizzler's neighbours too, where picking the box up from inside the field only plays the pickup sound.
7. Don't let a box be sent back to its start while the subject stands there. Keep each box's start off the tiles from which the subject puts a box on, or takes one off, a button whose links send that box back or destroy it (a door, a ditch, a laser, a light barrier or a fizzler where it lies), and off the tiles the subject stands on while such a link can switch. Otherwise the box lands under the subject, which must step off and pick it up from beside it.
8. A box is put down only on the tile the subject faces; when that tile can't take it, the key is refused. Holding the turn key faces the subject any way without moving, so a box can go on any tile next to one the subject can stand on, if that tile can take it; only an arrow tile, where the subject can face nothing but the arrow's way, limits which way it faces; on an arrow a link turns, that way changes as it turns. Don't count on the way the subject walked in to keep a box off a tile.
9. A box bars its tile: a box put down, or sent back, in a one-tile passage, a doorway or on a button closes that tile to the subject until it is picked up from beside it. Make sure a tile beside it, from which the subject can face it and pick it up, stays reachable; on an arrow tile the subject faces only the arrow's way, which on an arrow a link turns changes as it turns.
10. Send a box back with a switch, not a button or a receiver: a button sends it back when pressed and a receiver when it lights, but releasing the button or darkening the receiver does nothing (the chamber check warns).
11. Keep the chamber within the solver's state key, 64 bits: `npm run solve` prints each chamber's width (today's use 18 to 53 bits). Each box adds about 8 bits, a mirror box included, and each element a link reaches 1, an emitter included; receivers and rays add none.

## Portals

12. Some wall sides never take a portal: those facing a door or the exit, those behind the end plate of a run of lasers or light barriers, every face of an emitter or a receiver, and, on a wall tile that already holds a portal, every side but the opposite one. Don't plan a route that needs one.
13. A fizzler switching on closes a portal facing it, so a portal in front of a fizzler lasts only while the fizzler is off, and a portal on a blocked wall lasts only while the wall isn't blocked, closing without a sound. While the subject stands in a fizzler that is on, the portal keys do nothing, without a sound, so don't put one where the player would stand to aim.
14. Shots fly over lasers and ditches, even on or open, and over boxes, buttons, switches, arrows and rays; only a wall, a closed door or exit, and a fizzler or a light barrier that is on stop one. Check which wall sides each part of the chamber can shoot, since a portal can skip a laser, a ditch or a one-way passage.

## Dead ends

15. Steps can't be taken back, so a stuck player's only way out is Restart chamber. Avoid dead ends a player can walk into without noticing, such as an arrow leading into a pocket with no way back. A chamber that can be lost on purpose should make it obvious.
16. On an arrow, only its own way does anything, so the tile it points to must always let the subject on: not a wall without a portal it can cross, nor an arrow pointing back, nor a door, ditch, laser or light barrier that can be blocked while the subject stands on the arrow, above all one whose button the subject leaves by stepping onto the arrow. A portal facing an arrow tile only lets the subject out, and only when the arrow points away from the wall: the subject can never walk back into it. An arrow a link turns must follow this for both ways it can point, for as long as the subject can stand on it pointing that way, including right after it turns under the subject.
17. A part of the chamber the subject reaches only by portal needs a way back: a wall side it can shoot from inside that brings it out again, and the portal it came out of must not close behind it (guidelines 2 and 13).
18. The subject can't shoot while carrying a box, nor put the box down while standing on a switch, or where no tile it can face can take it, so a pocket it can enter carrying a box needs a tile there to put the box down, next to one the subject can stand on and face it from.

## Slide floors

19. A slide stops only on a tile that isn't slide floor, or in front of something the subject couldn't walk onto: a wall without a portal it can go through, a closed door or exit, an open ditch, a laser or a light barrier that is on, an arrow pointing another way, or a resting box. Work out where each slide stops from every tile it can start from, each way, and remember that a box the player can move changes that: a resting box stops a slide on the tile before it, which makes boxes a tool for choosing where a slide ends. Mid-slide, a portal the subject can't come out of (a box, an open ditch or a laser that is on in front of the other portal) stops the slide in front of it, silently, where the same crossing from rest is refused with the error sound.
20. A button on slide floor is pressed only by a box or by the subject stopping on it, which there means a slide ending on it; a slide over it doesn't press it. Put a button where slides end (against a wall, before a box, at the end of a lane) or on plain floor, unless sliding over it unpressed is the point.
21. A fizzler that is on fizzles the subject as a slide passes it: both portals close and a carried box breaks up, and the slide goes on. Treat a fizzler across a lane as one the subject walks into, and don't make the way out of a slide room depend on a portal that a fizzler in the room can close.
22. Guideline 1 reaches along every lane that starts next to a button: sliding off a button, the subject can end its slide on an element the button links (an open door, a bridged ditch, or a laser or a light barrier that is off on a tile that isn't slide floor), which then switches under it as the slide ends.
23. From rest on slide floor, a move onto more slide floor slides again, so the subject stops only where something stops it. Make sure every tile a slide can stop on has a move off it that leads somewhere new, so a room or lane of slide floor can't trap the subject in slides that only bring it back (guideline 15).
24. A slide that would enter the same tile the same way twice, looping through two portals, is refused as a whole: the error sound plays and the subject only turns the way pressed, which reads as a bug unless the chamber shows it. Don't let a chamber's natural moves set up such a loop by surprise.
25. A portal can only be shot at a wall from that wall's own row or column, so the portal that starts a slide into a lane is aimed from somewhere on the lane's line. If the subject should reach the lane only out of that portal, the spot to aim from must lie past something shots fly over but the subject can't cross, such as a ditch at the lane's far end; from anywhere else on the line it could simply walk or slide into the lane. The slide out of the portal then stops at the ditch, so put the way on (the exit, or the next spot to aim from) beside that tile.

## Turnable arrows

26. A turntable shows that an arrow turns, not which way it will point. Let the player see it turn, with its button or switch in view or an antline to it, before a route depends on its turned way.
27. An arrow is entered only moving the way it points now, so a fixed arrow pointing into a turnable one freezes the subject on it once the turnable one turns away (guideline 16). Reach a turnable arrow from plain floor, making it the gate of a run of arrows rather than its last arrow.
28. A turnable arrow whose button lies right behind it, the way it turns to, can be entered only from that button, and only by the subject standing there; stepping off the button turns the arrow back, so it always sends the subject on its own way. A box on that button holds the arrow turned but takes the one tile it is entered from, so the box seals it rather than opening it.

## Rays

29. A receiver holds its links open only while its ray reaches it, and the subject cuts a ray by standing in it, so a ray must not cross anything its own receiver holds open: a door, the exit, a bridged ditch, or a laser or a light barrier held off. Stepping there cuts the ray, and the receiver going dark switches the element under the subject (guideline 1). A closed door, the closed exit and a light barrier that is on also stop rays, so cutting the ray anywhere before such an element, even a tile away, shuts it for good, unless another ray can reach the receiver (fixture `ray_held_door_closes_behind_subject`). Nor let a ray cross every tile from which the subject can enter something its receiver holds open: standing in the ray, the subject holds it shut, so it can never step in.
30. A resting box stops a ray on its tile and a resting mirror box turns it a quarter turn, so a box the player can move changes where rays run. Work out each ray with each box wherever it can be put down, or sent back to (guideline 6), and with each portal pair the player can open, since a ray goes through portals as the subject does. A box put down in a ray cuts it within the step, and picking it up lets it on; a carried mirror box turns nothing, since the subject stops the ray first.
31. A ray passes everything else on the floor, on or off: ditches, fizzlers, lasers, slide floors, arrows, buttons and switches, and it presses no button it crosses. It counts only once a step settles: a slide passing through a ray doesn't cut it, while one that stops in it, or a crossing that comes out into it, does. A ray meant to be cut by a slide must cross a tile where the slide stops (guideline 20).

## Antlines

32. Draw antlines in the tutorial and the early chambers, from each button, switch or receiver to what it links, so the player learns how links work; later chambers can leave them out.

## The exit

33. The exit stands in the chamber's outer wall, away from its corners (the chamber check rejects it anywhere else), and the subject walks out through it, on past the chamber's edge, only when it steps onto it heading out of the chamber. Give it a straight way in from the tile inside it, and don't put a door in the outer wall beside it: stepping sideways from that doorway onto the exit, the subject just stops there.

## Checking a chamber

34. Record its solution by playing it through (Download solution in the completion dialog, in `npm run dev`), and record it again after any change to the chamber but its antlines.
35. Run `npm run chamber:check` and `npm run replay:check`. `npm run solve -- --par src/chambers/chamber_N.json --max-states=40000000` finds the fewest moves and the fewest portals, which shows any shortcut the design didn't intend. To check that no route skips an element, solve a copy of the chamber with the links to it removed, using `--solvable`: it should come back unsolvable. The macro search behind `--par` and `--solvable` refuses a chamber with a receiver, since the subject cuts rays by walking: there, look for shortcuts with `--baseline` where it finishes, and by hand where it doesn't. A chamber the solver can't finish, or refuses, is solved and checked by hand as `docs/solving_by_hand.md` describes.
