const express = require('express');
const mongoose = require('mongoose');
let config = require('config');

const app = express();

mongoose.connect(config.DBHost);
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to db'));

app.use(express.json());
app.set("view engine", "pug");
app.use(express.urlencoded({
  extended: true
}));

const transactionsRouter = require('./routes');
app.use('/', transactionsRouter);

app.listen(3000, () => console.log('Server is listening'));
