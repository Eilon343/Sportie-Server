const { Router } = require('express');
const { templatesController } = require('../controllers/templatesController');

const templatesRoutes = Router();

//  Workout templates 
// List a trainer's workout templates (?trainerId=).
templatesRoutes.get('/workout', templatesController.listWorkoutTemplates);
// Save a new workout template.
templatesRoutes.post('/workout', templatesController.saveWorkoutTemplate);
// Edit an existing workout template in place.
templatesRoutes.put('/workout/:id', templatesController.updateWorkoutTemplate);
// Delete a workout template (cascades to its blocks/exercises).
templatesRoutes.delete('/workout/:id', templatesController.deleteWorkoutTemplate);
// Assign a workout template to a trainee as a new active plan.
templatesRoutes.post('/workout/:id/assign', templatesController.assignWorkoutTemplate);

//  Meal templates 
// List a trainer's meal templates (?trainerId=).
templatesRoutes.get('/meal', templatesController.listMealTemplates);
// Save a new meal template.
templatesRoutes.post('/meal', templatesController.saveMealTemplate);
// Edit an existing meal template in place.
templatesRoutes.put('/meal/:id', templatesController.updateMealTemplate);
// Delete a meal template (cascades to its slots/options).
templatesRoutes.delete('/meal/:id', templatesController.deleteMealTemplate);
// Assign a meal template to a trainee as a new active meal plan.
templatesRoutes.post('/meal/:id/assign', templatesController.assignMealTemplate);

module.exports = templatesRoutes;
