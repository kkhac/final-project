from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.prompt import Prompt, PromptVersion
from app.schemas.prompt import PromptCreate, PromptRead, PromptUpdate, PromptVersionCreate, PromptVersionRead

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("/", response_model=List[PromptRead])
def list_prompts(db: Session = Depends(get_db)):
    return db.query(Prompt).order_by(Prompt.created_at.desc()).all()


@router.post("/", response_model=PromptRead, status_code=201)
def create_prompt(payload: PromptCreate, db: Session = Depends(get_db)):
    prompt = Prompt(name=payload.name, description=payload.description)
    db.add(prompt)
    db.flush()  # get prompt.id before adding version

    version = PromptVersion(
        prompt_id=prompt.id,
        version_number=1,
        system_prompt=payload.system_prompt,
    )
    db.add(version)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.get("/{prompt_id}", response_model=PromptRead)
def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt


@router.patch("/{prompt_id}", response_model=PromptRead)
def update_prompt(prompt_id: int, payload: PromptUpdate, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    if payload.name is not None:
        prompt.name = payload.name
    if payload.description is not None:
        prompt.description = payload.description
    db.commit()
    db.refresh(prompt)
    return prompt


@router.delete("/{prompt_id}", status_code=204)
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    db.delete(prompt)
    db.commit()


# --- Versions ---

@router.post("/{prompt_id}/versions", response_model=PromptVersionRead, status_code=201)
def create_version(prompt_id: int, payload: PromptVersionCreate, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    next_version = len(prompt.versions) + 1
    version = PromptVersion(
        prompt_id=prompt_id,
        version_number=next_version,
        system_prompt=payload.system_prompt,
        notes=payload.notes,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@router.get("/{prompt_id}/versions", response_model=List[PromptVersionRead])
def list_versions(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt.versions
