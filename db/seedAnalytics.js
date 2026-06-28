// Fills the analytics tables with fake-but-realistic workout history so the
// dashboards/leaderboards have something to show. Leaves the real user tables alone.
require('dotenv').config();
const { dbConnection } = require('./connection');

const GOALS = ['weight loss', 'muscle gain', 'endurance', 'general fitness', 'strength'];
const WINDOW_WEEKS = 12;
const STATEMENT_TIMEOUT_MS = 15000;

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}
function fmtDate(d) { return d.toISOString().slice(0, 10); }
function fmtDateTime(d) { return d.toISOString().slice(0, 19).replace('T', ' '); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

async function seed() {
    const conn = await dbConnection.createConnection();
    const counts = { training_plans: 0, workout_sessions: 0, logged_sets: 0, trainee_metrics: 0 };

    async function run(label, sql, params) {
        try {
            return await conn.execute(sql, params);
        } catch (e) {
            console.error(`\n!! INSERT FAILED [${label}]`);
            console.error('   SQL   :', sql.replace(/\s+/g, ' ').trim());
            console.error('   PARAMS:', JSON.stringify(params));
            console.error('   ERROR :', e.message);
            throw e;
        }
    }

    async function runBulk(label, sql, valuesArray) {
        try {
            return await conn.query(sql, [valuesArray]);
        } catch (e) {
            console.error(`\n!! BULK INSERT FAILED [${label}]`);
            console.error('   SQL   :', sql.replace(/\s+/g, ' ').trim());
            console.error('   ROWS  :', valuesArray.length, 'first:', JSON.stringify(valuesArray[0]));
            console.error('   ERROR :', e.message);
            throw e;
        }
    }

    function withTimeout(label, promise) {
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => {
                try { conn.destroy(); } catch (_) {}
                reject(new Error(`statement timed out after ${STATEMENT_TIMEOUT_MS}ms: ${label}`));
            }, STATEMENT_TIMEOUT_MS);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
    }

    async function cleanTable(table, deleteSql, deleteParams = []) {
        const [[{ n }]] = await withTimeout(`count ${table}`, conn.query(`SELECT COUNT(*) AS n FROM ${table}`));
        if (n === 0) { console.log(`  ${table} already empty, skipping`); return; }
        console.log(`  cleaning ${table}...`);
        const [res] = await withTimeout(`delete ${table}`, conn.query(deleteSql, deleteParams));
        console.log(`  cleaned ${table} (${res.affectedRows} rows)`);
    }

    try {
        console.log('Cleaning previous analytics data (FK-safe order)...');
        await cleanTable('logged_sets', 'DELETE FROM logged_sets');
        await cleanTable('workout_sessions', 'DELETE FROM workout_sessions');
        await cleanTable('trainee_metrics', 'DELETE FROM trainee_metrics');

        const [[{ n: planCount }]] = await withTimeout('count training_plans', conn.query('SELECT COUNT(*) AS n FROM training_plans'));
        if (planCount === 0) {
            console.log('  training_plans already empty, skipping');
        } else {
            const [allPlans]  = await withTimeout('select training_plans ids', conn.query('SELECT plan_id FROM training_plans'));
            const [realPlans] = await withTimeout('select plan_exercises ids', conn.query('SELECT DISTINCT plan_id FROM plan_exercises'));
            const realSet = new Set(realPlans.map((r) => r.plan_id));
            const barePlanIds = allPlans.map((r) => r.plan_id).filter((id) => !realSet.has(id));
            if (barePlanIds.length === 0) {
                console.log('  training_plans has no script-created (bare) plans, skipping');
            } else {
                console.log(`  cleaning training_plans (${barePlanIds.length} bare plans)...`);
                const placeholders = barePlanIds.map(() => '?').join(', ');
                const [res] = await withTimeout('delete training_plans',
                    conn.query(`DELETE FROM training_plans WHERE plan_id IN (${placeholders})`, barePlanIds));
                console.log(`  cleaned training_plans (${res.affectedRows} rows)`);
            }
        }

        const [trainees]      = await conn.query('SELECT trainee_id, name FROM trainees ORDER BY trainee_id');
        const [exRows]        = await conn.query('SELECT exercise_id FROM exercises LIMIT 50');
        const [existingPlans] = await conn.query(
            'SELECT trainee_id, MAX(plan_id) AS plan_id, MAX(days_per_week) AS days_per_week FROM training_plans GROUP BY trainee_id'
        );

        if (trainees.length === 0) {
            console.error('No trainees found — nothing to seed. (Protected tables are not modified.)');
            process.exitCode = 1;
            return;
        }
        if (exRows.length === 0) {
            console.warn('WARNING: exercises table is empty — logged_sets will use NULL exercise_id.');
        }

        const exerciseIds  = exRows.map((r) => r.exercise_id);
        const planByTrainee = new Map(existingPlans.map((r) => [r.trainee_id, r]));
        const profiles = ['consistent', 'sporadic', 'inactive'];

        for (let idx = 0; idx < trainees.length; idx++) {
            const t = trainees[idx];
            const profile = profiles[idx % profiles.length];

            let planId, daysPerWeek;
            if (planByTrainee.has(t.trainee_id)) {
                planId      = planByTrainee.get(t.trainee_id).plan_id;
                daysPerWeek = planByTrainee.get(t.trainee_id).days_per_week || randInt(2, 5);
            } else {
                daysPerWeek = randInt(2, 5);
                const createdAt = fmtDateTime(daysAgo(WINDOW_WEEKS * 7));
                const [res] = await run('training_plans',
                    'INSERT INTO training_plans (trainee_id, goal, days_per_week, created_at) VALUES (?, ?, ?, ?)',
                    [t.trainee_id, pick(GOALS), daysPerWeek, createdAt]);
                planId = res.insertId;
                counts.training_plans++;
            }

            for (let w = 0; w < WINDOW_WEEKS; w++) {
                let count;
                if (profile === 'consistent')    count = daysPerWeek;
                else if (profile === 'sporadic')  count = randInt(0, 2);
                else                              count = w >= 2 ? randInt(1, 3) : 0;

                for (let s = 0; s < count; s++) {
                    const dayOffset = w * 7 + randInt(0, 6);
                    const dt = daysAgo(dayOffset);
                    dt.setHours(18, randInt(0, 59), 0, 0);

                    const roll = Math.random();
                    let status = 'completed';
                    if (roll < 0.1)       status = 'missed';
                    else if (roll < 0.15) status = 'scheduled';
                    const performedAt = status === 'completed' ? fmtDateTime(dt) : null;

                    const [res] = await run('workout_sessions',
                        `INSERT INTO workout_sessions (trainee_id, plan_id, scheduled_date, performed_at, status)
                         VALUES (?, ?, ?, ?, ?)`,
                        [t.trainee_id, planId, fmtDate(dt), performedAt, status]);
                    counts.workout_sessions++;

                    if (status === 'completed') {
                        const weeksAgo = Math.floor(dayOffset / 7);
                        const setRows = [];
                        for (let e = 0; e < randInt(3, 5); e++) {
                            const exerciseId = exerciseIds.length ? pick(exerciseIds) : null;
                            const base   = randInt(20, 80);
                            const weight = base + (WINDOW_WEEKS - 1 - weeksAgo) * 2.5;
                            for (let setNum = 1; setNum <= randInt(3, 4); setNum++) {
                                setRows.push([res.insertId, exerciseId, null, setNum, randInt(5, 12), weight.toFixed(2)]);
                            }
                        }
                        if (setRows.length) {
                            await runBulk('logged_sets',
                                `INSERT INTO logged_sets (session_id, exercise_id, plan_exercise_id, set_number, reps, weight) VALUES ?`,
                                setRows);
                            counts.logged_sets += setRows.length;
                        }
                    }
                }
            }

            const baseWeight = randInt(60, 95);
            for (let w = 0; w <= WINDOW_WEEKS; w += 2) {
                const measuredAt = fmtDate(daysAgo(w * 7));
                const value = (baseWeight + (w / 2) * 0.4).toFixed(2);
                await run('trainee_metrics',
                    `INSERT INTO trainee_metrics (trainee_id, metric_type, value, measured_at) VALUES (?, 'body_weight', ?, ?)`,
                    [t.trainee_id, value, measuredAt]);
                counts.trainee_metrics++;
            }
        }

        console.log('\nSeed complete. Inserted rows per table:');
        console.table(counts);
    } catch (error) {
        console.error('\nSeeding aborted:', error.message);
        process.exitCode = 1;
    } finally {
        try { conn.end(); } catch (_) { try { conn.destroy(); } catch (__) {} }
    }
}

seed();
