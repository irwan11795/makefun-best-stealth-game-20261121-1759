// NIGHTHOLD — the jobs and the rules that run them.
// Map letters: # wall · . floor · g tall grass · c crate · l lamplight floor
// · b creaky boards · v valuable · P the prize · E exit hatch · S start.
// Every row is 30 tiles wide; the world builder checks that on load.
import { FIELD, TILE, PLAYER, WARDEN, LAMP, CREAK } from './config.js';
import { makePlayer, movePlayer, tileAt, tileCentre } from './player.js';
import {
  makeWarden, updateWarden, hasLineOfSight, inCone, setCallout,
  MOOD_PATROL, MOOD_SUSPICIOUS, MOOD_ALARM, MOOD_INVESTIGATE,
} from './warden.js';

export const EVENT_NONE = 0;
export const EVENT_WIN = 1 << 0;
export const EVENT_CAUGHT = 1 << 1;
export const EVENT_SPOTTED = 1 << 2;
export const EVENT_PICKUP = 1 << 3;
export const EVENT_PRIZE = 1 << 4;
export const EVENT_PEBBLE = 1 << 5;
export const EVENT_CREAK = 1 << 6;

export const STEP = 1 / 60;

export const JOBS = [
  {
    id: 0,
    name: "JOB 1: THE CHANDLER'S WALK",
    title: 'Steal the Gilded Seal',
    prizeName: 'the Gilded Seal',
    par: 75,
    brief: 'One warden walks the ropewalk. Take the seal, slip out the hatch.',
    map: [
      '##############################',
      '#S...g......c.....l......v...#',
      '#....#......#.........#......#',
      '#....#..c...#....g....#..c...#',
      '#....#......#.........#......#',
      '#..g....l.......c.........P..#',
      '#....#......#.........#......#',
      '#....#..g...#....c....#..g...#',
      '#....#......#.........#......#',
      '#..c....b.......l.........v..#',
      '#....#......#.........#......#',
      '#....#..c...#....g....#..c...#',
      '#....#......#.........#....E.#',
      '##############################',
    ],
    wardens: [
      { name: 'Warden Ash', waypoints: [{ x: 8, y: 2 }, { x: 21, y: 2 }, { x: 21, y: 11 }, { x: 8, y: 11 }] },
    ],
  },
  {
    id: 1,
    name: "JOB 2: THE ORCHID HOUSE",
    title: 'Steal the Moonpetal Orchid',
    prizeName: 'the Moonpetal Orchid',
    par: 90,
    brief: 'Two wardens tend the glasshouse. Ferns hide you; lamplight betrays you.',
    map: [
      '##############################',
      '#S..g....c....l.....g....v...#',
      '#....#......#.........#......#',
      '#.g..#..c...#...g....#..c....#',
      '#....#......#.........#......#',
      '#..c....g.......l.........P..#',
      '#....#......#.........#......#',
      '#.g..#..l...#....c....#..g...#',
      '#....#......#.........#......#',
      '#..g....b.......g.........v..#',
      '#....#......#.........#......#',
      '#.c..#..g...#....l....#..c...#',
      '#....#......#.....v...#....E.#',
      '##############################',
    ],
    wardens: [
      { name: 'Warden Bramble', waypoints: [{ x: 7, y: 2 }, { x: 15, y: 5 }, { x: 22, y: 2 }, { x: 15, y: 9 }] },
      { name: 'Warden Sorrel', waypoints: [{ x: 22, y: 11 }, { x: 14, y: 8 }, { x: 7, y: 11 }, { x: 14, y: 4 }] },
    ],
  },
  {
    id: 2,
    name: "JOB 3: THE HOROLOGIST'S VAULT",
    title: 'Steal the Brass Meridian',
    prizeName: 'the Brass Meridian',
    par: 110,
    brief: 'Three wardens, creaking floors, lamps everywhere. Ghost it if you can.',
    map: [
      '##############################',
      '#S...l.....c....g....l...v...#',
      '#....#......#.........#......#',
      '#.g..#..c...#...l....#..c....#',
      '#....#......#.........#......#',
      '#..b....l.......c.........P..#',
      '#....#......#.........#......#',
      '#.c..#..g...#....b....#..g...#',
      '#....#......#.........#......#',
      '#..g....l.......g.........v..#',
      '#....#......#.........#......#',
      '#.l..#..c...#....g....#..c...#',
      '#....#......#.....v...#....E.#',
      '##############################',
    ],
    wardens: [
      { name: 'Warden Ash', waypoints: [{ x: 8, y: 2 }, { x: 21, y: 4 }, { x: 14, y: 7 }] },
      { name: 'Warden Bramble', waypoints: [{ x: 21, y: 11 }, { x: 8, y: 9 }, { x: 15, y: 11 }] },
      { name: 'Warden Sorrel', waypoints: [{ x: 14, y: 2 }, { x: 22, y: 7 }, { x: 14, y: 11 }, { x: 6, y: 7 }] },
    ],
  },
];

export function buildWorld(jobIndex, seed) {
  const job = JOBS[jobIndex];
  const tiles = job.map.map((row) => row.split(''));
  const world = {
    job, jobIndex, seed, tiles,
    player: null, wardens: [],
    valuables: [], prize: null, hatch: null, lamps: [],
    pebbles: PLAYER.pebbles, thrown: [],
    time: 0, alarm: false, alarmTimer: 0,
    timesSpotted: 0, closeCalls: 0, pebblesThrown: 0,
    valuablesGot: 0, prizeGot: false, hatchOpen: false,
    won: false, caught: false, caughtBy: null,
    creakCooldown: 0, noise: null, // {x, y, radius, until}
    status: 'ALL QUIET',
    visibility: 'SHADOW', // SHADOW | HIDDEN | SEEN
  };
  for (let y = 0; y < FIELD.rows; y += 1) {
    for (let x = 0; x < FIELD.cols; x += 1) {
      const t = tiles[y][x];
      if (t === 'S') { world.player = makePlayer({ x, y }); tiles[y][x] = '.'; }
      else if (t === 'v') { world.valuables.push({ x, y, got: false }); tiles[y][x] = '.'; }
      else if (t === 'P') { world.prize = { x, y, got: false }; tiles[y][x] = '.'; }
      else if (t === 'E') { world.hatch = { x, y }; tiles[y][x] = '.'; }
      else if (t === 'l') { world.lamps.push({ x, y }); }
    }
  }
  world.wardens = job.wardens.map((def) => makeWarden(def));
  return world;
}

export function resetWorld(world) {
  const fresh = buildWorld(world.jobIndex, world.seed);
  Object.keys(fresh).forEach((k) => { world[k] = fresh[k]; });
}

function tileOf(world, x, y) {
  const t = tileAt(x, y);
  if (t.x < 0 || t.y < 0 || t.x >= FIELD.cols || t.y >= FIELD.rows) return '#';
  return world.tiles[t.y][t.x];
}

function inLight(world, x, y) {
  for (const lamp of world.lamps) {
    const c = tileCentre(lamp.x, lamp.y);
    if (Math.hypot(x - c.x, y - c.y) <= LAMP.radius) return true;
  }
  return false;
}

function inGrass(world, x, y) {
  return tileOf(world, x, y) === 'g';
}

// One fixed step of the rules. `input` is {mx, my, sneak, throwTo|null}.
// Returns an event bitmask for sound / banner hooks.
export function stepWorld(world, input, dt) {
  if (world.won || world.caught) return EVENT_NONE;
  let events = EVENT_NONE;
  world.time += dt;
  const player = world.player;

  // --- move the thief -------------------------------------------------------
  const speed = input.sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  const dx = input.mx * speed * dt;
  const dy = input.my * speed * dt;
  player.moving = dx !== 0 || dy !== 0;
  player.sneaking = input.sneak;
  if (player.moving) {
    player.dir = Math.atan2(dy, dx);
    player.trailTimer += dt;
    if (player.trailTimer > 0.25) {
      player.trailTimer = 0;
      player.trail.push({ x: player.x, y: player.y });
      if (player.trail.length > 400) player.trail.shift();
    }
  }
  movePlayer(world, player, dx, dy);

  // --- creaky boards: loud even when sneaking -------------------------------
  world.creakCooldown -= dt;
  const onCreaky = tileOf(world, player.x, player.y) === 'b';
  player.onCreaky = onCreaky;
  if (onCreaky && player.moving && world.creakCooldown <= 0) {
    world.creakCooldown = CREAK.cooldown;
    world.noise = { x: player.x, y: player.y, radius: CREAK.radius, until: world.time + 0.6 };
    events |= EVENT_CREAK;
    for (const w of world.wardens) {
      if (Math.hypot(w.x - player.x, w.y - player.y) <= CREAK.radius && w.mood === MOOD_PATROL) {
        w.mood = MOOD_INVESTIGATE;
        w.lastSeen = { x: player.x, y: player.y };
        setCallout(w, 'What was that?', '?', world.time, 1.6);
      }
    }
  }

  // --- throw a pebble --------------------------------------------------------
  if (input.throwTo && world.pebbles > 0) {
    world.pebbles -= 1;
    world.pebblesThrown += 1;
    world.thrown.push({ x: input.throwTo.x, y: input.throwTo.y, t: 0, landed: false });
    events |= EVENT_PEBBLE;
  }
  for (const p of world.thrown) {
    p.t += dt;
    if (!p.landed && p.t >= 0.35) {
      p.landed = true;
      world.noise = { x: p.x, y: p.y, radius: WARDEN.hearRadius, until: world.time + 0.8 };
      for (const w of world.wardens) {
        if (Math.hypot(w.x - p.x, w.y - p.y) <= WARDEN.hearRadius) {
          if (w.mood === MOOD_PATROL || w.mood === MOOD_SUSPICIOUS) {
            w.mood = MOOD_INVESTIGATE;
            w.lastSeen = { x: p.x, y: p.y };
            setCallout(w, 'What was that?', '?', world.time, 1.6);
          }
        }
      }
    }
  }
  world.thrown = world.thrown.filter((p) => p.t < 2.5);

  // --- pickups ---------------------------------------------------------------
  const pt = tileAt(player.x, player.y);
  for (const v of world.valuables) {
    if (!v.got && v.x === pt.x && v.y === pt.y) {
      v.got = true;
      world.valuablesGot += 1;
      events |= EVENT_PICKUP;
    }
  }
  if (world.prize && !world.prize.got && world.prize.x === pt.x && world.prize.y === pt.y) {
    world.prize.got = true;
    world.prizeGot = true;
    world.hatchOpen = true;
    events |= EVENT_PRIZE;
  }

  // --- wardens see, suspect, spot -------------------------------------------
  const lit = inLight(world, player.x, player.y);
  const grass = inGrass(world, player.x, player.y);
  let anySeen = false;
  let anySuspicious = false;
  for (const w of world.wardens) {
    const dist = Math.hypot(player.x - w.x, player.y - w.y);
    const range = lit ? WARDEN.coneRangeLit : WARDEN.coneRange;
    const hiddenByGrass = grass && dist > WARDEN.grassHideRange;
    const seen = !hiddenByGrass && inCone(w, player.x, player.y, range)
      && hasLineOfSight(world, w.x, w.y, player.x, player.y);
    if (seen) {
      anySeen = true;
      // Closer, lit, standing and running all make you easier to spot.
      let rate = WARDEN.suspicionRate * (1.6 - Math.min(1, dist / range));
      if (lit) rate *= 1.6;
      if (player.sneaking) rate *= 0.55;
      if (!player.moving) rate *= 0.8;
      w.suspicion = Math.min(1, w.suspicion + rate * dt);
      w.lastSeen = { x: player.x, y: player.y };
      // Close call: a warden gets within arm's reach while it can see you.
      // Counted once per approach, when it backs off again.
      if (dist < 90 && !w.closeCallArmed) {
        w.closeCallArmed = true;
        world.closeCalls += 1;
      } else if (dist >= 130) {
        w.closeCallArmed = false;
      }
    } else {
      w.suspicion = Math.max(0, w.suspicion - WARDEN.suspicionDecay * dt);
    }
    if (w.suspicion >= WARDEN.spottedAt && !world.alarm) {
      world.alarm = true;
      world.alarmTimer = 0;
      world.timesSpotted += 1;
      events |= EVENT_SPOTTED;
      for (const other of world.wardens) {
        other.mood = MOOD_ALARM;
        other.lastSeen = { x: player.x, y: player.y };
        setCallout(other, 'Thief! There!', '!', world.time, 1.8);
      }
      world.caughtBy = w.name;
    } else if (w.suspicion >= WARDEN.suspiciousAt && w.mood === MOOD_PATROL) {
      w.mood = MOOD_SUSPICIOUS;
      setCallout(w, 'What was that?', '?', world.time, 1.6);
    }
    if (w.suspicion >= WARDEN.suspiciousAt) anySuspicious = true;
    if (w.mood === MOOD_ALARM) anySeen = anySeen || false;
  }

  // --- alarm: wardens hunt; break sight long enough and it dies down --------
  if (world.alarm) {
    world.alarmTimer += dt;
    if (!anySeen && world.alarmTimer > WARDEN.calmAfter) {
      world.alarm = false;
      world.alarmTimer = 0;
      for (const w of world.wardens) {
        w.mood = MOOD_PATROL;
        w.suspicion = 0.3;
        w.lastSeen = null;
      }
    }
    for (const w of world.wardens) {
      if (Math.hypot(w.x - player.x, w.y - player.y) < WARDEN.catchRange) {
        world.caught = true;
        world.caughtBy = w.name;
        return events | EVENT_CAUGHT;
      }
    }
  }

  for (const w of world.wardens) updateWarden(world, w, dt, world.alarm);

  // --- visibility + status line ----------------------------------------------
  if (world.alarm) { world.visibility = 'SEEN'; world.status = 'ALARM! BREAK THEIR SIGHT AND HIDE'; }
  else if (anySuspicious) { world.visibility = 'SHADOW'; world.status = 'A WARDEN IS SUSPICIOUS'; }
  else { world.visibility = grass ? 'HIDDEN' : 'SHADOW'; world.status = 'ALL QUIET'; }

  // --- win: reach the open hatch ---------------------------------------------
  if (world.hatchOpen && world.hatch.x === pt.x && world.hatch.y === pt.y) {
    world.won = true;
    return events | EVENT_WIN;
  }
  return events;
}
