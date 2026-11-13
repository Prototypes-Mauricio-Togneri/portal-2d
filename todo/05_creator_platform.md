# Stage 05 — Creator platform

Status: Draft
Last revised: 2026-11-13

## Goal

The author can build chambers in an in-browser editor, prove each one solvable by solving it, and share it in a link, with no backend: the whole chamber (and the author's solution) lives in the link, so it works on today's static Firebase Hosting site. A solved chamber can also be exported as a chamber file and its recorded solution, for the campaign. Whether sharing by link is worth building is open decision 1 (recommended: yes, to send chambers to friends). The old Stage B (accounts and a community on Firebase) was removed, since a few friends are no audience (README decision 13).

## Depends on

This stage assumes the following exist when it starts. Re-check each when revisiting; if one is missing, it must be built first (in its own stage), not here.

- **Stage 01 (engine v2)**, done 2026-11-07
  - Chamber format 2 with a version number; the upgrader from format 1 was removed (README decision 13). The chamber loader (`src/game/rules/load_chamber.ts`) reads a chamber as raw JSON, checks its layout and reports each problem with its field and tile.
  - Elements described by data: the element registry (`src/game/rules/element_registry.ts`) says what each element type blocks and holds, and its draw layer. Each type's drawing stays browser-side in `src/game/element_drawings.ts`, looked up by element kind. The editor's palette reads the registry and draws through the renderer, so stage 04's mechanics appear in the editor without editor changes.
  - The pure step: `step(chamber, state, action)` gives the next state and its events. The replay format is compact: `ReplayData` (`src/game/replay_data.ts`), a list of presses (each an action, or undo or redo) with the expected result and the hash of the chamber it was recorded on.
  - An engine that loads under Node with no browser (the rules report events and play no sounds). A link's replay runs headless in the browser, and the local checks run the same code under Node.
  - Releasing a button linked to a box does nothing to the box. The validator warns about a button linked to a box but still loads the chamber, so the editor can show that warning, or forbid the link if it chooses.
  - "Moves" is settled: each step that puts the subject on another tile, undone steps included, redo counting nothing (README decision 8). Whether ranked runs allow undo waits for stage 04.
  - JSON imports widen string literals to `string`, which is why format 2 keeps one optional list per element type rather than one list told apart by a `type` string, which would need a cast.
- **Stage 02 (solver)**, stopped (README decision 10): no par and no shortcut report. The author's replay alone proves a chamber solvable.
- **Stage 03 (look and sound)**
  - The reworked renderer, with the high-DPI fix from stage 00. The editor draws with it.
- **Stage 04 (mechanics and campaign)**
  - A home menu that scales and has room for an Editor entry.
  - Chamber links by position (`/chamber/N`, README decision 13, which settled open decision 6), so the new routes don't collide with them.
- **Stage 00**: records keyed by permanent id. Shared chambers have no catalogue id, so they get their own records keyed by a content hash (step A2.4).

## Decisions made

- 2026-11-06 — Stage A first, with no backend: chambers are shared in the link itself (original roadmap).
- 2026-11-06 — You can only share what you have solved; your replay is attached (original roadmap).
- 2026-11-06 — Today's rules are deleted after v2 matches them (README decision 3), so every shared link and replay targets the v2 ruleset.
- 2026-11-06 — No cloud CI (README decision 6): this stage's checks run locally.
- 2026-11-09 — Stage A only, with no backend (README decision 13): the author plays alone during development and a few friends play later, which is no audience, so accounts, publishing, browsing, ratings, remixes, playlists, moderation, creator stats and leaderboards (the old Stage B, with its gate and its open decisions on when it starts, sign-in, security rules tests, thumbnails, leaderboard ranking and a staging project) are removed. Step numbers keep their A prefix. Old links needn't keep working: no upgrade chain.
- 2026-11-09 — No par or shortcut report before sharing (README decision 10).
- 2026-11-09 — The editor and shared-chamber analytics events planned in the old A5.1 stay out: they counted toward Stage B's gate. A revisit can add events if they're wanted.
- Desktop only, as everywhere: no touch editor (AGENTS.md).

## Open decisions

1. **Is sharing by link worth building?** (Added 2026-11-09, replacing "When does Stage B start?", which README decision 13 settled: never.) Links would go to a few friends (README decision 12), not a public audience.
   - *Editor only:* the editor exports a solved chamber's JSON and its recorded solution for the campaign (A4.1, A4.2). Phases A1 and A2 and steps A4.3 and A4.4 are skipped, apart from A1.3's grid cap and A1.4's checks, which the editor needs anyway. Cost: no way to send friends a chamber outside a release.
   - *Editor plus link sharing:* everything below. Cost: the link format, its decoder, size caps, a shared-chamber screen and local records for shared chambers.
   - **Recommendation: editor plus link sharing**, so the author can send chambers to friends; still decided at this stage's revisit.
2. **Put the author's replay in the link?**
   - *Yes (recommended):* the receiver can check "solvable" on their own machine. A replay is a few bits per key, so even a few hundred keys add little.
   - *No:* shorter links, but nothing proves the chamber can be solved.
3. **Link encoding.**
   - *Compact binary v2 encoding, then native `CompressionStream('deflate-raw')`, then base64url (recommended):* no new dependency. Today's chambers already measure about 750–1,100 URL characters as compressed JSON, and a tile-by-tile binary layout should beat that (to be measured in A1.5).
   - *Compressed JSON:* simplest, but longer links and an encoding tied to JSON field names.
   - *A compression library:* no gain over the native API on a desktop-only site.

## Steps

### Phase A1 — Chamber links: encoding and validation

- [ ] **A1.1 Write the link format.** Settle open decisions 2 and 3. Describe the byte layout in a new `docs/chamber_link.md`: format version (raised by any format or rules change that breaks old links, A4.4), size, tile layer (element codes from 01's registry), linked elements and their links, subject and exit, optional name and author (UTF-8, length-capped), optional replay. Verify: every element type in the registry and every field of v2's chamber type has a place in the layout.
- [ ] **A1.2 Encoder and decoder.** Plain TypeScript with no Vue import, so the local checks can run it under Node (for example `src/game/chamber_link.ts`, inside the lint boundary in `eslint.config.js`). Encode → deflate-raw → base64url, and back. Note that `CompressionStream` is asynchronous. Verify: a local check round-trips every bundled chamber to an identical result.
- [ ] **A1.3 Size limits.** Reject encoded text above a cap (proposal: 8 KB) before decoding. Stop decompressing above a cap (proposal: 64 KB) while streaming, so a "zip bomb" can't freeze the tab. Cap the grid (proposal: 40×40, or smaller: there is no camera (stage 03), so the cap must keep a chamber fitting the screen) and the element counts. Verify: oversized and bomb fixtures are rejected within milliseconds.
- [ ] **A1.4 Runtime validation of untrusted chambers.** The runtime validator exists: the chamber loader (`src/game/rules/load_chamber.ts`) reads a chamber as raw JSON and rejects what `docs/elements.md` lists under "What the validator rejects", reporting each problem with its field and tile. Reuse it for a decoded link and for the editor's draft, and add only the link's own checks: name and author length and characters. Return the problems with their tiles, so the editor can show them. Verify: each bad fixture produces its expected error, and every bundled chamber passes.
- [ ] **A1.5 Measure link length.** Encode every bundled chamber (stage 04's campaign by then) with and without its recorded solution. Write the smallest, middle and largest lengths into this file. Budget: 2,000 characters with the replay. Verify: a local check fails if a bundled chamber's link goes over budget.

### Phase A2 — Opening a shared link

- [ ] **A2.1 Shared-chamber route.** Add `/play` to `src/router.ts`, reading the chamber from the URL hash; a hash never reaches the server. Add a `/play` no-cache header block to `firebase.json`, in the same style as `/chamber/**`. The loading gate keeps the address (`src/app.vue` shows the loading screen, then the router view). Note that the router view is keyed by `$route.fullPath`, so a hash change remounts the screen; never write editor state into the hash while editing. Verify: `npm run build && npm run preview`, then open `/play#<link>` directly; it survives the loading screen and plays.
- [ ] **A2.2 Broken-link screen.** Use the frontend-design skill. A plain message with Back to menu, giving the reason in plain words: damaged link, made with a different version of the game, too large. Verify: each failure fixture shows its message; Escape and Enter work.
- [ ] **A2.3 Play a shared chamber.** The chamber screen takes chamber data from either the catalogue or a link (today its only input is the chamber number). Use the frontend-design skill for the sign, which shows name and author instead of a number. The completion dialog offers Play again, Back to menu and Copy link, with no Next chamber. Verify: complete a shared chamber; campaign progress is untouched.
- [ ] **A2.4 Local records for shared chambers.** A new storage key, `portal-2d.shared-records`, keyed by a content hash (SHA-256 of the decoded bytes via `crypto.subtle`, truncated). Wrapped in `try`/`catch` like every storage access, and capped (proposal: the last 200 chambers). Decide whether Reset progress clears it. Verify: the best time survives a reload; with storage blocked the chamber still plays.
- [ ] **A2.5 Verified badge.** If the link carries a replay, run it headless on open with 01's pure step. Use the frontend-design skill for "Solved by its author in N moves", or "Not verified" if the replay fails; the chamber stays playable either way. Verify: a link with a tampered replay shows "Not verified".

### Phase A3 — The editor

- [ ] **A3.1 Editor route and screen.** Add `/editor` to `src/router.ts` with its no-cache header in `firebase.json`, a new `src/components/screens/editor_screen.vue`, and an entry in the home menu placed by stage 04's menu. Use the frontend-design skill. Verify: reachable and usable with the keyboard only.
- [ ] **A3.2 Draw with the game's renderer.** Draw the draft with stage 03's renderer, at the screen's pixel ratio, plus a grid and a cursor overlay. Verify: a bundled chamber opened in the editor looks exactly as in the game, apart from the overlay.
- [ ] **A3.3 Keyboard-first tools.** Arrows move the cursor; a palette, read from 01's element registry, picks the element type; keys place, erase, set the subject and exit, and turn directional elements; mouse click-and-drag paints. Use the frontend-design skill for the palette and the element inspector. Verify: rebuild chamber 1 from scratch with the keyboard only.
- [ ] **A3.4 Link tool.** Pick a button or switch, then its targets; links are drawn as lines; ids are assigned automatically (authors never type ids). Use the frontend-design skill. Verify: links survive a round trip through the link; deleting a target removes its links.
- [ ] **A3.5 Resize and wall fill.** Change the size within the caps; fill the border with walls; fill a rectangle with walls. The current format already accepts wall rectangles (`WallRangeData` in `chamber_data.ts`), though no bundled chamber uses them. Verify: shrinking warns before it drops elements.
- [ ] **A3.6 Editor undo and redo.** A stack of draft snapshots, separate from the game's undo. Ctrl is a game key (turn in place), so the editor screen owns the keyboard while editing and the game's input owns it only during test-play. Verify: 100 edits undo back to the empty grid, and redo restores them.
- [ ] **A3.7 Autosave the draft.** A new storage key, `portal-2d.editor-draft` (`try`/`catch`), restored on open. "New chamber" asks before discarding, in a red caution dialog per the UI rules; use the frontend-design skill. Verify: a reload keeps the draft; with storage blocked the editor works and warns once.
- [ ] **A3.8 Live problem list.** Shows A1.4's problems with a jump to the tile. Errors block test-play and sharing; warnings don't. Use the frontend-design skill. Verify: each bad fixture's problem shows and jumps to the right tile.
- [ ] **A3.9 Test-play.** Starts the draft in the game (with 01's undo); Escape returns to the editor with the draft and cursor unchanged. A completed test-play records the replay together with the draft's content hash. Verify: edit, test-play, return and complete all work in sequence.
- [ ] **A3.10 Keyboard ownership docs.** Update the keyboard section of `AGENTS.md` for the editor and test-play. Verify: a read-through matches the behaviour.

### Phase A4 — Share only what you solved

- [ ] **A4.1 Sharing needs a fresh solve.** Share and Export are enabled only when the last completed test-play's content hash equals the current draft's. Verify: any edit after solving disables both until solved again.
- [ ] **A4.2 Export for the campaign.** Save a solved draft as a format 2 chamber file and its test-play as its recorded solution, named by the next unused permanent id, ready for `src/chambers/`, `scripts/chamber_files.ts` and the catalogue (the "Chambers" rule in `AGENTS.md`). This replaces the solver report planned here, which README decision 10 dropped. Verify: an exported chamber, added to the campaign, passes `npm run verify`.
- [ ] **A4.3 Build and copy the link.** Encode the draft, the author's replay, the name and the author; copy with `navigator.clipboard.writeText`, falling back to a selected text field. Verify: the link opens in another browser profile, shows the verified badge and plays the same way.
- [ ] **A4.4 Links from another version.** The link carries its format version, raised by any format or rules change that would break old links. A link in a version this game doesn't read shows "made with a different version" (A2.2) instead of failing oddly. There is no upgrade chain: old links may stop opening (README decision 13). Verify: a fixture link with another version number shows the message.

### Phase A5 — Docs and release

- [ ] **A5.1 Docs.** `AGENTS.md`: layout (editor screen, link encoding), routes, keyboard ownership, storage keys. `docs/elements.md`: point to `docs/chamber_link.md`. Verify: a read-through.
- [ ] **A5.2 Release.** Try links across browsers locally with `npm run preview`, then `npm run deploy`. Verify: a link made locally opens on production.

## Local checks added

- Round trip of every bundled chamber through the link encoding (A1.2).
- Link-length budget for every bundled chamber, with and without its solution (A1.5).
- Validator fixtures: every bad chamber is rejected with its expected error, every bundled chamber passes; oversized and bomb payloads are rejected quickly (A1.3, A1.4).
- Every recorded solution replays to completion through the link path, and a link in another format version shows its message (A2.5, A4.4).
- With editor only (open decision 1), only the validator fixtures apply.

## Done when

- [ ] A chamber can be built from scratch in the editor, by keyboard alone, with every element type in the registry.
- [ ] Sharing and export are only possible after solving the current draft, and the link carries the solution.
- [ ] An exported chamber and its recorded solution, added to the campaign, pass `npm run verify`.
- [ ] A shared link opens in another browser after the loading screen, shows the verified badge, and plays the same way.
- [ ] Damaged, oversized and other-version links show a plain message and never freeze or crash the tab.
- [ ] The local checks above pass; `npm run verify` passes; AGENTS.md and the docs match the behaviour.
- [ ] Open decision 1 is decided and recorded; with editor only, the link items above are ticked "not applicable".

## Go/no-go points

Revised 2026-11-09: the Stage B gate and the moderation, cost and verifier cost points went with Stage B (README decision 13), and the stage 02 no-go point is settled (README decision 10: no par or shortcuts).

- **Link length:** if typical links exceed the 2,000-character budget even with the binary encoding, drop the replay from the link (open decision 2), or accept long links and note that some chat apps cut them.

## Risks

- **IP exposure:** a shared link opens the game, with Valve's name and logo (README decision 12), for whoever receives it, and friends may forward links. Send them only to friends, and keep the game a private fan game.
- **Format and rules drift:** a link a friend received before a format or rules change may stop opening after it. Accepted (README decision 13): the link carries its format version and shows "made with a different version" (A4.4).
- **Untrusted data:** a link is input from outside the game: one damaged in a chat app, or edited by hand, could hold a giant or malformed chamber that freezes the tab. Size caps before decoding and the chamber loader's checks (A1.3, A1.4).

## Notes for later stages

This is the last stage. Things it leaves for whatever comes next:

- The removed Stage B (accounts, publishing, browsing, ratings, moderation, creator stats, leaderboards with a server replay verifier) is in git history, in this file as it stood before 2026-11-09, should the game ever have an audience beyond a few friends.
