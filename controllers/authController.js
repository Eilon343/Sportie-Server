const { dbConnection } = require('../db_connection');
const bcrypt = require('bcrypt');

const saltRounds = 10;

exports.authController = {
    async signup(req, res) {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, saltRounds); // Hash the password before storing it in the database
        const conn = await dbConnection.createConnection();
        try {
            await conn.execute('INSERT INTO users (email, password) VALUES (?, ?)',
                [email, hashedPassword]
            );
            res.status(201).json({ message: 'User registered successfully' });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                res.status(400).json({ message: 'Email already exists' });
            } else {
                res.status(500).send('Error registering user: ' + error.message);
            }
        } finally {
            conn.end();
        }
    },

    async login(req, res) {
        const { email, password } = req.body;
        const conn = await dbConnection.createConnection();
        try {
            const [rows] = await conn.execute('SELECT * FROM users WHERE email = ?', [email]);
            if (rows.length === 0){
                return res.status(401).json({ message: 'Invalid email or password' });
            }
            const user = rows[0];

            const isMatch = await bcrypt.compare(password, user.password); // Compare the provided password with the hashed password in the database
            if (isMatch){
                res.status(200).json({ message: 'Login successful' });
            } else {
                res.status(401).json({ message: 'Invalid email or password' });
            }
        } catch (error) {
            res.status(500).send('Error logging in: ' + error.message);
        } finally {
            conn.end();
        }
    }
}