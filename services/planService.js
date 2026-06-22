const { planRepo } = require('../repositories/planRepo');
const { dbConnection } = require('../db_connection');

exports.planService = {
    // Returns the new planId (insertId from the training_plans insert, within the tx).
    async savePlan({ traineeId, goal, daysPerWeek, days }) {
        const exerciseRows = [];
        const connection = await dbConnection.createConnection(); 
        try {
            for (const day of days) {
                const dayIndex = day.dayNumber;

                if (day.exercises && Array.isArray(day.exercises)) {
                    for (const ex of day.exercises) {
                        const exId = ex.id || null; // null for custom exercises
                        const customName = ex.id ? null : ex.name; // only set for custom exercises
                        if (exId) {
                            //check which exercises already exist in the exercises table, and if not, insert them (to avoid foreign key issues in plan_exercises)
                            const [existingEx] = await connection.execute(
                                `SELECT exercise_id FROM exercises WHERE exercise_id = ?`,
                                [exId]
                            );

                            if (existingEx.length === 0) {
                                //New exercise: Insert the exercise into the exercises table
                                const insertExQuery = `
                                INSERT INTO exercises (exercise_id, name, body_part, target, equipment, gif_url, difficulty)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                                `;
                                await connection.execute(insertExQuery, [
                                    exId,
                                    ex.name || 'Custom Exercise',
                                    ex.bodyPart || 'general',
                                    ex.target || 'general',
                                    ex.equipment || 'none',
                                    ex.gifUrl || '',
                                    ex.difficulty || 'intermediate',
                                ]);
                            }
                        }
                        exerciseRows.push([
                            exId,
                            customName,
                            dayIndex,
                            ex.sets || 3,
                            ex.reps || 10,
                            ex.restSeconds || 60
                        ]);
                    }
                }
            };
            const planId = await planRepo.savePlan({ traineeId, goal, daysPerWeek }, exerciseRows);
            return planId;
        } catch (error) {
            console.error('Error saving plan:', error);
            throw new Error('Failed to save training plan');
        } finally {
            if (connection) connection.end();
        }
    }
};
