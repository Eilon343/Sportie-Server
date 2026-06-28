const { dbConnection } = require('../db/connection');

// Login/signup database stuff. Heads up: findUserByEmail returns the whole user row
// including the password hash, so the service has to keep that out of any response.

exports.authRepo = {
    // Inserts the users row and the trainers row in a single transaction.
    // Rolls back both if either insert fails. Returns the new user_id.
    async createTrainerAccount(email, hashedPassword, name) {
        const conn = await dbConnection.createConnection();
        await conn.beginTransaction();
        try {
            const [userResult] = await conn.execute(
                'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
                [email, hashedPassword, 'trainer']
            );
            const userId = userResult.insertId;
            await conn.execute(
                'INSERT INTO trainers (trainer_id, name) VALUES (?, ?)',
                [userId, name]
            );
            await conn.commit();
            return userId;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            await conn.end();
        }
    },

    // Looks up a user in the users table by email. Returns the full row or null.
    async findUserByEmail(email) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows.length ? rows[0] : null;
    },

    // Gets one trainer's row from the trainers table by id. Returns the row or null.
    async findTrainerById(trainerId) {
        const pool = await dbConnection.createConnection();
        const [rows] = await pool.execute('SELECT * FROM trainers WHERE trainer_id = ?', [trainerId]);
        return rows.length ? rows[0] : null;
    },
};
