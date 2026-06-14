from sqlalchemy.orm import Session

from app.models.evaluation import EvaluationRun, EvaluationResult, RunStatus
from app.models.prompt import Prompt
from app.models.test_case import TestCase
from app.schemas.dashboard import DashboardStats, RecentRun


def get_stats(db: Session) -> DashboardStats:
    total_prompts = db.query(Prompt).count()
    total_test_cases = db.query(TestCase).count()
    total_runs = db.query(EvaluationRun).count()

    scores = [
        s for (s,) in db.query(EvaluationResult.score)
        .filter(EvaluationResult.score.isnot(None))
        .all()
    ]
    avg_score = sum(scores) / len(scores) if scores else None

    return DashboardStats(
        total_prompts=total_prompts,
        total_test_cases=total_test_cases,
        total_runs=total_runs,
        avg_score=avg_score,
    )


def get_recent_runs(db: Session, limit: int = 10) -> list[RecentRun]:
    runs = (
        db.query(EvaluationRun)
        .order_by(EvaluationRun.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        RecentRun(
            id=r.id,
            prompt_name=r.prompt_version.prompt.name if r.prompt_version else "—",
            test_case_name=r.test_case.name if r.test_case else "—",
            model_provider=r.model_provider,
            model_name=r.model_name,
            status=r.status,
            overall_score=r.overall_score,
            created_at=r.created_at,
        )
        for r in runs
    ]
