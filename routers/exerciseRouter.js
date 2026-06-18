const { Router } = require('express');
const { exerciseController } = require('../controllers/exerciseController');

const exerciseRouter = Router();

exerciseRouter.get('/bodyparts', exerciseController.getBodyPartList);
exerciseRouter.get('/targets', exerciseController.getTargetList);
exerciseRouter.get('/equipment', exerciseController.getEquipmentList);
exerciseRouter.get('/search/:name', exerciseController.searchExercisesByName);
exerciseRouter.get('/:id', exerciseController.getExerciseById);
exerciseRouter.get('/', exerciseController.getExercises);

module.exports = exerciseRouter;