const express = require('express');
const mongoose = require('mongoose');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const config = require('config');

const app = express();

// Set to two workers even though more are available
// If in testing environment then don't horizontally scale
const numWorkers = config.numCPUs > 1 ? 1 : config.numCPUs;
if (cluster.isMaster && config.numCPUs > 1) {
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
} else {
  mongoose.connect(config.DBHost);
  const db = mongoose.connection;
  db.on('error', (error) => console.error(error));
  db.once('open', () => console.log('Connected to db'));

  app.use(express.json());
  app.set("view engine", "pug");
  app.use(express.urlencoded({
    extended: true
  }));

  const tradingRouter = require('./routes');
  app.use('/', tradingRouter);

  app.listen(3000, () => console.log('Server is listening'));
};
