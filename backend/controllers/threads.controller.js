/**
 * Threads Controller
 * 
 * Handles all thread-related operations including creating, reading,
 * updating, deleting threads, and fetching personalized news feeds.
 * 
 * @module controllers/threads
 */

import { asyncHandler } from '../middleware/asyncHandler.js';
import { successResponse, errorResponse, paginatedResponse, createdResponse, deletedResponse } from '../utils/response.js';
import { prisma, selectThreadWithUser } from '../utils/prisma.js';
import logger from '../utils/logger.js';
import validator from 'validator';

/**
 * Get personalized news feed
 * 
 * Fetches threads from users that the authenticated user follows.
 * Returns threads sorted by creation date (newest first) with pagination.
 * 
 * @route   GET /api/threads/feed
 * @access  Private
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * 
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=20] - Number of threads per page (max 100)
 * 
 * @returns {Object} Paginated list of threads from followed users
 * 
 * @example
 * GET /api/threads/feed?page=1&limit=20
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Feed fetched successfully",
 *   "data": [{ thread1 }, { thread2 }, ...],
 *   "pagination": {
 *     "currentPage": 1,
 *     "itemsPerPage": 20,
 *     "totalItems": 45,
 *     "totalPages": 3,
 *     "hasNextPage": true,
 *     "hasPrevPage": false
 *   }
 * }
 */
export const getFeed = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Get list of users that the current user follows (with ACCEPTED status)
    const followedUsers = await prisma.follow.findMany({
        where: {
            followerId: userId,
            status: 'ACCEPTED'
        },
        select: {
            followedId: true
        }
    });

    // Extract the user IDs
    const followedUserIds = followedUsers.map(follow => follow.followedId);

    // If user doesn't follow anyone, return empty feed
    if (followedUserIds.length === 0) {
        logger.info('Empty feed - user follows no one', { userId });
        return paginatedResponse(
            res,
            [],
            { page, limit, total: 0 },
            'Your feed is empty. Start following users to see their threads!'
        );
    }

    // Fetch threads from followed users with pagination
    const [threads, totalCount] = await Promise.all([
        prisma.thread.findMany({
            where: {
                userId: {
                    in: followedUserIds
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        type: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                photoUrl: true
                            }
                        }
                    }
                },
                media: {
                    select: {
                        id: true,
                        type: true,
                        url: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: limit
        }),
        // Count total threads for pagination
        prisma.thread.count({
            where: {
                userId: {
                    in: followedUserIds
                }
            }
        })
    ]);

    logger.info('Feed fetched', {
        userId,
        threadsCount: threads.length,
        totalCount,
        page,
        followingCount: followedUserIds.length
    });

    paginatedResponse(
        res,
        threads,
        { page, limit, total: totalCount },
        'Feed fetched successfully'
    );
});


export const getMostLikedAccountsThreads = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Fetch all reactions by this user with related thread/comment owner info
    const likedAccounts = await prisma.reaction.findMany({
        where: {
            userId,
            OR: [
                { threadId: { not: null } },
                { commentId: { not: null } }
            ]
        },
        select: {
            thread: {
                select: { userId: true }
            },
            comment: {
                select: { userId: true }
            }
        }
    });

    // Aggregate counts by account userId
    const totalLikesByAccount = {};

    likedAccounts.forEach(reaction => {
        const accountId = reaction.thread?.userId || reaction.comment?.userId;
        if (accountId) {
            totalLikesByAccount[accountId] = (totalLikesByAccount[accountId] || 0) + 1;
        }
    });

    // Sort by like count and get top 3 accounts
    const likedAccountsSorted = Object.entries(totalLikesByAccount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const accountIds = likedAccountsSorted.map(account => Number(account[0]));

    // Check if user has no liked accounts
    if (accountIds.length === 0) {
        logger.info('No liked accounts for user', { userId });
        return paginatedResponse(
            res,
            [],
            { page, limit, total: 0 },
            'No recommended threads available'
        );
    }

    // Fetch threads with pagination
    const [threads, totalCount] = await Promise.all([
        prisma.thread.findMany({
            where: {
                userId: { in: accountIds }
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
                                photoUrl: true,
                            }
                        }
                    },
                },
                media: {
                    select: {
                        id: true,
                        type: true,
                        url: true
                    }
                },
                _count: {
                    select: { reactions: true }
                }
            },
            orderBy: {
                reactions: {
                    _count: 'desc'
                }
            },
            skip,
            take: limit
        }),
        prisma.thread.count({
            where: {
                userId: { in: accountIds }
            }
        })
    ]);

    logger.info('Most liked accounts threads fetched', {
        userId,
        topAccountsCount: accountIds.length,
        threadsCount: threads.length,
        page
    });

    return paginatedResponse(
        res,
        threads,
        { page, limit, total: totalCount },
        'Recommended threads fetched successfully'
    );
})

// Threads basic CRUD.


export const createThread = asyncHandler(async (req, res) => {

    const userId = req.user.userId;

    const { content, media } = req.body;

    // Validate content
    if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Content is required' });
    }

    // Sanitize content to prevent XSS attacks
    const trimmedContent = validator.escape(content.trim());
    if (trimmedContent.length > 500) {
        return res.status(400).json({ message: 'Content must be 500 characters or less' });
    }

    if (media && (!media.url || !media.type || !media.size)) {
        return res.status(400).json({ message: 'Invalid media format' });
    }

    if (!!media) {

        const fullThread = await prisma.$transaction(async (tx) => {


            const thread = await tx.thread.create({
                data: {
                    userId,
                    content: trimmedContent,
                }
            })

            const threadMedia = await tx.media.create({
                data: {
                    userId,
                    threadId: thread.id,
                    url: media.url,
                    size: media.size,
                    type: media.type
                }
            })

            return await tx.thread.findUnique({
                where: {
                    id: thread.id
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
                    },
                    media: {
                        select: {
                            id: true,
                            type: true,
                            url: true
                        }
                    }
                }
            })
        })

        logger.info('Thread created with media', { userId, threadId: fullThread.id });
        return createdResponse(res, fullThread, 'Thread created successfully');
    } else {

        const thread = await prisma.thread.create({
            data: {
                userId,
                content: trimmedContent
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
        })


        logger.info('Thread created', { userId, threadId: thread.id });

        return createdResponse(res, thread, 'Thread created successfully');
    }
})

export const updateThread = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const threadId = parseInt(req.params.id);
    const { content, media } = req.body;

    // Validate threadId
    if (isNaN(threadId)) {
        return res.status(400).json({ message: 'Invalid thread ID' });
    }

    // Check if thread exists
    const thread = await prisma.thread.findUnique({
        where: { id: threadId }
    });

    if (!thread) {
        return res.status(404).json({ message: 'Thread not found' });
    }

    if (thread.userId !== userId) {
        return res.status(403).json({ message: 'You are not authorized to update this thread' });
    }

    // Validate content
    if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Content is required' });
    }

    // Sanitize content to prevent XSS attacks
    const trimmedContent = validator.escape(content.trim());
    if (trimmedContent.length > 500) {
        return res.status(400).json({ message: 'Content must be 500 characters or less' });
    }

    let updatedThread;

    // Case 1: Adding media to thread
    if (!!media) {
        const mediaUrl = media.url;
        const size = media.size;
        const type = media.type;

        updatedThread = await prisma.$transaction(async (tx) => {
            await tx.media.create({
                data: {
                    userId,
                    threadId,
                    url: mediaUrl,
                    size,
                    type
                }
            });

            return await tx.thread.update({
                where: { id: threadId },
                data: { content: trimmedContent },
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
                    media: {
                        select: {
                            id: true,
                            type: true,
                            url: true
                        }
                    }
                }
            });
        });
    }
    // Case 2: No media provided, but thread has existing media - update content only
    else {
        updatedThread = await prisma.thread.update({
            where: { id: threadId },
            data: { content: trimmedContent },
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
                media: {
                    select: {
                        id: true,
                        type: true,
                        url: true
                    }
                }
            }
        });
    }

    logger.info('Thread updated', { userId, threadId });

    return successResponse(res, updatedThread, 'Thread updated successfully');
});



export const deleteThread = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const threadId = parseInt(req.params.id);

    // Validate threadId
    if (isNaN(threadId)) {
        return res.status(400).json({ message: 'Invalid thread ID' });
    }

    // Check if thread exists
    const existingThread = await prisma.thread.findUnique({
        where: { id: threadId }
    });

    if (!existingThread) {
        return res.status(404).json({ message: 'Thread not found' });
    }

    // Check authorization - only thread owner can delete
    if (existingThread.userId !== userId) {
        return res.status(403).json({ message: 'You are not authorized to delete this thread' });
    }

    // Delete the thread (cascade will handle media and other relations)
    await prisma.thread.delete({
        where: { id: threadId }
    });

    logger.info('Thread deleted', { userId, threadId });

    return deletedResponse(res, 'Thread deleted successfully');
});

export const viewThreadDetails = asyncHandler(async (req, res) => {
    const threadId = parseInt(req.params.id);

    // Validate threadId
    if (isNaN(threadId)) {
        return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const thread = await prisma.thread.findUnique({
        where: { id: threadId },
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
            media: {
                select: {
                    id: true,
                    type: true,
                    url: true
                }
            }
        }

    })

    if (!thread) {
        return res.status(404).json({ message: 'Thread not found' });
    }

    logger.info('Thread details viewed', { threadId });

    return successResponse(res, thread, 'Thread retrieved successfully');
})

export const deleteThreadMedia = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const threadId = parseInt(req.params.id);
    const mediaId = parseInt(req.params.mediaId);

    // Validate IDs
    if (isNaN(threadId)) {
        return res.status(400).json({ message: 'Invalid thread ID' });
    }
    if (isNaN(mediaId)) {
        return res.status(400).json({ message: 'Invalid media ID' });
    }

    const existingMedia = await prisma.media.findUnique({
        where: { id: mediaId }
    })
    const existingThread = await prisma.thread.findUnique({
        where: { id: threadId }
    });

    if (!existingThread) {
        return res.status(404).json({ message: 'Thread not found' });
    }

    if (!existingMedia) {
        return res.status(404).json({ message: 'Media not found' });
    }

    if (existingThread.userId !== userId) {
        return res.status(403).json({ message: 'You are not authorized to delete this thread' });
    }

    if (existingThread.id !== existingMedia.threadId) {
        return res.status(403).json({ message: 'You are not authorized to delete this thread media' });
    }

    await prisma.media.delete({
        where: { id: mediaId }
    });

    logger.info('Thread media deleted', { userId, threadId, mediaId });

    return deletedResponse(res, 'Thread media deleted successfully');


})





