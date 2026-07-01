const { trainersService } = require('../services/trainersService');
const { isInvalidId } = require('../utils/validation');

exports.trainersController = {
    // Gets a single trainer by id, or 404 if not found.
    async getTrainerById(req, res, next) {
        const { trainerId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        try {
            const trainer = await trainersService.getTrainerById(trainerId);
            if (!trainer) {
                return res.status(404).json({ message: 'Trainer not found' });
            }
            res.status(200).json(trainer);
        } catch (error) {
            console.error('Error fetching trainer:', error);
            next(error);
        }
    },

    // Gets the full list of trainers.
    async getAllTrainers(req, res, next) {
        try {
            const rows = await trainersService.getAllTrainers();
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching trainers:', error);
            next(error);
        }
    },

    // Gets the trainer's trainees who were active this month.
    async getMonthlyActiveTrainees(req, res, next) {
        const { trainerId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        try {
            const rows = await trainersService.getMonthlyActiveTrainees(trainerId);
            if (rows === null) {
                return res.status(404).json({ message: 'Trainer not found' });
            }
            res.status(200).json(rows);
        } catch (error) {
            console.error('Error fetching monthly active trainees:', error);
            next(error);
        }
    },

    // Lets a trainer update their own profile info.
    async updateOwnProfile(req, res, next) {
        const { trainerId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        const email = req.body && req.body.email;
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
            return res.status(400).json({ message: 'A valid email is required' });
        }
        try {
            const updated = await trainersService.updateOwnProfile(trainerId, req.body);
            if (!updated) {
                return res.status(404).json({ message: 'Trainer not found' });
            }
            res.status(200).json({ message: 'Profile updated' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error updating trainer profile:', error);
            next(error);
        }
    },

    // Lets a trainer edit one of their trainees, but only certain allowed fields.
    async updateManagedTrainee(req, res, next) {
        const { trainerId, traineeId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        if (isInvalidId(traineeId)) {
            return res.status(400).json({ message: 'Invalid traineeId: must be a positive integer' });
        }
        const { progress, start_weight, current_weight } = req.body || {};
        if (progress !== undefined && progress !== null &&
            (!Number.isFinite(Number(progress)) || Number(progress) < 0 || Number(progress) > 100)) {
            return res.status(400).json({ message: 'progress must be a number between 0 and 100' });
        }
        for (const [key, val] of [['start_weight', start_weight], ['current_weight', current_weight]]) {
            if (val !== undefined && val !== null && val !== '' && !Number.isFinite(Number(val))) {
                return res.status(400).json({ message: `${key} must be a number` });
            }
        }
        try {
            const changed = await trainersService.updateManagedTrainee(
                trainerId, traineeId, req.body
            );
            res.status(200).json({ message: 'Trainee updated', changed });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error updating managed trainee:', error);
            next(error);
        }
    },

    // Attaches an existing unassigned trainee to this trainer.
    async assignTrainee(req, res, next) {
        const { trainerId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        const { traineeId } = req.body;
        if (!traineeId) return res.status(400).json({ message: 'traineeId is required' });
        if (isInvalidId(String(traineeId))) {
            return res.status(400).json({ message: 'Invalid traineeId: must be a positive integer' });
        }

        try {
            await trainersService.assignTrainee(trainerId, traineeId);
            res.status(201).json({ message: 'Trainee assigned successfully' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error assigning trainee:', error);
            next(error);
        }
    },

    // Removes a trainee from this trainer but keeps the trainee's account.
    async unassignTrainee(req, res, next) {
        const { trainerId, traineeId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        if (isInvalidId(traineeId)) {
            return res.status(400).json({ message: 'Invalid traineeId: must be a positive integer' });
        }
        try {
            await trainersService.unassignTrainee(trainerId, traineeId);
            res.status(200).json({ message: 'Trainee unassigned' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error unassigning trainee:', error);
            next(error);
        }
    },

    // Deletes a trainer. Their trainees get unassigned first, then the trainer and user rows are removed.
    async deleteTrainer(req, res, next) {
        const { trainerId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        try {
            await trainersService.deleteTrainer(trainerId);
            res.status(200).json({ message: 'Trainer deleted, trainees unassigned' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error deleting trainer:', error);
            next(error);
        }
    },
};
