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
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    return res.status(200).json({
        success: true,
        data: {
            id: user.id,
            username: user.username,
            email: user.email,
            type: user.type,
            firstName: user.profile?.firstName,
            lastName: user.profile?.lastName,
            bio: user.profile?.bio,
            photoUrl: user.profile?.photoUrl,
            gender: user.profile?.gender
        },
        message: 'User information retrieved successfully'
    });
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

    return res.status(200).json({
        success: true,
        data: { user },
        message: 'User account updated successfully'
    });
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
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID'
        });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: selectPublicUser
    });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    return res.status(200).json({
        success: true,
        data: { user },
        message: 'User retrieved successfully'
    });
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

    return res.status(200).json({
        success: true,
        data: {
            followers: followersData,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + followersData.length < totalCount
            }
        },
        message: followersData.length === 0
            ? 'You have no followers yet'
            : `Retrieved ${followersData.length} followers`
    });
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

    return res.status(200).json({
        success: true,
        data: {
            following: followedAccounts,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + followedAccounts.length < totalCount
            }
        },
        message: followedAccounts.length === 0
            ? 'You are not following any accounts'
            : `Retrieved ${followedAccounts.length} accounts`
    });
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
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID'
        });
    }

    // Prevent self-follow
    if (followerId === followedId) {
        return res.status(400).json({
            success: false,
            message: 'You cannot follow yourself'
        });
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
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
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
        return res.status(400).json({
            success: false,
            message: 'You are already following this user'
        });
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

    logger.info('User followed', {
        followerId,
        followedId,
        followedUsername: followedUser.username,
        status: followStatus
    });

    return res.status(201).json({
        success: true,
        data: {
            followedUser: {
                id: followedUser.id,
                username: followedUser.username
            },
            status: followStatus
        },
        message: accountType === 'PRIVATE'
            ? 'Follow request sent to user'
            : 'Successfully followed user'
    });
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
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID'
        });
    }

    await prisma.follow.delete({
        where: {
            followerId_followedId: {
                followerId,
                followedId
            }
        }
    });

    logger.info('User unfollowed', { followerId, followedId });

    return res.status(200).json({
        success: true,
        message: 'Successfully unfollowed user'
    });
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
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID'
        });
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

    return res.status(200).json({
        success: true,
        message: 'Successfully removed follower'
    });
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
        return res.status(400).json({
            success: false,
            message: 'Invalid user ID'
        });
    }

    if (typeof isAccepted !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: 'isAccepted must be a boolean value'
        });
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

    logger.info('Follow request updated', {
        followerId,
        followedId,
        status: newStatus
    });

    return res.status(200).json({
        success: true,
        data: { status: newStatus },
        message: isAccepted
            ? 'Follow request accepted'
            : 'Follow request rejected'
    });
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

    return res.status(200).json({
        success: true,
        data: {
            threads,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + threads.length < totalCount
            }
        },
        message: `Retrieved ${threads.length} threads`
    });
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

    return res.status(200).json({
        success: true,
        data: { profile: updatedProfile },
        message: 'Profile updated successfully'
    });
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

    return res.status(200).json({
        success: true,
        data: { profile: updatedProfile },
        message: 'Profile picture updated successfully'
    });
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
        return res.status(400).json({
            success: false,
            message: 'Search term must be at least 2 characters'
        });
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

    return res.status(200).json({
        success: true,
        data: {
            followers: followersCount,
            following: followingCount,
            threads: threadsCount,
            pendingRequests: pendingRequestsCount
        },
        message: 'Statistics retrieved successfully'
    });
});