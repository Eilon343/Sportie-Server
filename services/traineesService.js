const { traineesRepo } = require('../schemas/traineesRepo');
const { validateAvatar } = require('../utils/avatar');

// Business rules + response shaping. No SQL here, no req/res here.
// Trainees endpoints are pass-through (no DTO needed); the only rules are avatar
// validation, input normalization, and translating a duplicate-email error.

exports.traineesService = {
    // Gets all the trainees that belong to one trainer.
    async getTraineesByTrainer(trainerId) {
        return traineesRepo.findByTrainerId(trainerId);
    },

    // Gets one trainee by id, or null if there's no match.
    async getTraineeById(traineeId) {
        const rows = await traineesRepo.findById(traineeId);
        return rows.length ? rows[0] : null;
    },

    // Lets a trainee edit their own profile. Returns true if something was updated, false if not found.
    // Throws 413 if the avatar is too big, 409 if the email is already taken.
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
