# Sportie — Backend Technical Description

This document describes the Sportie API server. It is written against the source code in
this repository. The implementation is treated as the source of truth; where the schema
file and the running code disagree, both are reported (see §18).

## 1. Overview

`Sportie-Server` is a Node.js / Express REST API for a personal-training management
application. Trainers authenticate, manage their trainees, generate and persist workout and
meal plans, maintain reusable templates, and read analytics computed from logged training
data. Exercise and meal catalogue data are sourced from two external public APIs
(ExerciseDB via RapidAPI, and TheMealDB) and, for exercises, cached locally.

The codebase follows a conventional four-layer architecture:

```
HTTP request
  → routes/         (URL → handler binding)
  → controllers/    (parse & validate params, own req/res, map errors to HTTP status)
  → services/       (business rules, DTO shaping; no SQL, no req/res)
  → schemas/        (repositories: parameterised SQL only, one method per query)
  → db/connection.js (MySQL-compatible connection)
```

Modules are CommonJS and run on Express 5.

## 2. Folder structure

```
Sportie-Server/
├── index.js                 App bootstrap, middleware, router mounting
├── routes/                  9 Express routers
├── controllers/             9 controllers (one per resource)
├── services/                Business logic + external-API clients
├── schemas/                 Repositories (all SQL lives here)
├── utils/                   validation.js (id check), avatar.js (data-URI check)
├── db/                      connection, schema (init.sql), migrations, seeders, scripts
├── tests/                   manual verification scripts + TESTING_GUIDE.md
├── Sportie_API_Routes.md    Full 57-route reference with request/response examples
├── .env                     Configuration (git-ignored)
└── package.json
```

## 3. Server initialisation (`index.js`)

The bootstrap is intentionally small and explicit:

1. `dotenv.config()` loads `.env`, then a **fail-fast check** verifies that every required
   variable is present (`DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`,
   `EXERCISEDB_BASE_URL`, `EXERCISEDB_HOST`, `EXERCISEDB_KEY`, `MEALDB_BASE_URL`). If any is
   missing the process logs the names and exits with code 1, so the server never starts in a
   half-configured state.
2. Middleware, in order: `cors()`, `express.json({ limit: '2mb' })`,
   `express.urlencoded({ extended: true, limit: '2mb' })`. The 2 MB cap accommodates
   base64-encoded avatar images.
3. The nine routers are mounted under their `/api/*` prefixes.
4. `GET /` is a health check returning `Server is running!`.
5. A focused error-handling middleware converts body-parser "payload too large" failures
   (HTTP 413) into a friendly JSON message about image size; anything else is forwarded to
   Express's default handler.
6. `app.listen(process.env.PORT || 3000)`.

There is no static-file middleware (the client is hosted separately) and no global
request-logging middleware.

## 4. REST API design

The API is resource-oriented and uses HTTP verbs and status codes conventionally
(GET read, POST create, PUT update, DELETE remove; 200/201 success, 400/401/403/404/409/413
client errors, 500 server error). Responses are JSON. The full catalogue is **57 routes**,
documented end-to-end with example requests, success responses and error responses in
`Sportie_API_Routes.md`, and published as a Postman collection.

### Route summary

| Prefix | Router | Routes |
|---|---|---|
| `/api/auth` | `authRouter` | `POST /signup`, `POST /login` |
| `/api/trainers` | `trainersRouter` | list, get, monthly-activity, update profile, delete, assign/update/unassign trainee |
| `/api/trainees` | `traineesRouter` | by-trainer, by-id, update own profile |
| `/api/exercises` | `exerciseRouter` | bodyparts, targets, equipment, search, by-id, filtered list |
| `/api/meals` | `mealRouter` | search, by-letter, random, categories, by category/area/ingredient, dropdown lists, by-id |
| `/api/plans` | `planRouter` | generate, save, active plan, get/update by id, active meal plan, update meal plan |
| `/api/users` | `usersRouter` | `PUT /:userId/password` |
| `/api/analytics` | `analyticsRouter` | workouts-this-week, at-risk, attendance-distribution, leaderboard, volume-over-time, engagement-heatmap, trainee weekly activity, trainee recent sessions |
| `/api/templates` | `templatesRoutes` | workout & meal template CRUD + assign-to-trainee |

CRUD is implemented fully across the domain — for example training plans
(`POST /api/plans/save`, `GET /api/plans/:planId`, `PUT /api/plans/:planId`) and templates
(`POST/GET/PUT/DELETE /api/templates/workout` and `/meal`).

Within `exerciseRouter`, literal paths (`/bodyparts`, `/targets`, `/equipment`) are declared
before the `/:id` parameter route so they are matched first.

## 5. Controllers

Each controller is a single exported object whose methods own `req`/`res` and HTTP
concerns. The consistent pattern is:

```js
async someAction(req, res) {
  try {
    const result = await someService.someAction(req.params, req.body);
    res.status(200).json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    res.status(500).json({ message: '...: ' + error.message });
  }
}
```

Controllers validate path parameters up front with `utils/validation.isInvalidId`, which
distinguishes a malformed id (400) from a missing resource (404). Services raise
domain errors carrying an `error.status`, which the controller maps straight to the response
code — keeping HTTP knowledge out of the service layer.

## 6. Services

Services hold the business rules and shape DTOs; they contain no SQL and no `req`/`res`.
Notable services:

- **`authService`** — bcrypt hashing/verification and the login envelope (see §8).
- **`planGeneratorService`** — the rule-based workout generator (see §12).
- **`planService`** — persists generated plans, reads the active plan, updates plans, and
  reads/updates meal plans with recalculated macro totals.
- **`templatesService`** — transactional template create/update/delete/assign with
  per-trainer caps and ownership checks.
- **`analyticsService`** — orchestrates the analytics repository and performs the
  aggregation maths (attendance buckets, leaderboard percentages).
- **`exerciseService` / `mealService` / `httpClient`** — external-API clients (see §11).

Errors that should become specific HTTP responses are created with a local
`httpError(status, message)` helper that tags `err.status`.

## 7. Repositories (`schemas/`)

All database access is isolated in repository modules — `authRepo`, `usersRepo`,
`trainersRepo`, `traineesRepo`, `exerciseRepo`, `planRepo`, `templatesRepo`,
`analyticsRepo`. Each exposes one async method per query and uses **parameterised mysql2
statements** (`?` placeholders) exclusively, so user input never reaches SQL as a string.
Multi-table writes (template save/update/assign, plan save, trainer deletion) run inside
explicit transactions with rollback on error.

### Concrete trace — `POST /api/auth/login`

1. `authRouter` binds `POST /login` to `authController.login`.
2. The controller calls `authService.login(req.body)` and returns `200` with the result, or
   maps `error.status` otherwise.
3. The service looks up the user (`authRepo.findUserByEmail`) → 401 if absent; compares the
   password with `bcrypt.compare` → 401 on mismatch; loads the trainer profile
   (`authRepo.findTrainerById`) → 403 if none; returns `{ message, trainer }`.
4. The repository runs `SELECT * FROM users WHERE email = ?` and
   `SELECT * FROM trainers WHERE trainer_id = ?` over a fresh connection.

## 8. Authentication

- **Password hashing** uses `bcrypt` with `saltRounds = 10`. Passwords are hashed on
  sign-up, compared on login and on password change, and re-hashed when changed. Plain
  passwords are never stored or returned.
- **Sign-up** hashes the password, derives a default display name from the email prefix, and
  atomically inserts the `users` and `trainers` rows. The role is fixed to `trainer`;
  trainees are not self-registered. A duplicate email surfaces as `ER_DUP_ENTRY` → 400.
- **Login** verifies the credentials and returns the trainer profile object.

The server issues **no token, session or cookie**. Login is a stateless credential check
that returns the profile; the client holds "logged-in" state on its side. This is an
explicit characteristic of the system and is revisited under Security (§16).

## 9. Authorization

There is a single role (`users.role ENUM('trainer','trainee')`; no admin). Authorization is
not enforced by middleware but by **ownership checks inside specific services and
repositories**:

- A trainer can only update or unassign a trainee that belongs to them (the update query is
  scoped `WHERE trainee_id = ? AND trainer_id = ?`).
- Assigning a template verifies that the target trainee is managed by the template's
  trainer, otherwise it returns **403**.

Because no endpoint authenticates the caller, these checks rely on ids supplied by the
client. The consequence is documented under Security (§16).

## 10. Validation

- `utils/validation.isInvalidId(value)` — the shared id guard, rejecting anything that is
  not a positive integer; used by virtually every controller.
- `utils/avatar.validateAvatar(value)` — accepts an empty value (clearing the avatar),
  requires a `data:image/...` data-URI prefix otherwise, and rejects payloads above a fixed
  character cap; failures become 413.
- Remaining validation is per-controller and explicit: required-field checks, a numeric
  regex on meal ids, a single-letter regex on the meals-by-letter route, and the
  password-change rules (all fields present, new equals confirm, minimum length). The
  services whitelist the specific fields they read from the body, which limits
  mass-assignment. No schema-validation library is used.

## 11. External APIs

External calls go through `services/httpClient.js`, a small GET-only client built on the
`xmlhttprequest` package. `buildUrl` assembles a base URL, path and query string (dropping
empty params and URL-encoding values); `getJSON` resolves parsed JSON and rejects with the
status and body on a non-2xx response.

- **ExerciseDB (RapidAPI)** — `services/exerciseService.js`. Base URL from
  `EXERCISEDB_BASE_URL`; authenticated with RapidAPI headers built from `EXERCISEDB_KEY` and
  `EXERCISEDB_HOST`. Provides exercises by body part / target / equipment, by id, by name,
  and the body-part/target/equipment option lists. Results are cached into the local
  `exercises` table (`INSERT IGNORE`); the exercises endpoints serve from the database first
  and fall back to the API.
- **TheMealDB** — `services/mealService.js`. Base URL from `MEALDB_BASE_URL` (the keyless
  free tier). Provides meal search, lookup by id, random meal, categories, filters by
  category/area/ingredient, and dropdown lists.

The external API is a genuine, load-bearing part of the system: it populates the exercise
library that drives the plan generator and the meal library that drives the meal builder.

## 12. Plan generator (`planGeneratorService.js`)

The generator is deterministic and rule-based — no randomness, no machine learning:

- A goal maps to a fixed prescription: `strength` → 4×5 with 180s rest, `hypertrophy` →
  3×10 with 90s, `fat loss` → 3×15 with 45s. An unknown goal throws (→ 400).
- The requested body parts are spread one-per-day, round-robin, across the training days.
- For each day it pulls the appropriate number of exercises per focus body part from
  ExerciseDB and attaches the goal's sets/reps/rest.

The result is returned but **not persisted** — saving is a separate `POST /api/plans/save`,
keeping generation a pure, side-effect-free operation.

## 13. Database

- **Engine** — MySQL-compatible, accessed via `mysql2/promise`. Migration comments and
  `ADD COLUMN IF NOT EXISTS` usage indicate the production database is **TiDB**
  (MySQL-compatible, e.g. TiDB Cloud). The connection enables TLS
  (`ssl.rejectUnauthorized = true`) and `dateStrings: true` to avoid date timezone shifts.
- **Connections** — `db/connection.js` opens a fresh connection per repository call. Note
  that pool-style options (`waitForConnections`, `connectionLimit`) are passed to
  `createConnection`, which ignores them, so there is no real pooling today (see §17).
- **Schema** — `db/init.sql` consolidates the base schema with migrations 001–008 and is
  re-runnable (`CREATE TABLE IF NOT EXISTS`). Core entities and their relationships:

| Table | Purpose | Key relationships |
|---|---|---|
| `users` | credentials + role | PK `user_id` |
| `trainers` | trainer profile | `trainer_id` = FK→`users` (cascade) |
| `trainees` | trainee record | `trainee_id` = FK→`users` (cascade), `trainer_id` FK→`trainers` |
| `trainer_monthly_activity` | monthly active-trainee counts | FK→`trainers` |
| `exercises` | cached exercise catalogue | PK `exercise_id` (string) |
| `training_plans` / `plan_exercises` | a trainee's workout plan and its exercises | FK chain to `trainees`, `exercises` |
| `workout_sessions` / `logged_sets` | logged training (drives analytics) | FK→`trainees`, `training_plans`, `exercises` |
| `trainee_metrics` | body-weight / body-fat / muscle-mass measurements | FK→`trainees`, unique per (trainee, type, date) |
| `workout_templates` / `_blocks` / `_exercises` | reusable workout templates | FK chain to `trainers` |
| `meal_templates` / `_slots` / `meal_slot_options` | reusable meal templates with per-100g macros | FK chain to `trainers` |
| `meal_plans` / `_slots` / `meal_plan_options` | a trainee's assigned meal plan | FK chain to `trainees` |

Foreign keys cascade on delete where a child cannot outlive its parent (e.g. deleting a
trainee removes their plans, sessions and metrics) and set null where it can (a logged set
keeps its history if the source exercise is removed).

### Complex queries

The analytics repository satisfies the requirement for non-trivial, statistics-style
queries. All are parameterised and join across tables. Examples:

- **Workouts this week** — counts completed sessions in the current Sunday-start week via
  `YEARWEEK(performed_at, 2) = YEARWEEK(CURDATE(), 2)`, joined trainee→trainer.
- **At-risk trainees** — `LEFT JOIN` with `GROUP BY` and `HAVING` to surface trainees with
  no completed session in the last seven days, never-trained first.
- **Attendance distribution**, **leaderboard**, **volume-over-time** and the **engagement
  heatmap** use further aggregation over `workout_sessions`, `logged_sets` and
  `trainee_metrics` (sums, percentage change, per-week bucketing).

## 14. Error handling

Each controller wraps its work in `try/catch`, maps tagged `error.status` values to the
matching HTTP code, and otherwise returns 500. Status usage is consistent: 201 for creates,
401 for bad credentials, 403 for cross-trainer access, 404 for missing resources, 409 for
duplicate email / template-cap, 413 for oversized avatars. Repositories catch database
errors, roll back transactions, and re-raise. The only global error middleware handles
body-parser overflow. One inconsistency exists — some 500 branches respond with plain text
that includes the raw error message (see §17).

## 15. Logging and configuration

- **Logging** is `console.log` / `console.error` only; there is no logging library or log
  file. A successful connection logs a line on every call.
- **Configuration** is entirely environment-driven through `.env`. Variable names:
  `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `EXERCISEDB_BASE_URL`,
  `EXERCISEDB_HOST`, `EXERCISEDB_KEY`, `MEALDB_BASE_URL`, `PORT`. The file is git-ignored;
  no secrets are committed.
- **npm scripts** cover the database lifecycle: `db:init`, `db:migrate`, `db:seed`,
  `db:seed:analytics`, `db:list`, `db:describe`, plus `start`/`dev` (nodemon).
- **Dependencies**: `express`, `cors`, `mysql2`, `bcrypt`, `dotenv`, `xmlhttprequest`
  (runtime) and `nodemon` (dev).

## 16. Security considerations

- **No authentication on the wire.** Login issues no token; no endpoint authenticates the
  caller. Combined with client-supplied ids, this means the API is effectively open and is
  exposed to insecure-direct-object-reference access (e.g. reading any trainer, or changing
  any user's password given only the old one). This is the most important property for a
  reviewer to understand; hardening it would mean issuing a token/session at login and adding
  an auth middleware that binds the caller to the ids they operate on.
- **CORS is open** (`cors()` with no options).
- **SQL injection** is well guarded — queries are parameterised. The only interpolated SQL is
  a `LIMIT` value in `exerciseRepo`, which is sanitised to an integer with `parseInt(...) ||
  20` and is therefore not exploitable as written, though binding it as a parameter would be
  cleaner.
- **Secrets** are kept out of source control (`.env` git-ignored), and passwords are bcrypt
  hashed.
- **Error verbosity** — the plain-text 500 branches leak internal error messages and should
  return generic JSON instead.

## 17. Scalability and maintainability

**Strengths.** The layering is clean and consistent — routes, controllers, services and
repositories have single, well-separated responsibilities, which makes the system easy to
extend and test by layer. SQL is centralised in repositories, transactions protect
multi-table writes, and the external-API integration is isolated behind a single client.
Configuration is fully externalised, and the database lifecycle is scripted.

**Areas to improve.**

- **Connection pooling** — a real `mysql2` pool should replace the per-call
  `createConnection`; the current pattern opens and closes a connection on every query.
- **Error responses** — normalise the plain-text 500s to JSON and stop echoing raw error
  messages.
- **Logging** — adopt a structured logger and drop the per-connection success log and the
  remaining `[DEBUG]` request-body logs in `templatesController`.
- **Migration tracking** — migrations rely on `IF NOT EXISTS` idempotency rather than a
  recorded migration history.
- **Testing** — `tests/` holds manual verification scripts and a guide, not an automated
  suite; the `test` npm script is a stub.

## 18. Notes for reviewers

- **`db/init.sql` is not fully in sync with the code.** The repositories read and write
  several columns that `init.sql` does not declare — `trainees.status`,
  `trainees.start_weight`, `trainees.current_weight`, and
  `exercises.category / secondary_muscles / instructions / description`. The live (TiDB)
  database evidently has these columns (the API reference shows them in responses), so the
  endpoints work in production, but a fresh `db:init` from `init.sql` alone would be missing
  them. The schema file should be reconciled with the repository code.
- **Plan router ordering is correct.** `GET /:planId` and `GET /meal-plan/:traineeId` do not
  collide: a single-segment parameter route cannot match a two-segment path, so both
  meal-plan routes are reachable.
- **Leftover debug logging** in `templatesController` prints full request bodies and should
  be removed.
- **Seed data** — `db/seed.js` truncates and reseeds users/trainers/trainees from
  `db/ListOfTrainees.json` (bcrypt-hashing the seed passwords); `db/seedAnalytics.js` seeds
  the analytics tables. Confirm `ListOfTrainees.json` contains only sample data.
- A few repository files begin with a UTF-8 BOM and one has mojibake in comments — cosmetic
  only.
