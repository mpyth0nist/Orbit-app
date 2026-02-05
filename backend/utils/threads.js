/**
 * Thread Utilities
 * 
 * Provides helper functions for normalizing and formatting thread data
 * for frontend consumption.
 */

/**
 * Normalizes a thread object for the frontend
 * 
 * - Flattens aggregation counts (_count) into top-level properties
 * - Rename repostedThread to originalPost
 * - Renames repostId to originalPostId
 * - Removes internal fields like _count
 * - Adds isLiked status if likedThreadIds is provided
 * 
 * @param {Object} thread - The Prisma thread object
 * @param {Set<number>} [likedThreadIds] - Set of thread IDs liked by the current user
 * @param {Set<number>} [savedThreadIds] - Set of thread IDs saved by the current user
 * @returns {Object} Normalized thread object
 */
export const normalizeThread = (thread, likedThreadIds = null, savedThreadIds = null) => {
    if (!thread) return null;

    const normalized = {
        ...thread,
        // Flatten counts from _count or properties if they exist
        likesCount: thread.likesCount ?? thread._count?.reactions ?? thread.likes_count ?? 0,
        commentsCount: thread.commentsCount ?? thread._count?.comments ?? thread.comments_count ?? 0,
        repostsCount: thread.repostsCount ?? thread._count?.reposts ?? thread.reposts_count ?? 0,

        // Rename repost fields for clarity and flatness
        originalPostId: thread.repostId,
        originalPost: thread.repostedThread ? normalizeThread(thread.repostedThread) : null,

        // Add flags
        isLiked: likedThreadIds ? likedThreadIds.has(thread.id) : (thread.isLiked || false),
        isSaved: savedThreadIds ? savedThreadIds.has(thread.id) : (thread.isSaved || false)
    };

    // Remove internal fields
    delete normalized._count;
    delete normalized.repostedThread;
    delete normalized.repostId;
    delete normalized.likes_count;
    delete normalized.comments_count;
    delete normalized.reposts_count;

    return normalized;
};

/**
 * Normalizes an array of threads
 * 
 * @param {Array<Object>} threads - Array of Prisma thread objects
 * @param {Set<number>} [likedThreadIds] - Set of thread IDs liked by the current user
 * @param {Set<number>} [savedThreadIds] - Set of thread IDs saved by the current user
 * @returns {Array<Object>} Array of normalized thread objects
 */
export const normalizeThreads = (threads, likedThreadIds = null, savedThreadIds = null) => {
    if (!Array.isArray(threads)) return [];
    return threads.map(thread => normalizeThread(thread, likedThreadIds, savedThreadIds));
};
