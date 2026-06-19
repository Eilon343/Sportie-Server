const { traineesService } = require('../services/traineesService');

// req/res only: parse input, call the service, map results/errors to HTTP responses.
// Response shapes are unchanged: list -> array, by-id -> single row, updates -> { message }.

exports.traineesController = {
    async getTraineesByTrainer(req, res) {
        try {
            const rows = await traineesService.getTraineesByTrainer(req.params.trainerId);
            if (rows.length === 0) {
                return res.status(404).json({ message: 'No trainees found for this trainer' });
            }
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching trainees:', error);
            res.status(500).send('Error fetching trainees: ' + error.message);
        }
    },

    async getTraineeById(req, res) {
        try {
            const trainee = await traineesService.getTraineeById(req.params.traineeId);
            if (!trainee) {
                return res.status(404).json({ message: 'Trainee not found' });
            }
            res.status(200).json(trainee);
        } catch (error) {
            console.error('Error fetching trainee:', error);
            res.status(500).send('Error fetching trainee: ' + error.message);
        }
    },

    // TRAINEE edits their OWN profile (future phone app).
    // Allowed: contact info + name, goal, avatar. NOT status/progress/trainer_id/weight.
    async updateOwnProfile(req, res) {
        try {
            const updated = await traineesService.updateOwnProfile(req.params.traineeId, req.body);
            if (!updated) {
                return res.status(404).json({ message: 'Trainee not found' });
            }
            res.status(200).json({ message: 'Profile updated' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error updating trainee profile:', error);
            res.status(500).send('Error updating trainee profile: ' + error.message);
        }
    },
};
