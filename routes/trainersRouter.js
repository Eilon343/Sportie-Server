const { Router } = require('express');
const { trainersController } = require('../controllers/trainersController');

const trainersRouter = Router();

// Get all trainers.
trainersRouter.get('/', trainersController.getAllTrainers);
// Get one trainer by id.
trainersRouter.get('/:trainerId', trainersController.getTrainerById);
// How many of the trainer's trainees were active this month.
trainersRouter.get('/:trainerId/monthly-activity', trainersController.getMonthlyActiveTrainees);
// Let a trainer update their own profile.
trainersRouter.put('/:trainerId/profile', trainersController.updateOwnProfile);
// Delete a trainer.
trainersRouter.delete('/:trainerId', trainersController.deleteTrainer);
// Routes for managing the trainees under a trainer.
// Assign a trainee to this trainer.
trainersRouter.post('/:trainerId/trainees', trainersController.assignTrainee);
// Update one of the trainer's trainees.
trainersRouter.put('/:trainerId/trainees/:traineeId', trainersController.updateManagedTrainee);
// Remove a trainee from this trainer.
trainersRouter.delete('/:trainerId/trainees/:traineeId', trainersController.unassignTrainee);

module.exports = trainersRouter;
