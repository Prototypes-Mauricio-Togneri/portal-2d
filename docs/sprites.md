# Chamber Sprites

The art the chamber is drawn from: one image file per sprite, which the game composes tile by tile, choosing each by its element's state and its neighbours. This is the spec to draw them to.

The game draws the chamber and the home menu's map from these files. A sprite whose file is missing, can't be decoded or has the wrong size isn't drawn at all, so `npm run assets:check` (part of `npm run verify`, which every deploy runs unless forced with `-f`) fails when a sprite has no file, more than one, or one of a size its shape doesn't allow. In `npm run dev`, a file in the folder that isn't a sprite's, or of the wrong size, is logged as an error in the browser's console.

## Files

- **Folder:** `src/assets/images/chamber/`. The loading screen downloads every file in it, so keep nothing else there.
- **Name:** exactly as listed under [the set](#the-set), with `.webp` (smaller, preferred) or `.png`. One file per name.
- **Transparency:** everything around the drawn object is fully transparent. The floor, `slide_floor`, the three strips, `ditch_bridged`, `door_closed` and `exit_closed` fill their tiles; the rest don't, the emitters' and receivers' housings included, which leave the wall they sit on showing round them.
- **Weight:** WebP at high quality; the whole set is about 240 KB.

## Size

- **Tile:** 256 × 256 px. The game shrinks each sprite once to the tile size on screen: about 40 px for chamber 1 on a 1080p screen, about 125 px for the tutorial on a high-DPI 1920 × 1080 screen (a chamber under 16 tiles either way gets the tiles a 16 × 16 one would), and smaller still in the home menu's map.
- **Overhang:** a sprite that spills past its tile (a glow, a portal reaching into the room) is 384 × 384 px: its tile is the centred 256 px square, with 64 px of margin on every side. Any sprite but a strip may overhang; the game tells by the file's size.
- **Strips:** `wall`, `blocked_wall` and `ditch` are 1280 × 256 px, five tiles side by side (see [joins](#joins)).
- **Any other size** is refused, and the sprite isn't drawn.

## Look

- **View:** straight down, no perspective. A wall shows its top, never a front face.
- **Light:** from directly overhead, so every side of an object is shaded the same: no highlight on one side, no shadow on the other.
- **Shadows:** don't draw a shadow falling outside the object. The game adds one shared drop shadow, made from each sprite's shape, under what stands raised (walls, blocked walls, closed doors, the closed exit, switches, boxes, the subject): a soft dark rim all round, with no offset, since the light is overhead. Walls cast theirs as one mass, so a run of walls has one shadow along its open sides.
- **Readable small:** every sprite must still read at 40 px. On and off must differ at a glance, and the subject's facing must show from its shape alone.
- **Colours:** the ones that carry a meaning are listed here and copied by hand into the CSS tokens (`src/assets/styles.css`), since the menus use the same colours (crimson, teal, cyan, amber and pale gold, which they don't use, have no token). Keep blue and orange off every other sprite, so nothing is mistaken for a portal; the exceptions are the fizzler's see-through cobalt (30, 80, 210 at 62 %), deeper than the blue portal and with no edge lines, the dark cobalt (36, 48, 96) of its connectors' unlit slots, and the subject's orange jumpsuit and blue-lit portal gun (see [the subject](#the-subject)). The surface detail, drawn in code, is grey and faint throughout, so it carries no meaning (see [surface detail](#surface-detail)). The antlines, drawn in code, keep off them too: their cyan is clear of the blue portal and of the light barrier's teal, and their amber yellower than the orange portal. Changing one of these means redrawing the sprites that use it, along with its CSS token.

| # | Colour | RGB | Used for |
|---|--------|-----|----------|
| 1 | Blue | 40, 140, 220 | The blue portal, and a missed blue shot's ripple, drawn by the game in code (see [miss](#miss)) |
| 2 | Orange | 255, 160, 30 | The orange portal, and a missed orange shot's ripple |
| 3 | Red | 220, 60, 50 | The floor button (caution) |
| 4 | Green | 40, 200, 130 | A completed chamber's test-subject figure in the home menu; the subject's own sprites are painted in their own colours (see [the subject](#the-subject)) |
| 5 | Crimson | 235, 30, 55 | Lasers, and the lit slot of their end plates |
| 6 | Teal | 96, 222, 186 | The light barrier's band, and the lit slots of its connectors |
| 7 | Cyan | 72, 176, 185 | An unlit antline's dots, drawn by the game in code, each with a border 30 % darker (50, 123, 130) (see [antlines](#antlines)) |
| 8 | Amber | 250, 194, 44 | A lit antline's dots, each with a border 30 % darker (175, 136, 31) |
| 9 | Pale gold | 255, 228, 112 | A ray, drawn by the game in code, lightening through 255, 242, 186 to a white-hot core of 255, 252, 236, with a dark rim of its own shade (186, 148, 30), since a pale line nearly vanishes on the light floor without one; an emitter's lit lens and a receiver's lit eye |

## Turning

A sprite with a direction is drawn once, one way, and the game turns it in quarter turns. The light is overhead, so a turned sprite stays correctly lit. Every sprite not listed here is never turned.

| # | Sprites | Drawn | Turned |
|---|---------|-------|--------|
| 1 | `subject_holding_gun`, `subject_holding_box` | Facing up, towards the top of the screen | To the way the subject faces, and by any angle, with its shadow, while it turns |
| 2 | `arrow`, `turntable_arrow` | Pointing up: the one way the subject may enter its tile | To the way the arrow points. `turntable_arrow` is also turned by any angle while a link turns its arrow (see [turning arrows](#turning-arrows)), the one sprite turned by other than quarter turns; its `turntable` is never turned |
| 3 | `portal_blue`, `portal_orange` and their glows | On the top edge of its wall tile, opening up onto the tile above: a flat oval lying on the wall's slope, from just inside the tile's edge to the slope's lit lip, short enough to stay clear of the diagonals where two slopes meet at a wall's end; the glow centred on it | To the side of the wall it opens on |
| 4 | `emitter_on`, `emitter_off`, `receiver_lit`, `receiver_dark` | On the top edge of its wall tile, working face up, firing or listening onto the tile above: a housing on the wall's 48 px bevel, reaching 64 px into the tile, clear of the 128 px midlines where wall quarters join | To the face it fires from or listens on, as a portal is: as drawn for up, a quarter turn right for right, a half turn for down, a quarter turn left for left |
| 5 | `box_mirror` | Its mirror as `/`, from the bottom left corner to the top right | A quarter turn for a `\` mirror. A mirror keeps its way wherever its box goes, so nothing else turns it |
| 6 | `laser_on`, `laser_glow` | A beam running left to right through the tile's middle, touching both side edges, so neighbouring laser tiles make one beam | A quarter turn for a vertical laser; two lasers crossing on a tile are both drawn |
| 7 | `light_barrier_on` | A band running left to right through the tile's middle, touching both side edges, so neighbouring light barriers make one band | A quarter turn for a vertical light barrier |
| 8 | `laser_end_on`, `laser_end_off`, `light_barrier_end_on`, `light_barrier_end_off`, `fizzler_end_on`, `fizzler_end_off` | At the left end of a beam, band or field running left to right: the plate on the tile's left edge, centred on it, a fizzler's along the whole edge | To each end of each run of lasers, of light barriers, or of fizzlers across their gap, on the run's end tile: as drawn at a left end, a half turn at a right end, a quarter turn at a top or bottom end |
| 9 | `door_closed`, `exit_closed`, `fizzler_on` | Across a gap in a wall running left to right: walls on its left and right, the way through going up and down | A quarter turn when more of what lines the gap lies above and below it than left and right: walls (blocked or not), doors, the exit, fizzlers, light barriers and ditches. Outside the chamber lines no gap, since the way through a door or the exit in the edge leads out of it, so one in the edge is always turned along its wall |

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
| 1 | `floor` | A floor tile. It repeats across the whole chamber, so its edges tile seamlessly; the surface detail drawn over it keeps the tiles from reading alike (see [surface detail](#surface-detail)) |
| 2 | `slide_floor` | A slide floor tile: the floor a shade cooler (232, 235, 242 against the floor's 239, 241, 248) under the floor's texture, a little fainter, crossed by thin grey diagonal lines (168, 173, 186), six to a tile's width, that run on across neighbouring tiles, so a run of slide floor reads as one hatched surface. It keeps the floor's lip and groove, so every tile still reads as a tile, and its edges tile seamlessly |
| 3 | `wall` | The wall strip (see [joins](#joins)). Walls stop walking and take portals |
| 4 | `blocked_wall` | The strip of a blocked wall, which refuses portals: the wall's shape in brushed steel, darker than the wall, riveted in the middle of each quarter, so it reads apart from the wall at a glance |
| 5 | `emitter_on` | An emitter that is on, on its wall tile, which takes no portal on any face: a dark steel housing set into the wall's bevel at its firing face, a dark bezel at the face holding a slit lens lit pale gold, with a white-hot line and a soft halo, and three vents and two rivets behind it. Not raised: the wall under it casts the shadow. Its ray, drawn by the game in code, leaves from its face |
| 6 | `emitter_off` | The same housing with its lens dark, drawn while the emitter is off. The lens changes at once when a link switches the emitter, with its ray, so the two must match but for the lens |
| 7 | `receiver_lit` | A receiver a ray reaches, on its wall tile, which takes no portal on any face: the emitter's housing with a round eye in a dark socket at its listening face in place of the lens, so the two never read alike, its ring lit pale gold with a soft halo round a white-hot centre. Not raised, as the emitter isn't. Drawn over `receiver_dark` while a ray reaches it, fading out or in over about 0.25 s as it goes dark or lights, as a laser's end plates do |
| 8 | `receiver_dark` | The same housing with its eye dark: drawn on every receiver, lit or not, under `receiver_lit`, so the two must match but for the eye |
| 9 | `ditch` | The open ditch strip: a pit. It stops walking but lets shots through |
| 10 | `ditch_bridged` | A ditch bridged over: walkable |
| 11 | `light_barrier_on` | A light barrier that is on: stops walking and shots. A see-through band of pale teal hard light, 96 px wide (teal at 64 % over a faint deep teal rim), with a faint honeycomb and bright edges, so it reads as a surface of light rather than a laser's thin beam or an emitter's ray. It is light, not a solid block, so it casts no shadow. One that is off isn't drawn (its connectors are); switched, it fades out or in over about 0.25 s, as a laser does. Drawn over floor only |
| 12 | `light_barrier_end_on` | A light barrier's connector while it is on: a dark steel plate where the band starts or stops, a little taller than the band, its slot as long as the band and lit. Drawn at both ends of each run of light barriers, over the bands, fading with its band |
| 13 | `light_barrier_end_off` | The same connector with its slot dark: drawn at both ends of each run, on or off, under `light_barrier_end_on`, so the two must match but for the slot |
| 14 | `door_closed` | A closed door: stops walking and shots. Its two leaves meet on the tile's middle line (see [sliding](#sliding)). An open door isn't drawn, so its tile shows the floor |
| 15 | `exit_closed` | The exit, closed. Its two leaves meet on the tile's middle line, as a door's do. The open exit isn't drawn, so its tile shows the floor under the exit's shadow (see [exit shadow](#exit-shadow)); walking onto it completes the chamber |
| 16 | `button_up` | A floor button, released |
| 17 | `button_pressed` | A floor button, held down by the subject or a box. A box on a button is drawn as on the floor, over it |
| 18 | `switch` | A switch, used with the interact key. It has no on or off |
| 19 | `box` | A box. Carried, it isn't drawn: the subject's `subject_holding_box` shows it in its hands |
| 20 | `box_mirror` | A mirror box: the box with a mirror of glass from corner to corner in place of its disc, a dark frame round glass lit across its width, with a white glint along it. Drawn as `/` and turned a quarter turn for `\`. Resting, it turns a ray a quarter turn on its tile, the ray's corner hidden under it. Carried, it isn't drawn: `subject_holding_box` shows a box in the subject's hands, and the game draws the mirror's line over it in code, the right way round in the room whichever way the subject faces (see [the subject](#the-subject)) |
| 21 | `fizzler_on` | A fizzler that is on: the subject walks through it and loses its portals and any box it carries; it stops shots. Drawn over the subject and every other element, so keep it see-through. A fizzler that is off isn't drawn (its connectors are; see [fizzle](#fizzle)) |
| 22 | `fizzler_end_on` | A fizzler's connector while it is on: a thin dark steel plate, 20 px wide, along the whole edge of the tile where the field meets a wall, its slot as long as the plate but 14 px at each end, 8 px wide, 1 px in from the field side and lit pale (214, 228, 255, the field's sparks), its light spilling 25 px into the field, from 50 % to nothing. Drawn at both ends of each run of fizzlers across their gap, over the fields, fading with its field. No portal opens on the wall behind it (`docs/elements.md`) |
| 23 | `fizzler_end_off` | The same connector with its slot dark (36, 48, 96) and no light: drawn at both ends of each run, on or off, under `fizzler_end_on`, so the two must match but for the slot and its light |
| 24 | `laser_on` | A laser beam that is on: stops walking, lets shots through. A beam that is off isn't drawn (its end plates are); switched, it fades out or in over about 0.25 s, its glow with it |
| 25 | `laser_glow` | The beam's glow (see [glow](#glow)) |
| 26 | `laser_end_on` | A laser's end plate while the laser is on: a small plate where the beam starts or stops, its slot lit. Drawn at both ends of each run of lasers, over the beams, fading with its beam |
| 27 | `laser_end_off` | The same plate with its slot dark: drawn at both ends of each run, on or off, under `laser_end_on`, so the two must match but for the slot |
| 28 | `arrow` | A floor arrow |
| 29 | `turntable` | A turnable arrow's disc: the floor cut round under it, a disc a shade lighter than the floor (245, 246, 251) under the floor's texture, a little fainter, with a lit lip (253, 253, 255) just inside a dark cut (132, 136, 147), the same all round, so it shows that the arrow turns but not which way. Never turned |
| 30 | `turntable_arrow` | A turnable arrow's chevron: the floor arrow's (150, 153, 160) at 85 % of its size about the tile's middle, so a band of disc shows all round it at every angle. Keep it in step with `arrow` |
| 31 | `portal_blue` | The blue portal |
| 32 | `portal_orange` | The orange portal |
| 33 | `portal_blue_glow` | The blue portal's glow |
| 34 | `portal_orange_glow` | The orange portal's glow |
| 35 | `subject_holding_gun` | The test subject seen from above, facing up: an orange jumpsuit, holding the portal gun pointing the way it faces, which makes the facing unmistakable. Drawn while its hands are free. Painted (see [the subject](#the-subject)) |
| 36 | `subject_holding_box` | The same subject holding a box out in front of it in both hands, with no portal gun. Drawn while it carries a box. Painted (see [the subject](#the-subject)) |

## Order

The game draws from the bottom up, each later row over the earlier ones:

| # | Drawn | Sprites |
|---|-------|---------|
| 1 | Floor | `floor`, then `slide_floor` over it on the slide floors, then the floor's surface detail, drawn in code (see [surface detail](#surface-detail)), then the exit's shadow, drawn in code (see [exit shadow](#exit-shadow)) |
| 2 | Antlines | None: dotted lines, drawn in code (see [antlines](#antlines)) |
| 3 | Floor marks | `arrow` |
| 4 | Structure | `wall`, `blocked_wall` for the blocked walls no link reaches, then the walls' surface detail, drawn in code, before their shadow is made |
| 5 | Turnable arrows | `turntable`, then `turntable_arrow` over it, at the way the arrow points or part way through a turn, drawn every frame over the rows above |
| 6 | Blockers | `blocked_wall` over the blocked walls a link reaches while blocked, `emitter_on` or `emitter_off`, `light_barrier_on`, then `light_barrier_end_*` over the bands, `ditch`, `ditch_bridged`, `laser_on`, then `laser_end_*` over the beams, `door_closed`, `exit_closed`, `receiver_dark`, then `receiver_lit` over it |
| 7 | Fall | `box` or `box_mirror`, falling into an open ditch (see [fall](#fall)) |
| 8 | Portals | `portal_*`, growing open just after a shot opens one (see [opening](#opening)) |
| 9 | Fixtures | `button_*`, `switch` |
| 10 | Rays | None: each emitter's ray, drawn in code like a laser's beam, pale gold with a dark rim, from the emitter's face to where it stops, through portals and turning on mirror boxes; over the buttons and switches, under the boxes, the subject and the fields (see [rays](#rays)) |
| 11 | Items | `box`, `box_mirror` |
| 12 | Subject | `subject_holding_gun`, or `subject_holding_box` while it carries a box, with a mirror box's mirror marked over the box in code (see [the subject](#the-subject)) |
| 13 | Fields | `fizzler_on`, whole or in pieces (see [fizzle](#fizzle)), then `fizzler_end_*` over the fields |
| 14 | Glow | `laser_glow`, the rays' glow, drawn in code, held steady at 80 % and ending where its ray ends, then `portal_*_glow` |
| 15 | Fizzle | `portal_*`, `box`, `box_mirror`, in pieces (see [fizzle](#fizzle)) |
| 16 | Miss | None: a missed shot's ripple, drawn in code (see [miss](#miss)) |

## Glow

The three glow sprites are drawn over everything but a fizzle's pieces and a missed shot's ripple, and added to the colours beneath, so they brighten and never darken. Their strength pulses slowly, all together, between 60 % and full. Draw only the light, at full strength: colour fading to transparent, with no beam or portal in it. A missing glow file just means no glow. With reduced motion, and in the home menu's map and the gallery, the glow holds steady at 80 %.

The rays' glow, drawn in code from no sprite (see [rays](#rays)), is added with the glow sprites, after the lasers' and before the portals', but always held steady at 80 %, so a lit ray never needs a frame of its own. It is painted on a layer of its own, where each spot keeps its brightest, so a ray's corners and two rays crossing aren't lit twice, and kept until the rays run elsewhere or the tile size changes.

## Opening

When a shot opens a portal, the game grows it open on its wall from its own sprite, so there is nothing extra to draw: it grows from the middle of its oval, past its size to about 110 %, and settles back, in about 0.2 s, fading in over the first 40 ms, while its glow rises with it. The game takes the oval's middle as 23.5 px of the 256 px tile in from the tile's top edge, as drawn (`src/game/portal_openings.ts`), so move it there too if the oval moves. The portal it replaces, if any, still vanishes at once; one that moves or closes while it opens is drawn as it is, and one that breaks up while it opens breaks up whole (see [fizzle](#fizzle)). With reduced motion, and in the home menu's map and the gallery, a portal appears at once.

## Fizzle

When the subject fizzles (it walks or crosses into a fizzler that is on, or one turns on under it), each portal it loses and a box it carries break up (the box as its own sprite, `box`, or `box_mirror` with its mirror the right way round in the room, cut at the size and place of the box `subject_holding_box` shows in its hands), and so does a portal on a wall side facing a fizzler that switches on, and a box lying where a door closes or a laser, a light barrier or a fizzler switches on (whole, where it lay; one the subject puts down there breaks up from its hands, the same way): the game cuts the sprite, as last drawn, into small square pieces, 9 across a tile, which round off into dots as they drift a short way out from its middle (0.15 of the sprite's side on average, 0.2 at most), shrink and fade in about 0.6 s, over everything but a missed shot's ripple. When a fizzler switches off, its field crumbles the same way in about 0.4 s, but in place, in its own layer: `fizzler_on` is cut into square pieces, 7 across, each rounding off into a circle as it starts to go, which shrink and fade where they are, one after another, leaving nothing but its connectors, whose lit sprite fades out over the same time; when it switches back on, they grow back in reverse, the lit connectors fading in, and one switched back part way turns back from where it is. There is nothing extra to draw, but the pieces show the sprite's own pixels, so a portal or box drawn as a thin outline breaks into very few. With reduced motion, and in the home menu's map and the gallery, nothing breaks up or forms.

## Fall

When a ditch opens under a box lying on it, or the subject puts a box down on an open ditch, and the ditch is still open once the step ends, the game draws the box falling into the pit (a box sent back to a button that bridges the ditch again breaks up instead, see [fizzle](#fizzle)), from its own sprite, so there is nothing extra to draw. It hangs where it was for a moment while the grate starts to slide away, then drops ever faster, shrinking towards the middle of the pit to a quarter of its size and fading into the dark, in about 0.45 s, without a shadow and inside its tile: over the ditch and its sliding grate, under everything standing on the floor. The box is drawn back at its start at once. With reduced motion, and in the home menu's map and the gallery, nothing falls.

## Miss

When a portal shot misses, the game draws a ripple in the shot's colour where it stopped, over everything, from no sprite: the face the shot met lights up as a line 0.84 of a tile long and 0.05 wide across the shot, fading in about 0.28 s, and two thin half rings, 90 ms apart, spread back towards the subject, from 0.2 to 0.8 of a tile along the face and up to 0.28 of a tile back, thinning and fading in about 0.42 s each, so all of it stays within the tile's width and is gone in about 0.52 s. It sits where a portal would have opened on a wall, 0.125 of a tile in; on the near edge of a door, the exit or a fizzler; on the near face of a light barrier's band when the band runs across the shot, or at its end on the tile's edge when it runs along it; and, for a shot that left the chamber through an open door or exit in its edge, just inside the doorway. A shot from inside a fizzler that is on does nothing, so draws nothing. With reduced motion, and in the home menu's map and the gallery, nothing ripples.

## Antlines

An antline is a dotted line on the floor from a button, switch or receiver to one element it links, as in the original game, drawn by the game in code from no sprite along the corners the chamber file gives (see `docs/elements.md`). Its dots, 3 per tile, one on each tile's middle, so each corner gets one, are 0.15 of a tile wide, each with a border 0.025 of a tile wide (never thinner than a pixel) drawn inside its edge, in its colour 30 % darker. It runs from the middle of the button's or switch's tile, whose sprite hides its start, or of the receiver's, whose wall hides it up to the floor, to the edge of the element's tile, its last dot 1/6 of a tile before it, the same whether the element is drawn or not. It lies over the floor and under everything else, so the floor marks, the walls with their shadow and every element hide it where it runs under them, and it shows again beyond. It is cyan while unlit, and amber, lit, while the element it leads to is unblocked: a door or the exit open, a laser, a light barrier or a fizzler off, a ditch bridged, a blocked wall taking portals, an emitter on; a line to a box never lights. Unlit lines are drawn first, lit ones over them. The colour changes at once with the step, with no fade, so reduced motion changes nothing; the home menu's map and the gallery show them too.

## Rays

An emitter's ray is drawn by the game in code, from no sprite, from the rays as they run in the state shown (`src/game/ray_drawing.ts`), shaped like `laser_on`'s beam but recoloured pale gold (see [look](#look)) and narrower, a 23 px beam of 256 against the laser's 30. Each straight run is filled with three bands, each a gradient across it, every ray's haze first, then every soft edge, then every beam, so crossing rays layer cleanly: a haze tinting the floor, about 0.29 of a tile wide; a soft edge in the rim's colour at 80 %, about 0.1 wide; and the beam, about 0.09 wide, from the dark rim through the body to the white-hot core. Each band is at least 1.2 canvas pixels wide, so a ray still shows on the home menu's map. Its glow is the laser glow's bell, about 0.48 of a tile wide (see [glow](#glow)).

A ray starts at its emitter's face and ends at the face it meets of a wall, a receiver, a closed door or the closed exit; at a portal, at the wall's face, meeting the oval's near rim without painting over it, starting again at the other portal's face; at the middle of the subject's or a plain box's tile, which stand over its end; at a light barrier whose band runs across it, at the band's near rim, 50 px of 256 short of the tile's middle (`light_barrier_on`'s rim, so change it in `src/game/ray_drawing.ts` too if the band's width changes), or at the tile's edge when the band runs along it. It turns at a mirror box's middle, the corner hidden under the box. A ray changes at once with the step that cuts or frees it, with its emitter's lens, while a receiver's eye fades over about 0.25 s; the home menu's map and the gallery draw rays too.

## Surface detail

So the floor and the walls don't read as one tile stamped everywhere, the game lays a surface detail over them, drawn in code from no sprite (`src/game/surface_tone.ts` and `src/game/wear_marks.ts`), into the backdrop: the floor's over the floor and the slide floors and under the antlines, the walls' on the walls before their shadow is made. All of it is grey and faint and the same in every state, and its marks and plates keep off the walls' bevels, where portals open; only the walls' patches, the faintest of it, run over them. Where each part lands comes from the chamber's size and walls and each tile's place (`src/game/surface_noise.ts`), so a chamber looks the same every time it is drawn, at any tile size, and no two chambers alike. Its colours are in the palette; how strongly each is drawn is listed here, as its opacity where it is strongest.

Tones, on every tile:

| # | Tone | What it does | Colour | Strongest |
|---|------|--------------|--------|-----------|
| 1 | Tile shade | Each floor tile is shaded a little apart from the next, most near the middle shade; one in fourteen is clearly darker, like a panel replaced later | Between a cool tint (26, 36, 62) and a warm one (66, 56, 42), a mix of its own for each tile | 6.5 %; 7.5 to 10.7 % for the odd ones |
| 2 | Patches | Soft darker areas about 4 tiles wide, so a large empty room isn't one flat colour | 34, 40, 60 | 14 % |
| 3 | Room light | The floor darkens towards the walls, down to about a third 0.85 of a tile out, and is lifted towards white in the open, from 1.1 tiles from the nearest wall, in full from 2.6 | 20, 26, 44; white | 11 %; 24.2 % |
| 4 | Grime | Dirt along the foot of the walls, out to 0.4 of a tile, about a third of it even and the rest in blotches | 60, 54, 46 | 15 % |
| 5 | Wall plates | Each wall's flat top, inside its bevels, a plate a little lighter or darker than the next; not on a blocked wall | White; black | 3.2 %; 4 % |
| 6 | Wall patches | Soft lighter and darker areas about 3.6 tiles wide across every wall drawn in the backdrop, bevels included, and the blocked walls no link reaches; the steel painted over a blocked wall a link reaches, while it is blocked, carries none | White; black | 3.6 %; 4.8 % |

The patches, the room light and the grime are painted as one soft layer, 8 samples to a tile's side, and stretched over the chamber; the walls' patches the same way, showing only on the walls.

Wear marks, each kind on 30 % of the tiles that take it, picked on its own, so a tile can get more than one; each mark is shaped from its own tile's numbers, so no two are alike:

| # | Mark | What it shows | Colour | Opacity |
|---|------|---------------|--------|---------|
| 1 | Scratches, floor | Two to four thin lines side by side, as something dragged leaves, trailing off at both ends, each with a lit edge beside it; they may run on over the next tile | 58, 64, 82; edge white | 5.8 %; 13.2 % |
| 2 | Cracks | A jagged line in from one edge of the tile, with one short branch a quarter fainter, and a lit edge beside both; cut off at its tile's edge | 34, 38, 50; edge white | 4.8 %; 4.4 % |
| 3 | Chipped corners | A small jagged piece off one corner, 0.08 to 0.18 of a tile each way, with a broken edge round it; cut off at its tile's edge | 122, 127, 140; edge 52, 57, 70 | 14.4 %; 9.6 % |
| 4 | Scratches, walls | As on the floor, but bright on the grey with a shaded edge, only on the flat tops of plain walls, cut off at the bevels | 238, 241, 248; edge black | 4.8 %; 3.2 % |

A scratch is 0.009 of a tile wide, a crack 0.013 and a chip's edge 0.008, none thinner than a pixel. No mark is placed on a tile that holds a button, a switch, an arrow, a slide floor, a ditch, a door or the exit, where it would confuse or never show, nor on a blocked wall; a scratch on the floor tile beside one may still trail up to a third of a tile onto it. The home menu's map and the gallery show the surface detail too; nothing about it moves, so reduced motion changes nothing.

## Exit shadow

The exit's tile is shaded by the game in code, from no sprite, so the open exit reads as the way out of the chamber, into the dark, and never as an open door: black, as opaque as the square of how far across the tile it lies, clear at the tile's inner edge and fully black at its outer edge, on the chamber's edge, so it stays light over most of the tile and darkens fast near the edge. It is painted with the floor, over its surface detail and under the antlines (which stop short of the exit's tile), the walls and their shadow, and the same in every state: the closed exit's opaque `exit_closed` hides it, and it shows between the leaves as they slide. Only an exit in one outer wall, away from the corners, has one, which the chamber check requires of every chamber. The home menu's map and the gallery show it too; nothing about it moves, so reduced motion changes nothing. The subject on the exit, which it only reaches as the chamber is completed, is drawn under it too, so it darkens as it walks out (see [the subject](#the-subject)).

## Sliding

When a door or the exit opens or closes, it slides over about 0.3 s: the game draws `door_closed` (or `exit_closed`) cut down its middle over the floor (and, for the exit, its shadow), each half slid out to its side and cut off at the tile's edge, as if going into the wall, until nothing is left. So the closed sprite's two leaves must meet on the tile's middle line.

A blocked wall a link reaches slides the same way when it is switched, over about 0.3 s: its `blocked_wall` tile, joined as it is drawn, is cut down its middle over the wall beneath it, each half slid into the wall beside it, along the run of walls it lies in (up and down when more walls lie above and below it than left and right), until only the wall is left, and back when it is blocked again.

A ditch switched slides its grate over about 0.3 s: the ditch is drawn as part of the pit, and `ditch_bridged`, whole, slides in over it from one side, cut off at the tile's edge, as if coming out from under the floor, or back out the same way. It never comes from another ditch unless ditches lie on all four sides: in a row of ditches running left to right it comes from above (from below when a ditch lies above), and otherwise from the left (from the right when a ditch lies left). A ditch switched alone among open ditches stays part of their pit while it changes, so their rims beside it go as soon as it starts to open and appear only once its grate is fully in.

There is nothing extra to draw. With reduced motion, and in the home menu's map and the gallery, nothing slides.

## Turning arrows

When a link turns an arrow, its `turntable_arrow` rotates the quarter turn about the tile's middle over about 0.3 s, eased out like the doors, from where it is drawn if it was still turning; its `turntable` stays. A subject standing on it faces the new way at once. There is nothing extra to draw. With reduced motion, and in the home menu's map and the gallery, nothing turns: the chevron is drawn at the way the arrow points.

## The subject

The subject's two sprites are the only ones not drawn in code. They are painted images that break this spec on purpose: their light is painted, not straight overhead; the subject wears orange and its portal gun glows blue, the portals' colours; and their sources are the painted PNGs `art/sprites/subject_holding_gun.png` and `art/sprites/subject_holding_box.png` (1526 × 1526 px each), with no SVG.

Each is one still image: the subject glides from tile to tile and through portals, with no walking frames. Reaching the exit, it glides on out past the chamber's edge, drawn on a layer of its own with the exit's shadow laid over it, so it darkens across the exit and is cut off at the canvas's edge (see [exit shadow](#exit-shadow)). It holds its portal gun while its hands are free and a box, with no gun, while it carries one, the game swapping the sprite as it picks the box up or puts it down.

Both are exported the same way, so the figure keeps its size and its head stays in place when they swap: centred as painted, padded to a 1648 px square so the figure stands 238 px tall in the 256 px tile, cleared of faint stray pixels (alpha under 3 %) and shrunk to the tile. The portal gun, or the box held out, makes the painting top-heavy, so the subject turns about a point on its head, a little above the head's middle. The painted box sits 0.26 of a tile ahead of the tile's middle, and the game draws the box's own sprite there at 0.7 of a tile (`CARRIED_BOX_AHEAD` and `CARRIED_BOX_SIZE` in `src/game/renderer.ts`) when it breaks up or falls from the subject's hands (`box`, or `box_mirror` with its mirror the right way round in the room), and marks a carried mirror box's mirror there, so repaint the box there or change those two.

The painted box is always plain, so the game marks a carried mirror box in code, from no sprite: its mirror's line, centred on the painted box, reaching 0.13 of a tile from its middle each way across and up or down, rising to the right for `/` and falling for `\`, the right way round in the room whichever way the subject faces. It is three round-capped strokes, each at least a pixel wide, bottom to top: the frame, dark grey (44, 48, 54), 0.07 of a tile wide; the glass, pale grey (226, 231, 238), 0.045 wide; and a white glint, 0.012 wide. It is drawn right after the subject's sprite, so it glides with it and is clipped with it through a crossing.

To export them again, from the project's root:

```sh
convert art/sprites/subject_holding_gun.png -channel A -level 3%,98% +channel -background none -gravity center -extent 1648x1648 -resize 256x256 -quality 90 -define webp:alpha-quality=100 src/assets/images/chamber/subject_holding_gun.webp
convert art/sprites/subject_holding_box.png -channel A -level 3%,98% +channel -background none -gravity center -extent 1648x1648 -resize 256x256 -quality 90 -define webp:alpha-quality=100 src/assets/images/chamber/subject_holding_box.webp
```

## Not in the set yet

- **Decorations** not tied to the rules, such as lights along the outer wall and hazard stripes at wall ends. Wear on the floor and the walls is drawn in code, from no sprite (see [surface detail](#surface-detail)).
- **Animation frames:** sprites are still images, and the game moves them.

## Trying a sprite

Drop the file into the folder, and `npm run dev` picks it up. The sprite gallery, at `/src/dev/sprite_gallery.html` in `npm run dev`, reloads by itself when a file lands and shows:

- each sprite as the game has it, at full size on a checkerboard, with its size and whether its file is in use, missing, not downloaded or refused (and why); one without a usable file shows as an empty frame, since the game draws nothing for it;
- a small chamber with every element and an antline, drawn by the game with everything on and with everything off (the antline unlit, then lit; the turnable arrow pointing its own way, then turned; the emitter on, its ray turned by a mirror box onto the receiver, lit, then the emitter off and the receiver dark), the subject carrying a box and both portals open;
- every way walls and open ditches meet;
- each chamber at its start.

The small chamber and the walls and ditches come at the smallest tile the home menu's map draws, then at 40, 100 and 230 px, and each chamber at 40 px, each canvas pixel on one screen pixel.
