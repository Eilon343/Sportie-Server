const { dbConnection } = require('../db_connection');

exports.trainersRepo = {
    // Gets one trainer's row plus their user info (email, dob, etc.) by joining trainers and users.
    // Lists columns by hand on purpose so the password column never sneaks out.
    async findById(trainerId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            `SELECT t.*, u.email, u.date_of_birth, u.country_code, u.phone_number
             FROM trainers t
             JOIN users u ON u.user_id = t.trainer_id
             WHERE t.trainer_id = ?`,
            [trainerId]
        );
        return rows;
    },

    // Grabs every trainer row from the trainers table.
    async findAll() {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute('SELECT * FROM trainers');
        return rows;
    },

    // Reads a trainer's month-by-month trainee counts from the trainer_monthly_activity table.
    async findMonthlyActivity(trainerId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute(
            'SELECT month_index, trainee_count FROM trainer_monthly_activity WHERE trainer_id = ? ORDER BY month_index ASC',
            [trainerId]
        );
        return rows;
    },

    // Updates the trainer's users row and trainers row together in one transaction.
    // Returns how many trainer rows changed (0 means the trainer wasn't found).
    async updateProfileTx(trainerId, userFields, trainerFields) {
        const pool = await dbConnection.createConnection();
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            await conn.execute(
                `UPDATE users SET
                    email = COALESCE(?, email),
                    date_of_birth = ?, country_code = ?, phone_number = ?
                 WHERE user_id = ?`,
                [userFields.email, userFields.date_of_birth, userFields.country_code, userFields.phone_number, trainerId]
            );

            const [result] = await conn.execute(
                `UPDATE trainers SET
                    name = COALESCE(?, name),
                    specialization = COALESCE(?, specialization),
                    avatar_color = ?, avatar_url = ?,
                    units = COALESCE(?, units),
                    notifications_enabled = COALESCE(?, notifications_enabled)
                 WHERE trainer_id = ?`,
                [trainerFields.name, trainerFields.specialization, trainerFields.avatar_color, trainerFields.avatar_url,
                 trainerFields.units, trainerFields.notifications_enabled, trainerId]
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

    // Makes sure the trainee belongs to this trainer, then updates them, all in one transaction.
    // Returns { found, changed } so the caller knows if it existed and if anything changed.
    async updateManagedTraineeTx(trainerId, traineeId, fields) {
        const pool = await dbConnection.createConnection();
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const [own] = await conn.execute(
                'SELECT trainee_id FROM trainees WHERE trainee_id = ? AND trainer_id = ?',
                [traineeId, trainerId]
            );
            if (own.length === 0) {
                await conn.rollback();
                return { found: false, changed: 0 };
            }

            const [result] = await conn.execute(
                `UPDATE trainees SET
                    status = COALESCE(?, status),
                    progress = COALESCE(?, progress),
                    goal = COALESCE(?, goal),
                    start_weight = COALESCE(?, start_weight),
                    current_weight = COALESCE(?, current_weight)
                 WHERE trainee_id = ?`,
                [fields.status, fields.progress, fields.goal, fields.start_weight, fields.current_weight, traineeId]
            );

            await conn.commit();
            return { found: true, changed: result.affectedRows };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    // Links a free trainee to a trainer, in one transaction. Tells you 'not_found',
    // 'already_assigned', or 'assigned' depending on what happened.
    async assignTraineeTx(trainerId, traineeId) {
        const pool = await dbConnection.createConnection();
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const [rows] = await conn.execute(
                'SELECT trainee_id, trainer_id FROM trainees WHERE trainee_id = ?',
                [traineeId]
            );
            if (rows.length === 0) {
                await conn.rollback();
                return 'not_found';
            }
            if (rows[0].trainer_id !== null) {
                await conn.rollback();
                return 'already_assigned';
            }

            await conn.execute(
                'UPDATE trainees SET trainer_id = ? WHERE trainee_id = ?',
                [trainerId, traineeId]
            );
            await conn.commit();
            return 'assigned';
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    // Removes a trainee from a trainer by setting their trainer_id back to NULL.
    // Returns how many rows changed.
    async unassignTrainee(trainerId, traineeId) {
        const pool = await dbConnection.createConnection();
        const [result] = await pool.execute(
            'UPDATE trainees SET trainer_id = NULL WHERE trainee_id = ? AND trainer_id = ?',
            [traineeId, trainerId]
        );
        return result.affectedRows;
    },

    // Deletes a trainer but keeps their trainees: first unhooks the trainees (trainer_id = NULL),
    // then deletes the user row (which cascades to the trainers row). All in one transaction.
    // Returns how many user rows were deleted (0 means the trainer wasn't found).
    async deleteTrainerTx(trainerId) {
        const pool = await dbConnection.createConnection();
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            await conn.execute(
                'UPDATE trainees SET trainer_id = NULL WHERE trainer_id = ?',
                [trainerId]
            );
            const [result] = await conn.execute(
                'DELETE FROM users WHERE user_id = ? AND role = ?',
                [trainerId, 'trainer']
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
