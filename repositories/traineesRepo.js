const { dbConnection } = require('../db_connection');

exports.traineesRepo = {
    async findByTrainerId(trainerId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute('SELECT * FROM trainees WHERE trainer_id = ?', [trainerId]);
        return rows;
    },

    async findById(traineeId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute('SELECT * FROM trainees WHERE trainee_id = ?', [traineeId]);
        return rows;
    },

    // Owns the whole users+trainees update on ONE connection (mirrors the original
    // controller transaction). Caller passes already-normalized field objects.
    // Returns the trainees-update affectedRows (0 => trainee not found, already rolled back).
    async updateProfileTx(traineeId, userFields, traineeFields) {
        const pool = await dbConnection.createConnection();
        const conn = await pool.getConnection();
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
            conn.release();
        }
    },
};
