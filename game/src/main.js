// NIGHTHOLD — top-down stealth. Sneak past the wardens, lift the prize, slip
// out the hatch unseen. Boots: node serve.ts, then http://localhost:8080.
// Screenshot mode: ?shot=start|play|spotted|end&seed=1 renders one fixed frame.
import { CANVAS } from './config.js';
import { buildWorld, resetWorld, stepWorld, JOBS, STEP, EVENT_WIN, EVENT_CAUGHT, EVENT_SPOTTED, EVENT_PICKUP, EVENT_PRIZE, EVENT_PEBBLE, EVENT_CREAK } from './world.js';
import { makeInput, readMove, wasPressed, endFrame } from './input.js';
import { makeAudio } from './audio.js';
import { render, SCREEN_TITLE, SCREEN_BOARD, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_OVER, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS.width;
canvas.height = CANVAS.height;
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const audio = makeAudio();
const input = makeInput(canvas);

const game = {
  screen: SCREEN_TITLE,
  world: buildWorld(0, seed),
  jobList: JOBS,
  results: {}, // jobIndex -> {time, timesSpotted, closeCalls, pebblesThrown, valuablesGot, valuablesTotal, ghost, caught}
  result: null,
  showNotes: true,
  now: 0,
  stepAcc: 0,
  lastTime: performance.now(),
  muted: false,
};

// Test hook: the headless checks drive the game through this.
window.__game = game;
window.__input = input;

function startJob(index) {
  game.world = buildWorld(index, seed);
  game.screen = SCREEN_PLAY;
  game.result = null;
  game.showNotes = true;
  audio.click();
}

function finishJob(caught) {
  const w = game.world;
  game.result = {
    caught,
    caughtBy: w.caughtBy,
    time: w.time,
    timesSpotted: w.timesSpotted,
    closeCalls: w.closeCalls,
    pebblesThrown: w.pebblesThrown,
    valuablesGot: w.valuablesGot + (w.prizeGot ? 1 : 0),
    valuablesTotal: w.valuables.length + 1,
    ghost: w.timesSpotted === 0 && !caught,
  };
  if (!caught) game.results[w.jobIndex] = game.result;
  game.screen = caught ? SCREEN_OVER : SCREEN_WIN;
}

function collectResult(world) {
  return {
    caught: world.caught,
    caughtBy: world.caughtBy,
    time: world.time,
    timesSpotted: world.timesSpotted,
    closeCalls: world.closeCalls,
    pebblesThrown: world.pebblesThrown,
    valuablesGot: world.valuablesGot + (world.prizeGot ? 1 : 0),
    valuablesTotal: world.valuables.length + 1,
    ghost: world.timesSpotted === 0 && !world.caught,
  };
}

function playStep(dt) {
  const move = readMove(input);
  const world = game.world;
  if (input.mouse.inside) world.aim = { x: input.mouse.x, y: input.mouse.y };
  else world.aim = null;
  const stepInput = { mx: move.mx, my: move.my, sneak: move.sneak, throwTo: input.throwTo };
  const events = stepWorld(world, stepInput, dt);
  if (events & EVENT_PICKUP) audio.pickup();
  if (events & EVENT_PRIZE) audio.prize();
  if (events & EVENT_PEBBLE) audio.pebble();
  if (events & EVENT_CREAK) audio.clink();
  if (events & EVENT_SPOTTED) audio.alarm();
  if (events & EVENT_WIN) { audio.win(); finishJob(false); }
  if (events & EVENT_CAUGHT) { audio.caught(); finishJob(true); }
  if (world.player.moving && !world.player.sneaking && Math.random() < dt * 2) audio.step();
}

function handleKeys() {
  if (wasPressed(input, 'KeyM')) {
    audio.muted = !audio.muted;
    game.muted = audio.muted;
  }
  if (game.screen === SCREEN_TITLE) {
    if (wasPressed(input, 'Digit1')) startJob(0);
    if (wasPressed(input, 'Digit2')) startJob(1);
    if (wasPressed(input, 'Digit3')) startJob(2);
    if (wasPressed(input, 'Enter')) game.screen = SCREEN_BOARD;
    return;
  }
  if (game.screen === SCREEN_BOARD) {
    if (wasPressed(input, 'Digit1')) startJob(0);
    if (wasPressed(input, 'Digit2')) startJob(1);
    if (wasPressed(input, 'Digit3')) startJob(2);
    if (wasPressed(input, 'Escape')) game.screen = SCREEN_TITLE;
    return;
  }
  if (game.screen === SCREEN_PLAY) {
    if (wasPressed(input, 'KeyH')) game.showNotes = !game.showNotes;
    if (wasPressed(input, 'Escape')) game.screen = SCREEN_PAUSE;
    if (wasPressed(input, 'KeyR')) resetWorld(game.world);
    return;
  }
  if (game.screen === SCREEN_PAUSE) {
    if (wasPressed(input, 'Escape')) game.screen = SCREEN_PLAY;
    if (wasPressed(input, 'KeyR')) { resetWorld(game.world); game.screen = SCREEN_PLAY; }
    if (wasPressed(input, 'KeyQ')) game.screen = SCREEN_BOARD;
    return;
  }
  if (game.screen === SCREEN_WIN || game.screen === SCREEN_OVER) {
    if (wasPressed(input, 'Enter')) {
      const next = (game.world.jobIndex + 1) % JOBS.length;
      startJob(next);
    }
    if (wasPressed(input, 'KeyR')) { resetWorld(game.world); game.screen = SCREEN_PLAY; }
    if (wasPressed(input, 'KeyQ')) game.screen = SCREEN_BOARD;
  }
}

// Click a job on the board, or a job button on the title screen.
canvas.addEventListener('click', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * canvas.width;
  const y = ((e.clientY - r.top) / r.height) * canvas.height;
  if (game.screen === SCREEN_TITLE) {
    if (y > 400 && y < 470) game.screen = SCREEN_BOARD;
    return;
  }
  if (game.screen === SCREEN_BOARD) {
    for (let i = 0; i < JOBS.length; i += 1) {
      const top = 190 + i * 140;
      if (y >= top && y <= top + 116 && x >= 80 && x <= 1200) startJob(i);
    }
  }
});

function frame(nowMs) {
  const dtMs = Math.min(100, nowMs - game.lastTime);
  game.lastTime = nowMs;
  game.now += dtMs / 1000;
  handleKeys();
  if (game.screen === SCREEN_PLAY) {
    game.stepAcc += dtMs / 1000;
    let guard = 0;
    while (game.stepAcc >= STEP && guard < 8) {
      playStep(STEP);
      game.stepAcc -= STEP;
      guard += 1;
      if (game.screen !== SCREEN_PLAY) break;
    }
    if (guard >= 8) game.stepAcc = 0;
  }
  render(ctx, game.screen, game.world, game.now, game.showNotes, game.results, game.result);
  const status = game.screen === SCREEN_PLAY
    ? `${game.world.job.name} — ${game.world.status}, ${game.world.valuablesGot}/${game.world.valuables.length} valuables, ${game.world.pebbles} pebbles, ${Math.floor(game.world.time)}s`
    : game.screen;
  if (statusEl.textContent !== status) statusEl.textContent = status;
  endFrame(input);
  requestAnimationFrame(frame);
}

if (shotName) {
  // Deterministic screenshot mode: one staged frame, no loop, no input.
  const staged = stageShot(shotName, seed);
  game.world = staged.world;
  game.screen = staged.screen;
  game.result = collectResult(staged.world);
  game.now = 5;
  render(ctx, game.screen, game.world, game.now, true, game.results, game.result);
  document.title = `NIGHTHOLD — shot ${shotName}`;
} else {
  requestAnimationFrame(frame);
}
