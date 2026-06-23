const { templatesRepo } = require('../repositories/templatesRepo');
const { planService } = require('./planService');

// Per-trainer template caps. Checked in the service BEFORE any insert.
const WORKOUT_TEMPLATE_CAP = 10;
const MEAL_TEMPLATE_CAP = 5;

// Tagged error so the controller can map it to the right HTTP status (e.g. 409).
function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

// Turns the flat workout join rows into nested templates: template -> blocks -> exercises.
// Day-specific templates expose their blocks as `days`, abstract ones as `pool`.
function shapeWorkoutTemplates(rows) {
    const byTemplate = new Map();

    for (const row of rows) {
        let tpl = byTemplate.get(row.template_id);
        if (!tpl) {
            tpl = {
                template_id: row.template_id,
                name: row.name,
                mode: row.mode,
                goal: row.goal,
                _blocks: new Map()
            };
            byTemplate.set(row.template_id, tpl);
        }

        // A LEFT JOIN with no blocks still returns one row with null block_id.
        if (row.block_id == null) continue;

        let block = tpl._blocks.get(row.block_id);
        if (!block) {
            block = {
                block_index: row.block_index,
                label: row.label,
                block_type: row.block_type,
                notes: row.notes,
                exercises: []
            };
            tpl._blocks.set(row.block_id, block);
        }

        if (row.exercise_row_id != null) {
            block.exercises.push({
                exercise_id: row.exercise_id,
                custom_exercise_name: row.custom_exercise_name,
                sets: row.sets,
                reps: row.reps,
                rest_seconds: row.rest_seconds
            });
        }
    }

    return Array.from(byTemplate.values()).map((tpl) => {
        const blocks = Array.from(tpl._blocks.values());
        const shaped = { template_id: tpl.template_id, name: tpl.name, mode: tpl.mode, goal: tpl.goal };
        // Frontend mapWorkoutTemplate reads `days` for day-specific and `pool` for abstract.
        if (tpl.mode === 'abstract') shaped.pool = blocks;
        else shaped.days = blocks;
        return shaped;
    });
}

// Turns the flat meal join rows into nested templates: template -> slots -> options (with macros).
function shapeMealTemplates(rows) {
    const byTemplate = new Map();

    for (const row of rows) {
        let tpl = byTemplate.get(row.template_id);
        if (!tpl) {
            tpl = { template_id: row.template_id, name: row.name, _slots: new Map() };
            byTemplate.set(row.template_id, tpl);
        }

        if (row.slot_id == null) continue;

        let slot = tpl._slots.get(row.slot_id);
        if (!slot) {
            slot = { slot_index: row.slot_index, slot_label: row.slot_label, options: [] };
            tpl._slots.set(row.slot_id, slot);
        }

        if (row.option_id != null) {
            slot.options.push({
                mealdb_id: row.mealdb_id,
                meal_name: row.meal_name,
                meal_thumb: row.meal_thumb,
                notes: row.notes,
                quantity: row.quantity,
                unit: row.unit,
                calories_per_100: row.calories_per_100,
                protein_per_100: row.protein_per_100,
                carbs_per_100: row.carbs_per_100,
                fat_per_100: row.fat_per_100,
                sugar_per_100: row.sugar_per_100,
                fiber_per_100: row.fiber_per_100
            });
        }
    }

    return Array.from(byTemplate.values()).map((tpl) => ({
        template_id: tpl.template_id,
        name: tpl.name,
        slots: Array.from(tpl._slots.values())
    }));
}

//  MACROS
// Day-total macros for a meal plan/template. Slots are "pick one", so each slot
// contributes the AVERAGE of its options; the day total is the sum of those averages.
// One option's macro = per_100 * quantity / 100, with null/0 quantity counting as 0.
const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat'];

function scaleByQuantity(per100, quantity) {
    const q = Number(quantity);
    const p = Number(per100);
    if (!q || q <= 0 || !p) return 0;          // missing quantity (or value) => 0
    return (p * q) / 100;
}

// slotOptionMacros: array of slots, each an array of per-option {calories,protein,carbs,fat}.
function sumDayMacros(slotOptionMacros) {
    const total = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const options of slotOptionMacros) {
        if (!options.length) continue;          // empty slot adds nothing (no divide-by-zero)
        for (const key of MACRO_KEYS) {
            const slotAvg = options.reduce((sum, o) => sum + o[key], 0) / options.length;
            total[key] += slotAvg;
        }
    }
    for (const key of MACRO_KEYS) total[key] = Math.round(total[key] * 100) / 100; // 2 dp
    return total;
}

// From the SAVE/UPDATE payload shape: option = { per100g:{calories,...}, quantity }.
// Only named options are persisted, so only they count toward the total.
function macrosFromPayload(slots) {
    return sumDayMacros((slots || []).map((slot) =>
        (slot.options || [])
            .filter((o) => o.name != null && o.name !== '')
            .map((o) => ({
                calories: scaleByQuantity(o.per100g?.calories, o.quantity),
                protein: scaleByQuantity(o.per100g?.protein, o.quantity),
                carbs: scaleByQuantity(o.per100g?.carbs, o.quantity),
                fat: scaleByQuantity(o.per100g?.fat, o.quantity),
            }))
    ));
}

// From the shaped/DB option shape: option = { calories_per_100,..., quantity }.
function macrosFromShaped(slots) {
    return sumDayMacros((slots || []).map((slot) =>
        (slot.options || []).map((o) => ({
            calories: scaleByQuantity(o.calories_per_100, o.quantity),
            protein: scaleByQuantity(o.protein_per_100, o.quantity),
            carbs: scaleByQuantity(o.carbs_per_100, o.quantity),
            fat: scaleByQuantity(o.fat_per_100, o.quantity),
        }))
    ));
}

//  WORKOUT
exports.templatesService = {

    // Lists a trainer's workout templates, shaped for the frontend mapWorkoutTemplate.
    async listWorkoutTemplates(trainerId) {
        const rows = await templatesRepo.getWorkoutTemplateRowsByTrainer(trainerId);
        return shapeWorkoutTemplates(rows);
    },

    // Saves a new workout template, but only if the trainer is under the cap. Returns its id.
    async saveWorkoutTemplate({ trainerId, name, mode, goal, blocks }) {
        if (!(await templatesRepo.trainerExists(trainerId))) {
            throw httpError(404, 'Trainer not found');
        }
        const count = await templatesRepo.countWorkoutTemplates(trainerId);
        if (count >= WORKOUT_TEMPLATE_CAP) {
            throw httpError(409, `Workout template limit reached (${WORKOUT_TEMPLATE_CAP})`);
        }
        return templatesRepo.saveWorkoutTemplateTx(trainerId, { name, mode, goal, blocks: blocks || [] });
    },

    // Deletes a workout template (cascades to blocks/exercises). Returns rows deleted.
    async deleteWorkoutTemplate(templateId) {
        return templatesRepo.deleteWorkoutTemplate(templateId);
    },

    // Edits an existing workout template in place. 404s if the id doesn't exist.
    async updateWorkoutTemplate(templateId, { name, mode, goal, blocks }) {
        const ok = await templatesRepo.updateWorkoutTemplateTx(templateId, { name, mode, goal, blocks: blocks || [] });
        if (!ok) throw httpError(404, 'Template not found');
        return true;
    },

    // Assigns a workout template to a trainee as a fresh training plan (copy-on-assign).
    // Reuses planService.savePlan for the actual save, then makes the new plan the only
    // active one. Cardio/rest blocks have no exercises so they don't carry into the plan.
    async assignWorkoutTemplate(templateId, traineeId) {
        const rows = await templatesRepo.getWorkoutTemplateRowsById(templateId);
        if (!rows || rows.length === 0) throw httpError(404, 'Workout template not found');

        // A trainer may only assign their own template to one of their own trainees.
        const traineeTrainerId = await templatesRepo.getTraineeTrainerId(traineeId);
        if (traineeTrainerId === undefined) throw httpError(404, 'Trainee not found');
        if (traineeTrainerId !== rows[0].trainer_id) {
            throw httpError(403, "Trainee is not managed by this template's trainer");
        }

        const [shaped] = shapeWorkoutTemplates(rows);
        const blocks = shaped.days || shaped.pool || [];

        // Reshape into the { dayNumber, exercises } structure planService.savePlan expects.
        // Only workout blocks become plan days (training_plans has no concept of cardio/rest).
        const days = blocks
            .filter((b) => b.block_type === 'workout' && b.exercises.length > 0)
            .map((b) => ({
                dayNumber: b.block_index,
                exercises: b.exercises.map((ex) => ({
                    id: ex.exercise_id || null,
                    name: ex.custom_exercise_name || undefined,
                    sets: ex.sets,
                    reps: ex.reps,
                    restSeconds: ex.rest_seconds
                }))
            }));

        // Reuse the existing plan-save path (writes training_plans + plan_exercises in its own
        // transaction and auto-inserts any unknown exercises). New plan is is_active = 1.
        const planId = await planService.savePlan({
            traineeId,
            goal: shaped.goal,
            daysPerWeek: days.length,
            days
        });

        // Collapse to a single active plan. Done after the save so a save failure never
        // leaves the trainee with zero active plans.
        await templatesRepo.deactivateOtherActivePlansTx(traineeId, planId);

        return planId;
    },

    //  MEAL 

    // Lists a trainer's meal templates, shaped for the frontend mapMealTemplate.
    async listMealTemplates(trainerId) {
        const rows = await templatesRepo.getMealTemplateRowsByTrainer(trainerId);
        return shapeMealTemplates(rows);
    },

    // Saves a new meal template, but only if the trainer is under the cap. Returns its id.
    async saveMealTemplate({ trainerId, name, slots }) {
        if (!(await templatesRepo.trainerExists(trainerId))) {
            throw httpError(404, 'Trainer not found');
        }
        const count = await templatesRepo.countMealTemplates(trainerId);
        if (count >= MEAL_TEMPLATE_CAP) {
            throw httpError(409, `Meal template limit reached (${MEAL_TEMPLATE_CAP})`);
        }
        const totals = macrosFromPayload(slots);
        return templatesRepo.saveMealTemplateTx(trainerId, { name, slots: slots || [], totals });
    },

    // Deletes a meal template (cascades to slots/options). Returns rows deleted.
    async deleteMealTemplate(templateId) {
        return templatesRepo.deleteMealTemplate(templateId);
    },

    // Edits an existing meal template in place. 404s if the id doesn't exist.
    async updateMealTemplate(templateId, { name, slots }) {
        const totals = macrosFromPayload(slots);
        const ok = await templatesRepo.updateMealTemplateTx(templateId, { name, slots: slots || [], totals });
        if (!ok) throw httpError(404, 'Template not found');
        return true;
    },

    // Assigns a meal template to a trainee as a new meal_plan (copy-on-assign with replace).
    // The whole deactivate-old + copy-new happens in one repo transaction. Returns new plan id.
    async assignMealTemplate(templateId, traineeId) {
        const rows = await templatesRepo.getMealTemplateRowsById(templateId);
        if (!rows || rows.length === 0) throw httpError(404, 'Meal template not found');

        // A trainer may only assign their own template to one of their own trainees.
        const traineeTrainerId = await templatesRepo.getTraineeTrainerId(traineeId);
        if (traineeTrainerId === undefined) throw httpError(404, 'Trainee not found');
        if (traineeTrainerId !== rows[0].trainer_id) {
            throw httpError(403, "Trainee is not managed by this template's trainer");
        }

        const [shaped] = shapeMealTemplates(rows);
        // Recompute from the shaped slots so totals are correct even for templates
        // saved before macro totals existed.
        const totals = macrosFromShaped(shaped.slots);
        return templatesRepo.assignMealTemplateTx(traineeId, templateId, {
            name: shaped.name,
            slots: shaped.slots,
            totals
        });
    },

    // Returns the trainee's active meal plan with its day-total macros (for display),
    // or null if they have no active meal plan.
    async getActiveMealPlan(traineeId) {
        const row = await templatesRepo.getActiveMealPlan(traineeId);
        if (!row) return null;
        return {
            meal_plan_id: row.meal_plan_id,
            name: row.name,
            created_at: row.created_at,
            total_calories: Number(row.total_calories),
            total_protein: Number(row.total_protein),
            total_carbs: Number(row.total_carbs),
            total_fat: Number(row.total_fat),
        };
    }
};
