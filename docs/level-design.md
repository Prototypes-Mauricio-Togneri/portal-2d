# Level Design

Guidelines for designing a chamber (`src/chambers/`), beyond what the chamber check rejects (`docs/elements.md`, "What the validator rejects"). The rules allow everything below, and nothing checks these guidelines: they keep the player out of states that look broken, keep each chamber fair, and keep it checkable. Break one only on purpose.

## Never switch something under the subject

Releasing a button closes or switches back on what it holds open, even under the subject. The rules leave the subject unharmed, but it is left standing in a closed door, over an open ditch, or inside a laser or a light barrier, which looks broken.

1. Don't put a button next to an element it links that keeps the subject out while blocked: a door, a ditch, a laser or a light barrier. Stepping off the button onto the element closes it under the subject, and so does picking up, from the element's tile, the box holding the button down.
2. Don't let a portal carry the subject straight from a button onto such an element: if a button stands in front of a wall side that can take a portal, no wall side facing one of its linked ditches, lasers or light barriers should take one. Doors are safe, since a wall side facing a door never takes a portal.
3. A fizzler next to its own button fizzles the subject as it steps off: both portals close and a carried box breaks up. Use it only as a deliberate trap.

## Boxes

4. A box that breaks up or falls goes back to its start tile: a fizzler destroys a box carried into it, and a door closing, a ditch opening, or a laser, a light barrier or a fizzler switching on destroys a box lying there. Keep each box's start tile reachable for as long as the box is needed.
5. Send a box back with a switch, not a button: a button sends it back when pressed, but releasing it does nothing (the chamber check warns).
6. Keep the chamber within the solver's state key, 64 bits: `npm run solve` prints each chamber's width (today's use 29 to 53 bits). Each box adds about 8 bits, and each element a link reaches 1.

## Portals

7. Some wall sides never take a portal: those facing a door or the exit, those behind the end plate of a run of lasers or light barriers, and, on a wall tile that already holds a portal, every side but the opposite one. Don't plan a route that needs one.
8. A fizzler switching on closes a portal facing it, so a portal in front of a fizzler lasts only while the fizzler is off.

## Dead ends

9. The controls legend doesn't show Undo yet, so a stuck player may only know Restart chamber. Avoid dead ends a player can walk into without noticing, such as an arrow leading into a pocket with no way back. A chamber that can be lost on purpose should make it obvious.

## Antlines

10. Draw antlines in the tutorial and the early chambers, from each button or switch to what it links, so the player learns how links work; later chambers can leave them out.

## Checking a chamber

11. Record its solution by playing it through (Download solution in the completion dialog, in `npm run dev`), and record it again after any change to the chamber but its antlines.
12. Run `npm run chamber:check` and `npm run replay:check`. `npm run solve -- --par src/chambers/chamber_N.json --max-states=40000000` finds the fewest moves and the fewest portals, which shows any shortcut the design didn't intend.
