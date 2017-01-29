'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

var _winstonDailyRotateFile = require('winston-daily-rotate-file');

var _winstonDailyRotateFile2 = _interopRequireDefault(_winstonDailyRotateFile);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var logger = new _winston2.default.Logger({
  transports: [new _winstonDailyRotateFile2.default({
    filename: './logs/worker',
    datePattern: '-yyyy-MM-dd.log',
    json: false,
    level: process.env.ENV === 'development' ? 'debug' : 'info'
  }), new _winston2.default.transports.Console({
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true
  })],

  exceptionHandlers: [new _winstonDailyRotateFile2.default({
    filename: './logs/worker-exceptions',
    datePattern: '-yyyy-MM-dd.log',
    json: false,
    handleExceptions: true,
    level: process.env.ENV === 'development' ? 'debug' : 'info'
  })]
});

exports.default = logger;