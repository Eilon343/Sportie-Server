require('dotenv').config();
const { dbConnection } = require('./db_connection');

// Throwaway read-only check for a saved plan. Reuses db_connection.js (same mysql2 +
// SSL/TiDB config as checkAnalyticsData.js). No writes.
//
// Usage: node verifyPlan.js [planId]   (defaults to 60005)

const planId = process.argv[2] || 60005;

async function verify() {
    const conn = await dbConnection.createConnection();
    try {
        const [plan] = await conn.execute('SELECT * FROM training_plans WHERE plan_id = ?', [planId]);
        console.log(`\n[1] training_plans WHERE plan_id = ${planId}:`);
        console.table(plan);

        const [exCount] = await conn.execute('SELECT COUNT(*) AS n FROM plan_exercises WHERE plan_id = ?', [planId]);
        console.log(`\n[2] plan_exercises count for plan_id = ${planId}:`);
        console.table(exCount);

        const [strengthCount] = await conn.execute(
            "SELECT COUNT(*) AS n FROM training_plans WHERE trainee_id = 2 AND goal = 'strength'"
        );
        console.log('\n[3] training_plans count WHERE trainee_id = 2 AND goal = \'strength\':');
        console.table(strengthCount);
    } catch (error) {
        console.error('Error verifying plan:', error);
        process.exitCode = 1;
    } finally {
        conn.end();
    }
}

verify();
