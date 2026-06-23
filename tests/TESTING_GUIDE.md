# Tests Folder Guide

Plain-English summary of every script here, plus exactly what you need to run them.

These are **manual scripts**, not an automated suite — `npm test` does not run them.
You invoke each one by hand and read its `PASS`/`FAIL` lines (or printed tables).

There are two kinds:

- **Diagnostics (read-only):** connect to the database and print tables. Safe to run anytime, no server needed.
- **Verifications (HTTP tests):** also need the **server running on `http://localhost:3000`**. The "safe" ones create their own throwaway data and clean it up, and hard-refuse to touch real ids `101/102/103`.

---

## Prerequisites (do this once)

1. **Node 18+** — the verification scripts use the global `fetch`, which only exists on Node 18 and newer. Check with `node -v`.
2. **Install dependencies** (needed for `mysql2`, `dotenv`, `bcrypt`):
   ```bash
   npm install
   ```
3. **Create a `.env` file** in the project root with the database credentials. Every script calls `require('dotenv').config()` and reads these:
   ```env
   DB_HOST=<your-tidb-host>
   DB_PORT=4000
   DB_USERNAME=<user>
   DB_PASSWORD=<password>
   DB_NAME=<database>
   ```
   The connection uses TLS (`ssl.rejectUnauthorized: true`), so the host must present a trusted certificate — the managed TiDB endpoint already does.

---

## How to run

Run **every** script from the **project root** (not from inside `tests/`), so the relative
`require('../db_connection')` and the `.env` lookup both resolve:

```bash
node tests/<file>.js [optional-arg]
```

For the **verification** scripts, start the server first in a second terminal and leave it running:

```bash
npm start        # or: npm run dev  (nodemon) — listens on PORT or 3000
```

> The verification scripts hard-code `http://localhost:3000`. If you set `PORT` to anything
> other than `3000`, they will not reach the server — run the server on `3000` for these tests.

---

## Diagnostics (read-only, no server needed)

**listTables.js** — `node tests/listTables.js`
Lists every table in the database (names only). Good first check that the DB connection (`.env` + SSL) works at all.

**describeTables.js** — `node tests/describeTables.js [table|all] [rowLimit]`
Shows **all tables with their columns AND their rows** (up to a limit). This is the one to use when you want to actually see the data.
- `node tests/describeTables.js` — every table, up to 50 rows each
- `node tests/describeTables.js users` — just the `users` table
- `node tests/describeTables.js meal_plans 200` — just `meal_plans`, up to 200 rows
- `node tests/describeTables.js all 200` — every table, up to 200 rows each

(A meal plan spans `meal_plans` → `meal_plan_slots` → `meal_plan_options`, so look at all three. Note: `users` rows include the password hash.)

**checkAnalyticsData.js** — `node tests/checkAnalyticsData.js`
Counts the analytics data (workout sessions, logged sets, metrics, plans) and shows sessions grouped by status. Use to confirm the analytics seed (`npm run seed:analytics`) actually loaded data.

**checkTemplatesState.js** — `node tests/checkTemplatesState.js`
Checks the Templates feature: whether the `is_active` columns exist (migration 005), lists real workout/meal template ids + owners, counts them, and shows one trainee's plans. Use this to **find real template ids** for testing.

**checkAssigned.js** — `node tests/checkAssigned.js [traineeId]` (default `12`)
Shows what a trainee has been assigned: their workout plans, the exercises in their active plan, and their meal plans. Use after an "assign template" call to confirm it worked.

**verifyPlan.js** — `node tests/verifyPlan.js [planId]` (default `60005`)
Looks up one saved plan and its exercises. Use after `POST /api/plans/save` to confirm the plan and its exercises were stored.

---

## Verifications (server must be running on :3000)

**verifyTrainers.js** — `node tests/verifyTrainers.js [trainerId]` (default `1`)
Hits the trainer endpoints and prints `PASS`/`FAIL`: GET returns 200 with the right fields, lists are arrays, and **no password is ever leaked**. Read-only (no deletes). It also prints trainer ids + trainee counts so you can pick a target for the delete test below.

**verifyTrainerDeleteSafe.js** — `node tests/verifyTrainerDeleteSafe.js`
Full DELETE-trainer test. Creates its own trainer + trainee, deletes the trainer via the API, proves the trainee survives (unassigned), then cleans up. Takes no arguments — only touches the ids it creates.

**verifyUsers.js** — `node tests/verifyUsers.js`
Tests change-password (`PUT /api/users/:id/password`). Creates its own user, calls the endpoint, proves the stored hash actually changed (via `bcrypt`), and checks no password/hash leaks in responses. Cleans up after itself.

**verifyAuth.js** — `node tests/verifyAuth.js`
Tests signup + login through the real endpoints, and checks no password/hash is leaked. Uses a throwaway account that it inserts a trainer profile for, then deletes.

> ⚠️ **Known issue:** `verifyAuth.js` imports `../../db_connection` (two folders up) while every
> other script in this folder uses `../db_connection` (the project root). Since this file now lives
> in `tests/`, the correct path is `../db_connection`. If it crashes on startup with a "module not
> found" error for `db_connection`, fix that import line and re-run.

---

## Quick reference

| Script | Needs server? | Args | Writes to DB? |
| --- | --- | --- | --- |
| `listTables.js` | no | — | no |
| `describeTables.js` | no | `[table\|all] [rowLimit]` | no |
| `checkAnalyticsData.js` | no | — | no |
| `checkTemplatesState.js` | no | — | no |
| `checkAssigned.js` | no | `[traineeId]` (12) | no |
| `verifyPlan.js` | no | `[planId]` (60005) | no |
| `verifyTrainers.js` | yes | `[trainerId]` (1) | no |
| `verifyTrainerDeleteSafe.js` | yes | — | yes (throwaway only) |
| `verifyUsers.js` | yes | — | yes (throwaway only) |
| `verifyAuth.js` | yes | — | yes (throwaway only) |
