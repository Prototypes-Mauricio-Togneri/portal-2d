# Performance

The checks that the chamber drawing holds 60 fps, kept from stages 03 and 04a's notes when their files were removed. To run the render profile again, open `/src/dev/render_profile.html` in `npm run dev`, with the window in front (a covered or minimized window slows its frames, and the page then says its numbers are not valid).

## Profiling baseline (2026-11-09)

Stage 03's "Profile first" step: chamber 3 (23 × 17, the largest canvas and the most elements), its settled start redrawn every frame, sized as the chamber screen sizes it in a 1920 × 1080 window. Chrome 155 on Linux, Intel UHD Graphics 620 (Mesa, through ANGLE), 8 cores, a 59.9 Hz display at pixel ratio 1, so ratio 2 is simulated by the canvas size (drawn at twice the size and shown at half). Median of 3 runs of 600 frames each, the range in brackets where runs differed:

| # | Pixel ratio | Canvas | Draw time median / p95 / max | Frame interval median / p95 | Frames skipping a refresh |
|---|---|---|---|---|---|
| 1 | 1 | 1357 × 1003 | 0.5 / 0.7 / 1.0 ms (max 0.9–2.0) | 16.7 / 16.7 ms (p95 16.7–16.8) | 0 |
| 2 | 2 | 2737 × 2023 | 0.5 / 0.7 / 1.0 ms (p95 0.7–0.8, max 0.9–1.1) | 16.7 / 16.8 ms | 0 |

Both ratios hold 60 fps with a wide margin: drawing takes about 3 % of a frame, and no frame missed a refresh. About a quarter (ratio 1) to half (ratio 2) of the intervals read 16.8 ms instead of 16.7, which is timer rounding at a 59.9 Hz display, not a dropped frame. Draw time is what the canvas calls take on the main thread; the GPU's share shows only in the frame interval. The page draws on a plain background, while the chamber screen draws over a blurred photo beside the rail, so the real screen may cost more; recheck it there once the animation layer draws every frame.

## Real-screen recheck (2026-11-10)

Stage 03's "Animation layer" step: chamber 3 on the chamber screen itself (over the blurred photo, beside the rail), same machine and display, in a maximized window with a 1920 × 910 page area, at pixel ratio 1. Left and Right presses, alternating every 50 ms for 10 s, kept a step animating, so the level drew on nearly every frame. Time per frame is everything the main thread runs in a frame, the level's frame and the screen's timer together. Median of 3 runs of about 600 frames each, the range in brackets where runs differed:

| # | Pixel ratio | Canvas | Time per frame median / p95 / max | Frame interval median / p95 | Frames skipping a refresh |
|---|---|---|---|---|---|
| 1 | 1 | 1127 × 833 | 0.6 / 0.9 / 1.0 ms (median 0.6–0.7, max 1.0–1.2) | 16.7 / 16.7 ms (p95 16.7–16.8) | 0 |

Drawing every frame on the real screen still takes about 4 % of a frame, and no frame missed a refresh.

## Depth and ambient life check (2026-11-13)

Stage 03's "Depth" and "Ambient life" steps: same machine and display, with every sprite still a placeholder plus three temporary glow files (the laser's and both portals', 384 px, removed afterwards), since a glow with no file isn't drawn. First the render profile: chamber 3's settled start, its backdrop copied, its ten laser tiles glowing and its two fizzlers shimmering (a shimmer since removed), every frame. Median of 3 runs of 600 frames each, the range in brackets where runs differed:

| # | Pixel ratio | Canvas | Draw time median / p95 / max | Frame interval median / p95 | Frames skipping a refresh |
|---|---|---|---|---|---|
| 1 | 1 | 1357 × 1003 | 0.8 / 1.2 / 1.7 ms (max 1.6–4.8) | 16.7 / 16.7 ms (p95 16.7–16.8) | 0 |
| 2 | 2 | 2737 × 2023 | 0.8 / 1.3 / 2.1 ms (p95 1.2–1.3, max 1.6–3.0) | 16.7 / 16.7 ms (p95 16.7–16.8) | 0 |

Then chamber 3 on the chamber screen at pixel ratio 2, both portals open, so the level drew every frame for the glows and the shimmer alone. The page's `devicePixelRatio` was made to read 2 before the chamber opened, so the canvas was drawn at twice its size and shown at half, as on a dense screen (maximized window, 1920 × 910 page area). Time per frame is everything the main thread runs in a frame, as in the recheck above. Median of 3 runs of 659 frames each:

| # | Pixel ratio | Canvas | Time per frame median / p95 / max | Frame interval median / p95 | Frames skipping a refresh |
|---|---|---|---|---|---|
| 1 | 2 | 2277 × 1683 | 1.0 / 1.6 / 2.2 ms (p95 1.5–1.6, max 2.0–2.6) | 16.7 / 16.7 ms (p95 16.7–16.8) | 0 |

Every effect so far takes about 6 % of a frame at pixel ratio 2, and no frame missed a refresh, so the renderer stays on the 2D canvas (stage 03's renderer go/no-go point). With the page's reduced-motion query made to match, chamber 3 with its lasers and fizzlers on and a portal open drew nothing over 3 idle seconds, and a move drew one frame, with no glide. A first try, with the browser window behind another, ran idle frames at 30 Hz and drawn ones at 20 Hz; the render profile took that run as valid, since it only rejects idle frames slower than 50 ms.

## High-DPI check (2026-11-13)

Stage 03's "Check high-DPI again" step: Chrome at 200 % zoom on the same 1080p screen, so a pixel ratio of 2 and a 960 × 455 page. Each canvas's size in device pixels, as Chrome reports it (`devicePixelContentBoxSize`), matched its own pixels exactly, so every canvas pixel lands on one screen pixel: chamber 3 at 1035 × 765 (45 px tiles), and the home menu's map. Seen at full resolution, the walls with their bevels and shadows, the subject at rest and part way through a glide, and the pieces of a fizzle are all sharp. Zooming back to 100 % with chamber 3 open refit it at once, without a reload, to 1127 × 833, again one to one. At 200 % the page is too small for the home menu's map, which draws only 12 × 10 pixels; a real high-DPI screen gives it far more room. Sprites are only enlarged past their 256 px for the tutorial on a 6K-class screen (an estimate from the stage's margins: 434 page pixels across and 66 down). The author accepted 200 % zoom in place of a real high-DPI screen.
