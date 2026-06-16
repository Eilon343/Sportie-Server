const { Router } = require('express');
const { trainersController } = require('../controllers/trainersController');
const trainersRouter = Router();

trainersRouter.get('/:trainerId', trainersController.getTrainerById);
trainersRouter.get('/trainers', trainersController.getAllTrainers);
trainersRouter.get('/:trainerId/monthly-activity', trainersController.getMonthlyActiveTrainees);

module.exports = trainersRouter;