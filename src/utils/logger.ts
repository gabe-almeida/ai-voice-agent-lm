/**
 * Logger utility for the Voice Agent system
 * Uses Winston for structured logging
 */

import winston from 'winston';
import { config } from '../config';

/**
 * Create Winston logger instance with appropriate configuration
 */
const logger = winston.createLogger({
  level: config.logging.level,
  format: config.logging.format === 'json' 
    ? winston.format.json()
    : winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple()
      ),
  defaultMeta: { service: 'voice-agent' },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: config.env === 'development' 
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
          )
        : winston.format.json(),
    }),
  ],
});

// Add file transport in production
if (config.env === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log' 
  }));
}

/**
 * Log incoming HTTP requests
 */
export function logRequest(req: any, _res: any, next: any): void {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
}

/**
 * Log errors with stack traces
 */
export function logError(error: Error, context?: any): void {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
}

export default logger;