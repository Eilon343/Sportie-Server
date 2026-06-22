const { traineesService } = require('../services/traineesService');

exports.traineesController = {
    // Gets all the trainees that belong to one trainer. Used by the dashboard.
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

    // Gets a single trainee by id, or 404 if not found.
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

    // Lets a trainee edit their own profile. Only safe fields like name, contact, goal, avatar
    // are allowed here, not status/progress/trainer/weight.
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
