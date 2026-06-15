# Demo dry-run checklist

A click-through to do **once before the presentation** and again **30 min before walking on stage**.

---

## 0. Pre-flight (do once, the night before)

- [ ] Fill in `backend/.env`:
  - `OPENAI_API_KEY` — paste a real key
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — only if showing Google login live
- [ ] Backend deps installed (Python 3.12 venv at `backend/venv`):
  ```bash
  cd backend
  ./venv/bin/pip install -r requirements.txt
  ```
- [ ] Frontend deps installed:
  ```bash
  cd frontend
  npm install
  ```
- [ ] Demo data seeded:
  ```bash
  cd backend
  ./venv/bin/python seed_demo.py
  ```
  Expect: `Users: +2`, `Prompts: 3`, `Test cases: 4`, `Evaluation runs: +12`.
- [ ] DB snapshot saved as fallback:
  ```bash
  cp backend/llm_testing.db backend/llm_testing.db.demo.bak
  ```
- [ ] Ollama (only if showing local models): `ollama serve` running and `ollama pull llama3` done.

## 1. Boot order (the actual demo)

Open **two terminals**.

**Terminal A — backend:**
```bash
cd backend
./venv/bin/uvicorn app.main:app --reload --port 8000
```
Wait for: `Uvicorn running on http://127.0.0.1:8000`.
Smoke check in browser: <http://localhost:8000/health> → `{"status":"ok"}`.

**Terminal B — frontend:**
```bash
cd frontend
npm run dev
```
Wait for: `Ready in ... ms`. Open <http://localhost:3000>.

## 2. Demo accounts

| Account | Email | Password | Use for |
|---|---|---|---|
| Primary | `demo@example.com` | `demo1234` | Main walk-through |
| Secondary | `barbare@example.com` | `barbare1234` | Showing multi-user / second login |
| Google | your real Gmail | — | Showing the OAuth flow (only if env is set) |

Both local users are already in the seeded DB. Log in with the primary on the laptop screen.

## 3. Demo script — what to click, in this order

1. **Login page** (`/login`) — show email/password form. Log in as `demo@example.com`.
2. **Dashboard** (`/dashboard`) — point out:
   - Total prompts (3) / test cases (4) / runs (12) / avg score.
   - The recent-runs chart populated by the seed.
3. **Prompts list** (`/prompts`) — show the 3 seeded prompts:
   - `Customer Support Assistant` (v1 → v2)
   - `SQL Generator` (v1 → v2)
   - `Medical Triage Bot` (v1, safety case)
4. **Prompt detail** — open `Customer Support Assistant`:
   - Show the two versions in history (v2 added refund policy + tone guardrail).
   - Open the **version comparison** view → demonstrate the score diff between v1 and v2 (v2 should score noticeably higher on the refund question).
5. **Scenarios** (`/scenarios`) — open `Multi-turn — damaged item complaint`:
   - Show the 3 conversation steps with expected keywords/behavior.
   - Show the other multi-turn case (`chest pain`) as the **safety / failure** example.
6. **Run an evaluation (live)** — kick off a new run:
   - Prompt: `Customer Support Assistant` v2
   - Test case: `Refund window question`
   - Provider: `openai`, Model: `gpt-4o-mini`
   - Show the status transition `pending → running → completed`.
7. **Runs list** (`/runs`) — show the seeded + new runs side by side.
8. **Run detail** — open the new run:
   - Show the LLM response, rule-based check (keywords/regex), and judge score with reasoning.
9. **Failure analysis** — open the seeded `chest pain` run with the Ollama low-score result:
   - Show `failure_category` and `failure_reason` on the failed step.
10. **Cross-model comparison** (`/compare`) — show OpenAI vs Anthropic vs Ollama average scores per scenario.
11. **(Optional) Google login** — log out, click "Continue with Google", complete the flow, land back on the dashboard.

## 4. Backup plan (if Wi-Fi / API dies mid-demo)

- All seeded runs use **pre-baked responses and scores** — they do not call the network. The dashboard, runs list, version comparison, failure analysis and cross-model views will all render even with no internet.
- The live evaluation in step 6 is the only thing that needs the OpenAI key. If it fails, skip to step 7 and present a previously seeded run as if it had just completed.
- Have a screen recording of the full walk-through on the laptop as a last-resort fallback.

## 5. Reset script (between rehearsals)

To wipe demo data and re-seed cleanly:
```bash
cd backend
cp llm_testing.db.demo.bak llm_testing.db
```
This restores the exact post-seed state.

If you want a totally fresh DB instead:
```bash
cd backend
rm llm_testing.db
./venv/bin/python seed_demo.py
```

## 6. 30-minutes-before checklist

- [ ] Laptop charged + charger in bag.
- [ ] Wi-Fi works in the demo room; mobile hotspot ready as fallback.
- [ ] `backend/.env` has a real `OPENAI_API_KEY`.
- [ ] Backend running, frontend running, both on the expected ports.
- [ ] `curl http://localhost:8000/health` returns `ok`.
- [ ] Logged in as `demo@example.com` on the dashboard, browser tab pinned.
- [ ] Browser zoom at 110 – 125 % so the back row can read it.
- [ ] Notifications / Slack / email silenced.
