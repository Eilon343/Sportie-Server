require('dotenv').config();
const { dbConnection } = require('../db/connection');

// Throwaway read-only diagnostic. Reuses the app's db_connection.js (same mysql2 +
// SSL/TiDB config as migrate.js). No writes, no schema changes.

const queries = [
    { label: 'workout_sessions count', sql: 'SELECT COUNT(*) AS n FROM workout_sessions' },
    { label: 'logged_sets count', sql: 'SELECT COUNT(*) AS n FROM logged_sets' },
    { label: 'trainee_metrics count', sql: 'SELECT COUNT(*) AS n FROM trainee_metrics' },
    {
        label: 'workout_sessions by status',
        sql: `SELECT status, COUNT(*) AS n, MIN(performed_at) AS min_perf, MAX(performed_at) AS max_perf
              FROM workout_sessions GROUP BY status`,
    },
    { label: 'training_plans count', sql: 'SELECT COUNT(*) AS trainees_with_plan FROM training_plans' },
];

// Runs each diagnostic query and prints the results as a table.
async function check() {
    const conn = await dbConnection.createConnection();
    try {
        for (let i = 0; i < queries.length; i++) {
            const { label, sql } = queries[i];
            const [rows] = await conn.query(sql);
            console.log(`\n[${i + 1}] ${label}:`);
            console.table(rows);
        }
    } catch (error) {
        console.error('Error running diagnostics:', error);
        process.exitCode = 1;
    } finally {
        conn.end();
    }
}

check();
