/**
 * Threads Controller
 * 
 * Handles all thread-related operations including creating, reading,
 * updating, deleting threads, and fetching personalized news feeds.
 * 
 * @module controllers/threads
 */

import { asyncHandler } from '../middleware/asyncHandler.js';
import { successResponse, errorResponse, paginatedResponse, cursorPaginatedResponse, createdResponse, deletedResponse } from '../utils/response.js';
import { prisma, selectPublicUser, selectThreadWithUser } from '../utils/prisma.js';
import logger from '../utils/logger.js';
import validator from 'validator';
import { extractHashtags } from '../utils/hashtagParser.js';
import { normalizeThread, normalizeThreads } from '../utils/threads.js';

/**
 * Get personalized news feed
 * 
 * Fetches threads from users that the authenticated user follows.
 * Returns threads sorted by creation date (newest first) with cursor-based pagination.
 * 
 * @route   GET /api/threads/feed
 * @access  Private
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * 
 * @query {string} [cursor] - Base64-encoded cursor for pagination
 * @query {number} [limit=20] - Number of threads per page (max 100)
 * 
 * @returns {Object} Cursor-paginated list of threads from followed users
 * 
 * @example
 * GET /api/threads/feed?limit=20
 * GET /api/threads/feed?cursor=eyJpZCI6MTAsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMTVUMTA6MDA6MDBaIn0&limit=20
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Feed fetched successfully",
 *   "data": [{ thread1 }, { thread2 }, ...],
 *   "pagination": {
 *     "nextCursor": "eyJpZCI6MzAsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMTRUMTA6MDA6MDBaIn0",
 *     "limit": 20,
 *     "hasNextPage": true
 *   }
 * }
 */
export const getFeed = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Parse pagination parameters
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
    const cursorParam = req.query.cursor;

    // Decode cursor if provided
    let cursorData = null;
    if (cursorParam) {
        try {
            const decodedCursor = Buffer.from(cursorParam, 'base64').toString('utf-8');
            cursorData = JSON.parse(decodedCursor);

            // Validate cursor structure
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

    // Extract the user IDs and include the current user's ID
    const followedUserIds = followedUsers.map(follow => follow.followedId);
    const feedUserIds = [...followedUserIds, userId];

    // Build where clause based on cursor
    const whereClause = {
        userId: {
            in: feedUserIds
        }
    };

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

    // Fetch threads from followed users with cursor pagination
    // Fetch limit + 1 to determine if there are more results
    const threads = await prisma.thread.findMany({
        where: whereClause,
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
            },
            _count: {
                select: {
                    reactions: true,
                    comments: true,
                    reposts: true
                }
            },
            repostedThread: {
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
            }
        },
        orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' }
        ],
        take: limit + 1
    });

    // Determine if there are more results
    const hasMore = threads.length > limit;
    const returnThreads = hasMore ? threads.slice(0, limit) : threads;

    // Get thread IDs to check which ones the user has liked
    const threadIds = returnThreads.map(t => t.id);

    // Fetch user's reactions and saved status for these threads
    const [userReactions, userSaved] = await Promise.all([
        prisma.reaction.findMany({
            where: {
                userId,
                threadId: { in: threadIds }
            },
            select: { threadId: true }
        }),
        prisma.savedThreads.findMany({
            where: {
                userId,
                threadId: { in: threadIds }
            },
            select: { threadId: true }
        })
    ]);

    // Create Sets for quick lookup
    const likedThreadIds = new Set(userReactions.map(r => r.threadId));
    const savedThreadIds = new Set(userSaved.map(s => s.threadId));

    // Normalize threads with isLiked and counts
    const formattedThreads = normalizeThreads(returnThreads, likedThreadIds, savedThreadIds);

    // Generate next cursor if there are more results
    let nextCursor = null;
    if (hasMore) {
        const lastThread = returnThreads[returnThreads.length - 1];
        const cursorObj = {
            id: lastThread.id,
            createdAt: lastThread.createdAt.toISOString()
        };
        nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
    }

    logger.info('Feed fetched', {
        userId,
        threadsCount: formattedThreads.length,
        hasMore,
        followingCount: followedUserIds.length
    });

    return cursorPaginatedResponse(
        res,
        formattedThreads,
        { nextCursor, limit },
        'Feed fetched successfully'
    );
});

/**
 * Get threads from most liked accounts
 * 
 * Fetches threads from the top 3 accounts that the user has liked most.
 * Returns threads sorted by reaction count (most liked first) with cursor-based pagination.
 * 
 * @route   GET /api/threads/recommended
 * @access  Private
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * 
 * @query {string} [cursor] - Base64-encoded cursor for pagination
 * @query {number} [limit=20] - Number of threads per page (max 100)
 * 
 * @returns {Object} Cursor-paginated list of recommended threads
 * 
 * @example
 * GET /api/threads/recommended?limit=20
 * GET /api/threads/recommended?cursor=eyJpZCI6MTUsInJlYWN0aW9uQ291bnQiOjQyfQ&limit=20
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Recommended threads fetched successfully",
 *   "data": [{ thread1 }, { thread2 }, ...],
 *   "pagination": {
 *     "nextCursor": "eyJpZCI6MzUsInJlYWN0aW9uQ291bnQiOjMwfQ",
 *     "limit": 20,
 *     "hasNextPage": true
 *   }
 * }
 */
export const getMostLikedAccountsThreads = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Parse pagination parameters
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const cursorParam = req.query.cursor;

    // Decode cursor if provided
    let cursorData = null;
    if (cursorParam) {
        try {
            const decodedCursor = Buffer.from(cursorParam, 'base64').toString('utf-8');
            cursorData = JSON.parse(decodedCursor);

            // Validate cursor structure
            if (!cursorData.id || cursorData.reactionCount === undefined) {
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
        return cursorPaginatedResponse(
            res,
            [],
            { nextCursor: null, limit },
            'No recommended threads available'
        );
    }

    // Build where clause based on cursor
    const whereClause = {
        userId: { in: accountIds }
    };

    // Add cursor pagination condition
    // For reaction-based ordering, we need to handle the cursor differently
    if (cursorData) {
        whereClause.OR = [
            {
                reactions: {
                    _count: {
                        lt: cursorData.reactionCount
                    }
                }
            },
            {
                AND: [
                    {
                        reactions: {
                            _count: {
                                equals: cursorData.reactionCount
                            }
                        }
                    },
                    {
                        id: {
                            lt: cursorData.id
                        }
                    }
                ]
            }
        ];
    }

    // Fetch threads with cursor pagination
    // Fetch limit + 1 to determine if there are more results
    const threads = await prisma.thread.findMany({
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
                select: {
                    reactions: true,
                    comments: true,
                    reposts: true
                }
            },
            repostedThread: {
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
            }
        },
        orderBy: [
            {
                reactions: {
                    _count: 'desc'
                }
            },
            { id: 'desc' }
        ],
        take: limit + 1
    });

    // Determine if there are more results
    const hasMore = threads.length > limit;
    const returnThreads = hasMore ? threads.slice(0, limit) : threads;

    // Generate next cursor if there are more results
    let nextCursor = null;
    if (hasMore) {
        const lastThread = returnThreads[returnThreads.length - 1];
        const cursorObj = {
            id: lastThread.id,
            reactionCount: lastThread._count.reactions
        };
        nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
    }

    // Check if user has liked these threads
    const threadIds = returnThreads.map(t => t.id);
    const [userReactions, userSaved] = await Promise.all([
        prisma.reaction.findMany({
            where: {
                userId,
                threadId: { in: threadIds }
            },
            select: { threadId: true }
        }),
        prisma.savedThreads.findMany({
            where: {
                userId,
                threadId: { in: threadIds }
            },
            select: { threadId: true }
        })
    ]);
    const likedThreadIds = new Set(userReactions.map(r => r.threadId));
    const savedThreadIds = new Set(userSaved.map(s => s.threadId));

    // Normalize threads
    const formattedThreads = normalizeThreads(returnThreads, likedThreadIds, savedThreadIds);

    logger.info('Most liked accounts threads fetched', {
        userId,
        topAccountsCount: accountIds.length,
        threadsCount: formattedThreads.length,
        hasMore
    });

    return cursorPaginatedResponse(
        res,
        formattedThreads,
        { nextCursor, limit },
        'Recommended threads fetched successfully'
    );
});

/**
 * Get trending threads (most liked in the last week)
 * 
 * Fetches threads created in the last 7 days, sorted by reaction count.
 * 
 * @route   GET /api/threads/trending
 * @access  Private
 */
export const getTrendingThreads = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Parse pagination parameters
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const cursorParam = req.query.cursor;

    // Decode cursor if provided
    let cursorData = null;
    if (cursorParam) {
        try {
            const decodedCursor = Buffer.from(cursorParam, 'base64').toString('utf-8');
            cursorData = JSON.parse(decodedCursor);

            // Validate cursor structure
            if (!cursorData.id || cursorData.reactionCount === undefined) {
                return errorResponse(res, 'Invalid cursor format', 400);
            }
        } catch (error) {
            return errorResponse(res, 'Invalid cursor encoding', 400);
        }
    }

    // Filter threads from the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Build where clause
    const whereClause = {
        createdAt: {
            gte: oneWeekAgo
        },
        likesCount: {
            gte: 10
        }
    };

    // Add cursor pagination condition
    if (cursorData) {
        whereClause.OR = [
            {
                reactions: {
                    _count: {
                        lt: cursorData.reactionCount
                    }
                }
            },
            {
                AND: [
                    {
                        reactions: {
                            _count: {
                                equals: cursorData.reactionCount
                            }
                        }
                    },
                    {
                        id: {
                            lt: cursorData.id
                        }
                    }
                ]
            }
        ];
    }

    // Fetch threads
    const threads = await prisma.thread.findMany({
        where: whereClause,
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
                select: {
                    reactions: true,
                    comments: true,
                    reposts: true
                }
            },
            repostedThread: {
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
            }
        },
        orderBy: [
            {
                reactions: {
                    _count: 'desc'
                }
            },
            { id: 'desc' }
        ],
        take: limit + 1
    });

    // Check if user has liked these threads
    const threadIds = threads.map(t => t.id);
    const [userReactions, userSaved] = await Promise.all([
        prisma.reaction.findMany({
            where: {
                userId,
                threadId: { in: threadIds }
            },
            select: { threadId: true }
        }),
        prisma.savedThreads.findMany({
            where: {
                userId,
                threadId: { in: threadIds }
            },
            select: { threadId: true }
        })
    ]);
    const likedThreadIds = new Set(userReactions.map(r => r.threadId));
    const savedThreadIds = new Set(userSaved.map(s => s.threadId));

    // Determine if there are more results
    const hasMore = threads.length > limit;
    const returnThreads = hasMore ? threads.slice(0, limit) : threads;

    // Normalize threads with isLiked and counts
    const formattedThreads = normalizeThreads(returnThreads, likedThreadIds, savedThreadIds);

    // Generate next cursor
    let nextCursor = null;
    if (hasMore) {
        const lastThread = returnThreads[returnThreads.length - 1];
        const cursorObj = {
            id: lastThread.id,
            reactionCount: lastThread._count.reactions
        };
        nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
    }

    logger.info('Trending threads fetched', {
        userId,
        count: formattedThreads.length,
        hasMore
    });

    return cursorPaginatedResponse(
        res,
        formattedThreads,
        { nextCursor, limit },
        'Trending threads fetched successfully'
    );
});

// Search threads by content using Full-Text Search
export const searchThreads = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const searchQuery = req.query.q?.trim();

    // Validate search query
    if (!searchQuery || searchQuery.length < 2) {
        return errorResponse(res, 'Search query must be at least 2 characters', 400);
    }

    // Parse pagination parameters
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Prepare search query for PostgreSQL (escape special characters)
    // Convert to tsquery format (words joined by &)
    const searchTerms = searchQuery
        .split(/\s+/)
        .filter(term => term.length > 0)
        .map(term => `${term}:*`)
        .join(' & ');

    // Use raw SQL for Full-Text Search with relevance ranking
    const threads = await prisma.$queryRaw`
        SELECT 
            t.id,
            t."user_id" as "userId",
            t.content,
            t."likes_count" as "likesCount",
            t."comments_count" as "commentsCount",
            t."created_at" as "createdAt",
            t."updated_at" as "updatedAt",
            ts_rank(t.search_vector, to_tsquery('english', ${searchTerms})) as rank
        FROM "Thread" t
        WHERE t.search_vector @@ to_tsquery('english', ${searchTerms})
        ORDER BY rank DESC, t."created_at" DESC
        LIMIT ${limit}
        OFFSET ${skip}
    `;

    // Get total count for pagination
    const totalCountResult = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Thread" t
        WHERE t.search_vector @@ to_tsquery('english', ${searchTerms})
    `;

    const totalCount = Number(totalCountResult[0]?.count || 0);

    // Fetch full thread details with relations for each result
    const threadIds = threads.map(t => t.id);
    const fullThreads = await prisma.thread.findMany({
        where: {
            id: { in: threadIds }
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
            },
            _count: {
                select: {
                    reactions: true,
                    comments: true,
                    reposts: true
                }
            },
            repostedThread: {
                include: {
                    user: { select: selectPublicUser },
                    media: { select: { id: true, url: true, type: true } }
                }
            }
        }
    });

    // Sort by original rank order
    const threadMap = new Map(fullThreads.map(t => [t.id, t]));
    const orderedThreads = threadIds.map(id => threadMap.get(id)).filter(Boolean);

    // Get user's reactions for these threads
    const [userReactions, userSaved] = await Promise.all([
        prisma.reaction.findMany({
            where: {
                userId,
                threadId: { in: threadIds }
            },
            select: { threadId: true }
        }),
        prisma.savedThreads.findMany({
            where: {
                userId,
                threadId: { in: threadIds }
            },
            select: { threadId: true }
        })
    ]);
    const likedThreadIds = new Set(userReactions.map(r => r.threadId));
    const savedThreadIds = new Set(userSaved.map(s => s.threadId));

    logger.info('Thread FTS search completed', {
        userId,
        searchQuery,
        resultsCount: orderedThreads.length,
        totalCount
    });

    return res.status(200).json({
        success: true,
        data: {
            threads: normalizeThreads(orderedThreads, likedThreadIds, savedThreadIds),
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + orderedThreads.length < totalCount
            }
        },
        message: orderedThreads.length > 0
            ? `Found ${totalCount} thread${totalCount > 1 ? 's' : ''} matching your search`
            : 'No threads found matching your search'
    });
});

/**
 * Get a single thread by ID
 * 
 * Fetches a specific thread with user info, media, and like status.
 * 
 * @route   GET /api/threads/:id
 * @access  Private
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * 
 * @returns {Object} Thread data with user, media, and engagement info
 */
export const getThreadById = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const threadId = parseInt(req.params.id);

    if (isNaN(threadId)) {
        return errorResponse(res, 'Invalid thread ID', 400);
    }

    const thread = await prisma.thread.findUnique({
        where: { id: threadId },
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
            },
            _count: {
                select: {
                    reactions: true,
                    comments: true,
                    reposts: true
                }
            },
            repostedThread: {
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
            }
        }
    });

    if (!thread) {
        return errorResponse(res, 'Thread not found', 404);
    }

    // Check if thread owner's account is private and user doesn't have access
    if (thread.user.type === 'PRIVATE' && thread.userId !== userId) {
        const isFollowing = await prisma.follow.findFirst({
            where: {
                followerId: userId,
                followedId: thread.userId,
                status: 'ACCEPTED'
            }
        });

        if (!isFollowing) {
            return errorResponse(res, 'This thread is from a private account', 403);
        }
    }

    // Check if the current user has liked this thread
    const [userReaction, userSaved] = await Promise.all([
        prisma.reaction.findFirst({
            where: {
                userId,
                threadId
            }
        }),
        prisma.savedThreads.findFirst({
            where: {
                userId,
                threadId
            }
        })
    ]);

    // Normalize thread response
    const formattedThread = normalizeThread(thread, new Set(userReaction ? [threadId] : []), new Set(userSaved ? [threadId] : []));

    logger.info('Thread fetched', { threadId, userId });

    return successResponse(res, formattedThread, 'Thread fetched successfully');
});

// Threads basic CRUD.


export const createThread = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    // content is in req.body
    const { content, repostId, communityId } = req.body;
    const parsedRepostId = repostId ? parseInt(repostId) : null;
    const parsedCommunityId = communityId ? parseInt(communityId) : null;

    // Check for uploaded files
    const files = req.files || [];

    // Debug logging
    logger.info('CreateThread request', {
        userId,
        contentLength: content?.length,
        repostId: parsedRepostId,
        filesCount: files.length,
        files: files.map(f => ({ originalname: f.originalname, mimetype: f.mimetype, size: f.size }))
    });

    // Validate content
    if (!content || content.trim().length === 0) {
        return errorResponse(res, 'Content is required', 400);
    }

    // Sanitize content
    // Sanitize content (removed escape to fix encoding issues)
    const trimmedContent = content.trim();
    if (trimmedContent.length > 1200) {
        return errorResponse(res, 'Content must be 1200 characters or less', 400);
    }

    // If reposting, find the root post to ensure consistency
    let rootTargetId = parsedRepostId;
    if (parsedRepostId) {
        const targetThread = await prisma.thread.findUnique({
            where: { id: parsedRepostId },
            include: {
                user: {
                    select: {
                        id: true,
                        type: true
                    }
                }
            }
        });

        if (!targetThread) {
            return errorResponse(res, 'Thread to quote not found', 404);
        }

        // Check private account access (Security Fix)
        if (targetThread.user.type === 'PRIVATE' && targetThread.userId !== userId) {
            const isFollowing = await prisma.follow.findFirst({
                where: {
                    followerId: userId,
                    followedId: targetThread.userId,
                    status: 'ACCEPTED'
                }
            });

            if (!isFollowing) {
                return errorResponse(res, 'You cannot quote a thread from a private account you do not follow', 403);
            }
        }

        // Always point to the root post
        rootTargetId = targetThread.repostId || targetThread.id;
    }

    // If posting to a community, verify membership
    if (parsedCommunityId) {
        const membership = await prisma.communityMember.findUnique({
            where: {
                communityId_userId: {
                    communityId: parsedCommunityId,
                    userId
                }
            }
        });

        if (!membership || membership.status !== 'ACTIVE') {
            return errorResponse(res, 'You must be an active member to post in this community', 403);
        }
    }

    const fullThread = await prisma.$transaction(async (tx) => {
        // 1. Create the thread
        const thread = await tx.thread.create({
            data: {
                userId,
                content: trimmedContent,
                repostId: rootTargetId,
                communityId: parsedCommunityId
            }
        });

        // If it's a quote repost, increment repostsCount on the root thread
        if (rootTargetId) {
            await tx.thread.update({
                where: { id: rootTargetId },
                data: { repostsCount: { increment: 1 } }
            });

            // Create notification for the person being quoted (the one whose ID was sent)
            // Note: If we want to notify only the root owner, we'd use rootTargetId.
            // However, usually you notify the person you actually replied to/quoted.
            if (parsedRepostId) {
                const targetThread = await tx.thread.findUnique({
                    where: { id: parsedRepostId },
                    select: { userId: true }
                });

                if (targetThread && targetThread.userId !== userId) {
                    await tx.notification.create({
                        data: {
                            type: 'REPOST',
                            actorId: userId,
                            receiverId: targetThread.userId,
                            entityId: thread.id,
                            entityType: 'THREAD'
                        }
                    });
                }
            }
        }

        // 2. Extract and process hashtags
        const hashtags = extractHashtags(content); // Use original content, not escaped

        if (hashtags.length > 0) {
            // Upsert hashtags (create if new, increment use count if exists)
            for (const tag of hashtags) {
                const hashtag = await tx.hashtag.upsert({
                    where: { tag },
                    create: { tag, useCount: 1 },
                    update: { useCount: { increment: 1 } }
                });

                // Link hashtag to thread
                await tx.$executeRaw`
                    INSERT INTO "_ThreadHashtags" ("A", "B")
                    VALUES (${hashtag.id}, ${thread.id})
                    ON CONFLICT DO NOTHING
                `;
            }
        }

        // 3. Create media records if files exist
        if (files.length > 0) {
            const mediaData = files.map(file => ({
                userId,
                threadId: thread.id,
                // Construct URL based on where upload middleware saves them
                // Assuming uploads are served from /uploads/threads/
                url: `/uploads/threads/${file.filename}`,
                size: file.size,
                type: file.mimetype.startsWith('image/') ? 'IMAGE' : 'VIDEO'
            }));

            await tx.media.createMany({
                data: mediaData
            });
        }

        // 4. Return the full thread with user and media
        return await tx.thread.findUnique({
            where: { id: thread.id },
            include: {
                user: { select: selectPublicUser },
                media: { select: { id: true, url: true, type: true } },
                repostedThread: {
                    include: {
                        user: { select: selectPublicUser },
                        media: { select: { id: true, url: true, type: true } }
                    }
                }
            }
        });
    });

    // Normalize the response (Consistency Fix)
    const normalizedThread = normalizeThread(fullThread);

    logger.info('Thread created successfully', { userId, threadId: fullThread.id, mediaCount: files.length });
    return createdResponse(res, normalizedThread, 'Thread created successfully');
});

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
    // Sanitize content (removed escape to fix encoding issues)
    const trimmedContent = content.trim();
    if (trimmedContent.length > 500) {
        return res.status(400).json({ message: 'Content must be 500 characters or less' });
    }

    let updatedThread;

    // Case 1: Adding media to thread
    if (!!media) {
        // Validate media object
        if (!media.url || typeof media.url !== 'string') {
            return errorResponse(res, 'Invalid media URL', 400);
        }
        if (!media.type || !['IMAGE', 'VIDEO'].includes(media.type)) {
            return errorResponse(res, 'Invalid media type. Must be IMAGE or VIDEO', 400);
        }
        if (!media.size || typeof media.size !== 'number' || media.size <= 0) {
            return errorResponse(res, 'Invalid media size', 400);
        }
        // Validate URL format (basic check for internal uploads)
        if (!media.url.startsWith('/uploads/')) {
            return errorResponse(res, 'Invalid media URL format', 400);
        }

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

    // Check authorization - thread owner or community moderator/admin can delete
    if (existingThread.userId !== userId) {
        let authorized = false;

        // Check if thread belongs to a community where user is mod/admin
        if (existingThread.communityId) {
            const membership = await prisma.communityMember.findUnique({
                where: {
                    communityId_userId: {
                        communityId: existingThread.communityId,
                        userId: userId
                    }
                }
            });

            if (membership && (membership.role === 'ADMIN' || membership.role === 'MODERATOR')) {
                authorized = true;
            }
        }

        if (!authorized) {
            return res.status(403).json({ message: 'You are not authorized to delete this thread' });
        }
    }

    // Delete the thread (cascade will handle media and other relations)
    await prisma.thread.delete({
        where: { id: threadId }
    });

    logger.info('Thread deleted', { userId, threadId });

    return deletedResponse(res, 'Thread deleted successfully');
});

/**
 * Repost a thread
 * 
 * Creates a new thread that references an original thread.
 * Can be a simple repost (no content) or a quote repost (with content).
 * 
 * @route   POST /api/threads/:id/repost
 * @access  Private
 */
export const repostThread = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const threadId = parseInt(req.params.id);
    const { content } = req.body;

    if (isNaN(threadId)) {
        return errorResponse(res, 'Invalid thread ID', 400);
    }

    // Check if original thread exists
    const originalThread = await prisma.thread.findUnique({
        where: { id: threadId },
        include: {
            user: {
                select: {
                    id: true,
                    type: true
                }
            }
        }
    });

    if (!originalThread) {
        return errorResponse(res, 'Thread not found', 404);
    }

    // Check private account access
    if (originalThread.user.type === 'PRIVATE' && originalThread.userId !== userId) {
        const isFollowing = await prisma.follow.findFirst({
            where: {
                followerId: userId,
                followedId: originalThread.userId,
                status: 'ACCEPTED'
            }
        });

        if (!isFollowing) {
            return errorResponse(res, 'You cannot repost a thread from a private account you do not follow', 403);
        }
    }

    // Check if user is trying to repost their own repost of the same thread (optional, but good for UX)
    // For now keep it simple.
    const repost = await prisma.$transaction(async (tx) => {
        // Determine the root target ID
        const targetThreadId = originalThread.repostId || threadId;

        // 1. Create the repost thread
        const newThread = await tx.thread.create({
            data: {
                userId,
                repostId: targetThreadId,
                content: content ? validator.escape(content.trim()) : '',
            }
        });

        // 2. Increment repostsCount on the ROOT thread
        await tx.thread.update({
            where: { id: targetThreadId },
            data: { repostsCount: { increment: 1 } }
        });

        // 3. Create notification for original thread owner (the one we interacted with)
        if (originalThread.userId !== userId) {
            await tx.notification.create({
                data: {
                    type: 'REPOST',
                    actorId: userId,
                    receiverId: originalThread.userId,
                    entityId: newThread.id,
                    entityType: 'THREAD'
                }
            });
        }

        return newThread;
    });

    // Determine the root target ID (repeated because it's used in logging below)
    const targetThreadId = originalThread.repostId || threadId;

    // Return the full reposted thread with user and original thread info
    const fullRepost = await prisma.thread.findUnique({
        where: { id: repost.id },
        include: {
            user: { select: selectPublicUser },
            media: { select: { id: true, url: true, type: true } },
            repostedThread: {
                include: {
                    user: { select: selectPublicUser },
                    media: { select: { id: true, url: true, type: true } }
                }
            }
        }
    });

    const normalizedRepost = normalizeThread(fullRepost);

    logger.info('Thread reposted', { userId, originalThreadId: threadId, rootThreadId: targetThreadId, repostId: repost.id });

    return createdResponse(res, normalizedRepost, 'Thread reposted successfully');
});


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





