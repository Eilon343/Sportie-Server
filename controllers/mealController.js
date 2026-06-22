const {
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
} = require('../services/mealService');

exports.mealController = {
  // Searches meals by a query string (the "q" param is required).
  async searchMeals(req, res) {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: 'Query param "q" is required' });
      }
      const meals = await searchMeals(q);
      res.status(200).json(meals);
    } catch (error) {
      console.error('Error searching meals:', error);
      res.status(500).send('Error searching meals: ' + error.message);
    }
  },

  // Gets meals whose name starts with a given letter.
  async searchByFirstLetter(req, res) {
    try {
      const meals = await searchByFirstLetter(req.params.letter);
      res.status(200).json(meals);
    } catch (error) {
      console.error('Error fetching meals by letter:', error);
      res.status(500).send('Error fetching meals by letter: ' + error.message);
    }
  },

  // Gets a single meal by its id, or 404 if it doesn't exist.
  async getMealById(req, res) {
    try {
      const meal = await getMealById(req.params.id);
      if (!meal) {
        return res.status(404).json({ message: 'Meal not found' });
      }
      res.status(200).json(meal);
    } catch (error) {
      console.error('Error fetching meal:', error);
      res.status(500).send('Error fetching meal: ' + error.message);
    }
  },

  // Picks a random meal, handy for suggestions.
  async getRandomMeal(req, res) {
    try {
      const meal = await getRandomMeal();
      res.status(200).json(meal);
    } catch (error) {
      console.error('Error fetching random meal:', error);
      res.status(500).send('Error fetching random meal: ' + error.message);
    }
  },

  // Gets all the meal categories (with their details).
  async getCategories(req, res) {
    try {
      const categories = await getCategories();
      res.status(200).json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).send('Error fetching categories: ' + error.message);
    }
  },

  // Gets meals that belong to a given category.
  async filterByCategory(req, res) {
    try {
      const meals = await filterByCategory(req.params.category);
      res.status(200).json(meals);
    } catch (error) {
      console.error('Error filtering by category:', error);
      res.status(500).send('Error filtering by category: ' + error.message);
    }
  },

  // Gets meals from a given area/cuisine.
  async filterByArea(req, res) {
    try {
      const meals = await filterByArea(req.params.area);
      res.status(200).json(meals);
    } catch (error) {
      console.error('Error filtering by area:', error);
      res.status(500).send('Error filtering by area: ' + error.message);
    }
  },

  // Gets meals that use a given ingredient.
  async filterByIngredient(req, res) {
    try {
      const meals = await filterByIngredient(req.params.ingredient);
      res.status(200).json(meals);
    } catch (error) {
      console.error('Error filtering by ingredient:', error);
      res.status(500).send('Error filtering by ingredient: ' + error.message);
    }
  },

  // Returns just the category names, for dropdowns.
  async listCategoryNames(req, res) {
    try {
      const names = await listCategoryNames();
      res.status(200).json(names);
    } catch (error) {
      console.error('Error listing category names:', error);
      res.status(500).send('Error listing category names: ' + error.message);
    }
  },

  // Returns the list of areas/cuisines, for dropdowns.
  async listAreas(req, res) {
    try {
      const areas = await listAreas();
      res.status(200).json(areas);
    } catch (error) {
      console.error('Error listing areas:', error);
      res.status(500).send('Error listing areas: ' + error.message);
    }
  },

  // Returns the list of ingredients, for dropdowns.
  async listIngredients(req, res) {
    try {
      const ingredients = await listIngredients();
      res.status(200).json(ingredients);
    } catch (error) {
      console.error('Error listing ingredients:', error);
      res.status(500).send('Error listing ingredients: ' + error.message);
    }
  },
};