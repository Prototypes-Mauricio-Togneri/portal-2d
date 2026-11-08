# Stage 03 — Identity, look and sound

Status: Draft
Last revised: 2026-11-08

## Goal

The game becomes its own thing before it grows: an original name, facility and voice with nothing borrowed from Valve, a reworked look (smooth, sharp, with the flat look kept as "blueprint" mode, colour-blind palettes and a relaxed mode), music that reacts to play, and one new chamber, a tutorial shown as chamber 0. No other chambers are added here: stage 04 adds the new mechanics and completes the campaign (20 chambers in total, numbered 0–19, with no wings) once this stage is right.

## Depends on

These are assumptions about what earlier stages delivered. Re-check each when revisiting this stage.

- **00 Fixes:** completions and best times keyed by permanent id; the game canvas sharp on high-DPI screens; analytics sending quits on tab close, an attempt counter and first-completion and new-best flags, collecting since 00 shipped (months of history by now); one local check command.
- **01 Engine v2:** a pure step (state + key → next state) with the frame loop only animating and drawing; replays and recorded solutions checked locally; undo, with "moves" counting decided (open decision 1, counting side); chamber format v2 (versioned, optional lists); elements described by data, each declaring how it is drawn; the engine runs under Node; game sounds emitted as events, not played by the rules; the input rewrite with remappable keys (decision 2 put input there, so this stage does not touch it; the gamepad was dropped, decision 9).
  - As built, 2026-11-07 (kept from stage 01's notes when its file was removed): the renderer (`src/game/renderer.ts`) draws layer by layer (`DRAW_LAYERS`), each element type in registry order by its drawing in `src/game/element_drawings.ts`. The step's events (crossed a portal, fizzled, a door opened…) and the states before and after each step are the hooks for animation.
  - The pixel comparison page (old and new renderer compared byte for byte) was deleted with the old renderer; if an intentional visual change needs one, git history has it (`git show 8c2659c^:src/dev/render_check.ts`).
- **02 Solver:** stopped after its prototype (README decision 10): no solvability check, no par and no shortcut report. This stage uses no solver; the tutorial chamber is checked by its recorded solution, like every chamber.

## Decisions made

- 2026-11-06 — Colour-blind palettes and relaxed mode belong to this stage; remappable keys went to stage 01 (README decision 2); the gamepad, also sent there, was later dropped (README decision 9).
- 2026-11-06 — Chamber links (`/chamber/N`, by position) stay as they are until stage 04 picks the numbering scheme (README decision 4, written when that work was still planned for this stage). This stage only starts the count at 0.
- 2026-11-06 — The identity must be settled before stage 05 shares anything publicly (README open decision 5).
- 2026-11-08 — This stage and the mechanics stage swapped places (README decision 11): identity, look and sound come first, and the new mechanics and the rest of the campaign follow in stage 04, once this stage is right.
- 2026-11-08 — Only one new chamber here: the tutorial, numbered 0, so chambers 1–3 keep their numbers and links. The campaign has 20 chambers in total (0–19); stage 04 adds the other 16.
- 2026-11-08 — The catalogue and links that scale, the Play menu that scales, the campaign content, difficulty from data and medals moved to stage 04, with their open decisions (chamber numbering and links, medals and undo, medal thresholds, the histogram).
- 2026-11-08 — No wings: the campaign is one list of 20 chambers. Wing progression, a music theme per wing and a `wing_id` analytics parameter are dropped.
- Unchanged from `AGENTS.md`: desktop only; colour meanings (blue interaction and success, orange the second portal, red caution, green a completed chamber); `localStorage` keys keep the `portal-2d.` prefix and analytics event and parameter names never change, even after a rename (changing either splits or loses history).

## Open decisions

1. **The game's name and identity** (README open decision 5).
   - (a) Fully original: new name, facility name, wordmark, signage and voice; Valve's logo, links and distinctive terms removed, with at most a plain-text "inspired by Portal" credit in About. Cost: design work up front; some copy and docs rewritten.
   - (b) Stay "Portal 2D" as a non-commercial fan game. Cost: no sales ever, and the risk grows with every public share in stage 05.
   - Recommendation: (a). Rename the distinctive terms (Aperture Science, "fizzler"); keep generic words (portal, box, button, door, laser, test chamber). Not legal advice: if the game will ever be sold, have the name checked by someone qualified.
2. **Renderer: 2D canvas or GPU** (README open decision 4).
   - (a) Stay on the 2D canvas. Cost: effects such as glow and particles must be drawn by hand; enough for a 23×20 grid.
   - (b) WebGL, directly or through a library such as PixiJS. Cost: a large dependency or a lot of code, and a second way to draw the chamber previews.
   - Recommendation: (a), unless the profiling step shows the largest chamber with all effects can't hold 60 fps at `devicePixelRatio` 2 on a mid-range laptop.
3. **Where the game's colours live** once the hex-literal exception in `AGENTS.md` is lifted. Today the renderer and element files hold hex literals.
   - (a) One palette module in `src/game/` with named `rgba()` colours; the screen picks a palette (standard or colour-blind) and passes it to the renderer. CSS tokens mirror it by hand.
   - (b) The renderer reads the CSS tokens at runtime. Cost: makes the engine depend on the DOM, which breaks running it under Node.
   - Recommendation: (a).
4. **Music loading.** The loading screen downloads every file under `src/assets/audio/` (`asset_preloader.ts`, `import.meta.glob`). Today that is about 3.6 MB (`menu.mp3` 2.2 MB, `game.mp3` 1.2 MB, sound effects about 0.2 MB). The layers (several stems per track) and any tracks replaced after the licence check are what grow it.
   - (a) Keep preloading everything. Cost: a longer first load.
   - (b) Preload the menu music and the effects; fetch the chamber track's layers as in-memory copies when the first chamber opens (same reason as today: Firebase varies responses by encoding). Cost: changes the loading-screen rule in `AGENTS.md`; a short wait the first time a chamber opens.
   - Recommendation: (b) once total audio passes about 8 MB.
5. **Relaxed mode and records.**
   - (a) The clock still runs but is hidden; relaxed runs don't set best times (and, once stage 04 adds medals, no time medal either; moves and portals medals would still count); analytics marks the run as relaxed.
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

### Phase B — Tutorial chamber

- [ ] **Count chamber numbers from 0.** The catalogue derives each chamber's number from its place in the list, today starting at 1 (`index + 1` in `src/services/chamber_catalogue.ts`). Start it at 0, in the same change that puts the tutorial first, so the tutorial is chamber 0 (`/chamber/0`, its sign showing "00") and chambers 1–3 keep their numbers, their links and their `chamber_number` in analytics. The route (`/chamber/:number(\d+)` in `src/router.ts`) already accepts 0; check every place that assumes the first chamber is 1 (the catalogue's comments and lookup, the chamber sign, the Play menu's rows, Next chamber, the last chamber kept in memory). Links stay by position; the scheme for when chambers are inserted between existing ones is stage 04's. Verify: in `npm run preview`, `/chamber/1`, `/chamber/2` and `/chamber/3` open the same chambers as before and `/chamber/0` opens the tutorial; Next chamber from 0 goes to 1; the Play menu shows all four rows at 1280×720.
- [ ] **Author the tutorial chamber.** Hand-written format 2 JSON (`docs/elements.md`, "Chamber format") with the next unused permanent id, 4, named by it like the others (`src/chambers/chamber_4.json`), listed in `scripts/chamber_files.ts` and first in `src/services/chamber_catalogue.ts`, with a recorded solution next to it (Download solution in `npm run dev`). It introduces one control at a time (move, turn with Ctrl, shoot with A and D, carry with Space) and one element at a time, using the rail's legend; its voice and rail lines follow the identity brief. Verify: `npm run verify` passes (the replay and chamber checks included); a first-time player finishes it without being told the keys.
- [ ] **Progress follows the id.** The tutorial's completion, best time and attempts are stored under its id like every chamber's (stage 00), and Reset progress clears them. Verify: complete chamber 0 and reload; its row shows the best time; the records of chambers 1–3 are untouched.
- [ ] **Update `AGENTS.md`.** The chamber numbering text (a number is the chamber's place in the list counted from 0; the tutorial is chamber 0). Verify: a read-through matches the behaviour.

### Phase C — Visual rework

- [ ] **Profile first.** Measure frame time on the largest chamber at `devicePixelRatio` 1 and 2. Today the level redraws only when the state changes (`level.ts`, frame loop), so animation means drawing every frame while something moves. Verify: numbers recorded here; open decision 2 settled.
- [ ] **Palette module** (open decision 3). Move the game's hex literals into named `rgba()` colours in one module in `src/game/`; the renderer takes a palette. Lift the hex-literal exception in `AGENTS.md`. The drawing stays identical. Verify: a screenshot of each chamber's start state before and after matches.
- [ ] **Animation layer** (uses the frontend-design skill). Purely visual interpolation between consecutive states from 01's pure step. A new key never waits: it snaps the running animation to its end. The clock is unaffected; `prefers-reduced-motion` turns interpolation off. Verify: the replay check still passes (rules untouched); fast key mashing feels as responsive as before.
- [ ] **Smooth steps** (uses the frontend-design skill). The subject and a carried box glide between tiles. Verify: visual check; reduced motion shows plain steps.
- [ ] **Laser glow** (uses the frontend-design skill). Verify: 60 fps on the largest chamber at `devicePixelRatio` 2.
- [ ] **Portals with a glimpse of the other side** (uses the frontend-design skill). Draw the tiles in front of the other portal, clipped to the portal's shape. Verify: correct for every pair of portal facings.
- [ ] **Particles when something fizzles** (uses the frontend-design skill). On the fizzler event emitted by 01 (portals cleared, box destroyed). Verify: none with reduced motion.
- [ ] **Camera for large chambers** (uses the frontend-design skill). Follows the subject only when the chamber doesn't fit the canvas at a minimum tile size; menu previews and the editor always show the whole chamber. Verify: test with a chamber larger than any shipped one.
- [ ] **Blueprint mode** (uses the frontend-design skill). Today's flat drawing kept as a Settings switch (settings service, a new `portal-2d.` key, `setting_change` with a new `setting` value). The menu's chamber maps stay flat in both modes. Verify: toggling mid-chamber redraws without resetting anything.
- [ ] **Colour-blind palettes and portal shapes** (uses the frontend-design skill). Shapes on the two portals (for example a ring on one, a notch on the other), drawn in both modes and repeated on the legend's keycaps; selectable palettes for red–green and blue–yellow colour blindness. The CSS tokens follow the chosen palette through a class on the root element, so the wordmark and legend match. Verify: Chrome DevTools' "Emulate vision deficiencies" for each type; the portals can be told apart with no colour at all (greyscale).
- [ ] **Relaxed mode** (open decision 5; uses the frontend-design skill). A Settings switch that hides the timer on the chamber screen and the best times on rows; records follow the decision; analytics adds a `relaxed` parameter. Verify: a relaxed run never changes the stored best time.
- [ ] **Check high-DPI again.** 00's sharpness fix still holds with every new layer. Verify: 200 % browser zoom and a high-DPI screen.

### Phase D — Music that reacts to play

- [ ] **Layered playback.** Stems of one track must start together and stay in sync, which `HTMLAudioElement` (used by `src/game/music.ts` through `createAudioPlayer`) can't guarantee. Move music to the Web Audio API, decoding the in-memory copies the preloader already hands over. Music stays out of the rules: the screen maps the game's events to layers. Verify: two stems stay in sync over a 10-minute loop.
- [ ] **Progress layers.** A layer enters as the chamber progresses (for example percussion when the first door opens), driven by game events or by an optional per-chamber cue list in the chamber's metadata. Verify: replaying a solution brings the layers in at the same moments every time.
- [ ] **Solve cue.** A short sting on completion that ducks the chamber music; obeys the music setting. Verify: no cue when music is off; no overlap when Next chamber is pressed quickly.
- [ ] **The chamber track.** If the licence check (Phase A) marks today's tracks for replacement, commission or compose new ones, with their licence recorded in the asset table; either way the chamber track gets the stems its layers need. Verify: every chamber plays the track with its layers; the menu music still resumes where it left off.
- [ ] **Download budget** (open decision 4). Measure total audio after each new track or set of stems; past about 8 MB, switch to loading the chamber track's layers on demand and update `asset_preloader.ts` and the loading-screen rule in `AGENTS.md`. Verify: first-visit download size recorded per release.

### Phase E — Local checks and release

- [ ] **Preview deploys from the local machine.** A script (for example `npm run deploy:preview`) running `firebase hosting:channel:deploy <name> --expires 7d`. Verify: the preview URL serves the build and its headers match production.
- [ ] **Bundle-size watch.** Added to 00's local check command: compares `dist/assets` sizes with a stored baseline and fails above a set growth. Verify: a deliberately large import makes it fail.
- [ ] **Unused-asset check.** Fails when a file under `src/assets/` is no longer referenced, since the preloader downloads every file. Verify: an unreferenced test file makes it fail.
- [ ] **Docs.** `AGENTS.md` (identity, UI direction, keyboard model, persistence, loading screen, colour rule, analytics parameters), `docs/elements.md` and the changelog match what shipped.

## Local checks added

- Bundle-size watch against a stored baseline.
- Unused-asset check.
- Preview deploy command (not a check, but part of every release from here on).
- No new chamber check: the tutorial joins the existing engine, replay and chamber checks through its entry in `scripts/chamber_files.ts` and its recorded solution.

## Done when

- [ ] Nothing tied to Valve remains in the shipped site; every row of the inventory table is resolved; every asset has a recorded source and licence.
- [ ] The new name is live on its chosen address, and the old address redirects.
- [ ] The tutorial ships as chamber 0 with a recorded solution; `/chamber/1`–`/chamber/3` still open the same chambers, and their progress and best times are intact.
- [ ] The visual rework ships with blueprint mode, colour-blind palettes, portal shapes and relaxed mode; reduced motion is respected; the replay check still passes.
- [ ] Reactive music ships within the download budget.
- [ ] All local checks pass, and the release was reviewed on a preview channel before going to production.
- [ ] The author has played every chamber (0–3) in the new look and sound and signed off on the identity, look and sound before stage 04 starts.

## Go/no-go points

- **Identity:** if no name clears the clash check, stop before stage 05 shares anything publicly.
- **Renderer:** if the 2D canvas can't hold 60 fps at `devicePixelRatio` 2 on the largest chamber with all effects, reopen open decision 2.
- **Audio budget:** past about 8 MB of audio, switch to loading the chamber track's layers on demand (open decision 4).
- **Sign-off:** if the author isn't happy with the identity, look or sound after playing chambers 0–3, this stage goes on and stage 04 waits, since stage 04's mechanics are drawn and voiced in this stage's look.

## Risks

- **Identity churn.** Voice lines, titles and signage written before the identity is settled get rewritten. Phase A comes first for this reason, and the tutorial follows it.
- **Counting from 0 misses a spot.** Code or copy that assumes the first chamber is number 1 shows up as a wrong sign, a missing row or Next chamber skipping a chamber. Phase B's checks walk chambers 0 to 3 and the old links.
- **Animation hurting the feel.** Interpolation that delays input makes a discrete puzzle game feel sluggish. The snap-on-key rule and the mashing test guard against it.
- **Colours drifting apart.** Canvas palettes and CSS tokens are kept in step by hand; the colour-blind palettes double the chance of a mismatch. Check both together in each palette step.
- **Asset licences.** If existing sounds or images turn out to be Valve's, replacing them adds unplanned audio and art work.
- **The Firebase project id stays `portal-2d`.** It can't be renamed; only a new site or a custom domain hides it.

## Notes for later stages

- Stage 04 draws its new mechanics in this stage's look: colours in the palette module, in every palette (standard and colour-blind) and in blueprint mode, each distinct from every existing element; and it gives them sounds that fit the new identity.
- Stage 04 picks the link scheme for when chambers are inserted between existing ones (README open decision 6) and, if the scheme changes them, redirects `/chamber/0`–`/chamber/3` through a fixed table.
- Stage 04's time medals follow open decision 5: a relaxed run sets no time medal.
- Stage 05's editor reuses the chamber format, the renderer (blueprint mode suits editing), the solution recorder and the preview deploy command.
- Stage 05 shares nothing publicly until Phase A is done.
- Notes (filled in during this stage): Valve inventory table, asset licence table, identity brief, profiling numbers.
