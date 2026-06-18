const { buildUrl, getJSON } = require('./httpClient');

const BASE_URL = process.env.MEALDB_BASE_URL;

// Search meals by name
async function searchMeals(query) {
  const data = await getJSON(buildUrl(BASE_URL, '/search.php', { s: query }));
  return data.meals || [];
}

// List all meals starting with a given letter
async function searchByFirstLetter(letter) {
  const data = await getJSON(buildUrl(BASE_URL, '/search.php', { f: letter }));
  return data.meals || [];
}

// Full details of one meal by id
async function getMealById(id) {
  const data = await getJSON(buildUrl(BASE_URL, '/lookup.php', { i: id }));
  return data.meals?.[0] || null;
}

// One random meal
async function getRandomMeal() {
  const data = await getJSON(buildUrl(BASE_URL, '/random.php'));
  return data.meals?.[0] || null;
}

// Categories with descriptions and thumbnails
async function getCategories() {
  const data = await getJSON(buildUrl(BASE_URL, '/categories.php'));
  return data.categories || [];
}

// Filter meals (each returns lightweight cards: id, name, thumb)
async function filterByCategory(category) {
  const data = await getJSON(buildUrl(BASE_URL, '/filter.php', { c: category }));
  return data.meals || [];
}

async function filterByArea(area) {
  const data = await getJSON(buildUrl(BASE_URL, '/filter.php', { a: area }));
  return data.meals || [];
}

async function filterByIngredient(ingredient) {
  const data = await getJSON(buildUrl(BASE_URL, '/filter.php', { i: ingredient }));
  return data.meals || [];
}

// Simple lists for dropdowns
async function listCategoryNames() {
  const data = await getJSON(buildUrl(BASE_URL, '/list.php', { c: 'list' }));
  return (data.meals || []).map((m) => m.strCategory);
}

async function listAreas() {
  const data = await getJSON(buildUrl(BASE_URL, '/list.php', { a: 'list' }));
  return (data.meals || []).map((m) => m.strArea);
}

async function listIngredients() {
  const data = await getJSON(buildUrl(BASE_URL, '/list.php', { i: 'list' }));
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
