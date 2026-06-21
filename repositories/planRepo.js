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

    async getActivePlanByTraineeId(traineeId) {
        const connection = await dbConnection.createConnection();
        try {
            // This query fetches the latest active plan for the trainee, along with its exercises.
            const query = `
                  SELECT
                  tp.plan_id,
                  tp.goal,
                  tp.days_per_week,
                  tp.created_at,
                  pe.day_index,
                  pe.sets,
                  pe.reps,
                  pe.rest_seconds,
                  pe.exercise_id,
                  pe.custom_exercise_name,
                  e.name AS api_exercise_name
                FROM
                  training_plans tp
                  INNER JOIN plan_exercises pe ON tp.plan_id = pe.plan_id
                  LEFT JOIN exercises e ON pe.exercise_id = e.exercise_id
                WHERE
                  tp.trainee_id = ? 
                  AND tp.is_active = 1
                ORDER BY
                  pe.day_index ASC;
                    `;
            const [rows] = await connection.execute(query, [traineeId]);
            return rows;
        } catch (error) {
            console.error('Error fetching active plan:', error);
            throw new Error('Failed to fetch active training plan');
        } finally {
            connection.end();
        }
    }
};
