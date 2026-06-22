const { Router } = require('express');
const { analyticsController } = require('../controllers/analyticsController');

const analyticsRouter = Router();

// List the trainer's trainees who might be slipping / at risk of dropping off.
analyticsRouter.get('/at-risk/:trainerId', analyticsController.getAtRisk);
// Show how the trainer's trainees are spread out by attendance.
analyticsRouter.get('/attendance-distribution/:trainerId', analyticsController.getAttendanceDistribution);
// Ranked list of the trainer's trainees (who's doing best).
analyticsRouter.get('/leaderboard/:trainerId', analyticsController.getLeaderboard);
// Training volume for the trainer's trainees over time.
analyticsRouter.get('/volume-over-time/:trainerId', analyticsController.getVolumeOverTime);
// Heatmap of when the trainer's trainees are most active.
analyticsRouter.get('/engagement-heatmap/:trainerId', analyticsController.getEngagementHeatmap);

module.exports = analyticsRouter;
