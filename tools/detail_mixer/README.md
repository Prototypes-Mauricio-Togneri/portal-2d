# Detail mixer tooling

Not part of the game: nothing here is built, shipped, type-checked or linted with it.

This is the tooling behind the "mixer" Artifact pages on which the look of the chamber's detail is chosen: a page that draws the game's real chambers with the game's real renderer and lets layers of mock-up detail be switched on over it.

- `./build.sh` bundles the game's drawing code, chambers and sprites into `build/engine.js`.
- `harness/shot.sh 'harness/smoke.html?c=1&t=40' build/smoke.png 1900 1750` proves the engine and its hooks work.
- `floor_walls/` is the first mixer, the one the floor's and walls' surface detail was chosen on.

Everything else, how it works, what its limits are and what to build next, is in `docs/element_detail_brief.md`, part 4.
