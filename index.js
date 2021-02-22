const path = require("path");
const Koa = require("koa");
const mongoose = require("mongoose");
const logger = require("koa-logger");
const cors = require("kcors");
const bodyParser = require("koa-bodyparser");
const routes = require("../api/routes");
const config = require("../api/config");

// Make mongoose use native ES6 promises
mongoose.Promise = global.Promise;

// Connect to MongoDB
mongoose.connect(config.database.url, config.database.opts).catch(err => {
  console.log(err);
});

const app = new Koa();

app
  .use(cors())
  .use(logger())
  .use(bodyParser())
  .use(routes);

const server = app.listen(config.server.port, "127.0.0.1", err => {
  if (err) {
    console.log(err);
  }

  console.info(
    ">>>  🌎  Api running at http://127.0.0.1:%s/",
    config.server.port
  );
});

module.exports = server;
