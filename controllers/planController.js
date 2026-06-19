const planGeneratorService = require('../services/planGeneratorService');
const { planService } = require('../services/planService');

// req/res only: parse input, call the service, map results/errors to HTTP responses.

exports.planController = {
  async generatePlan(req, res) {
    try {
      const { goal, daysPerWeek, bodyParts, exercisesPerDay } = req.body;
      if (!goal) return res.status(400).json({ message: 'Field "goal" is required' });

      const plan = await planGeneratorService.generatePlan({
        goal,
        daysPerWeek,
        bodyParts,
        exercisesPerDay,
      });
      res.status(200).json(plan);
    } catch (error) {
      console.error('Error generating plan:', error);
      res.status(400).json({ message: error.message });
    }
  },

  async savePlan(req, res) {
    const { traineeId, goal, daysPerWeek, days } = req.body;
    if (!traineeId) return res.status(400).json({ message: 'Field "traineeId" is required' });

    try {
      const planId = await planService.savePlan({ traineeId, goal, daysPerWeek, days });

      res.status(201).json({
        success: true,
        message: 'Training plan saved successfully',
        planId: planId,
      });
    } catch (error) {
      console.error('Error saving plan:', error);
      res.status(500).json({ message: 'Error saving plan: ' + error.message });
    }
  },
};
