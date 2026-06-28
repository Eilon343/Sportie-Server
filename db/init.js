require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { dbConnection } = require('./connection');

// Runs db/init.sql once to create (or verify) all database tables.
// The SQL file is the single source of truth — it folds in every migration
// so a fresh database can be fully initialised in one pass.
async function initDb() {
    const conn = await dbConnection.createConnection({ multipleStatements: true });
    const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf-8');

    try {
        await conn.query(sql);
        console.log('Database initialised successfully.');
    } catch (error) {
        console.error('Error initialising database:', error);
        process.exitCode = 1;
    } finally {
        conn.end();
    }
}

initDb();
