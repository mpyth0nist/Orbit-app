/**
 * Rate Limiting Middleware
 * 
 * Implements rate limiting to protect against brute force attacks, DDoS,
 * and excessive API usage. Different limits for different endpoint types.
 * 
 * @module middleware/rateLimit
 */

import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 * 
 * Limits: 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 5 requests per window
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in 15 minutes.'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests: false, // Count successful requests
    skipFailedRequests: false, // Count failed requests
});

/**
 * General API rate limiter
 * Prevents API abuse and excessive requests
 * 
 * Limits: 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 100 requests per window
    message: {
        success: false,
        message: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict limiter for sensitive operations
 * Used for operations like password reset, email change, etc.
 * 
 * Limits: 3 requests per hour per IP
 */
export const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 3 requests per hour
    message: {
        success: false,
        message: 'Too many attempts. Please try again in an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Lenient limiter for read operations
 * Used for public data fetching
 * 
 * Limits: 200 requests per 15 minutes per IP
 */
export const readLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window
    message: {
        success: false,
        message: 'Request limit exceeded. Please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
});
