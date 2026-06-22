const { Router } = require('express');
const { mealController } = require('../controllers/mealController');

const mealRouter = Router();

// Search meals by name.
mealRouter.get('/search', mealController.searchMeals);
// Find meals starting with a given letter.
mealRouter.get('/letter/:letter', mealController.searchByFirstLetter);
// Get one random meal.
mealRouter.get('/random', mealController.getRandomMeal);
// Get the full meal categories (with details).
mealRouter.get('/categories', mealController.getCategories);
// Get meals in a given category.
mealRouter.get('/category/:category', mealController.filterByCategory);
// Get meals from a given area/cuisine.
mealRouter.get('/area/:area', mealController.filterByArea);
// Get meals that use a given ingredient.
mealRouter.get('/ingredient/:ingredient', mealController.filterByIngredient);
// Just the list of category names.
mealRouter.get('/list/categories', mealController.listCategoryNames);
// Just the list of areas/cuisines.
mealRouter.get('/list/areas', mealController.listAreas);
// Just the list of ingredients.
mealRouter.get('/list/ingredients', mealController.listIngredients);
// Get one meal by its id.
mealRouter.get('/:id', mealController.getMealById);

module.exports = mealRouter;