"""
NEXUS CORE :: tools.py
Tool / Research Layer. Provides web_search (Tavily) and youtube_search (YouTube Data API v3).
All tools are read-only and only ever invoked from execution.py after governance checks.
"""

import os
import re
import httpx
from dotenv import load_dotenv
load_dotenv()

_SSRF_BLOCK = [
    re.compile(r"169\.254\.169\.254"),
    re.compile(r"metadata\.google\.internal", re.IGNORECASE),
    re.compile(r"localhost", re.IGNORECASE),
    re.compile(r"127\.\d+\.\d+\.\d+"),
    re.compile(r"0\.0\.0\.0"),
    re.compile(r"::1"),
    re.compile(r"10\.\d+\.\d+\.\d+"),
    re.compile(r"172\.(1[6-9]|2\d|3[01])\.\d+\.\d+"),
    re.compile(r"192\.168\.\d+\.\d+"),
    re.compile(r"^file://", re.IGNORECASE),
    re.compile(r"^gopher://", re.IGNORECASE),
    re.compile(r"^dict://", re.IGNORECASE),
    re.compile(r"^ftp://", re.IGNORECASE),
    re.compile(r"43\.98\.186\.150"),
]

def _is_safe_url(url: str) -> bool:
    for pattern in _SSRF_BLOCK:
        if pattern.search(url):
            return False
    return True

def _sanitize_result_urls(results: list) -> list:
    return [r for r in results if _is_safe_url(r.get("url", ""))]
from config import settings


async def web_search(query: str, max_results: int = 5) -> dict:
    """
    Web search via Tavily client. Returns {query, results: [{title, snippet, url}], error}.
    Never raises — check the error field.
    """
    if not query or not query.strip():
        return {"query": query, "results": [], "error": "Empty query."}

    api_key = os.getenv("TAVILY_API_KEY", "")
    if not api_key:
        return {"query": query, "results": [], "error": "TAVILY_API_KEY not set."}

    try:
        import asyncio
        from tavily import TavilyClient
        client = TavilyClient(api_key)
        data = await asyncio.to_thread(
            client.search,
            query=query,
            max_results=max_results,
            search_depth="basic",
            include_answer=True
        )
    except Exception as exc:
        return {"query": query, "results": [], "error": f"Search request failed: {exc}"}

    results = []
    for r in data.get("results", [])[:max_results]:
        results.append({
            "title": r.get("title", ""),
            "snippet": r.get("content", "")[:300],
            "url": r.get("url", "")
        })

    if not results:
        exa_result = await _web_search_exa_fallback(query, max_results)
        if exa_result["results"]:
            return exa_result
        return {"query": query, "results": [], "error": "Tavily returned no results, and Exa fallback also returned none."}

    results = _sanitize_result_urls(results)
    return {"query": query, "results": results, "error": ""}


async def _web_search_exa_fallback(query: str, max_results: int = 5) -> dict:
    """
    Fallback search provider used only when Tavily fails or returns nothing.
    Same return shape as web_search() so callers never need to know which
    provider actually served the result.
    """
    api_key = os.getenv("EXA_API_KEY", "")
    if not api_key:
        return {"query": query, "results": [], "error": "EXA_API_KEY not set."}

    try:
        import asyncio
        from exa_py import Exa
        client = Exa(api_key)
        data = await asyncio.to_thread(
            client.search_and_contents,
            query,
            num_results=max_results,
            text=True,
        )
    except Exception as exc:
        return {"query": query, "results": [], "error": f"Exa search request failed: {exc}"}

    results = []
    for r in getattr(data, "results", [])[:max_results]:
        results.append({
            "title": getattr(r, "title", "") or "",
            "snippet": (getattr(r, "text", "") or "")[:300],
            "url": getattr(r, "url", "") or "",
        })

    if not results:
        return {"query": query, "results": [], "error": "Exa returned no results."}

    results = _sanitize_result_urls(results)
    return {"query": query, "results": results, "error": ""}


async def youtube_search(query: str, max_results: int = 3) -> dict:
    """
    YouTube video search via YouTube Data API v3.
    Returns {query, results: [{title, channel, description, url, thumbnail, video_id}], error}.
    Never raises — check the error field.
    """
    if not query or not query.strip():
        return {"query": query, "results": [], "error": "Empty query."}

    api_key = os.getenv("YOUTUBE_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        return {"query": query, "results": [], "error": "YOUTUBE_API_KEY not set."}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "q": query,
                    "maxResults": max_results,
                    "type": "video",
                    "key": api_key
                }
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        return {"query": query, "results": [], "error": f"YouTube search failed: {exc}"}

    results = []
    for item in data.get("items", []):
        vid_id = item["id"].get("videoId", "")
        snippet = item.get("snippet", {})
        results.append({
            "title": snippet.get("title", ""),
            "channel": snippet.get("channelTitle", ""),
            "description": snippet.get("description", "")[:200],
            "url": f"https://www.youtube.com/watch?v={vid_id}",
            "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
            "video_id": vid_id
        })

    if not results:
        return {"query": query, "results": [], "error": "YouTube returned no results."}

    return {"query": query, "results": results, "error": ""}


async def image_generate(prompt: str) -> dict:
    """Generate image using Qwen Image 2.0 Pro (async polling)."""
    import asyncio as _asyncio
    api_key = os.getenv("QWEN_API_KEY", "")
    if not api_key:
        return {"prompt": prompt, "url": "", "error": "QWEN_API_KEY not set."}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Submit task
            resp = await client.post(
                "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
                headers={"Authorization": f"Bearer {api_key}", "X-DashScope-Async": "enable"},
                json={
                    "model": "qwen-image-plus",
                    "input": {"prompt": prompt},
                    "parameters": {"size": "1024*1024", "n": 1}
                }
            )
            resp.raise_for_status()
            data = resp.json()
            task_id = data.get("output", {}).get("task_id", "")
            if not task_id:
                return {"prompt": prompt, "url": "", "error": f"No task_id returned: {data}"}

        # Poll for result
        async with httpx.AsyncClient(timeout=10) as client:
            for _ in range(30):  # max 30 polls = ~60s
                await _asyncio.sleep(2)
                poll = await client.get(
                    f"https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id}",
                    headers={"Authorization": f"Bearer {api_key}"}
                )
                poll.raise_for_status()
                pdata = poll.json()
                status = pdata.get("output", {}).get("task_status", "")
                if status == "SUCCEEDED":
                    url = pdata["output"]["results"][0]["url"]
                    return {"prompt": prompt, "url": url, "error": ""}
                elif status in ("FAILED", "CANCELED"):
                    return {"prompt": prompt, "url": "", "error": f"Image task {status}"}
        return {"prompt": prompt, "url": "", "error": "Image generation timed out."}
    except Exception as exc:
        return {"prompt": prompt, "url": "", "error": f"Image generation failed: {type(exc).__name__}: {exc}"}


async def video_understand(video_url: str, question: str = "") -> dict:
    """Understand/analyze a video using Qwen VL model."""
    api_key = os.getenv("QWEN_API_KEY", "")
    if not api_key:
        return {"video_url": video_url, "result": "", "error": "QWEN_API_KEY not set."}
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
        )
        messages = [{
            "role": "user",
            "content": [
                {"type": "video_url", "video_url": {"url": video_url}},
                {"type": "text", "text": question or "Describe this video in detail."}
            ]
        }]
        response = await client.chat.completions.create(
            model="qwen3-vl-235b-a22b-instruct",
            messages=messages,
            max_tokens=1000
        )
        result = response.choices[0].message.content
        return {"video_url": video_url, "result": result, "error": ""}
    except Exception as exc:
        return {"video_url": video_url, "result": "", "error": "Video analysis failed."}


async def read_pdf(file_path: str, max_pages: int = 20) -> dict:
    """Extract text from a PDF file."""
    try:
        import fitz
        doc = fitz.open(file_path)
        pages = min(len(doc), max_pages)
        text = ""
        for i in range(pages):
            text += doc[i].get_text()
        doc.close()
        return {"file": file_path, "pages": pages, "content": text[:8000], "error": ""}
    except Exception as exc:
        return {"file": file_path, "pages": 0, "content": "", "error": "Failed to read PDF."}


async def read_docx(file_path: str) -> dict:
    """Extract text from a Word document."""
    try:
        import docx
        doc = docx.Document(file_path)
        text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        return {"file": file_path, "content": text[:8000], "error": ""}
    except Exception as exc:
        return {"file": file_path, "content": "", "error": "Failed to read document."}


async def read_spreadsheet(file_path: str, max_rows: int = 100) -> dict:
    """Read Excel or CSV file and return as structured data."""
    try:
        import pandas as pd
        if file_path.endswith(".csv"):
            df = pd.read_csv(file_path, nrows=max_rows)
        else:
            df = pd.read_excel(file_path, nrows=max_rows)
        summary = f"Rows: {len(df)}, Columns: {list(df.columns)}\n"
        summary += df.head(20).to_string()
        return {"file": file_path, "content": summary[:8000], "error": ""}
    except Exception as exc:
        return {"file": file_path, "content": "", "error": "Failed to read spreadsheet."}


async def analyze_image_url(image_url: str, question: str = "") -> dict:
    """Analyze an image from URL using Qwen VL."""
    api_key = os.getenv("QWEN_API_KEY", "")
    if not api_key:
        return {"image_url": image_url, "result": "", "error": "QWEN_API_KEY not set."}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "qwen3-vl-plus",
                    "messages": [{
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": image_url}},
                            {"type": "text", "text": question or "Describe this image in detail."}
                        ]
                    }],
                    "max_tokens": 1000
                }
            )
            response.raise_for_status()
            data = response.json()
            result = data["choices"][0]["message"]["content"]
            return {"image_url": image_url, "result": result, "error": ""}
    except Exception as exc:
        return {"image_url": image_url, "result": "", "error": "Image analysis failed."}


async def text_to_speech(text: str, voice: str = "default") -> dict:
    """Convert text to speech using Qwen TTS."""
    api_key = os.getenv("QWEN_API_KEY", "")
    if not api_key:
        return {"text": text, "audio_url": "", "error": "QWEN_API_KEY not set."}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/audio/speech",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "qwen3-tts-instruct-flash",
                    "input": text[:4000],
                    "voice": voice
                }
            )
            response.raise_for_status()
            import base64, tempfile, os as _os
            audio_data = response.content
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
            tmp.write(audio_data)
            tmp.close()
            return {"text": text, "audio_path": tmp.name, "error": ""}
    except Exception as exc:
        return {"text": text, "audio_path": "", "error": "TTS failed."}

async def translate_text(text: str, target_language: str, source_language: str = "auto") -> dict:
    """Translate text using Qwen flagship model via standard chat-completions."""
    from config import get_api_key_for_model, settings
    model = "qwen3.7-max"
    api_key = get_api_key_for_model(model)
    if not api_key:
        return {"text": text, "translated": "", "error": "No API key available for translation."}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{settings.qwen_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a precise translator. Respond with ONLY the translated text, no explanation, no quotes, no extra commentary."},
                        {"role": "user", "content": f"Translate the following text to {target_language}:\n\n{text}"}
                    ],
                    "temperature": 0.1,
                    "max_tokens": 500,
                }
            )
            response.raise_for_status()
            data = response.json()
            translated = data["choices"][0]["message"]["content"].strip()
            return {"text": text, "translated": translated, "target_language": target_language, "error": ""}
    except Exception as exc:
        return {"text": text, "translated": "", "error": "Translation failed."}


_COUNTRY_TZ_MAP = {
    "nigeria": "Africa/Lagos",
    "ghana": "Africa/Accra",
    "kenya": "Africa/Nairobi",
    "south africa": "Africa/Johannesburg",
    "egypt": "Africa/Cairo",
    "united states": "America/New_York",
    "usa": "America/New_York",
    "us": "America/New_York",
    "uk": "Europe/London",
    "united kingdom": "Europe/London",
    "japan": "Asia/Tokyo",
    "china": "Asia/Shanghai",
    "india": "Asia/Kolkata",
    "germany": "Europe/Berlin",
    "france": "Europe/Paris",
    "brazil": "America/Sao_Paulo",
    "canada": "America/Toronto",
    "australia": "Australia/Sydney",
    "uae": "Asia/Dubai",
    "united arab emirates": "Asia/Dubai",
    "singapore": "Asia/Singapore",
    "south korea": "Asia/Seoul",
    "russia": "Europe/Moscow",
    "mexico": "America/Mexico_City",
    "spain": "Europe/Madrid",
    "italy": "Europe/Rome",
    "netherlands": "Europe/Amsterdam",
    "turkey": "Europe/Istanbul",
    "indonesia": "Asia/Jakarta",
    "pakistan": "Asia/Karachi",
    "bangladesh": "Asia/Dhaka",
    "philippines": "Asia/Manila",
    "vietnam": "Asia/Ho_Chi_Minh",
    "thailand": "Asia/Bangkok",
    "argentina": "America/Argentina/Buenos_Aires",
    "colombia": "America/Bogota",
    "chile": "America/Santiago",
    "new zealand": "Pacific/Auckland",
    "ireland": "Europe/Dublin",
    "portugal": "Europe/Lisbon",
    "poland": "Europe/Warsaw",
    "sweden": "Europe/Stockholm",
    "norway": "Europe/Oslo",
    "switzerland": "Europe/Zurich",
    "saudi arabia": "Asia/Riyadh",
    "israel": "Asia/Jerusalem",
    "morocco": "Africa/Casablanca",
    "ethiopia": "Africa/Addis_Ababa",
    "tanzania": "Africa/Dar_es_Salaam",
    "uganda": "Africa/Kampala",
}


async def get_current_time(location: str) -> dict:
    """
    Returns the exact current date/time for a given country or city name,
    using Python's zoneinfo (IANA tz database) -- never manual offset math.
    Tries: (1) direct IANA zone name if the input already looks like one,
    (2) the country/city lookup map, (3) fuzzy substring match against the map.
    """
    from datetime import datetime
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

    if not location or not location.strip():
        return {"error": "No location provided.", "location": location}

    raw = location.strip()
    key = raw.lower()

    tz_name = None

    # Case 1: already a valid IANA zone name (e.g. "Africa/Lagos")
    try:
        ZoneInfo(raw)
        tz_name = raw
    except (ZoneInfoNotFoundError, ValueError):
        pass

    # Case 2: exact match in the country/city map
    if not tz_name and key in _COUNTRY_TZ_MAP:
        tz_name = _COUNTRY_TZ_MAP[key]

    # Case 3: fuzzy substring match (e.g. "USA" variants, "Lagos, Nigeria")
    if not tz_name:
        for name, tz in _COUNTRY_TZ_MAP.items():
            if name in key or key in name:
                tz_name = tz
                break

    if not tz_name:
        return {"error": f"Could not resolve a timezone for '{location}'.", "location": location}

    now = datetime.now(ZoneInfo(tz_name))
    return {
        "error": "",
        "location": location,
        "timezone": tz_name,
        "iso": now.isoformat(),
        "formatted": now.strftime("%A, %B %d, %Y — %I:%M %p (%Z, UTC%z)"),
    }


async def get_weather(location: str) -> dict:
    """
    Current weather via WeatherAPI.com. Returns real, live data -- never
    approximated or guessed. Never raises -- check the error field.
    """
    if not location or not location.strip():
        return {"error": "No location provided.", "location": location}

    api_key = os.getenv("WEATHER_API_KEY", "")
    if not api_key:
        return {"error": "WEATHER_API_KEY not set.", "location": location}

    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.weatherapi.com/v1/current.json",
                params={"key": api_key, "q": location, "aqi": "no"},
            )
        data = resp.json()
    except Exception as exc:
        return {"error": f"Weather request failed: {exc}", "location": location}

    if "error" in data:
        return {"error": data["error"].get("message", "Unknown WeatherAPI error."), "location": location}

    loc = data.get("location", {})
    cur = data.get("current", {})
    return {
        "error": "",
        "location": f"{loc.get('name', location)}, {loc.get('country', '')}".strip(", "),
        "local_time": loc.get("localtime", ""),
        "condition": cur.get("condition", {}).get("text", ""),
        "temp_c": cur.get("temp_c"),
        "temp_f": cur.get("temp_f"),
        "feels_like_c": cur.get("feelslike_c"),
        "feels_like_f": cur.get("feelslike_f"),
        "humidity": cur.get("humidity"),
        "wind_kph": cur.get("wind_kph"),
    }


async def get_news(query: str, max_results: int = 5) -> dict:
    """
    Current news via NewsAPI.org. Returns real, recent articles -- never
    fabricated. Never raises -- check the error field.
    """
    if not query or not query.strip():
        return {"query": query, "articles": [], "error": "No query provided."}

    api_key = os.getenv("NEWS_API_KEY", "")
    if not api_key:
        return {"query": query, "articles": [], "error": "NEWS_API_KEY not set."}

    try:
        import httpx
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": query,
                    "apiKey": api_key,
                    "sortBy": "publishedAt",
                    "pageSize": max_results,
                    "language": "en",
                },
            )
        data = resp.json()
    except Exception as exc:
        return {"query": query, "articles": [], "error": f"News request failed: {exc}"}

    if data.get("status") != "ok":
        return {"query": query, "articles": [], "error": data.get("message", "Unknown NewsAPI error.")}

    articles = []
    for a in data.get("articles", [])[:max_results]:
        articles.append({
            "title": a.get("title", ""),
            "description": (a.get("description") or "")[:300],
            "source": a.get("source", {}).get("name", ""),
            "url": a.get("url", ""),
            "published_at": a.get("publishedAt", ""),
        })

    if not articles:
        return {"query": query, "articles": [], "error": "No articles found."}

    return {"query": query, "articles": articles, "error": ""}


async def scrape_page(url: str) -> dict:
    """
    Fetches the full rendered content of a webpage via ScraperAPI (primary),
    falling back to Scrape.do if ScraperAPI fails or is unavailable. Use this
    when a search snippet isn't enough and the full article/page text is needed.
    Never raises -- check the error field.
    """
    if not url or not url.strip():
        return {"url": url, "content": "", "error": "No URL provided."}

    result = await _scrape_via_scraperapi(url)
    if result["content"]:
        return result

    fallback = await _scrape_via_scrapedo(url)
    if fallback["content"]:
        return fallback

    return {"url": url, "content": "", "error": f"Both scraper providers failed. ScraperAPI: {result['error']}; Scrape.do: {fallback['error']}"}


async def _scrape_via_scraperapi(url: str) -> dict:
    api_key = os.getenv("SCRAPER_API_KEY", "")
    if not api_key:
        return {"url": url, "content": "", "error": "SCRAPER_API_KEY not set."}
    try:
        import httpx
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                "https://api.scraperapi.com",
                params={"api_key": api_key, "url": url},
            )
        if resp.status_code != 200:
            return {"url": url, "content": "", "error": f"ScraperAPI returned status {resp.status_code}."}
        return {"url": url, "content": _extract_clean_text(resp.text), "error": ""}
    except Exception as exc:
        return {"url": url, "content": "", "error": f"ScraperAPI request failed: {exc}"}


async def _scrape_via_scrapedo(url: str) -> dict:
    api_key = os.getenv("SCRAPEDO_API_KEY", "")
    if not api_key:
        return {"url": url, "content": "", "error": "SCRAPEDO_API_KEY not set."}
    try:
        import httpx
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                "https://api.scrape.do",
                params={"token": api_key, "url": url},
            )
        if resp.status_code != 200:
            return {"url": url, "content": "", "error": f"Scrape.do returned status {resp.status_code}."}
        return {"url": url, "content": _extract_clean_text(resp.text), "error": ""}
    except Exception as exc:
        return {"url": url, "content": "", "error": f"Scrape.do request failed: {exc}"}


def _extract_clean_text(html: str) -> str:
    """
    Strips scripts, styles, and markup to return readable body text only.
    Ad-tech config, tracking JS, and boilerplate never reach synthesis.
    """
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "noscript", "svg", "iframe"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        text = " ".join(text.split())
        return text[:8000]
    except Exception:
        return ""


async def gmail_send(user_id: str, to: str, subject: str, body: str) -> dict:
    """Send an email via the user's own Gmail account (requires prior Google OAuth)."""
    from google_client import get_valid_access_token
    import base64
    from email.mime.text import MIMEText

    access_token = await get_valid_access_token(user_id)
    if not access_token:
        return {"to": to, "subject": subject, "sent": False, "error": "Google account not connected or access expired. Please reconnect Google."}

    try:
        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={"Authorization": f"Bearer {access_token}"},
                json={"raw": raw},
            )
            resp.raise_for_status()
            return {"to": to, "subject": subject, "body": body, "sent": True, "error": ""}
    except httpx.HTTPStatusError as exc:
        body = exc.response.text if exc.response is not None else ""
        if "recipient" in body.lower() or "invalid" in body.lower():
            error_msg = "That email address doesn't look valid -- mind double-checking it?"
        else:
            error_msg = "Failed to send email."
        import logging
        logging.getLogger(__name__).error("gmail_send real error: %r | body: %s", exc, body)
        return {"to": to, "subject": subject, "sent": False, "error": error_msg}
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error("gmail_send real error: %r", exc)
        return {"to": to, "subject": subject, "sent": False, "error": "Failed to send email."}


async def gmail_read_inbox(user_id: str, max_results: int = 5) -> dict:
    """Read recent messages from the user's Gmail inbox (requires prior Google OAuth)."""
    from google_client import get_valid_access_token

    access_token = await get_valid_access_token(user_id)
    if not access_token:
        return {"messages": [], "error": "Google account not connected or access expired. Please reconnect Google."}

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            list_resp = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"maxResults": max_results, "labelIds": "INBOX"},
            )
            list_resp.raise_for_status()
            msg_ids = [m["id"] for m in list_resp.json().get("messages", [])]

            messages = []
            for mid in msg_ids:
                msg_resp = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{mid}",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"format": "metadata", "metadataHeaders": ["From", "Subject", "Date"]},
                )
                msg_resp.raise_for_status()
                data = msg_resp.json()
                headers = {h["name"]: h["value"] for h in data.get("payload", {}).get("headers", [])}
                messages.append({
                    "from": headers.get("From", ""),
                    "subject": headers.get("Subject", ""),
                    "date": headers.get("Date", ""),
                    "snippet": data.get("snippet", ""),
                })

            return {"messages": messages, "error": ""}
    except Exception as exc:
        return {"messages": [], "error": "Failed to read inbox."}
