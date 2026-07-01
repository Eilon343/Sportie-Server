# Sportie — API Server

Sportie is a management platform for personal trainers. This repository holds the
server: a Node.js / Express REST API backed by a MySQL-compatible database (TiDB) and
integrated with two external catalogue APIs. The web client lives in a separate
repository.

## Overview

A trainer signs in and works with their roster of trainees. From there the server supports
the full workflow: maintaining trainee records, generating workout plans from a goal,
saving and editing those plans, building reusable workout and meal templates and assigning
them to trainees, and serving analytics computed from logged training sessions. Exercise
data comes from ExerciseDB and meal data from TheMealDB; exercises are cached locally so the
catalogue stays available and fast.

## Motivation

Trainers typically juggle plans, progress notes and client check-ins across spreadsheets and
chat apps. Sportie consolidates that into one model: a roster, a plan per trainee, reusable
templates, and analytics that flag who is falling behind — so the trainer spends time
coaching rather than bookkeeping.

## Main features

- Trainer accounts with bcrypt-hashed passwords and password change
- Trainee management: assign, update, unassign, profile edits
- Rule-based workout-plan generation from goal, days-per-week and target body parts
- Persisted training plans and meal plans with full read/update support
- Reusable workout and meal templates with per-trainer caps and assign-to-trainee
- Analytics: workouts-this-week, at-risk trainees, attendance distribution, improvement
  leaderboard, training-volume trend, engagement heatmap, per-trainee activity
- External catalogue integration (ExerciseDB, TheMealDB) with local exercise caching

## Architecture

Four clean layers, each with one responsibility:

```
routes/        URL → handler
controllers/   parse & validate input, own req/res, map errors to HTTP status
services/      business rules and DTO shaping (no SQL, no req/res)
schemas/       repositories — parameterised SQL only, one method per query
db/            connection, schema, migrations, seeders
```

Services raise domain errors tagged with an HTTP `status`, which controllers map directly to
the response code. All SQL is parameterised and isolated in repositories; multi-table writes
run inside transactions.

## Technologies

Node.js, Express 5, MySQL-compatible database (TiDB) via `mysql2/promise`, bcrypt, dotenv,
and the `xmlhttprequest` package used as the external-API HTTP client. `nodemon` is used in
development.

## Folder structure

```
Sportie-Server/
├── index.js                Bootstrap: env check, middleware, router mounting
├── routes/                 9 Express routers
├── controllers/            Request/response handlers
├── services/               Business logic + external-API clients
├── schemas/                Repositories (all database access)
├── utils/                  validation.js, avatar.js
├── db/                     connection.js, init.sql, migrations/, seeders, scripts
├── tests/                  manual verification scripts + TESTING_GUIDE.md
├── Sportie_API_Routes.md   Full 57-route reference
└── Backend Description.md   Architecture write-up
```

## Installation

```bash
git clone <server-repo-url>
cd Sportie-Server
npm install
```

## Environment variables

Create a `.env` file in the project root:

```
DB_HOST=<database host>
DB_PORT=<database port, e.g. 4000 for TiDB Cloud>
DB_USERNAME=<database user>
DB_PASSWORD=<database password>
DB_NAME=<database name, e.g. sportieDb>

EXERCISEDB_BASE_URL=<ExerciseDB base URL>
EXERCISEDB_HOST=<RapidAPI host>
EXERCISEDB_KEY=<RapidAPI key>

MEALDB_BASE_URL=<TheMealDB base URL>

PORT=3000
```

The server performs a startup check and refuses to boot if any required variable
(`DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `EXERCISEDB_BASE_URL`,
`EXERCISEDB_HOST`, `EXERCISEDB_KEY`, `MEALDB_BASE_URL`) is missing.

## Running locally

```bash
npm run db:init           # create the schema (init.sql)
npm run db:seed           # seed users / trainers / trainees
npm run db:seed:analytics # seed analytics data (optional)
npm start                 # start the server (nodemon) on PORT
```

Helper scripts: `npm run db:migrate`, `npm run db:list`, `npm run db:describe`.

## Deployment

The server is deployed on Render; the production base URL referenced by the client is
`https://sportie-server.onrender.com/api`. Any Node host works — set the same environment
variables in the host's dashboard and point `start` at `index.js`. The database runs on a
managed MySQL-compatible service (TiDB Cloud) with TLS enabled.

## REST API overview

Base path `/api`. The full catalogue (57 routes) with example requests, success responses
and error responses is in `Sportie_API_Routes.md` and the published Postman collection.

| Area | Examples |
|---|---|
| Auth | `POST /api/auth/signup`, `POST /api/auth/login` |
| Trainers | `GET /api/trainers/:id`, `PUT /api/trainers/:id/profile`, `POST /api/trainers/:id/trainees` |
| Trainees | `GET /api/trainees/trainer/:trainerId`, `PUT /api/trainees/:id/profile` |
| Exercises | `GET /api/exercises`, `GET /api/exercises/search/:name` |
| Meals | `GET /api/meals/search?q=`, `GET /api/meals/category/:category` |
| Plans | `POST /api/plans/generate`, `POST /api/plans/save`, `GET /api/plans/active/:traineeId` |
| Templates | `GET/POST/PUT/DELETE /api/templates/workout` and `/meal`, `POST .../:id/assign` |
| Analytics | `GET /api/analytics/leaderboard/:trainerId`, `/at-risk/:trainerId`, `/engagement-heatmap/:trainerId` |
| Users | `PUT /api/users/:userId/password` |

Every endpoint returns clear JSON for both success and failure, with conventional status
codes (200/201 success; 400/401/403/404/409/413 client errors; 500 server error).

## Authentication and roles

Passwords are hashed with bcrypt. Sign-up creates a trainer account (the `users` and
`trainers` rows) in one transaction; login verifies the credentials and returns the trainer
profile. The schema defines a `trainer`/`trainee` role enum, but only trainers authenticate
through the API — trainees are records a trainer manages. Login is a stateless credential
check that returns no token; see `Backend Description.md` (§8, §16) for the security
implications.

## External API integration

- **ExerciseDB (RapidAPI)** — exercise catalogue, filters and search; responses are cached
  into the local `exercises` table, with the database served first and the API as fallback.
- **TheMealDB** — meal search, lookup, categories and filters for the meal builder.

Both integrations are load-bearing: they feed the plan generator and the meal builder.

## Database

MySQL-compatible (TiDB), accessed through `mysql2/promise` over TLS. The consolidated schema
is in `db/init.sql` (base schema plus migrations 001–008); incremental changes live in
`db/migrations/`. Core tables cover users, trainers, trainees, exercises, training plans and
their exercises, logged workout sessions and sets, body metrics, and workout/meal templates
and plans. Foreign keys cascade where children cannot outlive their parent.

> Note: `db/init.sql` currently lags the repository code on a few columns (see
> `Backend Description.md` §18). The live database includes them; the schema file should be
> reconciled.

## Future improvements

- Issue a token/session at login and add an auth middleware that binds callers to the ids
  they operate on
- Replace per-call connections with a real `mysql2` connection pool
- Normalise 500 responses to JSON and stop echoing raw error text
- Add a migration-history table and an automated test suite
- Reconcile `db/init.sql` with the live schema

## Contributors

Eilon and Yaniv (project authors).

## License

ISC (see `package.json`).
