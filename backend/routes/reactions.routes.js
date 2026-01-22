/**
 * Reactions Routes
 * 
 * Handles like/unlike operations for threads and comments.
 * 
 * @module routes/reactions
 */

import express from 'express';
import { likeEntity, getEntityLikes } from '../controllers/reactions.controller.js';
import protect from '../middleware/protect.js';
import { validatePagination } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   POST /api/reactions/:entityType/:id
 * @desc    Like or unlike a thread or comment (toggle)
 * @access  Private
 * @param   entityType - Type of entity ('thread' or 'comment')
 * @param   id - Entity ID
 * 
 * @example POST /api/reactions/thread/123
 * @example POST /api/reactions/comment/456
 */
router.post('/:entityType/:id', protect, likeEntity);

/**
 * @route   GET /api/reactions/:entityType/:id
 * @desc    Get all users who liked a thread or comment
 * @access  Private
 * @param   entityType - Type of entity ('thread' or 'comment')
 * @param   id - Entity ID
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20, max: 100)
 * 
 * @example GET /api/reactions/thread/123?page=1&limit=20
 * @example GET /api/reactions/comment/456?page=1&limit=20
 */
router.get('/:entityType/:id', protect, validatePagination, getEntityLikes);

export default router;
