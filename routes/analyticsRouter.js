const { Router } = require('express');
const { analyticsController } = require('../controllers/analyticsController');

const analyticsRouter = Router();

analyticsRouter.get('/at-risk/:trainerId', analyticsController.getAtRisk);
analyticsRouter.get('/attendance-distribution/:trainerId', analyticsController.getAttendanceDistribution);
analyticsRouter.get('/leaderboard/:trainerId', analyticsController.getLeaderboard);
analyticsRouter.get('/volume-over-time/:trainerId', analyticsController.getVolumeOverTime);
analyticsRouter.get('/engagement-heatmap/:trainerId', analyticsController.getEngagementHeatmap);

module.exports = analyticsRouter;
