require('dotenv').config();
const { dbConnection } = require('../db_connection');

// Throwaway verification for the trainers refactor. Runs HTTP checks (Node global fetch
// against the running server) + read-only SQL checks (reuse db_connection.js). No writes
// (the delete test lives in a separate, explicitly-guarded script).
//
// Usage: node verifyTrainers.js [trainerId]   (default 1)

const BASE = 'http://localhost:3000';
const trainerId = process.argv[2] || 1;

let passed = 0;
let failed = 0;
function check(ok, label) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (ok) passed++; else failed++;
}

async function httpChecks() {
    console.log('\n=== HTTP checks ===');

    // 1. GET trainer by id -> 200, has email + date_of_birth, NO password.
    try {
        const res = await fetch(`${BASE}/api/trainers/${trainerId}`);
        const body = await res.json();
        check(res.status === 200, `GET /api/trainers/${trainerId} -> status 200 (got ${res.status})`);
        check('email' in body, '  has "email" key');
        check('date_of_birth' in body, '  has "date_of_birth" key');
        const hasPassword = 'password' in body;
        console.log(`  ${hasPassword ? 'LEAK! password present' : 'no password field ✓'}`);
        check(!hasPassword, '  password NOT present');
    } catch (e) {
        check(false, `GET /api/trainers/${trainerId} threw: ${e.message}`);
    }

    // 2. GET all trainers -> 200, Array.
    try {
        const res = await fetch(`${BASE}/api/trainers`);
        const body = await res.json();
        check(res.status === 200, `GET /api/trainers -> status 200 (got ${res.status})`);
        check(Array.isArray(body), `  body is an Array (length ${Array.isArray(body) ? body.length : 'n/a'})`);
    } catch (e) {
        check(false, `GET /api/trainers threw: ${e.message}`);
    }

    // 3. GET monthly-activity -> 200, Array of {month_index, trainee_count}.
    try {
        const res = await fetch(`${BASE}/api/trainers/${trainerId}/monthly-activity`);
        const body = await res.json();
        check(res.status === 200, `GET /api/trainers/${trainerId}/monthly-activity -> status 200 (got ${res.status})`);
        check(Array.isArray(body), '  body is an Array');
        if (Array.isArray(body) && body.length) {
            console.log('  first element keys:', Object.keys(body[0]));
        } else {
            console.log('  (empty array — no activity rows for this trainer)');
        }
    } catch (e) {
        check(false, `GET monthly-activity threw: ${e.message}`);
    }
}

async function sqlChecks(conn) {
    console.log('\n=== SQL checks (read-only) ===');

    const [trainers] = await conn.execute('SELECT trainer_id, name FROM trainers LIMIT 10');
    console.log('\n[4] trainers (LIMIT 10) — valid ids:');
    console.table(trainers);

    const [counts] = await conn.execute(
        'SELECT trainer_id, COUNT(*) AS trainees FROM trainees WHERE trainer_id IS NOT NULL GROUP BY trainer_id'
    );
    console.log('\n[5] trainee counts per trainer — pick one WITH trainees for the delete test:');
    console.table(counts);
}

async function main() {
    await httpChecks();

    const conn = await dbConnection.createConnection();
    try {
        await sqlChecks(conn);
    } catch (error) {
        console.error('SQL checks error:', error);
        process.exitCode = 1;
    } finally {
        conn.end();
    }

    console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) process.exitCode = 1;

    console.log('\nDelete test is NOT run here. To test deleteTrainer separately:');
    console.log('  1. From [5] above, pick a trainer_id that HAS trainees (note their trainee_ids).');
    console.log('  2. Run:  node verifyTrainerDelete.js <trainerId>');
    console.log('     It will DELETE that trainer and assert the trainees survive with trainer_id = NULL.');
}

main();
