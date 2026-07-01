const { Router } = require('express');
const { traineesController } = require('../controllers/traineesController');

const traineesRouter = Router();

// Get all trainees belonging to a given trainer (only your own).
traineesRouter.get('/trainer/:trainerId', traineesController.getTraineesByTrainer);
// Get one trainee by id (must be one of your trainees).
traineesRouter.get('/:traineeId', traineesController.getTraineeById);
// Update a trainee's profile (must be one of your trainees).
traineesRouter.put('/:traineeId/profile', traineesController.updateOwnProfile);

module.exports = traineesRouter;
