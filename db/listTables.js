require('dotenv').config();
const { dbConnection } = require('./connection');

// Read-only script: list all tables in the database.
async function listTables() {
    let connection;
    try {
        connection = await dbConnection.createConnection();
        const [rows] = await connection.query('SHOW TABLES;');

        if (!rows.length) {
            console.log('No tables found in the database.');
            return;
        }

        const tables = rows.map((row, i) => ({
            '#': i + 1,
            table: Object.values(row)[0],
        }));

        console.log(`\nFound ${tables.length} table(s):`);
        console.table(tables);
    } catch (error) {
        console.error('Error listing tables:', error);
        process.exitCode = 1;
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

listTables();
