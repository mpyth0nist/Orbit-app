/**
 * Notifications Routes
 * 
 * Handles all notification-related endpoints including fetching,
 * updating, and deleting notifications.
 * 
 * @module routes/notifications
 */

import express from 'express';
import {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead
} from '../controllers/notifications.controller.js';
import protect from '../middleware/protect.js';
import {
    validateIdParam,
    validateUpdateNotification,
    validateNotificationQuery
} from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get current user's notifications with pagination and filtering
 * @access  Private
 * @query   filter - Filter by read status (all, read, unread) (default: all)
 * @query   cursor - Base64-encoded cursor for pagination
 * @query   limit - Items per page (default: 20, max: 100)
 * 
 * @example GET /api/notifications?filter=unread&limit=20
 */
router.get('/', protect, validateNotificationQuery, getMyNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications
 * @access  Private
 * 
 * @example GET /api/notifications/unread-count
 */
router.get('/unread-count', protect, getUnreadCount);

/**
 * @route   PATCH /api/notifications/mark-all-read
 * @desc    Mark all unread notifications as read
 * @access  Private
 * 
 * @example PATCH /api/notifications/mark-all-read
 */
router.patch('/mark-all-read', protect, markAllAsRead);

/**
 * @route   DELETE /api/notifications/read
 * @desc    Delete all read notifications
 * @access  Private
 * 
 * @example DELETE /api/notifications/read
 */
router.delete('/read', protect, deleteAllRead);

/**
 * @route   PATCH /api/notifications/:id
 * @desc    Mark a single notification as read or unread
 * @access  Private (Owner only)
 * @param   id - Notification ID
 * @body    isRead - New read status (boolean)
 * 
 * @example PATCH /api/notifications/1
 * Body: { "isRead": true }
 */
router.patch('/:id', protect, validateIdParam, validateUpdateNotification, markAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a single notification
 * @access  Private (Owner only)
 * @param   id - Notification ID
 * 
 * @example DELETE /api/notifications/1
 */
router.delete('/:id', protect, validateIdParam, deleteNotification);

export default router;
