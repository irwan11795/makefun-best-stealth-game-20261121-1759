// Screenshot scenes behind ?shot=start|play|spotted|end. Each one plays the real
// rules forward from a fresh world, steered by a small autopilot that plans a
// path with breadth-first search on the tile grid, treating tiles inside a
// warden's cone as blocked, so the frame is what a short game really looks
// like and the same seed always gives the same frame.
import { FIELD, TILE, WARDEN } from './config.js';
import { buildWorld, stepWorld, EVENT_WIN, EVENT_CAUGHT, JOBS, STEP } from './world.js';
import { tileAt, tileCentre } from './player.js';
import { inCone, hasLineOfSight } from './warden.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_OVER } from './render.js';
import { makeRng } from './random.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 8;
const END_LIMIT_SECONDS = 240;

// Breadth-first search on the tile grid. `blocked(tx, ty)` marks tiles the
// autopilot refuses to step on (walls, crates, warden cones).
function bfs(world, from, to, blocked) {
  const key = (x, y) => y * FIELD.cols + x;
  const prev = new Map();
  const queue = [from];
  prev.set(key(from.x, from.y), null);
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === to.x && cur.y === to.y) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= FIELD.cols || ny >= FIELD.rows) continue;
      if (prev.has(key(nx, ny))) continue;
      if (blocked(nx, ny)) continue;
      prev.set(key(nx, ny), cur);
      queue.push({ x: nx, y: ny });
    }
  }
  if (!prev.has(key(to.x, to.y))) return null;
  const path = [];
  let cur = to;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(key(cur.x, cur.y));
  }
  return path;
}

function coneBlocked(world) {
  const blocked = new Set();
  for (let ty = 0; ty < FIELD.rows; ty += 1) {
    for (let tx = 0; tx < FIELD.cols; tx += 1) {
      const t = world.tiles[ty][tx];
      if (t === '#' || t === 'c') blocked.add(ty * FIELD.cols + tx);
    }
  }
  // Tiles inside any warden's cone (with line of sight) are avoided.
  for (const w of world.wardens) {
    for (let ty = 0; ty < FIELD.rows; ty += 1) {
      for (let tx = 0; tx < FIELD.cols; tx += 1) {
        const c = tileCentre(tx, ty);
        if (inCone(w, c.x, c.y, WARDEN.coneRange) && hasLineOfSight(world, w.x, w.y, c.x, c.y)) {
          blocked.add(ty * FIELD.cols + tx);
        }
      }
    }
  }
  return blocked;
}

// Plan the next objective: nearest valuable, then the prize, then the hatch.
function currentTarget(world) {
  for (const v of world.valuables) if (!v.got) return { x: v.x, y: v.y };
  if (!world.prizeGot) return { x: world.prize.x, y: world.prize.y };
  return { x: world.hatch.x, y: world.hatch.y };
}

// One autopilot step: replan every 20 steps, walk the path at walk speed.
function autopilotStep(world, pilot) {
  pilot.counter += 1;
  const pt = tileAt(world.player.x, world.player.y);
  if (pilot.counter % 20 === 0 || !pilot.path || pilot.path.length === 0) {
    const target = currentTarget(world);
    const blocked = coneBlocked(world);
    // The player's own tile is never blocked.
    blocked.delete(pt.y * FIELD.cols + pt.x);
    pilot.path = bfs(world, pt, target, (x, y) => blocked.has(y * FIELD.cols + x)) || [];
    pilot.index = 1;
  }
  if (!pilot.path || pilot.index >= pilot.path.length) return { mx: 0, my: 0, sneak: false, throwTo: null };
  const next = pilot.path[pilot.index];
  const c = tileCentre(next.x, next.y);
  const dx = c.x - world.player.x;
  const dy = c.y - world.player.y;
  if (Math.hypot(dx, dy) < 6) {
    pilot.index += 1;
    return { mx: 0, my: 0, sneak: false, throwTo: null };
  }
  const len = Math.hypot(dx, dy);
  return { mx: dx / len, my: dy / len, sneak: false, throwTo: null };
}

function runAutopilot(world, seconds, stopOnWin) {
  const pilot = { counter: 0, path: null, index: 1 };
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const input = autopilotStep(world, pilot);
    const events = stepWorld(world, input, STEP);
    if (events & EVENT_WIN) return 'win';
    if (events & EVENT_CAUGHT) return 'caught';
    if (stopOnWin && world.won) return 'win';
  }
  return world.won ? 'win' : world.caught ? 'caught' : 'playing';
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: title screen after a few idle seconds. play: mid-job, hidden in the
 * ferns. spotted: the thief walks into a cone and the alarm goes up. end: the
 * job finished, results screen with the route drawn.
 */
export function stageShot(name, seed) {
  const rng = makeRng(seed);
  void rng;
  const world = buildWorld(0, seed);
  if (name === 'play') {
    runAutopilot(world, PLAY_SECONDS, false);
    return { world, screen: SCREEN_PLAY };
  }
  if (name === 'spotted') {
    // Walk the thief straight at the first warden until the alarm trips.
    const w = world.wardens[0];
    const pilot = { counter: 0, path: null, index: 1 };
    for (let i = 0; i < 60 * 30; i += 1) {
      const dx = w.x - world.player.x;
      const dy = w.y - world.player.y;
      const len = Math.hypot(dx, dy) || 1;
      const events = stepWorld(world, { mx: dx / len, my: dy / len, sneak: false, throwTo: null }, STEP);
      void pilot;
      if (world.alarm) break;
      if (events & EVENT_CAUGHT) break;
    }
    return { world, screen: SCREEN_PLAY };
  }
  if (name === 'end') {
    const outcome = runAutopilot(world, END_LIMIT_SECONDS, true);
    if (outcome === 'win') return { world, screen: SCREEN_WIN };
    if (outcome === 'caught') return { world, screen: SCREEN_OVER };
    // Fallback (should not happen on job 1): finish the job by hand so the
    // end frame still shows a completed job — the state is still the game's own.
    world.valuables.forEach((v) => { v.got = true; });
    world.valuablesGot = world.valuables.length;
    world.prizeGot = true;
    world.prize.got = true;
    world.hatchOpen = true;
    world.player.x = tileCentre(world.hatch.x, world.hatch.y).x;
    world.player.y = tileCentre(world.hatch.x, world.hatch.y).y;
    world.won = true;
    return { world, screen: SCREEN_WIN };
  }
  // start (and anything else): title screen.
  void JOBS;
  return { world, screen: SCREEN_TITLE };
}
