const { planRepo } = require('../schemas/planRepo');
const { exerciseRepo } = require('../schemas/exerciseRepo');

// Tagged error so the controller can map it to the right HTTP status (e.g. 404).
function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

// Computes day-total macros for a meal plan. Slots are "pick one" so each slot
// contributes the average of its options; the day total is the sum of those averages.
function calcMealPlanTotals(slots) {
    const KEYS = ['calories', 'protein', 'carbs', 'fat'];
    const total = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    for (const slot of (slots || [])) {
        const opts = (slot.options || []).filter(o => o.name);
        if (!opts.length) continue;
        for (const key of KEYS) {
            const slotAvg = opts.reduce((sum, o) => {
                return sum + (Number(o[`${key}_per_100`] || o.per100?.[key] || 0) * Number(o.quantity || 0) / 100);
            }, 0) / opts.length;
            total[key] += slotAvg;
        }
    }
    for (const key of KEYS) total[key] = Math.round(total[key] * 100) / 100;
    return total;
}

exports.planService = {
    // Saves a brand-new training plan plus all its exercises in one transaction.
    // Returns the new plan's id.
    async savePlan({ traineeId, goal, daysPerWeek, days }) {
        // Checked before the transaction so a bad trainee_id is a clean 404, not an
        // FK 500 (and not swallowed by the generic catch below).
        if (!(await planRepo.traineeExists(traineeId))) {
            throw httpError(404, 'Trainee not found');
        }
        const exerciseRows = [];
        try {
            for (const day of days) {
                const dayIndex = day.dayNumber;

                if (day.exercises && Array.isArray(day.exercises)) {
                    for (const ex of day.exercises) {
                        const exId = ex.id || null;
                        const customName = ex.id ? null : ex.name;

                        if (exId) {
                            const [existingEx] = await exerciseRepo.findExerciseById(exId);

                            // First time we see this API exercise, store it so the plan can reference it.
                            if (!existingEx || existingEx.length === 0) {
                                const safeExercise = {
                                    exerciseId: ex.id, 
                                    name: ex.name !== undefined ? ex.name : 'Custom Exercise', 
                                    bodyPart: ex.bodyPart !== undefined ? ex.bodyPart : (ex.body_part !== undefined ? ex.body_part : 'general'), 
                                    target: ex.target !== undefined ? ex.target : 'general',
                                    equipment: ex.equipment !== undefined ? ex.equipment : 'none', 
                                    gifUrl: ex.gifUrl !== undefined ? ex.gifUrl : (ex.gif_url !== undefined ? ex.gif_url : ''), 
                                    difficulty: ex.difficulty !== undefined ? ex.difficulty : 'intermediate'
                                };
                                await exerciseRepo.insertExercise(safeExercise);
                            }
                        }
                        exerciseRows.push([
                            exId,
                            customName,
                            dayIndex,
                            ex.sets !== undefined ? ex.sets : 3,
                            ex.reps !== undefined ? ex.reps : 10,
                            ex.restSeconds !== undefined ? ex.restSeconds : 60
                        ]);
                    }
                }
            };
            const planId = await planRepo.savePlan({ traineeId, goal, daysPerWeek }, exerciseRows);
            return planId;
        } catch (error) {
            console.error('Error saving plan:', error);
            throw new Error('Failed to save training plan');
        }
    },

    // Gets a trainee's current active plan and rebuilds it into a nested days/exercises shape.
    async getActivePlan(traineeId) {
        const rows = await planRepo.getActivePlanByTraineeId(traineeId);

        if (!rows || rows.length === 0) return null;

        const planId = rows[0].plan_id;
        const goal = rows[0].goal;
        const daysPerWeek = rows[0].days_per_week;
        const createdAt = rows[0].created_at;
        const daysMap = [];
        for (let i = 1; i <= 7; i++) {
            daysMap[i] = {
                dayNumber: i,
                exercises: []
            };
        }

        rows.forEach(row => {
            const dayIndex = row.day_index;
            if (daysMap[dayIndex]) {
                daysMap[dayIndex].exercises.push({
                    id: row.exercise_id,
                    name: row.custom_exercise_name || row.api_exercise_name,
                    sets: row.sets,
                    reps: row.reps,
                    restSeconds: row.rest_seconds
                });
            }
        });

        return {
            planId,
            goal,
            daysPerWeek,
            createdAt,
            days: Object.values(daysMap)
        };
    },

    // Same as getActivePlan but looks a plan up directly by its id.
    async getPlanById(planId) {
        const rows = await planRepo.getPlanById(planId);
        if (!rows || rows.length === 0) return null;

        const goal = rows[0].goal;
        const daysPerWeek = rows[0].days_per_week;
        const createdAt = rows[0].created_at;

        const daysMap = [];
        for (let i = 0; i <= 7; i++) {
            daysMap[i] = { dayNumber: i, exercises: []};
        }

        rows.forEach(row => {
            const dayIndex = row.day_index;
            if (daysMap[dayIndex]) {
                daysMap[dayIndex].exercises.push({
                    id: row.exercise_id,
                    name: row.custom_exercise_name || row.api_exercise_name,
                    sets: row.sets,
                    reps: row.reps,
                    restSeconds: row.rest_seconds
                });
            }
        });

        return { planId, goal, daysPerWeek, createdAt, days: Object.values(daysMap) };
    },

    // Replaces an existing plan's details and exercises, adding any new API exercises first.
    async updatePlan(planId, { goal, daysPerWeek, days }) {
        const exerciseRows = [];

        for (const day of days) {
            const dayIndex = day.dayNumber;

            if (day.exercises && Array.isArray(day.exercises)) {
                for (const ex of day.exercises) {
                    const exId = ex.id || null;
                    const customName = ex.id ? null : ex.name;

                    if (exId) {
                        const existingEx = await exerciseRepo.findExerciseById(exId);
                        // First time we see this API exercise, store it so the plan can reference it.
                        if (!existingEx || existingEx.length === 0) {
                            const safeExercise = {
                                exerciseId: ex.id,
                                name: ex.name !== undefined ? ex.name : 'Custom Exercise',
                                bodyPart: ex.bodyPart !== undefined ? ex.bodyPart : 'general',
                                target: ex.target !== undefined ? ex.target : 'general',
                                equipment: ex.equipment !== undefined ? ex.equipment : 'none',
                                gifUrl: ex.gifUrl !== undefined ? ex.gifUrl : '',
                                difficulty: ex.difficulty !== undefined ? ex.difficulty : 'intermediate'
                            };
                            await exerciseRepo.insertExercise(safeExercise);
                        }
                    }

                    exerciseRows.push([
                        exId,
                        customName,
                        dayIndex,
                        ex.sets !== undefined ? ex.sets : 3,
                        ex.reps !== undefined ? ex.reps : 10,
                        ex.restSeconds !== undefined ? ex.restSeconds : 60
                    ]);
                }
            }
        }

        return await planRepo.updatePlanTx(planId, { goal, daysPerWeek }, exerciseRows);
    },

    // Updates a meal plan's name, slots and options, recomputing macros, then persists atomically.
    async updateMealPlan(planId, { name, slots }) {
        const totals = calcMealPlanTotals(slots);
        return planRepo.updateMealPlanTx(planId, { name, slots, totals });
    },

    // Returns the trainee's active meal plan with macros + full slots/options (for display/edit),
    // or null if they have no active meal plan.
    async getActiveMealPlan(traineeId) {
        const rows = await planRepo.getActiveMealPlan(traineeId);
        if (!rows) return null;

        const first = rows[0];
        const plan = {
            meal_plan_id: first.meal_plan_id,
            name: first.name,
            created_at: first.created_at,
            total_calories: Number(first.total_calories),
            total_protein: Number(first.total_protein),
            total_carbs: Number(first.total_carbs),
            total_fat: Number(first.total_fat),
            slots: [],
        };

        const slotsMap = new Map();
        for (const row of rows) {
            if (row.slot_id == null) continue;
            if (!slotsMap.has(row.slot_id)) {
                slotsMap.set(row.slot_id, {
                    slot_index: row.slot_index,
                    label: row.slot_label,
                    options: [],
                });
            }
            if (row.option_id != null) {
                slotsMap.get(row.slot_id).options.push({
                    name: row.meal_name,
                    thumb: row.meal_thumb,
                    notes: row.notes,
                    quantity: Number(row.quantity),
                    unit: row.unit,
                    calories_per_100: Number(row.calories_per_100),
                    protein_per_100: Number(row.protein_per_100),
                    carbs_per_100: Number(row.carbs_per_100),
                    fat_per_100: Number(row.fat_per_100),
                });
            }
        }
        plan.slots = Array.from(slotsMap.values());
        return plan;
    },
};
