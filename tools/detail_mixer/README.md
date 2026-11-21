# Detail mixer tooling

Not part of the game: nothing here is built, shipped, type-checked or linted with it.

This is the tooling behind the "mixer" Artifact pages on which the look of the chamber's detail is chosen: a page that draws the game's real chambers with the game's real renderer and lets layers of mock-up detail be switched on over it.

- `./build.sh` bundles the game's drawing code, chambers and sprites into `build/engine.js`.
- `harness/shot.sh 'harness/smoke.html?c=1&t=40' build/smoke.png 1900 1750` proves the engine and its hooks work.
- `floor_walls/` is the first mixer, the one the floor's and walls' surface detail was chosen on.
- `elements/` is the second mixer, for the ten element sprites: `config.js` (things, layers, choices, presets), `effects.js` (each layer's drawing, the skins and hooks, the meaning checks), `page.src.html`, and three sheets for tuning: `sheet_boards.html` (the line-up boards), `sheet_layers.html` (each layer alone, or a preset, on its thing's line-up) `sheet_motion.html` (a recorded step replayed in slow motion as a film strip; `?list=1` lists the steps worth looking at; `preset=none` shows the game's own look), `compare.html` (the line-ups as the game now draws them, `engine=game`, against the mock-up of the chosen settings, `engine=mockup`, drawn by `build/engine_mockup.js`, a copy of the engine kept from before the element detail was built in) and `time_choice.html` (the mock-up's drawing timed with the chosen settings). Build it with `python3 harness/assemble.py elements element-detail-mixer`.

Since the first mixer the engine also has: line-up boards in `chambers` (a dozen of one thing, `board` naming it) and a scripted motion board; `stepEvents(index, step)`; `play(targets, index, tileSize, options)`, the recorded solution replayed with the game's own animation; a `hide` hook; and the `skin` hook reached from a sprite turning, shrinking or breaking into pieces (its `path` says which).

Everything else, how it works, what its limits are and what to build next, is in `docs/element_detail_brief.md`, part 4.
