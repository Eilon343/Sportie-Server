const { authRepo } = require('../repositories/authRepo');
const bcrypt = require('bcrypt');

const saltRounds = 10;

// Auth rules + ALL bcrypt + the defensive login envelope. No SQL, no req/res.
// Non-2xx outcomes surface as tagged errors (err.status); the controller maps them.

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

exports.authService = {
    // Resolves on success (controller emits 201). Throws tagged 400 on duplicate email.
    async signup(body) {
        const { email, password } = body;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        try {
            await authRepo.insertUser(email, hashedPassword, 'trainer');
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') throw httpError(400, 'Email already exists');
            throw error;
        }
    },

    // Returns the EXACT session contract { message, trainer }, where `trainer` is the
    // trainers-table row as-is (no password column). The password-bearing users row used
    // for bcrypt is never included. Throws tagged 401 / 403 to match current behavior.
    async login(body) {
        const { email, password } = body;

        const user = await authRepo.findUserByEmail(email);
        if (!user) throw httpError(401, 'Invalid email or password');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw httpError(401, 'Invalid email or password');

        const trainer = await authRepo.findTrainerById(user.user_id);
        if (!trainer) throw httpError(403, 'No trainer profile for this account');

        return { message: 'Login successful', trainer };
    },
};
