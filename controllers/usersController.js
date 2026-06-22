const { usersService } = require('../services/usersService');

exports.usersController = {
    // Changes a user's password.
    async changePassword(req, res) {
        try {
            await usersService.changePassword(req.params.userId, req.body);
            res.status(200).json({ message: 'Password changed successfully' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error changing password:', error);
            res.status(500).send('Error changing password: ' + error.message);
        }
    },
};
