const { usersRepo } = require('../repositories/usersRepo');
const bcrypt = require('bcrypt');

const saltRounds = 10;

// All password rules + bcrypt logic live here. The stored hash is read for comparison
// and never returned to the controller or placed in any response. No req/res, no SQL.

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

exports.usersService = {
    // Resolves on success; throws tagged errors for every non-200 branch.
    async changePassword(userId, body) {
        const { currentPassword, newPassword, confirmNewPassword } = body || {};

        // Validation (same order/messages as before).
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            throw httpError(400, 'All password fields are required');
        }
        if (newPassword !== confirmNewPassword) {
            throw httpError(400, 'New passwords do not match');
        }
        if (newPassword.length < 6) {
            throw httpError(400, 'Password must be at least 6 characters');
        }

        const row = await usersRepo.findPasswordHash(userId);
        if (!row) throw httpError(404, 'User not found');

        const isMatch = await bcrypt.compare(currentPassword, row.password);
        if (!isMatch) throw httpError(401, 'Current password is incorrect');

        const hashed = await bcrypt.hash(newPassword, saltRounds);
        await usersRepo.updatePasswordHash(userId, hashed);
    },
};
