require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRouter = require('./routers/authRouter');
app.use('/auth', authRouter);

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
})