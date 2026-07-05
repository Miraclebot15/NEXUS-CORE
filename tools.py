"""
NEXUS CORE :: tools.py
The (minimal) Tool / Research Layer. One hardcoded, read-only tool:
web_search. Uses DuckDuckGo's free Instant Answer API, which requires no API
key and no external database — it's a plain HTTP call, so it fits the
hackathon's "no external DB" rule (it's not persisting anything externally,
just fetching public search results).

This tool is only ever invoked from execution.py, AFTER a plan step has
already passed through the governance engine — governance treats
`web_search` as a recognized, low-risk read-only action, but every step
still goes through the same rule set as everything else.
"""

import httpx

from config import settings

_DDG_ENDPOINT = "https://api.duckduckgo.com/"


async def web_search(query: str, max_results: int = 5) -> dict:
    """
    Read-only web search. Returns a dict with `query`, `results` (list of
    {title, snippet, url}), and `error` (empty string on success).
    Never raises — callers should check the `error` field.
    """
    if not query or not query.strip():
        return {"query": query, "results": [], "error": "Empty query."}

    params = {
        "q": query,
        "format": "json",
        "no_html": "1",
        "skip_disambig": "1",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.web_search_timeout_seconds) as client:
            response = await client.get(_DDG_ENDPOINT, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        return {"query": query, "results": [], "error": f"Search request failed: {exc}"}
    except ValueError as exc:
        return {"query": query, "results": [], "error": f"Search response was not valid JSON: {exc}"}

    results: list[dict] = []

    abstract = data.get("AbstractText") or ""
    abstract_url = data.get("AbstractURL") or ""
    if abstract:
        results.append({"title": data.get("Heading") or query, "snippet": abstract, "url": abstract_url})

    # DuckDuckGo's Instant Answer API sometimes populates `Definition`
    # instead of `AbstractText` (common for dictionary-style queries).
    definition = data.get("Definition") or ""
    definition_url = data.get("DefinitionURL") or ""
    if definition and definition != abstract:
        results.append(
            {"title": data.get("Heading") or query, "snippet": definition, "url": definition_url}
        )

    for topic in data.get("RelatedTopics", []):
        if len(results) >= max_results:
            break
        if isinstance(topic, dict) and topic.get("Text"):
            results.append(
                {
                    "title": topic.get("Text", "")[:80],
                    "snippet": topic.get("Text", ""),
                    "url": topic.get("FirstURL", ""),
                }
            )

    # Some responses nest topics one level deeper under a "Topics" group.
    for group in data.get("RelatedTopics", []):
        if len(results) >= max_results:
            break
        if isinstance(group, dict) and isinstance(group.get("Topics"), list):
            for topic in group["Topics"]:
                if len(results) >= max_results:
                    break
                if isinstance(topic, dict) and topic.get("Text"):
                    results.append(
                        {
                            "title": topic.get("Text", "")[:80],
                            "snippet": topic.get("Text", ""),
                            "url": topic.get("FirstURL", ""),
                        }
                    )

    if not results:
        # Honest, specific empty state instead of a silent blank box: the
        # free Instant Answer API is built for definitions/named entities,
        # not general web search, and genuinely has nothing for most
        # open-ended queries. Surfacing why is much better for a live demo
        # (or any real use) than an unexplained empty result list.
        return {
            "query": query,
            "results": [],
            "error": (
                "DuckDuckGo's free Instant Answer API returned no results for this "
                "query. It's built for definitions and named entities (e.g. "
                "'Python programming language', 'Server-Sent Events') rather than "
                "open-ended searches -- try rephrasing as a specific term or topic."
            ),
        }

    return {"query": query, "results": results[:max_results], "error": ""}
