const { dbConnection } = require('../db_connection');
const bcrypt = require('bcrypt');

const saltRounds = 10;

exports.usersController = {
    async changePassword(req, res) {
        const { userId } = req.params;
        const { currentPassword, newPassword, confirmNewPassword } = req.body || {};

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ message: 'All password fields are required' });
        }
        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: 'New passwords do not match' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute('SELECT password FROM users WHERE user_id = ?', [userId]);
            if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

            const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
            if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

            const hashed = await bcrypt.hash(newPassword, saltRounds);
            await conn.execute('UPDATE users SET password = ? WHERE user_id = ?', [hashed, userId]);
            res.status(200).json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).send('Error changing password: ' + error.message);
        } finally {
            conn.end();
        }
    },
};
