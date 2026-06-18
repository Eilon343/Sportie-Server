require('dotenv').config();

const required = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME',
  'EXERCISEDB_BASE_URL', 'EXERCISEDB_HOST', 'EXERCISEDB_KEY', 'MEALDB_BASE_URL'];
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
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const authRouter = require('./routers/authRouter');
const trainersRouter = require('./routers/trainersRouter');
const traineesRouter = require('./routers/traineesRouter');
const exerciseRouter = require('./routers/exerciseRouter');
const mealRouter = require('./routers/mealRouter');
const planRouter = require('./routers/planRouter');
const usersRouter = require('./routers/usersRouter');

app.use('/api/auth', authRouter);
app.use('/api/trainers', trainersRouter);
app.use('/api/trainees', traineesRouter);
app.use('/api/exercises', exerciseRouter);
app.use('/api/meals', mealRouter);
app.use('/api/plans', planRouter);
app.use('/api/users', usersRouter);

app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Friendly message when a request body (e.g. an avatar image) is too large.
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      message: 'Image is too large. Please choose a smaller photo (it is compressed automatically, so a normal picture is fine).',
    });
  }
  next(err);
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})