const axios = require('axios');

const exerciseApi = axios.create({
  baseURL: 'https://exercisedb.p.rapidapi.com',
  headers: {
    'x-rapidapi-key': process.env.EXERCISEDB_KEY,
    'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
    'Content-Type': 'application/json',
  },
});

async function getExercises({ bodyPart, target, equipment, limit = 20, offset = 0 } = {}) {
  let path = '/exercises';
  if (bodyPart) path = `/exercises/bodyPart/${bodyPart}`;
  else if (target) path = `/exercises/target/${target}`;
  else if (equipment) path = `/exercises/equipment/${equipment}`;

  const { data } = await exerciseApi.get(path, { params: { limit, offset } });
  return data;
}

async function getExerciseById(id) {
  const { data } = await exerciseApi.get(`/exercises/exercise/${id}`);
  return data;
}

async function getBodyPartList() {
  const { data } = await exerciseApi.get('/exercises/bodyPartList');
  return data;
}

module.exports = { getExercises, getExerciseById, getBodyPartList };
