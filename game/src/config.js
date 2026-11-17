// Lumen Drift — tuning constants. One place for every number the game balances on.
export const FIELD_W = 960;
export const FIELD_H = 600;
export const STEP = 1 / 60;
export const BEST_KEY = 'lumen-drift-best';

export const SHIP = {
  radius: 14,
  accel: 2600,
  maxSpeed: 430,
  drag: 0.90,
  pointerAccel: 3200,
};

export const ORB = {
  radius: 10,
  baseScore: 10,
  maxOnScreen: 9,
  spawnStart: 1.05,
  spawnMin: 0.5,
};

export const ROCK = {
  minRadius: 14,
  maxRadius: 34,
  maxOnScreen: 18,
  spawnStart: 1.7,
  spawnMin: 0.65,
  baseSpeed: 62,
  speedPerLevel: 13,
};

export const LIVES = 3;
export const INVINCIBLE_SECONDS = 1.5;
export const COMBO_WINDOW = 4;
export const ORBS_PER_LEVEL = 10;
export const MAX_MULTIPLIER = 8;
export const MAX_PARTICLES = 220;

export const EVENT_COLLECT = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_LEVEL = 8;

// Orb glow colours, cycled as orbs spawn.
export const ORB_COLORS = ['#ffd75e', '#4df3ff', '#c77dff', '#7dff9e'];
