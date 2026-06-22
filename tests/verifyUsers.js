require('dotenv').config();
const { dbConnection } = require('../db_connection');
const bcrypt = require('bcrypt');

// Self-contained, SAFE verification for the users/changePassword refactor. Creates its
// OWN throwaway user, exercises the endpoint, proves the hash changed, then cleans up.
// Only ever touches the id it creates; HARD-REFUSES to target users 101/102/103.
//
// Usage: node verifyUsers.js   (server must be running on :3000)

const BASE = 'http://localhost:3000';
const FORBIDDEN_USER_IDS = [101, 102, 103];
const STAMP = Date.now();
const saltRounds = 10; // same as the app

const OLD_PASSWORD = 'oldPass123';
const NEW_PASSWORD = 'newPass456';

let pass = true;
// Logs a PASS/FAIL line and flips the overall result if something failed.
function check(ok, label) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) pass = false;
}

// Assert a fetch JSON body never carries a password/hash field.
function assertNoPasswordField(body, label) {
    const leaked = body && typeof body === 'object' && ('password' in body || 'hash' in body);
    check(!leaked, `${label}: no password/hash field in response body`);
}

// Calls the change-password endpoint and returns the status + parsed body.
async function putPassword(userId, payload) {
    const res = await fetch(`${BASE}/api/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    let body;
    const text = await res.text();
    try { body = JSON.parse(text); } catch (_) { body = text; }
    return { status: res.status, body };
}

// Tries wrong/mismatched/correct password changes and confirms the stored hash actually updated.
async function main() {
    const conn = await dbConnection.createConnection();
    let userId = null;

    try {
        // ---- 1. SETUP: throwaway user with a known password, hashed like the app ----
        console.log('=== 1. SETUP ===');
        const hash = await bcrypt.hash(OLD_PASSWORD, saltRounds);
        const [ins] = await conn.execute(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            [`_pwtest_${STAMP}@test.local`, hash, 'trainee']
        );
        userId = ins.insertId;
        console.log(`Created throwaway user_id=${userId}`);
        if (FORBIDDEN_USER_IDS.includes(Number(userId))) {
            throw new Error(`REFUSING: test user id ${userId} is a protected real user.`);
        }

        // ---- 2. WRONG current password -> 401 ----
        console.log('\n=== 2. WRONG current password -> 401 ===');
        let r = await putPassword(userId, {
            currentPassword: 'totally-wrong', newPassword: NEW_PASSWORD, confirmNewPassword: NEW_PASSWORD,
        });
        console.log(`status ${r.status}, body:`, r.body);
        check(r.status === 401, 'wrong current password returns 401');
        assertNoPasswordField(r.body, '  401');

        // ---- 3. new/confirm MISMATCH -> 400 ----
        console.log('\n=== 3. new/confirm MISMATCH -> 400 ===');
        r = await putPassword(userId, {
            currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD, confirmNewPassword: 'different999',
        });
        console.log(`status ${r.status}, body:`, r.body);
        check(r.status === 400, 'mismatch returns 400');
        assertNoPasswordField(r.body, '  400');

        // ---- 4. correct current + valid new -> 200 ----
        console.log('\n=== 4. correct current + valid new -> 200 ===');
        r = await putPassword(userId, {
            currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD, confirmNewPassword: NEW_PASSWORD,
        });
        console.log(`status ${r.status}, body:`, r.body);
        check(r.status === 200, 'valid change returns 200');
        assertNoPasswordField(r.body, '  200');

        // ---- 5. Prove the change took ----
        console.log('\n=== 5. PROVE the stored hash changed ===');
        const [rows] = await conn.execute('SELECT password FROM users WHERE user_id = ?', [userId]);
        const storedHash = rows[0].password;
        const newMatches = await bcrypt.compare(NEW_PASSWORD, storedHash);
        const oldMatches = await bcrypt.compare(OLD_PASSWORD, storedHash);
        check(newMatches, 'new password matches the now-stored hash');
        check(!oldMatches, 'old password no longer matches');

        console.log('\n=== Summary ===');
    } catch (error) {
        console.error('\nTest error:', error.message);
        pass = false;
    } finally {
        // ---- 7. CLEANUP — only the id this script created ----
        console.log('\n=== 7. CLEANUP ===');
        try {
            if (userId !== null && !FORBIDDEN_USER_IDS.includes(Number(userId))) {
                const [r] = await conn.execute('DELETE FROM users WHERE user_id = ? AND role = ?', [userId, 'trainee']);
                console.log(`Removed throwaway user ${userId} (rows: ${r.affectedRows})`);
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
