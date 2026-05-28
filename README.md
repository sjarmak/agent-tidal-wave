# Agent Tidal Wave

A booth game for the AI World's Fair. Guess how much code AI agents are writing on
GitHub — a wave of agent-written code crashes into the servers, and the closer your
guess, the harder it hits.

A tiny Node/Express service serves the static game **and** a shared-leaderboard API
backed by Postgres (same origin, no CORS). Sourcegraph GTM brand: black, PolySans,
vermillion.

## Run locally

Static only (no shared board — falls back to per-browser `localStorage`):

```bash
python3 -m http.server 8765   # open http://localhost:8765/
```

Full stack with the shared leaderboard:

```bash
npm install
# point at any Postgres; e.g. a local docker one:
LOCAL_DATABASE_URL="postgresql://user:pass@localhost:5432/agent_tidal_wave" npm start
# open http://localhost:8765/  (PORT defaults to 8765)
```

The server creates its table on boot. With no database URL set, the API returns 503 and
the client falls back to the local board — so the static experience still works.

## Deploy on Render

`render.yaml` provisions a Node web service + a free managed Postgres:

- Render Dashboard → **New → Blueprint** → connect this repo → Apply.

It wires `DATABASE_URL` from the database, runs `npm install` / `npm start`, and health-
checks `/api/health`. Set `EVENT_TZ` to your event's timezone (controls the hourly-board
labels/reset). Heads-up: Render's free web service cold-starts after idle and the free
Postgres is deleted after 30 days — fine for a conference; bump to paid for longer.

## API

| Route | Purpose |
|---|---|
| `GET /api/health` | Health + DB ping (Render health check) |
| `POST /api/score` | `{email, name, damage}` → records a play, returns `{rank, total}` |
| `GET /api/leaderboard?view=overall\|hour` | Standings — **name + score only** |

## Configure (`data.js` → `GAME_DATA.config`)

| Field | What it does |
|---|---|
| `prize` | Hourly-leaderboard prize copy shown at the booth |
| `playUrl` | URL printed on the shareable result card |
| `submitUrl` | Optional extra POST endpoint (e.g. `apps-script.gs` Google Sheet); leave empty when using the Postgres API |

## Gameplay

- **Rotating questions** — each play draws a different real-data question. Spoiler-proof.
- **Damage = proximity** — log-scale closeness; a perfect hit launches the servers.
- **Leaderboards** — *This hour* (resets each clock hour, countdown + prize) and *Overall*
  (cumulative; replay to climb), shared across all players via Postgres.
- **Join once** with an email; later plays auto-add — no re-clicking.
- **Attract mode** — a continuous ambient wave + "tap to play" is the default idle state.
- **Sound** (Web Audio, mute top-right) and a branded **share card** (PNG).

## Leads & privacy

- Email is the leaderboard identity + prize-eligibility key. It is stored **server-side
  only and never returned by the API** — the board exposes name + score.
- Operator export: `awExport()` in the browser console dumps the *local* device's CSV;
  for the authoritative list query the `scores` table directly.

## Data provenance

Monthly counts of public commits whose message carries an AI-agent co-author trailer
(`Co-authored-by: Claude`) — a **lower bound** (labeled commits only). Cross-checked
against a GH Archive push sample for 2024-09…2025-09 (two methods agreed within
~10–22%); the full series is from the GitHub commit Search API. No causal claim is made
that agents *caused* the growth — curve and milestones are shown side by side.
