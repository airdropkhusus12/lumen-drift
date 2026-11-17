// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world, steered by a simple autopilot, so the frame is what a
// short game really looks like and the same seed always gives the same frame.
import { FIELD_W, FIELD_H, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;

/**
 * Steer toward the nearest orb. A careful pilot also pushes away from nearby
 * rocks; a reckless one (the end scene) chases orbs blindly and gets caught.
 */
function autopilot(state, reckless, rng) {
  const ship = state.ship;
  let orb = null;
  let bestD = Infinity;
  for (let i = 0; i < state.orbs.length; i += 1) {
    const o = state.orbs[i];
    const dx = o.x - ship.x;
    const dy = o.y - ship.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      orb = o;
    }
  }
  let sx;
  let sy;
  if (orb) {
    sx = orb.x - ship.x;
    sy = orb.y - ship.y;
  } else {
    sx = FIELD_W / 2 - ship.x;
    sy = FIELD_H / 2 - ship.y;
  }
  const len = Math.sqrt(sx * sx + sy * sy) || 1;
  sx /= len;
  sy /= len;
  if (reckless) {
    // A hurried player wanders: a random nudge each step, no rock avoidance.
    sx += (rng() - 0.5) * 0.9;
    sy += (rng() - 0.5) * 0.9;
  } else {
    for (let i = 0; i < state.asteroids.length; i += 1) {
      const rock = state.asteroids[i];
      const dx = ship.x - rock.x;
      const dy = ship.y - rock.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const danger = rock.r + 120;
      if (d < danger && d > 0.01) {
        const w = ((danger - d) / danger) * 1.7;
        sx += (dx / d) * w;
        sy += (dy / d) * w;
      }
    }
  }
  const l = Math.sqrt(sx * sx + sy * sy) || 1;
  return { ax: sx / l, ay: sy / l, px: null, py: null };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world, rng) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < Math.floor(START_SECONDS / STEP); i += 1) world.step(STEP, null, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const reckless = name === 'end';
  const limit = reckless ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const steps = Math.floor(limit / STEP);
  for (let i = 0; i < steps; i += 1) {
    const events = world.step(STEP, autopilot(world.state, reckless, rng), false);
    if (events & EVENT_OVER) break;
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
