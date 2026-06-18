const planGeneratorService = require('../services/planGeneratorService');
const { dbConnection } = require('../db_connection');

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

    const connection = await dbConnection.createConnection();
    try {
      await connection.beginTransaction();
      const insertPlanQuery = `
      INSERT INTO training_plans (trainee_id, goal, days_per_week)
      VALUES (?, ?, ?)
      `;

      const [planResult] = await connection.execute(insertPlanQuery, [traineeId, goal, daysPerWeek]);
      const planId = planResult.insertId;

      const exerciseValues = [];

      days.forEach(day => {
        const dayIndex = day.dayNumber;

        day.exercises.forEach(exercise => {
          const exerciseId = exercise.id || null;
          const customName = exercise.id ? null : exercise.name;

          exerciseValues.push([
            planId,
            exerciseId,
            customName,
            dayIndex,
            exercise.sets,
            exercise.reps,
            exercise.restSeconds,
          ]);
        });
      });
      if (exerciseValues.length > 0) {
        const insertExercisesQuery = `
          INSERT INTO plan_exercises 
          (plan_id, exercise_id, custom_exercise_name, day_index, sets, reps, rest_seconds)
          VALUES ?
        `;
        await connection.query(insertExercisesQuery, [exerciseValues]);
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Training plan saved successfully',
        planId: planId,
      });
    } catch (error) {
      await connection.rollback();
      console.error('Error saving plan:', error);
      res.status(500).json({ message: 'Error saving plan: ' + error.message });
    } finally {
      connection.end();
    }
  }
};
