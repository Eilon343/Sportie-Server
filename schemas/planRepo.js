const { dbConnection } = require('../db/connection');

exports.planRepo = {
    // Confirms a trainee exists, so we can 404 a bad trainee_id up front instead of
    // letting the training_plans INSERT fail on its foreign key (500).
    async traineeExists(traineeId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            'SELECT 1 FROM trainees WHERE trainee_id = ? LIMIT 1',
            [traineeId]
        );
        return rows.length > 0;
    },

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

    // Reads a trainee's active meal plan with all its slots and options.
    async getActiveMealPlan(traineeId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            `SELECT
                mp.meal_plan_id, mp.name, mp.created_at,
                mp.total_calories, mp.total_protein, mp.total_carbs, mp.total_fat,
                mps.slot_id, mps.slot_index, mps.slot_label,
                mpo.option_id, mpo.meal_name, mpo.meal_thumb, mpo.notes,
                mpo.quantity, mpo.unit,
                mpo.calories_per_100, mpo.protein_per_100,
                mpo.carbs_per_100, mpo.fat_per_100
             FROM meal_plans mp
             LEFT JOIN meal_plan_slots mps ON mps.meal_plan_id = mp.meal_plan_id
             LEFT JOIN meal_plan_options mpo ON mpo.slot_id = mps.slot_id
             WHERE mp.trainee_id = ? AND mp.is_active = 1
             ORDER BY mps.slot_index, mpo.option_id`,
            [traineeId]
        );
        return rows.length ? rows : null;
    },

    // Updates a meal plan's name and macros, wipes its slots/options, then re-inserts them atomically.
    async updateMealPlanTx(planId, { name, slots, totals }) {
        const t = totals || {};
        const connection = await dbConnection.createConnection();
        try {
            await connection.beginTransaction();

            const [existing] = await connection.execute(
                'SELECT meal_plan_id FROM meal_plans WHERE meal_plan_id = ?',
                [planId]
            );
            if (existing.length === 0) {
                await connection.rollback();
                return false;
            }

            await connection.execute(
                `UPDATE meal_plans
                 SET name = ?, total_calories = ?, total_protein = ?, total_carbs = ?, total_fat = ?
                 WHERE meal_plan_id = ?`,
                [name, t.calories || 0, t.protein || 0, t.carbs || 0, t.fat || 0, planId]
            );

            // Deleting slots cascades to meal_plan_options via FK.
            await connection.execute(
                'DELETE FROM meal_plan_slots WHERE meal_plan_id = ?',
                [planId]
            );

            for (let i = 0; i < (slots || []).length; i++) {
                const slot = slots[i];
                const [slotResult] = await connection.execute(
                    'INSERT INTO meal_plan_slots (meal_plan_id, slot_index, slot_label) VALUES (?, ?, ?)',
                    [planId, i, slot.label || `Meal ${i + 1}`]
                );
                const slotId = slotResult.insertId;

                if (slot.options && slot.options.length > 0) {
                    const optionRows = slot.options.map(o => [
                        slotId,
                        o.mealdb_id || null,
                        o.name || '',
                        o.thumb || null,
                        o.notes || null,
                        o.quantity || 100,
                        o.unit || 'g',
                        o.calories_per_100 || o.per100?.calories || 0,
                        o.protein_per_100  || o.per100?.protein  || 0,
                        o.carbs_per_100    || o.per100?.carbs    || 0,
                        o.fat_per_100      || o.per100?.fat      || 0,
                        o.sugar_per_100    || o.per100?.sugar    || 0,
                        o.fiber_per_100    || o.per100?.fiber    || 0,
                    ]);
                    await connection.query(
                        `INSERT INTO meal_plan_options
                         (slot_id, mealdb_id, meal_name, meal_thumb, notes, quantity, unit,
                          calories_per_100, protein_per_100, carbs_per_100, fat_per_100,
                          sugar_per_100, fiber_per_100)
                         VALUES ?`,
                        [optionRows]
                    );
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.end();
        }
    },

    // Updates a plan's basics, then wipes and re-adds its exercises, all in one transaction.
    async updatePlanTx(planId, { goal, daysPerWeek }, exerciseRows) {
        const connection = await dbConnection.createConnection();
        try {
            await connection.beginTransaction();
            // Confirm the plan exists first (an UPDATE's affectedRows is 0 when the
            // values are unchanged, so it can't tell "missing" from "no-op").
            const [existing] = await connection.execute(
                `SELECT plan_id FROM training_plans WHERE plan_id = ?`,
                [planId]
            );
            if (existing.length === 0) {
                await connection.rollback();
                return false;
            }
            await connection.execute(
                `UPDATE training_plans SET goal = ?, days_per_week = ? WHERE plan_id = ?`,
                [goal, daysPerWeek, planId]
            );
            await connection.execute(
                `DELETE FROM plan_exercises WHERE plan_id = ?`,
                [planId]
            );

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
