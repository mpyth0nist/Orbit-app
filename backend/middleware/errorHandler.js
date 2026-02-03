/**
 * Global Error Handler Middleware
 * 
 * Centralized error handling for the entire application.
 * Catches all errors passed via next(error) and returns consistent error responses.
 * Handles Prisma errors, JWT errors, validation errors, and generic errors.
 * 
 * @module middleware/errorHandler
 */

/**
 * Main error handling middleware
 * 
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 */
export const errorHandler = (err, req, res, next) => {
    // Log error for debugging (will be replaced with proper logger)
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method
    });

    // Prisma Database Errors
    if (err.code && err.code.startsWith('P')) {
        return handlePrismaError(err, res);
    }

    // JWT Authentication Errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid authentication token',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Authentication token has expired',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // Validation Errors (Joi)
    if (err.isJoi || err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.details?.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            })) || [err.message]
        });
    }

    // Default error response
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

/**
 * Handle Prisma-specific database errors
 * 
 * @param {Error} err - Prisma error object
 * @param {Response} res - Express response object
 * @returns {Response} JSON error response
 */
const handlePrismaError = (err, res) => {
    const errorMap = {
        'P2002': {
            status: 409,
            message: `A record with this ${err.meta?.target?.[0] || 'field'} already exists`
        },
        'P2025': {
            status: 404,
            message: 'Record not found'
        },
        'P2003': {
            status: 400,
            message: 'Foreign key constraint failed'
        },
        'P2014': {
            status: 400,
            message: 'Invalid relation'
        },
        'P2016': {
            status: 400,
            message: 'Query interpretation error'
        },
        'P2000': {
            status: 400,
            message: 'Input value too long for column'
        }
    };

    const error = errorMap[err.code] || {
        status: 400,
        message: 'Database operation failed'
    };

    return res.status(error.status).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? {
            code: err.code,
            meta: err.meta,
            details: err.message,
            stack: err.stack
        } : undefined
    });
};

/**
 * 404 Not Found handler
 * Catches all requests to undefined routes
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
};
