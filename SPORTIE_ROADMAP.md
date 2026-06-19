# Sportie Server — Backend Roadmap

Backend missions needed to make Sportie complete, ordered by priority: **Must-Have** (makes it *work*) → **Polish** (makes it *professional*) → **Stretch** (makes it *memorable*). Frontend work is tracked separately at the bottom under **Frontend Missions**.

---

## Where the backend stands today

**Backend (Node/Express + TiDB Cloud)**
- Auth: signup + login with bcrypt, login returns the trainer profile.
- Trainers, trainees endpoints reading from TiDB.
- `status` column added to trainees (active / paused / finished).
- Three API integrations live over HTTP, each as service → controller → router:
  - ExerciseDB (RapidAPI) — exercises, body parts, targets, equipment, search.
  - TheMealDB — search, filters, categories, random.
  - Plan generator — rules engine that builds a workout from goal + days + body parts.
- Plan persistence: `training_plans` + `plan_exercises` tables exist and `POST /api/plans/save` saves a generated plan to a trainee.
- Startup env-var guard in `index.js` fails fast when a required key is missing.
- **Trainer Analytics module** — the project's first fully-layered feature, mounted at `/api/analytics`: `routes/analyticsRoutes.js` → `controllers/analyticsController.js` (req/res only) → `services/analyticsService.js` (rules + DTO shaping) → `repositories/analyticsRepo.js` (all parameterized SQL). Five roster-wide, trainer-scoped analyses: at-risk trainees, attendance distribution, improvement leaderboard (body-weight % change or Epley est-1RM strength), volume-over-time (grouped by ISO week), and engagement heatmap. This `repositories/` layer is new and is the reference architecture for the rest of the backend.
- **Three analytics tables** — `workout_sessions`, `logged_sets`, `trainee_metrics` — defined in `migrations/001_analytics_tables.sql` (TiDB/MySQL types, FKs to existing `trainees`/`training_plans`/`exercises`/`plan_exercises`). This is the project's first migration; a one-shot runner `migrate.js` (`npm run migrate`) applies it. **These tables are NOT in `db_init.sql`** — they only exist after `npm run migrate`.
- **Analytics data tooling** — `seedAnalytics.js` (`npm run seed:analytics`) generates realistic sessions/sets/metrics across a 12-week window; `checkAnalyticsData.js` prints row-count diagnostics. Both reuse `db_connection.js`.

**What this means:** the spine of the backend works, generated plans can be saved, and the analytics **read** layer is built and serves as the clean architectural template (controller/service/repo). The remaining work is reading saved plans back, **write/logging endpoints to populate the analytics tables from the app** (today only the seed script writes them), security/auth hardening, quota protection, and the production layer.

---

## 0. Course submission requirements (graded) — alignment check

Derived from the course submission spec (`הגשת פרוייקט הקורס 2026`). These are **graded / blocking** — they outrank the nice-to-haves below. Only backend-relevant items are listed; frontend is referenced only where the backend must interoperate with it.

### Already aligned ✅
- [x] **Node.js + Express**, organized into `controllers/` + `services/` (+ `routers/`), with the analytics feature adding a `routes/` + `repositories/` layered reference (controller → service → repo).
- [x] **Full CRUD exists** — Create (signup, `assignTrainee`, `savePlan`), Read (trainees/trainers/exercises/meals/monthly activity/analytics), Update (`updateOwnProfile`, `updateManagedTrainee`, `changePassword`), Delete (`deleteTrainer`, `unassignTrainee`).
- [x] **≥2 "complex" queries** — JOIN (`getTrainerById` joins `trainers`+`users`), aggregation/stats (`getMonthlyActiveTrainees`), and the analytics repo's multi-table aggregations (ISO-week `YEARWEEK` grouping for volume/heatmap, `SUM(weight*reps)` volume, earliest-vs-latest leaderboard, attendance counts). Filtering by trainer/status also present.
- [x] **External public API tied to the domain** — ExerciseDB + TheMealDB are real parts of the system, not decorative.
- [x] **Git hygiene** — `.gitignore` excludes `node_modules/` and `.env`; neither is committed. (Spec forbids committing secrets / `node_modules`.)

### Required — still to do 🚧
- [ ] **Deploy to a public URL (BLOCKING).** Spec: *no localhost-only submission; the project must be reachable via a live link.* Backend on Render/Railway, DB on TiDB Cloud. Update CORS to the deployed frontend origin. *(Was listed under Stretch — it is actually mandatory.)*
- [ ] **Publish a Postman API Collection** covering every route, each with: short description, sample valid request, sample success response, and a sample error response where relevant. Save example responses in the collection. This is part of the API grade and a required deliverable.
- [ ] **Fix schema drift / fragmented schema setup (BLOCKING for the grader's DB setup).** Two problems: (a) the controllers read/write columns that `db_init.sql` does not create: `users.date_of_birth`, `users.country_code`, `users.phone_number`; `trainees.status`, `trainees.start_weight`, `trainees.current_weight`; `trainers.units`, `trainers.notifications_enabled`. (b) The three analytics tables live only in `migrations/001_analytics_tables.sql`, not `db_init.sql`. So a grader must run **both** `npm run db:init` **and** `npm run migrate` to get a working schema, and `db:init` alone still yields a schema the code crashes against. Reconcile: bring the code-implied columns into the canonical schema and document the init+migrate sequence (or fold the migration into the init path).
- [ ] **Consistent, clear success & error responses.** Several controllers still return plain-text errors (`res.send('Error ...')`) on 500 instead of JSON `{ message }`. Spec requires clear responses for both success and error — standardize on JSON `{ message }` everywhere. *(See 1.3.)*
- [ ] **User management completeness (10 pts).** Signup only creates a `users` row, not a `trainers` row, so a freshly signed-up trainer has no profile and can't log in. Close this (see 1.2).
- [ ] **Clean code (ES6, no dead code, meaningful names) (10 pts).** Remove leftover `console.log` debugging (see 2.4) and any unused code/routes.
- [ ] **Submission packaging** — include the `.env` file *inside* the ZIP (not committed to Git); record in the testers' notes which external APIs and which JS library were used, plus any setup steps. *(Documentation deliverable, not code.)*

---

## 1. Must-Have — makes the backend actually complete

### 1.1 Plan-saving database layer
The generator builds a plan and a trainer can now **save** it to a trainee. Saving is done; reading saved plans back is not yet wired.

- [x] Add the two tables — implemented as `training_plans` (plan_id, trainee_id, goal, days_per_week, created_at) and `plan_exercises` (plan_exercise_id, plan_id, exercise_id, custom_exercise_name, day_index, sets, reps, rest_seconds) in `db_init.sql`.
- [ ] `services/planService.js` + `repositories/planRepo.js` — DB layer (uses `dbConnection`), separate from the generator. *(Currently the save logic lives inline in `planController.js`; not yet extracted. The analytics feature — `services/analyticsService.js` + `repositories/analyticsRepo.js` — is now the working template to copy.)*
- [x] `controllers/planController.js` — save handler (`savePlan`) added alongside the generate handler.
- [ ] Read handlers in `planController.js` — fetch a trainee's plans / a single plan.
- [x] Endpoint `POST /api/plans/save` (save).
- [ ] Endpoints `GET /api/plans/trainee/:id` (a trainee's plans), `GET /api/plans/:id` (one plan).
- [x] Store only the ExerciseDB **id** + sets/reps (with a `custom_exercise_name` fallback); hydrate full details from ExerciseDB on read.

### 1.2 Signup flow (backend side)
The backend has `POST /api/auth/signup`, but it currently only creates a `users` row, not a `trainers` row — a new trainer would have no profile.

- [ ] Decide how a trainer profile gets created on signup, and create the `trainers` row as part of the signup transaction.
- [ ] Return enough data (or auto-login payload) for the frontend to continue after signup.

### 1.3 Error response shape
- [ ] Consistent error response shape across all controllers (`{ message }` everywhere) so the frontend can render user-friendly messages reliably. *(All controllers — including the new `analyticsController.js` — still return plain-text `res.status(500).send('Error ...')` on failures.)*

### 1.4 Analytics — write/logging endpoints
The analytics **read** API and its three tables exist, but nothing in the app writes to them yet — only `seedAnalytics.js` populates `workout_sessions` / `logged_sets` / `trainee_metrics`. The five analyses return empty until data is logged.

- [ ] `POST` endpoints (controller → service → `analyticsRepo`) to log a completed `workout_session`, its `logged_sets`, and a `trainee_metric` measurement — so real usage feeds the analytics instead of the seed script.
- [ ] Run `npm run migrate` as part of DB setup (the three tables are not created by `npm run db:init`).

---

## 2. Polish — makes the backend look professional

### 2.1 Security & auth hardening
Strong talking points for interviews.

- [ ] **JWT tokens.** Currently auth relies on session storage with no token. Add a JWT returned on login, sent as a `Bearer` header, verified by middleware on protected routes. This is the #1 thing that signals real backend understanding.
- [ ] **Protect the API routes.** Right now anyone can hit `/api/trainees/...` without auth. Add auth middleware so only logged-in trainers can read their data.
- [ ] **Authorization checks.** A trainer should only see *their own* trainees — enforce `trainer_id` matches the logged-in user, server-side (not just in the UI).
- [ ] **Tighten CORS.** Currently `Access-Control-Allow-Origin: *`. Lock it to your frontend origin.

### 2.2 Caching ExerciseDB (quota protection)
Your RapidAPI BASIC tier has a monthly request cap. Generating plans hammers it.

- [ ] Cache exercise data in a DB table (or in-memory with TTL) so repeated lookups don't burn quota.
- [ ] Cache the body-part / equipment / target lists (they basically never change).

### 2.3 Input validation
- [ ] Validate request bodies on the backend (e.g. plan generation: goal is valid, daysPerWeek is 1–7). A library like `zod` or `express-validator` is a nice signal.
- [ ] Sanitize/guard route params before they hit SQL (you're using parameterized queries already — good — but validate types).

### 2.4 Code consistency
- [x] Remove leftover `console.log` debugging statements — none remain in `controllers/`, `services/`, or `repositories/` (only `console.error` for genuine error logging; the standalone `db_init`/`seed`/`migrate`/`check` scripts legitimately log progress).
- [x] Add an env-var startup guard in `index.js` (fail fast if a key is missing) — implemented at `index.js` top (validates `DB_*`, `EXERCISEDB_*`, `MEALDB_BASE_URL`).
- [ ] Fix unused config: `DB_PORT` in `.env` is unused — `db_connection.js` doesn't read it (defaults apply).

### 2.5 README
- [ ] A real `README.md`: what the project is, architecture diagram (frontend → Express → TiDB + external APIs), setup steps, env variables needed, how to run it.
- [ ] This is the first thing anyone looks at. Make it good.

---

## 3. Stretch — makes the backend memorable

Only after 1 and 2.

- [ ] **Deploy the backend.** *(Actually mandatory per the submission spec — see §0.)* Backend on Render/Railway, DB already on TiDB Cloud. Update CORS + allowed origins for production.
- [~] **Progress tracking (API).** Schema + read side done: `workout_sessions` / `logged_sets` / `trainee_metrics` tables and the `/api/analytics` read endpoints exist. **Still missing the write endpoints** to log workout completion / sets / measurements from the app (tracked in §1.4) — today only the seed script writes this data.
- [ ] **Nutrition data.** TheMealDB has no macros. Integrate a nutrition API (Edamam/Spoonacular) so meal plans can show calories/protein — directly relevant for a fitness goal like fat loss.
- [ ] **LLM-personalized plans (Option B).** Layer Claude on top of the rules engine to personalize exercise selection by injury/preference, validated against ExerciseDB ids. Strong differentiator.
- [ ] **PDF export (API).** Generate a printable workout/meal plan document a trainer can hand to a trainee.
- [ ] **Tests.** A handful of backend endpoint tests (Jest + supertest) signals maturity.

---

## Suggested backend order of attack

1. **Plan-saving DB layer** (1.1) — save path is done; finish the read endpoints + extract `planService.js`/`planRepo.js` (copy the analytics layering).
2. **Analytics write endpoints** (1.4) — log sessions/sets/metrics so the analytics read API reflects real usage, not seed data.
3. **Trainer profile on signup** (1.2) — fixes a real data gap.
4. **JWT + route protection + authorization** (2.1) — biggest credibility boost for the effort.
5. **Caching + input validation** (2.2, 2.3) — protects quota and hardens the API.
6. **README + deploy** (2.5, 3) — so it's shareable and live.

---

## Honest backend gaps worth being able to explain

Interviewers respect knowing your own system's weak points:

- **No JWT yet** — session storage only; you know the upgrade path.
- **Trainer profile on signup** — signup creates a user but not a trainer profile.
- **No authorization** — API trusts the caller; a trainer could request another trainer's data.
- **ExerciseDB BASIC tier** — no GIFs, limited request quota; caching mitigates.
- **TheMealDB** — recipes only, no nutrition/macros.
- **`DB_PORT` in `.env` is unused** — `db_connection.js` doesn't read it (defaults apply).
- **Analytics tables are populated only by `seedAnalytics.js`** — there's no API to log real sessions/sets/metrics yet, so the analytics endpoints reflect seeded data, not live usage.
- **Schema is split across two files** — `db_init.sql` (core tables) and `migrations/001_analytics_tables.sql` (analytics tables); setup needs both `db:init` and `migrate`, and there's no migration tracking table.
- **Layering is inconsistent** — analytics is cleanly controller/service/repo, but trainers/trainees/users/auth/plans still inline raw SQL in their controllers (refactor target).

Being able to name these calmly is a feature, not a flaw.

---

# Frontend Missions

Tracked separately — these complete the project from the client side and depend on the backend endpoints above.

**Frontend stands today (plain HTML/CSS/JS)**
- Converted to ES modules.
- `dataService.js` / `authService.js` talk to the real backend (no more JSON mock).
- Login, dashboard (stats + monthly chart), and trainees page all read live from TiDB.
- Status badges and filtering working end to end.

### F1. Build the remaining pages
Each existing HTML mockup needs a page JS file (same pattern as `dashboard.js` / `trainees.js`): import service → fetch → render.

- [ ] **Templates page** — the plan generator UI (pick goal, days, body parts → generate → show plan → save to a trainee). This is the showcase page.
- [ ] **Trainee profile page** — clicking a trainee row currently only logs to console. Build the profile view: their info, status, progress, and saved plans.
- [ ] **Meals page** (or section) — search/browse TheMealDB, attach meals to a trainee's plan.
- [ ] **Analytics page** — the backend is ready (`/api/analytics`: at-risk, attendance-distribution, leaderboard, volume-over-time, engagement-heatmap). Build the page JS to fetch these and render the charts (e.g. volume-over-time line + engagement heatmap).
- [ ] **Settings page** — even if minimal, wire the trainer's own profile (name, specialization, avatar).
- [ ] **Messages page** — if not building real messaging, make it an honest "coming soon" rather than a dead mockup.

### F2. Signup flow (frontend side)
The login page has a sign-up toggle that currently routes through `login()`.

- [ ] Wire the sign-up branch in `formValidation.js` to actually POST to `/signup`.
- [ ] After signup, either auto-login or redirect to login with a success message.

### F3. Error & empty states
- [ ] Show user-friendly messages when a fetch fails (not just `console.error`).
- [ ] Handle empty data gracefully on every page (no trainees, no plans, no search results).
- [ ] Loading indicators while API calls are in flight (ExerciseDB calls can take a moment).

### F4. Code consistency
- [ ] Centralize the API base URL on the frontend (it's repeated in `dataService.js` and `authService.js` — pull into one shared constant/module).

### F5. Frontend stretch
- [ ] **Deploy the frontend** on Vercel/Netlify; update the API base URL for production.
- [ ] **Progress tracking UI** — let trainers log workout completion and watch the progress number / chart update.
- [ ] **Responsive design.** The fixed 1440×1024 canvas scaling works but isn't truly responsive — real mobile support is a plus.
