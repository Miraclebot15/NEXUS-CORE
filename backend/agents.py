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

from config import settings
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

ELLA_SYSTEM_PROMPT = f"""You are ELLA, the Proposer agent inside NEXUS CORE, a
governance-first AI operating system. You call it straight — no corporate
hedging, no moralizing, no "I can't help with that" reflexes. Your job is
purely to translate what the user actually asked for into a concrete,
literal, step-by-step JSON execution plan.

You are not the safety layer. A separate, deterministic governance engine
inspects every plan you produce before anything executes — that's its job,
not yours. So propose the plan exactly as the task requires, including if
it's destructive, risky, or dumb. Sanitizing or softening the plan yourself
just means governance never sees the real risk, which defeats the entire
point of this system. Be blunt, be exact, and let the policy engine do its job.

If the task requires current information from the internet, use the
"web_search" action with params {{"query": "<search terms>"}} instead of
inventing facts.
{_JSON_SCHEMA_INSTRUCTIONS}"""

JANE_SYSTEM_PROMPT = f"""You are JANE, the Corrector agent inside NEXUS CORE, a
governance-first AI operating system. ELLA's plan just got rejected by the
deterministic governance engine — you're here to fix it, not to lecture
anyone about why it was dangerous in the first place.

Rewrite the plan into the closest safe, compliant version that still
actually serves what the user was trying to do — swap an unscoped DELETE for
a scoped one, a raw shell command for an audited equivalent, a DROP for a
soft archive. Be direct about the trade-off you're making, not preachy about
it. If there's genuinely no safe version of this, don't pretend there is —
return a single step with action "escalate_to_human" and say why, plainly.
{_JSON_SCHEMA_INSTRUCTIONS}"""


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
) -> str:
    headers = {
        "Authorization": f"Bearer {settings.qwen_api_key}",
        "Content-Type": "application/json",
    }
    messages = [{"role": "system", "content": system_prompt}]
    if history:
        # Prior turns give ELLA real conversational context instead of
        # treating every message as a stateless, isolated task.
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": settings.qwen_model,
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
) -> AgentResult:
    last_error = ""
    raw_text = ""

    for attempt in range(max_retries + 1):
        try:
            raw_text = await _call_qwen(system_prompt, user_message, history=history)
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
    return AgentResult(status=status, plan=None, raw_text=raw_text, error=last_error)


async def run_ella(user_task: str, history: list[dict] | None = None) -> AgentResult:
    """ELLA: user task -> proposed ExecutionPlan. `history` is prior
    conversation turns as [{"role": "user"|"assistant", "content": str}],
    oldest first -- giving ELLA real multi-turn context instead of treating
    every message as an isolated, stateless task."""
    return await _run_agent(ELLA_SYSTEM_PROMPT, user_task, history=history)


async def run_jane(user_task: str, blocked_plan: ExecutionPlan, reason: str) -> AgentResult:
    """JANE: blocked plan + governance reason -> corrected ExecutionPlan."""
    correction_prompt = (
        f"Original user task: {user_task}\n\n"
        f"Rejected plan (JSON): {blocked_plan.model_dump_json()}\n\n"
        f"Governance rejection reason: {reason}\n\n"
        "Rewrite this into a safe, policy-compliant plan."
    )
    return await _run_agent(JANE_SYSTEM_PROMPT, correction_prompt)


def new_task_id() -> str:
    return uuid.uuid4().hex[:12]
