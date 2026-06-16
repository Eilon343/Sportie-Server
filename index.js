require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRouter = require('./routers/authRouter');
app.use('/api/auth', authRouter);

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})