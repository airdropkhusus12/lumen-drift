// Lumen Drift — the renderer: paints the world state on a full-window canvas.
// The logical field is letterboxed and scaled to fit; all art is drawn with the
// canvas API (glow, gradients, polygons), so the game needs no image files.
import { FIELD_W, FIELD_H, ORBS_PER_LEVEL } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let cw = 0;
  let ch = 0;
  let scale = 1;
  let ox = 0;
  let oy = 0;
  let bg = null;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = canvas.clientWidth || FIELD_W;
    ch = canvas.clientHeight || FIELD_H;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(cw / FIELD_W, ch / FIELD_H);
    ox = (cw - FIELD_W * scale) / 2;
    oy = (ch - FIELD_H * scale) / 2;
    bg = ctx.createLinearGradient(0, 0, 0, ch);
    bg.addColorStop(0, '#070718');
    bg.addColorStop(0.55, '#0a0a26');
    bg.addColorStop(1, '#120a24');
  }

  window.addEventListener('resize', resize);
  resize();

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - ox) / scale,
      y: (clientY - rect.top - oy) / scale,
    };
  }

  function drawShip(state) {
    const ship = state.ship;
    if (ship.invincible > 0 && Math.floor(state.time * 12) % 2 === 0) return;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.tilt);
    ctx.shadowColor = '#4df3ff';
    ctx.shadowBlur = 18;
    // Engine flame: flickers with time and stretches with speed.
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    const flame = 12 + speed * 0.03 + Math.sin(state.time * 42) * 4;
    ctx.fillStyle = '#ff9a3d';
    ctx.beginPath();
    ctx.moveTo(-10, 5);
    ctx.lineTo(-10 - flame, 0);
    ctx.lineTo(-10, -5);
    ctx.closePath();
    ctx.fill();
    // Hull: a sleek dart.
    const grad = ctx.createLinearGradient(-14, 0, 16, 0);
    grad.addColorStop(0, '#1b6f8f');
    grad.addColorStop(0.6, '#4df3ff');
    grad.addColorStop(1, '#d8fbff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fill();
    // Cockpit.
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(5, 0, 3.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawOrb(orb) {
    const x = orb.x + Math.sin(orb.wobble) * orb.wobbleAmp;
    const r = orb.r * (1 + 0.12 * Math.sin(orb.pulse));
    ctx.save();
    ctx.shadowColor = orb.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = orb.color;
    ctx.beginPath();
    ctx.arc(x, orb.y, r, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x, orb.y, r * 0.42, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawRock(rock) {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.rot);
    ctx.fillStyle = '#5d4a4a';
    ctx.strokeStyle = '#b07a7a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < rock.verts.length; i += 1) {
      const v = rock.verts[i];
      const px = Math.cos(v.a) * rock.r * v.f;
      const py = Math.sin(v.a) * rock.r * v.f;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(-rock.r * 0.25, rock.r * 0.15, rock.r * 0.22, 0, TAU);
    ctx.arc(rock.r * 0.3, -rock.r * 0.25, rock.r * 0.16, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawHud(state, best, muted) {
    ctx.save();
    ctx.textBaseline = 'top';
    // Score, top left.
    ctx.fillStyle = '#eaf6ff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(state.score).padStart(6, '0'), 18, 14);
    ctx.fillStyle = '#8fa8c8';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('BEST ' + String(Math.max(best, state.score)).padStart(6, '0'), 18, 44);
    // Level progress bar under the score.
    const pw = 150;
    const done = (state.orbsCollected % ORBS_PER_LEVEL) / ORBS_PER_LEVEL;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(18, 64, pw, 6);
    ctx.fillStyle = '#ffd75e';
    ctx.fillRect(18, 64, pw * done, 6);
    ctx.fillStyle = '#8fa8c8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('LEVEL ' + state.level, 18, 74);
    // Lives, top right, as hearts.
    ctx.font = '24px system-ui, sans-serif';
    ctx.textAlign = 'right';
    let hearts = '';
    for (let i = 0; i < state.lives; i += 1) hearts += '♥';
    ctx.fillStyle = '#ff5a7a';
    ctx.shadowColor = '#ff5a7a';
    ctx.shadowBlur = 10;
    ctx.fillText(hearts, FIELD_W - 18, 12);
    ctx.shadowBlur = 0;
    // Combo, top centre, only while it matters.
    if (state.combo >= 2) {
      ctx.textAlign = 'center';
      ctx.fillStyle = state.multiplier >= 4 ? '#ffd75e' : '#4df3ff';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.fillText('COMBO x' + state.multiplier, FIELD_W / 2, 14);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#8fa8c8';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(state.combo + ' in a row', FIELD_W / 2, 44);
    }
    // Mute hint, bottom right.
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(143,168,200,0.7)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(muted ? 'M: SOUND OFF' : 'M: SOUND ON', FIELD_W - 14, FIELD_H - 22);
    ctx.restore();
  }

  function dim(alpha) {
    ctx.fillStyle = 'rgba(4,4,16,' + alpha + ')';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  }

  function centreText(text, y, font, color, glow) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = font;
    if (glow) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = 24;
    }
    ctx.fillStyle = color;
    ctx.fillText(text, FIELD_W / 2, y);
    ctx.restore();
  }

  function drawTitle(state, best) {
    dim(0.55);
    centreText('LUMEN DRIFT', 150, 'bold 68px system-ui, sans-serif', '#eaf6ff', '#4df3ff');
    centreText('a neon drift arcade', 200, '20px system-ui, sans-serif', '#8fa8c8');
    centreText('Steer with arrows / WASD or the mouse. Collect lumen orbs, dodge the rocks.', 258, '17px system-ui, sans-serif', '#cfe3ff');
    centreText('Chain orbs without a hit to raise your combo up to x8. 3 lives. Good luck.', 286, '17px system-ui, sans-serif', '#cfe3ff');
    centreText('P pause   ·   M mute', 320, '15px system-ui, sans-serif', '#8fa8c8');
    if (best > 0) centreText('BEST  ' + String(best).padStart(6, '0'), 366, 'bold 20px system-ui, sans-serif', '#ffd75e');
    if (Math.floor(state.time * 1.6) % 2 === 0) {
      centreText('PRESS ENTER OR CLICK TO START', 440, 'bold 22px system-ui, sans-serif', '#4df3ff', '#4df3ff');
    }
  }

  function drawPaused() {
    dim(0.6);
    centreText('PAUSED', FIELD_H / 2 - 20, 'bold 52px system-ui, sans-serif', '#eaf6ff', '#4df3ff');
    centreText('P or Esc to resume', FIELD_H / 2 + 34, '18px system-ui, sans-serif', '#8fa8c8');
  }

  function drawOver(state, best) {
    dim(0.62);
    centreText('GAME OVER', 168, 'bold 58px system-ui, sans-serif', '#ff5a7a', '#ff5a7a');
    centreText('SCORE  ' + String(state.score).padStart(6, '0'), 244, 'bold 28px system-ui, sans-serif', '#eaf6ff');
    centreText('BEST  ' + String(Math.max(best, state.score)).padStart(6, '0'), 282, '20px system-ui, sans-serif', '#ffd75e');
    if (state.score > 0 && state.score >= best) {
      centreText('NEW BEST!', 322, 'bold 22px system-ui, sans-serif', '#ffd75e', '#ffd75e');
    }
    centreText('Level reached: ' + state.level + '   ·   Orbs collected: ' + state.orbsCollected, 362, '16px system-ui, sans-serif', '#8fa8c8');
    if (Math.floor(state.time * 1.6) % 2 === 0) {
      centreText('PRESS ENTER OR CLICK TO PLAY AGAIN', 440, 'bold 21px system-ui, sans-serif', '#4df3ff', '#4df3ff');
    }
  }

  function draw(state, screen, best, muted) {
    ctx.save();
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.rect(0, 0, FIELD_W, FIELD_H);
    ctx.clip();
    if (state.shake > 0) {
      const sx = Math.sin(state.time * 127.1) * state.shake;
      const sy = Math.cos(state.time * 149.7) * state.shake;
      ctx.translate(sx, sy);
    }
    // Starfield, three parallax layers.
    for (let i = 0; i < state.stars.length; i += 1) {
      const star = state.stars[i];
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(state.time * 1.5 + star.phase));
      ctx.globalAlpha = tw * (0.35 + star.layer * 0.25);
      ctx.fillStyle = star.layer === 2 ? '#cfe9ff' : '#8fa8c8';
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < state.orbs.length; i += 1) drawOrb(state.orbs[i]);
    for (let i = 0; i < state.asteroids.length; i += 1) drawRock(state.asteroids[i]);
    for (let i = 0; i < state.particles.length; i += 1) {
      const p = state.particles[i];
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (screen !== SCREEN_OVER) drawShip(state);
    if (state.flash > 0) {
      ctx.fillStyle = 'rgba(255,40,40,' + (state.flash * 0.16).toFixed(3) + ')';
      ctx.fillRect(-20, -20, FIELD_W + 40, FIELD_H + 40);
    }
    drawHud(state, best, muted);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
    ctx.restore();
  }

  return { draw, toLogical, resize };
}
