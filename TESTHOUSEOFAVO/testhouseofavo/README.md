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

## 6. Enabling AI features (optional, free)

The AI syllabus/quiz/recommendation endpoints work out of the box with template-based
fallback content — but for **real AI-generated** output, get one free API key:

- **Gemini (recommended, generous free tier):** https://aistudio.google.com/app/apikey
  - Set in `.env`: `AI_PROVIDER=gemini` and `GEMINI_API_KEY=your_key`
- **Groq (free, very fast Llama models):** https://console.groq.com/keys
  - Set in `.env`: `AI_PROVIDER=groq` and `GROQ_API_KEY=your_key`

No code changes needed — just restart the server after editing `.env`.

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
