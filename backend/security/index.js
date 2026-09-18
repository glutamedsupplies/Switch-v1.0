"use strict";

const config = require("./config");
const session = require("./session");
const cors = require("./cors");
const rateLimit = require("./rateLimit");
const auth = require("./auth");

module.exports = {
  ...config,
  ...session,
  ...cors,
  ...rateLimit,
  ...auth,
};
