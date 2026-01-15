/**
 * Logger Utility
 * 
 * Provides structured logging throughout the application using Winston.
 * Logs to both console and files with different levels.
 * 
 * Log Levels:
 * - error: Error events
 * - warn: Warning events
 * - info: Informational messages
 * - http: HTTP requests
 * - debug: Debug information
 * 
 * @module utils/logger
 */

import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format
 */
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add stack trace for errors
    if (stack) {
        msg += `\n${stack}`;
    }

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
        msg += `\n${JSON.stringify(metadata, null, 2)}`;
    }

    return msg;
});

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
    ),
    transports: [
        // Error logs - separate file for errors only
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),

        // Combined logs - all levels
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),

        // Console output with colors (development)
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: 'HH:mm:ss' }),
                logFormat
            )
        })
    ],

    // Handle exceptions and rejections
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join('logs', 'exceptions.log')
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join('logs', 'rejections.log')
        })
    ]
});

/**
 * Disable console logging in test environment
 */
if (process.env.NODE_ENV === 'test') {
    logger.transports.forEach(transport => {
        if (transport instanceof winston.transports.Console) {
            transport.silent = true;
        }
    });
}

/**
 * HTTP request logger middleware
 * Logs all incoming HTTP requests
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
export const httpLogger = (req, res, next) => {
    const start = Date.now();

    // Log when response is finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        };

        // Log as info for successful requests, warn for client errors, error for server errors
        if (res.statusCode >= 500) {
            logger.error('HTTP Request', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('HTTP Request', logData);
        } else {
            logger.http('HTTP Request', logData);
        }
    });

    next();
};

/**
 * Log authentication events
 * 
 * @param {string} event - Event type ('login', 'logout', 'register', 'failed_login')
 * @param {Object} data - Event data
 */
export const logAuth = (event, data) => {
    logger.info(`Auth Event: ${event}`, {
        event,
        ...data,
        timestamp: new Date().toISOString()
    });
};

/**
 * Log database errors
 * 
 * @param {string} operation - Database operation
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
export const logDatabaseError = (operation, error, context = {}) => {
    logger.error(`Database Error: ${operation}`, {
        operation,
        error: error.message,
        code: error.code,
        stack: error.stack,
        ...context
    });
};

export default logger;
