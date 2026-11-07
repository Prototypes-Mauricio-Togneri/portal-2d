# Stage 02 — The solver: a game that understands itself

Status: Draft
Last revised: 2026-11-06

## Goal

A program that searches every reachable state of a chamber and answers questions about it. For the author: every chamber is proven solvable on every check, par (fewest moves, fewest portals) is known and stored, and a report shows unintended shortcuts and elements that aren't needed. For the player, if the solver is fast enough in the browser: an optional "you can't finish from here" warning and hints worked out from where they are now. If the solver passes a second test, it also judges generated chambers (daily, endless). The first phase is a timed prototype, and its result decides how much of the rest happens.

## Depends on

**Stage 00**

- Records keyed by permanent chamber id, so par and solver results can be stored by id too.
- The first local check command, which this stage extends.

**Stage 01** — done (2026-11-07). It delivered:

- A **pure step** on the v2 rules: `step(chamber, state, action)` (`src/game/rules/step.ts`) returns the next state (the same object when nothing changed) and its events, and `startChamber(chamber)` gives a chamber's settled start. Every effect lands inside the step, so the original rules' one-frame-late effects are gone, and once the chamber is completed a step changes nothing.
- A **compact, immutable state** (`RulesState`): 24–26 16-bit values in the current chambers, with a `key` for maps (one character per value) and a hash. A step never changes the state it is given.
- **No sounds or browser APIs in the rules** (they report events instead; lint and the scripts' TypeScript project enforce it), so the engine loads under Node. A Web Worker should work the same way but hasn't been tried.
- **tsx** runs the engine scripts under Node (`scripts/`, type-checked by `tsconfig.scripts.json`).
- **Recorded solutions** for every chamber (`ReplayData` format 2: actions plus undo and redo), the replay check (`npm run replay:check`) and behaviour fixtures.
- **Chamber format 2** with a version number and an upgrader, and elements described by data: each definition in `src/game/rules/elements/` declares when it blocks walking and shots, whether it takes portals, whether links reach it, and whether entering or leaving its tile can change the state (`reactsToSubject`, the tiles a walking shortcut must stop on).
- The four inherited bugs README lists are fixed, including the box-button crash (releasing a button linked to a box now does nothing), so the solver never has to model a crash.
- An optional `par` block in format 2 (optional `moves` and `portals`), left empty, so this stage fills it without a format version bump.
- A fixed **action set** of 11 (`src/game/rules/action.ts`): the four moves, four turns in place, blue, orange and interact. Undo and redo aren't actions; the level handles them.
- **"Moves"**: each step that puts the subject on another tile, a portal crossing included; turning in place counts none, so turns cost no moves (`level.ts`). Undone steps keep counting and redo counts nothing (README decision 8). Par uses the same definition.

**Stage 01 as built, 2026-11-07** (kept from its notes when its file was removed):

- The recorded solutions take chamber 1 in 163 moves and 22 portals, chamber 2 in 97 and 16, chamber 3 in 121 and 28: routes that work, not optimal, so not par.
- Two throwaway searches (on the old rules) failed. A plain breadth-first search over single presses found nothing in chamber 2 after 2.75 million states (49 presses deep). Treating walking as free and searching over world-changing actions (shots, pick-ups, switches, buttons) reached 13 actions deep before portal pairs times box positions blew up; each chamber needs 20–40 such actions. The solver needs stronger pruning than either.
- Speed budget (`npm run random:walk`, Node 24, the author's machine): about 785,000–1,200,000 steps per second. A state is 48–52 bytes of values, about 330 bytes on the heap, its key not included.
- Boxes aren't interchangeable (a box link sends each one back to its own start), so symmetry reduction must keep box identity unless a chamber has no box links.

## Decisions made

| #   | Date       | Decision                                                                                                                                                                                        |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2026-11-06 | The solver targets the v2 rules only; today's rules are a reference that stage 01 deletes (README decision 3)                                                                                   |
| 2   | 2026-11-06 | Everything runs locally on demand; no cloud CI (README decision 6)                                                                                                                              |
| 3   | 2026-11-06 | The solver always calls stage 01's step for rule effects and never reimplements the rules. Only movement inside a region (a flood fill) is solver code, and it is checked against the real step |

## Open decisions

| #   | Question                                                | Options and cost                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Recommendation                                                                                  |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | **Difficulty score** (README open decision 2)           | **(a)** A solver formula (dead ends, choices per step, required "insights" such as carrying a box through a portal): available before anyone plays, but "insight" detection is research and the formula is hard to validate. **(b)** Measured clear rates, median time and quits from analytics (stage 04): reflects real players, but needs players and history, so new chambers have no score at first. **(c)** Both: solver metrics only in the designer report; the difficulty players see comes from data | **(c)**. Show players measured difficulty only; keep solver numbers as a designer aid (phase E) |
| 2   | Where does the solver code live?                        | **(a)** `src/solver/`, plain TypeScript with the same lint boundary as `src/game/` (may import `src/game/`, never Vue, components, services or chambers). **(b)** Inside `src/game/`: blurs the engine, which only plays                                                                                                                                                                                                                                                                                       | **(a)**                                                                                         |
| 3   | What does "par" mean?                                   | **(a)** Two independent optimums: fewest moves (ties broken by fewest portals) and fewest portals (ties broken by fewest moves), each with its own stored solution. **(b)** One lexicographic optimum: fewer to show, but loses the "portal-light" route                                                                                                                                                                                                                                                       | **(a)**                                                                                         |
| 4   | Where is par stored?                                    | **(a)** In the chamber file (the optional `par` block stage 01 reserves, written by the solve command): one file per chamber, travels with shared chambers in stage 05, type-checked. **(b)** A generated file keyed by permanent id: keeps hand-edited files clean, but shared chambers need it attached separately                                                                                                                                                                                           | **(a)**                                                                                         |
| 5   | Hints and records                                       | Using a hint can **(a)** change nothing, **(b)** be shown on the result, or **(c)** keep that run out of best times and medals                                                                                                                                                                                                                                                                                                                                                                                 | **(b)** for now; stage 04 decides how medals treat it                                           |
| 6   | Which key asks for a hint, and does it start the clock? | Any key outside the arrows, A, D, Space, Ctrl and Escape (for example H), owned by the chamber screen                                                                                                                                                                                                                                                                                                                                                                                                          | H, owned by the screen. It does not start the clock. Update AGENTS.md's keyboard section        |
| 7   | Dead-end warning default                                | On, or off with a setting                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Off by default; a switch under Settings                                                         |

## Steps

Each step: what changes, where, and how it is verified. UI steps must use the `frontend-design` skill.

### Phase A — Prototype (go/no-go)

Rough size of the problem, from the current chamber data (2026-11-06). "Open tiles" are the non-wall tiles reachable from the start, ignoring blockers. "Wall sides" are the wall sides facing one of those tiles. "Flags" are linked elements with an open/closed state (boxes linked to a switch reset instead of holding a flag).

| #   | Chamber | Size  | Open tiles | Wall sides | Flags | Boxes | Upper bound | With position and facing folded into the region |
| --- | ------- | ----- | ---------- | ---------- | ----- | ----- | ----------- | ----------------------------------------------- |
| 1   | 1       | 20×20 | 262        | 225        | 6     | 2     | ~10^14.7    | ~10^11.7                                        |
| 2   | 2       | 23×13 | 189        | 169        | 9     | 2     | ~10^14.9    | ~10^12.0                                        |
| 3   | 3       | 23×17 | 268        | 212        | 5     | 2     | ~10^14.4    | ~10^11.3                                        |

The upper bound is tiles × 4 facings × (wall sides + 1)² for the two portals × (tiles + 1)² for the two boxes × 2^flags × 2 for the "inside a fizzler" flag. Portal pairs (~3–5×10^4) and box placements (~4–7×10^4) dominate. Boxes block neither the subject nor shots (`state.ts` never looks at boxes when walking or shooting), so most box placements are equivalent. After the pruning below, the reachable count is a **guess of 10^6–10^8** per chamber. That guess is what this phase measures.

- [ ] **A1. Revisit.** Check every stage 01 assumption above against the code as it is then. Re-run the counts in the table (a short script over `src/chambers/*.json`). Update this file. Verified by: each assumption ticked or this file adjusted.
- [ ] **A2. Module and command.** Create `src/solver/` and extend the lint boundary in `eslint.config.js` so it may import `src/game/` and nothing from Vue, components, services or chambers. Add a Node entry (`scripts/solve.ts`, run with stage 01's runner) and an `npm run solve` script that takes chamber files. Verified by: lint passes; `npm run solve -- src/chambers/chamber_1.json` prints the chamber's size and counts.
- [ ] **A3. State key.** Encode a settled state into a fixed-size key whose bit widths come from each chamber's own counts: subject tile and facing; carried box (none or which one); each portal (closed, or the index of a wall side); each box's tile; one bit per flag; the "inside a fizzler" bit only if stage 01 kept that flag (its open decision 13 recommends dropping it, which halves the table's upper bounds). Button states are not stored, because after settling they equal "a box or the subject is on it" (buttons are re-checked every frame today; assert this). The current chambers need about 53–57 bits, so one 64-bit key (two 32-bit words) fits. Verified by: encode → decode → encode round-trips on every state along the recorded solutions; key width printed per chamber.
- [ ] **A4. Visited set.** An open-addressing hash set over a `Uint32Array` (two words per key) with a parent link for rebuilding the path; no JavaScript objects per state. Verified by: inserting and finding 10^7 random keys in Node, memory under ~250 MB.
- [ ] **A5. Tiny test chambers.** Write 4–6 hand-made chambers of about 6×6 in `scripts/solver_fixtures/` (not in the catalogue), each with hand-counted fewest moves and fewest portals. Cover: walking through a portal, carrying a box through a portal, a button held by a box, a switch, a fizzler destroying a carried box, a one-way arrow trap (a dead end). Verified by: each file loads through the chamber type without a cast.
- [ ] **A6. Baseline search.** Breadth-first search over single keypresses using stage 01's step, stopping on the win. This is slow, but it is the reference answer. Verified by: it matches the hand counts on every tiny chamber, and the solutions it finds pass the replay check.
- [ ] **A7. Macro search.** From a state, flood-fill the subject's walkable tiles with distances under the current flags, respecting one-way arrows. Stop at **event tiles**: tiles whose entry or exit changes state (buttons, active fizzlers, the exit, and any type that stage 01's element data marks this way). Walking between other tiles changes only position. Macro actions: walk to tile _t_, then turn and shoot A or D; pick up or drop a box; use a switch; step onto an event tile; walk through a portal. The edge cost is steps walked (for fewest moves) or portals placed (for fewest portals), with a 0-1 BFS / Dijkstra search. Turning in place costs no moves, so facing only matters just before a shot (except on an arrow, where Ctrl and other directions are ignored). Every macro edge is expanded into keypresses and replayed through the real step on the tiny chambers. Verified by: same optimums as A6 on every tiny chamber; far fewer expanded states.
- [ ] **A8. Region folding (solvability only).** For "is it solvable?", replace the subject's tile by its region's smallest tile index (as Sokoban solvers do), and drop facing. Par search keeps exact tiles at decision points. Verified by: same yes/no as A7 on the tiny chambers and the three real ones.
- [ ] **A9. Box drop pruning.** Only allow drops on buttons, at the box's start, and where the subject must have free hands next: before a switch (a switch refuses while carrying), before picking up the other box, before entering an active fizzler (which destroys a carried box and returns it to its start). Pruning could miss an optimum, so compare it with unpruned A7 on the tiny chambers. If par changes anywhere, use pruning for solvability only. Verified by: the comparison table in this file.
- [ ] **A10. Dead states.** After a full search, mark states from which the win can't be reached (reachability backwards over the explored graph). Today switches only ever open things and destroyed boxes return to their start, so dead ends come mainly from one-way arrows; this step measures how many there really are. Treat leaving the grid as dead (the engine has no edge check; today every linked border barrier sits on a wall, so it can't happen in the current chambers). Verified by: the arrow-trap tiny chamber reports its dead states, and no state along a recorded solution is marked dead.
- [ ] **A11. Measure in Node.** Run solvability and both pars on the three chambers. Record explored states, time and peak memory (`process.memoryUsage`) in a table added to this file. Verified by: the table is filled in.
- [ ] **A12. Measure in a worker.** Run the macro search in a module Web Worker in the dev build (`new Worker(new URL(…, import.meta.url), {type: 'module'})`) on the slowest chamber, from the start and from 10 states taken along its recorded solution, searching both to the win and to the next milestone (D1). Record time and memory in Chrome. Verified by: numbers in the same table.
- [ ] **A13. Decision.** Compare A11 and A12 with the thresholds below and write the go/no-go result (and what is dropped) into this file and README.md.

Pass thresholds:

| #   | Test                                                            | Pass                              | If it fails                                                                                           |
| --- | --------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | Node: solvability on each current chamber                       | ≤ 60 s, ≤ 2 GB                    | Over 5 minutes or out of memory: stop the stage after phase A (see Go/no-go)                          |
| 2   | Node: both pars on each current chamber                         | ≤ 60 s, ≤ 2 GB                    | Keep the solvability check, drop par                                                                  |
| 3   | Worker: next move to the next milestone, from a mid-game state  | ≤ 1 s for 95% of states, ≤ 256 MB | No live next-move hints and no dead-end warning; nudge and highlight hints from precomputed data only |
| 4   | Node: solvability on a 12×12 chamber with one box (for phase F) | ≤ 2 s                             | No generated chambers                                                                                 |

### Phase B — Solvability and par in the local checks (if test 1 passes)

- [ ] **B1. Par in the chamber file.** Fill the optional `par` block (moves, portals) that stage 01 reserved in format v2 (open decision 4). If 01 didn't reserve it, add it following 01's version and upgrade rules. Verified by: the build type-checks all chamber files.
- [ ] **B2. Solve all.** Running `npm run solve` with no arguments solves every catalogue chamber and prints a table: permanent id, number, solvable, par moves, par portals, states, time. `--write` stores par into the files. Verified by: the table for the three chambers; the files show the written par.
- [ ] **B3. Optimal solutions as replays.** Store the fewest-moves and fewest-portals solutions next to the recorded solution, in stage 01's replay format, so the replay check runs them too. Verified by: the replay check passes with them.
- [ ] **B4. Local check.** Add to the check command: every chamber is solvable; stored par equals computed par; each recorded solution completes with moves ≥ par moves and portals ≥ par portals (a recorded solution that beats par means a solver bug, so it's a hard failure). Verified by: breaking a tiny chamber (walling off its exit) makes the check fail with a message naming the chamber; restoring it passes.
- [ ] **B5. Cache.** Key solver results by a hash of the chamber's content plus the solver and rules version, so the check only re-solves changed chambers (it must stay fast at ~120 chambers). Verified by: the second run skips all unchanged chambers; touching the rules version re-solves everything.
- [ ] **B6. Docs.** AGENTS.md: the solver's boundary, `npm run solve`, the `par` block, the check. `docs/elements.md` if the format changed. Verified by: re-reading both against the code.

### Phase C — Designer tools

- [ ] **C1. Constrained solving.** Solve with a restriction: door X never opens, button Y is never pressed, switch Z is unused, box N is never carried, no portal on a given wall area. Implemented as filtered actions or transitions. Verified by: a tiny chamber with a bypassable door reports "solvable without door X in N moves".
- [ ] **C2. Shortcut report.** `npm run solve -- --report <chamber>` prints:
  - par against the recorded solution, flagged when par is under 70% of the recorded moves (a likely unintended shortcut)
  - every element the chamber is solvable without (each checked with C1)
  - elements whose removal raises par the most (the essential ones)
  - wall sides that never hold a portal on any optimal route
  - tiles never reachable
  - designer metrics (phase E)

  It also has a JSON form for stage 05's editor. Verified by: reports for the three chambers, read by the author against what they meant.

- [ ] **C3. Watching solutions.** Optimal solutions can be watched with stage 01's replay playback. If 01 has no viewer, add a dev-only one that never reaches the production build. Verified by: watching chamber 3's fewest-portals solution.

### Phase D — Player features (if test 3 passes)

- [ ] **D1. Milestones (offline).** From each chamber's optimal solution and explored graph, derive an ordered list of sub-goals, such as "box on button X", "door Y open", "portal on wall area Z", "reach area W". Store them per chamber as small generated data. Verified by: the author reads each chamber's list and agrees it describes the route.
- [ ] **D2. Worker host.** `src/solver/solver_worker.ts`, created lazily by the chamber screen (or a small service) on the first request, never by the game. Messages: chamber data plus encoded state in, result out; a newer request cancels the older one. Nothing reactive and no per-frame data passes through a `ref` (AGENTS.md). Budgets: nudge and highlight ≤ 100 ms (a lookup in D1's data), next move ≤ 1 s, dead-end check ≤ 300 ms after a move. Verified by: timings logged in the dev build on the slowest chamber.
- [ ] **D3. Dead-end check.** After each move (debounced), a bounded search from the current state. It reports "can't finish" only when the search is exhausted, never on a timeout. Verified by: the arrow-trap tiny chamber triggers it; every state along every recorded and optimal solution reports "can finish".
- [ ] **D4. Dead-end warning (UI, `frontend-design`).** A switch under Settings, stored as `portal-2d.dead-end-warning` (every access in `try`/`catch`), off by default. When a dead end is proven: a notice that doesn't pause the game, "You can't finish from here", with a Rewind action (stage 01's undo). `setting_change` gains the value `dead_end_warning` for `setting`. Verified by: manual run on the tiny trap chamber with the setting on and off; reduced motion respected.
- [ ] **D5. Hints (UI, `frontend-design`).** One key (open decision 6) shows the next tier for the current milestone:
  1. a nudge naming the element that matters ("The switch matters")
  2. a highlight drawn on that element or wall
  3. the next move shown as a keycap

  The highlight is a renderer change; this file is the explicit request that AGENTS.md's frozen-drawing rule requires, so note the exception there. Verified by: manual run at three points in each chamber; Escape and dialogs still behave as AGENTS.md describes.

- [ ] **D6. Hint analytics.** New events: `hint_request` (`chamber_id`, `chamber_number`, `tier`, `moves`, `time_ms`) and `dead_end_shown` (`chamber_id`, `chamber_number`, `moves`, `time_ms`). New parameter on `chamber_complete`: `hints` (highest tier used, 0 for none). Names are permanent once shipped, so review them before the first deploy. Verified by: `npm run dev` sends nothing; a preview deploy shows the events in GA4 DebugView.
- [ ] **D7. Result display.** Show hint use on the completion dialog per open decision 5 (`frontend-design`). Verified by: completing a chamber with and without hints.
- [ ] **D8. Docs.** AGENTS.md: keyboard ownership (hint key), Settings, persistence, analytics events, the worker. Verified by: re-reading against the code.

### Phase E — Difficulty (open decision 1)

- [ ] **E1. Designer metrics.** Add to the C2 report: fewest moves, fewest portals, required elements (from C1), share of dead states, average choices per step along the optimal route, and whether the route needs a box carried through a portal. Labelled "designer aid". Verified by: the report for each chamber.
- [ ] **E2. Choice (c), the recommendation.** Nothing from the solver reaches players; stage 04 shows difficulty from clear rates. Verified by: nothing to check here.
- [ ] **E3. Only if (a) or a player-facing formula is chosen.** Once stage 04 has data for at least 20 chambers, compare the formula's ranking with measured clear rates. Keep it only if the rank correlation (Spearman) is ≥ 0.6. Verified by: the correlation written here.

### Phase F — Generated chambers (research, timeboxed; only if test 4 passes)

- [ ] **F0. Timebox.** At most 10 sittings. Go/no-go at the end: in a blind mix with hand-made chambers, the author would ship at least 5 of 20 generated chambers. Record the result here.
- [ ] **F1. Generator.** Options:
  - **(a)** Mutate hand-made chambers (move walls, swap or re-link elements) and keep what the solver accepts: cheapest to build.
  - **(b)** Work backwards from a goal state.
  - **(c)** Stitch small "rooms", each built around one mechanic.

  Recommendation: start with (a) at ≤ 12×12. Verified by: 100 solvable candidates produced.

- [ ] **F2. Quality filters beyond "solvable".** Par within a range; at least N portals needed; every element needed (C1); few distinct optimal routes; no big shortcut; a dead-state share within a band; at least one required "insight" (such as a box through a portal). Calibrate on the hand-made chambers first: they must pass. Verified by: pass rates for hand-made and generated chambers.
- [ ] **F3. Daily delivery without a backend.** Options: generate in the browser from a date seed (needs a fast, deterministic generator that doesn't change between versions), or pre-generate offline, have the author review, and ship as chamber files. Recommendation: pre-generate. The menu entry and route belong to stage 04, which must add any new route to the no-cache headers. Leaderboards belong to stage 05. Verified by: a month of dailies generated and reviewed.
- [ ] **F4. Endless packs.** Same pipeline, shipped as packs. Verified by: one pack of 20.
- [ ] **F5. Write-up.** Go or no-go, and what stages 04 and 05 should change. Verified by: the result is in this file and README.md.

## Local checks added

- `npm run solve`: solves every catalogue chamber; fails when one is unsolvable, when stored par differs from computed par, or when a recorded solution beats par. Results are cached by chamber content and solver/rules version. Joins the check command.
- The tiny test chambers in `scripts/solver_fixtures/`: the solver must match their hand-counted answers. Joins the check command.
- Fewest-moves and fewest-portals solutions join stage 01's replay check.
- `npm run solve -- --report <chamber>`: the designer report, run by hand, not part of the check.

## Done when

- [ ] The phase A table is filled in and the go/no-go result is recorded here and in README.md.
- [ ] (If test 1 passes) the check command proves every catalogue chamber solvable.
- [ ] (If test 2 passes) par is stored in every chamber file, the check compares it, and no recorded solution beats it.
- [ ] The shortcut report runs on every chamber, and the author has read the three current ones.
- [ ] (If test 3 passes) hints and the dead-end warning work on every chamber within their budgets, and their analytics events are listed in AGENTS.md.
- [ ] Open decisions 1–7 are settled and moved to Decisions made.
- [ ] (If test 4 passes) phase F's timebox has ended with a written go/no-go.
- [ ] AGENTS.md and `docs/elements.md` match the code, and the check command passes.

## Go/no-go points

1. **Solvability too slow (test 1 fails).** Stop after phase A. No solver checks, hints, dead-end warning or generated chambers. Stage 03 keeps new mechanics small and relies on recorded solutions. Stage 05's "publish only what you solved" relies on the creator's replay alone: no par, no shortcut report.
2. **Par too slow (test 2 fails).** Keep the solvability check and the report without par. Stage 04 drops moves and portals medals, or uses par set by the author.
3. **Worker too slow (test 3 fails).** Drop next-move hints and the dead-end warning; keep nudge and highlight hints from precomputed milestones. Stage 05's publish check replays the creator's solution; par is shown only once the author's machine has solved the chamber, or the editor limits chamber size to what the browser can solve.
4. **Generator gate (test 4 fails, or F0 fails).** No daily or endless chambers. Stage 05 can offer featured community chambers instead.
5. **Growth.** If a chamber added in stage 03 or 04 pushes solving over budget, simplify that chamber. No chamber in the campaign is exempt from the solver check.

## Risks

- **The state space grows with boxes and size.** Two boxes give ~4–7×10^4 placements; a third multiplies that by ~250. Notice early: the check prints explored states per chamber; watch the trend as chambers are added.
- **Wrong par from a macro-search bug.** Cross-check with the baseline on tiny chambers. A recorded solution beating par is a hard failure. Each final solution is replayed through the real step.
- **The solver and the game disagree on rules.** Rule effects always come from stage 01's step; only the flood fill is solver code, and its edges are replayed (A7).
- **Browser memory.** A visited set of 10^7 keys needs ~160–250 MB; 10^8 doesn't fit a worker. Hints use a bounded search to the next milestone, never a full solve from the start.
- **Stale par after rule changes.** Stage 03 changes rules; the cache key includes the rules version and the check recomputes par.
- **Hints flatten the challenge.** Tiered hints, an explicit key, and hint use shown on the result (open decision 5).
- **Generated chambers are solvable but dull.** Timebox, quality filters calibrated on hand-made chambers, author review.

## Notes for later stages

- **03 Mechanics.** Every new mechanic must be discrete with a small, finite state that fits the key (a timed button adds a counter per button; a slide floor adds nothing; a beam through portals is recomputed from the state, so it adds nothing if never stored). It must also declare its event tiles, and ship a tiny test chamber with hand-counted answers. Echo adds the whole previous attempt to the state, which likely breaks the solver (README open decision 3).
- **04 Campaign.** Medals use the par stored here. Difficulty shown to players comes from clear rates (if open decision 1 is (c)). Hint use is on the result. The menu entry for daily and endless chambers, if phase F passes. A colour for the hint highlight that respects the colour meanings in AGENTS.md.
- **05 Creator platform.** "Publish only what you solved" needs the solver in a browser worker within budget, or the creator's replay with par marked unknown (go/no-go 3). The editor's size limits come from the phase A measurements. The shortcut report's JSON form is shown to creators. Par travels inside the chamber file, so shared links carry it.
