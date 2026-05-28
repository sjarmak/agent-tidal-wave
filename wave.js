/*
 * WaveScene: a tidal wave of agent-written code crashing into a server rack.
 * play(damage 0-100, onDone, {explode}) runs a ~4s animation whose crest height,
 * code volume, spray, shake and destroyed-server count scale with damage — so the
 * wave is literally proportional to how close the guess was. On a perfect hit
 * (explode) the whole rack is launched across the screen. Pure presentation.
 */
const WaveScene = (() => {
  const DURATION = 4000;
  const SERVERS = 6;
  const HEX = '0123456789abcdef';

  const rand = (a, b) => a + Math.random() * (b - a);
  const ease = (t) => t * t * (3 - 2 * t);
  const sha = () => Array.from({ length: 7 }, () => HEX[(Math.random() * 16) | 0]).join('');

  function tokenText() {
    const pool = [
      'Co-authored-by: Claude', sha(), sha(), '+1,204 −88', 'fix: null guard',
      'def handle(req):', 'refactor agent loop', '🤖 claude code', 'merge !4821',
      'noreply@anthropic.com', '+ async fn()', 'test: green', sha(),
    ];
    return pool[(Math.random() * pool.length) | 0];
  }

  let canvas, ctx, W, H, dpr, raf;

  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function setup(el) {
    canvas = el; ctx = canvas.getContext('2d');
    fit();
    window.addEventListener('resize', () => { if (canvas) fit(); });
  }

  function makeServers(destroyCount, explode) {
    const floor = H * 0.82;
    const clusterX = W * 0.60, clusterW = W * 0.34;
    const gap = 14, w = (clusterW - gap * (SERVERS - 1)) / SERVERS, h = H * 0.22;
    const servers = [];
    for (let i = 0; i < SERVERS; i++) {
      const x = clusterX + i * (w + gap);
      servers.push({
        x, y: floor - h, w, h, floor,
        destroyed: i < destroyCount,
        flying: explode && i < destroyCount, // launched on impact when it's a perfect hit
        launched: false, px: x, py: floor - h, angle: 0, vx: 0, vy: 0, av: 0,
        leds: Math.max(2, Math.round(h / 26)),
      });
    }
    return servers;
  }

  function launch(servers) {
    const cx = W * 0.77;
    servers.forEach((s) => {
      if (!s.flying) return;
      s.launched = true;
      const dir = Math.sign((s.x + s.w / 2) - cx) || (Math.random() < 0.5 ? -1 : 1);
      s.vx = dir * rand(6, 17) + rand(-4, 4);
      s.vy = -rand(13, 24);
      s.av = rand(-0.45, 0.45);
    });
  }

  function drawRack(x, y, w, h, leds) {
    ctx.fillStyle = '#0d0d10'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#26262b'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    for (let i = 1; i < leds; i++) {
      const ly = y + (h / leds) * i;
      ctx.strokeStyle = '#1b1b20';
      ctx.beginPath(); ctx.moveTo(x + 4, ly); ctx.lineTo(x + w - 4, ly); ctx.stroke();
    }
    ctx.fillStyle = '#ff5543'; ctx.fillRect(x + w - 9, y + 7, 4, 4);
  }

  function drawServer(s) {
    if (s.flying && s.launched) {            // tumbling through the air
      ctx.save();
      ctx.translate(s.px + s.w / 2, s.py + s.h / 2);
      ctx.rotate(s.angle);
      drawRack(-s.w / 2, -s.h / 2, s.w, s.h, s.leds);
      ctx.restore();
      return;
    }
    if (s.destroyed && !s.flying) {          // rubble (partial damage)
      ctx.fillStyle = '#141417';
      ctx.fillRect(s.x, s.floor - s.h * 0.18, s.w, s.h * 0.18);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = '#1c1c20';
        ctx.fillRect(s.x + rand(0, s.w), s.floor - rand(0, s.h * 0.2), rand(4, 10), rand(3, 7));
      }
      return;
    }
    drawRack(s.x, s.y, s.w, s.h, s.leds);    // standing (incl. pre-launch)
  }

  function waterTopY(x, frontX, crestH, baseY, time) {
    if (x > frontX) return baseY;
    const behind = frontX - x;
    const profile = Math.exp(-Math.pow((behind - W * 0.05) / (W * 0.16), 2));
    const body = crestH * (0.45 + 0.55 * profile);
    const ripple = Math.sin(x * 0.035 + time * 0.012) * (crestH * 0.04);
    return baseY - body - ripple;
  }

  function play(damage, onDone, opts) {
    cancelAnimationFrame(raf);
    fit();
    const explode = !!(opts && opts.explode);
    const d = damage / 100;
    const baseY = H * 0.82;
    const crestH = (0.06 + 0.78 * d) * H;          // miss = splash, hit = tower
    const destroyCount = Math.round(SERVERS * d);
    const servers = makeServers(destroyCount, explode);
    const tokens = makeTokens(Math.round(12 + 320 * d), damage);
    const start = performance.now();
    let crashed = false;

    function frame(now) {
      const p = Math.min((now - start) / DURATION, 1);
      const surge = ease(Math.min(p / 0.7, 1));
      const frontX = -0.12 * W + 1.18 * W * surge;
      const crashAt = W * 0.60;

      if (frontX >= crashAt && !crashed) {
        crashed = true; launch(servers);
        if (opts && opts.onCrash) opts.onCrash();
      }
      const shake = crashed && p < 0.85 ? (0.85 - p) / 0.85 * d * 22 : 0;

      ctx.save();
      ctx.clearRect(0, 0, W, H);
      ctx.translate(rand(-shake, shake), rand(-shake, shake));

      ctx.strokeStyle = '#26262b'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, baseY + 0.5); ctx.lineTo(W, baseY + 0.5); ctx.stroke();

      // integrate flying servers
      if (crashed) {
        servers.forEach((s) => {
          if (!s.launched) return;
          s.px += s.vx; s.py += s.vy; s.vy += 0.5; s.vx *= 0.99; s.angle += s.av;
        });
      }
      servers.forEach((s) => { if (!s.launched) drawServer(s); }); // standing/rubble behind the water

      // wave body
      const grad = ctx.createLinearGradient(0, baseY - crestH, 0, baseY);
      grad.addColorStop(0, 'rgba(255,85,67,0.95)');
      grad.addColorStop(0.5, 'rgba(232,52,31,0.85)');
      grad.addColorStop(1, 'rgba(120,18,12,0.9)');
      const step = Math.max(6, W / 220);
      ctx.beginPath(); ctx.moveTo(0, baseY);
      for (let x = 0; x <= Math.min(frontX, W); x += step) ctx.lineTo(x, waterTopY(x, frontX, crestH, baseY, now));
      ctx.lineTo(Math.min(frontX, W), baseY); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,180,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= Math.min(frontX, W); x += step) {
        const y = waterTopY(x, frontX, crestH, baseY, now);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      // code tokens riding / spraying
      tokens.forEach((t) => {
        if (!t.spray) {
          const tx = frontX * (0.15 + t.bx);
          t.x = Math.min(tx, frontX - 4);
          t.y = waterTopY(tx, frontX, crestH, baseY, now) + t.yOff * crestH * 0.7 + 8;
          if (crashed && t.x > crashAt - W * 0.08 && Math.random() < 0.25) {
            t.spray = true; t.vx = rand(2, 9) * t.sprayPow; t.vy = -rand(6, 16) * t.sprayPow;
          }
        } else {
          t.vy += 0.45; t.x += t.vx; t.y += t.vy; t.alpha *= 0.985;
        }
        ctx.globalAlpha = Math.max(0, t.alpha);
        ctx.fillStyle = t.spray ? '#ffd9cf' : '#fff';
        ctx.font = `600 ${t.size}px var(--font-mono), monospace`;
        ctx.fillText(t.text, t.x, t.y);
      });
      ctx.globalAlpha = 1;

      if (crashed && p < 0.86) {
        const fa = (0.86 - p) / 0.86 * d;
        const fg = ctx.createRadialGradient(crashAt, baseY - crestH * 0.4, 10, crashAt, baseY - crestH * 0.4, W * 0.4);
        fg.addColorStop(0, `rgba(255,120,90,${0.5 * fa})`);
        fg.addColorStop(1, 'rgba(255,120,90,0)');
        ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
      }

      servers.forEach((s) => { if (s.launched) drawServer(s); }); // flying servers ON TOP of the wave

      ctx.restore();
      if (p < 1) raf = requestAnimationFrame(frame); else onDone();
    }
    raf = requestAnimationFrame(frame);
  }

  function makeTokens(count, damage) {
    const toks = [];
    for (let i = 0; i < count; i++) {
      toks.push({
        bx: rand(-0.2, 0.4), yOff: rand(0, 1), size: rand(10, 18),
        text: tokenText(), alpha: rand(0.35, 0.9),
        spray: false, vx: 0, vy: 0, x: 0, y: 0, sprayPow: 0.4 + damage / 120,
      });
    }
    return toks;
  }

  function stop() { cancelAnimationFrame(raf); }

  // Ambient attract loop: a continuous flowing wave with drifting code tokens — no
  // crashes, no resets, no full-cycle play. Different shape from play() on purpose;
  // looping play() at the booth felt off/on. Halt via stop().
  function startAttract() {
    cancelAnimationFrame(raf);
    fit();
    const baseY = H * 0.82;
    const TOKEN_COUNT = 200;
    const tokens = [];
    for (let i = 0; i < TOKEN_COUNT; i++) {
      tokens.push({
        x: Math.random() * W,
        yOff: Math.random(),
        vx: 0.5 + Math.random() * 1.7,
        size: 10 + Math.random() * 8,
        text: tokenText(),
        alpha: 0.22 + Math.random() * 0.5,
      });
    }
    function surfaceOffset(x, t, crestH) {
      return Math.sin(x * 0.012 + t * 1.6) * (crestH * 0.06)
           + Math.sin(x * 0.04 + t * 0.9) * (crestH * 0.03);
    }
    function frame(now) {
      const t = now * 0.001;
      // height breathes slowly — keeps motion alive without ever resetting
      const crestH = 0.40 * H + Math.sin(t * 0.45) * 0.07 * H;
      ctx.save();
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = '#26262b'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, baseY + 0.5); ctx.lineTo(W, baseY + 0.5); ctx.stroke();
      // water body
      const grad = ctx.createLinearGradient(0, baseY - crestH, 0, baseY);
      grad.addColorStop(0, 'rgba(255,85,67,0.82)');
      grad.addColorStop(0.55, 'rgba(232,52,31,0.78)');
      grad.addColorStop(1, 'rgba(120,18,12,0.85)');
      const step = Math.max(6, W / 220);
      ctx.beginPath(); ctx.moveTo(0, baseY);
      for (let x = 0; x <= W; x += step) ctx.lineTo(x, baseY - crestH - surfaceOffset(x, t, crestH));
      ctx.lineTo(W, baseY); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,180,0.38)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= W; x += step) {
        const y = baseY - crestH - surfaceOffset(x, t, crestH);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      // drifting code tokens — recycle off the right edge
      tokens.forEach((tk) => {
        tk.x += tk.vx;
        if (tk.x > W + 80) {
          tk.x = -80; tk.text = tokenText();
          tk.alpha = 0.22 + Math.random() * 0.5; tk.yOff = Math.random();
        }
        const y = baseY - crestH - surfaceOffset(tk.x, t, crestH) + tk.yOff * (crestH - 18) + 14;
        ctx.globalAlpha = tk.alpha;
        ctx.fillStyle = '#fff';
        ctx.font = `600 ${tk.size}px var(--font-mono), monospace`;
        ctx.fillText(tk.text, tk.x, y);
      });
      ctx.globalAlpha = 1;
      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  return Object.freeze({ setup, play, stop, startAttract });
})();
