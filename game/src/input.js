// Keyboard and mouse input. Keys drive the ship; moving the mouse steers it too
// (the ship chases the pointer). Clicks and Enter/Space confirm; P or Escape pauses.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const CONFIRM_KEYS = ['Enter', ' ', 'Spacebar'];
const PAUSE_KEYS = ['p', 'P', 'Escape'];
const MUTE_KEYS = ['m', 'M'];

export function createInput(canvas, toLogical) {
  const keys = new Set();
  let actions = 0;
  let pointerX = null;
  let pointerY = null;
  let pointerAt = 0;

  function onKeyDown(event) {
    if (CONFIRM_KEYS.includes(event.key) || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    if (CONFIRM_KEYS.includes(event.key)) actions |= ACTION_CONFIRM;
    if (PAUSE_KEYS.includes(event.key)) actions |= ACTION_PAUSE;
    if (MUTE_KEYS.includes(event.key)) actions |= ACTION_MUTE;
  }

  function onKeyUp(event) {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  }

  function onPointerMove(event) {
    const p = toLogical(event.clientX, event.clientY);
    pointerX = p.x;
    pointerY = p.y;
    pointerAt = performance.now();
  }

  function onPointerDown(event) {
    onPointerMove(event);
    actions |= ACTION_CONFIRM;
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);

  function down(...names) {
    for (let i = 0; i < names.length; i += 1) {
      if (keys.has(names[i])) return true;
    }
    return false;
  }

  // Unit-ish steering vector from the keys, or {x:0,y:0} when none are held.
  function axis() {
    let x = 0;
    let y = 0;
    if (down('ArrowLeft', 'a')) x -= 1;
    if (down('ArrowRight', 'd')) x += 1;
    if (down('ArrowUp', 'w')) y -= 1;
    if (down('ArrowDown', 's')) y += 1;
    if (x !== 0 && y !== 0) {
      x *= 0.7071;
      y *= 0.7071;
    }
    return { x, y };
  }

  // The pointer target in field coordinates, or null when the mouse has not
  // moved recently (the ship then holds still instead of chasing stale input).
  function pointer(now) {
    if (pointerX === null || now - pointerAt > 3000) return null;
    return { x: pointerX, y: pointerY };
  }

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  return { axis, pointer, takeActions };
}
