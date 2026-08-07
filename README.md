# SkiFree.js

A single-file HTML5 canvas clone of the classic 1991 Windows game *SkiFree*. Ski down an endless mountain, dodge obstacles, catch air off ramps for style points — and watch out for the yeti.

Everything lives in [index.html](index.html): no build step, no dependencies, just an inline `<script>` driving a `<canvas>`.

**Play it here: https://robdavand.github.io/skifree/**

## Play

Open `index.html` directly in a browser, or serve the directory locally:

```bash
npx serve -l 4173 .
```

Then visit `http://localhost:4173`.

## Controls

| Key | Action |
|---|---|
| `←` / `→` | Steer left / right |
| `↓` | Point straight downhill |
| `F` (hold) | Turbo speed boost |
| Any key | Start from the title screen |
| `Space` / `R` | Restart after a crash |

## Gameplay

- The mountain is procedurally generated as you descend, with trees, dead trees, rocks, stumps, and jump ramps scattered across the slope.
- Hitting an obstacle crashes you (crossed skis, brief invincibility on recovery); hitting a ramp launches you airborne for style points.
- Distance, speed, and style are tracked live in the HUD.
- Past 2000 m, a yeti spawns and gives chase. Outrun it or it catches and eats you, ending the run.
- Sound effects (crash, jump, land, yeti roar, yeti munch) are synthesized live via the Web Audio API — no audio files.

## Tech notes

- Renders to an off-screen low-res buffer (320×240) that's scaled 3x onto the visible canvas for a crisp pixel-art look (`image-rendering: pixelated`).
- World generation uses a deterministic hash over a grid of cells so terrain around the player is spawned/culled on the fly as the camera moves.
- `window.GAME` exposes the player, yeti, obstacles, game state, and style score for debugging in the browser console.
