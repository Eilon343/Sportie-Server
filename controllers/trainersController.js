const { dbConnection } = require('../db_connection');
const { validateAvatar } = require('../utils/avatar');

exports.trainersController = {
    async getTrainerById(req, res) {
        const { trainerId } = req.params;
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute(
                `SELECT t.*, u.email, u.date_of_birth, u.country_code, u.phone_number
                 FROM trainers t
                 JOIN users u ON u.user_id = t.trainer_id
                 WHERE t.trainer_id = ?`,
                [trainerId]
            );
            if (rows.length === 0) {
                return res.status(404).json({ message: 'Trainer not found' });
            }
            res.status(200).json(rows[0]);
        } catch (error) {
            console.error('Error fetching trainer:', error);
            res.status(500).send('Error fetching trainer: ' + error.message);
        } finally {
            conn.end();
        }
    },

    async getAllTrainers(req, res) {
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute('SELECT * FROM trainers');
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching trainers:', error);
            res.status(500).send('Error fetching trainers: ' + error.message);
        } finally {
            conn.end();
        }
    },

    async getMonthlyActiveTrainees(req, res) {
        const { trainerId } = req.params;
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute(
                'SELECT month_index, trainee_count FROM trainer_monthly_activity WHERE trainer_id = ? ORDER BY month_index ASC',
                [trainerId]
            );
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching monthly active trainees:', error);
            res.status(500).send('Error fetching monthly active trainees: ' + error.message);
        } finally {
            conn.end();
        }
    },

    // TRAINER edits their OWN profile (users + trainers).
    async updateOwnProfile(req, res) {
        const { trainerId } = req.params;
        const {
            email, date_of_birth, country_code, phone_number,   // users
            name, specialization, avatar_color, avatar_url,     // trainers
            units, notifications_enabled,                       // preferences
        } = req.body;

        const avatarError = validateAvatar(avatar_url);
        if (avatarError) return res.status(413).json({ message: avatarError });

        const conn = await dbConnection.createConnection();
        try {
            await conn.beginTransaction();

            await conn.execute(
                `UPDATE users SET
                    email = COALESCE(?, email),
                    date_of_birth = ?, country_code = ?, phone_number = ?
                 WHERE user_id = ?`,
                [email ?? null, date_of_birth || null, country_code || null, phone_number || null, trainerId]
            );

            const [result] = await conn.execute(
                `UPDATE trainers SET
                    name = COALESCE(?, name),
                    specialization = COALESCE(?, specialization),
                    avatar_color = ?, avatar_url = ?,
                    units = COALESCE(?, units),
                    notifications_enabled = COALESCE(?, notifications_enabled)
                 WHERE trainer_id = ?`,
                [name ?? null, specialization ?? null, avatar_color || null, avatar_url || null,
                 units ?? null, notifications_enabled ?? null, trainerId]
            );

            if (result.affectedRows === 0) {
                await conn.rollback();
                return res.status(404).json({ message: 'Trainer not found' });
            }
            await conn.commit();
            res.status(200).json({ message: 'Profile updated' });
        } catch (error) {
            await conn.rollback();
            if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email already in use' });
            console.error('Error updating trainer profile:', error);
            res.status(500).send('Error updating trainer profile: ' + error.message);
        } finally {
            conn.end();
        }
    },

    // TRAINER edits a managed TRAINEE — limited fields only.
    async updateManagedTrainee(req, res) {
        const { trainerId, traineeId } = req.params;
        const { status, progress, goal, start_weight, current_weight } = req.body;

        const conn = await dbConnection.createConnection();
        try {
            const [own] = await conn.execute(
                'SELECT trainee_id FROM trainees WHERE trainee_id = ? AND trainer_id = ?',
                [traineeId, trainerId]
            );
            if (own.length === 0) {
                return res.status(404).json({ message: 'Trainee not found under this trainer' });
            }

            const [result] = await conn.execute(
                `UPDATE trainees SET
                    status = COALESCE(?, status),
                    progress = COALESCE(?, progress),
                    goal = COALESCE(?, goal),
                    start_weight = COALESCE(?, start_weight),
                    current_weight = COALESCE(?, current_weight)
                 WHERE trainee_id = ?`,
                [status ?? null, progress ?? null, goal ?? null,
                 start_weight ?? null, current_weight ?? null, traineeId]
            );

            res.status(200).json({ message: 'Trainee updated', changed: result.affectedRows });
        } catch (error) {
            console.error('Error updating managed trainee:', error);
            res.status(500).send('Error updating managed trainee: ' + error.message);
        } finally {
            conn.end();
        }
    },

    // Assign an existing, unassigned trainee to this trainer.
    async assignTrainee(req, res) {
        const { trainerId } = req.params;
        const { traineeId } = req.body;
        if (!traineeId) return res.status(400).json({ message: 'traineeId is required' });

        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute(
                'SELECT trainee_id, trainer_id FROM trainees WHERE trainee_id = ?',
                [traineeId]
            );
            if (rows.length === 0) {
                return res.status(404).json({ message: 'Trainee not found. They must sign up first.' });
            }
            if (rows[0].trainer_id !== null) {
                return res.status(409).json({ message: 'Trainee is already assigned to a trainer' });
            }
            await conn.execute(
                'UPDATE trainees SET trainer_id = ? WHERE trainee_id = ?',
                [trainerId, traineeId]
            );
            res.status(200).json({ message: 'Trainee assigned successfully' });
        } catch (error) {
            console.error('Error assigning trainee:', error);
            res.status(500).send('Error assigning trainee: ' + error.message);
        } finally {
            conn.end();
        }
    },

    // Unassign a trainee from this trainer (keeps the trainee's account).
    async unassignTrainee(req, res) {
        const { trainerId, traineeId } = req.params;
        const conn = await dbConnection.createConnection();
        try {
            const [result] = await conn.execute(
                'UPDATE trainees SET trainer_id = NULL WHERE trainee_id = ? AND trainer_id = ?',
                [traineeId, trainerId]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Trainee not found under this trainer' });
            }
            res.status(200).json({ message: 'Trainee unassigned' });
        } catch (error) {
            console.error('Error unassigning trainee:', error);
            res.status(500).send('Error unassigning trainee: ' + error.message);
        } finally {
            conn.end();
        }
    },

    // Delete a trainer: unassign their trainees, then delete (cascade removes trainer + user rows).
    async deleteTrainer(req, res) {
        const { trainerId } = req.params;
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
                return res.status(404).json({ message: 'Trainer not found' });
            }
            await conn.commit();
            res.status(200).json({ message: 'Trainer deleted, trainees unassigned' });
        } catch (error) {
            await conn.rollback();
            console.error('Error deleting trainer:', error);
            res.status(500).send('Error deleting trainer: ' + error.message);
        } finally {
            conn.end();
        }
    },
};
