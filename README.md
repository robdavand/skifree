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

## Menu

The title screen is a real menu: **Play**, **Character**, **Leaderboard**, **Controls** and a music
toggle. Click the buttons, or move the highlight with `↑` `↓` and press `Enter`.

- **Character** — skis, snowboard or yeti, shown as live portraits drawn by the game's own sprite
  code. The one you're on is highlighted, and named on the main menu.
- **Leaderboard** — the top five downhill runs and the top five hunts on this device, kept in
  `localStorage`. The row a run just earned is picked out in green.
- **Controls** — every key can be remapped: pick a row, press the key you want. `Arrow keys` and
  `WASD` presets are one click away. Binding a key that's already taken swaps the two.

## Controls

| Key | Action |
|---|---|
| `←` / `→` | Steer left / right |
| `↓` | Point straight downhill |
| `↑` / `↓` | Flip, while airborne |
| `F` (hold) | Turbo speed boost |
| `Esc` | Pause / resume |
| `M` | Music on / off |
| `Q` | Quit to the menu (while paused) |
| `Space` / `R` | Restart after a crash |

The first five are defaults — remap them from **Controls** on the main menu. `Esc`, `M` and `Q`
are fixed.

On touch devices, on-screen buttons appear automatically while you're skiing: left/down/right to
steer, and a red **F** button to hold for turbo. The menus are tapped directly, so the pad stays
out of the way until a run starts.

## Gameplay

- The mountain is procedurally generated as you descend, with trees, dead trees, rocks, stumps, and jump ramps scattered across the slope.
- Hitting an obstacle crashes you (crossed skis, brief invincibility on recovery); hitting a ramp launches you airborne for style points.
- Distance, speed, and style are tracked live in the HUD.
- Past 2000 m, a yeti spawns and gives chase. Outrun it or it catches and eats you, ending the run.
- Sound effects (crash, jump, land, yeti roar, yeti munch) are synthesized live via the Web Audio API — no audio files.

## Tech notes

- Renders to an off-screen low-res buffer (320×240) that's scaled onto the visible canvas for a crisp pixel-art look (`image-rendering: pixelated`). The canvas resizes to fit the viewport (capped at 2x device pixel ratio), so it fills the screen on both desktop and mobile.
- World generation uses a deterministic hash over a grid of cells so terrain around the player is spawned/culled on the fly as the camera moves.
- Menus are drawn in the same two passes as the HUD: boxes and sprites onto the low-res buffer,
  text straight onto the full-resolution canvas. Every widget is pushed onto one hit list in
  focus order, so clicking, hovering and arrow-key navigation all read the same layout.
- Input is action-based (`left`, `right`, `down`, `up`, `turbo`) rather than key-based, which is
  what lets the controls screen rebind keys and the touch buttons feed the same code path.
- `window.GAME` exposes the player, yeti, obstacles, game state, style score, key bindings,
  leaderboard and the current menu hit list for debugging in the browser console.
