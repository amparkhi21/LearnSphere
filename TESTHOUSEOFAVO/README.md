# AI-Powered Learning Marketplace & Exam Prep Platform — Backend

A production-style Node.js/Express + MongoDB backend for a course marketplace with AI-generated
study plans, practice quizzes, resource sharing, and subject communities.

This is the **backend API only** (matches your VS Code folder structure). It's fully functional
on its own — test it with Postman/Thunder Client/curl — and ready to be connected to any frontend
(React, Next.js, etc.) later.

---

## 1. Prerequisites (one-time setup)

You said you haven't installed anything else yet, so start here:

1. **Install Node.js** (v18 or higher): https://nodejs.org (download the "LTS" version, click through the installer with defaults).
   - Verify it worked: open a terminal and run `node -v` and `npm -v`.
2. **Get a free MongoDB database** — easiest option, no local install needed:
   - Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
   - Create a free "M0" cluster.
   - Under "Database Access", create a database user (username + password).
   - Under "Network Access", click "Allow access from anywhere" (0.0.0.0/0) for development.
   - Click "Connect" → "Drivers" → copy the connection string (looks like
     `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/`).
   - (Alternative: install MongoDB Community locally — https://www.mongodb.com/try/download/community —
     and use `mongodb://127.0.0.1:27017/learning_marketplace` instead.)

---

## 2. Project setup

1. Unzip this project and open the folder in VS Code.
2. Open a terminal in VS Code (`Terminal → New Terminal`) and run:
   ```bash
   npm install
   ```
3. Copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
   (On Windows: `copy .env.example .env`)
4. Open `.env` and fill in at minimum:
   ```
   MONGO_URI=<your MongoDB Atlas connection string, with your db name added at the end>
   JWT_SECRET=<any long random string>
   ```
   Everything else (Cloudinary, email, payments, AI keys) is **optional** — the app has
   safe fallbacks for all of them so it runs with just Node + MongoDB.

---

## 3. Run it

```bash
# Start in development mode (auto-restarts on file changes)
npm run dev

# Or start normally
npm start
```

You should see:
```
🚀 Server running in development mode on port 5000
🔗 http://localhost:5000
📚 API base: http://localhost:5000/api/v1
```

Visit `http://localhost:5000` in a browser — you should see a JSON health-check response.

---

## 4. Load sample data (recommended)

This creates a demo admin, teacher, and student account plus a sample course, resource,
community, doubt post, and quiz — so you have something to test against immediately.

```bash
npm run seed
```

Demo accounts (password for all: `password123`):
- Admin: `admin@example.com`
- Teacher: `teacher@example.com`
- Student: `student@example.com`

---

## 5. Explore the API

Full endpoint reference: [`src/docs/API.md`](src/docs/API.md)

Quick test with curl:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"password123"}'
```
Copy the `token` from the response and use it as `Authorization: Bearer <token>` on
protected routes (e.g. `/api/v1/study-plans/generate`).

---

## 6. Enabling AI features (free tier)

**AI quiz generation requires a working AI provider key.** It never shows sample/fake
questions: if the AI is unavailable, the API returns a clear error and the app shows a
Retry button. (Study plans, resource ideas, course outlines and doubt answers keep their
built-in template fallbacks when no key is set.)

Get one free API key and set it **on the server only** (never in the frontend):

- **Gemini (recommended):** https://aistudio.google.com/app/apikey
  - `AI_PROVIDER=gemini` and `GEMINI_API_KEY=<your key>`
- **Groq:** https://console.groq.com/keys
  - `AI_PROVIDER=groq` and `GROQ_API_KEY=<your key>`

| Variable | Required | Notes |
|---|---|---|
| `AI_PROVIDER` | no | `gemini` or `groq`. If empty, auto-detected from whichever key is set. |
| `GEMINI_API_KEY` / `GROQ_API_KEY` | one of them | Server-side only. Sent in a request header, never logged. |
| `GEMINI_MODEL` / `GROQ_MODEL` | no | Override the model ID. Defaults: `gemini-3.6-flash`, `openai/gpt-oss-20b`. Providers retire models over time, so change these if the API says the model is unavailable. |
| `AI_TIMEOUT_MS` | no | How long to wait for the provider (default `25000`). |
| `CLIENT_URL` / `CLIENT_URLS` | yes (prod) | Your exact frontend origin(s) for CORS, e.g. `https://your-app.vercel.app`. |

Local: edit `.env`, restart the server. **Render:** Dashboard -> your service -> *Environment* ->
add/edit the variables -> save (Render redeploys).

### Checking / troubleshooting

`GET /api/v1/ai/status` reports `{ configured, provider, model, missingEnvVar? }` and never
includes a key. Quiz-generation failures return `{ success:false, message, errorCode }`:

| `errorCode` | HTTP | Meaning / fix |
|---|---|---|
| `AI_NOT_CONFIGURED` | 503 | Key env var missing. Server logs name the exact variable. |
| `AI_KEY_INVALID` | 503 | Provider rejected the key (wrong, revoked, or API not enabled). Create a new key. |
| `AI_MODEL_UNAVAILABLE` | 503 | Model retired/renamed. Set `GEMINI_MODEL` / `GROQ_MODEL`. |
| `AI_RATE_LIMITED` | 429 | Provider quota/rate limit hit. Wait and retry. |
| `AI_TIMEOUT` | 504 | Provider too slow. Retry, or raise `AI_TIMEOUT_MS`. |
| `AI_UNAVAILABLE` / `AI_BAD_RESPONSE` | 502 | Provider outage or unusable output (already retried once). |
| `AI_CONTENT_BLOCKED` | 422 | Provider's safety filter declined the topic. |

Older versions of the app saved fake "[Sample] ... Configure GEMINI_API_KEY ..." quizzes into the
database. Remove them once with:

```bash
npm run cleanup:sample-quizzes             # dry run - lists them
npm run cleanup:sample-quizzes -- --delete # delete them (and their attempts)
```

Run the tests with `npm test` (no network or API key needed).

---

## 7. Project structure

```
src/
  config/        MongoDB & Cloudinary configuration
  controllers/   Request handlers (business logic) per module
  docs/          API reference documentation
  middlewares/   Auth, role-checks, error handling, file upload
  models/        Mongoose schemas (User, Course, Enrollment, etc.)
  routes/        Express route definitions per module
  seed/          Sample data seeding script
  services/      AI, email, payment, notification integrations
  uploads/       Local file storage (used when Cloudinary isn't configured)
  utils/         Shared helpers (JWT, API response/error wrappers)
  app.js         Express app configuration (middleware, routes)
  constants.js   Shared enums/constants
  index.js       Server entry point
```

## 8. What's implemented (MVP)

- JWT authentication (register/login/logout), role-based access (student/teacher/admin)
- Course marketplace: create, browse, search/filter, enroll, progress tracking, reviews
- Resource sharing with file upload (local disk or Cloudinary)
- Subject communities with posts (including doubt-marking) and threaded comments/voting
- AI study plan generator, AI practice quiz generator, AI resource recommendations,
  AI course outline generator (for teachers), AI doubt assistance
- Payments: Razorpay test-mode ready, with a zero-config mock mode for local development
- Notifications (enrollment, comments) and bookmarks
- Centralized error handling, rate limiting, security headers (helmet), CORS

## 9. Next steps (Phase 2 ideas)

- Build the frontend (React/Next.js) consuming this API
- Real-time notifications via WebSockets/Socket.IO
- Teacher payouts/earnings dashboard
- Video hosting for course lectures
- Full-text search upgrade (Atlas Search or Algolia free tier)
