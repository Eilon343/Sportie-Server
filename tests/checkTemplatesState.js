require('dotenv').config();
const { dbConnection } = require('../db/connection');

// Throwaway, read-only script: checks the Templates feature DB state â€” whether the
// is_active columns exist (migration 005), what real template ids/owners are there,
// and how many templates exist. Uses the project's connectionection so TiDB's SSL cert is trusted.
async function check() {
    let connection;
    try {
        connection = await dbConnection.createConnection();

        const [trainingIsActive] = await connection.query("SHOW COLUMNS FROM training_plans LIKE 'is_active'");
        console.log('\n1) training_plans.is_active exists?', trainingIsActive.length > 0 ? 'YES' : 'NO');
        if (trainingIsActive.length > 0) console.table(trainingIsActive);

        const [mealIsActive] = await connection.query("SHOW COLUMNS FROM meal_plans LIKE 'is_active'");
        console.log('\n2) meal_plans.is_active exists?', mealIsActive.length > 0 ? 'YES' : 'NO');
        if (mealIsActive.length > 0) console.table(mealIsActive);

        const [workoutTemplates] = await connection.query(
            'SELECT template_id, name, trainer_id FROM workout_templates LIMIT 10'
        );
        console.log('\n3) workout_templates (up to 10):');
        console.table(workoutTemplates);

        const [mealTemplates] = await connection.query(
            'SELECT template_id, name, trainer_id FROM meal_templates LIMIT 10'
        );
        console.log('\n4) meal_templates (up to 10):');
        console.table(mealTemplates);

        const [[workoutCount]] = await connection.query('SELECT COUNT(*) AS cnt FROM workout_templates');
        const [[mealCount]] = await connection.query('SELECT COUNT(*) AS cnt FROM meal_templates');
        console.log('\n5) Counts:');
        console.table([
            { table: 'workout_templates', count: workoutCount.cnt },
            { table: 'meal_templates', count: mealCount.cnt },
        ]);

        const [trainee12Plans] = await connection.query(
            'SELECT plan_id, trainee_id, is_active FROM training_plans WHERE trainee_id = 12 ORDER BY plan_id DESC LIMIT 8'
        );
        console.log('\n6) trainee 12 plans (check is_active replace):');
        console.table(trainee12Plans);
    } catch (error) {
        console.error('Error checking templates state:', error);
        process.exitCode = 1;
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nDatabase connectionection closed.');
        }
    }
}

check();
