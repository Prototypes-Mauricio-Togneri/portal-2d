## Building a new mechanic

Kept from stage 04a, which built slide floors, turnable arrows and live lasers this way (README decision 17).

Every mechanic keeps to three rules:

- **Original:** its name, look and combinations are this game's own, not copies of another game's elements.
- **Discrete:** everything happens inside one step; nothing depends on time.
- **No new keys:** it works with the game keys there are: the moves, both portals, interact and turning in place.

Each one went through the same seven steps, in order (what the code needs is under "Adding an element" in `docs/elements.md`):

1. **Rules.** Write its rules, and its row and column of the interaction table in `docs/elements.md`, checked against every other element: portals (the subject, shots and rays), resting and carried boxes, and each element there is.
2. **Element and format.** One element definition file, plus an optional list in chamber format 2 whose type accepts the JSON import without a cast. If an existing element changes, rewrite the chamber files that use it. Every recorded solution still passes unchanged.
3. **Drawing and sounds.** A sprite for each state, in `docs/sprites.md` and the sprite set, drawn as an SVG in `art/sprites/` and exported; colours distinct from every element, with no portal blue or orange and none of the UI's meanings (red caution, green completed). Movement it causes animates, and reduced motion shows plain steps. Its events stay silent until real sound files exist. Checked in the sprite gallery and in `npm run dev` at pixel ratio 1 and 2, with a place in the playground.
4. **Fixtures.** A tiny chamber and a replay for each rule and edge case, each pinning its outcome. The replay check passes, and fails once when the rule is broken on purpose (then reverted).
5. **Solver check.** `npm run verify` passes with its chambers in. A mechanic that adds state, makes a plain move do more than step the subject, or makes a shot's result depend on where on its line the subject stands breaks the solver check, which then skips and names its chambers (`docs/solver.md`).
6. **Docs.** `docs/elements.md`, `docs/level_design.md` for any pitfall it brings, and `AGENTS.md` if the rules text or keyboard ownership changes.
7. **Chambers.** Once the author has tried it in the playground: a teach chamber and a proof chamber (test or twist), each with a recorded solution. The author plays each cold and notes any confusion in the campaign plan.

## New mechanics

- **Springboard**: jumps the subject two tiles, over a ditch or a laser.
- **Bridge projector**: a wall emitter that casts a walkable bridge across ditches. The bridge goes on through portals.
