const { Router } = require('express');
const { traineesController } = require('../controllers/traineesController');

const traineesRouter = Router();

traineesRouter.get('/trainer/:trainerId', traineesController.getTraineesByTrainer);
traineesRouter.get('/:traineeId', traineesController.getTraineeById);

module.exports = traineesRouter;