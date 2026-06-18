require('dotenv').config();

const required = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME', 'EXERCISEDB_KEY'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '));
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRouter = require('./routers/authRouter');
const trainersRouter = require('./routers/trainersRouter');
const traineesRouter = require('./routers/traineesRouter');
const exerciseRouter = require('./routers/exerciseRouter');
const mealRouter = require('./routers/mealRouter');
const planRouter = require('./routers/planRouter');

app.use('/api/auth', authRouter);
app.use('/api/trainers', trainersRouter);
app.use('/api/trainees', traineesRouter);
app.use('/api/exercises', exerciseRouter);
app.use('/api/meals', mealRouter);
app.use('/api/plans', planRouter);

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})