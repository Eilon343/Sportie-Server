const { dbConnection } = require('../db/connection');


exports.exerciseRepo = {
    // Checks if an exercise exists in the exercises table by its id.
    async findExerciseById(exerciseId) {
        const pool = await dbConnection.createConnection();
        try {
            const [existingEx] = await pool.execute(
                `SELECT exercise_id FROM exercises WHERE exercise_id = ?`,
                [exerciseId]
            );
            return existingEx;
        } catch (error) {
            console.error('Error finding exercise by ID:', error);
            throw new Error('Failed to find exercise by ID');
        }
    },

    // Searches the local exercises cache by name substring, optionally filtered by body part.
    async searchByName(query, limit = 20, bodyPart = '') {
        const pool = await dbConnection.createConnection();
        const safeLimit = parseInt(limit, 10) || 20;
        try {
            const params = [`%${query}%`];
            let sql = `SELECT exercise_id, name, body_part, target, equipment, difficulty, category, secondary_muscles, instructions, description FROM exercises WHERE name LIKE ?`;
            if (bodyPart) {
                sql += ` AND body_part = ?`;
                params.push(bodyPart);
            }
            sql += ` LIMIT ${safeLimit}`;
            const [rows] = await pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Error searching exercises by name:', error);
            throw new Error('Failed to search exercises');
        }
    },

    // Returns exercises from the local cache filtered by body part.
    async searchByBodyPart(bodyPart, limit = 20) {
        const pool = await dbConnection.createConnection();
        const safeLimit = parseInt(limit, 10) || 20;
        try {
            const [rows] = await pool.execute(
                `SELECT exercise_id, name, body_part, target, equipment, difficulty, category, secondary_muscles, instructions, description FROM exercises WHERE body_part = ? LIMIT ${safeLimit}`,
                [bodyPart]
            );
            return rows;
        } catch (error) {
            console.error('Error searching exercises by body part:', error);
            throw new Error('Failed to search exercises by body part');
        }
    },

    // Adds a new exercise row to the exercises table, filling in defaults when fields are missing.
    async insertExercise(exercise) {
        const pool = await dbConnection.createConnection();
        try {
            await pool.execute(
                `INSERT INTO exercises (exercise_id, name, body_part, target, equipment, difficulty, category, secondary_muscles, instructions, description)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    exercise.exerciseId,
                    exercise.name || 'Custom Exercise',
                    exercise.bodyPart || 'general',
                    exercise.target || 'general',
                    exercise.equipment || 'none',
                    exercise.difficulty || 'intermediate',
                    exercise.category || null,
                    JSON.stringify(exercise.secondaryMuscles || []),
                    JSON.stringify(exercise.instructions || []),
                    exercise.description || null,
                ]
            );
        } catch (error) {
            console.error('Error inserting exercise:', error);
            throw new Error('Failed to insert exercise');
        }
    },

    // Batch-inserts exercises from ExerciseDB into the local cache, skipping duplicates.
    async insertManyExercises(exercises) {
        if (!exercises || !exercises.length) return;
        const pool = await dbConnection.createConnection();
        for (const ex of exercises) {
            try {
                await pool.execute(
                    `INSERT IGNORE INTO exercises (exercise_id, name, body_part, target, equipment, difficulty, category, secondary_muscles, instructions, description)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        ex.id,
                        ex.name || 'Unknown',
                        ex.bodyPart || 'general',
                        ex.target || 'general',
                        ex.equipment || 'none',
                        ex.difficulty || 'intermediate',
                        ex.category || null,
                        JSON.stringify(ex.secondaryMuscles || []),
                        JSON.stringify(ex.instructions || []),
                        ex.description || null,
                    ]
                );
            } catch (error) {
                console.error(`Failed to cache exercise "${ex.name}":`, error);
            }
        }
    },
}
