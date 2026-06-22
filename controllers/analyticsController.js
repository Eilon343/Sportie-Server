const { analyticsService } = require('../services/analyticsService');

exports.analyticsController = {
    // Lists the trainees who might be dropping off, for a given trainer. Used on the dashboard.
    //GET /api/analytics/at-risk/:trainerId
    async getAtRisk(req, res) {
        try {
            const data = await analyticsService.getAtRisk(req.params.trainerId);
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching at-risk trainees:', error);
            res.status(500).send('Error fetching at-risk trainees: ' + error.message);
        }
    },

    // Shows how the trainer's trainees are spread out by attendance. Used for charts.
    //GET /api/analytics/attendance-distribution/:trainerId
    async getAttendanceDistribution(req, res) {
        try {
            const data = await analyticsService.getAttendanceDistribution(req.params.trainerId);
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching attendance distribution:', error);
            res.status(500).send('Error fetching attendance distribution: ' + error.message);
        }
    },

    // Ranks a trainer's trainees by a chosen metric (body weight or strength).
    //GET /api/analytics/leaderboard/:trainerId?metric=body_weight|strength
    async getLeaderboard(req, res) {
        try {
            const data = await analyticsService.getLeaderboard(req.params.trainerId, req.query.metric);
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            res.status(500).send('Error fetching leaderboard: ' + error.message);
        }
    },

    // Gives training volume over time so you can see progress trends.
    //GET /api/analytics/volume-over-time/:trainerId
    async getVolumeOverTime(req, res) {
        try {
            const data = await analyticsService.getVolumeOverTime(req.params.trainerId);
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching volume over time:', error);
            res.status(500).send('Error fetching volume over time: ' + error.message);
        }
    },

    // Builds the heatmap data of when trainees are most active.
    //GET /api/analytics/engagement-heatmap/:trainerId
    async getEngagementHeatmap(req, res) {
        try {
            const data = await analyticsService.getEngagementHeatmap(req.params.trainerId);
            res.status(200).json(data);
        } catch (error) {
            console.error('Error fetching engagement heatmap:', error);
            res.status(500).send('Error fetching engagement heatmap: ' + error.message);
        }
    },
};
