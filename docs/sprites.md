# Chamber Sprites

The art the chamber is drawn from: one image file per sprite, which the game composes tile by tile, choosing each by its element's state and its neighbours. This is the spec to draw them to.

The game draws the chamber and the home menu's map from these files. A sprite whose file is missing, can't be decoded or has the wrong size isn't drawn at all, so `npm run assets:check` (part of `npm run verify`, which every deploy runs) fails when a sprite has no file, more than one, or one of a size its shape doesn't allow. In `npm run dev`, a file in the folder that isn't a sprite's, or of the wrong size, is logged as an error in the browser's console.

## Files

- **Folder:** `src/assets/images/chamber/`. The loading screen downloads every file in it, so keep nothing else there.
- **Name:** exactly as listed under [the set](#the-set), with `.webp` (smaller, preferred) or `.png`. One file per name.
- **Transparency:** everything around the drawn object is fully transparent. The floor, the three strips, `ditch_bridged`, `door_closed` and `exit_closed` fill their tiles.
- **Weight:** WebP at high quality; the whole set is about 200 KB.

## Size

- **Tile:** 256 × 256 px. The game shrinks each sprite once to the tile size on screen: about 40 px for chamber 1 on a 1080p screen, about 170 px for the tutorial on a high-DPI screen, and smaller still in the home menu's map.
- **Overhang:** a sprite that spills past its tile (a glow, a portal reaching into the room) is 384 × 384 px: its tile is the centred 256 px square, with 64 px of margin on every side. Any sprite but a strip may overhang; the game tells by the file's size.
- **Strips:** `wall`, `blocked_wall` and `ditch` are 1280 × 256 px, five tiles side by side (see [joins](#joins)).
- **Any other size** is refused, and the sprite isn't drawn.

## Look

- **View:** straight down, no perspective. A wall shows its top, never a front face.
- **Light:** from directly overhead, so every side of an object is shaded the same: no highlight on one side, no shadow on the other.
- **Shadows:** don't draw a shadow falling outside the object. The game adds one shared drop shadow, made from each sprite's shape, under what stands raised (walls, blocked walls, closed doors, the closed exit, switches, boxes, the subject): a soft dark rim all round, with no offset, since the light is overhead. Walls cast theirs as one mass, so a run of walls has one shadow along its open sides.
- **Readable small:** every sprite must still read at 40 px. On and off must differ at a glance, and the subject's facing must show from its shape alone.
- **Colours:** the ones that carry a meaning are listed here and copied by hand into the CSS tokens (`src/assets/styles.css`), since the menus use the same colours (crimson, teal, cyan and amber, which they don't use, have no token). Keep blue and orange off every other sprite, so nothing is mistaken for a portal; the exceptions are the fizzler's see-through cobalt (30, 80, 210 at 62 %), deeper than the blue portal and with no edge lines, and the subject's orange jumpsuit and blue-lit portal gun (see [the subject](#the-subject)). The antlines, drawn in code, keep off them too: their cyan is clear of the blue portal and of the light barrier's teal, and their amber yellower than the orange portal. Changing one of these means redrawing the sprites that use it, along with its CSS token.

| # | Colour | RGB | Used for |
|---|--------|-----|----------|
| 1 | Blue | 40, 140, 220 | The blue portal, and a missed blue shot's ripple, drawn by the game in code (see [miss](#miss)) |
| 2 | Orange | 255, 160, 30 | The orange portal, and a missed orange shot's ripple |
| 3 | Red | 220, 60, 50 | The floor button (caution) |
| 4 | Green | 40, 200, 130 | A completed chamber's test-subject figure in the home menu; the subject's own sprite is painted in its own colours (see [the subject](#the-subject)) |
| 5 | Crimson | 235, 30, 55 | Lasers, and the lit slot of their end plates |
| 6 | Teal | 96, 222, 186 | The light barrier's band, and the lit slots of its connectors |
| 7 | Cyan | 72, 176, 185 | An unlit antline's dots, drawn by the game in code, each with a border 30 % darker (50, 123, 130) (see [antlines](#antlines)) |
| 8 | Amber | 250, 194, 44 | A lit antline's dots, each with a border 30 % darker (175, 136, 31) |

## Turning

A sprite with a direction is drawn once, one way, and the game turns it in quarter turns. The light is overhead, so a turned sprite stays correctly lit. Every sprite not listed here is never turned.

| # | Sprites | Drawn | Turned |
|---|---------|-------|--------|
| 1 | `subject` | Facing up, towards the top of the screen | To the way the subject faces |
| 2 | `arrow` | Pointing up: the one way the subject may enter its tile | To the arrow's way |
| 3 | `portal_blue`, `portal_orange` and their glows | On the top edge of its wall tile, opening up onto the tile above: a flat oval lying on the wall's slope, from just inside the tile's edge to the slope's lit lip, short enough to stay clear of the diagonals where two slopes meet at a wall's end; the glow centred on it | To the side of the wall it opens on |
| 4 | `laser_on`, `laser_glow` | A beam running left to right through the tile's middle, touching both side edges, so neighbouring laser tiles make one beam | A quarter turn for a vertical laser; two lasers crossing on a tile are both drawn |
| 5 | `light_barrier_on` | A band running left to right through the tile's middle, touching both side edges, so neighbouring light barriers make one band | A quarter turn for a vertical light barrier |
| 6 | `laser_end_on`, `laser_end_off`, `light_barrier_end_on`, `light_barrier_end_off` | At the left end of a beam or band running left to right: the plate on the tile's left edge, centred on it | To each end of each run of lasers, or of light barriers, on the run's end tile: as drawn at a left end, a half turn at a right end, a quarter turn at a top or bottom end |
| 7 | `door_closed`, `exit_closed`, `fizzler_on` | Across a gap in a wall running left to right: walls on its left and right, the way through going up and down | A quarter turn when more of what lines the gap lies above and below it than left and right: walls (blocked or not), the chamber's edge, doors, the exit, fizzlers, light barriers and ditches |
| 8 | `box`, while carried | As it lies on the floor | With the subject, to the way it faces |

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

- every open side gets the same bevel, 48 px wide all along, so a portal fits on it;
- the top surface's texture tiles seamlessly, any edge meeting any other;
- details (rivets, seams, lights) stay off the 128 px midlines and the tile edges, where they would be cut.

Outside the chamber counts as open, so walls along the chamber's edge are bevelled on their outer side too, and the chamber reads as a raised block with a finished border.

A blocked wall, which refuses portals, is drawn from its own strip, `blocked_wall`, while blocked, but joins every wall alike, so both kinds make one mass with one shadow, each tile cut from its own kind's strip. Its strip keeps the wall strip's shape exactly, bevels and seams in the same places, so where the two kinds meet their edges line up and only the surface changes. A blocked wall a link reaches is drawn with the walls as a wall, and while it is blocked its `blocked_wall` tile is painted over it among the blockers, so only its surface changes, with no mark of its own, the steel sliding apart into the walls beside it or shut when it is switched (see [sliding](#sliding)); one no link reaches never changes, so it is drawn with the walls in its own strip, or as a wall when it starts unblocked.

In the ditch strip, read "wall" as "open ditch" and "floor" as anything else. It shows the pit's inner sides, the same depth everywhere: 82 px wide, fading from the lit rim to near black, lined with seams that crowd closer together as they go down, so the pit reads as a deep shaft. A bridged ditch is drawn on its own (`ditch_bridged`) and ends the pit. While a ditch is switched it is drawn as part of the pit, its grate sliding in or out over it (see [sliding](#sliding)).

## The set

Every sprite is 256 px, or 384 px when it overhangs, except the three strips (1280 × 256 px) and the three glows (always 384 px).

| # | File | What it shows |
|---|------|---------------|
| 1 | `floor` | A floor tile. It repeats across the whole chamber, so its edges tile seamlessly |
| 2 | `wall` | The wall strip (see [joins](#joins)). Walls stop walking and take portals |
| 3 | `blocked_wall` | The strip of a blocked wall, which refuses portals: the wall's shape in brushed steel, darker than the wall, riveted in the middle of each quarter, so it reads apart from the wall at a glance |
| 4 | `ditch` | The open ditch strip: a pit. It stops walking but lets shots through |
| 5 | `ditch_bridged` | A ditch bridged over: walkable |
| 6 | `light_barrier_on` | A light barrier that is on: stops walking and shots. A see-through band of pale teal hard light, 96 px wide (teal at 64 % over a faint deep teal rim), with a faint honeycomb and bright edges, so it reads as a surface of light rather than a ray. It is light, not a solid block, so it casts no shadow. One that is off isn't drawn (its connectors are); switched, it fades out or in over about 0.25 s, as a laser does. Drawn over floor only |
| 7 | `light_barrier_end_on` | A light barrier's connector while it is on: a dark steel plate where the band starts or stops, a little taller than the band, its slot as long as the band and lit. Drawn at both ends of each run of light barriers, over the bands, fading with its band |
| 8 | `light_barrier_end_off` | The same connector with its slot dark: drawn at both ends of each run, on or off, under `light_barrier_end_on`, so the two must match but for the slot |
| 9 | `door_closed` | A closed door: stops walking and shots. Its two leaves meet on the tile's middle line (see [sliding](#sliding)). An open door isn't drawn, so its tile shows the floor |
| 10 | `exit_closed` | The exit, closed. Its two leaves meet on the tile's middle line, as a door's do. The open exit isn't drawn, so its tile shows the floor; walking onto it completes the chamber |
| 11 | `button_up` | A floor button, released |
| 12 | `button_pressed` | A floor button, held down by the subject or a box. A box on a button is drawn as on the floor, over it |
| 13 | `switch` | A switch, used with the interact key. It has no on or off |
| 14 | `box` | A box. Carried, it is drawn at half size in front of the subject and turned with it, so there is no carrying pose to draw |
| 15 | `fizzler_on` | A fizzler that is on: the subject walks through it and loses its portals and any box it carries; it stops shots. Drawn over the subject and every other element, so keep it see-through. A fizzler that is off isn't drawn (see [fizzle](#fizzle)) |
| 16 | `laser_on` | A laser beam that is on: stops walking, lets shots through. A beam that is off isn't drawn (its end plates are); switched, it fades out or in over about 0.25 s, its glow with it |
| 17 | `laser_glow` | The beam's glow (see [glow](#glow)) |
| 18 | `laser_end_on` | A laser's end plate while the laser is on: a small plate where the beam starts or stops, its slot lit. Drawn at both ends of each run of lasers, over the beams, fading with its beam |
| 19 | `laser_end_off` | The same plate with its slot dark: drawn at both ends of each run, on or off, under `laser_end_on`, so the two must match but for the slot |
| 20 | `arrow` | A floor arrow |
| 21 | `portal_blue` | The blue portal |
| 22 | `portal_orange` | The orange portal |
| 23 | `portal_blue_glow` | The blue portal's glow |
| 24 | `portal_orange_glow` | The orange portal's glow |
| 25 | `subject` | The test subject seen from above, facing up: an orange jumpsuit, holding the portal gun pointing the way it faces, which makes the facing unmistakable. Painted (see [the subject](#the-subject)) |

## Order

The game draws from the bottom up, each later row over the earlier ones:

| # | Drawn | Sprites |
|---|-------|---------|
| 1 | Floor | `floor` |
| 2 | Antlines | None: dotted lines, drawn in code (see [antlines](#antlines)) |
| 3 | Floor marks | `arrow` |
| 4 | Structure | `wall`, `blocked_wall` for the blocked walls no link reaches |
| 5 | Blockers | `blocked_wall` over the blocked walls a link reaches while blocked, `light_barrier_on`, then `light_barrier_end_*` over the bands, `ditch`, `ditch_bridged`, `laser_on`, then `laser_end_*` over the beams, `door_closed`, `exit_closed` |
| 6 | Fall | `box`, falling into an open ditch (see [fall](#fall)) |
| 7 | Portals | `portal_*` |
| 8 | Fixtures | `button_*`, `switch` |
| 9 | Items | `box` |
| 10 | Subject | `subject`, and a carried `box` at half size |
| 11 | Fields | `fizzler_on`, whole or in pieces (see [fizzle](#fizzle)) |
| 12 | Glow | `laser_glow`, `portal_*_glow` |
| 13 | Fizzle | `portal_*`, `box`, in pieces (see [fizzle](#fizzle)) |
| 14 | Miss | None: a missed shot's ripple, drawn in code (see [miss](#miss)) |

## Glow

The three glows are drawn over everything but a fizzle's pieces and a missed shot's ripple, and added to the colours beneath, so they brighten and never darken. Their strength pulses slowly, all together, between 60 % and full. Draw only the light, at full strength: colour fading to transparent, with no beam or portal in it. A missing glow file just means no glow. With reduced motion, and in the home menu's map and the gallery, the glow holds steady at 80 %.

## Fizzle

When the subject fizzles (it walks or crosses into a fizzler that is on, or one turns on under it), each portal it loses and a box it carries break up, and so does a portal on a wall side facing a fizzler that switches on, and a box lying where a door closes or a laser, a light barrier or a fizzler switches on (whole, where it lay; one the subject puts down there breaks up from its hands, at half size): the game cuts the sprite, as last drawn, into small square pieces, 9 across a tile, which round off into dots as they drift a short way out from its middle (0.15 of the sprite's side on average, 0.2 at most), shrink and fade in about 0.6 s, over everything but a missed shot's ripple. When a fizzler switches off, its field crumbles the same way in about 0.4 s, but in place, in its own layer: `fizzler_on` is cut into square pieces, 7 across, each rounding off into a circle as it starts to go, which shrink and fade where they are, one after another, leaving nothing; when it switches back on, they grow back in reverse, and one switched back part way turns back from where it is. There is nothing extra to draw, but the pieces show the sprite's own pixels, so a portal or box drawn as a thin outline breaks into very few. With reduced motion, and in the home menu's map and the gallery, nothing breaks up or forms.

## Fall

When a ditch opens under a box lying on it, or the subject puts a box down on an open ditch, and the ditch is still open once the step ends, the game draws the box falling into the pit (a box sent back to a button that bridges the ditch again breaks up instead, see [fizzle](#fizzle)), from its own sprite, so there is nothing extra to draw. It hangs where it was for a moment while the grate starts to slide away, then drops ever faster, shrinking towards the middle of the pit to a quarter of its size and fading into the dark, in about 0.45 s, without a shadow and inside its tile: over the ditch and its sliding grate, under everything standing on the floor. The box is drawn back at its start at once. With reduced motion, and in the home menu's map and the gallery, nothing falls.

## Miss

When a portal shot misses, the game draws a ripple in the shot's colour where it stopped, over everything, from no sprite: the face the shot met lights up as a line 0.84 of a tile long and 0.05 wide across the shot, fading in about 0.28 s, and two thin half rings, 90 ms apart, spread back towards the subject, from 0.2 to 0.8 of a tile along the face and up to 0.28 of a tile back, thinning and fading in about 0.42 s each, so all of it stays within the tile's width and is gone in about 0.52 s. It sits where a portal would have opened on a wall, 0.125 of a tile in; on the near edge of a door, the exit or a fizzler; on the near face of a light barrier's band when the band runs across the shot, or at its end on the tile's edge when it runs along it; and, for a shot that left the chamber through an open door or exit in its edge, just inside the doorway. A shot from inside a fizzler that is on does nothing, so draws nothing. With reduced motion, and in the home menu's map and the gallery, nothing ripples.

## Antlines

An antline is a dotted line on the floor from a button or switch to one element it links, as in the original game, drawn by the game in code from no sprite along the corners the chamber file gives (see `docs/elements.md`). Its dots, 3 per tile, one on each tile's middle, so each corner gets one, are 0.15 of a tile wide, each with a border 0.025 of a tile wide (never thinner than a pixel) drawn inside its edge, in its colour 30 % darker. It runs from the middle of the button's or switch's tile, whose sprite hides its start, to the edge of the element's tile, its last dot 1/6 of a tile before it, the same whether the element is drawn or not. It lies over the floor and under everything else, so the floor marks, the walls with their shadow and every element hide it where it runs under them, and it shows again beyond. It is cyan while unlit, and amber, lit, while the element it leads to is unblocked: a door or the exit open, a laser, a light barrier or a fizzler off, a ditch bridged, a blocked wall taking portals; a line to a box never lights. Unlit lines are drawn first, lit ones over them. The colour changes at once with the step, with no fade, so reduced motion changes nothing; the home menu's map and the gallery show them too.

## Sliding

When a door or the exit opens or closes, it slides over about 0.3 s: the game draws `door_closed` (or `exit_closed`) cut down its middle over the floor, each half slid out to its side and cut off at the tile's edge, as if going into the wall, until nothing is left. So the closed sprite's two leaves must meet on the tile's middle line.

A blocked wall a link reaches slides the same way when it is switched, over about 0.3 s: its `blocked_wall` tile, joined as it is drawn, is cut down its middle over the wall beneath it, each half slid into the wall beside it, along the run of walls it lies in (up and down when more walls lie above and below it than left and right), until only the wall is left, and back when it is blocked again.

A ditch switched slides its grate over about 0.3 s: the ditch is drawn as part of the pit, and `ditch_bridged`, whole, slides in over it from one side, cut off at the tile's edge, as if coming out from under the floor, or back out the same way. It never comes from another ditch unless ditches lie on all four sides: in a row of ditches running left to right it comes from above (from below when a ditch lies above), and otherwise from the left (from the right when a ditch lies left). A ditch switched alone among open ditches stays part of their pit while it changes, so their rims beside it go as soon as it starts to open and appear only once its grate is fully in.

There is nothing extra to draw. With reduced motion, and in the home menu's map and the gallery, nothing slides.

## The subject

The subject is the one sprite not drawn in code. It is a painted image that breaks this spec on purpose: its light is painted, not straight overhead; the subject wears orange and its portal gun glows blue, the portals' colours; and its source is the painted PNG `art/sprites/subject.png` (1526 × 1526 px), with no SVG.

It is one still image: the subject glides from tile to tile and through portals, with no walking frames.

It is exported centred as painted, padded to a 1648 px square so the figure stands 238 px tall in the 256 px tile, cleared of faint stray pixels (alpha under 3 %) and shrunk to the tile. The portal gun makes the painting top-heavy, so the subject turns about a point on its head, a little above the head's middle. To export it again, from the project's root:

```sh
convert art/sprites/subject.png -channel A -level 3%,98% +channel -background none -gravity center -extent 1648x1648 -resize 256x256 -quality 90 -define webp:alpha-quality=100 src/assets/images/chamber/subject.webp
```

## Not in the set yet

- **Decorations** not tied to the rules, such as lights along the outer wall, hazard stripes at wall ends and scuffs on the floor.
- **Animation frames:** sprites are still images, and the game moves them.

## Trying a sprite

Drop the file into the folder, and `npm run dev` picks it up. The sprite gallery, at `/src/dev/sprite_gallery.html` in `npm run dev`, reloads by itself when a file lands and shows:

- each sprite as the game has it, at full size on a checkerboard, with its size and whether its file is in use, missing, not downloaded or refused (and why); one without a usable file shows as an empty frame, since the game draws nothing for it;
- a small chamber with every element and an antline, drawn by the game with everything on and with everything off (the antline unlit, then lit), the subject carrying a box and both portals open;
- every way walls and open ditches meet;
- each chamber at its start.

The small chamber and the walls and ditches come at the smallest tile the home menu's map draws, then at 40, 100 and 230 px, and each chamber at 40 px, each canvas pixel on one screen pixel.
