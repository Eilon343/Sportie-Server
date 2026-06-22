const { getExercises } = require('./exerciseService');

const GOAL_SCHEMES = {
  strength:    { sets: 4, reps: 5,  restSeconds: 180 },
  hypertrophy: { sets: 3, reps: 10, restSeconds: 90 },
  'fat loss':  { sets: 3, reps: 15, restSeconds: 45 },
};

const DEFAULT_BODY_PARTS = ['chest', 'back', 'upper legs', 'shoulders'];

// Spreads the body parts across the training days, one focus part per day (looping if needed).
function buildSplit(bodyParts, daysPerWeek) {
  const split = Array.from({ length: daysPerWeek }, () => []);
  for (let i = 0; i < daysPerWeek; i++) {
    const part = bodyParts[i % bodyParts.length];
    split[i].push(part);
  }
  return split;
}

// Auto-builds a full workout plan: picks sets/reps from the goal, then pulls exercises per day.
async function generatePlan({ goal, daysPerWeek = 3, bodyParts, exercisesPerDay = 4 } = {}) {
  const scheme = GOAL_SCHEMES[goal];
  if (!scheme) {
    throw new Error(`Unknown goal "${goal}". Use: ${Object.keys(GOAL_SCHEMES).join(', ')}`);
  }

  const parts = (bodyParts && bodyParts.length) ? bodyParts : DEFAULT_BODY_PARTS;
  const split = buildSplit(parts, daysPerWeek);

  const days = [];
  for (let i = 0; i < split.length; i++) {
    const focusParts = split[i];
    const dayExercises = [];
    const perPart = Math.max(1, Math.floor(exercisesPerDay / focusParts.length));

    for (const part of focusParts) {
      const fetched = await getExercises({ bodyPart: part, limit: perPart });
      for (const ex of fetched) {
        dayExercises.push({
          id: ex.id,
          name: ex.name,
          bodyPart: ex.bodyPart,
          target: ex.target,
          equipment: ex.equipment,
          difficulty: ex.difficulty,
          sets: scheme.sets,
          reps: scheme.reps,
          restSeconds: scheme.restSeconds,
        });
      }
    }

    days.push({ day: i + 1, focus: focusParts, exercises: dayExercises });
  }

  return { goal, daysPerWeek, scheme, bodyParts: parts, days };
}

module.exports = { generatePlan };
