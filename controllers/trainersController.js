const { dbConnection } = require('../db_connection');

exports.trainersController = {
    async getTrainerById(req, res) {
        const { trainerId } = req.params;
        const conn = await dbConnection.createConnection();

        try {
            const [rows] = await conn.execute(
                'SELECT * FROM trainers WHERE trainer_id = ?',
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
    }
}