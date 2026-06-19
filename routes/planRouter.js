const { Router } = require('express');
const { planController } = require('../controllers/planController');

const planRouter = Router();

planRouter.post('/generate', planController.generatePlan);
planRouter.post('/save', planController.savePlan);

module.exports = planRouter;
