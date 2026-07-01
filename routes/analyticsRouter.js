const { Router } = require('express');
const { analyticsController } = require('../controllers/analyticsController');

const analyticsRouter = Router();

// Total completed workouts this week (Sun-Sat) across the trainer's trainees. Dashboard tile.
analyticsRouter.get('/workouts-this-week/:trainerId', analyticsController.getWorkoutsThisWeek);
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

// Per-day session counts for the current week for a single trainee (must be one of your trainees).
analyticsRouter.get('/trainee-weekly-activity/:traineeId', analyticsController.getTraineeWeeklyActivity);
// Last 5 completed sessions for a single trainee with set count and volume (must be one of your trainees).
analyticsRouter.get('/trainee-recent-sessions/:traineeId', analyticsController.getTraineeRecentSessions);

module.exports = analyticsRouter;
