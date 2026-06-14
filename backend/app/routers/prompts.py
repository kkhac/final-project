from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.prompt import (
    PromptCreate, PromptRead, PromptUpdate,
    PromptVersionCreate, PromptVersionRead,
    VersionCompareResponse,
)
from app.services import prompt_service

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("/", response_model=List[PromptRead])
def list_prompts(db: Session = Depends(get_db)):
    return prompt_service.list_prompts(db)


@router.post("/", response_model=PromptRead, status_code=201)
def create_prompt(payload: PromptCreate, db: Session = Depends(get_db)):
    return prompt_service.create_prompt(db, payload)


@router.get("/{prompt_id}", response_model=PromptRead)
def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    return prompt_service.get_prompt_or_404(db, prompt_id)


@router.patch("/{prompt_id}", response_model=PromptRead)
def update_prompt(prompt_id: int, payload: PromptUpdate, db: Session = Depends(get_db)):
    return prompt_service.update_prompt(db, prompt_id, payload)


@router.delete("/{prompt_id}", status_code=204)
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt_service.delete_prompt(db, prompt_id)


# --- Versions ---

@router.get("/{prompt_id}/versions", response_model=List[PromptVersionRead])
def list_versions(prompt_id: int, db: Session = Depends(get_db)):
    return prompt_service.list_versions(db, prompt_id)


@router.post("/{prompt_id}/versions", response_model=PromptVersionRead, status_code=201)
def add_version(prompt_id: int, payload: PromptVersionCreate, db: Session = Depends(get_db)):
    return prompt_service.add_version(db, prompt_id, payload)


@router.get("/{prompt_id}/versions/compare", response_model=VersionCompareResponse)
def compare_versions(
    prompt_id: int,
    v1: int = Query(..., description="First version ID"),
    v2: int = Query(..., description="Second version ID"),
    db: Session = Depends(get_db),
):
    return prompt_service.compare_versions(db, prompt_id, v1, v2)


@router.get("/{prompt_id}/versions/{version_id}", response_model=PromptVersionRead)
def get_version(prompt_id: int, version_id: int, db: Session = Depends(get_db)):
    return prompt_service.get_version_or_404(db, prompt_id, version_id)
