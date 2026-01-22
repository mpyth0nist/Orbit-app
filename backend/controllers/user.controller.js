/**
 * User Controller
 * 
 * Handles user profile management, follow system, and user-related operations.
 * All functions use asyncHandler for consistent error handling.
 * 
 * @module controllers/user.controller
 */

import { prisma, selectUser, selectPublicUser, selectThreadWithUser } from '../utils/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logger, logDatabaseError } from '../utils/logger.js';
import {
    successResponse,
    errorResponse,
    paginatedResponse,
    createdResponse,
    deletedResponse
} from '../utils/response.js';
import { createFollowNotification, deleteNotification } from '../utils/notificationService.js';

/**
 * @desc    Get current user's information
 * @route   GET /api/user/
 * @access  Private
 */
export const getMyInfo = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: selectUser
    });

    if (!user) {
        logger.warn(`User not found during getMyInfo`, { userId });
        return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, {
        id: user.id,
        username: user.username,
        email: user.email,
        type: user.type,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        bio: user.profile?.bio,
        photoUrl: user.profile?.photoUrl,
        gender: user.profile?.gender
    }, 'User information retrieved successfully');
});

/**
 * @desc    Update current user's information
 * @route   PATCH /api/user/
 * @access  Private
 */
export const updateMyInfo = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { email, username, type } = req.body;

    // Build update data object with only provided fields
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (username !== undefined) updateData.username = username;
    if (type !== undefined) updateData.type = type;

    const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: selectUser
    });

    logger.info('User account updated', {
        userId,
        username: user.username,
        typeChanged: type !== undefined
    });

    return successResponse(res, { user }, 'User account updated successfully');
});

/**
 * @desc    Get user by ID
 * @route   GET /api/user/:userId
 * @access  Private
 */
export const getUser = asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);

    // Additional validation (middleware should handle this, but double-check)
    if (!userId || isNaN(userId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: selectPublicUser
    });

    if (!user) {
        return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, { user }, 'User retrieved successfully');
});

/**
 * @desc    Get current user's followers
 * @route   GET /api/user/followers
 * @access  Private
 */
export const getFollowers = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [followers, totalCount] = await Promise.all([
        prisma.follow.findMany({
            where: {
                followedId: userId,
                status: 'ACCEPTED'
            },
            select: {
                follower: {
                    select: selectPublicUser
                }
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            }
        }),
        prisma.follow.count({
            where: {
                followedId: userId,
                status: 'ACCEPTED'
            }
        })
    ]);

    const followersData = followers.map(f => f.follower);

    return paginatedResponse(
        res,
        followersData,
        { page, limit, total: totalCount },
        followersData.length === 0
            ? 'You have no followers yet'
            : `Retrieved ${followersData.length} followers`
    );
});

/**
 * @desc    Get users that current user follows
 * @route   GET /api/user/following
 * @access  Private
 */
export const getFollowed = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [followedRecords, totalCount] = await Promise.all([
        prisma.follow.findMany({
            where: {
                followerId: userId,
                status: 'ACCEPTED'
            },
            select: {
                followed: {
                    select: selectPublicUser
                }
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            }
        }),
        prisma.follow.count({
            where: {
                followerId: userId,
                status: 'ACCEPTED'
            }
        })
    ]);

    const followedAccounts = followedRecords.map(f => f.followed);

    return paginatedResponse(
        res,
        followedAccounts,
        { page, limit, total: totalCount },
        followedAccounts.length === 0
            ? 'You are not following any accounts'
            : `Retrieved ${followedAccounts.length} accounts`
    );
});

/**
 * @desc    Follow a user
 * @route   POST /api/user/follow/:followed
 * @access  Private
 */
export const follow = asyncHandler(async (req, res) => {
    const followedId = Number(req.params.followed);
    const followerId = req.user.userId;

    // Validation
    if (!followedId || isNaN(followedId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    // Prevent self-follow
    if (followerId === followedId) {
        return errorResponse(res, 'You cannot follow yourself', 400);
    }

    // Check if followed user exists and get their account type
    const followedUser = await prisma.user.findUnique({
        where: { id: followedId },
        select: {
            id: true,
            username: true,
            type: true
        }
    });

    if (!followedUser) {
        return errorResponse(res, 'User not found', 404);
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
        where: {
            followerId_followedId: {
                followerId,
                followedId
            }
        }
    });

    if (existingFollow) {
        return errorResponse(res, 'You are already following this user', 400);
    }

    const accountType = followedUser.type;
    const followStatus = accountType === 'PRIVATE' ? 'PENDING' : 'ACCEPTED';

    // Create follow record
    await prisma.follow.create({
        data: {
            followedId,
            followerId,
            status: followStatus
        }
    });

    // Create notification for the followed user
    const notificationType = accountType === 'PRIVATE' ? 'FOLLOW_REQUEST' : 'NEW_FOLLOW';
    await createFollowNotification(followerId, followedId, notificationType);

    logger.info('User followed', {
        followerId,
        followedId,
        followedUsername: followedUser.username,
        status: followStatus
    });

    return createdResponse(
        res,
        {
            followedUser: {
                id: followedUser.id,
                username: followedUser.username
            },
            status: followStatus
        },
        accountType === 'PRIVATE'
            ? 'Follow request sent to user'
            : 'Successfully followed user'
    );
});

/**
 * @desc    Unfollow a user
 * @route   DELETE /api/user/follow/:followed
 * @access  Private
 */
export const unfollow = asyncHandler(async (req, res) => {
    const followerId = req.user.userId;
    const followedId = Number(req.params.followed);

    // Validation
    if (!followedId || isNaN(followedId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    await prisma.follow.delete({
        where: {
            followerId_followedId: {
                followerId,
                followedId
            }
        }
    });

    // Delete NEW_FOLLOW or FOLLOW_REQUEST notification
    await deleteNotification({
        actorId: followerId,
        receiverId: followedId,
        type: 'NEW_FOLLOW',
        entityType: 'USER'
    });
    await deleteNotification({
        actorId: followerId,
        receiverId: followedId,
        type: 'FOLLOW_REQUEST',
        entityType: 'USER'
    });

    logger.info('User unfollowed', { followerId, followedId });

    return deletedResponse(res, 'Successfully unfollowed user');
});

/**
 * @desc    Remove a follower
 * @route   DELETE /api/user/followers/:follower
 * @access  Private
 */
export const removeFollower = asyncHandler(async (req, res) => {
    const followerId = Number(req.params.follower);
    const followedId = req.user.userId;

    // Validation
    if (!followerId || isNaN(followerId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    await prisma.follow.delete({
        where: {
            followerId_followedId: {
                followerId,
                followedId
            }
        }
    });

    logger.info('Follower removed', { followerId, followedId });

    return deletedResponse(res, 'Successfully removed follower');
});

/**
 * @desc    Accept or reject a follow request
 * @route   PATCH /api/user/follow-requests/:follower
 * @access  Private
 */
export const updateRequest = asyncHandler(async (req, res) => {
    const followerId = Number(req.params.follower);
    const followedId = req.user.userId;
    const { isAccepted } = req.body;

    // Validation
    if (!followerId || isNaN(followerId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    if (typeof isAccepted !== 'boolean') {
        return errorResponse(res, 'isAccepted must be a boolean value', 400);
    }

    const newStatus = isAccepted ? 'ACCEPTED' : 'REFUSED';

    await prisma.follow.update({
        where: {
            followerId_followedId: {
                followerId,
                followedId
            }
        },
        data: { status: newStatus }
    });

    // Handle notifications based on acceptance
    if (isAccepted) {
        // Delete FOLLOW_REQUEST notification
        await deleteNotification({
            actorId: followerId,
            receiverId: followedId,
            type: 'FOLLOW_REQUEST',
            entityType: 'USER'
        });

        // Create ACCEPTED_FOLLOW notification for the follower
        await createFollowNotification(followedId, followerId, 'ACCEPTED_FOLLOW');
    } else {
        // Delete FOLLOW_REQUEST notification on rejection
        await deleteNotification({
            actorId: followerId,
            receiverId: followedId,
            type: 'FOLLOW_REQUEST',
            entityType: 'USER'
        });
    }

    logger.info('Follow request updated', {
        followerId,
        followedId,
        status: newStatus
    });

    return successResponse(
        res,
        { status: newStatus },
        isAccepted ? 'Follow request accepted' : 'Follow request rejected'
    );
});

/**
 * @desc    Get current user's threads
 * @route   GET /api/user/threads
 * @access  Private
 */
export const getMyThreads = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [threads, totalCount] = await Promise.all([
        prisma.thread.findMany({
            where: { userId },
            select: selectThreadWithUser,
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            }
        }),
        prisma.thread.count({
            where: { userId }
        })
    ]);

    return paginatedResponse(
        res,
        threads,
        { page, limit, total: totalCount },
        `Retrieved ${threads.length} threads`
    );
});

/**
 * @desc    Update user profile
 * @route   PATCH /api/user/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { firstName, lastName, bio, gender } = req.body;

    // Build update data object with only provided fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;
    if (gender !== undefined) updateData.gender = gender;

    const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: updateData
    });

    logger.info('Profile updated', { userId });

    return successResponse(res, { profile: updatedProfile }, 'Profile updated successfully');
});

/**
 * @desc    Update user profile picture
 * @route   PATCH /api/user/profile/picture
 * @access  Private
 */
export const updateProfilePicture = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { photoUrl } = req.body;

    const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: { photoUrl }
    });

    logger.info('Profile picture updated', { userId });

    return successResponse(res, { profile: updatedProfile }, 'Profile picture updated successfully');
});

/**
 * @desc    Get pending follow requests for current user
 * @route   GET /api/user/follow-requests
 * @access  Private
 */
export const getPendingFollowRequests = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [requests, totalCount] = await Promise.all([
        prisma.follow.findMany({
            where: {
                followedId: userId,
                status: 'PENDING'
            },
            select: {
                follower: {
                    select: selectPublicUser
                },
                createdAt: true
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            }
        }),
        prisma.follow.count({
            where: {
                followedId: userId,
                status: 'PENDING'
            }
        })
    ]);

    const formattedRequests = requests.map(r => ({
        user: r.follower,
        requestedAt: r.createdAt
    }));

    logger.info('Pending follow requests retrieved', {
        userId,
        requestsCount: totalCount
    });

    return res.status(200).json({
        success: true,
        data: {
            requests: formattedRequests,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + formattedRequests.length < totalCount
            }
        },
        message: totalCount === 0
            ? 'No pending follow requests'
            : `You have ${totalCount} pending follow request${totalCount > 1 ? 's' : ''}`
    });
});

/**
 * @desc    Search users by username or name
 * @route   GET /api/user/search
 * @access  Private
 */
export const searchUsers = asyncHandler(async (req, res) => {
    const searchTerm = req.query.q?.trim();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    if (!searchTerm || searchTerm.length < 2) {
        return errorResponse(res, 'Search term must be at least 2 characters', 400);
    }

    // Build search conditions for username, firstName, and lastName
    const searchConditions = {
        OR: [
            {
                username: {
                    contains: searchTerm,
                    mode: 'insensitive'
                }
            },
            {
                profile: {
                    firstName: {
                        contains: searchTerm,
                        mode: 'insensitive'
                    }
                }
            },
            {
                profile: {
                    lastName: {
                        contains: searchTerm,
                        mode: 'insensitive'
                    }
                }
            }
        ]
    };

    const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
            where: searchConditions,
            select: selectPublicUser,
            skip,
            take: limit,
            orderBy: {
                username: 'asc'
            }
        }),
        prisma.user.count({
            where: searchConditions
        })
    ]);

    logger.info('User search performed', {
        userId: req.user.userId,
        searchTerm,
        resultsCount: totalCount
    });

    return res.status(200).json({
        success: true,
        data: {
            users,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + users.length < totalCount
            }
        },
        message: totalCount === 0
            ? `No users found for "${searchTerm}"`
            : `Found ${totalCount} user${totalCount > 1 ? 's' : ''}`
    });
});

/**
 * @desc    Get current user's statistics (followers, following, threads counts)
 * @route   GET /api/user/stats
 * @access  Private
 */
export const getUserStats = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const [followersCount, followingCount, threadsCount, pendingRequestsCount] = await Promise.all([
        prisma.follow.count({
            where: { followedId: userId, status: 'ACCEPTED' }
        }),
        prisma.follow.count({
            where: { followerId: userId, status: 'ACCEPTED' }
        }),
        prisma.thread.count({
            where: { userId }
        }),
        prisma.follow.count({
            where: { followedId: userId, status: 'PENDING' }
        })
    ]);

    logger.info('User stats retrieved', { userId });

    return successResponse(res, {
        followers: followersCount,
        following: followingCount,
        threads: threadsCount,
        pendingRequests: pendingRequestsCount
    }, 'Statistics retrieved successfully');
});

/**
 * @desc    Check relationship status with another user
 * @route   GET /api/user/:id/relationship
 * @access  Private
 */
export const checkRelationship = asyncHandler(async (req, res) => {
    const currentUserId = req.user.userId;
    const targetUserId = Number(req.params.id);

    if (!targetUserId || isNaN(targetUserId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    if (targetUserId === currentUserId) {
        return successResponse(res, { relationship: 'SELF' }, 'Relationship checked successfully');
    }
    const [followed, follower] = await Promise.all([
        prisma.follow.findUnique({
            where: {
                followerId_followedId: {
                    followerId: currentUserId,
                    followedId: targetUserId
                }
            },
            select: { status: true }
        }),
        prisma.follow.findUnique({
            where: {
                followerId_followedId: {
                    followerId: targetUserId,
                    followedId: currentUserId
                }
            },
            select: { status: true }
        })
    ]);

    const followingStatus = followed?.status;
    const followerStatus = follower?.status;

    // Determine relationship
    let relationship;

    if (followingStatus === 'ACCEPTED' && followerStatus === 'ACCEPTED') {
        relationship = 'MUTUAL';
    } else if (followingStatus === 'ACCEPTED') {
        relationship = 'FOLLOWING';
    } else if (followingStatus === 'PENDING') {
        relationship = 'PENDING_OUTGOING';
    } else if (followerStatus === 'ACCEPTED') {
        relationship = 'FOLLOWER';
    } else if (followerStatus === 'PENDING') {
        relationship = 'PENDING_INCOMING';
    } else {
        relationship = 'NONE';
    }

    logger.info('Relationship checked', { currentUserId, targetUserId, relationship });

    return successResponse(res, { relationship }, 'Relationship checked successfully');
});

/**
 * @desc    Get user by username
 * @route   GET /api/user/username/:username
 * @access  Private
 */
export const getUserByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username || username.trim().length < 3) {
        return errorResponse(res, 'Username must be at least 3 characters', 400);
    }

    const user = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        select: selectPublicUser
    });

    if (!user) {
        return errorResponse(res, 'User not found', 404);
    }

    logger.info('User retrieved by username', { username, userId: user.id });

    return successResponse(res, { user }, 'User retrieved successfully');
});