const { usersService } = require('../services/usersService');
const { isInvalidId } = require('../utils/validation');

exports.usersController = {
    // Changes a user's password.
    async changePassword(req, res) {
        const { userId } = req.params;
        if (isInvalidId(userId)) {
            return res.status(400).json({ message: 'Invalid userId: must be a positive integer' });
        }
        try {
            await usersService.changePassword(userId, req.body);
            res.status(200).json({ message: 'Password changed successfully' });
        } catch (error) {
            if (error.status) return res.status(error.status).json({ message: error.message });
            console.error('Error changing password:', error);
            res.status(500).send('Error changing password: ' + error.message);
        }
    },
};
