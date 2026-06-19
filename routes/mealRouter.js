const { Router } = require('express');
const { mealController } = require('../controllers/mealController');

const mealRouter = Router();

mealRouter.get('/search', mealController.searchMeals);
mealRouter.get('/letter/:letter', mealController.searchByFirstLetter);
mealRouter.get('/random', mealController.getRandomMeal);
mealRouter.get('/categories', mealController.getCategories);
mealRouter.get('/category/:category', mealController.filterByCategory);
mealRouter.get('/area/:area', mealController.filterByArea);
mealRouter.get('/ingredient/:ingredient', mealController.filterByIngredient);
mealRouter.get('/list/categories', mealController.listCategoryNames);
mealRouter.get('/list/areas', mealController.listAreas);
mealRouter.get('/list/ingredients', mealController.listIngredients);
mealRouter.get('/:id', mealController.getMealById);

module.exports = mealRouter;