require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.get('/test-db', async (req, res) => {
    const conn = await require('./db_connection').dbConnection.createConnection();
    const [rows] = await conn.execute('SELECT 1');
    conn.end();
    res.send("Database connection test successful: " + JSON.stringify(rows));
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})