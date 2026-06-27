const { dbConnection } = require('../db_connection');

// Database stuff for the users table. Note the password hash goes back to the service only.

exports.usersRepo = {
    // Reads a user's stored password hash from the users table. Returns the row or null.
    async findPasswordHash(userId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute('SELECT password FROM users WHERE user_id = ?', [userId]);
        return rows.length ? rows[0] : null;
    },

    // Saves a new password hash for a user into the users table.
    async updatePasswordHash(userId, hash) {
        const pool = await dbConnection.createConnection();
        await pool.execute('UPDATE users SET password = ? WHERE user_id = ?', [hash, userId]);
    },
};
