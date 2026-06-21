const { Router } = require('express');
const { planController } = require('../controllers/planController');

const planRouter = Router();

planRouter.post('/generate', planController.generatePlan);
planRouter.post('/save', planController.savePlan);
planRouter.get('/active/:traineeId', planController.getActivePlan);
planRouter.get('/:planId', planController.getPlanById);
planRouter.put('/:planId', planController.updatePlan);

module.exports = planRouter;
