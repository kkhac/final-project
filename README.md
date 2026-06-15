# LLM Prompt Regression Testing Platform

A web platform for versioning LLM prompts, managing test scenarios, and automatically evaluating model responses — with both rule-based and LLM-as-a-Judge scoring.

## Features

- **Prompt versioning** — create prompts, iterate on system instructions, track history
- **Scenario builder** — define single-turn and multi-turn conversational test cases
- **Hybrid evaluation** — keyword/format/regex checks + semantic LLM-as-a-Judge scoring
- **Failure analysis** — every failing step gets a `failure_category` and `failure_reason`
- **Version comparison** — side-by-side score diff between prompt versions
- **Cross-model comparison** — compare average scores across OpenAI, Anthropic, and Ollama models
- **Dashboard** — live stats, recent run chart
- **Authentication** — email/password sign-up and login, plus "Sign in with Google" (OAuth 2.0)

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |

API keys (at least one required):
- `OPENAI_API_KEY` — for OpenAI models and LLM-as-a-Judge
- `ANTHROPIC_API_KEY` — for Anthropic models
- Ollama running locally — for local models (no key needed)

## Setup

### 1. Clone and enter the repo

```bash
git clone <repo-url>
cd llm-prompt-platform
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` in the `backend/` folder:
OPENAI_API_KEY=sk-...

ANTHROPIC_API_KEY=sk-ant-...    # optional

OLLAMA_BASE_URL=http://localhost:11434  # optional, default value
Start the API server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Running Tests

```bash
cd backend
python -m pytest -v
```

71 unit tests + E2E integration tests covering the full evaluation flow.

## Project Structure
backend/

app/

routers/          # FastAPI route handlers

services/

providers/      # LLM provider abstraction (OpenAI, Anthropic, Ollama)

evaluation_service.py

judge_service.py

models/           # SQLAlchemy ORM models

schemas/          # Pydantic request/response schemas

tests/
frontend/

src/

app/              # Next.js App Router pages

runs/           # Evaluation runs list + detail

compare/        # Cross-model comparison

prompts/

scenarios/

evaluations/

components/

## Authentication

The app requires sign-in. On first launch you are redirected to `/login` where you can:

- **Register** with email + password (`/register`)
- **Sign in** with email + password (`/login`)
- **Sign in with Google** (requires the OAuth setup below)

### Google OAuth setup (optional)

1. Go to the [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth 2.0 Client ID of type *Web application*.
3. Add `http://localhost:8000/auth/google/callback` to the *Authorized redirect URIs*.
4. Copy the client ID and secret into `backend/.env`:

   ```env
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
   FRONTEND_URL=http://localhost:3000
   SECRET_KEY=<long-random-string>
   ```

5. Restart the backend. The "Continue with Google" button will now work; without these env vars the backend returns 503 and the button shows a friendly error.

Tokens are JWTs signed with `SECRET_KEY` (HS256) and stored in `localStorage` on the client. Default lifetime: 7 days (`JWT_EXPIRE_MINUTES`).

## Using Ollama (Local Models)

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3`
3. When triggering an evaluation, set provider = `ollama` and model = `llama3`

No API key required — runs fully offline.
