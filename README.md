# The Gilded Hour — a museum heist

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/rank/0xjouje-ai/makefun-velvet-vault.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/reward/0xjouje-ai/makefun-velvet-vault.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

An entry for the [make.fun "Make the best heist game" bounty](https://make.fun/bounty/best-heist-game-20261122-0559).

**The Gilded Hour** is a top-down stealth heist set in the Meridian Museum
after closing time. You are Wren, a cat burglar with one job: lift the
Meridian Star sapphire from its glass case and slip out the service door
before the museum wakes up.

## How it plays

- **Three wings, several routes** — the west and east galleries connect to
  the central hall through two doorways each, so every approach can be
  flanked, and display cases, pillars and velvet ropes give cover.
- **Guards with vision cones** — Marlow, Petra and Okafor walk patrol loops.
  Their yellow cones sweep the floor; step into one and the alarm climbs,
  get too close and they chase. A cone's edge only makes them suspicious —
  they come to look, then go back to their round.
- **Cameras** — two wall cameras sweep the central hall and feed the alarm
  fast. Hold **F** at the security panel to hack them dark for 12 seconds.
- **Tools at a cost** — toss a **coin** (E / right-click) to pull a guard
  away to investigate the clink, or pop a **smoke pellet** (Q) to vanish
  inside a cloud. Both are limited, so spend them where they count.
- **The alarm meter** — rises while anyone has eyes on you, drains while
  you stay hidden. At 100% the museum locks down: doors seal and every
  guard converges on you.
- **The job** — hold **F** at the Star's case to pick the lock (2.4 s),
  pocket side loot on the way (paintings, coin trays, a celadon vase), then
  reach the green service door. Get caught and the night is over.

## Controls

| Key | Action |
| --- | ------ |
| WASD / arrows | Move |
| Shift | Sneak (slower, harder to spot) |
| E / right-click | Toss a coin toward the mouse |
| Q | Smoke pellet |
| F (hold) | Pick the Star's case / hack the security panel |
| M | Mute |
| R | Restart after being caught or escaping |
| Enter / click | Start from the title screen |

## Run it

No build step, no network request — every file the game loads sits under
`game/`. Serve it with any static server:

```sh
node serve.ts
# then open http://localhost:8080
```

Or open `game/index.html` through any static file server. All art is drawn
on canvas and all sound is synthesised with WebAudio — original work, no
assets copied from anywhere.

## Layout

- `game/index.html` — the page and its canvas
- `game/src/config.js` — tuning and the museum floor plan
- `game/src/vision.js` — line of sight and vision-cone math
- `game/src/level.js` — the floor as live objects, collision, sight
- `game/src/guards.js` — guard patrol / suspicion / chase AI
- `game/src/cameras.js` — sweeping wall cameras
- `game/src/player.js` — the thief: movement, tools, lockpicking
- `game/src/render.js` — all canvas drawing, HUD and screens
- `game/src/game.js` — the state machine: alarm, lockdown, win/lose
- `game/src/audio.js` — synthesised sound effects and ambient music
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — staged states for screenshots (`?shot=`)
- `game/src/main.js` — bootstrap and game loop
- `main.ts` — the make.fun hand-in program
- `serve.ts` — tiny static server for local play

## License

MIT — see [LICENSE](LICENSE).
