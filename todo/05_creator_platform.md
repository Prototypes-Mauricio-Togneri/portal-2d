# Stage 05 — Creator platform

Status: Draft
Last revised: 2026-11-07

## Goal

Players can build their own chambers in the browser, prove they are solvable by solving them, and share them. **Stage A** does this with no backend: the whole chamber (and the author's solution) lives in the link, so it works on today's static Firebase Hosting site. **Stage B**, only once there is an audience, adds accounts and a community on Firebase: publishing, browsing by new, top and trending, ratings after clearing, remixes, playlists, featured picks, moderation, creator stats and leaderboards that can't be cheated.

## Depends on

This stage assumes the following exist when it starts. Re-check each when revisiting; if one is missing, it must be built first (in its own stage), not here.

- **Stage 01 (engine v2)**
  - Chamber format v2 with a version number and automatic upgrades from every older version. Shared links live forever, so every format version ever shipped must stay decodable.
  - Elements described by data (a registry saying what each element type blocks and holds, and its draw layer), with each type's drawing kept browser-side in the renderer, looked up by element kind (stage 01, E10). The editor's palette reads the registry and draws through the renderer, so stage 03's mechanics appear in the editor without editor changes.
  - The pure step (*state + key → next state*) and a compact replay format (a list of keys).
  - An engine that loads under Node with no browser (sounds are no longer played by the rules). Stage A replays links headless in the browser; Stage B runs the same engine in Cloud Functions.
  - A defined behaviour for releasing a button linked to a box (today it throws, `src/game/chamber.ts:323-325`), or a rule the editor enforces to forbid it.
  - How "moves" counts once undo exists (README open decision 1).
- **Stage 02 (solver)**
  - The solver runs in a Web Worker with a time limit and reports par (fewest moves, fewest portals) and shortcuts ("solvable without ever opening door 2").
  - If 02's prototype was a no-go, publishing still works (the author's replay proves solvability) but shows no par or shortcuts. See Go/no-go points.
- **Stage 04 (campaign, identity, look, sound)**
  - The identity is settled: no Valve name or logo anywhere a shared link or community page can reach (README open decision 5).
  - The reworked renderer, including the "blueprint" look if built, with the high-DPI fix from stage 00. The editor draws with it.
  - A home menu that scales and has room for Editor and, later, Community entries.
  - The chamber numbering and links decision (README open decision 6), so the new routes don't collide with it.
  - Difficulty taken from measured data, and medal definitions, which Stage B reuses for community chambers.
- **Stage 00**: records keyed by permanent id. Shared chambers have no catalogue id, so they get their own records keyed by a content hash (step A2.4).

## Decisions made

- 2026-11-06 — Stage A first, with no backend: chambers are shared in the link itself (original roadmap).
- 2026-11-06 — You can only share or publish what you have solved; your replay is attached (original roadmap).
- 2026-11-06 — Ratings only after clearing (original roadmap).
- 2026-11-06 — Today's rules are deleted after v2 matches them (README decision 3), so every shared link and replay targets the v2 ruleset.
- 2026-11-06 — No cloud CI (README decision 6): Stage B is developed against the local Firebase Emulator Suite, and its checks run locally.
- Desktop only, as everywhere: no touch editor (AGENTS.md).

## Open decisions

1. **When does Stage B start?** (README open decision 7)
   - *Never:* stay link-only. No running cost, moderation or legal work, but no browsing, ratings or leaderboards.
   - *At an audience threshold (recommended):* start when, for 8 weeks in a row, all of these hold: weekly active players ≥ **X**, shared chambers opened per week ≥ **Y**, distinct shared chambers created per month ≥ **Z**. The author must also have finished phase B0 (legal, billing, moderation time). Placeholder numbers: X = 300, Y = 100, Z = 20. Set the real ones after Stage A's first month of data. Measured in Google Analytics: weekly active users (built in), `shared_chamber_open` and `editor_share` counts, and distinct `chamber_hash` values. Counting distinct parameter values needs an Exploration report or the BigQuery export (unverified). Cost: Stage B waits, possibly forever.
   - *Right after Stage A:* the full backend, moderation, billing and legal work, possibly for no users.
2. **Put the author's replay in the link?**
   - *Yes (recommended):* the receiver can check "solvable" on their own machine. A replay is a few bits per key, so even a few hundred keys add little.
   - *No:* shorter links, but nothing proves the chamber can be solved.
3. **Link encoding.**
   - *Compact binary v2 encoding, then native `CompressionStream('deflate-raw')`, then base64url (recommended):* no new dependency. Today's chambers already measure about 750–1,100 URL characters as compressed JSON, and a tile-by-tile binary layout should beat that (to be measured in A1.5).
   - *Compressed JSON:* simplest, but longer links and an encoding tied to JSON field names.
   - *A compression library:* no gain over the native API on a desktop-only site.
4. **Sign-in providers (Stage B).**
   - *Google sign-in, with no account needed to play or browse (recommended):* an account is needed only to publish, rate, report and keep cloud records. Least personal data and least code.
   - *Google plus email link:* covers players without Google, but more to support.
   - *Anonymous accounts upgraded later:* smoothest, but more edge cases and orphaned data.
5. **How are Firestore security rules verified?** AGENTS.md says the project has no tests by design, but untested security rules are a data-leak risk.
   - *Rules tests against the local emulator, as the one exception (recommended):* scoped to `firestore.rules` only and run as a local check.
   - *A manual checklist run against the emulator:* keeps the no-tests rule, but is easy to skip and error-prone.
6. **Thumbnails (Stage B).**
   - *Render them on the fly from the chamber data with the preview renderer (recommended):* `src/game/chamber_preview.ts` already draws a start state, and `src/components/chamber_map.vue` already does it at the screen's pixel ratio. No storage, no server rendering, never stale.
   - *Stored PNGs in Cloud Storage:* only needed for social-media link previews, which would also need server-rendered pages per chamber; that's out of scope for a static site.
7. **What do leaderboards rank?** A replay proves moves and portals exactly, but not time: key timestamps can be faked, for example by feeding a perfect solver replay with made-up timings.
   - *Rank by moves, then portals; show time without ranking it (recommended).*
   - *Also a time board with a plausibility check* (a minimum time per step). It can still be gamed by a careful cheater.
8. **A separate staging Firebase project for Stage B?**
   - *Yes (recommended):* functions, rules and indexes can be tried on real infrastructure before production. Costs one more project to keep in sync.
   - *No:* emulator, then production. Cheaper, but the first real-world run is on players.

## Steps

### Stage A — no backend

#### Phase A1 — Chamber links: encoding and validation

- [ ] **A1.1 Write the link format.** Settle open decisions 2 and 3. Describe the byte layout in a new `docs/chamber_link.md`: format version, ruleset version, size, tile layer (element codes from 01's registry), linked elements and their links, subject and exit, optional name and author (UTF-8, length-capped), optional replay. Verify: every element type in the registry and every field of v2's chamber type has a place in the layout.
- [ ] **A1.2 Encoder and decoder.** Plain TypeScript with no Vue import, so Stage B's Cloud Functions can reuse it (for example `src/game/chamber_link.ts`, inside the lint boundary in `eslint.config.js`). Encode → deflate-raw → base64url, and back. Note that `CompressionStream` is asynchronous. Verify: a local check round-trips every bundled chamber to an identical result.
- [ ] **A1.3 Size limits.** Reject encoded text above a cap (proposal: 8 KB) before decoding. Stop decompressing above a cap (proposal: 64 KB) while streaming, so a "zip bomb" can't freeze the tab. Cap the grid (proposal: 40×40, confirm against stage 04's camera) and the element counts. Verify: oversized and bomb fixtures are rejected within milliseconds.
- [ ] **A1.4 Runtime validation of untrusted chambers.** Today `ChamberData` (`src/game/chamber_data.ts`) is only checked by the type checker at build time; a link needs a runtime check. Reuse 01's v2 validator if it has one; otherwise build it here. Check: everything inside the grid; exactly one subject and one exit; links point at existing linkable ids; no duplicate ids; allowed element combinations per tile (from the registry); the box-linked-button rule; name and author length and characters. Return a list of problems with tile positions, so the editor can show them. Verify: each bad fixture produces its expected error, and every bundled chamber passes.
- [ ] **A1.5 Measure link length.** Encode every bundled chamber (stage 04's campaign by then) with and without its recorded solution. Write the smallest, middle and largest lengths into this file. Budget: 2,000 characters with the replay. Verify: a local check fails if a bundled chamber's link goes over budget.

#### Phase A2 — Opening a shared link

- [ ] **A2.1 Shared-chamber route.** Add `/play` to `src/router.ts`, reading the chamber from the URL hash; a hash never reaches the server. Add a `/play` no-cache header block to `firebase.json`, in the same style as `/chamber/**`. The loading gate keeps the address (`src/app.vue` shows the loading screen, then the router view). Note that the router view is keyed by `$route.fullPath`, so a hash change remounts the screen; never write editor state into the hash while editing. Verify: `npm run build && npm run preview`, then open `/play#<link>` directly; it survives the loading screen and plays.
- [ ] **A2.2 Broken-link screen.** Use the frontend-design skill. A plain message with Back to menu, giving the reason in plain words: damaged link, made with a newer version (reload the page), too large. Verify: each failure fixture shows its message; Escape and Enter work.
- [ ] **A2.3 Play a shared chamber.** The chamber screen takes chamber data from either the catalogue or a link (today its only input is the chamber number). Use the frontend-design skill for the sign, which shows name and author instead of a number. The completion dialog offers Play again, Back to menu and Copy link, with no Next chamber. Verify: complete a shared chamber; campaign progress is untouched.
- [ ] **A2.4 Local records for shared chambers.** A new storage key, `portal-2d.shared-records`, keyed by a content hash (SHA-256 of the decoded bytes via `crypto.subtle`, truncated). Wrapped in `try`/`catch` like every storage access, and capped (proposal: the last 200 chambers). Decide whether Reset progress clears it. Verify: the best time survives a reload; with storage blocked the chamber still plays.
- [ ] **A2.5 Verified badge.** If the link carries a replay, run it headless on open with 01's pure step. Use the frontend-design skill for "Solved by its author in N moves", or "Not verified" if the replay fails; the chamber stays playable either way. Verify: a link with a tampered replay shows "Not verified".

#### Phase A3 — The editor

- [ ] **A3.1 Editor route and screen.** Add `/editor` to `src/router.ts` with its no-cache header in `firebase.json`, a new `src/components/screens/editor_screen.vue`, and an entry in the home menu placed by stage 04's menu. Use the frontend-design skill. Verify: reachable and usable with the keyboard only.
- [ ] **A3.2 Draw with the game's renderer.** Draw the draft with stage 04's renderer (the blueprint look if it exists), at the screen's pixel ratio, plus a grid and a cursor overlay. Verify: a bundled chamber opened in the editor looks exactly as in the game, apart from the overlay.
- [ ] **A3.3 Keyboard-first tools.** Arrows move the cursor; a palette, read from 01's element registry, picks the element type; keys place, erase, set the subject and exit, and turn directional elements; mouse click-and-drag paints. Use the frontend-design skill for the palette and the element inspector. Verify: rebuild chamber 1 from scratch with the keyboard only.
- [ ] **A3.4 Link tool.** Pick a button or switch, then its targets; links are drawn as lines; ids are assigned automatically (authors never type ids). Use the frontend-design skill. Verify: links survive a round trip through the link; deleting a target removes its links.
- [ ] **A3.5 Resize and wall fill.** Change the size within the caps; fill the border with walls; fill a rectangle with walls. The current format already accepts wall rectangles (`WallRangeData` in `chamber_data.ts`), though no bundled chamber uses them. Verify: shrinking warns before it drops elements.
- [ ] **A3.6 Editor undo and redo.** A stack of draft snapshots, separate from the game's undo. Ctrl is a game key (turn in place), so the editor screen owns the keyboard while editing and the game's input owns it only during test-play. Verify: 100 edits undo back to the empty grid, and redo restores them.
- [ ] **A3.7 Autosave the draft.** A new storage key, `portal-2d.editor-draft` (`try`/`catch`), restored on open. "New chamber" asks before discarding, in a red caution dialog per the UI rules; use the frontend-design skill. Verify: a reload keeps the draft; with storage blocked the editor works and warns once.
- [ ] **A3.8 Live problem list.** Shows A1.4's problems with a jump to the tile. Errors block test-play and sharing; warnings don't. Use the frontend-design skill. Verify: each bad fixture's problem shows and jumps to the right tile.
- [ ] **A3.9 Test-play.** Starts the draft in the game (with 01's undo); Escape returns to the editor with the draft and cursor unchanged. A completed test-play records the replay together with the draft's content hash. Verify: edit, test-play, return and complete all work in sequence.
- [ ] **A3.10 Keyboard ownership docs.** Update the keyboard section of `AGENTS.md` for the editor and test-play. Verify: a read-through matches the behaviour.

#### Phase A4 — Publish only what you solved

- [ ] **A4.1 Sharing needs a fresh solve.** Share is enabled only when the last completed test-play's content hash equals the current draft's. Verify: any edit after solving disables Share until solved again.
- [ ] **A4.2 Solver report before sharing.** Run stage 02's solver in a Web Worker with a time limit: par (moves, portals), shortcuts, elements that never matter. Use the frontend-design skill for the share dialog that shows them. On timeout, sharing is still allowed (the author's replay proves solvability) and par shows as unknown. Verify: chamber 1 reports the par stored by stage 02; a fixture with a deliberate shortcut reports it.
- [ ] **A4.3 Build and copy the link.** Encode the draft, the author's replay, the name and the author; copy with `navigator.clipboard.writeText`, falling back to a selected text field. Verify: the link opens in another browser profile, shows the verified badge and plays the same way.
- [ ] **A4.4 Old links keep working.** The link carries format and ruleset versions; the decoder keeps every past format's upgrade (01's upgrade path). A replay that fails because the rules changed shows "made for an older version", not "broken". Verify: a fixture link in an older format still opens.

#### Phase A5 — Analytics, docs and release

- [ ] **A5.1 Editor and shared-chamber events.** In `src/services/analytics.ts` (the event list is its `EventName` union). Proposed names, permanent once shipped: `editor_open`; `editor_test_play`; `editor_share` (`width`, `height`, `elements`, `par_moves`, −1 when unknown); `shared_chamber_open` (`chamber_hash`, `verified`); `shared_chamber_complete` (`chamber_hash`, `time_ms`, `moves`, `portals`). No chamber content or names go into events. Skip `shared_chamber_open` when the opener's own draft has that hash, so authors don't inflate the gate numbers. The author registers the custom parameters in Google Analytics. Verify: events arrive in DebugView. `npm run preview` serves a production build that sends real events, so test on a preview channel or accept the noise.
- [ ] **A5.2 Docs.** `AGENTS.md`: layout (editor screen, link encoding), routes, keyboard ownership, analytics events, storage keys. `docs/elements.md`: point to `docs/chamber_link.md`. Verify: a read-through.
- [ ] **A5.3 Release.** Deploy to a Firebase Hosting preview channel from the local machine (`firebase hosting:channel:deploy <name>`), try links across browsers, then `npm run deploy`. Verify: a link made on the preview opens on production.

### Gate — before Stage B

- [ ] **G.1 Decide open decision 1 with real numbers** after at least one month of Stage A data. Record the decision under Decisions made here and in `todo/README.md`. If no-go, mark this stage Done after Stage A and stop.

### Stage B — on Firebase

#### Phase B0 — Prerequisites only the author can do

- [ ] **B0.1 Privacy policy, terms and content policy, with legal input.** Accounts store personal data (account id, display name, the provider's email). Analytics already runs with no consent prompt. Players in the EU and UK likely need a privacy policy and a consent prompt. A content policy covers user chambers, and a minimum age must be set. This is legal work, not something code decides. Verify: the pages are published and linked from About.
- [ ] **B0.2 Consent prompt, if B0.1 says so.** Analytics starts only after consent (today `startAnalytics` runs at startup with no prompt); use the frontend-design skill. This changes the AGENTS.md analytics rule ("with no consent prompt"). Verify: no analytics request before consent.
- [ ] **B0.3 Billing.** Cloud Functions require the Blaze (pay-as-you-go) plan. Set budget alerts and a monthly amount the author accepts. Verify: a test alert arrives.
- [ ] **B0.4 Moderation commitment.** Hours per week, response time for reports, and who else can moderate. Verify: written under Decisions made.

#### Phase B1 — Firebase foundations and local emulators

- [ ] **B1.1 One shared Firebase app.** Today `initializeApp` runs only inside analytics startup, in production builds, where Analytics is supported (`src/services/analytics.ts:50-57`). Move it into a new `src/services/firebase_app.ts` shared by Analytics, Auth and Firestore. Add `authDomain` to the config (sign-in needs it; today the config holds only `apiKey`, `projectId` and `appId`). Analytics keeps its production-only behaviour. Verify: production still receives events; `npm run dev` sends none.
- [ ] **B1.2 Load community code lazily.** Auth and Firestore load through dynamic imports only on community screens and in the publish flow. Verify: `npm run build` shows the main bundle within a few KB of before, with the community code in its own chunk.
- [ ] **B1.3 Local emulators.** An `emulators` section in `firebase.json` (auth, firestore, functions, hosting), an `npm run emulators` script, and the app connecting to the emulators in development only. Verify: sign in and publish end to end with no request reaching production.
- [ ] **B1.4 Staging project** (if open decision 8 says yes). Create `portal-2d-staging` and add a deploy target. Verify: rules and functions deploy there first.
- [ ] **B1.5 App Check.** reCAPTCHA Enterprise provider, monitored first, then enforced on Firestore and Functions, with a debug token for the emulators. Verify: once enforced, a request without a token is rejected.
- [ ] **B1.6 Sign-in and account screen.** Providers per open decision 4. Playing and browsing need no account. Use the frontend-design skill for the account screen: display name, sign out, delete account. Verify: sign in, rename, sign out; delete is covered by B7.5.

#### Phase B2 — Data model and security rules

- [ ] **B2.1 Write the data model** in a new `docs/community_data.md`. It covers each chamber's name, author, date, rating and thumbnail:
  - `users/{uid}`: display name, created at. Roles go in custom claims, not the document.
  - `chambers/{chamberId}`: author id, author name (copied), name, tags, payload (the link encoding), format and ruleset versions, content hash, par or null, created at, status (pending, published, hidden, removed), remix-of or null, and stats (plays, clears, rating sum and count, trending score), written only by functions.
  - `chambers/{id}/runs/{uid}`: best moves, portals and time, cleared, verified at, replay.
  - `chambers/{id}/ratings/{uid}`: value, created at.
  - `chambers/{id}/stuck`: per-tile quit counts (B8).
  - `reports/{reportId}`: chamber, reporter, reason, short note, created at, status.
  - `playlists/{playlistId}`: owner, name, chamber ids, public.
  - `featured/{chamberId}`: added by, added at.

  Verify: every step in B4–B9 maps to fields here.
- [ ] **B2.2 Security rules** in a new `firestore.rules`:
  - Public read of published chambers.
  - Signed-in users create only pending chambers, with size-limited fields.
  - Payload, author and remix-of can't change after creation.
  - Stats, verified runs, featured and statuses are written only by functions (the admin SDK skips rules).
  - A rating needs that user's verified cleared run (`exists()`).
  - Reports are create-only.
  - Banned users are blocked.

  Verify: per open decision 5, against the emulator.
- [ ] **B2.3 Indexes** in a new `firestore.indexes.json`: new (status and created at), top (status and rating score), trending (status and trending score), tag filters (tag and order). Verify: every query runs in the emulator with no missing-index error.

#### Phase B3 — Server-side replay verifier

Without this, clears, "ratings only after clearing", difficulty from clear rates and leaderboards can all be forged by any client writing to Firestore. It is what makes Stage B a real backend: Cloud Functions running the engine under Node, on the Blaze plan.

- [ ] **B3.1 Functions project.** A new `functions/` folder (TypeScript, on a Node version Cloud Functions supports) that bundles the engine from `src/game/` and the link decoder from A1.2, both browser-free since stage 01. Extend the lint boundary so functions import only those. Verify: it builds and runs in the emulator.
- [ ] **B3.2 Replay verifier.** A function that takes a chamber (id or payload) and a replay, then decodes, validates and replays it under a key cap (proposal: 10,000 keys) and a time limit. It returns cleared, moves and portals; time is not provable (open decision 7). Verify: every recorded solution from stage 01 passes; tampered ones fail.
- [ ] **B3.3 Deploy script.** `scripts/deploy.sh` (today: build, then `firebase deploy --only hosting`) also deploys functions, rules and indexes, staging first if B1.4 exists. Verify: a full deploy to staging, then production.

#### Phase B4 — Publishing

- [ ] **B4.1 Publish from the editor.** A signed-in author publishes a solved draft. A function validates it, verifies the author's replay, rejects a content hash that is already published, recomputes par with the solver under a time cap (par unknown on timeout; client-sent par is never trusted), and sets the status to published, or pending for new or flagged authors. Use the frontend-design skill for the publish dialog (name, tags). Verify: end to end in the emulator; an unsolved payload is rejected.
- [ ] **B4.2 Publish rate limit.** At most N publishes per user per day, enforced in the function. Verify: the N+1th is rejected.
- [ ] **B4.3 Unpublish and delete your own chambers.** Verify: the chamber leaves every list; Stage A links to it still work, since the chamber is in the link.
- [ ] **B4.4 Community chamber route.** `/community/<chamberId>` in `src/router.ts`, with its no-cache header in `firebase.json`. Verify: opens directly, through the loading screen.

#### Phase B5 — Browsing and playing community chambers

- [ ] **B5.1 Community screen.** New, top and trending lists, a tag filter, difficulty bands and paging, with the same keyboard model as the home menu (Up/Down, Right/Enter, Left/Escape). Thumbnails per open decision 6. Use the frontend-design skill. Verify: 500 seeded chambers in the emulator browse smoothly, and reads per page stay at page size.
- [ ] **B5.2 Trending and top scores.** A scheduled function recomputes the trending score (plays and clears over the last 7 days, decaying) and a rating score that doesn't let one 5-star rating top the list. Verify: seeded data ranks as expected.
- [ ] **B5.3 Difficulty from clear rate.** Clears divided by plays, shown as a band once plays reach a threshold (proposal: 20), "New" until then. Reuse stage 04's bands. Verify: the shown band matches the seeded stats.
- [ ] **B5.4 Count plays and clears.** A play is counted once per run through a function; a clear only through the verifier, which writes the run document. Verify: replaying the same run doesn't count twice.

#### Phase B6 — Ratings, remixes, playlists, featured picks

- [ ] **B6.1 Ratings after a verified clear.** Editable; the rules enforce the clear. Use the frontend-design skill. Verify: the rules reject a rating without a verified run.
- [ ] **B6.2 Remix with credit.** Remix opens a published chamber as an editor draft with remix-of set; the published remix shows "Remix of *name* by *author*". Use the frontend-design skill. Verify: the credit shows; if the original is removed, the credit says so.
- [ ] **B6.3 Playlists.** Create, reorder, share; public ones can be browsed. Use the frontend-design skill. Verify: a playlist containing a deleted chamber skips it cleanly.
- [ ] **B6.4 Featured picks.** An admin custom claim, and a featured row on the community screen. Use the frontend-design skill. Verify: a non-admin can't write `featured` (rules).

#### Phase B7 — Moderation

- [ ] **B7.1 Report button.** Reasons (offensive name, spam, broken, copied) plus an optional short note, rate-limited. Use the frontend-design skill. Verify: the report is stored and the limit holds.
- [ ] **B7.2 Auto-hide.** After N distinct reporters the chamber is hidden pending review, by a function. Verify: an emulator scenario.
- [ ] **B7.3 Review queue.** The Firestore console at first; an admin screen (frontend-design skill) only if volume demands it. Actions: approve, hide, remove, ban the author. Verify: each action changes the status and the visibility.
- [ ] **B7.4 Limit free text.** Chamber names and display names only, with a length cap, a character allowlist and a basic word filter. No comments. Verify: filter fixtures.
- [ ] **B7.5 Account deletion.** A function removes the user's document, ratings, runs and playlists, and removes or anonymises their chambers as the privacy policy says. Verify: an emulator scenario leaves no personal data.
- [ ] **B7.6 Workload review after the first month.** Hours spent against B0.4's commitment. Verify: recorded here; see Go/no-go points.

#### Phase B8 — Creator stats

- [ ] **B8.1 Record where players get stuck.** On quit or restart, send the subject's tile and move count (not the keys) to a function that adds it to a per-chamber, per-tile count. Google Analytics is the wrong tool for an unbounded number of community chambers (high-cardinality parameters get grouped away), so this lives in Firestore. Verify: seeded quits produce the expected counts.
- [ ] **B8.2 Creator stats screen.** Plays, clears, clear rate, median moves and time, rating, and a heat map of quit tiles drawn over the chamber's preview. Use the frontend-design skill. Verify: the numbers match the seeded data.

#### Phase B9 — Leaderboards that can't be cheated

- [ ] **B9.1 Verified per-chamber boards.** Only verifier-written runs count. Rank per open decision 7. Use the frontend-design skill. Verify: a forged replay is rejected; a forged time can't move a moves ranking.
- [ ] **B9.2 Campaign boards (optional).** The same verifier for bundled chambers, keyed by permanent id. Verify: as B9.1.

#### Phase B10 — Cost, docs and launch

- [ ] **B10.1 Cost tracking.** Weekly Firestore reads and writes and function calls against the B0.3 budget; cap function instances. Verify: the first month's numbers are recorded here.
- [ ] **B10.2 Docs.** `AGENTS.md`: the "static site; there is no backend" sentence, layout (`functions/`, rules, indexes), persistence (cloud data), analytics, deploy, the privacy policy link. Verify: a read-through.
- [ ] **B10.3 Staged launch.** Invite-only first (an allowlist enforced in the rules), then open. Verify: a non-invited account can't publish during the invite phase.

## Local checks added

- Round trip of every bundled chamber through the link encoding (A1.2).
- Link-length budget for every bundled chamber, with and without its solution (A1.5).
- Validator fixtures: every bad chamber is rejected with its expected error, every bundled chamber passes; oversized and bomb payloads are rejected quickly (A1.3, A1.4).
- Every recorded solution replays to completion through the link path, and an old-format fixture link still opens (A2.5, A4.4).
- Stage B: security rules checked against the emulator (B2.2); the verifier run under Node on every recorded solution (B3.2); `functions/` builds.

## Done when

Stage A:

- [ ] A chamber can be built from scratch in the editor, by keyboard alone, with every element type in the registry.
- [ ] Sharing is only possible after solving the current draft, and the link carries the solution.
- [ ] A shared link opens in another browser after the loading screen, shows the verified badge, and plays the same way.
- [ ] Damaged, oversized and newer-version links show a plain message and never freeze or crash the tab.
- [ ] The solver's par and shortcuts show before sharing (or "unknown" if stage 02 was a no-go or it timed out).
- [ ] The editor and shared-chamber analytics events arrive in production.
- [ ] The local checks above pass; stage 00's non-mutating check command (`npm run verify`, if that name was chosen) passes; AGENTS.md and the docs match the behaviour.
- [ ] The gate (G.1) is decided and recorded.

Stage B (only if the gate says go):

- [ ] The privacy policy, terms and content policy are published, and consent is handled as B0.1 decided.
- [ ] Publishing, browsing, ratings after verified clears, remixes, playlists, featured picks and reports work end to end on production.
- [ ] No clear, rating, stat or leaderboard entry can be written without the server verifier (checked against the rules).
- [ ] Moderation runs within the committed hours for a month.
- [ ] Costs stay within the budget for a month.

## Go/no-go points

- **Gate G.1:** no-go means the stage ends after Stage A, and phases B0–B10 are dropped (kept here for later).
- **Stage 02 no-go:** publish without par or shortcuts. Difficulty comes only from clear rates. Leaderboards are unaffected (they need only the verifier).
- **Link length:** if typical links exceed the 2,000-character budget even with the binary encoding, drop the replay from the link (open decision 2), or accept long links and note that some chat apps cut them.
- **Moderation workload (B7.6):** if it exceeds the commitment, switch to "pending until approved" for every publish, drop free-text names, or pause publishing.
- **Cost (B10.1):** if it exceeds the budget, cut the trending recomputation frequency and the per-run writes first, then pause public publishing.
- **Verifier cost:** if server solving under a time cap is too expensive, keep the verifier (cheap, a single replay) and drop server par (show the author's solution length instead).

## Risks

- **Moderation:** offensive names, spam publishing, copied chambers. Keep free text to short names and moderate after publishing, with auto-hide; budget the hours up front (B0.4).
- **Cost:** Firestore reads from browsing and writes from per-run records grow with players. Watch weekly, page lists, aggregate in functions.
- **Abuse:** fake clears, rating manipulation, report brigading. The server verifier, ratings only after a verified clear, rate limits, App Check, distinct-reporter thresholds.
- **IP exposure:** sharing and a community make the game far more visible. Nothing public may carry the Valve name or logo; this depends on stage 04's identity work. Players may also recreate levels from other games; the content policy and the "copied" report reason cover it.
- **Privacy and legal:** accounts bring personal data, EU and UK consent rules and minimum-age questions. Handled with legal input in B0, before any account code ships.
- **Format and rules drift:** a shared link lives forever. Every format version stays decodable, and a rules change after v2 must version replays, or old solutions fail.
- **Untrusted data:** giant or malformed chambers could freeze the tab or the solver. Size caps before decoding, a runtime validator, the solver in a worker with a time limit.
- **Bundle growth:** Auth and Firestore are heavy. Load them only on community screens (B1.2).

## Notes for later stages

This is the last stage. Things it leaves for whatever comes next:

- A daily puzzle (from the original thesis) can reuse Stage B's pieces: featured picks to schedule it, the verifier for its leaderboard, the solver as its judge.
- Campaign leaderboards (B9.2) and medals for community chambers reuse the same verifier.
- Any rules change after v2 must keep old replays verifiable (a versioned ruleset), or shared links and leaderboards lose their proof.
- `firebase.json`'s stale `/settings` no-cache header (no such route) can be removed whenever headers are touched for the new routes; it belongs to stage 00's clean-up, not here.
