const { Router } = require('express');
const { planController } = require('../controllers/planController');

const planRouter = Router();

planRouter.post('/generate', planController.generatePlan);

module.exports = planRouter;
