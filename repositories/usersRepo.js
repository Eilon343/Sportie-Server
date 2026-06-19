const { dbConnection } = require('../db_connection');

// Users SQL only, parameterized. The stored password hash is returned to the SERVICE

exports.usersRepo = {
    // Returns the user row { password } (the stored hash), or null when no such user.
    async findPasswordHash(userId) {
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute('SELECT password FROM users WHERE user_id = ?', [userId]);
            return rows.length ? rows[0] : null;
        } finally {
            conn.end();
        }
    },

    async updatePasswordHash(userId, hash) {
        const conn = await dbConnection.createConnection();
        try {
            await conn.execute('UPDATE users SET password = ? WHERE user_id = ?', [hash, userId]);
        } finally {
            conn.end();
        }
    },
};
