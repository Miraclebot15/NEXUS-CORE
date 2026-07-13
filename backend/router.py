"""
NEXUS CORE :: router.py
Smart task router — classifies prompts by type AND complexity.
Complexity scoring ensures simple questions use fast models,
heavy tasks use flagship/thinking models. Mirrors how Claude,
GPT-4o, Gemini, and Grok tier their model selection.
"""

from dataclasses import dataclass
from config import settings


@dataclass
class RouteConfig:
    model: str
    ella_model: str
    tools: list[str]
    reasoning_mode: str
    task_type: str
    complexity: str  # "simple" | "moderate" | "heavy"


# --- Complexity scoring ---
# Simple: short, factual, no reasoning required
# Moderate: multi-step, some context needed
# Heavy: deep reasoning, long output, research, code architecture

def _complexity(prompt: str) -> str:
    words = len(prompt.split())
    prompt_lower = prompt.lower()

    heavy_signals = [
        "explain in depth", "comprehensive", "detailed analysis", "step by step",
        "pros and cons", "compare and contrast", "architecture", "design a system",
        "write a full", "research", "literature review", "deep dive",
        "prove that", "derive", "implement from scratch", "build a complete"
    ]
    simple_signals = [
        "what is", "who is", "when is", "define", "how do you spell",
        "translate", "what does", "give me a", "list", "name"
    ]

    if any(s in prompt_lower for s in heavy_signals) or words > 80:
        return "heavy"
    if any(s in prompt_lower for s in simple_signals) or words < 15:
        return "simple"
    return "moderate"


# --- Model selection by complexity ---
def _pick_model(base_model: str, complexity: str) -> str:
    """
    Upgrade or downgrade model based on complexity.
    Heavy tasks get thinking/flagship. Simple tasks get fast model.
    """
    if complexity == "simple":
        # Use fast model for simple tasks regardless of type
        return settings.qwen_fast_model  # qwen-turbo
    if complexity == "heavy":
        # Upgrade to thinking model for heavy tasks
        if base_model in ("qwen3.7-max", "qwen3-coder-plus"):
            return "qwen3-235b-a22b-thinking-2507"
        if base_model == "qwq-plus":
            return "qwen3-235b-a22b-thinking-2507"
    return base_model  # moderate stays as-is


TASK_PATTERNS = {
    "image_gen": {
        "keywords": ["generate image", "create image", "draw me", "make a picture",
                     "image of", "picture of", "illustration of", "visualize"],
        "model": "qwen3.7-max",
        "ella_model": "qwen-turbo",
        "tools": ["image_generate"],
        "reasoning_mode": "creative",
        "task_type": "image_generation",
    },
    "image_analyze": {
        "keywords": ["what is in this image", "describe this image", "read this image",
                     "ocr", "extract text from image", "what does this image show"],
        "model": "qwen3-vl-plus",
        "ella_model": "qwen-turbo",
        "tools": [],
        "reasoning_mode": "fast",
        "task_type": "vision",
    },
    "math": {
        "keywords": ["calculate", "solve", "equation", "integral", "derivative",
                     "proof", "theorem", "math problem", "formula", "algebra",
                     "calculus", "statistics", "probability"],
        "model": "qwq-plus",
        "ella_model": "qwen-turbo",
        "tools": [],
        "reasoning_mode": "deep",
        "task_type": "math",
    },
    "code": {
        "keywords": ["code", "function", "debug", "traceback", "script", "python",
                     "javascript", "typescript", "fix this", "implement", "refactor",
                     "class", "api endpoint", "sql query", "algorithm",
                     "syntax error", "runtime error", "write a program"],
        "model": "qwen3-coder-plus",
        "ella_model": "qwen-turbo",
        "tools": ["web_search"],
        "reasoning_mode": "fast",
        "task_type": "code",
    },
    "deep_research": {
        "keywords": ["research", "analyze in depth", "comprehensive analysis",
                     "compare and contrast", "explain in detail", "pros and cons",
                     "literature review", "deep dive", "thorough explanation",
                     "break down", "explain how"],
        "model": "qwen3-235b-a22b-thinking-2507",
        "ella_model": "qwen-turbo",
        "tools": ["web_search", "youtube_search"],
        "reasoning_mode": "deep",
        "task_type": "research",
    },
    "translation": {
        "keywords": ["translate", "in french", "in spanish", "in arabic",
                     "in chinese", "in japanese", "in german", "in portuguese",
                     "in korean", "en francais", "auf deutsch"],
        "model": "qwen3.7-max",
        "ella_model": "qwen-turbo",
        "tools": [],
        "reasoning_mode": "fast",
        "task_type": "translation",
    },
    "creative": {
        "keywords": ["write a story", "write a poem", "write a song",
                     "creative writing", "fiction", "roleplay", "write a script",
                     "write an essay", "write a blog", "short story", "narrative"],
        "model": "qwen3.7-max",
        "ella_model": "qwen-turbo",
        "tools": [],
        "reasoning_mode": "creative",
        "task_type": "creative",
    },
    "search": {
        "keywords": ["what is", "who is", "when did", "where is", "latest",
                     "current", "news", "today", "price of", "release date",
                     "score", "result", "weather", "how much", "who won",
                     "what happened", "tell me about"],
        "model": "qwen3.7-max",
        "ella_model": "qwen-turbo",
        "tools": ["web_search", "youtube_search"],
        "reasoning_mode": "fast",
        "task_type": "search",
    },
}

PRIORITY = [
    "image_gen", "image_analyze", "math", "code",
    "deep_research", "translation", "creative", "search"
]


def route_task(prompt: str) -> RouteConfig:
    """
    Classify task type + complexity, return optimal model + tool config.
    Simple tasks -> fast model. Heavy tasks -> thinking/flagship.
    Mirrors Claude/GPT/Gemini/Grok model tiering behavior.
    """
    prompt_lower = prompt.lower().strip()
    complexity = _complexity(prompt)

    for task_type in PRIORITY:
        pattern = TASK_PATTERNS[task_type]
        if any(kw in prompt_lower for kw in pattern["keywords"]):
            base_model = pattern["model"]
            # Image/vision/translation — don't complexity-adjust, use specialist model always
            if task_type in ("image_gen", "image_analyze", "code", "math"):
                final_model = base_model
            else:
                final_model = _pick_model(base_model, complexity)

            return RouteConfig(
                model=final_model,
                ella_model=pattern["ella_model"],
                tools=pattern["tools"],
                reasoning_mode=pattern["reasoning_mode"],
                task_type=pattern["task_type"],
                complexity=complexity,
            )

    # Default: general task
    final_model = _pick_model(settings.qwen_model, complexity)
    return RouteConfig(
        model=final_model,
        ella_model=settings.qwen_fast_model,
        tools=["web_search", "youtube_search"],
        reasoning_mode="fast",
        task_type="general",
        complexity=complexity,
    )
