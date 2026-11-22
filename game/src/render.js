// NIGHTHOLD — every pixel on screen. Dark navy rooms, amber lamplight, amber
// vision cones, teal route trail, gold HUD, FIELD NOTES panel, results screen.
import { CANVAS, FIELD, TILE, COLORS, LAMP, WARDEN, FOOTER_H } from './config.js';
import { tileCentre } from './player.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_BOARD = 'board';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over'; // caught
export const SCREEN_WIN = 'win';

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTileFloor(ctx, world) {
  const { x: fx, y: fy } = FIELD;
  for (let ty = 0; ty < FIELD.rows; ty += 1) {
    for (let tx = 0; tx < FIELD.cols; tx += 1) {
      const x = fx + tx * TILE;
      const y = fy + ty * TILE;
      const t = world.tiles[ty][tx];
      ctx.fillStyle = (tx + ty) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (t === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 6);
        ctx.fillStyle = COLORS.wallEdge;
        ctx.fillRect(x, y + TILE - 2, TILE, 2);
      } else if (t === 'g') {
        drawGrass(ctx, x, y);
      } else if (t === 'c') {
        drawCrate(ctx, x, y);
      } else if (t === 'b') {
        ctx.fillStyle = '#241d16';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = '#3a2c1c';
        ctx.lineWidth = 2;
        for (let i = 1; i < 4; i += 1) {
          ctx.beginPath();
          ctx.moveTo(x, y + i * 10);
          ctx.lineTo(x + TILE, y + i * 10);
          ctx.stroke();
        }
      } else if (t === 'l') {
        ctx.fillStyle = '#1a2036';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(255,179,71,0.25)';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
}

function drawGrass(ctx, x, y) {
  ctx.fillStyle = COLORS.grassDark;
  ctx.fillRect(x, y, TILE, TILE);
  ctx.strokeStyle = COLORS.grass;
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i += 1) {
    const gx = x + 5 + i * 5;
    const lean = (i % 3) - 1;
    ctx.beginPath();
    ctx.moveTo(gx, y + TILE - 4);
    ctx.quadraticCurveTo(gx + lean * 3, y + 18, gx + lean * 5, y + 6 + (i % 2) * 6);
    ctx.stroke();
  }
}

function drawCrate(ctx, x, y) {
  ctx.fillStyle = COLORS.crate;
  ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
  ctx.strokeStyle = COLORS.crateEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 3);
  ctx.lineTo(x + TILE - 3, y + TILE - 3);
  ctx.moveTo(x + TILE - 3, y + 3);
  ctx.lineTo(x + 3, y + TILE - 3);
  ctx.stroke();
}

function drawLamps(ctx, world) {
  for (const lamp of world.lamps) {
    const c = tileCentre(lamp.x, lamp.y);
    const g = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, LAMP.radius);
    g.addColorStop(0, 'rgba(255, 190, 90, 0.28)');
    g.addColorStop(0.5, 'rgba(255, 179, 71, 0.10)');
    g.addColorStop(1, 'rgba(255, 179, 71, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, LAMP.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.lamp;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3cf';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCone(ctx, warden, alarm) {
  const range = WARDEN.coneRange;
  const a0 = warden.angle - WARDEN.coneHalfAngle;
  const a1 = warden.angle + WARDEN.coneHalfAngle;
  ctx.beginPath();
  ctx.moveTo(warden.x, warden.y);
  ctx.arc(warden.x, warden.y, range, a0, a1);
  ctx.closePath();
  ctx.fillStyle = alarm ? COLORS.coneAlarm : COLORS.cone;
  ctx.fill();
  ctx.strokeStyle = alarm ? COLORS.coneAlarmEdge : COLORS.coneEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawWarden(ctx, w, now, alarm) {
  drawCone(ctx, w, alarm);
  // Hearing ring (dashed) — the warden's earshot.
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(232, 228, 216, 0.25)';
  ctx.beginPath();
  ctx.arc(w.x, w.y, 88, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Body: dark cloak, amber ring, face.
  ctx.fillStyle = '#1c2233';
  ctx.beginPath();
  ctx.arc(w.x, w.y, WARDEN.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alarm ? COLORS.red : COLORS.lamp;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#e8e4d8';
  ctx.beginPath();
  ctx.arc(w.x + Math.cos(w.angle) * 4, w.y + Math.sin(w.angle) * 4, 4, 0, Math.PI * 2);
  ctx.fill();
  // Suspicion / alarm mark above the head.
  const mark = w.suspicion >= 1 || alarm ? '!' : w.suspicion >= WARDEN.suspiciousAt ? '?' : null;
  if (mark) {
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = mark === '!' ? COLORS.red : COLORS.amber;
    ctx.fillText(mark, w.x, w.y - 20);
  }
  if (w.callout && now < w.callout.until) {
    const text = w.callout.text;
    ctx.font = '13px Georgia, serif';
    const tw = ctx.measureText(text).width + 14;
    const bx = Math.min(Math.max(w.x - tw / 2, 8), CANVAS.width - tw - 8);
    const by = w.y - 46;
    ctx.fillStyle = '#f4ecd8';
    roundRect(ctx, bx, by, tw, 22, 6);
    ctx.fill();
    ctx.fillStyle = '#2a2118';
    ctx.textAlign = 'left';
    ctx.fillText(text, bx + 7, by + 15);
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  const hidden = world.tiles[Math.floor((p.y - FIELD.y) / TILE)]?.[Math.floor((p.x - FIELD.x) / TILE)] === 'g';
  ctx.save();
  if (hidden) ctx.globalAlpha = 0.55;
  // Route trail (teal dashes).
  if (p.trail.length > 1) {
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = COLORS.tealDim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.trail[0].x, p.trail[0].y);
    for (const pt of p.trail) ctx.lineTo(pt.x, pt.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Hooded figure: teal cloak, pale face, direction tick.
  ctx.fillStyle = '#123b34';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.teal;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e8f6f0';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.dir) * 4, p.y + Math.sin(p.dir) * 4, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Aim line + pebble preview when the mouse is over the field.
  if (world.aim && world.pebbles > 0 && !world.won && !world.caught) {
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = 'rgba(232, 228, 216, 0.5)';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(world.aim.x, world.aim.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = COLORS.teal;
    ctx.beginPath();
    ctx.arc(world.aim.x, world.aim.y, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPickups(ctx, world, now) {
  for (const v of world.valuables) {
    if (v.got) continue;
    const c = tileCentre(v.x, v.y);
    const pulse = 1 + 0.12 * Math.sin(now * 3 + v.x);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-6 * pulse, -6 * pulse, 12 * pulse, 12 * pulse);
    ctx.strokeStyle = COLORS.goldBright;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-6 * pulse, -6 * pulse, 12 * pulse, 12 * pulse);
    ctx.restore();
  }
  if (world.prize && !world.prize.got) {
    const c = tileCentre(world.prize.x, world.prize.y);
    const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 34);
    g.addColorStop(0, 'rgba(255, 217, 122, 0.5)');
    g.addColorStop(1, 'rgba(255, 217, 122, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 34, 0, Math.PI * 2);
    ctx.fill();
    drawStar(ctx, c.x, c.y, 11, COLORS.goldBright);
  }
  // Exit hatch.
  const h = world.hatch;
  const hc = tileCentre(h.x, h.y);
  ctx.fillStyle = world.hatchOpen ? '#1d5c3a' : '#232a3d';
  ctx.fillRect(hc.x - 15, hc.y - 15, 30, 30);
  ctx.strokeStyle = world.hatchOpen ? COLORS.green : '#5a6478';
  ctx.lineWidth = 2;
  ctx.strokeRect(hc.x - 15, hc.y - 15, 30, 30);
  ctx.beginPath();
  for (let i = -1; i <= 1; i += 1) {
    ctx.moveTo(hc.x - 10, hc.y + i * 8);
    ctx.lineTo(hc.x + 10, hc.y + i * 8);
  }
  ctx.stroke();
  if (world.hatchOpen) {
    ctx.fillStyle = COLORS.green;
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', hc.x, hc.y - 20);
  } else {
    ctx.fillStyle = '#8a93a8';
    ctx.font = 'bold 10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOCKED', hc.x, hc.y - 20);
  }
}

function drawStar(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawNoise(ctx, world) {
  if (world.noise && world.time < world.noise.until) {
    const age = 1 - (world.noise.until - world.time) / 0.8;
    ctx.strokeStyle = `rgba(255, 220, 130, ${0.7 * (1 - age)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(world.noise.x, world.noise.y, 8 + age * world.noise.radius * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const p of world.thrown) {
    if (!p.landed) {
      ctx.fillStyle = '#c9c2b0';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255, 220, 130, 0.8)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 + p.t * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = '#0d1120';
  ctx.fillRect(0, 0, CANVAS.width, 64);
  ctx.fillStyle = COLORS.panelEdge;
  ctx.fillRect(0, 64, CANVAS.width, 1);
  // Left: title + job.
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText('NIGHTHOLD', 20, 30);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px Georgia, serif';
  ctx.fillText(world.job.name, 20, 50);
  // Centre: objective + status.
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(world.job.title.toUpperCase(), CANVAS.width / 2, 26);
  const alarm = world.alarm;
  ctx.fillStyle = alarm ? COLORS.red : world.status === 'ALL QUIET' ? COLORS.green : COLORS.amber;
  ctx.font = '13px Georgia, serif';
  ctx.fillText((alarm ? '● ' : world.status === 'ALL QUIET' ? '● ' : '● ') + world.status, CANVAS.width / 2, 48);
  // Right: visibility, pebbles, valuables, time.
  ctx.textAlign = 'right';
  const visColor = world.visibility === 'SEEN' ? COLORS.red : world.visibility === 'HIDDEN' ? COLORS.green : '#7fb3d5';
  ctx.fillStyle = visColor;
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(world.visibility, CANVAS.width - 320, 26);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px Georgia, serif';
  ctx.fillText('VISIBILITY', CANVAS.width - 320, 44);
  // Pebble dots.
  for (let i = 0; i < PLAYER_PEBBLES_MAX; i += 1) {
    ctx.beginPath();
    ctx.arc(CANVAS.width - 268 + i * 16, 22, 5, 0, Math.PI * 2);
    ctx.fillStyle = i < world.pebbles ? '#e8e4d8' : '#3a4157';
    ctx.fill();
  }
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('PEBBLES', CANVAS.width - 236, 44);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 16px Georgia, serif';
  ctx.fillText(`${world.valuablesGot + (world.prizeGot ? 1 : 0)}/${world.valuables.length + 1}`, CANVAS.width - 150, 26);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px Georgia, serif';
  ctx.fillText('VALUABLES', CANVAS.width - 150, 44);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText(fmtTime(world.time), CANVAS.width - 20, 30);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px Georgia, serif';
  ctx.fillText('TIME', CANVAS.width - 20, 48);
}

import { PLAYER as PLAYER_CFG } from './config.js';
const PLAYER_PEBBLES_MAX = PLAYER_CFG.pebbles;

function drawFooter(ctx) {
  ctx.fillStyle = '#0d1120';
  ctx.fillRect(0, CANVAS.height - FOOTER_H, CANVAS.width, FOOTER_H);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD / ARROWS move    SHIFT sneak    MOUSE aim, CLICK throw a pebble    H field notes    M mute    ESC pause', CANVAS.width / 2, CANVAS.height - 9);
}

const FIELD_NOTES = [
  ['Warden + vision cone', 'what they see'],
  ['Blind spot behind cover', 'safe'],
  ['Lamplight', 'seen from afar'],
  ['Tall grass', 'hidden unless close'],
  ['Creaky boards', 'loud even sneaking'],
  ['Rings', 'noise; wardens walk'],
  ['Exit hatch', 'opens with the prize'],
];

function drawFieldNotes(ctx, world) {
  const x = 20;
  const w = 320;
  const h = 210;
  const y = CANVAS.height - FOOTER_H - 4 - h;
  ctx.fillStyle = COLORS.panel;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = COLORS.panelEdge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText('FIELD NOTES', x + 12, y + 20);
  ctx.font = '12px Georgia, serif';
  FIELD_NOTES.forEach(([a, b], i) => {
    const yy = y + 42 + i * 22;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(a, x + 12, yy);
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(b, x + 168, yy);
  });
  if (!world.hatchOpen) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '12px Georgia, serif';
    ctx.fillText(`Hatch locked — take ${world.job.prizeName} first.`, x + 12, y + h - 10);
  }
}

function drawSpottedBanner(ctx, world) {
  if (!world.alarm) return;
  ctx.fillStyle = 'rgba(120, 10, 10, 0.25)';
  ctx.fillRect(0, 64, CANVAS.width, 76);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.red;
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText(`SPOTTED BY ${String(world.caughtBy || 'A WARDEN').toUpperCase()}`, CANVAS.width / 2, 104);
  ctx.fillStyle = '#f4d8d8';
  ctx.font = 'italic 14px Georgia, serif';
  ctx.fillText('Run. Break their line of sight. Hide.', CANVAS.width / 2, 128);
}

export function renderPlay(ctx, world, now, showNotes) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  drawTileFloor(ctx, world);
  drawLamps(ctx, world);
  drawPickups(ctx, world, now);
  for (const w of world.wardens) drawWarden(ctx, w, now, world.alarm);
  drawPlayer(ctx, world);
  drawNoise(ctx, world);
  drawHud(ctx, world);
  drawSpottedBanner(ctx, world);
  if (showNotes) drawFieldNotes(ctx, world);
  drawFooter(ctx);
}

function drawTitle(ctx, now) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  // Faint map silhouette behind the title.
  ctx.strokeStyle = 'rgba(95, 232, 200, 0.10)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(120, 560);
  ctx.lineTo(300, 420);
  ctx.lineTo(520, 470);
  ctx.lineTo(760, 330);
  ctx.lineTo(1020, 420);
  ctx.lineTo(1140, 300);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('NIGHTHOLD', CANVAS.width / 2, 240);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('Take what is not yours. Leave no trace.', CANVAS.width / 2, 282);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '16px Georgia, serif';
  ctx.fillText('A top-down stealth game — sneak past the wardens, lift the prize,', CANVAS.width / 2, 340);
  ctx.fillText('and slip out the hatch unseen.', CANVAS.width / 2, 364);
  const pulse = 0.6 + 0.4 * Math.sin(now * 2.5);
  ctx.fillStyle = `rgba(242, 193, 78, ${pulse})`;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText('CLICK A JOB OR PRESS 1–3 TO BEGIN', CANVAS.width / 2, 440);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px Georgia, serif';
  ctx.fillText('WASD move · SHIFT sneak · CLICK throw a pebble · H field notes · M mute · ESC pause', CANVAS.width / 2, 500);
}

function drawBoard(ctx, jobs, results) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('JOB BOARD', 80, 110);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '16px Georgia, serif';
  ctx.fillText('Three houses. Three prizes. One thief who was never there.', 80, 140);
  jobs.forEach((job, i) => {
    const y = 190 + i * 140;
    const done = results[i];
    ctx.fillStyle = '#121829';
    roundRect(ctx, 80, y, 1120, 116, 6);
    ctx.fill();
    ctx.strokeStyle = done ? COLORS.green : '#2b3452';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(job.name, 110, y + 36);
    ctx.fillStyle = COLORS.text;
    ctx.font = '16px Georgia, serif';
    ctx.fillText(job.title + ' — ' + job.brief, 110, y + 64);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '14px Georgia, serif';
    ctx.fillText(`Par ${fmtTime(job.par)} · ${job.wardens.length} warden${job.wardens.length > 1 ? 's' : ''} · ${job.map.join('').split('v').length - 1} valuables + the prize`, 110, y + 92);
    ctx.textAlign = 'right';
    ctx.fillStyle = done ? COLORS.green : COLORS.gold;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(done ? `DONE · ${done.ghost ? 'GHOST' : fmtTime(done.time)}` : `PRESS ${i + 1}`, 1170, y + 58);
    ctx.textAlign = 'left';
  });
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px Georgia, serif';
  ctx.fillText('ESC back to title · M mute', 80, 640);
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(5, 8, 16, 0.72)';
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText('PAUSED', CANVAS.width / 2, 320);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '16px Georgia, serif';
  ctx.fillText('ESC resume · R restart the job · Q quit to the job board', CANVAS.width / 2, 360);
}

function drawResults(ctx, world, result, ghost) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  // Left: route map.
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.gold;
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText(`THE ROUTE WREN TOOK THROUGH ${world.job.name.split(': ')[1]}`, 40, 60);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'italic 14px Georgia, serif';
  ctx.fillText(`${world.job.prizeName} taken, out through the hatch. Every step of the way, drawn.`, 40, 84);
  const mx = 40;
  const my = 100;
  const mw = 640;
  const mh = 460;
  ctx.fillStyle = '#0d1120';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#2b3452';
  ctx.strokeRect(mx, my, mw, mh);
  const sx = mw / (FIELD.cols * TILE);
  const sy = mh / (FIELD.rows * TILE);
  // Mini walls.
  ctx.fillStyle = '#2b3452';
  for (let ty = 0; ty < FIELD.rows; ty += 1) {
    for (let tx = 0; tx < FIELD.cols; tx += 1) {
      if (world.tiles[ty][tx] === '#') ctx.fillRect(mx + tx * TILE * sx, my + ty * TILE * sy, TILE * sx, TILE * sy);
    }
  }
  // Route.
  const trail = world.player.trail;
  if (trail.length > 1) {
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = COLORS.teal;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    trail.forEach((pt, i) => {
      const x = mx + (pt.x - FIELD.x) * sx;
      const y = my + (pt.y - FIELD.y) * sy;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = COLORS.teal;
  ctx.font = '12px Georgia, serif';
  ctx.fillText('—  your route', mx, my + mh + 24);
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('▲  where the wardens stood at the end', mx + 110, my + mh + 24);
  // Right: stats.
  const rx = 740;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '13px Georgia, serif';
  ctx.fillText(result.caught ? 'JOB FAILED' : 'JOB DONE', rx, 110);
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(result.caught ? 'CAUGHT' : 'CLEAN GETAWAY', rx, 160);
  if (ghost) {
    ctx.save();
    ctx.translate(rx + 130, 215);
    ctx.rotate(-0.06);
    ctx.strokeStyle = COLORS.green;
    ctx.lineWidth = 4;
    ctx.strokeRect(-120, -34, 240, 68);
    ctx.fillStyle = COLORS.green;
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('GHOST', 0, 14);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDim;
    ctx.font = 'italic 15px Georgia, serif';
    ctx.fillText('Nobody will ever know you were there.', rx, 270);
  } else if (result.caught) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = 'italic 15px Georgia, serif';
    ctx.fillText(`Caught by ${result.caughtBy}. The house keeps its prize.`, rx, 270);
  } else {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = 'italic 15px Georgia, serif';
    ctx.fillText('Out the hatch, prize in hand.', rx, 270);
  }
  const rows = [
    ['Time', fmtTime(result.time)],
    ['Times spotted', String(result.timesSpotted)],
    ['Close calls', String(result.closeCalls)],
    ['Pebbles thrown', String(result.pebblesThrown)],
    ['Valuables', `${result.valuablesGot}/${result.valuablesTotal}`],
  ];
  ctx.font = '16px Georgia, serif';
  rows.forEach(([label, value], i) => {
    const y = 310 + i * 32;
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(label, rx, y);
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'right';
    ctx.fillText(value, rx + 420, y);
    ctx.textAlign = 'left';
  });
  // Medals.
  const medals = [
    ['Never spotted', result.timesSpotted === 0 && !result.caught],
    ['Every valuable', result.valuablesGot === result.valuablesTotal && !result.caught],
    [`Under ${fmtTime(world.job.par)}`, result.time <= world.job.par && !result.caught],
  ];
  medals.forEach(([label, earned], i) => {
    const cx = rx + 40 + i * 140;
    const cy = 520;
    ctx.fillStyle = earned ? COLORS.gold : '#2b3452';
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = earned ? '#1a1408' : '#5a6478';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(earned ? '✓' : '·', cx, cy + 6);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '12px Georgia, serif';
    ctx.fillText(label, cx, cy + 42);
    ctx.textAlign = 'left';
  });
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '14px Georgia, serif';
  ctx.fillText('ENTER next job · R replay · Q job board', rx, 620);
}

export function render(ctx, screen, world, now, showNotes, results, result) {
  if (screen === SCREEN_TITLE) drawTitle(ctx, now);
  else if (screen === SCREEN_BOARD) drawBoard(ctx, world.jobList, results);
  else if (screen === SCREEN_PLAY || screen === SCREEN_PAUSE) {
    renderPlay(ctx, world, now, showNotes);
    if (screen === SCREEN_PAUSE) drawPause(ctx);
  } else if (screen === SCREEN_WIN) drawResults(ctx, world, result, result.timesSpotted === 0);
  else if (screen === SCREEN_OVER) drawResults(ctx, world, result, false);
}
