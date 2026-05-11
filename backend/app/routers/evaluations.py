from typing import List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.evaluation import EvaluationRun
from app.schemas.evaluation import EvaluationRunCreate, EvaluationRunRead
from app.services.evaluation_service import run_evaluation

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


@router.post("/", response_model=EvaluationRunRead, status_code=201)
def trigger_evaluation(
    payload: EvaluationRunCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    run = EvaluationRun(
        prompt_version_id=payload.prompt_version_id,
        test_case_id=payload.test_case_id,
        model_provider=payload.model_provider,
        model_name=payload.model_name,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Execute asynchronously so the API returns immediately
    background_tasks.add_task(run_evaluation, run.id)

    return run


@router.get("/", response_model=List[EvaluationRunRead])
def list_runs(prompt_version_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(EvaluationRun)
    if prompt_version_id:
        query = query.filter(EvaluationRun.prompt_version_id == prompt_version_id)
    return query.order_by(EvaluationRun.created_at.desc()).all()


@router.get("/{run_id}", response_model=EvaluationRunRead)
def get_run(run_id: int, db: Session = Depends(get_db)):
    run = db.query(EvaluationRun).filter(EvaluationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found")
    return run
