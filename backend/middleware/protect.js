/**
 * Authentication Middleware
 * 
 * Protects routes by verifying JWT tokens and attaching user info to requests.
 * Uses authService for token verification and provides consistent error handling.
 * 
 * @module middleware/protect
 */

import { verifyToken } from '../utils/authService.js';
import logger from '../utils/logger.js';

/**
 * Protect middleware - Verify JWT token and authenticate user
 * 
 * Extracts JWT token from Authorization header, verifies it, and
 * attaches decoded user information to the request object.
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @example
 * router.get('/profile', protect, getProfile);
 */
function protect(req, res, next) {
    let token;

    // Check if Authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token using auth service
            const decoded = verifyToken(token);

            if (!decoded) {
                logger.warn('Authentication failed - invalid token', {
                    ip: req.ip,
                    path: req.path
                });
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired token'
                });
            }

            // Attach user info to request
            req.user = decoded;

            logger.debug('Token verified successfully', {
                userId: decoded.userId,
                path: req.path
            });

            return next();

        } catch (error) {
            logger.error('Authentication error', {
                error: error.message,
                ip: req.ip,
                path: req.path
            });
            return res.status(401).json({
                success: false,
                message: 'Authentication failed'
            });
        }
    }

    // No token provided
    if (!token) {
        logger.warn('Authentication failed - no token provided', {
            ip: req.ip,
            path: req.path
        });
        return res.status(401).json({
            success: false,
            message: 'No token provided. Please login to access this resource.'
        });
    }
}

export default protect;