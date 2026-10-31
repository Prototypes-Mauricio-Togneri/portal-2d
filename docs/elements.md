# Chamber Elements

Reference for the elements a chamber file (`src/chambers/*.json`) can contain, carried over from the original game's help page.

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
