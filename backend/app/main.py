from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import prompts, test_cases, evaluations, dashboard, auth

# Create all tables on startup (switch to Alembic migrations in production)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LLM Prompt Regression Testing Platform",
    description="API for managing prompts, test scenarios, and running evaluations.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",  # any localhost port (Next.js dev may pick 3000/3001/etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(prompts.router)
app.include_router(test_cases.router)
app.include_router(evaluations.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
