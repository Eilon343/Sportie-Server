const { dbConnection } = require('../db_connection');

// All training-plan persistence SQL lives here. Parameterized.

exports.planRepo = {
    // Saves a plan and its exercises ATOMICALLY on ONE connection in ONE transaction:
    //   INSERT training_plans -> capture insertId -> bulk INSERT plan_exercises -> commit.
    // exerciseRows are partial rows WITHOUT plan_id (built by the service); this method
    // prepends the new planId to each. Any failure rolls BOTH inserts back. Returns planId.
    async savePlanTx({ traineeId, goal, daysPerWeek }, exerciseRows) {
        const connection = await dbConnection.createConnection();
        try {
            await connection.beginTransaction();

            const [planResult] = await connection.execute(
                `INSERT INTO training_plans (trainee_id, goal, days_per_week) VALUES (?, ?, ?)`,
                [traineeId, goal, daysPerWeek]
            );
            const planId = planResult.insertId;

            if (exerciseRows.length > 0) {
                const values = exerciseRows.map((row) => [planId, ...row]);
                await connection.query(
                    `INSERT INTO plan_exercises
                     (plan_id, exercise_id, custom_exercise_name, day_index, sets, reps, rest_seconds)
                     VALUES ?`,
                    [values]
                );
            }

            await connection.commit();
            return planId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.end();
        }
    },
};
