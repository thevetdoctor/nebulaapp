// src/utils/logger.ts
import chalk from 'chalk';
import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger, format, transports } from 'winston';

import { appName } from '../helpers/util';
import { elastic, esTransportOptions } from './elastic';

const { ElasticsearchTransport } = require('winston-elasticsearch');

// Ensure the logs directory exists
const logsDirectory = path.join(
  __dirname,
  `./../${appName.toLocaleLowerCase()}_logs`,
);
if (!fs.existsSync(logsDirectory)) {
  try {
    fs.mkdirSync(logsDirectory, { mode: 0o777 });
  } catch (err: any) {
    console.error(`Failed to create logs directory: ${err.message}`);
  }
}

function getLogFileName() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `log-${year}-${month}-${day}.log`;
}

const onlyLevels = (levels: string[]) =>
  format((info) => (levels.includes(info.level) ? info : false));

const colorise = (level: string) =>
  level === 'error'
    ? chalk.red(level.toUpperCase())
    : chalk.green(level.toUpperCase());

export const logger = createLogger({
  format: format.combine(
    onlyLevels(['info', 'error'])(),
    format.timestamp(),
    // format.colorize(),
    format.printf(
      ({ timestamp, level, message }) =>
        `\n[${timestamp}] ${colorise(level)}: ${message}`,
    ),
  ),
  transports: [
    new transports.Console(),
    new ElasticsearchTransport({
      ...esTransportOptions,
      format: format.combine(
        format.uncolorize(), // 🚀 strips ANSI escape codes
        format.timestamp(),
        format.json(), // store structured JSON
      ),
    }),
  ],
});

export const logMiddleware = (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  if (!request.url.startsWith('/api-docs')) {
    const { ip, method, originalUrl, body } = request;
    const userAgent = request.get('user-agent') || '';

    const originalSend = response.send.bind(response);
    const reqBody = body;
    let logged = false;

    response.send = (body: any): Response => {
      if (logged) return originalSend(body);
      logged = true;

      const { statusCode } = response;
      const parsedBody = typeof body === 'string' ? body : JSON.stringify(body);
      const contentLength = parsedBody
        ? `${Buffer.byteLength(parsedBody)} kb`
        : '0 kb';
      const success = statusCode < 400;

      // const hide = method != 'GET' || !success;
      const hide = true;
      const logPayload = `${chalk.cyan(method)} - ${chalk.blue(originalUrl)} - ${statusCode} - ${userAgent} - ${ip} - ${contentLength} - ${chalk.yellow(
        JSON.stringify(reqBody),
      )} => ${hide ? chalk.green(parsedBody) : 'Data hidden'}`;
      const logPayloadNoColor = `${method} - ${originalUrl} - ${statusCode} - ${userAgent} - ${ip} - ${contentLength} - ${JSON.stringify(
        reqBody,
      )} => ${hide ? parsedBody : 'Data hidden'}`;

      const logMessage = `\n[ ${
        success ? 'INFO' : 'ERROR'
      } ]: ${new Date().toLocaleString()} - ${logPayloadNoColor}\n`;

      // Write to log file
      const logFileName = path.join(logsDirectory, getLogFileName());
      fs.appendFile(logFileName, logMessage, (err) => {
        if (err) {
          console.error(`Failed to write log to file: ${err.message}`);
        }
      });

      if (statusCode >= 400) {
        logger.error(logPayload);
      } else {
        logger.info(logPayload);
      }
      elastic(appName.toLowerCase(), logPayload);

      return originalSend(body);
    };
  }

  next();
};

export const logHttp = (msg: any) => {
  const logFileName = path.join(logsDirectory, getLogFileName());
  console.log(`HTTP INFO: ${new Date().toLocaleString()} => ${msg}\n`);
  const logMessage = `HTTP INFO: ${new Date().toLocaleString()} => ${msg}\n`;

  fs.appendFile(logFileName, logMessage, (err) => {
    if (err) {
      console.error(`Failed to write log to file: ${err.message}`);
    }
  });
};
