require('dotenv').config();
const { dbConnection } = require('../db_connection');

// Self-contained, SAFE deleteTrainer test. Creates its OWN throwaway trainer + trainee,
// deletes the trainer via the API, proves the trainee survives unassigned, then cleans up.
// It only ever touches the ids it creates, and HARD-REFUSES to target trainers 101/102/103.
//
// Usage: node verifyTrainerDeleteSafe.js   (server must be running on :3000)

const BASE = 'http://localhost:3000';
const FORBIDDEN_TRAINER_IDS = [101, 102, 103];
const STAMP = Date.now(); // unique suffix so re-runs don't collide on the unique email

async function main() {
    const conn = await dbConnection.createConnection();
    let testTrainerId = null;
    let testTraineeId = null;
    let pass = true;

    try {
        // ---- 1. SETUP ----
        console.log('=== 1. SETUP ===');
        const [trainerUser] = await conn.execute(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            [`_deltest_trainer_${STAMP}@test.local`, '_deltest_placeholder', 'trainer']
        );
        testTrainerId = trainerUser.insertId;
        await conn.execute(
            'INSERT INTO trainers (trainer_id, name, specialization) VALUES (?, ?, ?)',
            [testTrainerId, '_DELTEST_trainer', '_deltest']
        );

        const [traineeUser] = await conn.execute(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            [`_deltest_trainee_${STAMP}@test.local`, '_deltest_placeholder', 'trainee']
        );
        testTraineeId = traineeUser.insertId;
        await conn.execute(
            'INSERT INTO trainees (trainee_id, name, trainer_id) VALUES (?, ?, ?)',
            [testTraineeId, '_DELTEST_trainee', testTrainerId]
        );
        console.log(`Created test trainer_id=${testTrainerId}, test trainee_id=${testTraineeId}`);

        // Guardrail: never delete a real trainer.
        if (FORBIDDEN_TRAINER_IDS.includes(Number(testTrainerId))) {
            throw new Error(`REFUSING: test trainer id ${testTrainerId} is a protected real trainer (101/102/103).`);
        }

        // ---- 2. VERIFY SETUP ----
        console.log('\n=== 2. VERIFY SETUP ===');
        const [before] = await conn.execute(
            'SELECT trainee_id, trainer_id FROM trainees WHERE trainee_id = ?',
            [testTraineeId]
        );
        const setupOk = before.length === 1 && Number(before[0].trainer_id) === Number(testTrainerId);
        console.log(`${setupOk ? 'PASS' : 'FAIL'}  trainee ${testTraineeId} has trainer_id = ${testTrainerId}`);
        console.table(before);
        if (!setupOk) pass = false;

        // ---- 3. DELETE via API ----
        console.log('\n=== 3. DELETE via API ===');
        const res = await fetch(`${BASE}/api/trainers/${testTrainerId}`, { method: 'DELETE' });
        const body = await res.text();
        console.log(`DELETE /api/trainers/${testTrainerId} -> status ${res.status}`);
        console.log('body:', body);
        const deleteOk = res.status === 200;
        console.log(`${deleteOk ? 'PASS' : 'FAIL'}  delete returned 200`);
        if (!deleteOk) pass = false;

        // ---- 4. PROVE SURVIVAL ----
        console.log('\n=== 4. PROVE SURVIVAL ===');
        const [after] = await conn.execute(
            'SELECT trainee_id, trainer_id FROM trainees WHERE trainee_id = ?',
            [testTraineeId]
        );
        const survived = after.length === 1 && after[0].trainer_id === null;
        console.log(survived ? 'trainee survived, unassigned ✓' : 'DATA LOSS!');
        console.log(`${survived ? 'PASS' : 'FAIL'}  trainee ${testTraineeId} still exists with trainer_id IS NULL`);
        console.table(after);
        if (!survived) pass = false;

        const [trainerGone] = await conn.execute('SELECT trainer_id FROM trainers WHERE trainer_id = ?', [testTrainerId]);
        const [userGone] = await conn.execute('SELECT user_id FROM users WHERE user_id = ?', [testTrainerId]);
        const gone = trainerGone.length === 0 && userGone.length === 0;
        console.log(`${gone ? 'PASS' : 'FAIL'}  test trainer+user rows are gone (cascade) — trainers:${trainerGone.length} users:${userGone.length}`);
        if (!gone) pass = false;
    } catch (error) {
        console.error('\nTest error:', error.message);
        pass = false;
    } finally {
        // ---- 5. CLEANUP — only the ids this script created ----
        console.log('\n=== 5. CLEANUP ===');
        try {
            if (testTraineeId !== null) {
                // Deleting the trainee's user row cascades to the trainees row.
                const [r] = await conn.execute('DELETE FROM users WHERE user_id = ? AND role = ?', [testTraineeId, 'trainee']);
                console.log(`Removed throwaway trainee user ${testTraineeId} (rows: ${r.affectedRows})`);
            }
            // Defensive: if the API delete didn't run/succeed, remove the throwaway trainer too.
            if (testTrainerId !== null && !FORBIDDEN_TRAINER_IDS.includes(Number(testTrainerId))) {
                const [r] = await conn.execute('DELETE FROM users WHERE user_id = ? AND role = ?', [testTrainerId, 'trainer']);
                if (r.affectedRows > 0) console.log(`Removed leftover throwaway trainer user ${testTrainerId}`);
            }
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError.message);
        }
        conn.end();
        console.log(`\n=== Summary: ${pass ? 'ALL CHECKS PASSED' : 'FAILURES DETECTED'} ===`);
        if (!pass) process.exitCode = 1;
    }
}

main();
