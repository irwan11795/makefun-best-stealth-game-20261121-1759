// Wardens. Each walks a loop of waypoints, looks around with a vision cone, and
// has three moods: patrol, suspicious ("?" — walks over to look), and alarm
// ("!" — hunts the thief). A warden only sees what its cone touches with a
// clear line of sight; walls and crates block the view.
import { WARDEN, FIELD, TILE } from './config.js';
import { tileCentre } from './player.js';

export const MOOD_PATROL = 'patrol';
export const MOOD_SUSPICIOUS = 'suspicious';
export const MOOD_ALARM = 'alarm';
export const MOOD_INVESTIGATE = 'investigate';

export function makeWarden(def) {
  const start = tileCentre(def.waypoints[0].x, def.waypoints[0].y);
  return {
    name: def.name,
    waypoints: def.waypoints,
    wp: 1 % def.waypoints.length,
    x: start.x,
    y: start.y,
    angle: 0,
    speed: WARDEN.patrolSpeed,
    mood: MOOD_PATROL,
    suspicion: 0,
    lastSeen: null, // {x, y} where the thief was last glimpsed
    lookTimer: 0,
    pauseTimer: 0,
    callout: null, // {text, until} speech bubble
    calloutKind: '',
  };
}

function angleTo(x0, y0, x1, y1) {
  return Math.atan2(y1 - y0, x1 - x0);
}

function turnToward(angle, target, maxStep) {
  let d = target - angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maxStep) return target;
  return angle + Math.sign(d) * maxStep;
}

// Line of sight on the tile grid: sample along the ray, blocked by walls/crates.
export function hasLineOfSight(world, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i += 1) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    const tx = Math.floor((x - FIELD.x) / TILE);
    const ty = Math.floor((y - FIELD.y) / TILE);
    if (tx < 0 || ty < 0 || tx >= FIELD.cols || ty >= FIELD.rows) return false;
    const t = world.tiles[ty][tx];
    if (t === '#' || t === 'c') return false;
  }
  return true;
}

// Is the point inside this warden's vision cone right now (ignores grass)?
export function inCone(warden, x, y, range) {
  const dx = x - warden.x;
  const dy = y - warden.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 4) return true;
  const a = Math.atan2(dy, dx);
  let d = a - warden.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d) <= WARDEN.coneHalfAngle;
}

function stepToward(warden, tx, ty, speed, dt) {
  const dx = tx - warden.x;
  const dy = ty - warden.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const target = Math.atan2(dy, dx);
  warden.angle = turnToward(warden.angle, target, 6 * dt);
  const step = Math.min(dist, speed * dt);
  warden.x += (dx / dist) * step;
  warden.y += (dy / dist) * step;
  return dist <= speed * dt + 2;
}

// One warden's movement for this frame. Returns nothing; the world decides
// suspicion and mood changes from what the warden can see.
export function updateWarden(world, warden, dt, alarm) {
  if (warden.pauseTimer > 0) {
    warden.pauseTimer -= dt;
    return;
  }
  if (warden.mood === MOOD_ALARM || alarm) {
    // Hunt the last known position of the thief.
    const target = warden.lastSeen || { x: world.player.x, y: world.player.y };
    const arrived = stepToward(warden, target.x, target.y, WARDEN.chaseSpeed, dt);
    if (arrived) {
      warden.lookTimer += dt;
      warden.angle += dt * 1.5; // scan around while the trail is cold
      if (warden.lookTimer > 2.5) {
        warden.lookTimer = 0;
        warden.lastSeen = null;
      }
    }
    return;
  }
  if (warden.mood === MOOD_INVESTIGATE || warden.mood === MOOD_SUSPICIOUS) {
    if (warden.lastSeen) {
      const arrived = stepToward(warden, warden.lastSeen.x, warden.lastSeen.y, WARDEN.investigateSpeed, dt);
      if (arrived) {
        warden.lookTimer += dt;
        warden.angle += dt * 2.2;
        if (warden.lookTimer > 2.0) {
          warden.lookTimer = 0;
          warden.mood = MOOD_PATROL;
          warden.suspicion = 0.2;
          warden.lastSeen = null;
        }
      }
    } else {
      warden.mood = MOOD_PATROL;
    }
    return;
  }
  // Patrol: walk the waypoint loop, pausing briefly at each post.
  const wp = warden.waypoints[warden.wp];
  const c = tileCentre(wp.x, wp.y);
  const arrived = stepToward(warden, c.x, c.y, WARDEN.patrolSpeed, dt);
  if (arrived) {
    warden.wp = (warden.wp + 1) % warden.waypoints.length;
    warden.pauseTimer = 1.2;
  }
}

export function setCallout(warden, text, kind, now, seconds) {
  warden.callout = { text, until: now + seconds };
  warden.calloutKind = kind;
}
