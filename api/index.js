const serverless = require('serverless-http');
const { createApp } = require('../lib/app-express');

module.exports = serverless(createApp());
