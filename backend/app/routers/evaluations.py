from typing import List, Optional
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.evaluation import RunStatus
from app.schemas.evaluation import EvaluationRunCreate, EvaluationRunRead, EvaluationResultRead
from app.services.evaluation_crud_service import (
    get_run_or_404, list_runs, list_results, get_prompt_run_history,
    create_evaluation_run,
)
from app.services.evaluation_service import run_evaluation
from app.models.evaluation import EvaluationRun

router = APIRouter(prefix="/evaluations", tags=["evaluations"])


@router.post("/", response_model=EvaluationRunRead, status_code=201)
def trigger_evaluation(
    payload: EvaluationRunCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    run = create_evaluation_run(
        db=db,
        prompt_version_id=payload.prompt_version_id,
        test_case_id=payload.test_case_id,
        model_provider=payload.model_provider,
        model_name=payload.model_name,
    )
    background_tasks.add_task(run_evaluation, run.id)
    return run


@router.get("/", response_model=List[EvaluationRunRead])
def list_evaluation_runs(
    prompt_version_id: Optional[int] = None,
    prompt_id: Optional[int] = None,
    status: Optional[RunStatus] = None,
    db: Session = Depends(get_db),
):
    return list_runs(db, prompt_version_id=prompt_version_id, prompt_id=prompt_id, status=status)


@router.get("/{run_id}", response_model=EvaluationRunRead)
def get_run(run_id: int, db: Session = Depends(get_db)):
    return get_run_or_404(db, run_id)


@router.get("/{run_id}/results", response_model=List[EvaluationResultRead])
def get_run_results(run_id: int, db: Session = Depends(get_db)):
    return list_results(db, run_id)


@router.get("/history/{prompt_id}", response_model=List[EvaluationRunRead])
def get_run_history(prompt_id: int, db: Session = Depends(get_db)):
    return get_prompt_run_history(db, prompt_id)