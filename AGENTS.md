## Project

Portal 2D — a desktop-only, keyboard-driven puzzle game: the player crosses grid-based test chambers using a pair of portals (Vite + Vue 3, TypeScript, Composition API with `<script setup>`, vue-router, ESLint + @stylistic + type-aware typescript-eslint via @vue/eslint-config-typescript). It is a static site on Firebase Hosting; there is no backend.

`TODO.md` holds the author's longer-term ideas (submitted chambers, ratings, a chamber database). They are not planned work; do not build any of it unless asked.

## Layout

```
src/
  main.ts, app.vue, router.ts     entry, desktop-only gate, routes (/, /settings, /chamber/:number)
  assets/styles.css               design tokens and shared classes (.wall, .room, .sign-card, .button-*, .keycap)
  assets/audio/                   music and sound effects, imported so Vite fingerprints them
  assets/images/                  the test-room photo behind the home and settings screens (WebP), the test-subject figure on chamber cards
  chambers/chamber_N.json         chamber layouts (format: docs/elements.md)
  components/screens/             home_screen, settings_screen, chamber_screen
  components/                     chamber card, settings switch (both sign cards), section heading, legend, dialogs (dialog_frame is the shared shell), logo, desktop-only notice
  composables/                    use_arrow_focus (left/right arrows move between cards)
  game/                           the game itself: rules, renderer, input, sounds, music. Plain TypeScript
  services/                       chamber catalogue, settings (sound/music), progress (completed chambers), device detection
docs/elements.md                  what each chamber element does
public/                           favicon only
```

## Rules

- **After completing code changes**: Run `npm run lint:fix` and fix remaining errors, run `npm run build` (type-checks first) and fix any failures, then run `/delta-review` before responding.
- **Game/Vue boundary**: `src/game/` is plain TypeScript and never imports Vue, vue-router, `src/components/`, `src/services/` or `src/chambers/` (enforced in `eslint.config.js`). Screens drive it, not the other way around: `chamber_screen.vue` creates a `Level` on its canvas, calls `load` (also used for reset), `resize`, `dispose`, toggles `paused`, and gets `onCompleted` back. Services may import from `src/game/` (settings flips `Sound.enabled` and switches between `menuMusic`, played on the home and settings screens, and `gameMusic`, played in a chamber). Game objects are never made reactive and per-frame data never passes through a `ref`.
- **Game behaviour is frozen**: The game was translated line by line from the original JavaScript, keeping its rules, update order, sounds and drawing exactly. Do not change rules, drawing, colours or sizes unless explicitly asked. Its colours are hex literals inside `src/game/`; leave them until the chamber visuals are reworked.
- **Keyboard ownership**: The game's `Input` owns the arrows, A, D, Space and Ctrl, and calls `preventDefault` on arrows and Space only while playing. Screens own Escape. On the home and settings screens, which have no game running, the left and right arrows move between the cards (`use_arrow_focus`). While any dialog is open the game is paused, its input is ignored, and the dialog's buttons get the keyboard (`dialog_frame.vue`: first action focused, arrow keys and Tab move between actions).
- **Desktop only**: Touch-first devices (`pointer: coarse`) get the desktop-only notice instead of the app. Do not add mobile layouts or touch controls.
- **Chambers**: A chamber is a JSON file in `src/chambers/` plus an entry (its number) in `src/services/chamber_catalogue.ts`. `ChamberData` (`src/game/chamber_data.ts`) must accept the JSON import without a cast, so the type checker validates every chamber file.
- **Persistence**: `localStorage` keys are prefixed `portal-2d.` and every access is wrapped in `try`/`catch` (storage can be blocked). Stored: sound on/off, music on/off, completed chambers.
- **Assets**: Import assets from `src/assets/` so Vite fingerprints them; nothing new goes in `public/`. Fonts come from Google Fonts via `<link>` in `index.html`.
- **No test suite**: This project has no tests by design. TypeScript and the type-aware lint rules are the safety net — do not weaken `strict` or `noUncheckedIndexedAccess`, and do not add `any` to silence an error.
- **TypeScript projects**: `tsconfig.json` only references `tsconfig.app.json` (browser, `src/`, extends `@vue/tsconfig/tsconfig.dom.json`) and `tsconfig.node.json` (`vite.config.ts`, extends `@tsconfig/node24`). An option the two bases don't already cover must be set in both.
- **Deploy**: `npm run deploy` builds into `dist/` (git-ignored) and runs `firebase deploy --only hosting` (project `portal-2d`). `firebase.json` rewrites every path to `/index.html` for history-mode routing.
- **Doc maintenance**: After changes, check whether `AGENTS.md` and `docs/elements.md` need updating.

## TypeScript

- No semicolons. Single quotes. One class per file. Named exports.
- Files `snake_case`; classes, interfaces and type aliases `PascalCase`; functions and variables `camelCase`.
- Full descriptive names — no `el`, `p`, `btn`. Allowed short names: `i`, `j` (loop counters), `x`, `y` (coordinates), `dx`, `dy` (deltas), `ctx` (canvas context).
- Always import with the `@` alias (mapped to `src/`). No relative paths, no file extensions. `import type` for type-only imports.
- No object shorthand: write `{level: level}`, not `{level}` (enforced). Objects and arrays with two or more items go one per line (enforced).
- No TypeScript `enum`: use string-literal unions, with a const object when named values help.
- Indexing a `Record` or array yields `T | undefined`: handle the miss rather than asserting it away with `!`.
- Prefer getters over methods for parameterless functions that only read state.
- Unused parameters: `_`, `__`, `___`.
- Comments: a JSDoc block on every class and function (no types — TypeScript declares them), an end-of-line comment on each field's first declaration, plain comments above non-obvious logic.

## UI

- Always use the `frontend-design` skill when changing the UI.
- Direction: test-facility signage. Cool light panels on a seamed wall (the home and settings screens sit on a photo of a test room instead, via `.room` and `.room-inner`, which keep their content on the room's back wall, clear of the side walls and floor; both share `.room-header`, so the sign title and the navigation button sit in the same place on each), sign cards with cut corners whose frame glows blue when hovered or focused (name on the left; on the right, a settings card shows a divider and its icon, and a chamber card shows the test-subject figure, grey until the chamber is completed and green after), thin rules, chamber numbers as large sign numerals, and the game's own colours as the only accents: blue marks interaction and success (the chamber-complete dialog), orange marks caution (actions that discard progress), and the test subject's green marks a completed chamber on its card. Keep these meanings consistent.
- Tokens live on `:root` in `src/assets/styles.css` (`--color-wall`, `--color-panel`, `--color-rule`, `--color-ink`, `--color-ink-muted`, `--color-blue`, `--color-blue-deep`, `--color-orange`, `--color-subject`, `--color-chamber`, plus `-rgb` triplets for alpha). Use tokens, not new colours.
- Type: `Barlow Condensed` for display (wordmark, sign numerals, titles), `Barlow` for everything else.
- CSS colours are always `rgba()`, never hex (the game's canvas colours are the exception, see above). `border-radius` in `rem` (exception: `50%` for circles).
- Repeated CSS goes to `src/assets/styles.css`; component-specific styles stay in scoped `<style>` blocks.
- Accessibility floor: visible keyboard focus, keyboard-operable dialogs and switches, and `prefers-reduced-motion` respected (global rule in `styles.css`).
- Copy is sentence case, plain verbs; a button says what it does ("Reset chamber", not "OK"). Signage labels may be shown in capitals with `text-transform`; the text itself stays sentence case.
- CSS comments: `/* ==== */` block dividers for major sections, a short phrase above a rule for its purpose.
