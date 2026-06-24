const { Router } = require('express');
const { planController } = require('../controllers/planController');

const planRouter = Router();

// Build a new workout plan (doesn't save it yet).
planRouter.post('/generate', planController.generatePlan);
// Save a plan to the database.
planRouter.post('/save', planController.savePlan);
// Get the trainee's currently active plan.
planRouter.get('/active/:traineeId', planController.getActivePlan);
// Get one plan by its id.
planRouter.get('/:planId', planController.getPlanById);
// Update an existing plan.
planRouter.put('/:planId', planController.updatePlan);
// Get a trainee's active meal plan with its day-total macros.
planRouter.get('/meal-plan/:traineeId', planController.getActiveMealPlan);


module.exports = planRouter;
