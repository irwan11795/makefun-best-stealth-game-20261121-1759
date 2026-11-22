# NIGHTHOLD — a top-down stealth game

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/irwan11795/makefun-best-stealth-game-20261121-1759/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/irwan11795/makefun-best-stealth-game-20261121-1759/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

You are Wren, a thief who was never there. Sneak past the wardens, lift the
prize, and slip out the exit hatch unseen — across three jobs that get
meaner as the night goes on.

## How to play

- **WASD / arrows** — move. **Shift** — sneak (slow, quiet, harder to spot).
- **Mouse aim, click** — throw a pebble. Wardens walk over to investigate
  the noise; pebbles are limited, spend them well.
- **Tall grass** hides you unless a warden gets close. **Crates and walls**
  block a warden's sight. **Lamplight** lets wardens see you from afar.
  **Creaky boards** are loud even when you sneak.
- Grab the **valuables** and the **prize** — the hatch opens only once you
  hold the prize. Reach it to finish the job.
- A warden who half-sees you gets suspicious (**?**) and comes to look. A
  warden who sees you clearly raises the alarm (**!**) and every warden
  hunts you — break their line of sight and stay hidden until it dies down.
  If one catches you during the alarm, the job is over.
- **H** field notes · **M** mute · **Esc** pause · **R** restart the job.

## Jobs

1. **The Chandler's Walk** — one warden, the Gilded Seal. Learn the ropes.
2. **The Orchid House** — two wardens, the Moonpetal Orchid, ferns and lamps.
3. **The Horologist's Vault** — three wardens, the Brass Meridian, creaking floors.

Finish a job unseen for a **GHOST** stamp, and earn medals for never being
spotted, taking every valuable, and beating the par time. The results screen
draws the route you took, step by step.

## Build

Pure static files under `game/` — vanilla JavaScript ES modules, canvas 2D,
no libraries, no network requests, all sound synthesised with WebAudio.
`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json`.

```sh
node serve.ts            # play at http://localhost:8080
MAKEFUN_OUTPUT_DIR=out node main.ts   # build the entry into out/
```

Screenshots are deterministic renders of the game's own code:
`?shot=start|play|spotted|end&seed=1` (see `shots.json`).
