const { buildUrl, getJSON } = require('./httpClient');

const BASE_URL = process.env.MEALDB_BASE_URL;

// Searches meals by name.
async function searchMeals(query) {
  const data = await getJSON(buildUrl(BASE_URL, '/search.php', { s: query }));
  return data.meals || [];
}

// Lists all meals that start with the given letter.
async function searchByFirstLetter(letter) {
  const data = await getJSON(buildUrl(BASE_URL, '/search.php', { f: letter }));
  return data.meals || [];
}

// Gets the full details of one meal by id.
async function getMealById(id) {
  const data = await getJSON(buildUrl(BASE_URL, '/lookup.php', { i: id }));
  return data.meals?.[0] || null;
}

// Gets one random meal.
async function getRandomMeal() {
  const data = await getJSON(buildUrl(BASE_URL, '/random.php'));
  return data.meals?.[0] || null;
}

// Gets all meal categories, with their descriptions and thumbnails.
async function getCategories() {
  const data = await getJSON(buildUrl(BASE_URL, '/categories.php'));
  return data.categories || [];
}

// The next three filter meals and return lightweight cards (just id, name, thumb).
// Filters meals by category.
async function filterByCategory(category) {
  const data = await getJSON(buildUrl(BASE_URL, '/filter.php', { c: category }));
  return data.meals || [];
}

// Filters meals by area (cuisine).
async function filterByArea(area) {
  const data = await getJSON(buildUrl(BASE_URL, '/filter.php', { a: area }));
  return data.meals || [];
}

// Filters meals by main ingredient.
async function filterByIngredient(ingredient) {
  const data = await getJSON(buildUrl(BASE_URL, '/filter.php', { i: ingredient }));
  return data.meals || [];
}

// The next three return simple lists for dropdowns.
// Lists all category names.
async function listCategoryNames() {
  const data = await getJSON(buildUrl(BASE_URL, '/list.php', { c: 'list' }));
  return (data.meals || []).map((m) => m.strCategory);
}

// Lists all area (cuisine) names.
async function listAreas() {
  const data = await getJSON(buildUrl(BASE_URL, '/list.php', { a: 'list' }));
  return (data.meals || []).map((m) => m.strArea);
}

// Lists all ingredients.
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
