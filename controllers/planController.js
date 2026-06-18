const planGeneratorService = require('../services/planGeneratorService');

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
};
