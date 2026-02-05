import { asyncHandler } from '../middleware/asyncHandler.js';
import { successResponse, errorResponse, createdResponse, deletedResponse, cursorPaginatedResponse } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';
import logger from '../utils/logger.js';
import validator from 'validator';
import { createCommentNotification, deleteNotification } from '../utils/notificationService.js';

/**
 * Create a comment or reply
 * 
 * Creates a top-level comment on a thread or a reply to another comment.
 * Increments thread comment count and creates notification.
 * 
 * @route   POST /api/threads/:threadId/comments
 * @access  Private
 */
export const createComment = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const threadId = parseInt(req.params.threadId);
    const { content, parentId } = req.body;

    // Validate threadId
    if (isNaN(threadId)) {
        return errorResponse(res, 'Invalid thread ID', 400);
    }

    // Check if thread exists
    const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        select: { id: true, userId: true }
    });

    if (!thread) {
        return errorResponse(res, 'Thread not found', 404);
    }

    // If parentId provided, validate parent comment
    let parentComment = null;
    if (parentId) {
        parentComment = await prisma.comment.findUnique({
            where: { id: parentId },
            select: { id: true, threadId: true, userId: true }
        });

        if (!parentComment) {
            return errorResponse(res, 'Parent comment not found', 404);
        }

        if (parentComment.threadId !== threadId) {
            return errorResponse(res, 'Parent comment belongs to a different thread', 400);
        }
    }

    // Validate content exists
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return errorResponse(res, 'Content is required', 400);
    }

    // Sanitize content
    const sanitizedContent = validator.escape(content.trim());

    // Create comment and update thread count in transaction
    const comment = await prisma.$transaction(async (tx) => {
        const newComment = await tx.comment.create({
            data: {
                userId,
                threadId,
                parentId: parentId || null,
                content: sanitizedContent
            },
            include: {
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
            }
        });

        // Only increment thread count for top-level comments
        if (!parentId) {
            await tx.thread.update({
                where: { id: threadId },
                data: { commentsCount: { increment: 1 } }
            });
        }

        return newComment;
    });

    // Create notification
    if (parentId && parentComment) {
        // Notify original comment author (for replies)
        await createCommentNotification(userId, threadId, comment.id, parentComment.userId);
    } else {
        // Notify thread owner (for top-level comments)
        await createCommentNotification(userId, threadId, comment.id, thread.userId);
    }

    logger.info('Comment created', {
        commentId: comment.id,
        userId,
        threadId,
        isReply: !!parentId
    });

    return createdResponse(res, comment, 'Comment created successfully');
});

/**
 * Get top-level comments for a thread
 * 
 * Fetches paginated top-level comments (parentId IS NULL) with cursor pagination.
 * 
 * @route   GET /api/threads/:threadId/comments
 * @access  Private
 */
export const getThreadComments = asyncHandler(async (req, res) => {
    const threadId = parseInt(req.params.threadId);

    // Validate threadId
    if (isNaN(threadId)) {
        return errorResponse(res, 'Invalid thread ID', 400);
    }

    // Parse pagination parameters
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const sort = req.query.sort === 'oldest' ? 'asc' : 'desc';
    const cursorParam = req.query.cursor;

    // Decode cursor if provided
    let cursorData = null;
    if (cursorParam) {
        try {
            const decodedCursor = Buffer.from(cursorParam, 'base64').toString('utf-8');
            cursorData = JSON.parse(decodedCursor);

            if (!cursorData.id || !cursorData.createdAt) {
                return errorResponse(res, 'Invalid cursor format', 400);
            }
        } catch (error) {
            return errorResponse(res, 'Invalid cursor encoding', 400);
        }
    }

    // Check if thread exists
    const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        select: { id: true }
    });

    if (!thread) {
        return errorResponse(res, 'Thread not found', 404);
    }

    // Build where clause
    const whereClause = {
        threadId,
        parentId: null  // Only top-level comments
    };

    // Add cursor pagination condition
    if (cursorData) {
        if (sort === 'asc') {
            whereClause.OR = [
                {
                    createdAt: {
                        gt: new Date(cursorData.createdAt)
                    }
                },
                {
                    createdAt: new Date(cursorData.createdAt),
                    id: {
                        gt: cursorData.id
                    }
                }
            ];
        } else {
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
    }

    // Fetch comments
    const comments = await prisma.comment.findMany({
        where: whereClause,
        include: {
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
            },
            _count: {
                select: { comments: true }  // Reply count
            }
        },
        orderBy: [
            { createdAt: sort },
            { id: sort }
        ],
        take: limit + 1
    });

    // Determine if there are more results
    const hasMore = comments.length > limit;
    const returnComments = hasMore ? comments.slice(0, limit) : comments;

    // Generate next cursor if there are more results
    let nextCursor = null;
    if (hasMore) {
        const lastComment = returnComments[returnComments.length - 1];
        const cursorObj = {
            id: lastComment.id,
            createdAt: lastComment.createdAt.toISOString()
        };
        nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
    }

    logger.info('Thread comments retrieved', {
        threadId,
        count: returnComments.length,
        hasMore
    });

    return cursorPaginatedResponse(
        res,
        returnComments,
        { nextCursor, limit },
        'Comments retrieved successfully'
    );
});

/**
 * Get replies to a comment
 * 
 * Fetches paginated replies (child comments) for a specific comment.
 * 
 * @route   GET /api/comments/:commentId/replies
 * @access  Private
 */
export const getCommentReplies = asyncHandler(async (req, res) => {
    const commentId = parseInt(req.params.commentId);

    // Validate commentId
    if (isNaN(commentId)) {
        return errorResponse(res, 'Invalid comment ID', 400);
    }

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
                return errorResponse(res, 'Invalid cursor format', 400);
            }
        } catch (error) {
            return errorResponse(res, 'Invalid cursor encoding', 400);
        }
    }

    // Check if parent comment exists
    const parentComment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { id: true }
    });

    if (!parentComment) {
        return errorResponse(res, 'Comment not found', 404);
    }

    // Build where clause
    const whereClause = {
        parentId: commentId
    };

    // Add cursor pagination condition
    if (cursorData) {
        whereClause.OR = [
            {
                createdAt: {
                    gt: new Date(cursorData.createdAt)
                }
            },
            {
                createdAt: new Date(cursorData.createdAt),
                id: {
                    gt: cursorData.id
                }
            }
        ];
    }

    // Fetch replies
    const replies = await prisma.comment.findMany({
        where: whereClause,
        include: {
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
            },
            _count: {
                select: { comments: true }
            }
        },
        orderBy: [
            { createdAt: 'asc' },  // Replies typically shown oldest first
            { id: 'asc' }
        ],
        take: limit + 1
    });

    // Determine if there are more results
    const hasMore = replies.length > limit;
    const returnReplies = hasMore ? replies.slice(0, limit) : replies;

    // Generate next cursor if there are more results
    let nextCursor = null;
    if (hasMore) {
        const lastReply = returnReplies[returnReplies.length - 1];
        const cursorObj = {
            id: lastReply.id,
            createdAt: lastReply.createdAt.toISOString()
        };
        nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
    }

    logger.info('Comment replies retrieved', {
        commentId,
        count: returnReplies.length,
        hasMore
    });

    return cursorPaginatedResponse(
        res,
        returnReplies,
        { nextCursor, limit },
        'Replies retrieved successfully'
    );
});

/**
 * Get a single comment
 * 
 * @route   GET /api/comments/:id
 * @access  Private
 */
export const getComment = asyncHandler(async (req, res) => {
    const commentId = parseInt(req.params.id);

    // Validate commentId
    if (isNaN(commentId)) {
        return errorResponse(res, 'Invalid comment ID', 400);
    }

    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
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
            },
            _count: {
                select: { comments: true }  // Reply count
            }
        }
    });

    if (!comment) {
        return errorResponse(res, 'Comment not found', 404);
    }

    logger.info('Comment retrieved', { commentId });

    return successResponse(res, comment, 'Comment retrieved successfully');
});

/**
 * Update a comment
 * 
 * Only the comment author can update their comment.
 * 
 * @route   PATCH /api/comments/:id
 * @access  Private (Author only)
 */
export const updateComment = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const commentId = parseInt(req.params.id);
    const { content } = req.body;

    // Validate commentId
    if (isNaN(commentId)) {
        return errorResponse(res, 'Invalid comment ID', 400);
    }

    // Check if comment exists
    const existingComment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { id: true, userId: true }
    });

    if (!existingComment) {
        return errorResponse(res, 'Comment not found', 404);
    }

    // Check authorization - only comment author can update
    if (existingComment.userId !== userId) {
        return errorResponse(res, 'You are not authorized to update this comment', 403);
    }

    // Validate content exists
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return errorResponse(res, 'Content is required', 400);
    }

    // Sanitize content
    const sanitizedContent = validator.escape(content.trim());

    // Update comment
    const updatedComment = await prisma.comment.update({
        where: { id: commentId },
        data: { content: sanitizedContent },
        include: {
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
        }
    });

    logger.info('Comment updated', { commentId, userId });

    return successResponse(res, updatedComment, 'Comment updated successfully');
});

/**
 * Delete a comment
 * 
 * Only the comment author can delete their comment.
 * Deletes all nested replies via cascade.
 * 
 * @route   DELETE /api/comments/:id
 * @access  Private (Author only)
 */
export const deleteComment = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const commentId = parseInt(req.params.id);

    // Validate commentId
    if (isNaN(commentId)) {
        return errorResponse(res, 'Invalid comment ID', 400);
    }

    // Check if comment exists
    const existingComment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { id: true, userId: true, parentId: true, threadId: true }
    });

    if (!existingComment) {
        return errorResponse(res, 'Comment not found', 404);
    }

    // Check authorization - only comment author can delete
    if (existingComment.userId !== userId) {
        return errorResponse(res, 'You are not authorized to delete this comment', 403);
    }

    // Delete comment and update thread count in transaction
    await prisma.$transaction(async (tx) => {
        // Delete the comment (cascade will handle replies)
        await tx.comment.delete({
            where: { id: commentId }
        });

        // Only decrement thread count for top-level comments
        if (!existingComment.parentId) {
            await tx.thread.update({
                where: { id: existingComment.threadId },
                data: { commentsCount: { decrement: 1 } }
            });
        }
    });

    // Delete associated COMMENT notification
    await deleteNotification({
        actorId: userId,
        type: 'COMMENT',
        entityId: commentId,
        entityType: 'COMMENT'
    });

    logger.info('Comment deleted', { commentId, userId });

    return deletedResponse(res, 'Comment deleted successfully');
});
