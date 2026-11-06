# Stage 00 — Fixes

Status: In progress
Last revised: 2026-11-06

## Goal

Make the current game safe to grow before anything big starts. When this stage is done, a player's completed chambers and best times follow the chamber itself rather than its position, so chambers can be reordered without moving records. The game is sharp on high-DPI screens. Analytics record the data that stage 04 needs to tune difficulty: abandoned runs, attempt counts, first completions and new bests. And there is one local command that checks the whole project without changing files, ready for later stages to extend.

## Depends on

Nothing. This is the first stage.

## Decisions made

- 2026-11-06: this stage covers records by id (with a migration), the blur fix, the analytics events and the first local check command. The inherited rule bugs wait for stage 01, because rules are frozen until v2 (README decision 1).
- 2026-11-06: chamber links (`/chamber/N`) and the in-memory "last chamber" stay keyed by position until stage 04 (README decision 4). Only stored records move to ids.
- 2026-11-06: local checks only, no cloud CI (README decision 6).
- 2026-11-06: open decisions 1–6 settled as recommended: 1a, 2a, 3b, 4a, 5a, 6a. Both optional steps (stale `/settings` header, home-map edges) are in.
- 2026-11-06: four corrections from reviewing this plan against the code. "Update the callers" moves before the migration, because the migration's browser tests need the menu on the new API. `chamber_abandon` is sent at most once per attempt, re-armed when a new attempt starts (re-arming on `pageshow` blocked nothing: a page can't be hidden twice without being shown in between). A page restored from the back/forward cache carries on its run, so one attempt can log an abandon and later a completion; documented in AGENTS.md and `analytics.ts`. A stored record with a later version is never overwritten (progress then lasts for the visit), so a rollback after stage 01 can't erase it; Reset progress still replaces it, because the player asked to start over.

## Open decisions

All settled on 2026-11-06 as recommended (see Decisions made); kept for the reasoning.

1. **Name of the local check command.** Today `npm run check` runs `lint:fix` then `build`, so it changes files.
   - a) Add `npm run verify` (lint without fixing, then build, which type-checks first) and keep `check` as the fix-then-build convenience. It changes no tracked file; only `dist/` (git-ignored) is rewritten.
   - b) Make `check` non-mutating and add `npm run fix` for the fixing variant. Changes a command the author already uses.
   - c) One script with a flag. More moving parts for no gain.
   - **Recommendation: a).** Later stages append replay and solver checks to `verify`.

2. **Shape of the stored records.**
   - a) One versioned key, `portal-2d.progress`, holding a record per chamber id: `{"version": 2, "chambers": {"1": {"completed": true, "bestTime": 4218, "attempts": 3}}}`. One read and one write, a version number for later migrations, and room for later per-chamber data (best moves, medals, replays) without new keys.
   - b) Two new keys mirroring today's (`portal-2d.completed-chamber-ids`, `portal-2d.best-times-by-id`). Smaller diff, but every later addition needs another key and its own migration.
   - **Recommendation: a).** Version 2, because today's number-keyed data counts as version 1.

3. **How to fix the blur.** The game canvas is sized in CSS pixels (`src/game/renderer.ts` `setSize`, called from `src/game/level.ts`). The home menu's map (`src/components/chamber_map.vue:30-33`) instead passes the available size multiplied by `devicePixelRatio`, then sets the canvas's CSS size to its attribute size divided by the ratio. But the renderer draws some edges at fixed pixel widths (the portal edge is 1 px in `src/game/portal.ts:30,36`; tile edges are 0.1 px in `wall.ts`, `floor.ts`, `box.ts` and others), and those shrink by the ratio under that approach.
   - a) Copy the map's approach in `chamber_screen.vue` only. No engine change, crisp at every ratio, but on high-DPI screens the portal edge and tile edges become thinner relative to the tiles, which is a small drawing change. The home map already looks like this today.
   - b) Copy the map's approach, and also give the renderer an optional pixel ratio (default 1) that multiplies the fixed edge widths. They all pass through one routine, `renderBlock` (`renderer.ts:123-137`). Tiles stay whole device pixels (crisp), every shape keeps its size in CSS pixels, and output at ratio 1 is identical. This touches `src/game/`, but only sizing, not shapes or colours.
   - c) Keep tiles in CSS pixels and scale the 2D context by the ratio. Identical proportions, but at 125 % or 150 % tiles land on fractional device pixels and faint seams appear between them.
   - **Recommendation: b).** Asking for the blur fix counts as the explicit request the frozen-drawing rule requires; say so in the commit.

4. **Scope of the attempt counter.**
   - a) Per device, kept in the progress record, cleared by Reset progress like the rest of progress. "Attempts before first completion" stays meaningful after a reset.
   - b) Per visit, in memory only. Simple, but loses the most useful number (attempts across visits).
   - c) Per device, never cleared. Survives a reset, but then disagrees with `first_completion`, which a reset does re-arm.
   - **Recommendation: a).**

5. **Event for closing the tab or reloading mid-run.** `chamber_quit` is defined as a confirmed Exit or browser Back, and "not closing the tab" (AGENTS.md).
   - a) A new event, `chamber_abandon`, with the same parameters as `chamber_quit`. Existing history keeps its meaning.
   - b) Reuse `chamber_quit` with a `reason` parameter. Silently changes what past `chamber_quit` counts mean.
   - **Recommendation: a).**

6. **What Reset chamber sends.** Today it sends `chamber_restart` (which ends the run) but no new `chamber_start`.
   - a) Keep it, and document that runs = `chamber_start` + `chamber_restart`. The `attempt` parameter makes each run identifiable anyway, and `chamber_start` history stays continuous.
   - b) Also send `chamber_start` after the reset. Clearer, but `chamber_start` counts jump on the release date.
   - **Recommendation: a).**

## Steps

Every step that changes code ends with the project's routine (AGENTS.md): `npm run lint:fix`, `npm run build` (or `npm run verify` once it exists), then the `delta-review` skill on the files changed. Manual checks run in `npm run dev` unless a step says otherwise.

### Phase 1 — Local check command

- [x] **Add the check command.** Add the script chosen in open decision 1 to `package.json` (recommended: `"verify": "npm run lint && npm run build"`). Verify: on a clean tree, run it and confirm it passes, then confirm `git status` shows no changed tracked files. Introduce a lint error on purpose, confirm the command fails, then revert it.
- [x] **Mention it in AGENTS.md.** In the "After completing code changes" rule, note that `npm run verify` is the non-mutating check later stages extend. Verify: re-read the rule; it must not contradict the existing `lint:fix` + `build` routine.

### Phase 2 — Records keyed by permanent id

- [x] **Confirm the legacy numbering.** Check that chamber numbers have always mapped to the same ids: `git log -p -- src/services/chamber_catalogue.ts`. Checked on 2026-11-06: since the catalogue was created, number 1 → `chamber_1.json` (id 1), 2 → id 2, 3 → id 3, and nothing has been reordered. Re-check when revisiting this stage. Verify: write the mapping into this step before coding.
- [x] **Derive the number from list order.** In `src/services/chamber_catalogue.ts`, list each chamber's permanent `id` and `data` only, and build `CHAMBERS` with `number: index + 1`, so the shown number can never drift from the position. Keep `ChamberEntry` and `findChamber` as they are (links stay by position). Add a development-only check (`import.meta.env.DEV`) that logs an error when two entries share an id or an id is not a positive integer. Update the `ChamberEntry.number` field comment. Verify: `npm run verify`; the menu shows 01–03 as before; temporarily give two entries the same id and see the console error, then revert.
- [x] **New progress record and API.** Rewrite `src/services/progress.ts` around the record chosen in open decision 2 (recommended: key `portal-2d.progress`, version 2, records keyed by chamber id). Have the public functions take a `ChamberEntry` rather than a bare number, for example `isCompleted(chamber)`, `bestTime(chamber)`, `markChamberCompleted(chamber)` and `recordTime(chamber, hundredths)`. Ids and numbers are both plain numbers, so taking the entry is what lets the type checker catch every caller still using a number. Keep the state reactive (one `ref` holding the record) so the home menu updates. Reading must ignore anything malformed, as today: a wrong version, non-object data, non-integer ids, negative or non-integer times. Every `localStorage` access stays inside `try`/`catch`. Blocked storage means progress lasts for the visit only; corrupt data means starting with no progress, never throwing. Reading also leaves a record with a later version untouched: nothing is written while it is there (progress lasts for the visit), so a rollback never erases it. Verify: `npm run verify` fails at every old caller (expected) until the callers are updated, the next step.
- [x] **Update the callers.**
  - `src/components/screens/chamber_screen.vue` (`handleCompleted`, around lines 213-226): pass `chamber.value` instead of `props.chamberNumber`.
  - `src/components/screens/home_screen.vue` (around lines 787-788): replace `completedChambers.includes(chamber.number)` and `bestTimes[chamber.number]` with the new helpers.
  - Reset progress (`home_screen.vue` around line 633) calls the new reset.
  - Leave `src/services/last_chamber.ts` and the router keyed by number (decision 4).

  Verify:
  - `npm run verify` passes.
  - Complete chamber 01: the row turns green with the time, and the record appears under id 1.
  - Beat the time: it updates. A slower run leaves it.
  - Reload: everything persists.
- [x] **One-time migration from number-keyed data.** On first read, if `portal-2d.completed-chambers` or `portal-2d.best-times` exists, convert it into the new record:
  - Map each number through a hard-coded legacy table written into the code (`{1: 1, 2: 2, 3: 3}`, from the first step), **not** through the live catalogue. A player who last visited before this release and returns after a future reorder must still map correctly.
  - Drop numbers that aren't in the table.
  - Merge into any existing new record instead of overwriting it: union of completions, the smaller of two best times. This covers an old tab, still open after the deploy, writing old keys after a new tab already migrated.
  - Write the new record first, then remove the old keys. The new key is the "already migrated" marker; because the merge is idempotent, re-running after a failed removal is harmless.
  - Old data may hold completions without a best time; keep them as completed with no time.

  Verify, in `npm run dev` with DevTools → Application → Local Storage, using seeded data:
  - (a) `portal-2d.completed-chambers` = `[1,3]` and `portal-2d.best-times` = `{"1":4218,"3":9000}` → after reload, chambers 01 and 03 show green with those times, the old keys are gone, and the new key holds ids 1 and 3.
  - (b) Reload again: nothing changes.
  - (c) Seed the old keys alongside an existing new record: completions are united and the smaller time wins.
  - (d) Seed garbage (`"x"`, `{"7":5}`, `[1.5]`): no error, invalid entries dropped.
- [x] **Reset progress must not resurrect old data.** Make the reset write an empty record (`{"version": 2, "chambers": {}}`) and also remove the legacy keys, rather than deleting the new key. Otherwise a leftover legacy key would be migrated back in on the next load. Verify: seed legacy keys, reload (migrates), Reset progress, reload → no completion comes back, the new key holds an empty record and no legacy key exists. (Legacy keys written *after* a reset, by an old tab, are real progress and are merged in on purpose.)
- [x] **Reorder rehearsal (not committed).** In a scratch change, swap chambers 1 and 2 in the catalogue list. Run the dev server and confirm the records follow the chambers: the completed chamber that moved to position 2 is still green with its time. Revert the change. Verify: `git status` is clean afterwards.
- [ ] **Blocked storage.** In Chrome, block all cookies for `localhost` (Site settings), which makes `localStorage` throw. Verify: the menu loads, a chamber can be completed and shows its time for that visit, Reset progress works, no uncaught error in the console. Restore the setting.

### Phase 3 — High-DPI blur fix

- [x] **Capture the ratio-1 baseline.** Before changing anything, at 100 % browser zoom on a ratio-1 screen (or DevTools device toolbar set to DPR 1), open chamber 01 at a fixed window size. In the console, save `document.querySelector('.chamber-canvas').toDataURL()`. Do the same for chambers 02 and 03. Verify: three strings saved in a scratch file outside the repo.
- [x] **Renderer pixel ratio (open decision 3, option b).** In `src/game/renderer.ts`, add an optional pixel ratio (default 1), passed to the constructor and to `resize`. Multiply `borderWidth` by it inside `renderBlock`, the single routine every fixed edge goes through. Do not touch shapes, colours or proportions. Extend `Level`'s constructor and `resize` in `src/game/level.ts` to pass the ratio through. `src/game/chamber_preview.ts` keeps working with the default. Update the JSDoc. Verify: `npm run verify`; the home map looks unchanged.
- [ ] **Chamber screen uses device pixels.**
  - In `src/components/screens/chamber_screen.vue`, multiply the available size by `window.devicePixelRatio` before handing it to the level, on creation and in the `ResizeObserver` callback, along with the ratio itself.
  - After the first load and after each resize, set the canvas's CSS `width` and `height` to its attribute size divided by the ratio. The renderer sets only the attributes; styling belongs to the page.
  - Keep the 1 px CSS border and `CANVAS_BORDER_PIXELS` as they are.

  Verify:
  - At ratio 1, the three `toDataURL()` strings match the baseline exactly. Any difference means the drawing changed; fix it before going on.
  - At 200 % zoom (or DPR 2 in the device toolbar), edges are sharp, the chamber fills the stage as before, and the portal edge looks as thick as at 100 %.
- [ ] **React to the ratio changing.** Zoom changes resize the stage in CSS pixels, so the existing `ResizeObserver` fires. Moving the window to a screen with a different ratio may not. Listen for `change` on ``matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)``, re-arm the query with the new ratio each time, refit and redraw, and remove the listener in `onBeforeUnmount`. Verify: zoom 100 % → 125 % → 150 % → 200 % → 100 % while in a chamber: sharp at every step, no seams, no leftover blur. If a second screen with a different scale is available, drag the window across.
- [ ] **Nothing else moved.** Verify, at 100 % and 200 %: the blurred room behind the stage (`.chamber-stage::before`, a CSS blur, not the canvas) looks as before; the home menu's map still draws; pause, reset, completion dialogs and the timer are unaffected; the frame rate in DevTools Performance is still smooth at 200 % on the largest chamber (20×20).
- [ ] **Optional: same edges on the home map.** Pass the ratio to the renderer from `src/components/chamber_map.vue` too, so the map's portal and tile edges match the game at high DPI. Today's three maps show no portals, so the visible difference is the 0.1 px tile edges only; skip if not noticeable. Verify: the map looks right at 100 % and 200 %.

### Phase 4 — Analytics

- [ ] **Author only: register the parameters in GA4 first.** Custom dimensions and metrics are not applied retroactively, so do this before the release that sends them. In Google Analytics → Admin → Custom definitions, check which of the existing parameters (`chamber_id`, `chamber_number`, `time_ms`, `moves`, `portals`) are already registered. Then register the missing ones plus the new ones: `attempt`, `first_completion`, `new_best`. Event scope. Numbers worth averaging (`time_ms`, `moves`, `portals`, `attempt`) as metrics; ids and flags as dimensions, or the flags as metrics if summing completions is wanted. Verify: the definitions list shows each one.
- [ ] **Author only, optional but recommended: link BigQuery export.** Linking a run's start to its end, and counting starts with no end, needs raw events with GA4's session ids, which reports don't show (README: unverified). The export is not retroactive either, so the earlier it is linked the more history stage 04 gets. Check the current cost and limits of the BigQuery sandbox before linking. Verify: the first daily export table appears.
- [x] **Attempt counter (open decision 4).** In `src/services/progress.ts`, add a function that increments and persists the chamber's `attempts` in its record and returns the new attempt number (counted in memory for the visit when storage is blocked). In `chamber_screen.vue`, start an attempt when the chamber opens (mount, which also covers Next chamber, because the view remounts), on Play again, and when Reset chamber is confirmed. Keep the current attempt number in a plain variable, not a `ref`. Reset progress clears attempts with the rest. Verify: open chamber 01 (attempts 1), reset the chamber (2), complete it and Play again (3), back to menu and reopen (4); check the stored record after each.
- [x] **Send `attempt` on every run event.** In `src/services/analytics.ts`, add the attempt number to `chamber_start`, `chamber_restart`, `chamber_quit` and `chamber_complete` (and to `chamber_abandon` below), meaning the attempt the event belongs to: a restart ends attempt N, and the following run is N + 1. Add parameters only; rename nothing (names are permanent). Verify: `npm run verify`; in dev, nothing is sent (expected). Check the call sites by reading them.
- [x] **First-completion and new-best flags.** In `handleCompleted` (`chamber_screen.vue`), read whether the chamber was already completed before marking it, and get the new-best result from `recordTime` (a first completion is always a new best), then send both on `chamber_complete` as `first_completion` and `new_best`. Use `1`/`0` numbers so they can be summed as metrics. This means computing both before the event is sent (today the event goes first). After Reset progress the next completion counts as first again; document that. Verify: by reading the order of calls; the completion dialog still shows "new best" correctly for a first run, a faster run and a slower run.
- [x] **`chamber_abandon` on tab close or reload (open decision 5).** In `chamber_screen.vue`, listen to `pagehide` while mounted. If the chamber isn't completed, send `chamber_abandon` with the same parameters as `chamber_quit` plus `attempt`. Don't send twice for the same attempt: guard with a flag, re-armed when a new attempt starts (a page restored from the back/forward cache can be hidden again; its run carries on, so that attempt may still end another way later). Remove the listener on unmount. An in-app navigation never fires `pagehide`, so confirmed exits keep sending only `chamber_quit`. Add the event to `EventName` and a `trackChamberAbandon` function with JSDoc. Verify: `npm run verify`; reading the guard logic; the production check below.
- [x] **Reset chamber semantics (open decision 6).** Keep `chamber_restart` without a following `chamber_start`, and write in the `analytics.ts` comments and AGENTS.md that runs = starts + restarts. Verify: re-read both.
- [ ] **Production check in DebugView (author).** Dev sends nothing, and a production build sends real events even from `localhost`. Run `npm run build && npm run preview`, open it with the Google Analytics Debugger extension enabled, and watch Admin → DebugView. Play: open chamber 01, reset, complete, Play again, then reload mid-run. Verify: `chamber_start`, `chamber_restart`, `chamber_complete` (with `first_completion` 1 and `new_best` 1) and `chamber_abandon` arrive with the right `attempt` values. Note how reliably `chamber_abandon` arrives over five reloads (see go/no-go). Check that GA4's developer-traffic filter keeps these test events out of reports; unverified how it treats the debugger extension.

### Phase 5 — Cleanup, docs and release

- [ ] **Optional: drop the stale `/settings` header.** `firebase.json` sets `no-cache` for `/settings`, a route that no longer exists. Remove that block. Verify: `firebase.json` is still valid JSON; after deploy, `curl -I https://<site>/chamber/1` still shows `no-cache`.
- [x] **Update AGENTS.md.**
  - **Chambers:** the number is derived from list order.
  - **Persistence:** the single versioned key, records by permanent id, attempts stored, and the migration from the number-keyed keys and why it uses a frozen table.
  - **Analytics:** `attempt` on run events, `first_completion` and `new_best` on `chamber_complete`, the new `chamber_abandon` event, runs = starts + restarts.
  - **Game/Vue boundary:** `Level` gets a pixel ratio on creation and `resize`.
  - **Rules:** the `verify` command.

  Verify: re-read each section against the code. `docs/elements.md` needs no change.
- [ ] **Changelog and version.** Bump the patch version in `package.json`. Add a release to `src/services/changelog.ts` with what a player notices, for example "Chambers are sharp on high-resolution screens". The records and analytics changes are invisible to players and need no line. Verify: `npm run verify`; the changelog under About shows the new release.
- [ ] **Deploy (author).** Register the GA4 parameters first (Phase 4), then run `npm run deploy`. Verify on the live site with existing progress from before the release: records are still on the same chambers, old keys gone, game sharp on a high-DPI screen. Note the release date in `todo/README.md`; stage 04's analytics history starts here.

## Local checks added

- `npm run verify`: lint (no fixes) + type check + production build. Changes no tracked file. Stage 01 appends the replay check, stage 02 the solver check.

## Done when

- [x] `npm run verify` exists, passes on a clean tree and leaves `git status` clean.
- [x] Records are stored under one versioned key, by permanent chamber id; the legacy keys are migrated (seeded test a–d passed) and removed.
- [x] The reorder rehearsal showed records following their chambers, and was reverted.
- [x] Reset progress clears completions, best times and attempts, and nothing comes back after a reload.
- [ ] With storage blocked the game plays and completes without errors.
- [x] Chamber numbers come from list order; duplicate ids are reported in development.
- [ ] At ratio 1 the game canvas output is byte-identical to the baseline; at 125 %, 150 % and 200 % it is sharp, with no seams and the same proportions.
- [ ] The new parameters are registered in GA4, and DebugView showed `attempt`, `first_completion`, `new_best` and `chamber_abandon` arriving from a production build.
- [ ] AGENTS.md, the changelog and the version are updated, and the release is deployed.

## Go/no-go points

- **Ratio-1 output differs from the baseline after the blur fix:** the change altered drawing. Don't ship it; fix it or fall back to open decision 3 option a.
- **Any seeded migration test puts a record on the wrong chamber or loses one:** don't ship. Reordering chambers (stage 04) stays blocked until it passes.
- **`chamber_abandon` arrives on fewer than about four of five reloads in DebugView:** keep it, but treat its counts as a lower bound. Stage 04 then has to infer abandons from runs that started and never ended, which needs the BigQuery export.
- **The BigQuery sandbox turns out unsuitable (cost, limits):** stage 04 relies on GA4 reports only. Plan its difficulty analysis around per-event counts rather than per-run journeys.

## Risks

- **Mis-mapped migration.** Prevented by the frozen legacy table and checked by the seeded tests. The order has never changed, so today's players map correctly.
- **An old tab still open after the deploy keeps writing legacy keys.** Handled by migrating as a merge on every load where legacy keys exist.
- **GA4 definitions registered after the release** lose the new parameters for those days in reports. Register first.
- **`pagehide` double sends after back/forward cache restores.** Guarded by the per-attempt flag. A restored page carries on its run, so an attempt can log `chamber_abandon` and later another ending; stage 04 must allow for it.
- **Performance at high ratios.** The canvas has about four times the pixels at 200 %, but the renderer only redraws on change. Check on the largest chamber.
- **Two tabs open at once:** every save writes the whole record, and opening a chamber now saves (attempts), so a stale tab would erase what another tab saved. Each tab takes over the record from the `storage` event whenever another tab saves it.

## Notes for later stages

- **01:** new per-chamber data (best moves, best portals, recorded best runs) goes into the progress record, with a version bump and a migration in the same merge style. `verify` is where the replay check plugs in. The `moves` parameter means tiles stepped onto; if undo changes how moves are counted (README open decision 1), add a new parameter instead of redefining `moves`. The renderer's pixel ratio must carry over into v2 drawing.
- **02:** par is chamber data, not progress, so it doesn't belong in the progress record.
- **04:** records are now safe across reorders, but links (`/chamber/N`), the in-memory last chamber and the `chamber_number` analytics parameter still follow position; decide them with the wing numbering (decision 4). Analytics history with `attempt`, `first_completion`, `new_best` and `chamber_abandon` starts on this stage's release date. The visual rework supersedes the optional home-map edge step.
- **05:** chambers outside the catalogue (shared or published) have no catalogue id. The progress record's string keys leave room for a separate key space, such as a prefix or a content hash; don't reuse catalogue ids for them.
