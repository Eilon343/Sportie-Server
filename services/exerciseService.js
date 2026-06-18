const axios = require('axios');

const exerciseApi = axios.create({
  baseURL: 'https://exercisedb.p.rapidapi.com',
  headers: {
    'x-rapidapi-key': process.env.EXERCISEDB_KEY,
    'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
    'Content-Type': 'application/json',
  },
});

// Get exercises, optionally filtered by body part, target, or equipment
async function getExercises({ bodyPart, target, equipment, limit = 20, offset = 0 } = {}) {
  let path = '/exercises';
  if (bodyPart) path = `/exercises/bodyPart/${bodyPart}`;
  else if (target) path = `/exercises/target/${target}`;
  else if (equipment) path = `/exercises/equipment/${equipment}`;

  const { data } = await exerciseApi.get(path, { params: { limit, offset } });
  return data;
}

// One exercise by id
async function getExerciseById(id) {
  const { data } = await exerciseApi.get(`/exercises/exercise/${id}`);
  return data;
}

// Search exercises by name
async function searchExercisesByName(name, { limit = 20, offset = 0 } = {}) {
  const { data } = await exerciseApi.get(`/exercises/name/${name}`, {
    params: { limit, offset },
  });
  return data;
}

// Lists for building dropdowns / filters in the trainer UI
async function getBodyPartList() {
  const { data } = await exerciseApi.get('/exercises/bodyPartList');
  return data;
}

async function getTargetList() {
  const { data } = await exerciseApi.get('/exercises/targetList');
  return data;
}

async function getEquipmentList() {
  const { data } = await exerciseApi.get('/exercises/equipmentList');
  return data;
}

module.exports = {
  getExercises,
  getExerciseById,
  searchExercisesByName,
  getBodyPartList,
  getTargetList,
  getEquipmentList,
};
