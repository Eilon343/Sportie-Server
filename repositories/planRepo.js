const { dbConnection } = require('../db_connection');

exports.planRepo = {
    async savePlan({ traineeId, goal, daysPerWeek }, exerciseRows) {
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
