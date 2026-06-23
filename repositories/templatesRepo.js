const { dbConnection } = require('../db_connection');

// WORKOUT TEMPLATES
exports.templatesRepo = {

    // Confirms a trainer exists, so we can 404 a bad trainer_id up front instead
    // of letting the INSERT blow up on the fk_wt_trainer foreign key (500).
    async trainerExists(trainerId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            'SELECT 1 FROM trainers WHERE trainer_id = ? LIMIT 1',
            [trainerId]
        );
        return rows.length > 0;
    },

    // Returns the trainee's owning trainer_id (which may be null if unassigned),
    // or undefined if there's no such trainee. Used on assign to confirm the
    // trainee both exists and belongs to the template's trainer.
    async getTraineeTrainerId(traineeId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            'SELECT trainer_id FROM trainees WHERE trainee_id = ?',
            [traineeId]
        );
        return rows.length ? rows[0].trainer_id : undefined;
    },

    // Counts how many workout templates a trainer already has (for the cap check).
    async countWorkoutTemplates(trainerId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            'SELECT COUNT(*) AS cnt FROM workout_templates WHERE trainer_id = ?',
            [trainerId]
        );
        return rows[0].cnt;
    },

    // Pulls one trainer's workout templates as flat joined rows (template + blocks + exercises).
    // LEFT JOINs so cardio/rest blocks (which have no exercises) still come back.
    async getWorkoutTemplateRowsByTrainer(trainerId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            `SELECT t.template_id, t.name, t.mode, t.goal, t.created_at,
                    b.block_id, b.block_index, b.label, b.block_type, b.notes,
                    e.id AS exercise_row_id, e.exercise_id, e.custom_exercise_name,
                    e.sets, e.reps, e.rest_seconds
             FROM workout_templates t
             LEFT JOIN workout_template_blocks b ON b.template_id = t.template_id
             LEFT JOIN workout_template_exercises e ON e.block_id = b.block_id
             WHERE t.trainer_id = ?
             ORDER BY t.template_id ASC, b.block_index ASC, e.id ASC`,
            [trainerId]
        );
        return rows;
    },

    // Same joined rows but for a single template (used by assign to read what to copy).
    async getWorkoutTemplateRowsById(templateId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            `SELECT t.template_id, t.trainer_id, t.name, t.mode, t.goal, t.created_at,
                    b.block_id, b.block_index, b.label, b.block_type, b.notes,
                    e.id AS exercise_row_id, e.exercise_id, e.custom_exercise_name,
                    e.sets, e.reps, e.rest_seconds
             FROM workout_templates t
             LEFT JOIN workout_template_blocks b ON b.template_id = t.template_id
             LEFT JOIN workout_template_exercises e ON e.block_id = b.block_id
             WHERE t.template_id = ?
             ORDER BY b.block_index ASC, e.id ASC`,
            [templateId]
        );
        return rows;
    },

    // Saves a whole workout template (template -> blocks -> exercises) in one transaction.
    // Only 'workout' blocks get exercise rows; cardio carries notes, rest carries nothing.
    async saveWorkoutTemplateTx(trainerId, { name, mode, goal, blocks }) {
        const connection = await dbConnection.createConnection();
        try {
            await connection.beginTransaction();

            const tplValues = [trainerId, name ?? null, mode ?? 'day-specific', goal ?? null]; // DEBUG temp
            console.log('[DEBUG] workout_templates values:', tplValues); // DEBUG temp
            const [tplResult] = await connection.execute(
                `INSERT INTO workout_templates (trainer_id, name, mode, goal) VALUES (?, ?, ?, ?)`,
                tplValues
            );
            const templateId = tplResult.insertId;

            for (const block of blocks) {
                // Frontend sends { index, label, type, notes, dayIndex, trainingLetter, exercises }.
                const blockType = block.type ?? 'workout';
                const blockValues = [templateId, block.index ?? null, block.label ?? null, blockType, block.notes ?? null]; // DEBUG temp
                console.log('[DEBUG] workout_template_blocks values:', blockValues); // DEBUG temp
                const [blockResult] = await connection.execute(
                    `INSERT INTO workout_template_blocks (template_id, block_index, label, block_type, notes)
                     VALUES (?, ?, ?, ?, ?)`,
                    blockValues
                );
                const blockId = blockResult.insertId;

                // Only workout blocks hold exercises; cardio/rest skip this insert entirely.
                if (blockType === 'workout' && Array.isArray(block.exercises) && block.exercises.length > 0) {
                    // Frontend sends exercise names (strings), not ExerciseDB ids → store as custom_exercise_name.
                    const values = block.exercises.map((ex) => [
                        blockId,
                        null,
                        ex.name ?? null,
                        ex.sets ?? null,
                        ex.reps ?? null,
                        ex.rest ?? null
                    ]);
                    console.log('[DEBUG] workout_template_exercises values:', values); // DEBUG temp
                    await connection.query(
                        `INSERT INTO workout_template_exercises
                         (block_id, exercise_id, custom_exercise_name, sets, reps, rest_seconds)
                         VALUES ?`,
                        [values]
                    );
                }
            }

            await connection.commit();
            return templateId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.end();
        }
    },

    // Deletes a workout template; FKs cascade-remove its blocks and exercises. Returns rows deleted.
    async deleteWorkoutTemplate(templateId) {
        const pool = await dbConnection.createConnection();
        const [result] = await pool.execute(
            'DELETE FROM workout_templates WHERE template_id = ?',
            [templateId]
        );
        return result.affectedRows;
    },

    // Edits a workout template in place (delete-and-reinsert, mirroring planRepo.updatePlanTx).
    // Returns false if the template doesn't exist (so the caller can 404), true otherwise.
    async updateWorkoutTemplateTx(templateId, { name, mode, goal, blocks }) {
        const connection = await dbConnection.createConnection();
        try {
            await connection.beginTransaction();

            const [existing] = await connection.execute(
                'SELECT template_id FROM workout_templates WHERE template_id = ?',
                [templateId]
            );
            if (existing.length === 0) {
                await connection.rollback();
                return false;
            }

            await connection.execute(
                `UPDATE workout_templates SET name = ?, mode = ?, goal = ? WHERE template_id = ?`,
                [name ?? null, mode ?? 'day-specific', goal ?? null, templateId]
            );

            // Drop the old blocks; the FK cascade clears their exercises too.
            await connection.execute(
                `DELETE FROM workout_template_blocks WHERE template_id = ?`,
                [templateId]
            );

            for (const block of (blocks ?? [])) {
                const blockType = block.type ?? 'workout';
                const [blockResult] = await connection.execute(
                    `INSERT INTO workout_template_blocks (template_id, block_index, label, block_type, notes)
                     VALUES (?, ?, ?, ?, ?)`,
                    [templateId, block.index ?? null, block.label ?? null, blockType, block.notes ?? null]
                );
                const blockId = blockResult.insertId;

                if (blockType === 'workout' && Array.isArray(block.exercises) && block.exercises.length > 0) {
                    const values = block.exercises.map((ex) => [
                        blockId,
                        null,
                        ex.name ?? null,
                        ex.sets ?? null,
                        ex.reps ?? null,
                        ex.rest ?? null
                    ]);
                    await connection.query(
                        `INSERT INTO workout_template_exercises
                         (block_id, exercise_id, custom_exercise_name, sets, reps, rest_seconds)
                         VALUES ?`,
                        [values]
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

    // After a new plan is saved (via planService.savePlan), flip every OTHER active plan
    // for the trainee to inactive so exactly the new plan stays active. One atomic update.
    async deactivateOtherActivePlansTx(traineeId, keepPlanId) {
        const connection = await dbConnection.createConnection();
        try {
            await connection.beginTransaction();
            await connection.execute(
                'UPDATE training_plans SET is_active = 0 WHERE trainee_id = ? AND plan_id <> ? AND is_active = 1',
                [traineeId, keepPlanId]
            );
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.end();
        }
    },

    // MEAL TEMPLATES 

    // Counts a trainer's meal templates (for the cap check).
    async countMealTemplates(trainerId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            'SELECT COUNT(*) AS cnt FROM meal_templates WHERE trainer_id = ?',
            [trainerId]
        );
        return rows[0].cnt;
    },

    // Pulls one trainer's meal templates as flat joined rows (template + slots + options w/ macros).
    async getMealTemplateRowsByTrainer(trainerId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            `SELECT t.template_id, t.name, t.created_at,
                    s.slot_id, s.slot_index, s.slot_label,
                    o.option_id, o.mealdb_id, o.meal_name, o.meal_thumb, o.notes,
                    o.quantity, o.unit, o.calories_per_100, o.protein_per_100,
                    o.carbs_per_100, o.fat_per_100, o.sugar_per_100, o.fiber_per_100
             FROM meal_templates t
             LEFT JOIN meal_template_slots s ON s.template_id = t.template_id
             LEFT JOIN meal_slot_options o ON o.slot_id = s.slot_id
             WHERE t.trainer_id = ?
             ORDER BY t.template_id ASC, s.slot_index ASC, o.option_id ASC`,
            [trainerId]
        );
        return rows;
    },

    // Same joined rows for a single meal template (used by assign to read what to copy).
    async getMealTemplateRowsById(templateId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            `SELECT t.template_id, t.trainer_id, t.name, t.created_at,
                    s.slot_id, s.slot_index, s.slot_label,
                    o.option_id, o.mealdb_id, o.meal_name, o.meal_thumb, o.notes,
                    o.quantity, o.unit, o.calories_per_100, o.protein_per_100,
                    o.carbs_per_100, o.fat_per_100, o.sugar_per_100, o.fiber_per_100
             FROM meal_templates t
             LEFT JOIN meal_template_slots s ON s.template_id = t.template_id
             LEFT JOIN meal_slot_options o ON o.slot_id = s.slot_id
             WHERE t.template_id = ?
             ORDER BY s.slot_index ASC, o.option_id ASC`,
            [templateId]
        );
        return rows;
    },

    // Saves a whole meal template (template -> slots -> options) in one transaction.
    async saveMealTemplateTx(trainerId, { name, slots, totals }) {
        const t = totals || {};
        const connection = await dbConnection.createConnection();
        try {
            await connection.beginTransaction();

            const [tplResult] = await connection.execute(
                `INSERT INTO meal_templates
                    (trainer_id, name, total_calories, total_protein, total_carbs, total_fat)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [trainerId, name ?? null, t.calories ?? 0, t.protein ?? 0, t.carbs ?? 0, t.fat ?? 0]
            );
            const templateId = tplResult.insertId;

            // Frontend sends slots as { label, options }; slot_index is derived from order (0,1,2…).
            for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
                const slot = slots[slotIndex];
                const [slotResult] = await connection.execute(
                    `INSERT INTO meal_template_slots (template_id, slot_index, slot_label) VALUES (?, ?, ?)`,
                    [templateId, slotIndex, slot.label ?? null]
                );
                const slotId = slotResult.insertId;

                if (Array.isArray(slot.options) && slot.options.length > 0) {
                    // meal_name is NOT NULL — drop options the frontend sent without a name.
                    const named = slot.options.filter((o) => o.name != null && o.name !== '');
                    if (named.length > 0) {
                        const values = named.map((o) => optionValuesFromPayload(slotId, o));
                        await connection.query(
                            `INSERT INTO meal_slot_options
                             (slot_id, mealdb_id, meal_name, meal_thumb, notes, quantity, unit,
                              calories_per_100, protein_per_100, carbs_per_100, fat_per_100, sugar_per_100, fiber_per_100)
                             VALUES ?`,
                            [values]
                        );
                    }
                }
            }

            await connection.commit();
            return templateId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.end();
        }
    },

    // Deletes a meal template; FKs cascade-remove its slots and options. Returns rows deleted.
    async deleteMealTemplate(templateId) {
        const pool = await dbConnection.createConnection();
        const [result] = await pool.execute(
            'DELETE FROM meal_templates WHERE template_id = ?',
            [templateId]
        );
        return result.affectedRows;
    },

    // Edits a meal template in place (delete-and-reinsert, mirroring planRepo.updatePlanTx).
    // Returns false if the template doesn't exist (so the caller can 404), true otherwise.
    async updateMealTemplateTx(templateId, { name, slots, totals }) {
        const t = totals || {};
        const connection = await dbConnection.createConnection();
        try {
            await connection.beginTransaction();

            const [existing] = await connection.execute(
                'SELECT template_id FROM meal_templates WHERE template_id = ?',
                [templateId]
            );
            if (existing.length === 0) {
                await connection.rollback();
                return false;
            }

            await connection.execute(
                `UPDATE meal_templates
                 SET name = ?, total_calories = ?, total_protein = ?, total_carbs = ?, total_fat = ?
                 WHERE template_id = ?`,
                [name ?? null, t.calories ?? 0, t.protein ?? 0, t.carbs ?? 0, t.fat ?? 0, templateId]
            );

            // Drop the old slots; the FK cascade clears their options too.
            await connection.execute(
                `DELETE FROM meal_template_slots WHERE template_id = ?`,
                [templateId]
            );

            const slotList = slots ?? [];
            for (let slotIndex = 0; slotIndex < slotList.length; slotIndex++) {
                const slot = slotList[slotIndex];
                const [slotResult] = await connection.execute(
                    `INSERT INTO meal_template_slots (template_id, slot_index, slot_label) VALUES (?, ?, ?)`,
                    [templateId, slotIndex, slot.label ?? null]
                );
                const slotId = slotResult.insertId;

                if (Array.isArray(slot.options) && slot.options.length > 0) {
                    const named = slot.options.filter((o) => o.name != null && o.name !== '');
                    if (named.length > 0) {
                        const values = named.map((o) => optionValuesFromPayload(slotId, o));
                        await connection.query(
                            `INSERT INTO meal_slot_options
                             (slot_id, mealdb_id, meal_name, meal_thumb, notes, quantity, unit,
                              calories_per_100, protein_per_100, carbs_per_100, fat_per_100, sugar_per_100, fiber_per_100)
                             VALUES ?`,
                            [values]
                        );
                    }
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

    // Reads a trainee's active meal plan with its stored day-total macros (for display).
    async getActiveMealPlan(traineeId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            `SELECT meal_plan_id, name, created_at,
                    total_calories, total_protein, total_carbs, total_fat
             FROM meal_plans
             WHERE trainee_id = ? AND is_active = 1
             LIMIT 1`,
            [traineeId]
        );
        return rows.length ? rows[0] : null;
    },

    // Copy-on-assign for meals, fully atomic: deactivate the trainee's current meal plan,
    // then create a new active meal_plan with all slots+options copied from the template.
    async assignMealTemplateTx(traineeId, sourceTemplateId, { name, slots, totals }) {
        const t = totals || {};
        const connection = await dbConnection.createConnection();
        try {
            await connection.beginTransaction();

            // Soft-replace: only one active meal plan per trainee.
            await connection.execute(
                'UPDATE meal_plans SET is_active = 0 WHERE trainee_id = ? AND is_active = 1',
                [traineeId]
            );

            const [planResult] = await connection.execute(
                `INSERT INTO meal_plans
                    (trainee_id, name, source_template_id, is_active,
                     total_calories, total_protein, total_carbs, total_fat)
                 VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
                [traineeId, name, sourceTemplateId ?? null,
                 t.calories ?? 0, t.protein ?? 0, t.carbs ?? 0, t.fat ?? 0]
            );
            const mealPlanId = planResult.insertId;

            for (const slot of slots) {
                const [slotResult] = await connection.execute(
                    `INSERT INTO meal_plan_slots (meal_plan_id, slot_index, slot_label) VALUES (?, ?, ?)`,
                    [mealPlanId, slot.slot_index, slot.slot_label ?? null]
                );
                const slotId = slotResult.insertId;

                if (Array.isArray(slot.options) && slot.options.length > 0) {
                    const values = slot.options.map((o) => optionValues(slotId, o));
                    await connection.query(
                        `INSERT INTO meal_plan_options
                         (slot_id, mealdb_id, meal_name, meal_thumb, notes, quantity, unit,
                          calories_per_100, protein_per_100, carbs_per_100, fat_per_100, sugar_per_100, fiber_per_100)
                         VALUES ?`,
                        [values]
                    );
                }
            }

            await connection.commit();
            return mealPlanId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.end();
        }
    }
};

// Builds the column tuple for a meal option row. Same column order is reused for both
// meal_slot_options (templates) and meal_plan_options (assigned plans), so a copy stays identical.
function optionValues(slotId, o) {
    return [
        slotId,
        o.mealdb_id ?? null,
        o.meal_name ?? null,
        o.meal_thumb ?? null,
        o.notes ?? null,
        o.quantity ?? null,
        o.unit ?? null,
        o.calories_per_100 ?? null,
        o.protein_per_100 ?? null,
        o.carbs_per_100 ?? null,
        o.fat_per_100 ?? null,
        o.sugar_per_100 ?? null,
        o.fiber_per_100 ?? null
    ];
}

// Builds a meal option row tuple from a raw FRONTEND option payload (the save path).
// Frontend shape: { source, mealId, name, thumb, quantity, unit, per100g:{...}, macros:{...} }.
// macros are scaled/derived values — ignored; we persist per-100g only. Caller filters out
// options with no name (meal_name is NOT NULL).
function optionValuesFromPayload(slotId, o) {
    return [
        slotId,
        o.mealId ?? null,
        o.name,
        o.thumb ?? null,
        o.notes ?? null,
        o.quantity ?? null,
        o.unit ?? null,
        o.per100g?.calories ?? null,
        o.per100g?.protein ?? null,
        o.per100g?.carbs ?? null,
        o.per100g?.fat ?? null,
        o.per100g?.sugar ?? null,
        o.per100g?.fiber ?? null
    ];
}
