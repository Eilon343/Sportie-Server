const { dbConnection } = require('../db_connection');

// Auth SQL only, parameterized. findUserByEmail returns the FULL user row (incl. the
// password hash) to the SERVICE for bcrypt — the service must keep it out of responses.

exports.authRepo = {
    async insertUser(email, hashedPassword, role) {
        const pool = await dbConnection.createConnection();
        await pool.execute(
            'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
            [email, hashedPassword, role]
        );
    },

    // Full user row (user_id, email, password hash, role, ...) or null.
    async findUserByEmail(email) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows.length ? rows[0] : null;
    },

    // The trainers-table row (no password column) or null.
    async findTrainerById(trainerId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute('SELECT * FROM trainers WHERE trainer_id = ?', [trainerId]);
        return rows.length ? rows[0] : null;
    },
};
