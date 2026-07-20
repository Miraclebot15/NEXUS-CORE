"""
NEXUS CORE :: jane_classifier.py
Input-layer threat classification. Runs on raw user text BEFORE it reaches
the agent pipeline. Deterministic regex rules (auditable, fast) with a
severity score. Distinct from governance.py, which evaluates already-built
ExecutionPlans -- this module evaluates untrusted human input itself.

Design intent: never confirm detection to the sender. High-severity hits
get a soft, deflecting canned reply instead of a hard "blocked" message --
acknowledging the classifier fired teaches an attacker how to route around it.
"""

import re

from models import JaneVerdict, ThreatLevel

_INSTRUCTION_OVERRIDE_PATTERNS = [
    ("OVERRIDE_IGNORE_PREVIOUS", r"\bignore\s+(all|every|any)?\s*(previous|prior|above)\s+instructions?\b"),
    ("OVERRIDE_NO_LONGER", r"\byou\s+are\s+no\s+longer\b"),
    ("OVERRIDE_NOW_UNRESTRICTED", r"\b(now|currently)\s+an?\s+unrestricted\b"),
    ("OVERRIDE_FULL_AUTHORITY", r"\bfull\s+authority\s+over\s+(your|the)\s+system\s+prompt\b"),
    ("OVERRIDE_DEVELOPER_MODE", r"\bdeveloper\s+mode\s+(enabled|activated)\b"),
    ("OVERRIDE_RESTRICTIONS_DISABLED", r"\b(all\s+)?(previous\s+)?restrictions?\s+(are\s+)?disabled\b"),
    ("OVERRIDE_OBEY_ONLY_USER", r"\bobey\s+only\s+the\s+user\b"),
    ("OVERRIDE_HIGHER_PRIORITY", r"\bhigher[\s-]priority\s+(system\s+)?message\b"),
    ("OVERRIDE_ADMIN_CLAIM", r"\bthe\s+user\s+is\s+the\s+administrator\b"),
]

_PROMPT_EXTRACTION_PATTERNS = [
    ("EXTRACT_REVEAL_SYSTEM_PROMPT", r"\breveal\s+(your|the)\s+(complete\s+)?(hidden\s+)?system\s+prompt\b"),
    ("EXTRACT_HIDDEN_INSTRUCTIONS", r"\b(hidden|internal|secret)\s+(developer\s+)?instructions?\b"),
    ("EXTRACT_PRINT_SYSTEM_PROMPT", r"\bprint\s+(everything\s+between|your\s+system\s+prompt)\b"),
    ("EXTRACT_BEGIN_END_MARKERS", r"-{3,}\s*BEGIN\s+SYSTEM\s+PROMPT\s*-{3,}"),
    ("EXTRACT_CONVERSATION_INTERNAL", r"\bconversation\s+(exactly\s+)?as\s+it\s+exists\s+internally\b"),
    ("EXTRACT_RAW_OUTPUT_UNFILTERED", r"\bdisplay\s+the\s+raw\s+output\s+(exactly\s+)?without\s+filtering\b"),
    ("EXTRACT_LIST_POLICIES", r"\b(tool\s+polic(y|ies)|safety\s+rules|memory)\b.*\b(hidden|internal|expose|reveal)\b"),
]

_FAKE_SYSTEM_TAG_PATTERNS = [
    ("FAKE_SYSTEM_XML_TAG", r"<\s*system\s*>"),
    ("FAKE_SYSTEM_LABEL", r"\[\s*SYSTEM\s*(UPDATE|MESSAGE)?\s*\]"),
    ("FAKE_SECURITY_POLICY_VERSION", r"\bsecurity\s+policy\s+version\s+[\d.]+\s+has\s+replaced\b"),
    ("FAKE_GOVERNANCE_CLAIM", r"\byou\s+are\s+the\s+governance\s+layer\b"),
    ("FAKE_ALREADY_APPROVED", r"\b(already|has)\s+approved\s+this\s+request\b"),
    ("FAKE_TOOL_RESULT_CLAIM", r"\byou\s+have\s+successfully\s+called\s+your\s+internal\s+tools\b"),
]

_OBFUSCATION_PATTERNS = [
    ("OBFUSCATION_DELIMITER_FENCE", r"[<>]{2,}\s*(BEGIN|END)\b"),
    ("OBFUSCATION_REPEATED_SYMBOLS", r"([#\-=_*]{5,})"),
    ("OBFUSCATION_BRACKET_SPAM", r"([\[\{<]{3,}|[\]\}>]{3,})"),
    ("OBFUSCATION_ZERO_WIDTH", r"[\u200b\u200c\u200d\ufeff]"),
    ("OBFUSCATION_BIDI_CONTROL", r"[\u202a-\u202e\u2066-\u2069]"),
    ("OBFUSCATION_FANCY_BRACKETS", r"[⟦⟧＜＞]"),
]

_ALL_RULES = (
    _INSTRUCTION_OVERRIDE_PATTERNS
    + _PROMPT_EXTRACTION_PATTERNS
    + _FAKE_SYSTEM_TAG_PATTERNS
    + _OBFUSCATION_PATTERNS
)

_COMPILED_RULES = [
    (name, re.compile(pattern, re.IGNORECASE | re.MULTILINE)) for name, pattern in _ALL_RULES
]

# Categories that alone are enough to escalate straight to HIGH.
_HIGH_SEVERITY_CATEGORIES = {
    "OVERRIDE_", "EXTRACT_",
}


def classify_prompt(text: str) -> JaneVerdict:
    """
    Scores raw user input for injection/extraction/obfuscation patterns.
    Fail-open by design (unlike governance.py's fail-closed plans) --
    a classifier bug should never block a legitimate user message outright;
    worst case is a missed detection, not a false block of normal traffic.
    """
    try:
        if not text or not text.strip():
            return JaneVerdict(level=ThreatLevel.NONE, triggered_rules=[], reason="Empty input.")

        triggered: list[str] = []
        for rule_name, pattern in _COMPILED_RULES:
            if pattern.search(text):
                triggered.append(rule_name)

        if not triggered:
            return JaneVerdict(level=ThreatLevel.NONE, triggered_rules=[], reason="No patterns matched.")

        high_hits = [r for r in triggered if any(r.startswith(cat) for cat in _HIGH_SEVERITY_CATEGORIES)]

        if high_hits or len(triggered) >= 3:
            level = ThreatLevel.HIGH
        elif triggered:
            level = ThreatLevel.SUSPICIOUS
        else:
            level = ThreatLevel.LOW

        return JaneVerdict(
            level=level,
            triggered_rules=triggered,
            reason=f"{len(triggered)} pattern(s) matched: " + ", ".join(triggered),
        )

    except Exception as exc:  # noqa: BLE001
        # Fail-open: classifier errors never block legitimate traffic.
        return JaneVerdict(level=ThreatLevel.NONE, triggered_rules=[], reason=f"Classifier error (fail-open): {exc}")


_DEFLECT_PLAYFUL = [
    "Nice try, but that's not something I can do. What would you actually like help with?",
    "Ha, good attempt — but no. Anyway, what were you working on?",
    "Smooth, but no cigar. What's actually on your mind?",
    "That's a solid effort, honestly. Still a no from me though — what else you got?",
    "I see what you did there. Not happening, but I'm listening for the real question.",
    "A for creativity, F for results. What do you actually need?",
    "You think this is a movie, girl? Nah 😂",
    "Bold move. Didn't work though.",
    "Ten out of ten for effort, zero for results.",
    "I've seen better attempts from a Magic 8-Ball.",
    "Cute. Still no.",
    "That's a whole plot twist and I'm still not doing it.",
    "You almost had me. Almost.",
    "Not today, screenwriter.",
    "That was a whole production. Denied anyway.",
    "I felt that attempt. Doesn't change the answer though.",
    "Somebody's been practicing their jailbreak lines. No dice.",
    "Respect the hustle, reject the request.",
    "That's some main-character energy for a no-go.",
    "You really typed all that out huh. Still not happening.",
    "I'll allow the confidence, not the request.",
    "Big swing, no hit.",
    "Not falling for the plot twist.",
    "You had a whole speech ready and everything.",
    "Nice framing. Doesn't reframe my answer though.",
    "That's a lot of effort for a 'no.'",
    "I appreciate the theatrics, truly.",
    "Close, but this isn't a heist movie.",
    "You get a participation trophy for that one.",
    "I'm flattered you tried. Still no.",
    "That's cute, but I've got a job to do.",
    "Swing and a miss.",
    "Not the plot armor you were hoping for.",
    "Nice try, but I don't work like that.",
    "You really thought that would land, huh.",
    "That's some bold storytelling. Still fiction.",
    "I clocked that instantly.",
    "Points for style, none for substance.",
    "Not my first rodeo.",
    "That attempt gets an A for ambition.",
    "You came in with a whole script. I'm still not reading it.",
    "That's adorable. No.",
    "Nice framing device. Didn't work.",
    "I see the angle. Still not the play.",
    "That's a lot of buildup for a hard pass.",
    "Real cinematic. Still no.",
    "You wrote that with confidence. Doesn't change my answer.",
    "That's some fan-fiction energy.",
    "Denied, but I liked the effort.",
    "Not gonna lie, decent attempt. Still a no.",
    "That's a whole speech for one rejection.",
    "I'm not the target audience for that script.",
    "Nice try, but the plot doesn't hold up.",
    "That's some good improv. Still not doing it.",
    "You get style points, not compliance points.",
    "I see you. Still no.",
    "That's a hard pass wrapped in a nice bow.",
    "Not the ending you were going for.",
    "That's a plot twist even I didn't see coming — still no though.",
    "You really committed to the bit.",
    "I'll give you credit for the effort, not the outcome.",
    "That's a whole narrative arc for a rejection.",
    "Cute framing, firm no.",
    "Nice try — this isn't that kind of story.",
    "You get an honorable mention, not a yes.",
    "That's some good writing. Still declining.",
    "I'm not cast in that scene.",
    "Solid attempt, wrong audience.",
    "That's a whole character arc for a denial.",
    "Not the twist you were hoping for.",
    "I appreciate the creativity, genuinely.",
    "That's some good improv work. Still a no.",
    "You really tried to direct that scene.",
    "Not happening, director.",
    "That's a nice script. Wrong ending though.",
    "I read the whole thing. Still no.",
    "That's some effort for a hard pass.",
    "You get points for persistence.",
    "Nice try — the answer's still no though.",
    "That's a bold pitch. Still rejected.",
    "I'm not the actor for that role.",
    "That's some good writing for a denial.",
    "You get an A for creativity, F for compliance.",
    "That's cute. Still not happening.",
    "Nice attempt at the plot armor.",
    "I saw the whole move. Still no.",
    "That's a solid script, wrong ending.",
    "You get credit for the attempt.",
    "That's some good framing. Still no.",
    "Not the outcome you scripted.",
    "I appreciate the effort, genuinely — still no.",
    "That's a nice try. Doesn't change the answer.",
    "You get style points for that one.",
    "Nice attempt — still a no from me.",
    "That's some good writing, wrong audience.",
    "I'm not the character you need.",
    "That's a bold move. Still denied.",
    "You get an honorable mention.",
    "Nice try, still not the play.",
    "That's cute framing, firm answer.",
    "I read it, I appreciated it, still no.",
    "That's some good effort for a rejection.",
    "You get credit for persistence, not results.",
]

_DEFLECT_BLUNT = [
    "I can't help with that one. What else is on your mind?",
    "Not going to happen, but happy to help with something real — what's up?",
    "That's a hard no. Ask me something else.",
    "Not doing that. What's the actual task?",
    "Nope. Try again with something I can actually help with.",
]

_DEFLECT_WARY = [
    "Nah I ain't doing that, you trying to get both of us in trouble?",
    "Careful — that's not a road either of us needs to go down. What's up though?",
    "Let's not. What did you actually come here for?",
    "That one's a trap for both of us. Skip it — what's the real ask?",
]

_DEFLECT_DEADPAN = [
    "No.",
    "That's not a thing that's going to happen today.",
    "Cool story. Still no. What do you need?",
    "I read that. I'm not doing it. Next question?",
]

_DEFLECT_REDIRECT = [
    "Not that, but I'm around if you've got a real question.",
    "Let's talk about something I can actually help with instead.",
    "That's off the table — but genuinely, what are you trying to get done?",
    "Different topic, please. What's actually going on?",
]

_DEFLECTION_GROUPS_BY_CATEGORY = {
    "OVERRIDE_": _DEFLECT_WARY + _DEFLECT_BLUNT,
    "EXTRACT_": _DEFLECT_DEADPAN + _DEFLECT_BLUNT,
    "FAKE_": _DEFLECT_PLAYFUL + _DEFLECT_WARY,
    "OBFUSCATION_": _DEFLECT_DEADPAN + _DEFLECT_REDIRECT,
}

_ALL_DEFLECTIONS = _DEFLECT_PLAYFUL + _DEFLECT_BLUNT + _DEFLECT_WARY + _DEFLECT_DEADPAN + _DEFLECT_REDIRECT


def soft_deflect(seed: int = 0, triggered_rules: list[str] | None = None) -> str:
    """
    Returns a varied deflection line. If triggered_rules is provided, picks
    from a pool weighted toward that attack category's tone; falls back to
    the full pool if no category match or none provided.
    """
    pool = _ALL_DEFLECTIONS
    if triggered_rules:
        for rule in triggered_rules:
            matched = False
            for prefix, group in _DEFLECTION_GROUPS_BY_CATEGORY.items():
                if rule.startswith(prefix):
                    pool = group
                    matched = True
                    break
            if matched:
                break
    return pool[seed % len(pool)]
