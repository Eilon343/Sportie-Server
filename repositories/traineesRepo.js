const { dbConnection } = require('../db_connection');

// All the trainee database stuff. Each method grabs its own connection and runs one query.

exports.traineesRepo = {
    // Gets all trainees belonging to a given trainer from the trainees table.
    async findByTrainerId(trainerId) {
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute('SELECT * FROM trainees WHERE trainer_id = ?', [trainerId]);
            return rows;
        } finally {
            conn.end();
        }
    },

    // Gets a single trainee's row from the trainees table by id.
    async findById(traineeId) {
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute('SELECT * FROM trainees WHERE trainee_id = ?', [traineeId]);
            return rows;
        } finally {
            conn.end();
        }
    },

    // Updates both the users row and the trainees row together in one transaction.
    // Returns how many trainee rows changed (0 means the trainee wasn't found).
    async updateProfileTx(traineeId, userFields, traineeFields) {
        const conn = await dbConnection.createConnection();
        try {
            await conn.beginTransaction();

            await conn.execute(
                `UPDATE users SET
                    email = COALESCE(?, email),
                    date_of_birth = ?, country_code = ?, phone_number = ?
                 WHERE user_id = ?`,
                [userFields.email, userFields.date_of_birth, userFields.country_code, userFields.phone_number, traineeId]
            );

            const [result] = await conn.execute(
                `UPDATE trainees SET
                    name = COALESCE(?, name),
                    goal = COALESCE(?, goal),
                    avatar_color = ?, avatar_url = ?
                 WHERE trainee_id = ?`,
                [traineeFields.name, traineeFields.goal, traineeFields.avatar_color, traineeFields.avatar_url, traineeId]
            );

            if (result.affectedRows === 0) {
                await conn.rollback();
                return 0;
            }
            await conn.commit();
            return result.affectedRows;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.end();
        }
    },
};
