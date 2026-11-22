// NIGHTHOLD — configuration. One place for every number the game tunes.
export const CANVAS = { width: 1280, height: 720 };
export const TILE = 40;
// Play field: 30 columns x 14 rows of tiles, centred under the HUD.
export const FIELD = { cols: 30, rows: 14, x: 40, y: 76 };
export const HUD_H = 64;
export const FOOTER_H = 28;

export const PLAYER = {
  radius: 11,
  walkSpeed: 165, // px per second
  sneakSpeed: 78,
  pebbles: 3,
};

export const WARDEN = {
  radius: 13,
  patrolSpeed: 62,
  investigateSpeed: 92,
  chaseSpeed: 150,
  coneRange: 210, // how far a warden sees in the dark
  coneRangeLit: 300, // how far they see you when you stand in lamplight
  coneHalfAngle: 0.61, // ~35 degrees each side
  hearRadius: 250, // pebble landing noise pulls wardens this far
  grassHideRange: 72, // closer than this, tall grass stops hiding you
  suspicionRate: 1.15, // per second at point blank, standing, lit
  suspicionDecay: 0.35,
  suspiciousAt: 0.45, // "?" — walks over to look
  spottedAt: 1.0, // "!" — alarm, every warden hunts you
  calmAfter: 6.0, // seconds unseen before the alarm dies down
  catchRange: 26, // a warden this close during an alarm catches you
};

export const LAMP = { radius: 130 };
export const CREAK = { radius: 120, cooldown: 1.0 };

export const COLORS = {
  bg: '#0b0f1c',
  floorA: '#141a2c',
  floorB: '#101527',
  grid: '#1b2338',
  wall: '#2b3452',
  wallTop: '#3a4568',
  wallEdge: '#4a5578',
  grass: '#2f6b4a',
  grassDark: '#224f38',
  crate: '#6b4a2a',
  crateEdge: '#8a6238',
  lamp: '#ffb347',
  lampGlow: 'rgba(255, 179, 71, 0.20)',
  cone: 'rgba(255, 179, 71, 0.16)',
  coneEdge: 'rgba(255, 179, 71, 0.45)',
  coneAlarm: 'rgba(255, 70, 60, 0.20)',
  coneAlarmEdge: 'rgba(255, 70, 60, 0.55)',
  teal: '#5fe8c8',
  tealDim: 'rgba(95, 232, 200, 0.55)',
  gold: '#f2c14e',
  goldBright: '#ffd97a',
  text: '#e8e4d8',
  textDim: '#9aa3b8',
  panel: 'rgba(10, 13, 24, 0.88)',
  panelEdge: '#c9a227',
  red: '#ff4d42',
  amber: '#ffb347',
  green: '#5fe8a8',
};
