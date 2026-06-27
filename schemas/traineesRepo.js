const { dbConnection } = require('../db_connection');

// All trainees SQL lives here, parameterized, one method per query. Connection per
// call via dbConnection.createConnection() — matching the analytics repo pattern.

exports.traineesRepo = {
    // Gets all trainees belonging to a given trainer from the trainees table.
    async findByTrainerId(trainerId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute('SELECT * FROM trainees WHERE trainer_id = ?', [trainerId]);
        return rows;
    },

    // Gets a single trainee's row from the trainees table by id.
    async findById(traineeId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute('SELECT * FROM trainees WHERE trainee_id = ?', [traineeId]);
        return rows;
    },

    // Updates both the users row and the trainees row together in one transaction.
    // Returns how many trainee rows changed (0 means the trainee wasn't found).
    async updateProfileTx(traineeId, userFields, traineeFields) {
        const connection = await dbConnection.createConnection();
        try {
            await connection.beginTransaction();

            await connection.execute(
                `UPDATE users SET
                    email = COALESCE(?, email),
                    date_of_birth = ?, country_code = ?, phone_number = ?
                 WHERE user_id = ?`,
                [userFields.email, userFields.date_of_birth, userFields.country_code, userFields.phone_number, traineeId]
            );

            const [result] = await connection.execute(
                `UPDATE trainees SET
                    name = COALESCE(?, name),
                    goal = COALESCE(?, goal),
                    avatar_color = ?, avatar_url = ?
                 WHERE trainee_id = ?`,
                [traineeFields.name, traineeFields.goal, traineeFields.avatar_color, traineeFields.avatar_url, traineeId]
            );

            if (result.affectedRows === 0) {
                await connection.rollback();
                return 0;
            }
            await connection.commit();
            return result.affectedRows;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.end();
        }
    },
};
