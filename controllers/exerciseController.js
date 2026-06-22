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
    try {
      const data = await getExerciseById(req.params.id);
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching exercise:', error);
      res.status(500).send('Error fetching exercise: ' + error.message);
    }
  },
};