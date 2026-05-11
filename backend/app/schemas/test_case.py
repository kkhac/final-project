from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.test_case import TestCaseType


class ConversationStepCreate(BaseModel):
    step_number: int
    user_message: str
    expected_behavior: Optional[str] = None
    expected_keywords: List[str] = []
    expected_format_regex: Optional[str] = None


class ConversationStepRead(BaseModel):
    id: int
    step_number: int
    user_message: str
    expected_behavior: Optional[str]
    expected_keywords: List[str]
    expected_format_regex: Optional[str]

    class Config:
        from_attributes = True


class TestCaseCreate(BaseModel):
    prompt_id: int
    name: str
    description: Optional[str] = None
    type: TestCaseType = TestCaseType.SINGLE_TURN
    tags: List[str] = []
    steps: List[ConversationStepCreate]


class TestCaseRead(BaseModel):
    id: int
    prompt_id: int
    name: str
    description: Optional[str]
    type: TestCaseType
    tags: List[str]
    steps: List[ConversationStepRead]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
