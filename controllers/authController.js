const { authService } = require('../services/authService');

// req/res only: call the service, map tagged errors (err.status) to JSON {message},
// everything else to a 500 (plain-text send, no logging — matching prior behavior).
// No SQL, no bcrypt, no dbConnection here.

exports.authController = {
    async signup(req, res) {
        try {
            await authService.signup(req.body);
            res.status(201).json({ message: 'User registered successfully' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            res.status(500).send('Error registering user: ' + error.message);
        }
    },

    async login(req, res) {
        try {
            const result = await authService.login(req.body);
            res.status(200).json(result);
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            res.status(500).send('Error logging in: ' + error.message);
        }
    },
};
