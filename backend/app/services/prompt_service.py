from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.prompt import Prompt, PromptVersion
from app.schemas.prompt import PromptCreate, PromptUpdate, PromptVersionCreate
from app.models.evaluation import EvaluationRun


def get_prompt_or_404(db: Session, prompt_id: int) -> Prompt:
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt


def list_prompts(db: Session) -> list[Prompt]:
    return db.query(Prompt).order_by(Prompt.created_at.desc()).all()


def create_prompt(db: Session, payload: PromptCreate) -> Prompt:
    prompt = Prompt(name=payload.name, description=payload.description)
    db.add(prompt)
    db.flush()
    first_version = PromptVersion(
        prompt_id=prompt.id,
        version_number=1,
        system_prompt=payload.system_prompt,
        notes="Initial version",
    )
    db.add(first_version)
    db.commit()
    db.refresh(prompt)
    return prompt


def update_prompt(db: Session, prompt_id: int, payload: PromptUpdate) -> Prompt:
    prompt = get_prompt_or_404(db, prompt_id)
    if payload.name is not None:
        prompt.name = payload.name
    if payload.description is not None:
        prompt.description = payload.description
    db.commit()
    db.refresh(prompt)
    return prompt


def delete_prompt(db: Session, prompt_id: int) -> None:
    prompt = get_prompt_or_404(db, prompt_id)
    version_ids = [v.id for v in prompt.versions]
    if version_ids:
        db.query(EvaluationRun).filter(
            EvaluationRun.prompt_version_id.in_(version_ids)
        ).delete(synchronize_session=False)
    db.delete(prompt)
    db.commit()


def add_version(db: Session, prompt_id: int, payload: PromptVersionCreate) -> PromptVersion:
    prompt = get_prompt_or_404(db, prompt_id)
    next_number = max((v.version_number for v in prompt.versions), default=0) + 1
    version = PromptVersion(
        prompt_id=prompt_id,
        version_number=next_number,
        system_prompt=payload.system_prompt,
        notes=payload.notes,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


def list_versions(db: Session, prompt_id: int) -> list[PromptVersion]:
    prompt = get_prompt_or_404(db, prompt_id)
    return sorted(prompt.versions, key=lambda v: v.version_number)


def get_version_or_404(db: Session, prompt_id: int, version_id: int) -> PromptVersion:
    get_prompt_or_404(db, prompt_id)
    version = (
        db.query(PromptVersion)
        .filter(PromptVersion.id == version_id, PromptVersion.prompt_id == prompt_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


def compare_versions(db: Session, prompt_id: int, v1_id: int, v2_id: int) -> dict:
    v1 = get_version_or_404(db, prompt_id, v1_id)
    v2 = get_version_or_404(db, prompt_id, v2_id)
    return {"version_a": v1, "version_b": v2}