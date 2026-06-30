/*
 * Real data payload for the Agent Tidal Wave game.
 *
 * series: monthly count of PUBLIC commits whose message carries an AI-agent
 * co-author trailer ("Co-authored-by: Claude"). LOWER BOUND. Provenance:
 *   2024-09..2025-09  cross-checked vs a GH Archive push sample (~10-22% agreement)
 *   full series       GitHub commit Search API (committer-date windows)
 *
 * questions: a rotating bank so no two consecutive players get the same prompt.
 * This is what makes the booth spoiler-proof and replayable. Every answer is
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
    prize: 'Top wave each hour wins a prize 🌊',  // ← edit for your actual prize
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
      reveal: 'April 2026: a year earlier it was ~17,500/mo.',
    },
    {
      id: 'mag_jun2025', type: 'number',
      prompt: 'In June 2025, how many public commits were AI-agent co-authored?',
      answer: 261516, min: 1e4, max: 5e6, format: 'compact',
      hint: 'Two years earlier this was effectively zero.',
      reveal: 'June 2025: the ramp was just steepening.',
    },
    {
      id: 'mag_dec2025', type: 'number',
      prompt: 'In December 2025, how many public commits were AI-agent co-authored?',
      answer: 1541847, min: 1e5, max: 2e7, format: 'compact',
      reveal: 'December 2025: past a million a month.',
    },
    {
      id: 'yoy_mult', type: 'number',
      prompt: 'April 2026 vs April 2025: how many times more agent-signed commits?',
      answer: 673, min: 5, max: 5000, format: 'x', unit: '×',
      hint: 'From ~17.5K/mo to millions.',
      reveal: '~673× in twelve months.',
    },
    {
      id: 'per_day', type: 'number',
      prompt: 'On an average day in April 2026, how many commits were agent-signed?',
      answer: 392817, min: 1e4, max: 3e6, format: 'compact',
      reveal: '~393K every single day (11.8M ÷ 30).',
    },
    {
      id: 'share_sep25', type: 'number',
      prompt: 'By Sept 2025, what share of all public commits were agent-signed?',
      answer: 0.567, min: 0.01, max: 10, format: 'pct', unit: '%',
      hint: 'This one is a lower bound: labeled commits only.',
      reveal: '0.57% of ALL public commits, and only the labeled ones.',
    },
    {
      id: 'mom_jump', type: 'number',
      prompt: 'How many more agent-signed commits did April 2026 have than March 2026?',
      answer: 2992798, min: 1e5, max: 2e7, format: 'compact',
      reveal: '+3.0M in a single month (8.8M → 11.8M).',
    },
    {
      id: 'claude_vs_copilot', type: 'number',
      prompt: 'In May 2026, Claude-signed commits outnumber Copilot-signed by how many times?',
      answer: 28, min: 2, max: 300, format: 'x', unit: '×',
      reveal: '~28×, but that’s a labeling quirk, not a usage ratio.',
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
      reveal: 'November 2025: Oct fell just short at 981K.',
    },

    // ---- more magnitudes (each value is a real month in `series`) ----
    {
      id: 'mag_jul2025', type: 'number',
      prompt: 'In July 2025, how many public commits were AI-agent co-authored?',
      answer: 473704, min: 1e4, max: 1e7, format: 'compact',
      reveal: 'July 2025: climbing through the steepest part of the ramp.',
    },
    {
      id: 'mag_aug2025', type: 'number',
      prompt: 'In August 2025, how many public commits were AI-agent co-authored?',
      answer: 602150, min: 1e4, max: 1e7, format: 'compact',
      reveal: 'August 2025: the series’ one clear dip came right after.',
    },
    {
      id: 'mag_sep2025', type: 'number',
      prompt: 'In September 2025, how many public commits were AI-agent co-authored?',
      answer: 554047, min: 1e4, max: 1e7, format: 'compact',
      hint: 'This is the only month that came in BELOW the one before it.',
      reveal: 'September 2025: dipped from August (602K → 554K) before resuming the climb.',
    },
    {
      id: 'mag_oct2025', type: 'number',
      prompt: 'In October 2025, how many public commits were AI-agent co-authored?',
      answer: 981238, min: 1e4, max: 1e7, format: 'compact',
      hint: 'Just shy of a round milestone.',
      reveal: 'October 2025: 981K, a whisker under the first million.',
    },
    {
      id: 'mag_mar2025', type: 'number',
      prompt: 'In March 2025, how many public commits were AI-agent co-authored?',
      answer: 18902, min: 1e3, max: 1e6, format: 'compact',
      reveal: 'March 2025: the count first cleared 10,000 a month.',
    },
    {
      id: 'mag_jan2026', type: 'number',
      prompt: 'In January 2026, how many public commits were AI-agent co-authored?',
      answer: 3288443, min: 1e5, max: 3e7, format: 'compact',
      reveal: 'January 2026: more than double December.',
    },
    {
      id: 'mag_feb2026', type: 'number',
      prompt: 'In February 2026, how many public commits were AI-agent co-authored?',
      answer: 5395490, min: 1e5, max: 3e7, format: 'compact',
      reveal: 'February 2026: first month past 5,000,000.',
    },
    {
      id: 'mag_mar2026', type: 'number',
      prompt: 'In March 2026, how many public commits were AI-agent co-authored?',
      answer: 8791721, min: 1e5, max: 5e7, format: 'compact',
      reveal: 'March 2026: the biggest one-month jump in the series (+3.4M).',
    },

    // ---- year-over-year multiples (real month ÷ same month a year earlier) ----
    {
      id: 'mar_yoy', type: 'number',
      prompt: 'March 2026 vs March 2025: how many times more agent-signed commits?',
      answer: 465, min: 10, max: 5000, format: 'x', unit: '×',
      reveal: '~465× in a year (18,902 → 8.8M).',
    },
    {
      id: 'feb_yoy', type: 'number',
      prompt: 'February 2026 vs February 2025: how many times more agent-signed commits?',
      answer: 2375, min: 50, max: 20000, format: 'x', unit: '×',
      hint: 'A year earlier it had only just crossed 2,000/mo.',
      reveal: '~2,400× in a year (2,272 → 5.4M).',
    },
    {
      id: 'q1_vs_2025', type: 'number',
      prompt: 'Q1 2026 produced about how many times as many agent-signed commits as all of 2025?',
      answer: 3, min: 2, max: 50, format: 'x', unit: '×',
      hint: 'Q1 2026 was ~17.5M; all of 2025 was ~5.6M.',
      reveal: 'About 3×: one quarter of 2026 out-produced the entire prior year.',
    },

    // ---- rate questions (a real month spread across its days/hours/minutes) ----
    {
      id: 'per_day_mar2026', type: 'number',
      prompt: 'On an average day in March 2026, how many commits were agent-signed?',
      answer: 283604, min: 1e4, max: 3e6, format: 'compact',
      reveal: '~284K every day (8.8M ÷ 31).',
    },
    {
      id: 'per_hour_apr2026', type: 'number',
      prompt: 'In an average hour in April 2026, how many commits were agent-signed?',
      answer: 16367, min: 1e3, max: 1e5, format: 'compact',
      reveal: '~16,400 an hour (11.8M ÷ 720).',
    },
    {
      id: 'per_min_apr2026', type: 'number',
      prompt: 'In an average minute in April 2026, how many commits were agent-signed?',
      answer: 273, min: 10, max: 5000, format: 'compact',
      hint: 'April has 43,200 minutes.',
      reveal: '~273 every minute, all month long (11.8M ÷ 43,200).',
    },

    // ---- cumulative totals (sums of real months) ----
    {
      id: 'total_alltime', type: 'number',
      prompt: 'Across the whole series (Sep 2024 → Apr 2026), how many agent-signed commits in total?',
      answer: 34892197, min: 1e6, max: 5e8, format: 'compact',
      reveal: '~34.9M total through April 2026.',
    },
    {
      id: 'total_2025', type: 'number',
      prompt: 'In all of 2025, how many public commits were agent-signed?',
      answer: 5631676, min: 1e5, max: 1e8, format: 'compact',
      reveal: '~5.6M across the whole of 2025.',
    },
    {
      id: 'total_q1_2026', type: 'number',
      prompt: 'In Q1 2026 (Jan–Mar), how many public commits were agent-signed?',
      answer: 17475654, min: 1e6, max: 5e8, format: 'compact',
      reveal: '~17.5M in one quarter: 3× all of 2025.',
    },

    // ---- one-month jumps (absolute month-over-month deltas) ----
    {
      id: 'mar_jump', type: 'number',
      prompt: 'How many more agent-signed commits did March 2026 have than February 2026?',
      answer: 3396231, min: 1e5, max: 3e7, format: 'compact',
      reveal: '+3.4M in a single month (5.4M → 8.8M), the steepest jump yet.',
    },
    {
      id: 'feb_jump', type: 'number',
      prompt: 'How many more agent-signed commits did February 2026 have than January 2026?',
      answer: 2107047, min: 1e5, max: 3e7, format: 'compact',
      reveal: '+2.1M month over month (3.3M → 5.4M).',
    },

    // ---- more inflection points (which month first crossed a threshold) ----
    {
      id: 'first_10k', type: 'date',
      prompt: 'Which month did agent-signed commits first top 10,000 per month?',
      months: ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05'],
      answerIndex: 2, // 2025-03 (Feb was 2,272; Mar was 18,902)
      reveal: 'March 2025: February was just 2,272.',
    },
    {
      id: 'first_100k', type: 'date',
      prompt: 'Which month did agent-signed commits first top 100,000 per month?',
      months: ['2025-04', '2025-05', '2025-06', '2025-07', '2025-08'],
      answerIndex: 2, // 2025-06 (May was 41,882; Jun was 261,516)
      reveal: 'June 2025: May was 41,882.',
    },
    {
      id: 'first_500k', type: 'date',
      prompt: 'Which month did agent-signed commits first top 500,000 per month?',
      months: ['2025-05', '2025-06', '2025-07', '2025-08', '2025-09'],
      answerIndex: 3, // 2025-08 (Jul was 473,704; Aug was 602,150)
      reveal: 'August 2025: July fell just short at 473,704.',
    },
    {
      id: 'first_5m', type: 'date',
      prompt: 'Which month did agent-signed commits first top 5,000,000 per month?',
      months: ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03'],
      answerIndex: 3, // 2026-02 (Jan was 3.29M; Feb was 5.4M)
      reveal: 'February 2026: January was 3.29M.',
    },
    {
      id: 'first_10m', type: 'date',
      prompt: 'Which month did agent-signed commits first top 10,000,000 per month?',
      months: ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04'],
      answerIndex: 4, // 2026-04 (Mar was 8.79M; Apr was 11.78M)
      reveal: 'April 2026: March came close at 8.79M.',
    },
    {
      id: 'biggest_dip', type: 'date',
      prompt: 'Which month had the biggest drop in agent-signed commits from the month before?',
      months: ['2025-06', '2025-07', '2025-08', '2025-09', '2025-10'],
      answerIndex: 3, // 2025-09 (602K → 554K, the steepest dip in the series)
      reveal: 'September 2025: the steepest dip in the series (602K → 554K).',
    },
  ]),
});
