const { analyticsRepo } = require('../repositories/analyticsRepo');

// Business rules + response shaping. SQL does the aggregation; this layer only
// does thresholds, bucketing, week formatting and DTO shaping.

// Turns a MySQL YEARWEEK number like 202624 into a readable "2026-W24" label.
function formatIsoWeek(yearweek) {
    const s = String(yearweek);
    const year = s.slice(0, 4);
    const week = s.slice(4).padStart(2, '0');
    return `${year}-W${week}`;
}

exports.analyticsService = {
    // Lists trainees who haven't trained in a while so the trainer can follow up.
    // Returns null when the trainer id doesn't exist so the controller can 404
    // (an empty array is a valid result: a real trainer with nobody at risk).
    async getAtRisk(trainerId) {
        if (!(await analyticsRepo.trainerExists(trainerId))) return null;
        const rows = await analyticsRepo.atRisk(trainerId);
        return rows.map((r) => ({
            trainee_id: r.trainee_id,
            name: r.name,
            last_completed_at: r.last_completed_at,           // null = never completed a session
            days_since: r.days_since === null ? null : Number(r.days_since),
        }));
    },

    // Groups trainees into attendance buckets (<50%, 50-80%, 80+%) and counts how many fall in each.
    // Returns null for an unknown trainer id so the controller can 404 instead of 200.
    async getAttendanceDistribution(trainerId) {
        if (!(await analyticsRepo.trainerExists(trainerId))) return null;
        const rows = await analyticsRepo.attendanceRaw(trainerId);
        const buckets = { '<50': 0, '50-80': 0, '80+': 0 };
        let withoutPlan = 0;

        for (const r of rows) {
            const expected = Number(r.days_per_week) * 4;
            if (expected <= 0) {
                withoutPlan += 1;                              // no plan -> no expectation to measure against
                continue;
            }
            const pct = (Number(r.completed) / expected) * 100;
            if (pct < 50) buckets['<50'] += 1;
            else if (pct < 80) buckets['50-80'] += 1;
            else buckets['80+'] += 1;
        }

        return {
            window_weeks: 4,
            buckets,
            trainees_without_plan: withoutPlan,
            total_trainees: rows.length,
        };
    },

    // Ranks trainees by progress, either strength or body weight depending on the metric asked for.
    // Returns null for an unknown trainer id so the controller can 404 instead of 200.
    async getLeaderboard(trainerId, metric) {
        if (!(await analyticsRepo.trainerExists(trainerId))) return null;
        const normalized = metric === 'strength' ? 'strength' : 'body_weight';
        const rows = normalized === 'strength'
            ? await analyticsRepo.leaderboardStrength(trainerId)
            : await analyticsRepo.leaderboardBodyWeight(trainerId);

        return {
            metric: normalized,
            ranking: rows.map((r, i) => ({
                rank: i + 1,
                trainee_id: r.trainee_id,
                name: r.name,
                start_value: Number(r.start_value),
                latest_value: Number(r.latest_value),
                pct_change: Number(r.pct_change),
            })),
        };
    },

    // Gives total training volume per week so you can chart it over time.
    // Returns null for an unknown trainer id so the controller can 404 instead of 200.
    async getVolumeOverTime(trainerId) {
        if (!(await analyticsRepo.trainerExists(trainerId))) return null;
        const rows = await analyticsRepo.volumeOverTime(trainerId);
        return rows.map((r) => ({
            week: formatIsoWeek(r.iso_yearweek),
            total_volume: Number(r.total_volume),
        }));
    },

    // Builds a heatmap grid (one row per trainee, one column per week) of session counts.
    // Returns null for an unknown trainer id so the controller can 404 instead of 200.
    async getEngagementHeatmap(trainerId) {
        if (!(await analyticsRepo.trainerExists(trainerId))) return null;
        const [roster, rows] = await Promise.all([
            analyticsRepo.listTrainees(trainerId),
            analyticsRepo.engagementHeatmap(trainerId),
        ]);

        // Distinct weeks present, ascending -> column order.
        const weekSet = new Set(rows.map((r) => r.iso_yearweek));
        const weeks = [...weekSet].sort((a, b) => a - b);
        const weekLabels = weeks.map(formatIsoWeek);

        // counts[trainee_id][iso_yearweek] = session_count
        const counts = new Map();
        for (const r of rows) {
            if (!counts.has(r.trainee_id)) counts.set(r.trainee_id, {});
            counts.get(r.trainee_id)[r.iso_yearweek] = Number(r.session_count);
        }

        const grid = roster.map((t) => ({
            trainee_id: t.trainee_id,
            name: t.name,
            counts: weeks.map((w) => (counts.get(t.trainee_id)?.[w]) ?? 0),
        }));

        return { weeks: weekLabels, rows: grid };
    },
};
