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
import { prisma, selectThreadWithUser } from '../utils/prisma.js';
import logger from '../utils/logger.js';
import validator from 'validator';
import { extractHashtags } from '../utils/hashtagParser.js';

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

    // Extract the user IDs
    const followedUserIds = followedUsers.map(follow => follow.followedId);

    // If user doesn't follow anyone, return empty feed
    if (followedUserIds.length === 0) {
        logger.info('Empty feed - user follows no one', { userId });
        return cursorPaginatedResponse(
            res,
            [],
            { nextCursor: null, limit },
            'Your feed is empty. Start following users to see their threads!'
        );
    }

    // Build where clause based on cursor
    const whereClause = {
        userId: {
            in: followedUserIds
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
                    comments: true
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

    // Fetch user's reactions for these threads
    const userReactions = await prisma.reaction.findMany({
        where: {
            userId,
            threadId: { in: threadIds }
        },
        select: { threadId: true }
    });

    // Create a Set for quick lookup
    const likedThreadIds = new Set(userReactions.map(r => r.threadId));

    // Format threads with isLiked and counts
    const formattedThreads = returnThreads.map(thread => ({
        ...thread,
        likesCount: thread._count.reactions,
        commentsCount: thread._count.comments,
        isLiked: likedThreadIds.has(thread.id),
        _count: undefined // Remove _count from response
    }));

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
                select: { reactions: true }
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

    logger.info('Most liked accounts threads fetched', {
        userId,
        topAccountsCount: accountIds.length,
        threadsCount: returnThreads.length,
        hasMore
    });

    return cursorPaginatedResponse(
        res,
        returnThreads,
        { nextCursor, limit },
        'Recommended threads fetched successfully'
    );
})

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
                    comments: true
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
    const userReactions = await prisma.reaction.findMany({
        where: {
            userId,
            threadId: { in: threadIds }
        },
        select: { threadId: true }
    });
    const likedThreadIds = new Set(userReactions.map(r => r.threadId));

    // Determine if there are more results
    const hasMore = threads.length > limit;
    const returnThreads = hasMore ? threads.slice(0, limit) : threads;

    // Format threads
    const formattedThreads = returnThreads.map(thread => ({
        ...thread,
        likesCount: thread._count.reactions || 0,
        commentsCount: thread._count.comments || 0,
        isLiked: likedThreadIds.has(thread.id),
        _count: undefined
    }));

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
            }
        }
    });

    // Sort by original rank order
    const threadMap = new Map(fullThreads.map(t => [t.id, t]));
    const orderedThreads = threadIds.map(id => threadMap.get(id)).filter(Boolean);

    logger.info('Thread FTS search completed', {
        userId,
        searchQuery,
        resultsCount: orderedThreads.length,
        totalCount
    });

    return res.status(200).json({
        success: true,
        data: {
            threads: orderedThreads,
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
                    comments: true
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
    const userReaction = await prisma.reaction.findFirst({
        where: {
            userId,
            threadId
        }
    });

    // Format response
    const formattedThread = {
        ...thread,
        likesCount: thread._count.reactions,
        commentsCount: thread._count.comments,
        isLiked: !!userReaction
    };

    delete formattedThread._count;

    logger.info('Thread fetched', { threadId, userId });

    return successResponse(res, formattedThread, 'Thread fetched successfully');
});

// Threads basic CRUD.


export const createThread = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    // content is in req.body
    const { content } = req.body;

    // Check for uploaded files
    const files = req.files || [];

    // Debug logging
    logger.info('CreateThread request', {
        userId,
        contentLength: content?.length,
        filesCount: files.length,
        files: files.map(f => ({ originalname: f.originalname, mimetype: f.mimetype, size: f.size }))
    });

    // Validate content
    if (!content || content.trim().length === 0) {
        // If files were uploaded but content is missing, we should probably delete the files
        // But for now let's just return error
        return errorResponse(res, 'Content is required', 400);
    }

    // Sanitize content
    const trimmedContent = validator.escape(content.trim());
    if (trimmedContent.length > 500) {
        return errorResponse(res, 'Content must be 500 characters or less', 400);
    }

    const fullThread = await prisma.$transaction(async (tx) => {
        // 1. Create the thread
        const thread = await tx.thread.create({
            data: {
                userId,
                content: trimmedContent,
            }
        });

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

    logger.info('Thread created successfully', { userId, threadId: fullThread.id, mediaCount: files.length });
    return createdResponse(res, fullThread, 'Thread created successfully');
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
    const trimmedContent = validator.escape(content.trim());
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





