var appRoot = require("app-root-path");
const { createLogger, format, transports } = require("winston");
const { consoleFormat } = require("winston-console-format");

// define the custom settings for each transport (file, console)
var options = {
  file: {
    level: "info",
    filename: `${appRoot}/logs/app.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 3,
    colorize: false
  },
  console: {
    format: format.combine(
      format.colorize({ all: true }),
      format.padLevels(),
      consoleFormat({
        showMeta: true,
        metaStrip: ["timestamp", "service"],
        inspectOptions: {
          depth: Infinity,
          colors: true,
          maxArrayLength: Infinity,
          breakLength: 120,
          compact: Infinity
        }
      })
    )
  }
};

// instantiate a new Winston Logger with the settings defined above
var logger = new createLogger({
  level: "silly",
  format: format.combine(
    format.timestamp(),
    format.ms(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "Khoros Teneo" },
  transports: [
    new transports.File(options.file),
    new transports.Console(options.console)
  ],
  exitOnError: false // do not exit on handled exceptions
});

// create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: function(message, encoding) {
    // use the 'info' log level so the output will be picked up by both transports (file and console)
    logger.info(message);
  }
};

// logger.silly("Logging initialized");
// logger.debug("Debug an object", { make: "Ford", model: "Mustang", year: 1969 });
// logger.verbose("Returned value", { value: "Peter" });
// logger.info("Information", {
//   options: ["Lorem ipsum", "dolor sit amet"],
//   values: ["Donec augue eros, ultrices."]
// });
// logger.warn("Warning");
// logger.error(new Error("Unexpected error"));

module.exports = logger;
