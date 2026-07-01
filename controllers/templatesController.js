const { templatesService } = require('../services/templatesService');
const { isInvalidId } = require('../utils/validation');

exports.templatesController = {
    //  WORKOUT 

    // GET /api/templates/workout?trainerId= — list a trainer's workout templates.
    async listWorkoutTemplates(req, res, next) {
        try {
            const { trainerId } = req.query;
            if (!trainerId) return res.status(400).json({ message: 'Query "trainerId" is required' });
            if (isInvalidId(String(trainerId))) return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });

            const templates = await templatesService.listWorkoutTemplates(trainerId);
            res.status(200).json(templates);
        } catch (error) {
            console.error('Error listing workout templates:', error);
            next(error);
        }
    },

    // POST /api/templates/workout — save a new workout template (409 if over the cap).
    async saveWorkoutTemplate(req, res, next) {
        try {
            const { trainerId, name, mode, goal, blocks } = req.body;
            if (!trainerId) return res.status(400).json({ message: 'Field "trainerId" is required' });
            if (isInvalidId(String(trainerId))) return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
            if (!name) return res.status(400).json({ message: 'Field "name" is required' });

            const templateId = await templatesService.saveWorkoutTemplate({ trainerId, name, mode, goal, blocks });
            res.status(201).json({ success: true, templateId });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error saving workout template:', error);
            next(error);
        }
    },

    // DELETE /api/templates/workout/:id — delete a workout template (cascades).
    async deleteWorkoutTemplate(req, res, next) {
        try {
            const { id } = req.params;
            if (isInvalidId(id)) return res.status(400).json({ message: 'Invalid template id: must be a positive integer' });
            const deleted = await templatesService.deleteWorkoutTemplate(id);
            if (!deleted) return res.status(404).json({ message: 'Workout template not found' });
            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error deleting workout template:', error);
            next(error);
        }
    },

    // PUT /api/templates/workout/:id — edit an existing workout template in place.
    async updateWorkoutTemplate(req, res, next) {
        try {
            const { id } = req.params;
            if (isInvalidId(id)) return res.status(400).json({ message: 'Invalid template id: must be a positive integer' });
            const { name, mode, goal, blocks } = req.body;
            if (!name) return res.status(400).json({ message: 'Field "name" is required' });

            await templatesService.updateWorkoutTemplate(id, { name, mode, goal, blocks });
            res.status(200).json({ success: true, templateId: Number(id) });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error updating workout template:', error);
            next(error);
        }
    },

    // POST /api/templates/workout/:id/assign — copy the template into a new active plan for a trainee.
    async assignWorkoutTemplate(req, res, next) {
        try {
            const { id } = req.params;
            if (isInvalidId(id)) return res.status(400).json({ message: 'Invalid template id: must be a positive integer' });
            const { traineeId } = req.body;
            if (!traineeId) return res.status(400).json({ message: 'Field "traineeId" is required' });
            if (isInvalidId(String(traineeId))) return res.status(400).json({ message: 'Invalid traineeId: must be a positive integer' });

            const planId = await templatesService.assignWorkoutTemplate(id, traineeId);
            res.status(201).json({ success: true, planId });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error assigning workout template:', error);
            next(error);
        }
    },

    //  MEAL 

    // GET /api/templates/meal?trainerId= — list a trainer's meal templates.
    async listMealTemplates(req, res, next) {
        try {
            const { trainerId } = req.query;
            if (!trainerId) return res.status(400).json({ message: 'Query "trainerId" is required' });
            if (isInvalidId(String(trainerId))) return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });

            const templates = await templatesService.listMealTemplates(trainerId);
            res.status(200).json(templates);
        } catch (error) {
            console.error('Error listing meal templates:', error);
            next(error);
        }
    },

    // POST /api/templates/meal — save a new meal template (409 if over the cap).
    async saveMealTemplate(req, res, next) {
        try {
            const { trainerId, name, slots } = req.body;
            if (!trainerId) return res.status(400).json({ message: 'Field "trainerId" is required' });
            if (isInvalidId(String(trainerId))) return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
            if (!name) return res.status(400).json({ message: 'Field "name" is required' });

            const templateId = await templatesService.saveMealTemplate({ trainerId, name, slots });
            res.status(201).json({ success: true, templateId });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error saving meal template:', error);
            next(error);
        }
    },

    // DELETE /api/templates/meal/:id — delete a meal template (cascades).
    async deleteMealTemplate(req, res, next) {
        try {
            const { id } = req.params;
            if (isInvalidId(id)) return res.status(400).json({ message: 'Invalid template id: must be a positive integer' });
            const deleted = await templatesService.deleteMealTemplate(id);
            if (!deleted) return res.status(404).json({ message: 'Meal template not found' });
            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error deleting meal template:', error);
            next(error);
        }
    },

    // PUT /api/templates/meal/:id — edit an existing meal template in place.
    async updateMealTemplate(req, res, next) {
        try {
            const { id } = req.params;
            if (isInvalidId(id)) return res.status(400).json({ message: 'Invalid template id: must be a positive integer' });
            const { name, slots } = req.body;
            if (!name) return res.status(400).json({ message: 'Field "name" is required' });

            await templatesService.updateMealTemplate(id, { name, slots });
            res.status(200).json({ success: true, templateId: Number(id) });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error updating meal template:', error);
            next(error);
        }
    },

    // POST /api/templates/meal/:id/assign — copy the template into a new active meal plan for a trainee.
    async assignMealTemplate(req, res, next) {
        try {
            const { id } = req.params;
            if (isInvalidId(id)) return res.status(400).json({ message: 'Invalid template id: must be a positive integer' });
            const { traineeId } = req.body;
            if (!traineeId) return res.status(400).json({ message: 'Field "traineeId" is required' });
            if (isInvalidId(String(traineeId))) return res.status(400).json({ message: 'Invalid traineeId: must be a positive integer' });

            const mealPlanId = await templatesService.assignMealTemplate(id, traineeId);
            res.status(201).json({ success: true, mealPlanId });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error assigning meal template:', error);
            next(error);
        }
    }
};
