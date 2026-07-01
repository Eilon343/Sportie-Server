const {
  getExercises,
  getExerciseById,
  searchExercisesByName,
  getBodyPartList,
  getTargetList,
  getEquipmentList,
} = require('../services/exerciseService');
const { exerciseRepo } = require('../schemas/exerciseRepo');

function parseJsonColumn(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return []; }
}

function normalizeDbRow(row) {
  return {
    id: row.exercise_id,
    name: row.name,
    target: row.target,
    body_part: row.body_part,
    equipment: row.equipment,
    difficulty: row.difficulty || null,
    category: row.category || null,
    secondaryMuscles: parseJsonColumn(row.secondary_muscles),
    instructions: parseJsonColumn(row.instructions),
    description: row.description || null,
  };
}

exports.exerciseController = {
  // Gets a list of exercises. When the `search` query param is present, checks the local
  // DB cache first; falls back to ExerciseDB and caches any new results.
  async getExercises(req, res, next) {
    try {
      const { bodyPart, target, equipment, limit, offset, search } = req.query;

      if (search !== undefined) {
        const query = (search || '').trim();

        if (query) {
          // Name search — DB first (optionally filtered by body part), then ExerciseDB.
          let localResults = [];
          try {
            localResults = await exerciseRepo.searchByName(query, 20, bodyPart || '');
          } catch (dbErr) {
            console.error('DB exercise search failed:', dbErr);
          }

          if (localResults.length > 0) {
            return res.status(200).json(localResults.map(normalizeDbRow));
          }

          try {
            const apiResults = await searchExercisesByName(query, { limit: limit || 20, offset: offset || 0 });
            exerciseRepo.insertManyExercises(apiResults).catch(err => console.error('Exercise cache write failed:', err));
            return res.status(200).json(apiResults);
          } catch (apiErr) {
            console.error('ExerciseDB search failed:', apiErr);
            return res.status(200).json([]);
          }
        }

        // Empty search — body part filter or full library load.
        if (bodyPart) {
          let dbResults = [];
          try {
            dbResults = await exerciseRepo.searchByBodyPart(bodyPart, 20);
          } catch (dbErr) {
            console.error('DB body part search failed:', dbErr);
          }

          if (dbResults.length > 0) {
            return res.status(200).json(dbResults.map(normalizeDbRow));
          }

          try {
            const apiResults = await getExercises({ bodyPart, limit: limit || 20, offset: offset || 0 });
            exerciseRepo.insertManyExercises(apiResults).catch(err => console.error('Exercise cache write failed:', err));
            return res.status(200).json(apiResults);
          } catch (apiErr) {
            console.error('ExerciseDB body part fetch failed:', apiErr);
            return res.status(200).json([]);
          }
        }

        // No query, no bodyPart — return top 20 from DB or ExerciseDB.
        let allLocal = [];
        try {
          allLocal = await exerciseRepo.searchByName('', 20);
        } catch (dbErr) {
          console.error('DB exercise fetch failed:', dbErr);
        }

        if (allLocal.length > 0) {
          return res.status(200).json(allLocal.map(normalizeDbRow));
        }

        try {
          const data = await getExercises({ limit: limit || 20, offset: offset || 0 });
          return res.status(200).json(data);
        } catch (apiErr) {
          console.error('ExerciseDB default fetch failed:', apiErr);
          return res.status(200).json([]);
        }
      }

      // No search param — original filter behaviour (bodyPart / target / equipment).
      const data = await getExercises({ bodyPart, target, equipment, limit, offset });
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      next(error);
    }
  },

  // Searches exercises by name.
  async searchExercisesByName(req, res, next) {
    try {
      const { limit, offset } = req.query;
      const data = await searchExercisesByName(req.params.name, { limit, offset });
      res.status(200).json(data);
    } catch (error) {
      console.error('Error searching exercises:', error);
      next(error);
    }
  },

  // Returns all the body part options you can filter by.
  async getBodyPartList(req, res, next) {
    try {
      const data = await getBodyPartList();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching body parts:', error);
      next(error);
    }
  },

  // Returns all the target muscle options you can filter by.
  async getTargetList(req, res, next) {
    try {
      const data = await getTargetList();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching targets:', error);
      next(error);
    }
  },

  // Returns all the equipment options you can filter by.
  async getEquipmentList(req, res, next) {
    try {
      const data = await getEquipmentList();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      next(error);
    }
  },

  // Gets a single exercise by its id.
  async getExerciseById(req, res, next) {
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
      next(error);
    }
  },
};