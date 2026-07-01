const { traineesService } = require('../services/traineesService');
const { isInvalidId } = require('../utils/validation');

exports.traineesController = {
    // Gets all the trainees that belong to one trainer. Used by the dashboard.
    async getTraineesByTrainer(req, res, next) {
        const { trainerId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        try {
            const rows = await traineesService.getTraineesByTrainer(trainerId);
            if (rows.length === 0) {
                return res.status(404).json({ message: 'No trainees found for this trainer' });
            }
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching trainees:', error);
            next(error);
        }
    },

    // Gets a single trainee by id, or 404 if not found.
    async getTraineeById(req, res, next) {
        const { traineeId } = req.params;
        if (isInvalidId(traineeId)) {
            return res.status(400).json({ message: 'Invalid traineeId: must be a positive integer' });
        }
        try {
            const trainee = await traineesService.getTraineeById(traineeId);
            if (!trainee) {
                return res.status(404).json({ message: 'Trainee not found' });
            }
            res.status(200).json(trainee);
        } catch (error) {
            console.error('Error fetching trainee:', error);
            next(error);
        }
    },

    // Lets a trainee edit their own profile. Only safe fields like name, contact, goal, avatar
    // are allowed here, not status/progress/trainer/weight.
    async updateOwnProfile(req, res, next) {
        const { traineeId } = req.params;
        if (isInvalidId(traineeId)) {
            return res.status(400).json({ message: 'Invalid traineeId: must be a positive integer' });
        }
        const email = req.body && req.body.email;
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
            return res.status(400).json({ message: 'A valid email is required' });
        }
        try {
            const updated = await traineesService.updateOwnProfile(traineeId, req.body);
            if (!updated) {
                return res.status(404).json({ message: 'Trainee not found' });
            }
            res.status(200).json({ message: 'Profile updated' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error updating trainee profile:', error);
            next(error);
        }
    },
};
