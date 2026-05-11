from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.evaluation import RunStatus


class EvaluationRunCreate(BaseModel):
    prompt_version_id: int
    test_case_id: int
    model_provider: str  # "openai" | "anthropic" | "ollama"
    model_name: str


class EvaluationResultRead(BaseModel):
    id: int
    step_number: int
    llm_response: Optional[str]
    keyword_check_passed: Optional[bool]
    format_check_passed: Optional[bool]
    rule_details: dict
    judge_score: Optional[float]
    judge_reasoning: Optional[str]
    failure_reason: Optional[str]
    failure_category: Optional[str]
    score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class EvaluationRunRead(BaseModel):
    id: int
    prompt_version_id: int
    test_case_id: int
    model_provider: str
    model_name: str
    status: RunStatus
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    created_at: datetime
    overall_score: Optional[float]
    results: List[EvaluationResultRead] = []

    class Config:
        from_attributes = True
