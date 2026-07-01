const { Router } = require('express');
const { usersController } = require('../controllers/usersController');

const usersRouter = Router();

// Change a user's password. The caller may only change their own password.
usersRouter.put('/:userId/password', usersController.changePassword);

module.exports = usersRouter;
