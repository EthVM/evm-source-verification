import path from 'node:path';
import fs from 'node:fs';
import winston from 'winston';

function buildMessage(info: winston.Logform.TransformableInfo): string {
  const { timestamp, level, message, label, } = info;
  let msg = `${timestamp}`;
  if (label) msg += ` [${label}]`
  msg += ` ${level}: ${message}`;
  return msg;
}

const nocolorFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss', }),
  winston.format.printf(buildMessage),
  winston.format.uncolorize(),
  winston.format.align(),
);

const colorFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss', }),
  winston.format.colorize(),
  winston.format.printf(buildMessage),
  winston.format.align(),
);

const logsDirname = path.join(process.cwd(), 'logs');
fs.mkdirSync(logsDirname, { recursive: true });

// app logger config
export const logger = winston.createLogger({
  exitOnError: false,
  transports: [
    // console
    new winston.transports.Console({
      level: 'debug',
      format: colorFormat,
      handleExceptions: true,
    }),
    // error.log
    new winston.transports.File({
      // 10 MiB per file
      maxFiles: 5,
      maxsize: 10 * 1024 * 1024,
      dirname: logsDirname,
      filename: 'error.log',
      level: 'warn',
      format: nocolorFormat,
      handleExceptions: true,
    }),
  ],
});

if (process.env.LOG_INFO_FILE === 'true') {
  logger.transports.push(
    // info.log
    new winston.transports.File({
      // 10 MiB per file
      maxFiles: 5,
      maxsize: 10 * 1024 * 1024,
      dirname: logsDirname,
      filename: 'info.log',
      level: 'debug',
      format: nocolorFormat,
      handleExceptions: true,
    })
  );
}