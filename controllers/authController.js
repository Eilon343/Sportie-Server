const { authService } = require('../services/authService');

exports.authController = {
    // Registers a new user from the signup form.
    async signup(req, res) {
        try {
            await authService.signup(req.body);
            res.status(201).json({ message: 'User registered successfully' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            res.status(500).send('Error registering user: ' + error.message);
        }
    },

    // Logs a user in and returns their token/info.
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
