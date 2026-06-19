const { dbConnection } = require('../db_connection');

exports.trainersRepo = {
    // Explicit column list (NEVER u.*) so users.password can never leak.
    async findById(trainerId) {
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute(
                `SELECT t.*, u.email, u.date_of_birth, u.country_code, u.phone_number
                 FROM trainers t
                 JOIN users u ON u.user_id = t.trainer_id
                 WHERE t.trainer_id = ?`,
                [trainerId]
            );
            return rows;
        } finally {
            conn.end();
        }
    },

    async findAll() {
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute('SELECT * FROM trainers');
            return rows;
        } finally {
            conn.end();
        }
    },

    async findMonthlyActivity(trainerId) {
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute(
                'SELECT month_index, trainee_count FROM trainer_monthly_activity WHERE trainer_id = ? ORDER BY month_index ASC',
                [trainerId]
            );
            return rows;
        } finally {
            conn.end();
        }
    },

    // users + trainers update in ONE transaction on ONE connection.
    // Returns the trainers-update affectedRows (0 => trainer not found, already rolled back).
    async updateProfileTx(trainerId, userFields, trainerFields) {
        const conn = await dbConnection.createConnection();
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
            conn.end();
        }
    },

    // Ownership check + update, atomic on ONE connection. Returns { found, changed }.
    async updateManagedTraineeTx(trainerId, traineeId, fields) {
        const conn = await dbConnection.createConnection();
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
            conn.end();
        }
    },

    // Check + assign, atomic on ONE connection. Returns 'not_found' | 'already_assigned' | 'assigned'.
    async assignTraineeTx(trainerId, traineeId) {
        const conn = await dbConnection.createConnection();
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
            conn.end();
        }
    },

    // Single statement (inherently atomic). Returns affectedRows.
    async unassignTrainee(trainerId, traineeId) {
        const conn = await dbConnection.createConnection();
        try {
            const [result] = await conn.execute(
                'UPDATE trainees SET trainer_id = NULL WHERE trainee_id = ? AND trainer_id = ?',
                [traineeId, trainerId]
            );
            return result.affectedRows;
        } finally {
            conn.end();
        }
    },

    // Multi-step transaction: NULL this trainer's trainees (keep them), then delete the
    // user row (FK cascade removes the trainers row). Trainees survive with trainer_id = NULL.
    // Returns the users-delete affectedRows (0 => trainer not found, already rolled back).
    async deleteTrainerTx(trainerId) {
        const conn = await dbConnection.createConnection();
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
            conn.end();
        }
    },
};
