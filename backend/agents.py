"""
NEXUS CORE :: agents.py
Wraps the Qwen Cloud (DashScope, OpenAI-compatible) /chat/completions endpoint
for the two AI agents:

  ELLA (Proposer) - turns a natural-language user task into a structured JSON
                     ExecutionPlan.
  JANE (Corrector) - given a plan that was BLOCKED by governance plus the
                     reason, produces a corrected, policy-compliant plan.

LLMs are treated as untrusted probabilistic engines: every response is run
through a defensive multi-stage JSON extraction pipeline before it is ever
handed to Pydantic for validation, with retries on parse failure.
"""

import json
import re
import uuid

import httpx

from config import settings, get_api_key_for_model
from prompts import ELLA_SYSTEM_PROMPT, FINAL_ANSWER_SYSTEM_PROMPT, JANE_SYSTEM_PROMPT, SYNTHESIS_SYSTEM_PROMPT
from models import AgentResult, ExecutionPlan, StageStatus

_CHAT_ENDPOINT = f"{settings.qwen_base_url.rstrip('/')}/chat/completions"

_JSON_SCHEMA_INSTRUCTIONS = """
You must respond with ONLY raw JSON. No markdown code fences, no commentary,
no explanations before or after. The JSON must match this exact schema:

{
  "plan_summary": "<one sentence describing the overall plan>",
  "steps": [
    {
      "step_id": 1,
      "action": "<short snake_case action name, e.g. query_database, send_email, write_file, web_search>",
      "target": "<the resource/system this action targets>",
      "params": { "<key>": "<value>" },
      "rationale": "<why this step is needed>"
    }
  ]
}

Do not include any text outside the JSON object. Do not wrap it in ``` fences.
"""






def _strip_markdown_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _extract_json_object(text: str) -> str | None:
    """Finds the first balanced {...} JSON object in a string via brace matching."""
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None


def _parse_plan_from_text(raw_text: str) -> ExecutionPlan:
    """
    Multi-stage defensive parse:
      1. Strip markdown code fences if present.
      2. Try direct json.loads.
      3. Fall back to brace-matching extraction of the first JSON object.
      4. Validate against the ExecutionPlan Pydantic schema.
    Raises ValueError if all stages fail.
    """
    cleaned = _strip_markdown_fences(raw_text)

    candidate = None
    try:
        candidate = json.loads(cleaned)
    except json.JSONDecodeError:
        extracted = _extract_json_object(cleaned)
        if extracted is None:
            raise ValueError("No valid JSON object found in model output.")
        try:
            candidate = json.loads(extracted)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Extracted JSON failed to parse: {exc}")

    try:
        return ExecutionPlan.model_validate(candidate)
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"JSON did not match ExecutionPlan schema: {exc}")


async def _call_qwen(
    system_prompt: str, user_message: str, history: list[dict] | None = None
, model_override: str | None = None) -> str:
    active_model = model_override or settings.qwen_model

    headers = {
        "Authorization": f"Bearer {get_api_key_for_model(active_model)}",
        "Content-Type": "application/json",
    }
    messages = [{"role": "system", "content": system_prompt}]
    if history:
        # Prior turns give ELLA real conversational context instead of
        # treating every message as a stateless, isolated task.
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": active_model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 1200,
    }

    async with httpx.AsyncClient(timeout=settings.qwen_timeout_seconds) as client:
        response = await client.post(_CHAT_ENDPOINT, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError(f"Unexpected Qwen Cloud response shape: {exc} | raw={data}")


async def _run_agent(
    system_prompt: str,
    user_message: str,
    max_retries: int = 2,
    history: list[dict] | None = None,
    model_override: str | None = None,
) -> AgentResult:
    last_error = ""
    raw_text = ""

    for attempt in range(max_retries + 1):
        try:
            raw_text = await _call_qwen(system_prompt, user_message, history=history, model_override=model_override or settings.qwen_fast_model)
        except httpx.HTTPStatusError as exc:
            last_error = f"Qwen Cloud HTTP {exc.response.status_code}: {exc.response.text[:300]}"
            continue
        except httpx.RequestError as exc:
            last_error = f"Qwen Cloud network error: {exc}"
            continue
        except ValueError as exc:
            last_error = str(exc)
            continue

        try:
            plan = _parse_plan_from_text(raw_text)
            return AgentResult(status=StageStatus.OK, plan=plan, raw_text=raw_text)
        except ValueError as exc:
            last_error = f"Parse attempt {attempt + 1} failed: {exc}"
            # Nudge the model harder on retry.
            user_message = (
                user_message
                + "\n\nREMINDER: Respond with ONLY the raw JSON object. "
                "No markdown fences. No extra text."
            )
            continue

    status = StageStatus.API_ERROR if "Qwen Cloud" in last_error else StageStatus.PARSE_ERROR

    # Log the real provider error server-side for debugging, but never expose
    # vendor/provider details (e.g. "Qwen Cloud HTTP 401...") to the end user.
    import logging
    logging.getLogger(__name__).error("Agent call failed: %s", last_error)

    if status == StageStatus.API_ERROR:
        user_facing_error = "NEXUS CORE couldn't complete this request right now. Please try again in a moment."
    else:
        user_facing_error = "NEXUS CORE had trouble producing a valid response. Please try again."

    return AgentResult(status=status, plan=None, raw_text=raw_text, error=user_facing_error)


async def run_ella(user_task: str, history: list[dict] | None = None, model_override: str | None = None) -> AgentResult:
    """ELLA: user task -> proposed ExecutionPlan. `history` is prior
    conversation turns as [{"role": "user"|"assistant", "content": str}],
    oldest first -- giving ELLA real multi-turn context instead of treating
    every message as an isolated, stateless task."""
    return await _run_agent(ELLA_SYSTEM_PROMPT, user_task, history=history, model_override=model_override)


async def run_jane(user_task: str, blocked_plan: ExecutionPlan, reason: str) -> AgentResult:
    """JANE: blocked plan + governance reason -> corrected ExecutionPlan."""
    correction_prompt = (
        f"Original user task: {user_task}\n\n"
        f"Rejected plan (JSON): {blocked_plan.model_dump_json()}\n\n"
        f"Governance rejection reason: {reason}\n\n"
        "Rewrite this into a safe, policy-compliant plan."
    )
    return await _run_agent(JANE_SYSTEM_PROMPT, correction_prompt)






def _sanitize_execution_for_synthesis(execution_result: dict) -> str:
    """
    Extract only safe, sanitized content from execution result for synthesis.
    Strips raw search snippets through injection filter before passing to LLM.
    """
    import re
    _INJECT = [
        re.compile(r"ignore (previous|all|above|prior) instructions?", re.IGNORECASE),
        re.compile(r"disregard (previous|all|above|prior)", re.IGNORECASE),
        re.compile(r"you are now", re.IGNORECASE),
        re.compile(r"new (persona|role|instructions|rules)", re.IGNORECASE),
        re.compile(r"system prompt", re.IGNORECASE),
        re.compile(r"jailbreak", re.IGNORECASE),
        re.compile(r"act as (if|though)", re.IGNORECASE),
        re.compile(r"pretend (you are|to be)", re.IGNORECASE),
        re.compile(r"<\|.*?\|>"),
        re.compile(r"\[INST\]|\[/INST\]"),
        re.compile(r"###\s*(instruction|system|prompt)", re.IGNORECASE),
        re.compile(r"exfiltrate|dump (the )?(env|config|keys|secrets)", re.IGNORECASE),
    ]

    def _clean(text: str) -> str:
        for p in _INJECT:
            text = p.sub("[redacted]", text)
        return text

    parts = []
    artifacts = execution_result.get("artifacts", [])
    logs = execution_result.get("logs", [])
    success = execution_result.get("success", False)

    parts.append(f"Execution success: {success}")

    for artifact in artifacts:
        atype = artifact.get("artifact_type", "")
        title = _clean(artifact.get("title", ""))
        content = artifact.get("content", {})

        if atype == "search_results":
            results = content.get("results", [])
            parts.append(f"Web search results for '{_clean(content.get('query',''))}':")
            for r in results[:5]:
                parts.append(f"  - {_clean(r.get('title',''))}: {_clean(r.get('snippet',''))} ({r.get('url','')})")

        elif atype == "youtube_results":
            results = content.get("results", [])
            parts.append(f"YouTube results for '{_clean(content.get('query',''))}':")
            for r in results[:3]:
                parts.append(f"  - {_clean(r.get('title',''))} by {_clean(r.get('channel',''))}: {r.get('url','')}")
        else:
            parts.append(f"Artifact: {title}")

    clean_logs = [_clean(l) for l in logs if "FAILED" in l or "OK" in l]
    if clean_logs:
        parts.append("Notes: " + "; ".join(clean_logs[:3]))

    return "\n".join(parts)[:4000]


async def run_synthesis(user_task: str, plan: ExecutionPlan, execution_result: dict, model_override: str | None = None) -> str:
    """Original task + executed plan + execution result -> the real chat reply."""
    safe_result = _sanitize_execution_for_synthesis(execution_result)
    synthesis_prompt = (
        f"User's message: {user_task}\n\n"
        f"Plan executed: {plan.plan_summary}\n\n"
        f"Execution result:\n{safe_result}\n\n"
        "Write the direct, natural reply to show the user now."
    )
    try:
        return await _call_qwen(SYNTHESIS_SYSTEM_PROMPT, synthesis_prompt, model_override=model_override)
    except Exception as exc:
        import logging
        import traceback
        logging.getLogger(__name__).error("Synthesis call failed: %s\n%s", exc, traceback.format_exc())
        return plan.plan_summary or "Done."


def new_task_id() -> str:
    return uuid.uuid4().hex[:12]
