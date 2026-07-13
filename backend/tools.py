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
        return {"query": query, "results": [], "error": "Tavily returned no results."}

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
