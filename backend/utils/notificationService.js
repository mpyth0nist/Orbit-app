/**
 * Notification Service
 * 
 * Centralized service for creating and managing notifications consistently
 * across the application. Handles duplicate prevention, self-notification
 * prevention, and provides type-safe notification creation.
 * 
 * @module utils/notificationService
 */

import { prisma } from './prisma.js';
import logger from './logger.js';

/**
 * Create a notification with duplicate checking
 * 
 * @param {Object} data - Notification data
 * @param {number} data.actorId - User performing the action
 * @param {number} data.receiverId - User receiving the notification
 * @param {string} data.type - Notification type (LIKE, COMMENT, FOLLOW_REQUEST, etc.)
 * @param {number} [data.entityId] - Optional entity ID (thread, comment, user)
 * @param {string} [data.entityType] - Optional entity type (THREAD, COMMENT, USER)
 * 
 * @returns {Promise<Notification|null>} Created notification or null if prevented
 * 
 * @example
 * await createNotification({
 *   actorId: 1,
 *   receiverId: 2,
 *   type: 'LIKE',
 *   entityId: 10,
 *   entityType: 'THREAD'
 * });
 */
export const createNotification = async (data) => {
    const { actorId, receiverId, type, entityId = null, entityType = null } = data;

    try {
        // Prevent self-notifications
        if (actorId === receiverId) {
            logger.debug('Prevented self-notification', { actorId, type });
            return null;
        }

        // Check for duplicate notifications (within last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const existingNotification = await prisma.notification.findFirst({
            where: {
                actorId,
                receiverId,
                type,
                entityId,
                entityType,
                createdAt: {
                    gte: oneHourAgo
                }
            }
        });

        if (existingNotification) {
            logger.debug('Prevented duplicate notification', {
                actorId,
                receiverId,
                type,
                entityId
            });
            return null;
        }

        // Create notification
        const notification = await prisma.notification.create({
            data: {
                actorId,
                receiverId,
                type,
                entityId,
                entityType
            },
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

        logger.info('Notification created', {
            notificationId: notification.id,
            actorId,
            receiverId,
            type
        });

        return notification;
    } catch (error) {
        // Don't throw - log error and return null to prevent breaking main operation
        logger.error('Failed to create notification', {
            error: error.message,
            data
        });
        return null;
    }
};

/**
 * Create a follow-related notification
 * 
 * @param {number} followerId - User who is following
 * @param {number} followedId - User being followed
 * @param {string} type - Notification type (FOLLOW_REQUEST, NEW_FOLLOW, ACCEPTED_FOLLOW)
 * 
 * @returns {Promise<Notification|null>} Created notification or null
 * 
 * @example
 * // Public account follow
 * await createFollowNotification(1, 2, 'NEW_FOLLOW');
 * 
 * // Private account follow request
 * await createFollowNotification(1, 2, 'FOLLOW_REQUEST');
 * 
 * // Follow request accepted
 * await createFollowNotification(2, 1, 'ACCEPTED_FOLLOW');
 */
export const createFollowNotification = async (followerId, followedId, type) => {
    const validTypes = ['FOLLOW_REQUEST', 'NEW_FOLLOW', 'ACCEPTED_FOLLOW'];

    if (!validTypes.includes(type)) {
        logger.error('Invalid follow notification type', { type });
        return null;
    }

    // For ACCEPTED_FOLLOW, the actor is the one who accepted (followedId)
    // and receiver is the original follower
    const actorId = type === 'ACCEPTED_FOLLOW' ? followedId : followerId;
    const receiverId = type === 'ACCEPTED_FOLLOW' ? followerId : followedId;

    return createNotification({
        actorId,
        receiverId,
        type,
        entityId: actorId,
        entityType: 'USER'
    });
};

/**
 * Create a like notification
 * 
 * @param {number} userId - User who liked the entity
 * @param {number} entityId - ID of the liked entity
 * @param {string} entityType - Type of entity (THREAD or COMMENT)
 * @param {number} entityOwnerId - Owner of the entity being liked
 * 
 * @returns {Promise<Notification|null>} Created notification or null
 * 
 * @example
 * await createLikeNotification(1, 10, 'THREAD', 2);
 */
export const createLikeNotification = async (userId, entityId, entityType, entityOwnerId) => {
    const validTypes = ['THREAD', 'COMMENT'];

    if (!validTypes.includes(entityType)) {
        logger.error('Invalid entity type for like notification', { entityType });
        return null;
    }

    return createNotification({
        actorId: userId,
        receiverId: entityOwnerId,
        type: 'LIKE',
        entityId,
        entityType
    });
};

/**
 * Create a comment notification
 * 
 * @param {number} commenterId - User who created the comment
 * @param {number} threadId - ID of the thread being commented on
 * @param {number} commentId - ID of the created comment
 * @param {number} threadOwnerId - Owner of the thread
 * 
 * @returns {Promise<Notification|null>} Created notification or null
 * 
 * @example
 * await createCommentNotification(1, 10, 25, 2);
 */
export const createCommentNotification = async (commenterId, threadId, commentId, threadOwnerId) => {
    return createNotification({
        actorId: commenterId,
        receiverId: threadOwnerId,
        type: 'COMMENT',
        entityId: commentId,
        entityType: 'COMMENT'
    });
};

/**
 * Delete a notification based on criteria
 * 
 * Used when an action is undone (unlike, unfollow, reject follow request).
 * 
 * @param {Object} criteria - Criteria to find notification
 * @param {number} criteria.actorId - User who performed the action
 * @param {number} criteria.receiverId - User who received the notification
 * @param {string} criteria.type - Notification type
 * @param {number} [criteria.entityId] - Optional entity ID
 * @param {string} [criteria.entityType] - Optional entity type
 * 
 * @returns {Promise<boolean>} True if notification was deleted
 * 
 * @example
 * // Unlike - remove LIKE notification
 * await deleteNotification({
 *   actorId: 1,
 *   receiverId: 2,
 *   type: 'LIKE',
 *   entityId: 10,
 *   entityType: 'THREAD'
 * });
 */
export const deleteNotification = async (criteria) => {
    try {
        const { actorId, receiverId, type, entityId = null, entityType = null } = criteria;

        const result = await prisma.notification.deleteMany({
            where: {
                actorId,
                receiverId,
                type,
                entityId,
                entityType
            }
        });

        if (result.count > 0) {
            logger.info('Notification deleted', {
                count: result.count,
                criteria
            });
            return true;
        }

        logger.debug('No notification found to delete', { criteria });
        return false;
    } catch (error) {
        logger.error('Failed to delete notification', {
            error: error.message,
            criteria
        });
        return false;
    }
};
