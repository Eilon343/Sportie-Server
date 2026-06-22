require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const { dbConnection } = require('./db_connection');

// Runs db_init.sql once to create the database tables from scratch.
async function initDb(){
    const conn = await dbConnection.createConnection({ multipleStatements: true });
    const sql = fs.readFileSync('./db_init.sql', 'utf-8');

    try {
        await conn.query(sql);
        console.log('Database initialized successfully.');
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        conn.end();
    }
}
initDb();