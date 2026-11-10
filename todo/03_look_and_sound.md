# Stage 03 — Look and sound

Status: Draft
Last revised: 2026-11-09

## Goal

The game looks and sounds finished before it grows: a reworked look (smooth and sharp, with the flat look kept as "blueprint" mode), music that reacts to play, and one new chamber, a tutorial shown as chamber 0. It stays "Portal 2D", a fan game played only by the author and a few friends and never published (README decision 12). No other chambers are added here: stage 04 adds the new mechanics and completes the campaign (20 chambers in total, numbered 0–19, with no wings) once this stage is right.

## Depends on

These are assumptions about what earlier stages delivered. Re-check each when revisiting this stage.

- **00 Fixes:** completions and best times keyed by permanent id; the game canvas sharp on high-DPI screens; analytics sending quits on tab close, an attempt counter and first-completion and new-best flags, collecting since 00 shipped (months of history by now); one local check command.
- **01 Engine v2:** a pure step (state + key → next state) with the frame loop only animating and drawing; replays and recorded solutions checked locally; undo, with "moves" counting decided (open decision 1, counting side); chamber format v2 (versioned, optional lists); elements described by data, each declaring how it is drawn; the engine runs under Node; game sounds emitted as events, not played by the rules; the input rewrite with remappable keys (decision 2 put input there, so this stage does not touch it; the gamepad was dropped, decision 9).
  - As built, 2026-11-07 (kept from stage 01's notes when its file was removed): the renderer (`src/game/renderer.ts`) draws layer by layer (`DRAW_LAYERS`), each element type in registry order by its drawing in `src/game/element_drawings.ts`. The step's events (crossed a portal, fizzled, a door opened…) and the states before and after each step are the hooks for animation.
  - The pixel comparison page (old and new renderer compared byte for byte) was deleted with the old renderer; if an intentional visual change needs one, git history has it (`git show 8c2659c^:src/dev/render_check.ts`).
- **02 Solver:** stopped after its prototype (README decision 10): no solvability check, no par and no shortcut report. This stage uses no solver; the tutorial chamber is checked by its recorded solution, like every chamber.

## Decisions made

- 2026-11-06 — Remappable keys went to stage 01 (README decision 2); the gamepad, also sent there, was later dropped (README decision 9).
- 2026-11-06 — Chamber links (`/chamber/N`, by position) stay as they are until stage 04 picks the numbering scheme (README decision 4, written when that work was still planned for this stage). This stage only starts the count at 0. Since 2026-11-09 (README decision 13) links may follow position freely: old links needn't keep working.
- 2026-11-08 — This stage and the mechanics stage swapped places (README decision 11): look and sound come first, and the new mechanics and the rest of the campaign follow in stage 04, once this stage is right.
- 2026-11-08 — Only one new chamber here: the tutorial, numbered 0, so chambers 1–3 keep their numbers and links. The campaign has 20 chambers in total (0–19); stage 04 adds the other 16.
- 2026-11-08 — The catalogue and links that scale, the Play menu that scales, the campaign content, difficulty from data and medals moved to stage 04, with their open decisions (chamber numbering and links, medals and undo, medal thresholds, the histogram).
- 2026-11-08 — No wings: the campaign is one list of 20 chambers. Wing progression, a music theme per wing and a `wing_id` analytics parameter are dropped.
- 2026-11-08 — A private fan game (README decision 12): played only by the author and a few friends, never published on Steam or any other platform. It stays "Portal 2D" and keeps Valve's name, logo, links, terms and assets, so the identity work (new name, facility, voice, wordmark and logo, address, asset licence check, lines between chambers and on the rail) is dropped.
- 2026-11-08 — No colour-blind palettes, portal shapes or relaxed mode. Reduced motion stays, as the accessibility floor in `AGENTS.md` requires.
- 2026-11-08 — No camera: every chamber fits the screen, so the whole chamber is always shown.
- 2026-11-08 — No preview deploys: releases go straight to production with `npm run deploy`.
- 2026-11-08 — The renderer stays on the 2D canvas (README open decision 4). The profiling step can reopen it (see Go/no-go points).
- 2026-11-09 — The author is the only player during development, and a few friends play later (README decision 13): no compatibility work, so saves and settings may be reset by updates, with no migrations, and old links may break. Numbering the tutorial 0 protects nothing worth keeping (the analytics history so far is only the author's own play), so whether it stays 0 or chambers 1–3 shift up is settled at this stage's revisit (Phase A).
- 2026-11-09 — Chamber numbers count from 0 (Phase A's first step settled): until the tutorial is added first, today's three chambers are numbered 0–2.
- 2026-11-09 — Where the game's colours live (open decision 1) settled: (a), one palette module, `src/game/palette.ts`, of named `rgba()` colours, which the drawing code imports directly. A palette is passed to the renderer only once something needs a second one, since blueprint mode keeps today's colours. The CSS tokens mirror some of its colours by hand.
- Unchanged from `AGENTS.md`: desktop only; colour meanings (blue interaction and success, orange the second portal, red caution, green a completed chamber); `localStorage` keys keep the `portal-2d.` prefix, as a convention, and analytics event and parameter names never change (renaming one splits its history).

## Open decisions

Decision 1 (where the game's colours live) was settled on 2026-11-09; see Decisions made.

2. **Music loading.** The loading screen downloads every file under `src/assets/audio/` (`asset_preloader.ts`, `import.meta.glob`). Today that is about 3.6 MB (`menu.mp3` 2.2 MB, `game.mp3` 1.2 MB, sound effects about 0.2 MB). The layers (several stems per track) are what grow it.
   - (a) Keep preloading everything. Cost: a longer first load.
   - (b) Preload the menu music and the effects; fetch the chamber track's layers as in-memory copies when the first chamber opens (same reason as today: Firebase varies responses by encoding). Cost: changes the loading-screen rule in `AGENTS.md`; a short wait the first time a chamber opens.
   - Recommendation: (b) once total audio passes about 8 MB.

## Steps

### Phase A — Tutorial chamber

- [x] **Count chamber numbers from 0.** The catalogue derives each chamber's number from its place in the list, today starting at 1 (`index + 1` in `src/services/chamber_catalogue.ts`). Start it at 0, in the same change that puts the tutorial first, so the tutorial is chamber 0 (`/chamber/0`, its sign showing "00") and chambers 1–3 keep their numbers. Starting at 0 is no longer needed to protect links or analytics (README decision 13: old links may break, and the analytics history so far is only the author's own play), so this stage's revisit decides between it and counting from 1 with chambers 1–3 shifting up to 2–4 (then this step only checks the tutorial is chamber 1). The route (`/chamber/:number(\d+)` in `src/router.ts`) already accepts 0; check every place that assumes the first chamber is 1 (the catalogue's comments and lookup, the chamber sign, the Play menu's rows, Next chamber, the last chamber kept in memory). Links stay by position, in stage 04 too (README decision 13). Verify: in `npm run preview`, each number opens the chamber at that place in the list, the tutorial first; Next chamber from the tutorial goes to the next one; the Play menu shows all four rows at 1280×720.
- [x] **Author the tutorial chamber.** Hand-written format 2 JSON (`docs/elements.md`, "Chamber format") with permanent id 0, kept for it, named by it like the others (`src/chambers/chamber_0.json`), listed in `scripts/chamber_files.ts` and first in `src/services/chamber_catalogue.ts`, with a recorded solution next to it (Download solution in `npm run dev`). It introduces one control at a time (move, shoot with A and D, carry with Space) and one element at a time, using the rail's legend. Verify: `npm run verify` passes (the replay and chamber checks included); a first-time player finishes it without being told the keys.
- [x] **Progress follows the id.** The tutorial's completion, best time and attempts are stored under its id like every chamber's (stage 00), and Reset progress clears them. Verify: complete the tutorial and reload; its row shows the best time; the records of chambers 1–3 are untouched.
- [x] **Update `AGENTS.md`.** The chamber numbering text (a number is the chamber's place in the list, counted from 0 or 1 as the first step settles; the tutorial is the first chamber). Verify: a read-through matches the behaviour.

### Phase B — Visual rework

- [x] **Profile first.** Measure frame time on the largest chamber at `devicePixelRatio` 1 and 2. Today the level redraws only when the state changes (`level.ts`, frame loop), so animation means drawing every frame while something moves. Verify: numbers recorded here, as the baseline for the 60 fps checks below.
- [x] **Palette module** (open decision 1, settled). Move the game's hex literals into named `rgba()` colours in one module, `src/game/palette.ts`, which the drawing code imports directly (no palette is passed to the renderer until something needs a second one). Lift the hex-literal exception in `AGENTS.md`. The drawing stays identical. Verify: the pixels of every state along each chamber's recorded solution, at pixel ratio 1 and 2, hash the same before and after.
- [x] **Animation layer** (uses the frontend-design skill). Purely visual interpolation between consecutive states from 01's pure step. A new key never waits: it snaps the running animation to its end. The clock is unaffected; `prefers-reduced-motion` turns interpolation off. Verify: the replay check still passes (rules untouched); fast key mashing feels as responsive as before.
- [x] **Smooth steps** (uses the frontend-design skill). The subject and a carried box glide between tiles. Verify: visual check; reduced motion shows plain steps.
- [ ] **Laser glow** (uses the frontend-design skill). Verify: 60 fps on the largest chamber at `devicePixelRatio` 2.
- [ ] **Portals with a glimpse of the other side** (uses the frontend-design skill). Draw the tiles in front of the other portal, clipped to the portal's shape. Verify: correct for every pair of portal facings.
- [ ] **Particles when something fizzles** (uses the frontend-design skill). On the fizzler event emitted by 01 (portals cleared, box destroyed). Verify: none with reduced motion.
- [ ] **Blueprint mode** (uses the frontend-design skill). Today's flat drawing kept as a Settings switch (settings service, a new `portal-2d.` key, `setting_change` with a new `setting` value). The menu's chamber maps stay flat in both modes. Verify: toggling mid-chamber redraws without resetting anything.
- [ ] **Check high-DPI again.** 00's sharpness fix still holds with every new layer. Verify: 200 % browser zoom and a high-DPI screen.

### Phase C — Music that reacts to play

- [ ] **Layered playback.** Stems of one track must start together and stay in sync, which `HTMLAudioElement` (used by `src/game/music.ts` through `createAudioPlayer`) can't guarantee. Move music to the Web Audio API, decoding the in-memory copies the preloader already hands over. Music stays out of the rules: the screen maps the game's events to layers. Verify: two stems stay in sync over a 10-minute loop.
- [ ] **Progress layers.** A layer enters as the chamber progresses (for example percussion when the first door opens), driven by game events or by an optional per-chamber cue list in the chamber's metadata. Verify: replaying a solution brings the layers in at the same moments every time.
- [ ] **Solve cue.** A short sting on completion that ducks the chamber music; obeys the music setting. Verify: no cue when music is off; no overlap when Next chamber is pressed quickly.
- [ ] **The chamber track.** The chamber track gets the stems its layers need: composed, commissioned or separated from today's track. Verify: every chamber plays the track with its layers; the menu music still resumes where it left off.
- [ ] **Download budget** (open decision 2). Measure total audio after each new track or set of stems; past about 8 MB, switch to loading the chamber track's layers on demand and update `asset_preloader.ts` and the loading-screen rule in `AGENTS.md`. Verify: first-visit download size recorded per release.

### Phase D — Local checks and release

- [ ] **Bundle-size watch.** Added to 00's local check command: compares `dist/assets` sizes with a stored baseline and fails above a set growth. Verify: a deliberately large import makes it fail.
- [ ] **Unused-asset check.** Fails when a file under `src/assets/` is no longer referenced, since the preloader downloads every file. Verify: an unreferenced test file makes it fail.
- [ ] **Docs.** `AGENTS.md` (UI direction, keyboard model, persistence, loading screen, colour rule, analytics parameters) and the changelog match what shipped.

## Local checks added

- Bundle-size watch against a stored baseline.
- Unused-asset check.
- No new chamber check: the tutorial joins the existing engine, replay and chamber checks through its entry in `scripts/chamber_files.ts` and its recorded solution.

## Done when

- [ ] The tutorial ships first in the list with a recorded solution; chambers 1–3 keep their progress and best times.
- [ ] The visual rework ships with blueprint mode; reduced motion is respected; the replay check still passes.
- [ ] Reactive music ships within the download budget.
- [ ] All local checks pass.
- [ ] The author has played every chamber (0–3) in the new look and sound and signed off on them before stage 04 starts.

## Go/no-go points

- **Renderer:** if the 2D canvas can't hold 60 fps at `devicePixelRatio` 2 on the largest chamber with all effects, reopen the renderer decision (README open decision 4): drop or simplify effects, or move to WebGL, directly or through a library such as PixiJS (cost: a large dependency or a lot of code, and a second way to draw the chamber previews).
- **Audio budget:** past about 8 MB of audio, switch to loading the chamber track's layers on demand (open decision 2).
- **Sign-off:** if the author isn't happy with the look or sound after playing chambers 0–3, this stage goes on and stage 04 waits, since stage 04's mechanics are drawn and given sounds in this stage's look and sound.

## Risks

- **Counting from 0 misses a spot.** Code or copy that assumes the first chamber is number 1 shows up as a wrong sign, a missing row or Next chamber skipping a chamber. Phase A's checks walk every chamber, the tutorial first.
- **Animation hurting the feel.** Interpolation that delays input makes a discrete puzzle game feel sluggish. The snap-on-key rule and the mashing test guard against it.
- **Colours drifting apart.** Canvas colours and CSS tokens are kept in step by hand. Check both together in the palette and blueprint steps.
- **Stems.** Layers need separate stems of the chamber track; if today's track can't be split cleanly, new music has to be composed or commissioned, which adds unplanned audio work.

## Notes for later stages

- Stage 04 draws its new mechanics in this stage's look: colours in the palette module and in blueprint mode, each distinct from every existing element; and it gives them sounds that fit this stage's sound.
- Links stay by position in stage 04 too (README decision 13 settled open decision 6): inserting or reordering chambers shifts them, with no redirect table.
- Every chamber must fit the screen whole, since there is no camera: stage 04's chambers and stage 05's grid cap stay within that.
- Stage 05's editor reuses the chamber format, the renderer (blueprint mode suits editing) and the solution recorder.
- Profiling baseline (2026-11-09, the "Profile first" step): chamber 3 (23 × 17, the largest canvas and the most elements), its settled start redrawn every frame, sized as the chamber screen sizes it in a 1920 × 1080 window. Chrome 155 on Linux, Intel UHD Graphics 620 (Mesa, through ANGLE), 8 cores, a 59.9 Hz display at pixel ratio 1, so ratio 2 is simulated by the canvas size (drawn at twice the size and shown at half). Median of 3 runs of 600 frames each, the range in brackets where runs differed:

  | # | Pixel ratio | Canvas | Draw time median / p95 / max | Frame interval median / p95 | Frames skipping a refresh |
  |---|---|---|---|---|---|
  | 1 | 1 | 1357 × 1003 | 0.5 / 0.7 / 1.0 ms (max 0.9–2.0) | 16.7 / 16.7 ms (p95 16.7–16.8) | 0 |
  | 2 | 2 | 2737 × 2023 | 0.5 / 0.7 / 1.0 ms (p95 0.7–0.8, max 0.9–1.1) | 16.7 / 16.8 ms | 0 |

  Both ratios hold 60 fps with a wide margin: drawing takes about 3 % of a frame, and no frame missed a refresh. About a quarter (ratio 1) to half (ratio 2) of the intervals read 16.8 ms instead of 16.7, which is timer rounding at a 59.9 Hz display, not a dropped frame. Draw time is what the canvas calls take on the main thread; the GPU's share shows only in the frame interval. The page draws on a plain background, while the chamber screen draws over a blurred photo beside the rail, so the real screen may cost more; recheck it there once the animation layer draws every frame. To run it again, open `/src/dev/render_profile.html` in `npm run dev`, with the window in front (a covered or minimized window slows its frames, and the page then says its numbers are not valid).

  Real-screen recheck (2026-11-10, the "Animation layer" step): chamber 3 on the chamber screen itself (over the blurred photo, beside the rail), same machine and display, in a maximized window with a 1920 × 910 page area, at pixel ratio 1. Left and Right presses, alternating every 50 ms for 10 s, kept a step animating, so the level drew on nearly every frame. Time per frame is everything the main thread runs in a frame, the level's frame and the screen's timer together. Median of 3 runs of about 600 frames each, the range in brackets where runs differed:

  | # | Pixel ratio | Canvas | Time per frame median / p95 / max | Frame interval median / p95 | Frames skipping a refresh |
  |---|---|---|---|---|---|
  | 1 | 1 | 1127 × 833 | 0.6 / 0.9 / 1.0 ms (median 0.6–0.7, max 1.0–1.2) | 16.7 / 16.7 ms (p95 16.7–16.8) | 0 |

  Drawing every frame on the real screen still takes about 4 % of a frame, and no frame missed a refresh. Pixel ratio 2 on the real screen is not measured yet: it needs DevTools device emulation or Chrome's `--force-device-scale-factor=2`.
