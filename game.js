/*
 * Game flow: title -> guess (rotating question) -> wave crash -> reveal -> leaderboard.
 * A different question is drawn each play (spoiler-proof + replayable). Damage =
 * proximity; WaveScene visualizes it, and a perfect hit sends the servers flying.
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabel = (ym) => { const [y, m] = ym.split('-'); return `${MON[+m - 1]} ${y}`; };
  const CONFIG = GAME_DATA.config;

  const screens = ['title-screen', 'guess-screen', 'wave-screen', 'result-screen'];
  const show = (id) => screens.forEach((s) => $(s).classList.toggle('active', s === id));

  // ---- formatting (consistent 0.1M granularity everywhere) ----
  function compact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';   // always one decimal in the M range
    if (n >= 1e3) return Math.round(n / 1e3) + 'K';
    return String(Math.round(n));
  }
  function formatValue(v, q) {
    if (q.format === 'x') return Math.round(v) + '×';
    if (q.format === 'pct') return v.toFixed(2) + '%';
    return compact(v);
  }
  function actualDisplay(q) {
    if (q.type === 'date') return monthLabel(q.months[q.answerIndex]);
    if (q.format === 'compact') return q.answer.toLocaleString('en-US'); // exact = the payoff
    return formatValue(q.answer, q);
  }

  // ---- slider mapping ----
  // number: log scale between min/max, snapped to the display granularity so the
  // value you SEE is the value you guess (0.1M steps in the millions, etc.).
  function snap(raw, q) {
    if (q.format === 'x') return Math.round(raw);
    if (q.format === 'pct') return Math.round(raw * 100) / 100;
    if (raw >= 1e6) return Math.round(raw / 1e5) * 1e5;
    if (raw >= 1e3) return Math.round(raw / 1e3) * 1e3;
    return Math.round(raw);
  }
  function sliderNumber(t, q) {
    const raw = q.min * Math.pow(q.max / q.min, t / 1000);
    return snap(raw, q);
  }
  const sliderDateIndex = (t, q) => Math.round((t / 1000) * (q.months.length - 1));

  // ---- state ----
  let currentQ = null, lastQid = null, lastResult = null, savedThisRound = false;
  const slider = $('guess-slider');

  // ---- question rotation: a shuffled bag (deck). We deal the whole bank before any
  // repeat, then reshuffle — so a player cycles through EVERY question once per pass.
  // On reshuffle we keep the freshly-dealt question off the top so the bag boundary
  // never produces back-to-back duplicates.
  let bag = [];
  function shuffled(arr) {
    const a = arr.slice();                       // copy — never mutate the frozen bank
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function refillBag() {
    const next = shuffled(GAME_DATA.questions);
    if (next.length > 1 && lastQid !== null && next[0].id === lastQid) {
      [next[0], next[1]] = [next[1], next[0]];   // avoid a boundary repeat
    }
    bag = next;
  }
  function pickQuestion() {
    if (bag.length === 0) refillBag();
    const q = bag.shift();
    lastQid = q.id;
    return q;
  }

  function currentGuess() {
    const t = +slider.value;
    return currentQ.type === 'date'
      ? { index: sliderDateIndex(t, currentQ) }
      : { value: sliderNumber(t, currentQ) };
  }

  function updateReadout() {
    const g = currentGuess();
    $('readout-num').textContent = currentQ.type === 'date'
      ? monthLabel(currentQ.months[g.index])
      : formatValue(g.value, currentQ);
  }

  function buildScale(q) {
    const el = $('slider-scale');
    if (q.type === 'date') {
      el.innerHTML = `<span>${monthLabel(q.months[0])}</span>` +
        `<span>${monthLabel(q.months[q.months.length - 1])}</span>`;
      return;
    }
    el.innerHTML = [0, 0.25, 0.5, 0.75, 1]
      .map((f) => `<span>${formatValue(snap(q.min * Math.pow(q.max / q.min, f), q), q)}</span>`).join('');
  }

  function setupGuess() {
    currentQ = pickQuestion();
    savedThisRound = false;
    $('round-eyebrow').textContent = currentQ.type === 'date'
      ? 'Round · the inflection' : 'Round · the magnitude';
    $('prompt-text').textContent = currentQ.prompt;
    buildScale(currentQ);
    slider.value = 500;
    const hint = $('hint-line');
    hint.style.display = currentQ.hint ? '' : 'none';
    hint.textContent = currentQ.hint || '';
    updateReadout();
    show('guess-screen');
  }

  // ---- wave ----
  WaveScene.setup($('wave-canvas'));

  function runWave() {
    const q = currentQ, g = currentGuess();
    const res = q.type === 'date'
      ? Scoring.evaluateMonths(g.index, q.answerIndex)
      : Scoring.evaluate(g.value, q.answer);
    lastResult = { q, guess: g, ...res };
    show('wave-screen');
    Sound.wave();
    const onCrash = () => { Sound.impact(res.damage / 100); if (res.damage >= 95) Sound.fanfare(); };
    requestAnimationFrame(() => WaveScene.play(res.damage, () => reveal(), { explode: res.damage >= 95, onCrash }));
  }

  // ---- reveal ----
  function reveal() {
    const { q, guess, damage, tier } = lastResult;
    const tierEl = $('result-tier');
    tierEl.textContent = tier.label;
    tierEl.className = 'result-tier tier-' + tier.key;
    const guessText = q.type === 'date' ? monthLabel(q.months[guess.index]) : formatValue(guess.value, q);
    const actualText = actualDisplay(q);
    lastResult.guessText = guessText; lastResult.actualText = actualText; lastResult.tierLabel = tier.label;
    $('r-damage').textContent = damage + '%';
    $('r-guess').textContent = guessText;
    $('r-real').textContent = actualText;

    let off;
    if (q.type === 'date') {
      off = lastResult.monthsApart === 0 ? 'spot on' :
        `${lastResult.monthsApart} month${lastResult.monthsApart > 1 ? 's' : ''} off`;
    } else {
      off = lastResult.overUnder === 'exact' ? 'spot on' :
        `${lastResult.offByX.toFixed(lastResult.offByX < 10 ? 1 : 0)}× ${lastResult.overUnder}`;
    }
    $('r-caveat').innerHTML =
      `You were <b style="color:var(--sg-cream)">${off}</b>. ${q.reveal} ` +
      `Lower bound: only commits explicitly signed “Co-authored-by: Claude.” ` +
      `Source: ${GAME_DATA.source}.`;
    // Returning players (already claimed once) climb automatically; brand-new players
    // are offered the claim on this screen instead (see renderResultIdentity).
    if (activePlayer) saveResult();
    show('result-screen');
    requestAnimationFrame(() => { drawSpark(); renderLeaderboard(); renderResultIdentity(); updateActiveChip(); });
  }

  // ---- reveal sparkline (real series, linear y for hockey-stick drama) ----
  function drawSpark() {
    const c = $('spark'), ctx = c.getContext('2d');
    const W = c.clientWidth, H = c.clientHeight, pad = 14; // measure BEFORE mutating size
    if (!W) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = W * dpr; c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = GAME_DATA.series, top = Math.max(...s.map((d) => d.v));
    const bw = (W - pad * 2) / s.length;
    s.forEach((d, i) => {
      const bh = (d.v / top) * (H - pad * 2);
      const x = pad + i * bw, y = H - pad - bh;
      ctx.fillStyle = d.partial ? '#5a2a24' : '#ff5543';
      ctx.globalAlpha = d.partial ? 1 : 0.35 + 0.65 * (d.v / top); // brighten with magnitude
      ctx.fillRect(x, y, bw - 2, bh);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#6e6e6e'; ctx.font = '10px var(--font-mono), monospace';
    ctx.fillText('Sep 2024', pad, H - 3);
    ctx.fillText('May 2026', W - pad - 48, H - 3);
    ctx.fillStyle = '#a8a29a';
    ctx.fillText('agent-signed commits / month (real data)', pad, 12);
  }

  // ---- leaderboard: hourly (resets each clock hour) + overall (cumulative, climb by replay).
  // Events are the single source of truth; both views derive from them. Email is the identity
  // + prize-eligibility key and is NEVER rendered on screen — only the player's name is shown.
  const EV_KEY = 'agent_wave_events';
  const loadEvents = () => { try { return JSON.parse(localStorage.getItem(EV_KEY)) || []; } catch { return []; } };
  const saveEvents = (ev) => { try { localStorage.setItem(EV_KEY, JSON.stringify(ev.slice(-800))); } catch { /* kiosk may block */ } };
  const safe = (s) => String(s == null ? '' : s).replace(/[<>&]/g, '');
  let highlightId = null, highlightEmail = null, shownBucket = null, lbView = 'overall';

  // Identity persists across reloads/returns so a signed-in player is never re-prompted;
  // the booth resets between people with the "different player" sign-out.
  const PLAYER_KEY = 'agent_wave_player';
  const loadPlayer = () => { try { return JSON.parse(localStorage.getItem(PLAYER_KEY)) || null; } catch { return null; } };
  const savePlayer = (p) => { try { localStorage.setItem(PLAYER_KEY, JSON.stringify(p)); } catch { /* kiosk may block */ } };
  const clearPlayer = () => { try { localStorage.removeItem(PLAYER_KEY); } catch { /* ignore */ } };
  let activePlayer = loadPlayer();   // {email, name} when signed in

  // ---- durable lead capture (optional + resilient): POST each consented join to
  // config.submitUrl; failures queue locally and retry. The local store stays the backup.
  const PENDING_KEY = 'agent_wave_pending';
  const loadPending = () => { try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || []; } catch { return []; } };
  const savePending = (q) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(q.slice(-200))); } catch { /* ignore */ } };
  const queuePending = (p) => { const q = loadPending(); q.push(p); savePending(q); };
  async function postLead(payload) {
    // text/plain + no-cors = a simple request (no preflight) the endpoint just appends;
    // we don't read the opaque response, so a real send can't be falsely retried.
    await fetch(CONFIG.submitUrl, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  }
  async function flushPending() {
    if (!CONFIG.submitUrl) return;
    const q = loadPending(); if (!q.length) return;
    const remaining = [];
    for (const p of q) { try { await postLead(p); } catch { remaining.push(p); } }
    savePending(remaining);
  }
  function submitLead(entry) {
    if (!CONFIG.submitUrl) return; // local-only mode (localStorage + awExport CSV)
    const payload = { email: entry.email, name: entry.name, damage: entry.damage, ts: new Date(entry.id).toISOString() };
    postLead(payload).then(flushPending).catch(() => queuePending(payload));
  }

  // Persist the current round under the signed-in identity: local events (the board's
  // source of truth) + optional durable lead POST + the shared Postgres board. Runs at
  // most once per round. Returning players trigger it automatically in reveal(); a new
  // player triggers it by claiming.
  function saveResult() {
    if (!activePlayer || savedThisRound || !lastResult) return;
    const entry = { id: Date.now(), email: activePlayer.email, name: activePlayer.name, damage: lastResult.damage };
    const events = loadEvents();
    events.push(entry); saveEvents(events);
    submitLead(entry);
    highlightEmail = activePlayer.email; highlightId = entry.id; savedThisRound = true;
    lastServerStanding = null;
    postScore(entry).then((resp) => {       // climb the shared board
      if (resp && resp.ok) lastServerStanding = resp;
      updateActiveChip(); renderLeaderboard();
    });
    Sound.ding();
  }

  const hourBucket = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`; };
  const fmtHour = (x) => `${x % 12 || 12}${x < 12 ? 'am' : 'pm'}`;
  const hourLabel = (ts) => { const h = new Date(ts).getHours(); return `${fmtHour(h)}–${fmtHour((h + 1) % 24)}`; };
  function countdownText() {
    const now = new Date(), next = new Date(now); next.setHours(now.getHours() + 1, 0, 0, 0);
    const ms = next - now;
    return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
  }

  const lbRow = (i, nm, score, you) =>
    `<div class="row${you ? ' you' : ''}"><span class="rank">${i + 1}</span><span class="nm">${nm}</span><b>${score}</b></div>`;
  const lbEmpty = (t) => `<div class="lb-empty-row">${t}</div>`;

  function overallStandings(events) {
    const by = {};
    events.forEach((e) => {
      if (!e.email) return;                       // only emailed plays count (eligibility)
      const p = by[e.email] || (by[e.email] = { email: e.email, name: e.name, total: 0, plays: 0 });
      p.total += e.damage; p.plays += 1; p.name = e.name;
    });
    return Object.values(by).sort((a, b) => b.total - a.total);
  }

  // --- shared board (Postgres API) with local fallback ---
  let serverHourResetAt = 0, lastServerStanding = null;
  const isYouName = (name) => !!activePlayer && activePlayer.name === name;
  const lbTabs = () => '<div class="lb-tabs">' +
    `<button data-view="overall" class="${lbView === 'overall' ? 'active' : ''}">Overall</button>` +
    `<button data-view="hour" class="${lbView === 'hour' ? 'active' : ''}">This hour</button></div>`;
  const paint = (html) => document.querySelectorAll('[data-lb]').forEach((el) => { el.innerHTML = html; });
  const fmtReset = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  async function serverBoard(view) {
    try {
      const r = await fetch(`/api/leaderboard?view=${view}`, { cache: 'no-store' });
      if (!r.ok) return null;
      const j = await r.json();
      return Array.isArray(j.rows) ? j : null;
    } catch { return null; }
  }
  async function postScore(entry) {
    try {
      const r = await fetch('/api/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: entry.email, name: entry.name, damage: entry.damage }),
      });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }

  function renderServerBoard(board) {
    let head, rows;
    if (board.view === 'hour') {
      serverHourResetAt = Date.now() + (board.resetIn || 0) * 1000;
      head = `<div class="lb-head"><span>This hour · ${board.hourLabel || ''}</span><span>best wave</span></div>` +
        `<div class="lb-prize">${CONFIG.prize} · resets in <span data-countdown>${fmtReset(board.resetIn || 0)}</span></div>`;
      rows = board.rows.length
        ? board.rows.map((r, i) => lbRow(i, safe(r.name), r.score + '%', isYouName(r.name))).join('')
        : lbEmpty('Be the first wave this hour →');
    } else {
      serverHourResetAt = 0;
      head = '<div class="lb-head"><span>Overall · top players</span><span>score</span></div>' +
        `<div class="lb-prize">${CONFIG.prize} · play more to climb</div>`;
      rows = board.rows.length
        ? board.rows.map((r, i) => lbRow(i, `${safe(r.name)} <span class="plays">×${r.plays}</span>`,
            r.score + ' pts', isYouName(r.name))).join('')
        : lbEmpty('No players yet. Be the first on the board →');
    }
    paint(lbTabs() + head + rows);
  }

  function renderLocalBoard() {
    const now = Date.now(); shownBucket = hourBucket(now);
    const events = loadEvents();
    let head, rows;
    if (lbView === 'hour') {
      const lb = events.filter((e) => hourBucket(e.id) === shownBucket)
        .sort((a, b) => b.damage - a.damage).slice(0, 8);
      head = `<div class="lb-head"><span>This hour · ${hourLabel(now)}</span><span>best wave</span></div>` +
        `<div class="lb-prize">${CONFIG.prize} · resets in <span data-countdown>${countdownText()}</span></div>`;
      rows = lb.length
        ? lb.map((e, i) => lbRow(i, safe(e.name), e.damage + '%', e.id === highlightId)).join('')
        : lbEmpty('Be the first wave this hour →');
    } else {
      const lb = overallStandings(events).slice(0, 8);
      head = '<div class="lb-head"><span>Overall · top players</span><span>score</span></div>' +
        `<div class="lb-prize">${CONFIG.prize} · play more to climb</div>`;
      rows = lb.length
        ? lb.map((p, i) => lbRow(i, `${safe(p.name)} <span class="plays">×${p.plays}</span>`,
            p.total + ' pts', p.email === highlightEmail)).join('')
        : lbEmpty('No players yet. Be the first on the board →');
    }
    serverHourResetAt = 0;
    paint(lbTabs() + head + rows);
  }

  async function renderLeaderboard() {
    const board = await serverBoard(lbView);
    if (board) renderServerBoard(board); else renderLocalBoard();
  }

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-view]');
    if (!b) return;
    lbView = b.getAttribute('data-view'); renderLeaderboard();
  });

  setInterval(() => {
    const spans = document.querySelectorAll('[data-countdown]');
    if (spans.length) {
      const txt = serverHourResetAt
        ? fmtReset(Math.max(0, (serverHourResetAt - Date.now()) / 1000))
        : countdownText();
      spans.forEach((x) => { x.textContent = txt; });
    }
    const rolled = serverHourResetAt
      ? Date.now() >= serverHourResetAt
      : hourBucket(Date.now()) !== shownBucket;
    if (rolled) renderLeaderboard();
  }, 1000);
  setInterval(renderLeaderboard, 12000); // keep the shared board fresh as others play

  // Result screen identity: a claimed player sees their standing chip; a brand-new
  // player sees the quiet claim block. The data explorer is open to everyone here.
  function renderResultIdentity() {
    const signed = !!activePlayer;
    $('claim-block').style.display = signed ? 'none' : 'flex';
    $('active-chip').style.display = signed ? 'flex' : 'none';
    if (!signed) {
      const m = $('claim-msg'); m.className = 'consent';
      m.textContent = 'Email is only how we reach prize winners.';
    }
    $('explore-btn').style.display = '';
    $('spark').classList.add('explorable');
  }

  // New player puts the run they just finished on the board: validate + sign in, save
  // that result under the new identity, then flip the claim block to the standing chip.
  function claimResult() {
    if (!attemptJoin()) return;
    saveResult();
    renderResultIdentity();
    updateActiveChip();
  }
  function updateActiveChip() {
    if (!activePlayer) return;
    const status = $('active-chip-status');
    const dmg = lastResult && typeof lastResult.damage === 'number' ? lastResult.damage : null;
    const added = (dmg !== null && savedThisRound) ? `✓ +${dmg}% added · ` : '';
    if (lastServerStanding && lastServerStanding.rank) { // authoritative shared rank
      status.textContent = `${added}You’re #${lastServerStanding.rank} overall, ${activePlayer.name} (${lastServerStanding.total} pts)`;
      return;
    }
    const standings = overallStandings(loadEvents());          // offline fallback
    const me = standings.find((p) => p.email === activePlayer.email);
    const rank = standings.findIndex((p) => p.email === activePlayer.email) + 1;
    status.textContent = me
      ? `${added}You’re #${rank} overall, ${activePlayer.name} (×${me.plays} plays, ${me.total} pts)`
      : `Playing as ${activePlayer.name}`;
  }

  // Operator-only: run `awExport()` in the console to pull a CSV of leads + scores for prizes.
  window.awExport = () => {
    const rows = [['email', 'name', 'total_score', 'plays']].concat(
      overallStandings(loadEvents()).map((p) => [p.email, p.name, p.total, p.plays]));
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    console.log(csv); return csv;
  };

  // ---- identity / sign-in. Joining gates play; once signed in we persist it so a
  // refresh or return keeps the player on. The first played round records their score
  // automatically (see reveal()); the booth resets via the "different player" sign-out.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function signIn(email, name) {
    activePlayer = { email, name };
    savePlayer(activePlayer);
    lastServerStanding = null; highlightEmail = email;
  }
  function attemptJoin() {
    const email = ($('email-input').value || '').trim().toLowerCase();
    const name = ($('name-input').value || '').trim() || 'Anonymous';
    const msg = $('claim-msg');
    if (!EMAIL_RE.test(email)) {
      msg.textContent = 'Enter a valid email to claim your spot and the prize.';
      msg.className = 'consent err'; return false;
    }
    signIn(email, name);
    return true;
  }
  // Title reflects whether we already know the player: a join form, or a welcome-back.
  function renderTitle() {
    const signedIn = !!activePlayer;
    $('title-join').classList.toggle('on', !signedIn);
    $('title-welcome').classList.toggle('on', signedIn);
    if (signedIn) {
      const me = overallStandings(loadEvents()).find((p) => p.email === activePlayer.email);
      $('welcome-status').textContent = me
        ? `Welcome back, ${activePlayer.name}. ${me.total} pts over ${me.plays} play${me.plays > 1 ? 's' : ''}.`
        : `Signed in as ${activePlayer.name}.`;
    }
  }

  // ---- share card (branded canvas to photograph or download) ----
  function wrapText(ctx, text, x, y, maxW, lh) {
    const words = text.split(' '); let line = '', yy = y;
    words.forEach((w) => {
      if (ctx.measureText(line + w + ' ').width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = ''; yy += lh; }
      line += w + ' ';
    });
    ctx.fillText(line.trim(), x, yy);
    return yy;
  }
  function drawCardSpark(ctx, x, y, w, h) {
    const s = GAME_DATA.series, top = Math.max(...s.map((d) => d.v)), bw = w / s.length;
    s.forEach((d, i) => {
      const bh = (d.v / top) * h;
      ctx.fillStyle = d.partial ? '#5a2a24' : '#ff5543';
      ctx.globalAlpha = d.partial ? 1 : 0.4 + 0.6 * (d.v / top);
      ctx.fillRect(x + i * bw, y + h - bh, bw - 3, bh);
    });
    ctx.globalAlpha = 1;
  }
  function buildShareCard() {
    const r = lastResult; if (!r) return;
    const c = $('share-card'), ctx = c.getContext('2d'), W = c.width, pad = 90;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, c.height);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ff5543'; ctx.font = "600 30px 'PolySans Median', monospace";
    ctx.fillText('SOURCEGRAPH · AGENT TIDAL WAVE', pad, 150);
    ctx.fillStyle = r.damage >= 60 ? '#ff5543' : (r.damage >= 30 ? '#f5eddd' : '#a8a29a');
    ctx.font = "600 120px 'PolySans Median', sans-serif"; ctx.fillText(r.tierLabel, pad, 300);
    ctx.fillStyle = '#6e6e6e'; ctx.font = "600 28px 'PolySans Neutral Mono', monospace"; ctx.fillText('DAMAGE', pad, 400);
    ctx.fillStyle = '#ff5543'; ctx.font = "600 190px 'PolySans Median', sans-serif"; ctx.fillText(r.damage + '%', pad, 590);
    ctx.fillStyle = '#f5eddd'; ctx.font = "500 36px 'PolySans Median', sans-serif";
    const afterPrompt = wrapText(ctx, r.q.prompt, pad, 700, W - pad * 2, 48);
    ctx.fillStyle = '#a8a29a'; ctx.font = "400 30px 'PolySans Neutral Mono', monospace";
    ctx.fillText(`You guessed ${r.guessText}    ·    Actual ${r.actualText}`, pad, afterPrompt + 70);
    drawCardSpark(ctx, pad, 980, W - pad * 2, 180);
    ctx.fillStyle = '#6e6e6e'; ctx.font = "400 24px 'PolySans Neutral Mono', monospace";
    ctx.fillText('Real GitHub data · lower bound · agent-signed commits', pad, 1230);
    ctx.fillStyle = '#ff5543'; ctx.font = "600 42px 'PolySans Median', monospace";
    ctx.fillText('PLAY: ' + CONFIG.playUrl, pad, 1295);
    $('share-download').href = c.toDataURL('image/png');
  }
  $('share-btn').addEventListener('click', () => { buildShareCard(); $('share-overlay').classList.add('active'); });
  $('share-close').addEventListener('click', () => { $('share-overlay').classList.remove('active'); });

  // ---- interactive data explorer: tap into the real series month by month.
  // Linear shows the hockey stick; log reveals the early-growth structure.
  const explore = { mode: 'linear', hi: -1 };
  function exploreGeom(c) {
    const W = c.clientWidth, H = c.clientHeight, padL = 64, padR = 16, padT = 18, padB = 26;
    const stride = (W - padL - padR) / GAME_DATA.series.length;
    return { W, H, padL, padT, padB, stride, plotH: H - padT - padB };
  }
  function drawExplore() {
    const c = $('explore-canvas'); if (!c.clientWidth) return;
    const ctx = c.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { W, H, padL, padT, padB, stride, plotH } = exploreGeom(c);
    c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = GAME_DATA.series, max = Math.max(...s.map((d) => d.v)), log = explore.mode === 'log';
    const lmin = Math.log10(80), lmax = Math.log10(max);
    const frac = (v) => log ? (Math.log10(v) - lmin) / (lmax - lmin) : v / max;
    ctx.font = '11px ui-monospace, Menlo, monospace';
    const ticks = log ? [100, 1e3, 1e4, 1e5, 1e6, 1e7] : [0, max * 0.25, max * 0.5, max * 0.75, max];
    ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    ticks.forEach((t) => {
      if (t > max) return;
      const y = padT + plotH * (1 - frac(Math.max(t, 1)));
      ctx.strokeStyle = '#1a1a1f'; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - 16, y); ctx.stroke();
      ctx.fillStyle = '#6e6e6e'; ctx.fillText(compact(t), padL - 8, y);
    });
    s.forEach((d, i) => {
      const bh = Math.max(1, frac(d.v) * plotH), x = padL + i * stride, y = padT + plotH - bh, hi = i === explore.hi;
      ctx.fillStyle = d.partial ? '#5a2a24' : '#ff5543';
      ctx.globalAlpha = hi ? 1 : (d.partial ? 0.9 : 0.42 + 0.5 * frac(d.v));
      ctx.fillRect(x + 1, y, Math.max(1, stride - 3), bh);
      if (hi) { ctx.globalAlpha = 1; ctx.strokeStyle = '#f5eddd';
        ctx.strokeRect(x + 0.5, y - 0.5, Math.max(1, stride - 3) + 1, bh + 1); }
    });
    ctx.globalAlpha = 1; ctx.fillStyle = '#6e6e6e'; ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left'; ctx.fillText(monthLabel(s[0].m), padL, H - 7);
    ctx.textAlign = 'right'; ctx.fillText(monthLabel(s[s.length - 1].m), W - 16, H - 7);
  }
  function exploreReadout() {
    const s = GAME_DATA.series, el = $('explore-readout');
    if (explore.hi < 0 || explore.hi >= s.length) { el.textContent = 'Hover or tap a bar to see that month’s exact count.'; return; }
    const d = s[explore.hi];
    el.textContent = `${monthLabel(d.m)} — ${d.v.toLocaleString('en-US')} agent-signed commits${d.partial ? ' (month still in progress)' : ''}`;
  }
  function exploreHover(ev) {
    const c = $('explore-canvas'), r = c.getBoundingClientRect(), { padL, stride } = exploreGeom(c);
    const i = Math.floor((ev.clientX - r.left - padL) / stride);
    explore.hi = (i >= 0 && i < GAME_DATA.series.length) ? i : -1;
    drawExplore(); exploreReadout();
  }
  function openExplore() {
    explore.hi = -1; $('explore-overlay').classList.add('active');
    requestAnimationFrame(() => { drawExplore(); exploreReadout(); });
  }
  $('explore-btn').addEventListener('click', openExplore);
  $('explore-close').addEventListener('click', () => $('explore-overlay').classList.remove('active'));
  $('spark').addEventListener('click', () => openExplore());
  $('explore-canvas').addEventListener('pointermove', exploreHover);
  $('explore-canvas').addEventListener('pointerdown', exploreHover);
  $('explore-canvas').addEventListener('pointerleave', () => { explore.hi = -1; drawExplore(); exploreReadout(); });
  document.querySelectorAll('.explore-scale button').forEach((b) =>
    b.addEventListener('click', () => {
      explore.mode = b.getAttribute('data-scale');
      document.querySelectorAll('.explore-scale button').forEach((x) => x.classList.toggle('active', x === b));
      drawExplore();
    }));
  window.addEventListener('resize', () => { if ($('explore-overlay').classList.contains('active')) drawExplore(); });

  // ---- wiring ----
  // Joining is required to play; "Start" / "Play again" keep the signed-in player.
  // "Different player" clears identity and returns to the join gate.
  function signOut() {
    activePlayer = null; clearPlayer();
    highlightEmail = null; lastServerStanding = null;
    $('name-input').value = ''; $('email-input').value = '';
    renderTitle(); renderLeaderboard(); show('title-screen');
  }
  $('start-btn').addEventListener('click', setupGuess);   // no gate: play first, claim after
  $('claim-btn').addEventListener('click', claimResult);
  $('play-btn').addEventListener('click', setupGuess);
  $('title-explore-btn').addEventListener('click', openExplore);
  $('title-signout-btn').addEventListener('click', signOut);
  $('signout-btn').addEventListener('click', signOut);
  $('unleash-btn').addEventListener('click', runWave);
  $('again-btn').addEventListener('click', setupGuess);
  slider.addEventListener('input', updateReadout);

  // ---- mute toggle ----
  $('mute-btn').addEventListener('click', () => {
    const m = Sound.toggleMute(); $('mute-btn').textContent = m ? '🔇' : '🔊';
  });

  // ---- attract / idle mode: a continuous flowing wave + TAP TO PLAY pull eyes
  // from across the hall. Always silent (repeated booms would annoy).
  const IDLE_MS = 25000;
  let idleTimer = null, attractActive = false, returnScreen = 'title-screen';
  const currentScreen = () => screens.find((s) => $(s).classList.contains('active')) || 'title-screen';

  function enterAttract() {
    if (attractActive) return;
    if (currentScreen() !== 'title-screen') return;   // only draw from the title; never interrupt an active player
    returnScreen = currentScreen();
    attractActive = true;
    show('wave-screen');
    $('attract').classList.add('active');
    WaveScene.startAttract();
  }
  function exitAttract() {
    if (!attractActive) return;
    attractActive = false;
    WaveScene.stop();
    $('attract').classList.remove('active');
    show(returnScreen);   // return to the screen they left, not always the title
  }
  function resetIdle() {
    clearTimeout(idleTimer);
    if (attractActive) exitAttract();
    idleTimer = setTimeout(enterAttract, IDLE_MS);
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    document.addEventListener(ev, () => { Sound.unlock(); resetIdle(); }, { passive: true }));

  // ---- init: attract IS the booth's default state — start there so a refresh keeps
  // the loop visible immediately, not after 25s of nothing. Idle timer arms on exit.
  flushPending();
  renderTitle();        // show the join gate, or "welcome back" if already signed in
  renderLeaderboard();
  enterAttract();
})();
