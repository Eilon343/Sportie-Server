const { Router } = require('express');
const { planController } = require('../controllers/planController');

const planRouter = Router();

// Build a new workout plan (doesn't save it yet).
planRouter.post('/generate', planController.generatePlan);
// Save a plan to the database (the trainee must be one of yours).
planRouter.post('/save', planController.savePlan);
// Get the trainee's currently active plan (must be one of your trainees).
planRouter.get('/active/:traineeId', planController.getActivePlan);
// Get one plan by its id.
planRouter.get('/:planId', planController.getPlanById);
// Update an existing plan.
planRouter.put('/:planId', planController.updatePlan);
// Get a trainee's active meal plan with its day-total macros (must be one of your trainees).
planRouter.get('/meal-plan/:traineeId', planController.getActiveMealPlan);
// Update an existing meal plan's name, slots and options.
planRouter.put('/meal-plan/:planId', planController.updateMealPlan);


module.exports = planRouter;
