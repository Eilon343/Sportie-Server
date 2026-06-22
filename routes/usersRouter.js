const { Router } = require('express');
const { usersController } = require('../controllers/usersController');

const usersRouter = Router();

// Change a user's password.
usersRouter.put('/:userId/password', usersController.changePassword);

module.exports = usersRouter;
