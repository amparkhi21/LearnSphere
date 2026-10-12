const test = require("node:test");
const assert = require("node:assert/strict");
const liveKit = require("../src/services/livekit.service");

test("participant token is short-lived and scoped to its class and authenticated identity", async () => {
  const previous = { url: process.env.LIVEKIT_URL, key: process.env.LIVEKIT_API_KEY, secret: process.env.LIVEKIT_API_SECRET };
  process.env.LIVEKIT_URL = "wss://example.livekit.cloud";
  process.env.LIVEKIT_API_KEY = "test-api-key";
  process.env.LIVEKIT_API_SECRET = "test-secret-that-is-long-enough-for-signing";
  try {
    const token = await liveKit.createParticipantToken({ room: "class-123", identity: "student-1", name: "Student One", canPublish: true });
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    assert.equal(claims.sub, "student-1");
    assert.equal(claims.name, "Student One");
    const nowSeconds = Math.floor(Date.now() / 1000);
    assert.ok(claims.exp > nowSeconds);
    assert.ok(claims.exp <= nowSeconds + 16 * 60);
    assert.equal(claims.video.room, "class-123");
    assert.equal(claims.video.roomJoin, true);
    assert.equal(claims.video.canPublish, true);
    assert.equal(claims.video.canSubscribe, true);
  } finally {
    if (previous.url === undefined) delete process.env.LIVEKIT_URL; else process.env.LIVEKIT_URL = previous.url;
    if (previous.key === undefined) delete process.env.LIVEKIT_API_KEY; else process.env.LIVEKIT_API_KEY = previous.key;
    if (previous.secret === undefined) delete process.env.LIVEKIT_API_SECRET; else process.env.LIVEKIT_API_SECRET = previous.secret;
  }
});

test("token generation fails safely if LiveKit credentials are absent", async () => {
  const previous = { url: process.env.LIVEKIT_URL, key: process.env.LIVEKIT_API_KEY, secret: process.env.LIVEKIT_API_SECRET };
  delete process.env.LIVEKIT_URL;
  delete process.env.LIVEKIT_API_KEY;
  delete process.env.LIVEKIT_API_SECRET;
  const originalConsoleError = console.error;
  let diagnostic;
  console.error = (message, details) => { diagnostic = { message, details }; };
  try {
    await assert.rejects(liveKit.createParticipantToken({ room: "class", identity: "user", name: "User", canPublish: false }), { code: "LIVEKIT_NOT_CONFIGURED" });
    assert.equal(diagnostic.message, "[LiveKit] Configuration incomplete");
    assert.deepEqual(diagnostic.details, { urlConfigured: false, apiKeyConfigured: false, apiSecretConfigured: false });
  } finally {
    console.error = originalConsoleError;
    if (previous.url !== undefined) process.env.LIVEKIT_URL = previous.url;
    if (previous.key !== undefined) process.env.LIVEKIT_API_KEY = previous.key;
    if (previous.secret !== undefined) process.env.LIVEKIT_API_SECRET = previous.secret;
  }
});
