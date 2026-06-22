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
    },

    async getPlanById(planId) {
        const connection = await dbConnection.createConnection();
        try {
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
                  tp.plan_id = ?
                ORDER BY
                  pe.day_index ASC;
            `
            const [rows] = await connection.execute(query, [planId]);
            return rows;
        } catch (err) {
            console.error('Error fetching plan by ID: ', error);
            throw new Error('Failed to fetch training plan by ID');
        } finally {
            connection.end();
        }
    },

    async updatePlanTx(planId, { goal, daysPerWeek }, exerciseRows) {
        const connection = await dbConnection.createConnection();
        try {
            await connection.beginTransaction();
            //update main plans table
            await connection.execute(
                `UPDATE training_plans SET goal = ?, days_per_week = ? WHERE plan_id = ?`,
                [goal, daysPerWeek, planId]
            );
            //delete exercises on that plan
            await connection.execute(
                `DELETE FROM plan_exercises WHERE plan_id = ?`,
                [planId]
            );

            //reinsert exercises to that plan
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
            return true;
        } catch (error) {
            await connection.rollback();
            console.error('Transaction failed, rolled back:', error);
            throw error;
        } finally {
            connection.end();
        }
    }
};
