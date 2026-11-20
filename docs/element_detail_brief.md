# Element detail brief

A handoff. The session that wrote this is gone; you know only what is written here, what `AGENTS.md` says, and what you read in the repository. Read this whole file before you touch anything, then read the files it points to. It is long (about 1,200 lines, many of them wide tables): if your reader cuts it off, read it in parts. Parts 1 to 5 are the brief; the two appendices are reference.

**The job in one paragraph.** The floor and the walls of every chamber now carry a faint, code-drawn *surface detail* (tone and wear), so they no longer look like one tile stamped everywhere. The author liked the result and wants the same for ten element sprites: `arrow`, `turntable_arrow`, `turntable`, `box_mirror`, `box`, `button_pressed`, `button_up`, `ditch_bridged`, `ditch`, `switch`. As before, the first deliverable is an **interactive Artifact page** (a "mixer") that shows *alternatives and settings for each element* over the game's real drawing, so the author can choose. After the choice comes the read-back, a plan, the author's approval, the implementation in the game, verification and a review. Part 2 tells exactly how that went for the floor and walls; Part 3 says how to do it for the elements; Part 4 is the tooling you inherit; Part 5 is a checklist; the two appendices are the facts about the ten sprites, gathered for you.

**The author asked for this brief to be "unreasonably ambitious".** Take that as the bar for your own work too: the mixer for the elements should be better than the first one, not a copy of it. Section 3.6 lists what "better" means.

## Contents

1. [Ground rules](#1-ground-rules)
2. [What was done for the floor and the walls](#2-what-was-done-for-the-floor-and-the-walls)
3. [The new job: the elements](#3-the-new-job-the-elements)
4. [The tooling you inherit](#4-the-tooling-you-inherit)
5. [Checklist](#5-checklist)
6. [Appendix 1. How the ten sprites are drawn today](#appendix-1-how-the-ten-sprites-are-drawn-today)
7. [Appendix 2. The sprites' shapes, what each chamber holds, and running the game outside the app](#appendix-2-the-sprites-shapes-what-each-chamber-holds-and-running-the-game-outside-the-app)

---

## 1. Ground rules

### 1.1 Decisions the author has already made

Asked before this brief was written, and answered:

| # | Question | Answer |
|---|----------|--------|
| 1 | Where does this document live? | Here, `docs/element_detail_brief.md`, listed in `AGENTS.md`, kept until the element work ships (then delete it and its `AGENTS.md` line, or ask) |
| 2 | May the mock-up's working files live in the repo? | Yes: `tools/detail_mixer/`, which the linter is told to leave alone (`eslint.config.js`, `ignores`) |
| 3 | How far does the next session go? | The whole path, as for the floor and walls: mixer, the author's choice, read-back, plan, approval, build into the game, verify, review; stopping for the author at the same points |
| 4 | Is new sprite art on the table? | **Code drawn over the existing sprites only**, as for the floor and walls. A drawn variant (new art) may be shown as an *extra* alternative only where code can't do the job well, clearly marked as needing new sprite files |

Two assumptions the author was told about and did not object to:

- "The same idea" means **each instance looks a little different** (no two boxes alike) **and keeps its look wherever it moves**, while every meaning stays intact: the button's red, the switch's yellow, pressed against released, an arrow's direction, a mirror's diagonal.
- The element mixer is a **new Artifact**. Do not change the floor-and-walls mixer (`https://claude.ai/artifact/GFvKVnqfeJigRJxMSF9hBt`); it is the record of that choice.

Out of scope unless the author says otherwise: every other sprite (doors, the exit, blocked walls, fizzlers, lasers, light barriers, emitters, receivers, portals, the subject, the slide floor), the rules, the sounds, the menus.

### 1.2 How the author works

The author's own instructions (`~/.claude/CLAUDE.md`) load by themselves and outrank this brief. What follows is how they played out, so you are not surprised:

- **Explore, plan, implement, verify.** For a non-trivial change you say in one line how you read the request and what you will *not* do, explore, then write a short plan as a table (step, files, how each step is verified) and **stop until the author approves it**. "approved" is all you will get.
- **A question gets an answer and nothing else.** When the author asks "what do you think?", "explain point 5", "any questions?", you answer in a few sentences and change nothing. "Review", "explain", "analyze" are read-only.
- **Reports are terse and shaped**: one opening line (`Done:`, `Plan:`, `Blocked:` ...), then only the points that need the author, each under 150 characters and tagged ⚠️ (needs a decision), 🔍 (not fully verified), 🚨 (a defect you left), ✋ (you disagree). Plain words, no function names. Every ⚠️ says what you recommend.
- **Follow the approved plan.** If you need a file the plan did not list, say so first. In the first round two tiny helpers were duplicated rather than touch two unlisted files, the duplication was reported, and the author then said "fix them". That is the pattern: flag it, let the author decide.
- **Never commit, branch or push.** The author commits by hand, often, with the message "Improvements", *while you work*. Expect `git log` to move under you and files you read an hour ago to have changed. Re-read before you patch, and check `git status` before you report: files you did not change may show as modified (leave them alone).
- **Subagents are preferred** for fact-finding and are required for the review (`delta-review` skill, once per turn that changes code, on the files changed that turn). They cost real time (10 to 15 minutes each on a large change set) and can be cut off by the usage limit; a cut-off agent keeps its work and resumes when sent a message.
- **The author answers with pictures.** Asked to choose, they sent four screenshots of the mixer's control rail, not the copied settings text. Read the values off the screenshots, **read them back as a table**, and say what the screenshots don't show (the placement seed was not visible).
- **Honesty about evidence.** Say what you tested and how, what you did not, and where a number came from ("timed in headless Chrome without a GPU, so rough").

### 1.3 What the author's choices so far say about their taste

Read this before you design alternatives. It is inference from one round, so offer the opposite too, but weight your defaults this way.

- **They like the sprites as they are.** The complaint was never the art; it was that a chamber built from them looked dull and stamped ("all the floor tiles look the same... the empty spaces feel too boring").
- **Tone over marks.** In the mixer they pushed the soft patches to the maximum, kept tile shade and room light at the middle, and even switched on the grime that the first session recommended against.
- **Marks as fine texture, not as events.** They chose marks on **30 % of tiles, the most the slider allowed, at strengths of 5 to 15 out of 100**: barely visible, everywhere. The first session had recommended the reverse (about one tile in ten, bolder). Offer both, default to theirs.
- **No blobs, no smears.** Stains and scuffs were switched off on the floor and the walls. Scratches, cracks and chipped corners stayed.
- **No decoration, no added structure.** They asked for the three "designed" layers to be removed from the mixer outright: vents and lights on walls, striped edging round pits, and seams between wall tiles. Do not propose stickers, stripes, lights, labels or new shapes. The idea is *wear and variation of what is already there*.
- **Independent control of everything.** Their first change request was to control each kind of wear on its own (its own strength, its own share of tiles), separately for the floor and for the walls. Build the element mixer that way from the start: per element, per kind of wear, per strength, per share.
- **They decide by looking at the real thing.** Every judgment was made on the real chamber drawn at its real size. A mock-up that approximates the game's drawing would have been useless.

---

## 2. What was done for the floor and the walls

### 2.1 The diagnosis

At about 45 px a tile (Chamber 1 on the author's screen), the floor sprite's own fine texture is invisible; every tile is a flat near-white square with a grid line, and the walls are one flat grey mass. Three things were advised, and the mixer was built to show them:

1. **Vary at three scales, not one**: a faint shade shift per tile; soft patches larger than a tile; marks on only some tiles.
2. **Fine wear alone cannot fix it**: a 256 px sprite shrunk to 45 px loses anything under about 6 px of source. Only tone, and bold low-contrast shapes, survive.
3. **The floor must stay a calm ground for a puzzle**: everything grey and low in contrast, picked from the tile's position so it never flickers, off the walls' bevels where portals open, and nothing that could pass for a rivet (blocked walls have them), an arrow or an antline.

### 2.2 The mixer (the first Artifact)

`https://claude.ai/artifact/GFvKVnqfeJigRJxMSF9hBt`, "Chamber Detail Mixer". Its source is `tools/detail_mixer/floor_walls/` and it still builds and runs (section 4). What made it work:

- **It draws with the game's real renderer.** The game's drawing code, chambers and sprites are bundled into one script (`engine.js`), and the page asks it to draw a chamber at a tile size. The mock-up's layers are drawn through small *hooks* patched into copies of the game's files, at the exact place in the drawing order where the real feature would go. So "Original" in the mixer is pixel for pixel the game, and the layers sit under the antlines, under the walls' shadow, exactly as they later did in the game.
- **A split view**: the original on the left of a draggable divider, the chamber with detail on the right; or either alone.
- **One row per layer**: a lamp to switch it on, a one-line description, a strength slider (0 to 100), and for wear a "tiles marked" slider. Moving a slider switches its layer on.
- **Presets** ("Original", "My pick", "Subtle", "Wear only", "Worn"), with the recommendation and its three reasons stated at the top of the page.
- **"Each one on its own"**: the same corner of the chamber drawn once per layer with only that layer on; clicking one toggles it in the mix. Wear layers are shown there on a third of the tiles whatever the slider says, because at 2 % a small corner is usually empty.
- **Chamber and tile size pickers**: every chamber and the playground, at "as in the game" or 32, 45, 64, 96, 128 px, always one canvas pixel per screen pixel (never CSS-scaled, which would blur exactly what is being judged). **Its "as in the game" was a shortcut, and wrong for wide chambers**: it used `floor(900 × pixel ratio / max(16, width, height))`, but the game sizes a tile as `min(trunc(stage width / max(16, width)), trunc(stage height / max(16, height)))`, with the stage about 1486 × 1014 px in a 1920 × 1080 window. For Chamber 1 that is 50 px (45 px on the author's screen, whose page area is 1920 × 966); for the two chambers that are 23 tiles wide the shortcut said 39 px where the game draws about 60. Use the game's formula in the new mixer, and print the size it gives.
- **"Shuffle"**: another placement seed, to show the look is not cherry-picked.
- **"Your combination"**: the settings as text plus one JSON line, with a copy button, to paste back. (The author sent screenshots instead. Keep the box anyway, and make the rail legible in a screenshot: every value printed as a number.)
- **Look**: the game's own signage (its colour tokens, Oxanium and Chakra Petch from Google Fonts), light and dark themes, usable at phone width. The Artifact tool's page rules apply (section 4.5).

**How it was tuned before the author saw it.** Each kind of mark was first drawn dozens of times on a flat sheet at 110 px and 45 px (`floor_walls/sheet_marks.html`) and fixed there; then each layer alone on a crop of a real chamber (`floor_walls/sheet_layers.html`); then the presets on the whole chamber. The first pass was far too dark (three darkening layers stacked: the floor fell from about 240 to 200), stains looked like outlined amoebas, scuffs and scratches like pen strokes. All were softened until each read as wear at both sizes. **Budget the brightness**: the floor is (239, 241, 248); the whole stack should leave its average above about 228.

**The two rounds with the author.**

| # | Version | What it offered | What the author said |
|---|---------|-----------------|----------------------|
| 1 | v1 | 11 layers. Floor: tile shade, large patches, room light, wear marks (one density, checkboxes for kinds), grime at walls. Walls: panel shade, large patches, panel seams, wear marks. Designed details: vents and lights, pit edging | "for the wear marks, i want to control them individually (strength and tiles marked for each kind) for both the floor and the walls"; remove vents and lights, pit edging, panel seams |
| 2 | v2 | 14 layers. Floor tone ×4; floor wear ×5 (scuffs, scratches, stains, cracks, chipped corners), each with its own lamp, strength and tiles marked (0 to 30 %); wall tone ×2; wall wear ×3 (scuffs, scratches, stains) | Chose a configuration (below), by screenshots |

### 2.3 The configuration the author chose

| # | Area | Layer | Strength (0 to 100) | Tiles marked |
|---|------|-------|---------------------|--------------|
| 1 | Floor | Tile shade | 50 | – |
| 2 | Floor | Large patches | 100 | – |
| 3 | Floor | Room light | 50 | – |
| 4 | Floor | Grime at walls | 50 | – |
| 5 | Floor wear | Scratches | 15 | 30 % |
| 6 | Floor wear | Cracks | 5 | 30 % |
| 7 | Floor wear | Chipped corners | 15 | 30 % |
| 8 | Walls | Panel shade | 20 | – |
| 9 | Walls | Large patches | 30 | – |
| 10 | Wall wear | Scratches | 10 | 30 % |

Off: scuffs and stains, on both. The placement seed was not chosen: in the game each chamber's placement comes from its own size and walls.

**From sliders to constants.** Each slider mapped linearly to an opacity; the game holds only the resulting constants (`src/game/surface_tone.ts`, `src/game/wear_marks.ts`), and `docs/sprites.md` ("Surface detail") lists them. So that you can read the mixer's code and the game's side by side:

| # | Layer | Mixer formula (amount = slider / 100) | At the chosen value |
|---|-------|----------------------------------------|---------------------|
| 1 | Tile shade | darkest ordinary tile = amount × 0.13 | 0.065 |
| 2 | Large patches | darkest = amount × 0.14 | 0.14 |
| 3 | Room light | at a wall's foot = amount × 0.22; the open floor's lift = 2.2 × that | 0.11; 0.242 |
| 4 | Grime | thickest = amount × 0.3 | 0.15 |
| 5 | Any wear mark | strength = amount × 1.6, multiplying each stroke's own opacity (scratch 0.24 and its edge 0.55; crack 0.6 and its edge 0.55; chip 0.6 and its edge 0.4; wall scratch 0.3 and its edge 0.2) | floor scratch 0.058 / 0.132; crack 0.048 / 0.044; chip 0.144 / 0.096; wall scratch 0.048 / 0.032 |
| 6 | Wall plates | most = amount × 0.2 (a lighter plate 0.8 of that) | 0.04 |
| 7 | Wall patches | most = amount × 0.16 (lighter 0.75 of that) | 0.048 |

Give the element mixer's sliders the same kind of simple, documented mapping; it makes the read-back and the implementation mechanical.

### 2.4 The path from choice to game

1. **Read-back.** The values in a table, what was off, what the screenshots did not show.
2. **"plan to implement it"**: explored the drawing code (and sent one agent to sweep everything else such a change touches: the lint lists, every doc that describes the backdrop or the palette, the home menu's map sizes, the bundle check's limits, where drawing time is measured, whether a chamber has a stable number to seed from). Timed the mock-up's drawing first: as the mock-up drew it, a chamber's backdrop took about 160 ms longer to build, which decided the design (below).
3. **The plan**, as a table of eight steps with files and how each is verified, plus six attention points (approval; the placement will differ from the mock-up's; the cost and how it would be cut; the home menu's map gets the detail too; the extra memory; where the timings came from). The author answered "approved".
4. **Implementation**, in the plan's order, `npm run lint:fix` and `npm run build` after each code step.
5. **Verification** in Chrome (the author's browser, through the extension): Chamber 1 beside the mock-up's rendering of the chosen settings, crop by crop; the tutorial's recorded solution replayed step by step to watch antlines light; the sprite gallery; the home menu's map; the playground. Then timings in that real Chrome, then `npm run verify`.
6. **Review**: the `delta-review` skill, two independent agents (new defects; regressions). No confirmed defect; two suspicions reported to the author as decisions, not fixed.
7. **Report**, then the author's follow-ups ("explain point 5", "fix them").

### 2.5 What was built

Read these files; they are the pattern to follow and the code to extend.

| # | File | What it holds |
|---|------|---------------|
| 1 | `src/game/surface_noise.ts` | Where detail lands: `chamberSeed` (a number from the chamber's size and walls), `tileNumber` (0 to 1 for a tile and a salt, on top of the existing `pieceNumber`), `tileNumbers` (a run of numbers that one mark is shaped from), `cloudNoise` (three-layer smooth noise over an area, its grids worked out once), `smoothStep`, `clampShare` |
| 2 | `src/game/surface_tone.ts` | The tones: per-tile floor shade; one soft layer for patches, room light and grime, painted at 8 samples a tile and stretched once; wall patches (shown only on the walls); per-plate wall shade; `wallTopParts` (the flat top of a wall tile inside its bevels, as rectangles); the kept soft layers |
| 3 | `src/game/wear_marks.ts` | The marks: scratches, cracks, chipped corners on the floor; scratches on the walls; `TAKES_WEAR`, a table typed over every element type that says whether marks may land on a tile holding it (so the type checker makes every new element answer) |
| 4 | `src/game/renderer.ts` | The floor's detail is drawn after the slide floors and under the antlines; the walls' on their own layer before their shadow is made; a chamber with antlines keeps its finished floor on a canvas of its own, so a lit antline only copies it |
| 5 | `src/game/palette.ts` | Twelve colours for the detail, at full opacity (how faint each is drawn is a named constant beside the drawing), and `withAlpha` |
| 6 | `eslint.config.js` | The three new drawing files added to the two lists that keep drawing code out of the rules and the solver |
| 7 | `docs/sprites.md` ("Surface detail"), `AGENTS.md`, `docs/game_summary.md`, `docs/elements.md` ("Adding an element"), `docs/performance.md` ("Surface detail check") | The spec, the notes, the timings |

**The design decisions, and why.** Each of these is a question you will meet again for the elements.

- **Drawn into the backdrop, not every frame.** The backdrop (floor, slide floors, antlines, floor marks, walls with their shadow) is drawn once per chamber and tile size and copied each frame, so detail there costs nothing per frame. *The elements on your list are mostly not in the backdrop* (section 3.3); that is the main new problem.
- **Code, not sprite files.** Like the antlines and the rays. Colours go in the palette; strengths are constants beside the drawing; `docs/sprites.md` is the spec.
- **Deterministic, with no stored state.** Everything comes from `chamberSeed`, a tile's place and a salt per use (salts are spaced so no two uses share numbers). Same chamber, same look, at any tile size, in the menu's map and in the chamber. Nothing in the chamber files, nothing in the rules' state, so recorded solutions and their hashes are untouched.
- **Never change a shape.** Wall detail is drawn with `source-atop` or inside the flat tops, so the walls' silhouette, and therefore their shadow, is unchanged.
- **Keep meaning-bearing places clean.** Marks keep off the bevels (portals open there), off blocked walls (their steel and rivets are their meaning), and off tiles whose element they would confuse or never show under.
- **The cost had to be designed down.** Almost all of it was the soft layers. Three fixes: paint the three floor layers as *one* and stretch it once, with the plainest smoothing (`imageSmoothingQuality = 'low'`: one stretch fell from about 30 ms to 5 ms on a CPU canvas, with no banding at these strengths); work the noise's grids out once instead of at every sample (42 ms to 26 ms); and *keep* each chamber's soft layers (they depend on its walls, not on the tile size), so the menu's map and the chamber share them. Result: about 25 ms the first time a large chamber is drawn in a visit, 6 to 9 ms after, and 1 to 3 ms for a frame where an antline lights. `docs/performance.md` has the tables.
- **The home menu's map is the same renderer.** It redraws on every move of the highlight. Anything you add to drawing is paid there too; that is what forced the kept layers.

**Left as they are, with the author's knowledge** (both reported, neither objected to):

- A floor scratch may trail up to a third of a tile onto a neighbouring tile that itself takes no marks.
- A blocked wall that a link reaches has its steel painted over the wall each frame while blocked, without the wall patches, so it can sit up to about 5 % off its neighbours in tone.

### 2.6 Things that went wrong, so they don't again

- **The repo moved mid-task.** A patch written against a file read at the start failed because the author had committed changes to it since. Every scripted edit asserted that its target text matched exactly once, so it failed loudly instead of corrupting the file. Keep that habit, and re-read before patching.
- **Stale agents.** Two fact-finding agents were killed by the usage limit, resumed, stopped again when the author said "stop", and resumed again. Their output arrives as a message; never write as if it had arrived before it has.
- **A screenshot before the sprites were decoded.** Headless Chrome's virtual clock races ahead of off-thread image decoding. `harness/serve.py` and `harness/shot.sh` fix it (section 4.4).
- **Timing on a virtual clock reads 0 ms.** Same cause; same fix.
- **`pkill -f "vite --port 5199"` killed its own shell**, because the pattern matched the command line running it. Write `pkill -f "[v]ite --port 5199"`.
- **Opening `/chamber/1` to test bumped the author's saved attempt count** for that chamber in that browser (port 5199 holds real progress). Test on `/playground`, which keeps no progress, or drive the renderer from the page's console (section 4.6).
- **The browser window would not resize** through the extension (it stayed 1920 × 966), so a live resize was never exercised; other tile sizes were covered by the gallery and by drawing at several sizes from the console. Say so in the report when it happens.
- **Too many agents for a small change.** A three-file refactor still cost two review agents; that is the rule, but keep change sets small and well described so they finish in two minutes, not fifteen.

---

## 3. The new job: the elements

Facts in this part come from reading the game's code at commit `2497e1f` (Appendix 1 has every one with its file and line; the code moves, so re-check a line before you lean on it). Ideas are marked as ideas: they are a menu for the mixer, not decisions. The author decides by looking.

### 3.1 Ten sprites, seven things

| # | Thing | Sprites | States that change what is drawn | Drawn | Casts the shared shadow | What names one instance |
|---|-------|---------|----------------------------------|-------|-------------------------|-------------------------|
| 1 | Floor arrow | `arrow` | None (turned to its way, fixed) | **Once, in the backdrop**, over the floor's detail and the antlines, under the walls | No | Its index in the chamber's `arrows` list; its tile |
| 2 | Turnable arrow | `turntable` (disc, never turned), `turntable_arrow` (chevron) | The chevron's way; rotates over 0.3 s when a link turns it | Every frame, right over the backdrop | No | The same `arrows` index; its tile |
| 3 | Box | `box` | Resting, carried (then not drawn: the subject's sprite shows a painted box), breaking up, falling | Every frame | Yes | **Its index in the `boxes` list. Not its tile: it moves** |
| 4 | Mirror box | `box_mirror` | As a box; turned a quarter turn for a `\` mirror | Every frame | Yes | Its `boxes` index |
| 5 | Button | `button_up`, `button_pressed` | Pressed or not, swapped at once | Every frame | No | Its index in `buttons`; its tile |
| 6 | Switch | `switch` | None | Every frame | Yes | Its index in `switches`; its tile |
| 7 | Ditch | `ditch` (a strip of five tiles, joined quarter by quarter), `ditch_bridged` (the grate) | Open (the pit, joined to open neighbours) or bridged (the grate); the grate slides over 0.3 s | Every frame | No | Its index in `ditches`; its tile |

"Every frame" means every frame the game draws at all (it draws only when something changed or moves), and each such element is in fact drawn **twice** per frame: once in a pass that lays down shadows, once for the sprites.

### 3.2 What is different from the floor and the walls

The floor and walls were the easy case: static, in the backdrop, shapeless, meaningless. Each line below is a way the elements are not.

1. **Not in the backdrop.** Only the plain arrow is. Everything else is drawn every frame from a cached image. Detail must not add per-frame work worth noticing (the whole frame takes 0.5 to 1 ms today, `docs/performance.md`): it has to be **baked once into an image and drawn as cheaply as the sprite is now**.
2. **One image per sprite.** The sprite cache holds exactly one shrunk image, and one shadow, per sprite name and tile size, and every drawing call passes only a name. "Each instance its own look" means that cache, or something beside it, learns about instances. This is the main piece of engineering.
3. **They move, turn, slide, break and fall.** A box is drawn by five different paths (resting; carried, inside the subject's painted sprite; in pieces from the hands at 0.7 size; in pieces where it lay; shrinking into a pit). A chevron is drawn at quarter turns, and at any angle while it turns. A grate is drawn in place, and slid. **Every path must show the same look**, or the wear will flicker off at the very moments the player is watching.
4. **They carry meaning.** The button's red means "caution", the switch's yellow tells it from a button, pressed is brighter than released, the chevron says which way, the mirror's diagonal says which way a ray turns, a pit must read as a hole and a grate as walkable. `docs/sprites.md` asks that every sprite read at 40 px and that on and off differ at a glance.
5. **They are small.** At 45 px a tile a box is about 26 px across and its centre disc 10 px, a button's dome 24 px and the white ring round it 5 px, a chevron's stroke under 6 px, a grate's bar under 2 px, the mirror's glint half a pixel (Appendix 2, A.10). A scratch is a pixel wide or it is nothing.
6. **Their shape makes their shadow.** A raised sprite's shadow is the blurred outline of its image. Wear must never change that outline: draw it only where the sprite already has pixels.
7. **A carried box is a painting.** The subject's `subject_holding_box` sprite has a plain box painted into its hands, 0.26 of a tile ahead of the tile's middle, 0.7 of a tile across, and it turns with the subject. A resting plain box is always drawn facing up. So a box's wear cannot simply ride on the sprite: put down after a quarter turn, it would jump.
8. **A destroyed box is the same box.** The rules never remove a box: destroyed means moved back to its start, with the same index, and the state keeps no count of it. Nothing in a state says "this box was destroyed twice".
9. **Their tiles are the cleanest spots in the chamber.** The floor's wear marks are deliberately kept off any tile holding an arrow, a button, a switch or a ditch (the `TAKES_WEAR` table). The floor's *tone* (shade, patches, room light, grime) does cover those tiles, but the sprites on top are untouched by it, so a button beside a wall sits bright on a darkened floor.

### 3.3 The menu: what to offer for each element

Ideas, for the mixer to show and the author to judge. Build each as its own layer with its own strength and its own share of instances. Weight the defaults by section 1.3 (faint and everywhere; no blobs; nothing added). Appendix 2 gives each sprite's exact parts and sizes.

**For every element**

| # | Layer | The idea |
|---|-------|----------|
| 1 | Tone of its own | Each instance a little lighter or darker than the next, and a little warmer or cooler: the per-tile floor shade, applied to things. The cheapest layer, and by the first round's evidence the one the author values most |
| 2 | Room light | Each instance takes a share of the floor's light at its tile: darker near a wall, lifted in the open, so things sit *in* the room instead of on it. For a box this changes as it is moved, which is either right (it is light) or wrong (it should keep its look): show both |
| 3 | Scratches | The floor's scrape, sized to the part it sits on, clipped to the sprite |
| 4 | Worn edges | Along the edges of plates, blocks and frames: a thin lighter line where a coating has worn through, or a thin darker one where dirt gathers |
| 5 | Chips and dents | Small nicks **inside** the outline, never out of it |
| 6 | Dust | A faint dulling film, and fine specks in recesses |

**Per element**

| # | Element | Surfaces that can take wear | Keep clean | Ideas of its own | Watch out for |
|---|---------|-----------------------------|------------|------------------|---------------|
| 1 | Box | The four corner blocks, the four tabs, the dark core, the centre disc | Nothing carries meaning, but a box must still read as *the* box at 26 px | Corner blocks knocked and scuffed; the disc rubbed; each box's wear as its fingerprint | Carried, in pieces, falling (below). A box on a button hides the button's dome |
| 2 | Mirror box | The body, as a box | **The mirror**: its diagonal, its lit glass and the white glint along it are what say which way a ray turns | A nick in the frame's ends; at most a faint smudge at the glass's ends | The sprite is turned a quarter turn for `\`. No chamber holds one today: the playground has one (`\`), and nothing drawable has a `/` |
| 3 | Button | The white plate round the dome, the four dark corner clamps | **The dome's red** and the gap in brightness between released (150, 40, 34) and pressed (220, 60, 50) | A worn ring round the dome; scuffs on the plate where boxes are set down; the dome a touch duller or glossier in its own red | **The same wear on both sprites**: one look per button, laid over whichever sprite is drawn, or pressing would shuffle its marks |
| 4 | Switch | As the button: it is its twin, with a yellow dome, and raised | **The dome's yellow** (240, 192, 40), the only thing that tells it from a button, and already close to a lit antline's amber (250, 194, 44): do not push it warmer | A polished patch where a hand lands | Raised: it has a shadow, so the outline rule applies |
| 5 | Floor arrow | The chevron itself, a 32 px wide painted stroke in (150, 153, 160) | **Its direction**, and its reading as one clean chevron | **Worn paint**: the stroke thinned, flaked and patchy, so the floor and its detail show through. It is paint on a floor, and the floor is now worn | It is in the backdrop, so this can be drawn like the floor's wear, once. Whether the floor's own scratches may now cross an arrow's tile is a choice to show |
| 6 | Turnable arrow | The disc (a shade lighter than the floor, with a lit lip inside a dark cut ring); the chevron, as the arrow's | The disc "shows that the arrow turns but not which way": **nothing on the disc may point** | **Rings**: fine concentric scuffs on the disc, as a turning plate wears; dirt lying in the cut ring; worn paint on the chevron | The chevron's wear must turn with it, at quarter turns and at every angle between while it turns. The disc's must not turn |
| 7 | Ditch, open | The lit rim; the inner sides (an 82 px band fading to near black); the bottom | It must read as a hole you cannot cross, and its sides must still join across tiles | Streaks down the sides; a chipped or scuffed rim; a little debris at the bottom | It is a strip joined quarter by quarter: which sides a tile shows depends on which neighbours are open *now*. Wear on a side that has just joined its neighbour must go with it |
| 8 | Ditch, bridged | The steel plate, its frame, its six-by-six grating of slots | It must read as walkable, and as a grate | Scuffs across the plate; a dented corner; a few slots silted up | It slides in and out. The same grate must slide |

**Choices that are not strengths**, to show as switches with their consequences:

- **A carried box**: (a) plain while carried, as now, so its wear vanishes in the hands; (b) its wear laid over the painted box, held still in the room as the carried mirror's mark already is, so it never jumps when put down.
- **A destroyed box**: (a) comes back the same, as now; (b) comes back with a new look, as a fresh box from the dispenser. (b) needs something to count destructions outside the rules' state.
- **Floor wear under elements**: (a) kept off their tiles, as now; (b) allowed, so a scratch can run under a button or across an arrow.
- **How alike**: every instance its own look, or a small pool of looks shared out.

### 3.4 How it could be built into the game

For the plan stage, after the author has chosen. The mixer's `skin` hook (4.3) is a small-scale rehearsal of the first option. Decide by measuring.

| # | Approach | How | For | Against |
|---|----------|-----|-----|---------|
| 1 | **A skin per instance** | The cache keeps, beside each shrunk sprite, one image per instance: the sprite with its wear drawn on, only where the sprite has pixels. Drawing calls pass the instance | One `drawImage` per instance per frame, as now. Exactly "no two alike" | Every drawing path must pass the instance (rest, pieces, fall, slide, turn). Memory and build time grow with the chamber: Chamber 3 has 63 instances (39 ditch tiles, 17 arrows, 4 buttons, 2 boxes and a switch) |
| 2 | **A pool of skins** | Six or eight skins per sprite, shared out by the instance's number, without repeats while they last | Bounded cost and memory whatever the chamber | Two things can look alike in a big chamber |
| 3 | **A wear layer over the sprite** | Keep the sprite as it is; keep each instance's wear on a see-through image of its own, masked to the sprite's shape, and draw it right after the sprite | One wear image serves a button's two sprites, a box at rest and in the hands, a chevron at any angle | A second `drawImage` per instance per frame; it must skip the shadow pass |

A mix is likely right: the plain arrows' worn paint straight into the backdrop, as the floor's wear is (no image per arrow at all); skins or wear layers for what moves; a per-tile wear layer over the pit, since a strip has no one image.

Things the plan must settle, each learned the hard way the first time:

- **Where a look comes from.** `chamberSeed(chamber)`, a salt per kind of thing, and the instance's **index** (never a box's tile). Salts in use today: 10 to 55 for the tones, 1000 to 4000 and the runs after them for the wear. Start the elements' well clear, and space them.
- **Every path that draws the sprite.** Appendix 1 lists them per sprite. The ones easy to miss: a box in pieces from the hands is cut from the sprite at **0.7 of the tile size**, a second size of the same look; a falling box shrinks from its sprite; the chevron turns through `drawSpriteRotated`; the grate slides inside `drawTileSlid`.
- **The shadow pass.** Each element is drawn twice a frame. Wear belongs to the sprite pass only.
- **The cache's eviction.** Shrunk sprites are kept for the 8 most recent tile sizes; browsing the home menu cycles sizes, one per chamber. Looks must be evicted with their size, or they leak.
- **The home menu's map and the sprite gallery** draw with the same code, at tiles down to 23 px. The map is redrawn on every move of the highlight; the first round had to cut its cost from 31 ms back to 14 ms.
- **A typed table again.** `TAKES_WEAR` made the compiler ask every new element type for its answer. Do the same for "does this type's sprite take wear".
- **The lint lists.** New drawing files go in both import ban lists in `eslint.config.js` (rules, solver), and in the sentence in `AGENTS.md` that repeats them.
- **Docs.** `docs/sprites.md` is the spec: a section like "Surface detail", the changed rows of "The set", the palette's new colours. `AGENTS.md`'s `game/` entry and its palette rule. `docs/game_summary.md`'s "How each tile looks". `docs/elements.md`'s "Adding an element". `docs/performance.md`.
- **No rule changes.** Nothing in `src/game/rules/`, no new state, no change to a chamber file: the recorded solutions and their hashes must replay untouched (`npm run replay:check`).
- **Budget.** Per-frame time unchanged within noise. The first frame of a large chamber: the first round added about 25 ms once per visit; aim to add no more than that again, and measure in real Chrome.

### 3.5 What the mixer must be able to show

The first mixer showed one still picture per chamber. That is not enough here, because the questions are about instances and states.

1. **A line-up.** A dozen of the same thing side by side, on the real floor, at 45 px and at about 110 px. The author's first question will be "do any two look the same?" and the second "can I still tell what it is?". The engine draws only the game's chambers today; add small *specimen boards* to `engine/entry.ts` for this, the way `src/dev/gallery_layouts.ts` builds the sprite gallery's (a row of twelve boxes; buttons, half of them held down by a box; switches; arrows each way; turnable arrows; mirror boxes both ways; a run of pit and a run of grate). That file also shows how to load a board without the layout checks when a board breaks them.
2. **The real chambers**, with the split view, at the game's size. Appendix 2 says which chamber holds what; the playground is the only one with all seven things.
3. **States, by scrubbing.** A slider over the recorded solution (`options.step`), with jump buttons to the moments that matter, found by scanning `instances(index, step)`: the first step a box is carried, a button is pressed, a ditch is bridged, an arrow is turned. This is where the author sees that a button keeps its marks when pressed and a box keeps its look when moved.
4. **Sizes.** The same instance in one row at 23 px (the home menu's map for Chamber 1), 45 and 50 px (Chamber 1 in the chamber), 63 px (the small chambers), and about 100 and 126 px (the same on a screen at pixel ratio 2).
5. **Meaning checks, in numbers.** Beside the red and the yellow, print how far the layer stack has moved the dome's average colour, and how much of the released-to-pressed brightness gap is left. A guardrail the author can see is worth more than a promise.
6. **The floor's detail on or off** (`options.surfaceDetail`), since elements will be judged against it.
7. **Motion, if you can.** Section 3.6.

Controls, by what the first round taught:

- One panel per element; inside it one row per layer: lamp, description, **strength**, **share of instances**, every value printed as a number.
- The choices of 3.3 as switches with one line each on what they cost.
- Presets: Original; the author's likely taste (faint, on nearly everything); your pick; bold and sparse; tone only. Open on the one you recommend, with the split view showing the difference at once.
- "Each one on its own" per element, and "Shuffle".
- The settings as text and JSON to copy, and a rail that reads well in a screenshot.

### 3.6 Being unreasonably ambitious

In rough order of value for effort. Do the first three; try the fourth.

1. **Specimen boards and the line-up** (3.5, point 1). Without them the mixer cannot answer the questions it exists for.
2. **The state scrubber** with jump buttons (point 3). The engine already plays the recorded solutions.
3. **The meaning checks** (point 5).
4. **Motion.** Either replay a recorded solution with the game's real animation, or let the author play with the keyboard, inside the page. Appendix 2, part C, has what you need. In short: `Level` runs its own frame loop and reads the keyboard from `window`, but has **no way to be handed an action or asked for its state**, so a replay either sends it synthetic key events spaced further apart than a step's 120 ms, or skips `Level` and drives `Renderer` with `StepAnimation` and the effect objects the way `Level` does (the recipe is in C.5). Sound is silenced with `Sound.enabled = false`, or kept out of the bundle by swapping `@/game/sound` for a stand-in. The hooks must then reach the other drawing paths (4.3). If this fights you for more than a couple of hours, ship the scrubber and say so: a still mixer that answers the questions beats a moving one that is late.
5. **Wear that means something.** A button's plate worn where boxes are set down; a turntable ringed by its own turning; arrows worn most where the route crosses them. The recorded solutions say where the subject actually walks: wear could follow real use. An idea to show once, not a requirement.
6. **A drawn variant**, only if some element cannot be done in code. Mark it clearly as needing new sprite files and an exception to "one file per sprite" in `npm run assets:check`.

### 3.7 The path, and where to stop

1. Explore (this brief, the files it names, section 4.1). One line to the author on how you read the job.
2. Build the mixer. Tune on sheets first. Check light, dark, phone width once. Publish. Give the link, say what opens first and what you recommend, and **stop**.
3. Expect a round of changes to the mixer itself before any choice (last time: "control each kind on its own", "remove these three"). Republish to the same link.
4. When the author chooses, by text or by screenshots: read it back as a table. **Stop** unless asked to go on.
5. "plan to implement it": explore the drawing code again (it will have moved), time what the mock-up does, then the plan as a table with its attention points. **Stop** until "approved".
6. Implement in the plan's order; verify in real Chrome; time; `npm run verify`; `delta-review`; docs; report.

### 3.8 Risks

- **Meaning drifts.** Wear on a dome that turns a released button towards a pressed one's colour is a defect, not a look.
- **Flicker.** Any path that draws the bare sprite while another draws the worn one.
- **Sameness at a new scale.** If every box is scratched alike, the stamp is back. Variation between instances matters more than the marks themselves.
- **Noise.** Thirty faint marks on the floor is texture. Thirty on a 26 px box is mud.
- **Cost in the menu.** The map redraws per highlight move.
- **The look of a mock-up that the game can't afford.** Time the mixer's drawing before promising it.
- **Scope creep.** Ten sprites. Not the doors, not the fizzler, not the subject.

---

## 4. The tooling you inherit

Everything is in `tools/detail_mixer/`. It is not part of the game: nothing there is built, shipped, type-checked or linted with it (`eslint.config.js` ignores the folder), and `build/` inside it is git-ignored. It was rebuilt and smoke-tested against the game's code on the day this brief was written; the game will have moved since, so start by running it.

```
tools/detail_mixer/
  build.sh                  patches copies of four game files, then bundles the engine into build/engine.js
  engine/
    entry.ts                the engine's API (below)
    patch_sources.py        the four patched copies, each change an exact replacement that must match once
    vite.config.mjs         bundles entry.ts with the game's code, chambers and sprites, as one script
  harness/
    assemble.py             a page's source and its scripts into one publishable file, plus light and dark test pages
    serve.py                serves the folder, with /wait?ms=N to hold a page's load open on the real clock
    shot.sh                 headless Chrome screenshot of a page, started through serve.py
    smoke.html              proves the engine and every hook work
  floor_walls/              the first mixer, as published, still building: the model for a mixer page
    page.src.html           the page: styles, markup, and the UI script
    config.js               its layers and presets
    effects.js              its drawing: noise, soft layers, marks, the two hooks
    sheet_marks.html        every kind of mark many times over, at two sizes
    sheet_layers.html       one drawing per layer or preset, whole chamber or a crop
  build/                    (generated) engine.js, patched/, assembled pages, screenshots
```

### 4.1 First five minutes

```sh
cd tools/detail_mixer
./build.sh                                                        # must end by listing build/engine.js (about 430 KB)
harness/shot.sh 'harness/smoke.html?c=1&t=40' build/smoke.png 1900 1750
```

Open `build/smoke.png`. You should see Chamber 1 five times: as the game draws it; with the surface detail off; with loud demo marks on every box, button, switch, arrow and open ditch (the `skin` and `afterTile` hooks); half way through its recorded solution; and with a red line over the floor and a green one over the walls (the `floor` and `walls` hooks). Under them, a text listing of the chamber's boxes, buttons and ditches in that state.

If `build.sh` stops with `"<label>" in src/game/<file> matches 0 times`, the game's file changed since. Open that file, find where the quoted code went, and update the replacement in `engine/patch_sources.py`. This happened once already within a day (the renderer gained an exit shadow) and took two minutes: the patches are anchored on as few lines as possible for that reason.

Then build the first mixer, to see a whole page work:

```sh
python3 harness/assemble.py floor_walls chamber-detail-mixer
harness/shot.sh 'build/chamber-detail-mixer_test_light.html' build/mixer.png 1600 3900
```

### 4.2 The engine's API

`build/engine.js` defines one global, `ChamberEngine`. It runs the game's real chamber loader, rules and renderer.

| # | Member | What it gives |
|---|--------|---------------|
| 1 | `ready` | A promise that resolves once every sprite is decoded. Draw nothing before it |
| 2 | `chambers` | `[{name, width, height, steps}]`: index 0 is the tutorial, 1 to 9 the chambers, 10 the playground. `steps` is the number of actions in the chamber's recorded solution (0 for the playground, which has none) |
| 3 | `grid(index)` | `{width, height, cells}`: one cell per tile, row 0 at the top as the screen shows it, each `{wall, steel, device, kinds}` (`steel`: a blocked wall; `device`: an emitter's or receiver's wall; `kinds`: the element types on the tile, with `'box'` and `'subject'` on their start tiles). The same in every state |
| 4 | `instances(index, step)` | Everything in the chamber **in one state**: `{step, completed, subject, boxes, elements}`. `boxes`: `[{index, x, y, row, startX, startY, carried, mirror}]`. `elements`: every placed element as `{kind, index, x, y, row, xTo, yTo, linked, blocked, pressed, pointing}` (`index` is its place in the chamber file's list for its type, the same number the game's drawing code loops over; `linked`: a link can switch it; `blocked`, `pressed`, `pointing`: its state, null where the type has none). `y` counts rows from the bottom as the game does, `row` from the top |
| 5 | `render(canvas, index, tileSize, options)` | Draws the chamber as the game does. `options.step` (default 0): how many actions of the recorded solution to play first, so 0 is the settled start and `steps` the completed chamber. `options.surfaceDetail` (default true): false switches the floor's and walls' surface detail off. `options.hooks`: your drawing (next section). It sets the canvas's width and height itself, to `tileSize × width` by `tileSize × height` |

`step` is the cheap way to show state: buttons pressed, a box moved or carried, ditches bridged, an arrow turned, without any animation. `instances` at the same step tells you which is which.

### 4.3 The hooks

Each hook is a function you pass in `options.hooks`. They run inside the game's own drawing, at a fixed place in its order. `engine/patch_sources.py` shows the exact lines.

| # | Hook | Runs | Given | Use it for |
|---|------|------|-------|------------|
| 1 | `floor(ctx, tileSize)` | After the floor, the slide floors and the game's floor detail; before the exit's shadow, the antlines, the floor arrows and the walls | A context framed on the chamber's top left corner, x right, y down, in canvas pixels | Anything on the floor under everything else |
| 2 | `walls(ctx, tileSize)` | On the walls' own layer, after the walls and the game's wall detail, before their shadow is made | The same frame. Set `ctx.globalCompositeOperation = 'source-atop'` to touch only wall pixels | Anything on the walls |
| 3 | `skin(sprite)` | Every time the game draws a sprite on a tile with its plain call (`drawSprite`), in the sprite pass | `{name, tileSize, x, y, row, way, image, margin}`. `image` is the sprite already shrunk to the tile size (a canvas; never draw on it). Return a canvas of the same size to draw instead, or null for the sprite itself | **A look of its own for one instance.** Copy `image`, draw your wear over the copy with `source-atop`, keep the copy in a map so it is made once, return it |
| 4 | `afterTile(tile)` | After each tile of a joined mass is drawn from its strip: a wall, a blocked wall, **an open ditch** | `{name, x, y, row, ctx, tileSize}`, the context framed on that tile's top left corner | Drawing over one tile of a pit (or a wall), since a strip has no single image to skin |

What the hooks do **not** reach, and what to do about it:

- **Any sprite drawn by another painter call.** `skin` is wired into `drawSprite` only. The turnable arrow's chevron *while it turns*, a box *falling* or *breaking into pieces* and the subject *while it turns* are drawn by other calls (`drawSpriteRotated`, `drawSpriteShrunk`, `drawSpritePieces` in `src/game/tile_painter.ts`), and a box in pieces from the hands asks for the sprite at 0.7 of the tile size. A ditch's grate *while it slides* is reached: it is drawn by `drawSprite` inside `drawTileSlid`. At rest, everything on your list goes through `drawSprite` or a strip. The engine draws no animation at all yet, so this bites only when you add motion (section 3.6).
- **Identity through motion.** `skin` is told the *tile*, not which box. At the settled start a box's tile is its start tile, so the tile is as good as its index; at a later `step` it is not. Use `instances(index, step)` to map a tile back to a box's `index`, and key the box's look by that index, so the look follows the box.
- **A carried box.** It is not drawn as a box at all: the subject's `subject_holding_box` sprite is a painting with a plain box in its hands. `skin` will be called for `subject_holding_box`, with the subject's tile.
- **Shadows.** A raised sprite's shadow is made from the *original* sprite's shape. A skin that keeps the shape (draw with `source-atop`) keeps its shadow right; one that changes the shape will not match its shadow.

Adding a hook is a small job: add one more exact replacement to `engine/patch_sources.py` (copy the pattern of the existing ones; add the file to `engine/vite.config.mjs`'s `patched(...)` list if it is a new file), rebuild, and extend `harness/smoke.html` so the new hook is proven.

### 4.4 Screenshots and timing

- `harness/shot.sh <page> <out.png> [width] [height]` starts `harness/serve.py` if needed and screenshots `http://127.0.0.1:8765/<page>` with headless Chrome at one canvas pixel per screen pixel. It captures only the window, so ask for one tall enough. Both paths are taken from `tools/detail_mixer/`. If the picture shows an error page or a page that isn't yours, something else is listening on port 8765, or the server (which stops itself after ten minutes) went away: run it again.
- **Why the server.** Headless Chrome's `--virtual-time-budget` clock runs ahead of work done off the main thread, such as decoding the sprites, so a page was sometimes captured before the engine was ready. A page that contains `<img src="/wait?ms=4000" alt="" hidden>` keeps its own load open for four real seconds when served by `serve.py` (opened as a file, the image just fails and nothing waits). `smoke.html`, the sheets and the test pages that `assemble.py` writes all contain it. Your own test pages must too.
- **Phone width.** Chrome's window is never narrower than about 500 px. To check a 400 px layout, put the page in a 400 px wide `<iframe>` of a wider page and screenshot that.
- **Timing.** On the virtual clock `performance.now()` does not advance while a script runs, so timings read 0. Time with the page's load held open and **no** `--virtual-time-budget`, reading the result with `--dump-dom` (`serve.py`'s header shows the command). Those numbers are rough (no GPU, and other processes compete); for numbers to keep, time in the author's real Chrome (4.6).
- Read a screenshot with the `Read` tool. Crop first with ImageMagick (`convert in.png -crop WxH+X+Y +repage out.png`) when it is large: a 1600 × 3900 page is downscaled when read, and you lose exactly the detail you are judging.

### 4.5 Publishing the page

Use the `Artifact` tool. Its own instructions outrank this summary; these are the points that mattered:

- Call it first with `action: "quickstart"`, `intent: "other"`, and follow what comes back (it carries the page rules and the design guidance).
- The published file is **content only**: no `<!doctype>`, `<html>`, `<head>` or `<body>`; a `<title>` (two to four words, a name, not a description) and `<style>` at the top; `<meta name="claude:viewport-fit-sides" content="cover">` together with side padding written as `max(16px, env(safe-area-inset-left, 0px))`.
- Every colour a token on `:root`, redefined for dark under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {…} }` and again under `:root[data-theme="dark"]`; `body` with an explicit background. `floor_walls/page.src.html` does all of this with the game's own tokens and fonts (Oxanium, Chakra Petch from Google Fonts, the only stylesheet host allowed).
- Scripts load only from a few CDNs, or **from files published beside the page**: that is how the engine travels. Publish with `file_path: tools/detail_mixer/build/<name>.html` and `files: {"engine.js": "tools/detail_mixer/build/engine.js"}`, an `icon` (one plain word) and a one-sentence `description` on the first publish. The page then loads it with `<script src="engine.js"></script>`.
- The page may not fetch from anywhere else, open dialogs, download files or print. `localStorage` works but can throw: wrap it. Copy to the clipboard only inside a click handler, with a fallback that selects the text.
- To update, publish the same file path again: the link stays the same. Give each publish a short `label`.
- It must work at phone width with no sideways scroll of the page (a wide chamber scrolls inside its own box).
- Check the page once before publishing (a screenshot of the test page, light and dark, and the phone-width iframe), then publish. Do not loop on polish; the author will say what to change.

### 4.6 Checking in the author's real Chrome

When the Chrome extension is connected (tools named `mcp__claude-in-chrome__…`; load them all in one `ToolSearch` call, and batch actions with `browser_batch`):

- Start the game with `npm run dev -- --port 5199 --strictPort` in the background. Stop it with `pkill -f "[v]ite --port 5199"` (the brackets keep `pkill` from matching itself) and close your tab when done.
- After **every** page load and before pressing Start, mute the tab: `const play = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { this.muted = true; return play.call(this) }`. The author may be listening to something else.
- Every visit opens on a loading screen; press its Start button (take a screenshot to find it). **Use `/playground`**, which keeps no progress, or `/src/dev/sprite_gallery.html`, which needs no Start at all. Opening `/chamber/N` adds an attempt to the author's saved progress.
- Screenshots come back scaled (a 1920 px window as a 1559 px frame, as JPEG). For a 1:1 look use the `zoom` action on a region; the chamber's canvas sits where `document.querySelector('canvas').getBoundingClientRect()` says.
- **Drive the game's own modules from the page.** In `npm run dev` every source file is a module the page can import, sharing the app's loaded sprites:

  ```js
  const {Renderer} = await import('/src/game/renderer.ts')
  const {CompiledChamber} = await import('/src/game/rules/compiled_chamber.ts')
  const {loadChamber} = await import('/src/game/rules/load_chamber.ts')
  const {startChamber, step} = await import('/src/game/rules/step.ts')
  const data = (await import('/src/chambers/chamber_1.json')).default
  const chamber = new CompiledChamber(loadChamber(data).chamber)
  const state = startChamber(chamber).state
  const canvas = document.createElement('canvas')
  const renderer = new Renderer(canvas, 45 * chamber.width, 45 * chamber.height)
  renderer.setSize(chamber.width, chamber.height)
  const start = performance.now(); renderer.render(state); performance.now() - start   // first frame: builds the backdrop
  ```

  This is how the floor-and-walls timings in `docs/performance.md` were taken (a fresh renderer per run, the median of nine), how a recorded solution was replayed step by step (`step(chamber, state, action).state` over `chamber_N.solution.json`'s `actions`) to time the frames where an antline changes, and how a state was shown that would otherwise need playing to.
- The window may refuse to resize (it stayed 1920 × 966 when asked for 1400 × 900). If so, say in your report that a live resize was not exercised.

---

## 5. Checklist

**Before anything**

1. Read `AGENTS.md`, `docs/sprites.md` (all of it, "Surface detail" twice), `docs/elements.md` ("Adding an element"), `docs/performance.md` ("Surface detail check"), and the five game files in section 2.5.
2. Run section 4.1. Fix `engine/patch_sources.py` if the game has moved.
3. Open the first mixer (`https://claude.ai/artifact/GFvKVnqfeJigRJxMSF9hBt`, readable with the `Artifact` tool's `read` action) and its source in `tools/detail_mixer/floor_walls/`.
4. Tell the author in one line how you read the job and what you won't do, then start.

**The mixer**

5. Tune every mark on a sheet, at 110 px and at 45 px, before it goes near a chamber.
6. Every element at its real size in real chambers, in each of its states, and many instances side by side.
7. Per element, per kind of wear: its own lamp, strength and share, every value printed as a number.
8. "Original" always one click away; the author's likely taste as the opening preset; your own recommendation stated with its reasons.
9. Meaning intact at 40 px: red still red, yellow still yellow, pressed still unlike released, the arrow still pointing, the mirror still a diagonal, a pit still a pit.
10. Light, dark and phone width checked once. Then publish, give the link, and stop.

**After the author chooses**

11. Read the choice back as a table, with what is off and what was not shown.
12. Plan as a table (step, files, how verified), with the attention points. Stop until "approved".
13. Build in the plan's order. `npm run lint:fix` and `npm run build` after each code step. Touch no file the plan did not list without saying so.
14. Check in real Chrome on `/playground` and the sprite gallery; time the first frame and the frames that follow; write the figures into `docs/performance.md`.
15. `npm run verify`. Then the `delta-review` skill on the files you changed, and fix only what it confirms.
16. Update `docs/sprites.md`, `AGENTS.md`, `docs/game_summary.md`, `docs/elements.md`, and `docs/level_design.md` if anything about designing a chamber was learned.
17. Report in the author's shape: what changed, then only what needs them. Never commit.

**When the element work has shipped**

18. Ask the author whether to delete this brief, its line in `AGENTS.md`, and `tools/detail_mixer/` with its line in `eslint.config.js`, or to keep the tooling for the next round.

---

## Appendix 1. How the ten sprites are drawn today

Written by a fact-finding agent that read the drawing code in full at commit `2497e1f` and re-checked every line number against it. **Nothing was run**: it is all from reading. The code moves daily, so treat a line number as a pointer, not a promise. One thing it could not settle by reading is flagged where it stands (boxes destroyed "from the hands"). Where its text says "section 2" or "section 5" it means its own parts, A1.2 and A1.5 here.

### A1.1 Pipeline overview

**Draw layers, back to front** (`DRAW_LAYERS`, `src/game/rules/draw_layer.ts:14-24`): `floor`, `floorMarks`, `structure`, `blockers`, `portals`, `fixtures`, `items`, `subject`, `fields`.

**Backdrop layers** (`BACKDROP_LAYERS`, `src/game/renderer.ts:121-125`): `floor`, `floorMarks`, `structure`. The other six are drawn every frame.

**Which element is on which layer** (each definition's `layer`; within a layer, registry order, `ELEMENT_REGISTRY`, `src/game/rules/element_registry.ts:20-36`):

| # | Layer | Elements, in draw order | Backdrop? |
|---|-------|-------------------------|-----------|
| 1 | `floor` | plain floor on every tile (core), slideFloor | yes |
| 2 | `floorMarks` | arrow (`rules/elements/arrow.ts:58`) | yes, but turnable arrows are left out and drawn every frame |
| 3 | `structure` | wall | yes |
| 4 | `blockers` | blockedWall, emitter, lightBarrier, ditch (`rules/elements/ditch.ts:34`), laser, door, exit, receiver | no |
| 5 | `portals` | both portals (core) | no |
| 6 | `fixtures` | button (`rules/elements/button.ts:29`), then switch (`rules/elements/switch.ts:30`) | no |
| 7 | `items` | box (`rules/elements/box.ts:59`) | no |
| 8 | `subject` | the subject (core) | no |
| 9 | `fields` | fizzler | no |

**How an element drawing is called.** `drawElementsOn(painter, state, layer, shares)` (`renderer.ts:134-140`) loops the registry and calls `ELEMENT_DRAWINGS[definition.kind](painter, state, shares)`. The signature is `ElementDrawing = (painter: TilePainter, state: RulesState, shares?: BlockedShares | null) => void` (`src/game/element_drawings.ts:36`): no time, no renderer, no per-instance argument. Each drawing loops its own elements by list index. The table is `ELEMENT_DRAWINGS` (`element_drawings.ts:826-842`).

**How the backdrop is built** (`renderer.ts`):
- `drawFloor` (150-163): `painter.clear()`, the `floor` sprite on every tile (153-157), the `floor` layer's elements (159), `drawFloorTone` (160), `drawFloorWear` (161), `drawExitShadow` (162, new; `src/game/exit_shadow.ts:46-71`).
- `drawAntlines` (inside `drawBackdrop`, 196).
- `drawBackdropCover` (173-182): the `floorMarks` elements, i.e. plain arrows (174); then a separate layer `structure = painter.createLayer()` (176) gets the walls (178), `drawWallTone` (179) and `drawWallWear` (180), and is laid down with the walls' one-mass shadow by `painter.drawLayer(structure, true)` (181).
- `drawBackdrop` (194-198) is exported and runs the three in order.

**Backdrop cache** (`Renderer.backdropOf`, `renderer.ts:303-343`): one per `Renderer` (field at 259), redrawn when `backdrop.chamber !== state.chamber` (object identity) or the tile size differs (308). A chamber with antlines keeps `floor` and `cover` on canvases of their own (310-320) and only recomposes them when the lit key changes (334-340, `composeBackdrop` 208-212). `Level.load` builds a new `CompiledChamber` each time (`level.ts:171`), so every load and reset redraws the backdrop.

**How `Renderer.render` walks a frame** (`renderer.ts:581-626`):
1. Returns if the tile size is 0 (583-585).
2. `shown` = the state, or `shownState(transition)` part way along a slide (587; `src/game/step_animation.ts:101-123`).
3. Computes the subject's pose (588), turn angle (589), `shares` (590, only when a time and transitions are given), portal opening (591), ray runs (592).
4. Copies the backdrop: `this.painter.drawLayer(this.backdropOf(shown), false)` (594).
5. `drawTurnableArrows(this.painter, shown, shares)` (595), outside any shadow pass.
6. For each of `DRAW_LAYERS` (597-615): the `subject` layer while `state.completed` goes through `drawLayerUnderExitShadow` (600-601); every other non-backdrop layer through `this.drawLayer(this.painter, shown, layer, ...)` (602-603). After `blockers`: `fall.draw(this.painter, time)` when a time is given (607-609). After `fixtures`: `drawRays` (612-614).
7. `drawGlows` (617), then `fizzle.draw` (619-621), then `ripple.draw` (623-625).

**`Renderer.drawLayer`** (441-456) wraps the layer in `painter.drawShadowsFirst(...)`: the core's portals or subject first, then `drawElementsOn(painter, state, layer, shares)` (454).

**What `drawShadowsFirst` does** (`src/game/tile_painter.ts:224-233`): runs the drawing twice, first with `pass = 'shadows'`, then `pass = 'sprites'`, then resets to `'both'`. So every element drawing on a non-backdrop layer runs twice per rendered frame. In the shadows pass:
- `drawSized` (behind `drawSprite`) draws only the shared shadow, and only for `RAISED_SPRITES` (673-689: shadow 680-684, sprite 686-688).
- `drawSpriteRotated` and `drawSpriteParted` likewise draw only shadows (400-408, 452).
- `drawStripQuarter` draws nothing (425); `drawTileSlid`, `drawSpriteShrunk`, `drawSpritePieces` and `drawInFrame` return at once (292-294, 516-518, 560-562, 638-640).
- The effect: all of one layer's shadows lie under all of that layer's sprites, but over the layers below.
- Not inside a shadow pass (pass `'both'`): the backdrop's own drawing, `drawTurnableArrows`, `fall.draw`, `drawRays`, the glows, `fizzle.draw`.

**How the surface detail is hooked in.** Four calls, all in the backdrop: `drawFloorTone(painter, state.chamber)` and `drawFloorWear(painter, state.chamber)` (`renderer.ts:160-161`), `drawWallTone(structure, state.chamber)` and `drawWallWear(structure, state.chamber)` on the walls' own layer before its shadow is made (179-180).
- They take `(painter: TilePainter, chamber: CompiledChamber)`: no state.
- They draw through `painter.drawInFrame(0, chamber.height, Direction.UP, (ctx, tileSize) => ...)`, a raw 2D context framed on the chamber's top-left corner (`src/game/surface_tone.ts:291, 313, 456`; `src/game/wear_marks.ts:348, 385`).
- Their numbers: `chamberSeed(chamber)`, a hash of width, height and the wall map only (`src/game/surface_noise.ts:52-65`); `tileNumber(seed, x, y, salt)` = `pieceNumber(seed, y * 4096 + x, salt)` (97-99, `ROW_STRIDE` 11; `src/game/piece_number.ts:9-17`); `tileNumbers(seed, x, y, salt)`, a run using the salts from `salt + 1` on (110-118).
- Salts in use: tones 10, 20, 30, 40, 50 with offsets up to +5 (`surface_tone.ts:144-148`, 320-323); floor wear 1000, 2000, 3000 (`wear_marks.ts:320-336`); wall scratches 4000 (80). Each wear kind marks 30 % of tiles (`MARKED_SHARE`, 45).
- The coarse soft layers are cached by `${name}:${width}x${height}:${seed}`, 24 kept (`surface_tone.ts:141, 150, 163-183`).
- Wear is kept off the tiles of several of the ten: `TAKES_WEAR` is false for `arrow`, `ditch`, `button`, `switch` (and slideFloor, blockedWall, door, exit) (`wear_marks.ts:89-103`). The test is "an element of that kind is on the tile", in any state (`takesWear`, 112-114). Boxes and walls are skipped by that test (113), so a box's start tile takes wear.
- Floor scratches are not clipped to their tile (`keptInTile: false`, 321-325; clip only at 359-363), so one from a neighbouring tile can run onto such a tile (`docs/sprites.md:205`).
- Floor tones still cover those tiles: `shadeFloorTiles` skips only walls (`surface_tone.ts:316-318`).

**A second code-over-pixels drawing now exists.** While the state is completed, the subject's layer is drawn on a canvas of its own (`subjectLayerOf`, `renderer.ts:487-504`), `drawExitShadow(own, state.chamber, 'source-atop')` darkens only the pixels already painted there, and the layer is laid down (`drawLayerUnderExitShadow`, 471-478; `TilePainter.erase`, `tile_painter.ts:248-250`). `stretchSoftLayer` uses the same `source-atop` on the walls' layer (`surface_tone.ts:295-297`).

**Reduced motion and standalone renders.** `Level.render` passes `time = null` under `prefers-reduced-motion` (`level.ts:344`); the map and gallery call `render(state)` with every other argument defaulted. With no time: `shares` is null (590), nothing falls (607), nothing breaks up (619).


### A1.2 Sprite scaling and caching (`src/game/sprite_scaling.ts`)

**Stores.** Two module-level maps, shared by every canvas (comment 5-11):
- `scaledBySize: Map<number, Map<SpriteName, ScaledSprite | null>>` (38)
- `shadowsBySize`, same shape (39)
- `ScaledSprite = {image: HTMLCanvasElement, margin: number}` (16-19)

**Key.** Tile size in canvas pixels, then sprite name. Nothing else.

**`scaledSprite(name, tileSize)`** (199-212): returns null for a size ≤ 0; takes the size's map from `keptAt`; if the name is missing, stores `scale(name, tileSize)`; returns it. A null result is stored too (207-209), so a sprite with no usable file when first asked at a size stays null for that size until the size is evicted.

**`keptAt`** (171-190), the LRU: a `Map` in insertion order. On a miss it makes a new inner map and, if `store.size >= KEPT_SIZES` (8, line 30), deletes the first key; on a hit it deletes and re-sets the size so it becomes the most recent. Each of the two stores keeps 8 sizes on its own.

**`scale`** (99-120):
- Source is `spriteOf(name)`, the decoded `ImageBitmap` (`src/game/sprite_sources.ts:197-199`).
- `margin = Math.round(sprite.overhang * tileSize / 256)` (106).
- A strip gets a canvas `tileSize * 5` wide and `tileSize` high; anything else a square of `tileSize + 2 * margin` (108).
- A non-strip is one `drawImage` of the whole file into that canvas (113), with `imageSmoothingQuality = 'high'` (`makeCanvas`, 60).

**Strips, quarter by quarter** (`scaleStrip`, 76-90): for each of the 5 strip tiles and each of the 4 quarters, the 128 px source quarter (`quarterRect(256, quarter)`) is copied alone, 1:1, into a scratch canvas (85-86), then that scratch canvas is drawn scaled into `quarterRect(tileSize, quarter)` at `i * tileSize` (87). `quarterRect` (`src/game/sprite_set.ts:62-73`) uses `half = floor(tileSize / 2)` and gives the odd pixel to the right and bottom quarters.

**The shadow** (`makeShadow`, 140-161):
- Starts from `scaledSprite(name, tileSize)` (141).
- `blur = shadowBlur(tileSize)` = `tileSize * 0.12` (128-130; `SHADOW_BLUR_SHARE`, 33).
- `padding = ceil(blur * 1.5)` (148; `SHADOW_REACH`, 36).
- A canvas of the sprite's image plus the padding all round (149), with `shadowColor = PALETTE.shadow` (`rgba(0, 0, 0, 0.5)`, `src/game/palette.ts:17`), `shadowBlur = blur`, `shadowOffsetX = canvas.width` (152-154).
- The sprite is drawn off the canvas's left edge (155), so only its canvas shadow lands on the canvas: the shadow is the blurred alpha shape of the scaled sprite image, with no offset.
- Returned margin is `sprite.margin + padding` (159).
- `scaledShadow` (221-233) caches it by the same key.

**`shadowBlur`** is also what `TilePainter.drawLayer(layer, true)` uses for the walls' one-mass shadow (`tile_painter.ts:186-189`).

**`RAISED_SPRITES`** (`sprite_set.ts:132-140`): `door_closed`, `exit_closed`, `switch`, `box`, `box_mirror`, `subject_holding_gun`, `subject_holding_box`. Of the ten, `switch`, `box` and `box_mirror` are raised; `arrow`, `turntable_arrow`, `turntable`, `button_pressed`, `button_up`, `ditch_bridged` and `ditch` are not.

**Sizes other than the tile size.** `drawSpriteShrunk` and `drawSpritePieces` ask for `scaledSprite(name, Math.round(this.tileSize * size))` (`tile_painter.ts:520-521, 564-565`). A box breaking up from the hands uses `size = 0.7`, so it adds a second size key, `round(0.7 * tileSize)`, counted against the 8.

**Can the cache hold more than one variant of a sprite today? No.** There is exactly one image, and one shadow, per (tile size, sprite name). The key has no instance, seed, state or turn component, and every draw site passes only a `SpriteName`. The only multiplicity is across sizes.


### A1.3 Per sprite

Common to all ten:
- **Files.** All are 256 × 256 px except `ditch`, a 1280 × 256 strip (read from the WebP headers); none overhangs. `ditch` and `ditch_bridged` have no alpha, the other eight do, matching `docs/sprites.md:11`.
- **Sources.** Each has an SVG in `art/sprites/` named like its file.
- **Placement.** `drawSprite(name, x, y, way = UP)` (`tile_painter.ts:374-376`) rounds the tile's left and top to whole pixels and calls `drawSized`. Quarter turns are exact matrix turns about the tile's middle (`drawTurned`, 723-740; `TURNS`, 22-39).
- **No flipping.** `TilePainter` never mirrors a sprite.
- **Map and gallery.** Both go through `Renderer.render(state)`, so they use the same functions with `shares = null`; only the join boards differ (section 5).

#### A1.3.1 `arrow`

- **Belongs to:** an `arrow` element no link can turn; no states. Spec, `docs/sprites.md:114`: "| 26 | `arrow` | A floor arrow |". Turning, line 48: "Pointing up: the one way the subject may enter its tile | To the way the arrow points." Order row 3, line 132.
- **Art:** one chevron polyline, stroke 32, points (62,163) (128,103) (194,163), colour 150, 153, 160 (`art/sprites/arrow.svg`).
- **Drawn by:** `drawArrows` (`element_drawings.ts:359-370`), `painter.drawSprite('arrow', position.x, position.y, direction)` (367). Registered as `ELEMENT_DRAWINGS.arrow` (828).
- **Layer:** `floorMarks`, in the backdrop. Reached only from `drawBackdropCover` (`renderer.ts:174`). It lies over the floor, the floor's surface detail, the exit shadow and the antlines, and under the walls and their shadow. With antlines it is baked into the kept `cover` canvas.
- **What decides it:** `direction !== null` and `chamber.turnedDirectionOf('arrow', i) === null` (366). No state flag is read; the function uses only `state.chamber`.
- **Turned:** quarter turns to `chamber.directionOf('arrow', i)` (364).
- **Shadow:** none.
- **Identity at the draw site:** `i`, the index in the chamber file's `arrows` list (loop at 362; the index space is shared with turnable arrows), `position.x`, `position.y` (363), `direction`.
- **Drawn anywhere else:** no. `drawArrows` takes no `shares`. `ElementTransitions` does look through kind `arrow` (`src/game/element_transitions.ts:43-53`), but a plain arrow's flag never changes; the validator requires an id and a turned way together (`src/game/rules/validate_chamber.ts:702, 706`).
- **Gallery:** the specimen has four plain arrows, one per direction (`src/dev/gallery_layouts.ts:224-245`).

#### A1.3.2 `turntable_arrow`

- **Belongs to:** an `arrow` element with a `turnedDirection` (a link can turn it); it is the chevron. Spec, `docs/sprites.md:116`: "| 28 | `turntable_arrow` | A turnable arrow's chevron: the floor arrow's (150, 153, 160) at 85 % of its size about the tile's middle, so a band of disc shows all round it at every angle. Keep it in step with `arrow` |". Turning, line 48: "`turntable_arrow` is also turned by any angle while a link turns its arrow ..., the one sprite turned by other than quarter turns". Order row 5, line 134.
- **Art:** `arrow.svg`'s polyline inside `scale(0.85)` about (128, 128) (`art/sprites/turntable_arrow.svg`).
- **Drawn by:** `drawTurnableArrows` (`element_drawings.ts:404-427`), exported and called directly by `Renderer.render` (`renderer.ts:595`), not through `ELEMENT_DRAWINGS`.
  - At rest: `painter.drawSprite('turntable_arrow', position.x, position.y, way)` (424), with `way = state.pointingWay('arrow', i)` (417).
  - Turning: `painter.drawSpriteRotated('turntable_arrow', position.x, position.y, turningAngle(turned, own, share))` (422).
- **Layer:** none of its own. Drawn every frame right after the backdrop copy, so over the walls' shadow and under `blockers` and everything above. Not in a shadow pass.
- **What decides it:** skipped unless both `turnedDirectionOf` and `directionOf` are set (411-413). `pointingWay` gives the turned way while the arrow is unblocked, else its own way (`src/game/rules/state_reader.ts:285-289`). Arrows start blocked (`arrow.ts:60`).
- **Turned:** quarter turns at rest. While turning, any angle: `turningAngle` (380-393) goes from the turned way's angle at share 0 to the own way's at share 1, the short way round; `drawSpriteRotated` uses `ctx.rotate(angle)` about the tile's middle (`tile_painter.ts:390-409`, `drawRotated` 700-712).
- **Transition:** kind `arrow`, 300 ms, eased (`element_transitions.ts:57-60`; cubic ease-out, 207). A change starts from where the chevron is drawn (`from = this.blockedAt(...) ?? (1 - to)`, 141) and lasts 300 ms × the remaining share (149). Started from `Level.playStep` (`level.ts:612-614`). The rules report `ARROW_TURNED` (`arrow.ts:19`), which now plays `Sound.TURNABLE_ARROW` (`level.ts:104`).
- **Shadow:** none.
- **Identity at the draw site:** `i` (loop at 407), `position.x`, `position.y` (415), `own`, `turned`.
- **Elsewhere:** nowhere else. Map and gallery draw it at `pointingWay` (`docs/sprites.md:223`). Specimen: one at (3, 2), own way up, turned way right; pointing up in "everything on" and right in "everything off" (`gallery_layouts.ts:246-251`, button link at 257).
- **In the chambers:** chambers 6 and 7 and the playground have one each (counted from the JSON files).

#### A1.3.3 `turntable`

- **Belongs to:** the same turnable arrow; it is the disc under the chevron. Spec, `docs/sprites.md:115`: "| 27 | `turntable` | A turnable arrow's disc: the floor cut round under it, a disc a shade lighter than the floor (245, 246, 251) under the floor's texture, a little fainter, with a lit lip (253, 253, 255) just inside a dark cut (132, 136, 147), the same all round, so it shows that the arrow turns but not which way. Never turned |".
- **Art:** disc r = 96 with a baked noise texture, lip r = 93.5 width 3, cut r = 99 width 6, centred (`art/sprites/turntable.svg`).
- **Drawn by:** `drawTurnableArrows`, `painter.drawSprite('turntable', position.x, position.y)` (`element_drawings.ts:419`), every frame, before its chevron.
- **What decides it:** the same test as the chevron (411-413); no state.
- **Turned:** never.
- **Shadow:** none.
- **Identity:** the same `i`, `position.x`, `position.y`.
- **Elsewhere:** nowhere; no transition of its own (`docs/sprites.md:223`: "its `turntable` stays").
- **Under it:** opaque inside r ≈ 102, so it covers what the backdrop has on that tile there. Wear marks are kept off the tile anyway (`TAKES_WEAR.arrow`).

#### Boxes: shared facts (both box sprites)

- **Picking the sprite:** `boxSprite(chamber, index, held = Direction.UP)` (`element_drawings.ts:743-757`). `chamber.mirrorOf(index) === null` gives `{name: 'box', way: held}`; otherwise `{name: 'box_mirror', way: mirror === '\\' ? RIGHT : UP}`.
- **Resting:** `drawBoxes` (765-775) loops `i < state.chamber.stateLayout.boxCount`, skips `i === state.carriedBox` (767-769), and calls `painter.drawSprite(sprite.name, state.boxX(i), state.boxY(i), sprite.way)` (773) with `boxSprite(state.chamber, i)` (771). A resting plain box is therefore always drawn facing up.
- **Layer:** `items`, every frame, inside a shadow pass. Over the fixtures and the rays, under the subject and the fields.
- **Shadow:** both sprites are raised. Their shadows go down in the `items` layer's shadow pass, so they fall on buttons, switches and rays below, and never on another box.
- **Carried:** the box's own sprite is not drawn. `drawSubject` (`renderer.ts:378-393`) picks `subject_holding_box` when `state.carriedBox !== NO_BOX` (379), a painted image with a plain box painted in (`docs/sprites.md:107, 231`). It is drawn at the subject's pose, turned by quarter turns (384) or by any angle while turning (386), and clipped to a tile through a portal (382). So the painted box turns with the subject; the resting sprite does not.
- **Pick up** (`src/game/rules/step.ts:750-755`): `carryBox(box)` and `BOX_PICKED_UP`, then `carryBoxAlong()` moves the box's stored tile to the subject's (922). On screen: the resting sprite stops being drawn at once, and the subject's sprite swaps at once. There is no box animation; `subjectPose` returns the rest pose for a step that did not move the subject (`src/game/subject_pose.ts:68`, `glidePose` returns null at 124-126). Sound: `Sound.BOX` (`level.ts:89`).
- **Put down** (`step.ts:736-748`): `moveBox(carriedBox, tile.x, tile.y)`, `dropBox()`, `BOX_PUT_DOWN`, onto the tile faced (`putDownTile`, 669-678). On screen: the box's own sprite appears at once at full tile size, a plain box facing up whatever way it was held; the subject swaps back to `subject_holding_gun`.
- **Destroyed while carried, by a fizzler** (`src/game/rules/elements/fizzler.ts:47` → `StateDraft.destroyCarriedBox`, `src/game/rules/state_draft.ts:129-136`): the step reports `FIZZLED`. `FizzleParticles.start` (`src/game/fizzle_particles.ts:144-157`) adds a burst:
  - sprite `boxSprite(after.chamber, before.carriedBox, after.facing)`, so a plain box is turned to the subject's facing and a mirror box only by its mirror;
  - at `after.subject + 0.5 + facing × CARRIED_BOX_AHEAD` (0.26, `renderer.ts:85`), `size: CARRIED_BOX_SIZE` (0.7, `renderer.ts:88`);
  - drawn by `painter.drawSpritePieces(burst.sprite, burst.x, burst.y, burst.size, burst.way, 9, placer)` (215), 9 pieces across, over 600 ms (27, 30), last but for the ripple (`renderer.ts:619-621`);
  - the pieces are cut from `scaledSprite(name, round(0.7 * tileSize))` (`tile_painter.ts:564-565`).
- **Destroyed where it lay**, by a door closing or a laser, light barrier or fizzler switching on (`destroyBoxesOnBlockedTiles`, `box.ts:37-51`): `BOX_DESTROYED`. `findDestroyedBoxes` (`src/game/destroyed_boxes.ts:40-80`) finds each box that went back to its start (53) from a tile holding one of `BOX_DESTROYING_KINDS` (55; `box.ts:19-25`). With `fell: false` it becomes a burst at the tile's middle, `size: 1`, sprite and way from `boxSprite(chamber, index, UP)` (61-63) (`fizzle_particles.ts:159-171`).
- **Fell into a ditch** that is still open after the step: `fell: true` (`destroyed_boxes.ts:75`). `BoxFall.start` keeps those (`src/game/box_fall.ts:34-41`), and `BoxFall.draw` (69-87) draws each with `painter.drawClippedToTile(box.tile, () => painter.drawSpriteShrunk(box.sprite, x, y, box.size, box.way, 1 - 0.75 * fallen, 1 - fallen))` (83-85):
  - 450 ms, hanging for the first 12 %, then quadratic (7, 10, 77);
  - no shadow (`drawSpriteShrunk` never draws one);
  - drawn right after the `blockers` layer (`renderer.ts:607-609`), so over the ditch and its sliding grate and under fixtures, items and the subject.
  - If the ditch is bridged again by the end of the step, the box breaks up instead (`destroyed_boxes.ts:30-33`).
- **Sent back by a link** (`sendBoxBack`, `box.ts:12-16`): `sendBoxToStart` with no event. No burst, no fall; it simply is drawn on its start tile from the next frame. The same holds for a box pushed off that start tile by the chain in `sendBoxToStart` (`state_draft.ts:179-186`; `docs/elements.md:150`: "Nothing reports it").
- **In every case** the box is drawn at its start at once by `drawBoxes`, since the state already has it there (`docs/sprites.md:163`). Along a slide "at once" means when the subject reaches that tile: the level queues the effects as beats (`level.ts:550-592`) and the renderer draws `shownState` meanwhile.
- **Reduced motion, load, reset:** none of these effects start under reduced motion (`level.ts:611`); a load clears them (188-193).
- **Chamber completed while carrying:** the subject's layer, painted box included, is drawn on its own canvas and darkened by the exit shadow (`renderer.ts:471-478, 600-601`).
- **What the effects know about the box.** `DestroyedBox` (`destroyed_boxes.ts:15-23`) and `Burst` (`fizzle_particles.ts:16-24`) carry a sprite name, place, size and way, but no box index. The index exists only where they are built (`chamber.boxStarts.forEach((start, index)`, `destroyed_boxes.ts:48`; `before.carriedBox`, `fizzle_particles.ts:146`). A burst's `seed` is a running counter, `this.burstCount++` (136, 154, 167), not the box.
- **Ambiguous: boxes destroyed "from the hands" by a put-down.** `findDestroyedBoxes` has a branch for a box that was carried before the step (52): it requires the subject not to have moved (`putDownInPlace`, 54), looks for the destroying element at the box's tile before the step, which for a carried box is the subject's own tile (50-51, 55), and places the effect at that tile plus `CARRIED_BOX_AHEAD` at `CARRIED_BOX_SIZE` (61-68). The docs describe this as a box "the subject puts down there" (`docs/sprites.md:159, 163, 231`). But the present rules put a box down only on the tile faced, and only where a move could step now (`step.ts:609-614, 647-656`; `docs/elements.md:134`), and a fixture pins that a box is never put down on an open ditch (`scripts/fixtures/fixtures.ts:622`). My reading, not verified by running: this branch can fire only when a box is put down ahead and destroyed there within the same step while the subject's own tile also holds a door, ditch, laser or light barrier; otherwise such a box gets no effect at all.

#### A1.3.4 `box_mirror`

- **Belongs to:** a `box` whose entry has `mirror: '/'` or `'\\'` (`src/game/chamber_data.ts:66-69`). Spec, `docs/sprites.md:108`: "| 20 | `box_mirror` | A mirror box: the box with a mirror of glass from corner to corner in place of its disc, a dark frame round glass lit across its width, with a white glint along it. Drawn as `/` and turned a quarter turn for `\`. Resting, it turns a ray a quarter turn on its tile, the ray's corner hidden under it. Carried, it isn't drawn: `subject_holding_box` shows a box in the subject's hands, and the game draws the mirror's line over it in code, the right way round in the room whichever way the subject faces ... |". Turning, line 51: "A quarter turn for a `\` mirror. A mirror keeps its way wherever its box goes, so nothing else turns it".
- **Art:** `box.svg`'s body with the mirror in place of the disc: a `rotate(-45)` group of frame 152 × 26, glass 144 × 18 with a gradient, glint 136 × 3; the whole scaled 0.8 (`art/sprites/box_mirror.svg`).
- **Drawn by:** `drawBoxes` → `painter.drawSprite('box_mirror', state.boxX(i), state.boxY(i), way)` (`element_drawings.ts:773`); layer `items`, every frame.
- **What decides it:** `chamber.mirrorOf(i) !== null` (744), fixed per box (`src/game/rules/compiled_chamber.ts:232, 571-573`); not drawn while carried.
- **Turned:** `RIGHT` (a quarter turn) for `\`, `UP` for `/` (755). Never by the subject's facing, in bursts and falls too.
- **Shadow:** yes, shared with the sprite's turn.
- **Identity at the draw site:** `i` (box list index), `state.boxX(i)`, `state.boxY(i)`; the start tile `chamber.boxStarts[i]` and the mirror are reachable from `i`.
- **Carried:** `subject_holding_box` plus a mirror mark in code, `drawCarriedMirror` (`renderer.ts:404-427`): three round-capped strokes (`CARRIED_MIRROR_STROKES`, 102-115) centred at pose + 0.5 + ahead × 0.26 (406-409), reaching 0.13 of a tile (91), drawn in an unturned frame (413) so the mirror stays the right way round in the room. No `box_mirror` pixels are used.
- **Elsewhere:** fizzle pieces and the fall, as in the shared facts, by name through `boxSprite`.
- **Where it can be seen today:** no chamber file has a mirror box. The playground has one, `\` (`src/dev/playground.json:439`), and the gallery specimen has one, `\`, at (7, 6) (`gallery_layouts.ts:286-289`). No drawable layout has a `/` mirror box, so the sprite as drawn (unturned) appears only on its gallery card.

#### A1.3.5 `box`

- **Belongs to:** a `box` with no mirror. Spec, `docs/sprites.md:107`: "| 19 | `box` | A box. Carried, it isn't drawn: the subject's `subject_holding_box` shows it in its hands |". Not in the turning table ("Every sprite not listed here is never turned", line 43).
- **Art:** a dark core with four corner blocks, four tabs and a centre disc (r = 37.1), outlined, 184 px across then scaled 0.8 about the middle, so about 147 px of the 256 px tile; four-fold symmetric (`art/sprites/box.svg`).
- **Drawn by:** `drawBoxes` → `painter.drawSprite('box', state.boxX(i), state.boxY(i), Direction.UP)` (`element_drawings.ts:773`, way from 748-749); layer `items`, every frame.
- **What decides it:** `mirrorOf(i) === null` (746) and `i !== state.carriedBox` (767).
- **Turned:** up at rest. Turned to the subject's facing only when breaking up from the hands (`fizzle_particles.ts:146`; `destroyed_boxes.ts:61-63`).
- **Shadow:** yes.
- **Identity at the draw site:** `i`, `state.boxX(i)`, `state.boxY(i)`.
- **Elsewhere:** the shared facts above (burst from the hands at 0.7 size, burst where it lay at full size, fall).
- **Gallery:** the specimen has three plain boxes: (3, 3), picked up by the subject in both runs, so not drawn; (5, 1) on a button; (1, 5) on the floor (`gallery_layouts.ts:282-285`).

#### Buttons: shared facts

- **Drawn by:** `drawButtons` (`element_drawings.ts:685-693`), one call per button: `painter.drawSprite(state.isButtonPressed(i) ? 'button_pressed' : 'button_up', position.x, position.y)` (691).
- **Layer:** `fixtures`, every frame; buttons before switches. In a shadow pass, but not raised, so nothing is drawn in the shadows pass.
- **Up or pressed:** the state's pressed flag (`isButtonPressed`, `state_reader.ts:250-252`). The rules set it in every pass: `held = draft.isSubjectAt(x, y) || draft.hasBoxAt(x, y)` (`judgeButton`, `button.ts:13-21`). `hasBoxAt` counts the carried box, which sits on the subject's tile (`state_reader.ts:208-216, 241-243`).
- **No transition:** `button` is not a `TransitionKind` (`element_transitions.ts:11`); the sprite swaps at once with the state shown. Along a slide that is the slide's end, since buttons are judged only once it has ended.
- **Turned:** never. **Shadow:** none.
- **Identity at the draw site:** `i` (index in the chamber's `buttons` list, loop at 688), `position.x`, `position.y` (689).
- **Elsewhere:** nowhere; no pieces, no fall.
- **A box resting on a button:** `button_pressed` on `fixtures`, then any ray, then the box's shadow and the box on `items` (`docs/sprites.md:105`: "A box on a button is drawn as on the floor, over it"). The SVG's comment says the box is "wider than the dome's red, so only the plate and the clamps stay in sight around it" (`art/sprites/button_pressed.svg`). The box's shadow falls on the plate.
- **The subject on a button:** drawn on the `subject` layer over it.
- **Under it:** an antline's start is hidden by the sprite (`docs/sprites.md:171`); wear marks are kept off the tile.

#### A1.3.6 `button_pressed`

- **Spec,** `docs/sprites.md:105`: "| 17 | `button_pressed` | A floor button, held down by the subject or a box. A box on a button is drawn as on the floor, over it |".
- **Art:** `button_up.svg` with only the dome's colours changed, to 220, 60, 50 with a 110, 26, 22 rim (`art/sprites/button_pressed.svg`).
- **Everything else:** as in the shared facts; drawn when `state.isButtonPressed(i)` is true.
- **Gallery:** the specimen's button at (5, 1) is held by the box on it (`gallery_layouts.ts:253-258, 284`).

#### A1.3.7 `button_up`

- **Spec,** `docs/sprites.md:104`: "| 16 | `button_up` | A floor button, released |".
- **Art:** on a 140-unit grid scaled 0.85 about the middle: a white plate r = 68.2 with a dark rim, a dome r = 46.084 in 150, 40, 34, and four slate corner clamps (`art/sprites/button_up.svg`).
- **Everything else:** as in the shared facts; drawn when the flag is false.
- **Gallery:** the specimen's button at (5, 2) (`gallery_layouts.ts:259-263`).

#### Ditch: shared facts

- **Drawn by:** `drawDitches` (`element_drawings.ts:558-580`), registered as `ELEMENT_DRAWINGS.ditch` (833). Layer `blockers` (`ditch.ts:34`), every frame, after the light barriers and before the lasers, in a shadow pass in which it draws nothing.
- **Three cases per ditch `i`** (567-579), with `share = shares('ditch', i)`:
  - changing (`share !== null`): the joined pit, then the grate slid part way (571-573);
  - open (`state.isBlocked('ditch', i)`): the joined pit only (574-575);
  - bridged: `painter.drawSprite('ditch_bridged', position.x, position.y)` (576-577).
- **Joining** (`drawJoinedTile`, 230-234): for each of the four quarters, `painter.drawStripQuarter('ditch', stripTileFor(joins, x, y, tileQuarter), tileQuarter, x, y)`.
- **Which strip tile each quarter comes from** (`stripTileFor`, 201-219). The quarter's corner gives two neighbours (`QUARTER_CORNERS`, 79-96: topLeft dx −1 dy +1, topRight +1 +1, bottomLeft −1 −1, bottomRight +1 −1; rows grow upwards): `vertical = joins(x, y + dy)` and `horizontal = joins(x + dx, y)`.

| # | vertical | horizontal | diagonal | Strip tile (`STRIP_TILE`, `sprite_set.ts:21-27`) |
|---|----------|------------|----------|--------------------------------------------------|
| 1 | no | no | any | `lone` (0) |
| 2 | no | yes | any | `horizontalRun` (1) |
| 3 | yes | no | any | `verticalRun` (2) |
| 4 | yes | yes | no | `innerCorners` (3) |
| 5 | yes | yes | yes | `solid` (4) |

- **The join test for ditches** (561-565): a tile joins when it holds a ditch that is open in the state drawn or is changing. A bridged ditch does not join, so it ends the pit. Outside the chamber never joins (`elementAt` answers `NO_ELEMENT` there, `compiled_chamber.ts:488-496`).
- **`drawStripQuarter`** (`tile_painter.ts:420-428`): copies the quarter's rectangle from the scaled strip at `index * size + rect.left, rect.top` to the tile, pixel for pixel, never turned.
- **Animation:** kind `ditch`, 300 ms, eased (`element_transitions.ts:65-68`); the share runs from 0 (bridged) to 1 (open) (14-20). While changing, the ditch counts as open for its neighbours' joins (564), so their rims beside it go as it starts to open and return only once its grate is fully in (`docs/sprites.md:217`).
- **The grate:** `painter.drawTileSlid(position.x, position.y, grateSide(chamber, position.x, position.y), false, share, () => painter.drawSprite('ditch_bridged', position.x, position.y))` (573). `drawTileSlid` (`tile_painter.ts:291-323`) clips to the tile, shifts by `round(share * size)` pixels towards `way`, and draws the whole tile (`halfOnly` false). So at share 0 the grate is in place, and at share 1 it is a whole tile out, cut off at the tile's edge.
- **Which side the grate goes to** (`grateSide`, 537-547), counting ditches in any state: with more ditches left and right than above and below, down when a ditch lies above, else up; otherwise right when a ditch lies left, else left.
- **Events:** switching a ditch now reports `DITCH_SWITCHED` (`ditch.ts:10-26, 44`), which plays `Sound.DITCH_GRATE` (`level.ts:106`). The drawing still reads the blocked flags, not the event.
- **Identity at the draw site:** `i` (index in the chamber's `ditches` list, loop at 567), `position.x`, `position.y` (568). Inside `drawJoinedTile` and `stripTileFor` only `x`, `y` and the quarter are in hand.
- **Shadow:** none for either sprite.
- **Over it:** a falling box, right after the layer (`renderer.ts:607-609`).
- **Under it:** both sprites are opaque and fill the tile, so nothing of the backdrop shows through; wear marks are kept off the tile anyway.

#### A1.3.8 `ditch_bridged`

- **Spec,** `docs/sprites.md:98`: "| 10 | `ditch_bridged` | A ditch bridged over: walkable |". Joins, line 81: "A bridged ditch is drawn on its own (`ditch_bridged`) and ends the pit."
- **Art:** the lone pit's rim showing in a gap round a steel plate: a 232 × 232 plate with a mitred frame and a six-by-six grating of 23 px slots; "The plate is the same under every quarter turn" (`art/sprites/ditch_bridged.svg`, header comment and lines 78-93).
- **Drawn by:** `painter.drawSprite('ditch_bridged', position.x, position.y)`, at rest (`element_drawings.ts:577`) and inside `drawTileSlid` while changing (573).
- **What decides it:** the ditch is not blocked and not changing, or it is changing.
- **Turned:** never.
- **Gallery:** the specimen's two ditches at (2, 5) and (3, 5) are bridged in "everything off" (`gallery_layouts.ts:213-216`).
- **In the chambers:** no chamber or playground ditch starts bridged, so in play it shows only once a link bridges one.

#### A1.3.9 `ditch`

- **Spec,** `docs/sprites.md:97`: "| 9 | `ditch` | The open ditch strip: a pit. It stops walking but lets shots through |". Strip size, line 18. Joins, line 81: "In the ditch strip, read "wall" as "open ditch" and "floor" as anything else. It shows the pit's inner sides, the same depth everywhere: 82 px wide ..."
- **Art:** five tiles left to right (lone, horizontal run, vertical run, inner corners, solid); an 82 px side band drawn once and turned; the bottom's grain "repeats every 128 px, so quarters cut from different tiles always meet exactly" (`art/sprites/ditch.svg`, header comment).
- **Drawn by:** `drawJoinedTile(painter, 'ditch', joins, position.x, position.y)` (`element_drawings.ts:572, 575`), four `drawStripQuarter` calls per tile.
- **What decides it:** the ditch is blocked (open), or changing (then with the grate over it).
- **Turned:** never; the quarters are chosen, not turned.
- **Scaling:** the strip is shrunk quarter by quarter (section 2).
- **Gallery:** the specimen's two ditches joined as a two-tile run in "everything on"; and the ditch join board, all open, drawn by calling `ELEMENT_DRAWINGS.ditch(painter, state)` directly after `drawBackdrop` (`src/dev/sprite_gallery.ts:429-433`).
- **In the chambers:** chambers 0 to 5 and the playground have ditches, chamber 3 the most (39).

#### A1.3.10 `switch`

- **Belongs to:** a `switch` element; no states. Spec, `docs/sprites.md:106`: "| 18 | `switch` | A switch, used with the interact key. It has no on or off |".
- **Art:** the button's twin with a yellow dome (240, 192, 40); "Unlike the button, the game draws it raised, with a shadow" (`art/sprites/switch.svg`).
- **Drawn by:** `drawSwitches` (`element_drawings.ts:715-723`), `painter.drawSprite('switch', position.x, position.y)` (721). Registered as `ELEMENT_DRAWINGS.switch` (839).
- **Layer:** `fixtures`, every frame, after the buttons, in a shadow pass.
- **What decides it:** nothing; every switch is drawn the same in every state.
- **Turned:** never.
- **Shadow:** yes, the only raised sprite on its layer. Its shadow is laid in the `fixtures` shadows pass, so over the blockers and portals and under every button and switch sprite.
- **Identity at the draw site:** `i` (index in the chamber's `switches` list, loop at 718), `position.x`, `position.y` (719).
- **Elsewhere:** nowhere; no transition, no pieces. Using it reports `SWITCH_USED` (`switch.ts:13-22`) and plays a sound, with nothing drawn.
- **Over it:** a ray, the subject. No box can rest on it: a put-down there is refused (`step.ts:655`), and a box can only start on plain floor or a button (`validate_chamber.ts:323`).
- **Gallery:** the specimen's switch at (5, 6) (`gallery_layouts.ts:265-271`).


### A1.4 Identity through motion (boxes)

- **A box is its index in the chamber file's `boxes` list.** `CompiledChamber.boxStarts = data.boxes ?? []` and `mirrors` use that index (`compiled_chamber.ts:211, 217, 231-232`). `StateLayout.boxCount = boxes.length` (`src/game/rules/state_layout.ts:95`).
- **Where the state keeps it.** Each box's column and row sit at `boxesOffset + index * 2` and `+ 1`, with `boxesOffset = 11` (`state_layout.ts:49, 98`; `StateReader.boxOffset`, `state_reader.ts:52-58`; `boxX`, `boxY`, 189-200). The carried box is one slot holding an index, or `NO_BOX` = −1 (`StateSlot.CARRIED_BOX`, `state_layout.ts:25, 42`; `carriedBox`, `state_reader.ts:118-120`). The layout is described at `state_layout.ts:60-68`.
- **The tile is not the identity.** It changes; `firstBoxAt` and `restingBoxAt` search by tile and return an index (`state_reader.ts:208-233`).
- **Stable while carried:** `carryBox(index)` writes the index (`state_draft.ts:114-116`); `carryBoxAlong` moves that index's tile to the subject's (141-147), called on every tile of a slide (`step.ts:353`) and after every action (922).
- **Stable through a portal:** a crossing only moves the subject; the same `carryBoxAlong` follows (`docs/elements.md:289`, M6).
- **Stable through destruction:** nothing is created or removed. Destroyed means moved back: `destroyCarriedBox` drops the box and calls `sendBoxToStart(box)` (`state_draft.ts:129-136`); `destroyBoxesOnBlockedTiles` calls `sendBoxToStart(index)` (`box.ts:46-49`); `sendBoxToStart` moves that same index to `boxStarts[index]` (`state_draft.ts:168-187`).
- **The state does not record a destruction.** It "holds no counters" (`src/game/rules/rules_state.ts:10-11`): a box back at its start after being destroyed is the same index with the same values as one that never left. Only the step's events (`BOX_DESTROYED`, `FIZZLED`) say it happened, and they are not stored.
- **The mirror is per index and fixed** (`mirrorOf`, `compiled_chamber.ts:571-573`).
- **Fixed elements** (arrow, button, ditch, switch): the index in the type's list and the tile are both fixed for a chamber; `chamber.positionOf(kind, i)` and `chamber.elementAt(kind, x, y)` convert between them (`compiled_chamber.ts:488-496, 535-543`). A floor tile holds one fixed element, plus possibly a slide floor (`draw_layer.ts:10-12`).
- **Chamber-level numbers that exist:** only `chamberSeed`, from the size and the wall map (`surface_noise.ts:52-65`). `CompiledChamber` objects are rebuilt on every load, preview and gallery figure, so object identity does not persist.


### A1.5 Standalone uses of the renderer

**Home menu map** (`src/game/chamber_preview.ts:16-27`, called from `src/components/chamber_map.vue:24-34`):
- Loads the chamber with the layout checks, compiles it (23), makes a new `Renderer(canvas, maxWidth, maxHeight)` with `minimumTiles` defaulted to 1 (24), sizes it (25), and calls `renderer.render(startChamber(chamber).state)` (26).
- One still frame of the settled start: no time, so no transitions, pieces, falls or pulsing.
- Redrawn when the frame resizes or another chamber is highlighted (`chamber_map.vue:37, 43-44`), each time with a new `Renderer`, so the backdrop is redrawn each time; only the scaled-sprite cache and the soft layers persist.
- Each chamber gets its own tile size there, so browsing the list cycles sizes through the 8-size LRU.

**Sprite gallery** (`src/dev/sprite_gallery.ts`, development only), four sections built in `buildGallery` (593-602):
1. **Sprite cards** (`makeSpriteCard`, 309-349): each sprite's raw decoded file drawn 1:1 on a checkerboard (323-325), straight from `spriteOf(name)`, not through the scaling cache or the renderer.
2. **Specimens** (`buildSpecimens`, 525-544): both specimen runs played through the rules (`playSpecimen`, 382-394, which throws unless the subject ends carrying a box with both portals open), then `drawState` (402-412): a new `Renderer` per figure and `renderer.render(state)`.
3. **Join boards** (`buildJoins`, 549-568): `drawJoinBoard` (423-438) uses a bare `TilePainter`, `drawBackdrop(painter, state)`, and for ditches `ELEMENT_DRAWINGS.ditch(painter, state)`. No subject, no exit, no shadow pass. The boards are read without the layout checks (`joinBoardState`, 446-454).
4. **Chambers** (`buildChambers`, 573-588): every catalogue chamber's settled start at 40 px.
- **Sizes** (`gallerySizes`, 472-485): the smallest tile the home map draws in a 1920 × 1080 window (`menuMapTileSize`, 462-466, from a 632 × 474 box, lines 69, 72), then 40, 100 and 230 px (78-82); chambers at 40 (75).

**Gallery layouts** (`src/dev/gallery_layouts.ts`):
- **Specimen chamber** (`specimenData(on)`, 112-292): 10 × 8 tiles, every element, one antline from the switch to the fizzler. What it holds of the ten:

| # | Sprite | Where | "Everything on" | "Everything off" |
|---|--------|-------|-----------------|------------------|
| 1 | `arrow` | (1,1) up, (2,1) right, (1,2) down, (2,2) left | same | same |
| 2 | `turntable` + `turntable_arrow` | (3,2) | chevron up (own way) | chevron right (turned) |
| 3 | `button_pressed` | (5,1), under a box | same | same |
| 4 | `button_up` | (5,2) | same | same |
| 5 | `switch` | (5,6) | same | same |
| 6 | `ditch` / `ditch_bridged` | (2,5), (3,5) | open, joined as a run | both bridged |
| 7 | `box` | (5,1) on the button, (1,5) on the floor | same | same |
| 8 | `box_mirror` | (7,6), `\`, so turned a quarter turn | turning the ray | the ray is off |
| 9 | carried box | the plain box from (3,3) | in the subject's hands, facing left | same |

- **Runs:** `SPECIMEN_ON` (300-309) and `SPECIMEN_OFF` (317-326), five actions each, ending with the subject facing left, carrying the plain box, both portals open.
- **Not shown anywhere in the gallery:** a `/` mirror box; a carried mirror box (the carried one is plain); anything part way through a change (no time is given).
- **Join board** (`JOIN_BOARD`, 32-42; `joinBoardData`, 335-363): 17 × 9, drawn once as walls and once as open ditches: a lone tile, a horizontal run, a vertical run, an L, a diagonal of tiles touching at corners, a T, a cross, a solid 3 × 3 block and a ring, with floor all round.

**Render profile** (`src/dev/render_profile.ts`, development only):
- Chamber 3's settled start (`loadChamberThree`, 218-231), one `Renderer` (314), sized for a 1486 × 1014 stage (22, 25) at pixel ratios 1 and 2 (28-31).
- Redrawn every animation frame with `renderer.render(state, null, frameTime)` (249-251): a time is given, so glows pulse, but no transitions, pieces, falls, openings or turn objects are passed.
- Chamber 3 has, of the ten: 17 plain arrows, 2 plain boxes, 4 buttons, 1 switch, 39 ditches, no turnable arrow, no mirror box, no antlines (counted from `src/chambers/chamber_3.json`).


---

## Appendix 2. The sprites' shapes, what each chamber holds, and running the game outside the app

Written by a second fact-finding agent at the same commit, from the SVG sources, the exported files' headers, the chamber files and the game's loop code. Read-only: nothing was built or run. Its split between "carries meaning" and "neutral surface" (A.9) is its reading of the sprites' comments and of `docs/sprites.md`, not a stated rule. Its part C, on driving the game's `Level` from a page, follows from the code and was not tried.

### Part A: the shape of each sprite

Coordinates are sprite pixels on the 256 px tile: origin top left, y down, centre (128, 128). `r` is the distance from the centre. Every sprite is drawn "facing up" with light from straight overhead (`docs/sprites.md:23-24`).

#### A.0 Files

| # | Sprite | SVG width × height, viewBox | Exported file | Alpha | Painted bounds in the tile |
|---|--------|-----------------------------|---------------|-------|----------------------------|
| 1 | `arrow` | 256 × 256, `0 0 256 256` | 256 × 256 WebP | yes | x 51–205, y 81–175; rest transparent |
| 2 | `turntable_arrow` | 256 × 256, `0 0 256 256` | 256 × 256 | yes | x 62–194, y 88–168 |
| 3 | `turntable` | 256 × 256, `0 0 256 256` | 256 × 256 | yes | circle r 102: x and y 26–230 |
| 4 | `box` | 256 × 256, `0 0 256 256` | 256 × 256 | yes | x and y 54–202 (147 px square) |
| 5 | `box_mirror` | 256 × 256, `0 0 256 256` | 256 × 256 | yes | x and y 54–202 |
| 6 | `button_up` | 256 × 256, `0 0 140 140` | 256 × 256 | yes | x 19–237, y 18–237 |
| 7 | `button_pressed` | 256 × 256, `0 0 140 140` | 256 × 256 | yes | same |
| 8 | `switch` | 256 × 256, `0 0 140 140` | 256 × 256 | yes | same |
| 9 | `ditch_bridged` | 256 × 256, `0 0 256 256` | 256 × 256 | none, opaque | fills the tile |
| 10 | `ditch` | 1280 × 256, `0 0 1280 256` | 1280 × 256 | none, opaque | fills all five tiles |

Sizes and bounds were read from the exported files with `identify`. The three 140-unit sprites scale by 256/140 and then 0.85 about the centre, so one SVG unit is 1.5543 px.

#### A.1 `arrow.svg`
- One `polyline` (line 8): points (62,163), (128,103), (194,163); no fill; stroke `rgb(150, 153, 160)`, width 32, butt caps, miter join.
- Outline as a polygon: (51.2,151.2), (128,81.4), (204.8,151.2), (183.2,174.8), (128,124.6), (72.8,174.8).
- Each arm is 89.2 px long on its centre line; the angle at the tip is 95.5°.
- Flat colour. No gradient, filter or texture.

#### A.2 `turntable_arrow.svg`
- The same polyline scaled to 85 % about the centre (line 9): centre line (71.9,157.75), (128,106.75), (184.1,157.75); stroke 27.2.
- Outline: (62.8,147.7), (128,88.4), (193.2,147.7), (175.0,167.8), (128,125.1), (81.0,167.8).
- Its farthest point is r 68.2, so at every angle at least 23.8 px of disc shows between it and the disc's lip.
- Flat colour, same grey.

#### A.3 `turntable.svg`

| # | Part | Radii | Colour |
|---|------|-------|--------|
| 1 | Disc face | r 0–96 | `rgb(245, 246, 251)` under the texture; the exported centre averages about `rgb(231, 233, 237)` |
| 2 | Lit lip | r 92–95 (stroke 3 at r 93.5) | `rgb(253, 253, 255)`, untextured |
| 3 | Dark cut | r 96–102 (stroke 6 at r 99) | `rgb(132, 136, 147)`, untextured |

- Texture (lines 11-20), clipped to r 96: two `feTurbulence` fractal noise layers turned grey. Mottle: base frequency 0.012, 2 octaves, seed 23, alpha 0.07. Grain: base frequency 0.8, 2 octaves, seed 5, alpha 0.05.
- This is the floor's texture a little fainter: `art/sprites/floor.svg:10-19` uses the same frequencies at alpha 0.08 and 0.06 (seed 11 and 5, stitched). The floor's face is `rgb(239, 241, 248)` and exports at about `rgb(224, 226, 232)`.

#### A.4 `box.svg`
Everything is drawn in a group scaled to 80 % about the centre (line 37). Values below are after that scale. One quarter is drawn and turned three times about the centre.

| # | Part | Bounds | Colour |
|---|------|--------|--------|
| 1 | Outline | Outer edge at 54.4 and 201.6 round blocks and tabs; 57.4 and 198.6 in the eight gaps between a block and a tab. 4 px shows outside the plates; round joins | `rgb(44, 48, 54)` |
| 2 | Core | Square 61.4–194.6 (133.1 px). Shows only between the plates | `rgb(83, 83, 84)` |
| 3 | Corner blocks × 4 | Top left: 58.4–103.5 both ways (45.1 px), corner radius 1.1, inner corner cut along (102.7,83.0)–(83.0,102.7). Top right: x 152.5–197.6. Bottom ones: y 152.5–197.6 | `rgb(201, 198, 199)` |
| 4 | Tabs × 4 | 26.1 × 19.8 px. Top: x 115.0–141.0, y 58.4–78.2. Right: x 177.8–197.6, y 115.0–141.0. Bottom and left by symmetry | `rgb(168, 167, 167)` |
| 5 | Bars × 4 | 12.3 px wide. Top: x 121.8–134.2, drawn y 77.6–104.0, visible about y 78.2–98.5 between tab and disc | `rgb(98, 97, 98)` |
| 6 | Centre disc | Centre (128,128), r 29.7 | `rgb(201, 198, 199)` |

- The core shows as eight channels 11.4 px wide between each block and tab, and as a ring about 20 px wide between the disc and the blocks' cut corners.
- Flat fills only: a sampled patch of a block has zero variation.

#### A.5 `box_mirror.svg`
The box of A.4 without the centre disc, so each bar shows for its full 25.8 px. The mirror sits on top, turned 45° to run bottom left to top right (line 63).

| # | Part | Size | End points of its long axis | Colour |
|---|------|------|------------------------------|--------|
| 1 | Frame | 121.6 × 20.8 px, corner radius 4 | (85.0,171.0) to (171.0,85.0); corners (77.6,163.6), (163.6,77.6), (178.4,92.4), (92.4,178.4) | `rgb(44, 48, 54)` |
| 2 | Glass | 115.2 × 14.4 px, radius 2.4 | (87.3,168.7) to (168.7,87.3) | Gradient across its width |
| 3 | Glint | 108.8 × 2.4 px, radius 1.2 | (89.0,165.9) to (165.9,89.0), 0.8 px to the upper-left of the centre line | White at 90 % |

- Glass gradient (lines 35-39), across the width from the upper-left edge to the lower-right edge: `rgb(150, 158, 170)`, then `rgb(238, 242, 248)` at 45 %, then `rgb(176, 184, 196)`.
- The frame shows 3.2 px round the glass.
- The frame reaches 11 px into the top-right and bottom-left corner blocks, over the middle of their cut corners.
- For a `\` mirror the game turns the whole sprite a quarter turn clockwise (`src/game/element_drawings.ts:755`).

#### A.6 `button_up.svg`, `button_pressed.svg`, `switch.svg`
The three files are identical except for two colours on the dome (line 17 in the buttons, line 18 in the switch).

| # | Part | Bounds | Colour |
|---|------|--------|--------|
| 1 | Plate | White out to r 103.2 | `rgb(250, 250, 250)` |
| 2 | Plate's dark rim (the outer collar) | r 103.2–108.8, 5.6 px wide | `rgb(60, 60, 60)` |
| 3 | Dome (the plunger) | r 0–68.4 | See next table |
| 4 | Dome's rim | r 68.4–74.9, 6.5 px wide | See next table |
| 5 | Four clamps (the dark brackets) | One quadrilateral on each diagonal, listed below; stroke 3.2 px | Fill `rgb(64, 88, 86)`, stroke `rgb(41, 57, 66)` |

| # | File | Dome fill | Dome rim |
|---|------|-----------|----------|
| 1 | `button_up` | `rgb(150, 40, 34)` | `rgb(84, 18, 14)` |
| 2 | `button_pressed` | `rgb(220, 60, 50)` | `rgb(110, 26, 22)` |
| 3 | `switch` | `rgb(240, 192, 40)` | `rgb(112, 80, 10)` |

Clamp corners, inner edge first:

| # | Clamp | Corners |
|---|-------|---------|
| 1 | Top left | (51.2,83.8), (85.9,47.7), (43.9,21.4), (21.5,43.0) |
| 2 | Top right | (204.6,83.3), (169.9,47.2), (211.9,20.9), (234.3,42.5) |
| 3 | Bottom right | (204.7,172.6), (170.0,208.6), (212.0,234.9), (234.5,213.4) |
| 4 | Bottom left | (51.0,172.4), (85.7,208.5), (43.7,234.8), (21.3,213.2) |

- Each clamp's inner edge is 50 px long and comes within r 86 of the centre; its outer corners lie at r 136, past the plate's rim, in the tile's corners.
- The four clamps are not exact mirror images: their coordinates differ by up to about 0.5 px.
- White plate left in sight: a full ring r 74.9 to about 86 (11 px), plus four arcs r 74.9–103.2 (28.3 px) centred on up, right, down and left, each about ±28° to ±30° wide at the clamps' inner corners and ±32° to ±34° at the rim.
- Flat fills and strokes only.
- How the switch differs in the game: it is drawn raised, over the shared drop shadow, and the button is not (`src/game/sprite_set.ts:132-140`).

#### A.7 `ditch_bridged.svg`
Drawn bottom to top:

| # | Part | Bounds | Colour |
|---|------|--------|--------|
| 1 | Pit, showing in the gap round the plate | 0–12 on every side: 0–2 floor's edge, 2–5 lit rim, 5–12 top of the pit's side | `rgb(44, 46, 50)`, `rgb(186, 190, 197)`, then the gradient of A.8 |
| 2 | Plate's shadow | Square 9–247, radius 6 | Black at 50 % |
| 3 | Plate outline | Square 12–244, radius 4; drawn again as a 2 px line at 12–14 | `rgb(34, 36, 40)` |
| 4 | Plate face (the bars) | Square 14–242 | `rgb(122, 126, 133)` |
| 5 | Slots | 6 × 6 = 36 squares, 23 px, corner radius 5, pitch 32; first at 35, so 35–58, 67–90, 99–122, 131–154, 163–186, 195–218 | `rgb(30, 32, 35)` |
| 6 | Frame | Four mitred sides, 12–26 (14 px wide) | Gradient `rgb(112, 116, 123)` outside to `rgb(138, 142, 149)` inside, with a 2 px inner highlight at 24–26 in `rgb(168, 172, 179)` |

- Bars between slots are 9 px wide.
- Plate face between the frame and the slots: 9 px on the top and left (26–35), 12 px on the bottom and right (218–230).
- So the slot grid is centred on 126.5, not 128: it is 1.5 px off centre, although the file's comment says the plate is the same under every quarter turn. The game never turns this sprite.
- The grain filter covers only the pit, not the plate; the plate is flat colour.

#### A.8 `ditch.svg`
Five tiles, left to right (lines 90-118, `src/game/sprite_set.ts:21-27`):

| # | Tile | x range | Shows |
|---|------|---------|-------|
| 1 | Lone | 0–256 | A side on all four edges, mitred at 45°; bottom square 82–174 |
| 2 | Horizontal run | 256–512 | Sides along the top and the bottom |
| 3 | Vertical run | 512–768 | Sides along the left and the right |
| 4 | Inner corners | 768–1024 | An 82 px square in each corner where two sides meet on the diagonal |
| 5 | Solid | 1024–1280 | Pit bottom only |

One side, going down from the tile's edge (the "band", 82 px deep, lines 38-59):

| # | Depth | What | Colour |
|---|-------|------|--------|
| 1 | 0–2 | Floor's edge | `rgb(44, 46, 50)` |
| 2 | 2–5 | Lit rim | `rgb(186, 190, 197)` |
| 3 | 5–66 | The side, fading | `rgb(134, 138, 145)` at 5, `rgb(80, 83, 89)` at 26.4, `rgb(34, 36, 39)` at 47.7, `rgb(9, 10, 11)` at 66 |
| 4 | 24.0, 37.3, 46.6, 53.1, 57.7, 60.9, 63.1, 64.7 | Eight seams, thinning from 1.8 to 0.6 px, each with a lighter line under it | Black at 55 %; white fading from 13 % to 1.1 % |
| 5 | 66–82 | Shadow on the bottom | Black from 70 % to 0 |

- Pit bottom: `rgb(9, 10, 11)` with fine grain (fractal noise, base frequency 0.75, 2 octaves, seed 13, alpha 0.035, repeating every 128 px). It exports at about `rgb(12, 14, 16)`.
- The game never draws a whole strip tile. Each ditch tile is built from four 128 px quarters, each taken from the strip tile that matches its neighbours (`docs/sprites.md:57-81`, `src/game/element_drawings.ts:230`, `src/game/tile_painter.ts:420`). Details must stay off the 128 px midlines and the tile edges (`docs/sprites.md:75`).

#### A.9 Meaning and neutral surfaces

| # | Sprite | Carries meaning, keep clean | Neutral surfaces |
|---|--------|-----------------------------|------------------|
| 1 | `arrow` | The whole chevron: its tip and two arms give the one way in | Only the chevron's own paint; there is nothing else in the sprite |
| 2 | `turntable_arrow` | Same | Same |
| 3 | `turntable` | The dark cut and lit lip (r 92–102), which say "this turns". The disc is "the same all round" so it shows no direction (`docs/sprites.md:115`), and it is never turned | Disc face r 0–92; the band r 68–92 is never under the chevron |
| 4 | `box` | Its outline and silhouette (the shadow and the break-up pieces are made from the sprite's own pixels, `docs/sprites.md:25,159`); the centre disc sets it apart from a mirror box | Four corner blocks, four tabs, the disc r 29.7, the core channels |
| 5 | `box_mirror` | The mirror's frame, glass and glint: the diagonal says which way a ray turns | Four corner blocks (two partly under the frame), four tabs, four bars, the core |
| 6 | `button_up`, `button_pressed` | The dome and its rim, r 0–74.9. Red is the caution colour (`docs/sprites.md:33`), and up and pressed differ only in the dome's red, which must differ at a glance (`docs/sprites.md:26`) | The white plate ring and arcs r 74.9–103.2, and the four clamps |
| 7 | `switch` | The yellow dome and its rim: the only thing that sets it apart from a button | Same as the button |
| 8 | `ditch_bridged` | The slot grid and frame, which read as a walkable grate over a pit | Frame faces 12–26, bars 9 px, the plate band inside the frame |
| 9 | `ditch` | The lit rim, the fade and the crowding seams, which read as depth | The side between seams; the near-black bottom, where little would show |

Note: the switch's yellow `(240, 192, 40)` is close to a lit antline's amber `(250, 194, 44)` (`docs/sprites.md:38`).

#### A.10 How small the parts get
At the tile sizes the game uses (Part B), in screen pixels:

| # | Part | 40 px tile | 50 px | 63 px |
|---|------|-----------|-------|-------|
| 1 | Box, across | 23.0 | 28.7 | 36.2 |
| 2 | Box's centre disc, across | 9.3 | 11.6 | 14.6 |
| 3 | Mirror's frame, width | 3.2 | 4.1 | 5.1 |
| 4 | Mirror's glint, width | 0.38 | 0.47 | 0.59 |
| 5 | Button's dome, across | 21.4 | 26.7 | 33.6 |
| 6 | Button's white ring, width | 4.4 | 5.5 | 7.0 |
| 7 | Chevron's stroke (plain / on a turntable) | 5.0 / 4.2 | 6.2 / 5.3 | 7.9 / 6.7 |
| 8 | Turntable, across; its cut | 31.9; 0.94 | 39.8; 1.17 | 50.2; 1.48 |
| 9 | Grate slot; bar | 3.6; 1.4 | 4.5; 1.8 | 5.7; 2.2 |
| 10 | Ditch side; its lit rim | 12.8; 0.47 | 16.0; 0.59 | 20.2; 0.74 |

#### A.11 How the game draws these ten

| # | Sprite | Drawn by | When | Shadow |
|---|--------|----------|------|--------|
| 1 | `arrow` | `drawSprite`, turned to its way (`element_drawings.ts:367`) | Once, into the cached backdrop | No |
| 2 | `turntable` | `drawSprite`, never turned (`:419`) | Every frame | No |
| 3 | `turntable_arrow` | `drawSprite` at rest (`:424`), `drawSpriteRotated` by any angle while turning (`:422`) | Every frame | No |
| 4 | `ditch` | Four strip quarters (`:230`, `:572-575`) | Every frame | No |
| 5 | `ditch_bridged` | `drawSprite` (`:577`), or slid in from a side while switching (`:573`) | Every frame | No |
| 6 | `button_*` | `drawSprite` (`:691`) | Every frame | No |
| 7 | `switch` | `drawSprite` (`:721`) | Every frame | Yes |
| 8 | `box`, `box_mirror` | `drawSprite` at rest (`:773`); in pieces when it breaks up (`fizzle_particles.ts:215`); shrinking when it falls (`box_fall.ts:84`) | Every frame | Yes |

- A carried box is not drawn from its sprite at all: the subject's painted sprite shows a box, and a mirror box's mirror is marked over it with three strokes in code (`src/game/renderer.ts`, `drawCarriedMirror`).
- Every sprite is shrunk once per tile size and kept, for up to 8 tile sizes (`src/game/sprite_scaling.ts:30,199-212`). The shadow is made from the shrunk sprite's shape (`:140-161`).
- Boxes move, so a box's identity is its index (`state.boxX(i)`, `state.boxY(i)`, start tiles in `chamber.boxStarts`), not its tile. Placed elements have a fixed tile (`chamber.positionOf(kind, i)`).
- The existing wear takes its numbers from `chamberSeed(chamber)` and `tileNumber(seed, x, y, salt)` (`src/game/surface_noise.ts:52,97,110`), so a chamber is drawn the same every time at any tile size.


### Part B: census of the chambers

"Tile, shortcut" is the first mixer's formula, `floor(900 / max(16, width, height))`, which is wrong for chambers wider than they are tall. "Tile, game" is what the game computes for a 1920 × 1080 window at pixel ratio 1 (a stage of 1486 × 1014 px): `min(trunc(stage width / max(16, width)), trunc(stage height / max(16, height)))` (`src/game/tile_painter.ts`, with the 16 from `src/game/level.ts`). The author's own screen has a slightly shorter page (1920 × 966), where Chamber 1 comes out at 45 px.

| # | File | Size | Tile, shortcut | Tile, game | Plain arrows | Turnable arrows | Plain boxes | Mirror boxes | Buttons | Switches | Ditches | Bridged at start | Ditches a link reaches |
|---|------|------|---------------|-----------|-------------|-----------------|------------|-------------|---------|----------|---------|------------------|------------------------|
| 1 | `chamber_0.json` | 12 × 10 | 56 | 63 | 3 | 0 | 1 | 0 | 2 | 0 | 4 | 0 | 0 |
| 2 | `chamber_1.json` | 20 × 20 | 45 | 50 | 8 | 0 | 2 | 0 | 5 | 2 | 14 | 0 | 1 (a button) |
| 3 | `chamber_2.json` | 23 × 13 | 39 | 63 | 0 | 0 | 2 | 0 | 2 | 1 | 12 | 0 | 0 |
| 4 | `chamber_3.json` | 23 × 17 | 39 | 59 | 17 | 0 | 2 | 0 | 4 | 1 | 39 | 0 | 1 (a switch) |
| 5 | `chamber_4.json` | 13 × 9 | 56 | 63 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 |
| 6 | `chamber_5.json` | 9 × 13 | 56 | 63 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| 7 | `chamber_6.json` | 10 × 7 | 56 | 63 | 4 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| 8 | `chamber_7.json` | 10 × 9 | 56 | 63 | 1 | 1 | 1 | 0 | 2 | 0 | 0 | 0 | 0 |
| 9 | `chamber_8.json` | 9 × 7 | 56 | 63 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 10 | `chamber_9.json` | 9 × 7 | 56 | 63 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 11 | `src/dev/playground.json` | 15 × 15 | 56 | 63 | 3 | 1 | 3 | 1 (`\`) | 7 | 2 | 3 | 0 | 3 (one button) |

- **All seven kinds:** only the playground. No `chamber_N.json` has a mirror box, and none has all of arrow, turnable arrow, box, button, switch and ditch either (chamber 1 and 3 lack a turnable arrow; chamber 6 and 7 lack ditches).
- **Bridged at start:** no ditch has `blocked: false`, and no button that links a ditch starts with a box or the subject on it, so every ditch starts open. This is a static check of the files; the rules were not run.
- **Turnable arrows:** every arrow with a `turnedDirection` is also named by a link (a switch in chamber 6, a button in chamber 7 and in the playground). No file uses link groups.
- **Linked boxes:** chamber 1 has one box a switch sends back; the playground has three.
- **Home menu's map:** the same renderer draws each chamber smaller there, into a 632 × 474 px box with no 16-tile minimum (`src/dev/sprite_gallery.ts:69,72`, `src/game/chamber_preview.ts:24`): 23 px for chamber 1, 27 px for chambers 2 and 3, up to 67 px for chambers 8 and 9.

#### The gallery's layouts (`src/dev/gallery_layouts.ts`)

| # | Layout | Size | Tile, shortcut | Tile, game | Plain arrows | Turnable arrows | Plain boxes | Mirror boxes | Buttons | Switches | Ditches | Bridged at start | Ditches a link reaches |
|---|--------|------|---------------|-----------|-------------|-----------------|------------|-------------|---------|----------|---------|------------------|------------------------|
| 1 | Specimen, everything on (`SPECIMEN_ON`, line 300) | 10 × 8 | 56 | 63 | 4 | 1 | 3 | 1 (`\`) | 2 | 1 | 2 | 0 | 0 |
| 2 | Specimen, everything off (`SPECIMEN_OFF`, line 317) | 10 × 8 | 56 | 63 | 4 | 1 | 3 | 1 (`\`) | 2 | 1 | 2 | 2 | 0 |
| 3 | Join board with ditches (`joinBoardData('ditch')`, line 335) | 17 × 9 | 52 | 63 | 0 | 0 | 0 | 0 | 0 | 0 | 42 | 0 | 0 |

- The specimen shows all seven kinds. One button starts under a box, so it is drawn pressed; the other is up. In both runs the subject ends up carrying one of the plain boxes, so two plain boxes lie in the room.
- The turnable arrow is linked only in the "off" specimen (`links: on ? [] : [2]`, line 257).
- The gallery itself draws the specimen and the join board at the smallest menu-map tile and at 40, 100 and 230 px, and each chamber at 40 px (`src/dev/sprite_gallery.ts:75-81`), not at the sizes in the table.
- The join board fails the layout checks on purpose and is read without them (line 333).


### Part C: running the real game loop outside the app

#### C.1 `Level` (`src/game/level.ts`)

```ts
constructor(canvas: HTMLCanvasElement, bindings: KeyBindings, screenWidth: number, screenHeight: number)   // line 150
```

Public members, all a host page can use:

| # | Member | Line | What it does |
|---|--------|------|--------------|
| 1 | `load(chamberData: ChamberData): void` | 164 | Loads and settles the chamber, draws it, resets clock and counters. The first call starts the frame loop. Throws when the rules reject the chamber. Also used for reset |
| 2 | `paused` (get and set) | 209, 218 | While paused nothing updates and keydown is ignored; resuming forgets every key |
| 3 | `onCompleted: (() => void) \| null` | 111 | Called once per load when the chamber is completed; after a walk out of the exit, only once the subject is out of sight |
| 4 | `resize(screenWidth, screenHeight): void` | 307 | Refits the chamber and redraws |
| 5 | `dispose(): void` | 319 | Stops the frame loop and removes every listener, for good |
| 6 | `started`, `elapsedHundredths`, `moves`, `portalsPlaced` (getters) | 233, 242, 252, 260 | The clock and the counters |
| 7 | `createReplay(): ReplayData` | 272 | The run since the last load as a replay; throws when it does not replay the same way |
| 8 | `frameStats: FrameStats \| null` | 112 | Development timing; leave null |

- **There is no public way to hand `Level` an action or to read its state.** Presses come only from its private `Input`.
- **`Level` drives its own frame loop.** The first `load` calls `run()` (line 669), which runs one frame at once and then calls `requestAnimationFrame` every frame (line 722) until `dispose`. A frame that throws ends the loop.
- One press is taken per frame, and taking a press ends the step still being drawn at once (lines 433-441). Once the chamber is completed, waiting presses are dropped (line 431).
- It also listens to `visibilitychange` on `document` (line 154).

**Canvas sizing**
- `screenWidth` and `screenHeight` are the area available, in canvas pixels. The app passes page pixels times `devicePixelRatio` (`src/components/screens/chamber_screen.vue:426-429`).
- The painter sets only the canvas's `width` and `height` attributes, to tile size times the chamber's size (`src/game/tile_painter.ts:143-154`). Until the first `load` the canvas is 0 × 0 (`:108-109`).
- The page must set the CSS size itself: the app sets `style.width` and `style.height` to the canvas size divided by the pixel ratio (`chamber_screen.vue:103-106`), after `load` and after every `resize`.
- The app refits with a `ResizeObserver` on the stage and a `matchMedia('(resolution: …dppx)')` watcher (`chamber_screen.vue:112-141,446-448`).
- The constructor throws when the canvas has no 2D context.

**Sprites must be decoded before the first draw.** A sprite asked for before its file is decoded is remembered as "nothing" for that tile size (`src/game/sprite_scaling.ts:207-209`), and the backdrop is drawn once per chamber and tile size. The app's loading screen does this before Start; the dev pages `await loadSprites()` first (`src/dev/render_profile.ts:309`).

#### C.2 `Input` and the key bindings

- `Input` is created inside the `Level` constructor (`level.ts:153`). It adds `keyup`, `keydown` and `blur` listeners on `window`, bubbling phase (`src/game/input.ts:75-77`), and removes them in `dispose` (`:134-138`).
- There is no focus requirement on the canvas: any key event that reaches `window` counts. In an iframe, that iframe's window needs the keyboard.
- Keys are read by `event.code` (`:152`). It also reads `event.repeat`, `event.altKey`, `event.metaKey`, `event.ctrlKey` and `event.key`.
- It calls `preventDefault` on bound keys that have a browser default (arrows, Space and others, `:26-40,229-235`).
- The turn key is never queued, only read as held; `blur` forgets held keys (`:201-203`).

The bindings object is a plain `Record<GameKey, string>`, read once. The Default layout, literally (`src/game/key_bindings.ts:16-25`):

```ts
export const ARROW_KEY_BINDINGS: KeyBindings = {
  [GameKey.UP]: 'ArrowUp',
  [GameKey.DOWN]: 'ArrowDown',
  [GameKey.LEFT]: 'ArrowLeft',
  [GameKey.RIGHT]: 'ArrowRight',
  [GameKey.BLUE]: 'KeyA',
  [GameKey.ORANGE]: 'KeyD',
  [GameKey.INTERACT]: 'Space',
  [GameKey.TURN]: 'Shift',
}
```

- The game keys are `'up' | 'down' | 'left' | 'right' | 'blue' | 'orange' | 'interact' | 'turn'` (`src/game/game_key.ts:5`).
- `'Shift'` and `'Control'` stand for either side's key (`key_bindings.ts:35-40`).
- When the bindings are exactly this object's values, either Ctrl also turns (`input.ts:66-71`, `key_bindings.ts:32`).

#### C.3 Audio

| # | Module | What it creates | Who imports it |
|---|--------|-----------------|----------------|
| 1 | `src/game/audio_sources.ts` | `createAudioPlayer(url)` makes `new Audio(url)` with `preload = 'none'` (lines 15-23) | `sound.ts`, `music.ts`, and the app's preloader |
| 2 | `src/game/sound.ts` | 17 `Sound` objects as static fields, each with its own audio element, made when the module loads (lines 27-43); imports 17 `.mp3` files (lines 1-18) | `level.ts:24`, components, `services/settings.ts` |
| 3 | `src/game/music.ts` | 2 `Music` objects, made when the module loads (lines 54, 59); imports 2 `.mp3` files | Only `src/services/settings.ts` |

- **When no file was handed over:** nothing downloads until a sound first plays; then the element fetches its own address. A refused `play()` is swallowed (`sound.ts:66-68`). Only the app's preloader hands files over (`useAudioFile`, `src/services/asset_preloader.ts:141`).
- **`Level` plays sounds** for the events of every step and of the settled start on `load` (`level.ts:85-109,196,374-380`). It uses 15 of the 17: all but `MENU_BUTTON` and `START`.
- **Silent without stubbing:** `Sound.enabled = false` makes every `play()` return at once (`sound.ts:25,60-62`), so nothing downloads or plays. The 17 files are still bundled.
- **To keep the files out of the bundle:** alias `@/game/sound` to a stub that exports a `Sound` with those 15 static members, each with a `play()`. Aliasing only `@/game/audio_sources` is not enough, because `sound.ts` itself imports the `.mp3` files.
- `music.ts` is not reached from `Level`, so it needs no stub unless the entry imports `src/services/settings.ts`.
- Sizes: the 17 sounds total 218,860 bytes; the two music tracks 3,425,086 bytes.

#### C.4 Vite-specific and app-specific code in `src/game/`

| # | Where | What | What a library build must do |
|---|-------|------|------------------------------|
| 1 | `sprite_sources.ts:40-44` | `import.meta.glob('@/assets/images/chamber/*', {eager: true, import: 'default', query: '?url'})` | Build with Vite, with the `@` alias defined. A library build inlines the files as data URLs |
| 2 | `sprite_sources.ts:51` | `import.meta.env.DEV` | Replaced by Vite at build time |
| 3 | `sprite_sources.ts:178-190` | `loadSprites()` fetches each address, then `createImageBitmap` | Works when fetch of a data URL is allowed; the existing tool replaces it with a direct decode because its target page may not fetch |
| 4 | `sound.ts:1-18`, `music.ts:1-2` | `.mp3` imports as addresses | Inlined, or stubbed as in C.3 |
| 5 | Every file | The `@` alias for `src/` (`vite.config.ts:9`, `tsconfig.app.json`) | Define it |
| 6 | `level.ts:152,154`, `input.ts:75-77`, `tile_painter.ts:164`, `sprite_scaling.ts:49` | `window`, `document`, `requestAnimationFrame`, `performance`, `createImageBitmap`, `Audio` | Needs a browser |

- `src/game/` never imports Vue, the services, the components or the chamber files. The entry must import the chamber JSON (and any solution JSON) itself.
- Nothing in `src/game/` uses `localStorage` or `navigator`.
- The app's own Escape handling, pause dialogs, music and analytics live in `chamber_screen.vue`, outside `Level`.

#### C.5 Stepping a recorded solution

Shape of `src/chambers/chamber_N.solution.json` (`ReplayData`, `src/game/replay_data.ts:8-24`):

```json
{"chamberHash": "11e42850", "actions": ["left", "blue", "right", "…"], "expected": {"completed": true, "moves": 33, "portals": 6, "finalHash": "cc16917c"}}
```

- An action is one of `up`, `down`, `left`, `right`, `turnUp`, `turnDown`, `turnLeft`, `turnRight`, `blue`, `orange`, `interact` (`src/game/rules/action.ts:9-20`).
- Lengths: chamber 0 has 45 actions; chambers 1 to 3 have 260, 216 and 328; chambers 4 to 9 have 16, 15, 13, 29, 19 and 18. The playground has no solution.

The rules, which need no browser:

```ts
loadChamber(data: unknown): {chamber: ChamberData | null, problems}       // src/game/rules/load_chamber.ts:39
new CompiledChamber(chamber)                                              // src/game/rules/compiled_chamber.ts:228
startChamber(chamber: CompiledChamber): StepResult                        // src/game/rules/step.ts:855
step(chamber: CompiledChamber, state: RulesState, action: Action): StepResult   // src/game/rules/step.ts:901
type StepResult = {state: RulesState, events: readonly GameEvent[], path: readonly SlideLeg[]}   // :41-45
runRulesReplay(chamber, actions): {completed, moves, portals, finalState, states, stepHashes}    // src/game/rules/replay_runner.ts:28
```

- `step` returns the same state object when nothing changed; `path` is empty unless the subject slid.
- `runRulesReplay(...).states` is the settled start, then the state after each action.

Drawing a step over time, as `Level` does it:

```ts
// src/game/step_animation.ts:172
start(from: RulesState, to: RulesState, events: readonly GameEvent[], path: readonly SlideLeg[], walkOut: Direction | null, time: number): void
// src/game/renderer.ts:581
render(state, transition = null, time = null, fizzle = null, changes = null, ripple = null, fall = null, openings = null, turn = null): void
```

1. Create once: `new Renderer(canvas, w, h, minimumTiles)` and `setSize(width, height)` (`renderer.ts:271,290`), plus `new StepAnimation()`, `FizzleParticles`, `ElementTransitions`, `MissRipple`, `BoxFall`, `PortalOpenings` and `SubjectTurn` (`level.ts:124-130`).
2. For each action: `result = step(chamber, state, action)`. If `result.state !== state`, call `animation.start(state, result.state, result.events, result.path, walkOut, time)` (`level.ts:504-506`).
3. Start the side effects for that step (`level.ts:610-635`): `changes.start(before, after, time)`; `fizzle.start(before, after, events, time, joining)` on a fizzle or a destroyed box; `fall.start(before, after, events, time)` on a destroyed box; `openings.start(after, events, time)` on a portal opened; `ripple.start(after, colour, time)` on a refused shot. `SubjectTurn` needs no start.
4. Every frame: `renderer.render(state, animation.transitionAt(time), time, fizzle, changes, ripple, fall, openings, turn)` (`level.ts:344`), where `state` is the state after the step and `time` is the frame's `requestAnimationFrame` time.

- `transitionAt(time)` returns a `StepTransition` (`from`, `to`, `events`, `path`, `progress`, `walkOut`, `beyond`; `step_animation.ts:12-20`) or null once the step is over.
- The renderer uses the transition only when its `to` is the very state passed (`renderer.ts:587`, `subject_pose.ts:50`).
- Passing `null` for `time` holds everything still; every parameter after `state` is optional.
- `walkOut` is the way out of the chamber for the step that completes it, or null. `Level` works it out in a private method (`level.ts:528-540`) from `exitOuterSide(chamber)` (`src/game/exit_shadow.ts:22`). Null is accepted and draws the last step like any other.
- Timing: a plain step takes 120 ms; a slide 60 ms per tile; a walk out 180 ms per tile (`step_animation.ts:37,40,43`).
- A slide's sounds and effects are held back tile by tile in `Level` (`level.ts:550-592`); a standalone replay that wants this has to copy it.

Simplest still-frame path: `new Renderer(canvas, tile * width, tile * height)`, `setSize`, then `render(state)` for any state along the replay (`src/game/chamber_preview.ts:16-27`).

#### C.6 Driving `Level` itself from a script
Not a tested path. From the code: dispatching `new KeyboardEvent('keydown', {code: 'ArrowUp'})` on `window` queues a press, and presses queue in order. A turn action needs a `ShiftLeft` keydown before the arrow and a keyup after. Because each press taken ends the step being drawn, a watchable replay must space them out by more than a step's 120 ms (longer for slides).

#### C.8 Reduced motion
- Read in one place in the game: `window.matchMedia('(prefers-reduced-motion: reduce)')` in the `Level` constructor (`level.ts:152`), kept as a `MediaQueryList`.
- Its `.matches` is read each time it matters: when drawing (line 344, passing `null` as the time), when a step would be drawn over time (line 491), before starting any effect (line 611), and when deciding whether to draw every frame (line 712).
- The renderer never reads the setting itself; a `null` time is how it is told to hold still.
- The only other uses are CSS rules (`src/assets/styles.css:342`, `src/components/screens/home_screen.vue:1273`).
