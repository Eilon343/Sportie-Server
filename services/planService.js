const { planRepo } = require('../repositories/planRepo');
const { exerciseRepo } = require('../repositories/exerciseRepo');

exports.planService = {
    // Saves a brand-new training plan plus all its exercises in one transaction.
    // Returns the new plan's id.
    async savePlan({ traineeId, goal, daysPerWeek, days }) {
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
    }
};
