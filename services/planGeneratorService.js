const { getExercises } = require('./exerciseService');

// define goal scheme
const GOAL_SCHEMES = {
  strength:    { sets: 4, reps: 5,  restSeconds: 180 },
  hypertrophy: { sets: 3, reps: 10, restSeconds: 90 },
  'fat loss':  { sets: 3, reps: 15, restSeconds: 45 },
};

// Default body parts if the trainer doesn't specify any
const DEFAULT_BODY_PARTS = ['chest', 'back', 'upper legs', 'shoulders'];

const EXERCISES_PER_DAY = 4;

// Spread the chosen body parts across the number of training days.
// Fewer days than body parts -> group multiple parts into a day.
function buildSplit(bodyParts, daysPerWeek) {
  const split = Array.from({ length: daysPerWeek }, () => []);
  bodyParts.forEach((part, i) => {
    split[i % daysPerWeek].push(part);
  });
  return split;
}

async function generatePlan({ goal, daysPerWeek = 3, bodyParts } = {}) {
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

    // Pull exercises from each body part assigned to this day
    const perPart = Math.max(1, Math.floor(EXERCISES_PER_DAY / focusParts.length));
    for (const part of focusParts) {
      const fetched = await getExercises({ bodyPart: part, limit: perPart });
      for (const ex of fetched) {
        dayExercises.push({
          id: ex.id,
          name: ex.name,
          bodyPart: ex.bodyPart,
          target: ex.target,
          gifUrl: ex.gifUrl,
          sets: scheme.sets,
          reps: scheme.reps,
          restSeconds: scheme.restSeconds,
        });
      }
    }

    days.push({
      day: i + 1,
      focus: focusParts,
      exercises: dayExercises,
    });
  }

  return {
    goal,
    daysPerWeek,
    scheme,
    bodyParts: parts,
    days,
  };
}

module.exports = { generatePlan };
