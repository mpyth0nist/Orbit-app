/**
 * Saved Threads Controller
 * 
 * Handles bookmarking (saving) and unbookmarking threads.
 * 
 * @module controllers/savedThreads
 */

import { asyncHandler } from '../middleware/asyncHandler.js';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';

/**
 * @desc    Toggle save status of a thread (Bookmark/Unbookmark)
 * @route   POST /api/threads/:id/save
 * @access  Private
 */
export const toggleSaveThread = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const threadId = Number(req.params.id);

    if (!threadId || isNaN(threadId)) {
        return errorResponse(res, 'Invalid thread ID', 400);
    }

    // Check if thread exists
    const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        select: { id: true }
    });

    if (!thread) {
        return errorResponse(res, 'Thread not found', 404);
    }

    // Check if already saved
    const existingSave = await prisma.savedThreads.findUnique({
        where: {
            userId_threadId: {
                userId,
                threadId
            }
        }
    });

    if (existingSave) {
        // Unsave
        await prisma.savedThreads.delete({
            where: {
                userId_threadId: {
                    userId,
                    threadId
                }
            }
        });

        logger.info('Thread unsaved', { threadId, userId });

        return successResponse(
            res,
            { saved: false },
            'Thread removed from bookmarks'
        );
    } else {
        // Save
        await prisma.savedThreads.create({
            data: {
                userId,
                threadId
            }
        });

        logger.info('Thread saved', { threadId, userId });

        return successResponse(
            res,
            { saved: true },
            'Thread bookmarked successfully'
        );
    }
});

/**
 * @desc    Get current user's saved threads
 * @route   GET /api/threads/saved
 * @access  Private
 */
export const getSavedThreads = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const [savedFn, totalCount] = await Promise.all([
        prisma.savedThreads.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                thread: {
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
                        media: true,
                        _count: {
                            select: {
                                comments: true,
                                reactions: true,
                                reposts: true
                            }
                        },
                        // We also need to know if the current user has liked these threads
                        // But finding that efficiently in bulk for all returned threads requires a separate map or complex query
                        // For now, let's stick to the feed format if possible.
                    }
                }
            }
        }),
        prisma.savedThreads.count({ where: { userId } })
    ]);

    // Transform to return threads (and maybe add 'isSaved': true)
    // Note: The frontend might expect specific fields for 'likedByMe' etc.
    // Ideally we reuse the same transformation as getFeed.
    // But for now, let's just return the thread objects.

    // We also need to check 'isLiked', 'isReposted' for these threads for the current user.
    // To do this efficiently:
    const threadIds = savedFn.map(s => s.thread.id);

    const [likedThreadIds, repostedThreadIds] = await Promise.all([
        prisma.reaction.findMany({
            where: {
                userId,
                threadId: { in: threadIds }
            },
            select: { threadId: true }
        }),
        prisma.thread.findMany({
            where: {
                userId, // Checking if user has reposted this thread (this logic might be slightly off depending on how reposts are stored)
                // Actually reposts are stored as Threads with repostId.
                repostId: { in: threadIds }
            },
            select: { repostId: true }
        })
    ]);

    const likedSet = new Set(likedThreadIds.map(l => l.threadId));
    const repostedSet = new Set(repostedThreadIds.map(r => r.repostId));

    const threads = savedFn.map(s => ({
        ...s.thread,
        isLiked: likedSet.has(s.thread.id),
        isReposted: repostedSet.has(s.thread.id),
        isSaved: true, // Obviously
        savedAt: s.createdAt
    }));

    return paginatedResponse(
        res,
        threads,
        { page, limit, total: totalCount }
    );
});
