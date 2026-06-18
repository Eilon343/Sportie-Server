const axios = require('axios');

const mealApi = axios.create({
  baseURL: 'https://www.themealdb.com/api/json/v1/1',
});

// Search meals by name
async function searchMeals(query) {
  const { data } = await mealApi.get('/search.php', { params: { s: query } });
  return data.meals || [];
}

// List all meals starting with a given letter
async function searchByFirstLetter(letter) {
  const { data } = await mealApi.get('/search.php', { params: { f: letter } });
  return data.meals || [];
}

// Full details of one meal by id
async function getMealById(id) {
  const { data } = await mealApi.get('/lookup.php', { params: { i: id } });
  return data.meals?.[0] || null;
}

// One random meal
async function getRandomMeal() {
  const { data } = await mealApi.get('/random.php');
  return data.meals?.[0] || null;
}

// Categories with descriptions and thumbnails
async function getCategories() {
  const { data } = await mealApi.get('/categories.php');
  return data.categories || [];
}

// Filter meals (each returns lightweight cards: id, name, thumb)
async function filterByCategory(category) {
  const { data } = await mealApi.get('/filter.php', { params: { c: category } });
  return data.meals || [];
}

async function filterByArea(area) {
  const { data } = await mealApi.get('/filter.php', { params: { a: area } });
  return data.meals || [];
}

async function filterByIngredient(ingredient) {
  const { data } = await mealApi.get('/filter.php', { params: { i: ingredient } });
  return data.meals || [];
}

// Simple lists for dropdowns
async function listCategoryNames() {
  const { data } = await mealApi.get('/list.php', { params: { c: 'list' } });
  return (data.meals || []).map((m) => m.strCategory);
}

async function listAreas() {
  const { data } = await mealApi.get('/list.php', { params: { a: 'list' } });
  return (data.meals || []).map((m) => m.strArea);
}

async function listIngredients() {
  const { data } = await mealApi.get('/list.php', { params: { i: 'list' } });
  return data.meals || [];
}

module.exports = {
  searchMeals,
  searchByFirstLetter,
  getMealById,
  getRandomMeal,
  getCategories,
  filterByCategory,
  filterByArea,
  filterByIngredient,
  listCategoryNames,
  listAreas,
  listIngredients,
};
