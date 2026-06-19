const { analyticsRepo } = require('../repositories/analyticsRepo');

// Business rules + response shaping. SQL does the aggregation; this layer only
// does thresholds, bucketing, week formatting and DTO shaping.

// Format a MySQL YEARWEEK(date, 3) integer (e.g. 202624) into an ISO label "2026-W24".
function formatIsoWeek(yearweek) {
    const s = String(yearweek);
    const year = s.slice(0, 4);
    const week = s.slice(4).padStart(2, '0');
    return `${year}-W${week}`;
}

exports.analyticsService = {
    // #1
    async getAtRisk(trainerId) {
        const rows = await analyticsRepo.atRisk(trainerId);
        return rows.map((r) => ({
            trainee_id: r.trainee_id,
            name: r.name,
            last_completed_at: r.last_completed_at,           // null = never completed a session
            days_since: r.days_since === null ? null : Number(r.days_since),
        }));
    },

    // #2 — bucket each trainee by attendance %, return COUNT of trainees per bucket.
    async getAttendanceDistribution(trainerId) {
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

    // #3 — metric toggle picks the repo method; shaping is identical for both.
    async getLeaderboard(trainerId, metric) {
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

    // #4
    async getVolumeOverTime(trainerId) {
        const rows = await analyticsRepo.volumeOverTime(trainerId);
        return rows.map((r) => ({
            week: formatIsoWeek(r.iso_yearweek),
            total_volume: Number(r.total_volume),
        }));
    },

    // #5 — pivot flat rows into a grid: every roster trainee is a row; weeks are columns.
    async getEngagementHeatmap(trainerId) {
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
