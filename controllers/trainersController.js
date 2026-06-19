const { trainersService } = require('../services/trainersService');

// req/res only: parse input, call the service, map results/errors to HTTP responses.
// Tagged service errors (err.status) become JSON {message}; everything else is a 500.

exports.trainersController = {
    async getTrainerById(req, res) {
        try {
            const trainer = await trainersService.getTrainerById(req.params.trainerId);
            if (!trainer) {
                return res.status(404).json({ message: 'Trainer not found' });
            }
            res.status(200).json(trainer);
        } catch (error) {
            console.error('Error fetching trainer:', error);
            res.status(500).send('Error fetching trainer: ' + error.message);
        }
    },

    async getAllTrainers(req, res) {
        try {
            const rows = await trainersService.getAllTrainers();
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching trainers:', error);
            res.status(500).send('Error fetching trainers: ' + error.message);
        }
    },

    async getMonthlyActiveTrainees(req, res) {
        try {
            const rows = await trainersService.getMonthlyActiveTrainees(req.params.trainerId);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching monthly active trainees:', error);
            res.status(500).send('Error fetching monthly active trainees: ' + error.message);
        }
    },

    // TRAINER edits their OWN profile (users + trainers).
    async updateOwnProfile(req, res) {
        try {
            const updated = await trainersService.updateOwnProfile(req.params.trainerId, req.body);
            if (!updated) {
                return res.status(404).json({ message: 'Trainer not found' });
            }
            res.status(200).json({ message: 'Profile updated' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error updating trainer profile:', error);
            res.status(500).send('Error updating trainer profile: ' + error.message);
        }
    },

    // TRAINER edits a managed TRAINEE — limited fields only.
    async updateManagedTrainee(req, res) {
        try {
            const changed = await trainersService.updateManagedTrainee(
                req.params.trainerId, req.params.traineeId, req.body
            );
            res.status(200).json({ message: 'Trainee updated', changed });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error updating managed trainee:', error);
            res.status(500).send('Error updating managed trainee: ' + error.message);
        }
    },

    // Assign an existing, unassigned trainee to this trainer.
    async assignTrainee(req, res) {
        const { traineeId } = req.body;
        if (!traineeId) return res.status(400).json({ message: 'traineeId is required' });

        try {
            await trainersService.assignTrainee(req.params.trainerId, traineeId);
            res.status(200).json({ message: 'Trainee assigned successfully' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error assigning trainee:', error);
            res.status(500).send('Error assigning trainee: ' + error.message);
        }
    },

    // Unassign a trainee from this trainer (keeps the trainee's account).
    async unassignTrainee(req, res) {
        try {
            await trainersService.unassignTrainee(req.params.trainerId, req.params.traineeId);
            res.status(200).json({ message: 'Trainee unassigned' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error unassigning trainee:', error);
            res.status(500).send('Error unassigning trainee: ' + error.message);
        }
    },

    // Delete a trainer: unassign their trainees, then delete (cascade removes trainer + user rows).
    async deleteTrainer(req, res) {
        try {
            await trainersService.deleteTrainer(req.params.trainerId);
            res.status(200).json({ message: 'Trainer deleted, trainees unassigned' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error deleting trainer:', error);
            res.status(500).send('Error deleting trainer: ' + error.message);
        }
    },
};
