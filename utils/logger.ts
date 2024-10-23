import winston from "winston";
import "winston-daily-rotate-file";
import path from "path";

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    success: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    error: "red",
    warn: "yellow",
    success: "green",
    info: "blue",
    debug: "white",
  },
};

winston.addColors(customLevels.colors);

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.colorize(),
  winston.format.printf(
    ({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`
  )
);

const consoleTransport = new winston.transports.Console({
  format: logFormat,
  level: "debug",
});

const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
  dirname: path.join(__dirname, "../logs"),
  filename: "%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  level: "info",
});

const logger = winston.createLogger({
  levels: customLevels.levels,
  format: logFormat,
  transports: [consoleTransport, dailyRotateFileTransport],
});

export default logger;