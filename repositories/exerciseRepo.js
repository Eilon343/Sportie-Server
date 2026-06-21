const { dbConnection } = require('../db_connection');


exports.exerciseRepo = {
    async findExerciseById(exerciseId) {
        const conn = await dbConnection.createConnection();
        try {
            const [existingEx] = await conn.execute(
                `SELECT exercise_id FROM exercises WHERE exercise_id = ?`,
                [exerciseId]
            );
            return existingEx;
        } catch (error) {
            console.error('Error finding exercise by ID:', error);
            throw new Error('Failed to find exercise by ID');
        } finally {
            conn.end();
        }
    },

    async insertExercise(exercise) {
        const conn = await dbConnection.createConnection();
        try {
            const insertExQuery = `
                                INSERT INTO exercises (exercise_id, name, body_part, target, equipment, gif_url, difficulty)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                                `;
            await conn.execute(insertExQuery, [
                exercise.exerciseId,
                exercise.name || 'Custom Exercise',
                exercise.bodyPart || 'general',
                exercise.target || 'general',
                exercise.equipment || 'none',
                exercise.gifUrl || '',
                exercise.difficulty || 'intermediate',
            ]);
        } catch (error) {
            console.error('Error inserting exercise:', error);
            throw new Error('Failed to insert exercise');
        } finally {
            conn.end();
        }
    }
}