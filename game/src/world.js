// Lumen Drift — the world: ship, orbs, asteroids, particles and stars.
// Pure logic, no DOM and no canvas: the renderer paints this state, and the
// screenshot scenes step it forward. Deterministic for a given seed.
import {
  FIELD_W,
  FIELD_H,
  SHIP,
  ORB,
  ROCK,
  LIVES,
  INVINCIBLE_SECONDS,
  COMBO_WINDOW,
  ORBS_PER_LEVEL,
  MAX_MULTIPLIER,
  MAX_PARTICLES,
  ORB_COLORS,
  EVENT_COLLECT,
  EVENT_HIT,
  EVENT_OVER,
  EVENT_LEVEL,
} from './config.js';
import { range, pick } from './random.js';

export { EVENT_COLLECT, EVENT_HIT, EVENT_OVER, EVENT_LEVEL };

const STAR_COUNT = 90;
const TAU = Math.PI * 2;

function makeStars(rng) {
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i += 1) {
    stars.push({
      x: rng() * FIELD_W,
      y: rng() * FIELD_H,
      layer: Math.floor(rng() * 3),
      size: 0.6 + rng() * 1.5,
      phase: rng() * TAU,
    });
  }
  return stars;
}

function makeOrb(rng, level) {
  return {
    x: range(rng, 36, FIELD_W - 36),
    y: -18,
    r: range(rng, ORB.radius - 1, ORB.radius + 2),
    vy: 34 + level * 2 + rng() * 26,
    wobble: rng() * TAU,
    wobbleAmp: range(rng, 8, 26),
    wobbleSpeed: range(rng, 1.2, 2.6),
    color: pick(rng, ORB_COLORS),
    pulse: rng() * TAU,
  };
}

function makeRock(rng, level) {
  const fromSide = level >= 2 && rng() < 0.3;
  const r = range(rng, ROCK.minRadius, ROCK.maxRadius);
  const speed = ROCK.baseSpeed + level * ROCK.speedPerLevel + rng() * 46;
  const verts = [];
  const points = 9;
  for (let i = 0; i < points; i += 1) {
    verts.push({ a: (i / points) * TAU, f: range(rng, 0.72, 1.12) });
  }
  const rock = {
    x: 0,
    y: 0,
    r,
    vx: 0,
    vy: 0,
    rot: rng() * TAU,
    rotSpeed: range(rng, -1.4, 1.4),
    verts,
  };
  if (fromSide) {
    const left = rng() < 0.5;
    rock.x = left ? -r : FIELD_W + r;
    rock.y = range(rng, 60, FIELD_H * 0.6);
    rock.vx = (left ? 1 : -1) * speed * range(rng, 0.5, 0.9);
    rock.vy = speed * range(rng, 0.25, 0.6);
  } else {
    rock.x = range(rng, 30, FIELD_W - 30);
    rock.y = -r - 4;
    rock.vx = range(rng, -28, 28);
    rock.vy = speed;
  }
  return rock;
}

function burst(rng, state, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    if (state.particles.length >= MAX_PARTICLES) return;
    const a = rng() * TAU;
    const s = range(rng, 40, speed);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: range(rng, 0.3, 0.7),
      max: 0.7,
      color,
      size: range(rng, 1.5, 3.5),
    });
  }
}

export function createWorld(rng) {
  const state = {
    time: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    lives: LIVES,
    level: 1,
    orbsCollected: 0,
    over: false,
    ship: { x: FIELD_W / 2, y: FIELD_H * 0.62, vx: 0, vy: 0, tilt: 0, invincible: 0 },
    orbs: [],
    asteroids: [],
    particles: [],
    stars: makeStars(rng),
    orbIn: 0.4,
    rockIn: 1.2,
    shake: 0,
    flash: 0,
  };

  function reset() {
    state.time = 0;
    state.score = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.lives = LIVES;
    state.level = 1;
    state.orbsCollected = 0;
    state.over = false;
    state.ship.x = FIELD_W / 2;
    state.ship.y = FIELD_H * 0.62;
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.ship.tilt = 0;
    state.ship.invincible = 0;
    state.orbs.length = 0;
    state.asteroids.length = 0;
    state.particles.length = 0;
    state.stars = makeStars(rng);
    state.orbIn = 0.4;
    state.rockIn = 1.2;
    state.shake = 0;
    state.flash = 0;
    for (let i = 0; i < 3; i += 1) {
      const orb = makeOrb(rng, 1);
      orb.y = range(rng, 80, FIELD_H * 0.5);
      state.orbs.push(orb);
    }
    for (let i = 0; i < 2; i += 1) {
      const rock = makeRock(rng, 1);
      rock.y = range(rng, 40, FIELD_H * 0.35);
      state.asteroids.push(rock);
    }
  }

  function levelScale() {
    return Math.min(state.level, 12);
  }

  function spawnTimers(dt) {
    state.orbIn -= dt;
    if (state.orbIn <= 0 && state.orbs.length < ORB.maxOnScreen) {
      state.orbs.push(makeOrb(rng, levelScale()));
      const span = ORB.spawnStart - ORB.spawnMin;
      state.orbIn = ORB.spawnMin + span * (1 - (levelScale() - 1) / 11) + rng() * 0.3;
    }
    state.rockIn -= dt;
    if (state.rockIn <= 0 && state.asteroids.length < ROCK.maxOnScreen) {
      state.asteroids.push(makeRock(rng, levelScale()));
      const span = ROCK.spawnStart - ROCK.spawnMin;
      state.rockIn = ROCK.spawnMin + span * (1 - (levelScale() - 1) / 11) + rng() * 0.4;
    }
  }

  function moveShip(dt, input) {
    const ship = state.ship;
    let ax = 0;
    let ay = 0;
    if (input) {
      if (input.ax !== 0 || input.ay !== 0) {
        ax = input.ax * SHIP.accel;
        ay = input.ay * SHIP.accel;
      } else if (input.px !== null && input.py !== null) {
        const dx = input.px - ship.x;
        const dy = input.py - ship.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
          const pull = Math.min(1, dist / 140) * SHIP.pointerAccel;
          ax = (dx / dist) * pull;
          ay = (dy / dist) * pull;
        }
      }
    }
    ship.vx += ax * dt;
    ship.vy += ay * dt;
    ship.vx *= SHIP.drag;
    ship.vy *= SHIP.drag;
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (speed > SHIP.maxSpeed) {
      ship.vx = (ship.vx / speed) * SHIP.maxSpeed;
      ship.vy = (ship.vy / speed) * SHIP.maxSpeed;
    }
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    if (ship.x < SHIP.radius) {
      ship.x = SHIP.radius;
      ship.vx = 0;
    } else if (ship.x > FIELD_W - SHIP.radius) {
      ship.x = FIELD_W - SHIP.radius;
      ship.vx = 0;
    }
    if (ship.y < SHIP.radius) {
      ship.y = SHIP.radius;
      ship.vy = 0;
    } else if (ship.y > FIELD_H - SHIP.radius) {
      ship.y = FIELD_H - SHIP.radius;
      ship.vy = 0;
    }
    const targetTilt = Math.max(-1, Math.min(1, ship.vx / SHIP.maxSpeed)) * 0.45;
    ship.tilt += (targetTilt - ship.tilt) * Math.min(1, dt * 10);
    if (ship.invincible > 0) ship.invincible -= dt;
  }

  function driftItems(dt) {
    for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
      const orb = state.orbs[i];
      orb.y += orb.vy * dt;
      orb.wobble += orb.wobbleSpeed * dt;
      orb.pulse += dt * 3;
      if (orb.y > FIELD_H + 24) state.orbs.splice(i, 1);
    }
    for (let i = state.asteroids.length - 1; i >= 0; i -= 1) {
      const rock = state.asteroids[i];
      rock.x += rock.vx * dt;
      rock.y += rock.vy * dt;
      rock.rot += rock.rotSpeed * dt;
      if (rock.y > FIELD_H + rock.r + 20 || rock.x < -rock.r - 60 || rock.x > FIELD_W + rock.r + 60) {
        state.asteroids.splice(i, 1);
      }
    }
    for (let i = state.stars.length - 1; i >= 0; i -= 1) {
      const star = state.stars[i];
      star.y += (7 + star.layer * 13) * dt;
      if (star.y > FIELD_H + 2) {
        star.y = -2;
        star.x = rng() * FIELD_W;
      }
    }
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
      if (p.life <= 0) {
        state.particles[i] = state.particles[state.particles.length - 1];
        state.particles.pop();
      }
    }
  }

  function collectOrb(orb) {
    state.orbsCollected += 1;
    state.combo += 1;
    state.comboTimer = COMBO_WINDOW;
    state.multiplier = Math.min(MAX_MULTIPLIER, 1 + Math.floor(state.combo / 4));
    state.score += ORB.baseScore * state.multiplier;
    burst(rng, state, orb.x, orb.y, orb.color, 12, 240);
    let events = EVENT_COLLECT;
    if (state.orbsCollected % ORBS_PER_LEVEL === 0) {
      state.level += 1;
      events |= EVENT_LEVEL;
      burst(rng, state, state.ship.x, state.ship.y, '#ffd75e', 18, 300);
    }
    return events;
  }

  function hitRock(index) {
    const rock = state.asteroids[index];
    state.asteroids.splice(index, 1);
    state.lives -= 1;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.ship.invincible = INVINCIBLE_SECONDS;
    state.shake = 16;
    state.flash = 1;
    burst(rng, state, state.ship.x, state.ship.y, '#ff5a5a', 22, 320);
    burst(rng, state, rock.x, rock.y, '#c9a0a0', 10, 200);
    let events = EVENT_HIT;
    if (state.lives <= 0) {
      state.over = true;
      events |= EVENT_OVER;
      burst(rng, state, state.ship.x, state.ship.y, '#4df3ff', 40, 420);
    }
    return events;
  }

  function collide() {
    const ship = state.ship;
    let events = 0;
    for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
      const orb = state.orbs[i];
      const ox = orb.x + Math.sin(orb.wobble) * orb.wobbleAmp;
      const dx = ox - ship.x;
      const dy = orb.y - ship.y;
      const reach = SHIP.radius + orb.r + 4;
      if (dx * dx + dy * dy < reach * reach) {
        state.orbs.splice(i, 1);
        events |= collectOrb(orb);
      }
    }
    if (ship.invincible <= 0) {
      for (let i = state.asteroids.length - 1; i >= 0; i -= 1) {
        const rock = state.asteroids[i];
        const dx = rock.x - ship.x;
        const dy = rock.y - ship.y;
        const reach = SHIP.radius + rock.r - 4;
        if (dx * dx + dy * dy < reach * reach) {
          events |= hitRock(i);
          break;
        }
      }
    }
    return events;
  }

  function step(dt, input, attract) {
    state.time += dt;
    if (state.shake > 0.3) state.shake *= 0.88;
    else state.shake = 0;
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.5);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.multiplier = 1;
      }
    }
    if (state.over) {
      driftItems(dt);
      return 0;
    }
    if (attract) {
      // Title screen: the ship drifts in a slow loop, orbs and rocks float by,
      // nothing is scored and nothing can hit.
      const ship = state.ship;
      ship.x = FIELD_W / 2 + Math.sin(state.time * 0.45) * 190;
      ship.y = FIELD_H * 0.55 + Math.sin(state.time * 0.8) * 80;
      ship.tilt = Math.cos(state.time * 0.45) * 0.25;
      spawnTimers(dt);
      driftItems(dt);
      return 0;
    }
    spawnTimers(dt);
    moveShip(dt, input);
    driftItems(dt);
    return collide();
  }

  reset();
  return { state, reset, step };
}
