const { planRepo } = require('../repositories/planRepo');

// Business shaping for saving a plan: flatten days -> exercise rows, then delegate the
// atomic persistence to the repo. No SQL here, no req/res here.
// (Plan GENERATION stays in planGeneratorService.js — untouched.)

exports.planService = {
    // Returns the new planId (insertId from the training_plans insert, within the tx).
    async savePlan({ traineeId, goal, daysPerWeek, days }) {
        // Flatten days -> partial exercise rows WITHOUT plan_id (the repo injects it):
        // [exercise_id, custom_exercise_name, day_index, sets, reps, rest_seconds].
        const exerciseRows = [];
        days.forEach((day) => {
            const dayIndex = day.dayNumber;

            day.exercises.forEach((exercise) => {
                const exerciseId = exercise.id || null;
                const customName = exercise.id ? null : exercise.name;

                exerciseRows.push([
                    exerciseId,
                    customName,
                    dayIndex,
                    exercise.sets,
                    exercise.reps,
                    exercise.restSeconds,
                ]);
            });
        });

        return planRepo.savePlanTx({ traineeId, goal, daysPerWeek }, exerciseRows);
    },
};
