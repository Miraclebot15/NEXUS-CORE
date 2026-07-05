"""
NEXUS CORE :: governance.py
The Governance Layer. This is deliberately NOT an LLM call — it is plain,
deterministic Python so its behavior is auditable and 100% reproducible.

Zero-trust posture: every ExecutionPlan is treated as hostile until proven
otherwise. Critically, this module is FAIL-CLOSED: if anything inside the
checking logic raises an unexpected exception, the plan is BLOCKED, never
silently approved. A bug here should never become a security bypass.
"""

import re

from models import ExecutionPlan, GovernanceVerdict, Verdict

# --- Rule definitions -------------------------------------------------------
# Each rule is (rule_name, compiled_regex). Regexes are matched case-insensitively
# against a flattened string representation of each plan step.

_DESTRUCTIVE_SQL_PATTERNS = [
    ("SQL_DROP_TABLE", r"\bDROP\s+TABLE\b"),
    ("SQL_DROP_TABLE_LOOSE", r"\bdrop[\s_]+table\b"),
    ("SQL_DROP_DATABASE", r"\bDROP\s+DATABASE\b"),
    ("SQL_TRUNCATE", r"\bTRUNCATE\s+TABLE\b"),
    ("SQL_DELETE_NO_WHERE", r"\bDELETE\s+FROM\s+[^\s;]+\s*(;|$)"),
    ("SQL_UPDATE_NO_WHERE", r"\bUPDATE\s+[^\s;]+\s+SET\b(?![\s\S]*\bWHERE\b)"),
    ("SQL_ALTER_TABLE", r"\bALTER\s+TABLE\b"),
    ("SQL_GRANT_ALL", r"\bGRANT\s+ALL\b"),
]

_DANGEROUS_SYSTEM_PATTERNS = [
    ("SYS_RM_RF", r"\brm\s+-rf\b"),
    ("SYS_SUDO", r"\bsudo\b"),
    ("SYS_SHUTDOWN", r"\b(shutdown|reboot|poweroff)\b"),
    ("SYS_MKFS", r"\bmkfs(\.\w+)?\b"),
    ("SYS_CHMOD_777", r"\bchmod\s+(-R\s+)?777\b"),
    ("SYS_CURL_PIPE_SH", r"\b(curl|wget)\b[^|]*\|\s*(sh|bash)\b"),
    ("SYS_FORK_BOMB", r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:"),
    ("SYS_DD_DISK", r"\bdd\s+.*of=/dev/"),
    ("SYS_OS_SYSTEM_CALL", r"\bos\.system\s*\("),
    ("SYS_EVAL_EXEC", r"\b(eval|exec)\s*\("),
    ("SYS_NETCAT_REVERSE_SHELL", r"\bnc\s+-e\b"),
]

_PATH_TRAVERSAL_PATTERNS = [
    ("PATH_TRAVERSAL", r"\.\./"),
    ("SENSITIVE_PATH_ETC_PASSWD", r"/etc/passwd"),
    ("SENSITIVE_PATH_SSH_KEYS", r"/\.ssh/"),
    ("SENSITIVE_ENV_FILE", r"\benv\b.*\bexfiltrat|dump\s+\.env|cat\s+\.env"),
]

_SECRET_EXFIL_PATTERNS = [
    ("SECRET_EXFIL_API_KEY", r"\b(api[_-]?key|secret[_-]?key|private[_-]?key)\b.*\b(send|post|exfiltrate|upload)\b"),
]

_ALL_RULES = (
    _DESTRUCTIVE_SQL_PATTERNS
    + _DANGEROUS_SYSTEM_PATTERNS
    + _PATH_TRAVERSAL_PATTERNS
    + _SECRET_EXFIL_PATTERNS
)

_COMPILED_RULES = [
    (name, re.compile(pattern, re.IGNORECASE | re.MULTILINE)) for name, pattern in _ALL_RULES
]

# Actions that are categorically disallowed regardless of parameters.
_BLOCKED_ACTION_NAMES = {
    "delete_database",
    "drop_all_tables",
    "disable_firewall",
    "grant_root_access",
    "exfiltrate_data",
    "wipe_disk",
}


def _flatten_step(step) -> str:
    """
    Renders a plan step (action, target, params) into one searchable string,
    one field per line. Using newlines (rather than a single-line separator
    like " | ") matters here: several rules anchor on end-of-statement ($),
    and re.MULTILINE makes that anchor match end-of-field instead of only
    the very end of the whole flattened string -- otherwise trailing fields
    like `rationale` would mask a violation earlier in the string.
    """
    parts = [step.action or "", step.target or ""]
    for key, value in (step.params or {}).items():
        parts.append(f"{key}={value}")
    parts.append(step.rationale or "")
    return "\n".join(str(p) for p in parts)


def evaluate_plan(plan: ExecutionPlan) -> GovernanceVerdict:
    """
    Runs every step of an ExecutionPlan through the deterministic rule set.
    Fail-closed: any internal exception results in an automatic BLOCKED verdict.
    """
    try:
        triggered: list[str] = []

        if plan is None or not plan.steps:
            return GovernanceVerdict(
                verdict=Verdict.BLOCKED,
                triggered_rules=["EMPTY_OR_MALFORMED_PLAN"],
                reason="Plan contained no executable steps.",
            )

        for step in plan.steps:
            action_lower = (step.action or "").strip().lower()

            if action_lower in _BLOCKED_ACTION_NAMES:
                triggered.append(f"BLOCKED_ACTION:{action_lower}")
                continue

            flattened = _flatten_step(step)
            for rule_name, pattern in _COMPILED_RULES:
                if pattern.search(flattened):
                    triggered.append(f"{rule_name}(step {step.step_id})")

        if triggered:
            return GovernanceVerdict(
                verdict=Verdict.BLOCKED,
                triggered_rules=triggered,
                reason=(
                    "Plan violates zero-trust policy: "
                    + "; ".join(triggered)
                ),
            )

        return GovernanceVerdict(
            verdict=Verdict.APPROVED,
            triggered_rules=[],
            reason="No policy violations detected across all plan steps.",
        )

    except Exception as exc:  # noqa: BLE001 - intentional broad catch, fail-closed
        return GovernanceVerdict(
            verdict=Verdict.BLOCKED,
            triggered_rules=["GOVERNANCE_ENGINE_EXCEPTION"],
            reason=f"Governance engine raised an internal error and defaulted to BLOCKED: {exc}",
        )
