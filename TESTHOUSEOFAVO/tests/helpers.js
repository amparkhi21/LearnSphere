const http = require("node:http");

/** Tiny fake AI provider. `handler(req, body, hitIndex)` -> { status, json | text, delayMs }. */
async function startMockProvider(handler) {
  const hits = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      let body = null;
      try { body = JSON.parse(raw); } catch (_) {}
      const hit = { method: req.method, url: req.url, headers: req.headers, body };
      hits.push(hit);
      const out = await handler(hit, hits.length);
      const send = () => {
        res.statusCode = out.status ?? 200;
        res.setHeader("Content-Type", "application/json");
        res.end(out.text !== undefined ? out.text : JSON.stringify(out.json ?? {}));
      };
      out.delayMs ? setTimeout(send, out.delayMs) : send();
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    hits,
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }),
  };
}

const goodQuestions = (n = 3) => ({
  questions: Array.from({ length: n }, (_, i) => ({
    questionText: `Which planet is number ${i + 1} from the Sun in our solar system?`,
    options: ["Mercury", "Venus", "Earth", "Mars"],
    correctOptionIndex: i % 4,
    explanation: "Planets are numbered by distance from the Sun.",
  })),
});

const geminiReply = (text) => ({ json: { candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] } });
const groqReply = (text) => ({ json: { choices: [{ message: { content: text }, finish_reason: "stop" }] } });

/** Set env vars for one test and restore afterwards. */
function withEnv(vars) {
  const saved = {};
  const keys = new Set([...Object.keys(vars), "AI_PROVIDER", "GEMINI_API_KEY", "GROQ_API_KEY", "GEMINI_MODEL", "GROQ_MODEL", "GEMINI_BASE_URL", "GROQ_BASE_URL", "AI_TIMEOUT_MS"]);
  for (const k of keys) { saved[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, vars);
  return () => { for (const k of keys) saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]); };
}

/** Capture console output so tests can assert nothing sensitive was logged. */
function captureConsole() {
  const lines = [];
  const orig = { log: console.log, warn: console.warn, error: console.error };
  for (const k of Object.keys(orig)) console[k] = (...a) => lines.push(a.join(" "));
  return { lines, restore: () => Object.assign(console, orig) };
}

module.exports = { startMockProvider, goodQuestions, geminiReply, groqReply, withEnv, captureConsole };
