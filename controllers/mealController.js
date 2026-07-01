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
  async searchMeals(req, res, next) {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ message: 'Query param "q" is required' });
      }
      const meals = await searchMeals(q);
      res.status(200).json(meals);
    } catch (error) {
      console.error('Error searching meals:', error);
      next(error);
    }
  },

  // Gets meals whose name starts with a given letter.
  async searchByFirstLetter(req, res, next) {
    const { letter } = req.params;
    // TheMealDB's f= filter expects exactly one alphabetic character.
    if (!/^[a-zA-Z]$/.test(letter)) {
      return res.status(400).json({ message: 'Parameter "letter" must be a single letter (a-z)' });
    }
    try {
      const meals = await searchByFirstLetter(letter);
      res.status(200).json(meals);
    } catch (error) {
      console.error('Error fetching meals by letter:', error);
      next(error);
    }
  },

  // Gets a single meal by its id, or 404 if it doesn't exist.
  async getMealById(req, res, next) {
    const { id } = req.params;
    // TheMealDB meal ids are numeric.
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: 'Invalid meal id: must be numeric' });
    }
    try {
      const meal = await getMealById(id);
      if (!meal) {
        return res.status(404).json({ message: 'Meal not found' });
      }
      res.status(200).json(meal);
    } catch (error) {
      console.error('Error fetching meal:', error);
      next(error);
    }
  },

  // Picks a random meal, handy for suggestions.
  async getRandomMeal(req, res, next) {
    try {
      const meal = await getRandomMeal();
      res.status(200).json(meal);
    } catch (error) {
      console.error('Error fetching random meal:', error);
      next(error);
    }
  },

  // Gets all the meal categories (with their details).
  async getCategories(req, res, next) {
    try {
      const categories = await getCategories();
      res.status(200).json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      next(error);
    }
  },

  // Gets meals that belong to a given category.
  async filterByCategory(req, res, next) {
    try {
      const meals = await filterByCategory(req.params.category);
      res.status(200).json(meals);
    } catch (error) {
      console.error('Error filtering by category:', error);
      next(error);
    }
  },

  // Gets meals from a given area/cuisine.
  async filterByArea(req, res, next) {
    try {
      const meals = await filterByArea(req.params.area);
      res.status(200).json(meals);
    } catch (error) {
      console.error('Error filtering by area:', error);
      next(error);
    }
  },

  // Gets meals that use a given ingredient.
  async filterByIngredient(req, res, next) {
    try {
      const meals = await filterByIngredient(req.params.ingredient);
      res.status(200).json(meals);
    } catch (error) {
      console.error('Error filtering by ingredient:', error);
      next(error);
    }
  },

  // Returns just the category names, for dropdowns.
  async listCategoryNames(req, res, next) {
    try {
      const names = await listCategoryNames();
      res.status(200).json(names);
    } catch (error) {
      console.error('Error listing category names:', error);
      next(error);
    }
  },

  // Returns the list of areas/cuisines, for dropdowns.
  async listAreas(req, res, next) {
    try {
      const areas = await listAreas();
      res.status(200).json(areas);
    } catch (error) {
      console.error('Error listing areas:', error);
      next(error);
    }
  },

  // Returns the list of ingredients, for dropdowns.
  async listIngredients(req, res, next) {
    try {
      const ingredients = await listIngredients();
      res.status(200).json(ingredients);
    } catch (error) {
      console.error('Error listing ingredients:', error);
      next(error);
    }
  },
};