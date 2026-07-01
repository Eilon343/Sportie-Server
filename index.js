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

const authRouter = require('./routes/authRouter');
const trainersRouter = require('./routes/trainersRouter');
const traineesRouter = require('./routes/traineesRouter');
const exerciseRouter = require('./routes/exerciseRouter');
const mealRouter = require('./routes/mealRouter');
const planRouter = require('./routes/planRouter');
const usersRouter = require('./routes/usersRouter');
const analyticsRouter = require('./routes/analyticsRouter');
const templatesRoutes = require('./routes/templatesRoutes');

app.use('/api/auth', authRouter);
app.use('/api/trainers', trainersRouter);
app.use('/api/trainees', traineesRouter);
app.use('/api/exercises', exerciseRouter);
app.use('/api/meals', mealRouter);
app.use('/api/plans', planRouter);
app.use('/api/users', usersRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/templates', templatesRoutes);

// Simple health check so you can tell the server is up.
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

// Central error handler. Controllers forward failures here via next(error); it
// maps a tagged err.status to that code (with its safe message) and otherwise
// returns a generic 500 without exposing internal error details to the client.
// Every response here is JSON shaped as { message }.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = (err.status && err.status >= 400 && err.status < 600) ? err.status : 500;
  const message = status >= 500 ? 'Internal server error' : (err.message || 'Request failed');
  res.status(status).json({ message });
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})