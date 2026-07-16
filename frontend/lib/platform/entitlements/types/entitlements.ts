export enum Feature {

  // =====================
  // AI
  // =====================

  REASONING="reasoning",
  DEEP_RESEARCH="deep_research",
  MULTI_AGENT="multi_agent",
  LONG_MEMORY="long_memory",
  AUTONOMOUS_MODE="autonomous_mode",

  // =====================
  // Models
  // =====================

  GPT="gpt",
  CLAUDE="claude",
  GEMINI="gemini",
  GROK="grok",
  QWEN="qwen",
  DEEPSEEK="deepseek",
  OPEN_SOURCE="open_source",

  // =====================
  // Search
  // =====================

  WEB_SEARCH="web_search",
  NEWS_SEARCH="news_search",
  YOUTUBE_SEARCH="youtube_search",
  WEATHER_SEARCH="weather_search",
  MAPS_SEARCH="maps_search",
  LIVE_SEARCH="live_search",

  // =====================
  // Voice
  // =====================

  VOICE_CHAT="voice_chat",
  LIVE_VOICE="live_voice",
  VOICE_CLONE="voice_clone",
  SPEECH_TO_TEXT="speech_to_text",
  TEXT_TO_SPEECH="text_to_speech",

  // =====================
  // Vision
  // =====================

  IMAGE_UNDERSTANDING="image_understanding",
  OCR="ocr",
  PDF_UNDERSTANDING="pdf_understanding",

  // =====================
  // Generation
  // =====================

  IMAGE_GENERATION="image_generation",
  IMAGE_EDITING="image_editing",
  VIDEO_GENERATION="video_generation",
  VIDEO_EDITING="video_editing",
  MUSIC_GENERATION="music_generation",

  // =====================
  // Google
  // =====================

  GMAIL="gmail",
  DRIVE="drive",
  DOCS="docs",
  SHEETS="sheets",
  SLIDES="slides",
  CALENDAR="calendar",

  // =====================
  // Developer
  // =====================

  GITHUB="github",
  CODE_EXECUTION="code_execution",
  TERMINAL="terminal",
  SANDBOX="sandbox",
  API_BUILDER="api_builder",

  // =====================
  // Automation
  // =====================

  WORKFLOWS="workflows",
  BROWSER_AUTOMATION="browser_automation",
  MCP="mcp",

  // =====================
  // Enterprise
  // =====================

  API_ACCESS="api_access",
  TEAMS="teams",
  AUDIT_LOGS="audit_logs",
  SSO="sso",
  WHITE_LABEL="white_label"

}


export interface FeatureDefinition {

  id:Feature

  displayName:string

  description:string

  experimental?:boolean

}
