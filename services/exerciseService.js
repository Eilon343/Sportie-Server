const { buildUrl, getJSON } = require('./httpClient');

const BASE_URL = process.env.EXERCISEDB_BASE_URL;
const HEADERS = {
  'x-rapidapi-key': process.env.EXERCISEDB_KEY,
  'x-rapidapi-host': process.env.EXERCISEDB_HOST,
  'Content-Type': 'application/json',
};

async function getExercises({ bodyPart, target, equipment, limit = 20, offset = 0 } = {}) {
  let path = '/exercises';
  if (bodyPart) path = `/exercises/bodyPart/${bodyPart}`;
  else if (target) path = `/exercises/target/${target}`;
  else if (equipment) path = `/exercises/equipment/${equipment}`;

  return getJSON(buildUrl(BASE_URL, path, { limit, offset }), HEADERS);
}

// One exercise by id
async function getExerciseById(id) {
  return getJSON(buildUrl(BASE_URL, `/exercises/exercise/${id}`), HEADERS);
}

// Search exercises by name
async function searchExercisesByName(name, { limit = 20, offset = 0 } = {}) {
  return getJSON(buildUrl(BASE_URL, `/exercises/name/${name}`, { limit, offset }), HEADERS);
}

// Lists for building dropdowns / filters in the trainer UI
async function getBodyPartList() {
  return getJSON(buildUrl(BASE_URL, '/exercises/bodyPartList'), HEADERS);
}

async function getTargetList() {
  return getJSON(buildUrl(BASE_URL, '/exercises/targetList'), HEADERS);
}

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
