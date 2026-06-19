const { traineesRepo } = require('../repositories/traineesRepo');
const { validateAvatar } = require('../utils/avatar');

// Business rules + response shaping. No SQL here, no req/res here.
// Trainees endpoints are pass-through (no DTO needed); the only rules are avatar
// validation, input normalization, and translating a duplicate-email error.

exports.traineesService = {
    // Returns the rows array as-is (controller maps empty -> 404).
    async getTraineesByTrainer(trainerId) {
        return traineesRepo.findByTrainerId(trainerId);
    },

    // Returns the single row, or null when not found.
    async getTraineeById(traineeId) {
        const rows = await traineesRepo.findById(traineeId);
        return rows.length ? rows[0] : null;
    },

    // Returns true when a trainee row was updated, false when the trainee wasn't found.
    // Throws a tagged error (err.status) for avatar-too-large (413) and duplicate email (409).
    async updateOwnProfile(traineeId, body) {
        const {
            email, date_of_birth, country_code, phone_number,
            name, goal, avatar_color, avatar_url,
        } = body;

        const avatarError = validateAvatar(avatar_url);
        if (avatarError) {
            const err = new Error(avatarError);
            err.status = 413;
            throw err;
        }

        // Same null-normalization the controller used before (note: email/name/goal use
        // ?? so '' passes through; the rest use || so '' becomes null).
        const userFields = {
            email: email ?? null,
            date_of_birth: date_of_birth || null,
            country_code: country_code || null,
            phone_number: phone_number || null,
        };
        const traineeFields = {
            name: name ?? null,
            goal: goal ?? null,
            avatar_color: avatar_color || null,
            avatar_url: avatar_url || null,
        };

        try {
            const affected = await traineesRepo.updateProfileTx(traineeId, userFields, traineeFields);
            return affected > 0;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                const err = new Error('Email already in use');
                err.status = 409;
                throw err;
            }
            throw error;
        }
    },
};
