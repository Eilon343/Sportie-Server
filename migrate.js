require('dotenv').config();
const fs = require('fs');
const { dbConnection } = require('./db_connection');

// One-shot migration runner. Reuses the app's db_connection.js (same mysql2 + SSL
// config used for TiDB). Mirrors db_init.js, but takes a file path and logs each
// statement individually.
//
// Usage: node migrate.js [path/to/file.sql]   (defaults to the analytics migration)

const migrationFile = process.argv[2] || 'migrations/001_analytics_tables.sql';

async function migrate() {
    const conn = await dbConnection.createConnection({ multipleStatements: true });
    const sql = fs.readFileSync(migrationFile, 'utf-8');

    // Strip full-line comments, then split into individual statements so each can
    // be logged on its own.
    const statements = sql
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    try {
        console.log(`Running migration: ${migrationFile} (${statements.length} statements)`);
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            await conn.query(statement);
            console.log(`  [${i + 1}/${statements.length}] OK: ${statement.split('\n')[0].slice(0, 60)}`);
        }
        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Error running migration:', error);
        process.exitCode = 1;
    } finally {
        conn.end();
    }
}

migrate();
