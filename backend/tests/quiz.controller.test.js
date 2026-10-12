const test = require("node:test");
const assert = require("node:assert/strict");
const { startMockProvider, goodQuestions, geminiReply, withEnv, captureConsole } = require("./helpers");

// Mongoose is not needed to test request handling: stub the Quiz model in the require cache.
const created = [];
let detailQuiz = null;
let lastQuizFilter = null;
const quizModelPath = require.resolve("../src/models/quiz.model");
require.cache[quizModelPath] = {
  id: quizModelPath, filename: quizModelPath, loaded: true,
  exports: {
    create: async (doc) => { created.push(doc); return { _id: "quiz123", ...doc }; },
    findById: () => ({ select: async () => detailQuiz }),
    find: (filter) => {
      lastQuizFilter = filter;
      const query = { select() { return this; }, sort() { return this; }, skip() { return this; }, limit: async () => [{ _id: "ownedQuiz" }] };
      return query;
    },
    countDocuments: async (filter) => { lastQuizFilter = filter; return 1; },
  },
};

const { generateQuiz, getMyGeneratedQuizzes, getQuizById } = require("../src/controllers/quiz.controller");
const { errorHandler } = require("../src/middlewares/error.middleware");

const SECRET = "TEST-SECRET-KEY-do-not-leak-0123456789";

/** Run the real controller + the real error middleware and return what the client would get. */
function call(body) {
  return new Promise((resolve) => {
    const req = { body, user: { _id: "user1" } };
    const res = {
      statusCode: 200,
      status(c) { this.statusCode = c; return this; },
      json(b) { resolve({ status: this.statusCode, body: JSON.parse(JSON.stringify(b)) }); },
    };
    generateQuiz(req, res, (err) => errorHandler(err, req, res, () => {}));
  });
}

test.beforeEach(() => { created.length = 0; detailQuiz = null; lastQuizFilter = null; });

test("personal quiz API uses only authenticated owner ID, ignoring user-supplied filters", async () => {
  const queryAs = (userId, query = {}) => new Promise((resolve, reject) => {
    const req = { user: { _id: userId }, query };
    const res = { status() { return this; }, json(body) { resolve(body); } };
    getMyGeneratedQuizzes(req, res, reject);
  });

  const studentA = await queryAs("studentA", { createdBy: "studentB" });
  assert.deepEqual(lastQuizFilter, { createdBy: "studentA", isAIGenerated: true });
  assert.equal(studentA.data.quizzes[0]._id, "ownedQuiz");

  await queryAs("studentB");
  assert.deepEqual(lastQuizFilter, { createdBy: "studentB", isAIGenerated: true });
});

function callQuizDetail(userId) {
  return new Promise((resolve) => {
    const req = { params: { id: "quiz123" }, user: userId ? { _id: userId } : null };
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { resolve({ status: this.statusCode, body: JSON.parse(JSON.stringify(b)) }); } };
    getQuizById(req, res, (err) => errorHandler(err, req, res, () => {}));
  });
}

test("legacy AI quizzes remain private even if their old isPublic flag is true", async () => {
  detailQuiz = { _id: "quiz123", createdBy: "studentA", isAIGenerated: true, isPublic: true };
  const foreign = await callQuizDetail("studentB");
  assert.equal(foreign.status, 403);
  const owner = await callQuizDetail("studentA");
  assert.equal(owner.status, 200);
});

test("valid request -> 201, quiz saved with AI questions in the frontend's expected shape", async () => {
  const mock = await startMockProvider(() => geminiReply(JSON.stringify(goodQuestions(5))));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  try {
    const { status, body } = await call({ subject: "Physics", topic: "Mechanics", difficulty: "hard", count: 5, createdBy: "attacker", isPublic: true });
    assert.equal(status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data._id, "quiz123");          // frontend navigates with quiz._id
    assert.equal(body.data.isAIGenerated, true);
    assert.equal(body.data.difficulty, "hard");
    assert.equal(body.data.questions.length, 5);
    for (const q of body.data.questions) {
      assert.equal(typeof q.questionText, "string");
      assert.equal(q.options.length, 4);
      assert.ok(q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3);
    }
    assert.equal(created.length, 1);
    assert.equal(created[0].createdBy, "user1");
    assert.equal(created[0].isPublic, false);
    assert.doesNotMatch(JSON.stringify(body), /Sample|GEMINI_API_KEY|GROQ_API_KEY/);
  } finally { restore(); await mock.close(); }
});

test("defaults: only subject given -> difficulty medium, 5 questions requested", async () => {
  const mock = await startMockProvider(() => geminiReply(JSON.stringify(goodQuestions(5))));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  try {
    const { status, body } = await call({ subject: "  Chemistry  " });
    assert.equal(status, 201);
    assert.equal(body.data.subject, "Chemistry");
    assert.equal(body.data.difficulty, "medium");
    assert.match(mock.hits[0].body.contents[0].parts[0].text, /Write 5 multiple-choice/);
    assert.equal(body.data.title, "Chemistry Practice Quiz");
  } finally { restore(); await mock.close(); }
});

test("count sent as a numeric string (e.g. from a form) is accepted", async () => {
  const mock = await startMockProvider(() => geminiReply(JSON.stringify(goodQuestions(4))));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  try { assert.equal((await call({ subject: "Biology", count: "4" })).status, 201); } finally { restore(); await mock.close(); }
});

for (const [label, payload, msg] of [
  ["missing subject", {}, /Subject is required/],
  ["blank subject", { subject: "   " }, /Subject is required/],
  ["non-string subject", { subject: { $ne: 1 } }, /Subject is required/],
  ["subject too long", { subject: "x".repeat(101) }, /100 characters/],
  ["topic too long", { subject: "Math", topic: "y".repeat(151) }, /150 characters/],
  ["invalid difficulty", { subject: "Math", difficulty: "impossible" }, /Difficulty must be one of/],
  ["count = 0", { subject: "Math", count: 0 }, /between 1 and 15/],
  ["count too large", { subject: "Math", count: 500 }, /between 1 and 15/],
  ["count not a number", { subject: "Math", count: "abc" }, /between 1 and 15/],
  ["count fractional", { subject: "Math", count: 2.5 }, /between 1 and 15/],
]) {
  test(`invalid request (${label}) -> 400, provider never called, nothing saved`, async () => {
    const mock = await startMockProvider(() => geminiReply(JSON.stringify(goodQuestions(5))));
    const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
    try {
      const { status, body } = await call(payload);
      assert.equal(status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, msg);
      assert.equal(mock.hits.length, 0);
      assert.equal(created.length, 0);
    } finally { restore(); await mock.close(); }
  });
}

test("missing body entirely -> 400 (no crash)", async () => {
  const { status, body } = await call(undefined);
  assert.equal(status, 400);
  assert.equal(body.success, false);
});

test("API key missing -> 503 AI_NOT_CONFIGURED, safe message, NOTHING saved (no sample quiz in DB)", async () => {
  const restore = withEnv({});
  const cap = captureConsole();
  try {
    const { status, body } = await call({ subject: "Physics" });
    assert.equal(status, 503);
    assert.equal(body.success, false);
    assert.equal(body.errorCode, "AI_NOT_CONFIGURED");
    assert.doesNotMatch(body.message, /GEMINI_API_KEY|GROQ_API_KEY|Sample|\.env/);
    assert.equal(created.length, 0, "must not persist a fake quiz");
  } finally { cap.restore(); restore(); }
});

for (const [label, upstream, status, code] of [
  ["invalid key", { status: 400, json: { error: { message: `API key not valid ${SECRET}`, details: [{ reason: "API_KEY_INVALID" }] } } }, 503, "AI_KEY_INVALID"],
  ["quota exceeded", { status: 429, json: { error: { message: "Quota exceeded" } } }, 429, "AI_RATE_LIMITED"],
  ["model retired", { status: 404, json: { error: { message: "models/x is not found" } } }, 503, "AI_MODEL_UNAVAILABLE"],
  ["provider outage", { status: 503, text: "<html>down</html>" }, 502, "AI_UNAVAILABLE"],
  ["garbage output", geminiReply("I'm sorry, I can't do JSON today."), 502, "AI_BAD_RESPONSE"],
  ["empty output", geminiReply(""), 502, "AI_BAD_RESPONSE"],
]) {
  test(`provider failure (${label}) -> ${status} ${code}, safe body, nothing saved`, async () => {
    const mock = await startMockProvider(() => upstream);
    const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
    const cap = captureConsole();
    try {
      const { status: s, body } = await call({ subject: "Physics" });
      assert.equal(s, status);
      assert.equal(body.success, false);
      assert.equal(body.errorCode, code);
      assert.equal(typeof body.message, "string");
      assert.ok(body.message.length > 10);
      const wire = JSON.stringify(body);
      assert.ok(!wire.includes(SECRET), "secret must never reach the client");
      assert.doesNotMatch(wire, /Sample|GEMINI_API_KEY|GROQ_API_KEY|stack/);
      assert.ok(!cap.lines.join("\n").includes(SECRET), "secret must never reach logs");
      assert.equal(created.length, 0);
    } finally { cap.restore(); restore(); await mock.close(); }
  });
}

test("retry flow: first call fails transiently, user's retry succeeds", async () => {
  let n = 0;
  const mock = await startMockProvider(() => (++n <= 2 ? { status: 503, text: "down" } : geminiReply(JSON.stringify(goodQuestions(3)))));
  const restore = withEnv({ AI_PROVIDER: "gemini", GEMINI_API_KEY: SECRET, GEMINI_BASE_URL: mock.url });
  const cap = captureConsole();
  try {
    const first = await call({ subject: "Physics", count: 3 });   // service uses its 2 attempts -> fails
    assert.equal(first.status, 502);
    assert.equal(created.length, 0);
    const second = await call({ subject: "Physics", count: 3 });  // user clicks "Retry" -> works
    assert.equal(second.status, 201);
    assert.equal(second.body.data.questions.length, 3);
    assert.equal(created.length, 1);
  } finally { cap.restore(); restore(); await mock.close(); }
});
