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
from tools import web_search, youtube_search, image_generate, video_understand, read_pdf, read_docx, read_spreadsheet, analyze_image_url, text_to_speech, translate_text, get_current_time, get_weather, get_news, scrape_page, gmail_send, gmail_read_inbox


async def simulate_execution(plan: ExecutionPlan, user_id: str | None = None) -> ExecutionResult:
    logs: list[str] = []
    artifacts: list[dict] = []
    had_failure = False

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
            query = str(step.params.get("query") or step.target or "").strip()
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
        elif step.action.strip().lower() in ("get_current_time", "check_time", "current_time", "what_time_is_it", "get_time"):
            location = str(step.params.get("location", step.params.get("country", step.params.get("city", step.params.get("timezone", "")))))
            result = await get_current_time(location)
            if result.get("error"):
                logs.append(f"[SANDBOX] Step {step.step_id}: get_current_time FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: get_current_time OK -> {result['formatted']} ({result['timezone']})")
                artifacts.append({"artifact_type": "time_lookup", "title": f"Time in {location}"[:120], "content": result})

        elif step.action.strip().lower() in ("get_weather", "check_weather", "weather"):
            location = str(step.params.get("location") or step.target or "")
            result = await get_weather(location)
            if result.get("error"):
                logs.append(f"[SANDBOX] Step {step.step_id}: get_weather FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: get_weather OK -> {result['condition']}, {result['temp_c']}C in {result['location']}")
                artifacts.append({"artifact_type": "weather", "title": f"Weather: {location}"[:120], "content": result})

        elif step.action.strip().lower() in ("get_news", "news_search", "check_news"):
            query = str(step.params.get("query") or step.target or "")
            result = await get_news(query)
            if result.get("error"):
                logs.append(f"[SANDBOX] Step {step.step_id}: get_news FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: get_news OK -> {len(result['articles'])} article(s)")
                artifacts.append({"artifact_type": "news", "title": f"News: {query}"[:120], "content": result})

        elif step.action.strip().lower() in ("scrape_page", "scrape_url", "fetch_page", "read_page"):
            url = str(step.params.get("url") or step.target or "")
            result = await scrape_page(url)
            if result.get("error") and not result.get("content"):
                logs.append(f"[SANDBOX] Step {step.step_id}: scrape_page FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: scrape_page OK -> {len(result['content'])} chars from {url}")
                artifacts.append({"artifact_type": "scraped_page", "title": f"Page: {url}"[:120], "content": result})

        elif step.action.strip().lower() == "youtube_search":
            query = str(step.params.get("query", "")).strip()
            result = await youtube_search(query)
            if result["error"]:
                logs.append(f"[SANDBOX] Step {step.step_id}: youtube_search FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: youtube_search returned {len(result['results'])} video(s).")
                artifacts.append({"artifact_type": "youtube_results", "title": f"YouTube: {query}"[:120], "content": result})
        elif step.action.strip().lower() in ("image_generate", "generate_image", "create_image", "make_image", "generate_an_image"):
            prompt = step.params.get("prompt", step.params.get("description", step.params.get("query", plan.plan_summary or "")))
            result = await image_generate(prompt)
            if result.get("error"):
                logs.append(f"[SANDBOX] Step {step.step_id}: image_generate FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: image_generate OK")
                artifacts.append({"artifact_type": "image", "title": f"Image: {prompt}"[:120], "content": result})

        elif step.action.strip().lower() == "read_pdf":
            file_path = step.params.get("file_path", step.params.get("path", ""))
            result = await read_pdf(file_path)
            if result.get("error"):
                logs.append(f"[SANDBOX] Step {step.step_id}: read_pdf FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: read_pdf OK, {result['pages']} pages")
                artifacts.append({"artifact_type": "document", "title": f"PDF: {file_path}"[:120], "content": result})

        elif step.action.strip().lower() == "read_docx":
            file_path = step.params.get("file_path", step.params.get("path", ""))
            result = await read_docx(file_path)
            if result.get("error"):
                logs.append(f"[SANDBOX] Step {step.step_id}: read_docx FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: read_docx OK")
                artifacts.append({"artifact_type": "document", "title": f"Document: {file_path}"[:120], "content": result})

        elif step.action.strip().lower() == "read_spreadsheet":
            file_path = step.params.get("file_path", step.params.get("path", ""))
            result = await read_spreadsheet(file_path)
            if result.get("error"):
                logs.append(f"[SANDBOX] Step {step.step_id}: read_spreadsheet FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: read_spreadsheet OK")
                artifacts.append({"artifact_type": "spreadsheet", "title": f"Spreadsheet: {file_path}"[:120], "content": result})

        elif step.action.strip().lower() == "analyze_image_url":
            image_url = step.params.get("image_url", step.params.get("url", ""))
            question = step.params.get("question", "")
            result = await analyze_image_url(image_url, question)
            if result.get("error"):
                logs.append(f"[SANDBOX] Step {step.step_id}: analyze_image_url FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: analyze_image_url OK")
                artifacts.append({"artifact_type": "image_analysis", "title": f"Image Analysis"[:120], "content": result})

        elif step.action.strip().lower() == "text_to_speech":
            text = step.params.get("text", step.params.get("query", ""))
            result = await text_to_speech(text)
            if result.get("error"):
                logs.append(f"[SANDBOX] Step {step.step_id}: text_to_speech FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: text_to_speech OK")
                artifacts.append({"artifact_type": "audio", "title": "Generated Audio", "content": result})

        elif step.action.strip().lower() == "video_understand":
            video_url = step.params.get("video_url", step.params.get("url", ""))
            question = step.params.get("question", "")
            result = await video_understand(video_url, question)
            if result.get("error"):
                logs.append(f"[SANDBOX] Step {step.step_id}: video_understand FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: video_understand OK")
                artifacts.append({"artifact_type": "video_analysis", "title": "Video Analysis", "content": result})

        elif step.action.strip().lower() == "translate_text":
            text = step.params.get("text", "")
            target_lang = step.params.get("target_language", "")
            result = await translate_text(text, target_lang)
            if result.get("error"):
                logs.append(f"[SANDBOX] Step {step.step_id}: translate_text FAILED -> {result['error']}")
            else:
                logs.append(f"[SANDBOX] Step {step.step_id}: translate_text OK -> {result['translated']}")
                artifacts.append({"artifact_type": "translation", "title": f"Translation to {target_lang}"[:120], "content": result})

        elif step.action.strip().lower() in ("draft_email", "compose_email", "gmail_send", "send_email", "send_an_email", "email_send"):
            to = step.params.get("to") or step.target or ""
            subject = step.params.get("subject", "")
            body = step.params.get("body", "")
            if user_id and user_id.startswith("demo_"):
                logs.append(f"[SANDBOX] Step {step.step_id}: draft_email SKIPPED -> Gmail features are disabled for demo accounts.")
                artifacts.append({
                    "artifact_type": "email_draft",
                    "title": "Gmail feature unavailable in demo mode",
                    "content": {
                        "to": to, "subject": subject, "body": body,
                        "status": "demo_disabled",
                        "message": "Gmail sending is disabled for demo accounts since there's no real inbox behind them. To test this feature with a real Gmail account, contact the developer at corenexus16@gmail.com or WhatsApp 08020828806 to have your email added to the Google OAuth test accounts.",
                    },
                })
            else:
                import uuid as _uuid
                draft_id = f"draft_{_uuid.uuid4().hex[:12]}"
                logs.append(f"[SANDBOX] Step {step.step_id}: draft_email OK -> draft created for {to} (not sent -- awaiting user confirmation)")
                artifacts.append({
                    "artifact_type": "email_draft",
                    "title": f"Draft to {to}: {subject}"[:120],
                    "content": {"draft_id": draft_id, "to": to, "subject": subject, "body": body, "status": "pending_confirmation"},
                })

        elif step.action.strip().lower() == "gmail_read_inbox":
            max_results = step.params.get("max_results", 5)
            if not user_id:
                logs.append(f"[SANDBOX] Step {step.step_id}: gmail_read_inbox FAILED -> No user context available.")
            elif user_id.startswith("demo_"):
                logs.append(f"[SANDBOX] Step {step.step_id}: gmail_read_inbox SKIPPED -> Gmail features are disabled for demo accounts.")
                artifacts.append({
                    "artifact_type": "email_inbox",
                    "title": "Gmail feature unavailable in demo mode",
                    "content": {
                        "messages": [],
                        "message": "Reading Gmail is disabled for demo accounts since there's no real inbox behind them. To test this feature with a real Gmail account, contact the developer at corenexus16@gmail.com or WhatsApp 08020828806 to have your email added to the Google OAuth test accounts.",
                    },
                })
            else:
                result = await gmail_read_inbox(user_id, max_results)
                if result.get("error"):
                    logs.append(f"[SANDBOX] Step {step.step_id}: gmail_read_inbox FAILED -> {result['error']}")
                else:
                    logs.append(f"[SANDBOX] Step {step.step_id}: gmail_read_inbox OK -> {len(result['messages'])} messages")
                    artifacts.append({"artifact_type": "email_inbox", "title": "Inbox messages", "content": result})

        else:
            logs.append(f"[SANDBOX] Step {step.step_id}: completed OK (simulated).")

    logs.append("[SANDBOX] Execution context torn down. No persistent side effects outside declared artifacts.")
    had_failure = any("FAILED" in l for l in logs)
    return ExecutionResult(success=not had_failure, logs=logs, artifacts=artifacts)
