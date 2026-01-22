/**
 * Authentication Service
 * 
 * Centralized service for authentication-related operations including
 * password hashing, token generation/verification, and user validation.
 * 
 * @module utils/authService
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';
import logger from './logger.js';

/**
 * Hash a password using bcrypt
 * 
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Hashed password
 * 
 * @example
 * const hashedPassword = await hashPassword('mySecurePassword123');
 */
export const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a plain text password with a hashed password
 * 
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Hashed password to compare against
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 * 
 * @example
 * const isValid = await comparePassword('myPassword', user.passwordHash);
 */
export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

/**
 * Generate a JWT access token
 * 
 * @param {number} userId - User ID to encode in token
 * @param {string} email - User email to encode in token
 * @returns {string} JWT access token
 * 
 * @example
 * const token = generateAccessToken(1, 'user@example.com');
 */
export const generateAccessToken = (userId, email) => {
    const payload = {
        userId,
        email
    };

    const secretKey = process.env.JWT_SECRET;
    const expiresIn = process.env.JWT_EXPIRY || '1h';

    return jwt.sign(payload, secretKey, { expiresIn });
};

/**
 * Verify and decode a JWT token
 * 
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 * 
 * @example
 * const decoded = verifyToken(token);
 * if (decoded) {
 *   console.log('User ID:', decoded.userId);
 * }
 */
export const verifyToken = (token) => {
    try {
        const secretKey = process.env.JWT_SECRET;
        return jwt.verify(token, secretKey);
    } catch (error) {
        logger.debug('Token verification failed', { error: error.message });
        return null;
    }
};

/**
 * Check if a user already exists by username or email
 * 
 * @param {string} username - Username to check
 * @param {string} email - Email to check
 * @returns {Promise<Object|null>} Existing user or null if not found
 * 
 * @example
 * const existingUser = await checkUserExists('johndoe', 'john@example.com');
 * if (existingUser) {
 *   console.log('User already exists');
 * }
 */
export const checkUserExists = async (username, email) => {
    try {
        return await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });
    } catch (error) {
        logger.error('Error checking user existence', { error: error.message });
        throw error;
    }
};
