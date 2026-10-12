const AiServiceError = require("../utils/aiError");

/**
 * AI Service
 * ----------
 * Supports two providers, chosen via AI_PROVIDER (server-side env only):
 *  - "gemini" -> Google Gemini   (key: GEMINI_API_KEY, model: GEMINI_MODEL)
 *  - "groq"   -> Groq            (key: GROQ_API_KEY,   model: GROQ_MODEL)
 * If AI_PROVIDER is not set, the provider is auto-detected from whichever key exists.
 *
 * Design rules
 *  - API keys only ever come from process.env on the server. They are sent in
 *    request HEADERS (never in URLs) and are scrubbed from every log line.
 *  - Quiz generation NEVER falls back to fake/sample questions. If the AI
 *    cannot produce valid questions it throws an AiServiceError whose message
 *    is safe to show to end users.
 *  - Other features (study plan, resources, outline, doubts) keep their
 *    original graceful fallbacks.
 *
 * Uses the global `fetch` (Node >= 18, see "engines" in package.json), so no
 * extra HTTP dependency is needed and errors never embed the request URL.
 */

// Model IDs change often and providers retire them (e.g. Groq shut down
// llama-3.1-8b-instant on 2026-08-16). Defaults below can be overridden with
// GEMINI_MODEL / GROQ_MODEL without a code change.
const PROVIDERS = {
  gemini: {
    keyVar: "GEMINI_API_KEY",
    modelVar: "GEMINI_MODEL",
    baseUrlVar: "GEMINI_BASE_URL", // optional override (used by tests)
    defaultModel: "gemini-3.6-flash",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
  },
  groq: {
    keyVar: "GROQ_API_KEY",
    modelVar: "GROQ_MODEL",
    baseUrlVar: "GROQ_BASE_URL", // optional override (used by tests)
    defaultModel: "openai/gpt-oss-20b",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
  },
};

const DEFAULT_TIMEOUT_MS = 25000;
const MAX_ATTEMPTS = 2; // one automatic retry for transient failures
const MAX_OUTPUT_TOKENS = 8192;

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

/** Read an env var, trimming whitespace and accidental surrounding quotes. */
const readEnv = (name) => {
  let value = process.env[name];
  if (typeof value !== "string") return "";
  value = value.trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
};

// Values people forget to replace when copying .env.example
const looksLikePlaceholder = (value) => /^(your[_\-\s]|<.*>$|changeme|replace[_\-]?me|xxx+$)/i.test(value);

/**
 * Describe the active AI configuration WITHOUT exposing any secret.
 * Never includes the key itself, only whether it is present.
 */
function getProviderConfig() {
  const requested = readEnv("AI_PROVIDER").toLowerCase();

  if (requested && !PROVIDERS[requested]) {
    return {
      configured: false,
      provider: requested,
      reason: `AI_PROVIDER must be "gemini" or "groq" (got "${requested.slice(0, 30)}")`,
      missingEnvVar: "AI_PROVIDER",
    };
  }

  let name = requested;
  if (!name) {
    // Auto-detect so a deployment with only one key "just works"
    if (readEnv("GEMINI_API_KEY")) name = "gemini";
    else if (readEnv("GROQ_API_KEY")) name = "groq";
    else name = "gemini";
  }

  const def = PROVIDERS[name];
  const apiKey = readEnv(def.keyVar);

  if (!apiKey || looksLikePlaceholder(apiKey)) {
    return {
      configured: false,
      provider: name,
      model: readEnv(def.modelVar) || def.defaultModel,
      reason: `${def.keyVar} is not set (or still has its placeholder value)`,
      missingEnvVar: def.keyVar,
    };
  }

  return {
    configured: true,
    provider: name,
    model: readEnv(def.modelVar) || def.defaultModel,
    baseUrl: (readEnv(def.baseUrlVar) || def.defaultBaseUrl).replace(/\/+$/, ""),
    keyVar: def.keyVar,
    timeoutMs: Math.max(1000, Number(readEnv("AI_TIMEOUT_MS")) || DEFAULT_TIMEOUT_MS),
    apiKey, // internal only - never returned to callers outside this module
  };
}

const isAIConfigured = () => getProviderConfig().configured;

/** Public, secret-free status (used by GET /api/v1/ai/status). */
function getAIStatus() {
  const cfg = getProviderConfig();
  return {
    configured: cfg.configured,
    provider: cfg.provider,
    model: cfg.model,
    ...(cfg.configured ? {} : { missingEnvVar: cfg.missingEnvVar }),
  };
}

// ---------------------------------------------------------------------------
// Safe logging
// ---------------------------------------------------------------------------

/** Remove anything that could be a secret from text before it is logged. */
function scrub(text, apiKey) {
  let out = String(text ?? "");
  if (apiKey) out = out.split(apiKey).join("[REDACTED]");
  return out
    .replace(/AIza[0-9A-Za-z_\-]{20,}/g, "[REDACTED]")
    .replace(/gsk_[0-9A-Za-z]{20,}/g, "[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .replace(/([?&]key=)[^&\s"']+/gi, "$1[REDACTED]")
    .replace(/\s+/g, " ")
    .slice(0, 300);
}

function logFailure(cfg, code, detail) {
  console.error(`[ai] ${cfg.provider}/${cfg.model} failed: ${code}${detail ? ` - ${scrub(detail, cfg.apiKey)}` : ""}`);
}

// ---------------------------------------------------------------------------
// Error construction (messages are safe for end users)
// ---------------------------------------------------------------------------

const errors = {
  notConfigured: () =>
    new AiServiceError(
      503,
      "AI_NOT_CONFIGURED",
      "AI generation is not available right now because the AI service is not set up on the server. Please contact the site administrator."
    ),
  keyInvalid: () =>
    new AiServiceError(
      503,
      "AI_KEY_INVALID",
      "AI quiz generation is temporarily unavailable because the server's AI credentials were rejected. Please contact the site administrator."
    ),
  modelUnavailable: () =>
    new AiServiceError(
      503,
      "AI_MODEL_UNAVAILABLE",
      "AI quiz generation is temporarily unavailable because the configured AI model is not available. Please contact the site administrator."
    ),
  rateLimited: () =>
    new AiServiceError(
      429,
      "AI_RATE_LIMITED",
      "The AI service is busy or its usage limit was reached. Please wait a minute and try again."
    ),
  timeout: () =>
    new AiServiceError(504, "AI_TIMEOUT", "The AI service took too long to respond. Please try again."),
  unavailable: (retryable = true) =>
    new AiServiceError(502, "AI_UNAVAILABLE", "The AI service is temporarily unavailable. Please try again in a moment.", {
      retryable,
    }),
  badResponse: () =>
    new AiServiceError(
      502,
      "AI_BAD_RESPONSE",
      "The AI service returned an unusable response. Please try again.",
      { retryable: true }
    ),
  blocked: () =>
    new AiServiceError(
      422,
      "AI_CONTENT_BLOCKED",
      "The AI service could not generate questions for this request. Try rewording the subject or topic."
    ),
};

/** Map a non-2xx provider response to a safe AiServiceError. Also logs the (scrubbed) reason. */
function mapHttpError(cfg, status, data) {
  const providerMessage = data?.error?.message || data?.error?.status || data?.message || "";
  const providerCode = String(data?.error?.code ?? "");
  const blob = `${providerMessage} ${providerCode} ${JSON.stringify(data?.error?.details ?? "")}`;

  let err;
  if (/API_KEY_INVALID|api key not valid|invalid api key|incorrect api key|invalid_api_key/i.test(blob) || status === 401) {
    err = errors.keyInvalid();
  } else if (status === 403) {
    err = errors.keyInvalid(); // key valid but not permitted (API not enabled, region, billing)
  } else if (status === 429) {
    err = errors.rateLimited();
  } else if (
    status === 404 ||
    /model_decommissioned|model_not_found|decommissioned|no longer supported|is not found for api version|model .* not (found|exist)/i.test(blob)
  ) {
    err = errors.modelUnavailable();
  } else if (status >= 500) {
    err = errors.unavailable(true);
  } else {
    err = errors.unavailable(false); // other 4xx: our request was rejected, retrying will not help
  }

  logFailure(cfg, err.errorCode, `http ${status}${providerMessage ? `: ${providerMessage}` : ""}`);
  return err;
}

// ---------------------------------------------------------------------------
// HTTP + provider calls
// ---------------------------------------------------------------------------

/** POST JSON with a hard timeout. Never throws on HTTP status; only on network/timeout. */
async function postJson(cfg, url, headers, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text(); // inside try so the timeout also covers the body
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (_) {
      /* non-JSON body (e.g. HTML error page) - leave data null */
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (err?.name === "AbortError") {
      logFailure(cfg, "AI_TIMEOUT", `no response within ${cfg.timeoutMs}ms`);
      throw errors.timeout();
    }
    // Network-level failure (DNS, connection refused, TLS...). Log only the safe cause code.
    logFailure(cfg, "AI_UNAVAILABLE", `network error ${err?.cause?.code || err?.code || err?.name || ""}`);
    throw errors.unavailable(true);
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(cfg, prompt) {
  // Key goes in a header, NOT the URL, so it can never leak via URLs in logs/errors.
  const url = `${cfg.baseUrl}/models/${encodeURIComponent(cfg.model)}:generateContent`;
  const { ok, status, data } = await postJson(cfg, url, { "x-goog-api-key": cfg.apiKey }, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });
  if (!ok) throw mapHttpError(cfg, status, data);

  if (data?.promptFeedback?.blockReason) {
    logFailure(cfg, "AI_CONTENT_BLOCKED", `promptFeedback ${data.promptFeedback.blockReason}`);
    throw errors.blocked();
  }

  const candidate = data?.candidates?.[0];
  const finish = candidate?.finishReason;
  if (/SAFETY|PROHIBITED|BLOCKLIST|RECITATION|SPII/i.test(finish || "")) {
    logFailure(cfg, "AI_CONTENT_BLOCKED", `finishReason ${finish}`);
    throw errors.blocked();
  }
  if (finish === "MAX_TOKENS") {
    logFailure(cfg, "AI_BAD_RESPONSE", "output truncated (MAX_TOKENS)");
    throw errors.badResponse();
  }

  // Skip "thought" parts that thinking models may return
  const text = (candidate?.content?.parts || [])
    .filter((p) => typeof p?.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("");
  if (!text.trim()) {
    logFailure(cfg, "AI_BAD_RESPONSE", "empty response");
    throw errors.badResponse();
  }
  return text;
}

async function callGroq(cfg, prompt) {
  const url = `${cfg.baseUrl}/chat/completions`;
  const headers = { Authorization: `Bearer ${cfg.apiKey}` };
  const baseBody = {
    model: cfg.model,
    messages: [
      { role: "system", content: "You always respond with valid JSON only, no markdown fences, no commentary." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_completion_tokens: MAX_OUTPUT_TOKENS,
  };

  let result = await postJson(cfg, url, headers, { ...baseBody, response_format: { type: "json_object" } });

  // Some models reject JSON mode; retry once without it (our parser handles plain text JSON).
  if (!result.ok && result.status === 400 && /response_format|json_object|json mode/i.test(result.data?.error?.message || "")) {
    result = await postJson(cfg, url, headers, baseBody);
  }
  if (!result.ok) throw mapHttpError(cfg, result.status, result.data);

  const choice = result.data?.choices?.[0];
  if (choice?.finish_reason === "content_filter") {
    logFailure(cfg, "AI_CONTENT_BLOCKED", "finish_reason content_filter");
    throw errors.blocked();
  }
  if (choice?.finish_reason === "length") {
    logFailure(cfg, "AI_BAD_RESPONSE", "output truncated (length)");
    throw errors.badResponse();
  }
  const text = choice?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    logFailure(cfg, "AI_BAD_RESPONSE", "empty response");
    throw errors.badResponse();
  }
  return text;
}

/** Call whichever provider is configured and return the raw text the model produced. */
const callProvider = (cfg, prompt) => (cfg.provider === "groq" ? callGroq(cfg, prompt) : callGemini(cfg, prompt));

/** Returns a ready-to-use config or throws AI_NOT_CONFIGURED (with the exact missing env var logged server-side). */
function requireProvider() {
  const cfg = getProviderConfig();
  if (!cfg.configured) {
    console.error(`[ai] not configured: ${cfg.reason}. Set it in the server environment (e.g. Render dashboard).`);
    throw errors.notConfigured();
  }
  return cfg;
}

// ---------------------------------------------------------------------------
// Parsing + validation of model output
// ---------------------------------------------------------------------------

/** Parse model output that may be wrapped in markdown fences or surrounded by prose. */
function parseModelJson(raw) {
  if (typeof raw !== "string" || !raw.trim()) throw errors.badResponse();

  let text = raw.replace(/^\uFEFF/, "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  try {
    return JSON.parse(text);
  } catch (_) {
    /* fall through to extraction */
  }

  for (const [open, close] of [["{", "}"], ["[", "]"]]) {
    const start = text.indexOf(open);
    const end = text.lastIndexOf(close);
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (_) {
        /* try next shape */
      }
    }
  }
  throw errors.badResponse();
}

// Text that must never appear as quiz content (old fallback / config messages)
const PLACEHOLDER_RE = /\[sample\]|GEMINI_API_KEY|GROQ_API_KEY|AI provider key in \.env|for real AI-generated questions|placeholder ai answer/i;

const asText = (v) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

/** Turn one raw model question into our schema, or null if it is not valid. */
function normalizeQuestion(q) {
  if (!q || typeof q !== "object") return null;

  const questionText = asText(q.questionText ?? q.question ?? q.text);
  if (questionText.length < 8) return null;

  let rawOptions = q.options ?? q.choices;
  if (rawOptions && !Array.isArray(rawOptions) && typeof rawOptions === "object") rawOptions = Object.values(rawOptions);
  if (!Array.isArray(rawOptions) || rawOptions.length !== 4) return null;

  let options = rawOptions.map((o) => asText(o && typeof o === "object" ? o.text ?? o.option ?? o.value : o));
  if (options.some((o) => !o)) return null;

  // Strip "A) ", "B. " ... labels, but only when all four are labelled A-D in order
  const labelRe = /^\(?([A-Da-d])[\)\.\:]\s+/;
  if (options.every((o, i) => labelRe.test(o) && o.match(labelRe)[1].toUpperCase() === "ABCD"[i])) {
    options = options.map((o) => o.replace(labelRe, "").trim());
    if (options.some((o) => !o)) return null;
  }

  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return null; // options must be distinct

  // Correct answer: 0-based index (preferred), numeric string, letter, or the option text itself
  let idx = q.correctOptionIndex ?? q.correctIndex ?? q.correct_option_index;
  if (typeof idx === "string" && /^\d+$/.test(idx.trim())) idx = Number(idx.trim());
  if (!Number.isInteger(idx)) {
    const answer = asText(q.correctAnswer ?? q.answer);
    const letter = answer.match(/^\(?([A-Da-d])\)?[\.\):]?$/);
    if (letter) idx = "ABCD".indexOf(letter[1].toUpperCase());
    else if (answer) idx = options.findIndex((o) => o.toLowerCase() === answer.toLowerCase());
  }
  if (!Number.isInteger(idx) || idx < 0 || idx > 3) return null;

  const explanation = asText(q.explanation);

  if ([questionText, explanation, ...options].some((t) => PLACEHOLDER_RE.test(t))) return null;
  if (options.every((o) => /^option\s*[a-d1-4]$/i.test(o))) return null;

  return { questionText, options, correctOptionIndex: idx, explanation };
}

/**
 * Validate parsed model output and return clean questions.
 * Accepts `{questions: [...]}` or a bare array. Invalid/duplicate questions are
 * dropped; if fewer than half of the requested number survive, it throws.
 */
function validateQuestions(parsed, count) {
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.questions) ? parsed.questions : null;
  if (!list) throw errors.badResponse();

  const seen = new Set();
  const valid = [];
  for (const item of list) {
    const q = normalizeQuestion(item);
    if (!q) continue;
    const key = q.questionText.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(q);
  }

  const minimum = Math.max(1, Math.ceil(count / 2));
  if (valid.length < minimum) throw errors.badResponse();
  return valid.slice(0, count);
}

// Keep user-supplied text from breaking the prompt structure
const cleanPromptField = (value, max) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/["`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/**
 * Legacy helper for the NON-quiz features: returns parsed JSON, or null when no
 * provider is configured (callers then use their own fallback). Throws safe
 * AiServiceErrors on provider failure (callers catch and fall back).
 */
async function generateJSON(prompt) {
  const cfg = getProviderConfig();
  if (!cfg.configured) return null;
  return parseModelJson(await callProvider(cfg, prompt));
}

// ---------- Feature: Syllabus / Study Plan Generation ----------
async function generateStudyPlan({ examTarget, stream, subjects, durationWeeks, hoursPerDay }) {
  const prompt = `Create a personalized ${durationWeeks}-week study plan for a student preparing for "${examTarget}" (stream: ${stream}), studying ${hoursPerDay} hours/day, covering subjects: ${subjects.join(", ")}.
Return ONLY valid JSON in this exact shape:
{
  "syllabus": [{ "subject": "string", "topics": ["string"] }],
  "weeklyPlan": [{ "week": 1, "focus": "string", "tasks": ["string"] }]
}`;

  const result = await generateJSON(prompt);
  if (!result || !Array.isArray(result.syllabus) || !Array.isArray(result.weeklyPlan) || !result.weeklyPlan.length) {
    throw errors.notConfigured();
  }
  return result;
}

async function generateSyllabus({ examTarget, stream, subjects }) {
  const cfg = requireProvider();
  const prompt = `Create a suggested, not officially verified, syllabus outline for exam "${cleanPromptField(examTarget, 120)}", stream "${cleanPromptField(stream, 100)}", for these subjects: ${subjects.map((s) => cleanPromptField(s, 80)).join(", ")}. Do not claim official verification. Return JSON only with shape {"subjects":[{"subject":"name","units":[{"title":"unit/chapter","topics":["topic"],"subtopics":["optional subtopic"]}]}]}. Include exam-relevant topics; if unsure, clearly limit the outline rather than assert invented official facts.`;
  const result = parseModelJson(await callProvider(cfg, prompt));
  if (!Array.isArray(result?.subjects) || !result.subjects.length) throw errors.badResponse();
  return result;
}

// ---------- Feature: Practice Question Generation ----------
/**
 * Generate real, validated MCQs. Resolves with an array shaped like the Quiz
 * model's question schema: { questionText, options[4], correctOptionIndex, explanation }.
 * Rejects with an AiServiceError (safe message + errorCode) on ANY failure.
 * It never returns sample / placeholder questions.
 */
async function generateQuizQuestions({ subject, topic, difficulty = "medium", count = 5 }) {
  const cfg = requireProvider();

  const safeSubject = cleanPromptField(subject, 100);
  const safeTopic = cleanPromptField(topic, 150);
  const level = { easy: "easy (recall and basic understanding)", medium: "medium (application of concepts)", hard: "hard (multi-step reasoning, tricky distractors)" }[difficulty] || "medium";

  const prompt = `You are an experienced exam-prep teacher. Write ${count} multiple-choice questions.

Subject: '${safeSubject}'
${safeTopic ? `Topic: '${safeTopic}'\n` : ""}Difficulty: ${level}

Rules:
- Every question must be factually correct, self-contained, and specifically about the subject${safeTopic ? " and topic" : ""} above.
- Each question has exactly 4 answer options. Exactly one is correct; the other three are plausible but wrong.
- Do NOT prefix options with letters or numbers (no "A)", "1.").
- Vary which position holds the correct answer.
- "correctOptionIndex" is the 0-based index (0, 1, 2 or 3) of the correct option.
- "explanation" is 1-2 sentences saying why the correct answer is right.
- Respond with JSON only: no markdown fences, no commentary.

Return exactly this shape:
{
  "questions": [
    {
      "questionText": "string",
      "options": ["string", "string", "string", "string"],
      "correctOptionIndex": 0,
      "explanation": "string"
    }
  ]
}`;

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callProvider(cfg, prompt);
      return validateQuestions(parseModelJson(raw), count);
    } catch (err) {
      if (!(err instanceof AiServiceError)) throw err; // programming error: surface as 500
      lastError = err;
      if (!err.retryable || attempt === MAX_ATTEMPTS) break;
      console.warn(`[ai] attempt ${attempt} failed (${err.errorCode}), retrying once`);
    }
  }
  if (lastError?.errorCode === "AI_BAD_RESPONSE") {
    logFailure(cfg, "AI_BAD_RESPONSE", "no valid questions after retry");
  }
  throw lastError;
}

// ---------- Feature: Resource Recommendations ----------
async function recommendResources({ subject, examTarget, recentTopics = [] }) {
  const prompt = `A student is preparing for "${examTarget}", currently studying "${subject}", recent topics: ${recentTopics.join(", ") || "N/A"}.
Suggest 5 specific, actionable learning resource ideas (not real URLs, just clear titles/descriptions of what to look for).
Return ONLY valid JSON: { "suggestions": ["string", "string", "string", "string", "string"] }`;

  try {
    const result = await generateJSON(prompt);
    if (result?.suggestions?.length) return result.suggestions;
  } catch (err) {
    console.warn("AI resource recommendation failed, using fallback:", err.message);
  }

  return [
    `${subject} NCERT/standard textbook - core chapters`,
    `${subject} previous 5 years' ${examTarget} question papers`,
    `${subject} formula sheet / quick revision notes`,
    `Top-rated YouTube playlist for ${subject} (${examTarget} focused)`,
    `Peer-shared notes in the ${subject} community on this platform`,
  ];
}

// ---------- Feature: Course Outline Generation (for teachers) ----------
async function generateCourseOutline({ title, subject, level }) {
  const prompt = `A teacher wants to create a course titled "${title}" for subject "${subject}", level "${level}".
Generate a structured course outline with 4-6 modules.
Return ONLY valid JSON: { "modules": [{ "title": "string", "description": "string" }] }`;

  try {
    const result = await generateJSON(prompt);
    if (result?.modules?.length) return result.modules;
  } catch (err) {
    console.warn("AI course outline generation failed, using fallback:", err.message);
  }

  return [
    { title: `Introduction to ${subject}`, description: "Foundational concepts and course overview." },
    { title: `Core ${subject} Concepts`, description: "Deep dive into the main topics." },
    { title: "Practice & Problem Solving", description: "Applied exercises and problem sets." },
    { title: "Advanced Topics", description: "Higher-order concepts and edge cases." },
    { title: "Revision & Mock Assessment", description: "Full revision plus a final assessment." },
  ];
}

// ---------- Feature: Doubt Assistance (AI answer suggestion) ----------
async function assistDoubt({ question, subject }) {
  const prompt = `A student asked this doubt in subject "${subject || "General"}": "${question}"
Provide a clear, helpful, step-by-step explanation a peer or AI assistant could post as an answer (max 150 words).
Return ONLY valid JSON: { "answer": "string" }`;

  try {
    const result = await generateJSON(prompt);
    if (result?.answer) return result.answer;
  } catch (err) {
    console.warn("AI doubt assistance failed, using fallback:", err.message);
  }

  return "This is a placeholder AI answer. Configure GEMINI_API_KEY or GROQ_API_KEY in your .env file to get real AI-generated explanations for student doubts.";
}

module.exports = {
  isAIConfigured,
  getAIStatus,
  generateStudyPlan,
  generateSyllabus,
  generateQuizQuestions,
  recommendResources,
  generateCourseOutline,
  assistDoubt,
  // exposed for unit tests only
  _internal: { getProviderConfig, parseModelJson, normalizeQuestion, validateQuestions, scrub },
};
