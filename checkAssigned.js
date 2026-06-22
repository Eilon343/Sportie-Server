require('dotenv').config();
const { dbConnection } = require('./db_connection');

// Throwaway, read-only script: shows what a trainee has been assigned — their workout
// plans, the exercises in their active plan, and their meal plans. Takes a traineeId
// from the command line (defaults to 12). Reuses the project's dbConnection.
const traineeId = process.argv[2] || 12;

async function check() {
    let connection;
    try {
        connection = await dbConnection.createConnection();

        const [workoutPlans] = await connection.query(
            'SELECT plan_id, trainee_id, goal, is_active FROM training_plans WHERE trainee_id = ? ORDER BY plan_id DESC',
            [traineeId]
        );
        console.log(`\n1) trainee ${traineeId} workout plans:`);
        console.table(workoutPlans);

        const [activeExercises] = await connection.query(
            `SELECT pe.plan_id, pe.day_index, pe.custom_exercise_name, pe.exercise_id, pe.sets, pe.reps
             FROM plan_exercises pe
             JOIN training_plans tp ON tp.plan_id = pe.plan_id
             WHERE tp.trainee_id = ? AND tp.is_active = 1`,
            [traineeId]
        );
        console.log(`\n2) exercises in trainee ${traineeId} active workout plan:`);
        console.table(activeExercises);

        const [mealPlans] = await connection.query(
            'SELECT meal_plan_id, trainee_id, name, source_template_id, is_active FROM meal_plans WHERE trainee_id = ? ORDER BY meal_plan_id DESC',
            [traineeId]
        );
        console.log(`\n3) trainee ${traineeId} meal plans:`);
        console.table(mealPlans);

        const [activeMeals] = await connection.query(
            `SELECT s.slot_index, s.slot_label, o.meal_name, o.quantity, o.unit,
                    o.calories_per_100, o.protein_per_100, o.carbs_per_100, o.fat_per_100
             FROM meal_plans mp
             JOIN meal_plan_slots s ON s.meal_plan_id = mp.meal_plan_id
             LEFT JOIN meal_plan_options o ON o.slot_id = s.slot_id
             WHERE mp.trainee_id = ? AND mp.is_active = 1
             ORDER BY s.slot_index, o.option_id`,
            [traineeId]
        );
        console.log(`\n4) slots + options in trainee ${traineeId} active meal plan:`);
        console.table(activeMeals);
    } catch (error) {
        console.error('Error checking assigned plans:', error);
        process.exitCode = 1;
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nDatabase connection closed.');
        }
    }
}

check();
