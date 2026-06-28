require('dotenv').config();
const { dbConnection } = require('../../db/connection');

// Self-contained, SAFE verification for the auth refactor. Creates a throwaway trainer
// via the REAL signup endpoint, then (because signup only makes a users row â€” the known
// gap) inserts a trainers profile via SQL so the login-success path can be exercised.
// Only ever touches the id it creates; HARD-REFUSES to target users 101/102/103.
//
// Usage: node verifyAuth.js   (server must be running on :3000)

const BASE = 'http://localhost:3000';
const FORBIDDEN_USER_IDS = [101, 102, 103];
const STAMP = Date.now();
const EMAIL = `_authtest_${STAMP}@test.local`;
const PASSWORD = 'authPass123';

let pass = true;
// Logs a PASS/FAIL line and flips the overall result if something failed.
function check(ok, label) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) pass = false;
}

// Sends a POST to the running server and returns the status + parsed body.
async function post(path, payload) {
    const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch (_) { body = text; }
    return { status: res.status, body, text };
}

// Fails the test if a response ever leaks a password or hash field.
function assertNoSecret(text, label) {
    const leaked = /"password"|"hash"/i.test(text);
    check(!leaked, `${label}: no password/hash field anywhere in response`);
}

// Walks through signup/login and checks each step behaves and stays secret.
async function main() {
    const conn = await dbConnection.createConnection();
    let userId = null;

    try {
        // ---- 1. signup fresh email -> success { message } ----
        console.log('=== 1. signup (fresh) ===');
        let r = await post('/api/auth/signup', { email: EMAIL, password: PASSWORD });
        console.log(`status ${r.status}, body:`, r.body);
        check(r.status === 201, 'fresh signup returns 201');
        check(r.body && typeof r.body === 'object' && 'message' in r.body, '  body is { message }');
        assertNoSecret(r.text, '  signup');

        // resolve the new user_id (so we can give it a trainer profile + clean up)
        const [urows] = await conn.execute('SELECT user_id FROM users WHERE email = ?', [EMAIL]);
        check(urows.length === 1, 'throwaway user exists in DB');
        userId = urows[0].user_id;
        console.log(`  created user_id=${userId}`);
        if (FORBIDDEN_USER_IDS.includes(Number(userId))) {
            throw new Error(`REFUSING: test user id ${userId} is a protected real user.`);
        }

        // ---- 2. signup SAME email -> 400 duplicate ----
        console.log('\n=== 2. signup (duplicate) ===');
        r = await post('/api/auth/signup', { email: EMAIL, password: PASSWORD });
        console.log(`status ${r.status}, body:`, r.body);
        check(r.status === 400, 'duplicate signup returns 400');

        // setup: give the throwaway user a trainers profile (signup doesn't create one)
        await conn.execute(
            'INSERT INTO trainers (trainer_id, name, specialization) VALUES (?, ?, ?)',
            [userId, '_AUTHTEST_trainer', '_authtest']
        );

        // ---- 3. login wrong password -> 401 ----
        console.log('\n=== 3. login (wrong password) ===');
        r = await post('/api/auth/login', { email: EMAIL, password: 'wrong-password' });
        console.log(`status ${r.status}, body:`, r.body);
        check(r.status === 401, 'wrong password returns 401');

        // ---- 4. login correct -> 200, EXACTLY { message, trainer }, no secret ----
        console.log('\n=== 4. login (correct) ===');
        r = await post('/api/auth/login', { email: EMAIL, password: PASSWORD });
        console.log(`status ${r.status}`);
        check(r.status === 200, 'correct login returns 200');

        const body = r.body;
        const topKeys = body && typeof body === 'object' ? Object.keys(body).sort() : [];
        check(JSON.stringify(topKeys) === JSON.stringify(['message', 'trainer']),
            `  response is EXACTLY { message, trainer } (got ${JSON.stringify(topKeys)})`);
        const trainer = body && body.trainer;
        check(trainer && typeof trainer === 'object', '  trainer is an object');
        if (trainer) console.log('  trainer keys:', Object.keys(trainer));
        check(trainer && 'trainer_id' in trainer, '  trainer has trainer_id (session contract)');
        check(!(trainer && 'password' in trainer), '  trainer has NO password key');
        assertNoSecret(r.text, '  login');
    } catch (error) {
        console.error('\nTest error:', error.message);
        pass = false;
    } finally {
        // ---- 5. CLEANUP â€” only the id this script created (cascade removes trainers row) ----
        console.log('\n=== 5. CLEANUP ===');
        try {
            if (userId !== null && !FORBIDDEN_USER_IDS.includes(Number(userId))) {
                const [d] = await conn.execute('DELETE FROM users WHERE user_id = ? AND role = ?', [userId, 'trainer']);
                console.log(`Removed throwaway user ${userId} (rows: ${d.affectedRows}; trainers row cascades)`);
            }
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError.message);
        }
        conn.end();
        console.log(`\n=== ${pass ? 'ALL CHECKS PASSED' : 'FAILURES DETECTED'} ===`);
        if (!pass) process.exitCode = 1;
    }
}

main();
