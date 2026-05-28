# Agent Tidal Wave

A booth game for the AI World's Fair. Guess how much code AI agents are writing on
GitHub — a wave of agent-written code crashes into the servers, and the closer your
guess, the harder it hits. Real data, lower bound, no hype.

Built as a single static site (plain HTML/CSS/JS, no build step). Sourcegraph GTM
brand: black, PolySans, vermillion.

## Run locally

```bash
python3 -m http.server 8765
# open http://localhost:8765/
```

Or any static server. No dependencies, no build.

## Deploy on Render

This repo includes `render.yaml`:

- **Blueprint:** Render Dashboard → New → Blueprint → connect this repo.
- **Manual:** Render Dashboard → New → Static Site → Build Command *(empty)* →
  Publish Directory `.`

## Configure (`data.js` → `GAME_DATA.config`)

| Field | What it does |
|---|---|
| `prize` | Hourly-leaderboard prize copy shown at the booth |
| `playUrl` | URL printed on the shareable result card |
| `submitUrl` | Optional POST endpoint for durable lead capture (empty = local only) |

## Gameplay

- **Rotating questions** — each play draws a different real-data question (different
  months, the year-over-year multiplier, commits/day, agent-signed share, an
  inflection-date round). Spoiler-proof and replayable.
- **Damage = proximity** — log-scale closeness; a perfect hit launches the servers.
- **Leaderboards** — *This hour* (resets each clock hour, with countdown + prize) and
  *Overall* (cumulative; replay to climb). Join once with an email; later plays auto-add.
- **Attract mode** — a continuous ambient wave + "tap to play" is the default idle state.
- **Sound** — synthesized via Web Audio (mute toggle, top-right).
- **Share card** — branded PNG to photograph or download.

## Leads & privacy

- Email is the leaderboard identity + prize-eligibility key, and is **never shown on
  screen** — only the player's name appears.
- With no `submitUrl`, entries live only in the kiosk's `localStorage`. That is **not a
  secure store for collected PII**. For real prize fulfillment, set `submitUrl` to a
  backend you own (see `apps-script.gs` for a ready-to-deploy Google Sheet endpoint).
- Operator export: run `awExport()` in the browser console for a CSV of leads + scores.

## Data provenance

Monthly counts of public commits whose message carries an AI-agent co-author trailer
(`Co-authored-by: Claude`) — a **lower bound** (labeled commits only). Cross-checked
against a GH Archive push sample for 2024-09…2025-09 (two methods agreed within
~10–22%); the full series is from the GitHub commit Search API. No causal claim is made
that agents *caused* the growth — the curve and the milestones are shown side by side.
