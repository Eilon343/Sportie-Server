const { Router } = require('express');
const { traineesController } = require('../controllers/traineesController');

const traineesRouter = Router();

// Get all trainees belonging to a given trainer.
traineesRouter.get('/trainer/:trainerId', traineesController.getTraineesByTrainer);
// Get one trainee by id.
traineesRouter.get('/:traineeId', traineesController.getTraineeById);
// Let a trainee update their own profile.
traineesRouter.put('/:traineeId/profile', traineesController.updateOwnProfile);

module.exports = traineesRouter;
