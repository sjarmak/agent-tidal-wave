/*
 * Agent Tidal Wave — static game + shared-leaderboard API on one Express service.
 * Mirrors the code-intel-digest Render setup: raw `pg` Pool, SSL on Render/prod,
 * DATABASE_URL from the managed Postgres, health at /api/health.
 *
 * Email is the leaderboard identity + prize-eligibility key. It is stored server-side
 * and NEVER returned by the API — the board exposes name + score only.
 */
import express from 'express';
import { Pool } from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8765;
const EVENT_TZ = process.env.EVENT_TZ || 'America/Los_Angeles';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const databaseUrl = process.env.DATABASE_URL || process.env.LOCAL_DATABASE_URL || '';
// SSL for Render-managed Postgres / production; off for local docker. (code-intel-digest convention)
const needsSSL = process.env.NODE_ENV === 'production' || databaseUrl.includes('render.com');
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 20000,
    })
  : null;

async function ensureSchema() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scores (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      damage INTEGER NOT NULL CHECK (damage >= 0 AND damage <= 100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS scores_created_at_idx ON scores (created_at);');
  await pool.query('CREATE INDEX IF NOT EXISTS scores_email_idx ON scores (lower(email));');
}

function hourRangeLabel(bucketDate) {
  const fmt = (dt) => new Intl.DateTimeFormat('en-US', { timeZone: EVENT_TZ, hour: 'numeric', hour12: true })
    .format(dt).toLowerCase().replace(/\s+/g, '');
  const next = new Date(bucketDate.getTime() + 3600 * 1000);
  return `${fmt(bucketDate)}–${fmt(next)}`;
}

const app = express();
app.use(express.json({ limit: '8kb' }));

app.get('/api/health', async (_req, res) => {
  try {
    let db = 'unconfigured';
    if (pool) { await pool.query('SELECT 1'); db = 'ok'; }
    res.json({ status: 'healthy', db, timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err instanceof Error ? err.message : String(err) });
  }
});

// Record one consented play. Returns the player's overall rank for the confirmation chip.
app.post('/api/score', async (req, res) => {
  if (!pool) return res.status(503).json({ ok: false, error: 'no database configured' });
  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = (String(req.body?.name || '').trim().slice(0, 24)) || 'Anonymous';
  const damage = Number(req.body?.damage);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'invalid email' });
  if (!Number.isInteger(damage) || damage < 0 || damage > 100) {
    return res.status(400).json({ ok: false, error: 'invalid damage' });
  }
  try {
    await pool.query('INSERT INTO scores (email, name, damage) VALUES ($1, $2, $3)', [email, name, damage]);
    const { rows } = await pool.query(
      `WITH totals AS (
         SELECT lower(email) AS em, SUM(damage)::int AS total FROM scores GROUP BY lower(email)
       ), ranked AS (
         SELECT em, total, RANK() OVER (ORDER BY total DESC) AS rank FROM totals
       )
       SELECT rank::int AS rank, total FROM ranked WHERE em = $1`, [email]);
    res.json({ ok: true, rank: rows[0]?.rank ?? null, total: rows[0]?.total ?? null });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// Shared standings — name + score only, never email. ?view=overall|hour
app.get('/api/leaderboard', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'no database configured' });
  const view = req.query.view === 'hour' ? 'hour' : 'overall';
  try {
    if (view === 'hour') {
      const board = await pool.query(
        `SELECT (ARRAY_AGG(name ORDER BY created_at DESC))[1] AS name, MAX(damage)::int AS score
         FROM scores WHERE created_at >= date_trunc('hour', now())
         GROUP BY lower(email) ORDER BY score DESC LIMIT 8`);
      const meta = await pool.query(
        `SELECT date_trunc('hour', now()) AS bucket,
                (3600 - EXTRACT(EPOCH FROM (now() - date_trunc('hour', now()))))::int AS reset_in`);
      res.json({ view, rows: board.rows, hourLabel: hourRangeLabel(new Date(meta.rows[0].bucket)),
        resetIn: meta.rows[0].reset_in });
    } else {
      const board = await pool.query(
        `SELECT (ARRAY_AGG(name ORDER BY created_at DESC))[1] AS name,
                SUM(damage)::int AS score, COUNT(*)::int AS plays
         FROM scores GROUP BY lower(email) ORDER BY score DESC LIMIT 8`);
      res.json({ view, rows: board.rows });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Static game (API routes are declared first, so /api/* wins).
app.use(express.static(__dirname));

ensureSchema()
  .then(() => app.listen(PORT, () => {
    process.stdout.write(`agent-tidal-wave on :${PORT} (db ${pool ? 'configured' : 'OFF'})\n`);
  }))
  .catch((err) => { process.stderr.write(`schema init failed: ${err}\n`); process.exit(1); });
