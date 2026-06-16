from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Float, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy import UniqueConstraint
import enum

from app.database import Base


class RunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class EvaluationRun(Base):
    """One execution of a test case against a specific prompt version."""
    __tablename__ = "evaluation_runs"

    id = Column(Integer, primary_key=True, index=True)
    prompt_version_id = Column(Integer, ForeignKey("prompt_versions.id"), nullable=False)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False)
    model_provider = Column(String(50), nullable=False)   # "openai", "anthropic", "ollama"
    model_name = Column(String(100), nullable=False)       # "gpt-4o", "claude-3-5-sonnet", etc.
    status = Column(Enum(RunStatus), default=RunStatus.PENDING)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    prompt_version = relationship("PromptVersion", back_populates="evaluation_runs")
    test_case = relationship("TestCase", back_populates="evaluation_runs")
    results = relationship("EvaluationResult", back_populates="run", cascade="all, delete-orphan")

    @property
    def overall_score(self):
        if self.status == RunStatus.FAILED:
            return None
        if not self.results:
            return None
        scores = [r.score for r in self.results if r.score is not None]
        return sum(scores) / len(scores) if scores else None


class EvaluationResult(Base):
    """Result for one step/turn of a test case."""
    __tablename__ = "evaluation_results"
    __table_args__ = (
        UniqueConstraint("run_id", "step_number", name="uq_run_step"),
    )

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("evaluation_runs.id"), nullable=False)
    step_number = Column(Integer, nullable=False, default=1)

    # Raw LLM output
    llm_response = Column(Text, nullable=True)

    # Rule-based checks
    keyword_check_passed = Column(Boolean, nullable=True)
    format_check_passed = Column(Boolean, nullable=True)
    rule_details = Column(JSON, default=dict)  # {"matched_keywords": [], "regex_match": true}

    # LLM-as-a-Judge
    judge_score = Column(Float, nullable=True)         # 0.0 to 1.0
    judge_reasoning = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)        # Explainable failure analysis
    failure_category = Column(String(100), nullable=True)  # "format", "context_loss", "hallucination"

    # Composite score
    score = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("EvaluationRun", back_populates="results")
