// The thief. Moves on the tile map, collides with walls and crates, and leaves
// a teal trail behind her so the end screen can draw the route she took.
import { PLAYER, FIELD, TILE } from './config.js';

export function makePlayer(startTile) {
  return {
    x: FIELD.x + (startTile.x + 0.5) * TILE,
    y: FIELD.y + (startTile.y + 0.5) * TILE,
    dir: 0, // facing angle, radians
    sneaking: false,
    moving: false,
    onCreaky: false,
    trail: [], // {x, y} samples, one every ~0.25s of movement
    trailTimer: 0,
  };
}

// True when tile (tx, ty) blocks movement.
export function isSolid(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= FIELD.cols || ty >= FIELD.rows) return true;
  const t = world.tiles[ty][tx];
  return t === '#' || t === 'c';
}

// Axis-separated circle-vs-tile collision: slide along walls instead of sticking.
export function movePlayer(world, player, dx, dy) {
  const r = PLAYER.radius;
  const nx = player.x + dx;
  if (!hitsSolid(world, nx, player.y, r)) player.x = nx;
  const ny = player.y + dy;
  if (!hitsSolid(world, player.x, ny, r)) player.y = ny;
}

function hitsSolid(world, x, y, r) {
  const x0 = Math.floor((x - r - FIELD.x) / TILE);
  const x1 = Math.floor((x + r - FIELD.x) / TILE);
  const y0 = Math.floor((y - r - FIELD.y) / TILE);
  const y1 = Math.floor((y + r - FIELD.y) / TILE);
  for (let ty = y0; ty <= y1; ty += 1) {
    for (let tx = x0; tx <= x1; tx += 1) {
      if (!isSolid(world, tx, ty)) continue;
      const cx = Math.max(FIELD.x + tx * TILE, Math.min(x, FIELD.x + (tx + 1) * TILE));
      const cy = Math.max(FIELD.y + ty * TILE, Math.min(y, FIELD.y + (ty + 1) * TILE));
      const ddx = x - cx;
      const ddy = y - cy;
      if (ddx * ddx + ddy * ddy < r * r) return true;
    }
  }
  return false;
}

export function tileAt(x, y) {
  return {
    x: Math.floor((x - FIELD.x) / TILE),
    y: Math.floor((y - FIELD.y) / TILE),
  };
}

export function tileCentre(tx, ty) {
  return { x: FIELD.x + (tx + 0.5) * TILE, y: FIELD.y + (ty + 0.5) * TILE };
}
