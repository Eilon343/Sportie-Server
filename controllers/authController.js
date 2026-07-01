const { authService } = require('../services/authService');

exports.authController = {
    // Registers a new user from the signup form.
    async signup(req, res, next) {
        const { email, password } = req.body || {};
        if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'A valid email is required' });
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }
        try {
            await authService.signup(req.body);
            res.status(201).json({ message: 'User registered successfully' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            next(error);
        }
    },

    // Logs a user in and returns their token/info.
    async login(req, res, next) {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        try {
            const result = await authService.login(req.body);
            res.status(200).json(result);
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            next(error);
        }
    },
};
