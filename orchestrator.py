"""
NEXUS CORE :: orchestrator.py
The streaming version of the Orchestration Layer. Runs the full
ELLA -> Governance -> [JANE -> Governance]* -> Execution -> Audit pipeline
as an async generator, yielding a TaskTraceEvent the moment each stage
completes so main.py's SSE route can push it to the client immediately
instead of waiting for the whole pipeline to finish.

Also responsible for persisting: the task row, the user/assistant messages,
and any artifacts produced during execution -- so conversation history,
memory search, and the artifact system all stay in sync with what actually
happened during a run.
"""

from typing import AsyncGenerator

import database
from agents import run_ella, run_jane
from config import settings
from execution import simulate_execution
from governance import evaluate_plan
from models import ExecutionPlan, StageStatus, TaskTraceEvent, Verdict


def _emit(task_id: str, stage: str, label: str, detail) -> TaskTraceEvent:
    record = database.append_audit_record(task_id, stage, label, detail)
    return TaskTraceEvent(
        stage=stage, label=label, detail=detail,
        timestamp=record["timestamp"], record_hash=record["record_hash"],
    )


async def run_pipeline(
    user_id: str, conversation_id: str, prompt: str
) -> AsyncGenerator[TaskTraceEvent, None]:
    task_id = database.new_id("task")
    database.create_task(task_id, conversation_id, user_id, prompt)

    # Snapshot prior turns BEFORE adding the new user message, so ELLA gets
    # everything that came before this task but not a duplicate of it.
    # Capped at the most recent 20 messages to bound prompt size.
    prior_messages = database.list_messages(conversation_id, limit=1000)[-20:]
    history = [{"role": m["role"], "content": m["content"]} for m in prior_messages]

    database.add_message(conversation_id, "user", prompt, task_id=task_id)

    yield _emit(task_id, "INTAKE", "Task received", {"task_id": task_id, "prompt": prompt})

    # --- Stage 1: ELLA proposes a plan -------------------------------------
    ella_result = await run_ella(prompt, history=history)
    yield _emit(
        task_id,
        "ELLA_PROPOSE",
        f"ELLA agent status: {ella_result.status.value}",
        {
            "status": ella_result.status.value,
            "raw_text": ella_result.raw_text[:1500],
            "error": ella_result.error,
            "plan": ella_result.plan.model_dump() if ella_result.plan else None,
        },
    )

    if ella_result.status != StageStatus.OK or ella_result.plan is None:
        database.update_task_status(task_id, "FAILED_PROPOSAL")
        database.add_message(
            conversation_id, "assistant",
            f"I couldn't produce a valid plan for that request. ({ella_result.error})",
            task_id=task_id,
        )
        yield _emit(task_id, "TERMINAL", "Task failed: ELLA could not produce a valid plan",
                    {"error": ella_result.error})
        return

    current_plan: ExecutionPlan = ella_result.plan

    # --- Stage 2: Governance check + bounded JANE correction loop ----------
    attempts_used = 0
    verdict = evaluate_plan(current_plan)
    yield _emit(task_id, "GOVERNANCE_CHECK", f"Governance verdict: {verdict.verdict.value}",
                verdict.model_dump())

    while verdict.verdict == Verdict.BLOCKED and attempts_used < settings.max_correction_attempts:
        attempts_used += 1
        jane_result = await run_jane(prompt, current_plan, verdict.reason)
        yield _emit(
            task_id,
            "JANE_CORRECT",
            f"JANE correction attempt {attempts_used}/{settings.max_correction_attempts}: "
            f"{jane_result.status.value}",
            {
                "status": jane_result.status.value,
                "raw_text": jane_result.raw_text[:1500],
                "error": jane_result.error,
                "plan": jane_result.plan.model_dump() if jane_result.plan else None,
            },
        )

        if jane_result.status != StageStatus.OK or jane_result.plan is None:
            database.update_task_status(task_id, "FAILED_CORRECTION")
            database.add_message(
                conversation_id, "assistant",
                f"The plan was blocked by governance and could not be safely corrected. "
                f"({jane_result.error})",
                task_id=task_id,
            )
            yield _emit(task_id, "TERMINAL", "Task failed: JANE could not produce a valid correction",
                        {"error": jane_result.error})
            return

        current_plan = jane_result.plan
        verdict = evaluate_plan(current_plan)
        yield _emit(
            task_id, "GOVERNANCE_RECHECK",
            f"Governance re-verdict after correction {attempts_used}: {verdict.verdict.value}",
            verdict.model_dump(),
        )

    if verdict.verdict == Verdict.BLOCKED:
        database.update_task_status(task_id, "REJECTED")
        database.add_message(
            conversation_id, "assistant",
            f"This task was rejected by the governance engine after "
            f"{settings.max_correction_attempts} correction attempt(s): {verdict.reason}",
            task_id=task_id,
        )
        yield _emit(
            task_id, "TERMINAL",
            f"Task REJECTED: governance still blocked after {settings.max_correction_attempts} "
            "correction attempt(s)",
            verdict.model_dump(),
        )
        return

    # --- Stage 3: Execution (simulated sandbox, real for web_search) -------
    execution_result = await simulate_execution(current_plan)
    yield _emit(task_id, "EXECUTION", "Sandbox execution complete", execution_result.model_dump())

    for artifact_payload in execution_result.artifacts:
        artifact = database.create_artifact(
            task_id=task_id,
            artifact_type=artifact_payload["artifact_type"],
            title=artifact_payload["title"],
            content=_safe_json(artifact_payload["content"]),
        )
        yield _emit(task_id, "ARTIFACT_CREATED", f"Artifact created: {artifact['title']}", artifact)

    final_status = "EXECUTED" if execution_result.success else "EXECUTION_FAILED"
    database.update_task_status(task_id, final_status)
    database.add_message(
        conversation_id, "assistant",
        current_plan.plan_summary or "Task completed.",
        task_id=task_id,
    )

    yield _emit(task_id, "TERMINAL", f"Task finished with status: {final_status}", {})


def _safe_json(value) -> str:
    import json
    try:
        return json.dumps(value, default=str)
    except TypeError:
        return json.dumps(str(value))
