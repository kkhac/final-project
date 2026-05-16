from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.evaluation import EvaluationRun, EvaluationResult, RunStatus


def get_run_or_404(db: Session, run_id: int) -> EvaluationRun:
    run = db.query(EvaluationRun).filter(EvaluationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found")
    return run


def list_runs(
    db: Session,
    prompt_version_id: int | None = None,
    prompt_id: int | None = None,
    status: RunStatus | None = None,
) -> list[EvaluationRun]:
    query = db.query(EvaluationRun)
    if prompt_version_id:
        query = query.filter(EvaluationRun.prompt_version_id == prompt_version_id)
    if prompt_id:
        from app.models.prompt import PromptVersion
        version_ids = db.query(PromptVersion.id).filter(PromptVersion.prompt_id == prompt_id)
        query = query.filter(EvaluationRun.prompt_version_id.in_(version_ids))
    if status:
        query = query.filter(EvaluationRun.status == status)
    return query.order_by(EvaluationRun.created_at.desc()).all()


def list_results(db: Session, run_id: int) -> list[EvaluationResult]:
    get_run_or_404(db, run_id)
    return (
        db.query(EvaluationResult)
        .filter(EvaluationResult.run_id == run_id)
        .order_by(EvaluationResult.step_number)
        .all()
    )


def get_prompt_run_history(db: Session, prompt_id: int) -> list[EvaluationRun]:
    from app.models.prompt import PromptVersion, Prompt
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    version_ids = db.query(PromptVersion.id).filter(PromptVersion.prompt_id == prompt_id)
    return (
        db.query(EvaluationRun)
        .filter(EvaluationRun.prompt_version_id.in_(version_ids))
        .order_by(EvaluationRun.created_at.desc())
        .all()
    )