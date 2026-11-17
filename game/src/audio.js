// Synthesised sound effects: every sound is a WebAudio oscillator, no audio files.
// Everything is guarded so a missing or blocked AudioContext never breaks the game.
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  // One short enveloped tone. `slideTo` glides the pitch; `delay` staggers notes.
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    try {
      const t0 = ac.currentTime + (delay || 0);
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // A sound that fails to play is never worth crashing the game over.
    }
  }

  function unlock() {
    const ac = ensure();
    if (ac && ac.state === 'suspended') {
      try {
        const p = ac.resume();
        if (p && p.catch) p.catch(() => {});
      } catch {
        // Ignore.
      }
    }
  }

  function collect(combo) {
    const step = Math.min(combo, 12);
    tone(520 + step * 36, 0.14, 'sine', 0.16, 940 + step * 36);
  }

  function hit() {
    tone(170, 0.28, 'sawtooth', 0.22, 55);
    tone(90, 0.32, 'square', 0.12, 40, 0.02);
  }

  function levelUp() {
    tone(523, 0.12, 'triangle', 0.16);
    tone(659, 0.12, 'triangle', 0.16, undefined, 0.09);
    tone(784, 0.2, 'triangle', 0.18, undefined, 0.18);
  }

  function start() {
    tone(330, 0.1, 'sine', 0.14, 660);
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  return {
    unlock,
    collect,
    hit,
    levelUp,
    start,
    toggleMute,
    get muted() {
      return muted;
    },
  };
}
