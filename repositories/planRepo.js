const { dbConnection } = require('../db_connection');

exports.planRepo = {
    async savePlan({ traineeId, goal, daysPerWeek }, exerciseRows) {
        const connection = await dbConnection.createConnection();
        try {
            await conn.beginTransaction();

            const [planResult] = await conn.execute(
                `INSERT INTO training_plans (trainee_id, goal, days_per_week) VALUES (?, ?, ?)`,
                [traineeId, goal, daysPerWeek]
            );
            const planId = planResult.insertId;

            if (exerciseRows.length > 0) {
                const values = exerciseRows.map((row) => [planId, ...row]);
                await conn.query(
                    `INSERT INTO plan_exercises
                     (plan_id, exercise_id, custom_exercise_name, day_index, sets, reps, rest_seconds)
                     VALUES ?`,
                    [values]
                );
            }

            await conn.commit();
            return planId;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    // Gets a trainee's current active plan and all its exercises (joined from plan_exercises and exercises).
    async getActivePlanByTraineeId(traineeId) {
        const pool = await dbConnection.createConnection();
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
                  tp.trainee_id = ?
                  AND tp.is_active = 1
                ORDER BY
                  pe.day_index ASC;
                    `;
            const [rows] = await pool.execute(query, [traineeId]);
            return rows;
        } catch (error) {
            console.error('Error fetching active plan:', error);
            throw new Error('Failed to fetch active training plan');
        }
    },

    // Pulls one plan and its exercises by plan id (joins plan_exercises and exercises).
    async getPlanById(planId) {
        const pool = await dbConnection.createConnection();
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
            const [rows] = await pool.execute(query, [planId]);
            return rows;
        } catch (error) {
            console.error('Error fetching plan by ID: ', error);
            throw new Error('Failed to fetch training plan by ID');
        }
    },

    // Updates a plan's basics, then wipes and re-adds its exercises, all in one transaction.
    async updatePlanTx(planId, { goal, daysPerWeek }, exerciseRows) {
        const pool = await dbConnection.createConnection();
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            await conn.execute(
                `UPDATE training_plans SET goal = ?, days_per_week = ? WHERE plan_id = ?`,
                [goal, daysPerWeek, planId]
            );
            await conn.execute(
                `DELETE FROM plan_exercises WHERE plan_id = ?`,
                [planId]
            );

            if (exerciseRows.length > 0) {
                const values = exerciseRows.map((row) => [planId, ...row]);
                await conn.query(
                    `INSERT INTO plan_exercises
                     (plan_id, exercise_id, custom_exercise_name, day_index, sets, reps, rest_seconds)
                     VALUES ?`,
                    [values]
                );
            }

            await conn.commit();
            return true;
        } catch (error) {
            await conn.rollback();
            console.error('Transaction failed, rolled back:', error);
            throw error;
        } finally {
            conn.release();
        }
    }
};
