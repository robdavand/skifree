# SkiFree.js

What started as an attempt at a single-file HTML5 canvas clone of the classic 1991 Windows game *SkiFree* turned into a low effort knockoff. Ski down an endless mountain, dodge obstacles, catch air off ramps for style points. Watch out for the yeti or become it.

The whole game lives in [index.html](index.html): no build step, no dependencies, just an inline `<script>` driving a `<canvas>`. The only other file is a test for the bits that persist ([see below](#tests)).

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
- The descent has a shape. The top of the hill is open and generous with ramps; by ~2500 m it's a forest with the occasional jump in it, roughly four times as many obstacles to dodge per 100 m. It's never impassable — there's always a lane — you just have to commit to one far more often.
- Everyone skis the *same* mountain: terrain comes from a hash of each cell's coordinates rather than `Math.random()`, so a leaderboard row is a comparison of two runs down identical ground, and a hill you've skied before is one you can learn.
- Hitting an obstacle crashes you (crossed skis, brief invincibility on recovery); hitting a ramp launches you airborne for style points.
- Distance, speed, and style are tracked live in the HUD.
- Past 2000 m, a yeti spawns and gives chase. Outrun it or it catches and eats you, ending the run.
- Sound effects (crash, jump, land, yeti roar, yeti munch) are synthesized live via the Web Audio API — no audio files.

## Tech notes

- Renders to an off-screen low-res buffer (320×240) that's scaled onto the visible canvas for a crisp pixel-art look (`image-rendering: pixelated`). The canvas resizes to fit the viewport (capped at 2x device pixel ratio), so it fills the screen on both desktop and mobile.
- World generation hangs off a grid of cells, spawned and culled on the fly as the camera moves. Each cell's contents are drawn from a hash of its coordinates, so the world is deterministic without having to be stored; depth sets the density and the mix of what grows there, and a second coarse hash lays down regions — glades and thickets — so the slope has local texture instead of an even sprinkle of noise.
- Menus are drawn in the same two passes as the HUD: boxes and sprites onto the low-res buffer,
  text straight onto the full-resolution canvas. Every widget is pushed onto one hit list in
  focus order, so clicking, hovering and arrow-key navigation all read the same layout.
- Input is action-based (`left`, `right`, `down`, `up`, `turbo`) rather than key-based, which is
  what lets the controls screen rebind keys and the touch buttons feed the same code path.
- `window.GAME` exposes the player, yeti, obstacles, game state, style score, key bindings,
  leaderboard and the current menu hit list for debugging in the browser console.

## Tests

Two scripts, no dependencies, nothing to install. Both read the real `<script>` out of
`index.html` and boot it in node, stubbing only the DOM around the game and never the game itself —
so they go stale the moment `index.html` does, which is the point of reading it rather than a
fixture.

```bash
node storage-test.js
node terrain-test.js
```

**`storage-test.js`** — your leaderboard, key bindings and character live in `localStorage`, where
a typo in a key name or a shape that doesn't survive `JSON.parse` would quietly lose someone's
scores. Covers a cold start, the migration from the old single-best values, the write/reload round
trip, the five-row cap and sort order, rebinding (including a clash swapping two keys), junk in
every stored key, and storage that throws on every call — Safari's private mode, and any page
opened from a `data:` URL, where the game has to keep running with nothing saved.

**`terrain-test.js`** — the difficulty curve only exists across thousands of cells, so it can't be
seen in one frame and would flatten unnoticed. Pins that the hill thickens with depth and that its
mix shifts from ramps to trees, that the curve tops out instead of running away, that glades and
thickets stay distinct, that two sessions grow identical terrain, and both halves of what
"harder" means here: roughly four times as much to dodge per 100 m, while a lane wide enough for a
skier still exists at every depth sampled — including 10 km down.
