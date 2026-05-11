from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class PromptVersionCreate(BaseModel):
    system_prompt: str
    notes: Optional[str] = None


class PromptVersionRead(BaseModel):
    id: int
    prompt_id: int
    version_number: int
    system_prompt: str
    notes: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PromptCreate(BaseModel):
    name: str
    description: Optional[str] = None
    system_prompt: str  # First version is created together with prompt


class PromptRead(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    versions: List[PromptVersionRead] = []

    class Config:
        from_attributes = True


class PromptUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
