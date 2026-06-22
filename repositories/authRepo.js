const { dbConnection } = require('../db_connection');

// Login/signup database stuff. Heads up: findUserByEmail returns the whole user row
// including the password hash, so the service has to keep that out of any response.

exports.authRepo = {
    // Adds a new user (email, password hash, role) into the users table.
    async insertUser(email, hashedPassword, role) {
        const conn = await dbConnection.createConnection();
        try {
            await conn.execute(
                'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
                [email, hashedPassword, role]
            );
        } finally {
            conn.end();
        }
    },

    // Looks up a user in the users table by email. Returns the full row or null.
    async findUserByEmail(email) {
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute('SELECT * FROM users WHERE email = ?', [email]);
            return rows.length ? rows[0] : null;
        } finally {
            conn.end();
        }
    },

    // Gets one trainer's row from the trainers table by id. Returns the row or null.
    async findTrainerById(trainerId) {
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute('SELECT * FROM trainers WHERE trainer_id = ?', [trainerId]);
            return rows.length ? rows[0] : null;
        } finally {
            conn.end();
        }
    },
};
