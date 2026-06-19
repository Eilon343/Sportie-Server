const { trainersRepo } = require('../repositories/trainersRepo');
const { validateAvatar } = require('../utils/avatar');

// Business rules + orchestration + response shaping. No SQL, no req/res.
// Non-200 outcomes are surfaced as tagged errors (err.status); the controller maps them.

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

exports.trainersService = {
    // Pass-through reads (no DTO). getTrainerById returns the joined row or null.
    async getTrainerById(trainerId) {
        const rows = await trainersRepo.findById(trainerId);
        return rows.length ? rows[0] : null;
    },

    async getAllTrainers() {
        return trainersRepo.findAll();
    },

    async getMonthlyActiveTrainees(trainerId) {
        return trainersRepo.findMonthlyActivity(trainerId);
    },

    // Returns true when updated, false when the trainer wasn't found.
    // Throws tagged 413 (avatar too large) / 409 (duplicate email).
    async updateOwnProfile(trainerId, body) {
        const {
            email, date_of_birth, country_code, phone_number,
            name, specialization, avatar_color, avatar_url,
            units, notifications_enabled,
        } = body;

        const avatarError = validateAvatar(avatar_url);
        if (avatarError) throw httpError(413, avatarError);

        const userFields = {
            email: email ?? null,
            date_of_birth: date_of_birth || null,
            country_code: country_code || null,
            phone_number: phone_number || null,
        };
        const trainerFields = {
            name: name ?? null,
            specialization: specialization ?? null,
            avatar_color: avatar_color || null,
            avatar_url: avatar_url || null,
            units: units ?? null,
            notifications_enabled: notifications_enabled ?? null,
        };

        try {
            const affected = await trainersRepo.updateProfileTx(trainerId, userFields, trainerFields);
            return affected > 0;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') throw httpError(409, 'Email already in use');
            throw error;
        }
    },

    // Returns the changed-row count. Throws tagged 404 when the trainee isn't under this trainer.
    async updateManagedTrainee(trainerId, traineeId, body) {
        const { status, progress, goal, start_weight, current_weight } = body;
        const fields = {
            status: status ?? null,
            progress: progress ?? null,
            goal: goal ?? null,
            start_weight: start_weight ?? null,
            current_weight: current_weight ?? null,
        };

        const { found, changed } = await trainersRepo.updateManagedTraineeTx(trainerId, traineeId, fields);
        if (!found) throw httpError(404, 'Trainee not found under this trainer');
        return changed;
    },

    // Success => resolves. Throws tagged 404 / 409 for the failure cases.
    async assignTrainee(trainerId, traineeId) {
        const outcome = await trainersRepo.assignTraineeTx(trainerId, traineeId);
        if (outcome === 'not_found') throw httpError(404, 'Trainee not found. They must sign up first.');
        if (outcome === 'already_assigned') throw httpError(409, 'Trainee is already assigned to a trainer');
        // 'assigned' => success
    },

    async unassignTrainee(trainerId, traineeId) {
        const affected = await trainersRepo.unassignTrainee(trainerId, traineeId);
        if (affected === 0) throw httpError(404, 'Trainee not found under this trainer');
    },

    async deleteTrainer(trainerId) {
        const affected = await trainersRepo.deleteTrainerTx(trainerId);
        if (affected === 0) throw httpError(404, 'Trainer not found');
    },
};
