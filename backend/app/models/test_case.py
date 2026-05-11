from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class TestCaseType(str, enum.Enum):
    SINGLE_TURN = "single_turn"
    MULTI_TURN = "multi_turn"


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Enum(TestCaseType), default=TestCaseType.SINGLE_TURN)
    tags = Column(JSON, default=list)  # e.g. ["regression", "smoke"]
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    prompt = relationship("Prompt", back_populates="test_cases")
    steps = relationship("ConversationStep", back_populates="test_case", order_by="ConversationStep.step_number", cascade="all, delete-orphan")
    evaluation_runs = relationship("EvaluationRun", back_populates="test_case")


class ConversationStep(Base):
    """One turn in a multi-turn conversation test case."""
    __tablename__ = "conversation_steps"

    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False)
    step_number = Column(Integer, nullable=False)  # 1-based ordering
    user_message = Column(Text, nullable=False)
    expected_behavior = Column(Text, nullable=True)  # human-readable expectation
    expected_keywords = Column(JSON, default=list)   # ["keyword1", "keyword2"]
    expected_format_regex = Column(String(500), nullable=True)

    test_case = relationship("TestCase", back_populates="steps")
