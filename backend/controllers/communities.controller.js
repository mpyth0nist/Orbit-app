import { asyncHandler } from '../middleware/asyncHandler.js';
import { successResponse, errorResponse, createdResponse, deletedResponse, paginatedResponse } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';
import logger from '../utils/logger.js';
import validator from 'validator';

/**
 * Create a new community
 * 
 * @route   POST /api/communities
 * @access  Private
 */
export const createCommunity = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { name, description } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return errorResponse(res, 'Community name is required', 400);
    }

    if (name.trim().length > 100) {
        return errorResponse(res, 'Community name must be 100 characters or less', 400);
    }

    const sanitizedName = validator.escape(name.trim());
    const sanitizedDescription = description ? validator.escape(description.trim()) : null;

    // Check if community name already exists
    const existingCommunity = await prisma.community.findUnique({
        where: { name: sanitizedName }
    });

    if (existingCommunity) {
        return errorResponse(res, 'A community with this name already exists', 409);
    }

    // Create community and add creator as admin in transaction
    const community = await prisma.$transaction(async (tx) => {
        const newCommunity = await tx.community.create({
            data: {
                name: sanitizedName,
                description: sanitizedDescription,
                creatorId: userId
            }
        });

        // Add creator as ADMIN member
        await tx.communityMember.create({
            data: {
                communityId: newCommunity.id,
                userId,
                role: 'ADMIN',
                status: 'ACTIVE'
            }
        });

        return newCommunity;
    });

    logger.info('Community created', { communityId: community.id, creatorId: userId });

    return createdResponse(res, community, 'Community created successfully');
});

/**
 * Get a single community
 * 
 * @route   GET /api/communities/:id
 * @access  Private
 */
export const getCommunity = asyncHandler(async (req, res) => {
    const communityId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(communityId)) {
        return errorResponse(res, 'Invalid community ID', 400);
    }

    const community = await prisma.community.findUnique({
        where: { id: communityId },
        include: {
            creator: {
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
                select: {
                    members: {
                        where: { status: 'ACTIVE' }
                    },
                    threads: true
                }
            }
        }
    });

    if (!community) {
        return errorResponse(res, 'Community not found', 404);
    }

    // Check if current user is a member
    const membership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId }
        }
    });

    const result = {
        ...community,
        membersCount: community._count.members,
        threadsCount: community._count.threads,
        isMember: membership?.status === 'ACTIVE',
        isAdmin: membership?.role === 'ADMIN',
        isBanned: membership?.status === 'BANNED',
        isCreator: community.creatorId === userId
    };
    delete result._count;

    return successResponse(res, result, 'Community retrieved successfully');
});

/**
 * List all communities
 * 
 * @route   GET /api/communities
 * @access  Private
 */
export const getCommunities = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();

    const whereClause = search ? {
        name: { contains: search, mode: 'insensitive' }
    } : {};

    const [communities, total] = await Promise.all([
        prisma.community.findMany({
            where: whereClause,
            include: {
                creator: {
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
                    select: {
                        members: {
                            where: { status: 'ACTIVE' }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.community.count({ where: whereClause })
    ]);

    const result = communities.map(c => ({
        ...c,
        membersCount: c._count.members,
        _count: undefined
    }));

    return paginatedResponse(res, result, { page, limit, total }, 'Communities retrieved successfully');
});

/**
 * Update a community
 * 
 * @route   PATCH /api/communities/:id
 * @access  Private (Admin only)
 */
export const updateCommunity = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const communityId = parseInt(req.params.id);
    const { name, description, photoUrl } = req.body;

    if (isNaN(communityId)) {
        return errorResponse(res, 'Invalid community ID', 400);
    }

    // Check if user is admin
    const membership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId }
        }
    });

    if (!membership || membership.role !== 'ADMIN') {
        return errorResponse(res, 'Only admins can update the community', 403);
    }

    const updateData = {};

    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
            return errorResponse(res, 'Community name cannot be empty', 400);
        }
        if (name.trim().length > 100) {
            return errorResponse(res, 'Community name must be 100 characters or less', 400);
        }
        updateData.name = validator.escape(name.trim());

        // Check uniqueness
        const existing = await prisma.community.findFirst({
            where: { name: updateData.name, id: { not: communityId } }
        });
        if (existing) {
            return errorResponse(res, 'A community with this name already exists', 409);
        }
    }

    if (description !== undefined) {
        updateData.description = description ? validator.escape(description.trim()) : null;
    }

    if (photoUrl !== undefined) {
        updateData.photoUrl = photoUrl || null;
    }

    const updated = await prisma.community.update({
        where: { id: communityId },
        data: updateData
    });

    logger.info('Community updated', { communityId, userId });

    return successResponse(res, updated, 'Community updated successfully');
});

/**
 * Delete a community
 * 
 * @route   DELETE /api/communities/:id
 * @access  Private (Creator only)
 */
export const deleteCommunity = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const communityId = parseInt(req.params.id);

    if (isNaN(communityId)) {
        return errorResponse(res, 'Invalid community ID', 400);
    }

    const community = await prisma.community.findUnique({
        where: { id: communityId }
    });

    if (!community) {
        return errorResponse(res, 'Community not found', 404);
    }

    if (community.creatorId !== userId) {
        return errorResponse(res, 'Only the creator can delete the community', 403);
    }

    await prisma.community.delete({
        where: { id: communityId }
    });

    logger.info('Community deleted', { communityId, userId });

    return deletedResponse(res, 'Community deleted successfully');
});

/**
 * Get community threads (pinned first)
 * 
 * @route   GET /api/communities/:id/threads
 * @access  Private
 */
export const getCommunityThreads = asyncHandler(async (req, res) => {
    const communityId = parseInt(req.params.id);
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    if (isNaN(communityId)) {
        return errorResponse(res, 'Invalid community ID', 400);
    }

    // Check community exists
    const community = await prisma.community.findUnique({
        where: { id: communityId }
    });

    if (!community) {
        return errorResponse(res, 'Community not found', 404);
    }

    const [threads, total] = await Promise.all([
        prisma.thread.findMany({
            where: { communityId },
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
                    select: { comments: true, reactions: true }
                }
            },
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ],
            skip,
            take: limit
        }),
        prisma.thread.count({ where: { communityId } })
    ]);

    // Check user's reactions
    const threadIds = threads.map(t => t.id);
    const userReactions = await prisma.reaction.findMany({
        where: {
            userId,
            threadId: { in: threadIds }
        },
        select: { threadId: true }
    });
    const likedThreadIds = new Set(userReactions.map(r => r.threadId));

    const result = threads.map(t => ({
        ...t,
        commentsCount: t._count.comments,
        likesCount: t._count.reactions,
        isLiked: likedThreadIds.has(t.id),
        _count: undefined
    }));

    return paginatedResponse(res, result, { page, limit, total }, 'Community threads retrieved successfully');
});

/**
 * Pin/unpin a thread
 * 
 * @route   POST /api/communities/:id/threads/:threadId/pin
 * @access  Private (Admin only)
 */
export const pinThread = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const communityId = parseInt(req.params.id);
    const threadId = parseInt(req.params.threadId);

    if (isNaN(communityId) || isNaN(threadId)) {
        return errorResponse(res, 'Invalid community or thread ID', 400);
    }

    // Check if user is admin
    const membership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId }
        }
    });

    if (!membership || membership.role !== 'ADMIN') {
        return errorResponse(res, 'Only admins can pin threads', 403);
    }

    // Check thread belongs to community
    const thread = await prisma.thread.findFirst({
        where: { id: threadId, communityId }
    });

    if (!thread) {
        return errorResponse(res, 'Thread not found in this community', 404);
    }

    const updated = await prisma.thread.update({
        where: { id: threadId },
        data: { isPinned: !thread.isPinned }
    });

    logger.info('Thread pin toggled', { threadId, communityId, isPinned: updated.isPinned });

    return successResponse(res, { isPinned: updated.isPinned }, `Thread ${updated.isPinned ? 'pinned' : 'unpinned'} successfully`);
});

/**
 * Get user's communities
 * 
 * @route   GET /api/communities/my
 * @access  Private
 */
export const getMyCommunities = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const memberships = await prisma.communityMember.findMany({
        where: {
            userId,
            status: 'ACTIVE'
        },
        include: {
            community: {
                include: {
                    _count: {
                        select: {
                            members: {
                                where: { status: 'ACTIVE' }
                            }
                        }
                    }
                }
            }
        },
        orderBy: { joinedAt: 'desc' }
    });

    const result = memberships.map(m => ({
        ...m.community,
        membersCount: m.community._count.members,
        role: m.role,
        joinedAt: m.joinedAt,
        _count: undefined
    }));

    return successResponse(res, result, 'Your communities retrieved successfully');
});
