import express from 'express';
import {
    createComment,
    getThreadComments,
    getCommentReplies,
    getComment,
    updateComment,
    deleteComment
} from '../controllers/comments.controller.js';
import protect from '../middleware/protect.js';
import {
    validateIdParam,
    validateCreateComment,
    validateUpdateComment
} from '../middleware/validation.js';

const router = express.Router({ mergeParams: true });  // Merge params from parent router

/**
 * @route   POST /api/threads/:threadId/comments
 * @desc    Create a comment on a thread or reply to a comment
 * @access  Private
 * @body    content - Comment content (1-300 characters, required)
 * @body    parentId - Parent comment ID for replies (optional)
 * 
 * @example POST /api/threads/1/comments
 * Body: { "content": "Great post!" }
 * 
 * @example POST /api/threads/1/comments
 * Body: { "content": "I agree!", "parentId": 5 }
 */
router.post('/', protect, validateCreateComment, createComment);

/**
 * @route   GET /api/threads/:threadId/comments
 * @desc    Get top-level comments for a thread with pagination
 * @access  Private
 * @query   cursor - Base64-encoded cursor for pagination
 * @query   limit - Items per page (default: 20, max: 100)
 * @query   sort - Sort order: 'newest' or 'oldest' (default: newest)
 * 
 * @example GET /api/threads/1/comments?limit=20&sort=newest
 */
router.get('/', protect, getThreadComments);

/**
 * @route   GET /api/comments/:commentId/replies
 * @desc    Get replies to a specific comment with pagination
 * @access  Private
 * @query   cursor - Base64-encoded cursor for pagination@query   limit - Items per page (default: 20, max: 100)
 * 
 * @example GET /api/comments/1/replies?limit=20
 */
router.get('/:commentId/replies', protect, getCommentReplies);

/**
 * @route   GET /api/comments/:id
 * @desc    Get a single comment
 * @access  Private
 * @param   id - Comment ID
 * 
 * @example GET /api/comments/1
 */
router.get('/:id', protect, validateIdParam, getComment);

/**
 * @route   PATCH /api/comments/:id
 * @desc    Update a comment
 * @access  Private (Author only)
 * @param   id - Comment ID
 * @body    content - Updated comment content (1-300 characters, required)
 * 
 * @example PATCH /api/comments/1
 * Body: { "content": "Updated comment text" }
 */
router.patch('/:id', protect, validateIdParam, validateUpdateComment, updateComment);

/**
 * @route   DELETE /api/comments/:id
 * @desc    Delete a comment (and all nested replies)
 * @access  Private (Author only)
 * @param   id - Comment ID
 * 
 * @example DELETE /api/comments/1
 */
router.delete('/:id', protect, validateIdParam, deleteComment);

export default router;
