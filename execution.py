"""
NEXUS CORE :: execution.py
The Execution Layer. Every action is SIMULATED (no real filesystem/shell/DB
access) EXCEPT `web_search`, which performs a real, read-only HTTP call via
tools.web_search -- this is the one deliberate exception, and it only runs
after the plan has already passed governance.

Produces both a human-readable log (for the audit trail / SSE stream) and a
list of artifact payloads (for the Artifact System / persistent storage).
"""

from models import ExecutionPlan, ExecutionResult
from tools import web_search


async def simulate_execution(plan: ExecutionPlan) -> ExecutionResult:
    logs: list[str] = []
    artifacts: list[dict] = []

    if not plan or not plan.steps:
        return ExecutionResult(success=False, logs=["No steps to execute."], artifacts=[])

    logs.append(f"[SANDBOX] Initializing isolated execution context for: {plan.plan_summary!r}")

    for step in plan.steps:
        logs.append(
            f"[SANDBOX] Step {step.step_id}: executing action='{step.action}' "
            f"target='{step.target}'"
        )
        if step.params:
            param_str = ", ".join(f"{k}={v}" for k, v in step.params.items())
            logs.append(f"           params -> {param_str}")
        logs.append(f"           rationale -> {step.rationale or 'n/a'}")

        if step.action.strip().lower() == "web_search":
            query = str(step.params.get("query", "")).strip()
            result = await web_search(query)
            if result["error"]:
                logs.append(f"[SANDBOX] Step {step.step_id}: web_search FAILED -> {result['error']}")
            else:
                logs.append(
                    f"[SANDBOX] Step {step.step_id}: web_search returned "
                    f"{len(result['results'])} result(s)."
                )
                artifacts.append(
                    {
                        "artifact_type": "search_results",
                        "title": f"Web search: {query}"[:120],
                        "content": result,
                    }
                )
        else:
            logs.append(f"[SANDBOX] Step {step.step_id}: completed OK (simulated).")

    logs.append("[SANDBOX] Execution context torn down. No persistent side effects outside declared artifacts.")
    return ExecutionResult(success=True, logs=logs, artifacts=artifacts)
