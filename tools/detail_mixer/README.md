# Detail mixer tooling

Not part of the game: nothing here is built, shipped, type-checked or linted with it (`eslint.config.js` ignores the folder), and `build/` is git-ignored.

This is the tooling behind the "mixer" Artifact pages on which the look of the chamber's detail was chosen: a page that draws the game's real chambers with the game's real renderer and lets layers of mock-up detail be switched on over it, so a look can be judged on the real thing before it is built into the game. Two mixers were made, each the record of its choice; neither is to be changed:

| # | Mixer | Source | Published | What was chosen, and where it is now |
|---|-------|--------|-----------|--------------------------------------|
| 1 | Floor and walls | `floor_walls/` | https://claude.ai/artifact/GFvKVnqfeJigRJxMSF9hBt | The surface detail: `docs/sprites.md`, "Surface detail"; its cost in `docs/performance.md` |
| 2 | The ten element sprites | `elements/` | https://claude.ai/artifact/ALsatRgxVUdN4UskGD3aT4 | The element detail: `docs/sprites.md`, "Element detail"; its cost in `docs/performance.md` |

The game has since had both looks built in, so the engine's own drawing (`render` with no hooks) now shows them, while each mixer's "Original" was the game without them. `build/engine_mockup.js`, a copy of the engine kept from before the element detail was built in, still draws the element mixer's mock-up as it was; it is git-ignored, so a clean checkout lacks it.

## Layout

```
tools/detail_mixer/
  build.sh                  patches copies of four game files, then bundles the engine into build/engine.js
  engine/
    entry.ts                the engine's API (below)
    patch_sources.py        the four patched copies, each change an exact replacement that must match once
    vite.config.mjs         bundles entry.ts with the game's code, chambers and sprites, as one script
  harness/
    assemble.py             a page's source and its scripts into one publishable file, plus light and dark test pages
    serve.py                serves the folder, with /wait?ms=N to hold a page's load open on the real clock
    shot.sh                 headless Chrome screenshot of a page, started through serve.py
    smoke.html              proves the engine and every hook work
  floor_walls/              the first mixer, as published
    page.src.html           the page: styles, markup, and the UI script
    config.js               its layers and presets
    effects.js              its drawing: noise, soft layers, marks, the two hooks
    sheet_marks.html        every kind of mark many times over, at two sizes
    sheet_layers.html       one drawing per layer or preset, whole chamber or a crop
  elements/                 the second mixer, as published
    page.src.html           the page: split view, state scrubber and replay, rail, line-up, sizes, meaning checks
    config.js               the things, their layers, the choices, the presets
    effects.js              each layer's drawing, the skins and hooks, who is who in a state, the meaning checks
    sheet_boards.html       the line-up boards as the game draws them
    sheet_layers.html       each layer of a thing alone on its line-up, or a preset on every line-up
    sheet_motion.html       a recorded step replayed in slow motion as a film strip (?list=1 lists the steps worth looking at; preset=none shows the game's own look)
    compare.html            the line-ups as the game now draws them (engine=game) against the mock-up of the chosen settings (engine=mockup)
    time_choice.html        the mock-up's drawing timed with the chosen settings
  build/                    (generated) engine.js, engine_mockup.js, patched/, assembled pages, screenshots
```

## First five minutes

```sh
cd tools/detail_mixer
./build.sh                                                        # must end by listing build/engine.js (about 450 KB)
harness/shot.sh 'harness/smoke.html?c=1&t=40' build/smoke.png 1900 1750
```

Open `build/smoke.png`. You should see Chamber 1 five times: as the game draws it; with the surface detail off; with loud demo marks on every box, button, switch, arrow and bridged ditch (the `skin` hook) and on every wall (the `afterTile` hook); half way through its recorded solution; and with a red line over the floor and a green one over the walls (the `floor` and `walls` hooks). Under them, a text listing of the chamber's boxes, buttons and ditches in that state.

If `build.sh` stops with `"<label>" in src/game/<file> matches 0 times`, the game's file changed since. Open that file, find where the quoted code went, and update the replacement in `engine/patch_sources.py`. The patches are anchored on as few lines as possible for that reason; it has happened twice, each a few minutes' work.

Then build a mixer, to see a whole page work:

```sh
python3 harness/assemble.py elements element-detail-mixer
harness/shot.sh 'build/element-detail-mixer_test_light.html' build/mixer.png 1600 1100
```

## The engine's API

`build/engine.js` defines one global, `ChamberEngine`. It runs the game's real chamber loader, rules and renderer.

| # | Member | What it gives |
|---|--------|---------------|
| 1 | `ready` | A promise that resolves once every sprite is decoded. Draw nothing before it |
| 2 | `chambers` | `[{name, width, height, steps, board}]`: index 0 is the tutorial, 1 to 9 the chambers, 10 the playground, then the element mixer's boards: seven line-up boards (a dozen of one thing side by side, read without the layout checks; a page hides their subject, and the boxes holding the buttons' second row down, with the `hide` hook) and a scripted motion board (a box falls, a carried box turns and breaks up, an arrow turns, a grate slides). `steps` is the number of actions in the recorded solution (0 for the playground and the line-ups); `board` names a board's thing (`'box'`, `'box_mirror'`, `'button'`, `'switch'`, `'arrow'`, `'turntable'`, `'ditch'`, `'motion'`), null for a chamber |
| 3 | `grid(index)` | `{width, height, cells}`: one cell per tile, row 0 at the top as the screen shows it, each `{wall, steel, device, kinds}` (`steel`: a blocked wall; `device`: an emitter's or receiver's wall; `kinds`: the element types on the tile, with `'box'` and `'subject'` on their start tiles). The same in every state |
| 4 | `instances(index, step)` | Everything in the chamber **in one state**: `{step, completed, subject, boxes, elements}`. `boxes`: `[{index, x, y, row, startX, startY, carried, mirror}]`. `elements`: every placed element as `{kind, index, x, y, row, xTo, yTo, linked, blocked, pressed, pointing}` (`index` is its place in the chamber file's list for its type, the same number the game's drawing code loops over; `linked`: a link can switch it; `blocked`, `pressed`, `pointing`: its state, null where the type has none). `y` counts rows from the bottom as the game does, `row` from the top |
| 5 | `render(canvas, index, tileSize, options)` | Draws the chamber as the game does. `options.step` (default 0): how many actions of the recorded solution to play first, so 0 is the settled start and `steps` the completed chamber. `options.surfaceDetail` (default true): false switches the floor's and walls' surface detail off (not the element detail). `options.hooks`: your drawing (next section). It sets the canvas's width and height itself, to `tileSize × width` by `tileSize × height` |
| 6 | `stepEvents(index, step)` | The game events of the step that led to a state along the recorded solution (the settled start's for 0) |
| 7 | `actionsOf(index)` | The recorded solution's actions |
| 8 | `play(targets, index, tileSize, options)` | The recorded solution replayed from `options.from` with the game's own animation (`StepAnimation` and the effect objects, started as the game's level starts them, a slide's effects tile by tile), on one canvas per target, each `{canvas, hooksAt(step)}`, its hooks asked for every frame. `options.speed` slows the clock, `options.pause` spaces the actions, `onStep` and `onEnd` report. Returns `{stop}` |

`step` is the cheap way to show state: buttons pressed, a box moved or carried, ditches bridged, an arrow turned, without any animation. `instances` at the same step tells you which is which. `play` shows the motion.

## The hooks

Each hook is a function passed in `options.hooks`. They run inside the game's own drawing, at a fixed place in its order. `engine/patch_sources.py` shows the exact lines.

| # | Hook | Runs | Given | Use it for |
|---|------|------|-------|------------|
| 1 | `floor(ctx, tileSize)` | After the floor, the slide floors and the game's floor detail; before the exit's shadow, the antlines, the floor arrows and the walls | A context framed on the chamber's top left corner, x right, y down, in canvas pixels | Anything on the floor under everything else |
| 2 | `walls(ctx, tileSize)` | On the walls' own layer, after the walls and the game's wall detail, before their shadow is made | The same frame. Set `ctx.globalCompositeOperation = 'source-atop'` to touch only wall pixels | Anything on the walls |
| 3 | `skin(sprite)` | Every time the game draws a sprite, in the sprite pass: on a tile with `drawSprite` (`path: 'tile'`), turned by any angle (`'rotated'`: a turnable arrow's chevron or the subject while they turn), shrinking (`'shrunk'`: a box falling, a portal opening) or in pieces (`'pieces'`: a box or a portal breaking up, a fizzler crumbling) | `{name, tileSize, x, y, row, way, image, margin, path, angle}`. `image` is the sprite already shrunk to the tile size, with the game's own element detail on it (a canvas; never draw on it); `tileSize` is 0.7 of a tile for a box breaking up from the subject's hands; off the tile path, `x` and `y` are where the sprite's square's corner lies, part way between tiles from the hands, and `angle` is the turn for `'rotated'`. Return a canvas of the same size to draw instead, or null for the sprite itself | **A look of its own for one instance.** Copy `image`, draw over the copy with `source-atop`, keep the copy in a map keyed by the instance and the size (not by `x` and `y`, which move while a box glides from the hands or the subject walks), return it |
| 4 | `afterTile(tile)` | After each tile of a joined mass is drawn from its strip: a wall or a blocked wall. An open ditch's tile is drawn whole from the game's kept pit tile (`pitTile` in `src/game/element_detail.ts`), so it doesn't reach this hook | `{name, x, y, row, ctx, tileSize}`, the context framed on that tile's top left corner | Drawing over one tile of a wall, since a strip has no single image to skin |
| 5 | `hide(sprite)` | Every time the game draws a sprite on a tile with `drawSprite`, in both passes | `{name, x, y, row}` | Return true to leave the sprite out, shadow and all: a board's subject, the boxes holding its buttons down |

What to keep in mind:

- **Identity through motion.** `skin` is told the *tile*, not which box. At the settled start a box's tile is its start tile, so the tile is as good as its index; at a later `step` it is not. Use `instances(index, step)` to map a tile back to a box's `index`, and key the box's look by that index, so the look follows the box. A box breaking up or falling is drawn after the step that destroyed it, so look back a step or a few (`elements/effects.js`, `destroyedBoxWho`).
- **A carried box.** It is not drawn as a box at all: the subject's `subject_holding_box` sprite is a painting with a plain box in its hands. `skin` is called for `subject_holding_box`, with the subject's tile.
- **Shadows.** A raised sprite's shadow is made from the *original* sprite's shape. A skin that keeps the shape (draw with `source-atop`) keeps its shadow right; one that changes the shape will not match its shadow.

Adding a hook is a small job: add one more exact replacement to `engine/patch_sources.py` (copy the pattern of the existing ones; add the file to `engine/vite.config.mjs`'s `patched(...)` list if it is a new file), rebuild, and extend `harness/smoke.html` so the new hook is proven.

## Screenshots and timing

- `harness/shot.sh <page> <out.png> [width] [height]` starts `harness/serve.py` if needed and screenshots `http://127.0.0.1:8765/<page>` with headless Chrome at one canvas pixel per screen pixel. It captures only the window, so ask for one tall enough. Both paths are taken from `tools/detail_mixer/`. If the picture shows an error page or a page that isn't yours, something else is listening on port 8765, or the server (which stops itself after ten minutes) went away: run it again.
- **Why the server.** Headless Chrome's `--virtual-time-budget` clock runs ahead of work done off the main thread, such as decoding the sprites, so a page was sometimes captured before the engine was ready. A page that contains `<img src="/wait?ms=4000" alt="" hidden>` keeps its own load open for four real seconds when served by `serve.py` (opened as a file, the image just fails and nothing waits). `smoke.html`, the sheets and the test pages that `assemble.py` writes all contain it, and a new test page must too.
- **Phone width.** Chrome's window is never narrower than about 500 px. To check a 400 px layout, put the page in a 400 px wide `<iframe>` of a wider page and screenshot that.
- **Timing.** On the virtual clock `performance.now()` does not advance while a script runs, so timings read 0. Time with the page's load held open and **no** `--virtual-time-budget`, reading the result with `--dump-dom` (`serve.py`'s header shows the command). Those numbers are rough (no GPU, and other processes compete); for numbers to keep, time in a real Chrome (below).
- Read a screenshot with the `Read` tool. Crop first with ImageMagick (`convert in.png -crop WxH+X+Y +repage out.png`) when it is large: a tall page is downscaled when read, and loses exactly the detail being judged.

## Publishing a page

With Claude's `Artifact` tool, whose own instructions outrank this summary; these are the points that mattered:

- Call it first with `action: "quickstart"`, `intent: "other"`, and follow what comes back (it carries the page rules and the design guidance).
- The published file is **content only**: no `<!doctype>`, `<html>`, `<head>` or `<body>`; a `<title>` (two to four words, a name, not a description) and `<style>` at the top; `<meta name="claude:viewport-fit-sides" content="cover">` together with side padding written as `max(16px, env(safe-area-inset-left, 0px))`.
- Every colour a token on `:root`, redefined for dark under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} }` and again under `:root[data-theme="dark"]`; `body` with an explicit background. Both mixers do all of this with the game's own tokens and fonts (Oxanium, Chakra Petch from Google Fonts, the only stylesheet host allowed).
- Scripts load only from a few CDNs, or **from files published beside the page**: that is how the engine travels. Publish with `file_path: tools/detail_mixer/build/<name>.html` and `files: {"engine.js": "tools/detail_mixer/build/engine.js"}`, an `icon` (one plain word) and a one-sentence `description` on the first publish. The page then loads it with `<script src="engine.js"></script>`.
- The page may not fetch from anywhere else, open dialogs, download files or print. `localStorage` works but can throw: wrap it. Copy to the clipboard only inside a click handler, with a fallback that selects the text.
- To update, publish the same file path again: the link stays the same. Give each publish a short `label`.
- It must work at phone width with no sideways scroll of the page (a wide chamber scrolls inside its own box).
- Check the page once before publishing (a screenshot of the test page, light and dark, and the phone-width iframe), then publish.

## Checking in a real Chrome

With the Claude in Chrome extension connected:

- Start the game with `npm run dev -- --port 5199 --strictPort` in the background. Stop it with `pkill -f "[v]ite --port 5199"` (the brackets keep `pkill` from matching itself) and close the tab when done.
- After **every** page load and before pressing Start, mute the tab: `const play = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { this.muted = true; return play.call(this) }`.
- Every visit opens on a loading screen; press its Start button. **Use `/playground`**, which keeps no progress, or `/src/dev/sprite_gallery.html`, which needs no Start at all and runs no frame loop, so it is the place to time. Opening `/chamber/N` adds an attempt to the saved progress; the home menu can be browsed with the arrow keys alone (Enter on Play starts the tutorial until a chamber has been opened).
- Screenshots come back scaled (a 1920 px window as a 1559 px frame, as JPEG). For a 1:1 look use the `zoom` action on a region; the chamber's canvas sits where `document.querySelector('canvas').getBoundingClientRect()` says.
- **Drive the game's own modules from the page.** In `npm run dev` every source file is a module the page can import, sharing the app's loaded sprites:

  ```js
  const {Renderer} = await import('/src/game/renderer.ts')
  const {CompiledChamber} = await import('/src/game/rules/compiled_chamber.ts')
  const {loadChamber} = await import('/src/game/rules/load_chamber.ts')
  const {startChamber, step} = await import('/src/game/rules/step.ts')
  const data = (await import('/src/chambers/chamber_1.json')).default
  const chamber = new CompiledChamber(loadChamber(data).chamber)
  const state = startChamber(chamber).state
  const canvas = document.createElement('canvas')
  const renderer = new Renderer(canvas, 45 * chamber.width, 45 * chamber.height)
  renderer.setSize(chamber.width, chamber.height)
  const start = performance.now(); renderer.render(state); performance.now() - start   // first frame: builds the backdrop
  ```

  This is how the timings in `docs/performance.md` were taken (a fresh renderer per run, the median of nine), how a recorded solution was replayed step by step (`step(chamber, state, action).state` over `chamber_N.solution.json`'s `actions`) to time the frames where an antline changes, and how a state was shown that would otherwise need playing to. A chamber being played in the same page draws every frame and slows such timings, so time in the gallery.
- The window may refuse to resize (it stayed 1920 × 966 when asked for 1400 × 900), so a live resize may go unchecked.
