/*
 * Synthesized sound effects via Web Audio — no asset files, works offline.
 * Browsers block audio until a user gesture, so call unlock() on first interaction.
 * All effects are no-ops when muted or if Web Audio is unavailable.
 */
const Sound = (() => {
  let ctx = null, master = null, muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const unlock = () => ensure();
  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }
  const toggleMute = () => { setMuted(!muted); return muted; };

  function noise(dur) {
    const c = ensure(), n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function env(node, t, peak, dur) {
    const g = ensure().createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g); g.connect(master);
    return g;
  }

  function wave() { // rising filtered-noise whoosh as the wave surges
    const c = ensure(); if (!c || muted) return;
    const t = c.currentTime, src = c.createBufferSource(); src.buffer = noise(1.7);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8;
    f.frequency.setValueAtTime(160, t); f.frequency.exponentialRampToValueAtTime(950, t + 1.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 1.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    src.connect(f); f.connect(g); g.connect(master); src.start(t); src.stop(t + 1.8);
  }
  function impact(intensity) { // low boom + crack, louder with intensity 0..1
    const c = ensure(); if (!c || muted) return;
    const t = c.currentTime, amp = 0.35 + 0.55 * (intensity || 0.5);
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.5);
    env(o, t, amp, 0.6); o.start(t); o.stop(t + 0.6);
    const ns = c.createBufferSource(); ns.buffer = noise(0.3);
    const nf = c.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 1400;
    ns.connect(nf); env(nf, t, amp * 0.6, 0.3); ns.start(t); ns.stop(t + 0.3);
  }
  function ding() { // leaderboard confirmation blip
    const c = ensure(); if (!c || muted) return;
    const t = c.currentTime, o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 880;
    env(o, t, 0.4, 0.4); o.start(t); o.stop(t + 0.4);
  }
  function fanfare() { // perfect-hit jackpot arpeggio
    const c = ensure(); if (!c || muted) return;
    const t = c.currentTime;
    [523, 659, 784, 1047].forEach((fr, i) => {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = fr;
      env(o, t + i * 0.09, 0.4, 0.5); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.5);
    });
  }

  return Object.freeze({ unlock, setMuted, toggleMute, wave, impact, ding, fanfare, isMuted: () => muted });
})();
