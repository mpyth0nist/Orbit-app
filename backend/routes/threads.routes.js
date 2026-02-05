/**
 * Threads Routes
 * 
 * Handles all thread-related endpoints including news feed,
 * creating, updating, and deleting threads.
 * 
 * @module routes/threads
 */

import express from 'express';
// ... (imports remain the same)
import {
    getFeed,
    getMostLikedAccountsThreads,
    getTrendingThreads,
    searchThreads,
    getThreadById,
    createThread,
    updateThread,
    deleteThread,
    repostThread
} from '../controllers/threads.controller.js';
import {
    toggleSaveThread,
    getSavedThreads
} from '../controllers/savedThreads.controller.js';
import protect from '../middleware/protect.js';
import {
    validatePagination,
    validateCreateThread,
    validateUpdateThread,
    validateIdParam,
    validateSearchThreads
} from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   GET /api/threads/feed
 * @desc    Get personalized news feed from followed users
 * @access  Private
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 * 
 * @example GET /api/threads/feed?page=1&limit=20
 */
router.get('/feed', protect, getFeed);

/**
 * @route   GET /api/threads/trending
 * @desc    Get trending threads (most liked in last 7 days)
 * @access  Private
 */
router.get('/trending', protect, getTrendingThreads);


/**
 * @route   GET /api/threads/most-liked
 * @desc    Get threads from accounts the user interacts with most
 * @access  Private
 * 
 * @example GET /api/threads/most-liked
 */
router.get('/most-liked', protect, getMostLikedAccountsThreads);

/**
 * @route   GET /api/threads/search
 * @desc    Search threads by content (case-insensitive)
 * @access  Private
 * @query   q - Search query (2-100 characters, required)
 * @query   cursor - Base64-encoded cursor for pagination (optional)
 * @query   limit - Items per page (default: 20, max: 100) (optional)
 * 
 * @example GET /api/threads/search?q=javascript&limit=20
 */
router.get('/search', protect, validateSearchThreads, searchThreads);

/**
 * @route   GET /api/threads/saved
 * @desc    Get current user's saved threads (bookmarks)
 * @access  Private
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 */
router.get('/saved', protect, getSavedThreads);

import {
    uploadThreadMedia,
    handleUploadError
} from '../middleware/upload.js';

/**
 * @route   GET /api/threads/:id
 * @desc    Get a single thread by ID
 * @access  Private
 * @param   id - Thread ID
 */
router.get('/:id', protect, validateIdParam, getThreadById);

/**
 * @route   POST /api/threads
 * @desc    Create a new thread with optional media attachments
 * @access  Private
 * @body    content - Thread content (required)
 * @body    media - Media files (optional, max 4)
 */
router.post(
    '/',
    protect,
    uploadThreadMedia,
    handleUploadError,
    validateCreateThread,
    createThread
);

/**
 * @route   PATCH /api/threads/:id
 * @desc    Update an existing thread
 * @access  Private (Owner only)
 * @param   id - Thread ID
 * @body    content - Updated thread content (1-500 characters, required)
 * 
 * @example PATCH /api/threads/123
 * Body: { "content": "Updated content" }
 */
router.patch('/:id', protect, validateIdParam, validateUpdateThread, updateThread);

/**
 * @route   DELETE /api/threads/:id
 * @desc    Delete a thread
 * @access  Private (Owner only)
 * @param   id - Thread ID
 * 
 * @example DELETE /api/threads/123
 */
router.delete('/:id', protect, validateIdParam, deleteThread);

/**
 * @route   POST /api/threads/:id/repost
 * @desc    Repost a thread
 * @access  Private
 * @param   id - Thread ID to repost
 * @body    content - Optional quote content (max 500 characters)
 */
router.post('/:id/repost', protect, validateIdParam, repostThread);

/**
 * @route   POST /api/threads/:id/save
 * @desc    Toggle save status of a thread
 * @access  Private
 * @param   id - Thread ID
 */
router.post('/:id/save', protect, validateIdParam, toggleSaveThread);

export default router;
