const { Router } = require('express');
const { trainersController } = require('../controllers/trainersController');

const trainersRouter = Router();

trainersRouter.get('/', trainersController.getAllTrainers);
trainersRouter.get('/:trainerId', trainersController.getTrainerById);
trainersRouter.get('/:trainerId/monthly-activity', trainersController.getMonthlyActiveTrainees);
trainersRouter.put('/:trainerId/profile', trainersController.updateOwnProfile);
trainersRouter.delete('/:trainerId', trainersController.deleteTrainer);
trainersRouter.post('/:trainerId/trainees', trainersController.assignTrainee);
trainersRouter.put('/:trainerId/trainees/:traineeId', trainersController.updateManagedTrainee);
trainersRouter.delete('/:trainerId/trainees/:traineeId', trainersController.unassignTrainee);

module.exports = trainersRouter;
