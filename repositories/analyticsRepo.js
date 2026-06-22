const { dbConnection } = require('../db_connection');

async function runQuery(sql, params = []) {
    const pool = await dbConnection.createConnection();
    const [rows] = await pool.execute(sql, params);
    return rows;
}

exports.analyticsRepo = {
    //every trainee under a trainer.
    async listTrainees(trainerId) {
        return runQuery(
            'SELECT trainee_id, name FROM trainees WHERE trainer_id = ? ORDER BY trainee_id',
            [trainerId]
        );
    },

    //trainees with no completed session in the last 7 days (incl. never trained).
    //Most-overdue first: never-trained (NULL) on top, then oldest last-completed date.
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

    //Attendance: per trainee, completed sessions in last 4 weeks + expected/week from the
    //latest training plan (highest plan_id). Service computes %/buckets from these raw numbers.
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

    /*Leaderboard (body_weight): % change earliest -> latest body_weight metric per trainee.
        The UNIQUE(trainee_id, metric_type, measured_at) key guarantees one value per date,
        so the MIN/MAX-date joins return exactly one row each. Single-point trainees excluded.*/
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

    /*Leaderboard (strength): % change in best est. 1RM (Epley: weight*(1+reps/30))
        from the trainee's earliest to latest training day. Max 1RM per day represents that day.
        Single-day trainees excluded (first_d <> last_d)*/
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

    /*Volume over time: SUM(weight*reps) over the trainer's completed sessions, by ISO week.
        EARWEEK(..., 3) = ISO-8601 week (Monday start, week 1 has >= 4 days).*/
    async volumeOverTime(trainerId) {
        return runQuery(
            `SELECT YEARWEEK(ws.performed_at, 3) AS iso_yearweek,
                    SUM(ls.weight * ls.reps)     AS total_volume
             FROM logged_sets ls
             JOIN workout_sessions ws ON ws.session_id = ls.session_id
             JOIN trainees t          ON t.trainee_id  = ws.trainee_id
             WHERE t.trainer_id = ?
               AND ws.status = 'completed'
               AND ws.performed_at IS NOT NULL
             GROUP BY YEARWEEK(ws.performed_at, 3)
             ORDER BY iso_yearweek ASC`,
            [trainerId]
        );
    },

    /*Engagement heatmap: completed sessions per trainee per ISO week, last 12 weeks.
        Returns flat rows; the service pivots into the trainees x weeks grid.*/
    async engagementHeatmap(trainerId) {
        return runQuery(
            `SELECT t.trainee_id,
                    t.name,
                    YEARWEEK(ws.performed_at, 3) AS iso_yearweek,
                    COUNT(*)                     AS session_count
             FROM trainees t
             JOIN workout_sessions ws ON ws.trainee_id = t.trainee_id
             WHERE t.trainer_id = ?
               AND ws.status = 'completed'
               AND ws.performed_at >= (NOW() - INTERVAL 12 WEEK)
             GROUP BY t.trainee_id, t.name, YEARWEEK(ws.performed_at, 3)
             ORDER BY t.trainee_id, iso_yearweek`,
            [trainerId]
        );
    },
};
