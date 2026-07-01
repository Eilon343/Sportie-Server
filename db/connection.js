const mysql = require('mysql2/promise');

// Shared configuration for every database connection. Read lazily (at first use)
// so dotenv has already populated process.env.
function baseConfig() {
    return {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        // Return DATE/DATETIME columns as plain strings (e.g. "2000-05-10")
        // instead of JS Date objects. Prevents the local-midnight -> UTC
        // shift that made date_of_birth read back one day earlier.
        dateStrings: true,
        ssl: {
            rejectUnauthorized: true
        },
    };
}

// One shared pool for the whole server. The pool hands a connection to each
// query and takes it back automatically, so the connectionLimit is honoured and
// connections are no longer leaked on the read paths.
let pool;
function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            ...baseConfig(),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });
    }
    return pool;
}

exports.dbConnection = {
    // Returns the shared pool. Use its .execute()/.query() for single statements;
    // the pool acquires and releases the underlying connection automatically, so
    // callers must NOT call .end() on the value returned here.
    async createConnection() {
        return getPool();
    },

    // Borrows a dedicated connection from the pool for a multi-statement
    // transaction. The caller MUST return it with conn.release() in a finally
    // block (releasing it back to the pool, not closing it).
    async getConnection() {
        return getPool().getConnection();
    },

    // Standalone single connection for the one-off CLI scripts (init/seed/migrate)
    // that need multipleStatements and own the full lifecycle themselves. The
    // caller is responsible for calling .end() on it.
    async createRawConnection({ ...options } = {}) {
        return mysql.createConnection({ ...baseConfig(), ...options });
    },
};
