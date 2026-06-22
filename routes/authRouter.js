const { Router } = require('express');
const { authController } = require('../controllers/authController');

const authRouter = Router();

// Make a new account.
authRouter.post('/signup', authController.signup);
// Log in an existing user.
authRouter.post('/login', authController.login);

module.exports = authRouter;