# Solver

A program that searches the states a chamber can reach, to prove it can be finished and to find its par (the fewest moves, the fewest portals). It was built as stage 02's prototype, which stopped on 2026-11-08: it is too slow on the current chambers for what was planned on top of it (see [Why it stopped](#why-it-stopped)). The code stays, runs under Node by hand, and its check runs in `npm run verify`, so it keeps working as the rules change. This file is what the stage learned, and what a revisit would start from.

## Running it

| # | Command | What it does |
|---|---------|--------------|
| 1 | `npm run solve [chamber files]` | Prints each chamber's size (tiles, portal wall sides, flags, boxes, buttons, a rough upper bound on its states, its key's width); every chamber in `src/chambers/` when no file is given. `--baseline` adds the baseline search for both pars, `--solvable` the macro search for any route, `--par` the macro search for both pars; each prints its result, states, effort, time, peak memory and route, and a macro route is replayed through the rules. `--max-states=` (default 1,000,000) and `--max-seconds=` (default 300) cap each search |
| 2 | `npm run solver:check` | Part of `npm run verify`: everything under [How it's checked](#how-its-checked), in about 6 seconds |
| 3 | `npm run state-set:bench` | By hand: 10 million keys in and out of the state set, with the time and memory |

The real chambers need `--max-states=40000000` to search for 5 minutes without running out of room.

## How it works

The ground rule: every rule effect comes from the rules' own `step` (`src/game/rules/step.ts`); the solver never copies a rule. Where it needs to ask the rules something without taking a step, the rules export the check they use themselves: `allowsWay` and `canEnter` (walking), `shotStop` (where a shot stops), `portalEntrance` (the portal a move into a wall enters) and `canInteract` (whether the interact key can do anything). Every shortcut the solver takes is compared with the real step by the solver check.

The pieces, in `src/solver/`:

- **Chamber index** (`chamber_index.ts`): numbers every tile that isn't wall, and every wall side a portal can open on.
- **State key** (`state_key_codec.ts`): a settled state packed into 64 bits from those numbers: the subject's tile and facing, the carried box, each portal (closed or a wall side), each box's tile, one bit per blocked flag. It leaves out what settling decides: each button's pressed flag, the carried box's tile (the subject's) and the completion (the subject on the exit). The current chambers need 52–53 bits.
- **State set** (`state_set.ts`): keys in typed arrays of a capacity fixed up front, numbered in the order added, each with the entry it was reached from, so a route can be rebuilt. 10 million keys go in in 1.7 s and are found in 2.1 s, in 188 MiB.
- **Baseline search** (`baseline_search.ts`): every action from every state, cheapest first (Dijkstra). Exact and slow (about 35,000 states a second on a real chamber); it is the reference the macro search is checked against on the tiny chambers.
- **Macro search** (`macro_search.ts`): one step is a whole walk, then one action that a walk can't do: interact, a shot each way the subject may face, or a move a walk doesn't cover (onto or off an event tile, into a portal). Turning is free, so a state is stored with the subject facing its tile's canonical way (the first way it may move there). Three modes: any route (breadth first, stops at the first completed state), fewest moves and fewest portals (cheapest first on moves then portals, or the reverse). The route found is turned back into key presses (`macro_route.ts`) and replayed through the rules, and must reach every state the search stored.

The shortcuts the macro search takes:

| # | Shortcut | File | Exact? | Used by | What it does |
|---|----------|------|--------|---------|--------------|
| 1 | Walks | `walk_graph.ts` | Yes | All searches | Where the subject can walk changing only its tile, facing and carried box, built once per set of blocked flags. A walk stops at an event tile: one whose element reacts to the subject entering or leaving it (buttons, fizzlers, the exit) |
| 2 | Shot lines | `shot_lines.ts` | Yes | All searches | Tiles whose shot a way stops at the same tile share one result: the first takes the shot through the rules, the others reuse it with only the subject's tile changed. Not on tiles where the subject can be kept from shooting (fizzlers) |
| 3 | No-op skips | `action_filter.ts` | Yes | All searches | An interact or a move that can't change anything but the facing isn't taken through the rules |
| 4 | Regions | `walk_graph.ts`, `macro_route.ts` | Yes | Any route | The subject is stored on its region's smallest tile: the tiles it can walk between both ways (one-way arrows make "the tiles a walk reaches" wrong). A shot line gives one state per region. The route's counts are taken from the actions it expands to |
| 5 | Limited box drops | `action_filter.ts` | No, a guess | Any route | A carried box is put down only on a button, at its start, on or next to the other box, next to a switch or a fizzler, or in front of either portal while both are open. In an unusual layout (a one-way arrow right before a switch, say) it could miss every route; a wrong "unsolvable" would show, since every catalogue chamber has a recorded solution |

## How it's checked

`npm run solver:check` (`scripts/check_solver.ts`):

- Every state along each chamber's recorded solution and 100,000 seeded random steps packs into the key and unpacks unchanged; a chamber too large for the key is refused.
- From every state along the recorded solutions and every state the baseline search finds on the tiny chambers: every walk, turn and shared shot gives the state the rules' step gives; every skipped no-op interact and move changes nothing but the facing; and a tile a walk reaches is in the start's region exactly when a walk from it gets back. The limited box drops aren't checked this way, since the drops they leave out do change the state.
- On every tiny chamber, the baseline and macro searches find both hand-counted pars, the macro search also finds a route for any route, and every route replays to the counts found.

The tiny chambers are in `scripts/solver_fixtures/` (`solver_fixtures.ts` lists them with their routes): walking through a portal, carrying a box through a portal, a box held on a button, a switch across a laser, a fizzler that destroys a carried box, a one-way arrow trap, and putting a box down to use a switch. Each has a fewest-moves and a fewest-portals route counted by hand, never by a search, with a short argument for why each count is the least, and `npm run replay:check` plays both routes.

## What was measured

All in Node 24 on the author's machine (8 cores), one search at a time unless said otherwise.

Size of the problem. The upper bound is tiles × 4 facings × (wall sides + 1)² for the portals × (tiles + 1)² for the boxes × 2^flags:

| # | Chamber | Size | Tiles | Portal wall sides | Flags | Boxes | Buttons | Upper bound | Key bits |
|---|---------|------|-------|-------------------|-------|-------|---------|-------------|----------|
| 1 | 1 | 20×20 | 262 | 225 | 6 | 2 | 5 | ~10^14.4 | 53 |
| 2 | 2 | 23×13 | 189 | 169 | 9 | 2 | 2 | ~10^14.6 | 53 |
| 3 | 3 | 23×17 | 268 | 212 | 5 | 2 | 4 | ~10^14.1 | 52 |

States expanded in 5 minutes as the shortcuts were added (the par searches don't use regions or limited drops):

| # | Chamber | Search | Walks only | + shot lines, regions | + no-op skips | + limited drops |
|---|---------|--------|------------|-----------------------|---------------|-----------------|
| 1 | 1 | any route | 308,160 | 1,564,928 | 1,952,960 | 1,996,352 |
| 2 | 1 | fewest moves | 346,496 | 755,456 | 1,072,448 | — |
| 3 | 2 | any route | 662,208 | 2,000,384 | 2,988,288 | 3,077,760 |
| 4 | 2 | fewest moves | 737,344 | 1,438,592 | 2,409,408 | — |
| 5 | 3 | any route | 1,144,896 | 1,665,408 | solved in 211 s | solved in 110 s |
| 6 | 3 | fewest moves | 1,019,008 | 1,553,280 | 2,487,616 | — |

The solver as it stands (`npm run solve -- --solvable --par --max-states=40000000 --max-seconds=300`, 2026-11-08):

| # | Chamber | Search | Result | States kept | Expanded | Time | Peak memory |
|---|---------|--------|--------|-------------|----------|------|-------------|
| 1 | 1 | any route | gave up | 2,062,500 | 1,996,352 | 300 s | 537 MiB |
| 2 | 1 | fewest moves | gave up | 2,124,927 | 1,176,640 | 300 s | 613 MiB |
| 3 | 1 | fewest portals | gave up | 2,767,380 | 1,232,576 | 300 s | 628 MiB |
| 4 | 2 | any route | gave up | 4,632,844 | 3,077,760 | 300 s | 628 MiB |
| 5 | 2 | fewest moves | gave up | 3,988,349 | 2,247,744 | 300 s | 671 MiB |
| 6 | 2 | fewest portals | gave up | 3,857,234 | 2,220,224 | 300 s | 671 MiB |
| 7 | 3 | any route | solved: 166 moves, 26 portals | 1,131,692 | 1,131,690 | 110 s | 624 MiB |
| 8 | 3 | fewest moves | gave up | 2,845,748 | 2,328,768 | 300 s | 629 MiB |
| 9 | 3 | fewest portals | gave up | 2,705,013 | 2,064,768 | 300 s | 629 MiB |

What the numbers say:

- Chamber 3's any-route search expanded all but 2 of the states it kept, so 1.13 million is close to all its any-route states. Its route (166 moves, 26 portals) isn't optimal: the recorded solution takes 121 and 28.
- Given 10 minutes (all three chambers at once, which slows each by about 25%), chamber 1 kept 6,151,720 states with 2,366,824 still waiting (66,148 at 5 minutes), and chamber 2 kept 6,988,696 with 2,369,944 waiting (1,555,084 at 5 minutes). Both keep growing past five times chamber 3's total.
- Every box drop in chambers 1 and 2's recorded solutions is one the drop limit allows, so it isn't what keeps them from finishing.
- Where the time goes: shots are 88–92% of the rules' steps (34–67 first shots on a line per expanded state), at 270,000–450,000 steps a second. A 15-second profile of chamber 1's any-route search (before the no-op skips) put 45% of the time in the rules' step and 27% in packing states into keys and back.
- Run-to-run noise is about ±10% on the states expanded in 5 minutes.

Earlier, on the original rules (since deleted), two throwaway searches failed: a breadth-first search over single presses found nothing in chamber 2 after 2.75 million states (49 presses deep), and one that treated walking as free and searched over world-changing actions reached 13 actions deep before portal pairs times box positions blew up; each chamber needs 20–40 such actions.

## Why it stopped

The prototype had to pass these before anything was built on it:

| # | Test | Pass | If it fails |
|---|------|------|-------------|
| 1 | Node: any route on each current chamber | ≤ 60 s, ≤ 2 GB | Stop after the prototype |
| 2 | Node: both pars on each current chamber | ≤ 60 s, ≤ 2 GB | Keep the solvability check, drop par |
| 3 | Browser worker: the next move to the next milestone, from a mid-game state | ≤ 1 s for 95% of states, ≤ 256 MB | No live next-move hints, no dead-end warning |
| 4 | Node: any route on a 12×12 chamber with one box | ≤ 2 s | No generated chambers |

Test 1 failed: chamber 3 takes 110 s, and chambers 1 and 2 haven't finished after 10 minutes, past 6 million states each, so passing would take well over 10× more speed. Test 2 failed with it (no par search finished in 5 minutes). Tests 3 and 4 weren't run. What was dropped (roadmap decision 10): the solvability and par checks, par in the chamber files, the shortcut report, hints and the dead-end warning, solver difficulty metrics (difficulty comes from measured clear rates instead) and generated chambers.

## If it's revisited

Ideas not tried:

- **Skip refused shots.** A shot that is refused, or puts a portal where it already is, changes nothing, but still takes a step; how many do wasn't measured. Most walls in the current chambers take portals, so the gain may be small.
- **Less packing and unpacking.** Turning keys into states and back took about a quarter of the time.
- **Several cores.** Each search runs on one core.
- **Search toward the exit.** The any-route search explores every state at one depth before the next; a search guided by an estimate of the distance left might reach the exit far sooner, while still proving "unsolvable" only by exhausting the states.
- **Dead ends.** Marking states from which the exit can't be reached (by searching backwards over the explored states) would prune them, and would measure how many there are; one-way arrows are the main source today.
- **Smaller chambers.** Test 4 (12×12, one box, ≤ 2 s) was never run; generated or player-made chambers could be sized to what the solver handles.

Known limits:

- Boxes aren't interchangeable: a box link and a fizzler each send a box back to its own start, so treating boxes as identical is only safe in a chamber with neither (today only chamber 2).
- The state space grows with boxes and size: two boxes give ~4–7×10^4 placements, and a third multiplies that by ~250.
- A browser worker holds about 10^7 keys (160–250 MB); 10^8 doesn't fit.
- A new mechanic must keep the state discrete and small enough for the 64-bit key (a timed button adds a counter per button; a beam through portals adds nothing if it is recomputed from the state rather than stored), declare its event tiles, and come with a tiny chamber with hand-counted pars. Echo (a ghost replaying the previous attempt) puts the whole previous attempt in the state, which likely breaks the solver.

What was planned on top of the prototype, and decided, in case it comes back:

- **Par.** Two independent optimums: fewest moves (ties broken by fewest portals) and fewest portals (ties broken by fewest moves), each with its own stored solution. Stored in the chamber file's `par` block, which format 2 already reserves and nothing writes yet. The chamber hash that recorded solutions pin covers the whole file, `par` included, so writing par would make every recorded solution report a changed chamber: leave `par` out of that hash first, or re-record them.
- **Checks.** A solve-all table (id, number, solvable, par, states, time) with `--write` to store par; every chamber solvable, stored par equal to computed par, and no recorded solution beating par (that would mean a solver bug, so a hard failure); results cached by chamber content plus solver and rules version; the optimal routes stored next to the recorded solution and replayed by the replay check.
- **Designer tools.** Solving with a restriction (a door never opens, a box never carried, no portal on a wall area); a report of par against the recorded solution (flagged under 70% of its moves), the elements the chamber is solvable without, wall sides no optimal route uses and tiles never reached; a development-only replay viewer.
- **Player features.** Milestones derived offline from the optimal route; the solver in a lazily created worker owned by the chamber screen, with a newer request cancelling the older; a dead-end warning ("You can't finish from here", with a Rewind action) off by default behind a Settings switch, reporting only when a search is exhausted; tiered hints (a nudge naming the element, a highlight, the next move) on an 11th rebindable game key, default H, that doesn't start the clock, with hint use shown on the result; analytics events `hint_request` and `dead_end_shown`.
- **Difficulty.** Shown to players from measured clear rates; solver numbers only as a designer aid.
- **Generated chambers.** Mutating hand-made chambers at 12×12 or less and keeping what the solver accepts, timeboxed to 10 sittings, shipped pre-generated after the author's review.
