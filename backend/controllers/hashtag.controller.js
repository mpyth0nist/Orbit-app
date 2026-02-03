/**
 * Hashtag Controller
 * 
 * Handles hashtag search, trending hashtags, and fetching threads by hashtag.
 * 
 * @module controllers/hashtag
 */

import { asyncHandler } from '../middleware/asyncHandler.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';
import logger from '../utils/logger.js';

/**
 * Search hashtags by tag name
 * @route   GET /api/hashtags/search?q=
 * @access  Public
 */
export const searchHashtags = asyncHandler(async (req, res) => {
    const searchQuery = req.query.q?.trim();

    if (!searchQuery || searchQuery.length < 2) {
        return errorResponse(res, 'Search query must be at least 2 characters', 400);
    }

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const hashtags = await prisma.hashtag.findMany({
        where: {
            tag: {
                contains: searchQuery,
                mode: 'insensitive'
            }
        },
        select: {
            id: true,
            tag: true,
            useCount: true,
            _count: {
                select: {
                    threads: true
                }
            }
        },
        orderBy: {
            useCount: 'desc'
        },
        take: limit
    });

    logger.info('Hashtag search performed', {
        searchQuery,
        resultsCount: hashtags.length
    });

    return successResponse(
        res,
        hashtags,
        hashtags.length > 0
            ? `Found ${hashtags.length} hashtag${hashtags.length > 1 ? 's' : ''}`
            : 'No hashtags found'
    );
});

/**
 * Get trending hashtags (most used)
 * @route   GET /api/hashtags/trending
 * @access  Public
 */
export const getTrendingHashtags = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const trendingHashtags = await prisma.hashtag.findMany({
        select: {
            id: true,
            tag: true,
            useCount: true,
            _count: {
                select: {
                    threads: true
                }
            }
        },
        orderBy: {
            useCount: 'desc'
        },
        take: limit
    });

    logger.info('Trending hashtags fetched', {
        count: trendingHashtags.length
    });

    return successResponse(
        res,
        trendingHashtags,
        'Trending hashtags fetched successfully'
    );
});

/**
 * Get threads for a specific hashtag
 * @route   GET /api/hashtags/:tag/threads
 * @access  Public
 */
export const getHashtagThreads = asyncHandler(async (req, res) => {
    const tag = req.params.tag?.toLowerCase().trim();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    if (!tag) {
        return errorResponse(res, 'Hashtag is required', 400);
    }

    // Find the hashtag
    const hashtag = await prisma.hashtag.findUnique({
        where: { tag },
        include: {
            threads: {
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
            }
        }
    });

    if (!hashtag) {
        return successResponse(
            res,
            {
                threads: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0,
                    hasMore: false
                }
            },
            `No threads found for #${tag}`
        );
    }

    // Get total count for pagination
    const totalCount = await prisma.thread.count({
        where: {
            hashtags: {
                some: {
                    tag
                }
            }
        }
    });

    logger.info('Hashtag threads fetched', {
        tag,
        count: hashtag.threads.length,
        total: totalCount
    });

    return res.status(200).json({
        success: true,
        data: {
            hashtag: {
                tag: hashtag.tag,
                useCount: hashtag.useCount
            },
            threads: hashtag.threads,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + hashtag.threads.length < totalCount
            }
        },
        message: `Found ${totalCount} thread${totalCount > 1 ? 's' : ''} for #${tag}`
    });
});
