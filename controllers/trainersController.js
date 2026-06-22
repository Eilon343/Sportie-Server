const { trainersService } = require('../services/trainersService');

exports.trainersController = {
    // Gets a single trainer by id, or 404 if not found.
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

    // Gets the full list of trainers.
    async getAllTrainers(req, res) {
        try {
            const rows = await trainersService.getAllTrainers();
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching trainers:', error);
            res.status(500).send('Error fetching trainers: ' + error.message);
        }
    },

    // Gets the trainer's trainees who were active this month.
    async getMonthlyActiveTrainees(req, res) {
        try {
            const rows = await trainersService.getMonthlyActiveTrainees(req.params.trainerId);
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching monthly active trainees:', error);
            res.status(500).send('Error fetching monthly active trainees: ' + error.message);
        }
    },

    // Lets a trainer update their own profile info.
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

    // Lets a trainer edit one of their trainees, but only certain allowed fields.
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

    // Attaches an existing unassigned trainee to this trainer.
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

    // Removes a trainee from this trainer but keeps the trainee's account.
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

    // Deletes a trainer. Their trainees get unassigned first, then the trainer and user rows are removed.
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
