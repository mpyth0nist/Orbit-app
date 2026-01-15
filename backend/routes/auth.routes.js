/**
 * Authentication Routes
 * 
 * Handles user registration and login endpoints with validation and rate limiting.
 * 
 * @module routes/auth
 */

import express from 'express';
import { login, register } from '../controllers/auth.controller.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @rateLimit 5 attempts per 15 minutes
 */
router.post('/register', authLimiter, validateRegister, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get token
 * @access  Public
 * @rateLimit 5 attempts per 15 minutes
 */
router.post('/login', authLimiter, validateLogin, login);

export default router;