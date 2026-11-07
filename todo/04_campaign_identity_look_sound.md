# Stage 04 — Campaign, identity, look and sound

Status: Draft
Last revised: 2026-11-06

## Goal

The game becomes its own thing and grows to full length: an original name, facility and voice with nothing borrowed from Valve, about 120 handcrafted chambers in about 10 wings (one mechanic per wing, tutorial first), a menu and catalogue that scale to that many, wings ordered by measured difficulty, medals on time, moves and portals, a reworked look (smooth, sharp, with the flat look kept as "blueprint" mode, colour-blind palettes and a relaxed mode), and music that reacts to play.

## Depends on

These are assumptions about what earlier stages delivered. Re-check each when revisiting this stage.

- **00 Fixes:** completions and best times keyed by permanent id; the game canvas sharp on high-DPI screens; analytics sending quits on tab close, an attempt counter and first-completion and new-best flags, collecting since 00 shipped (months of history by now); one local check command.
- **01 Engine v2:** a pure step (state + key → next state) with the frame loop only animating and drawing; replays and recorded solutions checked locally; undo, with "moves" counting decided (open decision 1, counting side); chamber format v2 (versioned, optional lists); elements described by data, each declaring how it is drawn; the engine runs under Node; game sounds emitted as events, not played by the rules; the input rewrite with remappable keys (decision 2 put input there, so this stage does not touch it; the gamepad was dropped, decision 9).
- **02 Solver:** every chamber proven solvable in the local checks; par for fewest moves and fewest portals stored per chamber; the shortcut finder report. Whether a solver difficulty score exists was settled there (open decision 2). If 02's prototype failed its go/no-go, par falls back to the best recorded solution (see Go/no-go points).
- **03 Mechanics:** each new mechanic exists with its teach → test → twist → combine plan, at least one chamber, a recorded solution, a solver run and a `docs/elements.md` entry. The wing list below follows whatever 03 actually shipped.

## Decisions made

- 2026-11-06 — Colour-blind palettes and relaxed mode belong to this stage; remappable keys went to stage 01 (README decision 2); the gamepad, also sent there, was later dropped (README decision 9).
- 2026-11-06 — Chamber links (`/chamber/N`, by position) stay as they are until this stage picks the numbering scheme (README decision 4).
- 2026-11-06 — The identity must be settled before stage 05 shares anything publicly (README open decision 5).
- Unchanged from `AGENTS.md`: desktop only; colour meanings (blue interaction and success, orange the second portal, red caution, green a completed chamber); `localStorage` keys keep the `portal-2d.` prefix and analytics event and parameter names never change, even after a rename (changing either splits or loses history).

## Open decisions

1. **The game's name and identity** (README open decision 5).
   - (a) Fully original: new name, facility name, wordmark, signage and voice; Valve's logo, links and distinctive terms removed, with at most a plain-text "inspired by Portal" credit in About. Cost: design work up front; some copy and docs rewritten.
   - (b) Stay "Portal 2D" as a non-commercial fan game. Cost: no sales ever, and the risk grows with every public share in stage 05.
   - Recommendation: (a). Rename the distinctive terms (Aperture Science, "fizzler"); keep generic words (portal, box, button, door, laser, test chamber). Not legal advice: if the game will ever be sold, have the name checked by someone qualified.
2. **Chamber numbering and links** (README open decision 6). Wings mean chambers get shown as "wing–chamber" (for example "3–04"), and the difficulty phase below will reorder chambers inside wings, so any link built from position will shift.
   - (a) Links by permanent id (`/chamber/<id>`); the screen shows the wing–chamber number. Cost: the number in the address differs from the one on screen.
   - (b) Links by a permanent slug per chamber (`/chamber/<slug>`). Cost: every chamber needs a unique title, kept forever like an id.
   - (c) Links by wing and position (`/chamber/3-04`). Cost: shifts whenever data reorders a wing; contradicts the difficulty phase.
   - Recommendation: (a). Add slugs later as aliases if chambers get titles during identity work. Either way, old `/chamber/1`, `/chamber/2`, `/chamber/3` redirect through a fixed table.
3. **Medals and undo** (README open decision 1, medals side; counting is settled in 01).
   - (a) Moves count every step taken, undone ones included; undo is allowed and shown on the result. Cost: undo costs moves, which some players may find harsh.
   - (b) Undo allowed in casual play, disabled in a "ranked" run. Cost: two modes to explain and build.
   - (c) Moves count the final path only. Cost: anyone reaches par by undoing; the medal is meaningless.
   - Recommendation: (a), matching the README.
4. **Medal thresholds.**
   - Moves and portals: gold at par, silver within 125 % of par (rounded up), bronze for completing. Time has no solver par, so the time thresholds start from the author's own best run × a factor and are re-tuned from data (for example the top 10 % of times).
   - Recommendation: as above. Revisit the 125 % once data exists.
5. **The "histogram of all players".** A static site has no aggregated data, and GA4 cannot be queried from the browser: it needs credentials.
   - (a) Baked at build time: a local script queries the BigQuery export of GA4, writes per-chamber distributions as JSON into `src/`, and the next deploy ships them. Cost: BigQuery setup; data only as fresh as the last deploy; the export only covers data from the day it was linked.
   - (b) Deferred to stage 05 Stage B (Firestore aggregates). Cost: no histogram until accounts exist.
   - (c) Medals only, no histogram.
   - Recommendation: ship (c) first. Build (a) only if the difficulty phase already has the BigQuery pipeline working (it is the same data); otherwise wait for (b).
6. **Renderer: 2D canvas or GPU** (README open decision 4).
   - (a) Stay on the 2D canvas. Cost: effects such as glow and particles must be drawn by hand; enough for a 23×20 grid.
   - (b) WebGL, directly or through a library such as PixiJS. Cost: a large dependency or a lot of code, and a second way to draw the chamber previews.
   - Recommendation: (a), unless the profiling step shows the largest chamber with all effects can't hold 60 fps at `devicePixelRatio` 2 on a mid-range laptop.
7. **Where the game's colours live** once the hex-literal exception in `AGENTS.md` is lifted. Today the renderer and element files hold hex literals.
   - (a) One palette module in `src/game/` with named `rgba()` colours; the screen picks a palette (standard or colour-blind) and passes it to the renderer. CSS tokens mirror it by hand.
   - (b) The renderer reads the CSS tokens at runtime. Cost: makes the engine depend on the DOM, which breaks running it under Node.
   - Recommendation: (a).
8. **Wing progression.**
   - (a) All wings open; the suggested order is shown. Cost: players may jump into hard wings first.
   - (b) A wing opens when all but two chambers of the previous wing are completed. Cost: a player stuck on three chambers is stuck.
   - (c) Strict: every chamber of the previous wing. Cost: one hard chamber blocks the rest of the game.
   - Recommendation: (b).
9. **Music loading.** The loading screen downloads every file under `src/assets/audio/` (`asset_preloader.ts`, `import.meta.glob`). Today that is about 3.6 MB (`menu.mp3` 2.2 MB, `game.mp3` 1.2 MB, sound effects about 0.2 MB). Ten wing themes with layers could add 10–30 MB.
   - (a) Keep preloading everything. Cost: a long first load.
   - (b) Preload the menu music, effects and the first wing's theme; fetch other themes as in-memory copies when their wing is opened (same reason as today: Firebase varies responses by encoding). Cost: changes the loading-screen rule in `AGENTS.md`; a short wait the first time a wing opens.
   - Recommendation: (b) once total audio passes about 8 MB.
10. **Relaxed mode and records.**
    - (a) The clock still runs but is hidden; relaxed runs don't set best times or time medals; moves and portal medals still count; analytics marks the run as relaxed.
    - (b) Relaxed runs count for everything, clock hidden. Cost: best times recorded while the player couldn't see the clock.
    - Recommendation: (a).

## Steps

### Phase A — Identity (before anything public)

- [ ] **Inventory everything tied to Valve.** Write a table in this file's Notes (file, what, origin, action). Known today: the title and description in `index.html` (lines 10–11); the wordmark text "Portal 2D" in `src/components/portal_logo.vue` (default `text`, line 14) used on the home, chamber, loading and desktop-only screens; the message in `src/components/desktop_only_notice.vue` (line 11); the Aperture Science logo `src/assets/images/aperture_science.svg` on the loading screen (`loading_screen.vue` 188–194); About's "Original game" links to the Steam pages of Portal and Portal 2 (`home_screen.vue` 124–136); the changelog line mentioning "the original game" (`src/services/changelog.ts`); element names such as "fizzler" in copy and `docs/elements.md`. Verify: grep for "portal", "aperture", "steam" and "fizzler" across `src/`, `index.html` and `docs/`, and every hit is in the table.
- [ ] **Check the origin and licence of every asset.** For each file under `src/assets/images/` (`facility_room.webp`, `level_indicator.png`, `aperture_science.svg`) and `src/assets/audio/` (2 music tracks, 14 sound effects): where it came from and under what licence. Anything taken from a Valve game or without a clear licence is marked for replacement. Verify: every asset has a row with source and licence.
- [ ] **Choose the name, facility name and voice** (open decision 1). Write a one-page identity brief in this file's Notes: name, facility, who speaks between chambers and how (tone, length), signage style; the colour meanings stay as in `AGENTS.md`. Verify: the name is checked for clashes (web search, Steam, itch.io, domain availability, the EUIPO and USPTO trademark searches) and the results are recorded.
- [ ] **Decide the address.** The Firebase project id `portal-2d` cannot be renamed. Add a new Hosting site (or a custom domain) under the same project so analytics history stays in one property, and redirect the old address. Verify: a preview channel on the new site serves the game; the old address redirects. (Assumption: multiple Hosting sites per project fit this use; confirm in the Firebase console.)
- [ ] **New wordmark** (uses the frontend-design skill). Redesign `portal_logo.vue` (rename the component to match the new name) for the four places it appears. Verify: lint and build pass; the home screen, chamber rail, loading screen and desktop-only notice look right at 1280×720 and 2560×1440.
- [ ] **Replace the loading screen's logo** (uses the frontend-design skill). New facility mark as a small SVG (Vite inlines it); delete `aperture_science.svg`, since the preloader downloads every image. Verify: the loading screen in `npm run dev`; the old file is gone from `dist/` after `npm run build`.
- [ ] **Rename the distinctive terms in copy and docs.** Player-facing text, `docs/elements.md` and the changelog only; code identifiers stay unless stage 01 already renamed them. Verify: the inventory table's text rows are all resolved.
- [ ] **Rework About's "Original game" section** (uses the frontend-design skill). Replace the Steam links with a plain-text credit, or remove the section, per open decision 1. The `link_open` event stays as is for the remaining links. Verify: keyboard walk through About (Right, Up/Down, Left, Escape) behaves as `AGENTS.md` describes.
- [ ] **Update the metadata.** `index.html` title and description, the desktop-only notice, the repository `README.md`, and the project paragraph and UI direction in `AGENTS.md` (which mention the Aperture Science logo). Verify: grep finds no old name outside the storage prefix, the analytics config and `.firebaserc`.
- [ ] **Voice between chambers** (uses the frontend-design skill). Short lines per chamber stored with the chamber's catalogue entry (not in the engine), shown in the chamber-complete dialog or on the rail. Text only, no recorded voice, unless the brief says otherwise. Verify: lines show on completion; the dialog's focus and arrow-key behaviour from `dialog_frame.vue` is unchanged.
- [ ] **Side-rail storytelling** (uses the frontend-design skill). One optional line per chamber on the chamber screen's rail, under the chamber sign. Verify: long lines wrap without moving the timer or the legend at 1280×720.

### Phase B — Catalogue and links that scale

- [ ] **A wing manifest.** Add `src/chambers/wings.json` (or a typed `.ts`): wings in order, each with its id, its mechanic and its chambers' permanent ids in order. Chamber files are named by permanent id (`chamber_<id>.json`; ids 1–3 already match today's names). Display numbers come from position, never typed by hand. Verify: the type checker validates the manifest without a cast; build passes.
- [ ] **Load chambers without a hand-kept list.** Replace the static imports in `src/services/chamber_catalogue.ts` with `import.meta.glob`, excluding stage 01's recorded solutions, which sit next to the chamber files as `chamber_N.solution.json` (for example `['@/chambers/chamber_*.json', '!@/chambers/*.solution.json']`). Renaming a chamber file renames its solution file too. Start eager (every chamber in the bundle; 120 chambers ≈ 70–100 KB gzipped); switch to lazy loading per wing only if the bundle watch (Phase I) flags it. Verify: build output size recorded before and after.
- [ ] **Catalogue check.** A local check that every chamber file appears in the manifest exactly once, ids are unique, retired ids (kept in a list) are never reused, and every chamber has a recorded solution and stored par (from the 01 and 02 checks). Verify: break each rule once on purpose and the check fails.
- [ ] **Numbering and links** (open decision 2). Change the chamber route in `src/router.ts` to the chosen scheme; add the fixed redirect table for `/chamber/1`, `/chamber/2` and `/chamber/3`; unknown chambers still fall back home. Verify: in `npm run preview`, each old link opens the right chamber and an unknown one goes home.
- [ ] **Hosting headers.** In `firebase.json`, make the no-cache headers match the new route patterns and remove the stale `/settings` entry if stage 00 didn't. Verify: after a preview deploy, `curl -I` on a chamber address shows `Cache-Control: no-cache`.
- [ ] **Everything keyed by id.** The chamber screen takes the chamber's id instead of its number; `last_chamber.ts` keeps the id; progress is already keyed by id (00). Verify: reorder two chambers in the manifest locally; completions, best times and the highlight on return follow the chamber.
- [ ] **Analytics stays comparable.** `chamber_number` keeps meaning the global position (1, 2, 3…); add a new parameter `wing_id` to the chamber events instead of changing what `chamber_number` means. Register it in GA4 (only the author can). Verify: a production preview build sends `wing_id` (GA4 DebugView).

### Phase C — A Play menu that scales

- [ ] **Design the wing level** (uses the frontend-design skill). Today the home menu has up to three columns (sections, rows, detail) and the Play list can't scroll. Add wings: for example Play → wing rows → that wing's chambers, with the map moving into the chamber column's detail or a preview beside it. It must keep the keyboard model in `AGENTS.md` (Up/Down within a column with wrapping, Right/Enter steps in, Left/Escape steps back, one Tab stop per column, hover highlights, held Enter ignored), and leave room for stage 05's Editor and, later, Community entries. Verify: the design is written down here before building.
- [ ] **Build the wing column and the scrolling chamber list** (uses the frontend-design skill). The highlighted row scrolls into view, the cascade still lines up with `--menu-row-height`, and interface sounds play as `AGENTS.md` lists. Verify: keyboard-only and pointer-only walks through every wing; `prefers-reduced-motion` respected.
- [ ] **Wing progression** (open decision 8; uses the frontend-design skill). Locked wings are visible but marked, with a plain line saying what opens them. Verify: Reset progress locks them again.
- [ ] **Daily and endless chambers (only if stage 02's phase F passed)** (uses the frontend-design skill). A menu entry and route for the pre-generated daily chamber and endless packs, with the route's no-cache header in `firebase.json`; their records follow stage 05's key space for chambers outside the catalogue. Skip and tick with "not applicable" if phase F was a no-go. Verify: today's daily opens from the menu and directly by address.
- [ ] **Back from a chamber.** Play opens on that chamber's wing with the chamber highlighted and focused, as today. Verify: back from the first, a middle and the last chamber of a wing.
- [ ] **Update `AGENTS.md`.** Keyboard ownership, the layout description and the UI direction for the new menu.

### Phase D — Campaign content

- [ ] **Wing plan.** A table in this file: about 10 wings, each with its mechanic and its teach → test → twist → combine split (about 12 chambers each). Starting draft, to be redone with 03's results: 1 basics and tutorial (walk, turn, shoot, carry, buttons); 2 doors and switches; 3 barriers and ditches; 4 fizzlers; 5 arrows; 6 live lasers; 7 slide floors; 8 conveyors and rotating arrows; 9 timed buttons and mirror blocks; 10 combinations (echo, if 03 built it). Verify: every mechanic 03 shipped has a wing or a reason it doesn't.
- [ ] **Authoring workflow before the editor.** Until stage 05's editor exists: hand-write chamber v2 JSON; a development-only route (behind `import.meta.env.DEV`, never in production builds) that loads a chamber file from disk and reloads on save, extending stage 03's lab route rather than adding a second one; record the solution by playing it with 01's recorder; run 02's solver for par and the shortcut report; tick a per-chamber checklist (solution recorded, par stored, shortcut report read, one playtest by someone else). Verify: one chamber goes through the whole workflow; a production build has no development route.
- [ ] **Tutorial wing.** Each chamber introduces one control (move, turn with Ctrl, shoot with A and D, carry with Space) and one element, using the rail's legend. Verify: a first-time player finishes it without being told the keys.
- [ ] **Move the three current chambers into wings.** They keep permanent ids 1–3; their old links go through the redirect table. Verify: their completions and best times survive.
- [ ] **Author wing 1** (each wing ships as its own release with a changelog entry in `src/services/changelog.ts`). Verify: catalogue check, replay check and solver check pass; playtested.
- [ ] **Author wing 2.** Same checks.
- [ ] **Author wing 3.** Same checks.
- [ ] **Author wing 4.** Same checks.
- [ ] **Author wing 5.** Same checks.
- [ ] **Author wing 6.** Same checks.
- [ ] **Author wing 7.** Same checks.
- [ ] **Author wing 8.** Same checks.
- [ ] **Author wing 9.** Same checks.
- [ ] **Author wing 10.** Same checks.

### Phase E — Difficulty from data

- [ ] **Define the per-chamber measures.** Starts, unique starters, completions, clear rate (completions ÷ unique starters), quit rate (including tab closes from 00), median time, median moves, median attempts before the first completion (00's attempt counter), restarts per completion. List the events and parameters each one needs and confirm they are registered as custom dimensions or metrics in GA4 (an admin action only the author can do). Verify: each measure maps to events that DebugView shows.
- [ ] **Data pipeline.** A local script, never shipped, that pulls per-chamber aggregates. GA4 can't be queried from the browser, so results reach the game only by being baked into a build. Options: the BigQuery export (raw events, so distributions and medians work; not retroactive, so it only has data from the day it was linked) or the GA4 Data API with a service account (aggregates only). Recommendation: BigQuery. Verify: the script prints the measures for the current chambers.
- [ ] **Minimum sample.** Don't reorder a chamber on fewer than about 50 unique first-time players (a rule of thumb; GA4 also hides small counts behind its data thresholds). Below that, order by playtests. Verify: the script marks chambers below the threshold.
- [ ] **Ordering rule.** Inside a wing, order by median attempts before the first completion, with clear rate as the tie-break; across wings, mechanic dependencies come first, then difficulty. Write each reorder in the changelog. Verify: after a reorder, progress and links still follow each chamber (Phase B's id keying).

### Phase F — Medals

- [ ] **Store the best moves and portals.** Extend `src/services/progress.ts` to keep the best moves and fewest portals per chamber id alongside the best time, inside stage 00's single versioned progress record (bump its version, migrate in the same merge style; every access in `try`/`catch`, cleared by Reset progress). Update `AGENTS.md`'s persistence section. Verify: complete a chamber twice with different results; reload; Reset progress clears all three.
- [ ] **Medal rules** (open decisions 3 and 4). A small service that turns best values and par into medals on three axes. Verify: worked examples in a table here match its output for edge cases (exactly par, one over, no par stored).
- [ ] **Medals on the result dialog and chamber rows** (uses the frontend-design skill). Three axes, plus an "undo used" mark on the result when it applies. Colours keep their `AGENTS.md` meanings; medals must not rely on colour alone. Verify: keyboard flow in the chamber-complete dialog unchanged; contrast checked.
- [ ] **Analytics.** Add medal parameters to `chamber_complete` (new names only; never rename existing ones). Verify: DebugView.
- [ ] **Histogram** (open decision 5). Do nothing in this stage unless the BigQuery pipeline from Phase E already works; then bake per-chamber distributions into a JSON file at build time and draw them on the result dialog (uses the frontend-design skill).

### Phase G — Visual rework

- [ ] **Profile first.** Measure frame time on the largest chamber at `devicePixelRatio` 1 and 2. Today the level redraws only when the state changes (`level.ts`, frame loop), so animation means drawing every frame while something moves. Verify: numbers recorded here; open decision 6 settled.
- [ ] **Palette module** (open decision 7). Move the game's hex literals into named `rgba()` colours in one module in `src/game/`; the renderer takes a palette. Lift the hex-literal exception in `AGENTS.md`. The drawing stays identical. Verify: a screenshot of each chamber's start state before and after matches.
- [ ] **Animation layer** (uses the frontend-design skill). Purely visual interpolation between consecutive states from 01's pure step. A new key never waits: it snaps the running animation to its end. The clock is unaffected; `prefers-reduced-motion` turns interpolation off. Verify: the replay check still passes (rules untouched); fast key mashing feels as responsive as before.
- [ ] **Smooth steps** (uses the frontend-design skill). The subject and a carried box glide between tiles. Verify: visual check; reduced motion shows plain steps.
- [ ] **Laser glow** (uses the frontend-design skill). Verify: 60 fps on the largest chamber at `devicePixelRatio` 2.
- [ ] **Portals with a glimpse of the other side** (uses the frontend-design skill). Draw the tiles in front of the other portal, clipped to the portal's shape. Verify: correct for every pair of portal facings.
- [ ] **Particles when something fizzles** (uses the frontend-design skill). On the fizzler event emitted by 01 (portals cleared, box destroyed). Verify: none with reduced motion.
- [ ] **Camera for large chambers** (uses the frontend-design skill). Follows the subject only when the chamber doesn't fit the canvas at a minimum tile size; menu previews and the editor always show the whole chamber. Verify: test with a chamber larger than any shipped one.
- [ ] **Blueprint mode** (uses the frontend-design skill). Today's flat drawing kept as a Settings switch (settings service, a new `portal-2d.` key, `setting_change` with a new `setting` value). The menu's chamber maps stay flat in both modes. Verify: toggling mid-chamber redraws without resetting anything.
- [ ] **Colour-blind palettes and portal shapes** (uses the frontend-design skill). Shapes on the two portals (for example a ring on one, a notch on the other), drawn in both modes and repeated on the legend's keycaps; selectable palettes for red–green and blue–yellow colour blindness. The CSS tokens follow the chosen palette through a class on the root element, so the wordmark and legend match. Verify: Chrome DevTools' "Emulate vision deficiencies" for each type; the portals can be told apart with no colour at all (greyscale).
- [ ] **Relaxed mode** (open decision 10; uses the frontend-design skill). A Settings switch that hides the timer on the chamber screen and the best times on rows; records follow the decision; analytics adds a `relaxed` parameter. Verify: a relaxed run never changes the stored best time.
- [ ] **Check high-DPI again.** 00's sharpness fix still holds with every new layer. Verify: 200 % browser zoom and a high-DPI screen.

### Phase H — Music that reacts to play

- [ ] **Layered playback.** Stems of one track must start together and stay in sync, which `HTMLAudioElement` (used by `src/game/music.ts` through `createAudioPlayer`) can't guarantee. Move music to the Web Audio API, decoding the in-memory copies the preloader already hands over. Music stays out of the rules: the screen maps the game's events to layers. Verify: two stems stay in sync over a 10-minute loop.
- [ ] **Progress layers.** A layer enters as the chamber progresses (for example percussion when the first door opens), driven by game events or by an optional per-chamber cue list in the chamber's metadata. Verify: replaying a solution brings the layers in at the same moments every time.
- [ ] **Solve cue.** A short sting on completion that ducks the chamber music; obeys the music setting. Verify: no cue when music is off; no overlap when Next chamber is pressed quickly.
- [ ] **A theme per wing.** Commissioned or composed, with the licence recorded in Phase A's table. Verify: each wing plays its theme; the menu music still resumes where it left off.
- [ ] **Download budget** (open decision 9). Measure total audio after each new theme; past about 8 MB, switch to loading wing themes on demand and update `asset_preloader.ts` and the loading-screen rule in `AGENTS.md`. Verify: first-visit download size recorded per release.

### Phase I — Local checks and release

- [ ] **Preview deploys from the local machine.** A script (for example `npm run deploy:preview`) running `firebase hosting:channel:deploy <name> --expires 7d`. Verify: the preview URL serves the build and its headers match production.
- [ ] **Bundle-size watch.** Added to 00's local check command: compares `dist/assets` sizes with a stored baseline and fails above a set growth. Verify: a deliberately large import makes it fail.
- [ ] **Unused-asset check.** Fails when a file under `src/assets/` is no longer referenced, since the preloader downloads every file. Verify: an unreferenced test file makes it fail.
- [ ] **Docs.** `AGENTS.md` (identity, UI direction, keyboard model, persistence, loading screen, colour rule, analytics parameters), `docs/elements.md` and the changelog match what shipped.

## Local checks added

- Catalogue check: manifest complete, ids unique and never reused, every chamber with a recorded solution and par.
- Bundle-size watch against a stored baseline.
- Unused-asset check.
- Preview deploy command (not a check, but part of every release from here on).

## Done when

- [ ] Nothing tied to Valve remains in the shipped site; every row of the inventory table is resolved; every asset has a recorded source and licence.
- [ ] The new name is live on its chosen address, and the old address redirects.
- [ ] About 120 chambers in about 10 wings ship, each passing the catalogue, replay and solver checks with par stored.
- [ ] Old `/chamber/1`–`/chamber/3` links open their chambers; progress, best times and the return highlight follow chambers by id after a reorder.
- [ ] The Play menu with wings works fully by keyboard and by pointer, and `AGENTS.md` describes it.
- [ ] Medals on three axes show on results and rows, are stored by id and are cleared by Reset progress.
- [ ] The visual rework ships with blueprint mode, colour-blind palettes, portal shapes and relaxed mode; reduced motion is respected; the replay check still passes.
- [ ] Reactive music with a theme per wing ships within the download budget.
- [ ] Wing order has been reviewed against data for every chamber above the sample threshold.
- [ ] All local checks pass, and the release was reviewed on a preview channel before going to production.

## Go/no-go points

- **Identity:** if no name clears the clash check, stop before stage 05 shares anything publicly.
- **Solver (from 02):** if 02's prototype was a no-go, par becomes the best recorded solution, and the moves and portals medals are labelled "target" rather than "par".
- **Renderer:** if the 2D canvas can't hold 60 fps at `devicePixelRatio` 2 on the largest chamber with all effects, reopen open decision 6.
- **Data volume:** if chambers stay below the sample threshold after about two months, order by playtests and leave the histogram to stage 05.
- **Audio budget:** past about 8 MB of audio, switch to loading wing themes on demand (open decision 9).
- **Menu:** if the wing level can't keep the keyboard model simple, fall back to one page per wing in the existing columns.

## Risks

- **Content volume.** 120 chambers is most of this stage's work. Ship wing by wing, each as its own release, so the game grows instead of waiting.
- **Identity churn.** Voice lines, titles and signage written before the identity is settled get rewritten. Phase A comes first for this reason.
- **Reordering surprises players.** Display numbers change after a data-driven reorder. Progress is safe (keyed by id); say what changed in the changelog.
- **Thin or hidden data.** Low traffic, plus GA4's thresholds for small counts, may leave most chambers without usable numbers. Playtests are the fallback.
- **Animation hurting the feel.** Interpolation that delays input makes a discrete puzzle game feel sluggish. The snap-on-key rule and the mashing test guard against it.
- **Colours drifting apart.** Canvas palettes and CSS tokens are kept in step by hand; the colour-blind palettes double the chance of a mismatch. Check both together in each palette step.
- **Asset licences.** If existing sounds or images turn out to be Valve's, replacing them adds unplanned audio and art work.
- **The Firebase project id stays `portal-2d`.** It can't be renamed; only a new site or a custom domain hides it.

## Notes for later stages

- Stage 05's editor reuses the chamber format, the renderer (blueprint mode suits editing), the wing manifest, the solution recorder, the per-chamber authoring checklist and the preview deploy command.
- Stage 05 shares nothing publicly until Phase A is done.
- Stage 05 Stage B replaces the baked histogram (if built) with live aggregates and can reuse the medal rules and thresholds for published chambers.
- The links scheme chosen here is the pattern for shared and published chambers in stage 05; any new route needs a no-cache header in `firebase.json`.
- Notes (filled in during this stage): Valve inventory table, asset licence table, identity brief, wing plan, menu design, medal worked examples, profiling numbers.
