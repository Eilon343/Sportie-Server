const { Router } = require('express');
const { exerciseController } = require('../controllers/exerciseController');

const exerciseRouter = Router();

// Get the list of body parts you can filter by.
exerciseRouter.get('/bodyparts', exerciseController.getBodyPartList);
// Get the list of target muscles.
exerciseRouter.get('/targets', exerciseController.getTargetList);
// Get the list of equipment types.
exerciseRouter.get('/equipment', exerciseController.getEquipmentList);
// Search for exercises by name.
exerciseRouter.get('/search/:name', exerciseController.searchExercisesByName);
// Get one exercise by its id.
exerciseRouter.get('/:id', exerciseController.getExerciseById);
// Get all exercises.
exerciseRouter.get('/', exerciseController.getExercises);

module.exports = exerciseRouter;