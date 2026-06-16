from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.evaluation import RunStatus


class DashboardStats(BaseModel):
    total_prompts: int
    total_test_cases: int
    total_runs: int
    avg_score: Optional[float]


class RecentRun(BaseModel):
    id: int
    prompt_name: str
    test_case_name: str
    model_provider: str
    model_name: str
    status: RunStatus
    overall_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True
