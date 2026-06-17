const axios = require('axios');

const mealApi = axios.create({
  baseURL: 'https://www.themealdb.com/api/json/v1/1',
});

// Search meals by name
async function searchMeals(query) {
  const { data } = await mealApi.get('/search.php', { params: { s: query } });
  return data.meals || [];
}

// Filter meals by category
async function filterByCategory(category) {
  const { data } = await mealApi.get('/filter.php', { params: { c: category } });
  return data.meals || [];
}

// Filter meals by main ingredient (e.g. "chicken_breast")
async function filterByIngredient(ingredient) {
  const { data } = await mealApi.get('/filter.php', { params: { i: ingredient } });
  return data.meals || [];
}

// Get meal by id
async function getMealById(id) {
  const { data } = await mealApi.get('/lookup.php', { params: { i: id } });
  return data.meals?.[0] || null;
}

// List available meal categories
async function getCategories() {
  const { data } = await mealApi.get('/categories.php');
  return data.categories || [];
}

module.exports = {
  searchMeals,
  filterByCategory,
  filterByIngredient,
  getMealById,
  getCategories,
};
