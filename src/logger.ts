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

export const LOGS_DIRNAME = path.join(process.cwd(), 'logs');
fs.mkdirSync(LOGS_DIRNAME, { recursive: true });

// app logger config
export const logger = winston.createLogger({
  exitOnError: false,
  transports: [
    // error.log
    new winston.transports.File({
      // delete old files
      maxFiles: 5,
      // 10 MiB per file
      maxsize: 10 * 1024 * 1024,
      dirname: LOGS_DIRNAME,
      filename: 'error.log',
      level: 'error',
      format: nocolorFormat,
      handleExceptions: true,
    }),
  ],
});

// allow jest's --silent to avoid console logging
if (!process.argv.includes('--silent')) {
  logger.add(
    // console
    new winston.transports.Console({
      level: 'debug',
      format: colorFormat,
      handleExceptions: true,
    }),
  );
}

if (process.env.LOG_INFO_FILE === 'true') {
  logger.transports.push(
    // info.log
    new winston.transports.File({
      // delete old files
      maxFiles: 5,
      // 10 MiB per file
      maxsize: 10 * 1024 * 1024,
      dirname: LOGS_DIRNAME,
      filename: 'info.log',
      level: 'debug',
      format: nocolorFormat,
      handleExceptions: true,
    })
  );
}
