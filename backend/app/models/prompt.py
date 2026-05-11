from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    versions = relationship("PromptVersion", back_populates="prompt", cascade="all, delete-orphan")
    test_cases = relationship("TestCase", back_populates="prompt", cascade="all, delete-orphan")

    @property
    def latest_version(self):
        if self.versions:
            return max(self.versions, key=lambda v: v.version_number)
        return None


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    system_prompt = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    prompt = relationship("Prompt", back_populates="versions")
    evaluation_runs = relationship("EvaluationRun", back_populates="prompt_version")
