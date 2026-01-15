/**
 * Threads Routes
 * 
 * Handles all thread-related endpoints including news feed,
 * creating, updating, and deleting threads.
 * 
 * @module routes/threads
 */

import express from 'express';
import { getFeed, createThread } from '../controllers/threads.controller.js';
import protect from '../middleware/protect.js';
import { validatePagination, validateCreateThread } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   POST /api/threads
 * @desc    Create a new thread with optional media attachments
 * @access  Private
 * @body    content - Thread content (1-500 characters, required)
 * @body    mediaUrls - Array of media URLs (optional, max 4)
 * 
 * @example POST /api/threads
 * Body: { "content": "Hello world!", "mediaUrls": ["https://example.com/image.jpg"] }
 */
router.post('/', protect, validateCreateThread, createThread);

/**
 * @route   GET /api/threads/feed
 * @desc    Get personalized news feed from followed users
 * @access  Private
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 * 
 * @example GET /api/threads/feed?page=1&limit=20
 */
router.get('/feed', protect, validatePagination, getFeed);

export default router;
