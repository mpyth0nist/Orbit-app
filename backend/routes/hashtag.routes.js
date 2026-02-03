/**
 * Hashtag Routes
 * 
 * Routes for hashtag search and discovery.
 * 
 * @module routes/hashtag
 */

import express from 'express';
import { searchHashtags, getTrendingHashtags, getHashtagThreads } from '../controllers/hashtag.controller.js';

const router = express.Router();

/**
 * @route   GET /api/hashtags/search
 * @desc    Search hashtags by tag name
 * @access  Public
 */
router.get('/search', searchHashtags);

/**
 * @route   GET /api/hashtags/trending
 * @desc    Get trending hashtags (most used)
 * @access  Public
 */
router.get('/trending', getTrendingHashtags);

/**
 * @route   GET /api/hashtags/:tag/threads
 * @desc    Get all threads for a specific hashtag
 * @access  Public
 */
router.get('/:tag/threads', getHashtagThreads);

export default router;
