# LearnSphere — Frontend (React)

The React frontend for the AI-Powered Learning Marketplace & Exam Prep Platform. Connects to the
`testhouseofavo` backend API you already set up.

## 1. Prerequisites

- Node.js (same install as the backend — v18+). If you already installed it for the backend, you're set.
- The **backend must be running** on `http://localhost:5000` (or wherever you configured it) before
  this frontend will show real data.

## 2. Setup

1. Unzip this project (or place it as a sibling folder next to your backend, e.g.:
   ```
   Projects/
     testhouseofavo/            <- backend
     testhouseofavo-frontend/   <- this project
   ```
2. Open it in VS Code (a new window, or `File → Add Folder to Workspace`).
3. Open a terminal in this folder and install dependencies:
   ```bash
   npm install
   ```
4. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
   (Windows: `copy .env.example .env`)
5. Open `.env` — by default it points at `http://localhost:5000/api/v1`. Leave it as-is if you're
   running the backend locally on the default port.

## 3. Run it

Make sure your **backend is running first** (`npm run dev` in the backend folder), then in this
frontend folder:

```bash
npm run dev
```

Visit **http://localhost:3000** — you should see the LearnSphere landing page.

## 4. Try it out

Use the demo accounts from the backend seed data (password `password123` for all):
- Student: `student@example.com`
- Teacher: `teacher@example.com`
- Admin: `admin@example.com`

Suggested flow to explore everything:
1. Log in as the **student** → go to "AI Study Plan" → generate a syllabus.
2. Browse **Courses** → open the sample course → enroll (it's discounted/mock-paid, so it goes
   through instantly).
3. Go to your **Dashboard** to see the enrolled course and progress bar.
4. Visit **Community** → join "JEE Physics Aspirants" → open the sample doubt post → try
   "AI suggest answer".
5. Visit **Practice** → generate an AI quiz → take it → see your scored results with explanations.
6. Log out, log back in as the **teacher** → go to Teacher Dashboard → "New course" → try
   "AI-generate outline".
7. Log in as **admin** → visit `/admin` to see the user management panel.

## 5. Project structure

```
src/
  api/          One file per backend module — thin wrappers around axios calls
  components/
    layout/     Navbar, Footer, Layout wrapper, ProtectedRoute
    ui/         Reusable UI: Spinner, EmptyState, Modal, CourseCard
  context/      AuthContext — global login state, persisted via localStorage token
  pages/        One component per route/page (see App.jsx for the full route list)
  utils/        Shared constants (streams, exam tags, currency formatting)
  App.jsx       All routes
  main.jsx      Entry point (providers, router, toaster)
  index.css     Tailwind + design system (buttons, cards, inputs, badges)
```

## 6. Build for production

```bash
npm run build
```
Outputs static files to `dist/` — deployable to any static host (Vercel, Netlify, Cloudflare Pages
free tiers all work well) once you point `VITE_API_BASE_URL` at your deployed backend.

## 7. Notes

- Auth token is stored in `localStorage` and attached automatically to every API request.
- If you see network errors on any page, double-check the backend is running and
  `VITE_API_BASE_URL` in `.env` matches its address.
- AI features (study plan, quiz generation, doubt assist, course outline) work immediately with
  the backend's built-in fallback templates — no AI key required to demo them.
