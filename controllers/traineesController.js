const { dbConnection } = require('../db_connection');

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

    async getTraineeById(req, res){
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
    }
}