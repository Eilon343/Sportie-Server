const { Router } = require('express');
const { usersController } = require('../controllers/usersController');

const usersRouter = Router();

usersRouter.put('/:userId/password', usersController.changePassword);

module.exports = usersRouter;
