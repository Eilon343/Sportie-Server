require('dotenv').config();
const { dbConnection } = require('../db_connection');

// Throwaway, read-only script: for every table prints its columns AND its rows
// (up to a limit). Use it to actually see the data — users, trainers, meal_plans,
// etc. Reuses the project's db_connection so TiDB's SSL cert is trusted.
//
// Usage:
//   node tests/describeTables.js                 -> every table, up to 50 rows each
//   node tests/describeTables.js users           -> just the users table
//   node tests/describeTables.js users 200       -> just users, up to 200 rows
//   node tests/describeTables.js all 200         -> every table, up to 200 rows each

async function describe() {
    let connection;
    try {
        connection = await dbConnection.createConnection();

        // Args: [table|"all"] [rowLimit]
        const only = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : null;
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
            const [cols] = await connection.query(`SHOW COLUMNS FROM \`${table}\`;`);
            const [[{ n }]] = await connection.query(`SELECT COUNT(*) AS n FROM \`${table}\`;`);
            console.log(`\n========== ${table} (${n} rows) ==========`);

            console.log('-- columns --');
            console.table(cols.map((c) => ({
                Field: c.Field,
                Type: c.Type,
                Null: c.Null,
                Key: c.Key,
                Default: c.Default,
            })));

            console.log(`-- data (showing up to ${rowLimit}) --`);
            // LIMIT can't be a bound parameter on some drivers, so inline the validated integer.
            const [data] = await connection.query(`SELECT * FROM \`${table}\` LIMIT ${rowLimit};`);
            if (data.length === 0) {
                console.log('(empty)');
            } else {
                console.table(data);
            }
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
