# Architecture diagram (LikeC4)

Architecture-as-code model of **Agent Tidal Wave**, rendered with
[LikeC4](https://likec4.dev). The model is the source of truth across
[`spec.c4`](spec.c4) (element kinds, tags, deployment node kinds),
[`model.c4`](model.c4) (the system), and [`views.c4`](views.c4) (structure,
walkthrough, and risk views), with the deployment model in
[`deployment.c4`](deployment.c4). The narrative companion is the repo-root
[`README.md`](../README.md).

Agent Tidal Wave is an AI World's Fair **booth game**: guess how much
agent-written code is on GitHub, watch a wave of code crash into a server rack
proportional to how close you were, and climb a shared leaderboard. It is a
vanilla-JS canvas client (no build step) served by a tiny Express service that
also exposes a Postgres-backed leaderboard on the same origin (no CORS).

Every element `link`s to its source file (`../game.js`, `../server.js`, …), so
any box in the explorer is one click from the code.

## Delivery state is tagged, not guessed

Every element carries a tag so operator-gated and content-volatile pieces render
distinctly from the always-on core (legend in `spec.c4`):

| Tag | Meaning | Render |
|---|---|---|
| `#built` | code path exists in this repo and runs | solid |
| `#evolving` | built, but the content is refreshed per event (the data series + question bank, booth config) | solid |
| `#planned` | wired but active only under operator configuration (the optional lead-capture POST) | **dashed, dimmed** |
| `#research` | none in this repo — kept in the legend for parity | — |

Almost everything is `#built`: the static client always works (falling back to
per-browser `localStorage`), and the leaderboard API is live whenever a database
is configured. The only `#planned` edge is the optional Google Apps Script lead
capture, active only when `data.js → config.submitUrl` is set. `data.js` is
`#evolving` because its real-data series, question bank, and booth config are
refreshed for each event.

## Views

**Structure** — the static map:

| View | Scope |
|---|---|
| `index` | system landscape — the game in context of the player, browser, and optional Google Sheet |
| `atwSystem` | the system decomposed into its two containers (game client + Express service) |
| `clientContainer` | the browser game internals (shell, game, scoring, wave, sound, data, local board) |
| `serverContainer` | the Express service — static host + leaderboard API + Postgres schema |
| `deployment` | where each piece runs — Render web service + managed Postgres, the player browser, and the optional Apps Script host |

**Walkthrough flows** (dynamic / numbered-step views) — the narrative spine for
a review:

| View | Flow |
|---|---|
| `playRound` | one play end-to-end (join → rotating question → score → wave → record → shared board, with local fallback) |
| `leadCapture` | the optional durable lead-capture path (no-cors POST, queue+retry, local CSV backstop) |

**Risk lens:**

| View | Scope |
|---|---|
| `risks` | the `#risk`-flagged elements with each open question stated in-box (open write endpoint with no auth/rate-limit, silent 503→local-board fallback masking a misconfigured DB, plus the deployment notes for Render cold-start and 30-day free-Postgres deletion) |

### Running the walkthrough

For a review, present in this order: `index` → `atwSystem` (orient on structure)
→ `clientContainer` / `serverContainer` (the two halves) → the two walkthrough
flows (what actually happens) → `deployment` (where it runs) → `risks` (what to
probe). In `npx likec4 start`, the dynamic views animate step-by-step.

## Viewing & regenerating

```bash
# Interactive, hot-reloading explorer (recommended)
npx likec4 start architecture

# Validate the model (strict — the source of truth for correctness)
npx likec4 validate architecture
```
