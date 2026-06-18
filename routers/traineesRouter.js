const { Router } = require('express');
const { traineesController } = require('../controllers/traineesController');

const traineesRouter = Router();

traineesRouter.get('/trainer/:trainerId', traineesController.getTraineesByTrainer);
traineesRouter.get('/:traineeId', traineesController.getTraineeById);
traineesRouter.put('/:traineeId/profile', traineesController.updateOwnProfile);

module.exports = traineesRouter;
