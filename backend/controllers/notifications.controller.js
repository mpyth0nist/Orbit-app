import { asyncHandler } from '../middleware/asyncHandler.js';
import { successResponse, errorResponse, cursorPaginatedResponse, deletedResponse } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';
import logger from '../utils/logger.js';

// Get current user's notifications
export const getMyNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const filter = req.query.filter || 'all';

    // Parse pagination parameters
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const cursorParam = req.query.cursor;

    // Decode cursor if provided
    let cursorData = null;
    if (cursorParam) {
        try {
            const decodedCursor = Buffer.from(cursorParam, 'base64').toString('utf-8');
            cursorData = JSON.parse(decodedCursor);

            if (!cursorData.id || !cursorData.createdAt) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid cursor format'
                });
            }
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid cursor encoding'
            });
        }
    }

    // Build where clause
    const whereClause = {
        receiverId: userId
    };

    // Apply filter
    if (filter === 'read') {
        whereClause.isRead = true;
    } else if (filter === 'unread') {
        whereClause.isRead = false;
    }

    // Add cursor pagination condition
    if (cursorData) {
        whereClause.OR = [
            {
                createdAt: {
                    lt: new Date(cursorData.createdAt)
                }
            },
            {
                createdAt: new Date(cursorData.createdAt),
                id: {
                    lt: cursorData.id
                }
            }
        ];
    }

    // Fetch notifications with cursor pagination
    const notifications = await prisma.notification.findMany({
        where: whereClause,
        include: {
            actor: {
                select: {
                    id: true,
                    username: true,
                    profile: {
                        select: {
                            firstName: true,
                            lastName: true,
                            photoUrl: true
                        }
                    }
                }
            }
        },
        orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' }
        ],
        take: limit + 1
    });

    // Determine if there are more results
    const hasMore = notifications.length > limit;
    const returnNotifications = hasMore ? notifications.slice(0, limit) : notifications;

    // Generate next cursor if there are more results
    let nextCursor = null;
    if (hasMore) {
        const lastNotification = returnNotifications[returnNotifications.length - 1];
        const cursorObj = {
            id: lastNotification.id,
            createdAt: lastNotification.createdAt.toISOString()
        };
        nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
    }

    // Format notifications to include entity info
    const formattedNotifications = returnNotifications.map(notif => ({
        id: notif.id,
        type: notif.type,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        actor: notif.actor,
        entity: notif.entityId ? {
            id: notif.entityId,
            type: notif.entityType
        } : null
    }));

    logger.info('Notifications retrieved', {
        userId,
        filter,
        count: returnNotifications.length,
        hasMore
    });

    cursorPaginatedResponse(
        res,
        formattedNotifications,
        { nextCursor, limit },
        'Notifications retrieved successfully'
    );
});

// Get count of unread notifications
export const getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const count = await prisma.notification.count({
        where: {
            receiverId: userId,
            isRead: false
        }
    });

    logger.info('Unread notification count retrieved', { userId, count });

    successResponse(
        res,
        { count },
        'Unread count retrieved successfully'
    );
});

// Mark a single notification as read or unread
export const markAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const notificationId = parseInt(req.params.id);
    const { isRead } = req.body;

    // Validate notificationId
    if (isNaN(notificationId)) {
        return errorResponse(res, 'Invalid notification ID', 400);
    }

    // Check if notification exists and belongs to user
    const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
    });

    if (!notification) {
        return errorResponse(res, 'Notification not found', 404);
    }

    if (notification.receiverId !== userId) {
        return errorResponse(res, 'You are not authorized to update this notification', 403);
    }

    // Update notification
    const updatedNotification = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead },
        include: {
            actor: {
                select: {
                    id: true,
                    username: true,
                    profile: {
                        select: {
                            firstName: true,
                            lastName: true,
                            photoUrl: true
                        }
                    }
                }
            }
        }
    });

    logger.info('Notification updated', {
        notificationId,
        userId,
        isRead
    });

    successResponse(
        res,
        updatedNotification,
        isRead ? 'Notification marked as read' : 'Notification marked as unread'
    );
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const result = await prisma.notification.updateMany({
        where: {
            receiverId: userId,
            isRead: false
        },
        data: {
            isRead: true
        }
    });

    logger.info('All notifications marked as read', {
        userId,
        count: result.count
    });

    successResponse(
        res,
        { count: result.count },
        result.count === 0
            ? 'No unread notifications to mark'
            : `Marked ${result.count} notification${result.count === 1 ? '' : 's'} as read`
    );
});

// Delete a single notification
export const deleteNotification = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const notificationId = parseInt(req.params.id);

    // Validate notificationId
    if (isNaN(notificationId)) {
        return errorResponse(res, 'Invalid notification ID', 400);
    }

    // Check if notification exists and belongs to user
    const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
    });

    if (!notification) {
        return errorResponse(res, 'Notification not found', 404);
    }

    if (notification.receiverId !== userId) {
        return errorResponse(res, 'You are not authorized to delete this notification', 403);
    }

    // Delete notification
    await prisma.notification.delete({
        where: { id: notificationId }
    });

    logger.info('Notification deleted', { notificationId, userId });

    deletedResponse(res, 'Notification deleted successfully');
});

// Delete all read notifications

export const deleteAllRead = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const result = await prisma.notification.deleteMany({
        where: {
            receiverId: userId,
            isRead: true
        }
    });

    logger.info('Read notifications deleted', {
        userId,
        count: result.count
    });

    successResponse(
        res,
        { count: result.count },
        result.count === 0
            ? 'No read notifications to delete'
            : `Deleted ${result.count} read notification${result.count === 1 ? '' : 's'}`
    );
});
