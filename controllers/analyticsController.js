const { analyticsService } = require('../services/analyticsService');
const { isInvalidId } = require('../utils/validation');

exports.analyticsController = {
    // Lists the trainees who might be dropping off, for a given trainer. Used on the dashboard.
    //GET /api/analytics/at-risk/:trainerId
    async getAtRisk(req, res, next) {
        const { trainerId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        try {
            const data = await analyticsService.getAtRisk(trainerId);
            if (data === null) {
                return res.status(404).json({ message: 'Trainer not found' });
            }
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching at-risk trainees:', error);
            next(error);
        }
    },

    // Total completed workouts this week (Sun-Sat) for the trainer's trainees. Dashboard tile.
    //GET /api/analytics/workouts-this-week/:trainerId
    async getWorkoutsThisWeek(req, res, next) {
        const { trainerId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        try {
            const data = await analyticsService.getWorkoutsThisWeek(trainerId);
            if (data === null) {
                return res.status(404).json({ message: 'Trainer not found' });
            }
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching workouts this week:', error);
            next(error);
        }
    },

    // Shows how the trainer's trainees are spread out by attendance. Used for charts.
    //GET /api/analytics/attendance-distribution/:trainerId
    async getAttendanceDistribution(req, res, next) {
        const { trainerId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        try {
            const data = await analyticsService.getAttendanceDistribution(trainerId);
            if (data === null) {
                return res.status(404).json({ message: 'Trainer not found' });
            }
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching attendance distribution:', error);
            next(error);
        }
    },

    // Ranks a trainer's trainees by a chosen metric (body weight or strength).
    //GET /api/analytics/leaderboard/:trainerId?metric=body_weight|strength
    async getLeaderboard(req, res, next) {
        const { trainerId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        try {
            const data = await analyticsService.getLeaderboard(trainerId, req.query.metric);
            if (data === null) {
                return res.status(404).json({ message: 'Trainer not found' });
            }
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            next(error);
        }
    },

    // Gives training volume over time so you can see progress trends.
    //GET /api/analytics/volume-over-time/:trainerId
    async getVolumeOverTime(req, res, next) {
        const { trainerId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        try {
            const data = await analyticsService.getVolumeOverTime(trainerId);
            if (data === null) {
                return res.status(404).json({ message: 'Trainer not found' });
            }
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching volume over time:', error);
            next(error);
        }
    },

    // Builds the heatmap data of when trainees are most active.
    //GET /api/analytics/engagement-heatmap/:trainerId
    async getEngagementHeatmap(req, res, next) {
        const { trainerId } = req.params;
        if (isInvalidId(trainerId)) {
            return res.status(400).json({ message: 'Invalid trainerId: must be a positive integer' });
        }
        try {
            const data = await analyticsService.getEngagementHeatmap(trainerId);
            if (data === null) {
                return res.status(404).json({ message: 'Trainer not found' });
            }
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching engagement heatmap:', error);
            next(error);
        }
    },

    //GET /api/analytics/trainee-weekly-activity/:traineeId
    async getTraineeWeeklyActivity(req, res, next) {
        const { traineeId } = req.params;
        if (isInvalidId(traineeId)) {
            return res.status(400).json({ message: 'Invalid traineeId: must be a positive integer' });
        }
        try {
            const data = await analyticsService.getTraineeWeeklyActivity(traineeId);
            if (data === null) {
                return res.status(404).json({ message: 'Trainee not found' });
            }
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching trainee weekly activity:', error);
            next(error);
        }
    },

    //GET /api/analytics/trainee-recent-sessions/:traineeId
    async getTraineeRecentSessions(req, res, next) {
        const { traineeId } = req.params;
        if (isInvalidId(traineeId)) {
            return res.status(400).json({ message: 'Invalid traineeId: must be a positive integer' });
        }
        try {
            const data = await analyticsService.getTraineeRecentSessions(traineeId);
            if (data === null) {
                return res.status(404).json({ message: 'Trainee not found' });
            }
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching trainee recent sessions:', error);
            next(error);
        }
    },
};
