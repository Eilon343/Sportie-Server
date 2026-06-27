const { authRepo } = require('../schemas/authRepo');
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
    // Hashes the password then atomically creates the users row + trainers row.
    // The trainer's name defaults to the email prefix; they can update it in settings.
    async signup(body) {
        const { email, password } = body;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const defaultName = email.split('@')[0];
        try {
            await authRepo.createTrainerAccount(email, hashedPassword, defaultName);
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') throw httpError(400, 'Email already exists');
            throw error;
        }
    },

    // Checks email + password and returns the trainer profile (never the password).
    // Throws 401 for bad credentials, 403 if the account has no trainer profile.
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
