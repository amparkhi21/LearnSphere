const test = require("node:test");
const assert = require("node:assert/strict");
const { startMockProvider, goodQuestions, geminiReply, groqReply, withEnv, captureConsole } = require("./helpers");
const ai = require("../src/services/ai.service");
const AiServiceError = require("../src/utils/aiError");

const SECRET = "TEST-SECRET-KEY-do-not-leak-0123456789";
const req = { subject: "Physics", topic: "Optics", difficulty: "medium", count: 3 };

// ---------------------------------------------------------------- parsing
test("parseModelJson handles plain, fenced, and prose-wrapped JSON", () => {
  const { parseModelJson } = ai._internal;
  const obj = { questions: [] };
  assert.deepEqual(parseModelJson(JSON.stringify(obj)), obj);
  assert.deepEqual(parseModelJson("```json\n" + JSON.stringify(obj) + "\n```"), obj);
  assert.deepEqual(parseModelJson("```\n" + JSON.stringify(obj) + "\n```"), obj);
  assert.deepEqual(parseModelJson("Sure! Here you go:\n" + JSON.stringify(obj) + "\nHope that helps."), obj);
  assert.deepEqual(parseModelJson("\uFEFF" + JSON.stringify(obj)), obj);
});

test("parseModelJson rejects empty / non-JSON with AI_BAD_RESPONSE", () => {
  const { parseModelJson } = ai._internal;
  for (const bad of ["", "   ", null, undefined, "not json at all", "{broken", 42]) {
    assert.throws(() => parseModelJson(bad), (e) => e instanceof AiServiceError && e.errorCode === "AI_BAD_RESPONSE");
  }
});

// ------------------------------------------------------------- validation
test("validateQuestions accepts good data and trims to requested count", () => {
  const out = ai._internal.validateQuestions(goodQuestions(6), 4);
  assert.equal(out.length, 4);
  for (const q of out) {
    assert.equal(q.options.length, 4);
    assert.ok(Number.isInteger(q.correctOptionIndex) && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3);
    assert.ok(q.questionText && q.explanation);
  }
});

test("normalizeQuestion tolerates common model variations", () => {
  const { normalizeQuestion } = ai._internal;
  const base = { questionText: "What is the powerhouse of the cell?", explanation: "x" };
  // labelled options + letter answer
  let q = normalizeQuestion({ ...base, options: ["A) Nucleus", "B) Mitochondria", "C) Ribosome", "D) Golgi"], correctAnswer: "B" });
  assert.deepEqual(q.options, ["Nucleus", "Mitochondria", "Ribosome", "Golgi"]);
  assert.equal(q.correctOptionIndex, 1);
  // numeric string index
  q = normalizeQuestion({ ...base, options: ["a1", "b2", "c3", "d4"], correctOptionIndex: "2" });
  assert.equal(q.correctOptionIndex, 2);
  // answer given as option text, key named "question"
  q = normalizeQuestion({ question: base.questionText, options: ["Nucleus", "Mitochondria", "Ribosome", "Golgi"], answer: "mitochondria" });
  assert.equal(q.correctOptionIndex, 1);
  // object-form options
  q = normalizeQuestion({ ...base, options: { A: "Nucleus", B: "Mitochondria", C: "Ribosome", D: "Golgi" }, correctOptionIndex: 1 });
  assert.equal(q.options[1], "Mitochondria");
});

test("normalizeQuestion rejects malformed questions", () => {
  const { normalizeQuestion } = ai._internal;
  const ok = { questionText: "What is the powerhouse of the cell?", options: ["a1", "b2", "c3", "d4"], correctOptionIndex: 0 };
  assert.ok(normalizeQuestion(ok));
  assert.equal(normalizeQuestion({ ...ok, options: ["a1", "b2", "c3"] }), null, "3 options");
  assert.equal(normalizeQuestion({ ...ok, options: ["a1", "b2", "c3", "d4", "e5"] }), null, "5 options");
  assert.equal(normalizeQuestion({ ...ok, options: ["a1", "a1", "c3", "d4"] }), null, "duplicate options");
  assert.equal(normalizeQuestion({ ...ok, options: ["a1", "", "c3", "d4"] }), null, "empty option");
  assert.equal(normalizeQuestion({ ...ok, correctOptionIndex: 4 }), null, "index out of range");
  assert.equal(normalizeQuestion({ ...ok, correctOptionIndex: -1 }), null, "negative index");
  assert.equal(normalizeQuestion({ ...ok, correctOptionIndex: undefined }), null, "no answer");
  assert.equal(normalizeQuestion({ ...ok, questionText: "short" }), null, "too short");
  assert.equal(normalizeQuestion(null), null);
  assert.equal(normalizeQuestion("a string"), null);
});

test("placeholder / config-message content is rejected as a question", () => {
  const { normalizeQuestion } = ai._internal;
  const opts = ["Option A", "Option B", "Option C", "Option D"];
  assert.equal(normalizeQuestion({ questionText: "[Sample] Physics practice question #1.", options: ["w", "x", "y", "z"], correctOptionIndex: 0 }), null);
  assert.equal(normalizeQuestion({ questionText: "Configure GEMINI_API_KEY or GROQ_API_KEY for real AI-generated questions.", options: ["w", "x", "y", "z"], correctOptionIndex: 0 }), null);
  assert.equal(normalizeQuestion({ questionText: "A perfectly normal looking question?", options: opts, correctOptionIndex: 0 }), null);
});

test("validateQuestions throws when too few valid questions survive", () => {
  const junk = { questions: [{ questionText: "x" }, { foo: 1 }, null] };
  assert.throws(() => ai._internal.validateQuestions(junk, 5), (e) => e.errorCode === "AI_BAD_RESPONSE");
  assert.throws(() => ai._internal.validateQuestions({ nope: true }, 5), (e) => e.errorCode === "AI_BAD_RESPONSE");
  assert.throws(() => ai._internal.validateQuestions({ questions: [] }, 5), (e) => e.errorCode === "AI_BAD_RESPONSE");
});

// ---------------------------------------------------------- configuration
test("not configured -> AI_NOT_CONFIGURED, NO network call, NO sample questions", async () => {
  const restore = withEnv({});
  const cap = captureConsole();
  try {
    assert.equal(ai.isAIConfigured(), false);
    await assert.rejects(ai.generateQuizQuestions(req), (e) => {
      assert.equal(e.errorCode, "AI_NOT_CONFIGURED");
      assert.equal(e.statusCode, 503);
      assert.doesNotMatch(e.message, /GEMINI_API_KEY|GROQ_API_KEY|\[Sample\]/);
      return true;
    });
    // exact env var name is logged server-side for the admin
    assert.match(cap.lines.join("\n"), /GEMINI_API_KEY is not set/);
  } finally { cap.restore(); restore(); }
});

test("placeholder key value counts as not configured", () => {
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: "your_gemini_api_key_here" });
  try { assert.equal(ai.isAIConfigured(), false); } finally { restore(); }
});

test("keys with accidental quotes/whitespace are cleaned", () => {
  const restore = withEnv({ AI_PROVIDER: "groq", GROQ_API_KEY: `  "${SECRET}"  ` });
  try {
    const cfg = ai._internal.getProviderConfig();
    assert.equal(cfg.configured, true);
    assert.equal(cfg.apiKey, SECRET);
  } finally { restore(); }
});

test("provider is auto-detected when AI_PROVIDER is unset", () => {
  let restore = withEnv({ GROQ_API_KEY: SECRET });
  try { assert.equal(ai.getAIStatus().provider, "groq"); } finally { restore(); }
  restore = withEnv({ GEMINI_API_KEY: SECRET });
  try { assert.equal(ai.getAIStatus().provider, "gemini"); } finally { restore(); }
});

test("getAIStatus never contains the key and names the missing var", () => {
  let restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET });
  try {
    const status = ai.getAIStatus();
    assert.equal(status.configured, true);
    assert.equal(status.model, "gemini-3.6-flash");
    assert.doesNotMatch(JSON.stringify(status), new RegExp(SECRET));
  } finally { restore(); }
  restore = withEnv({ AI_PROVIDER: "groq" });
  try { assert.deepEqual(ai.getAIStatus(), { configured: false, provider: "groq", model: "openai/gpt-oss-20b", missingEnvVar: "GROQ_API_KEY" }); } finally { restore(); }
  restore = withEnv({ AI_PROVIDER: "openai" });
  try { assert.equal(ai.getAIStatus().configured, false); } finally { restore(); }
});

// ------------------------------------------------------- Gemini end-to-end
test("Gemini: valid request returns real questions; key is sent in header, never URL", async () => {
  const mock = await startMockProvider(() => geminiReply(JSON.stringify(goodQuestions(3))));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url, GEMINI_MODEL: "gemini-test-model" });
  try {
    const qs = await ai.generateQuizQuestions(req);
    assert.equal(qs.length, 3);
    assert.equal(mock.hits.length, 1);
    const hit = mock.hits[0];
    assert.equal(hit.url, "/models/gemini-test-model:generateContent");
    assert.equal(hit.headers["x-goog-api-key"], SECRET);
    assert.ok(!hit.url.includes(SECRET), "key must not be in URL");
    assert.ok(!JSON.stringify(hit.body).includes(SECRET), "key must not be in body");
    const prompt = hit.body.contents[0].parts[0].text;
    assert.match(prompt, /Physics/);
    assert.match(prompt, /Optics/);
    assert.match(prompt, /Write 3 multiple-choice/);
  } finally { restore(); await mock.close(); }
});

test("Gemini: markdown-wrapped JSON is parsed", async () => {
  const mock = await startMockProvider(() => geminiReply("```json\n" + JSON.stringify(goodQuestions(3)) + "\n```"));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  try { assert.equal((await ai.generateQuizQuestions(req)).length, 3); } finally { restore(); await mock.close(); }
});

test("Gemini: 'thought' parts from thinking models are ignored", async () => {
  const mock = await startMockProvider(() => ({ json: { candidates: [{ finishReason: "STOP", content: { parts: [{ thought: true, text: "let me think..." }, { text: JSON.stringify(goodQuestions(3)) }] } }] } }));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  try { assert.equal((await ai.generateQuizQuestions(req)).length, 3); } finally { restore(); await mock.close(); }
});

test("Gemini: invalid key -> AI_KEY_INVALID (503), no retry, secret never leaks", async () => {
  const mock = await startMockProvider(() => ({
    status: 400,
    json: { error: { code: 400, message: `API key not valid. Please pass a valid API key. (you sent ${SECRET})`, status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } },
  }));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  const cap = captureConsole();
  try {
    await assert.rejects(ai.generateQuizQuestions(req), (e) => {
      assert.equal(e.errorCode, "AI_KEY_INVALID");
      assert.equal(e.statusCode, 503);
      assert.ok(!e.message.includes(SECRET));
      return true;
    });
    assert.equal(mock.hits.length, 1, "must not retry on auth errors");
    const logs = cap.lines.join("\n");
    assert.match(logs, /AI_KEY_INVALID/);
    assert.ok(!logs.includes(SECRET), "secret must be scrubbed from logs");
  } finally { cap.restore(); restore(); await mock.close(); }
});

for (const [status, code, httpStatus] of [[401, "AI_KEY_INVALID", 503], [403, "AI_KEY_INVALID", 503], [404, "AI_MODEL_UNAVAILABLE", 503], [429, "AI_RATE_LIMITED", 429]]) {
  test(`Gemini: provider HTTP ${status} -> ${code} (${httpStatus}), single attempt`, async () => {
    const mock = await startMockProvider(() => ({ status, json: { error: { message: "provider says no", status: "X" } } }));
    const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
    const cap = captureConsole();
    try {
      await assert.rejects(ai.generateQuizQuestions(req), (e) => e.errorCode === code && e.statusCode === httpStatus);
      assert.equal(mock.hits.length, 1);
    } finally { cap.restore(); restore(); await mock.close(); }
  });
}

test("Gemini: 500 then success -> automatic retry succeeds", async () => {
  const mock = await startMockProvider((_, n) => (n === 1 ? { status: 500, json: { error: { message: "boom" } } } : geminiReply(JSON.stringify(goodQuestions(3)))));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  const cap = captureConsole();
  try {
    assert.equal((await ai.generateQuizQuestions(req)).length, 3);
    assert.equal(mock.hits.length, 2);
  } finally { cap.restore(); restore(); await mock.close(); }
});

test("Gemini: persistent 503 -> AI_UNAVAILABLE after exactly 2 attempts", async () => {
  const mock = await startMockProvider(() => ({ status: 503, text: "<html>Service Unavailable</html>" }));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  const cap = captureConsole();
  try {
    await assert.rejects(ai.generateQuizQuestions(req), (e) => e.errorCode === "AI_UNAVAILABLE" && e.statusCode === 502);
    assert.equal(mock.hits.length, 2);
  } finally { cap.restore(); restore(); await mock.close(); }
});

test("Gemini: malformed JSON twice -> AI_BAD_RESPONSE; nothing fake returned", async () => {
  const mock = await startMockProvider(() => geminiReply("Sorry, here are some questions: 1) blah"));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  const cap = captureConsole();
  try {
    await assert.rejects(ai.generateQuizQuestions(req), (e) => e.errorCode === "AI_BAD_RESPONSE" && e.statusCode === 502);
    assert.equal(mock.hits.length, 2);
  } finally { cap.restore(); restore(); await mock.close(); }
});

test("Gemini: malformed first, valid second -> retry recovers", async () => {
  const mock = await startMockProvider((_, n) => geminiReply(n === 1 ? "{not json" : JSON.stringify(goodQuestions(3))));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  const cap = captureConsole();
  try { assert.equal((await ai.generateQuizQuestions(req)).length, 3); assert.equal(mock.hits.length, 2); } finally { cap.restore(); restore(); await mock.close(); }
});

test("Gemini: empty candidates / empty text -> AI_BAD_RESPONSE", async () => {
  for (const reply of [{ json: { candidates: [] } }, { json: {} }, geminiReply(""), geminiReply("   ")]) {
    const mock = await startMockProvider(() => reply);
    const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
    const cap = captureConsole();
    try { await assert.rejects(ai.generateQuizQuestions(req), (e) => e.errorCode === "AI_BAD_RESPONSE"); } finally { cap.restore(); restore(); await mock.close(); }
  }
});

test("Gemini: model returning the old placeholder text is rejected, not displayed", async () => {
  const fake = { questions: Array.from({ length: 3 }, (_, i) => ({ questionText: `[Sample] Physics practice question #${i + 1}. (Configure GEMINI_API_KEY or GROQ_API_KEY for real AI-generated questions.)`, options: ["Option A", "Option B", "Option C", "Option D"], correctOptionIndex: 0, explanation: "Add an AI provider key in .env" })) };
  const mock = await startMockProvider(() => geminiReply(JSON.stringify(fake)));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  const cap = captureConsole();
  try { await assert.rejects(ai.generateQuizQuestions(req), (e) => e.errorCode === "AI_BAD_RESPONSE"); } finally { cap.restore(); restore(); await mock.close(); }
});

test("Gemini: safety block -> AI_CONTENT_BLOCKED (422), no retry", async () => {
  const mock = await startMockProvider(() => ({ json: { promptFeedback: { blockReason: "SAFETY" } } }));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  const cap = captureConsole();
  try {
    await assert.rejects(ai.generateQuizQuestions(req), (e) => e.errorCode === "AI_CONTENT_BLOCKED" && e.statusCode === 422);
    assert.equal(mock.hits.length, 1);
  } finally { cap.restore(); restore(); await mock.close(); }
});

test("Gemini: truncated output (MAX_TOKENS) is treated as bad response", async () => {
  const mock = await startMockProvider(() => ({ json: { candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: '{"questions":[{"questionText":"cut' }] } }] } }));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  const cap = captureConsole();
  try { await assert.rejects(ai.generateQuizQuestions(req), (e) => e.errorCode === "AI_BAD_RESPONSE"); } finally { cap.restore(); restore(); await mock.close(); }
});

test("timeout -> AI_TIMEOUT (504), not retried, request aborted", async () => {
  const mock = await startMockProvider(() => ({ ...geminiReply(JSON.stringify(goodQuestions(3))), delayMs: 1500 }));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url, AI_TIMEOUT_MS: "1000" });
  const cap = captureConsole();
  const t0 = Date.now();
  try {
    await assert.rejects(ai.generateQuizQuestions(req), (e) => e.errorCode === "AI_TIMEOUT" && e.statusCode === 504);
    assert.ok(Date.now() - t0 < 1450, "should give up at the timeout, not wait for the slow reply");
    assert.equal(mock.hits.length, 1);
  } finally { cap.restore(); restore(); await mock.close(); }
});

test("network failure (nothing listening) -> AI_UNAVAILABLE and the log has no URL/key", async () => {
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: "http://127.0.0.1:1" });
  const cap = captureConsole();
  try {
    await assert.rejects(ai.generateQuizQuestions(req), (e) => e.errorCode === "AI_UNAVAILABLE");
    const logs = cap.lines.join("\n");
    assert.ok(!logs.includes(SECRET));
    assert.ok(!logs.includes("127.0.0.1"));
  } finally { cap.restore(); restore(); }
});

// ---------------------------------------------------------- Groq end-to-end
test("Groq: valid request returns real questions; Bearer header; default non-retired model", async () => {
  const mock = await startMockProvider(() => groqReply(JSON.stringify(goodQuestions(3))));
  const restore = withEnv({ AI_PROVIDER: "groq", GROQ_API_KEY: SECRET, GROQ_BASE_URL: mock.url });
  try {
    const qs = await ai.generateQuizQuestions(req);
    assert.equal(qs.length, 3);
    const hit = mock.hits[0];
    assert.equal(hit.url, "/chat/completions");
    assert.equal(hit.headers.authorization, `Bearer ${SECRET}`);
    assert.equal(hit.body.model, "openai/gpt-oss-20b");
    assert.notEqual(hit.body.model, "llama-3.1-8b-instant", "retired model must not be the default");
    assert.deepEqual(hit.body.response_format, { type: "json_object" });
  } finally { restore(); await mock.close(); }
});

test("Groq: GROQ_MODEL override is honoured", async () => {
  const mock = await startMockProvider(() => groqReply(JSON.stringify(goodQuestions(3))));
  const restore = withEnv({ AI_PROVIDER: "groq", GROQ_API_KEY: SECRET, GROQ_BASE_URL: mock.url, GROQ_MODEL: "my/other-model" });
  try { await ai.generateQuizQuestions(req); assert.equal(mock.hits[0].body.model, "my/other-model"); } finally { restore(); await mock.close(); }
});

test("Groq: retries without response_format if JSON mode is rejected", async () => {
  const mock = await startMockProvider((hit, n) => (hit.body.response_format ? { status: 400, json: { error: { message: "response_format is not supported with this model" } } } : groqReply(JSON.stringify(goodQuestions(3)))));
  const restore = withEnv({ AI_PROVIDER: "groq", GROQ_API_KEY: SECRET, GROQ_BASE_URL: mock.url });
  const cap = captureConsole();
  try { assert.equal((await ai.generateQuizQuestions(req)).length, 3); assert.equal(mock.hits.length, 2); } finally { cap.restore(); restore(); await mock.close(); }
});

test("Groq: decommissioned model -> AI_MODEL_UNAVAILABLE", async () => {
  const mock = await startMockProvider(() => ({ status: 400, json: { error: { message: "The model `llama-3.1-8b-instant` has been decommissioned", code: "model_decommissioned" } } }));
  const restore = withEnv({ AI_PROVIDER: "groq", GROQ_API_KEY: SECRET, GROQ_BASE_URL: mock.url });
  const cap = captureConsole();
  try { await assert.rejects(ai.generateQuizQuestions(req), (e) => e.errorCode === "AI_MODEL_UNAVAILABLE" && e.statusCode === 503); } finally { cap.restore(); restore(); await mock.close(); }
});

test("Groq: 401 invalid key and 429 quota map correctly, Bearer token scrubbed from logs", async () => {
  for (const [status, code] of [[401, "AI_KEY_INVALID"], [429, "AI_RATE_LIMITED"]]) {
    const mock = await startMockProvider(() => ({ status, json: { error: { message: `bad token Bearer ${SECRET}` } } }));
    const restore = withEnv({ AI_PROVIDER: "groq", GROQ_API_KEY: SECRET, GROQ_BASE_URL: mock.url });
    const cap = captureConsole();
    try {
      await assert.rejects(ai.generateQuizQuestions(req), (e) => e.errorCode === code && !e.message.includes(SECRET));
      assert.ok(!cap.lines.join("\n").includes(SECRET));
    } finally { cap.restore(); restore(); await mock.close(); }
  }
});

// ---------------------------------------------------- non-quiz features
test("non-quiz features still use their original fallbacks when AI is not configured", async () => {
  const restore = withEnv({});
  try {
    const outline = await ai.generateCourseOutline({ title: "T", subject: "Math", level: "beginner" });
    assert.ok(Array.isArray(outline) && outline.length >= 4);
    const plan = await ai.generateStudyPlan({ examTarget: "JEE", stream: "Engineering", subjects: ["Physics"], durationWeeks: 2, hoursPerDay: 3 });
    assert.equal(plan.weeklyPlan.length, 2);
    assert.equal((await ai.recommendResources({ subject: "Physics", examTarget: "JEE" })).length, 5);
  } finally { restore(); }
});

test("non-quiz features still fall back (not crash) when provider fails", async () => {
  const mock = await startMockProvider(() => ({ status: 500, json: {} }));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  const cap = captureConsole();
  try { assert.ok((await ai.generateCourseOutline({ title: "T", subject: "Math", level: "beginner" })).length >= 4); } finally { cap.restore(); restore(); await mock.close(); }
});
