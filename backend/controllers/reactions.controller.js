/**
 * Reactions Controller
 * 
 * Handles like/unlike operations for threads and comments with proper
 * atomic transactions and optimized database queries.
 * 
 * @module controllers/reactions
 */

import { asyncHandler } from '../middleware/asyncHandler.js';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { createLikeNotification, deleteNotification } from '../utils/notificationService.js';

/**
 * @desc    Like or unlike a thread or comment
 * @route   POST /api/reactions/:entityType/:id
 * @access  Private
 */
export const likeEntity = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const entityType = req.params.entityType;
    const entityId = Number(req.params.id);

    // Validation
    const validTypes = ['thread', 'comment'];
    if (!validTypes.includes(entityType)) {
        return errorResponse(res, 'Invalid entity type. Must be "thread" or "comment"', 400);
    }

    if (!entityId || isNaN(entityId)) {
        return errorResponse(res, 'Invalid entity ID', 400);
    }

    // Dynamic field and constraint names
    const modelField = entityType === 'thread' ? 'threadId' : 'commentId';
    const uniqueConstraint = entityType === 'thread'
        ? 'unique_user_thread_reaction'
        : 'unique_user_comment_reaction';

    // Parallel queries for better performance
    const [existingEntity, existingLike] = await Promise.all([
        prisma[entityType].findUnique({
            where: { id: entityId },
            select: { id: true, userId: true }
        }),
        prisma.reaction.findUnique({
            where: {
                [uniqueConstraint]: {
                    userId,
                    [modelField]: entityId
                }
            }
        })
    ]);

    // Check if entity exists
    if (!existingEntity) {
        return errorResponse(
            res,
            `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`,
            404
        );
    }

    // Prevent self-like
    if (existingEntity.userId === userId) {
        return errorResponse(
            res,
            `You cannot like your own ${entityType}`,
            403
        );
    }

    // Toggle like/unlike with atomic transaction
    if (existingLike) {
        // Unlike - decrement count and delete reaction
        await prisma.$transaction([
            prisma.reaction.delete({
                where: {
                    [uniqueConstraint]: {
                        userId,
                        [modelField]: entityId
                    }
                }
            }),
            prisma[entityType].update({
                where: { id: entityId },
                data: { likesCount: { decrement: 1 } }
            })
        ]);

        // Delete LIKE notification
        await deleteNotification({
            actorId: userId,
            receiverId: existingEntity.userId,
            type: 'LIKE',
            entityId,
            entityType: entityType.toUpperCase()
        });

        logger.info(`${entityType} unliked`, { entityType, entityId, userId });

        return successResponse(
            res,
            { liked: false },
            `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} unliked successfully`
        );
    } else {
        // Like - increment count and create reaction
        await prisma.$transaction([
            prisma.reaction.create({
                data: {
                    userId,
                    [modelField]: entityId
                }
            }),
            prisma[entityType].update({
                where: { id: entityId },
                data: { likesCount: { increment: 1 } }
            })
        ]);

        // Create LIKE notification for entity owner
        await createLikeNotification(
            userId,                          // User who liked
            entityId,                        // Entity ID
            entityType.toUpperCase(),        // THREAD or COMMENT
            existingEntity.userId            // Entity owner (receiver)
        );

        logger.info(`${entityType} liked`, { entityType, entityId, userId });

        return successResponse(
            res,
            { liked: true },
            `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} liked successfully`
        );
    }
});

/**
 * @desc    Get all likes for a thread or comment
 * @route   GET /api/reactions/:entityType/:id
 * @access  Private
 */
export const getEntityLikes = asyncHandler(async (req, res) => {
    const entityId = Number(req.params.id);
    const entityType = req.params.entityType;

    // Validation
    const validTypes = ['thread', 'comment'];
    if (!validTypes.includes(entityType)) {
        return errorResponse(res, 'Invalid entity type. Must be "thread" or "comment"', 400);
    }

    if (!entityId || isNaN(entityId)) {
        return errorResponse(res, 'Invalid entity ID', 400);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Check if entity exists
    const existingEntity = await prisma[entityType].findUnique({
        where: { id: entityId },
        select: { id: true }
    });

    if (!existingEntity) {
        return errorResponse(
            res,
            `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`,
            404
        );
    }

    // Build where clause
    const whereClause = entityType === 'thread'
        ? { threadId: entityId }
        : { commentId: entityId };

    // Parallel queries for likes and count
    const [likes, totalCount] = await Promise.all([
        prisma.reaction.findMany({
            where: whereClause,
            select: {
                id: true,
                createdAt: true,
                user: {
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
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.reaction.count({ where: whereClause })
    ]);

    logger.info('Entity likes retrieved', { entityType, entityId, totalCount });

    return paginatedResponse(
        res,
        likes,
        { page, limit, total: totalCount },
        totalCount === 0
            ? `No likes yet`
            : `Retrieved ${likes.length} likes`
    );
});
