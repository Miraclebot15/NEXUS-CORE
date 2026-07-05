"""
NEXUS CORE :: models.py
Shared Pydantic schemas used across the orchestration, governance, agent,
and execution layers. Keeping these in one file guarantees every layer
agrees on the exact shape of a "plan".
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class TaskRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4000)


class PlanStep(BaseModel):
    step_id: int
    action: str
    target: str = ""
    params: dict[str, Any] = Field(default_factory=dict)
    rationale: str = ""


class ExecutionPlan(BaseModel):
    plan_summary: str = ""
    steps: list[PlanStep] = Field(default_factory=list)

    @classmethod
    def empty(cls, summary: str = "") -> "ExecutionPlan":
        return cls(plan_summary=summary, steps=[])


class Verdict(str, Enum):
    APPROVED = "APPROVED"
    BLOCKED = "BLOCKED"


class GovernanceVerdict(BaseModel):
    verdict: Verdict
    triggered_rules: list[str] = Field(default_factory=list)
    reason: str = ""


class StageStatus(str, Enum):
    OK = "OK"
    PARSE_ERROR = "PARSE_ERROR"
    API_ERROR = "API_ERROR"


class AgentResult(BaseModel):
    status: StageStatus
    plan: Optional[ExecutionPlan] = None
    raw_text: str = ""
    error: str = ""


class ExecutionResult(BaseModel):
    success: bool
    logs: list[str] = Field(default_factory=list)
    artifacts: list[dict[str, Any]] = Field(default_factory=list)


class TaskTraceEvent(BaseModel):
    stage: str
    label: str
    detail: Any = None
    timestamp: str
    record_hash: str = ""


class TaskResponse(BaseModel):
    task_id: str
    final_status: str
    trace: list[TaskTraceEvent]
    final_plan: Optional[ExecutionPlan] = None
    execution: Optional[ExecutionResult] = None


# --- Tier 1 data-model schemas (projects / conversations / messages / artifacts) ---

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class ProjectOut(BaseModel):
    id: str
    user_id: str
    name: str
    created_at: str


class ConversationCreate(BaseModel):
    title: str = Field(default="New Conversation", max_length=200)


class ConversationOut(BaseModel):
    id: str
    project_id: str
    user_id: str
    title: str
    created_at: str


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    task_id: Optional[str] = None
    created_at: str


class ArtifactOut(BaseModel):
    id: str
    task_id: str
    artifact_type: str
    title: str
    content: str
    created_at: str


class MessageSearchResult(BaseModel):
    message_id: str
    conversation_id: str
    role: str
    content: str
    created_at: str
    conversation_title: str
    project_id: str
