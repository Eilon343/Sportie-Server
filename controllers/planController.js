const planGeneratorService = require('../services/planGeneratorService');
const { planService } = require('../services/planService');
const { isInvalidId } = require('../utils/validation');

exports.planController = {
  // Builds a workout plan from the user's goal and preferences (doesn't save it yet).
  async generatePlan(req, res, next) {
    try {
      const { goal, daysPerWeek, bodyParts, exercisesPerDay } = req.body;
      if (!goal) return res.status(400).json({ message: 'Field "goal" is required' });
      if (daysPerWeek !== undefined &&
          (!Number.isInteger(Number(daysPerWeek)) || Number(daysPerWeek) < 1 || Number(daysPerWeek) > 7)) {
        return res.status(400).json({ message: 'daysPerWeek must be an integer between 1 and 7' });
      }
      if (bodyParts !== undefined && !Array.isArray(bodyParts)) {
        return res.status(400).json({ message: 'bodyParts must be an array' });
      }

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

  // Saves a plan for a trainee and returns the new plan id.
  async savePlan(req, res, next) {
    const { traineeId, goal, daysPerWeek, days } = req.body;
    if (!traineeId) return res.status(400).json({ message: 'Field "traineeId" is required' });
    if (isInvalidId(String(traineeId))) {
      return res.status(400).json({ message: 'Invalid traineeId: must be a positive integer' });
    }
    if (!Array.isArray(days)) {
      return res.status(400).json({ message: 'Field "days" must be an array' });
    }

    try {
      const planId = await planService.savePlan({ traineeId, goal, daysPerWeek, days });

      res.status(201).json({
        success: true,
        message: 'Training plan saved successfully',
        planId: planId,
      });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      console.error('Error saving plan:', error);
      next(error);
    }
  },

  // Gets the trainee's current active plan, or 404 if they don't have one.
  async getActivePlan(req, res, next) {
    try {
      const { traineeId } = req.params;
      if (isInvalidId(traineeId)) {
        return res.status(400).json({ message: 'Invalid traineeId: must be a positive integer' });
      }

      const plan = await planService.getActivePlan(traineeId);
      if (!plan) {
        return res.status(404).json({ message: 'No active plan found for this trainee' });
      }
      res.status(200).json(plan);
    } catch (error) {
      console.error('Error fetching active plan:', error);
      next(error);
    }
  },

  // Gets one plan by its id, or 404 if not found.
  async getPlanById(req, res, next) {
    try {
      const { planId } = req.params;
      if (isInvalidId(planId)) {
        return res.status(400).json({ message: 'Invalid planId: must be a positive integer' });
      }

      const plan = await planService.getPlanById(planId);
      if (!plan) return res.status(404).json({ message: 'Plan not found' });

      res.status(200).json(plan);
    } catch (error) {
      console.error('Error fetching plan:', error);
      next(error);
    }
  },

  // Updates an existing plan's goal, days per week, or day details.
  async updatePlan(req, res, next) {
    try {
      const { planId } = req.params;
      const { goal, daysPerWeek, days } = req.body;
      if (isInvalidId(planId)) {
        return res.status(400).json({ message: 'Invalid planId: must be a positive integer' });
      }
      if (!Array.isArray(days)) {
        return res.status(400).json({ message: 'Field "days" must be an array' });
      }

      const updated = await planService.updatePlan(planId, { goal, daysPerWeek, days });
      if (!updated) {
        return res.status(404).json({ message: 'Plan not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Training plan updated successfully'
      });
    } catch (error) {
      console.error('Error updating plan:', error);
      next(error);
    }
  },

  // PUT /api/plans/meal-plan/:planId — update an existing meal plan's name, slots and options.
  async updateMealPlan(req, res, next) {
    try {
      const { planId } = req.params;
      if (isInvalidId(planId)) {
        return res.status(400).json({ message: 'Invalid planId: must be a positive integer' });
      }
      const { name, slots } = req.body;
      if (slots !== undefined && !Array.isArray(slots)) {
        return res.status(400).json({ message: 'Field "slots" must be an array' });
      }
      const updated = await planService.updateMealPlan(planId, { name, slots: slots || [] });
      if (!updated) return res.status(404).json({ message: 'Meal plan not found' });
      res.status(200).json({ success: true, message: 'Meal plan updated successfully' });
    } catch (error) {
      console.error('Error updating meal plan:', error);
      next(error);
    }
  },

  // GET /api/plans/meal-plan/:traineeId — the trainee's active meal plan + day-total macros.
  async getActiveMealPlan(req, res, next) {
    try {
      const { traineeId } = req.params;
      if (isInvalidId(traineeId)) {
        return res.status(400).json({ message: 'Invalid traineeId: must be a positive integer' });
      }
      const plan = await planService.getActiveMealPlan(traineeId);
      if (!plan) return res.status(404).json({ message: 'No active meal plan for this trainee' });
      res.status(200).json(plan);
    } catch (error) {
      console.error('Error fetching active meal plan:', error);
      next(error);
    }
  },
};
