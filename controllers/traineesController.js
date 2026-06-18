const { dbConnection } = require('../db_connection');
const { validateAvatar } = require('../utils/avatar');

exports.traineesController = {
    async getTraineesByTrainer(req, res) {
        const { trainerId } = req.params;
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute(
                'SELECT * FROM trainees WHERE trainer_id = ?',
                [trainerId]
            );
            if (rows.length === 0) {
                return res.status(404).json({ message: 'No trainees found for this trainer' });
            }
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching trainees:', error);
            res.status(500).send('Error fetching trainees: ' + error.message);
        } finally {
            conn.end();
        }
    },

    async getTraineeById(req, res) {
        const { traineeId } = req.params;
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute(
                'SELECT * FROM trainees WHERE trainee_id = ?',
                [traineeId]
            );
            if (rows.length === 0) {
                return res.status(404).json({ message: 'Trainee not found' });
            }
            res.status(200).json(rows[0]);
        } catch (error) {
            console.error('Error fetching trainee:', error);
            res.status(500).send('Error fetching trainee: ' + error.message);
        } finally {
            conn.end();
        }
    },

    // TRAINEE edits their OWN profile (future phone app).
    // Allowed: contact info + name, goal, avatar. NOT status/progress/trainer_id/weight.
    async updateOwnProfile(req, res) {
        const { traineeId } = req.params;
        const {
            email, date_of_birth, country_code, phone_number,  // users
            name, goal, avatar_color, avatar_url,              // trainees (self-editable)
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
                [email ?? null, date_of_birth || null, country_code || null, phone_number || null, traineeId]
            );

            const [result] = await conn.execute(
                `UPDATE trainees SET
                    name = COALESCE(?, name),
                    goal = COALESCE(?, goal),
                    avatar_color = ?, avatar_url = ?
                 WHERE trainee_id = ?`,
                [name ?? null, goal ?? null, avatar_color || null, avatar_url || null, traineeId]
            );

            if (result.affectedRows === 0) {
                await conn.rollback();
                return res.status(404).json({ message: 'Trainee not found' });
            }
            await conn.commit();
            res.status(200).json({ message: 'Profile updated' });
        } catch (error) {
            await conn.rollback();
            if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Email already in use' });
            console.error('Error updating trainee profile:', error);
            res.status(500).send('Error updating trainee profile: ' + error.message);
        } finally {
            conn.end();
        }
    },
};
