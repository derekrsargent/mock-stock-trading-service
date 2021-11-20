const express = require('express');
const mongoose = require('mongoose');

const app = express();
// npm run test

mongoose.connect('mongodb://localhost/transactions');
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to db'));

app.use(express.json());
app.set("view engine", "pug");
app.use(express.urlencoded({
  extended: true
}));
//app.set("views", path.join(__dirname, "views"));

const transactionsRouter = require('./routes');
app.use('/', transactionsRouter);

app.listen(3000, () => console.log('Server is listening'));