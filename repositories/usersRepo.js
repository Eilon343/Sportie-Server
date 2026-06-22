const { dbConnection } = require('../db_connection');

// Users SQL only, parameterized. The stored password hash is returned to the SERVICE

exports.usersRepo = {
    // Returns the user row { password } (the stored hash), or null when no such user.
    async findPasswordHash(userId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute('SELECT password FROM users WHERE user_id = ?', [userId]);
        return rows.length ? rows[0] : null;
    },

    async updatePasswordHash(userId, hash) {
        const pool = await dbConnection.createConnection();
        await pool.execute('UPDATE users SET password = ? WHERE user_id = ?', [hash, userId]);
    },
};
