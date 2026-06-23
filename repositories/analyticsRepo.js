const { dbConnection } = require('../db_connection');

// All SQL for the analytics feature lives here. One async method per query,
// parameterized with mysql2 placeholders (no string interpolation of inputs).
// Each method opens and closes its own connection, matching the existing
// per-handler connection pattern used across the controllers.

// Little helper that runs a SQL query and hands back the rows, then closes the connection.
async function runQuery(sql, params = []) {
    const pool = await dbConnection.createConnection();
    const [rows] = await pool.execute(sql, params);
    return rows;
}

exports.analyticsRepo = {
    // Checks whether a trainer actually exists, so endpoints can return 404
    // instead of an empty result for an unknown trainer id.
    async trainerExists(trainerId) {
        const rows = await runQuery(
            'SELECT 1 FROM trainers WHERE trainer_id = ? LIMIT 1',
            [trainerId]
        );
        return rows.length > 0;
    },

    // Grabs all the trainees that belong to one trainer from the trainees table.
    async listTrainees(trainerId) {
        return runQuery(
            'SELECT trainee_id, name FROM trainees WHERE trainer_id = ? ORDER BY trainee_id',
            [trainerId]
        );
    },

    // Counts the trainer's trainees' COMPLETED workouts in the current week
    // (Sunday -> Saturday). DAYOFWEEK() returns 1 for Sunday, so subtracting
    // (DAYOFWEEK - 1) days from today lands on this week's Sunday; the range is
    // [Sunday 00:00, next Sunday 00:00) so it covers through Saturday night.
    async workoutsThisWeek(trainerId) {
        const rows = await runQuery(
            `SELECT COUNT(*) AS workouts_this_week
             FROM workout_sessions ws
             JOIN trainees t ON t.trainee_id = ws.trainee_id
             WHERE t.trainer_id = ?
               AND ws.status = 'completed'
               AND ws.performed_at >= (CURDATE() - INTERVAL (DAYOFWEEK(CURDATE()) - 1) DAY)
               AND ws.performed_at <  (CURDATE() - INTERVAL (DAYOFWEEK(CURDATE()) - 1) DAY + INTERVAL 7 DAY)`,
            [trainerId]
        );
        return rows[0].workouts_this_week;
    },

    // Finds trainees who haven't finished a workout in the last 7 days (or ever).
    // Sorts the most overdue first so never-trained people show up at the top.
    async atRisk(trainerId) {
        return runQuery(
            `SELECT t.trainee_id,
                    t.name,
                    MAX(CASE WHEN ws.status = 'completed' THEN ws.performed_at END) AS last_completed_at,
                    DATEDIFF(NOW(), MAX(CASE WHEN ws.status = 'completed' THEN ws.performed_at END)) AS days_since
             FROM trainees t
             LEFT JOIN workout_sessions ws ON ws.trainee_id = t.trainee_id
             WHERE t.trainer_id = ?
             GROUP BY t.trainee_id, t.name
             HAVING last_completed_at IS NULL
                 OR last_completed_at < (NOW() - INTERVAL 7 DAY)
             ORDER BY (last_completed_at IS NOT NULL) ASC, last_completed_at ASC`,
            [trainerId]
        );
    },

    // For each trainee, pulls how many workouts they finished in the last 4 weeks
    // plus how many per week their newest plan expects. The service does the math.
    async attendanceRaw(trainerId) {
        return runQuery(
            `SELECT t.trainee_id,
                    t.name,
                    COALESCE(s.completed, 0)      AS completed,
                    COALESCE(p.days_per_week, 0)  AS days_per_week
             FROM trainees t
             LEFT JOIN (
                 SELECT trainee_id, COUNT(*) AS completed
                 FROM workout_sessions
                 WHERE status = 'completed'
                   AND performed_at >= (NOW() - INTERVAL 4 WEEK)
                 GROUP BY trainee_id
             ) s ON s.trainee_id = t.trainee_id
             LEFT JOIN (
                 SELECT tp.trainee_id, tp.days_per_week
                 FROM training_plans tp
                 JOIN (
                     SELECT trainee_id, MAX(plan_id) AS max_plan
                     FROM training_plans
                     GROUP BY trainee_id
                 ) latest ON latest.trainee_id = tp.trainee_id AND latest.max_plan = tp.plan_id
             ) p ON p.trainee_id = t.trainee_id
             WHERE t.trainer_id = ?`,
            [trainerId]
        );
    },

    // Body-weight leaderboard: for each trainee, the percent change from their first
    // to their latest weigh-in. People with only one measurement are left out.
    /* The UNIQUE(trainee_id, metric_type, measured_at) key means one value per date,
       so the MIN/MAX-date joins each return exactly one row. */
    async leaderboardBodyWeight(trainerId) {
        return runQuery(
            `WITH bounds AS (
                 SELECT trainee_id, MIN(measured_at) AS first_d, MAX(measured_at) AS last_d
                 FROM trainee_metrics
                 WHERE metric_type = 'body_weight'
                 GROUP BY trainee_id
             )
             SELECT t.trainee_id,
                    t.name,
                    me.value AS start_value,
                    ml.value AS latest_value,
                    ROUND((ml.value - me.value) / me.value * 100, 2) AS pct_change
             FROM trainees t
             JOIN bounds b ON b.trainee_id = t.trainee_id AND b.first_d <> b.last_d
             JOIN trainee_metrics me ON me.trainee_id = b.trainee_id
                                    AND me.metric_type = 'body_weight'
                                    AND me.measured_at = b.first_d
             JOIN trainee_metrics ml ON ml.trainee_id = b.trainee_id
                                    AND ml.metric_type = 'body_weight'
                                    AND ml.measured_at = b.last_d
             WHERE t.trainer_id = ?
             ORDER BY pct_change DESC`,
            [trainerId]
        );
    },

    // Strength leaderboard: percent change in each trainee's best estimated 1-rep max
    // from their first training day to their latest. One-day trainees are skipped.
    /* Uses the Epley formula weight*(1+reps/30); the best lift of a day stands for that day. */
    async leaderboardStrength(trainerId) {
        return runQuery(
            `WITH daily AS (
                 SELECT ws.trainee_id,
                        DATE(ws.performed_at) AS d,
                        MAX(ls.weight * (1 + ls.reps / 30)) AS est_1rm
                 FROM logged_sets ls
                 JOIN workout_sessions ws ON ws.session_id = ls.session_id
                 WHERE ws.status = 'completed' AND ws.performed_at IS NOT NULL
                 GROUP BY ws.trainee_id, DATE(ws.performed_at)
             ),
             bounds AS (
                 SELECT trainee_id, MIN(d) AS first_d, MAX(d) AS last_d
                 FROM daily
                 GROUP BY trainee_id
             )
             SELECT t.trainee_id,
                    t.name,
                    ROUND(de.est_1rm, 2) AS start_value,
                    ROUND(dl.est_1rm, 2) AS latest_value,
                    ROUND((dl.est_1rm - de.est_1rm) / de.est_1rm * 100, 2) AS pct_change
             FROM trainees t
             JOIN bounds b ON b.trainee_id = t.trainee_id AND b.first_d <> b.last_d
             JOIN daily de ON de.trainee_id = b.trainee_id AND de.d = b.first_d
             JOIN daily dl ON dl.trainee_id = b.trainee_id AND dl.d = b.last_d
             WHERE t.trainer_id = ?
             ORDER BY pct_change DESC`,
            [trainerId]
        );
    },

    // Adds up total lifted volume (weight*reps) across the trainer's finished sessions,
    // grouped by week. YEARWEEK(..., 2) means Sunday-start weeks (Sun-Sat), 1-53.
    async volumeOverTime(trainerId) {
        return runQuery(
            `SELECT YEARWEEK(ws.performed_at, 2) AS yearweek,
                    SUM(ls.weight * ls.reps)     AS total_volume
             FROM logged_sets ls
             JOIN workout_sessions ws ON ws.session_id = ls.session_id
             JOIN trainees t          ON t.trainee_id  = ws.trainee_id
             WHERE t.trainer_id = ?
               AND ws.status = 'completed'
               AND ws.performed_at IS NOT NULL
             GROUP BY YEARWEEK(ws.performed_at, 2)
             ORDER BY yearweek ASC`,
            [trainerId]
        );
    },

    // Counts finished sessions per trainee per week for the last 12 weeks.
    // Comes back as plain rows; the service turns it into the heatmap grid.
    async engagementHeatmap(trainerId) {
        return runQuery(
            `SELECT t.trainee_id,
                    t.name,
                    YEARWEEK(ws.performed_at, 2) AS yearweek,
                    COUNT(*)                     AS session_count
             FROM trainees t
             JOIN workout_sessions ws ON ws.trainee_id = t.trainee_id
             WHERE t.trainer_id = ?
               AND ws.status = 'completed'
               AND ws.performed_at >= (NOW() - INTERVAL 12 WEEK)
             GROUP BY t.trainee_id, t.name, YEARWEEK(ws.performed_at, 2)
             ORDER BY t.trainee_id, yearweek`,
            [trainerId]
        );
    },
};
