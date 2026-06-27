const { buildUrl, getJSON } = require('./httpClient');

const BASE_URL = process.env.EXERCISEDB_BASE_URL;
const HEADERS = {
  'x-rapidapi-key': process.env.EXERCISEDB_KEY,
  'x-rapidapi-host': process.env.EXERCISEDB_HOST,
  'Content-Type': 'application/json',
};


// Fetches exercises from the ExerciseDB API, optionally filtered by body part, target, or equipment.
async function getExercises({ bodyPart, target, equipment, limit = 20, offset = 0 } = {}) {
  let path = '/exercises';
  if (bodyPart) path = `/exercises/bodyPart/${bodyPart}`;
  else if (target) path = `/exercises/target/${target}`;
  else if (equipment) path = `/exercises/equipment/${equipment}`;

  return getJSON(buildUrl(BASE_URL, path, { limit, offset }), HEADERS);
}

// Grabs a single exercise by its id.
async function getExerciseById(id) {
  return getJSON(buildUrl(BASE_URL, `/exercises/exercise/${id}`), HEADERS);
}

// Searches exercises by name.
async function searchExercisesByName(name, { limit = 20, offset = 0 } = {}) {
  const result = await getJSON(buildUrl(BASE_URL, `/exercises/name/${name}`, { limit, offset }), HEADERS);
  console.log('ExerciseDB sample: ', result[0]);
  return result;
}

// The next three return simple lists used to fill dropdowns / filters in the trainer UI.
// All available body parts.
async function getBodyPartList() {
  return getJSON(buildUrl(BASE_URL, '/exercises/bodyPartList'), HEADERS);
}

// All available target muscles.
async function getTargetList() {
  return getJSON(buildUrl(BASE_URL, '/exercises/targetList'), HEADERS);
}

// All available equipment types.
async function getEquipmentList() {
  return getJSON(buildUrl(BASE_URL, '/exercises/equipmentList'), HEADERS);
}

module.exports = {
  getExercises,
  getExerciseById,
  searchExercisesByName,
  getBodyPartList,
  getTargetList,
  getEquipmentList,
};
