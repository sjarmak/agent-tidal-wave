/*
 * Real data payload for the Agent Tidal Wave game.
 *
 * series: monthly count of PUBLIC commits whose message carries an AI-agent
 * co-author trailer ("Co-authored-by: Claude"). LOWER BOUND. Provenance:
 *   2024-09..2025-09  cross-checked vs a GH Archive push sample (~10-22% agreement)
 *   full series       GitHub commit Search API (committer-date windows)
 *
 * questions: a rotating bank so no two consecutive players get the same prompt —
 * this is what makes the booth spoiler-proof and replayable. Every answer is
 * derived from `series` (or the earlier cross-checked findings) and carries its
 * own source. Number questions use a log slider; the date question slides months.
 */
const GAME_DATA = Object.freeze({
  series: Object.freeze([
    { m: '2024-09', v: 151 }, { m: '2024-12', v: 197 }, { m: '2025-01', v: 224 },
    { m: '2025-02', v: 2272 }, { m: '2025-03', v: 18902 }, { m: '2025-04', v: 17518 },
    { m: '2025-05', v: 41882 }, { m: '2025-06', v: 261516 }, { m: '2025-07', v: 473704 },
    { m: '2025-08', v: 602150 }, { m: '2025-09', v: 554047 }, { m: '2025-10', v: 981238 },
    { m: '2025-11', v: 1136376 }, { m: '2025-12', v: 1541847 }, { m: '2026-01', v: 3288443 },
    { m: '2026-02', v: 5395490 }, { m: '2026-03', v: 8791721 }, { m: '2026-04', v: 11784519 },
    { m: '2026-05', v: 12747803, partial: true },
  ]),

  source: 'GitHub commit search · "Co-authored-by: Claude" · lower bound',

  // Booth-editable: prize copy for the hourly board + the URL printed on share cards.
  config: Object.freeze({
    prize: 'Top wave each hour wins swag 🌊',  // ← edit for your actual prize
    playUrl: 'sourcegraph.com/tidalwave',       // ← edit to your real landing URL
    // Optional durable lead capture: paste a POST endpoint (e.g. the Google Apps Script
    // web-app /exec URL from apps-script.gs). Empty = local-only (localStorage + CSV export).
    submitUrl: '',
  }),

  questions: Object.freeze([
    {
      id: 'mag_apr2026', type: 'number',
      prompt: 'In April 2026, how many public commits were co-authored by an AI agent?',
      answer: 11784519, min: 1e5, max: 3e7, format: 'compact',
      hint: 'A year earlier (Apr 2025) it was ~17,500/mo.',
      reveal: 'April 2026 — a year earlier it was ~17,500/mo.',
    },
    {
      id: 'mag_jun2025', type: 'number',
      prompt: 'In June 2025, how many public commits were AI-agent co-authored?',
      answer: 261516, min: 1e4, max: 5e6, format: 'compact',
      hint: 'Two years earlier this was effectively zero.',
      reveal: 'June 2025 — the ramp was just steepening.',
    },
    {
      id: 'mag_dec2025', type: 'number',
      prompt: 'In December 2025, how many public commits were AI-agent co-authored?',
      answer: 1541847, min: 1e5, max: 2e7, format: 'compact',
      reveal: 'December 2025 — past a million a month.',
    },
    {
      id: 'yoy_mult', type: 'number',
      prompt: 'April 2026 vs April 2025 — how many TIMES more agent-signed commits?',
      answer: 673, min: 5, max: 5000, format: 'x', unit: '×',
      hint: 'From ~17.5K/mo to millions.',
      reveal: '~673× in twelve months.',
    },
    {
      id: 'per_day', type: 'number',
      prompt: 'On an average DAY in April 2026, how many commits were agent-signed?',
      answer: 392817, min: 1e4, max: 3e6, format: 'compact',
      reveal: '~393K every single day (11.8M ÷ 30).',
    },
    {
      id: 'share_sep25', type: 'number',
      prompt: 'By Sept 2025, what SHARE of all public commits were agent-signed?',
      answer: 0.567, min: 0.01, max: 10, format: 'pct', unit: '%',
      hint: 'This one is a lower bound — labeled commits only.',
      reveal: '0.57% of ALL public commits — and only the labeled ones.',
    },
    {
      id: 'mom_jump', type: 'number',
      prompt: 'How many MORE agent-signed commits in April 2026 than in March — the one-month jump?',
      answer: 2992798, min: 1e5, max: 2e7, format: 'compact',
      reveal: '+3.0M in a single month (8.8M → 11.8M).',
    },
    {
      id: 'claude_vs_copilot', type: 'number',
      prompt: 'In May 2026, Claude-signed commits outnumber Copilot-signed by how many TIMES?',
      answer: 28, min: 2, max: 300, format: 'x', unit: '×',
      reveal: '~28× — but that’s a labeling quirk, not a usage ratio.',
    },
    {
      id: 'jun_apr_growth', type: 'number',
      prompt: 'From June 2025 to April 2026, agent-signed commits grew about how many ×?',
      answer: 45, min: 2, max: 500, format: 'x', unit: '×',
      reveal: '~45× in ten months (262K → 11.8M).',
    },
    {
      id: 'first_million', type: 'date',
      prompt: 'Which month did agent-signed commits first top 1,000,000 per month?',
      months: ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01'],
      answerIndex: 5, // 2025-11 (Oct was 981K, Nov was 1.14M)
      reveal: 'November 2025 — Oct fell just short at 981K.',
    },
  ]),
});
