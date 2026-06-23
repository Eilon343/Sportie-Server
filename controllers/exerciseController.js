const {
  getExercises,
  getExerciseById,
  searchExercisesByName,
  getBodyPartList,
  getTargetList,
  getEquipmentList,
} = require('../services/exerciseService');

exports.exerciseController = {
  // Gets a list of exercises, optionally filtered by body part, target, or equipment.
  async getExercises(req, res) {
    try {
      const { bodyPart, target, equipment, limit, offset } = req.query;
      const data = await getExercises({ bodyPart, target, equipment, limit, offset });
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      res.status(500).send('Error fetching exercises: ' + error.message);
    }
  },

  // Searches exercises by name.
  async searchExercisesByName(req, res) {
    try {
      const { limit, offset } = req.query;
      const data = await searchExercisesByName(req.params.name, { limit, offset });
      res.status(200).json(data);
    } catch (error) {
      console.error('Error searching exercises:', error);
      res.status(500).send('Error searching exercises: ' + error.message);
    }
  },

  // Returns all the body part options you can filter by.
  async getBodyPartList(req, res) {
    try {
      const data = await getBodyPartList();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching body parts:', error);
      res.status(500).send('Error fetching body parts: ' + error.message);
    }
  },

  // Returns all the target muscle options you can filter by.
  async getTargetList(req, res) {
    try {
      const data = await getTargetList();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching targets:', error);
      res.status(500).send('Error fetching targets: ' + error.message);
    }
  },

  // Returns all the equipment options you can filter by.
  async getEquipmentList(req, res) {
    try {
      const data = await getEquipmentList();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      res.status(500).send('Error fetching equipment: ' + error.message);
    }
  },

  // Gets a single exercise by its id.
  async getExerciseById(req, res) {
    const { id } = req.params;
    if (!id || !id.trim()) {
      return res.status(400).json({ message: 'Parameter "id" is required' });
    }
    try {
      const data = await getExerciseById(id);
      // ExerciseDB returns an empty body/array for an unknown id.
      const empty = !data || (Array.isArray(data) && data.length === 0)
        || (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0);
      if (empty) {
        return res.status(404).json({ message: 'Exercise not found' });
      }
      res.status(200).json(data);
    } catch (error) {
      // The upstream API answers 404 for ids it doesn't recognise — surface that as a 404.
      if (error.message && error.message.includes('(404)')) {
        return res.status(404).json({ message: 'Exercise not found' });
      }
      console.error('Error fetching exercise:', error);
      res.status(500).send('Error fetching exercise: ' + error.message);
    }
  },
};