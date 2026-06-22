const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    dataStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: true,
    }
});

(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('Database Connection Pool initialized successfully!');
        conn.release(); 
    } catch (error) {
        console.error('ERROR: Database connection failed!');
        console.error(error.message);
    }
})();

exports.dbConnection = {
    async createConnection() {
        return pool;
    }
}