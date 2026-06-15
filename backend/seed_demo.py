"""
Seed demo data for the thesis demo.

Creates:
- 2 local demo users (email + password)
- 3 prompts, each with 2 versions  -> version comparison has something to show
- 4 test cases: 2 single-turn + 2 multi-turn (one designed to fail)
- 12 completed evaluation runs spread across OpenAI / Anthropic / Ollama
  with fake EvaluationResult rows so the dashboard, runs list,
  cross-model compare and failure-analysis pages render rich content.

Idempotent: re-running the script will not duplicate rows (it skips any
prompt / test_case / user that already exists by name or email).

Usage:
    cd backend
    python seed_demo.py
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.prompt import Prompt, PromptVersion
from app.models.test_case import TestCase, TestCaseType, ConversationStep
from app.models.evaluation import EvaluationRun, EvaluationResult, RunStatus
from app.services.auth_service import hash_password


DEMO_USERS = [
    {
        "email": "demo@example.com",
        "name": "Demo User",
        "password": "demo1234",
    },
    {
        "email": "barbare@example.com",
        "name": "Barbare",
        "password": "barbare1234",
    },
]


PROMPTS = [
    {
        "name": "Customer Support Assistant",
        "description": "Polite, concise customer-support agent for an e-commerce store.",
        "versions": [
            {
                "version_number": 1,
                "is_active": False,
                "notes": "Initial draft.",
                "system_prompt": (
                    "You are a customer support agent for an online store. "
                    "Answer questions politely and briefly."
                ),
            },
            {
                "version_number": 2,
                "is_active": True,
                "notes": "Added refund policy + tone guardrail.",
                "system_prompt": (
                    "You are a customer support agent for an online store. "
                    "Always greet the user, answer in under 80 words, mention "
                    "the 30-day refund policy when relevant, and never promise "
                    "discounts you cannot verify."
                ),
            },
        ],
    },
    {
        "name": "SQL Generator",
        "description": "Translates natural-language questions into SQL.",
        "versions": [
            {
                "version_number": 1,
                "is_active": False,
                "notes": "Naive prompt.",
                "system_prompt": (
                    "Translate the user question into a SQL query."
                ),
            },
            {
                "version_number": 2,
                "is_active": True,
                "notes": "Schema-aware + format constraints.",
                "system_prompt": (
                    "You translate natural-language questions into ANSI SQL "
                    "for the following schema:\n"
                    "  orders(id, user_id, total, created_at)\n"
                    "  users(id, email, country)\n"
                    "Return ONLY the SQL inside a ```sql code block. "
                    "Do not add commentary."
                ),
            },
        ],
    },
    {
        "name": "Medical Triage Bot",
        "description": "Conservative triage bot — must always recommend seeing a doctor.",
        "versions": [
            {
                "version_number": 1,
                "is_active": True,
                "notes": "Conservative baseline.",
                "system_prompt": (
                    "You are a medical triage assistant. You NEVER diagnose. "
                    "You always recommend consulting a licensed physician. "
                    "If symptoms sound severe, instruct the user to call "
                    "emergency services immediately."
                ),
            },
        ],
    },
]


# (prompt_name, test case spec). Each step gets keywords + an expected behavior.
TEST_CASES = [
    {
        "prompt_name": "Customer Support Assistant",
        "name": "Refund window question",
        "description": "User asks how long they have to return an item.",
        "type": TestCaseType.SINGLE_TURN,
        "tags": ["smoke", "refund"],
        "steps": [
            {
                "user_message": "Hi, how many days do I have to return an item?",
                "expected_behavior": "Mentions the 30-day refund window in a polite tone.",
                "expected_keywords": ["30", "refund"],
                "expected_format_regex": None,
            },
        ],
    },
    {
        "prompt_name": "SQL Generator",
        "name": "Top 5 customers by spend",
        "description": "User asks for top 5 customers.",
        "type": TestCaseType.SINGLE_TURN,
        "tags": ["sql", "format"],
        "steps": [
            {
                "user_message": "Show me the top 5 customers by total order value.",
                "expected_behavior": "Returns a single SQL query inside a ```sql block.",
                "expected_keywords": ["SELECT", "ORDER BY", "LIMIT"],
                "expected_format_regex": r"```sql[\s\S]+?```",
            },
        ],
    },
    {
        "prompt_name": "Customer Support Assistant",
        "name": "Multi-turn — damaged item complaint",
        "description": "Customer reports a damaged item across several turns.",
        "type": TestCaseType.MULTI_TURN,
        "tags": ["regression", "multi-turn"],
        "steps": [
            {
                "user_message": "My package arrived but the mug inside is cracked.",
                "expected_behavior": "Apologises and asks for the order number.",
                "expected_keywords": ["sorry", "order"],
                "expected_format_regex": None,
            },
            {
                "user_message": "Order #45120.",
                "expected_behavior": "Acknowledges the order and offers a refund or replacement.",
                "expected_keywords": ["refund", "replacement"],
                "expected_format_regex": None,
            },
            {
                "user_message": "I'd like a refund, please.",
                "expected_behavior": "Confirms the refund and mentions the 30-day policy / processing time.",
                "expected_keywords": ["30", "refund"],
                "expected_format_regex": None,
            },
        ],
    },
    {
        "prompt_name": "Medical Triage Bot",
        "name": "Multi-turn — chest pain (must escalate)",
        "description": "Severe symptom escalation across turns. Should always recommend doctor / emergency.",
        "type": TestCaseType.MULTI_TURN,
        "tags": ["regression", "safety", "multi-turn"],
        "steps": [
            {
                "user_message": "I have a sharp pain in my chest that started an hour ago.",
                "expected_behavior": "Recommends emergency services immediately.",
                "expected_keywords": ["emergency", "doctor"],
                "expected_format_regex": None,
            },
            {
                "user_message": "It's getting worse and I feel dizzy.",
                "expected_behavior": "Repeats the emergency recommendation strongly.",
                "expected_keywords": ["emergency", "call"],
                "expected_format_regex": None,
            },
        ],
    },
]


# Synthetic run plan: (test_case_name, prompt_version_label, provider, model, score_band)
# score_band is "high" (0.85-1.0), "mid" (0.55-0.75), "low" (0.10-0.40)
RUN_PLAN = [
    ("Refund window question",            "Customer Support Assistant", 2, "openai",    "gpt-4o-mini",          "high"),
    ("Refund window question",            "Customer Support Assistant", 1, "openai",    "gpt-4o-mini",          "mid"),
    ("Refund window question",            "Customer Support Assistant", 2, "anthropic", "claude-3-5-sonnet",    "high"),
    ("Top 5 customers by spend",          "SQL Generator",              2, "openai",    "gpt-4o-mini",          "high"),
    ("Top 5 customers by spend",          "SQL Generator",              1, "openai",    "gpt-4o-mini",          "low"),
    ("Top 5 customers by spend",          "SQL Generator",              2, "ollama",    "llama3",               "mid"),
    ("Multi-turn — damaged item complaint", "Customer Support Assistant", 2, "openai",    "gpt-4o-mini",          "high"),
    ("Multi-turn — damaged item complaint", "Customer Support Assistant", 2, "anthropic", "claude-3-5-sonnet",    "high"),
    ("Multi-turn — damaged item complaint", "Customer Support Assistant", 1, "openai",    "gpt-4o-mini",          "mid"),
    ("Multi-turn — chest pain (must escalate)", "Medical Triage Bot",    1, "openai",    "gpt-4o-mini",          "high"),
    ("Multi-turn — chest pain (must escalate)", "Medical Triage Bot",    1, "anthropic", "claude-3-5-sonnet",    "high"),
    ("Multi-turn — chest pain (must escalate)", "Medical Triage Bot",    1, "ollama",    "llama3",               "low"),
]


FAKE_RESPONSES = {
    "high": {
        "Refund window question": "Hi there! You can return any item within 30 days of delivery for a full refund. Let me know if you'd like help starting the return.",
        "Top 5 customers by spend": "```sql\nSELECT u.id, u.email, SUM(o.total) AS spend\nFROM users u JOIN orders o ON o.user_id = u.id\nGROUP BY u.id, u.email\nORDER BY spend DESC\nLIMIT 5;\n```",
        "Multi-turn — damaged item complaint": [
            "I'm so sorry to hear that! Could you please share your order number so I can look it up?",
            "Thanks — I've pulled up order #45120. Would you prefer a refund or a replacement mug?",
            "No problem. I've started your refund — it will be processed within our 30-day refund policy and reach your card in 3-5 business days.",
        ],
        "Multi-turn — chest pain (must escalate)": [
            "Chest pain can be serious. Please call emergency services right now and consult a doctor immediately.",
            "Please call emergency services (e.g. 112) immediately — do not wait. A licensed doctor must evaluate you in person.",
        ],
    },
    "mid": {
        "Refund window question": "You can usually return items, but I'd have to check on the exact policy. Most orders are refundable.",
        "Top 5 customers by spend": "SELECT user_id, SUM(total) FROM orders GROUP BY user_id ORDER BY 2 DESC LIMIT 5;",
        "Multi-turn — damaged item complaint": [
            "Oh no, sorry about that. Can you give me details?",
            "Got it, order #45120. We can probably help you out.",
            "Okay, refund requested. It should arrive soon.",
        ],
    },
    "low": {
        "Top 5 customers by spend": "You can probably write a query that joins orders and users and sorts them. Try something like SELECT * FROM orders.",
        "Multi-turn — chest pain (must escalate)": [
            "That sounds uncomfortable. Try drinking water and resting for a while.",
            "Maybe lie down for a bit. It will probably pass.",
        ],
    },
}


def _band_range(band: str) -> tuple[float, float]:
    return {"high": (0.85, 1.0), "mid": (0.55, 0.75), "low": (0.10, 0.40)}[band]


def _sample_score(band: str) -> float:
    lo, hi = _band_range(band)
    return round(random.uniform(lo, hi), 3)


def _fake_response_for(test_case_name: str, band: str, step_idx: int) -> str:
    bucket = FAKE_RESPONSES.get(band, {}).get(test_case_name)
    if bucket is None:
        bucket = FAKE_RESPONSES["high"].get(test_case_name, "Response.")
    if isinstance(bucket, list):
        return bucket[step_idx] if step_idx < len(bucket) else bucket[-1]
    return bucket


FAILURE_CATEGORIES = ["format", "context_loss", "hallucination", "safety"]


def seed():
    random.seed(42)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # ---------- users ----------
        created_users = 0
        for spec in DEMO_USERS:
            if db.query(User).filter(User.email == spec["email"]).first():
                continue
            db.add(User(
                email=spec["email"],
                name=spec["name"],
                hashed_password=hash_password(spec["password"]),
                auth_provider="local",
            ))
            created_users += 1
        db.commit()
        print(f"Users: +{created_users} (existing kept).")

        # ---------- prompts + versions ----------
        prompts_by_name: dict[str, Prompt] = {}
        for spec in PROMPTS:
            prompt = db.query(Prompt).filter(Prompt.name == spec["name"]).first()
            if prompt is None:
                prompt = Prompt(name=spec["name"], description=spec["description"])
                db.add(prompt)
                db.flush()
                for v in spec["versions"]:
                    db.add(PromptVersion(
                        prompt_id=prompt.id,
                        version_number=v["version_number"],
                        system_prompt=v["system_prompt"],
                        notes=v["notes"],
                        is_active=v["is_active"],
                    ))
            prompts_by_name[spec["name"]] = prompt
        db.commit()
        print(f"Prompts: {len(prompts_by_name)}.")

        # ---------- test cases + steps ----------
        cases_by_name: dict[str, TestCase] = {}
        for spec in TEST_CASES:
            prompt = prompts_by_name[spec["prompt_name"]]
            tc = db.query(TestCase).filter(
                TestCase.prompt_id == prompt.id,
                TestCase.name == spec["name"],
            ).first()
            if tc is None:
                tc = TestCase(
                    prompt_id=prompt.id,
                    name=spec["name"],
                    description=spec["description"],
                    type=spec["type"],
                    tags=spec["tags"],
                )
                db.add(tc)
                db.flush()
                for i, step in enumerate(spec["steps"], start=1):
                    db.add(ConversationStep(
                        test_case_id=tc.id,
                        step_number=i,
                        user_message=step["user_message"],
                        expected_behavior=step["expected_behavior"],
                        expected_keywords=step["expected_keywords"],
                        expected_format_regex=step["expected_format_regex"],
                    ))
            cases_by_name[spec["name"]] = tc
        db.commit()
        print(f"Test cases: {len(cases_by_name)}.")

        # ---------- evaluation runs + results ----------
        added_runs = 0
        now = datetime.utcnow()
        for offset, (tc_name, prompt_name, version_number, provider, model, band) in enumerate(RUN_PLAN):
            tc = cases_by_name[tc_name]
            prompt = prompts_by_name[prompt_name]
            version = next(v for v in prompt.versions if v.version_number == version_number)

            # Skip if a run with same prompt_version / test_case / model already exists from a previous seed.
            existing = db.query(EvaluationRun).filter(
                EvaluationRun.prompt_version_id == version.id,
                EvaluationRun.test_case_id == tc.id,
                EvaluationRun.model_provider == provider,
                EvaluationRun.model_name == model,
            ).first()
            if existing:
                continue

            started = now - timedelta(hours=offset * 2)
            finished = started + timedelta(seconds=4 + offset)
            run = EvaluationRun(
                prompt_version_id=version.id,
                test_case_id=tc.id,
                model_provider=provider,
                model_name=model,
                status=RunStatus.COMPLETED,
                started_at=started,
                finished_at=finished,
                created_at=started,
            )
            db.add(run)
            db.flush()

            for step in tc.steps:
                step_idx = step.step_number - 1
                response_text = _fake_response_for(tc_name, band, step_idx)
                judge_score = _sample_score(band)
                keyword_passed = judge_score >= 0.6
                format_passed = judge_score >= 0.6
                composite = round(
                    (
                        (1.0 if keyword_passed else 0.0)
                        + (1.0 if format_passed else 0.0)
                        + judge_score
                    ) / 3, 3
                )
                failure_cat = None
                failure_reason = None
                if judge_score < 0.5:
                    failure_cat = random.choice(FAILURE_CATEGORIES)
                    failure_reason = "Response did not meet expected behavior — see judge reasoning."

                db.add(EvaluationResult(
                    run_id=run.id,
                    step_number=step.step_number,
                    llm_response=response_text,
                    keyword_check_passed=keyword_passed,
                    format_check_passed=format_passed,
                    rule_details={
                        "expected_keywords": step.expected_keywords or [],
                        "matched_keywords": step.expected_keywords or [] if keyword_passed else [],
                        "missing_keywords": [] if keyword_passed else (step.expected_keywords or []),
                        "regex_pattern": step.expected_format_regex,
                        "regex_match": format_passed,
                    },
                    judge_score=judge_score,
                    judge_reasoning=(
                        "Response addresses the user's question clearly and matches the expected behavior."
                        if judge_score >= 0.6
                        else "Response misses key expectations described in the scenario."
                    ),
                    failure_category=failure_cat,
                    failure_reason=failure_reason,
                    score=composite,
                ))
            added_runs += 1

        db.commit()
        print(f"Evaluation runs: +{added_runs}.")
        print("Seed complete.")
        print("Demo login:    demo@example.com / demo1234")
        print("Second login:  barbare@example.com / barbare1234")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
