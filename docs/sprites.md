# Chamber Sprites

The art the chamber is drawn from: one image file per sprite, which the game composes tile by tile, choosing each by its element's state and its neighbours. This is the spec to draw them to.

The game loads these files, but doesn't draw the chamber from them yet: the compositor that will is being built (`todo/03_look_and_sound.md`, Phase B). A sprite whose file is missing, can't be decoded or has the wrong size gets a placeholder made by code (the original flat drawing, switched-off elements faded) instead, so the sprites can arrive one at a time. In `npm run dev`, a file in the folder that isn't a sprite's, or of the wrong size, is logged as an error in the browser's console.

## Files

- **Folder:** `src/assets/images/chamber/`. The loading screen downloads every file in it, so keep nothing else there.
- **Name:** exactly as listed under [the set](#the-set), with `.webp` (smaller, preferred) or `.png`. One file per name.
- **Transparency:** everything around the drawn object is fully transparent. The floor and the two strips fill their tiles.
- **Weight:** about 30 KB per tile (WebP at high quality), so the whole set stays near 1 MB.

## Size

- **Tile:** 256 × 256 px. The game shrinks each sprite once to the tile size on screen: about 40 px for chamber 1 on a 1080p screen, about 170 px for the tutorial on a high-DPI screen, and smaller still in the home menu's map.
- **Overhang:** a sprite that spills past its tile (a glow, a portal reaching into the room, a wide subject) is 384 × 384 px: its tile is the centred 256 px square, with 64 px of margin on every side. Any sprite may overhang; the game tells by the file's size.
- **Strips:** `wall` and `ditch` are 1280 × 256 px, five tiles side by side (see [joins](#joins)).
- **Any other size** is refused, and the placeholder drawn instead.

## Look

- **View:** straight down, no perspective. A wall shows its top, never a front face.
- **Light:** from directly overhead, so every side of an object is shaded the same: no highlight on one side, no shadow on the other.
- **Shadows:** don't draw a shadow falling outside the object. The game adds one shared drop shadow, made from each sprite's shape, under what stands raised (walls, raised barriers, closed doors and the exit, switches, boxes, the subject).
- **Readable small:** every sprite must still read at 40 px. On and off must differ at a glance, and the subject's facing must show from its shape alone.
- **Colours:** the ones that carry a meaning match the palette (`src/game/palette.ts`), since the menus use the same colours. Keep blue and orange off every other sprite, so nothing is mistaken for a portal. Changing one of these means redrawing the sprites that use it, along with its CSS token.

| # | Colour | RGB | Used for |
|---|--------|-----|----------|
| 1 | Blue | 40, 140, 220 | The blue portal |
| 2 | Orange | 255, 160, 30 | The orange portal |
| 3 | Red | 220, 60, 50 | The floor button (caution) |
| 4 | Green | 0, 160, 100 | The subject |
| 5 | Pink | 252, 25, 150 | Lasers |

## Turning

A sprite with a direction is drawn once, one way, and the game turns it in quarter turns. The light is overhead, so a turned sprite stays correctly lit. Every sprite not listed here is never turned.

| # | Sprites | Drawn | Turned |
|---|---------|-------|--------|
| 1 | `subject` | Facing up, towards the top of the screen | To the way the subject faces |
| 2 | `arrow` | Pointing up: the one way the subject may enter its tile | To the arrow's way |
| 3 | `portal_blue`, `portal_orange` and their glows | On the top edge of its wall tile, opening up onto the tile above | To the side of the wall it opens on |
| 4 | `laser_on`, `laser_off`, `laser_glow` | A beam running left to right through the tile's middle, touching both side edges, so neighbouring laser tiles make one beam | A quarter turn for a vertical laser; two lasers crossing on a tile are both drawn |
| 5 | `door_*`, `exit_*`, `fizzler_*` | Across a gap in a wall running left to right: walls on its left and right, the way through going up and down | A quarter turn when the walls beside it are above and below it |

## Joins

Walls and open ditches join their neighbours: a run of walls reads as one raised mass, bevelled only where it meets something else, and a run of open ditches as one pit. Each comes as a strip of five tiles, which the game cuts into 128 px quarters. Each quarter of each tile is taken from the strip tile that matches three neighbours: the two tiles beside its corner and the one diagonal between them.

| # | Strip tile | Shows | Gives the quarters where |
|---|------------|-------|--------------------------|
| 1 | Lone | One wall tile with floor all round | Both tiles beside the corner are open |
| 2 | Horizontal run | Walls left and right, floor above and below | The tile above or below is open, the one left or right is wall |
| 3 | Vertical run | Walls above and below, floor left and right | The tile left or right is open, the one above or below is wall |
| 4 | Inner corners | Walls on all four sides, floor on all four diagonals | Both tiles beside the corner are wall, the diagonal open |
| 5 | Solid | Wall all round | Both tiles beside the corner and the diagonal are wall |

For example, a wall tile's top-left quarter comes from strip tile 2 when the tile above it is floor and the tile to its left is wall.

Quarters from different strip tiles end up side by side, so:

- every open side gets the same bevel, the same width all along;
- the top surface's texture tiles seamlessly, any edge meeting any other;
- details (rivets, seams, lights) stay off the 128 px midlines and the tile edges, where they would be cut.

Outside the chamber counts as wall, so walls along the chamber's edge show no bevel on their outer side.

In the ditch strip, read "wall" as "open ditch" and "floor" as anything else. It shows the pit's inner sides, the same depth everywhere. A bridged ditch is drawn on its own (`ditch_bridged`) and ends the pit.

## The set

Every sprite is 256 px, or 384 px when it overhangs, except the two strips (1280 × 256 px) and the three glows (always 384 px).

| # | File | What it shows |
|---|------|---------------|
| 1 | `floor` | A floor tile. It repeats across the whole chamber, so its edges tile seamlessly |
| 2 | `wall` | The wall strip (see [joins](#joins)). Walls stop walking and take portals |
| 3 | `ditch` | The open ditch strip: a pit. It stops walking but lets shots through |
| 4 | `ditch_bridged` | A ditch bridged over: walkable |
| 5 | `barrier_raised` | A raised barrier: stops walking and shots. Drawn over floor or over a wall tile, so it must read on both |
| 6 | `barrier_lowered` | A lowered barrier, flush: walkable, lets shots through |
| 7 | `door_closed` | A closed door: stops walking and shots |
| 8 | `door_open` | An open door, its leaves drawn back |
| 9 | `exit_closed` | The exit, closed |
| 10 | `exit_open` | The exit, open: walking onto it completes the chamber |
| 11 | `button_up` | A floor button, released |
| 12 | `button_pressed` | A floor button, held down by the subject or a box. A box on a button is drawn at half size, centred, so the button's rim must show around it |
| 13 | `switch` | A switch, used with the interact key. It has no on or off |
| 14 | `box` | A box. Carried, it is drawn at half size in front of the subject and turned with it, so there is no carrying pose to draw |
| 15 | `fizzler_on` | A fizzler that is on: the subject walks through it and loses its portals and any box it carries; it stops shots. Drawn over everything, so keep it see-through |
| 16 | `fizzler_off` | A fizzler that is off: its emitters dark, no field |
| 17 | `laser_on` | A laser beam that is on: stops walking, lets shots through |
| 18 | `laser_off` | The same laser off: walkable. A faint trace shows where it would come back |
| 19 | `laser_glow` | The beam's glow (see [glow](#glow)) |
| 20 | `arrow` | A floor arrow |
| 21 | `portal_blue` | The blue portal |
| 22 | `portal_orange` | The orange portal |
| 23 | `portal_blue_glow` | The blue portal's glow |
| 24 | `portal_orange_glow` | The orange portal's glow |
| 25 | `subject` | The test subject seen from above, facing up. A face, visor or lit mark on its front makes the facing unmistakable |

## Order

The game draws from the bottom up, each later row over the earlier ones:

| # | Drawn | Sprites |
|---|-------|---------|
| 1 | Floor | `floor` |
| 2 | Floor marks | `arrow` |
| 3 | Structure | `wall` |
| 4 | Blockers | `barrier_*`, `ditch`, `ditch_bridged`, `laser_on`, `laser_off`, `door_*`, `exit_*` |
| 5 | Portals | `portal_*` |
| 6 | Fixtures | `button_*`, `switch` |
| 7 | Items | `box` |
| 8 | Subject | `subject` |
| 9 | Fields | `fizzler_*` |
| 10 | Glow | `laser_glow`, `portal_*_glow` |

## Glow

The three glows are drawn last, over everything, and added to the colours beneath, so they brighten and never darken. Their strength pulses slowly. Draw only the light: colour fading to transparent, with no beam or portal in it. A missing glow file just means no glow. Fizzlers shimmer by code, from `fizzler_on` itself. With reduced motion, the glow holds steady and nothing shimmers.

## Not in the set yet

- **Decorations** not tied to the rules, such as lights along the outer wall, hazard stripes at wall ends and scuffs on the floor.
- **A wall that refuses portals** is drawn like any wall until a chamber uses one. It then gets a strip of its own.
- **Animation frames:** sprites are still images, and the game moves them.

## Trying a sprite

Drop the file into the folder, and `npm run dev` picks it up. Once Phase B's gallery is built, it shows each sprite in every state and join, at several sizes, and can save any placeholder as a PNG to draw over.
