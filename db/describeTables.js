require('dotenv').config();
const { dbConnection } = require('./connection');

// Read-only script: for every table prints its columns AND its rows (up to a limit).
//
// Usage:
//   node db/describeTables.js                  -> every table, up to 50 rows each
//   node db/describeTables.js users            -> just the users table
//   node db/describeTables.js users 200        -> just users, up to 200 rows
//   node db/describeTables.js all 200          -> every table, up to 200 rows each

async function describe() {
    let connection;
    try {
        connection = await dbConnection.createRawConnection();

        const only     = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : null;
        const rowLimit = Number(process.argv[3]) > 0 ? Number(process.argv[3]) : 50;

        let tableNames;
        if (only) {
            tableNames = [only];
        } else {
            const [rows] = await connection.query('SHOW TABLES;');
            tableNames = rows.map((row) => Object.values(row)[0]);
        }

        if (tableNames.length === 0) {
            console.log('No tables found in the database.');
            return;
        }

        console.log(`\nShowing ${tableNames.length} table(s), up to ${rowLimit} rows each:`);
        for (const table of tableNames) {
            const [cols]    = await connection.query(`SHOW COLUMNS FROM \`${table}\`;`);
            const [[{ n }]] = await connection.query(`SELECT COUNT(*) AS n FROM \`${table}\`;`);
            console.log(`\n========== ${table} (${n} rows) ==========`);

            console.log('-- columns --');
            console.table(cols.map((c) => ({
                Field:   c.Field,
                Type:    c.Type,
                Null:    c.Null,
                Key:     c.Key,
                Default: c.Default,
            })));

            console.log(`-- data (showing up to ${rowLimit}) --`);
            const [data] = await connection.query(`SELECT * FROM \`${table}\` LIMIT ${rowLimit};`);
            if (data.length === 0) console.log('(empty)');
            else console.table(data);
        }
    } catch (error) {
        console.error('Error describing tables:', error.message);
        process.exitCode = 1;
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

describe();
