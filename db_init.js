require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const { dbConnection } = require('./db_connection');

async function initDb(){
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    });
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